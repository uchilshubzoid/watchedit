import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { T } from '../../src/constants/tokens';

function ProgressDots({ current, total }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }, (_, i) => {
        const isDone   = i < current;
        const isActive = i === current;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              isDone   && styles.dotDone,
              isActive && styles.dotActive,
              !isDone && !isActive && styles.dotDim,
            ]}
          />
        );
      })}
    </View>
  );
}

const FEATURES = [
  {
    icon: 'add-circle-outline',
    title: 'Log It',
    body: 'TMDB, MyAnimeList, or add manually. Rate, review, and log your watch sessions.',
    pills: ['TMDB', 'MyAnimeList', 'OMDB'],
  },
  {
    icon: 'bar-chart-outline',
    title: 'Review Stats',
    body: "See what genres you're obsessed with, runtime totals, and how your taste evolves.",
    pills: null,
  },
  {
    icon: 'bookmark-outline',
    title: 'Remember It',
    body: 'No more "wait, did I watch that?" — your complete history, always searchable.',
    pills: null,
  },
];

export default function OnboardingAbout() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.inner}
        showsVerticalScrollIndicator={false}
      >
        <ProgressDots current={1} total={4} />

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>THANKS FOR DOWNLOADING!</Text>
          <Text style={styles.headline}>Everything you watch,{'\n'}finally tracked.</Text>
          <Text style={styles.sub}>
            <Text style={styles.subBrand}>WatchedIt</Text>
            {' '}is your personal log for every show, film, and anime you've
            watched — or plan to. Yours forever.
          </Text>
        </View>

        {/* Feature cards */}
        <View style={styles.featureList}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureCard}>
              <View style={styles.featureIconWrap}>
                <Ionicons name={f.icon} size={22} color={T.amber} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureBody}>{f.body}</Text>
                {f.pills && (
                  <View style={styles.pillRow}>
                    {f.pills.map(p => (
                      <View key={p} style={styles.pill}>
                        <Text style={styles.pillText}>{p}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        <Pressable
          onPress={() => router.push('/onboarding/auth')}
          style={({ pressed }) => [styles.ctaWrap, pressed && { opacity: 0.85 }]}
        >
          <LinearGradient
            colors={[T.amber, T.amberDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>Let's set up my WatchLog →</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bgPrimary },
  inner: {
    paddingHorizontal: 28,
    paddingTop: 82,
    paddingBottom: 32,
    gap: 28,
  },

  dots: {
    flexDirection: 'row',
    gap: 6,
    alignSelf: 'center',
    position: 'absolute',
    top: 28,
  },
  dot:       { height: 6, borderRadius: 3 },
  dotDone:   { width: 24, backgroundColor: T.amber, opacity: 0.45 },
  dotActive: { width: 36, backgroundColor: T.amber },
  dotDim:    { width: 24, backgroundColor: T.elevated },

  hero: { alignItems: 'center', gap: 10 },
  eyebrow: {
    color: T.textMuted,
    fontFamily: T.fontMono,
    fontSize: 12,
    letterSpacing: 1.0,
    textAlign: 'center',
  },
  headline: {
    color: T.textPrimary,
    fontFamily: T.fontDisplay,
    fontSize: 30,
    textAlign: 'center',
    lineHeight: 38,
  },
  sub: {
    color: T.textMuted,
    fontFamily: T.fontFun,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  subBrand: {
    color: T.amber,
    fontFamily: T.fontTitle,
  },

  featureList: { gap: 10 },
  featureCard: {
    backgroundColor: T.surface,
    borderRadius: T.radiusCard,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(239,159,39,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: { flex: 1, gap: 4 },
  featureTitle: {
    color: T.textPrimary,
    fontFamily: T.fontTitle,
    fontSize: 15,
  },
  featureBody: {
    color: T.textMuted,
    fontFamily: T.fontFun,
    fontSize: 13,
    lineHeight: 19,
  },
  pillRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  pill: {
    backgroundColor: T.elevated,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: {
    color: T.textMuted,
    fontFamily: T.fontMono,
    fontSize: 11,
  },

  ctaWrap: { borderRadius: T.radiusButton, overflow: 'hidden' },
  cta: { paddingVertical: 15, alignItems: 'center', borderRadius: T.radiusButton },
  ctaText: { color: T.bgPrimary, fontFamily: T.fontDisplay, fontSize: 15 },
});
