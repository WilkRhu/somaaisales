export type TenantConfig = {
  id: string;
  nome: string;
  logo: string;
  corPrimaria: string;
  corSecundaria: string;
  banner: string;
  modulos: string[];
};

export type Tenant = TenantConfig & {
  configFetchedAt: string;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  featured?: boolean;
};

export type CartItem = {
  product: Product;
  quantity: number;
};
