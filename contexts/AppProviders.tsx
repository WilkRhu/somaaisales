import { PropsWithChildren } from 'react';
import { CartProvider } from './CartContext';
import { ThemeProvider } from './ThemeContext';
import { TenantProvider } from './TenantContext';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <TenantProvider>
      <ThemeProvider>
        <CartProvider>{children}</CartProvider>
      </ThemeProvider>
    </TenantProvider>
  );
}
