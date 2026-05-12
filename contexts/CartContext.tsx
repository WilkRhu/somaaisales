import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '@/storage';
import { CartItem, Product } from '@/types';

type CartContextValue = {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (id: string) => void;
  totalItems: number;
  totalPrice: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(storage.cartKey).then((raw: string | null) => raw && setItems(JSON.parse(raw)));
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(storage.cartKey, JSON.stringify(items));
  }, [items]);

  const addItem = (product: Product) => setItems((current) => [...current, { product, quantity: 1 }]);
  const removeItem = (id: string) => setItems((current) => current.filter((item) => item.product.id !== id));

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: items.reduce((sum, item) => sum + item.quantity * item.product.price, 0),
    }),
    [items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used within CartProvider');
  return value;
};
