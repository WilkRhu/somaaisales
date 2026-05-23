import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import {
    DeliveryCartItem,
    DeliveryEstablishment,
    DeliveryFeeResponse,
    DeliveryOrder,
    DeliveryOrderRating,
    DeliveryRatingPayload,
    DeliveryTrackingEvent,
    UserAddress
} from '@/types';
import { API_BASE_URL } from './apiConfig';

const CART_KEY_PREFIX = 'somaai:delivery-cart-';
export const DELIVERY_BASE_URL = API_BASE_URL;

const client = axios.create({
  baseURL: DELIVERY_BASE_URL,
  timeout: 15000,
});

/** Injeta o token de autenticação nas requisições */
export function setDeliveryAuthToken(token: string | null) {
  if (token) {
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common['Authorization'];
  }
}

export const deliveryApi = {
  // ─── Estabelecimentos ──────────────────────────────────────────────────────

  async getAvailableEstablishments(): Promise<DeliveryEstablishment[]> {
    const { data } = await client.get('/public/establishments/delivery/available');
    const list: any[] = Array.isArray(data?.data) ? data.data : [];
    return list.map((item) => ({
      id: item.id,
      name: item.name ?? item.nome ?? 'Estabelecimento',
      logo: item.logo ?? '',
      isOpen: item.isOpen,
      deliveryEnabled: item.deliveryEnabled,
    }));
  },

  async getEstablishmentById(
    establishmentId: string,
    offerId?: string,
  ): Promise<DeliveryEstablishment> {
    const { data } = await client.get(`/public/establishments/${establishmentId}`, {
      params: offerId ? { offerId } : undefined,
    });
    const est = data?.data ?? data;
    const inventory: any[] = Array.isArray(est?.inventory) ? est.inventory : [];

    return {
      id: est.id,
      name: est.name ?? est.nome ?? 'Estabelecimento',
      logo: est.logo ?? '',
      isOpen: est.isOpen,
      deliveryEnabled: est.deliveryEnabled,
      availablePaymentMethods: est.availablePaymentMethods,
      deliveryPaymentTypes: est.deliveryPaymentTypes,
      deliveryPaymentAppEnabled: est.deliveryPaymentAppEnabled,
      inventory: inventory
        .filter((item) => item.isActive !== false)
        .map((item) => ({
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
          offerPrice: item.offerPrice ? Number(item.offerPrice) : undefined,
          offerDetails: item.offerDetails,
        })),
    };
  },

  // ─── Frete ─────────────────────────────────────────────────────────────────

  async calculateFee(
    establishmentId: string,
    params: {
      neighborhood: string;
      zipCode: string;
      latitude?: number;
      longitude?: number;
      subtotal: number;
    },
  ): Promise<DeliveryFeeResponse> {
    const { data } = await client.post(
      `/public/delivery/establishments/${establishmentId}/calculate-fee`,
      params,
    );
    const d = data?.data ?? data;
    return {
      deliveryFee: Number(d.deliveryFee ?? 0),
      isFreeDelivery: Boolean(d.isFreeDelivery),
      freeDeliveryMinimum: d.freeDeliveryMinimum ? Number(d.freeDeliveryMinimum) : undefined,
      estimatedTime: d.estimatedTime ? Number(d.estimatedTime) : undefined,
      zone: d.zone,
    };
  },

  // ─── Pedidos ───────────────────────────────────────────────────────────────

  async createOrder(
    establishmentId: string,
    payload: {
      customerId: string;
      customerName: string;
      customerEmail: string;
      customerPhone: string;
      deliveryAddress: string;
      deliveryNeighborhood: string;
      deliveryCity: string;
      deliveryState: string;
      deliveryZipCode: string;
      deliveryComplement?: string;
      deliveryReference?: string;
      latitude?: number;
      longitude?: number;
      items: { itemId: string; productName: string; unitPrice: number; quantity: number; discount: number }[];
      paymentMethod: string;
      deliveryPaymentType: string;
      changeFor?: string;
      notes?: string;
      discount?: number;
      addressId?: string;
    },
  ): Promise<DeliveryOrder> {
    const { data } = await client.post(
      `/public/delivery/establishments/${establishmentId}/orders`,
      payload,
    );
    return data?.data ?? data;
  },

  async getOrderById(orderId: string): Promise<DeliveryOrder> {
    const { data } = await client.get(`/public/delivery/orders/${orderId}`);
    return data?.data ?? data;
  },

  async getDriverLocation(orderId: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const { data } = await client.get(`/public/delivery/orders/${orderId}/driver-location`);
      const d = data?.data ?? data;
      if (!d?.latitude) return null;
      return { latitude: Number(d.latitude), longitude: Number(d.longitude) };
    } catch {
      return null;
    }
  },

  async getMyOrders(): Promise<DeliveryOrder[]> {
    const { data } = await client.get('/public/delivery/my-orders');
    return Array.isArray(data?.data) ? data.data : [];
  },

  async getOrderTracking(orderId: string): Promise<DeliveryTrackingEvent[]> {
    const { data } = await client.get(`/public/delivery/orders/${orderId}/tracking`);
    return Array.isArray(data?.data) ? data.data : [];
  },

  async cancelOrder(orderId: string, reason?: string): Promise<void> {
    await client.post(`/public/delivery/orders/${orderId}/cancel`, { reason });
  },

  async confirmReceipt(orderId: string): Promise<void> {
    await client.post(`/public/delivery/orders/${orderId}/confirm-receipt`);
  },

  async getOrderRating(orderId: string): Promise<DeliveryOrderRating | null> {
    try {
      const { data } = await client.get(`/delivery/ratings/orders/${orderId}`);
      const result = data?.data ?? data ?? null;
      // Retorna null se não tiver um id válido (API pode retornar objeto vazio)
      if (!result || !result.id) return null;
      return result;
    } catch {
      return null;
    }
  },

  async createOrderRating(orderId: string, payload: DeliveryRatingPayload): Promise<DeliveryOrderRating> {
    const { data } = await client.post(`/delivery/ratings/orders/${orderId}`, payload);
    return data?.data ?? data;
  },

  // ─── Endereço do usuário ───────────────────────────────────────────────────

  async getMyAddresses(): Promise<UserAddress[]> {
    const { data } = await client.get('/public/customers/me/addresses');
    return Array.isArray(data?.data) ? data.data : [];
  },

  async getDefaultAddress(): Promise<UserAddress | null> {
    const { data } = await client.get('/public/customers/me/addresses/default');
    const address = data?.data ?? null;
    return address;
  },

  async createAddress(payload: {
    businessConsumerId?: string;
    label?: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    latitude?: number;
    longitude?: number;
    isDefault?: boolean;
  }): Promise<UserAddress> {
    const { data } = await client.post('/public/customers/me/addresses', payload);
    return data?.data ?? data;
  },

  async updateAddress(addressId: string, payload: Partial<{
    label: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    latitude: number;
    longitude: number;
    isDefault: boolean;
  }>): Promise<UserAddress> {
    const { data } = await client.patch(`/public/customers/me/addresses/${addressId}`, payload);
    return data?.data ?? data;
  },

  async deleteAddress(addressId: string): Promise<void> {
    await client.delete(`/public/customers/me/addresses/${addressId}`);
  },

  async setDefaultAddress(addressId: string): Promise<UserAddress> {
    const { data } = await client.patch(`/public/customers/me/addresses/${addressId}/set-default`);
    return data?.data ?? data;
  },

  // ─── Carrinho local (AsyncStorage) ─────────────────────────────────────────

  async saveCart(establishmentId: string, items: DeliveryCartItem[]): Promise<void> {
    await AsyncStorage.setItem(
      `${CART_KEY_PREFIX}${establishmentId}`,
      JSON.stringify(items),
    );
  },

  async loadCart(establishmentId: string): Promise<DeliveryCartItem[]> {
    const raw = await AsyncStorage.getItem(`${CART_KEY_PREFIX}${establishmentId}`);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as DeliveryCartItem[];
    } catch {
      return [];
    }
  },

  async clearCart(establishmentId: string): Promise<void> {
    await AsyncStorage.removeItem(`${CART_KEY_PREFIX}${establishmentId}`);
  },
};
