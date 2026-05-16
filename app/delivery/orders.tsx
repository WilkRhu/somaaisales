import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { AppModal } from '@/components/AppModal';
import { HeaderWave } from '@/components/HeaderWave';
import { useTheme } from '@/contexts/ThemeContext';
import { deliveryApi, setDeliveryAuthToken } from '@/services/deliveryApi';
import { useAppStore } from '@/store';
import { DeliveryOrder } from '@/types';

const STATUS_FILTERS = ['ALL', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'AWAITING_CONFIRMATION', 'DELIVERED', 'CANCELLED'] as const;

export default function DeliveryOrdersScreen() {
  const theme = useTheme();
  const primary = theme.colors.primary;
  const authSession = useAppStore((s) => s.authSession);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>('ALL');

  const load = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const data = await deliveryApi.getMyOrders();
      setOrders(data);
    } catch {
      setErrorModal(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelOrderId) return;
    setCancelLoading(true);
    try {
      await deliveryApi.cancelOrder(cancelOrderId);
      setCancelOrderId(null);
      await load(true);
    } catch {
      setCancelOrderId(null);
      setErrorModal(true);
    } finally {
      setCancelLoading(false);
    }
  };

  useEffect(() => {
    if (authSession?.accessToken) {
      setDeliveryAuthToken(authSession.accessToken);
    }
  }, [authSession]);

  useEffect(() => {
    if (authSession?.accessToken) {
      setDeliveryAuthToken(authSession.accessToken);
    }
    void load();
  }, []);

  const filteredOrders = useMemo(() => {
    if (filter === 'ALL') return orders;
    return orders.filter((o) => o.status?.toUpperCase() === filter);
  }, [orders, filter]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={primary} />

      <View style={[styles.header, { backgroundColor: primary }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Meus pedidos</Text>
          <Text style={styles.headerSub}>{authSession?.user?.name ?? 'Cliente'}</Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Ionicons name="receipt-outline" size={22} color="#fff" />
        </View>
      </View>
      <HeaderWave color={primary} />

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((item) => (
          <Pressable
            key={item}
            onPress={() => setFilter(item)}
            style={[styles.filterChip, filter === item && { backgroundColor: primary, borderColor: primary }]}>
            <Text style={[styles.filterChipText, filter === item && { color: '#fff' }]}>
              {item === 'ALL' ? 'Todos' : statusLabel(item)}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={primary} />
          <Text style={styles.loadingText}>Carregando pedidos...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[primary]} tintColor={primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Nenhum pedido encontrado</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => router.push(`/delivery/tracking?orderId=${item.id}`)}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.orderNumber}>{item.orderNumber}</Text>
                  <Text style={styles.orderDate}>{new Date(item.createdAt).toLocaleString('pt-BR')}</Text>
                </View>
                <Text style={[styles.statusBadge, { color: statusColor(item.status) }]}>{statusLabel(item.status)}</Text>
              </View>
              <Text style={styles.address} numberOfLines={2}>{item.deliveryAddress}</Text>
              <View style={styles.cardBottom}>
                <Text style={styles.payment}>{paymentLabel(item.paymentMethod)}</Text>
                <Text style={[styles.total, { color: primary }]}>R$ {Number(item.total ?? 0).toFixed(2)}</Text>
              </View>
              {(item.status?.toUpperCase() === 'PENDING' || item.status?.toUpperCase() === 'CONFIRMED') && (
                <Pressable
                  style={styles.cancelBtn}
                  onPress={(e) => { e.stopPropagation(); setCancelOrderId(item.id); }}>
                  <Ionicons name="close-circle-outline" size={15} color="#EF4444" />
                  <Text style={styles.cancelBtnText}>Cancelar pedido</Text>
                </Pressable>
              )}
            </Pressable>
          )}
        />
      )}

      <AppModal
        visible={!!cancelOrderId}
        title="Cancelar pedido"
        message="Tem certeza que deseja cancelar este pedido?"
        icon="alert-circle-outline"
        iconColor="#EF4444"
        buttons={[
          { text: cancelLoading ? 'Cancelando...' : 'Sim, cancelar', onPress: handleCancel },
          { text: 'Voltar', style: 'cancel', onPress: () => setCancelOrderId(null) },
        ]}
        onClose={() => setCancelOrderId(null)}
      />

      <AppModal
        visible={errorModal}
        title="Erro ao carregar"
        message="Não foi possível buscar seus pedidos."
        icon="alert-circle-outline"
        iconColor="#EF4444"
        buttons={[
          { text: 'Tentar novamente', onPress: () => { setErrorModal(false); void load(); } },
          { text: 'Voltar', style: 'cancel', onPress: () => router.back() },
        ]}
        onClose={() => setErrorModal(false)}
      />
    </View>
  );
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    PENDING: 'Pendente',
    CONFIRMED: 'Confirmado',
    PREPARING: 'Preparando',
    READY_FOR_DELIVERY: 'Pronto',
    OUT_FOR_DELIVERY: 'Saiu',
    AWAITING_CONFIRMATION: 'Aguardando confirmação',
    DELIVERED: 'Entregue',
    CANCELLED: 'Cancelado',
  };
  return map[status?.toUpperCase()] ?? status;
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    PENDING: '#F59E0B',
    CONFIRMED: '#2563EB',
    PREPARING: '#7C3AED',
    READY_FOR_DELIVERY: '#059669',
    OUT_FOR_DELIVERY: '#0EA5E9',
    AWAITING_CONFIRMATION: '#F97316',
    DELIVERED: '#10B981',
    CANCELLED: '#EF4444',
  };
  return map[status?.toUpperCase()] ?? '#6B7280';
}

function paymentLabel(method: string) {
  const map: Record<string, string> = {
    PIX: 'PIX',
    CASH: 'Dinheiro',
    CREDIT_CARD: 'Crédito',
    DEBIT_CARD: 'Débito',
  };
  return map[method] ?? method;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { paddingTop: 64, paddingBottom: 26, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  headerText: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  headerIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16, paddingTop: 10 },
  filterChip: { borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  filterChipText: { fontSize: 12, fontWeight: '700', color: '#374151' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 48 },
  loadingText: { color: '#6B7280', fontWeight: '600' },
  emptyText: { color: '#9CA3AF', fontWeight: '600', fontSize: 15 },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  orderNumber: { fontSize: 15, fontWeight: '800', color: '#111827' },
  orderDate: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusBadge: { fontSize: 12, fontWeight: '800' },
  address: { fontSize: 13, color: '#374151', lineHeight: 18 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 4 },
  payment: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  total: { fontSize: 16, fontWeight: '900' },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2',
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start',
  },
  cancelBtnText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },
});
