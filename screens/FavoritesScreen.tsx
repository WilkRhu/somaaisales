import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';

import { useCart } from '@/contexts/CartContext';
import { useTenant } from '@/contexts/TenantContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppStore } from '@/store';
import { Product } from '@/types';

const EMPTY_PRODUCTS: Product[] = [];

export default function FavoritesScreen() {
  const theme = useTheme();
  const { tenant } = useTenant();
  const primary = theme.colors.primary;
  const favoriteProducts = useAppStore((s) => s.favoriteProductsByScope[tenant?.id ?? 'default'] ?? EMPTY_PRODUCTS);
  const toggleFavoriteProduct = useAppStore((s) => s.toggleFavoriteProduct);
  const addRecentProduct = useAppStore((s) => s.addRecentProduct);
  const { addItem } = useCart();

  const handleOpenProduct = (product: Product) => {
    addRecentProduct(product);
    router.push('/app/catalogo');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={primary} />

      <View style={[styles.header, { backgroundColor: primary }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Favoritos</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{favoriteProducts.length}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {favoriteProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={52} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Você ainda não salvou favoritos</Text>
            <Text style={styles.emptyText}>Toque no coração dos produtos para mantê-los aqui.</Text>
            <Pressable style={[styles.emptyBtn, { backgroundColor: primary }]} onPress={() => router.replace('/app/home')}>
              <Text style={styles.emptyBtnText}>Ver produtos</Text>
            </Pressable>
          </View>
        ) : (
          favoriteProducts.map((product) => (
            <Pressable key={product.id} style={styles.card} onPress={() => handleOpenProduct(product)}>
              <Image source={{ uri: product.image }} style={styles.image} />
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
                <Text style={styles.category}>{product.category}</Text>
                <Text style={[styles.price, { color: primary }]}>R$ {product.price.toFixed(2)}</Text>
              </View>
              <View style={styles.actions}>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: primary }]}
                  onPress={(e) => { e.stopPropagation(); addItem(product); }}>
                  <Ionicons name="bag-add-outline" size={18} color="#fff" />
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, styles.removeBtn]}
                  onPress={(e) => { e.stopPropagation(); toggleFavoriteProduct(product); }}>
                  <Ionicons name="heart" size={18} color="#EF4444" />
                </Pressable>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    paddingTop: 64, paddingBottom: 20, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '900', color: '#fff' },
  headerBadge: {
    minWidth: 30, height: 30, borderRadius: 15,
    paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  headerBadgeText: { color: '#fff', fontWeight: '800' },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  emptyState: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center',
    gap: 10, minHeight: 320, justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#071B5A', textAlign: 'center' },
  emptyText: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  emptyBtn: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 20, marginTop: 8 },
  emptyBtnText: { color: '#fff', fontWeight: '800' },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 12, flexDirection: 'row',
    gap: 12, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  image: { width: 72, height: 72, borderRadius: 16, backgroundColor: '#F3F4F6' },
  info: { flex: 1, gap: 4 },
  name: { fontSize: 14, fontWeight: '800', color: '#111827' },
  category: { fontSize: 12, color: '#6B7280' },
  price: { fontSize: 16, fontWeight: '900' },
  actions: { gap: 8 },
  actionBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  removeBtn: { backgroundColor: '#FEF2F2' },
});
