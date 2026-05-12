import { Pressable, StyleSheet, Text } from 'react-native';
export function Button({ title, onPress, loading }: { title: string; onPress: () => void; loading?: boolean }) {
  return <Pressable onPress={onPress} style={styles.button}><Text style={styles.text}>{loading ? 'Carregando...' : title}</Text></Pressable>;
}
const styles = StyleSheet.create({ button: { backgroundColor: '#16a34a', padding: 16, borderRadius: 16, alignItems: 'center' }, text: { color: '#fff', fontWeight: '700' } });
