import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Customer, Order, OrderItem, MenuItem, RestaurantSettings, Restaurant, Banner, Coupon } from '../types';
import { safeDispatchEvent } from '../utils/customEvent';

// ============================================================================
// 1. SUPABASE SETTINGS SERVICE
// ============================================================================
export const SupabaseSettingsService = {
  async getSettings(): Promise<RestaurantSettings | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase.from('settings').select('*').limit(1).single();
      if (error || !data) return null;
      return {
        deliveryFee: Number(data.delivery_fee) || 0,
        minimumOrder: Number(data.minimum_order) || 100,
        restaurantName: data.restaurant_name || 'ArwalEats',
        phone: data.phone || '+91 81021 23746',
        whatsapp: data.whatsapp || '7973638639',
        address: data.address || '',
        openingTime: data.opening_time || '11:00 AM',
        closingTime: data.closing_time || '11:00 PM',
        isClosed: Boolean(data.is_closed),
        closedMessage: data.closed_message || '',
        latitude: Number(data.latitude) || 25.0143,
        longitude: Number(data.longitude) || 84.6784,
        maxDeliveryRadius: Number(data.max_delivery_radius) || 15,
        deliveryChargeSlabs: typeof data.delivery_charge_slabs === 'string' ? JSON.parse(data.delivery_charge_slabs) : (data.delivery_charge_slabs || [])
      };
    } catch (err) {
      console.error('[SupabaseSettings] getSettings error:', err);
      return null;
    }
  },

  async updateSettings(settings: Partial<RestaurantSettings>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const payload: any = {};
      if (settings.restaurantName !== undefined) payload.restaurant_name = settings.restaurantName;
      if (settings.phone !== undefined) payload.phone = settings.phone;
      if (settings.whatsapp !== undefined) payload.whatsapp = settings.whatsapp;
      if (settings.address !== undefined) payload.address = settings.address;
      if (settings.openingTime !== undefined) payload.opening_time = settings.openingTime;
      if (settings.closingTime !== undefined) payload.closing_time = settings.closingTime;
      if (settings.isClosed !== undefined) payload.is_closed = settings.isClosed;
      if (settings.closedMessage !== undefined) payload.closed_message = settings.closedMessage;
      if (settings.latitude !== undefined) payload.latitude = settings.latitude;
      if (settings.longitude !== undefined) payload.longitude = settings.longitude;
      if (settings.deliveryFee !== undefined) payload.delivery_fee = settings.deliveryFee;
      if (settings.minimumOrder !== undefined) payload.minimum_order = settings.minimumOrder;
      if (settings.maxDeliveryRadius !== undefined) payload.max_delivery_radius = settings.maxDeliveryRadius;
      if (settings.deliveryChargeSlabs !== undefined) payload.delivery_charge_slabs = settings.deliveryChargeSlabs;

      const { data: existing } = await supabase.from('settings').select('id').limit(1).single();
      if (existing) {
        await supabase.from('settings').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('settings').insert([payload]);
      }
      safeDispatchEvent('arwaleats_settings_updated');
      return true;
    } catch (err) {
      console.error('[SupabaseSettings] updateSettings error:', err);
      return false;
    }
  }
};

