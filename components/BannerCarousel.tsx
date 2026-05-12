import { Image, ScrollView, StyleSheet } from 'react-native';
export function BannerCarousel({ banners }: { banners: string[] }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>{banners.map((uri) => <Image key={uri} source={{ uri }} style={styles.banner} />)}</ScrollView>;
}
const styles = StyleSheet.create({ row: { gap: 12 }, banner: { width: 300, height: 160, borderRadius: 24, backgroundColor: '#d1fae5' } });
