import { createContext, PropsWithChildren, useContext, useMemo } from 'react';
import { useTenant } from './TenantContext';
import { buildTenantTheme } from '@/theme';

const ThemeContext = createContext(buildTenantTheme());

export function ThemeProvider({ children }: PropsWithChildren) {
  const { tenant } = useTenant();
  const theme = useMemo(() => buildTenantTheme(tenant), [tenant]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
