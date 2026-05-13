import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Image, Pressable, RefreshControl, StatusBar, StyleSheet, Text, View } from 'react-native';

import { useCart } from '@/contexts/CartContext';
import { useTenant } from '@/contexts/TenantContext';
import { useTheme } from '@/contexts/ThemeContext';
import { tenantApi } from '@/services/api';
import { useAppStore } from '@/store';
import { Product } from '@/types';

const ALL_LABEL = 'Todos';

export default function HomeScreen() {
  const { tenant } = useTenant();
  const { totalItems, addItem } = useCart();
  const appConsumerConfig = useAppStore((state) => state.appConsumerConfig);
  const authSession = useAppStore((state) => state.authSession);
  const theme = useTheme();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState(ALL_LABEL);
  const [toastProduct, setToastProduct] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const primaryColor = theme.colors.primary;
  const storeName = appConsumerConfig?.establishmentName ?? tenant?.nome ?? 'SomaAI Sales';
  const storeLogo = appConsumerConfig?.logo ?? tenant?.logo ?? null;
  const userName = authSession?.user?.name?.split(' ')[0] ?? 'Cliente';

  const establishmentId = appConsumerConfig?.establishmentId ?? tenant?.id;

  const fetchProducts = (isRefresh = false) => {
    if (!establishmentId) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    tenantApi
      .getEstablishmentWithInventory(establishmentId)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { fetchProducts(); }, [establishmentId]);

  const showToast = (name: string) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToastProduct(name);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
    toastTimeout.current = setTimeout(() => setToastProduct(null), 2400);
  };

  const handleAddItem = (item: Product) => {
    addItem(item);
    showToast(item.name);
  };

  // Categorias únicas extraídas dos produtos
  const categories = [ALL_LABEL, ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];

  const filtered = activeCategory === ALL_LABEL
    ? products
    : products.filter((p) => p.category === activeCategory);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={primaryColor} />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchProducts(true)}
            colors={[primaryColor]}
            tintColor={primaryColor}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            {/* Topo colorido */}
            <View style={[styles.topBar, { backgroundColor: primaryColor }]}>
              <View style={styles.topBarInner}>
                <View style={styles.storeRow}>
                  {storeLogo ? (
                    <Image source={{ uri: storeLogo }} style={styles.storeLogo} />
                  ) : (
                    <View style={[styles.storeLogoFallback, { backgroundColor: `${primaryColor}40` }]}>
                      <Ionicons name="storefront-outline" size={22} color="#fff" />
                    </View>
                  )}
                  <View style={styles.storeInfo}>
                    <Text style={styles.storeLabel}>Você está em</Text>
                    <Text style={styles.storeName} numberOfLines={1}>{storeName}</Text>
                  </View>
                </View>

                <Pressable style={styles.cartButton} onPress={() => router.push('/app/carrinho')}>
                  <Ionicons name="bag-outline" size={22} color="#fff" />
                  {totalItems > 0 && (
                    <View style={styles.cartBadge}>
                      <Text style={styles.cartBadgeText}>{totalItems}</Text>
                    </View>
                  )}
                </Pressable>
              </View>

              <View style={styles.greetingWrap}>
                <Text style={styles.greetingHello}>Olá, {userName}</Text>
                <Text style={styles.greetingSubtitle}>O que você vai levar hoje?</Text>
              </View>
            </View>

            {/* Banner */}
            {tenant?.banner ? (
              <Image source={{ uri: tenant.banner }} style={styles.banner} />
            ) : (
              <View style={[styles.bannerFallback, { backgroundColor: `${primaryColor}12` }]}>
                <Ionicons name="pricetag-outline" size={36} color={primaryColor} />
                <Text style={[styles.bannerFallbackText, { color: primaryColor }]}>Confira nossas ofertas</Text>
              </View>
            )}

            {/* Categorias */}
            <FlatList
              horizontal
              data={categories}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesList}
              renderItem={({ item }) => {
                const active = item === activeCategory;
                return (
                  <Pressable
                    style={[styles.categoryChip, active && { backgroundColor: primaryColor, borderColor: primaryColor }]}
                    onPress={() => setActiveCategory(item)}>
                    <Text style={[styles.categoryText, active && { color: '#fff' }]}>{item}</Text>
                  </Pressable>
                );
              }}
            />

            <Text style={styles.sectionTitle}>
              {activeCategory === ALL_LABEL ? 'Todos os produtos' : activeCategory}
              {!loading && <Text style={styles.sectionCount}> ({filtered.length})</Text>}
            </Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={primaryColor} />
              <Text style={styles.loadingText}>Carregando produtos...</Text>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Nenhum produto encontrado</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/app/produto/${item.id}`)}>
            {item.hasOffer && (
              <View style={[styles.offerBadge, { backgroundColor: primaryColor }]}>
                <Text style={styles.offerBadgeText}>
                  {item.offerDetails?.discountPercentage ? `-${item.offerDetails.discountPercentage}%` : 'Oferta'}
                </Text>
              </View>
            )}
            <Image source={{ uri: item.image }} style={styles.productImage} />
            <View style={styles.cardInfo}>
              <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
              {item.hasOffer && item.offerDetails && (
                <Text style={styles.originalPrice}>
                  R$ {item.offerDetails.originalPrice.toFixed(2)}
                </Text>
              )}
              <Text style={[styles.productPrice, { color: primaryColor }]}>
                R$ {(Number(item.price) || 0).toFixed(2)}
                {item.unit ? <Text style={styles.unit}> /{item.unit}</Text> : null}
              </Text>
            </View>
            <Pressable
              style={[styles.addButton, { backgroundColor: primaryColor }]}
              onPress={() => handleAddItem(item)}>
              <Ionicons name="add" size={18} color="#fff" />
            </Pressable>
          </Pressable>
        )}
      />

      {/* Toast */}
      {toastProduct && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity, backgroundColor: theme.colors.primary }]}>
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={styles.toastText} numberOfLines={1}>
            {toastProduct} adicionado
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  headerWrap: { gap: 0, marginBottom: 8 },
  topBar: { paddingTop: 52, paddingHorizontal: 16, paddingBottom: 24, gap: 16 },
  topBarInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  storeLogo: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)' },
  storeLogoFallback: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  storeInfo: { flex: 1, gap: 1 },
  storeLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  storeName: { fontSize: 15, fontWeight: '800', color: '#fff' },
  cartButton: { position: 'relative', padding: 4 },
  cartBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: '#EF4444', borderRadius: 999,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  greetingWrap: { gap: 2 },
  greetingHello: { fontSize: 22, fontWeight: '900', color: '#fff' },
  greetingSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  banner: { height: 160, backgroundColor: '#e5e7eb', marginHorizontal: 16, marginTop: 16, borderRadius: 20 },
  bannerFallback: {
    height: 160, marginHorizontal: 16, marginTop: 16, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  bannerFallbackText: { fontSize: 15, fontWeight: '700' },
  categoriesList: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  categoryChip: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
  },
  categoryText: { fontWeight: '700', color: '#374151', fontSize: 13 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#071B5A', paddingHorizontal: 16, marginBottom: 4 },
  sectionCount: { fontSize: 14, fontWeight: '500', color: '#9CA3AF' },
  listContent: { paddingBottom: 32 },
  columnWrapper: { gap: 12, paddingHorizontal: 16 },
  loadingWrap: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  loadingText: { color: '#6B7280', fontWeight: '600' },
  emptyWrap: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyText: { color: '#9CA3AF', fontWeight: '600', fontSize: 15 },
  card: {
    flex: 1, backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  offerBadge: {
    position: 'absolute', top: 8, left: 8, zIndex: 1,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  offerBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  productImage: { height: 120, backgroundColor: '#F3F4F6' },
  cardInfo: { padding: 10, gap: 3, flex: 1 },
  productName: { fontSize: 13, fontWeight: '700', color: '#111827', lineHeight: 18 },
  originalPrice: { fontSize: 11, color: '#9CA3AF', textDecorationLine: 'line-through' },
  productPrice: { fontSize: 15, fontWeight: '900' },
  unit: { fontSize: 11, fontWeight: '500', color: '#9CA3AF' },
  addButton: {
    margin: 10, marginTop: 0, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', paddingVertical: 8,
  },
  toast: {
    position: 'absolute', bottom: 24, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  toastText: { color: '#fff', fontWeight: '700', fontSize: 14, maxWidth: 220 },
});
