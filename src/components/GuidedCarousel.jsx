import { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  Modal, Dimensions, DeviceEventEmitter,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../constants/tokens';

const { width: SW } = Dimensions.get('window');

const SLIDES = [
  {
    visual: 'logit',
    title: 'Search, tap, done.',
    sub: 'Search any title — anime, movie, or TV show. Log it in seconds with a rating and your reaction.',
  },
  {
    visual: 'watchlog',
    title: 'Your taste, your record.',
    sub: 'Every entry is rated and reacted to. Sortable, searchable, and entirely yours.',
  },
  {
    visual: 'stats',
    title: 'Know your watching self.',
    sub: 'Watch time, streaks, genre breakdown — see your taste reflected back in numbers.',
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
    <View style={m.card}>
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
  );
}

function MockWatchLog() {
  const entries = [
    { t: 'Spirited Away', type: 'Anime',   date: 'Feb 12', r: '9.5' },
    { t: 'Interstellar',  type: 'Movie',   date: 'Jan 30', r: '9.0' },
    { t: 'Succession S4', type: 'TV Show', date: 'Jan 18', r: '8.5' },
  ];
  return (
    <View style={m.card}>
      <Text style={m.cardHeader}>Recently Watched</Text>
      {entries.map((e, i) => (
        <View key={i} style={[m.row, i > 0 && m.rowDiv]}>
          <View style={m.poster}><Text style={m.posterLetter}>{e.t[0]}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={m.rowTitle} numberOfLines={1}>{e.t}</Text>
            <Text style={m.rowMeta}>{e.type} · {e.date}</Text>
          </View>
          <Text style={m.ratingText}>{e.r}</Text>
        </View>
      ))}
    </View>
  );
}

function MockStats() {
  return (
    <View style={[m.card, { alignItems: 'center', gap: 10 }]}>
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

  function goNext() {
    if (page < SLIDES.length - 1) {
      const next = page + 1;
      scrollRef.current?.scrollTo({ x: SW * next, animated: true });
      setPage(next);
    } else {
      onClose();
      DeviceEventEmitter.emit('openLogIt');
    }
  }

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
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
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

        <Pressable onPress={goNext} style={styles.ctaWrap}>
          <LinearGradient
            colors={[T.amber, T.amberDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>
              {page < SLIDES.length - 1 ? 'Next →' : "Let's log something →"}
            </Text>
          </LinearGradient>
        </Pressable>

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
    fontFamily: T.fontBody,
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
    marginBottom: 20,
  },
  dot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: T.elevated },
  dotActive: { width: 20, height: 7, borderRadius: 4, backgroundColor: T.amber },
  ctaWrap:   { marginHorizontal: 28, borderRadius: T.radiusButton, overflow: 'hidden' },
  cta:       { paddingVertical: 15, alignItems: 'center', borderRadius: T.radiusButton },
  ctaText:   { color: T.bgPrimary, fontFamily: T.fontDisplay, fontSize: 15 },
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
    marginBottom: 4,
  },
  searchIcon:       { color: T.textMuted, fontSize: 14 },
  searchPlaceholder: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12 },
  row:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  rowDiv: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  poster: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: T.elevated,
    alignItems: 'center', justifyContent: 'center',
  },
  posterLetter: { color: T.amber, fontFamily: T.fontDisplay, fontSize: 13 },
  rowTitle:     { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 12 },
  rowMeta:      { color: T.textMuted, fontFamily: T.fontBody, fontSize: 10 },
  logBtn: {
    backgroundColor: T.amber, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  logBtnText: { color: T.bgPrimary, fontFamily: T.fontTitle, fontSize: 10 },
  ratingText: { color: T.amber, fontFamily: T.fontMono, fontWeight: '700', fontSize: 14 },
  periodPill: {
    backgroundColor: T.elevated, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  periodText: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 9, letterSpacing: 0.8 },
  statsMono:  { color: T.textMuted, fontFamily: T.fontMono, fontSize: 9, letterSpacing: 1.4 },
  statsNum:   { color: T.amber, fontFamily: T.fontDisplay, fontSize: 52, lineHeight: 56 },
  statsTime:  { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12 },
  catRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  catPill: {
    backgroundColor: T.elevated, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  catLabel: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 10 },
  catCount:  { color: T.amber, fontFamily: T.fontMono, fontSize: 10 },
});
