import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { ResizeMode, Video } from 'expo-av';

import { useAppStore } from '@/store';

const appLogoUrl = 'https://somaaiuploads.s3.us-east-1.amazonaws.com/logomarca/somaaisales.png';

export default function SplashScreen() {
  const tenant = useAppStore((state) => state.tenant);
  const appConsumerConfig = useAppStore((state) => state.appConsumerConfig);
  const authSession = useAppStore((state) => state.authSession);
  const videoRef = useRef<any>(null);
  const hasVideo = Boolean(appConsumerConfig?.screenVideo);

  useEffect(() => {
    if (hasVideo) return;

    const timer = setTimeout(() => {
      if (authSession) {
        router.replace('/app/home');
      } else if (tenant && appConsumerConfig) {
        router.replace('/login');
      } else {
        router.replace('/store-selection');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [authSession, tenant, appConsumerConfig, hasVideo]);

  useEffect(() => {
    if (!hasVideo) return;
    void videoRef.current?.playAsync?.();
  }, [hasVideo]);

  return (
    <View style={styles.container}>
      {hasVideo ? (
        <Video
          ref={videoRef}
          source={{ uri: appConsumerConfig?.screenVideo ?? '' }}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping={false}
          useNativeControls={false}
          onPlaybackStatusUpdate={(status) => {
            if (!status.isLoaded) return;
            if (status.didJustFinish) {
              if (authSession) {
                router.replace('/app/home');
              } else if (tenant && appConsumerConfig) {
                router.replace('/login');
              } else {
                router.replace('/store-selection');
              }
            }
          }}
        />
      ) : (
        <Image source={{ uri: appConsumerConfig?.logo ?? appLogoUrl }} style={styles.logo} />
      )}
      {!hasVideo && appConsumerConfig?.logo ? (
        <Image source={{ uri: appLogoUrl }} style={styles.secondaryLogo} />
      ) : null}
      {!hasVideo ? (
        <ActivityIndicator size="large" color={appConsumerConfig?.appColor ?? '#1677FF'} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#071B5A' },
  video: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  logo: { width: 88, height: 88, borderRadius: 24, backgroundColor: '#1677FF', marginBottom: 24 },
  secondaryLogo: { width: 52, height: 52, borderRadius: 16, marginBottom: 16, opacity: 0.9 },
});
