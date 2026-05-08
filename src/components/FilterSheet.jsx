import { useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, Switch, StyleSheet } from 'react-native';
import { T } from '../constants/tokens';

const SORT_OPTIONS  = ['Most Recent Activity','New to Old','Old to New','Rated High to Low','Rated Low to High','A-Z','Z-A'];
const LANG_OPTIONS  = ['English','Japanese','Korean','Hindi','Tamil','Spanish','French'];
const TYPE_OPTIONS  = ['Anime','Movie','TV Show','Rewatched'];
const CATEGORIES    = [
  { id: 'sort',     label: 'Sort',     icon: '📊' },
  { id: 'category', label: 'Category', icon: '🏷️' },
  { id: 'language', label: 'Language', icon: '🌍' },
  { id: 'genre',    label: 'Genre',    icon: '🎭' },
];

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
}) {
  const [pane, setPane] = useState('sort');

  const cats = tab === 'watching'
    ? [...CATEGORIES, { id: 'paused', label: 'Paused', icon: '⏸️' }]
    : CATEGORIES;

  const hasActive =
    activeChips.length > 0 || language || selectedGenres.length > 0 ||
    unrated || (tab === 'watching' && showPaused);

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
        <ScrollView style={{ maxHeight: 280 }}>
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
        <View style={styles.sheet}>
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

          {/* Active filters */}
          {hasActive && (() => {
            const pills = [];
            if (sort !== 'Most Recent Activity') pills.push({ label: sort, onRemove: () => onSort('Most Recent Activity') });
            activeChips.forEach(c => pills.push({ label: c, onRemove: () => onToggleChip(c) }));
            if (language) pills.push({ label: language, onRemove: () => onLanguage('') });
            selectedGenres.forEach(g => pills.push({ label: g, onRemove: () => onToggleGenre(g) }));
            if (tab === 'watching' && showPaused) pills.push({ label: 'Show Paused', onRemove: () => onTogglePaused(false) });
            if (unrated) pills.push({ label: 'Unrated only', onRemove: () => onToggleUnrated(false) });
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
                <Pressable key={c.id} onPress={() => setPane(c.id)}
                  style={[styles.navItem, pane === c.id && styles.navItemActive]}>
                  <Text style={styles.navIcon}>{c.icon}</Text>
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

          {/* Unrated toggle */}
          <View style={styles.unratedBox}>
            <View style={styles.unratedText}>
              <Text style={styles.unratedLabel}>Unrated only</Text>
              <Text style={styles.unratedSub}>Show only watched entries that still need a rating.</Text>
            </View>
            <Switch
              value={unrated}
              onValueChange={onToggleUnrated}
              trackColor={{ false: T.elevated, true: T.amber }}
              thumbColor={T.textPrimary}
            />
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
    padding: 20, paddingBottom: 40, maxHeight: '94%',
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
  activePillScroll: { marginBottom: 16 },
  activePillWrap: { gap: 8, flexDirection: 'row' },
  activePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: T.elevated, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  activePillText: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 11 },
  activePillX: { color: T.textMuted, fontSize: 14 },
  body: { flexDirection: 'row', flex: 1, gap: 16, marginBottom: 16, minHeight: 200 },
  leftNav: { width: 110, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.08)', paddingRight: 12 },
  navSectionLabel: {
    color: T.textMuted, fontFamily: T.fontMono, fontSize: 9,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10,
  },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8,
    marginBottom: 4, borderWidth: 1, borderColor: 'transparent',
  },
  navItemActive: { backgroundColor: T.elevated, borderColor: 'rgba(239,159,39,0.3)' },
  navIcon: { fontSize: 14 },
  navLabel: { color: T.textMuted, fontFamily: T.fontBodyMedium, fontSize: 13 },
  navLabelActive: { color: T.amber, fontFamily: T.fontTitleMedium },
  rightPane: { flex: 1 },
  paneTitle: {
    color: T.textMuted, fontFamily: T.fontMono, fontSize: 9,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14,
  },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optBtn: {
    backgroundColor: T.elevated, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 12,
  },
  optBtnActive: { backgroundColor: T.amber },
  optText: { color: T.textMuted, fontFamily: T.fontTitleMedium, fontSize: 12 },
  optTextActive: { color: T.bgPrimary },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  toggleLabel: { color: T.textPrimary, fontFamily: T.fontTitleMedium, fontSize: 14 },
  unratedBox: {
    flexDirection: 'row', backgroundColor: T.elevated, borderRadius: 16,
    padding: 14, alignItems: 'center', gap: 14, marginBottom: 16,
  },
  unratedText: { flex: 1 },
  unratedLabel: { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 14 },
  unratedSub: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 11, marginTop: 4 },
  applyBtn: {
    backgroundColor: T.amber, borderRadius: 16, paddingVertical: 14, alignItems: 'center',
  },
  applyText: { color: T.bgPrimary, fontFamily: T.fontDisplay, fontSize: 15 },
});
