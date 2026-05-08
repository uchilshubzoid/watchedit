import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { T } from '../constants/tokens';

export default function BackButton({ onPress, style }) {
  return (
    <Pressable
      onPress={onPress ?? (() => router.back())}
      style={[{ padding: 8 }, style]}
      hitSlop={4}
    >
      <Ionicons name="chevron-back" size={30} color={T.textPrimary} />
    </Pressable>
  );
}
