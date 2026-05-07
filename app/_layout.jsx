import { Stack } from 'expo-router';
import { useEffect } from 'react';
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
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#292826' }, animation: 'ios_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="detail/[id]" />
        <Stack.Screen
          name="logit/search"
          options={{ presentation: 'modal', animation: 'none' }}
        />
        <Stack.Screen
          name="logit/details"
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="stats" />
      </Stack>
    </GestureHandlerRootView>
  );
}
