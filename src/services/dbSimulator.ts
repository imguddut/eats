import { Customer, Order, OrderItem, Coupon, MenuItem, Category, RestaurantSettings, OrderStatus, Restaurant, Banner } from '../types';
import { initialMenu, categories as initialCategories, initialRestaurants } from '../data/menu';
import { safeDispatchEvent } from '../utils/customEvent';
import { haversineDistance, calculateDeliveryFee } from '../utils/delivery';
import { 
  SupabaseSettingsService, 
  SupabaseMenuService, 
  SupabaseRestaurantService, 
  SupabaseOrderService,
  initSupabaseRealtimeSubscriptions 
} from './supabaseService';

// Initialize Supabase Realtime listener channels on application load
initSupabaseRealtimeSubscriptions();

const STORAGE_KEYS = {
  GAS_URL: 'arwaleats_gas_url',
  CURRENT_USER: 'arwaleats_current_user',
  CURRENT_ADMIN: 'arwaleats_current_admin',
};

// In-Memory Database collections (completely replacing localStorage for all data rows)
let inMemoryCustomers: Customer[] = [];
let inMemoryOrders: Order[] = [];
let inMemoryOrderItems: OrderItem[] = [];
let inMemoryCoupons: Coupon[] = [];
let inMemorySettings: RestaurantSettings | null = null;
let inMemoryMenu: MenuItem[] = [];
let inMemoryRestaurants: Restaurant[] = [];
let inMemoryReviews: any[] = [];
let inMemoryMessages: any[] = [];
let inMemoryNotifications: any[] = [];
let inMemoryDeletedMenuItems: string[] = [];
let inMemoryMenuCleared = false;
export const defaultBanners: Banner[] = [
  {
    bannerId: 'BAN-1',
    title: 'Flat ₹100 OFF',
    subtitle: 'On your favorite meals above ₹299',
    description: 'Use promo code ARWAL100 at checkout for instant discount.',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1000&auto=format&fit=crop&q=80',
    buttonText: 'Order Now',
    couponCode: 'ARWAL100',
    offerBadge: '🔥 30% OFF',
    redirectType: 'coupon',
    backgroundColor: '#0f172a',
    textColor: '#ffffff',
    priority: 1,
    status: 'active',
    showCountdown: false,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    createdAt: '2026-07-24T00:00:00.000Z',
    updatedAt: '2026-07-24T00:00:00.000Z'
  },
  {
    bannerId: 'BAN-2',
    title: 'Craving Biryani?',
    subtitle: 'Authentic Hyderabadi & Dum Biryani Delivered',
    description: 'Freshly prepared with aromatic spices.',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=1000&auto=format&fit=crop&q=80',
    buttonText: 'Explore Biryani',
    couponCode: 'FAST30',
    offerBadge: '⭐ Bestseller',
    redirectType: 'category',
    categoryId: 'Biryani',
    backgroundColor: '#0f172a',
    textColor: '#ffffff',
    priority: 2,
    status: 'active',
    showCountdown: false,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    createdAt: '2026-07-24T00:00:00.000Z',
    updatedAt: '2026-07-24T00:00:00.000Z'
  },
  {
    bannerId: 'BAN-3',
    title: 'Weekend Mega Sale ⚡',
    subtitle: 'Flat 50% OFF on Top Arwal Restaurants',
    description: 'Limited time offer. Order before timer expires!',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1000&auto=format&fit=crop&q=80',
    buttonText: 'Claim Offer',
    couponCode: 'WELCOME70',
    offerBadge: '⚡ Limited Time',
    redirectType: 'restaurant',
    restaurantId: 'rest1',
    backgroundColor: '#0f172a',
    textColor: '#ffffff',
    priority: 3,
    status: 'active',
    showCountdown: true,
    countdownDate: '2026-12-31T23:59:59',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    createdAt: '2026-07-24T00:00:00.000Z',
    updatedAt: '2026-07-24T00:00:00.000Z'
  }
];

let inMemoryBanners: Banner[] = [...defaultBanners];

const BANNERS_STORAGE_KEY = 'arwaleats_banners_data';

export function saveInStorageBanners(banners: Banner[]) {
  try {
    localStorage.setItem(BANNERS_STORAGE_KEY, JSON.stringify(banners));
  } catch (e) {
    console.warn('Failed to save banners to localStorage', e);
  }
}

export function loadInStorageBanners(): Banner[] | null {
  try {
    const saved = localStorage.getItem(BANNERS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load banners from localStorage', e);
  }
  return null;
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === BANNERS_STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) {
          inMemoryBanners = parsed;
          cacheService.saveData('banners', null);
          safeDispatchEvent('arwaleats_banners_updated');
        }
      } catch (err) {
        console.warn('Failed to sync banners from storage event', err);
      }
    }
  });
}

// Initialize Default Data if not exists in-memory
export function initializeDatabase() {
  const savedBanners = loadInStorageBanners();
  if (savedBanners && savedBanners.length > 0) {
    inMemoryBanners = savedBanners;
  } else if (inMemoryBanners.length === 0) {
    inMemoryBanners = [...defaultBanners];
  }

  if (inMemoryCustomers.length === 0) {
    inMemoryCustomers = [
      {
        customerId: 'CUST-101',
        name: 'Narendra Kumar',
        phone: '8102123746',
        email: 'customer@arwaleats.com',
        password: 'password', // Demo password
        address: 'Near SBI Bank, Bariatu Road',
        city: 'Arwal',
        pincode: '804401',
        createdAt: new Date().toISOString(),
      },
    ];
  }

  if (inMemoryCoupons.length === 0) {
    inMemoryCoupons = [
      {
        coupon: 'FREEGOLD',
        discountType: 'Fixed',
        value: 100,
        minimumOrder: 300,
        expiry: '2026-12-31',
        active: true,
      },
      {
        coupon: 'FAST30',
        discountType: 'Percentage',
        value: 30,
        minimumOrder: 150,
        expiry: '2026-12-31',
        active: true,
      },
      {
        coupon: 'WELCOME70',
        discountType: 'Fixed',
        value: 70,
        minimumOrder: 100,
        expiry: '2026-12-31',
        active: true,
      },
    ];
  }

  if (!inMemorySettings) {
    inMemorySettings = {
      deliveryFee: 0,
      minimumOrder: 100,
      restaurantName: 'ArwalEats',
      phone: '+91 81021 23746',
      whatsapp: '7973638639',
      address: 'Bariatu Road, Opposite Rajendra Medical College, Arwal, Bihar 804401',
      openingTime: '11:00 AM',
      closingTime: '11:00 PM',
      isClosed: false,
      closedMessage: 'We are currently closed. Please check back during our opening hours!',
      latitude: 25.0143,
      longitude: 84.6784,
      deliveryChargeSlabs: [
        { id: '1', minDistance: 0, maxDistance: 3, fee: 0, enabled: true },
        { id: '2', minDistance: 3, maxDistance: 4, fee: 27, enabled: true },
        { id: '3', minDistance: 4, maxDistance: 5, fee: 34, enabled: true },
        { id: '4', minDistance: 5, maxDistance: 6, fee: 41, enabled: true },
        { id: '5', minDistance: 6, maxDistance: 7, fee: 48, enabled: true },
        { id: '6', minDistance: 7, maxDistance: 8, fee: 55, enabled: true },
        { id: '7', minDistance: 8, maxDistance: 9, fee: 62, enabled: true },
        { id: '8', minDistance: 9, maxDistance: 10, fee: 69, enabled: true },
        { id: '9', minDistance: 10, maxDistance: 11, fee: 76, enabled: true },
        { id: '10', minDistance: 11, maxDistance: 12, fee: 83, enabled: true },
        { id: '11', minDistance: 12, maxDistance: 13, fee: 90, enabled: true },
        { id: '12', minDistance: 13, maxDistance: 14, fee: 97, enabled: true },
        { id: '13', minDistance: 14, maxDistance: 15, fee: 104, enabled: true }
      ],
      maxDeliveryRadius: 15
    };
  }

  if (inMemoryRestaurants.length === 0) {
    inMemoryRestaurants = [...initialRestaurants];
  }

  if (inMemoryMenu.length === 0) {
    inMemoryMenu = [...initialMenu];
  }

  // Hardcoded locked Google Apps Script endpoint
  const targetGasUrl = 'https://script.google.com/macros/s/AKfycbwMGVw-3f2nCBR68bz0Py5nYBgljqa4H7LcrwtraTs8CoOAJdXHToUS2xQSk4aNt6hmLg/exec';
  localStorage.setItem(STORAGE_KEYS.GAS_URL, targetGasUrl);
}

// Get Apps Script URL - Hardcoded and locked against unauthorized modifications
export function getGasUrl(): string {
  return 'https://script.google.com/macros/s/AKfycbwMGVw-3f2nCBR68bz0Py5nYBgljqa4H7LcrwtraTs8CoOAJdXHToUS2xQSk4aNt6hmLg/exec';
}

let consecutiveGasFailures = 0;
let gasSuspendedUntil = 0;

// Reset the circuit breaker
export function resetGasCircuitBreaker() {
  consecutiveGasFailures = 0;
  gasSuspendedUntil = 0;
}

export function setGasUrl(url: string) {
  // Locked to owner script endpoint
  resetGasCircuitBreaker();
  localStorage.setItem(STORAGE_KEYS.GAS_URL, 'https://script.google.com/macros/s/AKfycbwMGVw-3f2nCBR68bz0Py5nYBgljqa4H7LcrwtraTs8CoOAJdXHToUS2xQSk4aNt6hmLg/exec');
}

