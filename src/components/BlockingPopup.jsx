import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { T } from '../constants/tokens';

export default function BlockingPopup({
  show, onClose, emoji, title, message, cta, ctaSecondary, onSecondary,
}) {
  return (
    <Modal visible={!!show} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <Pressable style={styles.ctaBtn} onPress={onClose}>
            <Text style={styles.ctaText}>{cta}</Text>
          </Pressable>
          {ctaSecondary && (
            <Pressable style={styles.secondaryBtn} onPress={onSecondary}>
              <Text style={styles.secondaryText}>{ctaSecondary}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

export function ConfirmModal({ show, onClose, title, message, confirmLabel, onConfirm, danger = true }) {
  return (
    <Modal visible={!!show} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.confirmBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.confirmSheet}>
          <View style={styles.handle} />
          <Text style={styles.confirmTitle}>{title}</Text>
          <Text style={styles.confirmMsg}>{message}</Text>
          <View style={styles.confirmRow}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmBtn, danger ? styles.confirmDanger : styles.confirmSafe]}
              onPress={onConfirm}
            >
              <Text style={[styles.confirmBtnText, danger ? styles.confirmDangerText : styles.confirmSafeText]}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  card: {
    width: '100%', maxWidth: 340, backgroundColor: T.surface,
    borderRadius: 24, padding: 28, alignItems: 'center',
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: {
    color: T.textPrimary, fontFamily: T.fontDisplay, fontSize: 19,
    lineHeight: 25, marginBottom: 10, textAlign: 'center',
  },
  message: {
    color: T.textMuted, fontFamily: T.fontFun, fontSize: 13,
    lineHeight: 21, marginBottom: 24, textAlign: 'center',
  },
  ctaBtn: {
    width: '100%', backgroundColor: T.amber,
    borderRadius: 16, paddingVertical: 13, alignItems: 'center',
  },
  ctaText: { color: T.bgPrimary, fontFamily: T.fontDisplay, fontSize: 15 },
  secondaryBtn: {
    width: '100%', marginTop: 10, backgroundColor: T.elevated,
    borderRadius: 16, paddingVertical: 12, alignItems: 'center',
  },
  secondaryText: { color: T.textMuted, fontFamily: T.fontTitleMedium, fontSize: 14 },
  confirmBackdrop: { flex: 1, justifyContent: 'flex-end' },
  confirmSheet: {
    backgroundColor: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  handle: {
    width: 36, height: 4, backgroundColor: T.elevated,
    borderRadius: 4, alignSelf: 'center', marginBottom: 20,
  },
  confirmTitle: { color: T.textPrimary, fontFamily: T.fontDisplay, fontSize: 18, marginBottom: 8 },
  confirmMsg: { color: T.textMuted, fontFamily: T.fontFun, fontSize: 13, marginBottom: 24 },
  confirmRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, backgroundColor: T.elevated,
    borderRadius: 16, alignItems: 'center',
  },
  cancelText: { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 14 },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  confirmDanger: {
    backgroundColor: 'rgba(196,122,122,0.2)',
    borderWidth: 1, borderColor: 'rgba(196,122,122,0.3)',
  },
  confirmSafe: { backgroundColor: T.amber },
  confirmBtnText: { fontFamily: T.fontTitle, fontSize: 14 },
  confirmDangerText: { color: '#C47A7A' },
  confirmSafeText: { color: T.bgPrimary },
});
