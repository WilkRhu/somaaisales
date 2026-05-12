import { StyleSheet, Text, View } from 'react-native';
export default function CheckoutScreen() { return <View style={styles.container}><Text style={styles.title}>Checkout</Text><Text>Estrutura preparada para PIX, endereço, entrega e pagamento.</Text></View>; }
const styles = StyleSheet.create({ container: { flex: 1, padding: 16 }, title: { fontSize: 24, fontWeight: '800' } });
