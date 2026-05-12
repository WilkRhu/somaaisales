import { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
export function Screen({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle?: string }>) {
  const theme = useTheme();
  return <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}><Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}{children}</ScrollView>;
}
const styles = StyleSheet.create({ container: { flex: 1 }, content: { padding: 20, gap: 16 }, title: { fontSize: 28, fontWeight: '800' }, subtitle: { color: '#6b7280', lineHeight: 22 } });