// Utility to make requests to Google Apps Script if URL exists
async function fetchFromGas(action: string, payload: any): Promise<any> {
  const url = getGasUrl();
  if (!url) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ action, ...payload }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Google Sheets API responded with status ${response.status}`);
    }
    const data = await response.json();
    consecutiveGasFailures = 0; // Reset on success
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    consecutiveGasFailures++;
    console.warn('[Google Sheets Sync] Sync attempt:', action, error);
    return null;
  }
}

// API Functions
export async function getRestaurantSettings(): Promise<RestaurantSettings> {
  // Check Supabase first
  const supabaseSettings = await SupabaseSettingsService.getSettings();
  if (supabaseSettings) return supabaseSettings;

  const defaultSettings: RestaurantSettings = {
    deliveryFee: 0,
    minimumOrder: 100,
    restaurantName: 'ArwalEats',
    phone: '+91 81021 23746',
    whatsapp: '7973638639',
    address: 'Bariatu Road, Opposite Rajendra Medical College, Arwal, Bihar 804401',
    openingTime: '11:00 AM',
    closingTime: '11:00 PM',
    isClosed: false,
    closedMessage: 'We are currently closed for online orders. Please check back during opening hours!',
    latitude: 25.0143,
    longitude: 84.6784,
  };

  const gasUrl = getGasUrl();
  if (!gasUrl) {
    return defaultSettings;
  }

  try {
    const res = await fetchFromGas('getSettings', {});
    if (res && res.success && res.data) {
      // Sanitize boolean and numeric fields
      const sanitized = {
        ...res.data,
        isClosed: res.data.isClosed === true || String(res.data.isClosed).toLowerCase() === 'true',
        minimumOrder: Number(res.data.minimumOrder || 100),
        deliveryFee: Number(res.data.deliveryFee || 40),
        latitude: res.data.latitude !== undefined ? Number(res.data.latitude) : 25.0143,
        longitude: res.data.longitude !== undefined ? Number(res.data.longitude) : 84.6784,
      };
      return sanitized;
    }
  } catch (err) {
    console.error('Failed to get restaurant settings from GAS', err);
  }
  
  return defaultSettings;
}

export async function saveRestaurantSettings(settings: RestaurantSettings): Promise<boolean> {
  const supabaseSaved = await SupabaseSettingsService.updateSettings(settings);
  if (supabaseSaved) return true;

  const gasUrl = getGasUrl();
  if (!gasUrl) return true;
  
  try {
    const res = await fetchFromGas('updateSettings', { settings });
    return res && res.success;
  } catch (err) {
    console.error('Failed to save restaurant settings via GAS', err);
    return true;
  }
}

export async function checkCustomerExists(email: string, phone: string): Promise<{ exists: boolean; message: string }> {
  initializeDatabase();
  
  // First check in-memory list
  if (inMemoryCustomers.some(c => c.email.toLowerCase() === email.toLowerCase())) {
    return { exists: true, message: 'Email is already registered.' };
  }
  if (inMemoryCustomers.some(c => c.phone === phone)) {
    return { exists: true, message: 'Phone number is already registered.' };
  }

  // Then check GAS list if connected
  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      const res = await fetchFromGas('getAdminCustomers', {});
      if (res && res.success && Array.isArray(res.data)) {
        if (res.data.some((c: any) => c.email && c.email.toLowerCase() === email.toLowerCase())) {
          return { exists: true, message: 'Email is already registered.' };
        }
        if (res.data.some((c: any) => c.phone && String(c.phone) === String(phone))) {
          return { exists: true, message: 'Phone number is already registered.' };
        }
      }
    } catch (err) {
      console.warn('Failed to check customer exists via GAS, relying on in-memory simulation', err);
    }
  }

  return { exists: false, message: '' };
}

export async function registerGuestCustomer(customer: Omit<Customer, 'customerId' | 'createdAt'>): Promise<{ success: boolean; message: string; customer?: Customer }> {
  const gasUrl = getGasUrl();
  let registerSucceededOnSheets = false;
  let sheetsCustomer: Customer | undefined;

  if (gasUrl) {
    try {
      const res = await fetchFromGas('register', { customer: { ...customer, password: 'guest_no_password' } });
      if (res && res.success && res.customer) {
        registerSucceededOnSheets = true;
        sheetsCustomer = res.customer;
      }
    } catch (err) {
      console.warn('Google Sheets DB error during guest registration, falling back to local simulation', err);
    }
  }

  // Simulator & In-Memory Sync
  initializeDatabase();
  
  const existingCust = inMemoryCustomers.find(c => c.email.toLowerCase() === customer.email.toLowerCase());
  if (existingCust) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(existingCust));
    return { success: true, message: 'Welcome back!', customer: existingCust };
  }

  const newCustomer: Customer = sheetsCustomer || {
    ...customer,
    customerId: 'CUST-G' + Math.floor(1000 + Math.random() * 9000),
    createdAt: new Date().toISOString(),
  };

  inMemoryCustomers.push({
    ...newCustomer,
    password: 'guest_no_password'
  });

  const cleanUser = { ...newCustomer };
  delete cleanUser.password;
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(cleanUser));

  return { success: true, message: 'Registered successfully as guest!', customer: cleanUser };
}

export async function registerCustomer(customer: Omit<Customer, 'customerId' | 'createdAt'> & { password?: string }): Promise<{ success: boolean; message: string; customer?: Customer }> {
  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      const res = await fetchFromGas('register', { customer });
      if (res && res.success && res.customer) {
        return { success: true, message: 'Registered successfully!', customer: res.customer };
      } else if (res && !res.success) {
        return { success: false, message: res.message || 'Registration failed.' };
      }
    } catch (err: any) {
      console.warn('Sheets DB error during registration', err);
    }
  }

  // Fallback
  const newCustomer: Customer = {
    ...customer,
    customerId: 'CUST-' + Math.floor(1000 + Math.random() * 9000),
    createdAt: new Date().toISOString(),
  };
  return { success: true, message: 'Registered successfully (simulated)!', customer: newCustomer };
}

export async function loginCustomer(email: string, password?: string): Promise<{ success: boolean; message: string; customer?: Customer }> {
  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      const res = await fetchFromGas('login', { email, password });
      if (res && res.success && res.customer) {
        return { success: true, message: 'Logged in successfully!', customer: res.customer };
      } else if (res && !res.success) {
        return { success: false, message: res.message || 'Invalid email/phone or password.' };
      }
    } catch (err) {
      console.warn('Sheets DB connection error during login', err);
    }
  }
  return { success: false, message: 'Customer record not found. Please register first.' };
}

export async function loginCustomerWithGoogle(email: string): Promise<{ success: boolean; message: string; customer?: Customer; isNewUser: boolean }> {
  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      const res = await fetchFromGas('getCustomer', { identifier: email });
      if (res && res.success && res.customer) {
        return { success: true, message: 'Logged in with Google successfully!', customer: res.customer, isNewUser: false };
      }
    } catch (err) {
      console.warn('Failed to find Google user in GAS:', err);
    }
  }
  return { success: true, message: 'User is new, complete profile registration', customer: undefined, isNewUser: true };
}

export async function loginCustomerByPhone(phone: string): Promise<{ success: boolean; message: string; customer?: Customer }> {
  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      const res = await fetchFromGas('getAdminCustomers', {});
      if (res && res.success && Array.isArray(res.data)) {
        const user = res.data.find((c: any) => c.phone && String(c.phone).trim() === String(phone).trim());
        if (user) {
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
          return { success: true, message: 'Logged in successfully!', customer: user };
        }
      }
    } catch (err) {
      console.warn('Failed to find phone user in GAS:', err);
    }
  }

  initializeDatabase();
  const user = inMemoryCustomers.find(c => c.phone === phone);

  if (!user) {
    return { success: false, message: 'Phone number is not registered.' };
  }

  // Clear password before sending
  const cleanUser = { ...user };
  delete cleanUser.password;

  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(cleanUser));
  return { success: true, message: 'Logged in successfully!', customer: cleanUser };
}

export function getCurrentUser(): Customer | null {
  const userStr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (!userStr || userStr === 'undefined') return null;
  try {
    return JSON.parse(userStr);
  } catch (e) {
    console.error("Failed to parse current user:", e);
    return null;
  }
}

export function logoutCustomer() {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
}

export async function updateCustomerProfile(customer: Customer): Promise<{ success: boolean; message: string; customer?: Customer }> {
  // 1. Prepare and save in-memory first to ensure instantaneous response and data preservation
  initializeDatabase();
  let index = inMemoryCustomers.findIndex(c => c.customerId === customer.customerId);

  if (index === -1) {
    inMemoryCustomers.push(customer);
    index = inMemoryCustomers.length - 1;
  }

  inMemoryCustomers[index] = customer;
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(customer));

  // 2. Synchronize with Google Sheets
  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      const res = await fetchFromGas('updateCustomer', { customer });
      if (res && res.success && res.customer) {
        // Merge response with local data to protect against missing fields from old sheet schemas
        const mergedUser = {
          ...customer,
          ...res.customer,
          address: res.customer.address || customer.address,
          city: res.customer.city || customer.city,
          pincode: res.customer.pincode || customer.pincode,
          name: res.customer.name || customer.name,
          phone: res.customer.phone || customer.phone,
        };
        
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(mergedUser));
        
        const idx = inMemoryCustomers.findIndex(c => c.customerId === customer.customerId);
        if (idx !== -1) {
          inMemoryCustomers[idx] = mergedUser;
        }
        
        return { success: true, message: 'Profile updated successfully!', customer: mergedUser };
      }
    } catch (err) {
      console.warn('Failed to update profile on Google Sheets, relying on in-memory cache', err);
    }
  }

  return { success: true, message: 'Profile updated successfully!', customer: customer };
}

export async function placeOrder(
  customerId: string,
  subtotal: number,
  discount: number,
  deliveryFee: number,
  total: number,
  paymentMethod: string,
  couponCode: string,
  items: Array<{ itemId: string; name: string; variant: string; price: number; qty: number }>,
  estimatedDeliveryTime?: string,
  additionalFields?: {
    restaurantId?: string;
    restaurantName?: string;
    delivery_zone?: string;
    customer_lat?: number;
    customer_lng?: number;
    restaurant_lat?: number;
    restaurant_lng?: number;
    distance_km?: number;
    estimated_time?: string;
    delivery_fee?: number;
    grand_total?: number;
    placeId?: string;
    route_summary?: string;
  }
): Promise<{ success: boolean; orderId: string; message: string }> {
  const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
  const dateStr = new Date().toISOString();

  // Try Supabase first
  const supabaseRes = await SupabaseOrderService.placeOrder({
    orderId,
    customerId,
    date: dateStr,
    subtotal,
    discount,
    deliveryFee,
    total,
    paymentMethod,
    coupon: couponCode,
    estimatedDeliveryTime,
    ...additionalFields
  }, items);

  if (supabaseRes.success) return supabaseRes;

  try {
    // Distance-based delivery fee calculation (Server-side validation)
    initializeDatabase();
    const settings = inMemorySettings || { deliveryFee: 0, maxDeliveryRadius: 15, deliveryChargeSlabs: [] };
    let finalDeliveryFee = deliveryFee;
    let finalTotal = total;
    let finalAdditionalFields = { ...additionalFields };

    if (additionalFields?.customer_lat && additionalFields?.customer_lng && additionalFields?.restaurant_lat && additionalFields?.restaurant_lng) {
      // Calculate road distance
      const straightDist = haversineDistance(
        additionalFields.customer_lat, 
        additionalFields.customer_lng, 
        additionalFields.restaurant_lat, 
        additionalFields.restaurant_lng
      );
      
      const distance = additionalFields.distance_km || parseFloat((straightDist * 1.30).toFixed(2));
      
      if (distance > (settings.maxDeliveryRadius || 15)) {
        return { success: false, orderId: '', message: 'not our service area' };
      }
      
      const fee = calculateDeliveryFee(distance, settings.deliveryChargeSlabs || []);
      if (fee === null) {
        return { success: false, orderId: '', message: 'not our service area' };
      }
      
      finalDeliveryFee = fee;
      finalTotal = subtotal - discount + fee;
      finalAdditionalFields = { 
        ...additionalFields, 
        distance_km: distance, 
        delivery_fee: fee, 
        grand_total: finalTotal 
      };
    }

    const res = await fetchFromGas('placeOrder', {
      order: {
        orderId,
        customerId,
        date: dateStr,
        subtotal,
        discount,
        deliveryFee: finalDeliveryFee,
        total: finalTotal,
        paymentMethod,
        status: 'Pending',
        coupon: couponCode,
        estimatedDeliveryTime: estimatedDeliveryTime || '',
        restaurantId: finalAdditionalFields.restaurantId || 'rest1',
        restaurantName: finalAdditionalFields.restaurantName || 'ArwalEats',
        ...finalAdditionalFields,
      },
      items: items.map(item => ({
        orderId,
        ...item,
      }))
    });

    if (res && res.success) {
      return { success: true, orderId, message: 'Order placed successfully!' };
    } else {
      return { success: false, orderId: '', message: res?.message || 'Failed to place order via GAS' };
    }
  } catch (err) {
    console.error('Failed to place order via GAS', err);
    return { success: false, orderId: '', message: 'Error communicating with server.' };
  }
}

export async function getCustomerOrders(customerId: string): Promise<Array<Order & { items: OrderItem[] }>> {
  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      const res = await fetchFromGas('getOrders', { customerId });
      if (res && res.success && Array.isArray(res.data)) {
        const unique = res.data.reduce((acc: any[], current: any) => {
          if (!acc.find(it => it.orderId === current.orderId)) {
            acc.push(current);
          }
          return acc;
        }, []);
        return unique;
      }
    } catch (err) {
      console.warn('Google Sheets getOrders failed, falling back.');
    }
  }

  // Simulator
  initializeDatabase();

  const userOrders = inMemoryOrders.filter(o => o.customerId === customerId);

  return userOrders.map(order => {
    const items = inMemoryOrderItems.filter(item => item.orderId === order.orderId);
    return {
      ...order,
      items,
    };
  });
}

export async function getCoupons(): Promise<Coupon[]> {
  const gasUrl = getGasUrl();
  if (!gasUrl) {
    console.warn('Google Sheets not configured. Coupons unavailable.');
    return [];
  }
  try {
    const res = await fetchFromGas('getCoupons', {});
    if (res && res.success && Array.isArray(res.data)) {
      return res.data;
    }
  } catch (err) {
    console.warn('Google Sheets coupons load failed.');
  }
  return [];
}

export async function validateCoupon(code: string, subtotal: number): Promise<{ success: boolean; message: string; discount: number; coupon?: Coupon }> {
  const coupons = await getCoupons();
  const coupon = coupons.find(c => c.coupon.toUpperCase() === code.trim().toUpperCase());

  if (!coupon) {
    return { success: false, message: 'Invalid coupon code.', discount: 0 };
  }

  if (!coupon.active) {
    return { success: false, message: 'Coupon is inactive.', discount: 0 };
  }

  // Check expiry
  if (new Date(coupon.expiry) < new Date()) {
    return { success: false, message: 'Coupon has expired.', discount: 0 };
  }

  // Check minimum order
  if (subtotal < coupon.minimumOrder) {
    return { success: false, message: `Minimum order of ₹${coupon.minimumOrder} required for this coupon.`, discount: 0 };
  }

  let discount = 0;
  if (coupon.discountType === 'Percentage') {
    discount = Math.round((subtotal * coupon.value) / 100);
  } else {
    discount = coupon.value;
  }

  return { success: true, message: 'Coupon applied successfully!', discount, coupon };
}

// Generate code for Code.gs to allow users to build the real Google Sheets backend
export function getAppsScriptCode(): string {
  return `/**
 * Google Apps Script Backend for ArwalEats Food Delivery Website
 * 
 * 1. Create a Google Sheet with the following sheets:
 *    - Customers (customerId, name, phone, email, password, address, city, pincode, createdAt)
 *    - Orders (orderId, customerId, date, subtotal, discount, deliveryFee, total, paymentMethod, status, coupon)
 *    - OrderItems (orderId, itemId, name, variant, price, qty)
 *    - Coupons (coupon, discountType, value, minimumOrder, expiry, active)
 *    - Settings (deliveryFee, minimumOrder, restaurantName, phone, whatsapp, address, openingTime, closingTime)
 *    - Menu (id, name, category, variant, price, image, available, featured)
 *    - Restaurants (id, name, phone, address, cuisine, image, rating, deliveryTime, active, featured, deliveryRadius, latitude, longitude, username, password, login) -> For Merchant Username & Store Password
 *    - Admins (username, password, role)
 *    - Messages (id, name, email, phone, subject, message, createdAt)
 *    - Reviews (id, orderId, customerId, name, address, rating, feedback, createdAt)
 *    - CustomNotifications (id, title, message, type, createdAt)
 * 
 * 2. Deploy this script as a Web App:
 *    - Click "Deploy" -> "New deployment"
 *    - Select type: "Web app"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 *    - Copy the Web App URL and paste it into the "Connect Sheets" settings of ArwalEats.
 */

