export type Database = {
  public: {
    Tables: {
      tables: {
        Row: {
          id: string;
          table_number: number;
          status: "AVAILABLE" | "OCCUPIED" | "RESERVED";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          table_number: number;
          status?: "AVAILABLE" | "OCCUPIED" | "RESERVED";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          table_number?: number;
          status?: "AVAILABLE" | "OCCUPIED" | "RESERVED";
          created_at?: string;
          updated_at?: string;
        };
      };
      menu_items: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          category: "COFFEE" | "NON_COFFEE" | "FOOD" | "DESSERT";
          is_available: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price: number;
          category: "COFFEE" | "NON_COFFEE" | "FOOD" | "DESSERT";
          is_available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          category?: "COFFEE" | "NON_COFFEE" | "FOOD" | "DESSERT";
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
          status: "PENDING" | "PAID" | "BREWING" | "READY" | "COMPLETED" | "CANCELLED";
          total_amount: number;
          payment_method: "CASH" | "QRIS" | "TRANSFER" | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          table_id: string;
          customer_name?: string | null;
          status?: "PENDING" | "PAID" | "BREWING" | "READY" | "COMPLETED" | "CANCELLED";
          total_amount: number;
          payment_method?: "CASH" | "QRIS" | "TRANSFER" | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          table_id?: string;
          customer_name?: string | null;
          status?: "PENDING" | "PAID" | "BREWING" | "READY" | "COMPLETED" | "CANCELLED";
          total_amount?: number;
          payment_method?: "CASH" | "QRIS" | "TRANSFER" | null;
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
          subtotal: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          menu_item_id: string;
          quantity: number;
          subtotal: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          menu_item_id?: string;
          quantity?: number;
          subtotal?: number;
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
      sales_recap: {
        Row: {
          order_date: string;
          total_transactions: number;
          gross_revenue: number;
          average_basket_size: number;
        };
      };
    };
    Functions: {
      generate_wifi_voucher: {
        Args: Record<string, never>;
        Returns: unknown;
      };
    };
    Enums: {
      table_status: "AVAILABLE" | "OCCUPIED" | "RESERVED";
      order_status: "PENDING" | "PAID" | "BREWING" | "READY" | "COMPLETED" | "CANCELLED";
      payment_method: "CASH" | "QRIS" | "TRANSFER";
    };
  };
};
