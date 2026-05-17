import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { ActiveOrderBanner } from '@/components/ActiveOrderBanner';
import { AppProviders } from '@/contexts/AppProviders';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { DELIVERY_BASE_URL } from '@/services/deliveryApi';

function RootLayoutInner() {
  usePushNotifications();

  useEffect(() => {
    console.log('[app] delivery baseURL:', DELIVERY_BASE_URL);
    console.log('[app] delivery addresses URL:', `${DELIVERY_BASE_URL}/public/customers/me/addresses/default`);
  }, []);

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
