// ─── User / Auth ─────────────────────────────────────────────────────────────

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER' | 'DRIVER' | 'BUYER' | 'SUPPLIER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
export type OnboardingStep = 'COMPLETE' | 'PENDING_CODE' | 'PENDING_LOCATION';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  profileImage?: string;
  role: UserRole;
  status: UserStatus;
  onboardingStep: OnboardingStep;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLogin?: string;
  createdAt: string;
  driverProfile?: DriverProfile;
  buyerProfile?: BuyerProfile;
  supplierProfile?: SupplierProfile;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  role: 'DRIVER' | 'BUYER' | 'SUPPLIER';
  supplierType?: string;
  organizationName?: string;
}

// ─── Driver ──────────────────────────────────────────────────────────────────

export type DriverStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'ACTIVE' | 'OFFLINE';

export interface DriverProfile {
  id: string;
  userId: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  vehicleType?: string;
  vehicleModel?: string;
  vehiclePlateNumber?: string;
  rating: number;
  totalDeliveries: number;
  status: DriverStatus;
  verifiedAt?: string;
}

// ─── Buyer / Supplier ────────────────────────────────────────────────────────

export interface BuyerProfile {
  id: string;
  userId: string;
  companyName?: string;
  businessType?: string;
}

export interface SupplierProfile {
  id: string;
  userId: string;
  supplierType?: string;
  organizationName?: string;
  farmName?: string;
  farmType?: string;
  farmSize?: number;
  primaryProducts?: string[];
  wasteTypes?: string[];
  weeklyWasteAmount?: number;
  totalWasteSupplied?: number;
  totalEarnings?: number;
  pointsBalance?: number;
  pointsEarned?: number;
  rating?: number;
  status?: string;
}

// ─── Farm ────────────────────────────────────────────────────────────────────

export interface Farm {
  id: string;
  name: string;
  type: string;
  status: string;
  location?: { lat: number; lng: number; address: string };
  country?: string;
  region?: string;
  city?: string;
}

// ─── Waste ───────────────────────────────────────────────────────────────────

export type WasteSourceType = 'AGRICULTURAL' | 'FOOD_WASTE' | 'MARKET_WASTE' | 'HOUSEHOLD' | 'INDUSTRIAL' | 'MUNICIPAL' | 'COMMERCIAL' | 'OTHER';
export type WasteStatus = 'PENDING' | 'SCHEDULED' | 'COLLECTED' | 'IN_TRANSIT' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';

export interface WasteRecord {
  id: string;
  sourceName: string;
  sourceType: WasteSourceType;
  quantity: number;
  unit: string;
  date: string;
  status: WasteStatus;
  description?: string;
  carbonSaved?: number;
  notes?: string;
  images: string[];
  farm?: Farm;
  recordedBy?: Pick<User, 'id' | 'fullName' | 'email'>;
  supplier?: Pick<User, 'id' | 'fullName' | 'email' | 'phoneNumber'> | null;
  driver?: Pick<User, 'id' | 'fullName' | 'email' | 'phoneNumber'> | null;
  /** Backend DB field: location Json? { lat, lng, address, city, country } */
  location?: { lat?: number; lng?: number; address?: string; city?: string; country?: string } | null;
  /** Legacy alias from supplier profile – may also carry coords */
  collectionAddress?: { country?: string; city?: string; address?: string; lat?: number; lng?: number } | null;
  createdAt: string;
}

export interface CreateWastePayload {
  sourceName: string;
  sourceType: WasteSourceType;
  quantity: number;
  unit?: string;
  date: string;
  description?: string;
  farmId?: string;
  notes?: string;
  location?: { lat?: number; lng?: number; address?: string; city?: string; country?: string };
}

// ─── Products ────────────────────────────────────────────────────────────────

export type ProductCategory = 'ORGANIC_FERTILIZER' | 'PROTEIN_FEED' | 'INSECT_OIL' | 'SOIL_CONDITIONER' | 'DRIED_LARVAE' | 'COMPOST' | 'LIQUID_FERTILIZER' | 'BIOCHAR' | 'OTHER';

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit?: string;
  weight?: number;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  category: ProductCategory;
  images: string[];
  tags: string[];
  slug: string;
  status: string;
  variants: ProductVariant[];
  farm?: Farm;
  _count?: { reviews: number };
  createdAt: string;
}

// ─── Cart ────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  quantity: number;
  variant: ProductVariant & {
    product: Pick<Product, 'id' | 'name' | 'images' | 'slug'>;
  };
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  total: number;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'READY_FOR_PICKUP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
export type PaymentMethod = 'CASH_ON_DELIVERY' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'DEBIT_CARD';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  subtotal: number;
  variant: ProductVariant & {
    product: Pick<Product, 'id' | 'name' | 'images'>;
  };
}

export interface DeliveryAddress {
  street: string;
  city: string;
  region?: string;
  country: string;
  postalCode?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  deliveryAddress: DeliveryAddress;
  deliveryInstructions?: string;
  specialInstructions?: string;
  items: OrderItem[];
  customer?: Pick<User, 'id' | 'fullName' | 'email' | 'phoneNumber'>;
  driver?: Pick<User, 'id' | 'fullName' | 'phoneNumber'>;
  farm?: Farm;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderPayload {
  items: { variantId: string; quantity: number }[];
  deliveryAddress: DeliveryAddress;
  deliveryInstructions?: string;
  paymentMethod: PaymentMethod;
  specialInstructions?: string;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationType = 'ORDER_UPDATE' | 'DELIVERY_UPDATE' | 'WASTE_UPDATE' | 'SYSTEM' | 'PROMOTION' | 'ALERT';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
