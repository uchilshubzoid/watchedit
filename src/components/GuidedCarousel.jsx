import { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  Modal, Dimensions, DeviceEventEmitter,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { T } from '../constants/tokens';

const { width: SW } = Dimensions.get('window');

const SLIDES = [
  {
    visual: 'logit',
    title: 'Search, Rate, Logged.',
    sub: 'Tap the WatchedIt logo or the + button to start. Search across MyAnimeList, TMDB, and OMDB — pick a title, rate it, done.',
  },
  {
    visual: 'watchlog',
    title: 'Your Watch List remembers all.',
    sub: 'Logged entries live here. Log sessions on shows you\'re watching, filter by status, and find stuff you\'d forgotten about. Your digital locker for all things content.',
  },
  {
    visual: 'stats',
    title: 'Know your Watch Stats.',
    sub: 'Watch time, genre and category breakdowns. Bragging stats on how much you\'ve watched and when.',
  },
];

// ── Mini screen mockups ───────────────────────────────────────────────────────

function MockLogIt() {
  const results = [
    { t: 'Attack on Titan', type: 'Anime',   r: '9.0' },
    { t: 'Interstellar',    type: 'Movie',   r: '8.6' },
    { t: 'Succession',      type: 'TV Show', r: '8.9' },
  ];
  return (
    <View style={{ gap: 10, width: SW - 56 }}>
      {/* ── Entry points — shown as real app elements ── */}
      <View style={m.entrySection}>
        <Text style={m.entrySectionLabel}>Tap either to start</Text>
        <View style={m.entryRow}>
          {/* Real WatchedIt logo pill */}
          <View style={m.realLogoPill}>
            <Text style={m.realLogoText}>WatchedIt</Text>
            <View style={m.realLogoDot} />
          </View>
          <Text style={m.orLabel}>or</Text>
          {/* Real amber FAB */}
          <LinearGradient
            colors={[T.amber, T.amberDeep]}
            style={m.realFab}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </LinearGradient>
        </View>
      </View>

      {/* ── Search results card ── */}
      <View style={m.card}>
        <Text style={m.cardSubLabel}>Searches MAL · TMDB · OMDB</Text>
        <View style={m.searchBar}>
          <Text style={m.searchIcon}>⌕</Text>
          <Text style={m.searchPlaceholder}>Search any title...</Text>
        </View>
        {results.map((r, i) => (
          <View key={i} style={[m.row, i > 0 && m.rowDiv]}>
            <View style={m.poster}><Text style={m.posterLetter}>{r.t[0]}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={m.rowTitle} numberOfLines={1}>{r.t}</Text>
              <Text style={m.rowMeta}>{r.type} · ★ {r.r}</Text>
            </View>
            <View style={m.logBtn}><Text style={m.logBtnText}>Log</Text></View>
          </View>
        ))}
      </View>
    </View>
  );
}

function MockWatchLog() {
  const entries = [
    { t: 'Interstellar',   type: 'Movie',   status: 'Watched',    statusColor: T.textMuted, detail: '★ 9.0' },
    { t: 'Demon Slayer',   type: 'Anime',   status: 'Watching',   statusColor: T.amber,     detail: 'Ep 14/26' },
    { t: 'Succession S4',  type: 'TV Show', status: 'Watch Plan', statusColor: T.paused,    detail: '—' },
  ];
  return (
    <View style={m.card}>
      {/* Tab strip */}
      <View style={m.tabRow}>
        {['All', 'Watching', 'Watched', 'Plan'].map((tab, i) => (
          <View key={tab} style={[m.tabChip, i === 0 && m.tabChipActive]}>
            <Text style={[m.tabChipText, i === 0 && m.tabChipTextActive]}>{tab}</Text>
          </View>
        ))}
      </View>
      {entries.map((e, i) => (
        <View key={i} style={[m.row, i > 0 && m.rowDiv]}>
          <View style={m.poster}><Text style={m.posterLetter}>{e.t[0]}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={m.rowTitle} numberOfLines={1}>{e.t}</Text>
            <Text style={m.rowMeta}>{e.type} · {e.detail}</Text>
          </View>
          <Text style={[m.statusBadge, { color: e.statusColor }]}>{e.status}</Text>
        </View>
      ))}
    </View>
  );
}

function MockStats() {
  return (
    <View style={[m.card, { alignItems: 'center', gap: 8 }]}>
      <View style={m.periodPill}><Text style={m.periodText}>LAST 30 DAYS</Text></View>
      <Text style={m.statsMono}>TITLES WATCHED</Text>
      <Text style={m.statsNum}>42</Text>
      <Text style={m.statsTime}>~186h watched</Text>
      <View style={m.catRow}>
        {[['Anime', '18'], ['Movie', '14'], ['TV', '10']].map(([label, count]) => (
          <View key={label} style={m.catPill}>
            <Text style={m.catLabel}>{label}</Text>
            <Text style={m.catCount}>{count}</Text>
          </View>
        ))}
      </View>
      {/* Stats link — matches real WatchTower statsLink exactly */}
      <Text style={m.statsCtaText}>See your stats →</Text>
    </View>
  );
}

const VISUALS = { logit: MockLogIt, watchlog: MockWatchLog, stats: MockStats };

// ── Main component ────────────────────────────────────────────────────────────

export default function GuidedCarousel({ visible, onClose }) {
  const [page, setPage] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setPage(0);
      scrollRef.current?.scrollTo({ x: 0, animated: false });
    }
  }, [visible]);

  function handleScrollEnd(e) {
    const newPage = Math.round(e.nativeEvent.contentOffset.x / SW);
    setPage(newPage);
  }

  function handleCta() {
    onClose();
    DeviceEventEmitter.emit('openLogIt');
  }

  const isLast = page === SLIDES.length - 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>

        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          scrollEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
          style={styles.slideScroll}
        >
          {SLIDES.map((slide, i) => {
            const Visual = VISUALS[slide.visual];
            return (
              <View key={i} style={styles.slide}>
                <Visual />
                <Text style={styles.slideTitle}>{slide.title}</Text>
                <Text style={styles.slideSub}>{slide.sub}</Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>

        {isLast ? (
          <Pressable onPress={handleCta} style={styles.ctaWrap}>
            <LinearGradient
              colors={[T.amber, T.amberDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>Let's log something →</Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <View style={styles.swipeHintRow}>
            <Text style={styles.swipeHint}>swipe to explore →</Text>
          </View>
        )}

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,19,18,0.97)',
    justifyContent: 'center',
    paddingBottom: 48,
    paddingTop: 60,
  },
  closeBtn: {
    position: 'absolute',
    top: 52,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeText: { color: T.textMuted, fontSize: 14 },
  slideScroll: { flexGrow: 0 },
  slide: {
    width: SW,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 20,
  },
  slideTitle: {
    color: T.textPrimary,
    fontFamily: T.fontDisplay,
    fontSize: 22,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  slideSub: {
    color: T.textMuted,
    fontFamily: T.fontFun,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 28,
    marginBottom: 16,
  },
  dot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: T.elevated },
  dotActive: { width: 20, height: 7, borderRadius: 4, backgroundColor: T.amber },
  ctaWrap:      { marginHorizontal: 28, borderRadius: T.radiusButton, overflow: 'hidden' },
  cta:          { paddingVertical: 15, alignItems: 'center', borderRadius: T.radiusButton },
  ctaText:      { color: T.bgPrimary, fontFamily: T.fontDisplay, fontSize: 15 },
  swipeHintRow: { height: 50, alignItems: 'center', justifyContent: 'center' },
  swipeHint:    { color: T.textMuted, fontFamily: T.fontMono, fontSize: 11, opacity: 0.5, letterSpacing: 0.4 },
});

// ── Mock styles ───────────────────────────────────────────────────────────────

const m = StyleSheet.create({
  card: {
    width: SW - 56,
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },

  // Slide 1 — entry points (real app look)
  entrySection: {
    backgroundColor: T.surface,
    borderRadius: 14,
    padding: 12,
    gap: 10,
    alignItems: 'center',
  },
  entrySectionLabel: {
    color: T.textMuted,
    fontFamily: T.fontMono,
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  // Real WatchedIt logo pill — matches WatchTower logoBtn/logoText/logoDot exactly (scaled ~65%)
  realLogoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderColor: T.amber,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  realLogoText: { color: T.amber, fontFamily: T.fontDisplay, fontSize: 14, letterSpacing: -0.3 },
  realLogoDot:  { width: 5, height: 5, borderRadius: 3, backgroundColor: T.amberDeep, marginTop: 1 },
  orLabel:      { color: T.textMuted, fontFamily: T.fontFun, fontSize: 11 },
  // Real FAB — matches LogItFAB exactly (scaled ~65%)
  realFab: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  cardSubLabel: {
    color: T.textMuted,
    fontFamily: T.fontMono,
    fontSize: 8,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  divider:    { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },

  // Shared
  cardHeader: {
    color: T.textPrimary,
    fontFamily: T.fontTitle,
    fontSize: 13,
    marginBottom: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: T.elevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon:       { color: T.textMuted, fontSize: 14 },
  searchPlaceholder: { color: T.textMuted, fontFamily: T.fontFun, fontSize: 12 },
  row:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  rowDiv: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  poster: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: T.elevated,
    alignItems: 'center', justifyContent: 'center',
  },
  posterLetter: { color: T.amber, fontFamily: T.fontDisplay, fontSize: 13 },
  rowTitle:     { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 12 },
  rowMeta:      { color: T.textMuted, fontFamily: T.fontFun, fontSize: 10 },
  logBtn: {
    backgroundColor: T.amber, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  logBtnText: { color: T.bgPrimary, fontFamily: T.fontTitle, fontSize: 10 },

  // Slide 2 — WatchList tabs
  tabRow: { flexDirection: 'row', gap: 6, marginBottom: 2 },
  tabChip: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, backgroundColor: T.elevated,
  },
  tabChipActive:    { backgroundColor: T.amber },
  tabChipText:      { color: T.textMuted, fontFamily: T.fontFun, fontSize: 9 },
  tabChipTextActive: { color: T.bgPrimary, fontFamily: T.fontTitle, fontSize: 9 },
  statusBadge:      { fontFamily: T.fontMono, fontSize: 9, flexShrink: 0 },

  // Slide 3 — Stats
  ratingText: { color: T.amber, fontFamily: T.fontMono, fontWeight: '700', fontSize: 14 },
  periodPill: {
    backgroundColor: T.elevated, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  periodText: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 9, letterSpacing: 0.8 },
  statsMono:  { color: T.textMuted, fontFamily: T.fontMono, fontSize: 9, letterSpacing: 1.4 },
  statsNum:   { color: T.amber, fontFamily: T.fontDisplay, fontSize: 52, lineHeight: 56 },
  statsTime:  { color: T.textMuted, fontFamily: T.fontFun, fontSize: 12 },
  catRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  catPill: {
    backgroundColor: T.elevated, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  catLabel: { color: T.textMuted, fontFamily: T.fontFun, fontSize: 10 },
  catCount:  { color: T.amber, fontFamily: T.fontMono, fontSize: 10 },
  // Matches WatchTower statsLink exactly
  statsCtaText: {
    color: T.textMuted,
    fontFamily: T.fontTitleMedium,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
