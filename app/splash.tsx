import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { useTenant } from '@/contexts/TenantContext';

export default function SplashScreen() {
  const { bootstrapTenant } = useTenant();

  useEffect(() => {
    const timer = setTimeout(async () => {
      const result = await bootstrapTenant();
      router.replace(result ? '/app/home' : '/store-selection');
    }, 1200);

    return () => clearTimeout(timer);
  }, [bootstrapTenant]);

  return (
    <View style={styles.container}>
      <View style={styles.logo} />
      <ActivityIndicator size="large" color="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  logo: { width: 88, height: 88, borderRadius: 24, backgroundColor: '#16a34a', marginBottom: 24 },
});
