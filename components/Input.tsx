import { StyleSheet, Text, TextInput, View } from 'react-native';
export function Input(props: any) {
  return <View><Text style={styles.label}>{props.label}</Text><TextInput {...props} style={styles.input} /></View>;
}
const styles = StyleSheet.create({ label: { marginBottom: 8, color: '#111827', fontWeight: '600' }, input: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' } });
