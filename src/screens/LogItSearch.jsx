import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator, StyleSheet, ScrollView, Modal, Image, Animated, Keyboard, Dimensions, DeviceEventEmitter } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Poster from '../components/Poster';
import TypePill from '../components/TypePill';
import { searchTitles } from '../api';
import { getEntries, addEntry, getTitleLanguagePref } from '../db/storage';
import { getPreferredTitle } from '../utils/titleUtils';
import { highResPosterUrl } from '../utils/posterUtils';
import { T } from '../constants/tokens';

const PREVIEW_DURATION = 10000;
const SOURCES        = ['MAL', 'TMDB', 'OMDB'];
const TYPE_FILTERS   = ['All', 'Movie', 'TV Show', 'Anime'];

function SearchPreviewModal({ result: r, onClose }) {
  const remainingRef = useRef(PREVIEW_DURATION);
  const [remaining,  setRemaining]  = useState(PREVIEW_DURATION);
  const pausedRef    = useRef(false);
  const [held,       setHeld]       = useState(false);
  const [imgExpanded,setImgExpanded]= useState(false);

  useEffect(() => {
    const iv = setInterval(() => {
      if (pausedRef.current) return;
      remainingRef.current = Math.max(0, remainingRef.current - 50);
      setRemaining(remainingRef.current);
      if (remainingRef.current <= 0) onClose();
    }, 50);
    return () => clearInterval(iv);
  }, [onClose]);

  function hold()    { pausedRef.current = true;  setHeld(true);  }
  function release() { pausedRef.current = false; setHeld(false); }

  const pct      = (remaining / PREVIEW_DURATION) * 100;
  const secsLeft = Math.ceil(remaining / 1000);
  const isMovie  = r.content_type === 'Movie';

  const meta = [];
  if (r.year)                                   meta.push({ label: 'Year',     value: String(r.year) });
  if (!isMovie && r.episode_count)              meta.push({ label: 'Episodes', value: String(r.episode_count) });
  if (!isMovie && r.is_ongoing != null)         meta.push({ label: 'Status',   value: r.is_ongoing ? 'Ongoing' : 'Completed' });
  if (!isMovie && r.episode_runtime_mins)       meta.push({ label: 'Runtime',  value: `${r.episode_runtime_mins} min/ep` });
  if (isMovie  && r.episode_runtime_mins)       meta.push({ label: 'Runtime',  value: `${r.episode_runtime_mins} min` });
  if (r.language)                               meta.push({ label: 'Language', value: r.language });
  if (r.global_rating)                          meta.push({ label: 'Rating',   value: `★ ${r.global_rating}` });

  return (
    <Pressable style={styles.modalBackdrop} onPress={onClose}>
      <Pressable style={styles.previewCard} onPress={() => {}} onPressIn={hold} onPressOut={release}>
        {r.poster_url ? (
          <View style={imgExpanded ? styles.posterBannerExpanded : styles.posterBanner}>
            <Image
              source={{ uri: r.poster_url }}
              style={imgExpanded ? styles.posterFull : styles.posterCropped}
              resizeMode={imgExpanded ? 'contain' : 'cover'}
            />
            {!imgExpanded && <View style={styles.posterGradient} />}
            <Pressable onPress={() => setImgExpanded(v => !v)} style={styles.expandBtn}>
              <Text style={styles.expandBtnText}>{imgExpanded ? '⊡ Collapse' : '⊞ Full poster'}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterPlaceholderLetter}>{(r.title || '?')[0]}</Text>
          </View>
        )}

        <View style={styles.previewContent}>
          <Text style={styles.previewTitle}>{r.title}</Text>
          <View style={styles.previewPills}>
            <TypePill type={r.content_type} />
            {r.genre_tags?.slice(0, 2).map(g => (
              <View key={g} style={styles.previewGenreChip}>
                <Text style={styles.previewGenreText}>{g}</Text>
              </View>
            ))}
          </View>

          {meta.length > 0 && (
            <View style={styles.previewMetaGrid}>
              {meta.map(({ label, value }) => (
                <View key={label} style={styles.previewMetaCell}>
                  <Text style={styles.previewMetaLabel}>{label}</Text>
                  <Text style={styles.previewMetaValue}>{value}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.previewBottom}>
            <Text style={[styles.previewStatusLine, held && styles.previewStatusHeld]} numberOfLines={2}>
              {held ? "Holding... let go when you're done 👌" : `Auto-closing in ${secsLeft}s · hold to pause`}
            </Text>
            <Pressable onPress={onClose} style={styles.closeModalBtn}>
              <Text style={styles.closeModalText}>Close</Text>
            </Pressable>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: held ? T.amberSoft : T.amber }]} />
          </View>
        </View>
      </Pressable>
    </Pressable>
  );
}

