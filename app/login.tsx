import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Image,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { AppModal, ModalButton } from '@/components/AppModal';
import { useTheme } from '@/contexts/ThemeContext';
import { useBiometrics } from '@/hooks/useBiometrics';
import { authApi } from '@/services/api';
import { useAppStore } from '@/store';

type ModalState = {
  visible: boolean;
  title: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  buttons?: ModalButton[];
};

const MODAL_CLOSED: ModalState = { visible: false, title: '' };

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [modal, setModal] = useState<ModalState>(MODAL_CLOSED);

  const setAuthSession = useAppStore((state) => state.setAuthSession);
  const tenant = useAppStore((state) => state.tenant);
  const appConsumerConfig = useAppStore((state) => state.appConsumerConfig);
  const theme = useTheme();

  const { isSupported, biometricType, savedCredentials, saveCredentials, authenticate } = useBiometrics();

  const primaryColor = theme.colors.primary;
  const logo = theme.branding.logo;
  const storeName = appConsumerConfig?.establishmentName ?? tenant?.nome ?? 'SomaAI Sales';

  const closeModal = () => setModal(MODAL_CLOSED);

  const showModal = (state: Omit<ModalState, 'visible'>) =>
    setModal({ visible: true, ...state });

  useEffect(() => {
    if (isSupported && savedCredentials) void tryBiometricLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported, savedCredentials]);

  const tryBiometricLogin = async () => {
    const ok = await authenticate();
    if (!ok) return;
    await doLogin(savedCredentials!.email, savedCredentials!.password, false);
  };

  const doLogin = async (loginEmail: string, loginPassword: string, shouldSave: boolean) => {
    if (!tenant) {
      showModal({
        title: 'Selecione a loja',
        message: 'Primeiro precisamos carregar o estabelecimento.',
        icon: 'storefront-outline',
        iconColor: primaryColor,
        buttons: [{ text: 'Selecionar loja', onPress: () => router.replace('/store-selection') }],
      });
      return;
    }

    setLoading(true);
    try {
      const session = await authApi.login(loginEmail, loginPassword, tenant.id);
      setAuthSession(session);

      if (shouldSave && isSupported) {
        showModal({
          title: 'Acesso rápido',
          message: `Deseja usar ${biometricLabel(biometricType)} para entrar da próxima vez?`,
          icon: biometricType === 'face' ? 'scan-outline' : 'finger-print-outline',
          iconColor: primaryColor,
          buttons: [
            {
              text: 'Não',
              style: 'cancel',
              onPress: () => router.replace('/app/home'),
            },
            {
              text: 'Sim, salvar',
              onPress: async () => {
                await saveCredentials({
                  email: loginEmail,
                  password: loginPassword,
                  establishmentId: tenant.id,
                  establishmentName: appConsumerConfig?.establishmentName ?? tenant.nome,
                  logo: appConsumerConfig?.logo ?? tenant.logo ?? null,
                  appColor: appConsumerConfig?.appColor ?? tenant.corPrimaria ?? primaryColor,
                });
                router.replace('/app/home');
              },
            },
          ],
        });
      } else {
        router.replace('/app/home');
      }
    } catch (error) {
      showModal({
        title: 'Erro ao entrar',
        message: error instanceof Error ? error.message : 'Não foi possível entrar no momento.',
        icon: 'alert-circle-outline',
        iconColor: '#EF4444',
        buttons: [{ text: 'Tentar novamente', onPress: closeModal }],
      });
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      showModal({
        title: 'Campos obrigatórios',
        message: 'Informe seu e-mail e senha para continuar.',
        icon: 'information-circle-outline',
        iconColor: primaryColor,
      });
      return;
    }
    await doLogin(email, password, true);
  };

  const biometricLabel = (type: typeof biometricType) => {
    if (type === 'face') return 'Face ID';
    if (type === 'iris') return 'leitura de íris';
    return 'digital';
  };

  const biometricIcon = (type: typeof biometricType): keyof typeof Ionicons.glyphMap =>
    type === 'face' ? 'scan-outline' : 'finger-print-outline';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={primaryColor} />

      <View style={[styles.topSection, { backgroundColor: primaryColor }]}>
        {logo ? (
          <Image source={{ uri: logo }} style={styles.storeLogo} />
        ) : (
          <View style={[styles.logoFallback, { backgroundColor: `${primaryColor}40` }]}>
            <Ionicons name="storefront-outline" size={36} color="#fff" />
          </View>
        )}
        <Text style={styles.storeName}>{storeName}</Text>
        <Text style={styles.storeTagline}>Área operacional da loja</Text>
      </View>

      <View style={styles.card}>
        {isSupported && savedCredentials && (
          <Pressable
            style={[styles.biometricBanner, { borderColor: `${primaryColor}30`, backgroundColor: `${primaryColor}08` }]}
            onPress={tryBiometricLogin}>
            <View style={[styles.biometricIconWrap, { backgroundColor: `${primaryColor}15` }]}>
              <Ionicons name={biometricIcon(biometricType)} size={28} color={primaryColor} />
            </View>
            <View style={styles.biometricText}>
              <Text style={[styles.biometricTitle, { color: primaryColor }]}>
                Entrar com {biometricLabel(biometricType)}
              </Text>
              <Text style={styles.biometricSub} numberOfLines={1}>
                {savedCredentials.establishmentName} · {savedCredentials.email}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={primaryColor} />
          </Pressable>
        )}

        <Text style={styles.cardTitle}>Entrar na conta</Text>
        <Text style={styles.cardSubtitle}>Use suas credenciais de acesso</Text>

        <View style={styles.field}>
          <Text style={styles.label}>E-mail</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="voce@loja.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Senha</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              placeholderTextColor="#9CA3AF"
              style={[styles.input, { flex: 1 }]}
            />
            <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" />
            </Pressable>
          </View>
        </View>

        <Pressable style={styles.forgotLink} onPress={() => router.push('/forgot-password')}>
          <Text style={[styles.forgotLinkText, { color: primaryColor }]}>Esqueci minha senha</Text>
        </Pressable>

        <Pressable
          style={[styles.submitButton, { backgroundColor: primaryColor }, loading && styles.submitButtonDisabled]}
          onPress={submit}
          disabled={loading}>
          {loading
            ? <Ionicons name="sync-outline" size={20} color="#fff" />
            : <Text style={styles.submitButtonText}>Entrar</Text>}
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable style={[styles.registerButton, { borderColor: primaryColor }]} onPress={() => router.push('/register')}>
          <Text style={[styles.registerButtonText, { color: primaryColor }]}>Criar nova conta</Text>
        </Pressable>

        <Pressable style={styles.backLink} onPress={() => router.replace('/store-selection')}>
          <Ionicons name="arrow-back-outline" size={15} color="#6B7280" />
          <Text style={styles.backLinkText}>Trocar de loja</Text>
        </Pressable>
      </View>

      <AppModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        icon={modal.icon}
        iconColor={modal.iconColor ?? primaryColor}
        buttons={modal.buttons}
        onClose={closeModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  topSection: { paddingTop: 64, paddingBottom: 40, alignItems: 'center', gap: 10 },
  storeLogo: { width: 80, height: 80, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)' },
  logoFallback: { width: 80, height: 80, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  storeName: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.3 },
  storeTagline: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  card: {
    backgroundColor: '#fff', marginHorizontal: 20, marginTop: -24, borderRadius: 24, padding: 24, gap: 16,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  biometricBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 14 },
  biometricIconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  biometricText: { flex: 1, gap: 3 },
  biometricTitle: { fontSize: 14, fontWeight: '800' },
  biometricSub: { fontSize: 12, color: '#6B7280' },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#071B5A' },
  cardSubtitle: { fontSize: 13, color: '#6B7280', marginTop: -8 },
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: '700', color: '#071B5A' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB', borderRadius: 14, paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#111827' },
  eyeButton: { padding: 4 },
  forgotLink: { alignItems: 'flex-end', marginTop: -4 },
  forgotLinkText: { fontSize: 13, fontWeight: '600' },
  submitButton: {
    borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4,
    shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  registerButton: { borderRadius: 14, paddingVertical: 13, alignItems: 'center', borderWidth: 1.5 },
  registerButtonText: { fontWeight: '800', fontSize: 15 },
  backLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  backLinkText: { color: '#6B7280', fontWeight: '600', fontSize: 13 },
});
