import type { Order } from '@/features/orders/types';

export type AssignmentStatus = 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed';

export interface DeliveryAssignment {
  id: string;
  order_id: string;
  delivery_partner_id: string;
  status: AssignmentStatus;
  assigned_at: string;
  picked_up_at: string | null;
  delivered_at: string | null;
  delivery_notes: string | null;
  customer_rating: number | null;
  qr_token_hash: string | null;
  otp_value: string | null;
  otp_hash: string | null;
  otp_expires_at: string | null;
  otp_verified_at: string | null;
  otp_attempts: number;
}

export interface DeliveryPartnerRow {
  id: string;
  vehicle_type: string;
  license_plate: string | null;
  is_available: boolean;
  is_online: boolean;
  total_deliveries: number;
  rating: number | null;
}

export interface ActiveDelivery {
  assignment: DeliveryAssignment;
  order: Order | null;
}

export interface DeliveredTodayRow {
  assignment: DeliveryAssignment;
  order: Order | null;
}

export interface DeliveryStats {
  count: number;
  value: number;
}

export interface DeliveryHistoryEntry {
  assignment: DeliveryAssignment;
  order: Order | null;
}

export interface DeliveryDashboardData {
  partner: DeliveryPartnerRow;
  active: ActiveDelivery[];
  deliveredToday: DeliveredTodayRow[];
  deliveredTodayCount: number;
  deliveredTodayValue: number;
  stats: {
    today: DeliveryStats;
    week: DeliveryStats;
    total: DeliveryStats;
  };
}
