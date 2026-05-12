import { TenantConfig, Product } from '@/types';

export const mockTenantConfig = (code = 'mercado-joao'): TenantConfig => ({
  id: code,
  nome: 'Mercado João',
  logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=256',
  corPrimaria: '#16a34a',
  corSecundaria: '#111827',
  banner: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200',
  modulos: ['catalogo', 'pedidos', 'pix', 'promocoes'],
});

export const mockProducts: Product[] = [
  { id: '1', name: 'Arroz 5kg', price: 29.9, image: 'https://images.unsplash.com/photo-1563379091339-03246963d8c3?w=600', category: 'Mercearia', featured: true },
  { id: '2', name: 'Leite Integral', price: 5.49, image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600', category: 'Bebidas' },
  { id: '3', name: 'Pão Francês', price: 0.75, image: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=600', category: 'Padaria', featured: true },
];