function doPost(e) {
  // Safeguard against running doPost directly in the Google Apps Script editor
  if (!e || !e.postData || !e.postData.contents) {
    const errorMsg = "Warning: doPost was run manually from the Apps Script editor without POST body contents. " +
                     "To initialize database tables or authorize script permissions, please select 'initSheets' " +
                     "from the dropdown menu at the top and click 'Run' instead.";
    console.warn(errorMsg);
    return errorMsg;
  }
  
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    Logger.log('Action received: ' + action);
    Logger.log('Payload: ' + JSON.stringify(postData));
    
    let result = { success: false, message: "Invalid action: " + action };
    
    switch (action) {
      case 'getSettings':
        result = getSettings();
        break;
      case 'updateSettings':
        result = updateSettings(postData.settings);
        break;
      case 'register':
        result = register(postData.customer);
        break;
      case 'login':
        result = login(postData.email, postData.password);
        break;
      case 'updateProfile':
        result = updateProfile(postData.customer);
        break;
      case 'placeOrder':
        result = placeOrder(postData.order, postData.items);
        break;
      case 'getOrders':
        result = getOrders(postData.customerId);
        break;
      case 'getCoupons':
        result = getCoupons();
        break;
      case 'adminLogin':
        result = adminLogin(postData.username, postData.password);
        break;
      case 'getAdminDashboard':
        result = getAdminDashboard();
        break;
      case 'getAdminOrders':
        result = getAdminOrders();
        break;
      case 'updateOrderStatus':
        result = updateOrderStatus(postData.orderId, postData.status);
        break;
      case 'assignDeliveryBoy':
        result = assignDeliveryBoy(postData.orderId, postData.deliveryBoyDetails);
        break;
      case 'getAdminCustomers':
        result = getAdminCustomers();
        break;
      case 'getMenuItems':
        result = getMenuItems();
        break;
      case 'addMenuItem':
        result = addMenuItem(postData.item);
        break;
      case 'deleteMenuItem':
        result = deleteMenuItem(postData.id);
        break;
      case 'clearAllMenuItems':
        result = clearAllMenuItems();
        break;
      case 'updateMenuItem':
        result = updateMenuItem(postData.item);
        break;
      case 'getRestaurants':
        result = getRestaurants();
        break;
      case 'addRestaurant':
        result = addRestaurant(postData.restaurant);
        break;
      case 'deleteRestaurant':
        result = deleteRestaurant(postData.id);
        break;
      case 'updateRestaurant':
        result = updateRestaurant(postData.restaurant);
        break;
      case 'merchantLogin':
        result = merchantLogin(postData.username, postData.password);
        break;
      case 'getContactMessages':
        result = getContactMessages();
        break;
      case 'saveContactMessage':
        result = saveContactMessage(postData.message);
        break;
      case 'deleteContactMessage':
        result = deleteContactMessage(postData.id);
        break;
      case 'getCustomerReviews':
        result = getCustomerReviews();
        break;
      case 'saveCustomerReview':
        result = saveCustomerReview(postData.review);
        break;
      case 'deleteCustomerReview':
        result = deleteCustomerReview(postData.id);
        break;
      case 'getCustomNotifications':
        result = getCustomNotifications();
        break;
      case 'saveCustomNotification':
        result = saveCustomNotification(postData.notification);
        break;
      case 'deleteCustomNotification':
        result = deleteCustomNotification(postData.id);
        break;
      default:
        result = { success: false, message: "Unknown action: " + action };
        break;
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  if (!e) {
    const errorMsg = "Warning: doGet was run manually from the Apps Script editor. " +
                     "To initialize database tables or authorize script permissions, please select 'initSheets' " +
                     "from the dropdown menu at the top and click 'Run' instead.";
    console.warn(errorMsg);
    return errorMsg;
  }
  return ContentService.createTextOutput(JSON.stringify({ success: true, message: "ArwalEats API is online" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function initSheets() {
  console.log("Initializing ArwalEats Google Sheet Database tables...");
  
  // 1. Settings
  const settingsSheet = getSheetByName("Settings");
  if (settingsSheet.getDataRange().getValues().length <= 1) {
    const headers = ["deliveryFee", "minimumOrder", "restaurantName", "phone", "whatsapp", "address", "openingTime", "closingTime"];
    const defaults = [40, 100, "ArwalEats", "+91 98765 43210", "+91 98765 43210", "Bariatu Road, Arwal, Bihar 804401", "11:00 AM", "11:00 PM"];
    settingsSheet.appendRow(headers);
    settingsSheet.appendRow(defaults);
    console.log("- Created and seeded 'Settings' sheet.");
  }
  
  // 2. Customers
  const custSheet = getSheetByName("Customers");
  if (custSheet.getDataRange().getValues().length <= 1) {
    const headers = ["customerId", "name", "phone", "email", "password", "address", "city", "pincode", "createdAt"];
    custSheet.appendRow(headers);
    console.log("- Created 'Customers' sheet.");
  }
  
  // 3. Orders
  const orderSheet = getSheetByName("Orders");
  if (orderSheet.getDataRange().getValues().length <= 1) {
    const headers = ["orderId", "customerId", "date", "subtotal", "discount", "deliveryFee", "total", "paymentMethod", "status", "coupon", "deliveryBoyName", "deliveryBoyPhone", "vehicleNumber", "estimatedDeliveryTime", "deliveryNotes", "restaurantId", "restaurantName", "customer_lat", "customer_lng", "restaurant_lat", "restaurant_lng", "distance_km", "estimated_time", "delivery_fee", "grand_total"];
    orderSheet.appendRow(headers);
    console.log("- Created 'Orders' sheet.");
  }
  
  // 4. OrderItems
  const itemsSheet = getSheetByName("OrderItems");
  if (itemsSheet.getDataRange().getValues().length <= 1) {
    const headers = ["orderId", "itemId", "name", "variant", "price", "qty"];
    itemsSheet.appendRow(headers);
    console.log("- Created 'OrderItems' sheet.");
  }
  
  // 5. Coupons
  const couponsSheet = getSheetByName("Coupons");
  if (couponsSheet.getDataRange().getValues().length <= 1) {
    const headers = ["coupon", "discountType", "value", "minimumOrder", "expiry", "active"];
    couponsSheet.appendRow(headers);
    
    const defaults = [
      ["FREEGOLD", "Fixed", 100, 300, "2026-12-31", true],
      ["FAST30", "Percentage", 30, 150, "2026-12-31", true],
      ["WELCOME70", "Fixed", 70, 100, "2026-12-31", true]
    ];
    for (let d of defaults) {
      couponsSheet.appendRow(d);
    }
    console.log("- Created and seeded 'Coupons' sheet.");
  }
  
  // 6. Menu
  const menuSheet = getSheetByName("Menu");
  if (menuSheet.getDataRange().getValues().length <= 1) {
    const headers = ["id", "name", "category", "variant", "price", "image", "available", "featured", "profitMargin", "dietType", "description", "restaurantId"];
    menuSheet.appendRow(headers);
    console.log("- Created 'Menu' sheet.");
  }

  // 7. Admins
  const adminSheet = getSheetByName("Admins");
  if (adminSheet.getDataRange().getValues().length <= 1) {
    adminSheet.appendRow(["username", "password", "role"]);
    adminSheet.appendRow(["admin", "admin123", "Super Admin"]);
    console.log("- Created and seeded 'Admins' sheet.");
  }

  // 8. Restaurants
  const restSheet = getSheetByName("Restaurants");
  if (restSheet.getDataRange().getValues().length <= 1) {
    const headers = ["id", "name", "phone", "address", "cuisine", "image", "rating", "deliveryTime", "active", "featured", "deliveryRadius", "latitude", "longitude", "username", "password", "login"];
    restSheet.appendRow(headers);
    
    const defaults = [
      ["rest1", "Arwal Eats Main Kitchen", "+91 81021 23746", "Bariatu Road, Opposite Rajendra Medical College, Arwal, Bihar 804401", "North Indian, Thalis & Biryani", "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop&q=80", 4.8, "25-35 mins", true, true, 10, 25.249325, 84.682145, "arwal", "password", "arwal"],
      ["rest2", "Zaika Biryani House", "+91 99887 76655", "Wasilpur Crossing, Main Bazar, Arwal, Bihar 804401", "Biriyani, Mughlai & Rolls", "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80", 4.5, "20-30 mins", true, true, 5, 25.248325, 84.681145, "zaika", "password", "zaika"],
      ["rest3", "The Sweet & Cake Plaza", "+91 99887 76654", "Near Block Chowk, Kurtha Road, Arwal, Bihar 804401", "Cakes, Shakes, Desserts & Sweet", "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80", 4.9, "15-25 mins", true, true, 8, 25.247325, 84.680145, "sweet", "password", "sweet"],
      ["rest4", "China Town Express", "+91 99887 76653", "Station Road, Near Railway Station, Arwal, Bihar 804401", "Chinese, Noodles, Burgers & Snacks", "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80", 4.2, "30-40 mins", true, false, 7, 25.246325, 84.679145, "china", "password", "china"]
    ];
    for (let r of defaults) {
      restSheet.appendRow(r);
    }
    console.log("- Created and seeded 'Restaurants' sheet.");
  }

  // 9. Messages
  const msgSheet = getSheetByName("Messages");
  if (msgSheet.getDataRange().getValues().length <= 1) {
    const headers = ["id", "name", "email", "phone", "subject", "message", "createdAt"];
    msgSheet.appendRow(headers);
    console.log("- Created 'Messages' sheet.");
  }

  // 10. Reviews
  const revSheet = getSheetByName("Reviews");
  if (revSheet.getDataRange().getValues().length <= 1) {
    const headers = ["id", "orderId", "customerId", "name", "address", "rating", "feedback", "createdAt"];
    revSheet.appendRow(headers);
    console.log("- Created 'Reviews' sheet.");
  }

  // 11. CustomerAlerts
  const alertsSheet = getSheetByName("CustomerAlerts");
  if (alertsSheet.getDataRange().getValues().length <= 1) {
    const headers = ["alertId", "title", "message", "type", "targetAudience", "startDate", "endDate", "isActive", "priority", "createdAt", "createdBy"];
    alertsSheet.appendRow(headers);
    const defaultAlert = ["ALERT-1", "Welcome to ArwalEats! 🎉", "Get hot, fresh, and delicious food delivered fast straight to your doorstep. Use coupon WELCOME70 to get flat 70 Rs discount on your first order!", "Offer", "All Customers", "2026-01-01", "2026-12-31", true, "High", "2026-07-16T00:00:00.000Z", "System"];
    alertsSheet.appendRow(defaultAlert);
    console.log("- Created and seeded 'CustomerAlerts' sheet.");
  }
  
  console.log("Success! All ArwalEats sheets/tables are initialized and ready.");
  return "Database Initialized Successfully!";
}

function testSpreadsheetConnection() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return "Connection Failed: No active spreadsheet. Make sure this script is container-bound (open Google Sheet > Extensions > Apps Script).";
    }
    return "Connection Successful! Spreadsheet Title: " + ss.getName();
  } catch (err) {
    return "Connection Error: " + err.toString();
  }
}

function getSheetByName(name) {
  let ss;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    // getActiveSpreadsheet can throw in some environments
  }
  
  if (!ss) {
    const errorMsg = "Error: Active spreadsheet not found. To fix this:\n" +
                     "1. Make sure you created this script by opening your Google Sheet and clicking 'Extensions > Apps Script' (this makes it a container-bound script).\n" +
                     "2. If you want to use a standalone script, open your Google Sheet, copy its ID from the URL, and define it in your Apps Script code (e.g. SpreadsheetApp.openById('YOUR_SPREADSHEET_ID')).";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  let sheet = ss.getSheetByName(name);
  let isNew = false;
  if (!sheet) {
    sheet = ss.insertSheet(name);
    isNew = true;
  }
  
  // Check if sheet is empty or lacks headers, and seed it automatically
  const values = sheet.getDataRange().getValues();
  if (isNew || values.length === 0 || (values.length === 1 && values[0][0] === "")) {
    seedSheet(sheet, name);
  }
  
  return sheet;
}

function seedSheet(sheet, name) {
  sheet.clearContents();
  
  if (name === "Settings") {
    const headers = ["deliveryFee", "minimumOrder", "restaurantName", "phone", "whatsapp", "address", "openingTime", "closingTime", "latitude", "longitude"];
    const defaults = [40, 100, "ArwalEats", "+91 98765 43210", "+91 98765 43210", "Bariatu Road, Arwal, Bihar 804401", "11:00 AM", "11:00 PM", 25.0143, 84.6784];
    sheet.appendRow(headers);
    sheet.appendRow(defaults);
  } else if (name === "Customers") {
    const headers = ["customerId", "name", "phone", "email", "password", "address", "city", "pincode", "createdAt"];
    sheet.appendRow(headers);
  } else if (name === "Orders") {
    const headers = ["orderId", "customerId", "date", "subtotal", "discount", "deliveryFee", "total", "paymentMethod", "status", "coupon", "deliveryBoyName", "deliveryBoyPhone", "vehicleNumber", "estimatedDeliveryTime", "deliveryNotes", "restaurantId", "restaurantName", "customer_lat", "customer_lng", "restaurant_lat", "restaurant_lng", "distance_km", "estimated_time", "delivery_fee", "grand_total"];
    sheet.appendRow(headers);
  } else if (name === "OrderItems") {
    const headers = ["orderId", "itemId", "name", "variant", "price", "qty"];
    sheet.appendRow(headers);
  } else if (name === "Coupons") {
    const headers = ["coupon", "discountType", "value", "minimumOrder", "expiry", "active"];
    sheet.appendRow(headers);
    const defaults = [
      ["FREEGOLD", "Fixed", 100, 300, "2026-12-31", true],
      ["FAST30", "Percentage", 30, 150, "2026-12-31", true],
      ["WELCOME70", "Fixed", 70, 100, "2026-12-31", true]
    ];
    for (let i = 0; i < defaults.length; i++) {
      sheet.appendRow(defaults[i]);
    }
  } else if (name === "Menu") {
    const headers = ["id", "name", "category", "variant", "price", "image", "available", "featured", "profitMargin", "dietType", "description"];
    sheet.appendRow(headers);
  } else if (name === "Admins") {
    sheet.appendRow(["username", "password", "role"]);
    sheet.appendRow(["admin", "admin123", "Super Admin"]);
    sheet.appendRow(["delivery", "delivery123", "Delivery Boy"]);
    sheet.appendRow(["ujjwal", "ujjwal123", "Delivery Boy"]);
    sheet.appendRow(["sarvjit", "sarvjit123", "Delivery Boy"]);
  } else if (name === "Restaurants") {
    const headers = ["id", "name", "phone", "address", "cuisine", "image", "rating", "deliveryTime", "active", "featured", "deliveryRadius", "latitude", "longitude", "username", "password", "login"];
    sheet.appendRow(headers);
    const defaults = ["rest1", "ArwalEats", "+91 98765 43210", "Bariatu Road, Arwal, Bihar 804401", "Indian, Chinese", "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop&q=60", 4.8, "20-30 mins", true, true, 10, 25.249325, 84.682145, "arwal", "password", "arwal"];
    sheet.appendRow(defaults);
  } else if (name === "Messages") {
    const headers = ["id", "name", "email", "phone", "subject", "message", "createdAt"];
    sheet.appendRow(headers);
  } else if (name === "Reviews") {
    const headers = ["id", "orderId", "customerId", "name", "address", "rating", "feedback", "createdAt"];
    sheet.appendRow(headers);
  } else if (name === "CustomNotifications") {
    const headers = ["id", "title", "message", "type", "createdAt"];
    sheet.appendRow(headers);
  }
}

function getSettings() {
  const sheet = getSheetByName("Settings");
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    // Return defaults if sheet is empty
    const defaults = {
      deliveryFee: 40,
      minimumOrder: 100,
      restaurantName: "ArwalEats",
      phone: "+91 81021 23746",
      whatsapp: "+91 81021 23746",
      address: "Bariatu Road, Arwal, Bihar 804401",
      openingTime: "11:00 AM",
      closingTime: "11:00 PM"
    };
    return { success: true, data: defaults };
  }
  
  // Settings sheet format: 1 row of headers, 1 row of values
  const headers = data[0];
  const values = data[1];
  const settingsObj = {};
  
  for (let i = 0; i < headers.length; i++) {
    settingsObj[headers[i]] = values[i];
  }
  
  return { success: true, data: settingsObj };
}

function updateSettings(settings) {
  const sheet = getSheetByName("Settings");
  sheet.clear();
  
  const headers = Object.keys(settings);
  const values = Object.values(settings);
  
  sheet.appendRow(headers);
  sheet.appendRow(values);
  
  return { success: true };
}

function register(customer) {
  const sheet = getSheetByName("Customers");
  const data = sheet.getDataRange().getValues();
  
  // Find headers
  let headers = data[0];
  if (data.length === 1 && data[0][0] === "") {
    headers = ["customerId", "name", "phone", "email", "password", "address", "city", "pincode", "createdAt"];
    sheet.appendRow(headers);
  }
  
  // Check if email already exists
  const emailColIndex = headers.indexOf("email");
  for (let i = 1; i < data.length; i++) {
    if (data[i][emailColIndex].toString().toLowerCase() === customer.email.toLowerCase()) {
      return { success: false, message: "Email already registered" };
    }
  }
  
  const customerId = "CUST-" + Math.floor(1000 + Math.random() * 9000);
  const createdAt = new Date().toISOString();
  
  const newRow = headers.map(header => {
    if (header === "customerId") return customerId;
    if (header === "createdAt") return createdAt;
    return customer[header] || "";
  });
  
  sheet.appendRow(newRow);
  
  const createdCustomer = { ...customer, customerId, createdAt };
  delete createdCustomer.password; // Do not return password
  
  return { success: true, customer: createdCustomer };
}

function login(email, password) {
  const sheet = getSheetByName("Customers");
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return { success: false, message: "No registered customers yet" };
  }
  
  const headers = data[0];
  const emailColIndex = headers.indexOf("email");
  const phoneColIndex = headers.indexOf("phone");
  const passColIndex = headers.indexOf("password");
  
  for (let i = 1; i < data.length; i++) {
    const sheetEmail = data[i][emailColIndex] ? data[i][emailColIndex].toString().toLowerCase() : "";
    const sheetPhone = data[i][phoneColIndex] ? data[i][phoneColIndex].toString() : "";
    const inputIdentifier = email.toString().toLowerCase();
    
    if ((sheetEmail === inputIdentifier || sheetPhone === inputIdentifier) && data[i][passColIndex].toString() === password.toString()) {
      const customer = {};
      for (let j = 0; j < headers.length; j++) {
        if (headers[j] !== "password") {
          customer[headers[j]] = data[i][j];
        }
      }
      return { success: true, customer: customer };
    }
  }
  
  return { success: false, message: "Invalid email/phone or password" };
}

