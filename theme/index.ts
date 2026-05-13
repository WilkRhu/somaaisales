import { Tenant } from '@/types';
import { AppConsumerConfig } from '@/types';

export const buildTenantTheme = (tenant?: Tenant | null, appConfig?: AppConsumerConfig | null) => ({
  colors: {
    primary: appConfig?.appColor ?? tenant?.corPrimaria ?? '#1677FF',
    secondary: tenant?.corSecundaria ?? '#071B5A',
    accent: '#7B1FFF',
    accentLight: '#A855F7',
    background: '#F5F5F5',
    surface: '#ffffff',
    text: '#111827',
    muted: '#6b7280',
    success: '#10b981',
    border: '#e5e7eb',
  },
  radii: { lg: 24, md: 16, sm: 12 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  branding: {
    logo: appConfig?.logo ?? tenant?.logo ?? null,
    screenVideo: appConfig?.screenVideo ?? null,
    isEnabled: appConfig?.isEnabled ?? true,
  },
});
