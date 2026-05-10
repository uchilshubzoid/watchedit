import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, DeviceEventEmitter, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import Poster from '../components/Poster';
import TypePill from '../components/TypePill';
import GuidedCarousel from '../components/GuidedCarousel';
import { getEntries } from '../db/storage';
import { T } from '../constants/tokens';
import { consumePendingToast } from '../utils/toastBridge';

function formatDateWithYear(dateStr) {
  if (!dateStr) return '';
  if (/\d{4}/.test(dateStr)) return dateStr;
  return `${dateStr}, ${new Date().getFullYear()}`;
}

function daysAgoStr(e) {
  const ms = getActivityDate(e);
  if (!ms) return e.lastWatchedDate || '';
  const days = Math.floor((Date.now() - ms) / 864e5);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
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
  const [entries,      setEntries]      = useState([]);
  const [toastContent, setToastContent] = useState(null);
  const [carouselOpen,   setCarouselOpen]   = useState(false);
  const toastAnim    = useRef(new Animated.Value(0)).current;
  const toastAnimRef = useRef(null);
  const toastTimerRef = useRef(null);
  const focusedRef = useRef(false);

  function clearToastTimer() {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  }

  function hideToast({ animated = true } = {}) {
    clearToastTimer();
    if (toastAnimRef.current) toastAnimRef.current.stop();
    if (!animated) {
      toastAnim.setValue(0);
      setToastContent(null);
      return;
    }
    const anim = Animated.timing(toastAnim, { toValue: 0, duration: 180, useNativeDriver: true });
    toastAnimRef.current = anim;
    anim.start(() => {
      toastAnimRef.current = null;
      setToastContent(null);
    });
  }

  function showToast(pending) {
    clearToastTimer();
    if (toastAnimRef.current) toastAnimRef.current.stop();
    setToastContent(pending);
    toastAnim.setValue(0);

    const anim = Animated.timing(toastAnim, { toValue: 1, duration: 220, useNativeDriver: true });
    toastAnimRef.current = anim;
    anim.start(({ finished }) => {
      toastAnimRef.current = null;
      if (!finished || !focusedRef.current) return;
      toastTimerRef.current = setTimeout(() => {
        if (focusedRef.current) hideToast();
      }, 10000);
    });
  }

  function dismissToast() {
    hideToast();
  }

  useFocusEffect(useCallback(() => {
    let active = true;
    focusedRef.current = true;
    getEntries().then(data => { if (active) setEntries(data); });
    const pending = consumePendingToast();
    if (pending) showToast(pending);
    return () => {
      active = false;
      focusedRef.current = false;
      hideToast({ animated: false });
    };
  }, []));

  // Reload when any entry is updated from DetailView (tab focus may not re-fire when
  // returning from a root-stack screen pushed on top of the tabs)
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('entryUpdated', () => {
      getEntries().then(data => setEntries(data));
    });
    return () => sub.remove();
  }, []);

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

  const typeStats = [
    { type: 'Anime',   color: T.colorAnime, showEps: true },
    { type: 'Movie',   color: T.colorMovie, showEps: false },
    { type: 'TV Show', color: T.colorTV,    showEps: true },
  ].map(def => ({
    ...def,
    count: countedEntries.filter(e => e.type === def.type).length,
    eps:   def.showEps
      ? countedEntries.filter(e => e.type === def.type).reduce((s, e) => s + (e.ep || 0), 0)
      : null,
  })).filter(t => t.count > 0);

  // UI-only subsets — not used in stats above
  const watched      = entries.filter(e => e.status === 'watched');
  const watching     = entries.filter(e => e.status === 'watching' && !e.paused && !e.dropped);
  const recent       = [...watched].sort((a, b) => getActivityDate(b) - getActivityDate(a)).slice(0, 3);
  const flaggedCount = watched.filter(e => !e.rating).length;

  // const activeDays = new Set(
  //   countedEntries.map(e => {
  //     const t = getActivityDate(e);
  //     if (!t) return null;
  //     const d = new Date(t);
  //     return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
  //   }).filter(Boolean)
  // ).size;

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
        {entries.length > 0 && (
          <View style={styles.card}>

            {/* Headline: centered number + watch time pinned to right */}
            <Pressable onPress={() => router.push('/stats')}>
              <View>
                <Text style={styles.statsNum}>{totalCount}</Text>
                {totalHours > 0 && (
                  <View style={styles.watchTimeBlock}>
                    <Text style={styles.watchTimeNum}>{estimated ? '~' : ''}{totalHours}h</Text>
                    <Text style={styles.watchTimeLabel}>watch time</Text>
                  </View>
                )}
              </View>
              <Text style={styles.titlesRow}>
                <Text style={styles.titlesLabel}>titles watched</Text>
                <Text style={styles.titlesSubLabel}> · {isRecent ? 'last 30 days' : 'all time'}</Text>
              </Text>
            </Pressable>

            {/* Segmented bar + labels */}
            {typeStats.length > 0 && (
              <View style={{ marginTop: 28 }}>
                <View style={styles.segBar}>
                  {typeStats.map((t, i) => (
                    <Pressable
                      key={t.type}
                      onPress={() => router.push({ pathname: '/(tabs)/watchlist', params: { type: t.type, datePreset: 'last30' } })}
                      style={[
                        styles.segBarSegment,
                        { flex: t.count, backgroundColor: t.color },
                        i === 0 && styles.segFirst,
                        i === typeStats.length - 1 && styles.segLast,
                      ]}
                    />
                  ))}
                </View>
                <View style={styles.segLabels}>
                  {typeStats.map((t, i) => (
                    <Pressable
                      key={t.type}
                      onPress={() => router.push({ pathname: '/(tabs)/watchlist', params: { type: t.type, datePreset: 'last30' } })}
                      style={[styles.segLabelCol, i < typeStats.length - 1 && { paddingRight: 14 }]}
                    >
                      <View style={styles.segLabelRow1}>
                        <View style={[styles.segDot, { backgroundColor: t.color }]} />
                        <Text style={[styles.segTypeName, { color: t.color }]} numberOfLines={1}>{t.type}</Text>
                      </View>
                      <Text style={styles.segSub}>
                        {`${t.count} ${t.count === 1 ? 'title' : 'titles'}`}{t.eps !== null && t.eps > 0 ? ` · ${t.eps} eps` : ''}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Divider + CTA */}
            <View style={styles.statsDivider} />
            <Pressable onPress={() => router.push('/stats')}>
              <Text style={styles.statsCtaText}>See your watch stats →</Text>
            </Pressable>

          </View>
        )}

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

        {/* Active days banner — commented out for later scope */}
        {/* activeDays > 0 && (
          <View style={styles.streak}>
            <Text style={{ fontSize: 24 }}>📅</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.streakHead}>{activeDays} active {activeDays === 1 ? 'day' : 'days'}</Text>
              <Text style={styles.streakSub}>{isRecent ? 'last 30 days' : 'all time'} · days you logged content</Text>
            </View>
          </View>
        ) */}

        {/* Currently Watching */}
        {watching.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Currently Watching</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingRight: 16 }}>
              {watching.slice(0, 8).map(e => (
                <Pressable key={e.id} onPress={() => router.push(`/detail/${e.id}`)} style={styles.watchCard}>
                  <View style={styles.watchPosterWrap}>
                    <Poster title={e.title} size={79} url={e.poster_url} />
                  </View>
                  <View style={styles.watchContent}>
                    <View style={styles.watchPills}>
                      <TypePill type={e.type} />
                      {e.paused && (
                        <View style={styles.pausedPill}>
                          <Text style={styles.pausedPillText}>Paused</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.watchTitle} numberOfLines={2}>{e.title}</Text>
                    <View>
                      <Text style={styles.watchEp}>
                        {e.ongoing ? `${e.ep} eps · Ongoing` : e.total ? `Ep ${e.ep} / ${e.total}` : `${e.ep} eps watched`}
                      </Text>
                      <Text style={styles.watchDate}>last watched · {daysAgoStr(e)}</Text>
                    </View>
                  </View>
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
                Log everything you watch — movies, anime, TV shows.{'\n'}Rate it, react to it, make it yours.
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
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.hintStripPrimary}>
                  Not done watching something?
                </Text>
                <Text style={styles.hintStripSub}>
                  Watch Plan saves it for later.
                </Text>
              </View>
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
  card: { backgroundColor: T.surface, borderRadius: T.radiusCard, padding: 20 },
  statsNum: { color: T.amber, fontFamily: T.fontDisplay, fontSize: 84, lineHeight: 84, textAlign: 'center' },
  watchTimeBlock: { position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center' },
  watchTimeNum: { color: T.textMuted, fontFamily: T.fontTitle, fontSize: 22, lineHeight: 26 },
  watchTimeLabel: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 12, marginTop: 2 },
  titlesRow: { textAlign: 'center', marginTop: 6 },
  titlesLabel: { color: T.textPrimary, fontFamily: T.fontBodyMedium, fontSize: 15 },
  titlesSubLabel: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 11 },
  segBar: { flexDirection: 'row', height: 14 },
  segBarSegment: { height: 14 },
  segFirst: { borderTopLeftRadius: 7, borderBottomLeftRadius: 7 },
  segLast: { borderTopRightRadius: 7, borderBottomRightRadius: 7 },
  segLabels: { flexDirection: 'row', marginTop: 12 },
  segLabelCol: { flex: 1 },
  segLabelRow1: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  segDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  segTypeName: { fontFamily: T.fontTitle, fontSize: 14 },
  segSub: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 13, marginTop: 2 },
  statsDivider: { height: 1, backgroundColor: T.elevated, opacity: 0.6, marginTop: 20, marginBottom: 14 },
  statsCtaText: { color: T.amber, fontFamily: T.fontTitle, fontSize: 14, textAlign: 'center' },
  nudge: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(239,159,39,0.08)', borderWidth: 1, borderColor: 'rgba(239,159,39,0.15)', borderRadius: 16, padding: 14 },
  nudgeTitle: { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 14 },
  nudgeLink: { color: T.amber, fontFamily: T.fontTitle, fontSize: 12 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(239,159,39,0.1)', borderWidth: 1, borderColor: 'rgba(239,159,39,0.2)', borderRadius: 16, padding: 12 },
  streakHead: { color: T.amber, fontFamily: T.fontDisplay, fontSize: 14 },
  streakSub: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12, marginTop: 2 },
  streakNum: { color: T.amberSoft, fontFamily: T.fontMono, fontWeight: '600' },
  sectionTitle: { color: T.textPrimary, fontFamily: T.fontDisplay, fontSize: 17, letterSpacing: -0.1, marginBottom: 12 },
  watchCard: { width: 284, height: 138, backgroundColor: T.surface, borderRadius: 16, flexDirection: 'row' },
  watchPosterWrap: { padding: 14, paddingRight: 0, justifyContent: 'center' },
  watchContent: { flex: 1, paddingTop: 14, paddingBottom: 14, paddingLeft: 12, paddingRight: 14, justifyContent: 'space-between' },
  watchPills: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pausedPill: { backgroundColor: 'rgba(139,163,196,0.15)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  pausedPillText: { color: T.paused, fontFamily: T.fontTitleMedium, fontSize: 10 },
  watchTitle: { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 16, lineHeight: 21 },
  watchEp: { color: T.amber, fontFamily: T.fontMono, fontWeight: '700', fontSize: 13 },
  watchDate: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 12, marginTop: 2 },
  watchMoreCard: { width: 100, height: 180, backgroundColor: 'rgba(239,159,39,0.06)', borderWidth: 1.5, borderColor: 'rgba(239,159,39,0.18)', borderRadius: 16, padding: 14, gap: 4, alignItems: 'center', justifyContent: 'center' },
  watchMoreCount: { color: T.amber, fontFamily: T.fontDisplay, fontSize: 26 },
  watchMoreLabel: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 11 },
  watchMoreLink: { color: T.amber, fontFamily: T.fontTitleMedium, fontSize: 11, marginTop: 4 },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  viewAll: { color: T.amber, fontFamily: T.fontTitleMedium, fontSize: 12 },
  recentCard: { backgroundColor: T.surface, borderRadius: T.radiusCard, padding: 16 },
  div: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 14 },
  recentRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  recentTitle: { color: T.amberDeep, fontFamily: T.fontTitle, fontSize: 14, flex: 1 },
  recentDate: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12 },
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
  hintStripPrimary: {
    color: T.textPrimary,
    fontFamily: T.fontTitle,
    fontSize: 13,
    lineHeight: 18,
  },
  hintStripSub: {
    color: T.textMuted,
    fontFamily: T.fontBody,
    fontSize: 12,
    lineHeight: 16,
  },

  toast: {
    position: 'absolute', left: 16, right: 16, zIndex: 50,
    backgroundColor: T.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(239,159,39,0.2)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 20,
  },
  toastTitle:       { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 13 },
  toastBody:        { color: T.textMuted,  fontFamily: T.fontBody,  fontSize: 12, marginTop: 1 },
  toastSub:         { color: T.textMuted,  fontFamily: T.fontMono,  fontSize: 10, marginTop: 3, opacity: 0.7 },
  toastDismiss:     { position: 'absolute', top: 10, right: 12, padding: 4, zIndex: 2, elevation: 2 },
  toastDismissText: { color: T.textMuted, fontSize: 14 },
});
