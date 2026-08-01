import { createServiceClient } from '@/infrastructure/supabase/service';
import type { DeliveryAssignment, DeliveryPartnerRow } from '../types';
import type { Order } from '@/features/orders/types';

const ORDER_EMBED = 'orders!delivery_assignments_order_id_fkey(*, order_items(*))';

export const deliveryRepository = {
  async getPartnerByUserId(userId: string) {
    const supabase = createServiceClient();
    if (!supabase) return null;
    const { data } = await supabase
      .from('delivery_partners')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    return data as DeliveryPartnerRow | null;
  },

  async getActiveAssignments(partnerId: string) {
    const supabase = createServiceClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from('delivery_assignments')
      .select(`*, ${ORDER_EMBED}`)
      .eq('delivery_partner_id', partnerId)
      .in('status', ['assigned', 'picked_up', 'in_transit'])
      .order('assigned_at', { ascending: false });
    return (data ?? []) as Array<DeliveryAssignment & { orders: Order | null }>;
  },

  async getDeliveredToday(partnerId: string) {
    const supabase = createServiceClient();
    if (!supabase) return { count: 0, value: 0, rows: [] };
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from('delivery_assignments')
      .select(`*, ${ORDER_EMBED}`)
      .eq('delivery_partner_id', partnerId)
      .eq('status', 'delivered')
      .gte('delivered_at', startOfDay.toISOString())
      .order('delivered_at', { ascending: false })
      .limit(50);
    const rows = (data ?? []) as Array<DeliveryAssignment & { orders: Order | null }>;
    return {
      count: rows.length,
      value: rows.reduce((sum, r) => sum + Number(r.orders?.total ?? 0), 0),
      rows,
    };
  },

  async getAssignmentByOrderId(orderId: string) {
    const supabase = createServiceClient();
    if (!supabase) return null;
    const { data } = await supabase
      .from('delivery_assignments')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();
    return data as DeliveryAssignment | null;
  },

  async getOrderByTrackingCode(trackingCode: string) {
    const supabase = createServiceClient();
    if (!supabase) return null;
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('tracking_code', trackingCode)
      .maybeSingle();
    return data as Order | null;
  },
};
