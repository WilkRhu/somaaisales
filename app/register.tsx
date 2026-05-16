import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
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

import { AppModal, ModalButton } from '@/components/AppModal';
import { useTheme } from '@/contexts/ThemeContext';
import { authApi } from '@/services/api';
import { useAppStore } from '@/store';

type ModalState = { visible: boolean; title: string; message?: string; icon?: keyof typeof Ionicons.glyphMap; iconColor?: string; buttons?: ModalButton[] };
const CLOSED: ModalState = { visible: false, title: '' };

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(CLOSED);

  const tenant = useAppStore((state) => state.tenant);
  const appConsumerConfig = useAppStore((state) => state.appConsumerConfig);
  const theme = useTheme();

  const primaryColor = theme.colors.primary;
  const logo = theme.branding.logo;
  const storeName = appConsumerConfig?.establishmentName ?? tenant?.nome ?? 'SomaAI Sales';

  const closeModal = () => setModal(CLOSED);
  const showModal = (s: Omit<ModalState, 'visible'>) => setModal({ visible: true, ...s });

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showModal({ title: 'Permissão necessária', message: 'Precisamos de acesso à câmera.', icon: 'camera-outline', iconColor: primaryColor });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showModal({ title: 'Permissão necessária', message: 'Precisamos de acesso à galeria.', icon: 'images-outline', iconColor: primaryColor });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

  const pickPhoto = () => {
    showModal({
      title: 'Foto de perfil',
      message: 'Escolha de onde importar a foto.',
      icon: 'camera-outline',
      iconColor: primaryColor,
      buttons: [
        { text: 'Câmera', onPress: openCamera },
        { text: 'Galeria', onPress: openGallery },
        { text: 'Cancelar', style: 'cancel' },
      ],
    });
  };

  const toBase64 = async (uri: string): Promise<string> => {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });
    const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpeg';
    return `data:${ext === 'png' ? 'image/png' : 'image/jpeg'};base64,${base64}`;
  };

  const formatCpf = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 13);
    if (d.length <= 2) return `+${d}`;
    if (d.length <= 4) return `+${d.slice(0, 2)} (${d.slice(2)}`;
    if (d.length <= 9) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4)}`;
    return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  };

  const formatDate = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 8);
    return d.replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})(\d)/, '$1/$2');
  };

  const toIsoDate = (v: string) => {
    const [d, m, y] = v.split('/');
    if (!d || !m || !y || y.length < 4) return '';
    return `${y}-${m}-${d}`;
  };

  const submit = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !cpf.trim() || !birthDate.trim() || !password.trim() || !confirm.trim()) {
      showModal({ title: 'Campos obrigatórios', message: 'Preencha todos os campos para continuar.', icon: 'information-circle-outline', iconColor: primaryColor });
      return;
    }
    if (password !== confirm) {
      showModal({ title: 'Senhas diferentes', message: 'A confirmação de senha não confere.', icon: 'alert-circle-outline', iconColor: '#F59E0B' });
      return;
    }
    if (password.length < 6) {
      showModal({ title: 'Senha fraca', message: 'A senha deve ter pelo menos 6 caracteres.', icon: 'shield-outline', iconColor: '#F59E0B' });
      return;
    }
    if (!tenant) {
      showModal({ title: 'Sem estabelecimento', message: 'Nenhum estabelecimento selecionado.', icon: 'storefront-outline', iconColor: primaryColor, buttons: [{ text: 'Selecionar loja', onPress: () => router.replace('/store-selection') }] });
      return;
    }
    const isoDate = toIsoDate(birthDate);
    if (!isoDate) {
      showModal({ title: 'Data inválida', message: 'Informe a data no formato DD/MM/AAAA.', icon: 'calendar-outline', iconColor: '#F59E0B' });
      return;
    }

    setLoading(true);
    try {
      let avatarBase64: string | null = null;
      if (photo) avatarBase64 = await toBase64(photo);

      await authApi.registerCustomer(tenant.id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.replace(/\D/g, '').replace(/^(\d{2})/, '+$1'),
        cpf: cpf.replace(/\D/g, ''),
        birthDate: isoDate,
        avatar: avatarBase64,
        password: ''
      });

      showModal({
        title: 'Conta criada',
        message: 'Sua conta foi criada com sucesso. Faça login para continuar.',
        icon: 'checkmark-circle-outline',
        iconColor: '#10B981',
        buttons: [{ text: 'Fazer login', onPress: () => router.replace('/login') }],
      });
    } catch (error) {
      showModal({
        title: 'Erro ao cadastrar',
        message: error instanceof Error ? error.message : 'Não foi possível criar a conta.',
        icon: 'alert-circle-outline',
        iconColor: '#EF4444',
      });
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
        <Text style={styles.storeTagline}>Criar nova conta</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cadastro</Text>
          <Text style={styles.cardSubtitle}>Preencha os dados para criar sua conta</Text>

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <Pressable style={styles.avatarWrap} onPress={pickPhoto}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: `${primaryColor}12` }]}>
                  <Ionicons name="person-outline" size={36} color={primaryColor} />
                </View>
              )}
              <View style={[styles.avatarBadge, { backgroundColor: primaryColor }]}>
                <Ionicons name="camera-outline" size={14} color="#fff" />
              </View>
            </Pressable>
            <Text style={styles.avatarHint}>{photo ? 'Toque para trocar a foto' : 'Adicionar foto de perfil'}</Text>
            {photo && <Pressable onPress={() => setPhoto(null)}><Text style={styles.avatarRemove}>Remover foto</Text></Pressable>}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Nome completo</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput value={name} onChangeText={setName} placeholder="Seu nome completo" placeholderTextColor="#9CA3AF" style={styles.input} />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>E-mail</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput value={email} onChangeText={setEmail} placeholder="voce@email.com" keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#9CA3AF" style={styles.input} />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Telefone</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="call-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput value={phone} onChangeText={(v) => setPhone(formatPhone(v))} placeholder="+55 (00) 00000-0000" keyboardType="phone-pad" placeholderTextColor="#9CA3AF" style={styles.input} />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>CPF</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="card-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput value={cpf} onChangeText={(v) => setCpf(formatCpf(v))} placeholder="000.000.000-00" keyboardType="numeric" placeholderTextColor="#9CA3AF" style={styles.input} />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Data de nascimento</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="calendar-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput value={birthDate} onChangeText={(v) => setBirthDate(formatDate(v))} placeholder="DD/MM/AAAA" keyboardType="numeric" placeholderTextColor="#9CA3AF" style={styles.input} />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Senha</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput value={password} onChangeText={setPassword} placeholder="Mínimo 6 caracteres" secureTextEntry={!showPassword} placeholderTextColor="#9CA3AF" style={[styles.input, { flex: 1 }]} />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" />
              </Pressable>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirmar senha</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput value={confirm} onChangeText={setConfirm} placeholder="Repita a senha" secureTextEntry={!showConfirm} placeholderTextColor="#9CA3AF" style={[styles.input, { flex: 1 }]} />
              <Pressable onPress={() => setShowConfirm((v) => !v)} style={styles.eyeButton}>
                <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.submitButton, { backgroundColor: primaryColor }, loading && styles.submitButtonDisabled]}
            onPress={submit}
            disabled={loading}>
            <Text style={styles.submitButtonText}>{loading ? 'Criando conta...' : 'Criar conta'}</Text>
          </Pressable>

          <Pressable style={styles.backLink} onPress={() => router.replace('/login')}>
            <Ionicons name="arrow-back-outline" size={15} color="#6B7280" />
            <Text style={styles.backLinkText}>Já tenho uma conta</Text>
          </Pressable>
        </View>
      </ScrollView>

      <AppModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        icon={modal.icon}
        iconColor={modal.iconColor ?? primaryColor}
        buttons={modal.buttons}
        onClose={closeModal}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  topSection: { paddingTop: 52, paddingBottom: 40, alignItems: 'center', gap: 10 },
  backButton: { position: 'absolute', top: 52, left: 20, padding: 4 },
  storeLogo: { width: 72, height: 72, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  logoFallback: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  storeName: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.3 },
  storeTagline: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  card: {
    backgroundColor: '#fff', marginHorizontal: 20, marginTop: 16, borderRadius: 24, padding: 24, gap: 16,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#071B5A' },
  cardSubtitle: { fontSize: 13, color: '#6B7280', marginTop: -8 },
  avatarSection: { alignItems: 'center', gap: 8, paddingVertical: 4 },
  avatarWrap: { position: 'relative', width: 96, height: 96 },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed',
  },
  avatarBadge: {
    position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff',
  },
  avatarHint: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  avatarRemove: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: '700', color: '#071B5A' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB', borderRadius: 14, paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#111827' },
  eyeButton: { padding: 4 },
  submitButton: {
    borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4,
    shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  backLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  backLinkText: { color: '#6B7280', fontWeight: '600', fontSize: 13 },
});
