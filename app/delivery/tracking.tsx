import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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

import { useTheme } from '@/contexts/ThemeContext';
import { deliveryApi, setDeliveryAuthToken } from '@/services/deliveryApi';
import { useAppStore } from '@/store';
import { DeliveryOrder } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Aguardando confirmação',
  CONFIRMED: 'Pedido confirmado',
  PREPARING: 'Em preparo',
  OUT_FOR_DELIVERY: 'Saiu para entrega',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

const STATUS_ICONS: Record<string, keyof typeof import('@expo/vector-icons').Ionicons.glyphMap> = {
  PENDING: 'time-outline',
  CONFIRMED: 'checkmark-circle-outline',
  PREPARING: 'restaurant-outline',
  OUT_FOR_DELIVERY: 'bicycle-outline',
  DELIVERED: 'home-outline',
  CANCELLED: 'close-circle-outline',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  CONFIRMED: '#3B82F6',
  PREPARING: '#8B5CF6',
  OUT_FOR_DELIVERY: '#06B6D4',
  DELIVERED: '#10B981',
  CANCELLED: '#EF4444',
};

const STATUS_ORDER = ['PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export default function DeliveryTrackingScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const theme = useTheme();
  const primary = theme.colors.primary;
  const authSession = useAppStore((s) => s.authSession);

  const [order, setOrder] = useState<DeliveryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (authSession?.accessToken) {
      setDeliveryAuthToken(authSession.accessToken);
    }
  }, [authSession]);

  const loadOrder = async (isRefresh = false) => {
    if (!orderId) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const data = await deliveryApi.getOrderById(orderId);
      setOrder(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadOrder();

    // Polling a cada 30s enquanto o pedido não foi entregue/cancelado
    pollingRef.current = setInterval(() => {
      if (order?.status === 'DELIVERED' || order?.status === 'CANCELLED') {
        if (pollingRef.current) clearInterval(pollingRef.current);
        return;
      }
      void loadOrder();
    }, 30_000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [orderId]);

  const statusColor = order ? (STATUS_COLORS[order.status] ?? primary) : primary;
  const currentStatusIndex = order ? STATUS_ORDER.indexOf(order.status) : -1;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={primary} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: primary }]}>
        <Pressable style={styles.backBtn} onPress={() => router.replace('/delivery')}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Acompanhar pedido</Text>
          {order?.orderNumber ? (
            <Text style={styles.headerSub}>{order.orderNumber}</Text>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={primary} />
          <Text style={styles.loadingText}>Carregando pedido...</Text>
        </View>
      ) : !order ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>Pedido não encontrado</Text>
          <Pressable
            style={[styles.retryBtn, { backgroundColor: primary }]}
            onPress={() => loadOrder()}>
            <Text style={styles.retryBtnText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadOrder(true)}
              colors={[primary]}
              tintColor={primary}
            />
          }>

          {/* Status atual */}
          <View style={[styles.statusCard, { borderColor: `${statusColor}30` }]}>
            <View style={[styles.statusIconWrap, { backgroundColor: `${statusColor}15` }]}>
              <Ionicons
                name={STATUS_ICONS[order.status] ?? 'help-circle-outline'}
                size={36}
                color={statusColor}
              />
            </View>
            <Text style={[styles.statusLabel, { color: statusColor }]}>
              {STATUS_LABELS[order.status] ?? order.status}
            </Text>
            {order.estimatedDeliveryTime && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' ? (
              <Text style={styles.estimatedTime}>
                Previsão: {order.estimatedDeliveryTime} min
              </Text>
            ) : null}
          </View>

          {/* Linha do tempo */}
          {order.status !== 'CANCELLED' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Progresso do pedido</Text>
              {STATUS_ORDER.map((status, idx) => {
                const done = idx <= currentStatusIndex;
                const color = done ? (STATUS_COLORS[status] ?? primary) : '#D1D5DB';
                return (
                  <View key={status} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineDot, { backgroundColor: color }]}>
                        {done && <Ionicons name="checkmark" size={10} color="#fff" />}
                      </View>
                      {idx < STATUS_ORDER.length - 1 && (
                        <View style={[styles.timelineLine, { backgroundColor: idx < currentStatusIndex ? color : '#E5E7EB' }]} />
                      )}
                    </View>
                    <Text style={[styles.timelineLabel, done && { color: '#111827', fontWeight: '700' }]}>
                      {STATUS_LABELS[status]}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Endereço */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="location-outline" size={16} color={primary} />
              <Text style={styles.cardTitle}>Endereço de entrega</Text>
            </View>
            <Text style={styles.addressText}>{order.deliveryAddress}</Text>
          </View>

          {/* Resumo financeiro */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="receipt-outline" size={16} color={primary} />
              <Text style={styles.cardTitle}>Resumo</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>R$ {order.subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Entrega</Text>
              <Text style={[styles.summaryValue, order.deliveryFee === 0 && { color: '#10B981' }]}>
                {order.deliveryFee === 0 ? 'Grátis' : `R$ ${order.deliveryFee.toFixed(2)}`}
              </Text>
            </View>
            {order.discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Desconto</Text>
                <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                  -R$ {order.discount.toFixed(2)}
                </Text>
              </View>
            )}
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotal}>Total</Text>
              <Text style={[styles.summaryTotalValue, { color: primary }]}>
                R$ {order.total.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Pagamento</Text>
              <Text style={styles.summaryValue}>{order.paymentMethod}</Text>
            </View>
          </View>

          {/* Botão voltar ao início */}
          {(order.status === 'DELIVERED' || order.status === 'CANCELLED') && (
            <Pressable
              style={[styles.homeBtn, { backgroundColor: primary }]}
              onPress={() => router.replace('/delivery')}>
              <Text style={styles.homeBtnText}>Fazer novo pedido</Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    paddingTop: 52, paddingBottom: 20, paddingHorizontal: 16,
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

  statusCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    alignItems: 'center', gap: 10, borderWidth: 1.5,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  statusIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  statusLabel: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  estimatedTime: { fontSize: 13, color: '#6B7280', fontWeight: '600' },

  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#071B5A' },

  // Timeline
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  timelineLeft: { alignItems: 'center', width: 20 },
  timelineDot: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  timelineLine: { width: 2, flex: 1, minHeight: 20, marginVertical: 2 },
  timelineLabel: { fontSize: 13, color: '#9CA3AF', fontWeight: '500', paddingTop: 2, flex: 1 },

  addressText: { fontSize: 14, color: '#374151', fontWeight: '500', lineHeight: 20 },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  summaryDivider: { height: 1, backgroundColor: '#F3F4F6' },
  summaryTotal: { fontSize: 16, fontWeight: '800', color: '#071B5A' },
  summaryTotalValue: { fontSize: 20, fontWeight: '900' },

  homeBtn: {
    borderRadius: 16, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  homeBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
