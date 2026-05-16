import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppModal } from '@/components/AppModal';
import { HeaderWave } from '@/components/HeaderWave';
import { useTheme } from '@/contexts/ThemeContext';
import { deliveryApi, setDeliveryAuthToken } from '@/services/deliveryApi';
import { useAppStore } from '@/store';
import { DeliveryOrder, DeliveryTrackingEvent } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Aguardando confirmação',
  CONFIRMED: 'Pedido confirmado',
  PREPARING: 'Em preparo',
  READY_FOR_DELIVERY: 'Pronto para entrega',
  OUT_FOR_DELIVERY: 'Saiu para entrega',
  AWAITING_CONFIRMATION: 'Aguardando confirmação do cliente',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

const norm = (s?: string) => (s ?? '').toUpperCase();

export default function DeliveryTrackingWebScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const theme = useTheme();
  const primary = theme.colors.primary;
  const authSession = useAppStore((s) => s.authSession);

  const [order, setOrder] = useState<DeliveryOrder | null>(null);
  const [trackingEvents, setTrackingEvents] = useState<DeliveryTrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [existingRating, setExistingRating] = useState(false);

  useEffect(() => {
    if (authSession?.accessToken) setDeliveryAuthToken(authSession.accessToken);
  }, [authSession]);

  const loadOrder = async (isRefresh = false) => {
    if (!orderId) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const [orderData, events] = await Promise.all([
        deliveryApi.getOrderById(orderId),
        deliveryApi.getOrderTracking(orderId).catch(() => []),
      ]);
      setOrder(orderData);
      setTrackingEvents(events);
      if (norm(orderData?.status) === 'DELIVERED') {
        const rating = await deliveryApi.getOrderRating(orderId);
        setExistingRating(Boolean(rating));
      } else {
        setExistingRating(false);
      }
    } catch {
      setErrorModal('Não foi possível carregar o pedido no navegador.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadOrder();
  }, [orderId]);

  const orderStatus = norm(order?.status);
  const canRate = orderStatus === 'DELIVERED' && !existingRating;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={primary} />

      <View style={[styles.header, { backgroundColor: primary }]}>
        <Pressable style={styles.backBtn} onPress={() => router.replace('/app/home')}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Acompanhar pedido</Text>
          {order?.orderNumber ? <Text style={styles.headerSub}>{order.orderNumber}</Text> : null}
        </View>
      </View>
      <HeaderWave color={primary} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={primary} />
          <Text style={styles.loadingText}>Carregando pedido...</Text>
        </View>
      ) : !order ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>Pedido não encontrado</Text>
          <Pressable style={[styles.retryBtn, { backgroundColor: primary }]} onPress={() => loadOrder()}>
            <Text style={styles.retryBtnText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadOrder(true)} colors={[primary]} tintColor={primary} />
          }>
          <View style={[styles.statusCard, { backgroundColor: primary }]}>
            <Text style={styles.statusLabel}>
              {STATUS_LABELS[orderStatus] ?? order.status}
            </Text>
            <Text style={styles.statusDesc}>O mapa está disponível no app nativo. No navegador, você ainda vê o status e o histórico do pedido.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="list-outline" size={16} color={primary} />
              <Text style={styles.cardTitle}>Histórico de eventos</Text>
            </View>
            {trackingEvents.length > 0 ? trackingEvents.map((event, idx) => (
              <View key={idx} style={styles.eventRow}>
                <Ionicons name="checkmark-circle-outline" size={18} color={primary} />
                <View style={styles.eventTextWrap}>
                  <Text style={styles.eventTitle}>{STATUS_LABELS[norm(event.status)] ?? event.status}</Text>
                  {event.description ? <Text style={styles.eventDesc}>{event.description}</Text> : null}
                </View>
              </View>
            )) : (
              <Text style={styles.emptyHint}>Sem eventos de rastreamento ainda.</Text>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="location-outline" size={16} color={primary} />
              <Text style={styles.cardTitle}>Endereço de entrega</Text>
            </View>
            <Text style={styles.addressText}>{order.deliveryAddress}</Text>
          </View>

          {canRate && (
            <Pressable style={[styles.rateBtn, { backgroundColor: primary }]} onPress={() => router.push(`/delivery/rating?orderId=${order.id}`)}>
              <Ionicons name="star-outline" size={18} color="#fff" />
              <Text style={styles.rateBtnText}>Avaliar pedido</Text>
            </Pressable>
          )}

          {orderStatus === 'DELIVERED' && existingRating && (
            <View style={styles.ratedBadge}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
              <Text style={styles.ratedBadgeText}>Já avaliado</Text>
            </View>
          )}
        </ScrollView>
      )}

      <AppModal
        visible={!!errorModal}
        title="Erro"
        message={errorModal ?? ''}
        icon="alert-circle-outline"
        iconColor="#EF4444"
        buttons={[{ text: 'OK', onPress: () => setErrorModal(null) }]}
        onClose={() => setErrorModal(null)}
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
  headerText: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 48 },
  loadingText: { color: '#6B7280', fontWeight: '600' },
  emptyText: { color: '#9CA3AF', fontWeight: '600', fontSize: 15 },
  retryBtn: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  retryBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 40 },
  statusCard: { borderRadius: 24, padding: 20, gap: 8 },
  statusLabel: { fontSize: 20, fontWeight: '900', color: '#fff' },
  statusDesc: { color: 'rgba(255,255,255,0.85)', lineHeight: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 10,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#071B5A', flex: 1 },
  emptyHint: { color: '#6B7280' },
  eventRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  eventTextWrap: { flex: 1, gap: 2 },
  eventTitle: { color: '#111827', fontWeight: '700' },
  eventDesc: { color: '#6B7280', fontSize: 12 },
  addressText: { fontSize: 14, color: '#374151', fontWeight: '500', lineHeight: 20 },
  rateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14 },
  rateBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  ratedBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14, backgroundColor: '#ECFDF5' },
  ratedBadgeText: { color: '#047857', fontWeight: '900', fontSize: 14 },
});
