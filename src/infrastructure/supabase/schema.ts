// Auto-generated from Supabase PostgreSQL schema

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface activityLogs {
  id: string;
  user_id: string;
  action: string;
  resource?: string | null;
  resource_id?: string | null;
  metadata?: Json | null;
  ip_address?: string | null;
  created_at: string;
}

export interface addresses {
  id: string;
  user_id: string;
  label: string;
  full_address: string;
  city: string;
  state: string;
  postal_code: string;
  latitude?: number | null;
  longitude?: number | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface analytics {
  id: string;
  restaurant_id?: string | null;
  date: string;
  metric: string;
  value: number;
  dimensions?: Json | null;
  created_at: string;
  updated_at: string;
}

export interface auditLogs {
  id: string;
  table_name: string;
  record_id?: string | null;
  action: string;
  old_data?: Json | null;
  new_data?: Json | null;
  changed_by?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export interface categories {
  id: string;
  restaurant_id: string;
  name: string;
  slug: string;
  description?: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface creditAccounts {
  id: string;
  user_id: string;
  credit_limit: number;
  available_credit: number;
  outstanding: number;
  status: string;
  verification_status: string;
  credit_score?: number | null;
  interest_rate: number;
  late_fee_rate: number;
  due_days: number;
  last_repayment_at?: string | null;
  activated_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface creditRepayments {
  id: string;
  credit_account_id: string;
  transaction_id?: string | null;
  amount: number;
  due_date: string;
  paid_at?: string | null;
  late_fee_applied: number;
  status: string;
  payment_method?: string | null;
  gateway_payment_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface creditTransactions {
  id: string;
  credit_account_id: string;
  order_id?: string | null;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description?: string | null;
  reference?: string | null;
  created_at: string;
}

export interface deliveryAssignments {
  id: string;
  order_id: string;
  delivery_partner_id: string;
  status: string;
  assigned_at: string;
  picked_up_at?: string | null;
  delivered_at?: string | null;
  delivery_notes?: string | null;
  customer_rating?: number | null;
  created_at: string;
}

export interface deliveryPartners {
  id: string;
  restaurant_id?: string | null;
  vehicle_type?: string | null;
  license_plate?: string | null;
  is_available: boolean;
  is_online: boolean;
  current_latitude?: number | null;
  current_longitude?: number | null;
  total_deliveries: number;
  rating?: number | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface inventoryLogs {
  id: string;
  product_id: string;
  change: number;
  reason: string;
  reference?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface notifications {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body?: string | null;
  data?: Json | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface orderItems {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
  special_instructions?: string | null;
  created_at: string;
}

export interface orders {
  id: string;
  tracking_code: string;
  user_id?: string | null;
  restaurant_id: string;
  delivery_address_id?: string | null;
  delivery_partner_id?: string | null;
  status: string;
  status_history?: Json[] | null;
  subtotal: number;
  delivery_fee: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  delivery_address?: Json | null;
  delivery_notes?: string | null;
  payment_method?: string | null;
  payment_status: string;
  order_type?: string | null;
  scheduled_at?: string | null;
  accepted_at?: string | null;
  prepared_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface paymentLogs {
  id: string;
  payment_id?: string | null;
  event: string;
  payload?: Json | null;
  ip_address?: string | null;
  created_at: string;
}

export interface payments {
  id: string;
  order_id: string;
  user_id?: string | null;
  amount: number;
  currency: string;
  payment_method: string;
  gateway: string;
  gateway_order_id?: string | null;
  gateway_payment_id?: string | null;
  gateway_signature?: string | null;
  status: string;
  failure_reason?: string | null;
  refund_amount?: number | null;
  metadata?: Json | null;
  created_at: string;
  updated_at: string;
}

export interface productImages {
  id: string;
  product_id: string;
  url: string;
  alt_text?: string | null;
  sort_order: number;
  created_at: string;
}

export interface products {
  id: string;
  restaurant_id: string;
  category_id?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  compare_at_price?: number | null;
  cost_per_unit?: number | null;
  unit: string;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  spice_level: number;
  preparation_time: number;
  image?: string | null;
  is_active: boolean;
  is_available: boolean;
  stock_quantity: number;
  track_inventory: boolean;
  sort_order: number;
  tags?: Json[] | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface profiles {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ratings {
  id: string;
  restaurant_id: string;
  user_id: string;
  order_id?: string | null;
  food_rating?: number | null;
  delivery_rating?: number | null;
  overall_rating: number;
  body?: string | null;
  created_at: string;
  updated_at: string;
}

export interface reports {
  id: string;
  restaurant_id?: string | null;
  generated_by: string;
  type: string;
  date_range_from: string;
  date_range_to: string;
  config?: Json | null;
  data?: Json | null;
  status: string;
  file_url?: string | null;
  created_at: string;
}

export interface restaurantSettings {
  id: string;
  restaurant_id: string;
  prep_time_minutes: number;
  max_orders_slot: number;
  allow_preorder: boolean;
  allow_scheduled: boolean;
  gst_number?: string | null;
  fssai_license?: string | null;
  bank_account?: string | null;
  upi_id?: string | null;
  commission_rate: number;
  created_at: string;
  updated_at: string;
}

export interface restaurants {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description?: string | null;
  cuisine_type?: string | null;
  phone?: string | null;
  email?: string | null;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  latitude?: number | null;
  longitude?: number | null;
  cover_image?: string | null;
  logo_url?: string | null;
  opening_time: string;
  closing_time: string;
  delivery_fee: number;
  min_order_amount: number;
  delivery_radius_km?: number | null;
  is_active: boolean;
  is_open: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface reviews {
  id: string;
  product_id: string;
  user_id: string;
  order_id?: string | null;
  rating: number;
  title?: string | null;
  body?: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

type TablesInsert<T> = {
  [K in keyof T]?: T[K] extends Json[] ? Json[] : T[K] extends Json | null ? Json | null : T[K];
};

export interface Database {
  public: {
    Tables: {
      activity_logs: { Row: activityLogs; Insert: TablesInsert<activityLogs>; Update: Partial<activityLogs>; };
      addresses: { Row: addresses; Insert: TablesInsert<addresses>; Update: Partial<addresses>; };
      analytics: { Row: analytics; Insert: TablesInsert<analytics>; Update: Partial<analytics>; };
      audit_logs: { Row: auditLogs; Insert: TablesInsert<auditLogs>; Update: Partial<auditLogs>; };
      categories: { Row: categories; Insert: TablesInsert<categories>; Update: Partial<categories>; };
      credit_accounts: { Row: creditAccounts; Insert: TablesInsert<creditAccounts>; Update: Partial<creditAccounts>; };
      credit_repayments: { Row: creditRepayments; Insert: TablesInsert<creditRepayments>; Update: Partial<creditRepayments>; };
      credit_transactions: { Row: creditTransactions; Insert: TablesInsert<creditTransactions>; Update: Partial<creditTransactions>; };
      delivery_assignments: { Row: deliveryAssignments; Insert: TablesInsert<deliveryAssignments>; Update: Partial<deliveryAssignments>; };
      delivery_partners: { Row: deliveryPartners; Insert: TablesInsert<deliveryPartners>; Update: Partial<deliveryPartners>; };
      inventory_logs: { Row: inventoryLogs; Insert: TablesInsert<inventoryLogs>; Update: Partial<inventoryLogs>; };
      notifications: { Row: notifications; Insert: TablesInsert<notifications>; Update: Partial<notifications>; };
      order_items: { Row: orderItems; Insert: TablesInsert<orderItems>; Update: Partial<orderItems>; };
      orders: { Row: orders; Insert: TablesInsert<orders>; Update: Partial<orders>; };
      payment_logs: { Row: paymentLogs; Insert: TablesInsert<paymentLogs>; Update: Partial<paymentLogs>; };
      payments: { Row: payments; Insert: TablesInsert<payments>; Update: Partial<payments>; };
      product_images: { Row: productImages; Insert: TablesInsert<productImages>; Update: Partial<productImages>; };
      products: { Row: products; Insert: TablesInsert<products>; Update: Partial<products>; };
      profiles: { Row: profiles; Insert: TablesInsert<profiles>; Update: Partial<profiles>; };
      ratings: { Row: ratings; Insert: TablesInsert<ratings>; Update: Partial<ratings>; };
      reports: { Row: reports; Insert: TablesInsert<reports>; Update: Partial<reports>; };
      restaurant_settings: { Row: restaurantSettings; Insert: TablesInsert<restaurantSettings>; Update: Partial<restaurantSettings>; };
      restaurants: { Row: restaurants; Insert: TablesInsert<restaurants>; Update: Partial<restaurants>; };
      reviews: { Row: reviews; Insert: TablesInsert<reviews>; Update: Partial<reviews>; };
    };
    Views: Record<string, never>;
    Functions: {
      get_order_by_tracking: {
        Args: { lookup_code: string };
        Returns: Record<string, unknown>[];
      };
      initialize_credit_account: {
        Args: { p_user_id: string; p_credit_limit?: number };
        Returns: Record<string, unknown>;
      };
      process_repayment: {
        Args: { p_repayment_id: string; p_gateway_payment_id?: string };
        Returns: void;
      };
      get_merchant_dashboard: {
        Args: { p_restaurant_id: string };
        Returns: Record<string, unknown>;
      };
    };
    Enums: Record<string, never>;
  };
}
