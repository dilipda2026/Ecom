'use server';

import { createServiceClient } from '@/infrastructure/supabase/service';
import { getServerSession } from '@/features/auth/actions';
import type { CartItem } from '@/features/cart/types';
import type { Order, OrderItem } from '../types';
import { notifyNewOrder } from '@/lib/notifications';
import { signQrToken, isQrConfigured } from '@/features/delivery/lib/security';
import { getNumericSetting, getBooleanSetting, getSetting, getPaymentMethodAvailability } from '@/lib/settings';
import { minutesOf, formatClock, temporaryCloseLabel } from '@/features/menu/lib/store-hours';

interface CreateOrderParams {
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  maintenanceFee: number;
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
  deliverySlotId?: string;
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

  // Store hours are compared in IST (UTC+5:30) so the check is correct on any
  // server timezone. Uses the same config the storefront shows in StatusStrip.
  const istNow = new Date(Date.now() + (5 * 60 + 30) * 60 * 1000);
  const openTime = (await getSetting('store_hours_open')) || '10:00';
  const closeTime = (await getSetting('store_hours_close')) || '21:30';
  const istMinutes = istNow.getUTCHours() * 60 + istNow.getUTCMinutes();

  // Temporary same-day closure set by the owner in General Settings. While the
  // reopen time hasn't passed yet the store is closed TODAY (not tomorrow).
  const tempReopensAt = (await getSetting('store_temp_close_until')) || '';
  if (tempReopensAt && istMinutes < minutesOf(tempReopensAt)) {
    return {
      success: false,
      error: `${temporaryCloseLabel(tempReopensAt)} — please try again later.`,
    };
  }

  if (istMinutes < minutesOf(openTime) || istMinutes >= minutesOf(closeTime)) {
    return {
      success: false,
      error: `The store is currently closed. We open at ${formatClock(openTime)} — please try again later.`,
    };
  }

