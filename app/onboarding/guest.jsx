import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const INFO_ROWS = [
  { icon: '✅', text: 'Full app, right now — Log It, WatchList, Stats. All of it.' },
  { icon: '📵', text: 'Device only — uninstalling clears your WatchLog.' },
  { icon: '🔄', text: 'Sign in later — Watcher → Sign in with Google, anytime.' },
];

export default function OnboardingGuest() {
  const [watcherName, setWatcherName] = useState('');
  const [isEditing,   setIsEditing]   = useState(false);
  const [editValue,   setEditValue]   = useState('');
  const prevName = useRef('');
  const nameRef  = useRef(null);

  useEffect(() => {
    AsyncStorage.getItem('watchedit_watcher_name').then(n => {
      if (n) { setWatcherName(n); prevName.current = n; }
    });
  }, []);

  function startEditing() {
    setEditValue(watcherName);
    setIsEditing(true);
    setTimeout(() => nameRef.current?.focus(), 50);
  }

  async function commitName() {
    if (!isEditing) return;
    const trimmed = editValue.trim();
    const final   = trimmed || prevName.current;
    prevName.current = final;
    setWatcherName(final);
    setIsEditing(false);
    await AsyncStorage.setItem('watchedit_watcher_name', final);
  }

  async function handleContinue() {
    await AsyncStorage.setItem('watchedit_onboarding_done', 'true');
    router.replace('/(tabs)');
  }

  function handleSignIn() {
    Alert.alert('Coming soon', 'Google sign-in is coming in Stage 3.');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={styles.inner}>

          <ProgressDots current={2} total={3} />

          {/* ── Headline block ── */}
          <View style={styles.headlineBlock}>

            {/* "Hey [NAME] ✏️ ," — name first */}
            <View style={styles.nameLine}>
              <Text style={styles.headline}>Hey </Text>

              {isEditing ? (
                <TextInput
                  ref={nameRef}
                  value={editValue}
                  onChangeText={setEditValue}
                  onSubmitEditing={commitName}
                  onBlur={commitName}
                  returnKeyType="done"
                  autoCapitalize="words"
                  autoCorrect={false}
                  maxLength={32}
                  selectTextOnFocus
                  style={styles.nameInput}
                />
              ) : (
                <>
                  <Text style={[styles.headline, styles.headlineAmber]}>
                    {watcherName}
                  </Text>
                  <Pressable onPress={startEditing} style={styles.pencilBtn} hitSlop={8}>
                    <Ionicons name="pencil-outline" size={11} color={T.textMuted} />
                  </Pressable>
                </>
              )}

              <Text style={styles.headline}>,</Text>
            </View>

            {isEditing && (
              <Text style={styles.editHint}>↵ or tap outside to save</Text>
            )}

            {/* Mono label after name */}
            <Text style={styles.monoLabel}>JUST SO YOU KNOW —</Text>

            <Text style={styles.headline}>your WatchLog stays on this device.</Text>

            <Text style={styles.sub}>
              That's completely fine — everything works. But if you uninstall
              the app, your data goes with it.
            </Text>
          </View>

          {/* ── Info card ── */}
          <View style={styles.infoCard}>
            {INFO_ROWS.map((row, i) => (
              <View
                key={i}
                style={[styles.infoRow, i > 0 && styles.infoRowDivider]}
              >
                <Text style={styles.infoIcon}>{row.icon}</Text>
                <Text style={styles.infoText}>{row.text}</Text>
              </View>
            ))}
          </View>

          {/* ── CTAs ── */}
          <View style={styles.ctaBlock}>
            <Pressable
              onPress={handleContinue}
              disabled={isEditing}
              style={({ pressed }) => [
                styles.ctaWrap,
                isEditing && styles.ctaDisabled,
                pressed && !isEditing && { opacity: 0.85 },
              ]}
            >
              <LinearGradient
                colors={[T.amber, T.amberDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cta}
              >
                <Text style={styles.ctaText}>That's me, let's go →</Text>
              </LinearGradient>
            </Pressable>

            <Pressable onPress={handleSignIn} style={styles.signInLink} hitSlop={10}>
              <Text style={styles.signInLinkText}>Changed my mind — I want to sign in →</Text>
            </Pressable>
          </View>

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
    gap: 24,
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
  dotDone:   { width: 24, backgroundColor: T.amber, opacity: 0.45 },
  dotActive: { width: 36, backgroundColor: T.amber },
  dotDim:    { width: 24, backgroundColor: T.elevated },

  // Headline block
  headlineBlock: { gap: 8 },

  monoLabel: {
    color: T.textMuted,
    fontFamily: T.fontMono,
    fontSize: 12,
    letterSpacing: 1.0,
    marginTop: 4,
    marginBottom: 2,
  },

  // "Hey [NAME] ✏️ ," row
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  headline: {
    color: T.textPrimary,
    fontFamily: T.fontDisplay,
    fontSize: 22,
    lineHeight: 30,
  },
  headlineAmber: { color: T.amber },

  // Inline name TextInput
  nameInput: {
    flex: 1,
    minWidth: 80,
    backgroundColor: T.elevated,
    borderWidth: 1.5,
    borderColor: T.amber,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    color: T.amber,
    fontFamily: T.fontDisplay,
    fontSize: 22,
    lineHeight: 30,
  },

  pencilBtn: {
    width: 22, height: 22, borderRadius: 6,
    backgroundColor: T.elevated,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 6, marginRight: 2,
  },

  editHint: {
    color: T.textMuted,
    fontFamily: T.fontMono,
    fontSize: 9,
    marginTop: 2,
    opacity: 0.7,
  },

  sub: {
    color: T.textMuted,
    fontFamily: T.fontBody,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },

  // Info card
  infoCard: {
    backgroundColor: 'rgba(239,159,39,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(239,159,39,0.2)',
    borderRadius: T.radiusCard,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
  },
  infoRowDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  infoIcon: { fontSize: 15, lineHeight: 20 },
  infoText: {
    flex: 1,
    color: T.textMuted,
    fontFamily: T.fontBody,
    fontSize: 13,
    lineHeight: 19,
  },

  // CTA block
  ctaBlock: { gap: 14, alignItems: 'center' },
  ctaWrap: { alignSelf: 'stretch', borderRadius: T.radiusButton, overflow: 'hidden' },
  ctaDisabled: { opacity: 0.3 },
  cta: { paddingVertical: 15, alignItems: 'center', borderRadius: T.radiusButton },
  ctaText: { color: T.bgPrimary, fontFamily: T.fontDisplay, fontSize: 15 },

  signInLink: { paddingVertical: 4 },
  signInLinkText: {
    color: T.textMuted,
    fontFamily: T.fontTitleMedium,
    fontSize: 12,
    textDecorationLine: 'underline',
    opacity: 0.7,
  },
});
