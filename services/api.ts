import { AppConsumerConfig, AuthSession, NearbyEstablishment, Offer, Product, RegisterCustomerPayload, RegisterCustomerResponse, TenantConfig } from '@/types';
import { mockTenantConfig } from '@/utils/mockData';
import axios from 'axios';

const client = axios.create({
  baseURL: 'https://somaaibackend.onrender.com',
  timeout: 10000,
});

export const authApi = {
  async login(email: string, password: string, establishmentId: string): Promise<AuthSession> {
    const { data } = await client.post('/public/customers/login', { establishmentId, email, password });
    const payload = data?.data ?? data;
    return {
      accessToken: payload.access_token,
      user: {
        id: payload.customer.id,
        name: payload.customer.name,
        email: payload.customer.email,
        phone: payload.customer.phone ?? null,
        cpf: payload.customer.cpf ?? null,
        role: payload.customer.role ?? 'customer',
        avatar: payload.customer.avatar ?? null,
        accountScope: payload.customer.accountScope,
        planType: payload.customer.planType,
        hasCompletedOnboarding: payload.customer.hasCompletedOnboarding,
      },
    };
  },

  async registerCustomer(
    establishmentId: string,
    payload: RegisterCustomerPayload,
  ): Promise<RegisterCustomerResponse> {
    const url = `/public/establishments/${establishmentId}/customers`;
    const { data } = await client.post(url, payload);
    return data?.data ?? data;
  },

  async updateProfile(token: string, updates: { name?: string; phone?: string; birthDate?: string; avatar?: string }) {
    const { data } = await client.patch('/public/customers/me', updates, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data?.data ?? data;
  },

  async savePushToken(token: string, pushToken: string): Promise<void> {
    await client.post(
      '/public/customers/me/push-token',
      { pushToken, platform: require('react-native').Platform.OS },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  },
};

export const tenantApi = {
  async health() {
    const { data } = await client.get('/');
    return data as { message: string; version: string; status: string };
  },
  async getNearbyEstablishments(latitude: number, longitude: number, radius = 10) {
    try {
      const { data } = await client.get('/public/establishments/nearby', {
        params: { latitude, longitude, radius },
      });
      const list = Array.isArray(data?.data) ? data.data : [];
      return list.map(
        (item: any): NearbyEstablishment => ({
          id: item.id,
          nome: item.name ?? item.nome ?? 'Estabelecimento',
          logo: item.logo ?? '',
          type: item.type ?? item.segment ?? item.businessType ?? item.category,
          segment: item.segment ?? item.type ?? item.businessType ?? item.category,
          businessType: item.businessType ?? item.type ?? item.segment ?? item.category,
          latitude: item.latitude,
          longitude: item.longitude,
          address: item.address,
          city: item.city,
          state: item.state,
          description: item.description,
          isOpen: item.isOpen,
          isActive: item.isActive,
          distanceKm: item.distanceKm,
        }),
      );
    } catch {
      return [mockTenantConfig('mercado-joao')];
    }
  },
  async getTenantByCode(code: string): Promise<TenantConfig> {
    try {
      const { data } = await client.get(`/tenants/${code}`);
      return data;
    } catch {
      return mockTenantConfig(code);
    }
  },
  async getAppConsumerConfig(establishmentId: string): Promise<AppConsumerConfig> {
    try {
      const { data } = await client.get(`/public/establishments/${establishmentId}/app-consumer`);
      const payload = data?.data ?? data;
      return payload;
    } catch {
      return {
        id: 'app-consumer-123',
        establishmentId,
        logo: 'https://cdn.suaapp.com/logo.png',
        appColor: '#12AB34',
        fontColor: '#111827',
        screenVideo: 'https://cdn.suaapp.com/screen.mp4',
        isEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  },

  async getEstablishmentWithInventory(establishmentId: string, offerId?: string): Promise<Product[]> {
    const { data } = await client.get(`/public/establishments/${establishmentId}`, {
      params: offerId ? { offerId } : undefined,
    });
    const establishment = data?.data ?? data;
    const inventory: any[] = Array.isArray(establishment?.inventory) ? establishment.inventory : [];
    return inventory
      .filter((item) => item.isActive !== false)
      .map((item): Product => {
        return {
          id: item.id,
          name: item.name,
          price: Number(item.offerPrice ?? item.salePrice ?? item.price ?? 0),
          image: item.images?.[0] ?? item.image ?? item.imageUrl ?? '',
          images: Array.isArray(item.images) ? item.images.filter(Boolean) : item.image ? [item.image] : item.imageUrl ? [item.imageUrl] : [],
          category: item.category ?? 'Geral',
          description: item.description,
          unit: item.unit,
          currentStock: item.currentStock ?? item.quantity,
          hasOffer: item.hasOffer ?? false,
          offerPrice: item.offerPrice,
          offerDetails: item.offerDetails,
        };
      });
  },

  async getOffers(establishmentId: string, token?: string): Promise<Offer[]> {
    try {
      const { data } = await client.get(`/public/offers/establishments/${establishmentId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const list: any[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      return list
        .map((o): Offer => ({
          id: o.id,
          title: o.title ?? o.name ?? o.item?.name ?? 'Oferta',
          description: o.description ?? o.item?.description,
          discountPercentage: o.discountPercentage,
          bannerImage: o.bannerImage ?? o.banner ?? o.image ?? o.imageUrl ?? o.item?.images?.[0] ?? o.item?.image ?? '',
          image: o.image ?? o.bannerImage ?? o.item?.images?.[0] ?? '',
          item: o.item
            ? {
                id: o.item.id,
                name: o.item.name,
                price: Number(o.item.offerPrice ?? o.item.salePrice ?? o.item.price ?? 0),
                image: o.item.images?.[0] ?? o.item.image ?? o.item.imageUrl ?? '',
                images: Array.isArray(o.item.images) ? o.item.images.filter(Boolean) : o.item.image ? [o.item.image] : o.item.imageUrl ? [o.item.imageUrl] : [],
                category: o.item.category ?? 'Geral',
                description: o.item.description,
                unit: o.item.unit,
                currentStock: o.item.currentStock ?? o.item.quantity,
                hasOffer: o.item.hasOffer ?? false,
                offerPrice: o.item.offerPrice,
                offerDetails: o.item.offerDetails,
              }
            : undefined,
          startDate: o.startDate,
          endDate: o.endDate,
          isActive: o.isActive,
          establishmentId: o.establishmentId,
        }));
    } catch (err: any) {
      return [];
    }
  },
};
