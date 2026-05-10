import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '../components/BackButton';
import { ConfirmModal } from '../components/BlockingPopup';
import { getEntries, saveEntries, getCategories, saveCategories, DEFAULT_CATEGORIES } from '../db/storage';
import { T } from '../constants/tokens';

export default function ManageTagsScreen() {
  const [tab, setTab] = useState('categories');
  const [entries, setEntries] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  const [renamingIdx, setRenamingIdx] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [catError, setCatError] = useState('');
  const [genreDeleteTarget, setGenreDeleteTarget] = useState(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([getEntries(), getCategories()]).then(([data, cats]) => {
      if (!active) return;
      setEntries(data);
      setCategories(cats);
    });
    return () => { active = false; };
  }, []));

  const categoryCounts = Object.fromEntries(
    categories.map(c => [c, entries.filter(e => e.type === c).length])
  );

  const allGenres = (() => {
    const map = {};
    entries.forEach(e => {
      (e.genre || []).forEach(g => { map[g] = (map[g] || 0) + 1; });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  })();

  async function handleRenameConfirm(idx) {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === categories[idx]) { setRenamingIdx(null); return; }
    if (categories.some((c, i) => i !== idx && c === trimmed)) {
      setCatError('That category name already exists.');
      return;
    }
    const oldName = categories[idx];
    const newCats = [...categories];
    newCats[idx] = trimmed;
    const updatedEntries = entries.map(e => e.type === oldName ? { ...e, type: trimmed } : e);
    await saveEntries(updatedEntries);
    await saveCategories(newCats);
    setEntries(updatedEntries);
    setCategories(newCats);
    setRenamingIdx(null);
    setCatError('');
  }

  async function handleAddCategory() {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      setCatError('That category name already exists.');
      return;
    }
    if (categories.length >= 5) {
      setCatError('Maximum 5 categories allowed.');
      return;
    }
    const newCats = [...categories, trimmed];
    await saveCategories(newCats);
    setCategories(newCats);
    setNewCategoryName('');
    setAddingCategory(false);
    setCatError('');
  }

  async function handleDeleteCategory(idx) {
    const cat = categories[idx];
    const count = categoryCounts[cat] || 0;
    if (count > 0) {
      setCatError(
        `Can't delete "${cat}" — ${count} title${count === 1 ? ' is' : 's are'} using it. Rename it instead, or reassign those titles first.`
      );
      return;
    }
    const newCats = categories.filter((_, i) => i !== idx);
    await saveCategories(newCats);
    setCategories(newCats);
    setCatError('');
  }

  async function handleDeleteGenre(genre) {
    const updatedEntries = entries.map(e => ({
      ...e,
      genre: (e.genre || []).filter(g => g !== genre),
    }));
    await saveEntries(updatedEntries);
    setEntries(updatedEntries);
    setGenreDeleteTarget(null);
  }

  function switchTab(t) {
    setTab(t);
    setRenamingIdx(null);
    setAddingCategory(false);
    setNewCategoryName('');
    setCatError('');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Tags & Categories</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.tabRow}>
        {[
          { id: 'categories', label: 'Categories' },
          { id: 'genres', label: 'Genre Tags' },
        ].map(t => (
          <Pressable
            key={t.id}
            onPress={() => switchTab(t.id)}
            style={[styles.tabBtn, tab === t.id && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, tab === t.id && styles.tabBtnTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {tab === 'categories' ? (
          <View style={{ gap: 12 }}>
            <Text style={styles.hint}>
              Categories define what type of content something is. You can have up to 5.
            </Text>

            {catError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={15} color={T.dropped} />
                <Text style={styles.errorText}>{catError}</Text>
              </View>
            ) : null}

            <View style={styles.card}>
              {categories.map((cat, idx) => (
                <View key={cat} style={[styles.tagRow, idx > 0 && styles.tagRowBorder]}>
                  {renamingIdx === idx ? (
                    <TextInput
                      style={styles.renameInput}
                      value={renameValue}
                      onChangeText={setRenameValue}
                      autoFocus
                      onSubmitEditing={() => handleRenameConfirm(idx)}
                      returnKeyType="done"
                      placeholderTextColor={T.textMuted}
                    />
                  ) : (
                    <View style={styles.tagInfo}>
                      <Text style={styles.tagName}>{cat}</Text>
                      <View style={styles.countPill}>
                        <Text style={styles.countText}>{categoryCounts[cat] || 0}</Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.tagActions}>
                    {renamingIdx === idx ? (
                      <>
                        <Pressable
                          onPress={() => { setRenamingIdx(null); setCatError(''); }}
                          style={styles.actionBtn}
                          hitSlop={8}
                        >
                          <Ionicons name="close" size={17} color={T.textMuted} />
                        </Pressable>
                        <Pressable
                          onPress={() => handleRenameConfirm(idx)}
                          style={[styles.actionBtn, styles.actionBtnConfirm]}
                          hitSlop={8}
                        >
                          <Ionicons name="checkmark" size={17} color={T.bgPrimary} />
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <Pressable
                          onPress={() => {
                            setRenamingIdx(idx);
                            setRenameValue(cat);
                            setCatError('');
                          }}
                          style={styles.actionBtn}
                          hitSlop={8}
                        >
                          <Ionicons name="pencil-outline" size={16} color={T.textMuted} />
                        </Pressable>
                        <Pressable
                          onPress={() => handleDeleteCategory(idx)}
                          style={styles.actionBtn}
                          hitSlop={8}
                        >
                          <Ionicons name="trash-outline" size={16} color="rgba(196,122,122,0.65)" />
                        </Pressable>
                      </>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {addingCategory ? (
              <View style={styles.addRow}>
                <TextInput
                  style={styles.addInput}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder="Category name"
                  placeholderTextColor={T.textMuted}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleAddCategory}
                />
                <Pressable
                  onPress={() => { setAddingCategory(false); setNewCategoryName(''); setCatError(''); }}
                  style={styles.actionBtn}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={17} color={T.textMuted} />
                </Pressable>
                <Pressable
                  onPress={handleAddCategory}
                  style={[styles.actionBtn, styles.actionBtnConfirm]}
                  hitSlop={8}
                >
                  <Ionicons name="checkmark" size={17} color={T.bgPrimary} />
                </Pressable>
              </View>
            ) : categories.length < 5 ? (
              <Pressable
                onPress={() => { setAddingCategory(true); setCatError(''); }}
                style={styles.addCatBtn}
              >
                <Ionicons name="add-circle-outline" size={17} color={T.amber} />
                <Text style={styles.addCatText}>Add Category</Text>
              </Pressable>
            ) : (
              <Text style={styles.maxReached}>Maximum of 5 categories reached</Text>
            )}
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <Text style={styles.hint}>
              Genre tags across your WatchLog. Deleting a tag removes it from all titles.
            </Text>

            {allGenres.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="pricetags-outline" size={36} color={T.textMuted} />
                <Text style={styles.emptyText}>No genre tags yet</Text>
                <Text style={styles.emptySub}>Add genre tags when logging a title</Text>
              </View>
            ) : (
              <View style={styles.card}>
                {allGenres.map(([genre, count], idx) => (
                  <View key={genre} style={[styles.tagRow, idx > 0 && styles.tagRowBorder]}>
                    <View style={styles.tagInfo}>
                      <Text style={styles.tagName}>{genre}</Text>
                      <View style={styles.countPill}>
                        <Text style={styles.countText}>{count}</Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => setGenreDeleteTarget({ genre, count })}
                      style={styles.actionBtn}
                      hitSlop={8}
                    >
                      <Ionicons name="trash-outline" size={16} color="rgba(196,122,122,0.65)" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <ConfirmModal
        show={!!genreDeleteTarget}
        onClose={() => setGenreDeleteTarget(null)}
        title={`Remove "${genreDeleteTarget?.genre}"?`}
        message={
          (genreDeleteTarget?.count || 0) > 0
            ? `This tag is on ${genreDeleteTarget.count} title${genreDeleteTarget.count === 1 ? '' : 's'}. Removing it will strip the tag from all of them.`
            : 'This genre tag will be permanently removed.'
        }
        confirmLabel="Remove Tag"
        onConfirm={() => handleDeleteGenre(genreDeleteTarget?.genre)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bgPrimary },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12,
  },
  headerTitle: {
    color: T.textPrimary, fontFamily: T.fontDisplay, fontSize: 17,
  },

  tabRow: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 16,
    backgroundColor: T.surface, borderRadius: 14, padding: 4,
  },
  tabBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: T.elevated },
  tabBtnText: { color: T.textMuted, fontFamily: T.fontTitleMedium, fontSize: 13 },
  tabBtnTextActive: { color: T.textPrimary },

  scroll: { paddingHorizontal: 16, paddingBottom: 40, gap: 0 },

  hint: {
    color: T.textMuted, fontFamily: T.fontBody, fontSize: 12,
    lineHeight: 18, marginBottom: 4,
  },

  errorBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(196,122,122,0.1)', borderRadius: 12,
    padding: 12,
  },
  errorText: {
    flex: 1, color: T.dropped, fontFamily: T.fontBody, fontSize: 13, lineHeight: 18,
  },

  card: {
    backgroundColor: T.surface, borderRadius: 18, overflow: 'hidden',
  },
  tagRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 13, gap: 12,
  },
  tagRowBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  tagInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  tagName: { color: T.textPrimary, fontFamily: T.fontTitleMedium, fontSize: 14 },
  countPill: {
    backgroundColor: T.elevated, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  countText: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 11 },

  tagActions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: T.elevated,
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnConfirm: { backgroundColor: T.amber },

  renameInput: {
    flex: 1, color: T.textPrimary, fontFamily: T.fontBody, fontSize: 14,
    backgroundColor: T.elevated, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
  },

  addRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.surface, borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  addInput: {
    flex: 1, color: T.textPrimary, fontFamily: T.fontBody, fontSize: 14,
    backgroundColor: T.elevated, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8,
  },

  addCatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.surface, borderRadius: 18,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  addCatText: { color: T.amber, fontFamily: T.fontTitleMedium, fontSize: 14 },
  maxReached: {
    color: T.textMuted, fontFamily: T.fontBody, fontSize: 12,
    textAlign: 'center', paddingVertical: 8,
  },

  emptyState: {
    alignItems: 'center', gap: 8, paddingVertical: 48,
  },
  emptyText: { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 15, marginTop: 4 },
  emptySub: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 13 },
});
