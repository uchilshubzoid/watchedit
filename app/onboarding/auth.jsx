import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { T } from '../../src/constants/tokens';
import BackButton from '../../src/components/BackButton';
import { useFadeBack } from '../../src/hooks/useFadeBack';
import { getGoogleAuthErrorMessage, signInWithGoogle } from '../../src/hooks/useGoogleAuth';

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
  const [watcherName,    setWatcherName]    = useState('');
  const [driveLoading,   setDriveLoading]   = useState(false);
  const [driveError,     setDriveError]     = useState('');
  const { opacity, goBack } = useFadeBack();

  useEffect(() => {
    AsyncStorage.getItem('watchedit_watcher_name').then(n => {
      if (n) setWatcherName(n);
    });
  }, []);

  async function handleDrive() {
    setDriveError('');
    setDriveLoading(true);
    try {
      const result = await signInWithGoogle();
      if (!result) return;

      await AsyncStorage.setItem('watchedit_auth_mode', 'google');
      await AsyncStorage.setItem('watchedit_drive_account', result.email);
      await AsyncStorage.setItem('watchedit_drive_token', result.accessToken);
      await AsyncStorage.setItem('watchedit_last_sync', new Date().toISOString());
      router.push({ pathname: '/onboarding/drive-success', params: { email: result.email } });
    } catch (error) {
      const msg = getGoogleAuthErrorMessage(error);
      if (msg) setDriveError(msg);
    } finally {
      setDriveLoading(false);
    }
  }

  async function handlePhoneOnly() {
    await AsyncStorage.setItem('watchedit_auth_mode', 'guest');
    router.push('/onboarding/guest');
  }

  const initial = watcherName ? watcherName[0].toUpperCase() : '?';

  return (
    <Animated.View style={{ flex: 1, opacity }}>
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.inner}>

        <ProgressDots current={2} total={4} />
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
          <Text style={styles.headline}>Your data.{'\n'}Always yours.</Text>
          <Text style={styles.sub}>Choose where your WatchLog lives.</Text>
        </View>

        {/* Option cards */}
        <View style={styles.optionList}>

          {/* Google Drive */}
          <Pressable
            onPress={handleDrive}
            disabled={driveLoading}
            style={({ pressed }) => [
              styles.optionCard,
              styles.optionCardAmber,
              driveLoading && { opacity: 0.7 },
              pressed && !driveLoading && { opacity: 0.85 },
            ]}
          >
            <View style={styles.optionIconWrap}>
              {driveLoading
                ? <ActivityIndicator size="small" color={T.amber} />
                : <Ionicons name="cloud-outline" size={24} color={T.amber} />
              }
            </View>
            <View style={styles.optionContent}>
              <View style={styles.optionTitleRow}>
                <Text style={styles.optionTitle}>
                  {driveLoading ? 'Connecting…' : 'Sync to Google Drive'}
                </Text>
                {!driveLoading && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Recommended</Text>
                  </View>
                )}
              </View>
              <Text style={styles.optionBody}>
                {driveLoading
                  ? 'Signing in to your Google account'
                  : 'Backed up to your personal Google Drive. You own the file.'}
              </Text>
            </View>
            {!driveLoading && (
              <Ionicons name="chevron-forward" size={18} color={T.amber} style={{ opacity: 0.6 }} />
            )}
          </Pressable>

          {driveError ? <Text style={styles.errorText}>{driveError}</Text> : null}

          {/* Phone only */}
          <Pressable
            onPress={handlePhoneOnly}
            disabled={driveLoading}
            style={({ pressed }) => [
              styles.optionCard,
              driveLoading && { opacity: 0.4 },
              pressed && !driveLoading && { opacity: 0.85 },
            ]}
          >
            <View style={[styles.optionIconWrap, styles.optionIconWrapDim]}>
              <Ionicons name="phone-portrait-outline" size={24} color={T.textMuted} />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, styles.optionTitleDim]}>Keep it on this phone</Text>
              <Text style={styles.optionBody}>
                Lives on this device only. Works great, no account needed.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={T.textMuted} style={{ opacity: 0.4 }} />
          </Pressable>

        </View>

      </View>
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

  backBtn: { position: 'absolute', top: 18, left: 12 },

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
  chipConfirm: { color: T.textMuted, fontFamily: T.fontFun, fontSize: 12 },

  hero: { alignItems: 'center', gap: 10 },
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
  },

  optionList: { gap: 12 },

  optionCard: {
    backgroundColor: T.surface,
    borderRadius: T.radiusCard,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  optionCardAmber: {
    borderColor: 'rgba(239,159,39,0.35)',
    backgroundColor: 'rgba(239,159,39,0.06)',
  },

  optionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(239,159,39,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconWrapDim: {
    backgroundColor: T.elevated,
  },

  optionContent: { flex: 1, gap: 4 },
  optionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  optionTitle: {
    color: T.textPrimary,
    fontFamily: T.fontTitle,
    fontSize: 15,
  },
  optionTitleDim: { color: T.textMuted },
  optionBody: {
    color: T.textMuted,
    fontFamily: T.fontFun,
    fontSize: 13,
    lineHeight: 18,
  },

  badge: {
    backgroundColor: 'rgba(239,159,39,0.15)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    color: T.amber,
    fontFamily: T.fontTitleMedium,
    fontSize: 10,
  },

  errorText: {
    color: T.dropped,
    fontFamily: T.fontFun,
    fontSize: 13,
    textAlign: 'center',
    marginTop: -4,
  },
});