function updateProfile(customer) {
  const sheet = getSheetByName("Customers");
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return { success: false, message: "Customer not found" };
  
  const headers = data[0];
  const custIdColIndex = headers.indexOf("customerId");
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][custIdColIndex].toString() === customer.customerId.toString()) {
      // Update cell values
      for (let j = 0; j < headers.length; j++) {
        const key = headers[j];
        if (key !== "customerId" && key !== "password" && key !== "createdAt" && customer[key] !== undefined) {
          sheet.getRange(i + 1, j + 1).setValue(customer[key]);
        }
      }
      
      // Fetch fresh record
      const updatedCustomer = {};
      const freshRow = sheet.getRange(i + 1, 1, 1, headers.length).getValues()[0];
      for (let j = 0; j < headers.length; j++) {
        if (headers[j] !== "password") {
          updatedCustomer[headers[j]] = freshRow[j];
        }
      }
      return { success: true, customer: updatedCustomer };
    }
  }
  
  return { success: false, message: "Customer profile not found" };
}

function placeOrder(order, items) {
  const orderSheet = getSheetByName("Orders");
  const itemsSheet = getSheetByName("OrderItems");
  
  // Append Order
  const orderHeaders = [
    "orderId", "customerId", "date", "subtotal", "discount", "deliveryFee", "total", "paymentMethod", "status", "coupon",
    "deliveryBoyName", "deliveryBoyPhone", "vehicleNumber", "estimatedDeliveryTime", "deliveryNotes", "restaurantId", "restaurantName",
    "customer_lat", "customer_lng", "restaurant_lat", "restaurant_lng", "distance_km", "estimated_time", "delivery_fee", "grand_total"
  ];
  if (orderSheet.getLastRow() === 0) {
    orderSheet.appendRow(orderHeaders);
  }
  const orderRow = orderHeaders.map(h => order[h] !== undefined ? order[h] : "");
  orderSheet.appendRow(orderRow);
  
  // Append OrderItems
  const itemHeaders = ["orderId", "itemId", "name", "variant", "price", "qty"];
  if (itemsSheet.getLastRow() === 0) {
    itemsSheet.appendRow(itemHeaders);
  }
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemRow = itemHeaders.map(h => {
      if (h === "orderId") return order.orderId;
      return item[h] !== undefined ? item[h] : "";
    });
    itemsSheet.appendRow(itemRow);
  }
  
  return { success: true, orderId: order.orderId };
}

function getOrders(customerId) {
  const orderSheet = getSheetByName("Orders");
  const itemsSheet = getSheetByName("OrderItems");
  
  const orderData = orderSheet.getDataRange().getValues();
  const itemsData = itemsSheet.getDataRange().getValues();
  
  if (orderData.length <= 1) {
    return { success: true, data: [] };
  }
  
  const orderHeaders = orderData[0];
  const itemHeaders = itemsData[0];
  
  const custIdColIndex = orderHeaders.indexOf("customerId");
  const orderIdColIndexInOrders = orderHeaders.indexOf("orderId");
  const orderIdColIndexInItems = itemHeaders.indexOf("orderId");
  
  const customerOrders = [];
  
  for (let i = 1; i < orderData.length; i++) {
    if (orderData[i][custIdColIndex].toString() === customerId.toString()) {
      const order = {};
      for (let j = 0; j < orderHeaders.length; j++) {
        order[orderHeaders[j]] = orderData[i][j];
      }
      
      // Get items
      const items = [];
      for (let k = 1; k < itemsData.length; k++) {
        if (itemsData[k][orderIdColIndexInItems].toString() === order.orderId.toString()) {
          const item = {};
          for (let l = 0; l < itemHeaders.length; l++) {
            item[itemHeaders[l]] = itemsData[k][l];
          }
          items.push(item);
        }
      }
      
      order.items = items;
      customerOrders.unshift(order); // Newest first
    }
  }
  
  return { success: true, data: customerOrders };
}

function getCoupons() {
  const sheet = getSheetByName("Coupons");
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    // Append defaults
    const headers = ["coupon", "discountType", "value", "minimumOrder", "expiry", "active"];
    sheet.appendRow(headers);
    
    const defaults = [
      ["FREEGOLD", "Fixed", 100, 300, "2026-12-31", true],
      ["FAST30", "Percentage", 30, 150, "2026-12-31", true],
      ["WELCOME70", "Fixed", 70, 100, "2026-12-31", true]
    ];
    for (let d of defaults) {
      sheet.appendRow(d);
    }
    
    return {
      success: true,
      data: defaults.map(d => ({
        coupon: d[0],
        discountType: d[1],
        value: d[2],
        minimumOrder: d[3],
        expiry: d[4],
        active: d[5]
      }))
    };
  }
  
  const headers = data[0];
  const coupons = [];
  
  for (let i = 1; i < data.length; i++) {
    const coupon = {};
    for (let j = 0; j < headers.length; j++) {
      let val = data[i][j];
      if (headers[j] === "active") val = (val === true || val.toString().toLowerCase() === "true");
      coupon[headers[j]] = val;
    }
    coupons.push(coupon);
  }
  
  return { success: true, data: coupons };
}

function adminLogin(username, password) {
  const sheet = getSheetByName("Admins");
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    sheet.appendRow(["username", "password", "role"]);
    sheet.appendRow(["admin", "admin123", "Super Admin"]);
    sheet.appendRow(["delivery", "delivery123", "Delivery Boy"]);
    sheet.appendRow(["ujjwal", "ujjwal123", "Delivery Boy"]);
    sheet.appendRow(["sarvjit", "sarvjit123", "Delivery Boy"]);
    if (username === "admin" && password === "admin123") {
      return { success: true, admin: { username: "admin", role: "Super Admin" } };
    }
    if (username === "delivery" && password === "delivery123") {
      return { success: true, admin: { username: "delivery", role: "Delivery Boy" } };
    }
    if (username === "ujjwal" && password === "ujjwal123") {
      return { success: true, admin: { username: "Ujjwal", role: "Delivery Boy" } };
    }
    if (username === "sarvjit" && password === "sarvjit123") {
      return { success: true, admin: { username: "Sarvjit", role: "Delivery Boy" } };
    }
    return { success: false, message: "Invalid credentials" };
  }
  const headers = data[0];
  const userIdx = headers.indexOf("username");
  const passIdx = headers.indexOf("password");
  const roleIdx = headers.indexOf("role");
  
  if (userIdx === -1 || passIdx === -1) {
    return { success: false, message: "Admins sheet headers missing" };
  }
  
  // Self-heal: Check if 'admin', 'delivery', 'ujjwal', and 'sarvjit' accounts are present in the Admins list, and append them if not
  let adminFound = false;
  let deliveryFound = false;
  let ujjwalFound = false;
  let sarvjitFound = false;
  for (let i = 1; i < data.length; i++) {
    const val = data[i][userIdx] ? data[i][userIdx].toString().toLowerCase().trim() : "";
    if (val === "admin") adminFound = true;
    if (val === "delivery") deliveryFound = true;
    if (val === "ujjwal") ujjwalFound = true;
    if (val === "sarvjit") sarvjitFound = true;
  }
  if (!adminFound) {
    sheet.appendRow(["admin", "admin123", "Super Admin"]);
    data.push(["admin", "admin123", "Super Admin"]);
  }
  if (!deliveryFound) {
    sheet.appendRow(["delivery", "delivery123", "Delivery Boy"]);
    data.push(["delivery", "delivery123", "Delivery Boy"]);
  }
  if (!ujjwalFound) {
    sheet.appendRow(["ujjwal", "ujjwal123", "Delivery Boy"]);
    data.push(["ujjwal", "ujjwal123", "Delivery Boy"]);
  }
  if (!sarvjitFound) {
    sheet.appendRow(["sarvjit", "sarvjit123", "Delivery Boy"]);
    data.push(["sarvjit", "sarvjit123", "Delivery Boy"]);
  }
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][userIdx] && data[i][userIdx].toString().toLowerCase().trim() === username.toString().toLowerCase().trim() && 
        data[i][passIdx] && data[i][passIdx].toString() === password.toString()) {
      return { success: true, admin: { username: data[i][userIdx], role: data[i][roleIdx] || "Admin" } };
    }
  }
  return { success: false, message: "Invalid username or password" };
}

