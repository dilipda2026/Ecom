'use server';

import { adminRepository } from '@/features/admin/repositories';
import { productRepository, categoryRepository } from '@/features/products/repositories';
import { getExpenseSummary } from '@/features/expenses/actions';
import { createServiceClient } from '@/infrastructure/supabase/service';
import { getServerSession } from '@/features/auth/actions';
import { getOwnerEmail } from '@/lib/settings';
import { isOwnerEmail } from '@/config/auth-access';
import type { AdminFilter } from '@/features/admin/types';
import type { ProductsFilter } from '@/features/products/types';
import type { InStoreFilter } from '@/features/orders/actions/in-store';
import type { DateFilterType } from '@/features/expenses/types';

/**
 * Gate for the read-only owner dashboard. Access is decided purely by the
 * owner email configured in General Settings (`dilip_da_email`). Owners must
 * never reach mutating admin actions — that is enforced here (read-only data
 * only) and in admin's `authorizeAdmin` (which rejects the owner email).
 */
export async function authorizeOwner() {
  const { user } = await getServerSession();
  if (!user) throw new Error('Unauthorized');
  if (!isOwnerEmail(user.email, await getOwnerEmail())) throw new Error('Forbidden');
  return { user };
}

export async function getOwnerDashboard() {
  try {
    await authorizeOwner();
    const stats = await adminRepository.getDashboardStats();
    return { success: true, data: stats };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function getOwnerOrders(filter: AdminFilter & { restaurantId?: string }) {
  try {
    await authorizeOwner();
    const data = await adminRepository.getOrders(filter);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function getOwnerInStoreOrdersAndStats(filter: InStoreFilter = {}) {
  try {
    await authorizeOwner();
    const supabase = createServiceClient();
    if (!supabase) return { success: false, error: 'Service client not configured' };

    const today = new Date().toISOString().slice(0, 10);
    const { search, paymentMethod, orderType, fromDate, toDate, page = 1, pageSize = 20 } = filter;

    // Fetch stats for in-store orders
    let statsQuery = supabase
      .from('orders')
      .select('id, total, payment_method, payment_status, created_at, order_type, delivery_address')
      .or('order_type.eq.in_store,delivery_address->>address.ilike.In Store%')
      .is('deleted_at', null);

    if (orderType && orderType !== 'all') {
      statsQuery = statsQuery.eq('order_type', orderType);
    }
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
      .or('order_type.eq.in_store,delivery_address->>address.ilike.In Store%')
      .is('deleted_at', null);

    if (paymentMethod && paymentMethod !== 'all') {
      listQuery = listQuery.eq('payment_method', paymentMethod);
    }
    if (orderType && orderType !== 'all') {
      listQuery = listQuery.eq('order_type', orderType);
    }
    if (search && search.trim()) {
      const clean = search.trim().replace(/[%,\(\)]/g, '');
      if (clean) {
        listQuery = listQuery.or(
          `tracking_code.ilike.%${clean}%,customer_name.ilike.%${clean}%,customer_phone.ilike.%${clean}%`
        );
      }
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
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function getOwnerProducts(filter: ProductsFilter = {}) {
  try {
    await authorizeOwner();
    const supabase = createServiceClient();
    if (!supabase) return { success: false, error: 'Service client not configured', data: [] };

    const { data: restaurant } = await supabase.from('restaurants').select('id').limit(1).maybeSingle();
    if (!restaurant?.id) return { success: true, data: [] };

    const data = await productRepository.findByRestaurant(restaurant.id, filter);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: [] };
  }
}

export async function getOwnerCategories() {
  try {
    await authorizeOwner();
    const supabase = createServiceClient();
    if (!supabase) return { success: false, error: 'Service client not configured', data: [] };

    const { data: restaurant } = await supabase.from('restaurants').select('id').limit(1).maybeSingle();
    if (!restaurant?.id) return { success: true, data: [] };

    const data = await categoryRepository.findByRestaurant(restaurant.id, true);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: [] };
  }
}

export async function getOwnerExpenseSummary(
  filter: DateFilterType = 'all',
  customStart?: string,
  customEnd?: string,
) {
  try {
    await authorizeOwner();
    return await getExpenseSummary(filter, customStart, customEnd);
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function getOwnerPayments(filter: AdminFilter) {
  try {
    await authorizeOwner();
    const data = await adminRepository.getPayments(filter);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}

export async function getOwnerDeliveryPartners(filter: AdminFilter) {
  try {
    await authorizeOwner();
    const data = await adminRepository.getDeliveryPartners(filter);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message, data: null };
  }
}