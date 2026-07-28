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
    restaurant_id?: string;
    customer_lat?: number;
    customer_lng?: number;
    restaurant_lat?: number;
    restaurant_lng?: number;
    distance_km?: number;
    estimated_time?: string;
    delivery_fee?: number;
    grand_total?: number;
  }
): Promise<{ success: boolean; orderId: string; message: string }> {
  const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
  const dateStr = new Date().toISOString();

  const gasUrl = getGasUrl();
  if (!gasUrl) {
    return { success: false, orderId: '', message: 'Google Sheets not configured. Cannot place order.' };
  }

  try {
    const res = await fetchFromGas('placeOrder', {
      order: {
        orderId,
        customerId,
        date: dateStr,
        subtotal,
        discount,
        deliveryFee,
        total,
        paymentMethod,
        status: 'Pending',
        coupon: couponCode,
        estimatedDeliveryTime: estimatedDeliveryTime || '',
        ...additionalFields,
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
