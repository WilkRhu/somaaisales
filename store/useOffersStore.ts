import { tenantApi } from '@/services/api';
import { Offer } from '@/types';
import { create } from 'zustand';

type OffersState = {
  offers: Offer[];
  loading: boolean;
  error: string | null;
  lastFetchedFor: string | null; // establishmentId
  fetchOffers: (establishmentId: string, force?: boolean, token?: string) => Promise<void>;
  clearOffers: () => void;
};

export const useOffersStore = create<OffersState>((set, get) => ({
  offers: [],
  loading: false,
  error: null,
  lastFetchedFor: null,

  fetchOffers: async (establishmentId, force = false, token?: string) => {
    // Evita refetch desnecessário para o mesmo estabelecimento
    if (!force && get().lastFetchedFor === establishmentId && get().offers.length > 0) return;

    set({ loading: true, error: null });
    try {
      const offers = await tenantApi.getOffers(establishmentId, token);
      set({ offers, lastFetchedFor: establishmentId });
    } catch (err: any) {
      set({ error: err?.message ?? 'Erro ao carregar ofertas', offers: [] });
    } finally {
      set({ loading: false });
    }
  },

  clearOffers: () => set({ offers: [], lastFetchedFor: null, error: null }),
}));
