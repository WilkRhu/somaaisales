import { StyleSheet, Text, View } from 'react-native';
export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return <View style={styles.wrap}><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>;
}
const styles = StyleSheet.create({ wrap: { gap: 6 }, title: { fontSize: 26, fontWeight: '800', color: '#111827' }, subtitle: { color: '#6b7280' } });
