import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Path, Svg } from 'react-native-svg';

import { EmptyState } from '@/components/EmptyState';
import { useTenant } from '@/contexts/TenantContext';
import { tenantApi } from '@/services/api';
import { useAppStore } from '@/store';
import { NearbyEstablishment } from '@/types';

// ─── Paleta ────────────────────────────────────────────────────────────────
const C = {
  bluePrimary: '#1677FF',
  blueDark: '#071B5A',
  purplePrimary: '#7B1FFF',
  purpleLight: '#A855F7',
  bg: '#F5F5F5',
  white: '#FFFFFF',
  textPrimary: '#071B5A',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  cardShadow: '#1677FF',
};

const appLogoUrl = 'https://somaaiuploads.s3.us-east-1.amazonaws.com/logomarca/somaaisales.png';

export default function StoreSelectionScreen() {
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingStores, setLoadingStores] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [radiusKm, setRadiusKm] = useState('10');
  const [searchQuery, setSearchQuery] = useState('');
  const [stores, setStores] = useState<NearbyEstablishment[]>([]);
  const { loadTenantByCode } = useTenant();
  const setAppConsumerConfig = useAppStore((state) => state.setAppConsumerConfig);

  useEffect(() => {
    const bootstrap = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos da sua localização para encontrar estabelecimentos próximos.');
        setLoadingLocation(false);
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setLatitude(lat);
      setLongitude(lng);
      setLoadingLocation(false);
      await loadStores(lat, lng, Number(radiusKm) || 10);
    };
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStores = async (lat: number, lng: number, radius: number) => {
    setLoadingStores(true);
    try {
      const data = await tenantApi.getNearbyEstablishments(lat, lng, radius);
      setStores(data);
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao buscar estabelecimentos');
    } finally {
      setLoadingStores(false);
    }
  };

  useEffect(() => {
    if (latitude == null || longitude == null) return;
    const parsed = Number(radiusKm);
    if (Number.isNaN(parsed) || parsed <= 0) return;
    const t = setTimeout(() => void loadStores(latitude, longitude, parsed), 350);
    return () => clearTimeout(t);
  }, [latitude, longitude, radiusKm]);

  const selectStore = async (store: NearbyEstablishment) => {
    try {
      console.log('[selectStore] iniciando', { storeId: store.id, storeName: store.nome });
      const ok = await loadTenantByCode(store.id);
      if (!ok) throw new Error('Loja não encontrada');
      const appConfig = await tenantApi.getAppConsumerConfig(store.id);
      console.log('[selectStore] appConfig recebido', appConfig);
      setAppConsumerConfig(appConfig);
      console.log('[selectStore] appConfig salvo no store', { id: appConfig.id, appColor: appConfig.appColor });
      router.replace('/login');
    } catch (error) {
      console.error('[selectStore] falha', error);
      Alert.alert('Erro', error instanceof Error ? error.message : 'Falha ao carregar a loja');
    }
  };

  const filteredStores = stores.filter((store) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return [store.nome, store.address, store.city, store.state, store.description]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  const isLoading = loadingLocation || loadingStores;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.blueDark} />

      {/* Header fixo com gradiente simulado */}
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <Image source={{ uri: appLogoUrl }} style={styles.headerLogo} />
          <View style={styles.headerText}>
            <Text style={styles.headerBrand}>SomaAI Sales</Text>
            <Text style={styles.headerTagline}>Plataforma de operação da loja</Text>
          </View>
          <View style={styles.headerBadge}>
            <View style={styles.headerBadgeDot} />
            <Text style={styles.headerBadgeText}>Online</Text>
          </View>
        </View>

        <Text style={styles.headerTitle}>Escolha a loja</Text>
        <Text style={styles.headerSubtitle}>
          Sua localização é usada para encontrar o estabelecimento mais próximo.
        </Text>

        {/* Métricas */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{isLoading ? '...' : stores.length}</Text>
            <Text style={styles.metricLabel}>Próximas</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{latitude != null ? 'GPS ✓' : '--'}</Text>
            <Text style={styles.metricLabel}>Localização</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{radiusKm || '10'} km</Text>
            <Text style={styles.metricLabel}>Raio</Text>
          </View>
        </View>
      </View>
      <Svg width="100%" height={44} viewBox="0 0 390 44" preserveAspectRatio="none" style={{ marginTop: -1 }}>
        <Path
          d="M0,0 C65,44 130,44 195,22 C260,0 325,0 390,22 L390,0 L0,0 Z"
          fill={C.blueDark}
        />
      </Svg>

      {/* Filtros */}
      <View style={styles.filtersCard}>
        <View style={styles.filterRow}>
          <View style={styles.filterField}>
            <View style={styles.filterLabelRow}>
              <Ionicons name="search-outline" size={13} color={C.textPrimary} />
              <Text style={styles.filterLabel}>Buscar loja</Text>
            </View>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Nome, cidade, bairro..."
              placeholderTextColor={C.textMuted}
              style={styles.filterInput}
            />
          </View>
          <View style={[styles.filterField, { flex: 0, width: 90 }]}>
            <View style={styles.filterLabelRow}>
              <Ionicons name="locate-outline" size={13} color={C.textPrimary} />
              <Text style={styles.filterLabel}>Raio</Text>
            </View>
            <TextInput
              value={radiusKm}
              onChangeText={setRadiusKm}
              placeholder="10"
              keyboardType="numeric"
              placeholderTextColor={C.textMuted}
              style={styles.filterInput}
            />
          </View>
        </View>
      </View>

      {/* Lista */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <View style={styles.loadingSpinner}>
            <Ionicons name="storefront-outline" size={32} color={C.bluePrimary} />
          </View>
          <Text style={styles.loadingText}>Buscando lojas próximas...</Text>
          <Text style={styles.loadingSubText}>Aguarde um momento</Text>
        </View>
      ) : (
        <FlatList
          data={filteredStores}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title="Nenhuma loja encontrada"
              description={
                searchQuery.trim()
                  ? 'Tente outro termo ou limpe a busca.'
                  : 'Tente ampliar o raio de busca.'
              }
            />
          }
          renderItem={({ item }) => <StoreCard store={item} onPress={() => selectStore(item)} />}
        />
      )}

      {/* Coordenadas discretas */}
      {latitude != null && longitude != null && (
        <Text style={styles.coords}>
          {latitude.toFixed(4)}, {longitude.toFixed(4)}
        </Text>
      )}
    </View>
  );
}

