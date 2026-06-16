import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';

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
  const appConsumerConfig = useAppStore((s) => s.appConsumerConfig);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const permissionAskedRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (permissionAskedRef.current) return;
    permissionAskedRef.current = true;
    void requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (!authSession?.accessToken) return;

    void registerForPushNotifications(authSession.accessToken, appConsumerConfig?.establishmentId ?? undefined);

    // Escuta notificações recebidas em foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      void notification;
    });

    // Escuta quando o usuário toca na notificação
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
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
  }, [authSession?.accessToken, appConsumerConfig?.establishmentId]);
}

async function requestNotificationPermission() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Notificações desativadas',
      'Se você permitir notificações, o app poderá avisar sobre pedidos e atualizações.',
    );
  }
}

async function registerForPushNotifications(token: string, establishmentId?: string) {
  if (Platform.OS === 'web') return;

  // Verifica se o device suporta notificações
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    Alert.alert(
      'Notificações desativadas',
      'Sem permissão para notificações, você não vai receber alertas de pedido.',
    );
    return;
  }

  try {
    const pushToken = await Notifications.getExpoPushTokenAsync();
    await authApi.savePushToken(token, pushToken.data, { establishmentId });
  } catch (err) {
    const status = (err as { response?: { status?: number } } | undefined)?.response?.status;
    const message = status === 404
      ? 'O backend não encontrou a rota para salvar o push token.'
      : 'Não foi possível registrar o push token neste aparelho.';
    Alert.alert('Push não ativado', message);
  }
}
