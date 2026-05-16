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
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, Region } from 'react-native-maps';

import { AppModal } from '@/components/AppModal';
import { HeaderWave } from '@/components/HeaderWave';
import { useTheme } from '@/contexts/ThemeContext';
import { useDeliverySocket } from '@/hooks/useDeliverySocket';
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

const STATUS_ICONS: Record<string, keyof typeof import('@expo/vector-icons').Ionicons.glyphMap> = {
  PENDING: 'time-outline',
  CONFIRMED: 'checkmark-circle-outline',
  PREPARING: 'cube-outline',
  READY_FOR_DELIVERY: 'bag-check-outline',
  OUT_FOR_DELIVERY: 'bicycle-outline',
  AWAITING_CONFIRMATION: 'checkmark-done-outline',
  DELIVERED: 'home-outline',
  CANCELLED: 'close-circle-outline',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  CONFIRMED: '#3B82F6',
  PREPARING: '#8B5CF6',
  READY_FOR_DELIVERY: '#059669',
  OUT_FOR_DELIVERY: '#06B6D4',
  AWAITING_CONFIRMATION: '#F97316',
  DELIVERED: '#10B981',
  CANCELLED: '#EF4444',
};

const STATUS_ORDER = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'AWAITING_CONFIRMATION', 'DELIVERED'];

const norm = (s?: string) => (s ?? '').toUpperCase();

