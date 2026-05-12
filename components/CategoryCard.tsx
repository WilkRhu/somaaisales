import { Pressable, StyleSheet, Text } from 'react-native';
export function CategoryCard({ label, active }: { label: string; active?: boolean }) {
  return <Pressable style={[styles.card, active && styles.active]}><Text style={[styles.text, active && styles.textActive]}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({ card: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: '#fff' }, active: { backgroundColor: '#111827' }, text: { fontWeight: '600' }, textActive: { color: '#fff' } });
