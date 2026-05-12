import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { tenantApi } from '@/services/api';
import { storage } from '@/storage';
import { Tenant, TenantConfig } from '@/types';

type TenantContextValue = {
  tenant: Tenant | null;
  modules: string[];
  loading: boolean;
  loadTenantByCode: (code: string) => Promise<boolean>;
  bootstrapTenant: () => Promise<boolean>;
  refreshTenant: () => Promise<void>;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: PropsWithChildren) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  const persist = async (nextTenant: Tenant | null) => {
    if (!nextTenant) return AsyncStorage.removeItem(storage.tenantKey);
    await AsyncStorage.setItem(storage.tenantKey, JSON.stringify(nextTenant));
  };

  const hydrate = async () => {
    const raw = await AsyncStorage.getItem(storage.tenantKey);
    return raw ? (JSON.parse(raw) as Tenant) : null;
  };

  const resolveTenant = async (config: TenantConfig) => {
    const nextTenant: Tenant = {
      ...config,
      configFetchedAt: new Date().toISOString(),
    };
    setTenant(nextTenant);
    await persist(nextTenant);
    return true;
  };

  const loadTenantByCode = async (code: string) => {
    setLoading(true);
    try {
      const config = await tenantApi.getTenantByCode(code);
      return await resolveTenant(config);
    } finally {
      setLoading(false);
    }
  };

  const bootstrapTenant = async () => {
    setLoading(true);
    try {
      const cached = await hydrate();
      if (!cached) return false;
      setTenant(cached);
      return true;
    } finally {
      setLoading(false);
    }
  };

  const refreshTenant = async () => {
    if (!tenant) return;
    const config = await tenantApi.getTenantByCode(tenant.id);
    await resolveTenant(config);
  };

  useEffect(() => {
    void bootstrapTenant();
  }, []);

  const value = useMemo(
    () => ({ tenant, modules: tenant?.modulos ?? [], loading, loadTenantByCode, bootstrapTenant, refreshTenant }),
    [tenant, loading],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export const useTenant = () => {
  const value = useContext(TenantContext);
  if (!value) throw new Error('useTenant must be used within TenantProvider');
  return value;
};