function SourceBadge({ source }) {
  const colors = { MAL: '#6B9BDF', TMDB: '#01B4E4', OMDB: '#F5C518' };
  const color = colors[source] || T.textMuted;
  return (
    <View style={[styles.badge, { backgroundColor: color + '22' }]}>
      <Text style={[styles.badgeText, { color }]}>{source}</Text>
    </View>
  );
}

const SHEET_START = Dimensions.get('window').height;

export default function LogItSearch({ onClose }) {
  const insets = useSafeAreaInsets();

  // Entrance/exit animation values — sheet slides up, backdrop fades in simultaneously
  const sheetAnim   = useRef(new Animated.Value(SHEET_START)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  function dismiss() {
    // Animate out before dismissing the route
    Animated.parallel([
      Animated.timing(sheetAnim,    { toValue: SHEET_START, duration: 240, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0,           duration: 200, useNativeDriver: true }),
    ]).start(() => {
      if (onClose) onClose(); else router.back();
    });
  }

  const [query,         setQuery]         = useState('');
  const [results,       setResults]       = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [searchError,   setSearchError]   = useState(null);
  const [activeSources, setActiveSources] = useState(new Set(SOURCES));
  const [addedIds,      setAddedIds]      = useState(new Set());
  const [titleLang,     setTitleLang]     = useState('en');
  const [previewItem,   setPreviewItem]   = useState(null);
  const [typeFilter,    setTypeFilter]    = useState('All');
  const inputRef  = useRef(null);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    getTitleLanguagePref().then(setTitleLang);
    // Entrance: sheet springs up + backdrop fades in together
    Animated.parallel([
      Animated.spring(sheetAnim, {
        toValue: 0, friction: 9, tension: 70, useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1, duration: 260, useNativeDriver: true,
      }),
    ]).start();
    // Focus immediately so keyboard rises in sync with the sheet animation
    setTimeout(() => inputRef.current?.focus(), 0);

    // When LogItDetails submits successfully, it emits this to close the search sheet too
    const dismissSub = DeviceEventEmitter.addListener('dismissLogItSearch', dismiss);
    const show = Keyboard.addListener('keyboardDidShow', e => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => { dismissSub.remove(); show.remove(); hide.remove(); };
  }, []);

  const dt = r => getPreferredTitle(r, titleLang);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setSearchError(null);
    setActiveSources(new Set(SOURCES));
    setTypeFilter('All');
    try {
      const entries = await getEntries();
      const { combined, bySource } = await searchTitles(query, entries);
      setResults({ combined, bySource });
    } catch (err) {
      console.warn('[LogItSearch] search failed:', err.message);
      setSearchError('Search failed. Check your connection and try again.');
      setResults({ combined: [], bySource: { MAL: [], TMDB: [], OMDB: [] } });
    } finally {
      setLoading(false);
    }
  }

  const combined  = results?.combined ?? null;
  const bySourceFiltered = combined === null
    ? null
    : combined.filter(r => activeSources.has(r.source));
  const filteredResults  = bySourceFiltered === null
    ? null
    : typeFilter === 'All' ? bySourceFiltered : bySourceFiltered.filter(r => r.content_type === typeFilter);

  function toggleSource(src) {
    setActiveSources(prev => {
      if (prev.has(src) && prev.size === 1) return prev;
      const next = new Set(prev);
      next.has(src) ? next.delete(src) : next.add(src);
      return next;
    });
  }
  const singleRewatch = filteredResults?.length === 1 && filteredResults[0].inLog;

  async function handleAddToWatchPlan(r) {
    const id = String(Date.now());
    const posterUrl = highResPosterUrl(r.poster_url);
    await addEntry({
      id,
      title:            dt(r),
      type:             r.content_type,
      lang:             r.language || '',
      rating:           null,
      date:             new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      status:           'watchplan',
      ep:               null,
      total:            r.episode_count || null,
      ongoing:          r.is_ongoing || false,
      rewatch:          false,
      paused:           false,
      dropped:          false,
      bookmark:         false,
      genre:            r.genre_tags || [],
      reaction:         '',
      recommend:        false,
      watchTime:        null,
      estimated:        false,
      poster_url:       posterUrl,
      malRating:        r.global_rating || null,
      watch_start_date: null,
      watch_end_date:   null,
      logged_at:        new Date().toISOString(),
    });
    setAddedIds(prev => new Set([...prev, r.id]));
  }

  function goToDetails(r, isRewatch) {
    // Do not dismiss the search modal first — let details slide up on top.
    // LogItDetails navigates directly to /(tabs) on submit, clearing the whole stack.
    router.push({
      pathname: '/logit/details',
      params: { resultJson: JSON.stringify({ ...r, displayTitle: dt(r), poster_url: highResPosterUrl(r.poster_url), isRewatch }) },
    });
  }

  function goManual() {
    router.push({
      pathname: '/logit/details',
      params: { resultJson: JSON.stringify({ title: query.trim() || 'Untitled', isManual: true }) },
    });
  }

  return (
    <View style={styles.root}>
      {/* Animated backdrop — fades in with the sheet so there's no staggered black flash */}
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
      <Pressable style={{ flex: 1 }} onPress={dismiss} />
      <Animated.View style={[styles.sheet, { marginBottom: kbHeight, transform: [{ translateY: sheetAnim }] }]}>
      <View style={styles.handle} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Log It</Text>
        <Pressable onPress={dismiss} style={styles.closeBtn}>
          <Text style={styles.closeX}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={t => { setQuery(t); setResults(null); }}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            placeholder="What did you watch?"
            placeholderTextColor={T.textMuted}
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(''); setResults(null); }}>
              <Text style={styles.clearX}>✕</Text>
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={handleSearch}
          disabled={!query.trim() || loading}
          style={[styles.searchBtn, (!query.trim() || loading) && styles.searchBtnDisabled]}
        >
          <Text style={[styles.searchBtnText, (!query.trim() || loading) && styles.searchBtnTextMuted]}>
            {loading ? 'Searching...' : 'Search'}
          </Text>
        </Pressable>
        {searchError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>API search notice</Text>
            <Text style={styles.errorSub}>{searchError}</Text>
          </View>
        )}
        <View style={styles.sourcesRow}>
          <Text style={styles.sourcesText}>Searches </Text>
          {SOURCES.map((src, i) => {
            const active = activeSources.has(src);
            return (
              <View key={src} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Pressable onPress={() => combined !== null && toggleSource(src)} hitSlop={8}>
                  <Text style={[styles.sourceToken, active ? styles.sourceTokenActive : styles.sourceTokenOff]}>
                    {src}
                  </Text>
                </Pressable>
                {i < SOURCES.length - 1 && <Text style={styles.sourcesSep}> · </Text>}
              </View>
            );
          })}
        </View>
      </View>

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={T.amber} />
        </View>
      )}

      {combined !== null && !loading && (
        <View style={styles.filterBlock}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {TYPE_FILTERS.map(t => {
              const active = typeFilter === t;
              return (
                <Pressable key={t} onPress={() => setTypeFilter(t)}
                  style={[styles.typeBtn, active && styles.typeBtnActive]}>
                  <Text style={[styles.typeBtnText, active && styles.typeBtnTextActive]}>{t}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <Modal visible={!!previewItem} transparent animationType="fade" onRequestClose={() => setPreviewItem(null)}>
        {previewItem && (
          <SearchPreviewModal result={previewItem} onClose={() => setPreviewItem(null)} />
        )}
      </Modal>

      {filteredResults !== null && !loading && (
        <FlatList
          data={singleRewatch ? [] : filteredResults}
          keyExtractor={r => String(r.id)}
          contentContainerStyle={[styles.resultList, { paddingBottom: Math.max(insets.bottom + 20, 60) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <>
              {filteredResults.length === 0 && (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyTitle}>Woah you've gone niche! 🎭</Text>
                  <Text style={styles.emptySub}>No results found online... add manually to log?</Text>
                  <Pressable onPress={goManual} style={styles.manualBtn}>
                    <Text style={styles.manualBtnText}>Add Manually</Text>
                  </Pressable>
                </View>
              )}
              {singleRewatch && filteredResults[0] && (() => {
                const r = filteredResults[0];
                return (
                  <View style={styles.rewatchCard}>
                    <View style={styles.rewatchTop}>
                      <Poster title={dt(r)} size={40} url={r.poster_url} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.resultTitle} numberOfLines={1}>{dt(r)}</Text>
                        <View style={styles.metaRow}>
                          <SourceBadge source={r.source} />
                          <Text style={styles.metaSub}>{r.content_type} · {r.year}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.rewatchBanner}>
                      <Text style={styles.rewatchHead}>🔁 You've watched this before</Text>
                      <Text style={styles.rewatchSub}>Log a rewatch? We'll carry over all show info.</Text>
                      <View style={styles.actionBtns}>
                        <Pressable onPress={() => goToDetails(r, true)} style={styles.logBtn}>
                          <Text style={styles.logBtnText}>Log Rewatch</Text>
                        </Pressable>
                        <Pressable onPress={() => goToDetails(r, false)} style={styles.secondaryBtn}>
                          <Text style={styles.secondaryBtnText}>New Entry</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })()}
            </>
          }
          renderItem={({ item: r }) => {
            const wasAdded = addedIds.has(r.id);
            return (
              <View style={styles.resultCard}>
                <View style={styles.resultTop}>
                  <Poster title={dt(r)} size={40} url={r.poster_url} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.resultTitle} numberOfLines={1}>{dt(r)}</Text>
                    <View style={styles.metaRow}>
                      <SourceBadge source={r.source} />
                      <Text style={styles.metaSub}>{r.content_type} · {r.year}</Text>
                      {r.global_rating ? <Text style={styles.globalRating}>★ {r.global_rating}</Text> : null}
                    </View>
                  </View>
                  <Pressable onPress={() => setPreviewItem(r)} style={styles.infoBtn} hitSlop={8}>
                    <Text style={styles.infoBtnText}>ⓘ</Text>
                  </Pressable>
                </View>
                {r.inLog ? (
                  <View style={styles.inLogBanner}>
                    <Text style={styles.rewatchHead}>🔁 You've watched this before</Text>
                    <View style={styles.actionBtns}>
                      <Pressable onPress={() => goToDetails(r, true)} style={styles.logBtn}>
                        <Text style={styles.logBtnText}>Log Rewatch</Text>
                      </Pressable>
                      <Pressable onPress={() => goToDetails(r, false)} style={styles.secondaryBtn}>
                        <Text style={styles.secondaryBtnText}>New Entry</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.resultActions}>
                    {wasAdded ? (
                      <View style={styles.addedRow}>
                        <Text style={styles.addedText}>✓ Added to Watch Plan</Text>
                        <Pressable onPress={() => { dismiss(); router.push({ pathname: '/(tabs)/watchlist', params: { tab: 'watchplan' } }); }}>
                          <Text style={styles.addedLink}>View →</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <>
                        <Pressable onPress={() => handleAddToWatchPlan(r)} style={styles.planBtn}>
                          <Text style={styles.planBtnText}>+ Watch Plan</Text>
                        </Pressable>
                        <Pressable onPress={() => goToDetails(r, false)} style={styles.logBtn}>
                          <Text style={styles.logBtnText}>WatchedIt →</Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Separate layer so backdrop and sheet animate in unison, not staggered
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.62)' },
  sheet: { backgroundColor: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%', marginHorizontal: 2 },
  handle: { width: 36, height: 4, backgroundColor: T.elevated, borderRadius: 4, alignSelf: 'center', marginTop: 14, marginBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  headerTitle: { color: T.textPrimary, fontFamily: T.fontDisplay, fontSize: 22 },
  closeBtn: { padding: 4 },
  closeX: { color: T.textMuted, fontSize: 18 },
  searchWrap: { paddingHorizontal: 20, gap: 10, marginBottom: 8, paddingBottom: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: T.elevated, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 15 },
  clearX: { color: T.textMuted, fontSize: 16 },
  searchBtn: { backgroundColor: T.amber, borderRadius: 16, paddingVertical: 13, alignItems: 'center' },
  searchBtnDisabled: { backgroundColor: T.elevated },
  searchBtnText: { color: T.bgPrimary, fontFamily: T.fontDisplay, fontSize: 15 },
  searchBtnTextMuted: { color: T.textMuted },
  errorBox: { backgroundColor: 'rgba(196,122,122,0.12)', borderWidth: 1, borderColor: 'rgba(196,122,122,0.25)', borderRadius: 16, padding: 12 },
  errorTitle: { color: T.amberSoft, fontFamily: T.fontTitle, fontSize: 12, marginBottom: 4 },
  errorSub: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12, lineHeight: 18 },
  sourcesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },
  sourcesText: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 13 },
  sourceToken: { fontFamily: T.fontTitleMedium, fontSize: 13 },
  sourceTokenActive: { color: T.amberDeep },
  sourceTokenOff: { color: T.textMuted, textDecorationLine: 'line-through' },
  sourcesSep: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 13 },
  loadingWrap: { paddingVertical: 32, alignItems: 'center' },
  filterBlock: { marginBottom: 4 },
  filterRow: { paddingHorizontal: 20, gap: 8, paddingVertical: 4 },
  typeBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: T.elevated },
  typeBtnActive: { borderColor: T.amberWarm, backgroundColor: 'rgba(200,133,74,0.15)' },
  typeBtnText: { color: T.textMuted, fontFamily: T.fontTitle, fontSize: 13 },
  typeBtnTextActive: { color: T.amberWarm },
  resultList: { paddingHorizontal: 20, gap: 10, paddingBottom: 60 },
  emptyBox: { backgroundColor: T.elevated, borderRadius: 16, padding: 18, alignItems: 'center', gap: 8 },
  emptyTitle: { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 15 },
  emptySub: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  manualBtn: { marginTop: 8, borderWidth: 1, borderColor: T.amber, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 10 },
  manualBtnText: { color: T.amber, fontFamily: T.fontTitle, fontSize: 13 },
  rewatchCard: { borderRadius: 16, overflow: 'hidden' },
  rewatchTop: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, backgroundColor: T.elevated },
  rewatchBanner: { backgroundColor: 'rgba(239,159,39,0.08)', borderWidth: 1, borderColor: 'rgba(239,159,39,0.2)', padding: 14, gap: 8 },
  rewatchHead: { color: T.amberSoft, fontFamily: T.fontTitle, fontSize: 13 },
  rewatchSub: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12, lineHeight: 18 },
  resultCard: { backgroundColor: T.elevated, borderRadius: 16, overflow: 'hidden' },
  resultTop: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12 },
  resultTitle: { color: T.amberDeep, fontFamily: T.fontTitle, fontSize: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  metaSub: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 11 },
  globalRating: { color: T.amberSoft, fontFamily: T.fontMono, fontWeight: '600', fontSize: 11 },
  badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontFamily: T.fontMono, fontSize: 11, fontWeight: '700' },
  inLogBanner: { backgroundColor: 'rgba(239,159,39,0.08)', borderTopWidth: 1, borderTopColor: 'rgba(239,159,39,0.15)', padding: 12, gap: 8 },
  actionBtns: { flexDirection: 'row', gap: 8, marginTop: 4 },
  resultActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 12 },
  planBtn: { flex: 1, backgroundColor: T.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingVertical: 9, alignItems: 'center' },
  planBtnText: { color: T.textMuted, fontFamily: T.fontTitle, fontSize: 12 },
  logBtn: { flex: 1, backgroundColor: T.amber, borderRadius: 12, paddingVertical: 9, alignItems: 'center' },
  logBtnText: { color: T.bgPrimary, fontFamily: T.fontTitle, fontSize: 12 },
  secondaryBtn: { flex: 1, backgroundColor: T.elevated, borderRadius: 12, paddingVertical: 9, alignItems: 'center' },
  secondaryBtnText: { color: T.textPrimary, fontFamily: T.fontTitleMedium, fontSize: 12 },
  addedRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(239,159,39,0.08)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  addedText: { color: T.amber, fontFamily: T.fontTitle, fontSize: 12 },
  addedLink: { color: T.amberSoft, fontFamily: T.fontTitleMedium, fontSize: 11 },
  infoBtn: { padding: 4 },
  infoBtnText: { color: T.textMuted, fontSize: 18 },
  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  previewCard: { width: '100%', backgroundColor: T.surface, borderRadius: 24, overflow: 'hidden' },
  posterBanner: { width: '100%', height: 180, backgroundColor: T.bgPrimary, overflow: 'hidden' },
  posterBannerExpanded: { width: '100%', backgroundColor: T.bgPrimary, overflow: 'hidden' },
  posterCropped: { width: '100%', height: 180 },
  posterFull: { width: '100%', height: 320 },
  posterGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 64, backgroundColor: 'rgba(41,40,38,0.75)' },
  expandBtn: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  expandBtnText: { color: T.textPrimary, fontFamily: T.fontTitleMedium, fontSize: 11 },
  posterPlaceholder: { width: '100%', height: 140, backgroundColor: T.amber, justifyContent: 'center', alignItems: 'center' },
  posterPlaceholderLetter: { color: T.bgPrimary, fontFamily: T.fontDisplay, fontSize: 48 },
  previewContent: { padding: 16, gap: 12 },
  previewTitle: { color: T.textPrimary, fontFamily: T.fontDisplay, fontSize: 17, lineHeight: 22 },
  previewPills: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
  previewGenreChip: { backgroundColor: T.elevated, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  previewGenreText: { color: T.textMuted, fontFamily: T.fontTitleMedium, fontSize: 11 },
  previewMetaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  previewMetaCell: { minWidth: '44%' },
  previewMetaLabel: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  previewMetaValue: { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 13 },
  previewBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  previewStatusLine: { flex: 1, color: T.textMuted, fontFamily: T.fontBody, fontSize: 11, lineHeight: 16 },
  previewStatusHeld: { color: T.amberSoft },
  closeModalBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 5, flexShrink: 0 },
  closeModalText: { color: T.textMuted, fontFamily: T.fontTitle, fontSize: 12 },
  progressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 4 },
});
