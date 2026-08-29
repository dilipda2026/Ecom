'use server';

import { createServiceClient } from '@/infrastructure/supabase/service';
import { authorizeAdmin } from '@/features/admin/actions';
import type { CartItem } from '@/features/cart/types';
import type { Product, Category } from '@/features/products/types';

interface InStoreOrderParams {
  items: CartItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount?: number;
  total: number;
  paymentMethod: 'cash' | 'razorpay';
  customerPhone?: string;
  customerName?: string;
  customerEmail?: string;
  notes?: string;
}

export interface InStoreFilter {
  search?: string;
  paymentMethod?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export async function searchCustomerByPhone(phone: string) {
  try {
    await authorizeAdmin();
    const supabase = createServiceClient();
    if (!supabase) return { success: false, error: 'Service client not configured' };

    const cleanPhone = phone.trim().replace(/[^\d+]/g, '');
    if (!cleanPhone || cleanPhone.length < 5) {
      return { success: true, data: null };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, phone, email')
      .or(`phone.eq.${cleanPhone},phone.eq.+91${cleanPhone},phone.ilike.%${cleanPhone}%`)
      .limit(1)
      .maybeSingle();

    if (profile) {
      return {
        success: true,
        data: {
          id: profile.id,
          fullName: profile.full_name,
          phone: profile.phone,
          email: profile.email,
        },
      };
    }

    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Customer search failed' };
  }
}

export async function getInStoreCatalog() {
  try {
    await authorizeAdmin();
    const supabase = createServiceClient();
    if (!supabase) return { success: false, error: 'Service client not configured' };

    const [catRes, prodRes] = await Promise.all([
      supabase.from('categories').select('*').eq('is_active', true).is('deleted_at', null).order('display_order', { ascending: true }),
      supabase.from('products').select('*').eq('is_active', true).eq('is_available', true).is('deleted_at', null).order('name', { ascending: true }),
    ]);

    return {
      success: true,
      data: {
        categories: (catRes.data ?? []) as Category[],
        products: (prodRes.data ?? []) as Product[],
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch catalog' };
  }
}

export async function createInStoreOrder(params: InStoreOrderParams) {
  try {
    const { user: adminUser } = await authorizeAdmin();
    const supabase = createServiceClient();
    if (!supabase) return { success: false, error: 'Service unavailable' };

    const { items, subtotal, taxAmount, discountAmount = 0, total, paymentMethod, customerPhone, customerName, customerEmail, notes } = params;

    if (!items || items.length === 0) {
      return { success: false, error: 'Cannot place order with an empty cart' };
    }

    const finalCustomerPhone = customerPhone?.trim() || null;
    if (finalCustomerPhone && !/^[0-9]{10}$/.test(finalCustomerPhone)) {
      return { success: false, error: 'Phone number must be exactly 10 digits' };
    }

    const finalCustomerName = customerName?.trim() || 'Walk-in Customer';
    const finalCustomerEmail = customerEmail?.trim() || null;

    // Resolve active restaurant
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();

    if (!restaurant) {
      return { success: false, error: 'No active restaurant found' };
    }

    // Lookup existing profile matching phone number to associate user_id if phone provided
    const cleanPhone = finalCustomerPhone ? finalCustomerPhone.replace(/[^\d+]/g, '') : '';
    let matchedUserId: string | null = null;
    if (cleanPhone && cleanPhone.length >= 5) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .or(`phone.eq.${cleanPhone},phone.eq.+91${cleanPhone}`)
        .limit(1)
        .maybeSingle();
      if (profile?.id) matchedUserId = profile.id;
    }

    const isCash = paymentMethod === 'cash';

    const orderPayload = {
      user_id: matchedUserId,
      restaurant_id: restaurant.id,
      status: isCash ? 'accepted' : 'pending',
      payment_status: isCash ? 'confirmed' : 'pending',
      payment_method: isCash ? 'cash' : 'razorpay',
      order_type: 'in_store',
      subtotal,
      delivery_fee: 0,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total,
      customer_name: finalCustomerName,
      customer_phone: finalCustomerPhone,
      customer_email: finalCustomerEmail,
      delivery_address: { address: 'In Store Counter Checkout' },
      delivery_notes: notes?.trim() || 'In Store counter order',
      accepted_at: isCash ? new Date().toISOString() : null,
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderPayload)
      .select('id, tracking_code')
      .single();

    if (orderError || !order) {
      return { success: false, error: orderError?.message || 'Failed to create order' };
    }

    // Prepare line items
    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.id.includes('-') && item.id.length === 36 ? item.id : '00000000-0000-0000-0000-000000000001',
      product_name: item.name,
      product_price: item.price,
      unit_price: item.price,
      quantity: item.quantity,
      subtotal: item.price * item.quantity,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

    if (itemsError) {
      await supabase.from('orders').delete().eq('id', order.id);
      return { success: false, error: 'Failed to save order line items' };
    }

    if (isCash) {
      // Record cash payment
      await supabase.from('payments').insert({
        order_id: order.id,
        user_id: matchedUserId,
        amount: total,
        currency: 'INR',
        payment_method: 'cash',
        gateway: 'manual',
        status: 'confirmed',
      });

      // Audit log
      await supabase.from('audit_logs').insert({
        table_name: 'orders',
        record_id: order.id,
        action: 'create_in_store_order',
        new_data: { total, payment_method: 'cash', tracking_code: order.tracking_code },
        changed_by: adminUser.id,
      });

      // Trigger Telegram notification (NO email sent)
      await sendInStoreNotification(order.id);
    }

    return {
      success: true,
      data: {
        orderId: order.id,
        trackingCode: order.tracking_code,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to place in-store order' };
  }
}

export async function getInStoreOrdersAndStats(filter: InStoreFilter = {}) {
  try {
    await authorizeAdmin();
    const supabase = createServiceClient();
    if (!supabase) return { success: false, error: 'Service client not configured' };

    const today = new Date().toISOString().slice(0, 10);
    const { search, paymentMethod, fromDate, toDate, page = 1, pageSize = 20 } = filter;

    // Fetch stats for in_store orders matching date filter if provided
    let statsQuery = supabase
      .from('orders')
      .select('id, total, payment_method, payment_status, created_at')
      .eq('order_type', 'in_store')
      .is('deleted_at', null);

    if (fromDate) statsQuery = statsQuery.gte('created_at', fromDate);
    if (toDate) statsQuery = statsQuery.lte('created_at', toDate);

    const { data: allInStore } = await statsQuery;

    const rows = allInStore ?? [];

    const totalOrders = rows.length;
    const totalRevenue = rows
      .filter((r) => r.payment_status === 'confirmed')
      .reduce((sum, r) => sum + Number(r.total || 0), 0);

    const todayRevenue = rows
      .filter((r) => r.payment_status === 'confirmed' && r.created_at >= today)
      .reduce((sum, r) => sum + Number(r.total || 0), 0);

    const cashRevenue = rows
      .filter((r) => r.payment_method === 'cash' && r.payment_status === 'confirmed')
      .reduce((sum, r) => sum + Number(r.total || 0), 0);

    const onlineRevenue = rows
      .filter((r) => (r.payment_method === 'razorpay' || r.payment_method === 'upi') && r.payment_status === 'confirmed')
      .reduce((sum, r) => sum + Number(r.total || 0), 0);

    // Query paginated list
    let listQuery = supabase
      .from('orders')
      .select('*, order_items(*)', { count: 'exact' })
      .eq('order_type', 'in_store')
      .is('deleted_at', null);

    if (paymentMethod && paymentMethod !== 'all') {
      listQuery = listQuery.eq('payment_method', paymentMethod);
    }

    if (search) {
      listQuery = listQuery.or(
        `tracking_code.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`
      );
    }

    if (fromDate) listQuery = listQuery.gte('created_at', fromDate);
    if (toDate) listQuery = listQuery.lte('created_at', toDate);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    listQuery = listQuery.order('created_at', { ascending: false }).range(from, to);

    const { data: orderList, count } = await listQuery;

    return {
      success: true,
      data: {
        stats: {
          totalOrders,
          totalRevenue,
          todayRevenue,
          cashRevenue,
          onlineRevenue,
        },
        orders: orderList ?? [],
        total: count ?? 0,
        page,
        pageSize,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch in-store history' };
  }
}

async function sendInStoreNotification(orderId: string) {
  try {
    const supabase = createServiceClient();
    if (!supabase) return;

    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .maybeSingle();

    if (!data) return;

    // Send Telegram notification ONLY. Do NOT send email ("i dont want to sent mail")
    const items = (data.order_items ?? []).map((i: { product_name: string; quantity: number; subtotal: number }) => ({
      name: i.product_name,
      quantity: i.quantity,
      price: Math.round(i.subtotal / i.quantity),
    }));

    const { sendTelegramMessageWithButtons } = await import('@/lib/telegram');
    const { getStatusButtons } = await import('@/lib/notifications');
    const buttons = getStatusButtons(data.id, data.status);
    const msg =
      `<b>🏪 New In-Store Counter Order!</b>\n` +
      `📦 <b>#${data.tracking_code}</b>\n` +
      (data.customer_name ? `👤 ${data.customer_name}\n` : '') +
      (data.customer_phone ? `📞 ${data.customer_phone}\n` : '') +
      `💳 CASH (In Store Counter)\n` +
      `💰 <b>₹${data.total}</b>\n\n` +
      `<b>Items:</b>\n` +
      items.map((i: { name: string; quantity: number; price: number }) => `  • ${i.name} ×${i.quantity} — ₹${i.price * i.quantity}`).join('\n');

    await sendTelegramMessageWithButtons(`${msg}\n\n✅ Accepted`, buttons);
  } catch {}
}
