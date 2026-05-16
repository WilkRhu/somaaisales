import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    Image,
    KeyboardAvoidingView,
    Pressable,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { AppModal } from '@/components/AppModal';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppStore } from '@/store';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [sent, setSent] = useState(false);

  const tenant = useAppStore((state) => state.tenant);
  const appConsumerConfig = useAppStore((state) => state.appConsumerConfig);
  const theme = useTheme();

  const primaryColor = theme.colors.primary;
  const logo = theme.branding.logo;
  const storeName = appConsumerConfig?.establishmentName ?? tenant?.nome ?? 'SomaAI Sales';

  const submit = async () => {
    if (!email.trim()) {
      setErrorModal(true);
      return;
    }

    setLoading(true);
    try {
      // TODO: integrar com API de reset de senha
      setSent(true);
    } catch {
      setErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={primaryColor} />

      <View style={[styles.topSection, { backgroundColor: primaryColor }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        {logo ? (
          <Image source={{ uri: logo }} style={styles.storeLogo} />
        ) : (
          <View style={[styles.logoFallback, { backgroundColor: `${primaryColor}40` }]}>
            <Ionicons name="storefront-outline" size={36} color="#fff" />
          </View>
        )}
        <Text style={styles.storeName}>{storeName}</Text>
        <Text style={styles.storeTagline}>Recuperar acesso</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        {sent ? (
          /* Estado de sucesso */
          <View style={styles.successWrap}>
            <View style={[styles.successIcon, { backgroundColor: `${primaryColor}15` }]}>
              <Ionicons name="mail-open-outline" size={40} color={primaryColor} />
            </View>
            <Text style={styles.successTitle}>E-mail enviado</Text>
            <Text style={styles.successText}>
              Enviamos as instruções de recuperação para{' '}
              <Text style={{ fontWeight: '700', color: '#071B5A' }}>{email}</Text>.
              {'\n'}Verifique sua caixa de entrada.
            </Text>
            <Pressable
              style={[styles.submitButton, { backgroundColor: primaryColor }]}
              onPress={() => router.replace('/login')}>
              <Text style={styles.submitButtonText}>Voltar para o login</Text>
            </Pressable>
          </View>
        ) : (
          /* Formulário */
          <>
            <View style={styles.iconWrap}>
              <View style={[styles.iconCircle, { backgroundColor: `${primaryColor}15` }]}>
                <Ionicons name="key-outline" size={32} color={primaryColor} />
              </View>
            </View>

            <Text style={styles.cardTitle}>Esqueceu a senha?</Text>
            <Text style={styles.cardSubtitle}>
              Informe seu e-mail e enviaremos um link para redefinir sua senha.
            </Text>

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

            <Pressable
              style={[styles.submitButton, { backgroundColor: primaryColor }, loading && styles.submitButtonDisabled]}
              onPress={submit}
              disabled={loading}>
              <Text style={styles.submitButtonText}>{loading ? 'Enviando...' : 'Enviar link de recuperação'}</Text>
            </Pressable>

            <Pressable style={styles.backLink} onPress={() => router.replace('/login')}>
              <Ionicons name="arrow-back-outline" size={15} color="#6B7280" />
              <Text style={styles.backLinkText}>Voltar para o login</Text>
            </Pressable>
          </>
        )}
      </View>
      </ScrollView>

      <AppModal
        visible={errorModal}
        title={email.trim() ? 'Erro ao enviar' : 'Campo obrigatório'}
        message={email.trim() ? 'Não foi possível enviar o e-mail no momento. Tente novamente.' : 'Informe seu e-mail para continuar.'}
        icon={email.trim() ? 'alert-circle-outline' : 'information-circle-outline'}
        iconColor={email.trim() ? '#EF4444' : primaryColor}
        onClose={() => setErrorModal(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  topSection: {
    paddingTop: 52,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    position: 'absolute',
    top: 52,
    left: 20,
    padding: 4,
  },
  storeLogo: { width: 72, height: 72, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  logoFallback: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeName: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.3 },
  storeTagline: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: -24,
    borderRadius: 24,
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  iconWrap: { alignItems: 'center' },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#071B5A', textAlign: 'center' },
  cardSubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: '700', color: '#071B5A' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#111827' },
  submitButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  backLinkText: { color: '#6B7280', fontWeight: '600', fontSize: 13 },
  successWrap: { alignItems: 'center', gap: 16, paddingVertical: 8 },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { fontSize: 20, fontWeight: '800', color: '#071B5A' },
  successText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
});
