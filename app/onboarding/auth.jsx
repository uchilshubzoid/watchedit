import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { T } from '../../src/constants/tokens';
import InfoPopup from '../../src/components/InfoPopup';
import BackButton from '../../src/components/BackButton';
import { useFadeBack } from '../../src/hooks/useFadeBack';

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

export default function OnboardingAuth() {
  const [watcherName,   setWatcherName]   = useState('');
  const [popupVisible,  setPopupVisible]  = useState(false);
  const { opacity, goBack } = useFadeBack();

  useEffect(() => {
    AsyncStorage.getItem('watchedit_watcher_name').then(n => {
      if (n) setWatcherName(n);
    });
  }, []);

  async function handleGuest() {
    await AsyncStorage.setItem('watchedit_auth_mode', 'guest');
    router.push('/onboarding/guest');
  }

  function handleGoogle() {
    setPopupVisible(true);
  }

  const initial = watcherName ? watcherName[0].toUpperCase() : '?';

  return (
    <Animated.View style={{ flex: 1, opacity }}>
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.inner}>

        <ProgressDots current={1} total={3} />

        {/* Back */}
        <BackButton style={styles.backBtn} onPress={goBack} />

        {/* Name confirmation chip */}
        <View style={styles.chipRow}>
          <LinearGradient
            colors={[T.amber, T.amberDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarInitial}>{initial}</Text>
          </LinearGradient>
          <Text style={styles.chipName}>{watcherName || '—'}</Text>
          <Text style={styles.chipConfirm}> · Watcher Name set ✓</Text>
        </View>

        {/* Headline */}
        <View style={styles.hero}>
          <Text style={styles.headline}>Where should your{'\n'}WatchLog live?</Text>
          <Text style={styles.sub}>
            Sign in to keep it safe and access it on any device.
          </Text>
        </View>

        {/* Auth options */}
        <View style={styles.authBlock}>

          {/* Google */}
          <Pressable
            onPress={handleGoogle}
            style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.8 }]}
          >
            <AntDesign name="google" size={20} color={T.textPrimary} />
            <Text style={styles.googleBtnText}>Sign in with Google</Text>
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Guest */}
          <Pressable
            onPress={handleGuest}
            style={({ pressed }) => [styles.guestBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.guestBtnText}>Continue as guest</Text>
          </Pressable>

          <Text style={styles.disclaimer}>
            Guest mode: your WatchLog stays on this device only.{'\n'}
            You can sign in anytime from the Watcher screen.
          </Text>
        </View>

      </View>

      <InfoPopup
        visible={popupVisible}
        title="Coming soon"
        message="Google sign-in is coming in Stage 3."
        onClose={() => setPopupVisible(false)}
      />
    </SafeAreaView>
    </Animated.View>
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
  dotDone:   { width: 24, backgroundColor: T.amber, opacity: 0.45 },
  dotActive: { width: 36, backgroundColor: T.amber },
  dotDim:    { width: 24, backgroundColor: T.elevated },

  backBtn: { position: 'absolute', top: 18, left: 12 },

  // Confirmation chip
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: T.surface,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 10,
    gap: 8,
  },
  avatar: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: T.bgPrimary, fontFamily: T.fontDisplay, fontSize: 12, lineHeight: 14 },
  chipName:    { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 13 },
  chipConfirm: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12 },

  // Hero
  hero: { alignItems: 'center', gap: 10 },
  headline: {
    color: T.textPrimary,
    fontFamily: T.fontDisplay,
    fontSize: 26,
    textAlign: 'center',
    lineHeight: 34,
  },
  sub: {
    color: T.textMuted,
    fontFamily: T.fontBody,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Auth block
  authBlock: { gap: 14 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: 'rgba(239,159,39,0.07)',
    borderWidth: 1, borderColor: 'rgba(239,159,39,0.3)',
    borderRadius: T.radiusButton, paddingVertical: 14,
  },
  googleBtnText: { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 14 },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: T.elevated },
  dividerLabel: { color: T.textMuted, fontFamily: T.fontBody, fontSize: 12 },

  // Guest button
  guestBtn: {
    borderWidth: 1, borderColor: 'rgba(239,159,39,0.2)',
    backgroundColor: 'rgba(239,159,39,0.04)',
    borderRadius: T.radiusButton, paddingVertical: 14, alignItems: 'center',
  },
  guestBtnText: { color: T.textMuted, fontFamily: T.fontTitleMedium, fontSize: 14 },

  // Disclaimer
  disclaimer: {
    color: T.textMuted, fontFamily: T.fontBody,
    fontSize: 10, textAlign: 'center', lineHeight: 16, opacity: 0.7,
  },
});
