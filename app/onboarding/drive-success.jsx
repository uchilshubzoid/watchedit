import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { T } from '../../src/constants/tokens';
import { getGoogleAuthErrorMessage, signInWithGoogle, signOutGoogle } from '../../src/hooks/useGoogleAuth';

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

export default function OnboardingDriveSuccess() {
  const params = useLocalSearchParams();
  const [email,           setEmail]           = useState(params.email || '');
  const [relinking,       setRelinking]       = useState(false);
  const [relinkError,     setRelinkError]     = useState('');

  async function handleWrongAccount() {
    setRelinkError('');
    await AsyncStorage.removeItem('watchedit_auth_mode');
    await AsyncStorage.removeItem('watchedit_drive_account');
    await AsyncStorage.removeItem('watchedit_drive_token');
    setRelinking(true);
    try {
      await signOutGoogle();
      const result = await signInWithGoogle({ forceAccountPicker: true });
      if (!result) return;

      await AsyncStorage.setItem('watchedit_auth_mode', 'google');
      await AsyncStorage.setItem('watchedit_drive_account', result.email);
      await AsyncStorage.setItem('watchedit_drive_token', result.accessToken);
      await AsyncStorage.setItem('watchedit_last_sync', new Date().toISOString());
      setEmail(result.email);
    } catch (error) {
      const msg = getGoogleAuthErrorMessage(error);
      if (msg) setRelinkError(msg);
    } finally {
      setRelinking(false);
    }
  }

  async function handleContinue() {
    await AsyncStorage.setItem('watchedit_onboarding_done', 'true');
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.inner}>

        <ProgressDots current={3} total={4} />

        {/* Headline */}
        <View style={styles.hero}>
          <View style={styles.successIconWrap}>
            <Ionicons name="cloud-done-outline" size={36} color={T.amber} />
          </View>
          <Text style={styles.headline}>Drive connected.</Text>
          <Text style={styles.sub}>
            Your WatchLog will sync to your Google Drive automatically.
          </Text>
        </View>

        {/* Drive link pill */}
        <View style={styles.drivePill}>
          {relinking
            ? <ActivityIndicator size="small" color={T.textMuted} />
            : <Ionicons name="logo-google" size={18} color={T.textMuted} />
          }
          <View style={styles.drivePillText}>
            <Text style={styles.drivePillLabel}>CONNECTED AS</Text>
            <Text style={styles.drivePillEmail}>
              {relinking ? 'Signing in…' : (email || 'your Google account')}
            </Text>
          </View>
          {!relinking && (
            <View style={styles.connectedBadge}>
              <Text style={styles.connectedBadgeText}>✓ Linked</Text>
            </View>
          )}
        </View>

        {/* Info rows */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color={T.textMuted} />
            <Text style={styles.infoText}>
              Your data is yours — stored in your own Drive, readable anytime.
            </Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowDivider]}>
            <Ionicons name="sync-outline" size={18} color={T.textMuted} />
            <Text style={styles.infoText}>
              WatchedIt never stores your data on our servers. It goes straight to your Drive.
            </Text>
          </View>
        </View>

        {/* CTAs */}
        <View style={styles.ctaBlock}>
          <Pressable
            onPress={handleContinue}
            disabled={relinking}
            style={({ pressed }) => [
              styles.ctaWrap,
              relinking && { opacity: 0.4 },
              pressed && !relinking && { opacity: 0.85 },
            ]}
          >
            <LinearGradient
              colors={[T.amber, T.amberDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>Let's go →</Text>
            </LinearGradient>
          </Pressable>

          {relinkError ? <Text style={styles.errorText}>{relinkError}</Text> : null}

          <Pressable
            onPress={handleWrongAccount}
            disabled={relinking}
            hitSlop={10}
            style={[styles.wrongLink, relinking && { opacity: 0.4 }]}
          >
            <Text style={styles.wrongLinkText}>Wrong account? → try again</Text>
          </Pressable>
        </View>

      </View>
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

  hero: { alignItems: 'center', gap: 12 },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(239,159,39,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    color: T.textPrimary,
    fontFamily: T.fontDisplay,
    fontSize: 30,
    textAlign: 'center',
  },
  sub: {
    color: T.textMuted,
    fontFamily: T.fontFun,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },

  drivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: T.surface,
    borderRadius: T.radiusCard,
    borderWidth: 1,
    borderColor: 'rgba(239,159,39,0.2)',
    padding: 14,
  },
  drivePillText: { flex: 1, gap: 2 },
  drivePillLabel: {
    color: T.textMuted,
    fontFamily: T.fontMono,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  drivePillEmail: {
    color: T.textPrimary,
    fontFamily: T.fontTitle,
    fontSize: 14,
  },
  connectedBadge: {
    backgroundColor: 'rgba(239,159,39,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  connectedBadgeText: {
    color: T.amber,
    fontFamily: T.fontTitleMedium,
    fontSize: 11,
  },

  infoCard: {
    backgroundColor: T.surface,
    borderRadius: T.radiusCard,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
  },
  infoRowDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  infoText: {
    flex: 1,
    color: T.textMuted,
    fontFamily: T.fontFun,
    fontSize: 13,
    lineHeight: 19,
  },

  ctaBlock: { gap: 14, alignItems: 'center' },
  ctaWrap: { alignSelf: 'stretch', borderRadius: T.radiusButton, overflow: 'hidden' },
  cta: { paddingVertical: 15, alignItems: 'center', borderRadius: T.radiusButton },
  ctaText: { color: T.bgPrimary, fontFamily: T.fontDisplay, fontSize: 15 },

  errorText: {
    color: T.dropped,
    fontFamily: T.fontFun,
    fontSize: 13,
    textAlign: 'center',
    marginTop: -6,
  },

  wrongLink: { paddingVertical: 4 },
  wrongLinkText: {
    color: T.textMuted,
    fontFamily: T.fontTitleMedium,
    fontSize: 12,
    textDecorationLine: 'underline',
    opacity: 0.7,
  },
});
