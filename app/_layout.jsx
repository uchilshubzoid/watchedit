import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { Poppins_400Regular, Poppins_500Medium } from '@expo-google-fonts/poppins';
import { Inconsolata_400Regular } from '@expo-google-fonts/inconsolata';
import { PlayfairDisplay_900Black_Italic } from '@expo-google-fonts/playfair-display';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Nunito-Regular': Nunito_400Regular,
    'Nunito-Medium': Nunito_500Medium,
    'Nunito-SemiBold': Nunito_600SemiBold,
    'Nunito-Bold': Nunito_700Bold,
    'Nunito-ExtraBold': Nunito_800ExtraBold,
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Inconsolata-Regular': Inconsolata_400Regular,
    'PlayfairDisplay-BlackItalic': PlayfairDisplay_900Black_Italic,
  });

  const [ready, setReady] = useState(false);

  // Phase 1: once fonts are loaded, check onboarding state
  useEffect(() => {
    if (!fontsLoaded) return;
    AsyncStorage.getItem('watchedit_onboarding_done').then(done => {
      setReady(done ? 'tabs' : 'onboarding');
    });
  }, [fontsLoaded]);

  // Phase 2: navigate to the right place, then drop the splash
  useEffect(() => {
    if (!ready) return;
    if (ready === 'onboarding') router.replace('/onboarding');
    SplashScreen.hideAsync();
  }, [ready]);

  if (!fontsLoaded || !ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#292826' }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#292826' },
          animation: 'slide_from_right',
          animationDuration: 280,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ animation: 'fade', animationDuration: 700 }} />
        <Stack.Screen name="onboarding" options={{ animation: 'none' }} />
        <Stack.Screen name="detail/[id]" />
        <Stack.Screen
          name="logit/search"
          options={{ presentation: 'modal', animation: 'none' }}
        />
        <Stack.Screen
          name="logit/details"
          options={{ animation: 'slide_from_bottom', gestureDirection: 'vertical' }}
        />
        <Stack.Screen name="stats" />
      </Stack>
    </GestureHandlerRootView>
  );
}
