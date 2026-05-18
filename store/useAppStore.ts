import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { AppConsumerConfig, AuthSession, CartItem, Product, Tenant } from '@/types';

type AppState = {
  tenant: Tenant | null;
  appConsumerConfig: AppConsumerConfig | null;
  authSession: AuthSession | null;
  cartItems: CartItem[];
  favoriteProductsByScope: Record<string, Product[]>;
  recentProductsByScope: Record<string, Product[]>;
  loadingTenant: boolean;
  setTenant: (tenant: Tenant | null) => void;
  setAppConsumerConfig: (config: AppConsumerConfig | null) => void;
  setAuthSession: (session: AuthSession | null) => void;
  setLoadingTenant: (loading: boolean) => void;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  decrementFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleFavoriteProduct: (product: Product) => void;
  isFavoriteProduct: (productId: string) => boolean;
  addRecentProduct: (product: Product) => void;
};

function getScopeId(state: Pick<AppState, 'appConsumerConfig' | 'tenant'>) {
  return state.appConsumerConfig?.establishmentId ?? state.tenant?.id ?? 'default';
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      tenant: null,
      appConsumerConfig: null,
      authSession: null,
      cartItems: [],
      favoriteProductsByScope: {},
      recentProductsByScope: {},
      loadingTenant: true,
      setTenant: (tenant) => set({ tenant }),
      setAppConsumerConfig: (appConsumerConfig) => set({ appConsumerConfig }),
      setAuthSession: (authSession) => set({ authSession }),
      setLoadingTenant: (loading) => set({ loadingTenant: loading }),
      addToCart: (product, quantity) =>
        set((state) => {
          const qty = quantity ?? 1;
          const existing = state.cartItems.find((item) => item.product.id === product.id);
          if (existing) {
            return {
              cartItems: state.cartItems.map((item) =>
                item.product.id === product.id
                  ? { ...item, quantity: item.quantity + qty }
                  : item,
              ),
            };
          }

          return { cartItems: [...state.cartItems, { product, quantity: qty }] };
        }),
      removeFromCart: (productId) =>
        set((state) => ({
          cartItems: state.cartItems.filter((item) => item.product.id !== productId),
        })),
      decrementFromCart: (productId) =>
        set((state) => {
          const existing = state.cartItems.find((item) => item.product.id === productId);
          if (!existing) return state;
          const step = existing.product.unit ? 0.1 : 1;
          const newQty = Math.round((existing.quantity - step) * 100) / 100;
          if (newQty <= 0) {
            return { cartItems: state.cartItems.filter((item) => item.product.id !== productId) };
          }
          return {
            cartItems: state.cartItems.map((item) =>
              item.product.id === productId ? { ...item, quantity: newQty } : item,
            ),
          };
        }),
      updateCartQuantity: (productId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { cartItems: state.cartItems.filter((item) => item.product.id !== productId) };
          }
          return {
            cartItems: state.cartItems.map((item) =>
              item.product.id === productId ? { ...item, quantity } : item,
            ),
          };
        }),
      clearCart: () => set({ cartItems: [] }),
      toggleFavoriteProduct: (product) =>
        set((state) => {
          const scopeId = getScopeId(state);
          const current = state.favoriteProductsByScope[scopeId] ?? [];
          const exists = current.some((item) => item.id === product.id);
          return {
            favoriteProductsByScope: {
              ...state.favoriteProductsByScope,
              [scopeId]: exists
                ? current.filter((item) => item.id !== product.id)
                : [product, ...current].slice(0, 24),
            },
          };
        }),
      isFavoriteProduct: (productId) => {
        const scopeId = getScopeId(get());
        return (get().favoriteProductsByScope[scopeId] ?? []).some((item) => item.id === productId);
      },
      addRecentProduct: (product) =>
        set((state) => {
          const scopeId = getScopeId(state);
          const current = state.recentProductsByScope[scopeId] ?? [];
          const filtered = current.filter((item) => item.id !== product.id);
          return {
            recentProductsByScope: {
              ...state.recentProductsByScope,
              [scopeId]: [product, ...filtered].slice(0, 12),
            },
          };
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
        favoriteProductsByScope: state.favoriteProductsByScope,
        recentProductsByScope: state.recentProductsByScope,
      }),
    },
  ),
);

export const selectFavoriteProducts = (state: AppState) => {
  const scopeId = getScopeId(state);
  return state.favoriteProductsByScope[scopeId] ?? [];
};

export const selectRecentProducts = (state: AppState) => {
  const scopeId = getScopeId(state);
  return state.recentProductsByScope[scopeId] ?? [];
};

export const getCartTotals = (items: CartItem[]) => ({
  totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
  totalPrice: items.reduce((sum, item) => sum + item.quantity * item.product.price, 0),
});