// ─── Card de loja ───────────────────────────────────────────────────────────
function StoreCard({ store, onPress }: { store: NearbyEstablishment; onPress: () => void }) {
  const isOpen = store.isOpen ?? false;

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      {/* Faixa lateral colorida */}
      <View style={[styles.cardAccent, { backgroundColor: isOpen ? C.bluePrimary : C.textMuted }]} />

      <View style={styles.cardBody}>
        {/* Topo: logo + info */}
        <View style={styles.cardTop}>
          <Image source={{ uri: store.logo }} style={styles.storeLogo} />
          <View style={styles.storeInfo}>
            <Text style={styles.storeName} numberOfLines={1}>{store.nome}</Text>
            <Text style={styles.storeMeta} numberOfLines={1}>
              {store.address ?? store.description ?? 'Estabelecimento próximo'}
            </Text>
            <Text style={styles.storeCity} numberOfLines={1}>
              {store.city ?? 'Cidade não informada'}
              {store.state ? ` • ${store.state}` : ''}
            </Text>
          </View>
          {/* Status pill */}
          <View style={[styles.statusPill, { backgroundColor: isOpen ? '#EFF6FF' : '#F3F4F6' }]}>
            <View style={[styles.statusDot, { backgroundColor: isOpen ? C.bluePrimary : C.textMuted }]} />
            <Text style={[styles.statusText, { color: isOpen ? C.bluePrimary : C.textMuted }]}>
              {isOpen ? 'Aberto' : 'Fechado'}
            </Text>
          </View>
        </View>

        {/* Rodapé: distância + botão */}
        <View style={styles.cardFooter}>
          <View style={styles.distanceBadge}>
            <Ionicons name="location-outline" size={14} color={C.textMuted} />
            <Text style={styles.distanceText}>
              {store.distanceKm != null ? `${store.distanceKm.toFixed(1)} km` : 'Distância não informada'}
            </Text>
          </View>
          <Pressable style={styles.enterButton} onPress={onPress}>
            <Text style={styles.enterButtonText}>Entrar →</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Estilos ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Header
  header: {
    backgroundColor: C.blueDark,
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 10,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  headerLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1e3a8a',
  },
  headerText: { flex: 1, gap: 2 },
  headerBrand: { fontSize: 16, fontWeight: '800', color: C.white },
  headerTagline: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(22,119,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(22,119,255,0.4)',
  },
  headerBadgeDot: { width: 7, height: 7, borderRadius: 999, backgroundColor: C.bluePrimary },
  headerBadgeText: { fontSize: 11, fontWeight: '700', color: C.bluePrimary },
  headerTitle: { fontSize: 30, fontWeight: '900', color: C.white, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 20 },

  // Métricas no header
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  metricItem: { flex: 1, alignItems: 'center', gap: 3 },
  metricDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.15)' },
  metricValue: { fontSize: 16, fontWeight: '900', color: C.white },
  metricLabel: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },

  // Filtros
  filtersCard: {
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginTop: -1,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  filterRow: { flexDirection: 'row', gap: 10 },
  filterField: { flex: 1, gap: 6 },
  filterLabel: { fontSize: 12, fontWeight: '700', color: C.textPrimary },
  filterLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  filterInput: {
    backgroundColor: C.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
  },

  // Loading
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingSpinner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${C.bluePrimary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingEmoji: { fontSize: 32 },
  loadingText: { fontSize: 16, fontWeight: '800', color: C.textPrimary },
  loadingSubText: { fontSize: 13, color: C.textMuted },

  // Lista
  listContent: {
    padding: 16,
    paddingTop: 14,
    gap: 12,
    paddingBottom: 32,
  },

  // Card
  card: {
    backgroundColor: C.white,
    borderRadius: 20,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
  cardAccent: { width: 5 },
  cardBody: { flex: 1, padding: 14, gap: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  storeLogo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: C.bg,
  },
  storeInfo: { flex: 1, gap: 3 },
  storeName: { fontSize: 15, fontWeight: '800', color: C.textPrimary },
  storeMeta: { fontSize: 12, color: C.textMuted, lineHeight: 17 },
  storeCity: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusDot: { width: 7, height: 7, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },

  // Rodapé do card
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 10,
  },
  distanceBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  distanceText: { fontSize: 13, fontWeight: '600', color: C.textMuted },
  enterButton: {
    backgroundColor: C.bluePrimary,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: C.bluePrimary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  enterButtonText: { color: C.white, fontWeight: '800', fontSize: 13 },

  // Coords
  coords: {
    textAlign: 'center',
    color: '#C4C4C4',
    fontSize: 11,
    paddingBottom: 8,
  },
});
