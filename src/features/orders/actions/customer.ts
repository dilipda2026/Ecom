'use server';

import { createServiceClient } from '@/infrastructure/supabase/service';
import { getServerSession } from '@/features/auth/actions';
import type { CartItem } from '@/features/cart/types';
import type { Order, OrderItem } from '../types';
import { notifyNewOrder } from '@/lib/notifications';
import { signQrToken, isQrConfigured } from '@/features/delivery/lib/security';
import { getSetting, getNumericSetting, getBooleanSetting } from '@/lib/settings';

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
  orderType?: string;
}

export async function createOrder(params: CreateOrderParams) {
  const supabase = createServiceClient();
  if (!supabase) return { success: false, error: 'Service not configured' };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const { user } = await getServerSession();
  if (!user) return { success: false, error: 'Please sign in to place your order' };

  const maintenanceMode = await getBooleanSetting('maintenance_mode', false);
  if (maintenanceMode) {
    return { success: false, error: 'The store is currently in maintenance mode. Please try again later.' };
  }

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

  const { items, subtotal, deliveryFee, taxAmount, total, paymentMethod, address, notes, customerPhone, customerName, customerEmail, orderType } = params;

  if (paymentMethod === 'cod' && orderType && orderType !== 'room_delivery') {
    return { success: false, error: 'Pay on Delivery is only available for Hostel Delivery orders' };
  }

  const activeGateway = (await getSetting('payment_gateway_active')) || 'razorpay';
  const isOnline = ['razorpay', 'phonepe', 'gpay'].includes(paymentMethod);
  if (isOnline && (activeGateway === 'none' || paymentMethod !== activeGateway)) {
    return { success: false, error: 'Online payments are disabled or the selected gateway is not active. Please choose Wallet or Cash on Delivery.' };
  }

  const paymentMethodDb =
    paymentMethod === 'bnpl' ? 'bnpl'
    : paymentMethod === 'cod' ? 'cod'
    : paymentMethod === 'phonepe' || paymentMethod === 'gpay' ? 'upi'
    : 'razorpay';

  const orderPayload = {
    user_id: user?.id ?? null,
    restaurant_id: restaurantId,
    status: 'pending',
    payment_status: 'pending',
    payment_method: paymentMethodDb,
    subtotal,
    delivery_fee: deliveryFee,
    tax_amount: taxAmount,
    discount_amount: 0,
    total,
    customer_name: customerName || user?.fullName || null,
    customer_email: customerEmail || user?.email || null,
    customer_phone: customerPhone || null,
    delivery_address: orderType === 'room_delivery'
      ? { address, city: params.city ?? '', pincode: params.pincode ?? '' }
      : { address: 'Take away from restaurant' },
    delivery_notes: notes ?? null,
    order_type: orderType ?? null,
  };

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert(orderPayload)
    .select('id, tracking_code')
    .single();

  if (orderError || !order) {
    return { success: false, error: orderError?.message || 'Failed to create order' };
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
    'thali-chicken': '00000000-0000-0000-0000-000000000020',
    'thali-pork': '00000000-0000-0000-0000-000000000026',
    'thali-veg': '00000000-0000-0000-0000-000000000021',
    'gravy-chicken': '00000000-0000-0000-0000-000000000024',
    'gravy-pork': '00000000-0000-0000-0000-000000000025',

    'featured-1': '00000000-0000-0000-0000-000000000020',
    'featured-2': '00000000-0000-0000-0000-000000000021',
    'featured-3': '00000000-0000-0000-0000-000000000024',
    'featured-4': '00000000-0000-0000-0000-000000000025',
    'featured-5': '00000000-0000-0000-0000-000000000026',
    'offer-1': '00000000-0000-0000-0000-000000000020',
    'offer-2': '00000000-0000-0000-0000-000000000021',
    'offer-3': '00000000-0000-0000-0000-000000000024',
    'offer-4': '00000000-0000-0000-0000-000000000025',
    'offer-5': '00000000-0000-0000-0000-000000000026',
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

  let qrToken: string | null = null;
  try {
    if (isQrConfigured()) {
      qrToken = signQrToken(order.tracking_code);
      await supabase
        .from('orders')
        .update({ pickup_qr_token: qrToken, pickup_qr_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() })
        .eq('id', order.id);
    }
  } catch {}

  return { success: true, data: { orderId: order.id, trackingCode: order.tracking_code, qrToken } };
}

export async function sendOrderNotification(orderId: string, qrTokenOverride?: string | null) {
  const supabase = createServiceClient();
  if (!supabase) return;

  const { data } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single();

  if (!data) return;

  const items = (data.order_items ?? []).map((i: { product_name: string; quantity: number; subtotal: number }) => ({
    name: i.product_name,
    quantity: i.quantity,
    price: Math.round(i.subtotal / i.quantity),
  }));

  const address = (data.delivery_address as Record<string, string> | null)?.address ?? '';

  await notifyNewOrder({
    id: data.id,
    trackingCode: data.tracking_code,
    items,
    total: data.total,
    paymentMethod: data.payment_method ?? 'cod',
    address,
    customerName: data.customer_name,
    customerPhone: data.customer_phone,
    orderType: data.order_type,
  }, data.status, qrTokenOverride ?? data.pickup_qr_token ?? null);
}

export async function getOrderTrackingByCode(trackingCode: string) {
  const supabase = createServiceClient();
  if (!supabase) return { success: false, error: 'Service not configured' };

  const { user } = await getServerSession();
  if (!user) return { success: false, error: 'Please sign in to track your order' };

  const code = (trackingCode || '').trim().toUpperCase();
  if (!/^[A-Z0-9-]+$/.test(code)) {
    return { success: false, error: 'Enter a valid tracking code' };
  }

  const { data: order } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('tracking_code', code)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!order) return { success: false, error: 'No order found with this tracking code' };

  const { data: assignment } = await supabase
    .from('delivery_assignments')
    .select('*')
    .eq('order_id', order.id)
    .maybeSingle();

  const { data: partner } = order.delivery_partner_id
    ? await supabase.from('profiles').select('full_name, phone').eq('id', order.delivery_partner_id).maybeSingle()
    : { data: null };

  return {
    success: true,
    data: {
      order: order as Order & { order_items?: OrderItem[] },
      assignment: assignment
        ? {
            status: assignment.status,
            otpValue: assignment.otp_value ?? null,
            otpExpiresAt: assignment.otp_expires_at ?? null,
            otpVerifiedAt: assignment.otp_verified_at ?? null,
          }
        : null,
      partner: partner ? { fullName: partner.full_name ?? null, phone: partner.phone ?? null } : null,
    },
  };
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

export async function cancelUnpaidOrder(orderId: string, reason = 'Payment not completed') {
  const supabase = createServiceClient();
  if (!supabase) return { success: false, error: 'Service unavailable' };

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
    })
    .eq('id', orderId)
    .eq('status', 'pending');

  if (error) return { success: false, error: 'Failed to cancel order' };
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
  const cancellationWindowMinutes = await getNumericSetting('cancellation_window_minutes', 2);
  const cancellationWindowMs = cancellationWindowMinutes * 60_000;
  if (elapsed > cancellationWindowMs) {
    return { success: false, error: `Cancellation window has expired (${cancellationWindowMinutes} minute${cancellationWindowMinutes === 1 ? '' : 's'})` };
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
