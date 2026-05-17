import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ExpoLocation from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AppImage = require('react-native').Image as React.ComponentType<{ source: { uri: string }; style: any }>;

import { useTheme } from '@/contexts/ThemeContext';
import { HeaderWave } from '@/components/HeaderWave';
import { authApi } from '@/services/api';
import { deliveryApi, setDeliveryAuthToken } from '@/services/deliveryApi';
import { useAppStore } from '@/store';
import { UserAddress } from '@/types';

export default function ProfileScreen() {
  const theme = useTheme();
  const primary = theme.colors.primary;
  const authSession = useAppStore((s) => s.authSession);
  const appConsumerConfig = useAppStore((s) => s.appConsumerConfig);
  const setAuthSession = useAppStore((s) => s.setAuthSession);
  const clearCart = useAppStore((s) => s.clearCart);

  const user = authSession?.user;
  const establishmentId = appConsumerConfig?.establishmentId ?? '';

  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  // Modal novo endereço
  const [addressModal, setAddressModal] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [newAddr, setNewAddr] = useState({
    label: '', street: '', number: '', complement: '', neighborhood: '',
    city: '', state: '', zipCode: '',
  });
  const [savingAddress, setSavingAddress] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [newAddrCoords, setNewAddrCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [fetchingCep, setFetchingCep] = useState(false);

  // Modal editar perfil
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    birthDate: '',
    avatar: user?.avatar ?? '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [pickingAvatar, setPickingAvatar] = useState(false);

  useEffect(() => {
    if (authSession?.accessToken) {
      setDeliveryAuthToken(authSession.accessToken);
    }
  }, [authSession]);

  useEffect(() => {
    if (!authSession?.accessToken) return;
    loadAddresses();
  }, [authSession?.accessToken]);

  useEffect(() => {
    if (!authSession?.accessToken) return;

    const loadDefaultAddress = async () => {
      try {
        const address = await deliveryApi.getDefaultAddress();
        console.log('[ProfileScreen] endereço padrão ao abrir a página:', address);
      } catch (error) {
        console.log('[ProfileScreen] falha ao buscar endereço padrão:', error);
      }
    };

    loadDefaultAddress();
  }, [authSession?.accessToken]);

  useEffect(() => {
    if (user) {
      setEditingProfile({
        name: user.name ?? '',
        phone: user.phone ?? '',
        birthDate: '',
        avatar: user.avatar ?? '',
      });
    }
  }, [user]);

  const loadAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const data = await deliveryApi.getMyAddresses();
      setAddresses(data);
    } catch {
      // sem endereços
    } finally {
      setLoadingAddresses(false);
    }
  };

  const resetAddressForm = () => {
    setEditingAddressId(null);
    setNewAddr({ label: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zipCode: '' });
    setNewAddrCoords(null);
    setFetchingCep(false);
  };

  const handleCepChange = async (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5, 8)}` : digits;
    setNewAddr((p) => ({ ...p, zipCode: formatted }));
    if (digits.length === 8) {
      setFetchingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setNewAddr((p) => ({
            ...p,
            zipCode: formatted,
            street: data.logradouro || p.street,
            neighborhood: data.bairro || p.neighborhood,
            city: data.localidade || p.city,
            state: data.uf || p.state,
          }));
        }
      } catch { /* manual */ } finally { setFetchingCep(false); }
    }
  };

  const handleGetLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos da sua localização.');
        return;
      }
      const pos = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
      setNewAddrCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    } catch {
      Alert.alert('Erro', 'Não foi possível obter sua localização.');
    } finally { setGettingLocation(false); }
  };

  const handleSaveAddress = async () => {
    const { street, number, neighborhood, city, state, zipCode } = newAddr;
    if (!street || !number || !neighborhood || !city || !state || !zipCode) {
      Alert.alert('Atenção', 'Preencha os campos obrigatórios.');
      return;
    }
    setSavingAddress(true);
    try {
      const payload = {
        businessConsumerId: authSession?.user?.id,
        label: newAddr.label || 'Casa',
        street: newAddr.street,
        number: newAddr.number,
        complement: newAddr.complement || undefined,
        neighborhood: newAddr.neighborhood,
        city: newAddr.city,
        state: newAddr.state,
        zipCode: newAddr.zipCode.replace(/\D/g, ''),
        latitude: newAddrCoords?.latitude,
        longitude: newAddrCoords?.longitude,
        isDefault: addresses.length === 0,
      };
      if (editingAddressId) {
        const updated = await deliveryApi.updateAddress(editingAddressId, payload);
        setAddresses((prev) => prev.map((a) => (a.id === editingAddressId ? updated : a)));
      } else {
        const saved = await deliveryApi.createAddress(payload);
        setAddresses((prev) => [...prev, saved]);
      }
      setAddressModal(false);
      resetAddressForm();
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) { Alert.alert('Sessão expirada', 'Faça login novamente.'); return; }
      Alert.alert('Erro', err?.response?.data?.message ?? err?.message ?? 'Não foi possível salvar o endereço.');
    } finally { setSavingAddress(false); }
  };

  const handleDeleteAddress = (addressId: string) => {
    Alert.alert('Remover endereço', 'Tem certeza que deseja remover este endereço?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive', onPress: async () => {
          try {
            await deliveryApi.deleteAddress(addressId);
            setAddresses((prev) => prev.filter((a) => a.id !== addressId));
          } catch {
            Alert.alert('Erro', 'Não foi possível remover o endereço.');
          }
        },
      },
    ]);
  };

  const handleEditAddress = (address: UserAddress) => {
    setEditingAddressId(address.id);
    setNewAddr({
      label: address.label ?? '',
      street: address.street ?? '',
      number: address.number ?? '',
      complement: address.complement ?? '',
      neighborhood: address.neighborhood ?? '',
      city: address.city ?? '',
      state: address.state ?? '',
      zipCode: address.zipCode ?? '',
    });
    setNewAddrCoords(
      address.latitude !== undefined && address.longitude !== undefined
        ? { latitude: address.latitude, longitude: address.longitude }
        : null,
    );
    setAddressModal(true);
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      await deliveryApi.setDefaultAddress(addressId);
      setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === addressId })));
    } catch {
      Alert.alert('Erro', 'Não foi possível definir o endereço padrão.');
    }
  };

  const handleBirthDateChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let masked = digits;
    if (digits.length > 4) masked = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) masked = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    setEditingProfile((p) => ({ ...p, birthDate: masked }));
  };

  const handlePickAvatar = async () => {
    setPickingAvatar(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos de acesso à galeria.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets[0].base64) {
        const mime = result.assets[0].mimeType ?? 'image/jpeg';
        const base64Uri = `data:${mime};base64,${result.assets[0].base64}`;
        setEditingProfile((p) => ({ ...p, avatar: base64Uri }));
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    } finally {
      setPickingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editingProfile.name.trim()) {
      Alert.alert('Atenção', 'O nome não pode ficar em branco.');
      return;
    }
    if (!authSession?.accessToken) return;
    setSavingProfile(true);
    try {
      const updates: { name?: string; phone?: string; birthDate?: string; avatar?: string } = {};
      if (editingProfile.name.trim()) updates.name = editingProfile.name.trim();
      if (editingProfile.phone.trim()) updates.phone = editingProfile.phone.replace(/\D/g, '');
      if (editingProfile.birthDate.trim()) {
        const parts = editingProfile.birthDate.split('/');
        if (parts.length === 3) {
          updates.birthDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
      if (editingProfile.avatar) updates.avatar = editingProfile.avatar;

      const updated = await authApi.updateProfile(authSession.accessToken, updates);

      setAuthSession({
        ...authSession,
        user: {
          ...authSession.user,
          name: updated?.name ?? editingProfile.name,
          phone: updated?.phone ?? editingProfile.phone,
          avatar: updated?.avatar ?? editingProfile.avatar ?? authSession.user.avatar,
        },
      });
      setEditProfileModal(false);
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Não foi possível atualizar o perfil.';
      Alert.alert('Erro', msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sair da conta', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair', style: 'destructive', onPress: () => {
          setAuthSession(null);
          clearCart();
          router.replace('/login');
        },
      },
    ]);
  };

  const initials = user?.name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={primary} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: primary }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Meu perfil</Text>
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#fff" />
        </Pressable>
      </View>
      <HeaderWave color={primary} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Card do usuário */}
        <View style={[styles.userCard, { backgroundColor: primary }]}>
          <Pressable style={styles.avatarWrap} onPress={() => setEditProfileModal(true)}>
            {user?.avatar ? (
              <AppImage source={{ uri: user.avatar }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={11} color="#fff" />
            </View>
          </Pressable>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name ?? '—'}</Text>
            <Text style={styles.userEmail}>{user?.email ?? '—'}</Text>
            {user?.phone ? <Text style={styles.userPhone}>{user.phone}</Text> : null}
          </View>
          <Pressable style={styles.editProfileBtn} onPress={() => setEditProfileModal(true)}>
            <Ionicons name="pencil-outline" size={18} color="#fff" />
          </Pressable>
        </View>

        {/* Dados pessoais */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="person-outline" size={18} color={primary} />
              <Text style={styles.sectionTitle}>Dados pessoais</Text>
            </View>
            <Pressable onPress={() => setEditProfileModal(true)}>
              <Text style={[styles.editLink, { color: primary }]}>Editar</Text>
            </Pressable>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nome</Text>
            <Text style={styles.infoValue}>{user?.name ?? '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>E-mail</Text>
            <Text style={styles.infoValue}>{user?.email ?? '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Telefone</Text>
            <Text style={styles.infoValue}>{user?.phone ?? 'Não informado'}</Text>
          </View>
          {user?.cpf ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>CPF</Text>
              <Text style={styles.infoValue}>{user.cpf}</Text>
            </View>
          ) : null}
        </View>

        {/* Endereços */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="location-outline" size={18} color={primary} />
              <Text style={styles.sectionTitle}>Meus endereços</Text>
            </View>
            <Pressable style={[styles.addBtn, { backgroundColor: primary }]} onPress={() => { resetAddressForm(); setAddressModal(true); }}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addBtnText}>Novo</Text>
            </Pressable>
          </View>

          {loadingAddresses ? (
            <ActivityIndicator size="small" color={primary} style={{ marginVertical: 20 }} />
          ) : addresses.length === 0 ? (
            <Pressable style={[styles.emptyAddress, { borderColor: `${primary}40` }]} onPress={() => { resetAddressForm(); setAddressModal(true); }}>
              <Ionicons name="add-circle-outline" size={28} color={primary} />
              <Text style={[styles.emptyAddressText, { color: primary }]}>Adicionar endereço de entrega</Text>
            </Pressable>
          ) : (
            addresses.map((addr) => (
              <View key={addr.id} style={styles.addressCard}>
                <View style={[styles.addressIconWrap, { backgroundColor: `${primary}12` }]}>
                  <Ionicons name="location" size={18} color={primary} />
                </View>
                <View style={styles.addressInfo}>
                  {addr.label ? <Text style={styles.addressLabel}>{addr.label}</Text> : null}
                  <Text style={styles.addressMain}>{addr.street}, {addr.number}</Text>
                  <Text style={styles.addressSub}>{addr.neighborhood} — {addr.city}/{addr.state}</Text>
                  <Text style={styles.addressSub}>{addr.zipCode}</Text>
                  {addr.complement ? <Text style={styles.addressSub}>{addr.complement}</Text> : null}
                </View>
                <View style={styles.addressActions}>
                  <Pressable onPress={() => handleEditAddress(addr)} style={styles.addressActionBtn}>
                    <Ionicons name="pencil-outline" size={16} color="#6B7280" />
                  </Pressable>
                  {!addr.isDefault && (
                    <Pressable onPress={() => handleSetDefault(addr.id)} style={styles.addressActionBtn}>
                      <Ionicons name="star-outline" size={16} color={primary} />
                    </Pressable>
                  )}
                  {addr.isDefault && (
                    <View style={[styles.defaultBadge, { backgroundColor: `${primary}15` }]}>
                      <Text style={[styles.defaultBadgeText, { color: primary }]}>Padrão</Text>
                    </View>
                  )}
                  <Pressable onPress={() => handleDeleteAddress(addr.id)} style={styles.addressActionBtn}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal editar perfil */}
      <Modal visible={editProfileModal} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar perfil</Text>
              <Pressable onPress={() => setEditProfileModal(false)}>
                <Ionicons name="close" size={22} color="#374151" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              {/* Avatar picker */}
              <View style={styles.avatarPickerWrap}>
                <Pressable style={styles.avatarPickerBtn} onPress={handlePickAvatar} disabled={pickingAvatar}>
                  {editingProfile.avatar ? (
                    <AppImage source={{ uri: editingProfile.avatar }} style={styles.avatarPickerImage} />
                  ) : (
                    <View style={[styles.avatarPickerPlaceholder, { backgroundColor: `${primary}20` }]}>
                      <Text style={[styles.avatarPickerInitials, { color: primary }]}>{initials}</Text>
                    </View>
                  )}
                  <View style={[styles.avatarPickerOverlay, { backgroundColor: `${primary}CC` }]}>
                    {pickingAvatar
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Ionicons name="camera" size={20} color="#fff" />}
                  </View>
                </Pressable>
                <Text style={styles.avatarPickerHint}>Toque para alterar a foto</Text>
              </View>

              <Field
                label="Nome completo *"
                value={editingProfile.name}
                onChangeText={(v) => setEditingProfile((p) => ({ ...p, name: v }))}
                placeholder="Seu nome"
              />
              <Field
                label="Telefone"
                value={editingProfile.phone}
                onChangeText={(v) => setEditingProfile((p) => ({ ...p, phone: v }))}
                placeholder="(81) 99999-9999"
                keyboardType="numeric"
              />
              <Field
                label="Data de nascimento"
                value={editingProfile.birthDate}
                onChangeText={handleBirthDateChange}
                placeholder="DD/MM/AAAA"
                keyboardType="numeric"
              />
            </ScrollView>

            <Pressable
              style={[styles.modalSaveBtn, { backgroundColor: primary }, savingProfile && { opacity: 0.7 }]}
              onPress={handleSaveProfile}
              disabled={savingProfile}>
              {savingProfile
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.modalSaveBtnText}>Salvar alterações</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal novo endereço */}
      <Modal visible={addressModal} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingAddressId ? 'Editar endereço' : 'Novo endereço'}</Text>
              <Pressable onPress={() => { setAddressModal(false); resetAddressForm(); }}>
                <Ionicons name="close" size={22} color="#374151" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              {/* GPS */}
              <Pressable
                style={[styles.locationBtn, newAddrCoords && styles.locationBtnActive]}
                onPress={handleGetLocation}
                disabled={gettingLocation}>
                {gettingLocation
                  ? <ActivityIndicator size="small" color="#6B7280" />
                  : <Ionicons name={newAddrCoords ? 'checkmark-circle' : 'locate-outline'} size={18} color={newAddrCoords ? '#10B981' : '#6B7280'} />
                }
                <Text style={[styles.locationBtnText, newAddrCoords && { color: '#10B981' }]}>
                  {gettingLocation ? 'Obtendo localização...' : newAddrCoords
                    ? `GPS capturado (${newAddrCoords.latitude.toFixed(4)}, ${newAddrCoords.longitude.toFixed(4)})`
                    : 'Usar minha localização atual'}
                </Text>
              </Pressable>

              <View style={styles.modalDivider} />

              {/* CEP */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>CEP *</Text>
                <View style={styles.cepRow}>
                  <TextInput style={[styles.fieldInput, { flex: 1 }]} value={newAddr.zipCode} onChangeText={handleCepChange} placeholder="00000-000" placeholderTextColor="#9CA3AF" keyboardType="numeric" maxLength={9} />
                  {fetchingCep && <ActivityIndicator size="small" color="#6B7280" style={{ marginLeft: 8 }} />}
                </View>
                <Text style={styles.cepHint}>Preenchimento automático ao digitar o CEP</Text>
              </View>

              <Field label="Endereço completo *" value={newAddr.street} onChangeText={(v) => setNewAddr((p) => ({ ...p, street: v }))} placeholder="Ex: Rua das Flores" />
              <View style={styles.fieldRow}>
                <View style={{ flex: 2 }}>
                  <Field label="Número *" value={newAddr.number} onChangeText={(v) => setNewAddr((p) => ({ ...p, number: v }))} placeholder="123" />
                </View>
                <View style={{ flex: 3 }}>
                  <Field label="Complemento" value={newAddr.complement} onChangeText={(v) => setNewAddr((p) => ({ ...p, complement: v }))} placeholder="Apto, bloco..." />
                </View>
              </View>
              <Field label="Bairro *" value={newAddr.neighborhood} onChangeText={(v) => setNewAddr((p) => ({ ...p, neighborhood: v }))} placeholder="Ex: Centro" />
              <View style={styles.fieldRow}>
                <View style={{ flex: 2 }}>
                  <Field label="Cidade *" value={newAddr.city} onChangeText={(v) => setNewAddr((p) => ({ ...p, city: v }))} placeholder="Ex: Recife" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Estado *" value={newAddr.state} onChangeText={(v) => setNewAddr((p) => ({ ...p, state: v.toUpperCase().slice(0, 2) }))} placeholder="PE" autoCapitalize="characters" />
                </View>
              </View>
              <Field label="Identificação" value={newAddr.label} onChangeText={(v) => setNewAddr((p) => ({ ...p, label: v }))} placeholder="Ex: Casa, Trabalho..." />
            </ScrollView>

            <Pressable
              style={[styles.modalSaveBtn, { backgroundColor: primary }, savingAddress && { opacity: 0.7 }]}
              onPress={handleSaveAddress}
              disabled={savingAddress}>
              {savingAddress ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveBtnText}>{editingAddressId ? 'Salvar alterações' : 'Salvar endereço'}</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: 'default' | 'numeric';
  autoCapitalize?: 'none' | 'characters' | 'words' | 'sentences';
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'words'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },

  header: {
    paddingTop: 64, paddingBottom: 26, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '900', color: '#fff' },
  logoutBtn: { padding: 4 },

  scroll: { flex: 1 },
  scrollContent: { gap: 16, paddingBottom: 40 },

  // Card usuário
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    padding: 20, paddingTop: 16,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImage: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  avatarInitials: { fontSize: 22, fontWeight: '900', color: '#fff' },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },
  userInfo: { flex: 1, gap: 3 },
  userName: { fontSize: 18, fontWeight: '900', color: '#fff' },
  userEmail: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  userPhone: { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },

  // Avatar picker no modal
  avatarPickerWrap: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  avatarPickerBtn: { width: 88, height: 88, borderRadius: 44, overflow: 'hidden', position: 'relative' },
  avatarPickerImage: { width: 88, height: 88, borderRadius: 44 },
  avatarPickerPlaceholder: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  avatarPickerInitials: { fontSize: 30, fontWeight: '900' },
  avatarPickerOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarPickerHint: { fontSize: 12, color: '#6B7280', fontWeight: '600' },

  // Seção endereços
  section: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 20, padding: 16, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#071B5A' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  emptyAddress: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14,
    padding: 16, justifyContent: 'center',
  },
  emptyAddressText: { fontSize: 14, fontWeight: '700' },

  addressCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#F9FAFB', borderRadius: 14, padding: 12,
  },
  addressIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  addressInfo: { flex: 1, gap: 2 },
  addressLabel: { fontSize: 11, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  addressMain: { fontSize: 14, fontWeight: '700', color: '#111827' },
  addressSub: { fontSize: 12, color: '#6B7280' },
  addressActions: { alignItems: 'flex-end', gap: 6 },
  addressActionBtn: { padding: 4 },
  defaultBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  defaultBadgeText: { fontSize: 11, fontWeight: '800' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 20, paddingHorizontal: 20, paddingBottom: 32, maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '900', color: '#071B5A' },
  modalContent: { gap: 12, paddingBottom: 8 },
  modalDivider: { height: 1, backgroundColor: '#F3F4F6' },
  modalSaveBtn: { borderRadius: 16, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  modalSaveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  fieldRow: { flexDirection: 'row', gap: 10 },
  fieldWrap: { gap: 5 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#374151' },
  fieldInput: {
    backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#111827',
  },
  cepRow: { flexDirection: 'row', alignItems: 'center' },
  cepHint: { fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginTop: 3 },
  locationBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 13, backgroundColor: '#F9FAFB',
  },
  locationBtnActive: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
  locationBtnText: { fontSize: 13, fontWeight: '700', color: '#6B7280', flex: 1 },

  editProfileBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
  },
  editLink: { fontSize: 13, fontWeight: '700' },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  infoLabel: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  infoValue: { fontSize: 13, color: '#111827', fontWeight: '700', flex: 1, textAlign: 'right' },
});
