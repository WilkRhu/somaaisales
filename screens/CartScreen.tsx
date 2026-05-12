import { StyleSheet, Text, View } from 'react-native';
import { useCart } from '@/contexts/CartContext';
export default function CartScreen() {
  const { totalPrice } = useCart();
  return <View style={styles.container}><Text style={styles.title}>Carrinho</Text><Text>Total: R$ {totalPrice.toFixed(2)}</Text></View>;
}
const styles = StyleSheet.create({ container: { flex: 1, padding: 16 }, title: { fontSize: 24, fontWeight: '800' } });
