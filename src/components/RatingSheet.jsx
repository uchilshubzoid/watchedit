import { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import StarRating from './StarRating';
import { T } from '../constants/tokens';

export default function RatingSheet({ entry, show, onClose, onSave }) {
  const [rating,   setRating]   = useState(entry?.rating ?? null);
  const [reaction, setReaction] = useState(entry?.reaction ?? '');

  if (!show) return null;

  function handleSave() {
    onSave({ ...entry, rating, reaction });
    onClose();
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <Pressable onPress={onClose} style={styles.handleWrap}>
            <View style={styles.handle} />
          </Pressable>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.question}>
              How did <Text style={styles.titleEmphasis}>{entry?.title}</Text> land?
            </Text>
            <StarRating value={rating} onChange={setRating} />
            <View style={styles.reactionWrap}>
              <View style={styles.reactionHeader}>
                <Text style={styles.label}>Add a reaction? (optional)</Text>
                <Text style={styles.charCount}>{reaction.length}/500</Text>
              </View>
              <TextInput
                value={reaction}
                onChangeText={t => setReaction(t.slice(0, 500))}
                placeholder="Your thoughts..."
                placeholderTextColor={T.textMuted}
                multiline
                numberOfLines={3}
                style={styles.textarea}
                textAlignVertical="top"
              />
            </View>
            <Pressable style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Rating</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  handleWrap: { alignItems: 'center', paddingVertical: 16 },
  handle: { width: 36, height: 4, backgroundColor: T.elevated, borderRadius: 4 },
  content: { padding: 20, gap: 20, paddingBottom: 44 },
  question: { color: T.textPrimary, fontFamily: T.fontTitle, fontSize: 17 },
  titleEmphasis: { color: T.amberDeep },
  reactionWrap: { gap: 8 },
  reactionHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  charCount: { color: T.textMuted, fontFamily: T.fontMono, fontSize: 10 },
  textarea: {
    backgroundColor: T.elevated, borderRadius: 12, padding: 12,
    color: T.textPrimary, fontFamily: T.fontBody, fontSize: 14, minHeight: 80,
  },
  saveBtn: { backgroundColor: T.amber, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: T.bgPrimary, fontFamily: T.fontDisplay, fontSize: 15 },
});
