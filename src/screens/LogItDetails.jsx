import { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, Pressable, Switch, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Poster from '../components/Poster';
import StarRating from '../components/StarRating';
import BlockingPopup from '../components/BlockingPopup';
import { addEntry, getEntry, updateEntry } from '../db/storage';
import { T } from '../constants/tokens';

const LANG_CHIPS = ['Japanese', 'English', 'Korean', 'Hindi', 'Tamil', 'Spanish', 'French', 'Mandarin', 'Arabic', 'Italian'];

function EpisodePicker({ total, ongoing, value, onChange }) {
  const count = ongoing ? 24 : (total || 24);
  return (
    <View style={epStyles.wrap}>
      <Text style={epStyles.label}>
        {ongoing ? 'Which episode have you watched up to?' : `Select episode (1–${total})`}
      </Text>
      <View style={epStyles.grid}>
        {Array.from({ length: count }, (_, i) => i + 1).map(ep => (
          <Pressable
            key={ep}
            onPress={() => onChange(ep)}
            style={[epStyles.btn, value >= ep && epStyles.btnFilled, value === ep && epStyles.btnActive]}
          >
            <Text style={[epStyles.btnText, value >= ep && epStyles.btnTextFilled, value === ep && epStyles.btnTextActive]}>
              {ep}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
const epStyles = StyleSheet.create({
  wrap: { gap: 10 },
  label: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  btn: { width: 38, height: 38, borderRadius: 10, backgroundColor: T.elevated, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  btnFilled: { backgroundColor: 'rgba(239,159,39,0.15)' },
  btnActive: { borderColor: T.amber },
  btnText: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 12 },
  btnTextFilled: { color: T.amber },
  btnTextActive: { fontFamily: T.fontDisplay },
});

function WatchTimeDisplay({ epRuntime, episodeCount, isCurrent, epWatched, runtimeMode, customRuntime }) {
  const rt = runtimeMode === 'custom' ? parseInt(customRuntime, 10) : epRuntime;
  if (!rt) return null;
  const eps = isCurrent ? epWatched : (parseInt(episodeCount, 10) || 0);
  if (eps === 0) return null;
  const totalMins = rt * eps;
  return (
    <View style={wtStyles.wrap}>
      <Text style={wtStyles.label}>Watch Time</Text>
      <View style={wtStyles.row}>
        <Text style={wtStyles.muted}>{rt} min/ep</Text>
        <Text style={wtStyles.op}>×</Text>
        <Text style={wtStyles.muted}>{eps} eps</Text>
        <Text style={wtStyles.op}>=</Text>
        <Text style={wtStyles.total}>
          {Math.floor(totalMins / 60) > 0 ? `${Math.floor(totalMins / 60)}h ` : ''}{totalMins % 60}m
        </Text>
        <Text style={wtStyles.est}>est.</Text>
      </View>
    </View>
  );
}
const wtStyles = StyleSheet.create({
  wrap: { backgroundColor: T.elevated, borderRadius: 12, padding: 12, gap: 6 },
  label: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  muted: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12 },
  op: { color: T.textMuted, fontSize: 12 },
  total: { color: T.amber, fontFamily: T.fontMono, fontWeight: '700', fontSize: 15 },
  est: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 10 },
});

function Field({ label, hint, error, children }) {
  return (
    <View style={fStyles.wrap}>
      <View style={fStyles.labelRow}>
        {label ? <Text style={fStyles.label}>{label}</Text> : null}
        {hint ? <Text style={fStyles.hint}>{hint}</Text> : null}
      </View>
      {children}
      {error ? <Text style={fStyles.error}>{error}</Text> : null}
    </View>
  );
}
const fStyles = StyleSheet.create({
  wrap: { gap: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  hint: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 11 },
  error: { color: T.dropped, fontFamily: T.fontBody, fontSize: 11 },
});

function Toggle({ label, sub, value, onChange }) {
  return (
    <View style={tStyles.row}>
      <View style={{ flex: 1 }}>
        <Text style={tStyles.label}>{label}</Text>
        {sub ? <Text style={tStyles.sub}>{sub}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: T.elevated, true: T.amber }}
        thumbColor={value ? T.bgPrimary : T.textPrimary}
      />
    </View>
  );
}
const tStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4 },
  label: { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 14 },
  sub: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12, marginTop: 2 },
});

