export interface Customer {
  customerId: string;
  firebaseUid?: string;
  name: string;
  phone: string;
  email: string;
  password?: string; // Stored hashed/plain in simulator, optional for safety
  address: string;
  city: string;
  pincode: string;
  provider?: string;
  createdAt: string;
  latitude?: number;
  longitude?: number;
}

export type OrderStatus = 'Pending' | 'Accepted' | 'Preparing' | 'Out for Delivery' | 'Delivered' | 'Cancelled' | 'Rejected';

export interface Order {
  orderId: string;
  customerId: string;
  date: string;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  status: OrderStatus;
  coupon: string;
  deliveryBoyName?: string;
  deliveryBoyPhone?: string;
  vehicleNumber?: string;
  estimatedDeliveryTime?: string;
  deliveryNotes?: string;
  riderRejected?: boolean;
  lastRejectedRiderName?: string;
  
  restaurantId?: string;
  restaurantName?: string;
  
  // Fully automatic distance-based fields
  customer_lat?: number;
  customer_lng?: number;
  restaurant_lat?: number;
  restaurant_lng?: number;
  distance_km?: number;
  estimated_time?: string;
  delivery_fee?: number;
  grand_total?: number;
}

export interface OrderItem {
  orderId: string;
  itemId: string;
  name: string;
  variant: string;
  price: number;
  qty: number;
}

export interface Coupon {
  coupon: string;
  discountType: 'Percentage' | 'Fixed';
  value: number;
  minimumOrder: number;
  expiry: string;
  active: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  variant: string; // List of variants separated by comma (e.g. "Regular, Large") or single
  price: string; // List of prices separated by comma (e.g. "120, 200") corresponding to variants, or single price
  image: string;
  available: boolean;
  featured: boolean;
  profitMargin?: string; // Profit margin in Rupees per variant separated by comma (e.g. "40, 70")
  dietType?: 'veg' | 'non-veg';
  description?: string;
  restaurantId?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  phone: string;
  address: string;
  cuisine: string;
  image: string;
  rating?: number;
  deliveryTime?: string;
  active: boolean;
  featured?: boolean;
  openingTime?: string;
  closingTime?: string;
  isClosed?: boolean;
  closedMessage?: string;
  deliveryRadius?: number;
  latitude?: number;
  longitude?: number;
  username?: string;
  login?: string;
  password?: string;
}

export interface Category {
  category: string;
  displayName: string;
  image: string;
}

export interface DeliveryChargeSlab {
  id: string;
  minDistance: number;
  maxDistance: number;
  fee: number;
  enabled: boolean;
}

export interface RestaurantSettings {
  deliveryFee: number;
  minimumOrder: number;
  restaurantName: string;
  phone: string;
  whatsapp: string;
  address: string;
  openingTime: string;
  closingTime: string;
  isClosed?: boolean;
  closedMessage?: string;
  latitude?: number;
  longitude?: number;
  deliveryChargeSlabs?: DeliveryChargeSlab[];
  maxDeliveryRadius?: number;
}

export interface CartItem {
  id: string; // unique item state (itemId + variant)
  itemId: string;
  menuId?: string;
  restaurantId?: string;
  name: string;
  category: string;
  variant: string;
  price: number;
  qty: number;
  image: string;
}

export interface Banner {
  bannerId: string;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  mobileImage?: string;
  desktopImage?: string;
  buttonText?: string;
  buttonLink?: string;
  couponCode?: string;
  offerBadge?: string;
  redirectType?: 'none' | 'restaurant' | 'category' | 'product' | 'coupon' | 'external';
  restaurantId?: string;
  categoryId?: string;
  productId?: string;
  backgroundColor?: string;
  textColor?: string;
  priority: number;
  status: 'active' | 'inactive' | 'scheduled';
  showCountdown?: boolean;
  countdownDate?: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function getDietType(item: Partial<MenuItem>): 'veg' | 'non-veg' {
  const rawDiet = (item.dietType || '').toLowerCase().trim();
  if (rawDiet === 'veg' || rawDiet === 'vegetarian') return 'veg';
  if (rawDiet === 'non-veg' || rawDiet === 'non_veg' || rawDiet === 'nonveg' || rawDiet === 'non vegetarian') return 'non-veg';

  const name = (item.name || '').toLowerCase();
  const category = (item.category || '').toLowerCase();
  
  if (
    name.includes('chicken') ||
    name.includes('egg') ||
    name.includes('mutton') ||
    name.includes('fish') ||
    name.includes('non-veg') ||
    name.includes('non veg') ||
    name.includes('nonveg') ||
    name.includes('meat') ||
    name.includes('kabab') ||
    name.includes('kebab') ||
    name.includes('prawn') ||
    category.includes('chicken') ||
    category.includes('egg') ||
    category.includes('mutton') ||
    category.includes('fish') ||
    category.includes('non-veg') ||
    category.includes('non veg') ||
    category.includes('nonveg')
  ) {
    return 'non-veg';
  }
  return 'veg';
}
