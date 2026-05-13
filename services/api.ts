import { AppConsumerConfig, AuthSession, NearbyEstablishment, RegisterCustomerPayload, RegisterCustomerResponse, TenantConfig } from '@/types';
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
      return data?.data ?? data;
    } catch {
      return {
        id: 'app-consumer-123',
        establishmentId,
        logo: 'https://cdn.suaapp.com/logo.png',
        appColor: '#12AB34',
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
};