function getAdminOrders() {
  const orderSheet = getSheetByName("Orders");
  const itemsSheet = getSheetByName("OrderItems");
  const custSheet = getSheetByName("Customers");
  const orderData = orderSheet.getDataRange().getValues();
  const itemsData = itemsSheet.getDataRange().getValues();
  const custData = custSheet.getDataRange().getValues();
  if (orderData.length <= 1) return { success: true, data: [] };

  const orderHeaders = orderData[0];
  const itemHeaders = itemsData[0];
  const custHeaders = custData[0];

  const orderIdIdx = orderHeaders.indexOf("orderId");
  const custIdIdxInOrders = orderHeaders.indexOf("customerId");
  const orderIdIdxInItems = itemHeaders.indexOf("orderId");

  const custIdIdxInCust = custHeaders.indexOf("customerId");
  const custNameIdx = custHeaders.indexOf("name");
  const custPhoneIdx = custHeaders.indexOf("phone");
  const custAddressIdx = custHeaders.indexOf("address");

  const orders = [];
  for (let i = 1; i < orderData.length; i++) {
    const order = {};
    for (let j = 0; j < orderHeaders.length; j++) {
      order[orderHeaders[j]] = orderData[i][j];
    }

    let customerName = "Unknown";
    let customerPhone = "";
    let customerAddress = "";
    for (let k = 1; k < custData.length; k++) {
      if (custData[k][custIdIdxInCust].toString() === order.customerId.toString()) {
        customerName = custData[k][custNameIdx];
        customerPhone = custData[k][custPhoneIdx];
        customerAddress = custData[k][custAddressIdx];
        break;
      }
    }
    order.customerName = customerName;
    order.phone = customerPhone;
    order.address = customerAddress;

    const items = [];
    for (let l = 1; l < itemsData.length; l++) {
      if (itemsData[l][orderIdIdxInItems].toString() === order.orderId.toString()) {
        const item = {};
        for (let m = 0; m < itemHeaders.length; m++) {
          item[itemHeaders[m]] = itemsData[l][m];
        }
        items.push(item);
      }
    }
    order.items = items;
    orders.push(order);
  }
  orders.reverse();
  return { success: true, data: orders };
}

function updateOrderStatus(orderId, status) {
  const sheet = getSheetByName("Orders");
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: false, message: "Order not found" };

  const headers = data[0];
  const orderIdIdx = headers.indexOf("orderId");
  const statusIdx = headers.indexOf("status");

  for (let i = 1; i < data.length; i++) {
    if (data[i][orderIdIdx].toString() === orderId.toString()) {
      sheet.getRange(i + 1, statusIdx + 1).setValue(status);
      return { success: true, orderId: orderId, status: status };
    }
  }
  return { success: false, message: "Order not found" };
}

function assignDeliveryBoy(orderId, deliveryBoyDetails) {
  const sheet = getSheetByName("Orders");
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: false, message: "Order not found" };

  const headers = data[0];
  const orderIdIdx = headers.indexOf("orderId");
  
  const reqCols = ["deliveryBoyName", "deliveryBoyPhone", "vehicleNumber", "estimatedDeliveryTime", "deliveryNotes"];
  reqCols.forEach(col => {
    if (headers.indexOf(col) === -1) {
      headers.push(col);
      sheet.getRange(1, headers.length).setValue(col);
    }
  });

  const updatedData = sheet.getDataRange().getValues();

  for (let i = 1; i < updatedData.length; i++) {
    if (updatedData[i][orderIdIdx].toString() === orderId.toString()) {
      reqCols.forEach(col => {
        const colIdx = headers.indexOf(col);
        sheet.getRange(i + 1, colIdx + 1).setValue(deliveryBoyDetails[col] || "");
      });
      const statusIdx = headers.indexOf("status");
      sheet.getRange(i + 1, statusIdx + 1).setValue("Accepted");
      return { success: true, orderId: orderId };
    }
  }
  return { success: false, message: "Order not found" };
}

function getAdminCustomers() {
  const custSheet = getSheetByName("Customers");
  const orderSheet = getSheetByName("Orders");
  
  const custData = custSheet.getDataRange().getValues();
  const orderData = orderSheet.getDataRange().getValues();
  
  if (custData.length <= 1) return { success: true, data: [] };
  
  const custHeaders = custData[0];
  const orderHeaders = orderData[0];
  
  const custIdIdxInCust = custHeaders.indexOf("customerId");
  const custIdIdxInOrders = orderHeaders.indexOf("customerId");
  const totalIdxInOrders = orderHeaders.indexOf("total");
  const dateIdxInOrders = orderHeaders.indexOf("date");
  
  const customers = [];
  for (let i = 1; i < custData.length; i++) {
    const customer = {};
    for (let j = 0; j < custHeaders.length; j++) {
      if (custHeaders[j] !== "password") {
        customer[custHeaders[j]] = custData[i][j];
      }
    }
    
    let totalOrders = 0;
    let totalSpending = 0;
    let lastOrderDate = "";
    
    for (let k = 1; k < orderData.length; k++) {
      if (orderData[k][custIdIdxInOrders].toString() === customer.customerId.toString()) {
        totalOrders++;
        totalSpending += parseFloat(orderData[k][totalIdxInOrders]) || 0;
        const orderDate = orderData[k][dateIdxInOrders].toString();
        if (!lastOrderDate || new Date(orderDate) > new Date(lastOrderDate)) {
          lastOrderDate = orderDate;
        }
      }
    }
    
    customer.totalOrders = totalOrders;
    customer.totalSpending = totalSpending;
    customer.lastOrderDate = lastOrderDate;
    customers.push(customer);
  }
  
  return { success: true, data: customers };
}

function getAdminDashboard() {
  const ordersRes = getAdminOrders();
  const custRes = getAdminCustomers();
  
  const orders = ordersRes.success ? ordersRes.data : [];
  const customers = custRes.success ? custRes.data : [];
  
  let todayOrdersCount = 0;
  let pendingCount = 0;
  let preparingCount = 0;
  let outForDeliveryCount = 0;
  let deliveredCount = 0;
  let cancelledCount = 0;
  
  let todayRevenue = 0;
  let weeklyRevenue = 0;
  let monthlyRevenue = 0;
  let totalSales = 0;
  
  const todayStr = new Date().toDateString();
  const now = new Date();
  
  for (let order of orders) {
    const orderDate = new Date(order.date);
    const orderDateStr = orderDate.toDateString();
    const orderTotal = parseFloat(order.total) || 0;
    
    if (order.status === 'Pending') pendingCount++;
    else if (order.status === 'Preparing') preparingCount++;
    else if (order.status === 'Out for Delivery') outForDeliveryCount++;
    else if (order.status === 'Delivered') deliveredCount++;
    else if (order.status === 'Cancelled') cancelledCount++;
    
    if (order.status !== 'Cancelled') {
      totalSales += orderTotal;
      
      if (orderDateStr === todayStr) {
        todayOrdersCount++;
        todayRevenue += orderTotal;
      }
      
      const diffTime = Math.abs(now.getTime() - orderDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) {
        weeklyRevenue += orderTotal;
      }
      if (diffDays <= 30) {
        monthlyRevenue += orderTotal;
      }
    }
  }
  
  const avgOrderValue = orders.length > 0 ? Math.round(totalSales / orders.length) : 0;
  
  return {
    success: true,
    data: {
      todayOrders: todayOrdersCount,
      pendingOrders: pendingCount,
      preparingOrders: preparingCount,
      outForDelivery: outForDeliveryCount,
      deliveredOrders: deliveredCount,
      cancelledOrders: cancelledCount,
      totalCustomers: customers.length,
      todayRevenue: todayRevenue,
      weeklyRevenue: weeklyRevenue,
      monthlyRevenue: monthlyRevenue,
      totalSales: totalSales,
      averageOrderValue: avgOrderValue,
      recentOrders: orders.slice(0, 10)
    }
  };
}

function getMenuItems() {
  const sheet = getSheetByName("Menu");
  let data = sheet.getDataRange().getValues();
  
  const requiredHeaders = ["id", "name", "category", "variant", "price", "image", "available", "featured", "profitMargin", "dietType", "description", "restaurantId"];
  
  if (data.length === 0 || (data.length === 1 && data[0][0] === "")) {
    sheet.appendRow(requiredHeaders);
    return { success: true, data: [] };
  }
  
  let headers = data[0];
  let updatedHeaders = false;
  
  for (let i = 0; i < requiredHeaders.length; i++) {
    const req = requiredHeaders[i];
    if (headers.indexOf(req) === -1) {
      headers.push(req);
      sheet.getRange(1, headers.length).setValue(req);
      updatedHeaders = true;
    }
  }
  
  if (updatedHeaders) {
    data = sheet.getDataRange().getValues();
    headers = data[0];
  }
  
  const items = [];
  for (let i = 1; i < data.length; i++) {
    const item = {};
    for (let j = 0; j < headers.length; j++) {
      let val = data[i][j];
      if (headers[j] === "available") val = (val === true || val.toString().toLowerCase() === "true");
      if (headers[j] === "featured") val = (val === true || val.toString().toLowerCase() === "true");
      item[headers[j]] = val;
    }
    items.push(item);
  }
  return { success: true, data: items };
}

function addMenuItem(item) {
  const sheet = getSheetByName("Menu");
  let data = sheet.getDataRange().getValues();
  
  const requiredHeaders = ["id", "name", "category", "variant", "price", "image", "available", "featured", "profitMargin", "dietType", "description", "restaurantId"];
  
  let headers = data[0];
  let updatedHeaders = false;
  
  if (data.length === 0 || (data.length === 1 && data[0][0] === "")) {
    headers = requiredHeaders;
    sheet.appendRow(headers);
  } else {
    for (let i = 0; i < requiredHeaders.length; i++) {
      const req = requiredHeaders[i];
      if (headers.indexOf(req) === -1) {
        headers.push(req);
        sheet.getRange(1, headers.length).setValue(req);
        updatedHeaders = true;
      }
    }
  }
  
  if (updatedHeaders) {
    data = sheet.getDataRange().getValues();
    headers = data[0];
  }
  
  const id = "MENU-" + new Date().getTime() + "-" + Math.floor(Math.random() * 1000);
  const newItem = { ...item, id: id };
  const itemObj = item || {};
  
  const newRow = headers.map(header => {
    if (header === "id") return id;
    if (header === "available") return itemObj.available !== undefined ? (itemObj.available === true || itemObj.available.toString().toLowerCase() === "true") : true;
    if (header === "featured") return itemObj.featured !== undefined ? (itemObj.featured === true || itemObj.featured.toString().toLowerCase() === "true") : false;
    return itemObj[header] !== undefined ? itemObj[header] : "";
  });
  
  sheet.appendRow(newRow);
  return { success: true, data: newItem };
}

function deleteMenuItem(id) {
  const sheet = getSheetByName("Menu");
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: false, message: "No items" };
  
  const headers = data[0];
  const idIdx = headers.indexOf("id");
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIdx].toString() === id.toString()) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: "Item not found" };
}

function updateMenuItem(item) {
  const sheet = getSheetByName("Menu");
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: false, message: "No items" };
  
  const headers = data[0];
  const idIdx = headers.indexOf("id");
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIdx].toString() === item.id.toString()) {
      for (let j = 0; j < headers.length; j++) {
        const key = headers[j];
        if (key !== "id" && item[key] !== undefined) {
          sheet.getRange(i + 1, j + 1).setValue(item[key]);
        }
      }
      return { success: true };
    }
  }
  return { success: false, message: "Item not found" };
}

function clearAllMenuItems() {
  const sheet = getSheetByName("Menu");
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  return { success: true };
}

function getRestaurants() {
  const sheet = getSheetByName("Restaurants");
  let data = sheet.getDataRange().getValues();
  
  const requiredHeaders = ["id", "name", "phone", "address", "cuisine", "image", "rating", "deliveryTime", "active", "featured", "deliveryRadius", "latitude", "longitude", "username", "password", "login"];
  
  if (data.length === 0 || (data.length === 1 && data[0][0] === "")) {
    sheet.appendRow(requiredHeaders);
    return { success: true, data: [] };
  }
  
  let headers = data[0];
  let updatedHeaders = false;
  
  for (let i = 0; i < requiredHeaders.length; i++) {
    const req = requiredHeaders[i];
    if (headers.indexOf(req) === -1) {
      headers.push(req);
      sheet.getRange(1, headers.length).setValue(req);
      updatedHeaders = true;
    }
  }
  
  if (updatedHeaders) {
    data = sheet.getDataRange().getValues();
    headers = data[0];
  }
  
  const list = [];
  for (let i = 1; i < data.length; i++) {
    const rest = {};
    for (let j = 0; j < headers.length; j++) {
      let val = data[i][j];
      if (headers[j] === "active") val = (val === true || val.toString().toLowerCase() === "true");
      if (headers[j] === "featured") val = (val === true || val.toString().toLowerCase() === "true");
      if (headers[j] === "rating") val = parseFloat(val) || 0;
      if (headers[j] === "deliveryRadius") val = parseFloat(val) || 5;
      if (headers[j] === "latitude") val = val !== "" ? parseFloat(val) : undefined;
      if (headers[j] === "longitude") val = val !== "" ? parseFloat(val) : undefined;
      
      if (headers[j] === "login" || headers[j] === "username") {
        rest["username"] = val;
        rest["login"] = val;
      } else {
        rest[headers[j]] = val;
      }
    }
    list.push(rest);
  }
  return { success: true, data: list };
}

