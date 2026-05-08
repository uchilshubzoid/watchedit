import { useRef } from 'react';
import { Animated } from 'react-native';
import { router } from 'expo-router';

export function useFadeBack() {
  const opacity = useRef(new Animated.Value(1)).current;

  function goBack() {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 380,
      useNativeDriver: true,
    }).start();
    // Small head-start on the fade before the native slide kicks in,
    // so the exit feels like the previous screen is sliding on top.
    setTimeout(() => router.back(), 60);
  }

  return { opacity, goBack };
}
