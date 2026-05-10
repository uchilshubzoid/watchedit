import { useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Poster from '../components/Poster';
import TypePill from '../components/TypePill';
import FilterSheet from '../components/FilterSheet';
import RatingSheet from '../components/RatingSheet';
import { getEntries, updateEntry } from '../db/storage';
import { T } from '../constants/tokens';

const TABS = [
  { id: 'all',       label: 'All' },
  { id: 'watching',  label: 'Watching' },
  { id: 'watched',   label: 'Watched' },
  { id: 'watchplan', label: 'Watch Plan' },
  { id: 'bookmarks', label: 'Bookmarks' },
];

const EMPTY_STATES = {
  all:       { icon: 'file-tray-outline',      title: 'Nothing logged yet. Go fix that.',                   sub: 'Your full WatchLog lives here once you start.' },
  watching:  { icon: 'play-circle-outline',    title: 'Nothing in motion. Start something.',                sub: 'Titles you\'re mid-way through appear here.' },
  watched:   { icon: 'close-circle-outline',   title: 'Your finished list is empty. Change that tonight.',  sub: 'Every title you\'ve completed lands here.' },
  watchplan: { icon: 'calendar-outline',       title: 'Nothing planned? Pick something.',                   sub: 'Save titles here before you start watching.' },
  bookmarks: { icon: 'bookmarks-outline',      title: 'Nothing bookmarked yet. Save the ones worth saving.', sub: 'Titles you\'ve flagged as a bookmark show up here.' },
};

function parseActivityDate(entry) {
  let dateStr = '';
  if (entry.status === 'watched')   dateStr = entry.finishedDate || '';
  else if (entry.status === 'watching') dateStr = entry.lastWatchedDate || '';
  else if (entry.status === 'watchplan') dateStr = entry.date || '';
  if (!dateStr) return 0;
  if (dateStr === 'Today') return Date.now();
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

function WatchCard({ e, isBookmarked, onBookmark, onRate }) {
  const dateLine = (() => {
    if (e.status === 'watchplan') return 'Yet to watch';
    if (e.dropped)  return `Dropped on ${e.date}`;
    if (e.paused)   return `Paused on ${e.lastWatchedDate || e.date}`;
    if (e.status === 'watching') return e.lastWatchedDate ? `Last watched ${e.lastWatchedDate}` : e.date;
    if (e.status === 'watched') {
      const d = e.finishedDate || e.date || '';
      return d && !/\d{4}/.test(d) ? `${d}, ${new Date().getFullYear()}` : d;
    }
    return e.finishedDate || e.date;
  })();

  const progressLine = (() => {
    if (e.dropped || e.paused || e.status === 'watching') {
      return e.ongoing ? `${e.ep} eps · Ongoing` : `${e.ep} of ${e.total} eps watched`;
    }
    if (e.status === 'watched') {
      if (e.type === 'Movie') return e.watchTime || null;
      return e.total ? `${e.total} episodes` : null;
    }
    return null;
  })();

  return (
    <Pressable onPress={() => router.push(`/detail/${e.id}`)} style={styles.card}>
      <View style={[styles.statusBar, { backgroundColor: typeAccentColor(e) }]} />
      <View style={styles.cardInner}>
        <Poster title={e.title} size={42} url={e.poster_url} />
        <View style={styles.cardMeta}>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle} numberOfLines={1}>{e.title}</Text>
            <Text style={styles.cardDate} numberOfLines={1}>
              {dateLine}{e.rewatch ? <Text style={styles.rewatch}> ↺</Text> : null}
            </Text>
            <Text style={styles.cardSub} numberOfLines={1}>
              {e.type}{progressLine ? <Text style={styles.progressText}> · {progressLine}</Text> : null}
            </Text>
          </View>
          <View style={styles.cardRight}>
            <Text style={[styles.ratingNum, !e.rating && styles.ratingEmpty]}>
              {e.rating ? String(e.rating) : '—'}
            </Text>
            <Pressable
              onPress={() => onBookmark(e.id)}
              hitSlop={8}
              style={styles.bookmarkBtn}
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
      {e.status === 'watched' && !e.rating && onRate && (
        <Pressable onPress={() => onRate(e)} style={styles.rateNudge}>
          <Text style={styles.rateNudgeText}>Rate it ★</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

export default function WatchList() {
  const params = useLocalSearchParams();
  const initialTab     = String(params.tab || 'all');
  const initialUnrated = params.unrated === 'true';
  const initialType    = params.type ? [String(params.type)] : [];

  const [entries,       setEntries]       = useState([]);
  const [tab,           setTab]           = useState(initialTab);
  const [search,        setSearch]        = useState('');
  const [sort,          setSort]          = useState('Most Recent Activity');
  const [chips,         setChips]         = useState(initialType);
  const [language,      setLanguage]      = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [showPaused,    setShowPaused]    = useState(false);
  const [filterOpen,    setFilterOpen]    = useState(false);
  const [unrated,       setUnrated]       = useState(initialUnrated);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [ratingEntry,   setRatingEntry]   = useState(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    getEntries().then(data => {
      if (!active) return;
      setEntries(data);
      setBookmarkedIds(new Set(data.filter(e => e.bookmark).map(e => e.id)));
      // sync tab/unrated/type from params on focus
      setTab(String(params.tab || 'all'));
      setUnrated(params.unrated === 'true');
      setChips(params.type ? [String(params.type)] : []);
    });
    return () => { active = false; };
  }, [params.tab, params.unrated, params.type]));

  function toggleBookmark(id) {
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    const entry = entries.find(e => e.id === id);
    if (entry) updateEntry({ ...entry, bookmark: !entry.bookmark });
  }

  function filtered() {
    let list = [...entries];
    if (tab === 'watching')  list = list.filter(e => e.status === 'watching' && !e.dropped);
    if (tab === 'watched')   list = list.filter(e => e.status === 'watched');
    if (tab === 'watchplan') list = list.filter(e => e.status === 'watchplan');
    if (tab === 'bookmarks') list = list.filter(e => bookmarkedIds.has(e.id));
    if (tab === 'watching' && !showPaused) list = list.filter(e => !e.paused);
    const typeChips = chips.filter(c => ['Anime', 'Movie', 'TV Show'].includes(c));
    if (typeChips.length) list = list.filter(e => typeChips.includes(e.type));
    if (chips.includes('Rewatched')) list = list.filter(e => e.rewatch);
    if (language) list = list.filter(e => e.lang === language);
    if (selectedGenres.length) list = list.filter(e => selectedGenres.some(g => (e.genre || []).includes(g)));
    if (unrated) list = list.filter(e => e.status === 'watched' && !e.rating);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q) ||
        (e.lang || '').toLowerCase().includes(q) ||
        (e.genre || []).some(g => g.toLowerCase().includes(q))
      );
    }
    if (sort === 'Most Recent Activity') list.sort((a, b) => parseActivityDate(b) - parseActivityDate(a));
    if (sort === 'New to Old')        list.sort((a, b) => Number(b.id) - Number(a.id));
    if (sort === 'Old to New')        list.sort((a, b) => Number(a.id) - Number(b.id));
    if (sort === 'Rated High to Low') list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sort === 'Rated Low to High') list.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    if (sort === 'A-Z') list.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'Z-A') list.sort((a, b) => b.title.localeCompare(a.title));
    return list;
  }

  const results = filtered();
  const genresFilter = Array.from(new Set(entries.flatMap(e => e.genre || []))).sort();
  const activeFilterCount = [
    ...chips, language ? 1 : 0, ...selectedGenres,
    unrated ? 1 : 0, (showPaused && tab === 'watching') ? 1 : 0,
  ].filter(Boolean).length;

  function switchTab(id) {
    setTab(id); setChips([]); setLanguage(''); setSelectedGenres([]);
  }

  async function handleRateSave(updated) {
    setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
    await updateEntry(updated);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search titles, genres, languages..."
          placeholderTextColor={T.textMuted}
          style={styles.searchInput}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Text style={styles.clearX}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
        style={styles.tabRow}
      >
        {TABS.map(t => (
          <Pressable key={t.id} onPress={() => switchTab(t.id)} style={styles.tab}>
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
            {tab === t.id && <View style={styles.tabUnderline} />}
          </Pressable>
        ))}
      </ScrollView>

      {/* Quick type chips + filter button */}
      <View style={styles.chipRow}>
        <FlatList
          data={['Anime', 'Movie', 'TV Show']}
          keyExtractor={c => c}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipList}
          renderItem={({ item: type }) => {
            const active = chips.includes(type);
            return (
              <Pressable
                onPress={() => setChips(prev => {
                  const typeGroup = ['Anime', 'Movie', 'TV Show'];
                  return prev.includes(type)
                    ? prev.filter(c => c !== type)
                    : [...prev.filter(c => !typeGroup.includes(c)), type];
                })}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{type}</Text>
              </Pressable>
            );
          }}
        />
        <Pressable onPress={() => setFilterOpen(true)} style={styles.filterBtn}>
          <Ionicons name="options-outline" size={18} color={activeFilterCount > 0 ? T.amber : T.textMuted} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Count */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {results.length} {results.length === 1 ? 'title' : 'titles'}
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={results}
        style={{ flex: 1 }}
        keyExtractor={e => String(e.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: e }) => (
          <WatchCard
            e={e}
            isBookmarked={bookmarkedIds.has(e.id)}
            onBookmark={toggleBookmark}
            onRate={setRatingEntry}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name={EMPTY_STATES[tab]?.icon} size={28} color={T.textMuted} style={{ opacity: 0.6 }} />
            <Text style={styles.emptyTitle}>{EMPTY_STATES[tab]?.title}</Text>
            <Text style={styles.emptySubtext}>{EMPTY_STATES[tab]?.sub}</Text>
          </View>
        }
      />

      <FilterSheet
        show={filterOpen}
        onClose={() => setFilterOpen(false)}
        sort={sort}
        onSort={s => setSort(s)}
        activeChips={chips}
        onToggleChip={chip => setChips(p => p.includes(chip) ? p.filter(c => c !== chip) : [...p, chip])}
        showPaused={showPaused}
        onTogglePaused={v => setShowPaused(typeof v === 'boolean' ? v : !showPaused)}
        tab={tab}
        language={language}
        onLanguage={setLanguage}
        selectedGenres={selectedGenres}
        onToggleGenre={g => setSelectedGenres(p => p.includes(g) ? p.filter(x => x !== g) : [...p, g])}
        onClearAll={() => { setChips([]); setLanguage(''); setSelectedGenres([]); setShowPaused(false); setUnrated(false); }}
        genres={genresFilter}
        unrated={unrated}
        onToggleUnrated={setUnrated}
      />

      {ratingEntry && (
        <RatingSheet
          entry={ratingEntry}
          show
          onClose={() => setRatingEntry(null)}
          onSave={handleRateSave}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bgPrimary },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: T.surface, margin: 16, marginBottom: 0,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
  },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, color: T.textPrimary, fontFamily: T.fontBody, fontSize: 13 },
  clearX: { color: T.textMuted, fontSize: 18 },
  tabRow: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', marginTop: 4, flexShrink: 0, flexGrow: 0 },
  tabsContainer: { paddingHorizontal: 16, gap: 4 },
  tab: { paddingHorizontal: 10, paddingVertical: 10, position: 'relative' },
  tabText: { color: T.textMuted, fontFamily: T.fontTitleMedium, fontSize: 13, whiteSpace: 'nowrap' },
  tabTextActive: { color: T.amber, fontFamily: T.fontTitle },
  tabUnderline: { position: 'absolute', bottom: 0, left: 10, right: 10, height: 2, backgroundColor: T.amber, borderRadius: 2 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 6 },
  chipList: { gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
  chipActive: { backgroundColor: T.amber },
  chipText: { color: T.textMuted, fontFamily: T.fontTitle, fontSize: 12 },
  chipTextActive: { color: T.bgPrimary },
  filterBtn: { width: 44, height: 44, borderRadius: 18, backgroundColor: T.elevated, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  filterIcon: { fontSize: 18 },
  filterIconActive: { tintColor: T.amber },
  filterBadge: {
    position: 'absolute', top: 6, right: 6,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: T.amber, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  filterBadgeText: { color: T.bgPrimary, fontFamily: T.fontMono, fontSize: 11, fontWeight: '700' },
  countRow: { paddingHorizontal: 16, paddingBottom: 6 },
  countText: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  list: { padding: 16, paddingTop: 0, gap: 8, paddingBottom: 40 },
  card: { backgroundColor: T.surface, borderRadius: 16, overflow: 'hidden' },
  statusBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  cardInner: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', padding: 12, paddingLeft: 18 },
  cardMeta: { flex: 1, flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  cardText: { flex: 1, minWidth: 0, gap: 3 },
  cardTitle: { color: T.amberDeep, fontFamily: T.fontTitle, fontSize: 15, lineHeight: 20 },
  cardDate: { color: T.textPrimary, fontFamily: T.fontBodyMedium, fontSize: 12 },
  rewatch: { color: T.amberSoft },
  cardSub: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 11 },
  progressText: { fontFamily: T.fontMono, fontWeight: '600' },
  cardRight: { alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  ratingNum: { color: T.amber, fontFamily: T.fontMono, fontWeight: '800', fontSize: 15 },
  ratingEmpty: { color: T.textMuted },
  bookmarkBtn: { marginTop: 6 },
  rateNudge: {
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 8, paddingHorizontal: 18, alignItems: 'flex-end',
  },
  rateNudgeText: { color: T.amber, fontFamily: T.fontTitle, fontSize: 11, backgroundColor: 'rgba(239,159,39,0.12)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  empty: { paddingVertical: 60, alignItems: 'center', paddingHorizontal: 32, gap: 8 },
  emptyTitle:   { color: T.textPrimary, fontFamily: T.fontDisplay, fontSize: 15, textAlign: 'center' },
  emptySubtext: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
