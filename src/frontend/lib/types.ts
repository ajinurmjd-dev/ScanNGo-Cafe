// Database types generated from 001-create-tables.sql

export type TableName = 'tables' | 'menu_items' | 'orders' | 'order_items' | 'wifi_vouchers';

// Tables
export interface Table {
  id: string;
  table_number: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
  created_at: string;
  updated_at: string;
}

export type TableStatus = Table['status'];

// Menu Items
export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: 'COFFEE' | 'NON_COFFEE' | 'FOOD' | 'DESSERT';
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export type MenuItemCategory = MenuItem['category'];

// Orders
export interface Order {
  id: string;
  table_id: string;
  customer_name: string | null;
  status: OrderStatus;
  total_amount: number;
  payment_method: 'CASH' | 'QRIS' | 'TRANSFER' | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderStatus =
  | 'PENDING' // belum bayar
  | 'PAID' // sudah bayar
  | 'BREWING' // sedang bikin
  | 'READY' // siap diambil
  | 'COMPLETED' // selesai
  | 'CANCELLED';

// Order Items
export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  subtotal: number;
  notes: string | null;
  created_at: string;
}

// Wifi Vouchers
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