function localISODate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function LogItDetails() {
  const { resultJson, entryId, isEdit: isEditParam } = useLocalSearchParams();
  const isEdit = isEditParam === 'true';

  const [show,        setShow]        = useState(null);
  const [isRewatch,   setIsRewatch]   = useState(false);
  const [isManual,    setIsManual]    = useState(false);
  const [loading,     setLoading]     = useState(true);

  const [contentType,   setContentType]   = useState('Movie');
  const [currentTitle,  setCurrentTitle]  = useState('');
  const [language,      setLanguage]      = useState('');
  const [langText,      setLangText]      = useState('');
  const [genre,         setGenre]         = useState([]);
  const [genreInput,    setGenreInput]    = useState('');
  const [episodeCount,  setEpisodeCount]  = useState('');
  const [epRuntime,     setEpRuntime]     = useState(24);
  const [customRuntime, setCustomRuntime] = useState('');
  const [runtimeMode,   setRuntimeMode]   = useState('preset');
  const [movieRuntime,  setMovieRuntime]  = useState('');
  const [ongoing,       setOngoing]       = useState(false);
  const [watchStatus,   setWatchStatus]   = useState('watched');
  const [epWatched,     setEpWatched]     = useState(0);
  const [rating,        setRating]        = useState(null);
  const [reaction,      setReaction]      = useState('');
  const [recommend,     setRecommend]     = useState(false);
  const [bookmark,      setBookmark]      = useState(false);
  const [errors,        setErrors]        = useState({});
  const [moviePopup,    setMoviePopup]    = useState(false);
  const [ratingPopup,   setRatingPopup]   = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [showTitleDropdown, setShowTitleDropdown] = useState(false);

  const todayISO = localISODate();
  const [watchStartDate, setWatchStartDate] = useState('');
  const [watchEndDate,   setWatchEndDate]   = useState(todayISO);

  useEffect(() => {
    async function init() {
      if (isEdit && entryId) {
        const entry = await getEntry(entryId);
        if (!entry) { router.back(); return; }
        setShow(entry);
        setCurrentTitle(entry.title || '');
        setContentType(entry.type || 'Movie');
        setLanguage(entry.lang || '');
        setLangText(entry.lang || '');
        setGenre(entry.genre || []);
        setEpisodeCount(entry.total?.toString() || '');
        setEpRuntime(entry.epRuntime || (entry.type === 'Anime' ? 24 : 45));
        setMovieRuntime(entry.runtime?.toString() || '');
        setOngoing(entry.ongoing || false);
        setWatchStatus(entry.status || 'watched');
        setEpWatched(entry.ep || 0);
        setRating(entry.rating ?? null);
        setReaction(entry.reaction || '');
        setRecommend(entry.recommend || false);
        setBookmark(entry.bookmark || false);
        setWatchStartDate(entry.watch_start_date || '');
        setWatchEndDate(entry.watch_end_date || todayISO);
      } else if (resultJson) {
        const r = JSON.parse(resultJson);
        setShow(r);
        setIsRewatch(r.isRewatch || false);
        setIsManual(r.isManual || false);
        setCurrentTitle(r.title || '');
        const ct = r.content_type || r.type || 'Movie';
        setContentType(ct);
        setLanguage(r.language || r.lang || '');
        setLangText(r.language || r.lang || '');
        setGenre(r.genre_tags || r.genre || []);
        setEpisodeCount((r.episode_count ?? r.episodes ?? r.total)?.toString() || '');
        setEpRuntime(r.episode_runtime_mins || r.epRuntime || (ct === 'Anime' ? 24 : ct === 'TV Show' ? 45 : null));
        setMovieRuntime(r.runtime?.toString() || '');
        setOngoing(r.is_ongoing || r.ongoing || false);
        setBookmark(r.bookmark || false);
      }
      setLoading(false);
    }
    init();
  }, []);

  const isMovie = contentType === 'Movie';
  const isTV    = !isMovie;
  const isPlan  = watchStatus === 'watchplan';
  const isCurrent = watchStatus === 'watching';

  const totalEpisodes       = parseInt(episodeCount, 10) || null;
  const resolvedRuntime     = runtimeMode === 'custom' ? parseInt(customRuntime, 10) || epRuntime : epRuntime;
  const estimatedTotalMins  = totalEpisodes && resolvedRuntime ? totalEpisodes * resolvedRuntime : null;
  const movieRuntimeValue   = parseInt(movieRuntime, 10) || 0;

  const headerLine1 = [contentType, language || 'Unknown'].filter(Boolean).join(' · ');
  const headerLine2 = isTV
    ? [
        totalEpisodes ? `${totalEpisodes} eps` : null,
        resolvedRuntime ? `${resolvedRuntime} min/ep` : null,
        estimatedTotalMins ? `~${Math.floor(estimatedTotalMins / 60)}h ${estimatedTotalMins % 60}m est.` : null,
      ].filter(Boolean).join(' · ')
    : movieRuntimeValue
      ? `${Math.floor(movieRuntimeValue / 60)}h ${movieRuntimeValue % 60}m`
      : '';

  const allTitles = useMemo(() => {
    const titles = [{ title: show?.title || currentTitle, type: 'original' }];
    if (show?.alternativeTitles?.length) {
      titles.push(...show.alternativeTitles.map(t => ({ title: t, type: 'alternative' })));
    }
    return titles.filter(t => t.title);
  }, [show?.title, show?.alternativeTitles, currentTitle]);

  const statusOptions = [
    { id: 'watched',   label: 'Watched' },
    ...(isTV ? [{ id: 'watching', label: 'Watching' }] : []),
    { id: 'watchplan', label: 'Watch Plan' },
  ];

  function handleStatusChange(s) {
    if (s === 'watching' && isMovie) { setMoviePopup(true); return; }
    setWatchStatus(s);
    if (s === 'watching' && !watchStartDate) setWatchStartDate(todayISO);
  }

  function handleLanguageChip(l) {
    const next = language === l ? '' : l;
    setLanguage(next);
    setLangText(next);
    setErrors(p => ({ ...p, language: null }));
  }

  function addGenre(tag) {
    const t = tag.trim();
    if (t && !genre.includes(t)) setGenre(prev => [...prev, t]);
    setGenreInput('');
  }

  async function handleSubmit() {
    if (!language.trim()) {
      setErrors(p => ({ ...p, language: 'Language is required' }));
      return;
    }
    if (watchStatus === 'watched' && !rating) {
      setRatingPopup(true);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    let epWatchedRuntime = null;
    if (isTV && isCurrent && epWatched > 0 && resolvedRuntime) {
      const mins = resolvedRuntime * epWatched;
      epWatchedRuntime = `~${Math.floor(mins / 60)}h ${mins % 60}m`;
    }

    let movieWatchTimeStr = null;
    if (isMovie && movieRuntimeValue > 0) {
      movieWatchTimeStr = `${Math.floor(movieRuntimeValue / 60)}h ${movieRuntimeValue % 60}m`;
    }

    if (isEdit) {
      const existing = await getEntry(entryId);
      const updated = {
        ...existing,
        title:            currentTitle,
        type:             contentType,
        lang:             language,
        genre,
        rating,
        reaction,
        recommend,
        bookmark,
        status:           watchStatus,
        ep:               isCurrent ? epWatched : existing.ep,
        total:            totalEpisodes,
        ongoing,
        watchTime:        watchStatus === 'watched'
          ? (isTV ? (estimatedTotalMins ? `~${Math.floor(estimatedTotalMins / 60)}h ${estimatedTotalMins % 60}m` : null) : movieWatchTimeStr)
          : epWatchedRuntime,
        estimated:        isTV,
        finishedDate:     watchStatus === 'watched' ? (existing.finishedDate || today) : existing.finishedDate,
        watch_start_date: watchStartDate || existing.watch_start_date,
        watch_end_date:   watchStatus === 'watched' ? watchEndDate : existing.watch_end_date,
      };
      await updateEntry(updated);
    } else {
      const id = String(Date.now());
      const entry = {
        id,
        title:            currentTitle,
        type:             contentType,
        lang:             language,
        genre,
        rating:           isPlan ? null : rating,
        reaction:         isPlan ? '' : reaction,
        recommend:        isPlan ? false : recommend,
        bookmark,
        status:           watchStatus,
        ep:               isCurrent ? epWatched : null,
        total:            totalEpisodes,
        ongoing,
        rewatch:          isRewatch,
        paused:           false,
        dropped:          false,
        date:             today,
        finishedDate:     watchStatus === 'watched' ? today : null,
        lastWatchedDate:  isCurrent ? today : null,
        watchTime:        watchStatus === 'watched'
          ? (isTV ? (estimatedTotalMins ? `~${Math.floor(estimatedTotalMins / 60)}h ${estimatedTotalMins % 60}m` : null) : movieWatchTimeStr)
          : epWatchedRuntime,
        estimated:        isTV,
        poster_url:       show?.poster_url || null,
        malRating:        show?.global_rating || null,
        watch_sessions:   [],
        episode_notes:    {},
        watch_start_date: isCurrent ? (watchStartDate || todayISO) : null,
        watch_end_date:   watchStatus === 'watched' ? watchEndDate : null,
        logged_at:        new Date().toISOString(),
        epRuntime:        resolvedRuntime,
        runtime:          movieRuntimeValue || null,
      };
      await addEntry(entry);
    }

    router.back();
    router.back();
  }

  if (loading) return <View style={styles.loading}><Text style={styles.loadingText}>Loading...</Text></View>;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Sticky header */}
        <View style={styles.stickyHeader}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <View style={styles.titleWrap}>
            <Pressable onPress={() => allTitles.length > 1 && setShowTitleDropdown(v => !v)} style={{ flex: 1 }}>
              <Text style={styles.titleText} numberOfLines={1}>{currentTitle || 'Untitled'}</Text>
            </Pressable>
            {allTitles.length > 1 && (
              <Pressable onPress={() => setShowTitleDropdown(v => !v)} style={styles.swapTitleBtn}>
                <Ionicons name="swap-horizontal-outline" size={16} color={T.amberSoft} />
              </Pressable>
            )}
            {isManual && <View style={styles.badge}><Text style={styles.badgeText}>Manual</Text></View>}
            {isRewatch && <View style={[styles.badge, styles.badgeAmber]}><Text style={[styles.badgeText, styles.badgeAmberText]}>↺ Rewatch</Text></View>}
          </View>
          <Poster title={currentTitle || '?'} size={36} url={show?.poster_url} />
        </View>

        {/* Title dropdown */}
        {showTitleDropdown && allTitles.length > 1 && (
          <View style={styles.titleDropdown}>
            {allTitles.map((t, i) => (
              <Pressable key={i} onPress={() => { setCurrentTitle(t.title); setShowTitleDropdown(false); }}
                style={[styles.titleDropdownItem, i < allTitles.length - 1 && styles.titleDropdownDivider]}>
                <Text style={[styles.titleDropdownText, t.title === currentTitle && styles.titleDropdownActive]}>
                  {t.title}
                </Text>
                {t.type === 'alternative' && <Text style={styles.altLabel}>ALT</Text>}
              </Pressable>
            ))}
          </View>
        )}

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Metadata card */}
          <View style={styles.card}>
            <View style={styles.metaRow}>
              <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                <Text style={styles.metaLine1}>{headerLine1}</Text>
                {headerLine2 ? (
                  <Text style={styles.metaLine2}>{headerLine2}</Text>
                ) : (
                  <Text style={styles.metaLine2Muted}>Tap Edit to add episodes/runtime details</Text>
                )}
                <View style={styles.genreRow}>
                  {genre.length > 0
                    ? genre.map(g => <View key={g} style={styles.genreChip}><Text style={styles.genreChipText}>{g}</Text></View>)
                    : <View style={styles.genreChip}><Text style={styles.genreChipText}>No genres yet</Text></View>
                  }
                </View>
              </View>
              <Pressable onPress={() => setDetailsExpanded(v => !v)} style={styles.editBtn}>
                <Text style={styles.editBtnText}>{detailsExpanded ? 'Done ✓' : '✏️ Edit'}</Text>
              </Pressable>
            </View>

            {detailsExpanded && (
              <>
                <View style={styles.divider} />
                <View style={{ gap: 20, paddingTop: 4 }}>
                  {/* Content type */}
                  <Field label="Content Type">
                    <View style={styles.segmented}>
                      {['Movie', 'TV Show', 'Anime'].map(t => (
                        <Pressable key={t} onPress={() => setContentType(t)}
                          style={[styles.segBtn, contentType === t && styles.segBtnActive]}>
                          <Text style={[styles.segBtnText, contentType === t && styles.segBtnTextActive]}>{t}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </Field>

                  {/* Language */}
                  <Field label="Language" error={errors.language}>
                    <View style={styles.langChips}>
                      {LANG_CHIPS.map(l => (
                        <Pressable key={l} onPress={() => handleLanguageChip(l)}
                          style={[styles.langChip, language === l && styles.langChipActive]}>
                          <Text style={[styles.langChipText, language === l && styles.langChipTextActive]}>{l}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <TextInput
                      value={langText}
                      onChangeText={t => { setLangText(t); setLanguage(t); setErrors(p => ({ ...p, language: null })); }}
                      placeholder="Other language..."
                      placeholderTextColor={T.textMuted}
                      style={styles.textInput}
                    />
                  </Field>

                  {/* Genre tags */}
                  <Field label="Genre Tags">
                    <View style={styles.genreRow}>
                      {genre.map(g => (
                        <Pressable key={g} onPress={() => setGenre(prev => prev.filter(x => x !== g))}
                          style={[styles.genreChip, styles.genreChipRemovable]}>
                          <Text style={styles.genreChipText}>{g} ✕</Text>
                        </Pressable>
                      ))}
                    </View>
                    <View style={styles.genreInputRow}>
                      <TextInput
                        value={genreInput}
                        onChangeText={setGenreInput}
                        onSubmitEditing={() => addGenre(genreInput)}
                        placeholder="+ Add tag"
                        placeholderTextColor={T.textMuted}
                        style={[styles.textInput, { flex: 1 }]}
                        returnKeyType="done"
                      />
                      {genreInput.trim() && (
                        <Pressable onPress={() => addGenre(genreInput)} style={styles.addTagBtn}>
                          <Text style={styles.addTagBtnText}>Add</Text>
                        </Pressable>
                      )}
                    </View>
                  </Field>

                  {/* TV/Anime specific */}
                  {isTV && (
                    <>
                      <Field label="Episodes">
                        <View style={styles.epRow}>
                          <TextInput
                            value={episodeCount}
                            onChangeText={setEpisodeCount}
                            placeholder={ongoing ? 'Unknown' : 'Total episodes'}
                            keyboardType="number-pad"
                            editable={!ongoing}
                            style={[styles.textInput, { flex: 1, opacity: ongoing ? 0.5 : 1 }]}
                          />
                          <View style={styles.ongoingRow}>
                            <Text style={styles.ongoingLabel}>Ongoing</Text>
                            <Switch
                              value={ongoing}
                              onValueChange={setOngoing}
                              trackColor={{ false: T.elevated, true: T.amber }}
                              thumbColor={ongoing ? T.bgPrimary : T.textPrimary}
                            />
                          </View>
                        </View>
                      </Field>
                      <Field label="Episode Runtime">
                        <View style={styles.segmented}>
                          {[{ label: '24 min', val: 24 }, { label: '45 min', val: 45 }].map(opt => (
                            <Pressable key={opt.val}
                              onPress={() => { setEpRuntime(opt.val); setRuntimeMode('preset'); }}
                              style={[styles.segBtn, runtimeMode === 'preset' && epRuntime === opt.val && styles.segBtnActive]}>
                              <Text style={[styles.segBtnText, runtimeMode === 'preset' && epRuntime === opt.val && styles.segBtnTextActive]}>{opt.label}</Text>
                            </Pressable>
                          ))}
                          <Pressable onPress={() => setRuntimeMode('custom')}
                            style={[styles.segBtn, runtimeMode === 'custom' && styles.segBtnActive]}>
                            <Text style={[styles.segBtnText, runtimeMode === 'custom' && styles.segBtnTextActive]}>Custom</Text>
                          </Pressable>
                        </View>
                        {runtimeMode === 'custom' && (
                          <TextInput
                            value={customRuntime}
                            onChangeText={setCustomRuntime}
                            placeholder="Minutes per episode"
                            keyboardType="number-pad"
                            style={styles.textInput}
                          />
                        )}
                        {estimatedTotalMins ? (
                          <Text style={styles.estTime}>
                            ~{Math.floor(estimatedTotalMins / 60)}h {estimatedTotalMins % 60}m total
                          </Text>
                        ) : null}
                      </Field>
                    </>
                  )}

                  {/* Movie runtime */}
                  {isMovie && (
                    <Field label="Runtime" hint="Optional">
                      <TextInput
                        value={movieRuntime}
                        onChangeText={setMovieRuntime}
                        placeholder="How long was it? (mins)"
                        keyboardType="number-pad"
                        style={styles.textInput}
                      />
                      {movieRuntimeValue > 0 && (
                        <Text style={styles.estTime}>{Math.floor(movieRuntimeValue / 60)}h {movieRuntimeValue % 60}m</Text>
                      )}
                    </Field>
                  )}
                </View>
              </>
            )}
          </View>

          {/* Watch Status */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Watch Status</Text>
            <View style={styles.statusRow}>
              {statusOptions.map(s => (
                <Pressable key={s.id} onPress={() => handleStatusChange(s.id)}
                  style={[styles.statusBtn, watchStatus === s.id && styles.statusBtnActive]}>
                  <Text style={[styles.statusBtnText, watchStatus === s.id && styles.statusBtnTextActive]}>{s.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Episode progress — only for TV/Anime currently watching */}
          {!isPlan && isCurrent && isTV && (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Episode Progress</Text>
              {!ongoing && totalEpisodes && totalEpisodes <= 50 ? (
                <>
                  <EpisodePicker total={totalEpisodes} ongoing={ongoing} value={epWatched} onChange={v => setEpWatched(v)} />
                  <Field label="Or type episode number:">
                    <TextInput
                      value={epWatched > 0 ? String(epWatched) : ''}
                      onChangeText={t => setEpWatched(parseInt(t, 10) || 0)}
                      placeholder="Episode number"
                      keyboardType="number-pad"
                      style={styles.textInput}
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Watched up to episode:">
                    <TextInput
                      value={epWatched > 0 ? String(epWatched) : ''}
                      onChangeText={t => setEpWatched(parseInt(t, 10) || 0)}
                      placeholder="Episode number"
                      keyboardType="number-pad"
                      style={styles.textInput}
                    />
                  </Field>
                  {epWatched > 0 && (
                    <Text style={styles.epProgress}>
                      {ongoing ? `${epWatched} eps watched · Ongoing` : `${epWatched}${totalEpisodes ? ` of ${totalEpisodes}` : ''} episodes`}
                    </Text>
                  )}
                </>
              )}
              <WatchTimeDisplay
                epRuntime={epRuntime}
                episodeCount={episodeCount}
                isCurrent={isCurrent}
                epWatched={epWatched}
                runtimeMode={runtimeMode}
                customRuntime={customRuntime}
              />
            </View>
          )}

          {/* Rating + Reaction + Flags */}
          {!isPlan && (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>{isCurrent ? 'Rating So Far' : 'Your Rating'}</Text>
              <StarRating value={rating} onChange={setRating} />

              <View style={styles.divider} />
              <Field label="How Was It?" hint={`${reaction.length}/500`}>
                <TextInput
                  value={reaction}
                  onChangeText={t => setReaction(t.slice(0, 500))}
                  placeholder="Your thoughts, feelings, hot takes... 🔥"
                  placeholderTextColor={T.textMuted}
                  multiline
                  numberOfLines={3}
                  style={styles.textarea}
                  textAlignVertical="top"
                />
                {!reaction && (
                  <Text style={styles.reactionNudge}>This is yours forever. Future you will thank present you.</Text>
                )}
              </Field>

              <View style={styles.divider} />
              <Toggle label="Recommend" sub="Worth telling friends about?" value={recommend} onChange={setRecommend} />
              <View style={styles.divider} />
              <Toggle label="Bookmark" sub="Highlight this in your WatchLog" value={bookmark} onChange={setBookmark} />
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Sticky submit */}
        <View style={styles.footer}>
          <Pressable onPress={handleSubmit} style={styles.submitBtn}>
            <Text style={styles.submitBtnText}>{isEdit ? 'Save Changes ✓' : 'Log It ✓'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <BlockingPopup
        show={moviePopup}
        onClose={() => setMoviePopup(false)}
        emoji="🍿"
        title="Finish the movie first!"
        message="It'll be over in a few hours. Come back and log it when you're done — we'll be here."
        cta="Lol faine, I'll finish it"
        ctaSecondary="Actually I'm done"
        onSecondary={() => { setMoviePopup(false); setWatchStatus('watched'); }}
      />
      <BlockingPopup
        show={ratingPopup}
        onClose={() => setRatingPopup(false)}
        emoji="⭐"
        title="C'mon, you know what you felt"
        message="Every watch deserves a rating. Even a 1 counts — we don't judge."
        cta="Okay okay, I'll rate it"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bgPrimary },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bgPrimary },
  loadingText: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 14 },
  stickyHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(51,50,48,0.97)', paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: { padding: 4, flexShrink: 0 },
  backArrow: { color: T.textPrimary, fontSize: 20 },
  titleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  titleText: { color: T.amberDeep, fontFamily: T.fontDisplay, fontSize: 16, flex: 1 },
  swapTitleBtn: { padding: 4 },
  badge: { backgroundColor: 'rgba(158,155,150,0.15)', borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2, flexShrink: 0 },
  badgeText: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 11 },
  badgeAmber: { backgroundColor: 'rgba(239,159,39,0.12)' },
  badgeAmberText: { color: T.amberSoft },
  titleDropdown: {
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.elevated,
    borderRadius: 8, marginHorizontal: 20, marginTop: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
    zIndex: 100,
  },
  titleDropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  titleDropdownDivider: { borderBottomWidth: 1, borderBottomColor: T.elevated },
  titleDropdownText: { color: T.textPrimary, fontFamily: T.fontBody, fontSize: 14 },
  titleDropdownActive: { color: T.amber, fontFamily: T.fontTitle },
  altLabel: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 10 },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
  card: { backgroundColor: T.surface, borderRadius: T.radiusCard, padding: 16, gap: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  metaLine1: { color: T.textMuted, fontFamily: T.fontTitleMedium, fontSize: 12 },
  metaLine2: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12 },
  metaLine2Muted: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12, fontStyle: 'italic' },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  genreChip: { backgroundColor: T.elevated, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  genreChipRemovable: { backgroundColor: 'rgba(239,159,39,0.12)' },
  genreChipText: { color: T.textMuted, fontFamily: T.fontTitleMedium, fontSize: 11 },
  editBtn: { backgroundColor: T.elevated, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10, flexShrink: 0 },
  editBtnText: { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 12 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  segmented: { flexDirection: 'row', gap: 8 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: T.elevated, alignItems: 'center' },
  segBtnActive: { backgroundColor: T.amber },
  segBtnText: { color: T.textMuted, fontFamily: T.fontTitle, fontSize: 12 },
  segBtnTextActive: { color: T.bgPrimary },
  langChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  langChip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: T.elevated },
  langChipActive: { backgroundColor: T.amber },
  langChipText: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12 },
  langChipTextActive: { color: T.bgPrimary },
  textInput: {
    backgroundColor: T.elevated, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    color: T.textPrimary, fontFamily: T.fontBody, fontSize: 14,
  },
  genreInputRow: { flexDirection: 'row', gap: 8 },
  addTagBtn: { backgroundColor: T.amber, borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' },
  addTagBtnText: { color: T.bgPrimary, fontFamily: T.fontTitle, fontSize: 12 },
  epRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  ongoingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  ongoingLabel: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12 },
  estTime: { color: T.amberSoft, fontFamily: T.fontMono, fontSize: 11 },
  sectionLabel: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  statusRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusBtn: { flex: 1, minWidth: 90, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 22, backgroundColor: T.elevated, alignItems: 'center' },
  statusBtnActive: { backgroundColor: T.amber },
  statusBtnText: { color: T.textMuted, fontFamily: T.fontTitle, fontSize: 12 },
  statusBtnTextActive: { color: T.bgPrimary },
  epProgress: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12 },
  textarea: {
    backgroundColor: T.elevated, borderRadius: 12, padding: 12,
    color: T.textPrimary, fontFamily: T.fontBody, fontSize: 14, minHeight: 80,
  },
  reactionNudge: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 11, fontStyle: 'italic', marginTop: 4 },
  footer: {
    backgroundColor: 'rgba(51,50,48,0.97)', paddingHorizontal: 20, paddingVertical: 14, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  submitBtn: {
    backgroundColor: T.amber, borderRadius: 18, paddingVertical: 15, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
  },
  submitBtnText: { color: T.bgPrimary, fontFamily: T.fontDisplay, fontSize: 16 },
});