function addRestaurant(restaurant) {
  const sheet = getSheetByName("Restaurants");
  let data = sheet.getDataRange().getValues();
  
  const requiredHeaders = ["id", "name", "phone", "address", "cuisine", "image", "rating", "deliveryTime", "active", "featured", "deliveryRadius", "latitude", "longitude", "username", "password", "login"];
  
  let headers = data[0];
  let updatedHeaders = false;
  
  if (data.length === 0 || (data.length === 1 && data[0][0] === "")) {
    headers = requiredHeaders;
    sheet.appendRow(headers);
  } else {
    for (let i = 0; i < requiredHeaders.length; i++) {
      const req = requiredHeaders[i];
      if (headers.indexOf(req) === -1) {
        headers.push(req);
        sheet.getRange(1, headers.length).setValue(req);
        updatedHeaders = true;
      }
    }
  }
  
  if (updatedHeaders) {
    data = sheet.getDataRange().getValues();
    headers = data[0];
  }
  
  const id = "REST-" + new Date().getTime() + "-" + Math.floor(Math.random() * 1000);
  const newRest = { ...restaurant, id: id };
  const r = restaurant || {};
  
  const newRow = headers.map(header => {
    if (header === "id") return id;
    if (header === "active") return r.active !== undefined ? (r.active === true || r.active.toString().toLowerCase() === "true") : true;
    if (header === "featured") return r.featured !== undefined ? (r.featured === true || r.featured.toString().toLowerCase() === "true") : false;
    if (header === "rating") return r.rating !== undefined ? parseFloat(r.rating) : 4.5;
    if (header === "deliveryRadius") return r.deliveryRadius !== undefined ? parseFloat(r.deliveryRadius) : 5;
    if (header === "latitude") return r.latitude !== undefined ? parseFloat(r.latitude) : 25.0143;
    if (header === "longitude") return r.longitude !== undefined ? parseFloat(r.longitude) : 84.6784;
    if (header === "login") return r.login !== undefined ? r.login : (r.username !== undefined ? r.username : "");
    if (header === "username") return r.username !== undefined ? r.username : (r.login !== undefined ? r.login : "");
    return r[header] !== undefined ? r[header] : "";
  });
  
  sheet.appendRow(newRow);
  return { success: true, data: newRest };
}

function deleteRestaurant(id) {
  const sheet = getSheetByName("Restaurants");
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: false, message: "No restaurants" };
  
  const headers = data[0];
  const idIdx = headers.indexOf("id");
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIdx].toString() === id.toString()) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: "Restaurant not found" };
}

function updateRestaurant(restaurant) {
  const sheet = getSheetByName("Restaurants");
  let data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: false, message: "No restaurants" };
  
  const requiredHeaders = ["id", "name", "phone", "address", "cuisine", "image", "rating", "deliveryTime", "active", "featured", "deliveryRadius", "latitude", "longitude", "username", "password", "login"];
  
  let headers = data[0];
  let updatedHeaders = false;
  for (let i = 0; i < requiredHeaders.length; i++) {
    const req = requiredHeaders[i];
    if (headers.indexOf(req) === -1) {
      headers.push(req);
      sheet.getRange(1, headers.length).setValue(req);
      updatedHeaders = true;
    }
  }
  
  if (updatedHeaders) {
    data = sheet.getDataRange().getValues();
    headers = data[0];
  }
  
  const idIdx = headers.indexOf("id");
  if (idIdx === -1) return { success: false, message: "id header missing in Restaurants" };
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIdx].toString() === restaurant.id.toString()) {
      for (let j = 0; j < headers.length; j++) {
        const key = headers[j];
        if (key !== "id") {
          let val = restaurant[key];
          if (key === "login" && val === undefined) val = restaurant.username;
          if (key === "username" && val === undefined) val = restaurant.login;
          
          if (val !== undefined) {
            if (key === "latitude" || key === "longitude" || key === "rating" || key === "deliveryRadius") {
              val = parseFloat(val);
            }
            sheet.getRange(i + 1, j + 1).setValue(val);
          }
        }
      }
      return { success: true };
    }
  }
  return { success: false, message: "Restaurant not found" };
}

function getContactMessages() {
  const sheet = getSheetByName("Messages");
  const data = sheet.getDataRange().getValues();
  const messages = [];
  if (data.length <= 1) return { success: true, data: messages };
  const headers = data[0];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const msg = {};
    for (let j = 0; j < headers.length; j++) {
      msg[headers[j]] = row[j];
    }
    messages.push(msg);
  }
  return { success: true, data: messages };
}

function saveContactMessage(msg) {
  const sheet = getSheetByName("Messages");
  const headers = ["id", "name", "email", "phone", "subject", "message", "createdAt"];
  const row = headers.map(h => msg[h] || "");
  sheet.appendRow(row);
  return { success: true, data: msg };
}

function deleteContactMessage(id) {
  const sheet = getSheetByName("Messages");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(id).trim()) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return { success: true };
}

function getCustomerReviews() {
  const sheet = getSheetByName("Reviews");
  const data = sheet.getDataRange().getValues();
  const reviews = [];
  if (data.length <= 1) return { success: true, data: reviews };
  const headers = data[0];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rev = {};
    for (let j = 0; j < headers.length; j++) {
      rev[headers[j]] = row[j];
    }
    reviews.push(rev);
  }
  return { success: true, data: reviews };
}

function saveCustomerReview(review) {
  const sheet = getSheetByName("Reviews");
  const headers = ["id", "orderId", "customerId", "name", "address", "rating", "feedback", "createdAt"];
  const row = headers.map(h => review[h] || "");
  sheet.appendRow(row);
  return { success: true, data: review };
}

function deleteCustomerReview(id) {
  const sheet = getSheetByName("Reviews");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(id).trim()) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return { success: true };
}

function getCustomNotifications() {
  const sheet = getSheetByName("CustomerAlerts");
  const data = sheet.getDataRange().getValues();
  const alerts = [];
  if (data.length <= 1) return { success: true, data: alerts };
  const headers = data[0];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const alert = {};
    for (let j = 0; j < headers.length; j++) {
      let val = row[j];
      if (headers[j] === "isActive") {
        val = (val === true || val.toString().toLowerCase() === "true");
      }
      alert[headers[j]] = val;
    }
    alert["id"] = alert["alertId"];
    alerts.push(alert);
  }
  return { success: true, data: alerts };
}

function saveCustomNotification(alert) {
  const sheet = getSheetByName("CustomerAlerts");
  let data = sheet.getDataRange().getValues();
  
  const requiredHeaders = ["alertId", "title", "message", "type", "targetAudience", "startDate", "endDate", "isActive", "priority", "createdAt", "createdBy"];
  let headers = data[0];
  let updatedHeaders = false;
  
  if (data.length === 0 || (data.length === 1 && data[0][0] === "")) {
    headers = requiredHeaders;
    sheet.appendRow(headers);
    data = [[], []];
  } else {
    for (let i = 0; i < requiredHeaders.length; i++) {
      const req = requiredHeaders[i];
      if (headers.indexOf(req) === -1) {
        headers.push(req);
        sheet.getRange(1, headers.length).setValue(req);
        updatedHeaders = true;
      }
    }
  }
  
  if (updatedHeaders) {
    data = sheet.getDataRange().getValues();
    headers = data[0];
  }
  
  const alertId = alert.alertId || ("ALERT-" + new Date().getTime() + "-" + Math.floor(Math.random() * 1000));
  const alertObj = alert || {};
  alertObj.alertId = alertId;
  alertObj.id = alertId;
  
  const alertIdIdx = headers.indexOf("alertId");
  let targetRowIdx = -1;
  
  if (alertIdIdx !== -1) {
    for (let i = 1; i < data.length; i++) {
      if (data[i][alertIdIdx] && data[i][alertIdIdx].toString() === alertId.toString()) {
        targetRowIdx = i + 1;
        break;
      }
    }
  }
  
  const newRow = headers.map(header => {
    if (header === "alertId") return alertId;
    if (header === "isActive") return alertObj.isActive !== undefined ? (alertObj.isActive === true || alertObj.isActive.toString().toLowerCase() === "true") : true;
    return alertObj[header] !== undefined ? alertObj[header] : "";
  });
  
  if (targetRowIdx !== -1) {
    const range = sheet.getRange(targetRowIdx, 1, 1, headers.length);
    range.setValues([newRow]);
  } else {
    sheet.appendRow(newRow);
  }
  
  return { success: true, data: alertObj };
}

function deleteCustomNotification(id) {
  const sheet = getSheetByName("CustomerAlerts");
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: false, message: "No alerts" };
  
  const headers = data[0];
  const alertIdIdx = headers.indexOf("alertId");
  
  if (alertIdIdx === -1) return { success: false, message: "alertId header missing in CustomerAlerts" };
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][alertIdIdx] && data[i][alertIdIdx].toString() === id.toString()) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: "Alert not found" };
}

