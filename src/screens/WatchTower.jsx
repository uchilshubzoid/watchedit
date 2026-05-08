import { useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, DeviceEventEmitter, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import Poster from '../components/Poster';
import TypePill from '../components/TypePill';
import GuidedCarousel from '../components/GuidedCarousel';
import { getEntries } from '../db/storage';
import { T } from '../constants/tokens';
import { consumePendingToast } from '../utils/toastBridge';

const STREAK_COPY = {
  2: ['On a roll 🎬', '2 days in a row'],
  3: ['Building momentum ⚡', '3 days straight!'],
  4: ['4 days running 🔥', 'Remember to stretch'],
  7: ['A whole week! 🏆', 'Incredible dedication'],
  14: ["Two weeks straight 👀", "We're not judging"],
};
function getStreakCopy(n) {
  const keys = Object.keys(STREAK_COPY).map(Number).sort((a, b) => b - a);
  const k = keys.find(k => n >= k);
  return k ? STREAK_COPY[k] : null;
}
function formatDateWithYear(dateStr) {
  if (!dateStr) return '';
  if (/\d{4}/.test(dateStr)) return dateStr;
  return `${dateStr}, ${new Date().getFullYear()}`;
}

function getActivityDate(e) {
  if (e.watch_end_date) return new Date(e.watch_end_date + 'T12:00:00').getTime();
  const dateStr = (e.status === 'watched' ? e.finishedDate : e.lastWatchedDate) || e.date || '';
  if (!dateStr) return 0;
  try {
    const withYear = !dateStr.includes(',')
      ? `${dateStr}, ${new Date().getFullYear()} 12:00:00`
      : dateStr;
    const parsed = new Date(withYear);
    return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  } catch { return 0; }
}

export default function WatchTower() {
  const insets = useSafeAreaInsets();

  const [entries,        setEntries]        = useState([]);
  const [streakDismissed,setStreakDismissed] = useState(false);
  const [toastContent,   setToastContent]   = useState(null);
  const [carouselOpen,   setCarouselOpen]   = useState(false);
  const toastAnim    = useRef(new Animated.Value(0)).current;
  const toastAnimRef = useRef(null);

  function dismissToast() {
    if (toastAnimRef.current) toastAnimRef.current.stop();
    Animated.timing(toastAnim, { toValue: 0, duration: 180, useNativeDriver: true })
      .start(() => setToastContent(null));
  }

  useFocusEffect(useCallback(() => {
    let active = true;
    getEntries().then(data => { if (active) setEntries(data); });
    const pending = consumePendingToast();
    if (pending) {
      setToastContent(pending);
      toastAnim.setValue(0);
      const seq = Animated.sequence([
        Animated.timing(toastAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.delay(10000),
        Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]);
      toastAnimRef.current = seq;
      seq.start(() => { toastAnimRef.current = null; setToastContent(null); });
    }
    return () => { active = false; };
  }, []));

  const thirtyAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  // Stats pool: watched + dropped + watching entries that had a session (spec §20)
  const statsPool  = entries.filter(e => e.status === 'watched' || e.dropped || e.status === 'watching');
  const recentPool = statsPool.filter(e => getActivityDate(e) > thirtyAgo);
  const isRecent   = recentPool.length > 0;
  const countedEntries = isRecent ? recentPool : statsPool;
  const totalCount = countedEntries.length;

  let totalMins = 0;
  countedEntries.forEach(e => {
    if (e.watchTime) {
      const h = e.watchTime.match(/(\d+)h/);
      const m = e.watchTime.match(/(\d+)m/);
      totalMins += (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0);
    }
  });
  const totalHours = Math.round(totalMins / 60);
  const estimated  = countedEntries.some(e => e.estimated);

  const cats = ['Anime', 'Movie', 'TV Show'].map(t => ({
    label: t,
    count: countedEntries.filter(e => e.type === t).length,
  })).filter(c => c.count > 0);

  // UI-only subsets — not used in stats above
  const watched      = entries.filter(e => e.status === 'watched');
  const watching     = entries.filter(e => e.status === 'watching' && !e.paused && !e.dropped);
  const recent       = [...watched].sort((a, b) => getActivityDate(b) - getActivityDate(a)).slice(0, 3);
  const flaggedCount = watched.filter(e => !e.rating).length;

  const STREAK   = 0;
  const streakCopy = getStreakCopy(STREAK);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Logo header — tapping opens LogIt */}
      <View style={styles.topBar}>
        <Pressable onPress={() => DeviceEventEmitter.emit('openLogIt')} style={styles.logoBtn}>
          <Text style={styles.logoText}>WatchedIt</Text>
          <View style={styles.logoDot} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Stats card — hidden when WatchLog is empty */}
        {entries.length > 0 && <View style={styles.card}>
          <View style={styles.period}>
            <View style={styles.dot} />
            <Text style={styles.periodText}>{isRecent ? 'Last 30 days' : 'All time'}</Text>
          </View>
          <Text style={styles.statsLabel}>Titles Watched</Text>
          <Text style={styles.statsNum}>{totalCount}</Text>
          {totalHours > 0 && (
            <Text style={styles.statsTime}>{estimated ? '~' : ''}{totalHours}h watched</Text>
          )}
          {cats.length > 0 && (
            <View style={styles.catPills}>
              {cats.map(c => (
                <View key={c.label} style={styles.catPill}>
                  <Text style={styles.catLabel}>{c.label}</Text>
                  <Text style={styles.catCount}>{c.count}</Text>
                </View>
              ))}
            </View>
          )}
          <Pressable onPress={() => router.push('/stats')} style={{ marginTop: 14 }}>
            <Text style={styles.statsLink}>See your stats →</Text>
          </Pressable>
        </View>}

        {/* Unrated nudge */}
        {flaggedCount > 0 && (
          <View style={styles.nudge}>
            <Text style={{ fontSize: 18 }}>⭐</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.nudgeTitle}>{flaggedCount} watches without a rating</Text>
              <Pressable onPress={() => router.push({ pathname: '/(tabs)/watchlist', params: { tab: 'watched', unrated: 'true' } })}>
                <Text style={styles.nudgeLink}>How did they land? Rate them →</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Streak banner */}
        {STREAK >= 2 && !streakDismissed && streakCopy && (
          <View style={styles.streak}>
            <Text style={{ fontSize: 24 }}>🔥</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.streakHead}>{streakCopy[0]}</Text>
              <Text style={styles.streakSub}>{streakCopy[1]} · <Text style={styles.streakNum}>{STREAK} day streak</Text></Text>
            </View>
            <Pressable onPress={() => setStreakDismissed(true)} style={{ padding: 4 }}>
              <Text style={{ color: T.textMuted, fontSize: 14 }}>✕</Text>
            </Pressable>
          </View>
        )}

        {/* Currently Watching */}
        {watching.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Currently Watching</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingRight: 16 }}>
              {watching.slice(0, 8).map(e => (
                <Pressable key={e.id} onPress={() => router.push(`/detail/${e.id}`)} style={styles.watchCard}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Poster title={e.title} size={44} url={e.poster_url} />
                    <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                      <TypePill type={e.type} />
                      <Text style={styles.watchTitle} numberOfLines={2}>{e.title}</Text>
                    </View>
                  </View>
                  <Text style={styles.watchEp}>
                    {e.ongoing ? `${e.ep} eps · Ongoing` : e.total ? `Ep ${e.ep} of ${e.total}` : `${e.ep} eps watched`}
                  </Text>
                  <Text style={styles.watchDate}>Last: <Text style={{ color: T.textPrimary, fontFamily: T.fontBodyMedium }}>{e.lastWatchedDate}</Text></Text>
                </Pressable>
              ))}
              {watching.length > 8 && (
                <Pressable onPress={() => router.push({ pathname: '/(tabs)/watchlist', params: { tab: 'watching' } })} style={styles.watchMoreCard}>
                  <Text style={styles.watchMoreCount}>+{watching.length - 8}</Text>
                  <Text style={styles.watchMoreLabel}>more</Text>
                  <Text style={styles.watchMoreLink}>View all →</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        )}

        {/* Recently Watched */}
        {recent.length > 0 && (
          <View>
            <View style={styles.recentHeader}>
              <Text style={styles.sectionTitle}>Recently Watched</Text>
              <Pressable onPress={() => router.push({ pathname: '/(tabs)/watchlist', params: { tab: 'watched' } })}>
                <Text style={styles.viewAll}>View all →</Text>
              </Pressable>
            </View>
            <View style={styles.recentCard}>
              {recent.map((e, i) => (
                <View key={e.id}>
                  {i > 0 && <View style={styles.div} />}
                  <Pressable onPress={() => router.push(`/detail/${e.id}`)} style={styles.recentRow}>
                    <Poster title={e.title} size={36} url={e.poster_url} />
                    <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.recentTitle} numberOfLines={1}>{e.title}</Text>
                        {e.rewatch && <Text style={{ color: T.amberSoft, fontSize: 12 }}>↺</Text>}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TypePill type={e.type} />
                        <Text style={styles.recentDate}>{formatDateWithYear(e.finishedDate || e.date)}</Text>
                      </View>
                    </View>
                    <Text style={styles.ratingNum}>{e.rating ? String(e.rating) : '—'}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Welcome card — shown when WatchLog is empty */}
        {entries.length === 0 && (
          <>
            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeEmoji}>🎬</Text>
              <Text style={styles.welcomeHeadline}>Your WatchLog awaits.</Text>
              <Text style={styles.welcomeSub}>
                Log everything you watch — movies, anime, TV shows. Rate it, react to it, make it yours.
              </Text>

              <Pressable
                onPress={() => DeviceEventEmitter.emit('openLogIt')}
                style={styles.welcomeCtaWrap}
              >
                <LinearGradient
                  colors={[T.amber, T.amberDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.welcomeCta}
                >
                  <Text style={styles.welcomeCtaText}>Log your first watch →</Text>
                </LinearGradient>
              </Pressable>

              <Pressable onPress={() => setCarouselOpen(true)} style={{ marginTop: 2 }}>
                <Text style={styles.welcomeGhost}>How does this work? →</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => DeviceEventEmitter.emit('openLogIt')}
              style={({ pressed }) => [styles.hintStrip, pressed && { opacity: 0.75 }]}
            >
              <Text style={{ fontSize: 15 }}>📋</Text>
              <Text style={styles.hintStripText}>
                Haven't finished something? Add it to your Watch Plan — it'll be there when you're ready.
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <GuidedCarousel visible={carouselOpen} onClose={() => setCarouselOpen(false)} />

      {toastContent && (
        <Animated.View style={[styles.toast, {
          bottom: 8,
          opacity: toastAnim,
          transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        }]}>
          <Pressable onPress={dismissToast} style={styles.toastDismiss} hitSlop={8}>
            <Text style={styles.toastDismissText}>✕</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.toastTitle}>{toastContent.title}</Text>
            <Text style={styles.toastBody}>{toastContent.body}</Text>
            {toastContent.sub && (
              <Text style={styles.toastSub}>{toastContent.sub}</Text>
            )}
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bgPrimary },
  topBar: { alignItems: 'center', paddingVertical: 14 },
  logoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: T.amber, borderRadius: 22,
    paddingHorizontal: 18, paddingVertical: 8,
  },
  logoText: { color: T.amber, fontFamily: T.fontDisplay, fontSize: 22, letterSpacing: -0.5 },
  logoDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: T.amberDeep, marginTop: 2 },
  scroll: { padding: 16, gap: 20, paddingBottom: 32 },
  card: { backgroundColor: T.surface, borderRadius: T.radiusCard, padding: 20, alignItems: 'center' },
  period: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.elevated, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 14 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.amber },
  periodText: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 10, letterSpacing: 0.8 },
  statsLabel: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 6 },
  statsNum: { color: T.amber, fontFamily: T.fontDisplay, fontSize: 80, lineHeight: 88 },
  statsTime: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 13, marginTop: 8 },
  catPills: { flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' },
  catPill: { backgroundColor: T.elevated, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  catLabel: { color: T.textMuted, fontFamily: T.fontBodyMedium, fontSize: 11 },
  catCount: { color: T.amber, fontFamily: T.fontMono, fontWeight: '600', fontSize: 11 },
  statsLink: { color: T.textMuted, fontFamily: T.fontTitleMedium, fontSize: 12, textDecorationLine: 'underline' },
  nudge: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(239,159,39,0.08)', borderWidth: 1, borderColor: 'rgba(239,159,39,0.15)', borderRadius: 16, padding: 14 },
  nudgeTitle: { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 14 },
  nudgeLink: { color: T.amber, fontFamily: T.fontTitle, fontSize: 12 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(239,159,39,0.1)', borderWidth: 1, borderColor: 'rgba(239,159,39,0.2)', borderRadius: 16, padding: 12 },
  streakHead: { color: T.amber, fontFamily: T.fontDisplay, fontSize: 14 },
  streakSub: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12, marginTop: 2 },
  streakNum: { color: T.amberSoft, fontFamily: T.fontMono, fontWeight: '600' },
  sectionTitle: { color: T.textPrimary, fontFamily: T.fontDisplay, fontSize: 17, letterSpacing: -0.1, marginBottom: 12 },
  watchCard: { width: 190, backgroundColor: T.surface, borderRadius: 18, padding: 14, gap: 10 },
  watchTitle: { color: T.amberDeep, fontFamily: T.fontTitle, fontSize: 14, lineHeight: 18, height: 36 },
  watchEp: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 11 },
  watchDate: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 11 },
  watchMoreCard: { width: 110, backgroundColor: 'rgba(239,159,39,0.06)', borderWidth: 1.5, borderColor: 'rgba(239,159,39,0.18)', borderRadius: 18, padding: 14, gap: 4, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  watchMoreCount: { color: T.amber, fontFamily: T.fontDisplay, fontSize: 26 },
  watchMoreLabel: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 11 },
  watchMoreLink: { color: T.amber, fontFamily: T.fontTitleMedium, fontSize: 11, marginTop: 4 },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  viewAll: { color: T.amber, fontFamily: T.fontTitleMedium, fontSize: 12 },
  recentCard: { backgroundColor: T.surface, borderRadius: T.radiusCard, padding: 16 },
  div: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 14 },
  recentRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  recentTitle: { color: T.amberDeep, fontFamily: T.fontTitle, fontSize: 14, flex: 1 },
  recentDate: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 11 },
  ratingNum: { color: T.amber, fontFamily: T.fontMono, fontWeight: '800', fontSize: 16 },
  // Welcome card (empty state)
  welcomeCard: {
    backgroundColor: 'rgba(239,159,39,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(239,159,39,0.2)',
    borderRadius: T.radiusCard,
    padding: 24,
    alignItems: 'center',
    gap: 14,
  },
  welcomeEmoji: { fontSize: 44, lineHeight: 52 },
  welcomeHeadline: {
    color: T.textPrimary,
    fontFamily: T.fontDisplay,
    fontSize: 22,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  welcomeSub: {
    color: T.textMuted,
    fontFamily: T.fontBody,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 270,
  },
  welcomeCtaWrap: {
    alignSelf: 'stretch',
    borderRadius: T.radiusButton,
    overflow: 'hidden',
    marginTop: 4,
  },
  welcomeCta: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: T.radiusButton,
  },
  welcomeCtaText: { color: T.bgPrimary, fontFamily: T.fontDisplay, fontSize: 15 },
  welcomeGhost: {
    color: T.textMuted,
    fontFamily: T.fontTitleMedium,
    fontSize: 12,
    textDecorationLine: 'underline',
    opacity: 0.7,
  },

  // Hint strip
  hintStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(239,159,39,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(239,159,39,0.12)',
    borderRadius: 14,
    padding: 14,
  },
  hintStripText: {
    flex: 1,
    color: T.textMuted,
    fontFamily: T.fontBody,
    fontSize: 12,
    lineHeight: 18,
  },

  toast: {
    position: 'absolute', left: 16, right: 16,
    backgroundColor: T.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(239,159,39,0.2)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 10,
  },
  toastTitle:       { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 13 },
  toastBody:        { color: T.textMuted,  fontFamily: T.fontBody,  fontSize: 12, marginTop: 1 },
  toastSub:         { color: T.textMuted,  fontFamily: T.fontMono,  fontSize: 10, marginTop: 3, opacity: 0.7 },
  toastDismiss:     { position: 'absolute', top: 10, right: 12, padding: 4 },
  toastDismissText: { color: T.textMuted, fontSize: 14 },
});