// ============================================================================
// 2. SUPABASE MENU SERVICE
// ============================================================================
export const SupabaseMenuService = {
  async getMenuItems(): Promise<MenuItem[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase.from('menu').select('*').order('created_at', { ascending: true });
      if (error || !data) return null;
      return data.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        variant: item.variant || 'Regular',
        price: String(item.price),
        image: item.image,
        available: Boolean(item.available),
        featured: Boolean(item.featured),
        profitMargin: String(item.profit_margin || 0),
        dietType: item.diet_type || 'veg',
        description: item.description || '',
        restaurantId: item.restaurant_id || 'rest1'
      }));
    } catch (err) {
      console.error('[SupabaseMenu] getMenuItems error:', err);
      return null;
    }
  },

  async addMenuItem(item: MenuItem): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const payload = {
        id: item.id || 'ITEM-' + Date.now(),
        restaurant_id: item.restaurantId || 'rest1',
        name: item.name,
        category: item.category,
        variant: item.variant || 'Regular',
        price: Number(item.price) || 0,
        image: item.image,
        available: item.available ?? true,
        featured: item.featured ?? false,
        profit_margin: Number(item.profitMargin) || 0,
        diet_type: item.dietType || 'veg',
        description: item.description || ''
      };
      const { error } = await supabase.from('menu').insert([payload]);
      if (error) throw error;
      safeDispatchEvent('arwaleats_menu_updated');
      return true;
    } catch (err) {
      console.error('[SupabaseMenu] addMenuItem error:', err);
      return false;
    }
  },

  async updateMenuItem(item: MenuItem): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const payload: any = {
        name: item.name,
        category: item.category,
        variant: item.variant,
        price: Number(item.price) || 0,
        image: item.image,
        available: item.available,
        featured: item.featured,
        profit_margin: Number(item.profitMargin) || 0,
        diet_type: item.dietType,
        description: item.description,
        restaurant_id: item.restaurantId
      };
      const { error } = await supabase.from('menu').update(payload).eq('id', item.id);
      if (error) throw error;
      safeDispatchEvent('arwaleats_menu_updated');
      return true;
    } catch (err) {
      console.error('[SupabaseMenu] updateMenuItem error:', err);
      return false;
    }
  },

  async deleteMenuItem(id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const { error } = await supabase.from('menu').delete().eq('id', id);
      if (error) throw error;
      safeDispatchEvent('arwaleats_menu_updated');
      return true;
    } catch (err) {
      console.error('[SupabaseMenu] deleteMenuItem error:', err);
      return false;
    }
  }
};

// ============================================================================
// 3. SUPABASE RESTAURANT SERVICE
// ============================================================================
export const SupabaseRestaurantService = {
  async getRestaurants(): Promise<Restaurant[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase.from('restaurants').select('*');
      if (error || !data) return null;
      return data.map(r => ({
        id: r.id,
        name: r.name,
        phone: r.phone || '',
        address: r.address || '',
        cuisine: r.cuisine || '',
        image: r.image || '',
        rating: Number(r.rating) || 4.5,
        deliveryTime: r.delivery_time || '25-35 mins',
        active: Boolean(r.active),
        featured: Boolean(r.featured),
        deliveryRadius: Number(r.delivery_radius) || 15,
        latitude: Number(r.latitude) || 25.0143,
        longitude: Number(r.longitude) || 84.6784,
        isClosed: Boolean(r.is_closed),
        openingTime: r.opening_time || '11:00 AM',
        closingTime: r.closing_time || '11:00 PM',
        closedMessage: r.closed_message || ''
      }));
    } catch (err) {
      console.error('[SupabaseRestaurant] getRestaurants error:', err);
      return null;
    }
  },

  async addRestaurant(restaurant: Restaurant): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const payload = {
        id: restaurant.id || 'REST-' + Date.now(),
        name: restaurant.name,
        phone: restaurant.phone,
        address: restaurant.address,
        cuisine: restaurant.cuisine,
        image: restaurant.image,
        rating: restaurant.rating || 4.5,
        delivery_time: restaurant.deliveryTime || '25-35 mins',
        active: restaurant.active ?? true,
        featured: restaurant.featured ?? false,
        delivery_radius: restaurant.deliveryRadius || 15,
        latitude: restaurant.latitude || 25.0143,
        longitude: restaurant.longitude || 84.6784,
        is_closed: restaurant.isClosed ?? false,
        opening_time: restaurant.openingTime || '11:00 AM',
        closing_time: restaurant.closingTime || '11:00 PM',
        closed_message: restaurant.closedMessage || ''
      };
      const { error } = await supabase.from('restaurants').insert([payload]);
      if (error) throw error;
      safeDispatchEvent('arwaleats_restaurants_updated');
      return true;
    } catch (err) {
      console.error('[SupabaseRestaurant] addRestaurant error:', err);
      return false;
    }
  },

  async updateRestaurant(restaurant: Restaurant): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const payload: any = {
        name: restaurant.name,
        phone: restaurant.phone,
        address: restaurant.address,
        cuisine: restaurant.cuisine,
        image: restaurant.image,
        rating: restaurant.rating,
        delivery_time: restaurant.deliveryTime,
        active: restaurant.active,
        featured: restaurant.featured,
        delivery_radius: restaurant.deliveryRadius,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        is_closed: restaurant.isClosed,
        opening_time: restaurant.openingTime,
        closing_time: restaurant.closingTime,
        closed_message: restaurant.closedMessage
      };
      const { error } = await supabase.from('restaurants').update(payload).eq('id', restaurant.id);
      if (error) throw error;
      safeDispatchEvent('arwaleats_restaurants_updated');
      return true;
    } catch (err) {
      console.error('[SupabaseRestaurant] updateRestaurant error:', err);
      return false;
    }
  }
};

