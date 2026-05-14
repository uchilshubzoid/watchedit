import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../constants/tokens';

export default function InfoPopup({ visible, title, message, cta = 'Got it', onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <Pressable onPress={onClose} style={styles.ctaWrap}>
            <LinearGradient
              colors={[T.amber, T.amberDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>{cta}</Text>
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  sheet: {
    width: '100%',
    backgroundColor: T.surface,
    borderRadius: 20,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,159,39,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 16,
  },
  title: {
    color: T.textPrimary,
    fontFamily: T.fontDisplay,
    fontSize: 18,
    textAlign: 'center',
  },
  message: {
    color: T.textMuted,
    fontFamily: T.fontFun,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  ctaWrap: { borderRadius: T.radiusButton, overflow: 'hidden', marginTop: 8 },
  cta: { paddingVertical: 13, alignItems: 'center', borderRadius: T.radiusButton },
  ctaText: { color: T.bgPrimary, fontFamily: T.fontDisplay, fontSize: 14 },
});
