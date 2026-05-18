import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
    TextInput,
    useWindowDimensions,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Path, Svg } from 'react-native-svg';

import { WeightQuantityModal } from '@/components/WeightQuantityModal';
import { useCart } from '@/contexts/CartContext';
import { useTenant } from '@/contexts/TenantContext';
import { useTheme } from '@/contexts/ThemeContext';
import { tenantApi } from '@/services/api';
import { useAppStore, useOffersStore } from '@/store';
import { Product } from '@/types';

const ALL_LABEL = 'Todos';
const EMPTY_PRODUCTS: Product[] = [];

export default function HomeScreen() {
  const { tenant } = useTenant();
  const { totalItems, addItem, items, removeItem, decrementItem } = useCart();
  const appConsumerConfig = useAppStore((s) => s.appConsumerConfig);
  const authSession = useAppStore((s) => s.authSession);
  const setAuthSession = useAppStore((s) => s.setAuthSession);
  const clearCart = useAppStore((s) => s.clearCart);
  const toggleFavoriteProduct = useAppStore((s) => s.toggleFavoriteProduct);
  const isFavoriteProduct = useAppStore((s) => s.isFavoriteProduct);
  const addRecentProduct = useAppStore((s) => s.addRecentProduct);
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState(ALL_LABEL);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastProduct, setToastProduct] = useState<string | null>(null);
  const [cartPreviewVisible, setCartPreviewVisible] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<(typeof offers)[number] | null>(null);
  const [detailImageIndex, setDetailImageIndex] = useState(0);
  const [fullImageVisible, setFullImageVisible] = useState(false);
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [weightProduct, setWeightProduct] = useState<Product | null>(null);

  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sidebarAnim = useRef(new Animated.Value(-280)).current;
  const carouselRef = useRef<FlatList>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const { offers, loading: offersLoading, fetchOffers } = useOffersStore();
  const { width: screenWidth } = useWindowDimensions();
  const SLIDE_WIDTH = screenWidth - 32; // 16px margin cada lado
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const primary = theme.colors.primary;
  const storeName = appConsumerConfig?.establishmentName ?? tenant?.nome ?? 'SomaAI Sales';
  const storeLogo = appConsumerConfig?.logo ?? tenant?.logo ?? null;
  const userName = authSession?.user?.name?.split(' ')[0] ?? 'Cliente';
  const userEmail = authSession?.user?.email ?? '';
  const userAvatar = authSession?.user?.avatar ?? null;
  const establishmentId = appConsumerConfig?.establishmentId ?? tenant?.id;
  const favoriteProducts = useAppStore((s) => s.favoriteProductsByScope[establishmentId ?? 'default'] ?? EMPTY_PRODUCTS);
  const recentProducts = useAppStore((s) => s.recentProductsByScope[establishmentId ?? 'default'] ?? EMPTY_PRODUCTS);

  const fetchProducts = (isRefresh = false) => {
    if (!establishmentId) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    tenantApi
      .getEstablishmentWithInventory(establishmentId)
      .then((data) => {
        setProducts(data);
      })
      .catch(() => { setProducts([]); })
      .finally(() => { setLoading(false); setRefreshing(false); });
    if (isRefresh) fetchOffers(establishmentId, true, authSession?.accessToken);
  };

  useEffect(() => { fetchProducts(); }, [establishmentId]);
  useEffect(() => {
    if (establishmentId) fetchOffers(establishmentId, true, authSession?.accessToken);
  }, [establishmentId]);

  useEffect(() => {
    if (offers.length <= 1) return;
    autoPlayRef.current = setInterval(() => {
      setActiveSlide((prev) => {
        const next = (prev + 1) % offers.length;
        carouselRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 3500);
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, [offers.length]);

  useEffect(() => {
    setDetailImageIndex(0);
  }, [selectedProduct?.id]);

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
    if (item.unit && ['kg', 'g', 'l'].includes(item.unit.toLowerCase())) {
      setWeightProduct(item);
      setWeightModalVisible(true);
      return;
    }
    addItem(item);
    showToast(item.name);
  };

  const handleWeightConfirm = (product: Product, quantity: number) => {
    addItem(product, quantity);
    showToast(product.name);
  };

  const openSidebar = () => {
    setSidebarVisible(true);
    Animated.spring(sidebarAnim, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
  };

  const closeSidebar = () => {
    Animated.timing(sidebarAnim, { toValue: -280, duration: 220, useNativeDriver: true }).start(() =>
      setSidebarVisible(false),
    );
  };

  const handleLogout = () => {
    closeSidebar();
    setTimeout(() => {
      setAuthSession(null);
      clearCart();
      router.replace('/login');
    }, 250);
  };

  const categories = [ALL_LABEL, ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];
  const filtered = (activeCategory === ALL_LABEL ? products : products.filter((p) => p.category === activeCategory))
    .filter((p) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return [p.name, p.category, p.description].filter(Boolean).some((value) => String(value).toLowerCase().includes(q));
    });
  const recentVisible = recentProducts.filter((item) => products.some((product) => product.id === item.id));
  const cartTotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={primary} />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchProducts(true)} colors={[primary]} tintColor={primary} />
        }
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            {/* ── Header ── */}
            <View style={[styles.topBar, { backgroundColor: primary }]}>
              {/* Linha única: avatar + saudação + carrinho */}
              <View style={styles.topBarRow}>

                {/* Esquerda: menu + avatar */}
                <Pressable onPress={openSidebar} style={styles.menuBtn}>
                  <Ionicons name="menu-outline" size={26} color="#fff" />
                </Pressable>

                <Pressable onPress={openSidebar} style={styles.avatarWrap}>
                  {userAvatar ? (
                    <Image source={{ uri: userAvatar }} style={styles.userAvatar} />
                  ) : (
                    <View style={[styles.userAvatarFallback, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                      <Text style={styles.userAvatarInitial}>{userName.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                </Pressable>

                {/* Centro: saudação + loja */}
                <View style={styles.greetingBlock}>
                  <Text style={styles.greetingHello} numberOfLines={1}>
                    Olá, <Text style={styles.greetingName}>{userName}</Text>
                  </Text>
                  <View style={styles.storeRow}>
                    {storeLogo ? (
                      <Image source={{ uri: storeLogo }} style={styles.storeLogo} />
                    ) : (
                      <Ionicons name="storefront-outline" size={11} color="rgba(255,255,255,0.6)" />
                    )}
                    <Text style={styles.storeName} numberOfLines={1}>{storeName}</Text>
                  </View>
                </View>

                {/* Direita: carrinho */}
                <Pressable style={styles.cartBtn} onPress={() => setCartPreviewVisible(true)}>
                  <Ionicons name="bag-outline" size={24} color="#fff" />
                  {totalItems > 0 && (
                    <View style={styles.cartBadge}>
                      <Text style={styles.cartBadgeText}>{totalItems}</Text>
                    </View>
                  )}
                </Pressable>
              </View>
            </View>

            {/* Onda na borda inferior do header */}
            <Svg
              width="100%"
              height={44}
              viewBox="0 0 390 44"
              preserveAspectRatio="none"
              style={{ marginTop: -1 }}>
              <Path
                d="M0,0 C65,44 130,44 195,22 C260,0 325,0 390,22 L390,0 L0,0 Z"
                fill={primary}
              />
            </Svg>

            {/* Carrossel de ofertas — só exibe se houver ofertas */}
            {!offersLoading && offers.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <FlatList
                  ref={carouselRef}
                  data={offers}
                  keyExtractor={(o) => o.id}
                  horizontal
                  pagingEnabled={false}
                  snapToInterval={SLIDE_WIDTH + 12}
                  snapToAlignment="start"
                  decelerationRate="fast"
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                  onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / (SLIDE_WIDTH + 12));
                    setActiveSlide(idx);
                  }}
                  getItemLayout={(_, index) => ({ length: SLIDE_WIDTH + 12, offset: (SLIDE_WIDTH + 12) * index, index })}
                  renderItem={({ item }) => (
                    <Pressable
                      style={({ pressed }) => [styles.carouselSlide, { width: SLIDE_WIDTH }, pressed && styles.carouselSlidePressed]}
                      onPress={() => setSelectedOffer(item)}>
                      {item.bannerImage ? (
                        <Image source={{ uri: item.bannerImage }} style={styles.carouselImage} />
                      ) : (
                        <View style={[styles.carouselImage, { backgroundColor: `${primary}18`, alignItems: 'center', justifyContent: 'center', gap: 6 }]}>
                          <Ionicons name="pricetag-outline" size={32} color={primary} />
                          <Text style={[styles.carouselFallbackText, { color: primary }]}>{item.title}</Text>
                        </View>
                      )}
                      <View style={styles.carouselOverlay}>
                        {item.discountPercentage ? (
                          <View style={[styles.carouselBadge, { backgroundColor: primary }]}>
                            <Text style={styles.carouselBadgeText}>-{item.discountPercentage}%</Text>
                          </View>
                        ) : null}
                        <Text style={styles.carouselTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.carouselProductName} numberOfLines={1}>Produto em oferta</Text>
                        {item.description ? <Text style={styles.carouselDesc} numberOfLines={1}>{item.description}</Text> : null}
                        <Text style={styles.carouselCta}>
                          Toque para ver a oferta
                        </Text>
                      </View>
                    </Pressable>
                  )}
                />
                {offers.length > 1 && (
                  <View style={styles.dotsRow}>
                    {offers.map((_offer, i) => (
                      <View
                        key={i}
                        style={[styles.dot, { backgroundColor: i === activeSlide ? primary : `${primary}40`, width: i === activeSlide ? 18 : 6 }]}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}

            <View style={styles.searchWrap}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={18} color="#9CA3AF" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Buscar produtos, categoria ou descrição"
                  placeholderTextColor="#9CA3AF"
                  style={styles.searchInput}
                />
                {searchQuery ? (
                  <Pressable onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                  </Pressable>
                ) : null}
              </View>
            </View>

            {favoriteProducts.length > 0 && (
              <View style={styles.quickSection}>
                <View style={styles.quickSectionHeader}>
                  <Text style={styles.quickSectionTitle}>Favoritos</Text>
                </View>
                <FlatList
                  horizontal
                  data={favoriteProducts}
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickList}
                  renderItem={({ item }) => (
                    <Pressable style={styles.quickCard} onPress={() => { setSelectedProduct(item); addRecentProduct(item); }}>
                      <Image source={{ uri: item.image }} style={styles.quickCardImage} />
                      <Text style={styles.quickCardTitle} numberOfLines={1}>{item.name}</Text>
                      <Text style={[styles.quickCardPrice, { color: primary }]}>R$ {item.price.toFixed(2)}</Text>
                    </Pressable>
                  )}
                />
              </View>
            )}

            {recentVisible.length > 0 && (
              <View style={styles.quickSection}>
                <View style={styles.quickSectionHeader}>
                  <Text style={styles.quickSectionTitle}>Vistos recentemente</Text>
                </View>
                <FlatList
                  horizontal
                  data={recentVisible}
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickList}
                  renderItem={({ item }) => (
                    <Pressable style={styles.quickCard} onPress={() => { setSelectedProduct(item); addRecentProduct(item); }}>
                      <Image source={{ uri: item.image }} style={styles.quickCardImage} />
                      <Text style={styles.quickCardTitle} numberOfLines={1}>{item.name}</Text>
                      <Text style={[styles.quickCardPrice, { color: primary }]}>R$ {item.price.toFixed(2)}</Text>
                    </Pressable>
                  )}
                />
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
                    style={[styles.categoryChip, active && { backgroundColor: primary, borderColor: primary }]}
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
            <View style={styles.center}>
              <ActivityIndicator size="large" color={primary} />
              <Text style={styles.loadingText}>Carregando produtos...</Text>
            </View>
          ) : (
            <View style={styles.center}>
              <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Nenhum produto encontrado</Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const qty = items.find((i) => i.product.id === item.id)?.quantity ?? 0;
          // Flag para evitar que o toque nos botões abra o modal do card
          let blockCardPress = false;
          return (
            <Pressable
              style={styles.card}
              onPress={() => { if (!blockCardPress) { setSelectedProduct(item); addRecentProduct(item); } }}>
              {item.hasOffer && (
                <View style={[styles.offerBadge, { backgroundColor: primary }]}>
                  <Text style={styles.offerBadgeText}>
                    {item.offerDetails?.discountPercentage ? `-${item.offerDetails.discountPercentage}%` : 'Oferta'}
                  </Text>
                </View>
              )}
              <Pressable
                style={[styles.favoriteBtn, isFavoriteProduct(item.id) && { backgroundColor: '#EF4444' }]}
                onPressIn={() => { blockCardPress = true; }}
                onPress={() => toggleFavoriteProduct(item)}
                onPressOut={() => { setTimeout(() => { blockCardPress = false; }, 50); }}>
                <Ionicons name={isFavoriteProduct(item.id) ? 'heart' : 'heart-outline'} size={14} color="#fff" />
              </Pressable>
              <Image source={{ uri: item.image }} style={styles.productImage} />
              <View style={styles.cardInfo}>
                <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                {item.hasOffer && item.offerDetails && (
                  <Text style={styles.originalPrice}>R$ {item.offerDetails.originalPrice.toFixed(2)}</Text>
                )}
                <Text style={[styles.productPrice, { color: primary }]}>
                  R$ {(Number(item.price) || 0).toFixed(2)}
                  {item.unit ? <Text style={styles.unit}> /{item.unit}</Text> : null}
                </Text>
              </View>
              {qty > 0 ? (
                <View style={styles.qtyControl}>
                  <Pressable
                    style={[styles.qtyBtn, { borderColor: `${primary}40` }]}
                    onPressIn={() => { blockCardPress = true; }}
                    onPress={() => { decrementItem(item.id); }}
                    onPressOut={() => { setTimeout(() => { blockCardPress = false; }, 50); }}>
                    <Ionicons name={qty === 1 ? 'trash-outline' : 'remove'} size={14} color={primary} />
                  </Pressable>
                  <Text style={styles.qtyText}>{qty}</Text>
                  <Pressable
                    style={[styles.qtyBtn, { backgroundColor: primary, borderColor: primary }]}
                    onPressIn={() => { blockCardPress = true; }}
                    onPress={() => { handleAddItem(item); }}
                    onPressOut={() => { setTimeout(() => { blockCardPress = false; }, 50); }}>
                    <Ionicons name="add" size={14} color="#fff" />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={[styles.addButton, { backgroundColor: primary }]}
                  onPressIn={() => { blockCardPress = true; }}
                  onPress={() => { handleAddItem(item); }}
                  onPressOut={() => { setTimeout(() => { blockCardPress = false; }, 50); }}>
                  <Ionicons name="add" size={18} color="#fff" />
                </Pressable>
              )}
            </Pressable>
          );
        }}
      />

      {/* Toast */}
      {toastProduct && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity, backgroundColor: primary }]}>
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={styles.toastText} numberOfLines={1}>{toastProduct} adicionado</Text>
        </Animated.View>
      )}

      {/* Modal quantidade por peso/volume */}
      <WeightQuantityModal
        visible={weightModalVisible}
        product={weightProduct}
        onConfirm={handleWeightConfirm}
        onClose={() => setWeightModalVisible(false)}
      />

      {/* Barra flutuante */}
      {totalItems > 0 && (
        <View style={[styles.cartBar, { paddingBottom: Math.max(insets.bottom + 24, 40) }]}>
          <Pressable style={[styles.cartBarBtn, { backgroundColor: primary }]} onPress={() => setCartPreviewVisible(true)}>
            <View style={styles.cartBarBadge}>
              <Text style={styles.cartBarBadgeText}>{totalItems}</Text>
            </View>
            <Text style={styles.cartBarText}>Ver carrinho</Text>
            <Text style={styles.cartBarPrice}>R$ {cartTotal.toFixed(2)}</Text>
          </Pressable>
        </View>
      )}

      {/* ── Popup prévia do carrinho ── */}
      <Modal visible={cartPreviewVisible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setCartPreviewVisible(false)}>
        <Pressable style={styles.previewOverlay} onPress={() => setCartPreviewVisible(false)}>
          <Pressable style={styles.previewSheet} onPress={() => {}}>
            <View style={styles.previewHandle} />
            <View style={styles.previewHeader}>
              <View style={styles.previewTitleRow}>
                <Ionicons name="bag-outline" size={20} color="#071B5A" />
                <Text style={styles.previewTitle}>Carrinho</Text>
              </View>
              <Pressable onPress={() => setCartPreviewVisible(false)}>
                <Ionicons name="close" size={22} color="#374151" />
              </Pressable>
            </View>
            <ScrollView style={styles.previewScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.previewScrollContent}>
              {items.map((cartItem, idx) => (
                <View key={cartItem.product.id}>
                  <View style={styles.previewItem}>
                    {cartItem.product.image ? (
                      <Image source={{ uri: cartItem.product.image }} style={styles.previewItemImage} />
                    ) : (
                      <View style={[styles.previewItemImage, { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="cube-outline" size={20} color="#D1D5DB" />
                      </View>
                    )}
                    <View style={styles.previewItemInfo}>
                      <Text style={styles.previewItemName} numberOfLines={2}>{cartItem.product.name}</Text>
                      <Text style={[styles.previewItemPrice, { color: primary }]}>
                        R$ {cartItem.product.price.toFixed(2)}{cartItem.product.unit ? ` /${cartItem.product.unit}` : ''}
                      </Text>
                    </View>
                    <View style={styles.previewQtyRow}>
                      <Pressable style={[styles.previewQtyBtn, { borderColor: `${primary}40` }]} onPress={() => removeItem(cartItem.product.id)}>
                        <Ionicons name={cartItem.quantity === 1 ? 'trash-outline' : 'remove'} size={14} color={cartItem.quantity === 1 ? '#EF4444' : primary} />
                      </Pressable>
                      <Text style={styles.previewQtyText}>{cartItem.quantity}</Text>
                      <Pressable style={[styles.previewQtyBtn, { backgroundColor: primary, borderColor: primary }]} onPress={() => addItem(cartItem.product)}>
                        <Ionicons name="add" size={14} color="#fff" />
                      </Pressable>
                    </View>
                  </View>
                  {idx < items.length - 1 && <View style={styles.previewDivider} />}
                </View>
              ))}
            </ScrollView>
            <View style={styles.previewTotals}>
              <View style={styles.previewTotalRow}>
                <Text style={styles.previewTotalLabel}>{totalItems} {totalItems === 1 ? 'item' : 'itens'}</Text>
                <Text style={[styles.previewTotalValue, { color: primary }]}>R$ {cartTotal.toFixed(2)}</Text>
              </View>
              <Pressable
                style={[styles.previewCheckoutBtn, { backgroundColor: primary }]}
                onPress={() => { setCartPreviewVisible(false); router.push('/app/carrinho'); }}>
                <Text style={styles.previewCheckoutBtnText}>Ir para o carrinho</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Sidebar ── */}
      <Modal visible={sidebarVisible} transparent animationType="none" statusBarTranslucent onRequestClose={closeSidebar}>
        <View style={styles.sidebarOverlayWrap}>
          {/* Painel lateral — esquerda */}
          <Animated.View style={[styles.sidebar, { transform: [{ translateX: sidebarAnim }] }]}>
            {/* Cabeçalho do sidebar */}
            <View style={[styles.sidebarHeader, { backgroundColor: primary }]}>
              <View style={styles.sidebarHeaderTop}>
                <Pressable onPress={closeSidebar}>
                  <Ionicons name="close" size={22} color="#fff" />
                </Pressable>
              </View>
              {userAvatar ? (
                <Image source={{ uri: userAvatar }} style={styles.sidebarAvatar} />
              ) : (
                <View style={[styles.sidebarAvatarFallback, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Text style={styles.sidebarAvatarInitial}>{userName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <Text style={styles.sidebarUserName}>{authSession?.user?.name ?? 'Cliente'}</Text>
              <Text style={styles.sidebarUserEmail} numberOfLines={1}>{userEmail}</Text>
            </View>

            {/* Itens do menu */}
            <ScrollView style={styles.sidebarBody} contentContainerStyle={styles.sidebarBodyContent}>
              <Text style={styles.sidebarSectionLabel}>CONTA</Text>

              <Pressable style={styles.sidebarItem} onPress={() => { closeSidebar(); setTimeout(() => router.push('/app/perfil'), 250); }}>
                <View style={[styles.sidebarItemIcon, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="person-outline" size={20} color="#3B82F6" />
                </View>
                <Text style={[styles.sidebarItemText, { color: '#111827' }]}>Meu perfil</Text>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </Pressable>

              <Pressable style={styles.sidebarItem} onPress={() => { closeSidebar(); setTimeout(() => router.push('/app/pedidos'), 250); }}>
                <View style={[styles.sidebarItemIcon, { backgroundColor: '#ECFEFF' }]}>
                  <Ionicons name="receipt-outline" size={20} color="#0891B2" />
                </View>
                <Text style={[styles.sidebarItemText, { color: '#111827' }]}>Meus pedidos</Text>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </Pressable>

              <Pressable style={styles.sidebarItem} onPress={() => { closeSidebar(); setTimeout(() => router.push('/app/favoritos'), 250); }}>
                <View style={[styles.sidebarItemIcon, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="heart-outline" size={20} color="#EF4444" />
                </View>
                <Text style={[styles.sidebarItemText, { color: '#111827' }]}>Favoritos</Text>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </Pressable>

              <Pressable style={styles.sidebarItem} onPress={handleLogout}>
                <View style={styles.sidebarItemIcon}>
                  <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                </View>
                <Text style={[styles.sidebarItemText, { color: '#EF4444' }]}>Sair da conta</Text>
                <Ionicons name="chevron-forward" size={16} color="#EF4444" />
              </Pressable>
            </ScrollView>

            {/* Rodapé */}
            <View style={styles.sidebarFooter}>
              <Text style={styles.sidebarFooterText}>{storeName}</Text>
            </View>
          </Animated.View>

          {/* Fundo escuro — direita */}
          <Pressable style={styles.sidebarBackdrop} onPress={closeSidebar} />
        </View>
      </Modal>

      {/* ── Modal detalhe do produto ── */}
      <Modal
        visible={!!selectedProduct}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setSelectedProduct(null)}>
        <View style={styles.detailOverlay}>
          <Pressable style={styles.detailBackdrop} onPress={() => setSelectedProduct(null)} />
          <View style={styles.detailSheet}>
            <View style={styles.detailTopBar}>
              <View style={styles.previewHandle} />
              <Pressable style={styles.detailCloseBtn} onPress={() => setSelectedProduct(null)}>
                <Ionicons name="close" size={18} color="#374151" />
              </Pressable>
            </View>

            {selectedProduct && (
              <>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={styles.detailScroll}
                  contentContainerStyle={styles.detailScrollContent}>

                  {/* Imagem */}
                  <View style={styles.detailGalleryRow}>
                    <Pressable style={styles.detailImageWrap} onPress={() => setFullImageVisible(true)}>
                      {getProductImages(selectedProduct).length > 0 ? (
                        <Image
                          source={{ uri: getProductImages(selectedProduct)[detailImageIndex] }}
                          style={styles.detailImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.detailImageFallback, { backgroundColor: '#F3F4F6' }]}>
                          <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
                          <Text style={styles.detailImageFallbackText}>Sem imagem</Text>
                        </View>
                      )}
                      <View style={styles.detailImageShade} />
                    </Pressable>

                    {getProductImages(selectedProduct).length > 1 ? (
                      <View style={styles.detailThumbRail}>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailThumbRailContent}>
                          {getProductImages(selectedProduct).map((uri, index) => (
                            <Pressable
                              key={`${uri}-${index}`}
                              style={[styles.detailThumb, index === detailImageIndex && styles.detailThumbActive]}
                              onPress={() => setDetailImageIndex(index)}>
                              <Image source={{ uri }} style={styles.detailThumbImage} resizeMode="cover" />
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    ) : null}
                  </View>

                  {/* Badge oferta */}
                  {selectedProduct.hasOffer && selectedProduct.offerDetails && (
                    <View style={[styles.detailOfferBadge, { backgroundColor: primary }]}>
                      <Ionicons name="pricetag-outline" size={12} color="#fff" />
                      <Text style={styles.detailOfferBadgeText}>
                        {selectedProduct.offerDetails.discountPercentage
                          ? `-${selectedProduct.offerDetails.discountPercentage}% de desconto`
                          : 'Oferta especial'}
                      </Text>
                    </View>
                  )}

                  {/* Nome + preço */}
                  <View style={styles.detailHeader}>
                    <Text style={styles.detailName}>{selectedProduct.name}</Text>
                    <View style={styles.detailPriceBlock}>
                      {selectedProduct.hasOffer && selectedProduct.offerDetails && (
                        <Text style={styles.detailOriginalPrice}>
                          R$ {selectedProduct.offerDetails.originalPrice.toFixed(2)}
                        </Text>
                      )}
                      <Text style={[styles.detailPrice, { color: primary }]}>
                        R$ {selectedProduct.price.toFixed(2)}
                        {selectedProduct.unit
                          ? <Text style={styles.detailUnit}> /{selectedProduct.unit}</Text>
                          : null}
                      </Text>
                    </View>
                  </View>

                  {/* Descrição */}
                  {selectedProduct.description ? (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Descrição</Text>
                      <Text style={styles.detailDescription}>{selectedProduct.description}</Text>
                    </View>
                  ) : null}

                  {/* Categoria + estoque */}
                  <View style={styles.detailMeta}>
                    {selectedProduct.category ? (
                      <View style={styles.detailMetaChip}>
                        <Ionicons name="grid-outline" size={13} color="#6B7280" />
                        <Text style={styles.detailMetaText}>{selectedProduct.category}</Text>
                      </View>
                    ) : null}
                    {selectedProduct.currentStock !== undefined && (
                      <View style={styles.detailMetaChip}>
                        <Ionicons
                          name="cube-outline"
                          size={13}
                          color={selectedProduct.currentStock > 0 ? '#10B981' : '#EF4444'}
                        />
                        <Text style={[
                          styles.detailMetaText,
                          { color: selectedProduct.currentStock > 0 ? '#10B981' : '#EF4444' },
                        ]}>
                          {selectedProduct.currentStock > 0
                            ? `${selectedProduct.currentStock} em estoque`
                            : 'Sem estoque'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Detalhes da oferta */}
                  {selectedProduct.hasOffer && selectedProduct.offerDetails && (
                    <View style={[styles.detailSection, { backgroundColor: `${primary}08`, borderRadius: 14, padding: 14 }]}>
                      <Text style={[styles.detailSectionTitle, { color: primary }]}>
                        {selectedProduct.offerDetails.title}
                      </Text>
                      {selectedProduct.offerDetails.description ? (
                        <Text style={styles.detailDescription}>{selectedProduct.offerDetails.description}</Text>
                      ) : null}
                      <Text style={styles.detailMetaText}>
                        Válido até {new Date(selectedProduct.offerDetails.endDate).toLocaleDateString('pt-BR')}
                      </Text>
                    </View>
                  )}
                </ScrollView>

                {/* Botão fixo no rodapé */}
                <View style={styles.detailFooter}>
                  {selectedProduct.currentStock !== undefined && selectedProduct.currentStock <= 0 ? (
                    <View style={[styles.detailAddBtn, { backgroundColor: '#E5E7EB' }]}>
                      <Text style={[styles.detailAddBtnText, { color: '#9CA3AF' }]}>Sem estoque</Text>
                    </View>
                  ) : (
                    <Pressable
                      style={[styles.detailAddBtn, { backgroundColor: primary }]}
                      onPress={() => {
                        handleAddItem(selectedProduct);
                        setSelectedProduct(null);
                      }}>
                      <Ionicons name="bag-add-outline" size={20} color="#fff" />
                      <Text style={styles.detailAddBtnText}>Adicionar ao carrinho</Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!selectedOffer}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setSelectedOffer(null)}>
        <View style={styles.detailOverlay}>
          <Pressable style={styles.detailBackdrop} onPress={() => setSelectedOffer(null)} />
          <View style={styles.detailSheet}>
            <View style={styles.detailTopBar}>
              <View style={styles.previewHandle} />
              <Pressable style={styles.detailCloseBtn} onPress={() => setSelectedOffer(null)}>
                <Ionicons name="close" size={18} color="#374151" />
              </Pressable>
            </View>

            {selectedOffer && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScrollContent}>
                <View style={styles.offerHero}>
                  {selectedOffer.bannerImage ? (
                    <Image source={{ uri: selectedOffer.bannerImage }} style={styles.offerHeroImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.offerHeroImage, { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="pricetag-outline" size={42} color="#9CA3AF" />
                    </View>
                  )}
                  <View style={[styles.offerHeroBadge, { backgroundColor: primary }]}>
                    <Text style={styles.offerHeroBadgeText}>
                      {selectedOffer.discountPercentage ? `-${selectedOffer.discountPercentage}% OFF` : 'Oferta'}
                    </Text>
                  </View>
                </View>

                <View style={styles.offerTextBlock}>
                  <Text style={styles.offerProductName}>{selectedOffer.title}</Text>
                  <Text style={styles.offerProductTag}>Produto em oferta</Text>
                  {selectedOffer.description ? (
                    <Text style={styles.offerDescription}>{selectedOffer.description}</Text>
                  ) : null}
                </View>

                <Pressable
                  style={[styles.offerActionBtn, { backgroundColor: primary }]}
                  onPress={() => {
                    const offer = selectedOffer;
                    if (!offer?.item) {
                      Alert.alert('Oferta', 'Essa oferta ainda não trouxe um produto para adicionar ao carrinho.');
                      setSelectedOffer(null);
                      return;
                    }
                    handleAddItem(offer.item);
                    setSelectedOffer(null);
                  }}>
                  <Ionicons name="bag-outline" size={18} color="#fff" />
                  <Text style={styles.offerActionBtnText}>Adicionar ao carrinho</Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={fullImageVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setFullImageVisible(false)}>
        <Pressable style={styles.fullImageOverlay} onPress={() => setFullImageVisible(false)}>
          <Pressable style={styles.fullImageCloseBtn} onPress={() => setFullImageVisible(false)}>
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>
          <Image
            source={{ uri: getProductImages(selectedProduct)[detailImageIndex] ?? selectedProduct?.image ?? '' }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </Pressable>
      </Modal>
    </View>
  );
}

function getProductImages(product: Product | null) {
  if (!product) return [];
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  return images.length > 0 ? images : (product.image ? [product.image] : []);
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },

  // Header
  headerWrap: { marginBottom: 8 },
  topBar: { paddingTop: 64, paddingHorizontal: 16, paddingBottom: 36 },
  topBarRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuBtn: { padding: 2 },
  avatarWrap: { position: 'relative' },
  userAvatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  userAvatarFallback: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  userAvatarInitial: { fontSize: 19, fontWeight: '900', color: '#fff' },
  greetingBlock: { flex: 1, gap: 3 },
  greetingHello: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  greetingName: { fontSize: 14, color: '#fff', fontWeight: '900' },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  storeLogo: { width: 14, height: 14, borderRadius: 3 },
  storeName: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  cartBtn: { position: 'relative', padding: 4 },
  cartBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: '#EF4444', borderRadius: 999,
    minWidth: 17, height: 17, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },
  cartBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  // Banner / Carrossel
  banner: { height: 160, backgroundColor: '#e5e7eb', marginHorizontal: 16, marginTop: 16, borderRadius: 20 },
  bannerFallback: { height: 160, marginHorizontal: 16, marginTop: 16, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 8 },
  bannerFallbackText: { fontSize: 15, fontWeight: '700' },
  carousel: { marginTop: 16 },
  carouselSlide: { height: 160, borderRadius: 20, overflow: 'hidden', position: 'relative' },
  carouselSlidePressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  carouselImage: { width: '100%', height: '100%' },
  carouselFallbackText: { fontSize: 15, fontWeight: '700' },
  carouselOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 12, paddingTop: 24,
    backgroundColor: 'rgba(0,0,0,0.28)',
    gap: 2,
  },
  carouselBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 4 },
  carouselBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  carouselTitle: { fontSize: 15, fontWeight: '900', color: '#fff' },
  carouselProductName: { fontSize: 12, color: 'rgba(255,255,255,0.92)', fontWeight: '800' },
  carouselDesc: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  carouselCta: { fontSize: 11, color: 'rgba(255,255,255,0.92)', fontWeight: '800', marginTop: 4 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 8 },
  dot: { height: 6, borderRadius: 3 },

  // Busca e atalhos
  searchWrap: { paddingHorizontal: 16, paddingTop: 16 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  quickSection: { paddingTop: 16 },
  quickSectionHeader: { paddingHorizontal: 16, marginBottom: 10 },
  quickSectionTitle: { fontSize: 15, fontWeight: '800', color: '#071B5A' },
  quickList: { paddingHorizontal: 16, gap: 10 },
  quickCard: {
    width: 124, backgroundColor: '#fff', borderRadius: 16, padding: 10, gap: 6,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  quickCardImage: { width: '100%', height: 72, borderRadius: 12, backgroundColor: '#F3F4F6' },
  quickCardTitle: { fontSize: 12, fontWeight: '700', color: '#111827' },
  quickCardPrice: { fontSize: 13, fontWeight: '900' },

  // Categorias
  categoriesList: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  categoryText: { fontWeight: '700', color: '#374151', fontSize: 13 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#071B5A', paddingHorizontal: 16, marginBottom: 4 },
  sectionCount: { fontSize: 14, fontWeight: '500', color: '#9CA3AF' },

  // Lista
  listContent: { paddingBottom: 100, gap: 12 },
  columnWrapper: { gap: 12, paddingHorizontal: 16 },
  center: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  loadingText: { color: '#6B7280', fontWeight: '600' },
  emptyText: { color: '#9CA3AF', fontWeight: '600', fontSize: 15 },

  // Card produto
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  offerBadge: { position: 'absolute', top: 8, left: 8, zIndex: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  offerBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  favoriteBtn: {
    position: 'absolute', top: 8, right: 8, zIndex: 2,
    width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(17,24,39,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  productImage: { height: 120, backgroundColor: '#F3F4F6' },
  cardInfo: { padding: 10, gap: 3, flex: 1 },
  productName: { fontSize: 13, fontWeight: '700', color: '#111827', lineHeight: 18 },
  originalPrice: { fontSize: 11, color: '#9CA3AF', textDecorationLine: 'line-through' },
  productPrice: { fontSize: 15, fontWeight: '900' },
  unit: { fontSize: 11, fontWeight: '500', color: '#9CA3AF' },
  addButton: { margin: 10, marginTop: 0, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', margin: 10, marginTop: 0, gap: 6 },
  qtyBtn: { width: 30, height: 30, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 14, fontWeight: '800', color: '#111827', minWidth: 20, textAlign: 'center' },

  // Toast
  toast: { position: 'absolute', bottom: 150, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  toastText: { color: '#fff', fontWeight: '700', fontSize: 14, maxWidth: 220 },

  // Barra flutuante
  cartBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32, backgroundColor: 'rgba(245,245,245,0.97)', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  cartBarBtn: { borderRadius: 16, paddingVertical: 14, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cartBarBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 999, minWidth: 26, height: 26, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  cartBarBadgeText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  cartBarText: { flex: 1, color: '#fff', fontWeight: '800', fontSize: 15 },
  cartBarPrice: { color: '#fff', fontWeight: '900', fontSize: 15 },

  // Popup carrinho
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  previewSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, maxHeight: '75%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 10 },
  previewHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 12 },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  previewTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewTitle: { fontSize: 17, fontWeight: '900', color: '#071B5A' },
  previewScroll: { flexGrow: 0 },
  previewScrollContent: { paddingHorizontal: 20, paddingVertical: 8 },
  previewItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  previewItemImage: { width: 56, height: 56, borderRadius: 12 },
  previewItemInfo: { flex: 1, gap: 3 },
  previewItemName: { fontSize: 13, fontWeight: '700', color: '#111827', lineHeight: 18 },
  previewItemPrice: { fontSize: 13, fontWeight: '800' },
  previewQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewQtyBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  previewQtyText: { fontSize: 14, fontWeight: '800', color: '#111827', minWidth: 16, textAlign: 'center' },
  previewDivider: { height: 1, backgroundColor: '#F9FAFB' },
  previewTotals: { padding: 20, paddingBottom: 36, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 12 },
  previewTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewTotalLabel: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  previewTotalValue: { fontSize: 20, fontWeight: '900' },
  previewCheckoutBtn: { borderRadius: 16, paddingVertical: 14, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  previewCheckoutBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  // Sidebar
  sidebarOverlayWrap: { flex: 1, flexDirection: 'row' },
  sidebarBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sidebar: { width: 280, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 4, height: 0 }, elevation: 12 },
  sidebarHeader: { paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16, gap: 4 },
  sidebarHeaderTop: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 },
  sidebarAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  sidebarAvatarFallback: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sidebarAvatarInitial: { fontSize: 18, fontWeight: '900', color: '#fff' },
  sidebarUserName: { fontSize: 14, fontWeight: '900', color: '#fff', marginTop: 2 },
  sidebarUserEmail: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  sidebarBody: { flex: 1 },
  sidebarBodyContent: { padding: 16, gap: 4 },
  sidebarSectionLabel: { fontSize: 11, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  sidebarItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 14 },
  sidebarItemIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  sidebarItemText: { flex: 1, fontSize: 15, fontWeight: '700' },
  sidebarFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  sidebarFooterText: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', textAlign: 'center' },

  // Modal detalhe produto
  detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  detailBackdrop: { ...StyleSheet.absoluteFillObject },
  detailSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%', overflow: 'hidden', flex: 1 },
  detailTopBar: { paddingTop: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  offerHero: { borderRadius: 22, overflow: 'hidden', position: 'relative' },
  offerHeroImage: { width: '100%', height: 200 },
  offerHeroBadge: {
    position: 'absolute',
    left: 12,
    top: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  offerHeroBadgeText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  offerTextBlock: { gap: 4 },
  offerProductName: { fontSize: 20, fontWeight: '900', color: '#071B5A', lineHeight: 26 },
  offerProductTag: { fontSize: 12, fontWeight: '800', color: '#6B7280' },
  offerDescription: { fontSize: 14, color: '#374151', lineHeight: 21 },
  offerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 15,
  },
  offerActionBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  detailGalleryRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  detailImageWrap: {
    flex: 1,
    height: 260,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  detailImage: { width: '100%', height: '100%' },
  detailImageShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 90,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  detailImageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  detailImageFallbackText: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  detailThumbRail: { width: 66, height: 260 },
  detailThumbRailContent: { gap: 6, paddingBottom: 6 },
  detailThumb: {
    width: 66,
    height: 58,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#F3F4F6',
  },
  detailThumbActive: { borderColor: '#071B5A' },
  detailThumbImage: { width: '100%', height: '100%' },
  detailOfferBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginHorizontal: 16, marginTop: 16, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  detailOfferBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  detailScroll: { flex: 1 },
  detailScrollContent: { padding: 16, gap: 14, paddingBottom: 8, flexGrow: 1 },
  detailHeader: { gap: 6 },
  detailName: { fontSize: 20, fontWeight: '900', color: '#071B5A', lineHeight: 26 },
  detailPriceBlock: { gap: 2 },
  detailOriginalPrice: { fontSize: 13, color: '#9CA3AF', textDecorationLine: 'line-through' },
  detailPrice: { fontSize: 26, fontWeight: '900' },
  detailUnit: { fontSize: 14, fontWeight: '500', color: '#9CA3AF' },
  detailSection: { gap: 6 },
  detailSectionTitle: { fontSize: 13, fontWeight: '800', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailDescription: { fontSize: 14, color: '#6B7280', lineHeight: 21 },
  detailMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailMetaChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  detailMetaText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  detailFooter: { padding: 16, paddingBottom: 36, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  detailAddBtn: { borderRadius: 16, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  detailAddBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  detailCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImageOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  fullImageCloseBtn: {
    position: 'absolute',
    top: 44,
    right: 20,
    zIndex: 2,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: { width: '100%', height: '100%' },
});
