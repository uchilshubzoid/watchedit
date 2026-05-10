import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Image, Modal, Animated, DeviceEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '../components/BackButton';
import { useFadeBack } from '../hooks/useFadeBack';
import Poster from '../components/Poster';
import TypePill from '../components/TypePill';
import { ConfirmModal } from '../components/BlockingPopup';
import RatingSheet from '../components/RatingSheet';
import LogSeshSheet from '../components/LogSeshSheet';
import MiniCalendar from '../components/MiniCalendar';
import StarRating from '../components/StarRating';
import { getEntry, updateEntry, deleteEntry, getEntries } from '../db/storage';
import { T } from '../constants/tokens';
import { highResPosterUrl } from '../utils/posterUtils';

function localISODate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function isoToDisplay(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDateShort(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function SectionLabel({ children }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function ActionBtn({ iconName, label, onPress, danger }) {
  return (
    <Pressable onPress={onPress} style={[styles.actionBtn, danger && styles.actionBtnDanger]}>
      <Ionicons name={iconName} size={14} color={danger ? T.dropped : T.textMuted} />
      <Text style={[styles.actionBtnText, danger && styles.actionBtnTextDanger]}>{label}</Text>
    </Pressable>
  );
}

function DeetsTimeline({ items }) {
  return (
    <View style={styles.timeline}>
      {items.map((item, i) => (
        <View key={i} style={styles.timelineRow}>
          <View style={styles.timelineDotCol}>
            <View style={styles.timelineIconWrap}>
              <Ionicons name={item.icon} size={12} color={T.textMuted} />
            </View>
            {i < items.length - 1 && <View style={styles.timelineLine} />}
          </View>
          <View style={styles.timelineContent}>
            <Text style={styles.timelineLabel}>{item.label}</Text>
            {item.date ? <Text style={styles.timelineDate}>{item.date}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

export default function DetailView() {
  const { id } = useLocalSearchParams();
  const [entry,          setEntry]          = useState(null);
  const [rewatchEntries, setRewatchEntries] = useState([]);
  const [posterExpanded, setPosterExpanded] = useState(false);
  const [modal,          setModal]          = useState(null);
  const [ratingOpen,     setRatingOpen]     = useState(false);
  const [seshOpen,       setSeshOpen]       = useState(false);
  const [seshMarkAll,    setSeshMarkAll]    = useState(false);
  const [epListExpanded, setEpListExpanded] = useState(false);
  const [editingNoteEp,  setEditingNoteEp]  = useState(null);
  const [noteInput,      setNoteInput]      = useState('');

  // Inline log session widget
  const [logOpen,     setLogOpen]     = useState(false);
  const [logMode,     setLogMode]     = useState('count');
  const [logCount,    setLogCount]    = useState(1);
  const [logEpisodeNumber, setLogEpisodeNumber] = useState('');
  const [logDate,     setLogDate]     = useState(localISODate);
  const [logCalOpen,  setLogCalOpen]  = useState(false);
  const [logRating,   setLogRating]   = useState(null);
  const [logReaction, setLogReaction] = useState('');

  // Toast
  const [toast,    setToast]    = useState(null);
  const toastAnim  = useRef(new Animated.Value(0)).current;
  const epListScrollRef = useRef(null);

  useEffect(() => {
    if (!epListExpanded || !epListScrollRef.current) return;
    const isCurrentlyWatching = entry?.status === 'watching' && !entry?.dropped;
    if (!isCurrentlyWatching) return;
    const nextEpIdx = entry?.ep ?? 0;
    const EP_H = 48;
    const scrollY = Math.max(0, (nextEpIdx - 2) * EP_H);
    const t = setTimeout(() => epListScrollRef.current?.scrollTo({ y: scrollY, animated: true }), 80);
    return () => clearTimeout(t);
  }, [epListExpanded]);

  const { opacity, goBack } = useFadeBack();

  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([getEntry(String(id)), getEntries()]).then(([e, all]) => {
      if (!active || !e) return;
      // Auto-fix: watched entries where ep tracking was skipped — mark all episodes watched
      // and compute watchTime if it's missing
      let entry = e;
      if (e.status === 'watched' && e.total > 0 && !e.ep) {
        const rt   = e.epRuntime || (e.type === 'Anime' ? 24 : 45);
        const mins = rt * e.total;
        entry = {
          ...e,
          ep: e.total,
          ...(!e.watchTime ? { watchTime: `~${Math.floor(mins / 60)}h ${mins % 60}m`, estimated: true } : {}),
        };
        updateEntry(entry);
        DeviceEventEmitter.emit('entryUpdated');
      }
      setEntry(entry);
      const rewatches = all.filter(a => a.title === e.title && a.rewatch && a.id !== e.id && a.status === 'watched');
      setRewatchEntries(rewatches);
    });
    return () => { active = false; };
  }, [id]));

  if (!entry) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isWatched  = entry.status === 'watched';
  const isWatching = entry.status === 'watching' && !entry.dropped;
  const isDropped  = entry.dropped;
  const isPlan     = entry.status === 'watchplan';
  const isMovie    = entry.type === 'Movie';

  const statusConfig = isWatched
    ? { label: 'Watched',      color: T.amber,      icon: 'checkmark-circle' }
    : isWatching
    ? { label: 'Watching',     color: T.amberSoft,  icon: 'play-circle' }
    : isDropped
    ? { label: 'Dropped',      color: T.dropped,    icon: 'close-circle' }
    : { label: 'Watch Plan',   color: T.textMuted,  icon: 'time' };

  const sessions    = entry.watch_sessions || [];
  const hasSessions = sessions.length > 0;
  const firstSesh   = sessions[0];
  const lastSesh    = sessions[sessions.length - 1];

  const sessionDeets = [...sessions].reverse().map(s => ({
    icon: 'film-outline',
    label: s.ep_from === s.ep_to ? `Sesh · Ep ${s.ep_from}` : `Sesh · Ep ${s.ep_from}–${s.ep_to}`,
    date: s.date_display || s.date,
  }));

  const rewatchDeets = [...rewatchEntries]
    .sort((a, b) => new Date(b.logged_at || 0) - new Date(a.logged_at || 0))
    .map(r => ({ icon: 'refresh-outline', label: 'Rewatched', date: r.finishedDate || r.date }));

  const DEETS_WATCHED = hasSessions
    ? [
        { icon: 'checkmark-circle-outline', label: 'Finished', date: entry.finishedDate || entry.date },
        ...rewatchDeets,
        ...sessionDeets,
        { icon: 'play-circle-outline', label: 'Started Watching', date: firstSesh?.date_display || entry.date },
      ]
    : [
        { icon: 'checkmark-circle-outline', label: 'Finished', date: entry.finishedDate || entry.date },
        ...rewatchDeets,
      ];

  const DEETS_WATCHING = hasSessions
    ? [...sessionDeets, { icon: 'play-circle-outline', label: 'Started Watching', date: entry.date }]
    : [{ icon: 'play-circle-outline', label: 'Started Watching', date: entry.date }];

  const DEETS_DROPPED = hasSessions
    ? [
        { icon: 'close-circle-outline', label: 'Dropped', date: entry.date },
        ...sessionDeets,
        { icon: 'play-circle-outline', label: 'Started Watching', date: firstSesh?.date_display || entry.date },
      ]
    : [{ icon: 'close-circle-outline', label: 'Dropped', date: entry.date }];

  const DEETS_PLAN = [{ icon: 'time-outline', label: 'Added to Watch Plan', date: entry.date }];

  const deets = isWatched ? DEETS_WATCHED : isDropped ? DEETS_DROPPED : isWatching ? DEETS_WATCHING : DEETS_PLAN;

  const epNotes   = entry.episode_notes || {};
  const epTotal   = entry.total || 0;
  const epCurrent = entry.ep || 0;
  const remaining = epTotal > epCurrent ? epTotal - epCurrent : 0;
  const episodes  = Array.from({ length: epTotal }, (_, i) => ({
    n: i + 1,
    state: i < epCurrent ? 'watched' : i === epCurrent ? 'next' : 'unwatched',
    notes: epNotes[i + 1] || null,
  }));

  // Inline log widget derived values
  const logEpisodeValue = parseInt(logEpisodeNumber, 10) || epCurrent + 1;
  const logEpTo        = logMode === 'count' ? epCurrent + logCount : logEpisodeValue;
  const logWillComplete = !entry.ongoing && epTotal > 0 && logEpTo >= epTotal;
  const posterModalUrl = highResPosterUrl(entry.poster_url);

  // For watched/dropped: start = first session date (accurate sesh-level tracking)
  const startDate = firstSesh?.date_display || null;
  const endDate   = isWatched
    ? (entry.finishedDate || lastSesh?.date_display || entry.date)
    : (lastSesh?.date_display || entry.lastWatchedDate || entry.date);
  const watchedStartDate = entry.watch_start_date ? isoToDisplay(entry.watch_start_date) : startDate;
  const watchedEndDate   = entry.watch_end_date ? isoToDisplay(entry.watch_end_date) : (entry.finishedDate || endDate);
  const watchedHasDateRange = !!(watchedStartDate && watchedEndDate);

  // For currently watching: start = when they added the title (entry.date), not the first sesh date
  const watchingStart   = entry.date;
  const watchingSameDay = watchingStart === endDate;

  const watchSectionLabel = isWatching ? 'Watching Since' : isDropped ? 'Watching Period' : isPlan ? 'Added On' : 'When I Watched It';

  function showToast(title, body) {
    setToast({ title, body });
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(3500),
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }

  async function handleUpdate(updated) {
    setEntry(updated);
    await updateEntry(updated);
    DeviceEventEmitter.emit('entryUpdated');
  }

  async function handleLogSesh() {
    const epTo        = logMode === 'count' ? epCurrent + logCount : logEpisodeValue;
    const willComplete = !entry.ongoing && epTotal > 0 && epTo >= epTotal;
    if (logMode === 'number' && epTo <= epCurrent) return;
    if (!entry.ongoing && epTotal > 0 && epTo > epTotal) return;
    if (willComplete && !logRating) return;

    const epFrom     = epCurrent + 1;
    const episodesLogged = epTo - epCurrent;
    const newSession = { ep_from: epFrom, ep_to: epTo, date: logDate, date_display: fmtDateShort(logDate) };
    const rt         = entry.epRuntime || (entry.type === 'Anime' ? 24 : 45);
    const mins       = rt * epTo;

    const updated = {
      ...entry,
      ep:             epTo,
      watch_sessions: [...sessions, newSession],
      paused:         false,
      dropped:        false,
      watchTime:      `~${Math.floor(mins/60)}h ${mins%60}m`,
      estimated:      true,
      ...(willComplete
        ? {
            status:        'watched',
            rating:        logRating,
            reaction:      logReaction.trim() || undefined,
            finishedDate:  fmtDateShort(logDate),
            watch_end_date: logDate,
          }
        : {
            status:          'watching',
            lastWatchedDate: fmtDateShort(logDate),
          }),
    };

    await handleUpdate(updated);

    if (willComplete) {
      showToast('All done! 🎉', `${entry.title} is now marked as watched.`);
    } else {
      const pct      = epTotal ? ` (${Math.round((epTo / epTotal) * 100)}%)` : '';
      const epLabel  = epTotal ? `Ep ${epTo} of ${epTotal}` : `Ep ${epTo}`;
      showToast(
        'Session logged! 🎉',
        `You've watched ${episodesLogged} episode${episodesLogged > 1 ? 's' : ''}. You're now at ${epLabel}${pct}.`,
      );
    }

    setLogOpen(false);
    setLogMode('count');
    setLogCount(1);
    setLogEpisodeNumber('');
    setLogRating(null);
    setLogReaction('');
    setLogDate(localISODate());
  }

  async function handleDelete() {
    await deleteEntry(entry.id);
    setModal(null);
    router.back();
  }

  async function handleContinueWatching() {
    const updated = { ...entry, dropped: false, status: 'watching', lastWatchedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
    await handleUpdate(updated);
    setModal(null);
  }

  async function handleSaveNote(epN, note) {
    const updatedNotes = { ...epNotes, [epN]: note.trim() || undefined };
    if (!note.trim()) delete updatedNotes[epN];
    await handleUpdate({ ...entry, episode_notes: updatedNotes });
    setEditingNoteEp(null);
  }

  const sourceColors  = { MAL: '#6B9BDF', TMDB: '#01B4E4', OMDB: '#F5C518', IMDB: '#F5C518' };
  const sourceNames   = { MAL: 'MyAnimeList', TMDB: 'TMDB', OMDB: 'IMDB', IMDB: 'IMDB' };
  const globalRatings = entry.malRating
    ? [{ source: entry.ratingSource || 'MAL', rating: entry.malRating }]
    : [];

  return (
    <Animated.View style={{ flex: 1, opacity }}>
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.screenWrap}>
        <Text style={styles.watermark} aria-hidden>Watch{'\n'}Deets</Text>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} style={{ zIndex: 1 }}>

          {/* Top bar — status pill moved into hero card */}
          <View style={styles.topBar}>
            <BackButton onPress={goBack} />
            <View style={styles.actionBtns}>
              {isWatched && (
                <ActionBtn iconName="refresh-outline" label="Rewatch" onPress={() =>
                  router.push({ pathname: '/logit/details', params: { resultJson: JSON.stringify({ title: entry.title, type: entry.type, lang: entry.lang, genre: entry.genre || [], poster_url: entry.poster_url, isRewatch: true }) } })
                } />
              )}
              <ActionBtn iconName="create-outline" label="Edit" onPress={() =>
                router.push({ pathname: '/logit/details', params: { entryId: entry.id, isEdit: 'true' } })
              } />
              <ActionBtn iconName="trash-outline" label={isPlan ? 'Remove' : 'Unwatch'} danger onPress={() => setModal('remove')} />
            </View>
          </View>

          {/* Hero card */}
          <View style={styles.card}>
            <View style={styles.heroRow}>
              <Pressable
                onPress={() => entry.poster_url && setPosterExpanded(true)}
                style={styles.posterWrap}
                disabled={!entry.poster_url}
              >
                <Poster title={entry.title} size={88} url={entry.poster_url} />
                {entry.poster_url && (
                  <View style={styles.posterExpandHint}>
                    <Ionicons name="expand-outline" size={10} color="#fff" />
                  </View>
                )}
              </Pressable>
              <View style={styles.heroInfo}>
                {/* Status pill — now lives here */}
                <View style={[styles.heroStatusPill, { borderColor: statusConfig.color + '40' }]}>
                  <Ionicons name={statusConfig.icon} size={11} color={statusConfig.color} />
                  <Text style={[styles.heroStatusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                </View>
                <Text style={styles.heroTitle}>{entry.title}</Text>
                <View style={styles.heroMeta}>
                  <TypePill type={entry.type} />
                  <Text style={styles.heroDot}>·</Text>
                  <Text style={styles.heroLang}>{entry.lang}</Text>
                  {isPlan && entry.total && entry.type !== 'Movie' ? (
                    <>
                      <Text style={styles.heroDot}>·</Text>
                      <Text style={styles.heroLang}>{entry.total} eps</Text>
                    </>
                  ) : null}
                  {entry.watchTime ? (
                    <>
                      <Text style={styles.heroDot}>·</Text>
                      <Text style={styles.heroTime}>{entry.watchTime}{entry.estimated ? ' est.' : ''}</Text>
                    </>
                  ) : null}
                </View>
                {entry.genre?.length > 0 && (
                  <View style={styles.genreRow}>
                    {entry.genre.map(g => (
                      <View key={g} style={styles.genreChip}>
                        <Text style={styles.genreChipText}>{g}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Dropped banner */}
            {isDropped && (
              <View style={{ gap: 10 }}>
                <View style={styles.droppedBanner}>
                  <View style={styles.droppedBannerTitleRow}>
                    <Ionicons name="close-circle" size={13} color={T.dropped} />
                    <Text style={styles.droppedBannerTitle}>Dropped on {entry.date}</Text>
                  </View>
                  <Text style={styles.droppedBannerSub}>Changed your mind? Pick it back up.</Text>
                </View>
                <Pressable onPress={() => setModal('continue')} style={styles.ctaPrimary}>
                  <Text style={styles.ctaPrimaryText}>▶ Continue Watching</Text>
                </Pressable>
              </View>
            )}

            {/* Watch Plan CTAs */}
            {isPlan && (
              <View style={styles.ctaRow}>
                {isMovie ? (
                  <Pressable onPress={() => setRatingOpen(true)} style={[styles.ctaPrimary, { flex: 1 }]}>
                    <Text style={styles.ctaPrimaryText}>Mark Watched ✓</Text>
                  </Pressable>
                ) : (
                  <>
                    <Pressable onPress={() => { setSeshMarkAll(false); setSeshOpen(true); }} style={styles.ctaSecondary}>
                      <Text style={styles.ctaSecondaryText}>Log a Sesh</Text>
                    </Pressable>
                    <Pressable onPress={() => { setSeshMarkAll(true); setSeshOpen(true); }} style={styles.ctaPrimary}>
                      <Text style={styles.ctaPrimaryText}>{entry.ongoing ? 'Mark as Finished' : 'Mark All Watched'}</Text>
                    </Pressable>
                  </>
                )}
              </View>
            )}
          </View>

          {/* When I Watched It */}
          <View style={styles.card}>
            <SectionLabel>{watchSectionLabel}</SectionLabel>
            {isWatched && (
              watchedHasDateRange
                ? <Text style={styles.dateRange}>{watchedStartDate} <Text style={styles.dateArrow}>→</Text> <Text style={styles.dateEnd}>{watchedEndDate}</Text></Text>
                : <Text style={styles.dateText}>{watchedEndDate}</Text>
            )}
            {(isWatching || isDropped) && (
              !watchingSameDay
                ? <Text style={styles.dateRange}>{watchingStart} <Text style={styles.dateArrow}>→</Text> <Text style={styles.dateEnd}>{endDate}</Text></Text>
                : <Text style={styles.dateText}>{watchingStart}</Text>
            )}
            {isPlan && (
              <>
                <Text style={styles.dateText}>{entry.date}</Text>
                <Text style={styles.planNote}>Not counted in stats until watched</Text>
              </>
            )}
          </View>

          {/* What I Thought */}
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <SectionLabel>What I Thought</SectionLabel>
              {!isPlan && (
                <Pressable onPress={() => setRatingOpen(true)} style={styles.editThoughtsBtn}>
                  <Ionicons
                    name={entry.rating ? 'create-outline' : 'star-outline'}
                    size={12} color={T.amber}
                  />
                  <Text style={styles.editThoughtsText}>
                    {entry.rating ? 'Edit' : 'Rate Now'}
                  </Text>
                </Pressable>
              )}
            </View>
            {!isPlan && (
              <View style={styles.thoughtsRow}>
                <View style={styles.thoughtsYourRating}>
                  <Text style={styles.thoughtsRatingLabel}>Your Rating</Text>
                  {entry.rating ? (
                    <View style={styles.ratingRow}>
                      <Text style={styles.ratingBig}>{entry.rating}</Text>
                    </View>
                  ) : (
                    <Text style={styles.noRating}>Not rated yet</Text>
                  )}
                </View>
                {globalRatings.length > 0 && (
                  <View style={styles.thoughtsGlobal}>
                    <Text style={styles.thoughtsRatingLabel}>Global</Text>
                    {globalRatings.map(({ source, rating }) => (
                      <View key={source} style={styles.globalRow}>
                        <View style={[styles.globalDot, { backgroundColor: sourceColors[source] || T.textMuted }]} />
                        <Text style={styles.globalSource}>{sourceNames[source] || source}</Text>
                        <Text style={styles.globalRating}>{rating}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
            {isPlan && (
              <>
                {globalRatings.length > 0 && (
                  <View style={{ gap: 4 }}>
                    <Text style={styles.thoughtsRatingLabel}>Global</Text>
                    {globalRatings.map(({ source, rating }) => (
                      <View key={source} style={styles.globalRow}>
                        <View style={[styles.globalDot, { backgroundColor: sourceColors[source] || T.textMuted }]} />
                        <Text style={styles.globalSource}>{sourceNames[source] || source}</Text>
                        <Text style={styles.globalRating}>{rating}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <Text style={styles.planRatingNudge}>
                  Mark it watched and rate it away. ★
                </Text>
              </>
            )}
            {!isPlan && entry.reaction ? (
              <Text style={styles.reaction}>"{entry.reaction}"</Text>
            ) : null}
            <View style={styles.statusTags}>
              <Pressable
                onPress={() => handleUpdate({ ...entry, recommend: !entry.recommend })}
                style={[styles.statusTag, entry.recommend ? styles.statusTagSoftSelected : styles.statusTagSoft]}
              >
                <Ionicons name={entry.recommend ? 'thumbs-up' : 'thumbs-up-outline'} size={11} color={entry.recommend ? T.bgPrimary : T.amberSoft} />
                <Text style={[styles.statusTagText, entry.recommend ? styles.statusTagTextSelected : styles.statusTagTextSoft]}>
                  {entry.recommend ? 'Recommended' : 'Recommend'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleUpdate({ ...entry, bookmark: !entry.bookmark })}
                style={[styles.statusTag, entry.bookmark ? styles.statusTagWarmSelected : styles.statusTagWarm]}
              >
                <Ionicons name={entry.bookmark ? 'bookmark' : 'bookmark-outline'} size={11} color={entry.bookmark ? T.bgPrimary : T.amberWarm} />
                <Text style={[styles.statusTagText, entry.bookmark ? styles.statusTagTextSelected : styles.statusTagTextWarm]}>
                  {entry.bookmark ? 'Bookmarked' : 'Bookmark'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Episode Tracker — watching, dropped, or watched (TV/Anime only) */}
          {(isWatching || isDropped || isWatched) && !isMovie && (epTotal > 0 || entry.ongoing || epCurrent > 0) && (
            <View style={styles.card}>
              <SectionLabel>Episode Tracker</SectionLabel>
              <View style={styles.epProgressRow}>
                <Text style={styles.epProgressText}>
                  {entry.ongoing || epTotal === 0 ? `${epCurrent} eps watched` : `${epCurrent} of ${epTotal} episodes`}
                </Text>
                {!entry.ongoing && epTotal > 0 && (
                  <Text style={styles.epPercent}>{Math.round((epCurrent / epTotal) * 100)}%</Text>
                )}
              </View>
              {!entry.ongoing && epTotal > 0 && (
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.min(100, Math.round((epCurrent / epTotal) * 100))}%` }]} />
                </View>
              )}

              {/* Inline log session widget */}
              {isWatching && (
                <View style={styles.logWidget}>
                  <Pressable
                    onPress={() => {
                      if (!logOpen) {
                        setLogMode('count');
                        setLogCount(1);
                        setLogEpisodeNumber(String(epCurrent + 1));
                        setLogRating(null);
                        setLogReaction('');
                        setLogCalOpen(false);
                      }
                      setLogOpen(v => !v);
                    }}
                    style={styles.logWidgetHeader}
                  >
                    <Text style={styles.logWidgetTitle}>Log a session</Text>
                    <Ionicons name={logOpen ? 'chevron-up' : 'chevron-down'} size={16} color={T.textMuted} />
                  </Pressable>

                  {logOpen && (
                    <View style={styles.logWidgetBody}>
                      <Text style={styles.logWidgetSub}>
                        {epCurrent > 0
                          ? <>Currently on Ep {epCurrent} · <Text style={styles.logWidgetNext}>Next up: Ep {epCurrent + 1}</Text></>
                          : <Text style={styles.logWidgetNext}>Starting from Ep 1</Text>
                        }
                      </Text>

                      {/* Episode input */}
                      <View style={styles.logInputBlock}>
                        <View style={styles.logInputHeader}>
                          <Text style={styles.logInputLabel}>
                            {logMode === 'count' ? 'Episodes watched' : 'Episode number'}
                          </Text>
                          <View style={styles.logModeToggle}>
                            <Pressable
                              onPress={() => setLogMode('count')}
                              style={[styles.logModeBtn, logMode === 'count' && styles.logModeBtnActive]}
                            >
                              <Text style={[styles.logModeText, logMode === 'count' && styles.logModeTextActive]}>Count</Text>
                            </Pressable>
                            <Pressable
                              onPress={() => {
                                setLogMode('number');
                                setLogEpisodeNumber(String(logEpTo > epCurrent ? logEpTo : epCurrent + 1));
                              }}
                              style={[styles.logModeBtn, logMode === 'number' && styles.logModeBtnActive]}
                            >
                              <Text style={[styles.logModeText, logMode === 'number' && styles.logModeTextActive]}>Ep #</Text>
                            </Pressable>
                          </View>
                        </View>

                        <View style={styles.stepper}>
                          <Pressable
                            onPress={() => {
                              if (logMode === 'count') {
                                setLogCount(c => Math.max(1, c - 1));
                              } else {
                                setLogEpisodeNumber(v => String(Math.max(epCurrent + 1, (parseInt(v, 10) || epCurrent + 1) - 1)));
                              }
                            }}
                            style={styles.stepperBtn}
                          >
                            <Ionicons name="remove" size={20} color={T.textPrimary} />
                          </Pressable>
                          <TextInput
                            value={logMode === 'count' ? String(logCount) : logEpisodeNumber}
                            onChangeText={t => {
                              const clean = t.replace(/\D/g, '');
                              if (logMode === 'count') {
                                const n = parseInt(clean, 10);
                                const max = entry.ongoing ? 999 : Math.max(1, remaining);
                                setLogCount(clean ? Math.min(max, Math.max(1, n)) : 1);
                              } else {
                                setLogEpisodeNumber(clean);
                              }
                            }}
                            keyboardType="number-pad"
                            style={styles.stepperInput}
                            selectTextOnFocus
                          />
                          <Pressable
                            onPress={() => {
                              const max = entry.ongoing ? 999 : Math.max(1, epTotal || 999);
                              if (logMode === 'count') {
                                setLogCount(c => {
                                  const countMax = entry.ongoing ? 999 : Math.max(1, remaining);
                                  return c < countMax ? c + 1 : c;
                                });
                              } else {
                                setLogEpisodeNumber(v => String(Math.min(max, (parseInt(v, 10) || epCurrent) + 1)));
                              }
                            }}
                            style={styles.stepperBtn}
                          >
                            <Ionicons name="add" size={20} color={T.textPrimary} />
                          </Pressable>
                        </View>
                        <Text style={[
                          styles.stepperLabel,
                          logMode === 'number' && logEpTo <= epCurrent && styles.logInputError,
                        ]}>
                          {logMode === 'count'
                            ? `${logCount} episode${logCount > 1 ? 's' : ''} · now Ep ${logEpTo}${epTotal ? ` of ${epTotal}` : ''}`
                            : logEpTo <= epCurrent
                              ? `Pick an episode after ${epCurrent}`
                              : `Logging Ep ${epCurrent + 1}${logEpTo > epCurrent + 1 ? `-${logEpTo}` : ''}${epTotal ? ` of ${epTotal}` : ''}`}
                        </Text>
                      </View>

                      {/* Date */}
                      <View style={styles.logDateBlock}>
                        <Text style={styles.logInputLabel}>Date watched</Text>
                        <Pressable onPress={() => setLogCalOpen(v => !v)} style={styles.logDateBtn}>
                          <Ionicons name="calendar-outline" size={13} color={T.textMuted} />
                          <Text style={styles.logDateText}>{isoToDisplay(logDate)}</Text>
                          <Ionicons name={logCalOpen ? 'chevron-up' : 'chevron-down'} size={12} color={T.textMuted} />
                        </Pressable>
                      </View>

                      {logCalOpen && (
                        <MiniCalendar
                          value={logDate}
                          max={localISODate()}
                          onChange={iso => { setLogDate(iso); setLogCalOpen(false); }}
                        />
                      )}

                      {/* Completion: inline rating */}
                      {logWillComplete && (
                        <View style={styles.logCompleteBox}>
                          <Text style={styles.logCompleteTitle}>
                            {entry.ongoing ? "That's a wrap! Rate it 🎬" : "You finished it! Rate it 😄"}
                          </Text>
                          <View style={styles.logStarWrap}>
                            <StarRating value={logRating} onChange={setLogRating} />
                          </View>
                          <TextInput
                            value={logReaction}
                            onChangeText={t => setLogReaction(t.slice(0, 500))}
                            placeholder="Your reaction... (optional)"
                            placeholderTextColor={T.textMuted}
                            multiline
                            numberOfLines={2}
                            style={styles.logReactionInput}
                            textAlignVertical="top"
                          />
                        </View>
                      )}

                      {/* Submit */}
                      <Pressable
                        onPress={handleLogSesh}
                        style={[
                          styles.logSessionBtn,
                          ((logMode === 'number' && logEpTo <= epCurrent) ||
                            (!entry.ongoing && epTotal > 0 && logEpTo > epTotal) ||
                            (logWillComplete && !logRating)) && styles.logSessionBtnDim,
                        ]}
                      >
                        <Text style={styles.logSessionBtnText}>
                          {logWillComplete ? 'Finish & Rate ✓' : 'Log Session ✓'}
                        </Text>
                      </Pressable>

                      {/* Mark all remaining */}
                      {!logWillComplete && !entry.ongoing && remaining > 0 && (
                        <Pressable onPress={() => setLogCount(remaining)} style={styles.markAllBtn}>
                          <Text style={styles.markAllText}>
                            Mark all remaining ({remaining} episodes) as watched
                          </Text>
                        </Pressable>
                      )}
                      {!logWillComplete && entry.ongoing && (
                        <Pressable onPress={() => { setSeshMarkAll(true); setSeshOpen(true); }} style={styles.markAllBtn}>
                          <Text style={styles.markAllText}>Mark as finished</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              )}

              {/* Episode list toggle — only for shows with a defined episode total */}
              {epTotal > 0 && (
                <>
              <Pressable onPress={() => setEpListExpanded(v => !v)} style={styles.expandBtn}>
                <Text style={styles.expandBtnText}>
                  {epListExpanded ? 'Hide episode list ▲' : 'Show episode list ▼'}
                </Text>
              </Pressable>

              {epListExpanded && (
                <ScrollView
                  ref={epListScrollRef}
                  style={styles.epListScroll}
                  contentContainerStyle={{ gap: 6 }}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {episodes.map(ep => {
                    const isEpWatched = ep.state === 'watched';
                    const isNext      = ep.state === 'next';
                    const isEditing   = editingNoteEp === ep.n;
                    return (
                      <View key={ep.n} style={[styles.epItem, isNext && styles.epItemNext]}>
                        <View style={styles.epItemRow}>
                          <View style={[styles.epDot, isEpWatched && styles.epDotWatched, isNext && styles.epDotNext]}>
                            {isEpWatched && <Text style={styles.epCheck}>✓</Text>}
                            {isNext && <View style={styles.epDotInner} />}
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[styles.epLabel, isNext && styles.epLabelNext, !isEpWatched && !isNext && styles.epLabelMuted]}>
                              Episode {ep.n}{isNext ? <Text style={styles.epUpNext}>  UP NEXT</Text> : null}
                            </Text>
                            {ep.notes && !isEditing && (
                              <Text style={styles.epNotes}>{ep.notes}</Text>
                            )}
                          </View>
                          {!isEditing && (
                            <Pressable onPress={() => { setEditingNoteEp(ep.n); setNoteInput(ep.notes || ''); }} style={styles.noteBtn} hitSlop={8}>
                              <Text style={styles.noteBtnText}>{ep.notes ? 'Edit note' : '+ Note'}</Text>
                            </Pressable>
                          )}
                        </View>
                        {isEditing && (
                          <View style={{ marginTop: 10, gap: 8 }}>
                            <TextInput
                              value={noteInput}
                              onChangeText={t => setNoteInput(t.slice(0, 200))}
                              placeholder="Your thoughts on this episode..."
                              placeholderTextColor={T.textMuted}
                              multiline
                              numberOfLines={2}
                              autoFocus
                              style={styles.noteInput}
                              textAlignVertical="top"
                            />
                            <View style={styles.noteActions}>
                              <Pressable onPress={() => setEditingNoteEp(null)}>
                                <Text style={styles.noteCancelText}>Cancel</Text>
                              </Pressable>
                              <Pressable onPress={() => handleSaveNote(ep.n, noteInput)} style={styles.noteSaveBtn}>
                                <Text style={styles.noteSaveText}>Save</Text>
                              </Pressable>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              )}
                </>
              )}
            </View>
          )}

          {/* Episode Tracker — Watch Plan */}
          {isPlan && !isMovie && epTotal > 0 && (
            <View style={styles.card}>
              <SectionLabel>Episode Tracker</SectionLabel>
              <View style={styles.planCallout}>
                <Text style={styles.planCalloutEmoji}>🎬</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planCalloutHead}>C'mon, wipe off the dust!</Text>
                  <Text style={styles.planCalloutSub}>{epTotal} episodes just sitting there...</Text>
                </View>
              </View>
              <View style={styles.epProgressRow}>
                <Text style={styles.epProgressText}>0 of {epTotal} episodes</Text>
                <Text style={styles.epPercent}>0%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '0%' }]} />
              </View>
            </View>
          )}

          {/* Where I Watched It */}
          {entry.watch_platform ? (
            <View style={styles.card}>
              <SectionLabel>Where I Watched It</SectionLabel>
              <Text style={styles.whereValue}>{entry.watch_platform}</Text>
            </View>
          ) : null}

          {/* Watch Log */}
          <View style={styles.card}>
            <SectionLabel>Watch Log</SectionLabel>
            <DeetsTimeline items={deets} />
          </View>

        </ScrollView>

        {/* Toast */}
        {toast && (
          <Animated.View
            style={[styles.toast, {
              opacity: toastAnim,
              transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            }]}
          >
            <Text style={styles.toastIcon}>🎉</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.toastTitle}>{toast.title}</Text>
              <Text style={styles.toastBody}>{toast.body}</Text>
            </View>
            <Pressable onPress={() => setToast(null)}>
              <Text style={styles.toastAction}>Got it</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>

      {/* Poster expanded modal */}
      {entry.poster_url && (
        <Modal visible={posterExpanded} transparent animationType="fade" onRequestClose={() => setPosterExpanded(false)} statusBarTranslucent>
          <Pressable style={styles.posterModal} onPress={() => setPosterExpanded(false)}>
            <Image source={{ uri: posterModalUrl }} style={styles.posterModalImg} resizeMode="contain" />
            <Text style={styles.posterModalHint}>Tap anywhere to close</Text>
          </Pressable>
        </Modal>
      )}

      <ConfirmModal
        show={modal === 'remove'}
        onClose={() => setModal(null)}
        title={isPlan ? 'Remove from WatchList?' : 'Remove from WatchLog?'}
        message={isPlan ? 'This title will be removed from your Watch Plan.' : 'This will remove all watch history for this title.'}
        confirmLabel="Remove"
        onConfirm={handleDelete}
      />
      <ConfirmModal
        show={modal === 'continue'}
        onClose={() => setModal(null)}
        title="Continue watching?"
        message="We'll move this back to Currently Watching."
        confirmLabel="Let's go"
        onConfirm={handleContinueWatching}
      />
      {ratingOpen && (
        <RatingSheet
          entry={entry}
          show
          onClose={() => setRatingOpen(false)}
          onSave={updated => {
            const final = isPlan
              ? { ...updated, status: 'watched', finishedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
              : updated;
            handleUpdate(final);
          }}
        />
      )}
      {seshOpen && (
        <LogSeshSheet
          entry={entry}
          markAll={seshMarkAll}
          onClose={() => { setSeshOpen(false); setSeshMarkAll(false); }}
          onUpdate={handleUpdate}
        />
      )}
    </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bgPrimary },
  screenWrap: { flex: 1 },
  watermark: {
    position: 'absolute', bottom: 24, left: 0, right: 0,
    textAlign: 'center',
    color: T.textPrimary, fontFamily: 'PlayfairDisplay-BlackItalic', fontSize: 72, lineHeight: 84,
    opacity: 0.04, zIndex: 0,
    transform: [{ rotate: '-10deg' }],
  },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 14 },
  scroll: { padding: 16, gap: 14, paddingBottom: 80 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { padding: 8 },
  actionBtns: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.elevated, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  actionBtnDanger: { backgroundColor: 'rgba(196,122,122,0.12)' },
  actionBtnText: { color: T.textMuted, fontFamily: T.fontTitleMedium, fontSize: 12 },
  actionBtnTextDanger: { color: T.dropped },
  card: { backgroundColor: T.surface, borderRadius: T.radiusCard, padding: 16, gap: 14 },
  heroRow: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  heroInfo: { flex: 1, minWidth: 0, gap: 5 },
  heroStatusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  heroStatusText: { fontFamily: T.fontTitleMedium, fontSize: 12 },
  heroTitle: { color: T.amberDeep, fontFamily: T.fontDisplay, fontSize: 20, lineHeight: 26 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  heroDot: { color: T.textMuted, fontSize: 10 },
  heroLang: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12 },
  heroTime: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 12 },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  genreChip: { backgroundColor: T.elevated, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  genreChipText: { color: T.textMuted, fontFamily: T.fontTitleMedium, fontSize: 12 },
  posterWrap: { position: 'relative' },
  posterExpandHint: {
    position: 'absolute', bottom: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 6, padding: 3,
  },
  posterModal: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  posterModalImg: { width: '100%', height: '75%', borderRadius: 12 },
  posterModalHint: { color: 'rgba(255,255,255,0.4)', fontFamily: T.fontBody, fontSize: 12, marginTop: 16 },
  ctaRow: { flexDirection: 'row', gap: 10 },
  ctaPrimary: { flex: 1, backgroundColor: T.amber, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  ctaPrimaryText: { color: T.bgPrimary, fontFamily: T.fontTitle, fontSize: 15 },
  ctaSecondary: { flex: 1, backgroundColor: T.elevated, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  ctaSecondaryText: { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 15 },
  droppedBanner: { backgroundColor: 'rgba(196,122,122,0.08)', borderWidth: 1, borderColor: 'rgba(196,122,122,0.2)', borderRadius: 12, padding: 12, gap: 4 },
  droppedBannerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  droppedBannerTitle: { color: T.dropped, fontFamily: T.fontTitle, fontSize: 13 },
  droppedBannerSub: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12 },
  sectionLabel: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' },
  whereValue: { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 20, lineHeight: 26 },
  dateText: { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 20, lineHeight: 26 },
  dateRange: { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 20, lineHeight: 26 },
  dateArrow: { color: T.textMuted, fontFamily: T.fontBody },
  dateEnd: { color: T.amber },
  planNote: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12 },
  planRatingNudge: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 13, fontStyle: 'italic', lineHeight: 20 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  editThoughtsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: 'rgba(239,159,39,0.3)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  editThoughtsText: { color: T.amber, fontFamily: T.fontTitle, fontSize: 13 },
  thoughtsRow: { flexDirection: 'row', gap: 20, alignItems: 'flex-start', justifyContent: 'space-between' },
  thoughtsYourRating: { flexShrink: 0 },
  thoughtsGlobal: { flexShrink: 0, minWidth: 0, gap: 4, alignItems: 'flex-end' },
  thoughtsRatingLabel: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  ratingBig: { color: T.amber, fontFamily: T.fontDisplay, fontSize: 48, lineHeight: 52 },
  noRating: { color: T.textMuted, fontFamily: T.fontTitleMedium, fontSize: 14 },
  globalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  globalDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  globalSource: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12, textAlign: 'right' },
  globalRating: { color: T.textPrimary, fontFamily: T.fontMono, fontSize: 14, fontWeight: '600' },
  reaction: { color: T.textPrimary, fontFamily: T.fontBody, fontSize: 13, lineHeight: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 14, fontStyle: 'italic' },
  statusTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusTag: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1 },
  statusTagText: { color: T.amber, fontFamily: T.fontTitle, fontSize: 11 },
  statusTagSoft: { backgroundColor: 'rgba(250,199,117,0.08)', borderColor: 'rgba(250,199,117,0.18)' },
  statusTagSoftSelected: { backgroundColor: T.amberSoft, borderColor: T.amberSoft },
  statusTagTextSoft: { color: T.amberSoft },
  statusTagWarm: { backgroundColor: 'rgba(200,133,74,0.08)', borderColor: 'rgba(200,133,74,0.18)' },
  statusTagWarmSelected: { backgroundColor: T.amberWarm, borderColor: T.amberWarm },
  statusTagTextWarm: { color: T.amberWarm },
  statusTagTextSelected: { color: T.bgPrimary },
  epProgressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  epProgressText: { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 15 },
  epPercent: { color: T.amber, fontFamily: T.fontMono, fontWeight: '800', fontSize: 20 },
  progressBar: { backgroundColor: T.elevated, borderRadius: 6, height: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: T.amber, borderRadius: 6 },

  // Inline log widget
  logWidget: { backgroundColor: T.elevated, borderRadius: 14, overflow: 'hidden' },
  logWidgetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 13,
  },
  logWidgetTitle: { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 14 },
  logWidgetBody: { paddingHorizontal: 14, paddingBottom: 14, gap: 12 },
  logWidgetSub: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 13 },
  logWidgetNext: { color: T.amberSoft, fontFamily: T.fontTitleMedium, fontSize: 13 },
  logInputBlock: { gap: 8 },
  logInputHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  logInputLabel: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  logModeToggle: { flexDirection: 'row', backgroundColor: T.bgPrimary, borderRadius: 10, padding: 3, gap: 3 },
  logModeBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  logModeBtnActive: { backgroundColor: T.elevated },
  logModeText: { color: T.textMuted, fontFamily: T.fontBodyMedium, fontSize: 11 },
  logModeTextActive: { color: T.amberSoft, fontFamily: T.fontTitle },
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.bgPrimary, borderRadius: 10, overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  stepperBtn: { paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  stepperInput: {
    color: T.amber, fontFamily: T.fontDisplay, fontSize: 22,
    minWidth: 54, textAlign: 'center', paddingVertical: 0,
  },
  stepperLabel: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 13 },
  logInputError: { color: T.dropped },
  logDateBlock: { gap: 8 },
  logDateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: T.bgPrimary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9,
  },
  logDateText: { flex: 1, color: T.textMuted, fontFamily: T.fontBody, fontSize: 12 },
  logCompleteBox: {
    backgroundColor: 'rgba(239,159,39,0.08)', borderWidth: 1,
    borderColor: 'rgba(239,159,39,0.2)', borderRadius: 12, padding: 14, gap: 12,
  },
  logCompleteTitle: { color: T.amber, fontFamily: T.fontTitle, fontSize: 14 },
  logStarWrap: { backgroundColor: T.bgPrimary, borderRadius: 10, padding: 10 },
  logReactionInput: {
    backgroundColor: T.bgPrimary, borderRadius: 10, padding: 10,
    color: T.textPrimary, fontFamily: T.fontBody, fontSize: 13, minHeight: 56,
  },
  logSessionBtn: {
    backgroundColor: T.amber, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  logSessionBtnDim: { opacity: 0.45 },
  logSessionBtnText: { color: T.bgPrimary, fontFamily: T.fontTitle, fontSize: 15 },
  markAllBtn: { alignItems: 'center', paddingVertical: 2 },
  markAllText: { color: T.amber, fontFamily: T.fontBody, fontSize: 13 },

  expandBtn: { backgroundColor: T.elevated, borderRadius: 12, paddingVertical: 9, alignItems: 'center' },
  expandBtnText: { color: T.textMuted, fontFamily: T.fontTitle, fontSize: 12 },
  epListScroll: { maxHeight: 474 },
  epItem: { backgroundColor: T.elevated, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: 'transparent' },
  epItemNext: { backgroundColor: 'rgba(239,159,39,0.06)', borderColor: 'rgba(239,159,39,0.25)' },
  epItemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  epDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  epDotWatched: { backgroundColor: 'rgba(239,159,39,0.15)' },
  epDotNext: { borderColor: T.amber, backgroundColor: 'rgba(239,159,39,0.1)' },
  epDotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.amber },
  epCheck: { color: T.amber, fontSize: 11, fontWeight: '700' },
  epLabel: { color: T.textPrimary, fontFamily: T.fontTitleMedium, fontSize: 13 },
  epLabelNext: { color: T.amberSoft, fontFamily: T.fontTitle },
  epLabelMuted: { color: T.textMuted },
  epUpNext: { color: T.amber, fontFamily: T.fontMono, fontSize: 11 },
  epNotes: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12, marginTop: 2 },
  noteBtn: { padding: 8 },
  noteBtnText: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12, opacity: 0.7 },
  noteInput: { backgroundColor: T.bgPrimary, borderWidth: 1, borderColor: 'rgba(239,159,39,0.3)', borderRadius: 10, padding: 8, color: T.textPrimary, fontFamily: T.fontBody, fontSize: 12, minHeight: 50 },
  noteActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  noteCancelText: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12, padding: 4 },
  noteSaveBtn: { backgroundColor: T.amber, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 4 },
  noteSaveText: { color: T.bgPrimary, fontFamily: T.fontTitle, fontSize: 12 },
  planCallout: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(239,159,39,0.08)', borderWidth: 1,
    borderColor: 'rgba(239,159,39,0.18)', borderRadius: 12, padding: 12,
  },
  planCalloutEmoji: { fontSize: 24 },
  planCalloutHead: { color: T.amberSoft, fontFamily: T.fontTitle, fontSize: 13 },
  planCalloutSub: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 11, marginTop: 2 },
  timeline: { gap: 0 },
  timelineRow: { flexDirection: 'row', gap: 12 },
  timelineDotCol: { alignItems: 'center', width: 24 },
  timelineIconWrap: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: T.elevated, alignItems: 'center', justifyContent: 'center',
  },
  timelineLine: { width: 1, flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 4, marginBottom: 0, minHeight: 16 },
  timelineContent: { flex: 1, paddingBottom: 16 },
  timelineLabel: { color: T.textPrimary, fontFamily: T.fontTitleMedium, fontSize: 13 },
  timelineDate: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12, marginTop: 2 },

  // Toast
  toast: {
    position: 'absolute', bottom: 96, left: 16, right: 16,
    backgroundColor: T.surface, borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: 'rgba(239,159,39,0.2)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 10,
  },
  toastIcon: { fontSize: 24 },
  toastTitle: { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 13 },
  toastBody: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12, marginTop: 1 },
  toastAction: { color: T.amber, fontFamily: T.fontTitle, fontSize: 13 },
});
