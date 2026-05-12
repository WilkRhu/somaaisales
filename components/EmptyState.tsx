import { StyleSheet, Text, View } from 'react-native';
export function EmptyState({ title, description }: { title: string; description: string }) {
  return <View style={styles.wrap}><Text style={styles.title}>{title}</Text><Text style={styles.description}>{description}</Text></View>;
}
const styles = StyleSheet.create({ wrap: { padding: 24, alignItems: 'center', gap: 8 }, title: { fontWeight: '800', fontSize: 18 }, description: { color: '#6b7280', textAlign: 'center' } });
