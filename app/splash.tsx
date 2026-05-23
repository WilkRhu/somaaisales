import { ResizeMode, Video } from 'expo-av';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Image, StatusBar, StyleSheet, View } from 'react-native';

import { useAppStore } from '@/store';

const defaultVideoAsset = require('../assets/video/screen.mp4');
const appLogoAsset = require('../assets/images/somaaisales-logo.png');

export default function SplashScreen() {
  const tenant = useAppStore((state) => state.tenant);
  const appConsumerConfig = useAppStore((state) => state.appConsumerConfig);
  const authSession = useAppStore((state) => state.authSession);
  const videoRef = useRef<any>(null);
  const hasRemoteVideo = Boolean(appConsumerConfig?.screenVideo);
  const bgColor = '#EDECEC';

  useEffect(() => {
    void videoRef.current?.playAsync?.();
    // Fallback: se o vídeo não carregar em 7s, navega mesmo assim
    const fallback = setTimeout(() => handleVideoEnd(), 7000);
    return () => clearTimeout(fallback);
  }, []);

  const handleVideoEnd = () => {
    if (authSession) {
      router.replace('/app/home');
    } else if (tenant && appConsumerConfig) {
      router.replace('/login');
    } else {
      router.replace('/store-selection');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar hidden />
      {/* Logo grande atrás */}
      <View style={styles.bgLayer}>
        <Image source={appLogoAsset} style={styles.logo} resizeMode="contain" />
        <ActivityIndicator size="large" color="#1677FF" style={styles.loader} />
      </View>

      {/* Vídeo por cima */}
      <Video
        ref={videoRef}
        source={hasRemoteVideo ? { uri: appConsumerConfig!.screenVideo } : defaultVideoAsset}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping={false}
        useNativeControls={false}
        onPlaybackStatusUpdate={(status) => {
          if (!status.isLoaded) return;
          if (status.didJustFinish) {
            handleVideoEnd();
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgLayer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 200, height: 200, marginBottom: 16 },
  loader: { marginTop: 16 },
  video: { ...StyleSheet.absoluteFillObject },
});