// ============================================================================
// 4. SUPABASE CUSTOMER SERVICE
// ============================================================================
export const SupabaseCustomerService = {
  async getCustomers(): Promise<Customer[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      if (error || !data) return null;
      return data.map(c => ({
        customerId: c.customer_id,
        firebaseUid: c.firebase_uid,
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        city: c.city || 'Arwal',
        pincode: c.pincode || '804401',
        provider: c.provider || 'email',
        createdAt: c.created_at,
        latitude: c.latitude ? Number(c.latitude) : undefined,
        longitude: c.longitude ? Number(c.longitude) : undefined
      }));
    } catch (err) {
      console.error('[SupabaseCustomer] getCustomers error:', err);
      return null;
    }
  },

  async registerCustomer(customer: Partial<Customer>): Promise<{ success: boolean; customer?: Customer; message: string }> {
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase not configured' };
    try {
      const custId = customer.customerId || ('CUST-' + Math.floor(100000 + Math.random() * 900000));
      const payload = {
        customer_id: custId,
        firebase_uid: customer.firebaseUid || null,
        name: customer.name || 'Customer',
        phone: customer.phone || '',
        email: customer.email || '',
        password: customer.password || '',
        address: customer.address || '',
        city: customer.city || 'Arwal',
        pincode: customer.pincode || '804401',
        provider: customer.provider || 'email',
        latitude: customer.latitude || null,
        longitude: customer.longitude || null
      };

      const { error } = await supabase.from('customers').upsert([payload]);
      if (error) throw error;
      safeDispatchEvent('arwaleats_customers_updated');
      return { success: true, customer: { ...customer, customerId: custId } as Customer, message: 'Registered successfully' };
    } catch (err: any) {
      console.error('[SupabaseCustomer] registerCustomer error:', err);
      return { success: false, message: err.message || 'Registration failed' };
    }
  },

  async updateCustomer(customer: Partial<Customer>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const payload: any = {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        city: customer.city,
        pincode: customer.pincode,
        latitude: customer.latitude,
        longitude: customer.longitude
      };
      const { error } = await supabase.from('customers').update(payload).eq('customer_id', customer.customerId);
      if (error) throw error;
      safeDispatchEvent('arwaleats_customers_updated');
      return true;
    } catch (err) {
      console.error('[SupabaseCustomer] updateCustomer error:', err);
      return false;
    }
  }
};

// ============================================================================
// 5. SUPABASE BANNER & COUPON SERVICE
// ============================================================================
export const SupabaseBannerService = {
  async getBanners(): Promise<Banner[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase.from('banners').select('*').order('priority', { ascending: true });
      if (error || !data) return null;
      return data.map(b => ({
        bannerId: b.banner_id,
        title: b.title,
        subtitle: b.subtitle || '',
        description: b.description || '',
        image: b.image,
        buttonText: b.button_text || 'Order Now',
        buttonLink: b.button_link || '',
        couponCode: b.coupon_code || '',
        categoryId: b.category_id || '',
        restaurantId: b.restaurant_id || '',
        offerBadge: b.offer_badge || '',
        redirectType: b.redirect_type || 'none',
        backgroundColor: b.background_color || '#0f172a',
        textColor: b.text_color || '#ffffff',
        priority: Number(b.priority) || 1,
        status: b.status || 'active',
        showCountdown: Boolean(b.show_countdown),
        startDate: b.start_date || '',
        endDate: b.end_date || '',
        createdAt: b.created_at,
        updatedAt: b.updated_at
      }));
    } catch (err) {
      console.error('[SupabaseBanner] getBanners error:', err);
      return null;
    }
  },

  async saveBanner(banner: Partial<Banner>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const payload = {
        banner_id: banner.bannerId || ('BAN-' + Date.now()),
        title: banner.title || 'Special Offer',
        subtitle: banner.subtitle || '',
        description: banner.description || '',
        image: banner.image || '',
        button_text: banner.buttonText || 'Order Now',
        button_link: banner.buttonLink || '',
        coupon_code: banner.couponCode || '',
        category_id: banner.categoryId || '',
        restaurant_id: banner.restaurantId || '',
        offer_badge: banner.offerBadge || '',
        redirect_type: banner.redirectType || 'none',
        background_color: banner.backgroundColor || '#0f172a',
        text_color: banner.textColor || '#ffffff',
        priority: Number(banner.priority) || 1,
        status: banner.status || 'active',
        show_countdown: Boolean(banner.showCountdown),
        start_date: banner.startDate ? new Date(banner.startDate).toISOString() : null,
        end_date: banner.endDate ? new Date(banner.endDate).toISOString() : null
      };
      const { error } = await supabase.from('banners').upsert([payload]);
      if (error) throw error;
      safeDispatchEvent('arwaleats_banners_updated');
      return true;
    } catch (err) {
      console.error('[SupabaseBanner] saveBanner error:', err);
      return false;
    }
  },

  async deleteBanner(bannerId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const { error } = await supabase.from('banners').delete().eq('banner_id', bannerId);
      if (error) throw error;
      safeDispatchEvent('arwaleats_banners_updated');
      return true;
    } catch (err) {
      console.error('[SupabaseBanner] deleteBanner error:', err);
      return false;
    }
  }
};

