import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView,
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

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={styles.inner}>

          <ProgressDots current={2} total={3} />

          {/* ── Headline block ── */}
          <View style={styles.headlineBlock}>
            <Text style={styles.monoLabel}>JUST SO YOU KNOW —</Text>

            {/* "Hey [NAME] ✏️ ," */}
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

          {/* ── CTA ── */}
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
    paddingTop: 28,
    paddingBottom: 24,
    justifyContent: 'center',
    gap: 28,
  },

  // Progress dots
  dots: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'center',
    position: 'absolute',
    top: 28,
  },
  dot:       { width: 7, height: 7, borderRadius: 4 },
  dotDone:   { backgroundColor: T.amber, opacity: 0.4 },
  dotActive: { backgroundColor: T.amber },
  dotDim:    { backgroundColor: T.elevated },

  // Headline block
  headlineBlock: { gap: 8 },

  monoLabel: {
    color: T.textMuted,
    fontFamily: T.fontMono,
    fontSize: 11,
    letterSpacing: 0.8,
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
    fontSize: 18,
    lineHeight: 26,
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
    fontSize: 18,
    lineHeight: 26,
  },

  pencilBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: T.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    marginRight: 2,
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
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
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

  // CTA
  ctaWrap: {
    borderRadius: T.radiusButton,
    overflow: 'hidden',
  },
  ctaDisabled: { opacity: 0.3 },
  cta: {
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: T.radiusButton,
  },
  ctaText: {
    color: T.bgPrimary,
    fontFamily: T.fontDisplay,
    fontSize: 15,
  },
});
