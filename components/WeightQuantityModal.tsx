import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    Keyboard,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { Product } from '@/types';

type Props = {
  visible: boolean;
  product: Product | null;
  onConfirm: (product: Product, quantity: number) => void;
  onClose: () => void;
};

const QUICK_OPTIONS: Record<string, number[]> = {
  kg: [0.25, 0.5, 1, 2],
  g: [100, 250, 500, 1000],
  l: [0.5, 1, 1.5, 2],
};

export function WeightQuantityModal({ visible, product, onConfirm, onClose }: Props) {
  const theme = useTheme();
  const primary = theme.colors.primary;
  const [inputValue, setInputValue] = useState('');

  const unit = product?.unit ?? 'kg';
  const quickOpts = QUICK_OPTIONS[unit] ?? QUICK_OPTIONS.kg;

  useEffect(() => {
    if (visible) setInputValue('');
  }, [visible]);

  const parsedQty = parseFloat(inputValue.replace(',', '.'));
  const isValid = !isNaN(parsedQty) && parsedQty > 0;

  const handleConfirm = () => {
    if (!product || !isValid) return;
    Keyboard.dismiss();
    onConfirm(product, parsedQty);
    onClose();
  };

  const handleQuickSelect = (qty: number) => {
    if (!product) return;
    onConfirm(product, qty);
    onClose();
  };

  const subtotal = isValid ? parsedQty * (product?.price ?? 0) : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          <Text style={styles.title}>Quanto você quer?</Text>
          <Text style={styles.productName} numberOfLines={2}>
            {product?.name}
          </Text>
          <Text style={[styles.pricePerUnit, { color: primary }]}>
            R$ {(product?.price ?? 0).toFixed(2)} / {unit}
          </Text>

          {/* Quick options */}
          <View style={styles.quickRow}>
            {quickOpts.map((qty) => (
              <Pressable
                key={qty}
                style={[styles.quickBtn, { borderColor: primary }]}
                onPress={() => handleQuickSelect(qty)}>
                <Text style={[styles.quickBtnText, { color: primary }]}>
                  {unit === 'g' ? `${qty}g` : `${qty} ${unit}`}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Custom input */}
          <Text style={styles.orLabel}>ou digite a quantidade:</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { borderColor: isValid || !inputValue ? '#E5E7EB' : '#EF4444' }]}
              value={inputValue}
              onChangeText={setInputValue}
              placeholder={`Ex: ${unit === 'g' ? '500' : '0.5'}`}
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
              autoFocus
            />
            <Text style={styles.unitLabel}>{unit}</Text>
          </View>

          {isValid && (
            <Text style={styles.subtotal}>
              Subtotal: <Text style={{ color: primary }}>R$ {subtotal.toFixed(2)}</Text>
            </Text>
          )}

          <Pressable
            style={[styles.confirmBtn, { backgroundColor: isValid ? primary : '#D1D5DB' }]}
            onPress={handleConfirm}
            disabled={!isValid}>
            <Ionicons name="cart-outline" size={18} color="#fff" />
            <Text style={styles.confirmBtnText}>Adicionar ao carrinho</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}


const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  pricePerUnit: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  quickBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  orLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  unitLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  subtotal: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 16,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
