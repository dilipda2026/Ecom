'use server';

import { createServiceClient } from '@/infrastructure/supabase/service';
import { getServerSession } from '@/features/auth/actions';
import type { CartItem } from '@/features/cart/types';
import type { Order } from '../types';
import { notifyNewOrder } from '@/lib/notifications';

interface CreateOrderParams {
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  taxAmount: number;
  total: number;
  paymentMethod: string;
  address: string;
  city?: string;
  pincode?: string;
  notes?: string;
  customerPhone?: string;
  customerName?: string;
  customerEmail?: string;
}

export async function createOrder(params: CreateOrderParams) {
  const supabase = createServiceClient();
  if (!supabase) return { success: false, error: 'Service not configured' };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const { user } = await getServerSession();

  let restaurantId: string;
  try {
    const res = await fetch(`${url}/rest/v1/restaurants?select=id&deleted_at=is.null&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return { success: false, error: 'Restaurant not available' };
    const rows = await res.json();
    if (!rows || rows.length === 0) return { success: false, error: 'Restaurant not available' };
    restaurantId = rows[0].id;
  } catch {
    return { success: false, error: 'Restaurant not available' };
  }

  const { items, subtotal, deliveryFee, taxAmount, total, paymentMethod, address, notes, customerPhone, customerName, customerEmail } = params;

  const orderPayload = {
    user_id: user?.id ?? null,
    restaurant_id: restaurantId,
    status: 'pending',
    payment_status: 'pending',
    payment_method: paymentMethod === 'bnpl' ? 'bnpl' : paymentMethod === 'cod' ? 'cod' : 'razorpay',
    subtotal,
    delivery_fee: deliveryFee,
    tax_amount: taxAmount,
    discount_amount: 0,
    total,
    customer_name: customerName || user?.fullName || null,
    customer_email: customerEmail || user?.email || null,
    customer_phone: customerPhone || null,
    delivery_address: { address, city: params.city ?? '', pincode: params.pincode ?? '' },
    delivery_notes: notes ?? null,
  };

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert(orderPayload)
    .select('id, tracking_code')
    .single();

  if (orderError || !order) {
    return { success: false, error: 'Failed to create order' };
  }

  const productIds: Record<string, string> = {
    'biryani-1': '00000000-0000-0000-0000-000000000001',
    'biryani-2': '00000000-0000-0000-0000-000000000002',
    'biryani-3': '00000000-0000-0000-0000-000000000003',
    'rice-1': '00000000-0000-0000-0000-000000000004',
    'fish-1': '00000000-0000-0000-0000-000000000005',
    'fish-2': '00000000-0000-0000-0000-000000000006',
    'fish-3': '00000000-0000-0000-0000-000000000007',
    'fish-4': '00000000-0000-0000-0000-000000000008',
    'meat-1': '00000000-0000-0000-0000-000000000009',
    'meat-2': '00000000-0000-0000-0000-000000000010',
    'meat-3': '00000000-0000-0000-0000-000000000011',
    'meat-4': '00000000-0000-0000-0000-000000000012',
    'veg-1': '00000000-0000-0000-0000-000000000013',
    'veg-2': '00000000-0000-0000-0000-000000000014',
    'veg-3': '00000000-0000-0000-0000-000000000015',
    'veg-4': '00000000-0000-0000-0000-000000000016',
    'sweet-1': '00000000-0000-0000-0000-000000000017',
    'sweet-2': '00000000-0000-0000-0000-000000000018',
    'sweet-3': '00000000-0000-0000-0000-000000000019',
    'featured-1': '00000000-0000-0000-0000-000000000001',
    'featured-2': '00000000-0000-0000-0000-000000000005',
    'featured-3': '00000000-0000-0000-0000-000000000006',
    'featured-4': '00000000-0000-0000-0000-000000000009',
    'featured-5': '00000000-0000-0000-0000-000000000017',
    'featured-6': '00000000-0000-0000-0000-000000000004',
    'offer-1': '00000000-0000-0000-0000-000000000001',
    'offer-2': '00000000-0000-0000-0000-000000000005',
    'offer-3': '00000000-0000-0000-0000-000000000006',
    'offer-4': '00000000-0000-0000-0000-000000000009',
    'offer-5': '00000000-0000-0000-0000-000000000017',
    'offer-6': '00000000-0000-0000-0000-000000000004',
  };

  const orderItems = items.map((item) => ({
    order_id: order.id,
    product_id: productIds[item.id] ?? item.id,
    product_name: item.name,
    product_price: item.price,
    unit_price: item.price,
    quantity: item.quantity,
    subtotal: item.price * item.quantity,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

  if (itemsError) {
    await supabase.from('orders').delete().eq('id', order.id);
    return { success: false, error: 'Failed to save order items' };
  }

  await notifyNewOrder({
    id: order.id,
    trackingCode: order.tracking_code,
    items: items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
    total,
    paymentMethod,
    address,
    customerName: customerName || null,
    customerPhone: customerPhone || null,
  });

  return { success: true, data: { orderId: order.id, trackingCode: order.tracking_code } };
}

export async function confirmPayment(orderId: string) {
  const supabase = createServiceClient();
  if (!supabase) return { success: false, error: 'Service unavailable' };

  const { error } = await supabase
    .from('orders')
    .update({ payment_status: 'confirmed' })
    .eq('id', orderId);

  if (error) return { success: false, error: 'Failed to confirm payment' };
  return { success: true };
}

export async function failPayment(orderId: string) {
  const supabase = createServiceClient();
  if (!supabase) return { success: false, error: 'Service unavailable' };

  const { error } = await supabase
    .from('orders')
    .update({ payment_status: 'failed' })
    .eq('id', orderId);

  if (error) return { success: false, error: 'Failed to update payment status' };
  return { success: true };
}

export async function getUserOrders(page = 1, pageSize = 10) {
  const supabase = createServiceClient();
  if (!supabase) return { success: false, error: 'Service unavailable' };

  const { user } = await getServerSession();
  if (!user) return { success: false, error: 'Not authenticated' };

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('orders')
    .select('*, order_items(*)', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) return { success: false, error: 'Failed to fetch orders' };

  const totalPages = Math.ceil((count ?? 0) / pageSize);

  return {
    success: true,
    data: {
      orders: data as unknown as Order[],
      total: count ?? 0,
      page,
      totalPages,
    },
  };
}

export async function cancelUserOrder(orderId: string, reason: string) {
  const supabase = createServiceClient();
  if (!supabase) return { success: false, error: 'Service unavailable' };

  const { user } = await getServerSession();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('user_id, status, status_history, created_at')
    .eq('id', orderId)
    .maybeSingle();

  if (fetchError || !order) return { success: false, error: 'Order not found' };
  if (order.user_id !== user.id) return { success: false, error: 'Unauthorized' };
  if (order.status !== 'pending' && order.status !== 'accepted') return { success: false, error: 'Order can no longer be cancelled' };

  const elapsed = Date.now() - new Date(order.created_at).getTime();
  if (elapsed > 240_000) {
    return { success: false, error: 'Cancellation window has expired (4 minutes)' };
  }

  const historyEntry = { status: 'cancelled', timestamp: new Date().toISOString(), note: reason || 'Cancelled by customer' };
  const existingHistory = (order.status_history ?? []) as Array<Record<string, unknown>>;
  const statusHistory = [...existingHistory, historyEntry];

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason || 'Cancelled by customer',
      status_history: statusHistory,
    })
    .eq('id', orderId);

  if (error) return { success: false, error: 'Failed to cancel order' };
  return { success: true };
}

export async function getUserOrder(orderId: string) {
  const supabase = createServiceClient();
  if (!supabase) return { success: false, error: 'Service unavailable' };

  const { user } = await getServerSession();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .maybeSingle();

  if (error || !data) return { success: false, error: 'Order not found' };
  if (data.user_id !== user.id) return { success: false, error: 'Unauthorized' };

  return { success: true, data: data as unknown as Order };
}
