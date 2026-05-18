export type TenantConfig = {
  id: string;
  nome: string;
  logo: string;
  corPrimaria: string;
  corSecundaria: string;
  banner: string;
  modulos: string[];
};

export type Offer = {
  id: string;
  title: string;
  description?: string;
  discountPercentage?: number;
  bannerImage?: string;
  image?: string;
  item?: Product;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  establishmentId?: string;
};

export type NearbyEstablishment = {
  id: string;
  nome: string;
  logo: string;
  type?: string;
  segment?: string;
  businessType?: string;
  latitude?: string;
  longitude?: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  description?: string | null;
  isOpen?: boolean;
  isActive?: boolean;
  distanceKm?: number;
};

export type Tenant = TenantConfig & {
  configFetchedAt: string;
};

export type AppConsumerConfig = {
  id: string;
  establishmentId: string;
  establishmentName?: string;
  establishmentType?: string;
  logo: string;
  appColor: string;
  fontColor?: string;
  screenVideo: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  cpf?: string | null;
  role: string;
  avatar?: string | null;
  accountScope?: string;
  planType?: string;
  hasCompletedOnboarding?: boolean;
};

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
};

export type RegisterCustomerPayload = {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  birthDate: string;
  password: string;
  avatar?: string | null;
};

export type RegisterCustomerResponse = {
  id: string;
  establishmentId: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  birthDate: string;
  avatar?: string | null;
  isActive: boolean;
  loyaltyPoints: number;
  createdAt: string;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  images?: string[];
  category: string;
  featured?: boolean;
  // campos extras do inventory
  description?: string;
  metadata?: string;
  unit?: string;
  currentStock?: number;
  hasOffer?: boolean;
  offerPrice?: number;
  offerDetails?: {
    offerId: string;
    offerPrice: number;
    originalPrice: number;
    discountPercentage: number;
    title: string;
    description: string;
    endDate: string;
  };
};

export type CartItem = {
  product: Product;
  quantity: number;
};

// ─── Delivery ────────────────────────────────────────────────────────────────

export type DeliveryEstablishment = {
  id: string;
  name: string;
  logo?: string;
  isOpen?: boolean;
  deliveryEnabled?: boolean;
  inventory?: Product[];
  availablePaymentMethods?: string[];
  deliveryPaymentTypes?: string[];
  deliveryPaymentAppEnabled?: boolean;
};

export type DeliveryCartItem = {
  product: Product;
  quantity: number;
};

export type DeliveryFeeResponse = {
  deliveryFee: number;
  isFreeDelivery: boolean;
  freeDeliveryMinimum?: number;
  estimatedTime?: number;
  zone?: { id: string; name: string };
};

export type DeliveryOrder = {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  deliveryAddress: string;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  estimatedDeliveryTime?: number;
  paymentMethod: string;
  createdAt: string;
  items?: DeliveryOrderItem[];
  notes?: string;
};

export type DeliveryTrackingEvent = {
  status: string;
  description?: string;
  createdAt: string;
  timestamp?: string;
};

export type DeliveryOrderItem = {
  itemId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  discount: number;
};

export type DeliveryRatingPayload = {
  establishmentRating?: number;
  establishmentComment?: string;
  establishmentQuality?: number;
  establishmentPackaging?: number;
  establishmentAccuracy?: number;
  driverRating?: number;
  driverComment?: string;
  driverPunctuality?: number;
  driverCleanliness?: number;
  driverProfessionalism?: number;
};

export type DeliveryOrderRating = {
  id: string;
  orderId: string;
  customerId?: string;
  establishmentRating?: number;
  establishmentComment?: string;
  establishmentQuality?: number;
  establishmentPackaging?: number;
  establishmentAccuracy?: number;
  driverRating?: number;
  driverComment?: string;
  driverPunctuality?: number;
  driverCleanliness?: number;
  driverProfessionalism?: number;
  createdAt?: string;
};

export type UserAddress = {
  id: string;
  customerId?: string;
  establishmentId?: string;
  label?: string;
  street: string;
  number: string;
  address?: string; // fallback legado
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  complement?: string;
  reference?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
  isActive?: boolean;
};
