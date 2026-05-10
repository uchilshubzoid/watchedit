import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '../components/BackButton';
import Poster from '../components/Poster';
import TypePill from '../components/TypePill';
import { useFadeBack } from '../hooks/useFadeBack';
import { getEntries, updateEntry } from '../db/storage';
import { T } from '../constants/tokens';

function typeAccentColor(e) {
  if (e.dropped) return T.dropped;
  if (e.paused)  return T.paused;
  if (e.type === 'Anime')   return T.colorAnime;
  if (e.type === 'Movie')   return T.colorMovie;
  if (e.type === 'TV Show') return T.colorTV;
  return T.textMuted;
}

export default function RecommendationsScreen() {
  const [entries, setEntries] = useState([]);
  const { opacity, goBack } = useFadeBack();

  useFocusEffect(useCallback(() => {
    let active = true;
    getEntries().then(data => {
      if (active) setEntries(data.filter(e => e.recommend));
    });
    return () => { active = false; };
  }, []));

  async function handleRemove(id) {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    await updateEntry({ ...entry, recommend: false });
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  return (
    <Animated.View style={{ flex: 1, opacity }}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <BackButton onPress={goBack} />
          <Text style={styles.headerTitle}>My Recommendations</Text>
          {entries.length > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{entries.length}</Text>
            </View>
          )}
        </View>

        {entries.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="thumbs-up-outline" size={36} color={T.textMuted} style={{ opacity: 0.4 }} />
            <Text style={styles.emptyTitle}>No recommendations yet.</Text>
            <Text style={styles.emptySub}>
              When you log a title and mark it as Recommended, it shows up here — ready to share when someone asks.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.listHint}>Tap 👍 to remove from this list</Text>
            <FlatList
              data={entries}
              keyExtractor={e => String(e.id)}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item: e }) => (
                <Pressable onPress={() => router.push(`/detail/${e.id}`)} style={styles.card}>
                  <View style={[styles.statusBar, { backgroundColor: typeAccentColor(e) }]} />
                  <View style={styles.cardInner}>
                    <Poster title={e.title} size={42} url={e.poster_url} />
                    <View style={styles.cardMeta}>
                      <View style={styles.cardText}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{e.title}</Text>
                        <View style={styles.pillRow}>
                          <TypePill type={e.type} />
                          {e.lang ? <Text style={styles.cardLang}>{e.lang}</Text> : null}
                        </View>
                        {e.reaction ? (
                          <Text style={styles.cardReaction} numberOfLines={1}>"{e.reaction}"</Text>
                        ) : null}
                      </View>
                      <View style={styles.cardRight}>
                        {e.rating ? <Text style={styles.ratingNum}>{e.rating}</Text> : null}
                        <Pressable
                          onPress={() => handleRemove(e.id)}
                          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                          style={styles.removeBtn}
                        >
                          <Ionicons name="thumbs-up" size={16} color={T.amber} />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </Pressable>
              )}
            />
          </>
        )}
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bgPrimary },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 10,
  },
  headerTitle: {
    flex: 1, color: T.textPrimary,
    fontFamily: T.fontDisplay, fontSize: 18, letterSpacing: -0.2,
  },
  headerBadge: {
    backgroundColor: T.elevated, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  headerBadgeText: { color: T.amber, fontFamily: T.fontMono, fontWeight: '700', fontSize: 13 },
  listHint: {
    color: T.textMuted, fontFamily: T.fontBody, fontSize: 12,
    paddingHorizontal: 20, paddingBottom: 8, opacity: 0.7,
  },
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 12,
  },
  emptyTitle: { color: T.textPrimary, fontFamily: T.fontDisplay, fontSize: 16, textAlign: 'center' },
  emptySub: {
    color: T.textMuted, fontFamily: T.fontBody, fontSize: 13,
    textAlign: 'center', lineHeight: 20,
  },
  list: { paddingHorizontal: 16, gap: 8, paddingBottom: 40 },
  card: { backgroundColor: T.surface, borderRadius: 16, overflow: 'hidden' },
  statusBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  cardInner: {
    flexDirection: 'row', gap: 14, alignItems: 'flex-start',
    padding: 12, paddingLeft: 18,
  },
  cardMeta: { flex: 1, flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  cardText: { flex: 1, minWidth: 0, gap: 4 },
  cardTitle: { color: T.amberDeep, fontFamily: T.fontTitle, fontSize: 15, lineHeight: 20 },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardLang: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12 },
  cardReaction: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12, fontStyle: 'italic' },
  cardRight: { alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  ratingNum: { color: T.amber, fontFamily: T.fontMono, fontWeight: '800', fontSize: 15 },
  removeBtn: { padding: 4 },
});
