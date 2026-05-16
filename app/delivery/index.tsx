import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { useAppStore } from '@/store';

export default function DeliveryIndexScreen() {
  const theme = useTheme();
  const primary = theme.colors.primary;
  const appConsumerConfig = useAppStore((s) => s.appConsumerConfig);
  const tenant = useAppStore((s) => s.tenant);

  const establishmentId = appConsumerConfig?.establishmentId ?? tenant?.id;
  const establishmentName = appConsumerConfig?.establishmentName ?? tenant?.nome ?? 'Delivery';

  useEffect(() => {
    if (!establishmentId) {
      router.replace('/app/home');
      return;
    }
    router.replace(
      `/delivery/products?establishmentId=${establishmentId}&establishmentName=${encodeURIComponent(establishmentName)}`,
    );
  }, [establishmentId]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F5' }}>
      <ActivityIndicator size="large" color={primary} />
    </View>
  );
}
