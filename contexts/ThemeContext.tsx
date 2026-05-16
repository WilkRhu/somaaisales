import { createContext, PropsWithChildren, useContext, useMemo } from 'react';
import { useTenant } from './TenantContext';
import { buildTenantTheme } from '@/theme';
import { useAppStore } from '@/store';

const ThemeContext = createContext(buildTenantTheme());

export function ThemeProvider({ children }: PropsWithChildren) {
  const { tenant } = useTenant();
  const appConsumerConfig = useAppStore((state) => state.appConsumerConfig);
  const theme = useMemo(() => buildTenantTheme(tenant, appConsumerConfig), [tenant, appConsumerConfig]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