  let restaurantId: string;
  try {
    const res = await fetch(`${url}/rest/v1/restaurants?select=id,is_open&deleted_at=is.null&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return { success: false, error: 'Restaurant not available' };
    const rows = await res.json();
    if (rows && rows.length > 0) {
      if (rows[0].is_open === false) {
        return { success: false, error: 'The store is currently closed. Please try again later.' };
      }
      restaurantId = rows[0].id;
    } else {
      // No restaurant exists yet (fresh DB). Create a default one so checkout
      // is never blocked. Mirrors getMerchantRestaurantId auto-create.
      const { data: created, error: createErr } = await supabase
        .from('restaurants')
        .insert({
          owner_id: user?.id ?? '00000000-0000-0000-0000-000000000000',
          name: 'Dilip Da Main',
          slug: `dilip-da-main-${Date.now().toString(36)}`,
          address_line1: 'Near CIT Kokrajhar',
          city: 'Kokrajhar',
          state: 'Assam',
          postal_code: '783370',
          opening_time: '08:00',
          closing_time: '22:00',
          delivery_fee: 20,
          min_order_amount: 50,
          is_active: true,
          is_open: true,
          status: 'active',
        })
        .select('id')
        .maybeSingle();
      if (createErr || !created?.id) {
        console.error('Failed to create default restaurant:', createErr);
        return { success: false, error: 'Restaurant not available' };
      }
      restaurantId = created.id;
    }
  } catch {
    return { success: false, error: 'Restaurant not available' };
  }

  const { items, subtotal, deliveryFee, maintenanceFee, paymentMethod, address, notes, customerPhone, customerName, customerEmail, orderType } = params;

  if (paymentMethod === 'cod' && orderType && orderType !== 'room_delivery') {
    return { success: false, error: 'Pay on Delivery is only available for Hostel Delivery orders' };
  }

  // Take Away orders are picked up from the restaurant — no delivery fee.
  // The server enforces this so the stored order total can never include a
  // delivery charge even if a stale client value slips through.
  const isTakeaway = orderType === 'takeaway';
  const effectiveDeliveryFee = isTakeaway ? 0 : Number(deliveryFee) || 0;
  const effectiveMaintenanceFee = Number(maintenanceFee) || 0;
  const effectiveTotal = Number(subtotal) + effectiveDeliveryFee + effectiveMaintenanceFee;

  const availability = await getPaymentMethodAvailability();
  const avail = availability.find((a) => a.id === paymentMethod);
  const isOnline = ['razorpay', 'phonepe', 'gpay'].includes(paymentMethod);
  if (!avail || !avail.enabled || (isOnline && !avail.configured)) {
    return { success: false, error: 'This payment method is currently unavailable. Please choose another.' };
  }

  const paymentMethodDb =
    paymentMethod === 'bnpl' ? 'bnpl'
    : paymentMethod === 'cod' ? 'cod'
    : paymentMethod === 'phonepe' || paymentMethod === 'gpay' ? 'upi'
    : 'razorpay';

  const isDeliveryOrder = !orderType || orderType === 'room_delivery';
  let slotPayload: Record<string, string | null> = {
    delivery_slot_id: null,
    delivery_slot_label: null,
    delivery_slot_time: null,
    delivery_slot_date: null,
    delivery_slot_cutoff: null,
  };

  if (isDeliveryOrder) {
    const deliveryAvailable = (await getSetting('delivery_available')) !== 'false';
    if (!deliveryAvailable) {
      const msg =
        (await getSetting('delivery_unavailable_message')) ||
        'Delivery is temporarily unavailable because our delivery person is busy. Please try again later.';
      return { success: false, error: msg };
    }

    const fixedSlotsEnabled = (await getSetting('delivery_fixed_slots_enabled')) === 'true';
    if (fixedSlotsEnabled) {
      const { getJsonSetting } = await import('@/lib/settings');
      const { validateDeliverySlotServer, getCurrentISTDateString } = await import('@/features/delivery/lib/slots');
      const slots = await getJsonSetting<any[]>('delivery_slots', []);
      const slotValidation = validateDeliverySlotServer(slots, params.deliverySlotId || '');

      if (!slotValidation.valid || !slotValidation.slot) {
        return {
          success: false,
          error: slotValidation.error || 'Please select a valid, unexpired delivery slot',
        };
      }

      const s = slotValidation.slot;
      slotPayload = {
        delivery_slot_id: s.id,
        delivery_slot_label: s.label,
        delivery_slot_time: s.delivery_time,
        delivery_slot_date: getCurrentISTDateString(),
        delivery_slot_cutoff: s.cutoff_time,
      };
    }
  }

  const orderPayload = {
    user_id: user?.id ?? null,
    restaurant_id: restaurantId,
    status: 'pending',
    payment_status: 'pending',
    payment_method: paymentMethodDb,
    subtotal,
    delivery_fee: effectiveDeliveryFee,
    tax_amount: effectiveMaintenanceFee,
    discount_amount: 0,
    total: effectiveTotal,
    customer_name: customerName || user?.fullName || null,
    customer_email: customerEmail || user?.email || null,
    customer_phone: customerPhone || null,
    delivery_address: orderType === 'room_delivery'
      ? { address, city: params.city ?? '', pincode: params.pincode ?? '' }
      : { address: 'Take away from restaurant' },
    delivery_notes: notes ?? null,
    order_type: orderType ?? null,
    ...slotPayload,
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

  await recordPayment(orderId);
  return { success: true };
}

async function recordPayment(orderId: string) {
  const supabase = createServiceClient();
  if (!supabase) return;

  const { data: order } = await supabase
    .from('orders')
    .select('id, user_id, total, payment_method')
    .eq('id', orderId)
    .maybeSingle();
  if (!order) return;

  const { data: existing } = await supabase
    .from('payments')
    .select('id')
    .eq('order_id', orderId)
    .limit(1)
    .maybeSingle();
  if (existing) return;

  const method = order.payment_method ?? 'razorpay';
  const gateway =
    method === 'bnpl' ? 'bnpl'
    : method === 'cod' ? 'manual'
    : method === 'upi' ? 'upi'
    : 'razorpay';

  await supabase.from('payments').insert({
    order_id: order.id,
    user_id: order.user_id ?? null,
    amount: order.total,
    currency: 'INR',
    payment_method: method,
    gateway,
    status: 'confirmed',
  });
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
