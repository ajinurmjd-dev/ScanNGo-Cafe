// ============================================================================
// Database Types - Generated from src/db/*.sql
// ============================================================================

// Table status enum
export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';

// Order status enum
export type OrderStatus = 'PENDING' | 'PAID' | 'BREWING' | 'READY' | 'COMPLETED' | 'CANCELLED';

// Menu category enum
export type MenuCategory = 'COFFEE' | 'NON_COFFEE' | 'FOOD' | 'DESSERT';

// Payment method enum
export type PaymentMethod = 'CASH' | 'QRIS' | 'TRANSFER';

// ============================================================================
// Tables
// ============================================================================
export interface Table {
  id: string;
  table_number: number;
  status: TableStatus;
  created_at: string;
  updated_at: string;
}

export interface TableInsert {
  id?: string;
  table_number: number;
  status?: TableStatus;
  created_at?: string;
  updated_at?: string;
}

export interface TableUpdate {
  table_number?: number;
  status?: TableStatus;
  updated_at?: string;
}

// ============================================================================
// Menu Items
// ============================================================================
export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: MenuCategory;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuItemInsert {
  id?: string;
  name: string;
  description?: string | null;
  price: number;
  category: MenuCategory;
  is_available?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MenuItemUpdate {
  name?: string;
  description?: string | null;
  price?: number;
  category?: MenuCategory;
  is_available?: boolean;
  updated_at?: string;
}

// ============================================================================
// Orders
// ============================================================================
export interface Order {
  id: string;
  table_id: string;
  customer_name: string | null;
  status: OrderStatus;
  total_amount: number;
  payment_method: PaymentMethod | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderInsert {
  id?: string;
  table_id: string;
  customer_name?: string | null;
  status?: OrderStatus;
  total_amount: number;
  payment_method?: PaymentMethod | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OrderUpdate {
  table_id?: string;
  customer_name?: string | null;
  status?: OrderStatus;
  total_amount?: number;
  payment_method?: PaymentMethod | null;
  notes?: string | null;
  updated_at?: string;
}

// ============================================================================
// Order Items
// ============================================================================
export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  subtotal: number;
  notes: string | null;
  created_at: string;
}

export interface OrderItemInsert {
  id?: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  subtotal: number;
  notes?: string | null;
  created_at?: string;
}

export interface OrderItemUpdate {
  order_id?: string;
  menu_item_id?: string;
  quantity?: number;
  subtotal?: number;
  notes?: string | null;
}

// ============================================================================
// WiFi Vouchers
// ============================================================================
export interface WifiVoucher {
  id: string;
  order_id: string;
  voucher_code: string;
  duration_minutes: number;
  is_redeemed: boolean;
  redeemed_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface WifiVoucherInsert {
  id?: string;
  order_id: string;
  voucher_code: string;
  duration_minutes?: number;
  is_redeemed?: boolean;
  redeemed_at?: string | null;
  expires_at: string;
  created_at?: string;
}

export interface WifiVoucherUpdate {
  order_id?: string;
  voucher_code?: string;
  duration_minutes?: number;
  is_redeemed?: boolean;
  redeemed_at?: string | null;
  expires_at?: string;
}

// ============================================================================
// Views (Read-only)
// ============================================================================
export interface SalesRecapDaily {
  order_date: string;
  total_transactions: number;
  gross_revenue: number;
  average_basket_size: number;
  unique_tables: number;
}

export interface KitchenQueue {
  id: string;
  table_number: number;
  order_time: string;
  wait_minutes: number;
  items_list: string;
  status: OrderStatus;
}

// ============================================================================
// Database Schema Type
// ============================================================================
export interface Database {
  public: {
    Tables: {
      tables: {
        Row: Table;
        Insert: TableInsert;
        Update: TableUpdate;
      };
      menu_items: {
        Row: MenuItem;
        Insert: MenuItemInsert;
        Update: MenuItemUpdate;
      };
      orders: {
        Row: Order;
        Insert: OrderInsert;
        Update: OrderUpdate;
      };
      order_items: {
        Row: OrderItem;
        Insert: OrderItemInsert;
        Update: OrderItemUpdate;
      };
      wifi_vouchers: {
        Row: WifiVoucher;
        Insert: WifiVoucherInsert;
        Update: WifiVoucherUpdate;
      };
    };
    Views: {
      sales_recap_daily: {
        Row: SalesRecapDaily;
      };
      kitchen_queue: {
        Row: KitchenQueue;
      };
    };
  };
}
