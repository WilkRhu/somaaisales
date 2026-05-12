import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AppProviders } from '@/contexts/AppProviders';

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="splash" />
        <Stack.Screen name="store-selection" />
        <Stack.Screen name="app" />
      </Stack>
      <StatusBar style="light" />
    </AppProviders>
  );
}
