import { useState, useRef } from 'react';
import { Modal, View, Text, Pressable, ScrollView, Switch, StyleSheet, PanResponder, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MiniCalendar from './MiniCalendar';
import { T } from '../constants/tokens';

const SORT_OPTIONS = ['Most Recent Activity','New to Old','Old to New','Rated High to Low','Rated Low to High','A-Z','Z-A'];
const LANG_OPTIONS = ['English','Japanese','Korean','Hindi','Tamil','Spanish','French'];
const TYPE_OPTIONS = ['Anime','Movie','TV Show','Rewatched'];
const CATEGORIES   = [
  { id: 'sort',      label: 'Sort',       icon: 'swap-vertical-outline' },
  { id: 'category',  label: 'Category',   icon: 'pricetag-outline' },
  { id: 'rating',    label: 'Rating',     icon: 'star-outline' },
  { id: 'watchdate', label: 'Watch Date', icon: 'calendar-outline' },
  { id: 'platform',  label: 'Platform',   icon: 'tv-outline' },
  { id: 'language',  label: 'Language',   icon: 'earth-outline' },
  { id: 'genre',     label: 'Genre',      icon: 'film-outline' },
];
const FILTER_PLATFORMS = ['Netflix', 'Crunchyroll', 'Amazon Prime', 'Hotstar', 'Apple TV', 'Theater', 'Others'];

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fmtDate(isoStr) {
  if (!isoStr) return '';
  const [y, m, d] = isoStr.split('-');
  const mons = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${mons[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
}

function fmtDateShort(isoStr) {
  if (!isoStr) return '';
  const [, m, d] = isoStr.split('-');
  const mons = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${mons[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`;
}

function RatingSlider({ value, onChange }) {
  const [trackWidth, setTrackWidth] = useState(0);
  const stateRef   = useRef({ value, onChange, trackWidth: 0 });
  stateRef.current = { value, onChange, trackWidth };
  const leftStart  = useRef(0);
  const rightStart = useRef(0);
  const THUMB = 26;

  const leftPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderGrant: () => {
      const { value: v, trackWidth: tw } = stateRef.current;
      leftStart.current = (v[0] / 10) * tw;
    },
    onPanResponderMove: (_, gs) => {
      const { value: v, onChange: cb, trackWidth: tw } = stateRef.current;
      if (!tw) return;
      const newVal = Math.max(0, Math.min(v[1] - 1,
        Math.round(((leftStart.current + gs.dx) / tw) * 10)));
      if (newVal !== v[0]) cb([newVal, v[1]]);
    },
  })).current;

  const rightPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderGrant: () => {
      const { value: v, trackWidth: tw } = stateRef.current;
      rightStart.current = (v[1] / 10) * tw;
    },
    onPanResponderMove: (_, gs) => {
      const { value: v, onChange: cb, trackWidth: tw } = stateRef.current;
      if (!tw) return;
      const newVal = Math.max(v[0] + 1, Math.min(10,
        Math.round(((rightStart.current + gs.dx) / tw) * 10)));
      if (newVal !== v[1]) cb([v[0], newVal]);
    },
  })).current;

  const leftPos  = trackWidth > 0 ? trackWidth * (value[0] / 10) : 0;
  const rightPos = trackWidth > 0 ? trackWidth * (value[1] / 10) : 0;

  return (
    <View style={{ paddingTop: 8, paddingBottom: 4 }}>
      {/* Min / Max display */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 20 }}>
        <View style={slStyles.valBox}>
          <Text style={slStyles.valLabel}>MIN</Text>
          <Text style={slStyles.valNum}>{value[0]}</Text>
        </View>
        <View style={slStyles.valBox}>
          <Text style={slStyles.valLabel}>MAX</Text>
          <Text style={slStyles.valNum}>{value[1]}</Text>
        </View>
      </View>

      {/* Track — paddingHorizontal gives thumb overflow room at extremes */}
      <View style={{ paddingHorizontal: 13, paddingVertical: 14 }}>
        <View
          style={{ height: 4, backgroundColor: T.elevated, borderRadius: 2, overflow: 'visible' }}
          onLayout={e => {
            const w = e.nativeEvent.layout.width;
            setTrackWidth(w);
            stateRef.current.trackWidth = w;
          }}
        >
          {trackWidth > 0 && (
            <>
              <View style={{
                position: 'absolute',
                left: leftPos,
                width: Math.max(0, rightPos - leftPos),
                height: 4, backgroundColor: T.amber, borderRadius: 2,
              }} />
              <View {...leftPan.panHandlers}
                style={[slStyles.thumb, { left: leftPos - THUMB / 2, top: -(THUMB - 4) / 2 }]}>
                <Text style={slStyles.thumbLabel}>{value[0]}</Text>
              </View>
              <View {...rightPan.panHandlers}
                style={[slStyles.thumb, { left: rightPos - THUMB / 2, top: -(THUMB - 4) / 2 }]}>
                <Text style={slStyles.thumbLabel}>{value[1]}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Scale ticks — padded to match track edges */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 13 }}>
        {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
          <Text key={n} style={slStyles.scaleTick}>{n}</Text>
        ))}
      </View>

      {(value[0] > 0 || value[1] < 10) && (
        <Pressable onPress={() => onChange([0, 10])} style={{ marginTop: 14, alignItems: 'center' }}>
          <Text style={{ color: T.textMuted, fontFamily: T.fontTitleMedium, fontSize: 12 }}>Reset ✕</Text>
        </Pressable>
      )}
    </View>
  );
}

const slStyles = StyleSheet.create({
  valBox: {
    flex: 1, alignItems: 'center', backgroundColor: T.elevated,
    borderRadius: 10, paddingVertical: 8,
  },
  valLabel: {
    color: T.textMuted, fontFamily: T.fontMono, fontSize: 9,
    letterSpacing: 1, textTransform: 'uppercase',
  },
  valNum: { color: T.amber, fontFamily: T.fontDisplay, fontSize: 26, lineHeight: 32 },
  thumb: {
    position: 'absolute',
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: T.amber,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 2,
    elevation: 4,
  },
  thumbLabel: { color: T.bgPrimary, fontFamily: T.fontMono, fontSize: 10, fontWeight: '700' },
  scaleTick: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 8, opacity: 0.55 },
});

export default function FilterSheet({
  show, onClose,
  sort, onSort,
  activeChips, onToggleChip,
  showPaused, onTogglePaused,
  tab,
  language, onLanguage,
  selectedGenres, onToggleGenre,
  onClearAll,
  genres = [],
  unrated, onToggleUnrated,
  ratingRange, onRatingRange,
  dateRange, onDateRange,
  platform, onPlatform,
}) {
  const [pane,      setPane]      = useState('sort');
  const [calTarget, setCalTarget] = useState(null); // 'start' | 'end' | null
  const { height: windowHeight } = useWindowDimensions();
  const sheetHeight = Math.min(Math.round(windowHeight * 0.88), windowHeight - 350);

  const cats = tab === 'watching'
    ? [...CATEGORIES, { id: 'paused', label: 'Paused', icon: 'pause-circle-outline' }]
    : CATEGORIES;

  const ratingActive = ratingRange[0] > 0 || ratingRange[1] < 10;
  const dateActive   = !!(dateRange.start || dateRange.end);

  const hasActive =
    activeChips.length > 0 || language || selectedGenres.length > 0 ||
    unrated || (tab === 'watching' && showPaused) ||
    ratingActive || dateActive || !!platform;

  const todayISO  = toISO(new Date());
  const last7ISO  = toISO(new Date(Date.now() - 7  * 864e5));
  const last30ISO = toISO(new Date(Date.now() - 30 * 864e5));

  function switchPane(id) {
    setPane(id);
    setCalTarget(null);
  }

  function renderPane() {
    switch (pane) {
      case 'sort': return (
        <View style={styles.grid2}>
          {SORT_OPTIONS.map(s => (
            <Pressable key={s} onPress={() => onSort(s)}
              style={[styles.optBtn, sort === s && styles.optBtnActive]}>
              <Text style={[styles.optText, sort === s && styles.optTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </View>
      );

      case 'category': return (
        <View style={styles.grid2}>
          {TYPE_OPTIONS.map(c => (
            <Pressable key={c} onPress={() => onToggleChip(c)}
              style={[styles.optBtn, activeChips.includes(c) && styles.optBtnActive]}>
              <Text style={[styles.optText, activeChips.includes(c) && styles.optTextActive]}>{c}</Text>
            </Pressable>
          ))}
        </View>
      );

      case 'rating': return (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={styles.paneScrollContent}
        >
          <RatingSlider value={ratingRange} onChange={onRatingRange} />
          <View style={styles.unratedBox}>
            <View style={styles.unratedText}>
              <Text style={styles.unratedLabel}>Unrated only</Text>
              <Text style={styles.unratedSub}>Show watched entries that still need a rating.</Text>
            </View>
            <Switch
              value={unrated}
              onValueChange={onToggleUnrated}
              trackColor={{ false: T.elevated, true: T.amber }}
              thumbColor={T.textPrimary}
            />
          </View>
        </ScrollView>
      );

      case 'watchdate': {
        const isLast7  = dateRange.start === last7ISO  && dateRange.end === todayISO;
        const isLast30 = dateRange.start === last30ISO && dateRange.end === todayISO;
        return (
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            contentContainerStyle={styles.paneScrollContent}
          >
            {/* Callout */}
            <View style={styles.dateCallout}>
              <Ionicons name="information-circle-outline" size={12} color={T.textMuted} />
              <Text style={styles.dateCalloutText}>Applies to Watched & Currently Watching</Text>
            </View>

            {/* Presets */}
            <View style={[styles.grid2, { marginBottom: 12 }]}>
              <Pressable
                onPress={() => { onDateRange(isLast7 ? { start: null, end: null } : { start: last7ISO, end: todayISO }); setCalTarget(null); }}
                style={[styles.optBtn, isLast7 && styles.optBtnActive]}
              >
                <Text style={[styles.optText, isLast7 && styles.optTextActive]}>Last 7 days</Text>
              </Pressable>
              <Pressable
                onPress={() => { onDateRange(isLast30 ? { start: null, end: null } : { start: last30ISO, end: todayISO }); setCalTarget(null); }}
                style={[styles.optBtn, isLast30 && styles.optBtnActive]}
              >
                <Text style={[styles.optText, isLast30 && styles.optTextActive]}>Last 30 days</Text>
              </Pressable>
            </View>

            {/* From field */}
            <Pressable
              onPress={() => setCalTarget(calTarget === 'start' ? null : 'start')}
              style={[styles.dateTrigger, calTarget === 'start' && styles.dateTriggerActive]}
            >
              <Text style={styles.dateTriggerLabel}>From</Text>
              <Text style={[styles.dateTriggerVal, !dateRange.start && styles.dateTriggerEmpty]}>
                {dateRange.start ? fmtDate(dateRange.start) : 'Any date'}
              </Text>
              <Ionicons name={calTarget === 'start' ? 'chevron-up' : 'chevron-down'} size={12} color={T.textMuted} />
            </Pressable>
            {calTarget === 'start' && (
              <View style={{ marginTop: 8, marginBottom: 4 }}>
                <MiniCalendar
                  key={`start-${dateRange.start}`}
                  value={dateRange.start}
                  max={dateRange.end || todayISO}
                  onChange={iso => { onDateRange({ ...dateRange, start: iso }); setCalTarget(null); }}
                />
              </View>
            )}

            {/* To field */}
            <Pressable
              onPress={() => setCalTarget(calTarget === 'end' ? null : 'end')}
              style={[styles.dateTrigger, { marginTop: 8 }, calTarget === 'end' && styles.dateTriggerActive]}
            >
              <Text style={styles.dateTriggerLabel}>To</Text>
              <Text style={[styles.dateTriggerVal, !dateRange.end && styles.dateTriggerEmpty]}>
                {dateRange.end ? fmtDate(dateRange.end) : 'Any date'}
              </Text>
              <Ionicons name={calTarget === 'end' ? 'chevron-up' : 'chevron-down'} size={12} color={T.textMuted} />
            </Pressable>
            {calTarget === 'end' && (
              <View style={{ marginTop: 8, marginBottom: 4 }}>
                <MiniCalendar
                  key={`end-${dateRange.end}`}
                  value={dateRange.end}
                  max={todayISO}
                  min={dateRange.start}
                  onChange={iso => { onDateRange({ ...dateRange, end: iso }); setCalTarget(null); }}
                />
              </View>
            )}

            {dateActive && (
              <Pressable
                onPress={() => { onDateRange({ start: null, end: null }); setCalTarget(null); }}
                style={{ marginTop: 14, alignItems: 'center' }}
              >
                <Text style={{ color: T.textMuted, fontFamily: T.fontTitleMedium, fontSize: 12 }}>Clear dates ✕</Text>
              </Pressable>
            )}
          </ScrollView>
        );
      }

      case 'platform': return (
        <View style={styles.grid2}>
          {FILTER_PLATFORMS.map(p => (
            <Pressable key={p} onPress={() => onPlatform(platform === p ? '' : p)}
              style={[styles.optBtn, platform === p && styles.optBtnActive]}>
              <Text style={[styles.optText, platform === p && styles.optTextActive]}>{p}</Text>
            </Pressable>
          ))}
        </View>
      );

      case 'language': return (
        <View style={styles.grid2}>
          {LANG_OPTIONS.map(l => (
            <Pressable key={l} onPress={() => onLanguage(language === l ? '' : l)}
              style={[styles.optBtn, language === l && styles.optBtnActive]}>
              <Text style={[styles.optText, language === l && styles.optTextActive]}>{l}</Text>
            </Pressable>
          ))}
        </View>
      );

      case 'genre': return (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={styles.paneScrollContent}
        >
          <View style={styles.grid2}>
            {genres.map(g => (
              <Pressable key={g} onPress={() => onToggleGenre(g)}
                style={[styles.optBtn, selectedGenres.includes(g) && styles.optBtnActive]}>
                <Text style={[styles.optText, selectedGenres.includes(g) && styles.optTextActive]}>{g}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      );

      case 'paused': return (
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Show Paused entries</Text>
          <Switch
            value={showPaused}
            onValueChange={onTogglePaused}
            trackColor={{ false: T.elevated, true: T.amber }}
            thumbColor={T.textPrimary}
          />
        </View>
      );

      default: return null;
    }
  }

  return (
    <Modal visible={!!show} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { height: sheetHeight }]}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Filter & Sort</Text>
            <View style={styles.headerRight}>
              {hasActive && (
                <Pressable onPress={onClearAll} style={styles.clearBtn}>
                  <Text style={styles.clearText}>Clear all</Text>
                </Pressable>
              )}
              <Pressable onPress={onClose}>
                <Text style={styles.closeX}>✕</Text>
              </Pressable>
            </View>
          </View>

          {/* Active filter pills */}
          {hasActive && (() => {
            const pills = [];
            if (sort !== 'Most Recent Activity') pills.push({ label: sort, onRemove: () => onSort('Most Recent Activity') });
            activeChips.forEach(c => pills.push({ label: c, onRemove: () => onToggleChip(c) }));
            if (language) pills.push({ label: language, onRemove: () => onLanguage('') });
            selectedGenres.forEach(g => pills.push({ label: g, onRemove: () => onToggleGenre(g) }));
            if (tab === 'watching' && showPaused) pills.push({ label: 'Show Paused', onRemove: () => onTogglePaused(false) });
            if (unrated) pills.push({ label: 'Unrated only', onRemove: () => onToggleUnrated(false) });
            if (ratingActive) pills.push({ label: `★ ${ratingRange[0]}–${ratingRange[1]}`, onRemove: () => onRatingRange([0, 10]) });
            if (platform) pills.push({ label: `📺 ${platform}`, onRemove: () => onPlatform('') });
            if (dateActive) {
              const parts = [dateRange.start && fmtDateShort(dateRange.start), dateRange.end && fmtDateShort(dateRange.end)].filter(Boolean);
              pills.push({ label: parts.join(' – '), onRemove: () => onDateRange({ start: null, end: null }) });
            }
            return (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activePillScroll}
                contentContainerStyle={styles.activePillWrap}>
                {pills.map((p, i) => (
                  <View key={i} style={styles.activePill}>
                    <Text style={styles.activePillText}>{p.label}</Text>
                    <Pressable onPress={p.onRemove}>
                      <Text style={styles.activePillX}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            );
          })()}

          {/* Two-column body */}
          <View style={styles.body}>
            {/* Left nav */}
            <View style={styles.leftNav}>
              <Text style={styles.navSectionLabel}>Filters</Text>
              {cats.map(c => (
                <Pressable key={c.id} onPress={() => switchPane(c.id)}
                  style={[styles.navItem, pane === c.id && styles.navItemActive]}>
                  <Ionicons name={c.icon} size={14} color={pane === c.id ? T.amber : T.textMuted} />
                  <Text style={[styles.navLabel, pane === c.id && styles.navLabelActive]}>{c.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Right pane */}
            <View style={styles.rightPane}>
              <Text style={styles.paneTitle}>
                {cats.find(c => c.id === pane)?.label || 'Options'}
              </Text>
              {renderPane()}
            </View>
          </View>

          <Pressable style={styles.applyBtn} onPress={onClose}>
            <Text style={styles.applyText}>Apply</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 44,
  },
  handle: {
    width: 36, height: 4, backgroundColor: T.elevated,
    borderRadius: 4, alignSelf: 'center', marginBottom: 20,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { color: T.textPrimary, fontFamily: T.fontDisplay, fontSize: 18 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clearBtn: {},
  clearText: { color: T.textMuted, fontFamily: T.fontTitleMedium, fontSize: 14 },
  closeX: { color: T.textMuted, fontSize: 18 },
  activePillScroll: { height: 30, marginBottom: 16, flexGrow: 0, flexShrink: 0 },
  activePillWrap: { gap: 8, flexDirection: 'row', alignItems: 'center' },
  activePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 28, backgroundColor: T.elevated, borderRadius: 14,
    paddingHorizontal: 12,
  },
  activePillText: { color: T.textMuted, fontFamily: T.fontFun, fontSize: 11, lineHeight: 14 },
  activePillX: { color: T.textMuted, fontSize: 14, lineHeight: 16 },
  body: { flexDirection: 'row', flex: 1, gap: 12, marginBottom: 16, minHeight: 0 },
  leftNav: { width: 134, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.08)', paddingRight: 10 },
  navSectionLabel: {
    color: T.textMuted, fontFamily: T.fontMono, fontSize: 11,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6,
  },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingVertical: 5, paddingHorizontal: 8, borderRadius: 8,
    marginBottom: 5, borderWidth: 1, borderColor: 'transparent',
  },
  navItemActive: { backgroundColor: T.elevated, borderColor: 'rgba(239,159,39,0.3)' },
  navLabel: { color: T.textMuted, fontFamily: T.fontFun, fontSize: 14, lineHeight: 17, flex: 1 },
  navLabelActive: { color: T.amber },
  rightPane: { flex: 1, minWidth: 0 },
  paneTitle: {
    color: T.textMuted, fontFamily: T.fontMono, fontSize: 11,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14,
  },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  paneScrollContent: { paddingBottom: 20 },
  optBtn: {
    backgroundColor: T.elevated, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 12,
  },
  optBtnActive: { backgroundColor: T.amber },
  optText: { color: T.textMuted, fontFamily: T.fontTitleMedium, fontSize: 12 },
  optTextActive: { color: T.bgPrimary },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  toggleLabel: { color: T.textPrimary, fontFamily: T.fontTitleMedium, fontSize: 14 },
  // Watch Date pane
  dateCallout: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7, marginBottom: 12,
  },
  dateCalloutText: { color: T.textMuted, fontFamily: T.fontFun, fontSize: 11, flex: 1 },
  dateTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.elevated, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: 'transparent',
  },
  dateTriggerActive: { borderColor: 'rgba(239,159,39,0.4)' },
  dateTriggerLabel: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 11, width: 30 },
  dateTriggerVal: { flex: 1, color: T.textPrimary, fontFamily: T.fontTitleMedium, fontSize: 13 },
  dateTriggerEmpty: { color: T.textMuted, fontStyle: 'italic' },
  // Unrated section
  unratedBox: {
    flexDirection: 'row', backgroundColor: T.elevated, borderRadius: 16,
    padding: 14, alignItems: 'center', gap: 14, marginBottom: 16,
  },
  unratedText: { flex: 1 },
  unratedLabel: { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 14 },
  unratedSub: { color: T.textMuted, fontFamily: T.fontFun, fontSize: 11, marginTop: 4 },
  applyBtn: {
    backgroundColor: T.amber, borderRadius: 16, paddingVertical: 14, alignItems: 'center',
  },
  applyText: { color: T.bgPrimary, fontFamily: T.fontDisplay, fontSize: 15 },
});
