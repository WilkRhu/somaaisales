import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { AppConsumerConfig, AuthSession, CartItem, Product, Tenant } from '@/types';

type AppState = {
  tenant: Tenant | null;
  appConsumerConfig: AppConsumerConfig | null;
  authSession: AuthSession | null;
  cartItems: CartItem[];
  favoriteProducts: Product[];
  recentProducts: Product[];
  loadingTenant: boolean;
  setTenant: (tenant: Tenant | null) => void;
  setAppConsumerConfig: (config: AppConsumerConfig | null) => void;
  setAuthSession: (session: AuthSession | null) => void;
  setLoadingTenant: (loading: boolean) => void;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  decrementFromCart: (productId: string) => void;
  clearCart: () => void;
  toggleFavoriteProduct: (product: Product) => void;
  isFavoriteProduct: (productId: string) => boolean;
  addRecentProduct: (product: Product) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      tenant: null,
      appConsumerConfig: null,
      authSession: null,
      cartItems: [],
      favoriteProducts: [],
      recentProducts: [],
      loadingTenant: true,
      setTenant: (tenant) => set({ tenant }),
      setAppConsumerConfig: (appConsumerConfig) => set({ appConsumerConfig }),
      setAuthSession: (authSession) => set({ authSession }),
      setLoadingTenant: (loading) => set({ loadingTenant: loading }),
      addToCart: (product) =>
        set((state) => {
          const existing = state.cartItems.find((item) => item.product.id === product.id);
          if (existing) {
            return {
              cartItems: state.cartItems.map((item) =>
                item.product.id === product.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item,
              ),
            };
          }

          return { cartItems: [...state.cartItems, { product, quantity: 1 }] };
        }),
      removeFromCart: (productId) =>
        set((state) => ({
          cartItems: state.cartItems.filter((item) => item.product.id !== productId),
        })),
      decrementFromCart: (productId) =>
        set((state) => {
          const existing = state.cartItems.find((item) => item.product.id === productId);
          if (!existing) return state;
          if (existing.quantity <= 1) {
            return { cartItems: state.cartItems.filter((item) => item.product.id !== productId) };
          }
          return {
            cartItems: state.cartItems.map((item) =>
              item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item,
            ),
          };
        }),
      clearCart: () => set({ cartItems: [] }),
      toggleFavoriteProduct: (product) =>
        set((state) => {
          const exists = state.favoriteProducts.some((item) => item.id === product.id);
          return {
            favoriteProducts: exists
              ? state.favoriteProducts.filter((item) => item.id !== product.id)
              : [product, ...state.favoriteProducts].slice(0, 24),
          };
        }),
      isFavoriteProduct: (productId) =>
        get().favoriteProducts.some((item) => item.id === productId),
      addRecentProduct: (product) =>
        set((state) => {
          const filtered = state.recentProducts.filter((item) => item.id !== product.id);
          return { recentProducts: [product, ...filtered].slice(0, 12) };
        }),
    }),
    {
      name: '@somaai:app-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        tenant: state.tenant,
        appConsumerConfig: state.appConsumerConfig,
        authSession: state.authSession,
        cartItems: state.cartItems,
        favoriteProducts: state.favoriteProducts,
        recentProducts: state.recentProducts,
      }),
    },
  ),
);

export const getCartTotals = (items: CartItem[]) => ({
  totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
  totalPrice: items.reduce((sum, item) => sum + item.quantity * item.product.price, 0),
});
