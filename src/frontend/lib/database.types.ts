import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase URL and Anon Key are not set. Please check your .env.local file."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      tables: {
        Row: {
          id: string;
          table_number: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          table_number: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          table_number?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      menu_items: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: string;
          category: string;
          is_available: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price: string;
          category: string;
          is_available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          price?: string;
          category?: string;
          is_available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          table_id: string;
          customer_name: string | null;
          status: string;
          total_amount: string;
          payment_method: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          table_id: string;
          customer_name?: string | null;
          status?: string;
          total_amount: string;
          payment_method?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          table_id?: string;
          customer_name?: string | null;
          status?: string;
          total_amount?: string;
          payment_method?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string;
          quantity: number;
          subtotal: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          menu_item_id: string;
          quantity: number;
          subtotal: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          menu_item_id?: string;
          quantity?: number;
          subtotal?: string;
          notes?: string | null;
          created_at?: string;
        };
      };
      wifi_vouchers: {
        Row: {
          id: string;
          order_id: string;
          voucher_code: string;
          duration_minutes: number;
          is_redeemed: boolean;
          redeemed_at: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          voucher_code: string;
          duration_minutes?: number;
          is_redeemed?: boolean;
          redeemed_at?: string | null;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          voucher_code?: string;
          duration_minutes?: number;
          is_redeemed?: boolean;
          redeemed_at?: string | null;
          expires_at?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      sales_recap_daily: {
        Row: {
          order_date: string | null;
          total_transactions: number | null;
          gross_revenue: string;
          average_basket_size: string;
          unique_tables: number | null;
        };
      };
      sales_recap_weekly: {
        Row: {
          week_start: string | null;
          total_transactions: number | null;
          gross_revenue: string;
          average_basket_size: string;
          unique_tables: number | null;
        };
      };
      sales_recap_monthly: {
        Row: {
          month_start: string | null;
          total_transactions: number | null;
          gross_revenue: string;
          average_basket_size: string;
          unique_tables: number | null;
        };
      };
      sales_by_category: {
        Row: {
          order_date: string | null;
          category: string | null;
          items_sold: number | null;
          category_revenue: string;
        };
      };
      kitchen_queue: {
        Row: {
          id: string | null;
          table_number: number | null;
          order_time: string | null;
          wait_minutes: number | null;
          items_list: string | null;
          status: string | null;
        };
      };
    };
    Functions: {
      generate_wifi_voucher: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      update_table_status: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
    Enums: {
      order_status: "PENDING" | "PAID" | "BREWING" | "READY" | "COMPLETED" | "CANCELLED";
      table_status: "AVAILABLE" | "OCCUPIED" | "RESERVED";
      payment_method: "CASH" | "QRIS" | "TRANSFER";
      menu_category: "COFFEE" | "NON_COFFEE" | "FOOD" | "DESSERT";
    };
  };
};