function merchantLogin(username, password) {
  const sheet = getSheetByName("Restaurants");
  let data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { success: false, message: "No registered restaurants yet" };
  }
  
  let headers = data[0];
  const requiredHeaders = ["username", "login", "password"];
  let updatedHeaders = false;
  
  for (let i = 0; i < requiredHeaders.length; i++) {
    const req = requiredHeaders[i];
    if (headers.indexOf(req) === -1) {
      headers.push(req);
      sheet.getRange(1, headers.length).setValue(req);
      updatedHeaders = true;
    }
  }
  
  if (updatedHeaders) {
    data = sheet.getDataRange().getValues();
    headers = data[0];
  }
  
  const userIdx = headers.indexOf("username");
  const loginIdx = headers.indexOf("login");
  const passIdx = headers.indexOf("password");
  
  const inputPlain = password.toString().trim();
  
  for (let i = 1; i < data.length; i++) {
    const rowUser = data[i][userIdx] ? data[i][userIdx].toString().toLowerCase().trim() : "";
    const rowLogin = data[i][loginIdx] ? data[i][loginIdx].toString().toLowerCase().trim() : "";
    const rowPass = data[i][passIdx] ? data[i][passIdx].toString().trim() : "";
    
    if ((rowUser === username.toLowerCase() || rowLogin === username.toLowerCase()) && 
        rowPass === inputPlain) {
        
      const rest = {};
      for (let j = 0; j < headers.length; j++) {
        if (headers[j] !== "password") {
          let val = data[i][j];
          if (headers[j] === "active") val = (val === true || val.toString().toLowerCase() === "true");
          if (headers[j] === "featured") val = (val === true || val.toString().toLowerCase() === "true");
          if (headers[j] === "rating") val = parseFloat(val) || 0;
          if (headers[j] === "deliveryRadius") val = parseFloat(val) || 5;
          if (headers[j] === "latitude") val = val !== "" ? parseFloat(val) : undefined;
          if (headers[j] === "longitude") val = val !== "" ? parseFloat(val) : undefined;
          rest[headers[j]] = val;
        }
      }
      return { success: true, restaurant: rest };
    }
  }
  
  return { success: false, message: "Invalid restaurant credentials" };
}
`;
}

// --- ADMIN API PORTAL METHODS ---

export async function adminLogin(username: string, password: string): Promise<{ success: boolean; message: string; admin?: { username: string; role: string } }> {
  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      const res = await fetchFromGas('adminLogin', { username, password });
      if (res && res.success) {
        localStorage.setItem('arwaleats_current_admin', JSON.stringify(res.admin));
        return { success: true, message: 'Logged in as Admin successfully!', admin: res.admin };
      } else if (res && res.success === false) {
        return { success: false, message: res.message || 'Invalid Admin username or password.' };
      }
    } catch (err) {
      console.warn('Failed to login via GAS, checking local storage', err);
    }
  }

  // Local Storage Admin check
  let admins = JSON.parse(localStorage.getItem('arwaleats_admins') || '[]');
  const match = admins.find((a: any) => a.username.toLowerCase() === username.trim().toLowerCase() && a.password === password);
  if (match) {
    const adminSession = { username: match.username, role: match.role };
    localStorage.setItem('arwaleats_current_admin', JSON.stringify(adminSession));
    return { success: true, message: 'Logged in successfully!', admin: adminSession };
  }

  return { success: false, message: 'Invalid Admin username or password.' };
}

export function getCurrentAdmin(): { username: string; role: string } | null {
  const adminStr = localStorage.getItem('arwaleats_current_admin');
  if (!adminStr || adminStr === 'undefined') return null;
  try {
    return JSON.parse(adminStr);
  } catch (e) {
    console.error("Failed to parse current admin:", e);
    return null;
  }
}

export function logoutAdmin() {
  localStorage.removeItem('arwaleats_current_admin');
}

export async function getAdminDashboard(): Promise<{
  todayOrders: number;
  pendingOrders: number;
  preparingOrders: number;
  outForDelivery: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalCustomers: number;
  todayRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  totalSales: number;
  averageOrderValue: number;
  todayProfit?: number;
  weeklyProfit?: number;
  monthlyProfit?: number;
  totalProfit?: number;
  recentOrders: Array<any>;
}> {
  const gasUrl = getGasUrl();
  const defaultDashboard = {
    todayOrders: 0,
    pendingOrders: 0,
    preparingOrders: 0,
    outForDelivery: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    totalCustomers: 0,
    todayRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    totalSales: 0,
    averageOrderValue: 0,
    todayProfit: 0,
    weeklyProfit: 0,
    monthlyProfit: 0,
    totalProfit: 0,
    recentOrders: [],
  };

  if (!gasUrl) {
    console.warn('Google Sheets not configured. Dashboard unavailable.');
    return defaultDashboard;
  }
  
  try {
    const res = await fetchFromGas('getAdminDashboard', {});
    if (res && res.success) {
      return res.data;
    }
  } catch (err) {
    console.error('Failed to get admin dashboard from GAS', err);
  }
  
  return defaultDashboard;
}

export async function getAdminOrders(): Promise<Array<Order & { items: OrderItem[]; customerName: string; phone: string; address: string }>> {
  const supabaseOrders = await SupabaseOrderService.getOrders(undefined);
  if (supabaseOrders) return supabaseOrders as any;

  const gasUrl = getGasUrl();
  if (!gasUrl) {
    console.warn('Google Sheets not configured. Orders unavailable.');
    return [];
  }
  
  try {
    const res = await fetchFromGas('getAdminOrders', {});
    if (res && res.success && Array.isArray(res.data)) {
      const unique = res.data.reduce((acc: any[], current: any) => {
        if (!acc.find(it => it.orderId === current.orderId)) {
          acc.push(current);
        }
        return acc;
      }, []);
      return unique;
    }
  } catch (err) {
    console.error('Failed to get admin orders from GAS', err);
  }
  
  return [];
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<boolean> {
  const supabaseUpdated = await SupabaseOrderService.updateOrderStatus(orderId, status);
  if (supabaseUpdated) return true;

  const gasUrl = getGasUrl();
  if (!gasUrl) return true;
  
  try {
    const res = await fetchFromGas('updateOrderStatus', { orderId, status });
    return res && res.success;
  } catch (err) {
    console.error('Failed to update order status via GAS', err);
    return true;
  }
}

export async function assignDeliveryBoy(orderId: string, details: {
  deliveryBoyName: string;
  deliveryBoyPhone: string;
  vehicleNumber: string;
  estimatedDeliveryTime: string;
  deliveryNotes?: string;
}): Promise<boolean> {
  const supabaseAssigned = await SupabaseOrderService.assignDeliveryBoy(orderId, details);
  if (supabaseAssigned) return true;

  const gasUrl = getGasUrl();
  if (!gasUrl) throw new Error('Google Sheets not configured');
  
  try {
    const res = await fetchFromGas('assignDeliveryBoy', { orderId, deliveryBoyDetails: details });
    return res && res.success;
  } catch (err) {
    console.error('Failed to assign delivery boy via GAS', err);
    throw new Error('Failed to connect to Google Sheets');
  }
}

export async function rejectOrReleaseOrder(orderId: string, riderName: string): Promise<boolean> {
  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      // Clear rider details first via assignDeliveryBoy
      const clearRes = await fetchFromGas('assignDeliveryBoy', { 
          orderId, 
          deliveryBoyDetails: {
            deliveryBoyName: "",
            deliveryBoyPhone: "",
            vehicleNumber: "",
            estimatedDeliveryTime: "",
            deliveryNotes: ""
          } 
        });
      if (clearRes && clearRes.success) {
        // Set order back to Pending so it is available for other delivery boys
        const statusRes = await fetchFromGas('updateOrderStatus', { orderId, status: 'Pending' });
        if (statusRes && statusRes.success) {
          initializeDatabase();
          const index = inMemoryOrders.findIndex(o => o.orderId === orderId);
          if (index !== -1) {
            inMemoryOrders[index] = {
              ...inMemoryOrders[index],
              status: 'Pending',
              deliveryBoyName: '',
              deliveryBoyPhone: '',
              vehicleNumber: '',
              estimatedDeliveryTime: '',
              deliveryNotes: '',
              riderRejected: true,
              lastRejectedRiderName: riderName,
            };
          }
          return true;
        }
      }
    } catch (err) {
      console.warn('Failed to reject/release order via GAS, trying locally', err);
    }
  }

  // Local Simulation
  initializeDatabase();
  const index = inMemoryOrders.findIndex(o => o.orderId === orderId);
  if (index !== -1) {
    inMemoryOrders[index] = {
      ...inMemoryOrders[index],
      status: 'Pending',
      deliveryBoyName: '',
      deliveryBoyPhone: '',
      vehicleNumber: '',
      estimatedDeliveryTime: '',
      deliveryNotes: '',
      riderRejected: true,
      lastRejectedRiderName: riderName,
    };
    return true;
  }
  return false;
}

export async function getAdminCustomers(): Promise<Array<any>> {
  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      const res = await fetchFromGas('getAdminCustomers', {});
      if (res && res.success && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (err) {
      console.warn('Failed to get admin customers from GAS, falling back to local simulation', err);
    }
  }

  // Local Simulation
  initializeDatabase();
  const customers: Customer[] = inMemoryCustomers;
  const orders: Order[] = inMemoryOrders;

  return customers.map(customer => {
    const userOrders = orders.filter(o => o.customerId === customer.customerId);
    const totalOrders = userOrders.length;
    const totalSpending = userOrders.reduce((sum, o) => sum + (o.status !== 'Cancelled' ? Number(o.total) : 0), 0);
    const lastOrder = userOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    return {
      ...customer,
      totalOrders,
      totalSpending,
      lastOrderDate: lastOrder ? lastOrder.date : '',
    };
  });
}

// Dynamic Menu CRUD helpers
let cachedMenuItems: MenuItem[] | null = null;
let lastMenuFetchTime = 0;
const MENU_CACHE_TTL = 600000; // 10 minutes cache TTL to prevent excessive API calls
let isSyncing = false;

async function fetchMenuAndSync(): Promise<MenuItem[]> {
  const gasUrl = getGasUrl();
  let items: MenuItem[] = [];
  if (!gasUrl) {
    console.warn('Google Sheets not configured. Menu unavailable.');
    return items;
  }
  
  try {
    const res = await fetchFromGas('getMenuItems', {});
    if (res && res.success && res.data) {
      if (res.data.length > 0) {
        // Deduplicate by ID
        items = res.data.reduce((acc: MenuItem[], current: MenuItem) => {
          if (!acc.find(it => it.id === current.id)) {
            acc.push(current);
          }
          return acc;
        }, []);
      }
    }
  } catch (err) {
    console.error('Failed to get menu items from GAS', err);
  }

  // Filter out any broken header placeholder item ("id", "name", "category", etc.)
  items = items.filter(item => {
    if (!item) return false;
    const idVal = String(item.id || '').trim().toLowerCase();
    const nameVal = String(item.name || '').trim().toLowerCase();
    const categoryVal = String(item.category || '').trim().toLowerCase();
    const priceVal = String(item.price || '').trim().toLowerCase();
    
    // Check if it matches the headers row or is a placeholder header or has empty/invalid required fields
    if (
      idVal === 'id' || 
      nameVal === 'name' || 
      categoryVal === 'category' || 
      priceVal === 'price' ||
      idVal === 'header' ||
      !idVal ||
      !nameVal ||
      idVal === 'undefined' ||
      nameVal === 'undefined' ||
      nameVal === 'null' ||
      idVal === 'null'
    ) {
      return false;
    }

    // Ensure price contains only valid numbers (possibly comma-separated)
    const priceStr = String(item.price || '').trim();
    const prices = priceStr.split(',').map(p => Number(p.trim()));
    if (prices.some(p => isNaN(p) || p <= 0)) {
      return false;
    }

    return true;
  });

  // Check if items changed from cachedMenuItems before dispatching event
  const isChanged = !cachedMenuItems || cachedMenuItems.length !== items.length || 
    JSON.stringify(cachedMenuItems.map(i => i.id)) !== JSON.stringify(items.map(i => i.id)) ||
    JSON.stringify(cachedMenuItems.map(i => i.price)) !== JSON.stringify(items.map(i => i.price));

  cachedMenuItems = items;
  lastMenuFetchTime = Date.now();

  if (isChanged) {
    safeDispatchEvent('arwaleats_menu_updated', items);
  }

  await cacheService.saveData('menuItems', items);
  return items;
}

function triggerBackgroundMenuSync() {
  if (isSyncing) return;
  isSyncing = true;
  fetchMenuAndSync()
    .catch(err => console.warn('Background menu sync failed:', err))
    .finally(() => {
      isSyncing = false;
    });
}

import { cacheService } from './cacheService';

export async function getMenuItems(forceRefresh = false): Promise<MenuItem[]> {
  const cached = await cacheService.getData('menuItems');
  
  if (cached && !forceRefresh) {
    // Trigger background sync to keep cache updated
    fetchMenuAndSyncInBackground();
    return cached;
  }

  return await fetchMenuAndSync();
}

async function fetchMenuAndSyncInBackground() {
  try {
    await fetchMenuAndSync();
  } catch (err) {
    console.error('Background menu sync failed', err);
  }
}

export async function addMenuItem(item: Omit<MenuItem, 'id'>): Promise<MenuItem> {
  const gasUrl = getGasUrl();
  if (!gasUrl) throw new Error('Google Sheets not configured');

  const newId = `MENU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  let newItem: MenuItem = { ...item, id: newId } as MenuItem;

  try {
    const res = await fetchFromGas('addMenuItem', { item: newItem });
    if (res && res.success && res.data) {
      newItem = res.data;
      cachedMenuItems = null; // Clear cache
      lastMenuFetchTime = 0;
      return newItem;
    }
    throw new Error(res?.message || 'Failed to add menu item');
  } catch (err) {
    console.error('Failed to add menu item via GAS', err);
    throw new Error('Failed to connect to Google Sheets');
  }
}

export async function deleteMenuItem(id: string): Promise<boolean> {
  const idStr = String(id).trim();

  // Clear memory cache so next request fetches latest
  cachedMenuItems = null;
  lastMenuFetchTime = 0;

  const gasUrl = getGasUrl();
  if (!gasUrl) throw new Error('Google Sheets not configured');
  
  try {
    const res = await fetchFromGas('deleteMenuItem', { id: idStr });
    return res && res.success;
  } catch (err) {
    console.error('Failed to delete menu item via GAS', err);
    throw new Error('Failed to connect to Google Sheets');
  }
}

export async function clearAllMenuItems(): Promise<boolean> {
  // Clear memory cache
  cachedMenuItems = [];
  lastMenuFetchTime = Date.now();

  const gasUrl = getGasUrl();
  if (!gasUrl) throw new Error('Google Sheets not configured');
  
  try {
    const res = await fetchFromGas('clearAllMenuItems', {});
    return res && res.success;
  } catch (err) {
    console.error('Failed to clear menu items via GAS', err);
    throw new Error('Failed to connect to Google Sheets');
  }
}

export async function updateMenuItem(item: MenuItem): Promise<boolean> {
  // Clear memory cache so next request fetches latest
  cachedMenuItems = null;
  lastMenuFetchTime = 0;

  const gasUrl = getGasUrl();
  if (!gasUrl) throw new Error('Google Sheets not configured');
  
  try {
    const res = await fetchFromGas('updateMenuItem', { item });
    return res && res.success;
  } catch (err) {
    console.error('Failed to update menu item via GAS', err);
    throw new Error('Failed to connect to Google Sheets');
  }
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

export async function getContactMessages(): Promise<ContactMessage[]> {
  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      const res = await fetchFromGas('getContactMessages', {});
      if (res && res.success && Array.isArray(res.data)) {
        inMemoryMessages = res.data;
        return res.data;
      }
    } catch (err) {
      console.warn('Failed to get contact messages via GAS, fallback to in-memory', err);
    }
  }
  return inMemoryMessages;
}

export async function saveContactMessage(msg: Omit<ContactMessage, 'id' | 'createdAt'>): Promise<void> {
  const newMsg: ContactMessage = {
    ...msg,
    id: 'MSG_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    createdAt: new Date().toISOString()
  };
  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      await fetchFromGas('saveContactMessage', { message: newMsg });
    } catch (err) {
      console.warn('Failed to save contact message via GAS, falling back to in-memory', err);
    }
  }
  inMemoryMessages.unshift(newMsg);
}

export async function deleteContactMessage(id: string): Promise<void> {
  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      await fetchFromGas('deleteContactMessage', { id });
    } catch (err) {
      console.warn('Failed to delete contact message via GAS, falling back to in-memory', err);
    }
  }
  inMemoryMessages = inMemoryMessages.filter(m => m.id !== id);
}

export interface CustomerReview {
  id: string;
  orderId?: string;
  customerId: string;
  name: string;
  address: string;
  rating: number;
  feedback: string;
  createdAt: string;
}

const DEFAULT_REVIEWS: CustomerReview[] = [];

export async function getCustomerReviews(): Promise<CustomerReview[]> {
  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      const res = await fetchFromGas('getCustomerReviews', {});
      if (res && res.success && Array.isArray(res.data)) {
        inMemoryReviews = res.data;
        return res.data;
      }
    } catch (err) {
      console.warn('Failed to get customer reviews via GAS, fallback to in-memory', err);
    }
  }
  return inMemoryReviews.filter(r => r && r.id && !r.id.startsWith('REV_DEFAULT_'));
}

export async function saveCustomerReview(review: Omit<CustomerReview, 'id' | 'createdAt'>): Promise<void> {
  const newReview: CustomerReview = {
    ...review,
    id: 'REV_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    createdAt: new Date().toISOString()
  };
  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      await fetchFromGas('saveCustomerReview', { review: newReview });
    } catch (err) {
      console.warn('Failed to save customer review via GAS, falling back to in-memory', err);
    }
  }
  inMemoryReviews.unshift(newReview);
}

export async function deleteCustomerReview(id: string): Promise<void> {
  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      await fetchFromGas('deleteCustomerReview', { id });
    } catch (err) {
      console.warn('Failed to delete customer review via GAS, falling back to in-memory', err);
    }
  }
  inMemoryReviews = inMemoryReviews.filter(r => r.id !== id);
}

export async function getRestaurants(forceRefresh = false): Promise<Restaurant[]> {
  const cached = await cacheService.getData('restaurants');
  
  if (cached && !forceRefresh) {
    // Trigger background sync to keep cache updated
    fetchRestaurantsAndSyncInBackground();
    return cached;
  }

  return await fetchRestaurantsAndSync();
}

async function fetchRestaurantsAndSyncInBackground() {
  try {
    await fetchRestaurantsAndSync();
  } catch (err) {
    console.error('Background restaurant sync failed', err);
  }
}

