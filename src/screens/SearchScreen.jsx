import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable, StyleSheet,
  ScrollView, Modal, ActivityIndicator, Animated, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Poster from '../components/Poster';
import TypePill from '../components/TypePill';
import RatingSheet from '../components/RatingSheet';
import { searchTitles } from '../api';
import { getEntries, addEntry, updateEntry, getTitleLanguagePref } from '../db/storage';
import { scheduleDriveBackup } from '../services/driveSync';
import { getPreferredTitle } from '../utils/titleUtils';
import { highResPosterUrl } from '../utils/posterUtils';
import { consumePendingToast } from '../utils/toastBridge';
import { T } from '../constants/tokens';

const SOURCES      = ['MAL', 'TMDB', 'OMDB'];
const TYPE_FILTERS = ['All', 'Movie', 'TV Show', 'Anime'];
const PREVIEW_DURATION = 10000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseActivityDate(entry) {
  let dateStr = '';
  if (entry.status === 'watched')      dateStr = entry.finishedDate    || '';
  else if (entry.status === 'watching') dateStr = entry.lastWatchedDate || '';
  else if (entry.status === 'watchplan') dateStr = entry.date           || '';
  if (!dateStr) return 0;
  if (dateStr === 'Today')     return Date.now();
  if (dateStr === 'Yesterday') return Date.now() - 86400000;
  const m = dateStr.match(/(\d+)\s+days?\s+ago/i);
  if (m) return Date.now() - parseInt(m[1]) * 86400000;
  try {
    return new Date(!dateStr.includes(',') ? dateStr + ', ' + new Date().getFullYear() : dateStr).getTime();
  } catch { return 0; }
}

function typeAccentColor(e) {
  if (e.dropped) return T.dropped;
  if (e.paused)  return T.paused;
  if (e.type === 'Anime')   return T.colorAnime;
  if (e.type === 'Movie')   return T.colorMovie;
  if (e.type === 'TV Show') return T.colorTV;
  return T.textMuted;
}

// ─── Source badge (same as LogItSearch) ──────────────────────────────────────

function SourceBadge({ source }) {
  const colors = { MAL: '#6B9BDF', TMDB: '#01B4E4', OMDB: '#F5C518' };
  const color = colors[source] || T.textMuted;
  return (
    <View style={[styles.badge, { backgroundColor: color + '22' }]}>
      <Text style={[styles.badgeText, { color }]}>{source}</Text>
    </View>
  );
}

// ─── Preview modal (identical to LogItSearch) ─────────────────────────────────

