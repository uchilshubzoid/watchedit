import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import Svg, { Rect, Line, Text as SvgText, Path } from 'react-native-svg';
import { getEntries } from '../db/storage';
import { T } from '../constants/tokens';

const TIME_FILTERS = ['7 Days', '30 Days', '90 Days', 'All Time'];
const CATS         = ['All', 'Anime', 'Movie', 'TV Show'];
const TYPE_COLOR   = { Anime: T.amber, Movie: T.amberSoft, 'TV Show': T.amberWarm };
const GENRE_LIST   = ['Fantasy', 'Action', 'Drama', 'Thriller', 'Romance', 'Comedy', 'Sci-Fi'];

function parseActivityDate(entry) {
  // Spec: always use watch_end_date for stats attribution
  if (entry.watch_end_date) return new Date(entry.watch_end_date + 'T12:00:00').getTime();
  // Fallback for legacy entries without watch_end_date
  const dateStr = (entry.status === 'watched' ? entry.finishedDate : entry.lastWatchedDate) || entry.date || '';
  if (!dateStr) return 0;
  try {
    const parsed = new Date(!dateStr.includes(',') ? dateStr + ', ' + new Date().getFullYear() : dateStr);
    return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  } catch { return 0; }
}

function entryWatchHours(e) {
  if (!e.watchTime) return 0;
  const h = e.watchTime.match(/(\d+)h/);
  const m = e.watchTime.match(/(\d+)m/);
  return ((h ? parseInt(h[1]) : 0) * 60 + (m ? parseInt(m[1]) : 0)) / 60;
}

function filterByPeriod(entries, filter) {
  if (filter === 'All Time') return entries;
  const days = filter === '7 Days' ? 7 : filter === '30 Days' ? 30 : 90;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return entries.filter(e => parseActivityDate(e) >= cutoff);
}

