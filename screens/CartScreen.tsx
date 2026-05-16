import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderWave } from '@/components/HeaderWave';
import { useCart } from '@/contexts/CartContext';
import { useTenant } from '@/contexts/TenantContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppStore } from '@/store';

export default function CartScreen() {
  const { items, addItem, removeItem, totalItems, totalPrice } = useCart();
  const { tenant } = useTenant();
  const appConsumerConfig = useAppStore((state) => state.appConsumerConfig);
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const primaryColor = theme.colors.primary;
  const storeName = appConsumerConfig?.establishmentName ?? tenant?.nome ?? 'SomaAI Sales';

  const isEmpty = items.length === 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={primaryColor} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: primaryColor }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Meu carrinho</Text>
          <Text style={styles.headerSub}>{storeName}</Text>
        </View>
        {totalItems > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{totalItems}</Text>
          </View>
        )}
      </View>
      <HeaderWave color={primaryColor} />

      {isEmpty ? (
        /* Estado vazio */
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIcon, { backgroundColor: `${primaryColor}12` }]}>
            <Ionicons name="bag-outline" size={48} color={primaryColor} />
          </View>
          <Text style={styles.emptyTitle}>Carrinho vazio</Text>
          <Text style={styles.emptySub}>Adicione produtos para continuar</Text>
          <Pressable
            style={[styles.emptyButton, { backgroundColor: primaryColor }]}
            onPress={() => router.back()}>
            <Text style={styles.emptyButtonText}>Ver produtos</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>

            {/* Itens */}
            <View style={styles.itemsCard}>
              {items.map((cartItem, index) => (
                <View key={cartItem.product.id}>
                  <View style={styles.item}>
                    <Image source={{ uri: cartItem.product.image }} style={styles.itemImage} />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={2}>{cartItem.product.name}</Text>
                      <Text style={[styles.itemPrice, { color: primaryColor }]}>
                        R$ {(cartItem.product.price * cartItem.quantity).toFixed(2)}
                      </Text>
                      <Text style={styles.itemUnitPrice}>
                        R$ {cartItem.product.price.toFixed(2)} / un
                      </Text>
                    </View>
                    <View style={styles.qtyControl}>
                      <Pressable
                        style={[styles.qtyButton, { borderColor: `${primaryColor}40` }]}
                        onPress={() => removeItem(cartItem.product.id)}>
                        <Ionicons
                          name={cartItem.quantity === 1 ? 'trash-outline' : 'remove'}
                          size={16}
                          color={cartItem.quantity === 1 ? '#EF4444' : primaryColor}
                        />
                      </Pressable>
                      <Text style={styles.qtyText}>{cartItem.quantity}</Text>
                      <Pressable
                        style={[styles.qtyButton, { backgroundColor: primaryColor, borderColor: primaryColor }]}
                        onPress={() => addItem(cartItem.product)}>
                        <Ionicons name="add" size={16} color="#fff" />
                      </Pressable>
                    </View>
                  </View>
                  {index < items.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>

            {/* Resumo */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Resumo do pedido</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal ({totalItems} {totalItems === 1 ? 'item' : 'itens'})</Text>
                <Text style={styles.summaryValue}>R$ {totalPrice.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Entrega</Text>
                <Text style={[styles.summaryValue, { color: '#10B981' }]}>Grátis</Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotal}>Total</Text>
                <Text style={[styles.summaryTotalValue, { color: primaryColor }]}>
                  R$ {totalPrice.toFixed(2)}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Botão finalizar */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
            <Pressable
              style={[styles.checkoutButton, { backgroundColor: primaryColor }]}
              onPress={() => router.push('/app/checkout')}>
              <Text style={styles.checkoutButtonText}>Finalizar pedido</Text>
              <View style={styles.checkoutArrow}>
                <Ionicons name="arrow-forward" size={18} color={primaryColor} />
              </View>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },

  // Header
  header: {
    paddingTop: 52, paddingBottom: 20, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backButton: { padding: 4 },
  headerCenter: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  headerBadgeText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  // Vazio
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#071B5A' },
  emptySub: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  emptyButton: {
    borderRadius: 14, paddingVertical: 13, paddingHorizontal: 32, marginTop: 8,
  },
  emptyButtonText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Lista
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 32 },

  // Card itens
  itemsCard: {
    backgroundColor: '#fff', borderRadius: 20,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  item: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  itemImage: { width: 72, height: 72, borderRadius: 14, backgroundColor: '#F3F4F6' },
  itemInfo: { flex: 1, gap: 3 },
  itemName: { fontSize: 14, fontWeight: '700', color: '#111827', lineHeight: 19 },
  itemPrice: { fontSize: 16, fontWeight: '900' },
  itemUnitPrice: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyButton: {
    width: 32, height: 32, borderRadius: 10, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyText: { fontSize: 15, fontWeight: '800', color: '#111827', minWidth: 20, textAlign: 'center' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 14 },

  // Resumo
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  summaryTitle: { fontSize: 15, fontWeight: '800', color: '#071B5A' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  summaryDivider: { height: 1, backgroundColor: '#F3F4F6' },
  summaryTotal: { fontSize: 16, fontWeight: '800', color: '#071B5A' },
  summaryTotalValue: { fontSize: 20, fontWeight: '900' },

  // Footer
  footer: {
    padding: 16, paddingBottom: 32, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  checkoutButton: {
    borderRadius: 16, paddingVertical: 15, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  checkoutButtonText: { color: '#fff', fontWeight: '800', fontSize: 16, flex: 1, textAlign: 'center' },
  checkoutArrow: {
    backgroundColor: '#fff', width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
});
