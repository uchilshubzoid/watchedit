import { useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Poster from '../components/Poster';
import TypePill from '../components/TypePill';
import { getEntries } from '../db/storage';
import { T } from '../constants/tokens';

export default function SearchScreen() {
  const [entries, setEntries] = useState([]);
  const [query, setQuery] = useState('');

  useFocusEffect(useCallback(() => {
    let active = true;
    getEntries().then(data => { if (active) setEntries(data); });
    return () => { active = false; };
  }, []));

  const q = query.trim().toLowerCase();
  const results = q
    ? entries.filter(e =>
        e.title.toLowerCase().includes(q) ||
        (e.genre || []).some(g => g.toLowerCase().includes(q)) ||
        (e.lang || '').toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q)
      )
    : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search your WatchLog..."
          placeholderTextColor={T.textMuted}
          style={styles.input}
          returnKeyType="search"
          autoFocus={false}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')}>
            <Text style={styles.clearX}>✕</Text>
          </Pressable>
        )}
      </View>

      {!q && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>Search by title, genre or language</Text>
        </View>
      )}
      {q && results.length === 0 && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>No results for "{query}"</Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={e => String(e.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: e }) => (
          <Pressable onPress={() => router.push(`/detail/${e.id}`)} style={styles.card}>
            <Poster title={e.title} size={44} url={e.poster_url} />
            <View style={styles.meta}>
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={1}>{e.title}</Text>
                {e.rewatch && <Text style={styles.rewatch}>↺</Text>}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bgPrimary },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: T.surface, margin: 16, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  searchIcon: { fontSize: 16 },
  input: { flex: 1, color: T.textPrimary, fontFamily: T.fontBody, fontSize: 14 },
  clearX: { color: T.textMuted, fontSize: 18 },
  hint: { alignItems: 'center', marginTop: 48 },
  hintText: { color: T.textMuted, fontFamily: T.fontFun, fontSize: 13 },
  list: { padding: 16, paddingTop: 0, gap: 8 },
  card: {
    backgroundColor: T.surface, borderRadius: T.radiusCard,
    padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center',
  },
  meta: { flex: 1, minWidth: 0, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: T.amberDeep, fontFamily: T.fontTitle, fontSize: 14, flex: 1 },
  rewatch: { color: T.amberSoft, fontSize: 12 },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lang: { color: T.textMuted, fontFamily: T.fontFun, fontSize: 11 },
  ep: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 11 },
  rating: { color: T.amber, fontFamily: T.fontMono, fontWeight: '800', fontSize: 16 },
});