function BreakdownRow({ c, entries, onTitleTap }) {
  const [expanded, setExpanded] = useState(false);
  const color = TYPE_COLOR[c.type] || T.amber;
  return (
    <View style={styles.breakdownCard}>
      <Pressable onPress={() => setExpanded(v => !v)} style={styles.breakdownHeader}>
        <View style={[styles.breakdownDot, { backgroundColor: color }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.breakdownType}>{c.type}</Text>
          <Text style={styles.breakdownMeta}>{c.count} titles · {c.hours}h{c.avg ? ` · avg ${c.avg} ★` : ''}</Text>
        </View>
        <Text style={[styles.breakdownCount, { color }]}>{c.count}</Text>
        <Text style={styles.chevron}>{expanded ? '⌃' : '⌄'}</Text>
      </Pressable>
      {expanded && (
        <View style={styles.breakdownItems}>
          {entries.map((e, i) => (
            <Pressable key={e.id || e.title} onPress={() => onTitleTap?.(e)}
              style={[styles.breakdownItem, i < entries.length - 1 && styles.breakdownItemDivider]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.breakdownItemTitle} numberOfLines={1}>{e.title}</Text>
                <Text style={styles.breakdownItemSub}>{e.hours?.toFixed(1) || '—'}h watched</Text>
              </View>
              {e.rating ? <Text style={styles.breakdownItemRating}>★ {e.rating}</Text> : null}
              <Text style={styles.breakdownChevron}>›</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export default function StatsScreen() {
  const [entries,    setEntries]    = useState([]);
  const [timeFilter, setTimeFilter] = useState('30 Days');
  const [cat,        setCat]        = useState('All');
  const [view,       setView]       = useState('summary');
  const [metric,     setMetric]     = useState('titles');
  const [showComp,   setShowComp]   = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    // Watched + Dropped both count in stats per spec
    getEntries().then(data => { if (active) setEntries(data.filter(e => e.status === 'watched' || e.dropped)); });
    return () => { active = false; };
  }, []));

  const filtered = filterByPeriod(entries, timeFilter).filter(e => cat === 'All' || e.type === cat);

  const totalHrs  = Math.round(filtered.reduce((s, e) => s + entryWatchHours(e), 0) * 10) / 10;
  const totalDays = Math.round(totalHrs / 24 * 10) / 10;
  const rated     = filtered.filter(e => e.rating);
  const avgRating = rated.length
    ? Math.round(rated.reduce((s, e) => s + e.rating, 0) / rated.length * 10) / 10
    : null;
  const flaggedCount = entries.filter(e => e.status === 'watched' && !e.rating).length;

  const catStats = ['Anime', 'Movie', 'TV Show'].map(type => {
    const es    = filterByPeriod(entries, timeFilter).filter(e => e.type === type);
    const rated = es.filter(e => e.rating);
    const avg   = rated.length ? Math.round(rated.reduce((s, e) => s + e.rating, 0) / rated.length * 10) / 10 : null;
    return { type, count: es.length, hours: Math.round(es.reduce((s, e) => s + entryWatchHours(e), 0) * 10) / 10, avg };
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

  // Timeline chart data
  const chartDays     = timeFilter === '7 Days' ? 7 : timeFilter === '30 Days' ? 30 : 90;
  const isMonthlyView = timeFilter === 'All Time';

  const timePoints = isMonthlyView
    ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => {
        const month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(m);
        const year  = new Date().getFullYear();
        const es    = entries.filter(e => {
          const d = new Date(parseActivityDate(e));
          return d.getMonth() === month && d.getFullYear() === year;
        });
        return { label: m, titles: es.length, hours: Math.round(es.reduce((s, e) => s + entryWatchHours(e), 0)) };
      }).filter((_, i) => i <= new Date().getMonth())
    : Array.from({ length: chartDays }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (chartDays - 1 - i));
        const ds = d.toISOString().split('T')[0];
        const es = entries.filter(e => {
          const ea = parseActivityDate(e);
          if (!ea) return false;
          return new Date(ea).toISOString().split('T')[0] === ds;
        });
        return { label: `${d.getMonth() + 1}/${d.getDate()}`, titles: es.length, hours: Math.round(es.reduce((s, e) => s + entryWatchHours(e), 0)) };
      });

  // Bar chart dimensions
  const SVG_W = 340, SVG_H = 120, PAD_L = 28, PAD_B = 24, PAD_T = 10, PAD_R = 12;
  const chartW = SVG_W - PAD_L - PAD_R;
  const chartH = SVG_H - PAD_T - PAD_B;
  const n      = timePoints.length;
  const maxVal = Math.max(...timePoints.map(p => p[metric]), 1);
  const barW   = Math.max(2, chartW / n - 3);
  function bx(i) { return PAD_L + (i / n) * chartW + (chartW / n - barW) / 2; }
  function bh(v)  { return (v / maxVal) * chartH; }
  function by(v)  { return PAD_T + chartH - bh(v); }

  // Radar chart — centered in card
  const radarCounts = GENRE_LIST.map(g => ({
    genre: g,
    count: filterByPeriod(entries, timeFilter).filter(e => (e.genre || []).includes(g)).length,
  }));
  const maxCount = Math.max(...radarCounts.map(r => r.count), 1);
  const CX = 150, CY = 130, RADIUS = 88;
  function radarPt(i, val) {
    const angle  = (i / GENRE_LIST.length) * Math.PI * 2 - Math.PI / 2;
    const radius = (val / maxCount) * RADIUS;
    return { x: CX + radius * Math.cos(angle), y: CY + radius * Math.sin(angle) };
  }
  const radarPath = radarCounts.map((rc, i) => {
    const p = radarPt(i, rc.count);
    return `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`;
  }).join(' ') + 'Z';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Your Stats</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Time filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {TIME_FILTERS.map(f => (
            <Pressable key={f} onPress={() => setTimeFilter(f)}
              style={[styles.filterPill, timeFilter === f && styles.filterPillActive]}>
              <Text style={[styles.filterPillText, timeFilter === f && styles.filterPillTextActive]}>{f}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Category chips */}
        <View style={styles.catRow}>
          {CATS.map(c => (
            <Pressable key={c} onPress={() => setCat(c)}
              style={[styles.catChip, cat === c && styles.catChipActive]}>
              <Text style={[styles.catChipText, cat === c && styles.catChipTextActive]}>{c}</Text>
            </Pressable>
          ))}
        </View>

        {/* View toggle */}
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
                <Text style={styles.statLabelMono}>Titles Watched</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>{totalDays || '—'}</Text>
                <View>
                  <Text style={styles.statLabelMono}>Days Watched</Text>
                  {totalHrs > 0 && <Text style={styles.statSub}>{totalHrs}h watched</Text>}
                </View>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>{avgRating || '—'}</Text>
                <View>
                  <Text style={styles.statLabelMono}>Avg Rating</Text>
                  <Text style={styles.statSub}>/ 10</Text>
                </View>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>0</Text>
                <View>
                  <Text style={styles.statLabelMono}>Day Streak</Text>
                  <Text style={styles.statSub}>Keep it rolling</Text>
                </View>
              </View>
            </View>

            {flaggedCount > 0 && (
              <View style={styles.nudge}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nudgeTitle}>{flaggedCount} watched titles still need a rating</Text>
                  <Text style={styles.nudgeSub}>They count in your watch history, but not yet in your average.</Text>
                </View>
                <Pressable onPress={() => router.push({ pathname: '/(tabs)/watchlist', params: { tab: 'watched', unrated: 'true' } })}>
                  <Text style={styles.nudgeLink}>Rate them →</Text>
                </Pressable>
              </View>
            )}

            {/* By category */}
            {catStats.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>By Category</Text>
                {catStats.map((c, i) => (
                  <View key={c.type} style={[styles.catStatRow, i < catStats.length - 1 && styles.catStatDivider]}>
                    <View style={styles.catStatLeft}>
                      <View style={[styles.catDot, { backgroundColor: TYPE_COLOR[c.type] }]} />
                      <View>
                        <Text style={styles.catStatType}>{c.type}</Text>
                        <Text style={styles.catStatMeta}>{c.count} titles watched</Text>
                      </View>
                    </View>
                    <View style={styles.catStatRight}>
                      <View style={styles.catStatBox}>
                        <Text style={styles.catStatNum}>{c.hours}h</Text>
                        <Text style={styles.catStatBoxLabel}>watch time</Text>
                      </View>
                      <View style={styles.catStatBox}>
                        <Text style={[styles.catStatNum, { color: T.amber }]}>{c.avg || '—'}</Text>
                        <Text style={styles.catStatBoxLabel}>avg rating</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {hardest && (
              <View style={styles.hardestCard}>
                <Text style={styles.hardestTitle}>🎯 Your hardest-rated genre</Text>
                <Text style={styles.hardestGenre}>
                  {hardest.genre} <Text style={styles.hardestRating}>(avg {hardest.avg} ★)</Text>
                </Text>
                <Text style={styles.hardestSub}>You don't give that genre an easy ride.</Text>
              </View>
            )}
          </>
        )}

        {/* ── TIMELINE ── */}
        {view === 'timeline' && (
          <View style={styles.card}>
            <View style={styles.timelineHeader}>
              <View style={styles.metricToggle}>
                {[{ id: 'titles', label: 'Titles' }, { id: 'hours', label: 'Hours' }].map(m => (
                  <Pressable key={m.id} onPress={() => setMetric(m.id)}
                    style={[styles.metricBtn, metric === m.id && styles.metricBtnActive]}>
                    <Text style={[styles.metricBtnText, metric === m.id && styles.metricBtnTextActive]}>{m.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={() => setShowComp(c => !c)}
                style={[styles.compareBtn, showComp && styles.compareBtnActive]}>
                <Text style={[styles.compareBtnText, showComp && styles.compareBtnTextActive]}>Compare</Text>
              </Pressable>
            </View>

            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartLabel}>{metric === 'titles' ? 'Titles watched' : 'Hours watched'}</Text>
                <Text style={styles.chartBig}>
                  {metric === 'titles' ? filtered.length : totalHrs}
                  <Text style={styles.chartUnit}>{metric === 'titles' ? ' titles' : 'h'}</Text>
                </Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Svg width={Math.max(SVG_W, n * 16)} height={SVG_H} style={{ overflow: 'visible' }}>
                {[0, Math.round(maxVal / 2), maxVal].map((v, i) => {
                  const y = PAD_T + chartH - (v / maxVal) * chartH;
                  return (
                    <Line key={i} x1={PAD_L} y1={y} x2={SVG_W - PAD_R} y2={y}
                      stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  );
                })}
                {timePoints.map((p, i) => (
                  <Rect key={i}
                    x={bx(i)} y={p[metric] > 0 ? by(p[metric]) : PAD_T + chartH}
                    width={barW} height={bh(p[metric])}
                    fill={p[metric] > 0 ? T.amber : T.elevated}
                    rx="2" opacity={p[metric] > 0 ? 1 : 0.3}
                  />
                ))}
                {timePoints.map((p, i) => {
                  if (i % (n <= 7 ? 1 : Math.ceil(n / 7)) !== 0 && i !== n - 1) return null;
                  const x = PAD_L + (i / n) * chartW + chartW / n / 2;
                  return (
                    <SvgText key={i} x={x} y={SVG_H - 6} textAnchor="middle"
                      fill={T.textMuted} fontSize="10" fontFamily={T.fontMono}>
                      {p.label}
                    </SvgText>
                  );
                })}
              </Svg>
            </ScrollView>
          </View>
        )}

        {/* ── RADAR ── */}
        <View>
          <Text style={styles.sectionHeader}>Genre Distribution</Text>
          <View style={styles.card}>
            <Svg width={CX * 2} height={CY * 2 + 20} style={styles.radarSvg}>
              {[0.33, 0.66, 1].map((s, i) => {
                const gPath = GENRE_LIST.map((_, j) => {
                  const a = (j / GENRE_LIST.length) * Math.PI * 2 - Math.PI / 2;
                  const rad = s * RADIUS;
                  return `${j === 0 ? 'M' : 'L'}${CX + rad * Math.cos(a)},${CY + rad * Math.sin(a)}`;
                }).join(' ') + 'Z';
                return <Path key={i} d={gPath} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
              })}
              {GENRE_LIST.map((_, i) => {
                const a = (i / GENRE_LIST.length) * Math.PI * 2 - Math.PI / 2;
                return <Line key={i} x1={CX} y1={CY} x2={CX + RADIUS * Math.cos(a)} y2={CY + RADIUS * Math.sin(a)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
              })}
              <Path d={radarPath} fill={T.amber + '25'} stroke={T.amber} strokeWidth="1.5" />
              {GENRE_LIST.map((g, i) => {
                const a  = (i / GENRE_LIST.length) * Math.PI * 2 - Math.PI / 2;
                const lx = CX + (RADIUS + 16) * Math.cos(a);
                const ly = CY + (RADIUS + 16) * Math.sin(a);
                return (
                  <SvgText key={g} x={lx} y={ly + 4} textAnchor="middle"
                    fill={T.textMuted} fontSize="10" fontFamily={T.fontMono}>
                    {g}
                  </SvgText>
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

        {/* Breakdown by category */}
        {catStats.length > 0 && (
          <View>
            <Text style={styles.sectionHeader}>Breakdown by Category</Text>
            <View style={{ gap: 8 }}>
              {catStats.map(c => (
                <BreakdownRow
                  key={c.type}
                  c={c}
                  entries={filterByPeriod(entries, timeFilter).filter(e => e.type === c.type).map(e => ({
                    ...e,
                    hours: entryWatchHours(e),
                  }))}
                  onTitleTap={e => router.push(`/detail/${e.id}`)}
                />
              ))}
            </View>
          </View>
        )}

        {/* More coming */}
        <View style={styles.shareCard}>
          <Text style={styles.shareText}>
            More watching insights on the way ✦
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { padding: 4 },
  backArrow: { color: T.textPrimary, fontSize: 20 },
  headerTitle: { color: T.textPrimary, fontFamily: T.fontDisplay, fontSize: 20 },
  scroll: { padding: 16, gap: 16, paddingBottom: 60 },
  filterRow: { gap: 8, paddingBottom: 4 },
  filterPill: { backgroundColor: T.elevated, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  filterPillActive: { backgroundColor: T.amber },
  filterPillText: { color: T.textMuted, fontFamily: T.fontTitle, fontSize: 12 },
  filterPillTextActive: { color: T.bgPrimary },
  catRow: { flexDirection: 'row', gap: 8 },
  catChip: { backgroundColor: T.elevated, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'transparent' },
  catChipActive: { backgroundColor: 'rgba(239,159,39,0.15)', borderColor: 'rgba(239,159,39,0.3)' },
  catChipText: { color: T.textMuted, fontFamily: T.fontTitleMedium, fontSize: 11 },
  catChipTextActive: { color: T.amber },
  viewToggle: { flexDirection: 'row', backgroundColor: T.elevated, borderRadius: 14, padding: 4 },
  viewToggleBtn: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center' },
  viewToggleBtnActive: { backgroundColor: T.surface },
  viewToggleBtnText: { color: T.textMuted, fontFamily: T.fontBodyMedium, fontSize: 13 },
  viewToggleBtnTextActive: { color: T.textPrimary, fontFamily: T.fontTitle },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '47%', backgroundColor: T.surface, borderRadius: 18, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  statNum: { color: T.amber, fontFamily: T.fontDisplay, fontSize: 40, lineHeight: 44 },
  statLabelMono: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  statSub: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 11 },
  nudge: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(239,159,39,0.08)', borderWidth: 1, borderColor: 'rgba(239,159,39,0.15)', borderRadius: 18, padding: 14 },
  nudgeTitle: { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 13, marginBottom: 4 },
  nudgeSub: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 11 },
  nudgeLink: { color: T.amber, fontFamily: T.fontTitle, fontSize: 12 },
  card: { backgroundColor: T.surface, borderRadius: T.radiusCard, padding: 16, gap: 14 },
  cardLabel: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  catStatRow: { paddingVertical: 14 },
  catStatDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  catStatLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catStatType: { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 15 },
  catStatMeta: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12, marginTop: 2 },
  catStatRight: { flexDirection: 'row', gap: 10, paddingLeft: 22 },
  catStatBox: { flex: 1, backgroundColor: T.elevated, borderRadius: 16, padding: 10, alignItems: 'center' },
  catStatNum: { color: T.textPrimary, fontFamily: T.fontDisplay, fontSize: 16 },
  catStatBoxLabel: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 11, marginTop: 4 },
  hardestCard: { backgroundColor: 'rgba(239,159,39,0.08)', borderWidth: 1, borderColor: 'rgba(239,159,39,0.15)', borderRadius: 16, padding: 14, gap: 4 },
  hardestTitle: { color: T.amberSoft, fontFamily: T.fontTitle, fontSize: 13 },
  hardestGenre: { color: T.textPrimary, fontFamily: T.fontDisplay, fontSize: 16 },
  hardestRating: { color: T.amber, fontFamily: T.fontMono },
  hardestSub: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12 },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricToggle: { flexDirection: 'row', backgroundColor: T.elevated, borderRadius: 12, padding: 3, gap: 0 },
  metricBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  metricBtnActive: { backgroundColor: T.surface },
  metricBtnText: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12 },
  metricBtnTextActive: { color: T.textPrimary, fontFamily: T.fontTitleMedium },
  compareBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.elevated, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'transparent' },
  compareBtnActive: { backgroundColor: 'rgba(239,159,39,0.12)', borderColor: 'rgba(239,159,39,0.3)' },
  compareBtnText: { color: T.textMuted, fontFamily: T.fontTitleMedium, fontSize: 11 },
  compareBtnTextActive: { color: T.amber },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  chartLabel: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  chartBig: { color: T.amber, fontFamily: T.fontDisplay, fontSize: 28, lineHeight: 34, marginTop: 4 },
  chartUnit: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 13 },
  sectionHeader: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 },
  radarSvg: { alignSelf: 'center' },
  radarLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 4 },
  radarLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: T.elevated, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  radarDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.amber },
  radarLegendGenre: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 11 },
  radarLegendCount: { color: T.amber, fontFamily: T.fontMono, fontWeight: '600', fontSize: 11 },
  breakdownCard: { backgroundColor: T.elevated, borderRadius: 14, overflow: 'hidden' },
  breakdownHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
  breakdownDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  breakdownType: { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 14 },
  breakdownMeta: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 11, marginTop: 2 },
  breakdownCount: { fontFamily: T.fontMono, fontWeight: '700', fontSize: 18 },
  chevron: { color: T.textMuted, fontSize: 16 },
  breakdownItems: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  breakdownItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14, paddingLeft: 34 },
  breakdownItemDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  breakdownItemTitle: { color: T.amberDeep, fontFamily: T.fontTitleMedium, fontSize: 14 },
  breakdownItemSub: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 11, marginTop: 1 },
  breakdownItemRating: { color: T.amber, fontFamily: T.fontMono, fontWeight: '700', fontSize: 13, flexShrink: 0 },
  breakdownChevron: { color: T.textMuted, fontSize: 12, flexShrink: 0 },
  shareCard: { backgroundColor: T.surface, borderRadius: 16, padding: 14, alignItems: 'center' },
  shareText: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12, textAlign: 'center' },
  shareEmphasis: { color: T.amberSoft, fontFamily: T.fontTitleMedium },
});
