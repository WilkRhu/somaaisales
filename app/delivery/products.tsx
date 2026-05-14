import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Image,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View
} from 'react-native';

import { AppModal } from '@/components/AppModal';
import { useTheme } from '@/contexts/ThemeContext';
import { deliveryApi } from '@/services/deliveryApi';
import { DeliveryCartItem, DeliveryEstablishment, Product } from '@/types';

const ALL_LABEL = 'Todos';

export default function DeliveryProductsScreen() {
  const { establishmentId, establishmentName, offerId } = useLocalSearchParams<{
    establishmentId: string;
    establishmentName: string;
    offerId?: string;
  }>();

  const theme = useTheme();
  const primary = theme.colors.primary;

  const [establishment, setEstablishment] = useState<DeliveryEstablishment | null>(null);
  const [cart, setCart] = useState<DeliveryCartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState(ALL_LABEL);
  const [toastProduct, setToastProduct] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modais de bloqueio
  const [deliveryDisabledModal, setDeliveryDisabledModal] = useState(false);
  const [closedModal, setClosedModal] = useState(false);
  const [cartPreviewVisible, setCartPreviewVisible] = useState(false);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!establishmentId) return;
      isRefresh ? setRefreshing(true) : setLoading(true);
      try {
        const [est, savedCart] = await Promise.all([
          deliveryApi.getEstablishmentById(establishmentId, offerId),
          deliveryApi.loadCart(establishmentId),
        ]);
        setEstablishment(est);
        setCart(savedCart);

        if (est.deliveryEnabled === false) {
          setDeliveryDisabledModal(true);
        } else if (est.isOpen === false) {
          setClosedModal(true);
        }
      } catch {
        // silently fail — user can pull to refresh
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [establishmentId, offerId],
  );

  useEffect(() => { void loadData(); }, [loadData]);

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

  const addToCart = async (product: Product) => {
    if (!establishmentId) return;

    // Valida estoque
    if (product.currentStock !== undefined && product.currentStock <= 0) return;

    const existing = cart.find((i) => i.product.id === product.id);
    let updated: DeliveryCartItem[];

    if (existing) {
      updated = cart.map((i) =>
        i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
      );
    } else {
      updated = [...cart, { product, quantity: 1 }];
    }

    setCart(updated);
    await deliveryApi.saveCart(establishmentId, updated);
    showToast(product.name);
  };

  const removeFromCart = async (productId: string) => {
    if (!establishmentId) return;
    const existing = cart.find((i) => i.product.id === productId);
    if (!existing) return;

    let updated: DeliveryCartItem[];
    if (existing.quantity <= 1) {
      updated = cart.filter((i) => i.product.id !== productId);
    } else {
      updated = cart.map((i) =>
        i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i,
      );
    }

    setCart(updated);
    await deliveryApi.saveCart(establishmentId, updated);
  };

  const cartQty = (productId: string) =>
    cart.find((i) => i.product.id === productId)?.quantity ?? 0;

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  const products = establishment?.inventory ?? [];
  const categories = [
    ALL_LABEL,
    ...Array.from(new Set(products.map((p) => p.category).filter(Boolean))),
  ];
  const filtered =
    activeCategory === ALL_LABEL
      ? products
      : products.filter((p) => p.category === activeCategory);

  const goToCheckout = () => {
    router.push({
      pathname: '/delivery/checkout',
      params: { establishmentId, cart: JSON.stringify(cart) },
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={primary} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={primary} />
          <Text style={styles.loadingText}>Carregando produtos...</Text>
        </View>
      ) : (
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
              onRefresh={() => loadData(true)}
              colors={[primary]}
              tintColor={primary}
            />
          }
          ListHeaderComponent={
            <View style={styles.headerWrap}>
              <View style={[styles.topBar, { backgroundColor: primary }]}>
                <View style={styles.topBarRow}>
                  <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                  </Pressable>
                  <View style={styles.storeInfo}>
                    {establishment?.logo ? (
                      <Image source={{ uri: establishment.logo }} style={styles.storeLogo} />
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.storeName} numberOfLines={1}>
                        {establishmentName ?? establishment?.name}
                      </Text>
                      <Text style={styles.storeStatus}>
                        {establishment?.isOpen !== false ? '🟢 Aberto' : '🔴 Fechado'}
                      </Text>
                    </View>
                  </View>
                  <Pressable style={styles.cartBtn} onPress={goToCheckout}>
                    <Ionicons name="bag-outline" size={22} color="#fff" />
                    {totalItems > 0 && (
                      <View style={styles.cartBadge}>
                        <Text style={styles.cartBadgeText}>{totalItems}</Text>
                      </View>
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Categorias */}
              <FlatList
                horizontal
                data={categories}
                keyExtractor={(c) => c}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesList}
                renderItem={({ item }) => {
                  const active = item === activeCategory;
                  return (
                    <Pressable
                      style={[
                        styles.chip,
                        active && { backgroundColor: primary, borderColor: primary },
                      ]}
                      onPress={() => setActiveCategory(item)}>
                      <Text style={[styles.chipText, active && { color: '#fff' }]}>{item}</Text>
                    </Pressable>
                  );
                }}
              />

              <Text style={styles.sectionTitle}>
                {activeCategory === ALL_LABEL ? 'Todos os produtos' : activeCategory}
                {!loading && (
                  <Text style={styles.sectionCount}> ({filtered.length})</Text>
                )}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Nenhum produto encontrado</Text>
            </View>
          }
          renderItem={({ item }) => {
            const qty = cartQty(item.id);
            const outOfStock =
              item.currentStock !== undefined && item.currentStock <= 0;

            return (
              <View style={[styles.card, outOfStock && { opacity: 0.5 }]}>
                {item.hasOffer && (
                  <View style={[styles.offerBadge, { backgroundColor: primary }]}>
                    <Text style={styles.offerBadgeText}>
                      {item.offerDetails?.discountPercentage
                        ? `-${item.offerDetails.discountPercentage}%`
                        : 'Oferta'}
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
                  <Text style={[styles.productPrice, { color: primary }]}>
                    R$ {item.price.toFixed(2)}
                    {item.unit ? (
                      <Text style={styles.unit}> /{item.unit}</Text>
                    ) : null}
                  </Text>
                </View>

                {qty > 0 ? (
                  <View style={styles.qtyRow}>
                    <Pressable
                      style={[styles.qtyBtn, { borderColor: `${primary}40` }]}
                      onPress={() => removeFromCart(item.id)}>
                      <Ionicons
                        name={qty === 1 ? 'trash-outline' : 'remove'}
                        size={14}
                        color={qty === 1 ? '#EF4444' : primary}
                      />
                    </Pressable>
                    <Text style={styles.qtyText}>{qty}</Text>
                    <Pressable
                      style={[styles.qtyBtn, { backgroundColor: primary, borderColor: primary }]}
                      onPress={() => addToCart(item)}>
                      <Ionicons name="add" size={14} color="#fff" />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={[
                      styles.addButton,
                      { backgroundColor: outOfStock ? '#D1D5DB' : primary },
                    ]}
                    onPress={() => !outOfStock && addToCart(item)}
                    disabled={outOfStock}>
                    <Text style={styles.addButtonText}>
                      {outOfStock ? 'Sem estoque' : 'Adicionar'}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Barra flutuante do carrinho */}
      {totalItems > 0 && !loading && (
        <View style={styles.cartBar}>
          <Pressable style={[styles.cartBarBtn, { backgroundColor: primary }]} onPress={() => setCartPreviewVisible(true)}>
            <View style={styles.cartBarBadge}>
              <Text style={styles.cartBarBadgeText}>{totalItems}</Text>
            </View>
            <Text style={styles.cartBarText}>Ver carrinho</Text>
            <Text style={styles.cartBarPrice}>
              R${' '}
              {cart.reduce((s, i) => s + i.product.price * i.quantity, 0).toFixed(2)}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Popup prévia do carrinho */}
      <Modal
        visible={cartPreviewVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setCartPreviewVisible(false)}>
        <Pressable style={styles.previewOverlay} onPress={() => setCartPreviewVisible(false)}>
          <Pressable style={styles.previewSheet} onPress={() => {}}>
            {/* Handle */}
            <View style={styles.previewHandle} />

            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Carrinho</Text>
              <Pressable onPress={() => setCartPreviewVisible(false)}>
                <Ionicons name="close" size={22} color="#374151" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.previewScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.previewScrollContent}>
              {cart.map((item, idx) => (
                <View key={item.product.id}>
                  <View style={styles.previewItem}>
                    {item.product.image ? (
                      <Image source={{ uri: item.product.image }} style={styles.previewItemImage} />
                    ) : (
                      <View style={[styles.previewItemImage, { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="cube-outline" size={20} color="#D1D5DB" />
                      </View>
                    )}
                    <View style={styles.previewItemInfo}>
                      <Text style={styles.previewItemName} numberOfLines={2}>{item.product.name}</Text>
                      <Text style={[styles.previewItemPrice, { color: primary }]}>
                        R$ {item.product.price.toFixed(2)}
                        {item.product.unit ? ` /${item.product.unit}` : ''}
                      </Text>
                    </View>
                    <View style={styles.previewQtyRow}>
                      <Pressable
                        style={[styles.previewQtyBtn, { borderColor: `${primary}40` }]}
                        onPress={() => removeFromCart(item.product.id)}>
                        <Ionicons
                          name={item.quantity === 1 ? 'trash-outline' : 'remove'}
                          size={14}
                          color={item.quantity === 1 ? '#EF4444' : primary}
                        />
                      </Pressable>
                      <Text style={styles.previewQtyText}>{item.quantity}</Text>
                      <Pressable
                        style={[styles.previewQtyBtn, { backgroundColor: primary, borderColor: primary }]}
                        onPress={() => addToCart(item.product)}>
                        <Ionicons name="add" size={14} color="#fff" />
                      </Pressable>
                    </View>
                  </View>
                  {idx < cart.length - 1 && <View style={styles.previewDivider} />}
                </View>
              ))}
            </ScrollView>

            {/* Totais */}
            <View style={styles.previewTotals}>
              <View style={styles.previewTotalRow}>
                <Text style={styles.previewTotalLabel}>
                  {totalItems} {totalItems === 1 ? 'item' : 'itens'}
                </Text>
                <Text style={[styles.previewTotalValue, { color: primary }]}>
                  R$ {cart.reduce((s, i) => s + i.product.price * i.quantity, 0).toFixed(2)}
                </Text>
              </View>
              <Pressable
                style={[styles.previewCheckoutBtn, { backgroundColor: primary }]}
                onPress={() => { setCartPreviewVisible(false); goToCheckout(); }}>
                <Text style={styles.previewCheckoutBtnText}>Finalizar pedido</Text>
                <Ionicons name="arrow-forward" size={18} color={primary} style={styles.previewCheckoutArrow} />
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Toast */}
      {toastProduct && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity, backgroundColor: primary }]}>
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={styles.toastText} numberOfLines={1}>
            {toastProduct} adicionado
          </Text>
        </Animated.View>
      )}

      {/* Modais de bloqueio */}
      <AppModal
        visible={deliveryDisabledModal}
        title="Delivery indisponível"
        message="Este estabelecimento não está aceitando pedidos de delivery no momento."
        icon="bicycle-outline"
        iconColor="#F59E0B"
        buttons={[{ text: 'Voltar', onPress: () => router.back() }]}
        onClose={() => router.back()}
      />
      <AppModal
        visible={closedModal}
        title="Estabelecimento fechado"
        message="Este estabelecimento está fechado no momento. Tente novamente mais tarde."
        icon="time-outline"
        iconColor="#6B7280"
        buttons={[{ text: 'Voltar', onPress: () => router.back() }]}
        onClose={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 48 },
  loadingText: { color: '#6B7280', fontWeight: '600' },
  emptyText: { color: '#9CA3AF', fontWeight: '600', fontSize: 15 },

  headerWrap: { gap: 0, marginBottom: 8 },
  topBar: { paddingTop: 52, paddingHorizontal: 16, paddingBottom: 20 },
  topBarRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  storeInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  storeLogo: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)' },
  storeName: { fontSize: 15, fontWeight: '800', color: '#fff' },
  storeStatus: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  cartBtn: { position: 'relative', padding: 4 },
  cartBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: '#EF4444', borderRadius: 999,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  categoriesList: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
  },
  chipText: { fontWeight: '700', color: '#374151', fontSize: 13 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#071B5A', paddingHorizontal: 16, marginBottom: 4 },
  sectionCount: { fontSize: 14, fontWeight: '500', color: '#9CA3AF' },

  listContent: { paddingBottom: 120 },
  columnWrapper: { gap: 12, paddingHorizontal: 16 },

  card: {
    flex: 1, backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
    marginBottom: 12,
  },
  offerBadge: {
    position: 'absolute', top: 8, left: 8, zIndex: 1,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  offerBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  productImage: { height: 110, backgroundColor: '#F3F4F6' },
  cardInfo: { padding: 10, gap: 3, flex: 1 },
  productName: { fontSize: 13, fontWeight: '700', color: '#111827', lineHeight: 18 },
  originalPrice: { fontSize: 11, color: '#9CA3AF', textDecorationLine: 'line-through' },
  productPrice: { fontSize: 15, fontWeight: '900' },
  unit: { fontSize: 11, fontWeight: '500', color: '#9CA3AF' },

  addButton: {
    margin: 10, marginTop: 0, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', paddingVertical: 8,
  },
  addButtonText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  qtyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, margin: 10, marginTop: 0,
  },
  qtyBtn: {
    width: 30, height: 30, borderRadius: 9, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyText: { fontSize: 14, fontWeight: '800', color: '#111827', minWidth: 18, textAlign: 'center' },

  // Barra flutuante
  cartBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 32,
    backgroundColor: 'rgba(245,245,245,0.95)',
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  cartBarBtn: {
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  cartBarBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 999,
    minWidth: 26, height: 26, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  cartBarBadgeText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  cartBarText: { flex: 1, color: '#fff', fontWeight: '800', fontSize: 15 },
  cartBarPrice: { color: '#fff', fontWeight: '900', fontSize: 15 },

  // Toast
  toast: {
    position: 'absolute', bottom: 100, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  toastText: { color: '#fff', fontWeight: '700', fontSize: 14, maxWidth: 220 },

  // Popup prévia do carrinho
  previewOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  previewSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, maxHeight: '75%',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 10,
  },
  previewHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginBottom: 12,
  },
  previewHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  previewTitle: { fontSize: 17, fontWeight: '900', color: '#071B5A' },
  previewScroll: { flexGrow: 0 },
  previewScrollContent: { paddingHorizontal: 20, paddingVertical: 8 },
  previewItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  previewItemImage: { width: 56, height: 56, borderRadius: 12 },
  previewItemInfo: { flex: 1, gap: 3 },
  previewItemName: { fontSize: 13, fontWeight: '700', color: '#111827', lineHeight: 18 },
  previewItemPrice: { fontSize: 13, fontWeight: '800' },
  previewQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewQtyBtn: {
    width: 28, height: 28, borderRadius: 8, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  previewQtyText: { fontSize: 14, fontWeight: '800', color: '#111827', minWidth: 16, textAlign: 'center' },
  previewDivider: { height: 1, backgroundColor: '#F9FAFB' },
  previewTotals: {
    padding: 20, paddingBottom: 36,
    borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 12,
  },
  previewTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewTotalLabel: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  previewTotalValue: { fontSize: 20, fontWeight: '900' },
  previewCheckoutBtn: {
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  previewCheckoutBtnText: { color: '#fff', fontWeight: '800', fontSize: 16, flex: 1, textAlign: 'center' },
  previewCheckoutArrow: {
    backgroundColor: '#fff', borderRadius: 8, padding: 4, overflow: 'hidden',
  },
});