export const SupabaseCouponService = {
  async getCoupons(): Promise<Coupon[] | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data, error } = await supabase.from('coupons').select('*').eq('active', true);
      if (error || !data) return null;
      return data.map(c => ({
        coupon: c.coupon,
        discountType: c.discount_type === 'percentage' ? 'Percentage' : 'Fixed',
        value: Number(c.value),
        minimumOrder: Number(c.minimum_order),
        expiry: c.expiry || '',
        active: Boolean(c.active)
      }));
    } catch (err) {
      console.error('[SupabaseCoupon] getCoupons error:', err);
      return null;
    }
  }
};

// ============================================================================
// 6. SUPABASE ORDER SERVICE (WITH REALTIME SUBSCRIPTION)
// ============================================================================
export const SupabaseOrderService = {
  async placeOrder(orderData: any, itemsData: any[]): Promise<{ success: boolean; orderId: string; message: string }> {
    if (!isSupabaseConfigured()) return { success: false, orderId: '', message: 'Supabase not configured' };
    try {
      const orderId = orderData.orderId || ('ORD-' + Math.floor(100000 + Math.random() * 900000));
      const orderPayload = {
        order_id: orderId,
        customer_id: orderData.customerId,
        customer_name: orderData.customerName || 'Valued Customer',
        phone: orderData.phone || '',
        address: orderData.address || '',
        date: orderData.date || new Date().toISOString(),
        subtotal: orderData.subtotal,
        discount: orderData.discount || 0,
        delivery_fee: orderData.deliveryFee || 0,
        total: orderData.total,
        payment_method: orderData.paymentMethod || 'COD',
        status: orderData.status || 'Pending',
        coupon: orderData.coupon || '',
        estimated_delivery_time: orderData.estimatedDeliveryTime || '',
        restaurant_id: orderData.restaurantId || 'rest1',
        restaurant_name: orderData.restaurantName || 'ArwalEats',
        delivery_zone: orderData.delivery_zone || '',
        customer_lat: orderData.customer_lat,
        customer_lng: orderData.customer_lng,
        restaurant_lat: orderData.restaurant_lat,
        restaurant_lng: orderData.restaurant_lng,
        distance_km: orderData.distance_km,
        estimated_time: orderData.estimated_time,
        grand_total: orderData.grand_total || orderData.total,
        place_id: orderData.placeId,
        route_summary: orderData.route_summary
      };

      const { error: orderErr } = await supabase.from('orders').insert([orderPayload]);
      if (orderErr) throw orderErr;

      if (itemsData && itemsData.length > 0) {
        const itemRows = itemsData.map(item => ({
          order_id: orderId,
          item_id: item.itemId || '',
          name: item.name || '',
          variant: item.variant || 'Regular',
          price: item.price || 0,
          qty: item.qty || 1,
          restaurant_id: item.restaurantId || orderData.restaurantId || 'rest1'
        }));
        const { error: itemErr } = await supabase.from('order_items').insert(itemRows);
        if (itemErr) throw itemErr;
      }

      safeDispatchEvent('arwaleats_orders_updated');
      return { success: true, orderId, message: 'Order placed successfully' };
    } catch (err: any) {
      console.error('[SupabaseOrder] placeOrder error:', err);
      return { success: false, orderId: '', message: err.message || 'Failed to place order' };
    }
  },

  async getOrders(customerId?: string): Promise<Array<Order & { items: OrderItem[]; customerName: string; phone: string; address: string }> | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      let query = supabase.from('orders').select('*, order_items(*)').order('date', { ascending: false });
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }
      const { data, error } = await query;
      if (error || !data) return null;

      return data.map(o => ({
        orderId: o.order_id,
        customerId: o.customer_id,
        customerName: o.customer_name,
        phone: o.phone,
        address: o.address,
        date: o.date,
        subtotal: Number(o.subtotal),
        discount: Number(o.discount),
        deliveryFee: Number(o.delivery_fee),
        total: Number(o.total),
        paymentMethod: o.payment_method,
        status: o.status,
        coupon: o.coupon,
        estimatedDeliveryTime: o.estimated_delivery_time,
        restaurantId: o.restaurant_id,
        restaurantName: o.restaurant_name,
        delivery_zone: o.delivery_zone,
        customer_lat: o.customer_lat,
        customer_lng: o.customer_lng,
        restaurant_lat: o.restaurant_lat,
        restaurant_lng: o.restaurant_lng,
        distance_km: o.distance_km,
        estimated_time: o.estimated_time,
        grand_total: o.grand_total,
        placeId: o.place_id,
        route_summary: o.route_summary,
        deliveryBoyName: o.delivery_boy_name,
        deliveryBoyPhone: o.delivery_boy_phone,
        vehicleNumber: o.vehicle_number,
        items: (o.order_items || []).map((i: any) => ({
          itemId: i.item_id,
          name: i.name,
          variant: i.variant,
          price: Number(i.price),
          qty: Number(i.qty),
          restaurantId: i.restaurant_id
        }))
      }));
    } catch (err) {
      console.error('[SupabaseOrder] getOrders error:', err);
      return null;
    }
  },

  async updateOrderStatus(orderId: string, status: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const { error } = await supabase.from('orders').update({ status }).eq('order_id', orderId);
      if (error) throw error;
      safeDispatchEvent('arwaleats_orders_updated');
      return true;
    } catch (err) {
      console.error('[SupabaseOrder] updateOrderStatus error:', err);
      return false;
    }
  },

  async assignDeliveryBoy(orderId: string, riderDetails: any): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const payload = {
        delivery_boy_name: riderDetails.deliveryBoyName || riderDetails.name || '',
        delivery_boy_phone: riderDetails.deliveryBoyPhone || riderDetails.phone || '',
        vehicle_number: riderDetails.vehicleNumber || '',
        status: riderDetails.status || 'Out for Delivery'
      };
      const { error } = await supabase.from('orders').update(payload).eq('order_id', orderId);
      if (error) throw error;
      safeDispatchEvent('arwaleats_orders_updated');
      return true;
    } catch (err) {
      console.error('[SupabaseOrder] assignDeliveryBoy error:', err);
      return false;
    }
  }
};

// ============================================================================
// 7. SUPABASE REALTIME SYNCHRONIZATION LISTENER
// ============================================================================
export const initSupabaseRealtimeSubscriptions = () => {
  if (!isSupabaseConfigured()) return;

  supabase
    .channel('public:orders')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
      safeDispatchEvent('arwaleats_orders_updated');
    })
    .subscribe();

  supabase
    .channel('public:menu')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'menu' }, () => {
      safeDispatchEvent('arwaleats_menu_updated');
    })
    .subscribe();

  supabase
    .channel('public:restaurants')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants' }, () => {
      safeDispatchEvent('arwaleats_restaurants_updated');
    })
    .subscribe();

  supabase
    .channel('public:settings')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
      safeDispatchEvent('arwaleats_settings_updated');
    })
    .subscribe();

  supabase
    .channel('public:customers')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
      safeDispatchEvent('arwaleats_customers_updated');
    })
    .subscribe();

  supabase
    .channel('public:banners')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, () => {
      safeDispatchEvent('arwaleats_banners_updated');
    })
    .subscribe();
};