export default function DeliveryTrackingScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const theme = useTheme();
  const primary = theme.colors.primary;
  const authSession = useAppStore((s) => s.authSession);

  const [order, setOrder] = useState<DeliveryOrder | null>(null);
  const [trackingEvents, setTrackingEvents] = useState<DeliveryTrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapRef = useRef<MapView>(null);
  const orderStatusRef = useRef<string>('');

  // Mantém o ref sempre atualizado com o status atual
  useEffect(() => {
    orderStatusRef.current = norm(order?.status);
  }, [order?.status]);

  const orderStatus = norm(order?.status);
  const isOutForDelivery = orderStatus === 'OUT_FOR_DELIVERY' || orderStatus === 'AWAITING_CONFIRMATION';

  // WebSocket — conecta sempre que há orderId e token
  const { driverLocation, statusUpdate, connected } = useDeliverySocket(
    orderId ?? null,
    authSession?.accessToken ?? null,
  );

  // Recarrega o pedido quando o backend emite status:update via WebSocket
  useEffect(() => {
    if (!statusUpdate) return;
    void loadOrder(true);
  }, [statusUpdate]);

  // Localização inicial via REST (fallback para quando o WebSocket ainda não recebeu nada)
  const [lastKnownLocation, setLastKnownLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routeTrail, setRouteTrail] = useState<{ latitude: number; longitude: number }[]>([]);
  const [zoomDelta, setZoomDelta] = useState(0.02);
  const currentRegionRef = useRef<Region | null>(null);

  useEffect(() => {
    if (!isOutForDelivery || !orderId) return;
    deliveryApi.getDriverLocation(orderId).then((loc) => {
      if (loc) {
        setLastKnownLocation(loc);
        setRouteTrail([loc]);
      }
    }).catch(() => {});
  }, [isOutForDelivery, orderId]);

  // Acumula trilha quando WebSocket envia nova posição
  useEffect(() => {
    if (!driverLocation) return;
    setRouteTrail((prev) => {
      const last = prev[prev.length - 1];
      if (last?.latitude === driverLocation.latitude && last?.longitude === driverLocation.longitude) return prev;
      return [...prev, { latitude: driverLocation.latitude, longitude: driverLocation.longitude }];
    });
  }, [driverLocation]);

  // Usa a localização do WebSocket se disponível, senão usa a última conhecida via REST
  const displayLocation = driverLocation ?? lastKnownLocation;

  const handleZoom = (direction: 'in' | 'out') => {
    const newDelta = direction === 'in'
      ? Math.max(0.002, zoomDelta / 2)
      : Math.min(0.2, zoomDelta * 2);
    setZoomDelta(newDelta);
    if (displayLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: displayLocation.latitude,
        longitude: displayLocation.longitude,
        latitudeDelta: newDelta,
        longitudeDelta: newDelta,
      }, 300);
    }
  };

  useEffect(() => {
    if (authSession?.accessToken) {
      setDeliveryAuthToken(authSession.accessToken);
    }
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
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadOrder();

    pollingRef.current = setInterval(() => {
      const s = orderStatusRef.current;
      if (s === 'DELIVERED' || s === 'CANCELLED') {
        if (pollingRef.current) clearInterval(pollingRef.current);
        return;
      }
      void loadOrder();
    }, 60_000); // fallback — WebSocket cobre atualizações em tempo real

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [orderId]);

  // Anima o mapa para a posição do entregador quando atualiza
  useEffect(() => {
    if (displayLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: displayLocation.latitude,
        longitude: displayLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 800);
    }
  }, [displayLocation]);

  const handleCancel = async () => {
    if (!orderId) return;
    setActionLoading(true);
    try {
      await deliveryApi.cancelOrder(orderId);
      setCancelModal(false);
      await loadOrder(true);
    } catch {
      setCancelModal(false);
      setErrorModal('Não foi possível cancelar o pedido. Tente novamente.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReceipt = async () => {
    if (!orderId) return;
    setActionLoading(true);
    try {
      await deliveryApi.confirmReceipt(orderId);
      await loadOrder(true);
    } catch {
      setErrorModal('Não foi possível confirmar o recebimento. Tente novamente.');
    } finally {
      setActionLoading(false);
    }
  };

  const statusColor = STATUS_COLORS[orderStatus] ?? primary;
  const currentStatusIndex = STATUS_ORDER.indexOf(orderStatus);
  const canCancel = ['PENDING', 'CONFIRMED'].includes(orderStatus);
  const canConfirm = orderStatus === 'AWAITING_CONFIRMATION';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={primary} />

      <View style={[styles.header, { backgroundColor: primary }]}>
        <Pressable style={styles.backBtn} onPress={() => router.replace('/delivery/orders')}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Acompanhar pedido</Text>
          {order?.orderNumber ? (
            <Text style={styles.headerSub}>{order.orderNumber}</Text>
          ) : null}
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
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadOrder(true)} colors={[primary]} tintColor={primary} />
          }>

          {/* Banner de status */}
          <View style={[styles.statusCard, { backgroundColor: statusColor }]}>
            <View style={[styles.statusBgCircle1, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
            <View style={[styles.statusBgCircle2, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />
            <View style={styles.statusCardInner}>
              <View style={styles.statusIconWrap}>
                <Ionicons name={STATUS_ICONS[orderStatus] ?? 'help-circle-outline'} size={48} color="#fff" />
              </View>
              <View style={styles.statusTextBlock}>
                <Text style={styles.statusLabel}>
                  {STATUS_LABELS[orderStatus] ?? order.status}
                </Text>
                {order.orderNumber ? (
                  <Text style={styles.statusOrderNumber}>Pedido {order.orderNumber}</Text>
                ) : null}
              </View>
              {order.estimatedDeliveryTime && orderStatus !== 'DELIVERED' && orderStatus !== 'CANCELLED' ? (
                <View style={styles.estimatedBadge}>
                  <Ionicons name="time-outline" size={14} color={statusColor} />
                  <Text style={[styles.estimatedTime, { color: statusColor }]}>
                    {order.estimatedDeliveryTime} min
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Mapa — aparece em rota e no estado de confirmação do cliente */}
          {isOutForDelivery && (
            <View style={styles.mapCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="navigate-outline" size={16} color={primary} />
                <Text style={styles.cardTitle}>Entregador em rota</Text>
                <View style={[styles.socketBadge, { backgroundColor: connected ? '#D1FAE5' : '#FEF3C7' }]}>
                  <View style={[styles.socketDot, { backgroundColor: connected ? '#10B981' : '#F59E0B' }]} />
                  <Text style={[styles.socketText, { color: connected ? '#065F46' : '#92400E' }]}>
                    {connected ? 'Ao vivo' : 'Conectando...'}
                  </Text>
                </View>
              </View>

              <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                onRegionChange={(r) => { currentRegionRef.current = r; }}
                initialRegion={{
                  latitude: displayLocation?.latitude ?? -23.5505,
                  longitude: displayLocation?.longitude ?? -46.6333,
                  latitudeDelta: zoomDelta,
                  longitudeDelta: zoomDelta,
                }}
                showsUserLocation
                showsMyLocationButton={false}>

                {/* Trilha percorrida */}
                {routeTrail.length > 1 && (
                  <Polyline
                    coordinates={routeTrail}
                    strokeColor={statusColor}
                    strokeWidth={4}
                    lineDashPattern={[0]}
                    lineJoin="round"
                    lineCap="round"
                  />
                )}

                {displayLocation && (
                  <Marker
                    coordinate={{
                      latitude: displayLocation.latitude,
                      longitude: displayLocation.longitude,
                    }}
                    title="Entregador"
                    description="Posição atual do entregador">
                    <View style={[styles.driverMarker, { backgroundColor: statusColor }]}>
                      <Ionicons name="bicycle" size={18} color="#fff" />
                    </View>
                  </Marker>
                )}
              </MapView>

              {/* Botões de zoom */}
              <View style={styles.zoomControls}>
                <Pressable style={styles.zoomBtn} onPress={() => handleZoom('in')}>
                  <Ionicons name="add" size={20} color="#374151" />
                </Pressable>
                <View style={styles.zoomDivider} />
                <Pressable style={styles.zoomBtn} onPress={() => handleZoom('out')}>
                  <Ionicons name="remove" size={20} color="#374151" />
                </Pressable>
              </View>

              {!displayLocation && (
                <View style={styles.mapOverlay}>
                  <ActivityIndicator size="small" color={primary} />
                  <Text style={styles.mapOverlayText}>Aguardando localização do entregador...</Text>
                </View>
              )}

              {driverLocation && (
                <Text style={styles.mapUpdatedAt}>
                  Atualizado às {new Date(driverLocation.timestamp).toLocaleTimeString('pt-BR')}
                </Text>
              )}
            </View>
          )}

          {/* Linha do tempo de progresso */}
          {orderStatus !== 'CANCELLED' && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="git-branch-outline" size={16} color={primary} />
                <Text style={styles.cardTitle}>Progresso do pedido</Text>
              </View>
              {STATUS_ORDER.map((status, idx) => {
                const done = currentStatusIndex >= 0 && idx <= currentStatusIndex;
                const active = idx === currentStatusIndex;
                const color = done ? (STATUS_COLORS[status] ?? primary) : '#D1D5DB';
                const isLast = idx === STATUS_ORDER.length - 1;
                return (
                  <View key={status} style={styles.timelineRow}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineDot, { backgroundColor: color }, active && styles.timelineDotActive]}>
                        {done && <Ionicons name="checkmark" size={11} color="#fff" />}
                      </View>
                      {!isLast && (
                        <View style={[styles.timelineLine, { backgroundColor: idx < currentStatusIndex ? color : '#E5E7EB' }]} />
                      )}
                    </View>
                    <View style={styles.timelineTextWrap}>
                      <Text style={[
                        styles.timelineStepLabel,
                        done && { color: '#111827', fontWeight: '700' },
                        active && { color: statusColor },
                      ]}>
                        {STATUS_LABELS[status]}
                      </Text>
                      {active && (
                        <>
                          <Text style={[styles.timelineActiveHint, { color: statusColor }]}>Status atual</Text>
                          {status === 'AWAITING_CONFIRMATION' && (
                            <Text style={[styles.timelineActiveHint, { color: statusColor }]}>Aguardando sua confirmação</Text>
                          )}
                        </>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Histórico de eventos reais */}
          {trackingEvents.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="list-outline" size={16} color={primary} />
                <Text style={styles.cardTitle}>Histórico de eventos</Text>
              </View>
              {trackingEvents.map((event, idx) => {
                const evColor = STATUS_COLORS[norm(event.status)] ?? primary;
                return (
                  <View key={idx} style={styles.timelineRow}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineDot, { backgroundColor: evColor }]}>
                        <Ionicons name="checkmark" size={11} color="#fff" />
                      </View>
                      {idx < trackingEvents.length - 1 && (
                        <View style={[styles.timelineLine, { backgroundColor: '#E5E7EB' }]} />
                      )}
                    </View>
                    <View style={styles.timelineTextWrap}>
                      <Text style={[styles.timelineStepLabel, { color: '#111827', fontWeight: '700' }]}>
                        {STATUS_LABELS[norm(event.status)] ?? event.status}
                      </Text>
                      {event.description ? (
                        <Text style={styles.timelineDesc}>{event.description}</Text>
                      ) : null}
                      <Text style={styles.timelineDate}>
                        {new Date(event.createdAt ?? event.timestamp ?? '').toLocaleString('pt-BR')}
                      </Text>
                    </View>
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
              <Text style={styles.summaryValue}>R$ {Number(order.subtotal ?? 0).toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Entrega</Text>
              <Text style={[styles.summaryValue, Number(order.deliveryFee) === 0 && { color: '#10B981' }]}>
                {Number(order.deliveryFee) === 0 ? 'Grátis' : `R$ ${Number(order.deliveryFee ?? 0).toFixed(2)}`}
              </Text>
            </View>
            {Number(order.discount ?? 0) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Desconto</Text>
                <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                  -R$ {Number(order.discount ?? 0).toFixed(2)}
                </Text>
              </View>
            )}
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotal}>Total</Text>
              <Text style={[styles.summaryTotalValue, { color: primary }]}>
                R$ {Number(order.total ?? 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Pagamento</Text>
              <Text style={styles.summaryValue}>{order.paymentMethod}</Text>
            </View>
          </View>

          {/* Ações */}
          {canConfirm && (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: '#10B981' }, actionLoading && styles.btnDisabled]}
              onPress={handleConfirmReceipt}
              disabled={actionLoading}>
              {actionLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={styles.actionBtnText}>Confirmar recebimento</Text>
                  </>
              }
            </Pressable>
          )}

          {canCancel && (
            <Pressable
              style={[styles.actionBtn, styles.cancelBtn, actionLoading && styles.btnDisabled]}
              onPress={() => setCancelModal(true)}
              disabled={actionLoading}>
              <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
              <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Cancelar pedido</Text>
            </Pressable>
          )}

          {(orderStatus === 'DELIVERED' || orderStatus === 'CANCELLED') && (
            <Pressable style={[styles.actionBtn, { backgroundColor: primary }]} onPress={() => router.replace('/app/home')}>
              <Text style={styles.actionBtnText}>Fazer novo pedido</Text>
            </Pressable>
          )}
        </ScrollView>
      )}

      <AppModal
        visible={cancelModal}
        title="Cancelar pedido"
        message="Tem certeza que deseja cancelar este pedido?"
        icon="alert-circle-outline"
        iconColor="#EF4444"
        buttons={[
          { text: actionLoading ? 'Cancelando...' : 'Sim, cancelar', onPress: handleCancel },
          { text: 'Voltar', style: 'cancel', onPress: () => setCancelModal(false) },
        ]}
        onClose={() => setCancelModal(false)}
      />

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

  // Banner
  statusCard: {
    borderRadius: 24, overflow: 'hidden', minHeight: 140, justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 5,
  },
  statusBgCircle1: { position: 'absolute', width: 180, height: 180, borderRadius: 90, top: -60, right: -40 },
  statusBgCircle2: { position: 'absolute', width: 120, height: 120, borderRadius: 60, bottom: -40, left: -20 },
  statusCardInner: { padding: 24, flexDirection: 'row', alignItems: 'center', gap: 16 },
  statusIconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  statusTextBlock: { flex: 1, gap: 4 },
  statusLabel: { fontSize: 20, fontWeight: '900', color: '#fff', lineHeight: 26 },
  statusOrderNumber: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  estimatedBadge: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', gap: 4 },
  estimatedTime: { fontSize: 15, fontWeight: '900' },

  // Mapa
  mapCard: {
    backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, paddingBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#071B5A', flex: 1 },
  socketBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  socketDot: { width: 7, height: 7, borderRadius: 4 },
  socketText: { fontSize: 11, fontWeight: '700' },
  map: { height: 220, width: '100%' },
  zoomControls: {
    position: 'absolute',
    right: 12,
    bottom: 36,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  zoomBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  zoomDivider: { height: 1, backgroundColor: '#E5E7EB', marginHorizontal: 6 },
  mapOverlay: {
    position: 'absolute', bottom: 40, left: 0, right: 0,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  mapOverlayText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  mapUpdatedAt: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', paddingVertical: 8, fontWeight: '500' },
  driverMarker: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },

  // Cards
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 10,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },

  // Timeline
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  timelineLeft: { alignItems: 'center', width: 22 },
  timelineDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  timelineDotActive: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  timelineLine: { width: 2, flex: 1, minHeight: 24, marginVertical: 3 },
  timelineTextWrap: { flex: 1, paddingBottom: 12, gap: 2 },
  timelineStepLabel: { fontSize: 13, color: '#9CA3AF', fontWeight: '500', paddingTop: 2 },
  timelineActiveHint: { fontSize: 11, fontWeight: '700' },
  timelineDesc: { fontSize: 12, color: '#6B7280' },
  timelineDate: { fontSize: 11, color: '#9CA3AF' },

  addressText: { fontSize: 14, color: '#374151', fontWeight: '500', lineHeight: 20 },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  summaryDivider: { height: 1, backgroundColor: '#F3F4F6' },
  summaryTotal: { fontSize: 16, fontWeight: '800', color: '#071B5A' },
  summaryTotalValue: { fontSize: 20, fontWeight: '900' },

  actionBtn: { borderRadius: 16, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  cancelBtn: { backgroundColor: '#FEF2F2', borderWidth: 1.5, borderColor: '#FECACA' },
  btnDisabled: { opacity: 0.6 },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
