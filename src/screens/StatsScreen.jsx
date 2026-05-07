import { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { G, Line, Text as SvgText, Path, Circle, Rect } from 'react-native-svg';
import { getEntries } from '../db/storage';
import { T } from '../constants/tokens';

const TIME_FILTERS = ['7 Days', '30 Days', 'Custom', 'All Time'];
const TYPE_COLOR   = { Anime: T.amber, Movie: T.amberSoft, 'TV Show': T.amberWarm };
const TYPE_LIST    = ['Anime', 'Movie', 'TV Show'];
const GENRE_LIST   = ['Fantasy', 'Action', 'Drama', 'Thriller', 'Romance', 'Comedy', 'Sci-Fi'];
const MONTHS_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_HEADS    = ['S','M','T','W','T','F','S'];
const SCREEN_W     = Dimensions.get('window').width;
const DR_CELL      = (SCREEN_W - 72) / 7;

function localDateStr(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function parseActivityDate(entry) {
  if (entry.watch_end_date) return new Date(entry.watch_end_date + 'T12:00:00').getTime();
  const dateStr = (entry.status === 'watched' ? entry.finishedDate : entry.lastWatchedDate) || entry.date || '';
  if (!dateStr) return 0;
  try {
    const withYear = !dateStr.includes(',') ? `${dateStr}, ${new Date().getFullYear()} 12:00:00` : dateStr;
    const parsed = new Date(withYear);
    return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  } catch { return 0; }
}

function entryWatchHours(e) {
  if (!e.watchTime) return 0;
  const h = e.watchTime.match(/(\d+)h/);
  const m = e.watchTime.match(/(\d+)m/);
  return ((h ? parseInt(h[1]) : 0) * 60 + (m ? parseInt(m[1]) : 0)) / 60;
}

function filterByPeriod(entries, filter, customStart, customEnd) {
  if (filter === 'All Time') return entries;
  if (filter === 'Custom') {
    if (!customStart || !customEnd) return entries;
    const start = new Date(customStart + 'T00:00:00').getTime();
    const end   = new Date(customEnd   + 'T23:59:59').getTime();
    return entries.filter(e => { const t = parseActivityDate(e); return t >= start && t <= end; });
  }
  const days = filter === '7 Days' ? 7 : 30;
  // Start-of-day on (today - days + 1) aligns exactly with the day buckets buildTimePoints generates
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - (days - 1));
  cutoffDate.setHours(0, 0, 0, 0);
  return entries.filter(e => parseActivityDate(e) >= cutoffDate.getTime());
}

function buildTimePoints(entries, timeFilter, customStart, customEnd) {
  if (timeFilter === 'All Time') {
    const timestamps = entries.map(e => parseActivityDate(e)).filter(t => t > 0);
    if (timestamps.length === 0) return [];
    const curYear  = new Date().getFullYear();
    const curMonth = new Date().getMonth();
    const minDate  = new Date(Math.min(...timestamps));
    const months   = [];
    const cur = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const end = new Date(curYear, curMonth + 1, 1);
    while (cur < end) {
      const m = cur.getMonth(), y = cur.getFullYear();
      const es = entries.filter(e => {
        const t = parseActivityDate(e);
        if (!t) return false;
        const d = new Date(t);
        return d.getMonth() === m && d.getFullYear() === y;
      });
      const label = y === curYear ? MONTHS_SHORT[m] : `${MONTHS_SHORT[m]}'${String(y).slice(2)}`;
      months.push({ label, titles: es.length, hours: Math.round(es.reduce((s, e) => s + entryWatchHours(e), 0)) });
      cur.setMonth(cur.getMonth() + 1);
    }
    return months;
  }
  if (timeFilter === 'Custom' && customStart && customEnd) {
    const startD   = new Date(customStart + 'T00:00:00');
    const endD     = new Date(customEnd   + 'T23:59:59');
    const diffDays = Math.ceil((endD - startD) / 86400000);
    if (diffDays <= 31) {
      return Array.from({ length: diffDays }, (_, i) => {
        const d  = new Date(startD);
        d.setDate(d.getDate() + i);
        const ds = localDateStr(d.getTime());
        const es = entries.filter(e => { const t = parseActivityDate(e); return t ? localDateStr(t) === ds : false; });
        return { label: `${d.getMonth()+1}/${d.getDate()}`, titles: es.length, hours: Math.round(es.reduce((s, e) => s + entryWatchHours(e), 0)) };
      });
    }
    const months = [];
    const d = new Date(startD); d.setDate(1);
    while (d <= endD) {
      const m = d.getMonth(), y = d.getFullYear();
      const es = entries.filter(e => {
        const t = parseActivityDate(e);
        if (!t) return false;
        const ed = new Date(t);
        return ed.getMonth() === m && ed.getFullYear() === y;
      });
      months.push({ label: MONTHS_SHORT[m], titles: es.length, hours: Math.round(es.reduce((s, e) => s + entryWatchHours(e), 0)) });
      d.setMonth(d.getMonth() + 1);
    }
    return months;
  }
  const chartDays = timeFilter === '7 Days' ? 7 : 30;
  return Array.from({ length: chartDays }, (_, i) => {
    const d  = new Date();
    d.setDate(d.getDate() - (chartDays - 1 - i));
    const ds = localDateStr(d.getTime());
    const es = entries.filter(e => { const t = parseActivityDate(e); return t ? localDateStr(t) === ds : false; });
    return { label: `${d.getMonth()+1}/${d.getDate()}`, titles: es.length, hours: Math.round(es.reduce((s, e) => s + entryWatchHours(e), 0)) };
  });
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Max 8 labels: interval = ceil((n-1)/7) so first + up to 6 intermediate + last ≤ 8 total
function shouldShowLabel(i, n) {
  if (i === 0 || i === n - 1) return true;
  if (n <= 8) return true;
  return i % Math.ceil((n - 1) / 7) === 0;
}

// ─── DateRangePicker ────────────────────────────────────────────────────────

function DateRangePicker({ visible, start, end, onConfirm, onClose }) {
  const today = new Date();
  const [calYear,     setCalYear]     = useState(today.getFullYear());
  const [calMonth,    setCalMonth]    = useState(today.getMonth());
  const [pickedStart, setPickedStart] = useState('');
  const [pickedEnd,   setPickedEnd]   = useState('');

  useEffect(() => {
    if (visible) {
      setPickedStart(start || '');
      setPickedEnd(end   || '');
      if (start) {
        const d = new Date(start + 'T12:00:00');
        setCalYear(d.getFullYear());
        setCalMonth(d.getMonth());
      } else {
        setCalYear(today.getFullYear());
        setCalMonth(today.getMonth());
      }
    }
  }, [visible]);

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  }

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay    = new Date(calYear, calMonth, 1).getDay();

  function isoOf(day) {
    return `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }

  function handleDayPress(day) {
    const iso = isoOf(day);
    if (!pickedStart || (pickedStart && pickedEnd) || iso < pickedStart) {
      setPickedStart(iso);
      setPickedEnd('');
    } else {
      setPickedEnd(iso);
    }
  }

  const rawCells = [];
  for (let i = 0; i < firstDay; i++) rawCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) rawCells.push(d);
  while (rawCells.length % 7 !== 0) rawCells.push(null);
  const weeks = [];
  for (let i = 0; i < rawCells.length; i += 7) weeks.push(rawCells.slice(i, i + 7));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.drOverlay} onPress={onClose}>
        <Pressable style={styles.drSheet} onPress={() => {}}>

          <View style={styles.drHead}>
            <Pressable onPress={prevMonth} style={styles.drNavBtn}>
              <Ionicons name="chevron-back" size={20} color={T.textPrimary} />
            </Pressable>
            <Text style={styles.drMonthLabel}>{MONTHS_LONG[calMonth]} {calYear}</Text>
            <Pressable onPress={nextMonth} style={styles.drNavBtn}>
              <Ionicons name="chevron-forward" size={20} color={T.textPrimary} />
            </Pressable>
          </View>

          <Text style={styles.drHint}>
            {!pickedStart
              ? 'Tap a start date'
              : !pickedEnd
                ? 'Now tap an end date'
                : `${fmtDate(pickedStart)} – ${fmtDate(pickedEnd)}`}
          </Text>

          <View style={{ flexDirection: 'row', marginBottom: 4 }}>
            {DAY_HEADS.map((d, i) => (
              <Text key={i} style={[styles.drDayHead, { width: DR_CELL }]}>{d}</Text>
            ))}
          </View>

          {weeks.map((week, wi) => (
            <View key={wi} style={{ flexDirection: 'row', height: DR_CELL }}>
              {week.map((day, di) => {
                if (!day) return <View key={`e-${di}`} style={{ width: DR_CELL }} />;
                const iso      = isoOf(day);
                const isSel    = iso === pickedStart || iso === pickedEnd;
                const isE      = iso === pickedEnd;
                const inR      = !!(pickedStart && pickedEnd && iso > pickedStart && iso < pickedEnd);
                const hasRange = !!(pickedStart && pickedEnd);
                const showLeft  = hasRange && (inR || isE);
                const showRight = hasRange && (inR || iso === pickedStart);

                return (
                  <Pressable key={`d-${di}`} onPress={() => handleDayPress(day)}
                    style={{ width: DR_CELL, height: DR_CELL, alignItems: 'center', justifyContent: 'center' }}>

                    {(showLeft || showRight) && (
                      <View style={{
                        position: 'absolute',
                        top: DR_CELL * 0.16, bottom: DR_CELL * 0.16,
                        left:  showLeft  ? 0    : '50%',
                        right: showRight ? 0    : '50%',
                        backgroundColor: 'rgba(239,159,39,0.22)',
                      }} />
                    )}

                    {isE && (
                      <View style={{
                        position: 'absolute',
                        width: DR_CELL * 0.84, height: DR_CELL * 0.84,
                        borderRadius: DR_CELL * 0.42,
                        borderWidth: 2,
                        borderColor: 'rgba(245,240,232,0.45)',
                      }} />
                    )}

                    {isSel && (
                      <View style={{
                        position: 'absolute',
                        width: DR_CELL * 0.74, height: DR_CELL * 0.74,
                        borderRadius: DR_CELL * 0.37,
                        backgroundColor: T.amber,
                      }} />
                    )}

                    <Text style={[
                      styles.drDayText,
                      isSel && { color: T.bgPrimary, fontFamily: T.fontTitle },
                      inR && !isSel && { color: T.amber },
                    ]}>
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <Pressable
            onPress={() => { if (pickedStart && pickedEnd) onConfirm(pickedStart, pickedEnd); }}
            style={[styles.drConfirmBtn, (!pickedStart || !pickedEnd) && styles.drConfirmBtnDim]}
            disabled={!pickedStart || !pickedEnd}>
            <Text style={styles.drConfirmText}>Confirm</Text>
          </Pressable>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── CategoryBreakdownRow ───────────────────────────────────────────────────

function CategoryBreakdownRow({ c, entries }) {
  const [expanded, setExpanded] = useState(false);
  const color = TYPE_COLOR[c.type] || T.amber;
  return (
    <View style={styles.catCard}>
      <View style={styles.catCardHead}>
        <View style={[styles.catDot, { backgroundColor: color }]} />
        <Text style={styles.catCardType}>{c.type}</Text>
      </View>

      <View style={styles.catMiniRow}>
        <View style={styles.catMiniCard}>
          <Text style={[styles.catMiniNum, { color }]}>{c.count}</Text>
          <Text style={styles.catMiniLabel}>Titles</Text>
          {c.totalEps > 0 && <Text style={styles.catMiniSub}>{c.totalEps} eps</Text>}
        </View>
        <View style={styles.catMiniCard}>
          <Text style={[styles.catMiniNum, { color }]}>{c.hours}h</Text>
          <Text style={styles.catMiniLabel}>Watch Time</Text>
        </View>
        <View style={styles.catMiniCard}>
          <Text style={[styles.catMiniNum, { color }]}>{c.avg || '—'}</Text>
          <Text style={styles.catMiniLabel}>Avg Rating</Text>
        </View>
      </View>

      {entries.length > 0 && (
        <Pressable onPress={() => setExpanded(v => !v)} style={styles.catExpandToggle}>
          <Text style={styles.catExpandText}>
            {expanded ? 'Hide titles' : `See ${entries.length} title${entries.length !== 1 ? 's' : ''}`}
          </Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={T.textMuted} />
        </Pressable>
      )}

      {expanded && (
        <View style={styles.catTitleList}>
          {entries.map((e, i) => (
            <Pressable key={e.id || `${e.title}-${i}`}
              onPress={() => router.push(`/detail/${e.id}`)}
              style={[styles.catTitleItem, i < entries.length - 1 && styles.catTitleDivider]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.catTitleText} numberOfLines={1}>{e.title}</Text>
                {e.hours > 0 && <Text style={styles.catTitleSub}>{e.hours.toFixed(1)}h watched</Text>}
              </View>
              {e.rating ? <Text style={styles.catTitleRating}>★ {e.rating}</Text> : null}
              <Ionicons name="chevron-forward" size={12} color={T.textMuted} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── GenreInsights ──────────────────────────────────────────────────────────

function GenreInsights({ radarCounts, radarPath, hardest }) {
  const CX = 150, CY = 130, RADIUS = 88;
  return (
    <>
      <View>
        <Text style={styles.sectionHeader}>Genre Distribution</Text>
        <View style={styles.card}>
          <Svg width={CX * 2} height={CY * 2 + 20} style={styles.radarSvg}>
            {[0.33, 0.66, 1].map((s, i) => {
              const gPath = GENRE_LIST.map((_, j) => {
                const a = (j / GENRE_LIST.length) * Math.PI * 2 - Math.PI / 2;
                return `${j === 0 ? 'M' : 'L'}${CX + s*RADIUS*Math.cos(a)},${CY + s*RADIUS*Math.sin(a)}`;
              }).join(' ') + 'Z';
              return <Path key={i} d={gPath} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
            })}
            {GENRE_LIST.map((_, i) => {
              const a = (i / GENRE_LIST.length) * Math.PI * 2 - Math.PI / 2;
              return <Line key={i} x1={CX} y1={CY} x2={CX + RADIUS*Math.cos(a)} y2={CY + RADIUS*Math.sin(a)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
            })}
            <Path d={radarPath} fill={T.amber + '25'} stroke={T.amber} strokeWidth="1.5" />
            {GENRE_LIST.map((g, i) => {
              const a = (i / GENRE_LIST.length) * Math.PI * 2 - Math.PI / 2;
              return (
                <SvgText key={g} x={CX + (RADIUS+16)*Math.cos(a)} y={CY + (RADIUS+16)*Math.sin(a) + 4}
                  textAnchor="middle" fill={T.textMuted} fontSize="10" fontFamily={T.fontMono}>{g}</SvgText>
              );
            })}
          </Svg>
          <View style={styles.radarLegend}>
            {radarCounts.filter(r => r.count > 0).sort((a, b) => b.count - a.count).map(rc => (
              <View key={rc.genre} style={styles.radarLegendRow}>
                <View style={styles.radarDot} />
                <Text style={styles.radarLegendGenre}>{rc.genre}</Text>
                <Text style={styles.radarLegendCount}>{rc.count}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {hardest && (
        <View style={styles.hardestCard}>
          {/* TODO: rotate callout variants in future UX pass */}
          <Text style={styles.hardestTitle}>🎯 Hardest-rated genre</Text>
          <Text style={styles.hardestGenre}>
            {hardest.genre} <Text style={styles.hardestRating}>(avg {hardest.avg} ★)</Text>
          </Text>
          <Text style={styles.hardestSub}>You don't give that genre an easy ride.</Text>
        </View>
      )}
    </>
  );
}

// ─── StatsScreen ────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const [entries,     setEntries]     = useState([]);
  const [timeFilter,  setTimeFilter]  = useState('30 Days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd,   setCustomEnd]   = useState('');
  const [showPicker,  setShowPicker]  = useState(false);
  const [view,        setView]        = useState('summary');
  const [metric,      setMetric]      = useState('titles');
  const [byType,      setByType]      = useState(false);
  const [selectedPt,  setSelectedPt]  = useState(null);
  // const [showComp, setShowComp] = useState(false); // TODO: re-enable Compare in future UX pass

  useFocusEffect(useCallback(() => {
    let active = true;
    getEntries().then(data => {
      if (active) setEntries(data.filter(e =>
        // Watched always counts. Dropped always counts.
        // Currently Watching counts if a session was logged (lastWatchedDate reflects most recent session).
        e.status === 'watched' || e.dropped || e.status === 'watching'
      ));
    });
    return () => { active = false; };
  }, []));

  const filtered        = filterByPeriod(entries, timeFilter, customStart, customEnd);
  const filteredForType = (type) => filtered.filter(e => e.type === type);

  const totalHrs  = Math.round(filtered.reduce((s, e) => s + entryWatchHours(e), 0) * 10) / 10;
  const totalDays = Math.round(totalHrs / 24 * 10) / 10;
  const rated     = filtered.filter(e => e.rating);
  const avgRating = rated.length
    ? Math.round(rated.reduce((s, e) => s + e.rating, 0) / rated.length * 10) / 10
    : null;
  const flaggedCount = entries.filter(e => e.status === 'watched' && !e.rating).length;

  const catStats = TYPE_LIST.map(type => {
    const es      = filteredForType(type);
    const ratedEs = es.filter(e => e.rating);
    const avg     = ratedEs.length
      ? Math.round(ratedEs.reduce((s, e) => s + e.rating, 0) / ratedEs.length * 10) / 10
      : null;
    // For watched entries: ep is episodes watched (fall back to total if ep missing).
    // For watching entries: only ep (episodes watched so far) — never use total.
    const totalEps = type !== 'Movie' ? es.reduce((sum, e) => {
      const eps = e.status === 'watched' ? (e.ep || e.total || 0) : (e.ep || 0);
      return sum + eps;
    }, 0) : 0;
    return { type, count: es.length, hours: Math.round(es.reduce((s, e) => s + entryWatchHours(e), 0) * 10) / 10, avg, totalEps };
  }).filter(c => c.count > 0);

  const genreRatings = {};
  filtered.forEach(e => {
    if (e.rating) (e.genre || []).forEach(g => {
      if (!genreRatings[g]) genreRatings[g] = [];
      genreRatings[g].push(e.rating);
    });
  });
  const genreAvgs = Object.entries(genreRatings)
    .map(([g, rs]) => ({ genre: g, avg: Math.round(rs.reduce((s, r) => s + r, 0) / rs.length * 10) / 10 }))
    .sort((a, b) => a.avg - b.avg);
  const hardest = genreAvgs[0];

  const radarCounts = GENRE_LIST.map(g => ({
    genre: g,
    count: filtered.filter(e => (e.genre || []).includes(g)).length,
  }));
  const radarMax  = Math.max(...radarCounts.map(r => r.count), 1);
  const CX_R = 150, CY_R = 130, RADIUS_R = 88;
  const radarPath = radarCounts.map((rc, i) => {
    const a = (i / GENRE_LIST.length) * Math.PI * 2 - Math.PI / 2;
    const r = (rc.count / radarMax) * RADIUS_R;
    return `${i === 0 ? 'M' : 'L'}${CX_R + r*Math.cos(a)},${CY_R + r*Math.sin(a)}`;
  }).join(' ') + 'Z';

  // Time points — all entries + per-type (for byType toggle)
  const timePoints = buildTimePoints(entries, timeFilter, customStart, customEnd);
  const typePoints = {
    Anime:    buildTimePoints(entries.filter(e => e.type === 'Anime'),     timeFilter, customStart, customEnd),
    Movie:    buildTimePoints(entries.filter(e => e.type === 'Movie'),     timeFilter, customStart, customEnd),
    'TV Show':buildTimePoints(entries.filter(e => e.type === 'TV Show'),   timeFilter, customStart, customEnd),
  };

  // Chart geometry
  const SVG_H  = 140;
  const PAD_L  = 32, PAD_B = 28, PAD_T = 20, PAD_R = 16;
  const n      = timePoints.length;
  const maxVal = Math.max(...timePoints.map(p => p[metric]), 1);
  const typeMaxVal = Math.max(
    ...TYPE_LIST.flatMap(t => (typePoints[t] || []).map(p => p[metric])),
    1
  );
  // Y-scale switches based on mode: combined vs per-type
  const effectiveMax = byType ? typeMaxVal : maxVal;
  const svgWidth = Math.max(SCREEN_W - 64, n * 36);
  const chartW   = svgWidth - PAD_L - PAD_R;
  const chartH   = SVG_H - PAD_T - PAD_B;

  function cx(i) { return n <= 1 ? PAD_L + chartW / 2 : PAD_L + (i / (n - 1)) * chartW; }
  function py(v) { return PAD_T + chartH - (v / effectiveMax) * chartH; }

  const linePath = n > 0
    ? timePoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${cx(i).toFixed(1)},${py(p[metric]).toFixed(1)}`).join(' ')
    : '';
  const areaPath = n > 1
    ? `${linePath} L${cx(n-1).toFixed(1)},${(PAD_T+chartH).toFixed(1)} L${cx(0).toFixed(1)},${(PAD_T+chartH).toFixed(1)} Z`
    : '';

  function buildTypePath(pts) {
    if (!pts || pts.length === 0) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${cx(i).toFixed(1)},${py(p[metric]).toFixed(1)}`).join(' ');
  }

  const customLabel = (customStart && customEnd) ? `${fmtDate(customStart)} – ${fmtDate(customEnd)}` : 'Custom';

  // Per-type counts for chart header when byType is ON
  const typeHeaderCounts = TYPE_LIST.map(type => ({
    type,
    value: metric === 'titles'
      ? filteredForType(type).length
      : Math.round(filteredForType(type).reduce((s, e) => s + entryWatchHours(e), 0) * 10) / 10,
  })).filter(tc => tc.value > 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={30} color={T.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Your Stats</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Time filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {TIME_FILTERS.map(f => (
            <Pressable key={f}
              onPress={() => { setTimeFilter(f); if (f === 'Custom') setShowPicker(true); }}
              style={[styles.filterPill, timeFilter === f && styles.filterPillActive]}>
              <Text style={[styles.filterPillText, timeFilter === f && styles.filterPillTextActive]}>
                {f === 'Custom' ? customLabel : f}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Summary / Timeline toggle */}
        <View style={styles.viewToggle}>
          {['summary', 'timeline'].map(v => (
            <Pressable key={v} onPress={() => setView(v)}
              style={[styles.viewToggleBtn, view === v && styles.viewToggleBtnActive]}>
              <Text style={[styles.viewToggleBtnText, view === v && styles.viewToggleBtnTextActive]}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── SUMMARY ── */}
        {view === 'summary' && (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>{filtered.length}</Text>
                <Text style={styles.statLabel}>Titles Watched</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>{totalDays || '—'}</Text>
                <Text style={styles.statLabel}>Days Watched</Text>
                {totalHrs > 0 && <Text style={styles.statSub}>{totalHrs}h total</Text>}
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>{avgRating || '—'}</Text>
                <Text style={styles.statLabel}>Avg Rating</Text>
                <Text style={styles.statSub}>/ 10</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>0</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
                <Text style={styles.statSub}>Keep rolling</Text>
              </View>
            </View>

            {flaggedCount > 0 && (
              <View style={styles.nudge}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nudgeTitle}>
                    {flaggedCount} title{flaggedCount !== 1 ? 's' : ''} still need a rating
                  </Text>
                  <Text style={styles.nudgeSub}>They're in your history, but not your average.</Text>
                </View>
                <Pressable onPress={() => router.push({ pathname: '/(tabs)/watchlist', params: { tab: 'watched', unrated: 'true' } })}>
                  <Text style={styles.nudgeLink}>Rate them →</Text>
                </Pressable>
              </View>
            )}

            {catStats.length > 0 && (
              <View>
                <Text style={styles.sectionHeader}>Breakdown by Category</Text>
                <View style={{ gap: 10 }}>
                  {catStats.map(c => (
                    <CategoryBreakdownRow key={c.type} c={c}
                      entries={filteredForType(c.type).map(e => ({ ...e, hours: entryWatchHours(e) }))}
                    />
                  ))}
                </View>
              </View>
            )}

            <GenreInsights radarCounts={radarCounts} radarPath={radarPath} hardest={hardest} />
          </>
        )}

        {/* ── TIMELINE ── */}
        {view === 'timeline' && (
          <>
            {/* Line chart card */}
            <View style={styles.card}>

              {/* Row 1: Metric toggle + By Type toggle */}
              <View style={styles.timelineHeader}>
                <View style={styles.metricToggle}>
                  {[{ id: 'titles', label: 'Titles' }, { id: 'hours', label: 'Hours' }].map(m => (
                    <Pressable key={m.id}
                      onPress={() => { setMetric(m.id); setSelectedPt(null); }}
                      style={[styles.metricBtn, metric === m.id && styles.metricBtnActive]}>
                      <Text style={[styles.metricBtnText, metric === m.id && styles.metricBtnTextActive]}>
                        {m.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  onPress={() => { setByType(v => !v); setSelectedPt(null); }}
                  style={[styles.byTypeBtn, byType && styles.byTypeBtnActive]}>
                  <Text style={[styles.byTypeBtnText, byType && styles.byTypeBtnTextActive]}>By Type</Text>
                </Pressable>
              </View>

              {/* Row 2: Chart header — single total or per-type breakdown */}
              <View style={styles.chartHeader}>
                <Text style={styles.chartLabel}>
                  {metric === 'titles'
                    ? (byType ? 'Titles by type' : 'Titles watched')
                    : (byType ? 'Hours by type'  : 'Hours watched')}
                </Text>
                {byType ? (
                  <View style={styles.typeCountRow}>
                    {typeHeaderCounts.map(tc => (
                      <View key={tc.type} style={styles.typeCountItem}>
                        <Text style={[styles.typeCountNum, { color: TYPE_COLOR[tc.type] }]}>
                          {tc.value}{metric === 'hours' ? 'h' : ''}
                        </Text>
                        <Text style={styles.typeCountLabel}>{tc.type}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.chartBig}>
                    {metric === 'titles' ? filtered.length : totalHrs}
                    <Text style={styles.chartUnit}>{metric === 'titles' ? ' titles' : 'h'}</Text>
                  </Text>
                )}
              </View>

              {/* Row 3: Legend (By Type mode only) */}
              {byType && (
                <View style={styles.typeLegend}>
                  {TYPE_LIST.filter(t => (typePoints[t] || []).some(p => p[metric] > 0)).map(type => (
                    <View key={type} style={styles.typeLegendItem}>
                      <View style={[styles.typeLegendLine, { backgroundColor: TYPE_COLOR[type] }]} />
                      <Text style={styles.typeLegendLabel}>{type}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Chart SVG */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Svg width={svgWidth} height={SVG_H} style={{ overflow: 'visible' }}>

                  {/* Y-axis grid lines */}
                  {[0, Math.round(effectiveMax / 2), effectiveMax].map((v, i) => (
                    <G key={`gl-${i}`}>
                      <Line x1={PAD_L} y1={py(v)} x2={svgWidth - PAD_R} y2={py(v)}
                        stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                      <SvgText x={PAD_L - 4} y={py(v) + 4} textAnchor="end"
                        fill={T.textMuted} fontSize="9" fontFamily={T.fontMono}>{v}</SvgText>
                    </G>
                  ))}

                  {/* Combined: area + line */}
                  {!byType && areaPath && <Path d={areaPath} fill={T.amber + '15'} />}
                  {!byType && linePath  && <Path d={linePath} fill="none" stroke={T.amber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}

                  {/* By Type: 3 colored lines */}
                  {byType && TYPE_LIST.map(type => {
                    const path = buildTypePath(typePoints[type] || []);
                    return path
                      ? <Path key={type} d={path} fill="none" stroke={TYPE_COLOR[type]} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      : null;
                  })}

                  {/* X-axis labels */}
                  {timePoints.map((p, i) => {
                    if (!shouldShowLabel(i, n)) return null;
                    const isLast = i === n - 1;
                    return (
                      <SvgText key={`xl-${i}`}
                        x={isLast ? svgWidth - PAD_R : (i === 0 ? PAD_L : cx(i))}
                        y={SVG_H - 6}
                        textAnchor={isLast ? 'end' : (i === 0 ? 'start' : 'middle')}
                        fill={T.textMuted} fontSize="9" fontFamily={T.fontMono}>
                        {p.label}
                      </SvgText>
                    );
                  })}

                  {/* Combined mode: dots with large hit areas + callouts */}
                  {!byType && timePoints.map((p, i) => {
                    const x       = cx(i);
                    const y       = py(p[metric]);
                    const hasData = p[metric] > 0;
                    const isSel   = selectedPt === i;
                    const callX   = Math.max(PAD_L, Math.min(x - 33, svgWidth - PAD_R - 66));
                    const callY   = Math.max(2, y - 44);
                    return (
                      <G key={`dot-${i}`}>
                        {/* Large transparent hit area */}
                        <Circle cx={x} cy={y} r={18} fill="transparent"
                          onPress={() => setSelectedPt(isSel ? null : i)} />
                        {/* Visual dot */}
                        <Circle cx={x} cy={y} r={isSel ? 7 : (hasData ? 4.5 : 2.5)}
                          fill={hasData ? (isSel ? T.textPrimary : T.amber) : T.elevated}
                          stroke={isSel ? T.amber : 'none'} strokeWidth={isSel ? 2 : 0}
                        />
                        {isSel && (
                          <G>
                            <Rect x={callX} y={callY} width={66} height={32} fill={T.elevated} rx={7} />
                            <SvgText x={callX + 33} y={callY + 14} textAnchor="middle"
                              fill={T.amber} fontSize="12" fontFamily={T.fontMono}>
                              {p[metric]}{metric === 'hours' ? 'h' : ''}
                            </SvgText>
                            <SvgText x={callX + 33} y={callY + 27} textAnchor="middle"
                              fill={T.textMuted} fontSize="9" fontFamily={T.fontMono}>
                              {p.label}
                            </SvgText>
                          </G>
                        )}
                      </G>
                    );
                  })}

                  {/* By Type mode: small colored dots (non-interactive) */}
                  {byType && TYPE_LIST.map(type =>
                    (typePoints[type] || []).map((p, i) =>
                      p[metric] > 0
                        ? <Circle key={`${type}-${i}`} cx={cx(i)} cy={py(p[metric])} r={3} fill={TYPE_COLOR[type]} />
                        : null
                    )
                  )}

                </Svg>
              </ScrollView>
            </View>

            {/* Breakdown by Category */}
            {catStats.length > 0 && (
              <View>
                <Text style={styles.sectionHeader}>Breakdown by Category</Text>
                <View style={{ gap: 10 }}>
                  {catStats.map(c => (
                    <CategoryBreakdownRow key={c.type} c={c}
                      entries={filteredForType(c.type).map(e => ({ ...e, hours: entryWatchHours(e) }))}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Genre Distribution + Insights widget */}
            <GenreInsights radarCounts={radarCounts} radarPath={radarPath} hardest={hardest} />
          </>
        )}

        <View style={styles.shareCard}>
          <Text style={styles.shareText}>More watching insights on the way ✦</Text>
        </View>

      </ScrollView>

      <DateRangePicker
        visible={showPicker}
        start={customStart}
        end={customEnd}
        onConfirm={(s, e) => { setCustomStart(s); setCustomEnd(e); setShowPicker(false); }}
        onClose={() => setShowPicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: T.bgPrimary },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn:     { padding: 8 },
  headerTitle: { color: T.textPrimary, fontFamily: T.fontDisplay, fontSize: 20 },
  scroll:      { padding: 16, gap: 16, paddingBottom: 60 },

  filterRow:            { gap: 8, paddingBottom: 4 },
  filterPill:           { backgroundColor: T.elevated, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  filterPillActive:     { backgroundColor: T.amber },
  filterPillText:       { color: T.textMuted, fontFamily: T.fontTitle, fontSize: 12 },
  filterPillTextActive: { color: T.bgPrimary },

  viewToggle:              { flexDirection: 'row', backgroundColor: T.elevated, borderRadius: 14, padding: 4 },
  viewToggleBtn:           { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center' },
  viewToggleBtnActive:     { backgroundColor: T.surface },
  viewToggleBtnText:       { color: T.textMuted, fontFamily: T.fontBodyMedium, fontSize: 13 },
  viewToggleBtnTextActive: { color: T.textPrimary, fontFamily: T.fontTitle },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard:  { width: '47%', backgroundColor: T.surface, borderRadius: 18, padding: 16, alignItems: 'center', gap: 4 },
  statNum:   { color: T.amber, fontFamily: T.fontDisplay, fontSize: 38, lineHeight: 44 },
  statLabel: { color: T.textMuted, fontFamily: T.fontTitleMedium, fontSize: 12, textAlign: 'center' },
  statSub:   { color: T.textMuted, fontFamily: T.fontBody, fontSize: 11, textAlign: 'center' },

  nudge:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(239,159,39,0.08)', borderWidth: 1, borderColor: 'rgba(239,159,39,0.15)', borderRadius: 18, padding: 14 },
  nudgeTitle: { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 13, marginBottom: 4 },
  nudgeSub:   { color: T.textMuted, fontFamily: T.fontBody, fontSize: 11 },
  nudgeLink:  { color: T.amber, fontFamily: T.fontTitle, fontSize: 12 },

  sectionHeader: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 },

  catCard:     { backgroundColor: T.surface, borderRadius: 14, padding: 14, gap: 12 },
  catCardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catDot:      { width: 10, height: 10, borderRadius: 5 },
  catCardType: { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 15 },
  catMiniRow:  { flexDirection: 'row', gap: 8 },
  catMiniCard: { flex: 1, backgroundColor: T.elevated, borderRadius: 12, padding: 10, alignItems: 'center', gap: 2 },
  catMiniNum:  { fontFamily: T.fontDisplay, fontSize: 18, lineHeight: 22 },
  catMiniLabel:{ color: T.textMuted, fontFamily: T.fontBody, fontSize: 11, textAlign: 'center' },
  catMiniSub:  { color: T.textMuted, fontFamily: T.fontMono, fontSize: 10, textAlign: 'center' },

  catExpandToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 2 },
  catExpandText:   { color: T.textMuted, fontFamily: T.fontBodyMedium, fontSize: 12 },

  catTitleList:    { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 4 },
  catTitleItem:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 2 },
  catTitleDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  catTitleText:    { color: T.amberDeep, fontFamily: T.fontTitleMedium, fontSize: 14 },
  catTitleSub:     { color: T.textMuted, fontFamily: T.fontBody, fontSize: 11, marginTop: 1 },
  catTitleRating:  { color: T.amber, fontFamily: T.fontMono, fontSize: 13, flexShrink: 0 },

  card: { backgroundColor: T.surface, borderRadius: T.radiusCard, padding: 16, gap: 14 },

  hardestCard:   { backgroundColor: 'rgba(239,159,39,0.08)', borderWidth: 1, borderColor: 'rgba(239,159,39,0.15)', borderRadius: 16, padding: 14, gap: 4 },
  hardestTitle:  { color: T.amberSoft, fontFamily: T.fontTitle, fontSize: 13 },
  hardestGenre:  { color: T.textPrimary, fontFamily: T.fontDisplay, fontSize: 16 },
  hardestRating: { color: T.amber, fontFamily: T.fontMono },
  hardestSub:    { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12 },

  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricToggle:   { flexDirection: 'row', backgroundColor: T.elevated, borderRadius: 12, padding: 3 },
  metricBtn:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  metricBtnActive:    { backgroundColor: T.surface },
  metricBtnText:      { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12 },
  metricBtnTextActive:{ color: T.textPrimary, fontFamily: T.fontTitleMedium },

  byTypeBtn:      { backgroundColor: T.elevated, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'transparent' },
  byTypeBtnActive:{ backgroundColor: 'rgba(239,159,39,0.12)', borderColor: 'rgba(239,159,39,0.3)' },
  byTypeBtnText:       { color: T.textMuted, fontFamily: T.fontTitleMedium, fontSize: 11 },
  byTypeBtnTextActive: { color: T.amber },

  chartHeader:   { gap: 4 },
  chartLabel:    { color: T.textMuted, fontFamily: T.fontMono, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  chartBig:      { color: T.amber, fontFamily: T.fontDisplay, fontSize: 28, lineHeight: 34, marginTop: 4 },
  chartUnit:     { color: T.textMuted, fontFamily: T.fontBody, fontSize: 13 },
  typeCountRow:  { flexDirection: 'row', gap: 20, marginTop: 6, flexWrap: 'wrap' },
  typeCountItem: { alignItems: 'flex-start', gap: 1 },
  typeCountNum:  { fontFamily: T.fontDisplay, fontSize: 22, lineHeight: 26 },
  typeCountLabel:{ color: T.textMuted, fontFamily: T.fontBody, fontSize: 11 },

  typeLegend:     { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  typeLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeLegendLine: { width: 14, height: 2, borderRadius: 1 },
  typeLegendLabel:{ color: T.textMuted, fontFamily: T.fontBody, fontSize: 11 },

  radarSvg:         { alignSelf: 'center' },
  radarLegend:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 4 },
  radarLegendRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: T.elevated, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  radarDot:         { width: 6, height: 6, borderRadius: 3, backgroundColor: T.amber },
  radarLegendGenre: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 11 },
  radarLegendCount: { color: T.amber, fontFamily: T.fontMono, fontWeight: '600', fontSize: 11 },

  shareCard: { backgroundColor: T.surface, borderRadius: 16, padding: 14, alignItems: 'center' },
  shareText: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12, textAlign: 'center' },

  // Date Range Picker
  drOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  drSheet:         { backgroundColor: T.surface, borderRadius: 20, padding: 16, width: '100%' },
  drHead:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  drNavBtn:        { padding: 6 },
  drMonthLabel:    { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 16 },
  drHint:          { color: T.textMuted, fontFamily: T.fontBody, fontSize: 13, textAlign: 'center', marginBottom: 10 },
  drDayHead:       { color: T.textMuted, fontFamily: T.fontMono, fontSize: 11, textAlign: 'center', paddingVertical: 4 },
  drDayText:       { color: T.textPrimary, fontFamily: T.fontBody, fontSize: 13 },
  drConfirmBtn:    { backgroundColor: T.amber, borderRadius: T.radiusButton, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  drConfirmBtnDim: { opacity: 0.4 },
  drConfirmText:   { color: T.bgPrimary, fontFamily: T.fontTitle, fontSize: 15 },
});
