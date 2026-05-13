import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = '@somaai:biometric-credentials';

export type SavedCredentials = {
  email: string;
  password: string;
  establishmentId: string;
  establishmentName: string;
  logo: string | null;
  appColor: string;
};

export function useBiometrics() {
  const [isSupported, setIsSupported] = useState(false);
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'face' | 'iris' | null>(null);
  const [savedCredentials, setSavedCredentials] = useState<SavedCredentials | null>(null);

  useEffect(() => {
    void checkSupport();
    void loadSavedCredentials();
  }, []);

  const checkSupport = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!compatible || !enrolled) return;

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      setBiometricType('face');
    } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      setBiometricType('iris');
    } else {
      setBiometricType('fingerprint');
    }
    setIsSupported(true);
  };

  const loadSavedCredentials = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setSavedCredentials(JSON.parse(raw) as SavedCredentials);
    } catch {
      // sem credenciais salvas
    }
  };

  const saveCredentials = useCallback(async (credentials: SavedCredentials) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
    setSavedCredentials(credentials);
  }, []);

  const clearCredentials = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setSavedCredentials(null);
  }, []);

  const authenticate = useCallback(async (): Promise<boolean> => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirme sua identidade',
      cancelLabel: 'Cancelar',
      fallbackLabel: 'Usar senha',
      disableDeviceFallback: false,
    });
    return result.success;
  }, []);

  return {
    isSupported,
    biometricType,
    savedCredentials,
    saveCredentials,
    clearCredentials,
    authenticate,
  };
}
