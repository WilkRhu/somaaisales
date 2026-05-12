import { Image, Pressable, StyleSheet, Text } from 'react-native';
import { Product } from '@/types';
export function ProductCard({ product, onPress }: { product: Product; onPress?: () => void }) {
  return <Pressable onPress={onPress} style={styles.card}><Image source={{ uri: product.image }} style={styles.image} /><Text style={styles.name}>{product.name}</Text><Text style={styles.price}>R$ {product.price.toFixed(2)}</Text></Pressable>;
}
const styles = StyleSheet.create({ card: { flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 12, gap: 8 }, image: { height: 120, borderRadius: 16 }, name: { fontWeight: '700' }, price: { color: '#16a34a', fontWeight: '800' } });
