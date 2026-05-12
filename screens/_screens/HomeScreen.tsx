import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useCart } from '@/contexts/CartContext';
import { useTenant } from '@/contexts/TenantContext';
import { mockProducts } from '@/utils/mockData';

const categories = ['Mercearia', 'Bebidas', 'Padaria', 'Higiene', 'Ofertas'];

export default function HomeScreen() {
  const { tenant } = useTenant();
  const { totalItems } = useCart();

  return (
    <View style={styles.container}>
      <FlatList
        data={mockProducts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.brand}>{tenant?.nome ?? 'SomaAI Vendas'}</Text>
            <Image source={{ uri: tenant?.banner }} style={styles.banner} />
            <FlatList horizontal data={categories} keyExtractor={(item) => item} renderItem={({ item }) => <Pressable style={styles.category}><Text style={styles.categoryText}>{item}</Text></Pressable>} showsHorizontalScrollIndicator={false} />
            <Text style={styles.section}>Produtos em destaque</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/app/produto/${item.id}`)}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.price}>R$ {item.price.toFixed(2)}</Text>
          </Pressable>
        )}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ padding: 16, gap: 12 }}
      />
      <Pressable style={styles.fab} onPress={() => router.push('/app/carrinho')}>
        <Text style={styles.fabText}>Carrinho {totalItems}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f8' },
  header: { gap: 14 },
  brand: { fontSize: 28, fontWeight: '800', color: '#111827' },
  banner: { height: 180, borderRadius: 24, backgroundColor: '#d1fae5' },
  category: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: '#fff', marginRight: 10 },
  categoryText: { fontWeight: '600', color: '#111827' },
  section: { marginTop: 8, fontSize: 18, fontWeight: '700' },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 12, gap: 8 },
  image: { height: 120, borderRadius: 16, backgroundColor: '#eee' },
  name: { fontWeight: '700', color: '#111827' },
  price: { color: '#16a34a', fontWeight: '800' },
  fab: { position: 'absolute', right: 16, bottom: 24, backgroundColor: '#111827', paddingHorizontal: 18, paddingVertical: 14, borderRadius: 999 },
  fabText: { color: '#fff', fontWeight: '700' },
});
