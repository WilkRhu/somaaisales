import { Tenant } from '@/types';

export const buildTenantTheme = (tenant?: Tenant | null) => ({
  colors: {
    primary: tenant?.corPrimaria ?? '#16a34a',
    secondary: tenant?.corSecundaria ?? '#111827',
    background: '#f7f7f8',
    surface: '#ffffff',
    text: '#111827',
    muted: '#6b7280',
    success: '#10b981',
    border: '#e5e7eb',
  },
  radii: { lg: 24, md: 16, sm: 12 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
});
