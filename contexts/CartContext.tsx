import { getCartTotals, useAppStore } from '@/store';
import { CartItem, Product } from '@/types';
import { createContext, PropsWithChildren, useContext, useMemo } from 'react';

type CartContextValue = {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (id: string) => void;
  decrementItem: (id: string) => void;
  totalItems: number;
  totalPrice: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: PropsWithChildren) {
  const items = useAppStore((state) => state.cartItems);
  const addItem = useAppStore((state) => state.addToCart);
  const removeItem = useAppStore((state) => state.removeFromCart);
  const decrementItem = useAppStore((state) => state.decrementFromCart);
  const totals = useMemo(() => getCartTotals(items), [items]);

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      decrementItem,
      totalItems: totals.totalItems,
      totalPrice: totals.totalPrice,
    }),
    [items, addItem, removeItem, decrementItem, totals.totalItems, totals.totalPrice],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used within CartProvider');
  return value;
};
