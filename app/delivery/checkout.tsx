import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { AppModal } from '@/components/AppModal';
import { useTheme } from '@/contexts/ThemeContext';
import { deliveryApi, setDeliveryAuthToken } from '@/services/deliveryApi';
import { useAppStore } from '@/store';
import { DeliveryCartItem, DeliveryFeeResponse, UserAddress } from '@/types';

type PaymentMethod = 'CREDIT_CARD' | 'DEBIT_CARD' | 'PIX' | 'CASH';

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

export default function DeliveryCheckoutScreen() {
  const { establishmentId, cart: cartParam } = useLocalSearchParams<{
    establishmentId: string;
    cart: string;
  }>();

  const theme = useTheme();
  const primary = theme.colors.primary;
  const authSession = useAppStore((s) => s.authSession);

  const [cart] = useState<DeliveryCartItem[]>(() => {
    try { return JSON.parse(cartParam ?? '[]'); } catch { return []; }
  });

  const [address, setAddress] = useState<UserAddress | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(true);
  const [feeData, setFeeData] = useState<DeliveryFeeResponse | null>(null);
  const [loadingFee, setLoadingFee] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [changeFor, setChangeFor] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const deliveryFee = feeData?.deliveryFee ?? 0;
  const total = subtotal + deliveryFee;

  // Injeta token
  useEffect(() => {
    if (authSession?.accessToken) {
      setDeliveryAuthToken(authSession.accessToken);
    }
  }, [authSession]);

  // Carrega endereço padrão
  useEffect(() => {
    const load = async () => {
      setLoadingAddress(true);
      try {
        const addresses = await deliveryApi.getMyAddresses();
        const def = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
        setAddress(def);
      } catch {
        // sem endereço cadastrado
      } finally {
        setLoadingAddress(false);
      }
    };
    void load();
  }, []);

  // Calcula frete quando endereço e carrinho estão prontos
  useEffect(() => {
    if (!address || !establishmentId || cart.length === 0) return;
    if (!address.neighborhood || !address.zipCode) return;

    const calc = async () => {
      setLoadingFee(true);
      try {
        const fee = await deliveryApi.calculateFee(establishmentId, {
          neighborhood: address.neighborhood,
          zipCode: address.zipCode,
          latitude: address.latitude,
          longitude: address.longitude,
          subtotal,
        });
        setFeeData(fee);
      } catch {
        setFeeData(null);
        Alert.alert('Frete', 'Não foi possível calcular o frete. Verifique seu endereço.');
      } finally {
        setLoadingFee(false);
      }
    };
    void calc();
  }, [address, establishmentId, subtotal]);

  const handleSubmit = async () => {
    if (!authSession?.user || !address || !establishmentId) {
      Alert.alert('Atenção', 'Verifique seu endereço e tente novamente.');
      return;
    }
    if (cart.length === 0) {
      Alert.alert('Carrinho vazio', 'Adicione produtos antes de finalizar.');
      return;
    }

    setSubmitting(true);
    try {
      const order = await deliveryApi.createOrder(establishmentId, {
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
        deliveryReference: address.reference,
        latitude: address.latitude,
        longitude: address.longitude,
        items: cart.map((i) => ({
          itemId: i.product.id,
          productName: i.product.name,
          unitPrice: i.product.price,
          quantity: i.quantity,
          discount: 0,
        })),
        paymentMethod,
        deliveryPaymentType: paymentMethod.toLowerCase(),
        changeFor: paymentMethod === 'CASH' ? changeFor : '',
        notes,
        discount: 0,
        addressId: address.id,
      });

      await deliveryApi.clearCart(establishmentId);
      setCreatedOrderId(order.id);
      setSuccessModal(true);
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.message ?? 'Não foi possível criar o pedido.');
    } finally {
      setSubmitting(false);
    }
  };

  const goToTracking = () => {
    setSuccessModal(false);
    if (createdOrderId) {
      router.replace(`/delivery/tracking?orderId=${createdOrderId}`);
    } else {
      router.replace('/delivery');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={primary} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: primary }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Finalizar pedido</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Endereço */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location-outline" size={18} color={primary} />
            <Text style={styles.cardTitle}>Endereço de entrega</Text>
          </View>
          {loadingAddress ? (
            <ActivityIndicator size="small" color={primary} />
          ) : address ? (
            <View style={styles.addressBlock}>
              <Text style={styles.addressMain}>
                {address.street}{address.number ? `, ${address.number}` : ''}
              </Text>
              <Text style={styles.addressSub}>
                {address.neighborhood} — {address.city}/{address.state}
              </Text>
              <Text style={styles.addressSub}>{address.zipCode}</Text>
              {address.complement ? (
                <Text style={styles.addressSub}>{address.complement}</Text>
              ) : null}
            </View>
          ) : (
            <Text style={styles.noAddress}>Nenhum endereço cadastrado</Text>
          )}
        </View>

        {/* Itens */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="bag-outline" size={18} color={primary} />
            <Text style={styles.cardTitle}>Itens do pedido</Text>
          </View>
          {cart.map((item, idx) => (
            <View key={item.product.id}>
              <View style={styles.orderItem}>
                <Text style={styles.orderItemQty}>{item.quantity}x</Text>
                <Text style={styles.orderItemName} numberOfLines={1}>{item.product.name}</Text>
                <Text style={[styles.orderItemPrice, { color: primary }]}>
                  R$ {(item.product.price * item.quantity).toFixed(2)}
                </Text>
              </View>
              {idx < cart.length - 1 && <View style={styles.divider} />}
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
              {!feeData.isFreeDelivery && feeData.freeDeliveryMinimum && subtotal < feeData.freeDeliveryMinimum ? (
                <View style={[styles.freeDeliveryHint, { backgroundColor: `${primary}12` }]}>
                  <Ionicons name="information-circle-outline" size={14} color={primary} />
                  <Text style={[styles.freeDeliveryHintText, { color: primary }]}>
                    Faltam R$ {(feeData.freeDeliveryMinimum - subtotal).toFixed(2)} para frete grátis
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
                  style={[
                    styles.paymentOption,
                    active && { borderColor: primary, backgroundColor: `${primary}10` },
                  ]}
                  onPress={() => setPaymentMethod(method)}>
                  <Ionicons
                    name={PAYMENT_ICONS[method]}
                    size={20}
                    color={active ? primary : '#6B7280'}
                  />
                  <Text style={[styles.paymentLabel, active && { color: primary }]}>
                    {PAYMENT_LABELS[method]}
                  </Text>
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
                onChangeText={setChangeFor}
                placeholder="Ex: 50,00"
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          )}
        </View>

        {/* Observações */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="chatbubble-outline" size={18} color={primary} />
            <Text style={styles.cardTitle}>Observações</Text>
          </View>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Ex: Sem cebola, campainha não funciona..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Resumo total */}
        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>R$ {subtotal.toFixed(2)}</Text>
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
            <Text style={[styles.summaryTotalValue, { color: primary }]}>
              R$ {total.toFixed(2)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Botão confirmar */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.confirmBtn, { backgroundColor: primary }, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.confirmBtnText}>Confirmar pedido</Text>
              <Text style={styles.confirmBtnPrice}>R$ {total.toFixed(2)}</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Modal de sucesso */}
      <AppModal
        visible={successModal}
        title="Pedido realizado!"
        message="Seu pedido foi criado com sucesso. Acompanhe o status em tempo real."
        icon="checkmark-circle-outline"
        iconColor="#10B981"
        buttons={[{ text: 'Acompanhar pedido', onPress: goToTracking }]}
        onClose={goToTracking}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    paddingTop: 52, paddingBottom: 20, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 32 },

  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#071B5A' },

  addressBlock: { gap: 3 },
  addressMain: { fontSize: 14, fontWeight: '700', color: '#111827' },
  addressSub: { fontSize: 13, color: '#6B7280' },
  noAddress: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },

  orderItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  orderItemQty: { fontSize: 13, fontWeight: '800', color: '#6B7280', minWidth: 24 },
  orderItemName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#111827' },
  orderItemPrice: { fontSize: 13, fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#F3F4F6' },

  feeBlock: { gap: 8 },
  feeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  feeLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  feeValue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  freeDeliveryHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 10, padding: 10,
  },
  freeDeliveryHintText: { fontSize: 12, fontWeight: '600', flex: 1 },

  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  paymentOption: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    flex: 1, minWidth: '45%', position: 'relative',
  },
  paymentLabel: { fontSize: 13, fontWeight: '700', color: '#374151', flex: 1 },
  paymentCheck: {
    position: 'absolute', top: -6, right: -6,
    width: 18, height: 18, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },

  changeWrap: { gap: 6 },
  changeLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
  changeInput: {
    backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontWeight: '600', color: '#111827',
  },

  notesInput: {
    backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111827',
    minHeight: 80, textAlignVertical: 'top',
  },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  summaryDivider: { height: 1, backgroundColor: '#F3F4F6' },
  summaryTotal: { fontSize: 16, fontWeight: '800', color: '#071B5A' },
  summaryTotalValue: { fontSize: 20, fontWeight: '900' },

  footer: {
    padding: 16, paddingBottom: 32, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  confirmBtn: {
    borderRadius: 16, paddingVertical: 15, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  confirmBtnText: { color: '#fff', fontWeight: '800', fontSize: 16, flex: 1, textAlign: 'center' },
  confirmBtnPrice: { color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 14 },
});
