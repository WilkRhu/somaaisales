import { ActivityIndicator, StyleSheet, View } from 'react-native';
export function Loading() { return <View style={styles.wrap}><ActivityIndicator size="large" color="#16a34a" /></View>; }
const styles = StyleSheet.create({ wrap: { padding: 24, alignItems: 'center', justifyContent: 'center' } });
