import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';

import { useAppStore } from '@/store';

const appLogoUrl = 'https://somaaiuploads.s3.us-east-1.amazonaws.com/logomarca/somaaisales.png';

export default function SplashScreen() {
  const tenant = useAppStore((state) => state.tenant);
  const appConsumerConfig = useAppStore((state) => state.appConsumerConfig);
  const authSession = useAppStore((state) => state.authSession);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (authSession) {
        // já logado — vai direto pra home
        router.replace('/app/home');
      } else if (tenant && appConsumerConfig) {
        // loja salva mas sem sessão — vai pro login
        router.replace('/login');
      } else {
        // nenhuma loja salva — seleção de loja
        router.replace('/store-selection');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Image source={{ uri: appConsumerConfig?.logo ?? appLogoUrl }} style={styles.logo} />
      {appConsumerConfig?.logo ? (
        <Image source={{ uri: appLogoUrl }} style={styles.secondaryLogo} />
      ) : null}
      <ActivityIndicator size="large" color={appConsumerConfig?.appColor ?? '#1677FF'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#071B5A' },
  logo: { width: 88, height: 88, borderRadius: 24, backgroundColor: '#1677FF', marginBottom: 24 },
  secondaryLogo: { width: 52, height: 52, borderRadius: 16, marginBottom: 16, opacity: 0.9 },
});
