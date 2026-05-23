import { Ionicons } from '@expo/vector-icons';
import * as ExpoLocation from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
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

import { AppModal } from '@/components/AppModal';
import { HeaderWave } from '@/components/HeaderWave';
import { useCart } from '@/contexts/CartContext';
import { useTheme } from '@/contexts/ThemeContext';
import { deliveryApi, setDeliveryAuthToken } from '@/services/deliveryApi';
import { useAppStore } from '@/store';
import { DeliveryFeeResponse, UserAddress } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PaymentMethod = 'CREDIT_CARD' | 'DEBIT_CARD' | 'PIX' | 'CASH';

const parseCurrency = (value: string) => {
  const normalized = value
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrencyInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const amount = Number(digits) / 100;
  return `R$ ${amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CREDIT_CARD: 'Cartão de crédito',
  DEBIT_CARD: 'Cartão de débito',
  PIX: 'PIX',
  CASH: 'Dinheiro',
};

const PAYMENT_ICONS: Record<PaymentMethod, keyof typeof import('@expo/vector-icons').Ionicons.glyphMap> = {
  CREDIT_CARD: 'card-outline',
  DEBIT_CARD: 'card-outline',
  PIX: 'qr-code-outline',
  CASH: 'cash-outline',
};

export default function CheckoutScreen() {
  const theme = useTheme();
  const primary = theme.colors.primary;
  const insets = useSafeAreaInsets();
  const { items, totalPrice, totalItems } = useCart();
  const authSession = useAppStore((s) => s.authSession);
  const appConsumerConfig = useAppStore((s) => s.appConsumerConfig);
  const clearCart = useAppStore((s) => s.clearCart);
  const establishmentId = appConsumerConfig?.establishmentId ?? '';

  const [address, setAddress] = useState<UserAddress | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(true);
  const [feeData, setFeeData] = useState<DeliveryFeeResponse | null>(null);
  const [loadingFee, setLoadingFee] = useState(false);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [changeFor, setChangeFor] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [invalidChangeModal, setInvalidChangeModal] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  // Modal novo endereço
  const [addressModal, setAddressModal] = useState(false);
  const [addressPickerModal, setAddressPickerModal] = useState(false);
  const [newAddr, setNewAddr] = useState({
    label: '', street: '', number: '', complement: '', neighborhood: '',
    city: '', state: '', zipCode: '',
  });
  const [savingAddress, setSavingAddress] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [newAddrCoords, setNewAddrCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [fetchingCep, setFetchingCep] = useState(false);
  const [modalItem, setModalItem] = useState<typeof items[number] | null>(null);

  const deliveryFee = feeData?.deliveryFee ?? 0;
  const total = totalPrice + deliveryFee;

  useEffect(() => {
    if (authSession?.accessToken) setDeliveryAuthToken(authSession.accessToken);
  }, [authSession]);

  useEffect(() => {
    const load = async () => {
      setLoadingAddress(true);
      try {
        const addresses = await deliveryApi.getMyAddresses();
        setAddresses(addresses);
        setAddress(addresses.find((a) => a.isDefault) ?? addresses[0] ?? null);
      } catch { /* sem endereço */ } finally { setLoadingAddress(false); }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!address || !establishmentId || items.length === 0) return;
    if (!address.neighborhood || !address.zipCode) return;
    const calc = async () => {
      setLoadingFee(true);
      try {
        const fee = await deliveryApi.calculateFee(establishmentId, {
          neighborhood: address.neighborhood,
          zipCode: address.zipCode,
          latitude: address.latitude,
          longitude: address.longitude,
          subtotal: totalPrice,
        });
        setFeeData(fee);
      } catch {
        setFeeData(null);
        Alert.alert('Frete', 'Não foi possível calcular o frete. Verifique seu endereço.');
      } finally { setLoadingFee(false); }
    };
    void calc();
  }, [address, establishmentId, totalPrice]);

  const handleSubmit = async () => {
    console.log('[handleSubmit] iniciado', { address, user: authSession?.user?.id, establishmentId, items: items.length });
    if (!address) {
      console.log('[handleSubmit] bloqueado: sem endereço');
      Alert.alert('Endereço obrigatório', 'Adicione um endereço de entrega para continuar.');
      setAddressModal(true);
      return;
    }
    if (!authSession?.user || !establishmentId) {
      console.log('[handleSubmit] bloqueado: sem sessão ou establishmentId');
      Alert.alert('Atenção', 'Sessão inválida. Faça login novamente.');
      return;
    }
    if (items.length === 0) {
      console.log('[handleSubmit] bloqueado: carrinho vazio');
      Alert.alert('Carrinho vazio', 'Adicione produtos antes de finalizar.');
      return;
    }
    if (paymentMethod === 'CASH') {
      const changeForValue = parseCurrency(changeFor);
      if (!changeForValue || changeForValue < total) {
        setInvalidChangeModal(true);
        return;
      }
    }
    setSubmitting(true);
    try {
      const payload = {
        customerId: authSession.user.id,
        customerName: authSession.user.name,
        customerEmail: authSession.user.email,
        customerPhone: authSession.user.phone ?? '',
        deliveryAddress: `${address.street}${address.number ? `, ${address.number}` : ''}`,
        deliveryNeighborhood: address.neighborhood,
        deliveryCity: address.city,
        deliveryState: address.state,
        deliveryZipCode: address.zipCode,
        deliveryComplement: address.complement,
        deliveryReference: undefined,
        latitude: address.latitude,
        longitude: address.longitude,
        items: items.map((i) => ({
          itemId: i.product.id.split('__')[0],
          productName: i.product.name,
          unitPrice: i.product.price,
          quantity: i.quantity,
          discount: 0,
        })),
        paymentMethod,
        deliveryPaymentType: paymentMethod.toLowerCase(),
        changeFor: paymentMethod === 'CASH' ? String(parseCurrency(changeFor).toFixed(2)) : '',
        notes,
        discount: 0,
        addressId: address.id,
      };
      console.log('[createOrder] rota:', `POST /public/delivery/establishments/${establishmentId}/orders`);
      console.log('[createOrder] payload:', JSON.stringify(payload, null, 2));
      const order = await deliveryApi.createOrder(establishmentId, payload);
      clearCart();
      setCreatedOrderId(order.id);
      setSuccessModal(true);
    } catch (err: any) {
      console.error('[createOrder]', JSON.stringify(err?.response?.data ?? err?.message ?? err, null, 2));
      const raw = err?.response?.data?.message;
      const msg = Array.isArray(raw) ? raw.join('\n') : (raw ?? 'Não foi possível criar o pedido.');
      Alert.alert('Erro', msg);
    } finally { setSubmitting(false); }
  };

  const goToTracking = () => {
    setSuccessModal(false);
    router.replace(createdOrderId ? `/delivery/tracking?orderId=${createdOrderId}` : '/app/home');
  };

  const handleCepChange = async (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    // Formata como 00000-000
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5, 8)}` : digits;
    setNewAddr((p) => ({ ...p, zipCode: formatted }));

    if (digits.length === 8) {
      setFetchingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (data.erro) {
          Alert.alert('CEP não encontrado', 'Verifique o CEP e tente novamente.');
          return;
        }
        setNewAddr((p) => ({
          ...p,
          zipCode: formatted,
          street: data.logradouro ? `${data.logradouro}` : p.street,
          neighborhood: data.bairro || p.neighborhood,
          city: data.localidade || p.city,
          state: data.uf || p.state,
        }));
      } catch {
        Alert.alert('Erro', 'Não foi possível buscar o CEP. Preencha manualmente.');
      } finally {
        setFetchingCep(false);
      }
    }
  };

  const handleGetLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos da sua localização para calcular o frete com precisão.');
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
      Alert.alert('Atenção', 'Preencha os campos obrigatórios: rua, número, bairro, cidade, estado e CEP.');
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
        isDefault: !address,
      };
      console.log('[createAddress][CheckoutScreen] payload:', JSON.stringify(payload, null, 2));
      const saved = await deliveryApi.createAddress(payload);
      setAddresses((prev) => [...prev, saved]);
      setAddress(saved);
      setAddressModal(false);
      setNewAddrCoords(null);
      setNewAddr({ label: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zipCode: '' });
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) { Alert.alert('Sessão expirada', 'Faça login novamente.'); return; }
      const raw = err?.response?.data?.message;
      const msg = Array.isArray(raw) ? raw.join('\n') : (raw ?? err?.message ?? 'Não foi possível salvar o endereço.');
      Alert.alert('Erro', msg);
    } finally { setSavingAddress(false); }
  };

  const openAddressPicker = async () => {
    if (addresses.length === 0) {
      setLoadingAddresses(true);
      try {
        const list = await deliveryApi.getMyAddresses();
        setAddresses(list);
      } catch {
        Alert.alert('Endereços', 'Não foi possível carregar seus endereços.');
        return;
      } finally {
        setLoadingAddresses(false);
      }
    }
    setAddressPickerModal(true);
  };

  const selectExistingAddress = (addr: UserAddress) => {
    setAddress(addr);
    setAddressPickerModal(false);
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={primary} />

      <View style={[styles.header, { backgroundColor: primary }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Finalizar pedido</Text>
          <Text style={styles.headerSub}>{totalItems} {totalItems === 1 ? 'item' : 'itens'}</Text>
        </View>
      </View>
      <HeaderWave color={primary} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Endereço */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location-outline" size={18} color={primary} />
            <Text style={styles.cardTitle}>Endereço de entrega</Text>
          </View>
          {loadingAddress ? (
            <ActivityIndicator size="small" color={primary} />
          ) : address ? (
            <View>
              <View style={styles.addressBlock}>
                {address.label ? <Text style={styles.addressLabel}>{address.label}</Text> : null}
                <Text style={styles.addressMain}>{address.street}{address.number ? `, ${address.number}` : ''}</Text>
                <Text style={styles.addressSub}>{address.neighborhood} — {address.city}/{address.state}</Text>
                <Text style={styles.addressSub}>{address.zipCode}</Text>
                {address.complement ? <Text style={styles.addressSub}>{address.complement}</Text> : null}
              </View>
              <Pressable style={styles.changeAddressBtn} onPress={openAddressPicker}>
                <Ionicons name="pencil-outline" size={14} color={primary} />
                <Text style={[styles.changeAddressBtnText, { color: primary }]}>Trocar endereço</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={[styles.addAddressBtn, { borderColor: primary }]} onPress={() => setAddressModal(true)}>
              <Ionicons name="add-circle-outline" size={20} color={primary} />
              <Text style={[styles.addAddressBtnText, { color: primary }]}>Adicionar endereço de entrega</Text>
            </Pressable>
          )}
        </View>

        {/* Itens */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="bag-outline" size={18} color={primary} />
            <Text style={styles.cardTitle}>Itens do pedido</Text>
          </View>
          {items.map((item, idx) => (
            <View key={item.product.id}>
              <View style={styles.orderItem}>
                <Text style={styles.orderItemQty}>{item.quantity}x</Text>
                {getItemImage(item.product) ? (
                  <Image source={{ uri: getItemImage(item.product)! }} style={styles.orderItemImage} />
                ) : (
                  <View style={styles.orderItemImageFallback}>
                    <Ionicons name="cube-outline" size={12} color="#D1D5DB" />
                  </View>
                )}
                <Pressable style={{ flex: 1 }} onPress={() => setModalItem(item)}>
                  <Text style={[styles.orderItemName, { color: primary }]} numberOfLines={1}>
                    {item.product.name.replace(/\s*\(.*\)\s*$/, '')}
                  </Text>
                </Pressable>
                {(() => {
                  const variant = item.product.variant || item.product.name.match(/\((.+)\)\s*$/)?.[1];
                  if (!variant) return null;
                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 4 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#9CA3AF', borderWidth: 1, borderColor: '#E5E7EB' }} />
                      <Text style={{ fontSize: 10, color: '#6B7280', fontWeight: '600' }}>{variant}</Text>
                    </View>
                  );
                })()}
                <Text style={[styles.orderItemPrice, { color: primary }]}>R$ {(item.product.price * item.quantity).toFixed(2)}</Text>
              </View>
              {idx < items.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Frete */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="bicycle-outline" size={18} color={primary} />
            <Text style={styles.cardTitle}>Entrega</Text>
          </View>
          {loadingFee ? (
            <View style={styles.feeRow}>
              <ActivityIndicator size="small" color={primary} />
              <Text style={styles.feeLabel}>Calculando frete...</Text>
            </View>
          ) : feeData ? (
            <View style={styles.feeBlock}>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Taxa de entrega</Text>
                <Text style={[styles.feeValue, feeData.isFreeDelivery && { color: '#10B981' }]}>
                  {feeData.isFreeDelivery ? 'Grátis' : `R$ ${feeData.deliveryFee.toFixed(2)}`}
                </Text>
              </View>
              {feeData.estimatedTime ? (
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Tempo estimado</Text>
                  <Text style={styles.feeValue}>{feeData.estimatedTime} min</Text>
                </View>
              ) : null}
              {!feeData.isFreeDelivery && feeData.freeDeliveryMinimum && totalPrice < feeData.freeDeliveryMinimum ? (
                <View style={[styles.freeDeliveryHint, { backgroundColor: `${primary}12` }]}>
                  <Ionicons name="information-circle-outline" size={14} color={primary} />
                  <Text style={[styles.freeDeliveryHintText, { color: primary }]}>
                    Faltam R$ {(feeData.freeDeliveryMinimum - totalPrice).toFixed(2)} para frete grátis
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={styles.noAddress}>
              {address ? 'Frete não disponível para este endereço' : 'Cadastre um endereço para calcular o frete'}
            </Text>
          )}
        </View>

        {/* Pagamento */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="wallet-outline" size={18} color={primary} />
            <Text style={styles.cardTitle}>Forma de pagamento</Text>
          </View>
          <View style={styles.paymentGrid}>
            {(['PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH'] as PaymentMethod[]).map((method) => {
              const active = paymentMethod === method;
              return (
                <Pressable
                  key={method}
                  style={[styles.paymentOption, active && { borderColor: primary, backgroundColor: `${primary}10` }]}
                  onPress={() => setPaymentMethod(method)}>
                  <Ionicons name={PAYMENT_ICONS[method]} size={20} color={active ? primary : '#6B7280'} />
                  <Text style={[styles.paymentLabel, active && { color: primary }]}>{PAYMENT_LABELS[method]}</Text>
                  {active && (
                    <View style={[styles.paymentCheck, { backgroundColor: primary }]}>
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          {paymentMethod === 'CASH' && (
            <View style={styles.changeWrap}>
              <Text style={styles.changeLabel}>Troco para quanto?</Text>
              <TextInput
                style={styles.changeInput}
                value={changeFor}
                onChangeText={(text) => setChangeFor(formatCurrencyInput(text))}
                placeholder="R$ 0,00"
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
                returnKeyType="done"
              />
              <Text style={styles.changeHint}>Informe um valor maior ou igual ao total do pedido.</Text>
            </View>
          )}
        </View>

        {/* Observações */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="chatbubble-outline" size={18} color={primary} />
            <Text style={styles.cardTitle}>Observações</Text>
          </View>
          <TextInput style={styles.notesInput} value={notes} onChangeText={setNotes} placeholder="Ex: Sem cebola, campainha não funciona..." placeholderTextColor="#9CA3AF" multiline numberOfLines={3} />
        </View>

        {/* Resumo */}
        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal ({totalItems} {totalItems === 1 ? 'item' : 'itens'})</Text>
            <Text style={styles.summaryValue}>R$ {totalPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Entrega</Text>
            <Text style={[styles.summaryValue, feeData?.isFreeDelivery && { color: '#10B981' }]}>
              {loadingFee ? '...' : feeData?.isFreeDelivery ? 'Grátis' : `R$ ${deliveryFee.toFixed(2)}`}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotal}>Total</Text>
            <Text style={[styles.summaryTotalValue, { color: primary }]}>R$ {total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Botão confirmar — bloqueado sem endereço */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
        {!address && !loadingAddress ? (
          <Pressable style={[styles.confirmBtn, styles.confirmBtnDisabled]} onPress={() => setAddressModal(true)}>
            <Ionicons name="location-outline" size={18} color="#6B7280" />
            <Text style={[styles.confirmBtnText, { color: '#6B7280' }]}>Adicione um endereço para continuar</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.confirmBtn, { backgroundColor: primary }, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : (
              <>
                <Text style={styles.confirmBtnText}>Confirmar pedido</Text>
                <Text style={styles.confirmBtnPrice}>R$ {total.toFixed(2)}</Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      {/* Modal detalhe do item */}
      <Modal visible={!!modalItem} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setModalItem(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalItem(null)}>
          <Pressable style={[styles.modalSheet, { maxHeight: '60%' }]} onPress={() => {}}>
            {modalItem && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Detalhes do item</Text>
                  <Pressable onPress={() => setModalItem(null)}>
                    <Ionicons name="close" size={22} color="#374151" />
                  </Pressable>
                </View>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, alignItems: 'center', gap: 14 }}>
                  {getItemImage(modalItem.product) ? (
                    <Image source={{ uri: getItemImage(modalItem.product)! }} style={{ width: 140, height: 140, borderRadius: 18 }} resizeMode="contain" />
                  ) : null}
                  <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827', textAlign: 'center' }}>
                    {modalItem.product.name.replace(/\s*\(.*\)\s*$/, '')}
                  </Text>
                  {(() => {
                    const variant = modalItem.product.variant || modalItem.product.name.match(/\((.+)\)\s*$/)?.[1];
                    if (!variant) return null;
                    const parts = variant.split('•').map((s: string) => s.trim());
                    return (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {parts[0] && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#9CA3AF', borderWidth: 1, borderColor: '#E5E7EB' }} />
                            <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600' }}>{parts[0]}</Text>
                          </View>
                        )}
                        {parts[1] && (
                          <View style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                            <Text style={{ fontSize: 13, color: '#374151', fontWeight: '700' }}>{parts[1]}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })()}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
                    <Text style={{ fontSize: 14, color: '#6B7280' }}>Qtd: {modalItem.quantity}</Text>
                    <Text style={{ fontSize: 14, color: '#6B7280' }}>Unitário: R$ {modalItem.product.price.toFixed(2)}</Text>
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: primary }}>
                    R$ {(modalItem.product.price * modalItem.quantity).toFixed(2)}
                  </Text>
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <AppModal
        visible={invalidChangeModal}
        title="Troco inválido"
        message={`O valor do troco deve ser igual ou maior que o total do pedido de R$ ${total.toFixed(2)}.`}
        icon="alert-circle-outline"
        iconColor="#F59E0B"
        buttons={[{ text: 'Entendi', onPress: () => setInvalidChangeModal(false) }]}
        onClose={() => setInvalidChangeModal(false)}
      />

      <AppModal
        visible={successModal}
        title="Pedido realizado!"
        message="Seu pedido foi criado com sucesso. Acompanhe o status em tempo real."
        icon="checkmark-circle-outline"
        iconColor="#10B981"
        buttons={[{ text: 'Acompanhar pedido', onPress: goToTracking }]}
        onClose={goToTracking}
      />

      {/* Modal novo endereço */}
      <Modal visible={addressModal} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo endereço</Text>
              <Pressable onPress={() => setAddressModal(false)}>
                <Ionicons name="close" size={22} color="#374151" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>

              {/* 1. GPS no topo */}
              <Pressable
                style={[styles.locationBtn, newAddrCoords && styles.locationBtnActive]}
                onPress={handleGetLocation}
                disabled={gettingLocation}>
                {gettingLocation
                  ? <ActivityIndicator size="small" color="#6B7280" />
                  : <Ionicons name={newAddrCoords ? 'checkmark-circle' : 'locate-outline'} size={18} color={newAddrCoords ? '#10B981' : '#6B7280'} />
                }
                <Text style={[styles.locationBtnText, newAddrCoords && { color: '#10B981' }]}>
                  {gettingLocation
                    ? 'Obtendo localização...'
                    : newAddrCoords
                    ? `GPS capturado (${newAddrCoords.latitude.toFixed(4)}, ${newAddrCoords.longitude.toFixed(4)})`
                    : 'Usar minha localização atual'}
                </Text>
              </Pressable>

              <View style={styles.modalDivider} />

              {/* 2. CEP com busca automática via ViaCEP */}
              <View style={styles.addrFieldWrap}>
                <Text style={styles.addrLabel}>CEP *</Text>
                <View style={styles.cepRow}>
                  <TextInput
                    style={[styles.addrInput, { flex: 1 }]}
                    value={newAddr.zipCode}
                    onChangeText={handleCepChange}
                    placeholder="00000-000"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    maxLength={9}
                  />
                  {fetchingCep && (
                    <View style={styles.cepLoader}>
                      <ActivityIndicator size="small" color="#6B7280" />
                    </View>
                  )}
                </View>
                <Text style={styles.cepHint}>Preenchimento automático ao digitar o CEP</Text>
              </View>

              {/* 3. Campos preenchidos pelo CEP (editáveis) */}
              <AddrField label="Rua *" value={newAddr.street} onChangeText={(v) => setNewAddr((p) => ({ ...p, street: v }))} placeholder="Ex: Rua das Flores" />
              <View style={styles.addrRow}>
                <View style={{ flex: 1 }}>
                  <AddrField label="Número *" value={newAddr.number} onChangeText={(v) => setNewAddr((p) => ({ ...p, number: v }))} placeholder="123" />
                </View>
                <View style={{ flex: 2 }}>
                  <AddrField label="Complemento" value={newAddr.complement} onChangeText={(v) => setNewAddr((p) => ({ ...p, complement: v }))} placeholder="Apto, bloco..." />
                </View>
              </View>
              <AddrField label="Bairro *" value={newAddr.neighborhood} onChangeText={(v) => setNewAddr((p) => ({ ...p, neighborhood: v }))} placeholder="Ex: Centro" />
              <View style={styles.addrRow}>
                <View style={{ flex: 2 }}>
                  <AddrField label="Cidade *" value={newAddr.city} onChangeText={(v) => setNewAddr((p) => ({ ...p, city: v }))} placeholder="Ex: Recife" />
                </View>
                <View style={{ flex: 1 }}>
                  <AddrField label="Estado *" value={newAddr.state} onChangeText={(v) => setNewAddr((p) => ({ ...p, state: v.toUpperCase().slice(0, 2) }))} placeholder="PE" autoCapitalize="characters" />
                </View>
              </View>
              <AddrField label="Identificação" value={newAddr.label} onChangeText={(v) => setNewAddr((p) => ({ ...p, label: v }))} placeholder="Ex: Casa, Trabalho..." />

            </ScrollView>

            <Pressable
              style={[styles.modalSaveBtn, { backgroundColor: primary }, savingAddress && { opacity: 0.7 }]}
              onPress={handleSaveAddress}
              disabled={savingAddress}>
              {savingAddress ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveBtnText}>Salvar endereço</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={addressPickerModal} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setAddressPickerModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAddressPickerModal(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Trocar endereço</Text>
              <Pressable onPress={() => setAddressPickerModal(false)}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </Pressable>
            </View>

            {loadingAddresses ? (
              <ActivityIndicator size="small" color={primary} />
            ) : addresses.length === 0 ? (
              <Text style={styles.noAddress}>Você ainda não tem endereços salvos.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                <View style={styles.addressPickerList}>
                  {addresses.map((addr) => {
                    const isActive = address?.id === addr.id;
                    return (
                      <Pressable
                        key={addr.id}
                        style={[styles.addressPickerItem, isActive && { borderColor: primary, backgroundColor: `${primary}08` }]}
                        onPress={() => selectExistingAddress(addr)}>
                        <View style={styles.addressPickerText}>
                          {addr.label ? <Text style={styles.addressLabel}>{addr.label}</Text> : null}
                          <Text style={styles.addressMain}>{addr.street}{addr.number ? `, ${addr.number}` : ''}</Text>
                          <Text style={styles.addressSub}>{addr.neighborhood} — {addr.city}/{addr.state}</Text>
                          <Text style={styles.addressSub}>{addr.zipCode}</Text>
                        </View>
                        <Ionicons name={isActive ? 'radio-button-on' : 'ellipse-outline'} size={20} color={isActive ? primary : '#D1D5DB'} />
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            <Pressable
              style={[styles.modalSaveBtn, { backgroundColor: primary }]}
              onPress={() => {
                setAddressPickerModal(false);
                setAddressModal(true);
              }}>
              <Text style={styles.modalSaveBtnText}>Adicionar novo endereço</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { paddingTop: 64, paddingBottom: 26, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerText: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#071B5A' },
  addressBlock: { gap: 3 },
  addressLabel: { fontSize: 12, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  addressMain: { fontSize: 14, fontWeight: '700', color: '#111827' },
  addressSub: { fontSize: 13, color: '#6B7280' },
  noAddress: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },
  changeAddressBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  changeAddressBtnText: { fontSize: 13, fontWeight: '700' },
  addAddressBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, padding: 14, justifyContent: 'center' },
  addAddressBtnText: { fontSize: 14, fontWeight: '700' },
  orderItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  orderItemImage: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#F3F4F6' },
  orderItemImageFallback: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderItemQty: { fontSize: 13, fontWeight: '800', color: '#6B7280', minWidth: 24 },
  orderItemName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#111827' },
  orderItemPrice: { fontSize: 13, fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#F3F4F6' },
  feeBlock: { gap: 8 },
  feeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  feeLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  feeValue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  freeDeliveryHint: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, padding: 10 },
  freeDeliveryHintText: { fontSize: 12, fontWeight: '600', flex: 1 },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  paymentOption: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, flex: 1, minWidth: '45%', position: 'relative' },
  paymentLabel: { fontSize: 13, fontWeight: '700', color: '#374151', flex: 1 },
  paymentCheck: { position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  changeWrap: { gap: 6 },
  changeLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
  changeInput: { backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontWeight: '600', color: '#111827' },
  changeHint: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  notesInput: { backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111827', minHeight: 80, textAlignVertical: 'top' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  summaryDivider: { height: 1, backgroundColor: '#F3F4F6' },
  summaryTotal: { fontSize: 16, fontWeight: '800', color: '#071B5A' },
  summaryTotalValue: { fontSize: 20, fontWeight: '900' },
  footer: { padding: 16, paddingBottom: 32, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  confirmBtn: { borderRadius: 16, paddingVertical: 15, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  confirmBtnDisabled: { backgroundColor: '#F3F4F6' },
  confirmBtnText: { color: '#fff', fontWeight: '800', fontSize: 16, flex: 1, textAlign: 'center' },
  confirmBtnPrice: { color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 32, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '900', color: '#071B5A' },
  modalContent: { gap: 12, paddingBottom: 8 },
  addrRow: { flexDirection: 'row', gap: 10 },
  addressPickerList: { gap: 10, paddingVertical: 4 },
  addressPickerItem: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'space-between',
  },
  addressPickerText: { flex: 1, gap: 3 },
  addrFieldWrap: { gap: 5 },
  addrLabel: { fontSize: 12, fontWeight: '700', color: '#374151' },
  addrInput: { backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#111827' },
  locationBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 13, backgroundColor: '#F9FAFB' },
  locationBtnActive: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
  locationBtnText: { fontSize: 13, fontWeight: '700', color: '#6B7280', flex: 1 },
  modalDivider: { height: 1, backgroundColor: '#F3F4F6' },
  cepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cepLoader: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  cepHint: { fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginTop: 3 },
  modalSaveBtn: { borderRadius: 16, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  modalSaveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },});

function getItemImage(product: { image?: string; images?: string[] }) {
  if (product.image) return product.image;
  if (Array.isArray(product.images) && product.images.length > 0) return product.images[0];
  return '';
}

function AddrField({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: 'default' | 'numeric';
  autoCapitalize?: 'none' | 'characters' | 'words' | 'sentences';
}) {
  return (
    <View style={styles.addrFieldWrap}>
      <Text style={styles.addrLabel}>{label}</Text>
      <TextInput
        style={styles.addrInput}
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
