import { Image, StyleSheet, Text, View } from 'react-native';
export default function ProductDetailScreen() {
  return <View style={styles.container}><Image source={{ uri: 'https://images.unsplash.com/photo-1563379091339-03246963d8c3?w=800' }} style={styles.image} /><Text style={styles.title}>Produto detalhado</Text><Text style={styles.text}>Arquitetura pronta para variações por tenant, favoritos, promoções e checkout com PIX.</Text></View>;
}
const styles = StyleSheet.create({ container: { flex: 1, padding: 16, backgroundColor: '#f7f7f8' }, image: { height: 280, borderRadius: 24 }, title: { fontSize: 24, fontWeight: '800', marginTop: 16 }, text: { marginTop: 10, color: '#6b7280' } });
