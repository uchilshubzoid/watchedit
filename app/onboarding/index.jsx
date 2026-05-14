import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Keyboard, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { T } from '../../src/constants/tokens';

function ProgressDots({ current, total }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }, (_, i) => {
        const isActive = i === current;
        return (
          <View
            key={i}
            style={[styles.dot, isActive ? styles.dotActive : styles.dotDim]}
          />
        );
      })}
    </View>
  );
}

export default function OnboardingName() {
  const [name,    setName]    = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  async function handleContinue() {
    const trimmed = name.trim();
    if (!trimmed) return;
    Keyboard.dismiss();
    await AsyncStorage.setItem('watchedit_watcher_name', trimmed);
    router.push('/onboarding/auth');
  }

  const canContinue = name.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={styles.inner}>

          <ProgressDots current={0} total={3} />

          <View style={styles.hero}>
            <Text style={styles.emoji}>🎬</Text>
            <Text style={styles.headline}>Before we begin —</Text>
            <Text style={styles.sub}>
              Every WatchLog needs a name on it. What's yours?
            </Text>
          </View>

          <View style={styles.fieldBlock}>
            <View style={styles.labelRow}>
              <Text style={styles.labelMono}>WATCHER NAME</Text>
              <Text style={styles.labelBody}> — what you're called in your WatchLog</Text>
            </View>
            <TextInput
              ref={inputRef}
              value={name}
              onChangeText={setName}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onSubmitEditing={handleContinue}
              returnKeyType="done"
              placeholder="e.g. Matt, Mathai, Mithai, Machi…"
              placeholderTextColor={T.textMuted}
              style={[styles.input, focused && styles.inputFocused]}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={32}
            />
          </View>

          <Pressable
            onPress={handleContinue}
            disabled={!canContinue}
            style={({ pressed }) => [styles.ctaWrap, !canContinue && styles.ctaDisabled, pressed && canContinue && { opacity: 0.85 }]}
          >
            <LinearGradient
              colors={[T.amber, T.amberDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>That's me →</Text>
            </LinearGradient>
          </Pressable>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bgPrimary },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 82,
    paddingBottom: 24,
    justifyContent: 'flex-start',
    gap: 32,
  },

  // Progress dots — pill style
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignSelf: 'center',
    position: 'absolute',
    top: 28,
  },
  dot:       { height: 6, borderRadius: 3 },
  dotActive: { width: 36, backgroundColor: T.amber },
  dotDim:    { width: 24, backgroundColor: T.elevated },

  // Hero
  hero: { alignItems: 'center', gap: 10 },
  emoji: { fontSize: 44, lineHeight: 52 },
  headline: {
    color: T.textPrimary,
    fontFamily: T.fontDisplay,
    fontSize: 26,
    textAlign: 'center',
  },
  sub: {
    color: T.textMuted,
    fontFamily: T.fontFun,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 260,
  },

  // Field
  fieldBlock: { gap: 10 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  labelMono: {
    color: T.textMuted,
    fontFamily: T.fontMono,
    fontSize: 14,
    letterSpacing: 1.0,
  },
  labelBody: {
    color: T.textMuted,
    fontFamily: T.fontFun,
    fontSize: 12,
  },
  input: {
    backgroundColor: T.elevated,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: T.textPrimary,
    fontFamily: T.fontTitle,
    fontSize: 16,
  },
  inputFocused: { borderColor: T.amber },

  // CTA
  ctaWrap: { borderRadius: T.radiusButton, overflow: 'hidden' },
  ctaDisabled: { opacity: 0.35, pointerEvents: 'none' },
  cta: { paddingVertical: 15, alignItems: 'center', borderRadius: T.radiusButton },
  ctaText: { color: T.bgPrimary, fontFamily: T.fontDisplay, fontSize: 15 },
});
