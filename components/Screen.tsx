import { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
export function Screen({
  title,
  subtitle,
  children,
  scrollable = true,
}: PropsWithChildren<{ title: string; subtitle?: string; scrollable?: boolean }>) {
  const theme = useTheme();
  const Container = scrollable ? ScrollView : View;

  return (
    <Container
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={scrollable ? styles.content : undefined}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </Container>
  );
}
const styles = StyleSheet.create({ container: { flex: 1 }, content: { padding: 20, gap: 16 }, title: { fontSize: 28, fontWeight: '800' }, subtitle: { color: '#6b7280', lineHeight: 22 } });
