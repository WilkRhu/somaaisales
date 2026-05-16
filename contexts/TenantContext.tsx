import { createContext, PropsWithChildren, useContext, useEffect, useMemo } from 'react';
import { tenantApi } from '@/services/api';
import { Tenant, TenantConfig } from '@/types';
import { useAppStore } from '@/store';

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
  const tenant = useAppStore((state) => state.tenant);
  const loading = useAppStore((state) => state.loadingTenant);
  const setTenant = useAppStore((state) => state.setTenant);
  const setLoadingTenant = useAppStore((state) => state.setLoadingTenant);

  const resolveTenant = async (config: TenantConfig) => {
    const nextTenant: Tenant = {
      ...config,
      configFetchedAt: new Date().toISOString(),
    };
    setTenant(nextTenant);
    return true;
  };

  const loadTenantByCode = async (code: string) => {
    setLoadingTenant(true);
    try {
      const config = await tenantApi.getTenantByCode(code);
      return await resolveTenant(config);
    } finally {
      setLoadingTenant(false);
    }
  };

  const bootstrapTenant = async () => {
    setLoadingTenant(false);
    try {
      return Boolean(tenant);
    } finally {
      setLoadingTenant(false);
    }
  };

  const refreshTenant = async () => {
    if (!tenant) return;
    const config = await tenantApi.getTenantByCode(tenant.id);
    await resolveTenant(config);
  };

  useEffect(() => {
    void bootstrapTenant();
  }, [tenant]);

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
