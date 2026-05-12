import { StyleSheet, Text, View } from 'react-native';
export default function PromotionsScreen() { return <View style={styles.container}><Text style={styles.title}>Promoções</Text></View>; }
const styles = StyleSheet.create({ container: { flex: 1, padding: 16 }, title: { fontSize: 24, fontWeight: '800' } });
