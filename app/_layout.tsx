import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { ActiveOrderBanner } from '@/components/ActiveOrderBanner';
import { AppProviders } from '@/contexts/AppProviders';
import { usePushNotifications } from '@/hooks/usePushNotifications';

function RootLayoutInner() {
  usePushNotifications();

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="splash" />
        <Stack.Screen name="store-selection" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="app" />
        <Stack.Screen name="delivery" />
      </Stack>
      <ActiveOrderBanner />
      <StatusBar style="light" />
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootLayoutInner />
    </AppProviders>
  );
}
