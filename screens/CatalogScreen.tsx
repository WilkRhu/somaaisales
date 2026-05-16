import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useCart } from '@/contexts/CartContext';
import { useAppStore } from '@/store';
import { mockProducts } from '@/utils/mockData';

export default function CatalogScreen() {
  const { addItem } = useCart();
  const favoriteProducts = useAppStore((s) => s.favoriteProducts);
  const toggleFavoriteProduct = useAppStore((s) => s.toggleFavoriteProduct);
  const isFavoriteProduct = useAppStore((s) => s.isFavoriteProduct);
  const addRecentProduct = useAppStore((s) => s.addRecentProduct);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyOffers, setOnlyOffers] = useState(false);
  const [onlyStocked, setOnlyStocked] = useState(false);

  const products = useMemo(() => {
    return mockProducts.filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || [item.name, item.category, item.description].filter(Boolean).some((value) => String(value).toLowerCase().includes(q));
      const matchesFavorites = !onlyFavorites || favoriteProducts.some((p) => p.id === item.id);
      const matchesOffers = !onlyOffers || Boolean(item.hasOffer || item.offerPrice);
      const matchesStock = !onlyStocked || (item.currentStock ?? 0) > 0;
      return matchesSearch && matchesFavorites && matchesOffers && matchesStock;
    });
  }, [favoriteProducts, onlyFavorites, onlyOffers, onlyStocked, searchQuery]);

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar no catálogo"
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
        />
      </View>

      <View style={styles.filtersRow}>
        <FilterChip label="Favoritos" active={onlyFavorites} onPress={() => setOnlyFavorites((v) => !v)} />
        <FilterChip label="Promoções" active={onlyOffers} onPress={() => setOnlyOffers((v) => !v)} />
        <FilterChip label="Em estoque" active={onlyStocked} onPress={() => setOnlyStocked((v) => !v)} />
      </View>

      <FlatList
        data={products}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.content}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum produto encontrado</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => addRecentProduct(item)}>
            <View style={styles.imageWrap}>
              <Image source={{ uri: item.image }} style={styles.image} />
              <Pressable
                style={[styles.favoriteBtn, isFavoriteProduct(item.id) && styles.favoriteBtnActive]}
                onPress={() => toggleFavoriteProduct(item)}>
                <Ionicons name={isFavoriteProduct(item.id) ? 'heart' : 'heart-outline'} size={14} color="#fff" />
              </Pressable>
            </View>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.category}>{item.category}</Text>
            <Text style={styles.price}>R$ {item.price.toFixed(2)}</Text>
            <Pressable style={styles.addBtn} onPress={() => addItem(item)}>
              <Text style={styles.addBtnText}>Adicionar</Text>
            </Pressable>
          </Pressable>
        )}
      />
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', paddingTop: 16 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16,
    backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  filtersRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, flexWrap: 'wrap' },
  filterChip: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  filterChipActive: { backgroundColor: '#071B5A', borderColor: '#071B5A' },
  filterChipText: { fontSize: 12, fontWeight: '700', color: '#374151' },
  filterChipTextActive: { color: '#fff' },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  empty: { textAlign: 'center', color: '#6B7280', fontWeight: '600', marginTop: 24 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 12, gap: 8 },
  imageWrap: { position: 'relative' },
  image: { height: 140, borderRadius: 16, backgroundColor: '#F3F4F6' },
  favoriteBtn: {
    position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(17,24,39,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  favoriteBtnActive: { backgroundColor: '#EF4444' },
  name: { fontWeight: '700', marginTop: 8, color: '#111827' },
  category: { fontSize: 12, color: '#6B7280' },
  price: { fontSize: 16, fontWeight: '900', color: '#071B5A' },
  addBtn: { backgroundColor: '#071B5A', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '800' },
});
