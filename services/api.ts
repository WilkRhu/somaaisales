import axios from 'axios';
import { mockTenantConfig } from '@/utils/mockData';
import { TenantConfig } from '@/types';

const client = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 10000,
});

export const tenantApi = {
  async getTenantByCode(code: string): Promise<TenantConfig> {
    try {
      const { data } = await client.get(`/tenants/${code}`);
      return data;
    } catch {
      return mockTenantConfig(code);
    }
  },
};
