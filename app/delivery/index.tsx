import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { AppModal } from '@/components/AppModal';
import { useTheme } from '@/contexts/ThemeContext';
import { deliveryApi } from '@/services/deliveryApi';
import { useAppStore } from '@/store';
import { DeliveryEstablishment } from '@/types';

export default function DeliveryIndexScreen() {
  const theme = useTheme();
  const primary = theme.colors.primary;
  const authSession = useAppStore((s) => s.authSession);

  const [establishments, setEstablishments] = useState<DeliveryEstablishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorModal, setErrorModal] = useState(false);

  const load = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const data = await deliveryApi.getAvailableEstablishments();
      setEstablishments(data);
    } catch {
      setErrorModal(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleSelect = (est: DeliveryEstablishment) => {
    router.push(
      `/delivery/products?establishmentId=${est.id}&establishmentName=${encodeURIComponent(est.name)}`,
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={primary} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: primary }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Delivery</Text>
          <Text style={styles.headerSub}>
            Olá, {authSession?.user?.name?.split(' ')[0] ?? 'Cliente'}
          </Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Ionicons name="bicycle-outline" size={22} color="#fff" />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={primary} />
          <Text style={styles.loadingText}>Buscando estabelecimentos...</Text>
        </View>
      ) : (
        <FlatList
          data={establishments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              colors={[primary]}
              tintColor={primary}
            />
          }
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>
              {establishments.length} estabelecimento{establishments.length !== 1 ? 's' : ''} disponível{establishments.length !== 1 ? 'is' : ''}
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="storefront-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Nenhum estabelecimento disponível</Text>
            </View>
          }
          renderItem={({ item }) => (
            <EstablishmentCard est={item} primary={primary} onPress={() => handleSelect(item)} />
          )}
        />
      )}

      <AppModal
        visible={errorModal}
        title="Erro ao carregar"
        message="Não foi possível buscar os estabelecimentos. Tente novamente."
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

function EstablishmentCard({
  est,
  primary,
  onPress,
}: {
  est: DeliveryEstablishment;
  primary: string;
  onPress: () => void;
}) {
  const isOpen = est.isOpen ?? true;
  const deliveryOk = est.deliveryEnabled !== false;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
      onPress={onPress}
      disabled={!isOpen || !deliveryOk}>
      <View style={[styles.cardAccent, { backgroundColor: isOpen && deliveryOk ? primary : '#9CA3AF' }]} />
      <View style={styles.cardBody}>
        {est.logo ? (
          <Image source={{ uri: est.logo }} style={styles.logo} />
        ) : (
          <View style={[styles.logoFallback, { backgroundColor: `${primary}20` }]}>
            <Ionicons name="storefront-outline" size={24} color={primary} />
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{est.name}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: isOpen && deliveryOk ? '#10B981' : '#9CA3AF' }]} />
            <Text style={[styles.statusText, { color: isOpen && deliveryOk ? '#10B981' : '#9CA3AF' }]}>
              {!deliveryOk ? 'Delivery indisponível' : isOpen ? 'Aberto' : 'Fechado'}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={isOpen && deliveryOk ? primary : '#D1D5DB'} />
      </View>
    </Pressable>
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
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  headerIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 48 },
  loadingText: { color: '#6B7280', fontWeight: '600' },
  emptyText: { color: '#9CA3AF', fontWeight: '600', fontSize: 15 },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#6B7280', marginBottom: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 18, flexDirection: 'row', overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  cardAccent: { width: 5 },
  cardBody: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  logo: { width: 52, height: 52, borderRadius: 12, backgroundColor: '#F3F4F6' },
  logoFallback: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, gap: 5 },
  cardName: { fontSize: 15, fontWeight: '800', color: '#111827' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: '700' },
});