async function fetchRestaurantsAndSync(): Promise<Restaurant[]> {
  const gasUrl = getGasUrl();
  if (!gasUrl) {
    console.warn('Google Sheets not configured. Restaurants unavailable.');
    return [];
  }
  try {
    const res = await fetchFromGas('getRestaurants', {});
    if (res && res.success && res.data) {
      // Deduplicate by ID to prevent React key errors
      const unique = res.data.reduce((acc: Restaurant[], current: Restaurant) => {
        if (!acc.find((item) => item.id === current.id)) {
          // Format opening/closing times if they are numbers
          if (typeof current.openingTime === 'number') {
            current.openingTime = new Date(current.openingTime * 86400000 - 2209161600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
          if (typeof current.closingTime === 'number') {
            current.closingTime = new Date(current.closingTime * 86400000 - 2209161600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
          acc.push(current);
        }
        return acc;
      }, []);
      await cacheService.saveData('restaurants', unique);
      return unique;
    }
  } catch (err) {
    console.error('Failed to fetch restaurants via GAS', err);
  }
  return initialRestaurants;
}

export async function addRestaurant(rest: Omit<Restaurant, 'id'>): Promise<Restaurant> {
  const gasUrl = getGasUrl();
  if (!gasUrl) throw new Error('Google Sheets not configured');

  try {
    const res = await fetchFromGas('addRestaurant', { restaurant: rest });
    if (res && res.success && res.data) {
      return res.data;
    }
    throw new Error(res?.message || 'Failed to add restaurant');
  } catch (err) {
    console.error('Failed to add restaurant via GAS', err);
    throw new Error('Failed to connect to Google Sheets');
  }
}

export async function deleteRestaurant(id: string): Promise<boolean> {
  const gasUrl = getGasUrl();
  if (!gasUrl) throw new Error('Google Sheets not configured');
  try {
    const res = await fetchFromGas('deleteRestaurant', { id });
    return res && res.success;
  } catch (err) {
    console.error('Failed to delete restaurant via GAS', err);
    throw new Error('Failed to connect to Google Sheets');
  }
}

export async function updateRestaurant(rest: Restaurant): Promise<Restaurant> {
  const gasUrl = getGasUrl();
  if (!gasUrl) throw new Error('Google Sheets not configured');
  try {
    const res = await fetchFromGas('updateRestaurant', { restaurant: rest });
    if (res && res.success) {
      return rest;
    }
    throw new Error(res?.message || 'Failed to update restaurant');
  } catch (err) {
    console.error('Failed to update restaurant via GAS', err);
    throw new Error('Failed to connect to Google Sheets');
  }
}

export interface CustomNotification {
  alertId: string;
  id: string; // compatibility field alias to alertId
  title: string;
  message: string;
  type: 'Offer' | 'Announcement' | 'Maintenance' | 'Information';
  targetAudience: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  priority: 'Low' | 'Medium' | 'High';
  createdAt: string;
  createdBy: string;
}

export async function getCustomNotifications(): Promise<CustomNotification[]> {
  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      const res = await fetchFromGas('getCustomNotifications', {});
      if (res && res.success && Array.isArray(res.data)) {
        inMemoryNotifications = res.data;
        return res.data;
      }
    } catch (err) {
      console.warn('Failed to get custom notifications via GAS, fallback to in-memory', err);
    }
  }
  return inMemoryNotifications;
}

export async function saveCustomNotification(notif: Partial<CustomNotification>): Promise<CustomNotification> {
  const alertId = notif.alertId || ('ALERT-' + Math.floor(100000 + Math.random() * 900000));
  const newNotif: CustomNotification = {
    alertId,
    id: alertId,
    title: notif.title || '',
    message: notif.message || '',
    type: notif.type || 'Information',
    targetAudience: notif.targetAudience || 'All Customers',
    startDate: notif.startDate || new Date().toISOString().split('T')[0],
    endDate: notif.endDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    isActive: notif.isActive !== undefined ? notif.isActive : true,
    priority: notif.priority || 'Medium',
    createdAt: notif.createdAt || new Date().toISOString(),
    createdBy: notif.createdBy || 'Admin'
  };

  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      await fetchFromGas('saveCustomNotification', { notification: newNotif });
    } catch (err) {
      console.warn('Failed to save custom notification via GAS, falling back to in-memory', err);
    }
  }

  const existingIndex = inMemoryNotifications.findIndex(n => n.alertId === alertId);
  if (existingIndex >= 0) {
    inMemoryNotifications[existingIndex] = newNotif;
  } else {
    inMemoryNotifications.unshift(newNotif);
  }
  return newNotif;
}

export async function deleteCustomNotification(id: string): Promise<boolean> {
  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      await fetchFromGas('deleteCustomNotification', { id });
    } catch (err) {
      console.warn('Failed to delete custom notification via GAS, falling back to in-memory', err);
    }
  }
  inMemoryNotifications = inMemoryNotifications.filter(n => n.id !== id && n.alertId !== id);
  return true;
}

/**
 * =========================================
 * BANNER MANAGEMENT FRONTEND APIS
 * =========================================
 */

export async function getBanners(forceRefresh = false): Promise<Banner[]> {
  const cached = await cacheService.getData('banners');
  if (cached && !forceRefresh) {
    fetchBannersAndSyncInBackground();
    return cached;
  }
  return await fetchBannersAndSync();
}

async function fetchBannersAndSyncInBackground() {
  try {
    await fetchBannersAndSync();
  } catch (err) {
    console.error('Background banner sync failed', err);
  }
}

async function fetchBannersAndSync(): Promise<Banner[]> {
  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      const res = await fetchFromGas('getBanners', {});
      if (res && res.success && Array.isArray(res.data)) {
        inMemoryBanners = res.data;
        saveInStorageBanners(res.data);
        
        const now = new Date();
        const activeBanners = res.data
          .filter(b => {
            const status = String(b.status || 'active').toLowerCase();
            if (status !== 'active') return false;
            if (b.startDate) {
              const start = new Date(b.startDate);
              start.setHours(0, 0, 0, 0);
              if (now < start) return false;
            }
            if (b.endDate) {
              const end = new Date(b.endDate);
              end.setHours(23, 59, 59, 999);
              if (now > end) return false;
            }
            return true;
          })
          .sort((a, b) => (Number(a.priority) || 0) - (Number(b.priority) || 0));

        await cacheService.saveData('banners', activeBanners);
        return activeBanners;
      }
    } catch (err) {
      console.warn('Failed to fetch banners via GAS, falling back to in-memory', err);
    }
  }

  // Fallback in-memory active check using stored banners
  const saved = loadInStorageBanners();
  if (saved) {
    inMemoryBanners = saved;
  }

  const now = new Date();
  const activeBanners = inMemoryBanners
    .filter(b => {
      if (b.status !== 'active') return false;
      if (b.startDate) {
        const start = new Date(b.startDate);
        start.setHours(0, 0, 0, 0);
        if (now < start) return false;
      }
      if (b.endDate) {
        const end = new Date(b.endDate);
        end.setHours(23, 59, 59, 999);
        if (now > end) return false;
      }
      return true;
    })
    .sort((a, b) => a.priority - b.priority);

  await cacheService.saveData('banners', activeBanners);
  return activeBanners;
}

export async function getAdminBanners(): Promise<Banner[]> {
  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      const res = await fetchFromGas('getAdminBanners', {});
      if (res && res.success && Array.isArray(res.data)) {
        inMemoryBanners = res.data;
        saveInStorageBanners(res.data);
        return res.data;
      }
    } catch (err) {
      console.warn('Failed to fetch admin banners via GAS, falling back to in-memory', err);
    }
  }

  const saved = loadInStorageBanners();
  if (saved) {
    inMemoryBanners = saved;
  }
  return [...inMemoryBanners].sort((a, b) => a.priority - b.priority);
}

export async function saveBanner(banner: Partial<Banner>): Promise<Banner> {
  const bannerId = banner.bannerId || (`BAN-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
  const now = new Date().toISOString();
  const fullBanner: Banner = {
    bannerId,
    title: banner.title || 'Special Promotion',
    subtitle: banner.subtitle || '',
    description: banner.description || '',
    image: banner.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1000&auto=format&fit=crop&q=80',
    mobileImage: banner.mobileImage || '',
    desktopImage: banner.desktopImage || '',
    buttonText: banner.buttonText || 'Order Now',
    buttonLink: banner.buttonLink || '',
    couponCode: banner.couponCode || '',
    offerBadge: banner.offerBadge || '',
    redirectType: banner.redirectType || 'none',
    restaurantId: banner.restaurantId || '',
    categoryId: banner.categoryId || '',
    productId: banner.productId || '',
    backgroundColor: banner.backgroundColor || '#0f172a',
    textColor: banner.textColor || '#ffffff',
    priority: Number(banner.priority) || 1,
    status: banner.status || 'active',
    showCountdown: Boolean(banner.showCountdown),
    countdownDate: banner.countdownDate || '',
    startDate: banner.startDate || new Date().toISOString().split('T')[0],
    endDate: banner.endDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    createdAt: banner.createdAt || now,
    updatedAt: now,
  };

  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      const res = await fetchFromGas('saveBanner', { banner: fullBanner });
      if (res && res.success) {
        await fetchBannersAndSync();
        safeDispatchEvent('arwaleats_banners_updated');
        return fullBanner;
      }
    } catch (err) {
      console.warn('Failed to save banner via GAS, falling back to in-memory', err);
    }
  }

  const existingIdx = inMemoryBanners.findIndex(b => b.bannerId === bannerId);
  if (existingIdx !== -1) {
    inMemoryBanners[existingIdx] = fullBanner;
  } else {
    inMemoryBanners.push(fullBanner);
  }

  // Persist locally for all customer sessions
  saveInStorageBanners(inMemoryBanners);
  // Clear client cache and dispatch live event
  await cacheService.saveData('banners', null);
  safeDispatchEvent('arwaleats_banners_updated');
  return fullBanner;
}

export async function deleteBanner(bannerId: string): Promise<boolean> {
  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      const res = await fetchFromGas('deleteBanner', { bannerId });
      if (res && res.success) {
        await fetchBannersAndSync();
        safeDispatchEvent('arwaleats_banners_updated');
        return true;
      }
    } catch (err) {
      console.warn('Failed to delete banner via GAS, falling back to in-memory', err);
    }
  }

  inMemoryBanners = inMemoryBanners.filter(b => b.bannerId !== bannerId);
  saveInStorageBanners(inMemoryBanners);
  await cacheService.saveData('banners', null);
  safeDispatchEvent('arwaleats_banners_updated');
  return true;
}

export async function toggleBannerStatus(bannerId: string, status: 'active' | 'inactive' | 'scheduled'): Promise<boolean> {
  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      const res = await fetchFromGas('toggleBannerStatus', { bannerId, status });
      if (res && res.success) {
        await fetchBannersAndSync();
        safeDispatchEvent('arwaleats_banners_updated');
        return true;
      }
    } catch (err) {
      console.warn('Failed to toggle banner status via GAS', err);
    }
  }

  const banner = inMemoryBanners.find(b => b.bannerId === bannerId);
  if (banner) {
    banner.status = status;
    banner.updatedAt = new Date().toISOString();
  }
  saveInStorageBanners(inMemoryBanners);
  await cacheService.saveData('banners', null);
  safeDispatchEvent('arwaleats_banners_updated');
  return true;
}

export async function reorderBanners(bannerOrders: Array<{ bannerId: string; priority: number }>): Promise<boolean> {
  const gasUrl = getGasUrl();
  if (gasUrl) {
    try {
      const res = await fetchFromGas('reorderBanners', { bannerOrders });
      if (res && res.success) {
        await fetchBannersAndSync();
        safeDispatchEvent('arwaleats_banners_updated');
        return true;
      }
    } catch (err) {
      console.warn('Failed to reorder banners via GAS', err);
    }
  }

  bannerOrders.forEach(item => {
    const target = inMemoryBanners.find(b => b.bannerId === item.bannerId);
    if (target) {
      target.priority = item.priority;
    }
  });
  saveInStorageBanners(inMemoryBanners);
  await cacheService.saveData('banners', null);
  safeDispatchEvent('arwaleats_banners_updated');
  return true;
}

// Secure SHA-256 Hashing utility in TS
export function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  const lengthProperty = 'length';
  let i;

  const words: number[] = [];
  const asciiLength = ascii[lengthProperty];
  
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let wordsLength = ((asciiLength + 8) >> 6) + 1;
  const maxWords = wordsLength * 16;
  
  for (i = 0; i < maxWords; i++) {
    words[i] = 0;
  }
  for (i = 0; i < asciiLength; i++) {
    words[i >> 2] |= ascii.charCodeAt(i) << (24 - (i % 4) * 8);
  }
  words[asciiLength >> 2] |= 0x80 << (24 - (asciiLength % 4) * 8);
  words[maxWords - 1] = asciiLength * 8;
  
  for (let chunkStart = 0; chunkStart < maxWords; chunkStart += 16) {
    const w: number[] = [];
    for (i = 0; i < 16; i++) w[i] = words[chunkStart + i];
    for (i = 16; i < 64; i++) {
      const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    
    let a = hash[0];
    let b = hash[1];
    let c = hash[2];
    let d = hash[3];
    let e = hash[4];
    let f = hash[5];
    let g = hash[6];
    let h = hash[7];
    
    for (i = 0; i < 64; i++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + k[i] + w[i]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      
      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }
    
    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }
  
  let resultStr = '';
  for (i = 0; i < 8; i++) {
    let hex = (hash[i] >>> 0).toString(16);
    while (hex.length < 8) hex = '0' + hex;
    resultStr += hex;
  }
  return resultStr;
}

export async function merchantLogin(username: string, password: string): Promise<{ success: boolean; message?: string; restaurant?: Restaurant }> {
  const gasUrl = getGasUrl();
  if (!gasUrl) {
    return { success: false, message: 'Google Sheets integration not configured.' };
  }
  
  try {
    const res = await fetchFromGas('merchantLogin', { username, password });
    if (res && res.success && res.restaurant) {
      return { success: true, restaurant: res.restaurant };
    } else {
      return { success: false, message: res?.message || 'Invalid merchant credentials' };
    }
  } catch (err) {
    console.error('Merchant Login via GAS failed:', err);
    return { success: false, message: 'Failed to connect to Google Sheets server.' };
  }
}



