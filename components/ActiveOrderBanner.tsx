import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { deliveryApi, setDeliveryAuthToken } from '@/services/deliveryApi';
import { useAppStore } from '@/store';
import { DeliveryOrder } from '@/types';

// Rotas onde o banner NÃO deve aparecer
const EXCLUDED_ROUTES = ['/delivery/tracking', '/delivery/orders'];

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Aguardando confirmação',
  CONFIRMED: 'Pedido confirmado',
  PREPARING: 'Em preparo',
  READY_FOR_DELIVERY: 'Pronto para entrega',
  OUT_FOR_DELIVERY: 'Saiu para entrega',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  CONFIRMED: '#3B82F6',
  PREPARING: '#8B5CF6',
  READY_FOR_DELIVERY: '#059669',
  OUT_FOR_DELIVERY: '#06B6D4',
};

// Status que devem mostrar o banner (pedidos ativos)
const ACTIVE_STATUSES = Object.keys(STATUS_LABELS);

const norm = (s?: string) => (s ?? '').toUpperCase();

export function ActiveOrderBanner() {
  const theme = useTheme();
  const primary = theme.colors.primary;
  const authSession = useAppStore((s) => s.authSession);
  const pathname = usePathname();

  const [activeOrder, setActiveOrder] = useState<DeliveryOrder | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  const isExcluded = EXCLUDED_ROUTES.some((r) => pathname.startsWith(r));

  useEffect(() => {
    if (!authSession?.accessToken) return;
    setDeliveryAuthToken(authSession.accessToken);

    const fetchActiveOrder = async () => {
      try {
        const orders = await deliveryApi.getMyOrders();
        const active = orders.find((o) => ACTIVE_STATUSES.includes(norm(o.status)));
        setActiveOrder(active ?? null);
        setDismissed(false);
      } catch {
        // silently fail
      }
    };

    void fetchActiveOrder();

    // Revalida a cada 30s
    const interval = setInterval(() => void fetchActiveOrder(), 30_000);
    return () => clearInterval(interval);
  }, [authSession?.accessToken]);

  const shouldShow = !!activeOrder && !dismissed && !isExcluded;

  useEffect(() => {
    if (shouldShow) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();

      // Loop de pulso na sombra
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 100, duration: 200, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
      pulseAnim.stopAnimation();
    }
  }, [shouldShow]);

  if (!activeOrder) return null;

  const status = norm(activeOrder.status);
  const statusColor = STATUS_COLORS[status] ?? primary;
  const label = STATUS_LABELS[status] ?? status;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
      ]}
      pointerEvents={shouldShow ? 'box-none' : 'none'}>

      {/* Glow pulsante */}
      <Animated.View
        style={[
          styles.glow,
          { backgroundColor: statusColor, opacity: pulseAnim },
        ]}
      />

      <Pressable
        style={[styles.banner, { borderLeftColor: statusColor }]}
        onPress={() => router.push(`/delivery/tracking?orderId=${activeOrder.id}`)}>

        {/* Indicador colorido pulsante */}
        <View style={[styles.dot, { backgroundColor: statusColor }]} />

        {/* Texto */}
        <View style={styles.textBlock}>
          <Text style={styles.title} numberOfLines={1}>
            Pedido {activeOrder.orderNumber}
          </Text>
          <Text style={[styles.status, { color: statusColor }]} numberOfLines={1}>
            {label}
          </Text>
        </View>

        {/* CTA */}
        <View style={[styles.cta, { backgroundColor: `${statusColor}15` }]}>
          <Text style={[styles.ctaText, { color: statusColor }]}>Ver</Text>
          <Ionicons name="chevron-forward" size={13} color={statusColor} />
        </View>

        {/* Fechar */}
        <Pressable
          style={styles.closeBtn}
          onPress={(e) => { e.stopPropagation(); setDismissed(true); }}
          hitSlop={8}>
          <Ionicons name="close" size={14} color="#9CA3AF" />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 999,
  },
  glow: {
    position: 'absolute',
    top: 6,
    left: 8,
    right: 8,
    bottom: -6,
    borderRadius: 18,
    zIndex: -1,
  },
  banner: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    elevation: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  textBlock: { flex: 1, gap: 2 },
  title: { fontSize: 13, fontWeight: '800', color: '#111827' },
  status: { fontSize: 12, fontWeight: '600' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ctaText: { fontSize: 12, fontWeight: '800' },
  closeBtn: {
    padding: 2,
  },
});
