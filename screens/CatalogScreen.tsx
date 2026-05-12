import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { mockProducts } from '@/utils/mockData';
export default function CatalogScreen() {
  return <FlatList data={mockProducts} keyExtractor={(i) => i.id} contentContainerStyle={styles.content} renderItem={({ item }) => <View style={styles.card}><Image source={{ uri: item.image }} style={styles.image} /><Text style={styles.name}>{item.name}</Text><Text>R$ {item.price.toFixed(2)}</Text></View>} />;
}
const styles = StyleSheet.create({ content: { padding: 16, gap: 12 }, card: { backgroundColor: '#fff', borderRadius: 20, padding: 12 }, image: { height: 140, borderRadius: 16 }, name: { fontWeight: '700', marginTop: 8 } });