function SearchPreviewModal({ result: r, onClose }) {
  const remainingRef = useRef(PREVIEW_DURATION);
  const [remaining,   setRemaining]   = useState(PREVIEW_DURATION);
  const pausedRef     = useRef(false);
  const [held,        setHeld]        = useState(false);
  const [imgExpanded, setImgExpanded] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => {
      if (pausedRef.current) return;
      remainingRef.current = Math.max(0, remainingRef.current - 50);
      setRemaining(remainingRef.current);
      if (remainingRef.current <= 0) onClose();
    }, 50);
    return () => clearInterval(iv);
  }, [onClose]);

  const hold    = () => { pausedRef.current = true;  setHeld(true);  };
  const release = () => { pausedRef.current = false; setHeld(false); };
  const pct      = (remaining / PREVIEW_DURATION) * 100;
  const secsLeft = Math.ceil(remaining / 1000);
  const isMovie  = r.content_type === 'Movie';

  const meta = [];
  if (r.year)                              meta.push({ label: 'Year',     value: String(r.year) });
  if (!isMovie && r.episode_count)         meta.push({ label: 'Episodes', value: String(r.episode_count) });
  if (!isMovie && r.is_ongoing != null)    meta.push({ label: 'Status',   value: r.is_ongoing ? 'Ongoing' : 'Completed' });
  if (!isMovie && r.episode_runtime_mins)  meta.push({ label: 'Runtime',  value: `${r.episode_runtime_mins} min/ep` });
  if (isMovie  && r.episode_runtime_mins)  meta.push({ label: 'Runtime',  value: `${r.episode_runtime_mins} min` });
  if (r.language)                          meta.push({ label: 'Language', value: r.language });
  if (r.global_rating)                     meta.push({ label: 'Rating',   value: `★ ${r.global_rating}` });

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

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const [entries,      setEntries]      = useState([]);
  const [query,        setQuery]        = useState('');
  const [webMode,      setWebMode]      = useState(false);

  // Web search
  const [webResults,    setWebResults]    = useState(null);
  const [webLoading,    setWebLoading]    = useState(false);
  const [webError,      setWebError]      = useState(null);
  const [activeSources, setActiveSources] = useState(new Set(SOURCES));
  const [typeFilter,    setTypeFilter]    = useState('All');
  const [addedIds,      setAddedIds]      = useState(new Set());
  const [titleLang,     setTitleLang]     = useState('en');
  const [previewItem,   setPreviewItem]   = useState(null);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [ratingEntry,   setRatingEntry]   = useState(null);

  // Toast (same pattern as WatchTower)
  const [toastContent,  setToastContent]  = useState(null);
  const toastAnim     = useRef(new Animated.Value(0)).current;
  const toastAnimRef  = useRef(null);
  const toastTimerRef = useRef(null);
  const focusedRef    = useRef(true);

  function clearToastTimer() {
    if (toastTimerRef.current) { clearTimeout(toastTimerRef.current); toastTimerRef.current = null; }
  }
  function hideToast({ animated = true } = {}) {
    clearToastTimer();
    if (toastAnimRef.current) toastAnimRef.current.stop();
    if (!animated) { toastAnim.setValue(0); setToastContent(null); return; }
    const anim = Animated.timing(toastAnim, { toValue: 0, duration: 180, useNativeDriver: true });
    toastAnimRef.current = anim;
    anim.start(() => { toastAnimRef.current = null; setToastContent(null); });
  }
  function showToast(pending) {
    clearToastTimer();
    if (toastAnimRef.current) toastAnimRef.current.stop();
    setToastContent(pending);
    toastAnim.setValue(0);
    const anim = Animated.timing(toastAnim, { toValue: 1, duration: 220, useNativeDriver: true });
    toastAnimRef.current = anim;
    anim.start(() => {
      toastAnimRef.current = null;
      toastTimerRef.current = setTimeout(() => { if (focusedRef.current) hideToast(); }, 10000);
    });
  }

  useFocusEffect(useCallback(() => {
    focusedRef.current = true;
    let active = true;
    getTitleLanguagePref().then(setTitleLang);
    getEntries().then(data => {
      if (!active) return;
      setEntries(data);
      setBookmarkedIds(new Set(data.filter(e => e.bookmark).map(e => e.id)));
    });
    const pending = consumePendingToast();
    if (pending) showToast(pending);
    return () => {
      active = false;
      focusedRef.current = false;
      hideToast({ animated: false });
    };
  }, []));

  // ── WatchList search (live, existing behaviour) ────────────────────────────
  const q = query.trim().toLowerCase();
  const watchlistResults = q
    ? entries.filter(e =>
        e.title.toLowerCase().includes(q) ||
        (e.genre || []).some(g => g.toLowerCase().includes(q)) ||
        (e.lang  || '').toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q)
      )
    : [];

  // ── Web search ─────────────────────────────────────────────────────────────
  async function handleWebSearch() {
    const sq = query.trim();
    if (!sq) return;
    setWebLoading(true);
    setWebError(null);
    setActiveSources(new Set(SOURCES));
    setTypeFilter('All');
    try {
      const { combined, bySource } = await searchTitles(sq, entries);
      setWebResults({ combined, bySource });
    } catch (err) {
      console.warn('[SearchScreen] web search failed:', err.message);
      setWebError('Search failed. Check your connection and try again.');
      setWebResults({ combined: [], bySource: { MAL: [], TMDB: [], OMDB: [] } });
    } finally {
      setWebLoading(false);
    }
  }

  function switchToWeb() {
    setWebMode(true);
    if (query.trim()) handleWebSearch();
  }

  function switchToWatchList() {
    setWebMode(false);
    setWebResults(null);
    setWebError(null);
  }

  function toggleSource(src) {
    setActiveSources(prev => {
      if (prev.has(src) && prev.size === 1) return prev;
      const next = new Set(prev);
      next.has(src) ? next.delete(src) : next.add(src);
      return next;
    });
  }

  function toggleBookmark(id) {
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    const entry = entries.find(e => e.id === id);
    if (entry) { updateEntry({ ...entry, bookmark: !entry.bookmark }); scheduleDriveBackup(); }
  }

  const dt = r => getPreferredTitle(r, titleLang);

  async function handleAddToWatchPlan(r) {
    await addEntry({
      id:              String(Date.now()),
      title:           dt(r),
      type:            r.content_type,
      lang:            r.language || '',
      rating:          null,
      date:            new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      status:          'watchplan',
      ep:              null,
      total:           r.episode_count || null,
      ongoing:         r.is_ongoing || false,
      rewatch:         false,
      paused:          false,
      dropped:         false,
      bookmark:        false,
      genre:           r.genre_tags || [],
      reaction:        '',
      recommend:       false,
      watchTime:       null,
      estimated:       false,
      poster_url:      highResPosterUrl(r.poster_url),
      malRating:       r.global_rating || null,
      watch_start_date: null,
      watch_end_date:  null,
      logged_at:       new Date().toISOString(),
    });
    scheduleDriveBackup();
    setAddedIds(prev => new Set([...prev, r.id]));
    getEntries().then(data => {
      setEntries(data);
      setBookmarkedIds(new Set(data.filter(e => e.bookmark).map(e => e.id)));
    });
  }

  function goToDetails(r) {
    router.push({
      pathname: '/logit/details',
      params: { resultJson: JSON.stringify({ ...r, displayTitle: dt(r), poster_url: highResPosterUrl(r.poster_url) }) },
    });
  }

  function goManual() {
    router.push({
      pathname: '/logit/details',
      params: { resultJson: JSON.stringify({ title: query.trim() || 'Untitled', isManual: true }) },
    });
  }

  // ── Web results processing ─────────────────────────────────────────────────
  const combined      = webResults?.combined ?? null;
  const sourceFiltered = combined === null
    ? null
    : combined.filter(r => activeSources.has(r.source));
  const typeFiltered = sourceFiltered === null
    ? null
    : typeFilter === 'All' ? sourceFiltered : sourceFiltered.filter(r => r.content_type === typeFilter);

  const inLogApiResults = typeFiltered?.filter(r => r.inLog)  ?? [];
  const newApiResults   = typeFiltered?.filter(r => !r.inLog) ?? [];

  // Look up the actual entry objects for in-log API results, then sort by Most Recent Activity
  const inLogEntries = inLogApiResults
    .map(r => entries.find(e => e.title.toLowerCase() === r.title.toLowerCase()))
    .filter(Boolean)
    .sort((a, b) => parseActivityDate(b) - parseActivityDate(a));

  const hasWebResults = typeFiltered !== null && !webLoading;
  const showTypeChips = hasWebResults && (sourceFiltered?.length ?? 0) > 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={T.textMuted} />
        <TextInput
          value={query}
          onChangeText={t => { setQuery(t); if (webMode) setWebResults(null); }}
          placeholder={webMode ? 'Search the web...' : 'Search your WatchLog...'}
          placeholderTextColor={T.textMuted}
          style={styles.input}
          returnKeyType="search"
          onSubmitEditing={() => { if (webMode) handleWebSearch(); }}
          autoFocus={false}
        />
        {query.length > 0 && (
          <Pressable onPress={() => { setQuery(''); setWebResults(null); }}>
            <Text style={styles.clearX}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Mode toggle */}
      <Pressable onPress={webMode ? switchToWatchList : switchToWeb} style={styles.modeToggle}>
        {webMode ? (
          <Text style={styles.modeToggleText}>
            <Text style={styles.modeToggleLink}>← </Text>
            {'Searching the web'}
            <Text style={styles.modeToggleMuted}> · switch to WatchLog</Text>
          </Text>
        ) : (
          <Text style={styles.modeToggleText}>
            {'Searching your WatchLog · '}
            <Text style={styles.modeToggleLink}>Search the web instead →</Text>
          </Text>
        )}
      </Pressable>

      {/* ════ WatchList mode ════ */}
      {!webMode && (
        <>
          {!q && (
            <View style={styles.hint}>
              <Text style={styles.hintText}>Search by title, genre or language</Text>
            </View>
          )}
          {q && watchlistResults.length === 0 && (
            <View style={styles.hint}>
              <Text style={styles.hintText}>No results for "{query}"</Text>
            </View>
          )}
          <FlatList
            data={watchlistResults}
            keyExtractor={e => String(e.id)}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            renderItem={({ item: e }) => (
              <Pressable onPress={() => router.push(`/detail/${e.id}`)} style={styles.card}>
                <Poster title={e.title} size={44} url={e.poster_url} />
                <View style={styles.meta}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={1}>{e.title}</Text>
                    {e.rewatch && <Text style={styles.rewatchIcon}>↺</Text>}
                  </View>
                  <View style={styles.pillRow}>
                    <TypePill type={e.type} />
                    <Text style={styles.lang}>{e.lang}</Text>
                  </View>
                  {e.status === 'watching' && e.ep && (
                    <Text style={styles.ep}>
                      {e.ongoing ? `${e.ep} eps · Ongoing` : `Ep ${e.ep}${e.total ? ` of ${e.total}` : ''}`}
                    </Text>
                  )}
                </View>
                <Text style={styles.rating}>{e.rating ? String(e.rating) : '—'}</Text>
              </Pressable>
            )}
          />
        </>
      )}

      {/* ════ Web mode ════ */}
      {webMode && (
        <>
          {/* Sources row */}
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

          {/* Error */}
          {webError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorSub}>{webError}</Text>
            </View>
          )}

          {/* Type filter chips — shown only when results exist */}
          {showTypeChips && (
            <View style={styles.filterBlock}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
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

          {/* Results area — flex:1 so FlatList can scroll */}
          <View style={{ flex: 1 }}>
            {webLoading && (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={T.amber} />
              </View>
            )}

            {!webLoading && !query.trim() && (
              <View style={styles.hint}>
                <Text style={styles.hintText}>Search anything — movies, anime, TV shows</Text>
              </View>
            )}

            {hasWebResults && (
              <FlatList
                data={newApiResults}
                keyExtractor={r => String(r.id)}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={{ flex: 1 }}
                ListHeaderComponent={
                  <>
                    {/* Niche callout when no results at all */}
                    {typeFiltered?.length === 0 && (
                      <View style={styles.emptyBox}>
                        <Text style={styles.emptyTitle}>Woah you've gone niche! 🎭</Text>
                        <Text style={styles.emptySub}>No results found online... add manually to log?</Text>
                        <Pressable onPress={goManual} style={styles.manualBtn}>
                          <Text style={styles.manualBtnText}>Add Manually</Text>
                        </Pressable>
                      </View>
                    )}

                    {/* In-log results — WatchList card layout */}
                    {inLogEntries.length > 0 && (
                      <>
                        <View style={styles.sectionLabel}>
                          <Text style={styles.sectionLabelText}>IN YOUR WATCHLOG</Text>
                        </View>
                        {inLogEntries.map(e => {
                          const isBookmarked = bookmarkedIds.has(e.id);
                          const dateLine = (() => {
                            if (e.status === 'watchplan') return 'Yet to watch';
                            if (e.dropped) return `Dropped on ${e.lastWatchedDate || ''}`;
                            if (e.paused)  return `Paused on ${e.lastWatchedDate || ''}`;
                            if (e.status === 'watching') return e.lastWatchedDate ? `Last watched ${e.lastWatchedDate}` : '';
                            if (e.status === 'watched') {
                              const d = e.finishedDate || '';
                              return d && !/\d{4}/.test(d) ? `${d}, ${new Date().getFullYear()}` : d;
                            }
                            return e.finishedDate || '';
                          })();
                          const progressLine = (() => {
                            if (e.dropped || e.paused || e.status === 'watching') {
                              return e.ongoing
                                ? `${e.ep} eps · Ongoing`
                                : e.total ? `${e.ep} of ${e.total} eps watched` : `${e.ep} eps watched`;
                            }
                            if (e.status === 'watched') {
                              if (e.type === 'Movie') return e.watchTime || null;
                              return e.total ? `${e.total} episodes` : null;
                            }
                            return null;
                          })();
                          return (
                            <Pressable
                              key={e.id}
                              onPress={() => router.push(`/detail/${e.id}`)}
                              style={styles.wlCard}
                            >
                              <View style={[styles.wlStatusBar, { backgroundColor: typeAccentColor(e) }]} />
                              <View style={styles.wlCardInner}>
                                <Poster title={e.title} size={42} url={e.poster_url} />
                                <View style={styles.wlCardMeta}>
                                  <View style={styles.wlCardText}>
                                    <Text style={styles.wlCardTitle} numberOfLines={1}>{e.title}</Text>
                                    <Text style={styles.wlCardDate} numberOfLines={1}>
                                      {dateLine}{e.rewatch ? <Text style={styles.rewatchIcon}> ↺</Text> : null}
                                    </Text>
                                    <View style={styles.wlCardSubRow}>
                                      <TypePill type={e.type} />
                                      {progressLine
                                        ? <Text style={styles.wlProgressText} numberOfLines={1}>{progressLine}</Text>
                                        : null}
                                    </View>
                                  </View>
                                  <View style={styles.wlCardRight}>
                                    <Text style={[styles.wlRatingNum, !e.rating && styles.wlRatingEmpty]}>
                                      {e.rating ? String(e.rating) : '—'}
                                    </Text>
                                    <Pressable
                                      onPress={() => toggleBookmark(e.id)}
                                      hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                                      style={styles.wlBookmarkBtn}
                                    >
                                      <Ionicons
                                        name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                                        size={16}
                                        color={isBookmarked ? T.amber : T.textMuted}
                                        style={{ opacity: isBookmarked ? 1 : 0.35 }}
                                      />
                                    </Pressable>
                                  </View>
                                </View>
                              </View>
                              {e.status === 'watched' && !e.rating && (
                                <Pressable onPress={() => setRatingEntry(e)} style={styles.wlRateNudge}>
                                  <Text style={styles.wlRateNudgeText}>Rate it ★</Text>
                                </Pressable>
                              )}
                            </Pressable>
                          );
                        })}
                      </>
                    )}

                    {/* Section label for API-only results */}
                    {inLogEntries.length > 0 && newApiResults.length > 0 && (
                      <View style={styles.sectionLabel}>
                        <Text style={styles.sectionLabelText}>MORE FROM THE WEB</Text>
                      </View>
                    )}
                    {inLogEntries.length === 0 && newApiResults.length > 0 && (
                      <View style={styles.sectionLabel}>
                        <Text style={styles.sectionLabelText}>WEB RESULTS</Text>
                      </View>
                    )}
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
                            {r.global_rating
                              ? <Text style={styles.globalRating}>★ {r.global_rating}</Text>
                              : null}
                          </View>
                        </View>
                        <Pressable onPress={() => setPreviewItem(r)} style={styles.infoBtn} hitSlop={10}>
                          <Text style={styles.infoBtnText}>ⓘ</Text>
                        </Pressable>
                      </View>
                      {wasAdded ? (
                        <View style={styles.resultActions}>
                          <View style={styles.addedRow}>
                            <Text style={styles.addedText}>✓ Added to Watch Plan</Text>
                            <Pressable onPress={() => router.push({ pathname: '/(tabs)/watchlist', params: { tab: 'watchplan' } })}>
                              <Text style={styles.addedLink}>View →</Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.resultActions}>
                          <Pressable onPress={() => handleAddToWatchPlan(r)} style={styles.planBtn}>
                            <Text style={styles.planBtnText}>+ Watch Plan</Text>
                          </Pressable>
                          <Pressable onPress={() => goToDetails(r)} style={styles.logBtn}>
                            <Text style={styles.logBtnText}>WatchedIt →</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                }}
              />
            )}
          </View>
        </>
      )}

      {/* Preview modal */}
      <Modal
        visible={!!previewItem}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewItem(null)}
      >
        {previewItem && (
          <SearchPreviewModal result={previewItem} onClose={() => setPreviewItem(null)} />
        )}
      </Modal>

      {/* Rating sheet — for "Rate it ★" on unrated in-log entries */}
      {ratingEntry && (
        <RatingSheet
          entry={ratingEntry}
          show
          onClose={() => setRatingEntry(null)}
          onSave={updated => {
            updateEntry(updated);
            scheduleDriveBackup();
            setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
            setRatingEntry(null);
          }}
        />
      )}

      {/* Toast — reads from toastBridge on focus, shown here after LogIt submit */}
      {toastContent && (
        <Animated.View style={[styles.toast, {
          bottom: 8,
          opacity: toastAnim,
          transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        }]}>
          <Pressable onPress={() => hideToast()} style={styles.toastDismiss} hitSlop={8}>
            <Text style={styles.toastDismissText}>✕</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.toastTitle}>{toastContent.title}</Text>
            <Text style={styles.toastBody}>{toastContent.body}</Text>
            {toastContent.sub && <Text style={styles.toastSub}>{toastContent.sub}</Text>}
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bgPrimary },

  // Search bar
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: T.surface, margin: 16, marginBottom: 0,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
  },
  input: { flex: 1, color: T.textPrimary, fontFamily: T.fontBody, fontSize: 14 },
  clearX: { color: T.textMuted, fontSize: 18 },

  // Mode toggle
  modeToggle: { paddingHorizontal: 18, paddingVertical: 10 },
  modeToggleText: { color: T.textMuted, fontFamily: T.fontFun, fontSize: 13 },
  modeToggleLink: { color: T.amberDeep, fontFamily: T.fontTitleMedium, fontSize: 13 },
  modeToggleMuted: { color: T.textMuted, fontFamily: T.fontFun, fontSize: 13 },

  // Hints / empty
  hint: { alignItems: 'center', marginTop: 48 },
  hintText: { color: T.textMuted, fontFamily: T.fontFun, fontSize: 13 },

  // Shared list padding
  list: { padding: 16, paddingTop: 4, gap: 8 },

  // ── WatchList mode: existing card ─────────────────────────────────────────
  card: {
    backgroundColor: T.surface, borderRadius: T.radiusCard,
    padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center',
  },
  meta: { flex: 1, minWidth: 0, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: T.amberDeep, fontFamily: T.fontTitle, fontSize: 14, flex: 1 },
  rewatchIcon: { color: T.amberSoft, fontSize: 12 },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lang: { color: T.textMuted, fontFamily: T.fontFun, fontSize: 11 },
  ep: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 11 },
  rating: { color: T.amber, fontFamily: T.fontMono, fontWeight: '800', fontSize: 16 },

  // ── Web mode: sources row ──────────────────────────────────────────────────
  sourcesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', paddingHorizontal: 16, paddingVertical: 8 },
  sourcesText: { color: T.textMuted, fontFamily: T.fontFun, fontSize: 13 },
  sourceToken: { fontFamily: T.fontTitleMedium, fontSize: 13 },
  sourceTokenActive: { color: T.amberDeep },
  sourceTokenOff: { color: T.textMuted, textDecorationLine: 'line-through' },
  sourcesSep: { color: T.textMuted, fontFamily: T.fontFun, fontSize: 13 },

  // Error
  errorBox: {
    marginHorizontal: 16, marginBottom: 6,
    backgroundColor: 'rgba(196,122,122,0.12)', borderWidth: 1,
    borderColor: 'rgba(196,122,122,0.25)', borderRadius: 14, padding: 10,
  },
  errorSub: { color: T.textMuted, fontFamily: T.fontFun, fontSize: 12, lineHeight: 18 },

  // Type filter chips
  filterBlock: { marginBottom: 4 },
  filterRow: { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  typeBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: T.elevated },
  typeBtnActive: { borderColor: T.amber, backgroundColor: 'rgba(239,159,39,0.15)' },
  typeBtnText: { color: T.textMuted, fontFamily: T.fontTitle, fontSize: 13 },
  typeBtnTextActive: { color: T.amber },

  // Loading
  loadingWrap: { paddingVertical: 32, alignItems: 'center' },

  // Section labels (IN YOUR WATCHLOG / WEB RESULTS / MORE FROM THE WEB)
  sectionLabel: { paddingHorizontal: 2, paddingVertical: 10, paddingTop: 14 },
  sectionLabelText: { color: T.textMuted, fontFamily: T.fontTitle, fontSize: 13 },

  // ── WatchList cards (in-log, web mode) ────────────────────────────────────
  wlCard: { backgroundColor: T.surface, borderRadius: 16, overflow: 'hidden', marginBottom: 8 },
  wlStatusBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  wlCardInner: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', padding: 12, paddingLeft: 18 },
  wlCardMeta: { flex: 1, flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  wlCardText: { flex: 1, minWidth: 0, gap: 3 },
  wlCardTitle: { color: T.amberDeep, fontFamily: T.fontTitle, fontSize: 15, lineHeight: 20 },
  wlCardDate: { color: T.textPrimary, fontFamily: T.fontBodyMedium, fontSize: 12 },
  wlCardSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 },
  wlProgressText: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 11 },
  wlCardRight: { alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  wlRatingNum: { color: T.amber, fontFamily: T.fontMono, fontWeight: '800', fontSize: 15 },
  wlRatingEmpty: { color: T.textMuted },
  wlBookmarkBtn: { marginTop: 6, padding: 8 },
  wlRateNudge: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingVertical: 8, paddingHorizontal: 18, alignItems: 'flex-end' },
  wlRateNudgeText: { color: T.amber, fontFamily: T.fontTitle, fontSize: 11, backgroundColor: 'rgba(239,159,39,0.12)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },

  // ── LogIt-style result cards (new web results) ────────────────────────────
  resultCard: { backgroundColor: T.elevated, borderRadius: 16, overflow: 'hidden', marginBottom: 0 },
  resultTop: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12 },
  resultTitle: { color: T.amberDeep, fontFamily: T.fontTitle, fontSize: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  metaSub: { color: T.textMuted, fontFamily: T.fontFun, fontSize: 12 },
  globalRating: { color: T.amberSoft, fontFamily: T.fontMono, fontWeight: '600', fontSize: 11 },
  badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontFamily: T.fontMono, fontSize: 11, fontWeight: '700' },
  infoBtn: { padding: 4 },
  infoBtnText: { color: T.textMuted, fontSize: 18 },
  resultActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 12 },
  planBtn: { flex: 1, backgroundColor: T.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingVertical: 9, alignItems: 'center' },
  planBtnText: { color: T.textMuted, fontFamily: T.fontTitle, fontSize: 12 },
  logBtn: { flex: 1, backgroundColor: T.amber, borderRadius: 12, paddingVertical: 9, alignItems: 'center' },
  logBtnText: { color: T.bgPrimary, fontFamily: T.fontTitle, fontSize: 12 },
  addedRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(239,159,39,0.08)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  addedText: { color: T.amber, fontFamily: T.fontTitle, fontSize: 12 },
  addedLink: { color: T.amberSoft, fontFamily: T.fontTitleMedium, fontSize: 11 },

  // Niche / manual
  emptyBox: { backgroundColor: T.elevated, borderRadius: 16, padding: 18, alignItems: 'center', gap: 8 },
  emptyTitle: { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 15 },
  emptySub: { color: T.textMuted, fontFamily: T.fontFun, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  manualBtn: { marginTop: 8, borderWidth: 1, borderColor: T.amber, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 10 },
  manualBtnText: { color: T.amber, fontFamily: T.fontTitle, fontSize: 13 },

  // ── Toast ─────────────────────────────────────────────────────────────────
  toast: {
    position: 'absolute', left: 16, right: 16, zIndex: 50,
    backgroundColor: T.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(239,159,39,0.2)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 20,
  },
  toastTitle:       { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 13 },
  toastBody:        { color: T.textMuted,   fontFamily: T.fontFun,   fontSize: 12, marginTop: 1 },
  toastSub:         { color: T.textMuted,   fontFamily: T.fontMono,  fontSize: 10, marginTop: 3, opacity: 0.7 },
  toastDismiss:     { position: 'absolute', top: 10, right: 12, padding: 4, zIndex: 2, elevation: 2 },
  toastDismissText: { color: T.textMuted, fontSize: 14 },

  // ── Preview modal ──────────────────────────────────────────────────────────
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
  previewStatusLine: { flex: 1, color: T.textMuted, fontFamily: T.fontFun, fontSize: 11, lineHeight: 16 },
  previewStatusHeld: { color: T.amberSoft },
  closeModalBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 5, flexShrink: 0 },
  closeModalText: { color: T.textMuted, fontFamily: T.fontTitle, fontSize: 12 },
  progressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 4 },
});
