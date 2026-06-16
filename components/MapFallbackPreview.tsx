import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Point = { latitude: number; longitude: number };

type MapFallbackPreviewProps = {
  title: string;
  subtitle?: string;
  origin?: Point | null;
  destination?: Point | null;
  routeLength?: number;
  routeLabel?: string | null;
  emptyLabel?: string;
  primaryLabel?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  accentColor?: string;
  children?: ReactNode;
};

export function MapFallbackPreview({
  title,
  subtitle,
  origin,
  destination,
  routeLength = 0,
  routeLabel,
  emptyLabel = 'Pré-visualização indisponível',
  primaryLabel = 'Mapa principal do app',
  actionLabel,
  onActionPress,
  accentColor = '#1677FF',
  children,
}: MapFallbackPreviewProps) {
  const hasPoints = Boolean(origin && destination);

  return (
    <View style={styles.wrap}>
      <View style={styles.grid} />
      <View style={styles.glow1} />
      <View style={styles.glow2} />
      <View style={styles.pathWrap}>
        <View style={[styles.path, { backgroundColor: hasPoints ? accentColor : '#CBD5E1' }]} />
      </View>

      <View style={[styles.marker, styles.markerOrigin, { borderColor: accentColor }]}>
        <Ionicons name="person" size={18} color="#fff" />
      </View>
      <View style={[styles.marker, styles.markerDestination, { backgroundColor: '#EF4444' }]}>
        <Ionicons name="storefront" size={18} color="#fff" />
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.emptyTitle}>{primaryLabel}</Text>
        <Text style={styles.emptyBadge}>{emptyLabel}</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <View style={styles.metaRow}>
          <View style={[styles.pill, { backgroundColor: `${accentColor}14` }]}>
            <Ionicons name="location" size={12} color={accentColor} />
            <Text style={[styles.pillText, { color: accentColor }]}>
              {routeLabel ?? `${routeLength > 0 ? `${routeLength} pontos` : 'sem rota'}`}
            </Text>
          </View>
          {hasPoints ? (
            <View style={styles.pill}>
              <Ionicons name="analytics-outline" size={12} color="#475569" />
              <Text style={styles.pillText}>{origin && destination ? 'origem + destino' : 'dados parciais'}</Text>
            </View>
          ) : null}
        </View>

        {children}

        {actionLabel && onActionPress ? (
          <Pressable style={[styles.button, { backgroundColor: accentColor }]} onPress={onActionPress}>
            <Text style={styles.buttonText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 220,
    width: '100%',
    backgroundColor: '#EFF6FF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.25,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    shadowOpacity: 0,
  },
  glow1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#BFDBFE',
    top: -30,
    right: -20,
    opacity: 0.5,
  },
  glow2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#93C5FD',
    bottom: -30,
    left: -10,
    opacity: 0.35,
  },
  pathWrap: {
    position: 'absolute',
    width: '70%',
    height: 8,
    top: '50%',
    marginTop: -4,
    justifyContent: 'center',
  },
  path: {
    height: 5,
    borderRadius: 999,
    opacity: 0.9,
  },
  marker: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  markerOrigin: {
    left: '20%',
    top: '35%',
    backgroundColor: '#1677FF',
  },
  markerDestination: {
    right: '18%',
    bottom: '28%',
  },
  infoCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 12,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  emptyBadge: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  button: {
    alignSelf: 'flex-start',
    marginTop: 2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
});
