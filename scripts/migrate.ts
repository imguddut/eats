import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const gasUrl = 'https://script.google.com/macros/s/AKfycbwMGVw-3f2nCBR68bz0Py5nYBgljqa4H7LcrwtraTs8CoOAJdXHToUS2xQSk4aNt6hmLg/exec';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Supabase URL and Anon Key must be configured in your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1500): Promise<T | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`⚠️ Network attempt ${attempt} failed, retrying in ${delayMs}ms...`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return null;
}

async function fetchFromGas(action: string, payload: any = {}): Promise<any> {
  console.log(`🌐 Fetching ${action} from Google Sheets...`);
  return withRetry(async () => {
    const response = await fetch(gasUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ action, ...payload }),
    });
    if (!response.ok) return null;
    const resJson = await response.json();
    if (resJson && resJson.success) return resJson.data || resJson;
    return null;
  });
}

async function migrateAllOrdersAndItems() {
  console.log('📦 Fetching all orders and order_items from Google Sheets...');
  
  const { data: dbCustomers } = await supabase.from('customers').select('customer_id');
  const validCustomerIds = new Set((dbCustomers || []).map(c => c.customer_id));

  const { data: dbRestaurants } = await supabase.from('restaurants').select('id');
  const validRestaurantIds = new Set((dbRestaurants || []).map(r => r.id));

  const ordersData = await fetchFromGas('getAdminOrders');
  if (!ordersData || !Array.isArray(ordersData) || ordersData.length === 0) {
    console.log('⚠️ No orders returned from Google Sheets API.');
    return;
  }

  console.log(`📦 Found ${ordersData.length} orders to migrate...`);

  let orderSuccessCount = 0;
  let itemsSuccessCount = 0;

  for (const o of ordersData) {
    const rawCustId = o.customerId;
    const validCustId = validCustomerIds.has(rawCustId) ? rawCustId : null;

    const rawRestId = o.restaurantId || o.restaurant_id;
    const validRestId = validRestaurantIds.has(rawRestId) ? rawRestId : null;

    const safeDate = (() => {
      if (!o.date) return new Date().toISOString();
      try {
        const d = new Date(o.date);
        return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      } catch (e) {
        return new Date().toISOString();
      }
    })();

    const orderPayload = {
      order_id: o.orderId,
      customer_id: validCustId,
      customer_name: o.customerName || 'Customer',
      phone: o.phone || '',
      address: o.address || '',
      date: safeDate,
      subtotal: Number(o.subtotal) || 0,
      discount: Number(o.discount) || 0,
      delivery_fee: Number(o.deliveryFee || o.delivery_fee) || 0,
      total: Number(o.total) || 0,
      payment_method: o.paymentMethod || 'COD',
      status: o.status || 'Pending',
      coupon: o.coupon || '',
      estimated_delivery_time: o.estimatedDeliveryTime || '',
      restaurant_id: validRestId,
      restaurant_name: o.restaurantName || 'ArwalEats',
      delivery_zone: o.delivery_zone || '',
      customer_lat: o.customer_lat ? Number(o.customer_lat) : null,
      customer_lng: o.customer_lng ? Number(o.customer_lng) : null,
      restaurant_lat: o.restaurant_lat ? Number(o.restaurant_lat) : null,
      restaurant_lng: o.restaurant_lng ? Number(o.restaurant_lng) : null,
      distance_km: o.distance_km ? Number(o.distance_km) : null,
      estimated_time: o.estimated_time || '',
      grand_total: o.grand_total ? Number(o.grand_total) : (Number(o.total) || 0),
      place_id: o.placeId || '',
      route_summary: o.route_summary || '',
      delivery_boy_name: o.deliveryBoyName || '',
      delivery_boy_phone: o.deliveryBoyPhone || '',
      vehicle_number: o.vehicleNumber || ''
    };

    const { error: orderErr } = await supabase.from('orders').upsert([orderPayload]);
    if (orderErr) {
      console.error(`❌ Order ${o.orderId} migration error:`, orderErr);
      continue;
    }
    orderSuccessCount++;

    await supabase.from('order_items').delete().eq('order_id', o.orderId);

    if (o.items && Array.isArray(o.items) && o.items.length > 0) {
      const itemRows = o.items.map((item: any) => ({
        order_id: o.orderId,
        item_id: item.itemId || '',
        name: item.name || 'Item',
        variant: item.variant || 'Regular',
        price: Number(item.price) || 0,
        qty: Number(item.qty) || 1,
        restaurant_id: validRestId
      }));

      const { error: itemsErr } = await supabase.from('order_items').insert(itemRows);
      if (itemsErr) {
        console.error(`❌ Order items for ${o.orderId} migration error:`, itemsErr);
      } else {
        itemsSuccessCount += itemRows.length;
      }
    }
  }

  console.log(`🎉 SUCCESS: Migrated ${orderSuccessCount} / ${ordersData.length} Orders and ${itemsSuccessCount} Order Items into Supabase!`);
}

migrateAllOrdersAndItems();
