import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';

import { authApi } from '@/services/api';
import { useAppStore } from '@/store';

// Comportamento das notificações em foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const authSession = useAppStore((s) => s.authSession);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!authSession?.accessToken) return;

    void registerForPushNotifications(authSession.accessToken);

    // Escuta notificações recebidas em foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Push] Notificação recebida:', notification);
    });

    // Escuta quando o usuário toca na notificação
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[Push] Notificação tocada:', response);
      const data = response.notification.request.content.data as Record<string, any> | undefined;
      const orderId = data?.orderId as string | undefined;
      const route = data?.route as string | undefined;
      const url = data?.url as string | undefined;

      if (route) {
        router.push(route as never);
        return;
      }

      if (orderId) {
        router.push(`/delivery/tracking?orderId=${orderId}`);
        return;
      }

      if (url) {
        router.push(url as never);
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [authSession?.accessToken]);
}

async function registerForPushNotifications(token: string) {
  if (Platform.OS === 'web') return;

  // Verifica se o device suporta notificações
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] Permissão negada');
    return;
  }

  try {
    const pushToken = await Notifications.getExpoPushTokenAsync();
    await authApi.savePushToken(token, pushToken.data);
    console.log('[Push] Token registrado:', pushToken.data);
  } catch (err) {
    console.warn('[Push] Erro ao registrar token:', err);
  }
}
