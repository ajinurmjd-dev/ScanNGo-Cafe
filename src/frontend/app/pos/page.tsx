"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
type TableRecord = Database["public"]["Tables"]["tables"]["Row"];
type WifiVoucher = Database["public"]["Tables"]["wifi_vouchers"]["Row"];

interface OrderWithDetails extends Order {
  items: (OrderItem & { menu_item: MenuItem })[];
  table: TableRecord | null;
  voucher: WifiVoucher | null;
}

export default function POSPage() {
  const [pendingOrders, setPendingOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucher, setVoucher] = useState<WifiVoucher | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QRIS' | 'TRANSFER'>('CASH');

  // Initialize Supabase realtime subscription
  useEffect(() => {
    if (!supabase) {
      console.error("Supabase not initialized");
      setLoading(false);
      return;
    }

    // First, fetch existing pending orders
    const fetchPendingOrders = async () => {
      try {
        const { data: orders, error } = await supabase!
          .from("orders")
          .select(
            `*,
            table:tables(*),
            order_items(*, menu_item:menu_items(*))
          `)
          .eq("status", "PENDING")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching pending orders:", error);
          return;
        }

        const ordersWithDetails: OrderWithDetails[] = (orders || []).map((order: any) => {
          const items = order.order_items || [];
          // Remove the nested order_items from the final object to avoid duplication
          delete (order as any).order_items;

          return {
            ...order,
            items: items,
            table: order.table,
            voucher: null
          };
        });

        setPendingOrders(ordersWithDetails);
      } catch (err) {
        console.error("Exception in fetchPendingOrders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingOrders();

    // Set up realtime subscription for pending orders
    const channel = supabase!
      .channel("orders_pos")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `status=eq.PENDING`
        },
        async (payload: any) => {
          console.log("Realtime update:", payload);
          
          if (payload.eventType === "INSERT") {
            // New pending order added
            const { data: order, error: orderError } = await supabase!
              .from("orders")
              .select(
                `*,
                table:tables(*),
                order_items(*, menu_item:menu_items(*))
              `)
              .eq("id", payload.new.id)
              .single();

            if (orderError) {
              console.error("Error fetching new order:", orderError);
              return;
            }

            const newOrder: OrderWithDetails = {
              ...order,
              items: order.order_items || [],
              table: order.table,
              voucher: null
            };
            delete (newOrder as any).order_items;

            setPendingOrders(prev => [newOrder, ...prev]);

          } else if (payload.eventType === "UPDATE") {
            // Order status changed
            if (payload.new.status !== 'PENDING') {
              // Order moved out of pending list
              setPendingOrders(prev => 
                prev.filter(order => order.id !== payload.old.id)
              );
            }

            // If the order is being updated to PAID, we might want to refresh its details
            if (payload.new.status === 'PAID') {
              const { data: updatedOrder, error: orderError } = await supabase!
                .from("orders")
                .select(
                  `*,
                  table:tables(*),
                  order_items(*, menu_item:menu_items(*))
                `)
                .eq("id", payload.new.id)
                .single();

              if (!orderError && updatedOrder) {
                const updatedOrderWithDetails: OrderWithDetails = {
                  ...updatedOrder,
                  items: updatedOrder.order_items || [],
                  table: updatedOrder.table,
                  voucher: null
                };
                delete (updatedOrderWithDetails as any).order_items;

                setPendingOrders(prev => 
                  prev.map(order => 
                    order.id === payload.new.id ? updatedOrderWithDetails : order
                  )
                );
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase!.removeChannel(channel);
    };
  }, []);

  const confirmPayment = async () => {
    if (!selectedOrder || isUpdating) return;

    setIsUpdating(true);
    
    try {
      // Update order status to PAID
      const { data: updatedOrder, error: orderError } = await supabase!
        .from("orders")
        .update({
          status: "PAID",
          payment_method: paymentMethod,
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedOrder.id)
        .select(
          `*,
          table:tables(*),
          order_items(*, menu_item:menu_items(*))
        `)
        .single();

      if (orderError) {
        console.error("Error updating order:", orderError);
        alert("Gagal mengonfirmasi pembayaran");
        setIsUpdating(false);
        return;
      }

      // Fetch latest voucher for this order (created by trigger)
      const { data: vouchers, error: voucherError } = await supabase!
        .from("wifi_vouchers")
        .select("*")
        .eq("order_id", selectedOrder.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (voucherError) {
        console.error("Error fetching voucher:", voucherError);
      }

      const latestVoucher = vouchers && vouchers.length > 0 ? vouchers[0] : null;

      if (latestVoucher) {
        setVoucher(latestVoucher);
        setShowVoucherModal(true);
      }

      // Update the order in the local state
      const updatedOrderWithDetails: OrderWithDetails = {
        ...updatedOrder,
        items: updatedOrder.order_items || [],
        table: updatedOrder.table,
        voucher: latestVoucher
      };
      delete (updatedOrderWithDetails as any).order_items;

      setPendingOrders(prev => 
        prev.map(order => 
          order.id === selectedOrder.id ? updatedOrderWithDetails : order
        )
      );

      // Reset form
      setSelectedOrder(null);
      setPaymentMethod('CASH');

    } catch (err) {
      console.error("Exception in confirmPayment:", err);
      alert("Terjadi kesalahan saat mengonfirmasi pembayaran");
    } finally {
      setIsUpdating(false);
    }
  };

  const closeModal = async () => {
    setShowVoucherModal(false);
    setVoucher(null);
    setSelectedOrder(null);
    setPaymentMethod('CASH');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      "COFFEE": "☕",
      "NON_COFFEE": "🍵",
      "FOOD": "🍔",
      "DESSERT": "🍰",
      "default": "🥤"
    };
    return icons[category] || icons.default;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top- Matplotlib>0
      z-10">
        <div className="max-w-md mx-auto p-4">
          <h1 className="text-2xl font-bold text-gray-900">🏪 Kasir ScanNGo Cafe</h1>
          <p className="text-sm text-gray-600">Manajemen Antrean Realtime</p>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 pb-20">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            <p className="mt-2 text-gray-500">Memuat antrean...</p>
          </div>
        ) : pendingOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak Ada Antrean</h3>
            <p className="text-gray-500">Tidak ada pesanan PENDING saat ini.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingOrders.map((order) => (
              <div
                key={order.id}
                className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${
                  order.status === 'PENDING' ? 'border-yellow-400' : 'border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Meja {order.table?.table_number || 'T'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {order.customer_name || 'Pelanggan'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(order.created_at).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      order.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                    >
                      {order.status}
                    </span>
                    <p className="text-lg font-bold mt-1">
                      {formatCurrency(order.total_amount)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <span>
                        {item.quantity}x {item.menu_item.name} {getCategoryIcon(item.menu_item.category)}
                      </span>
                      <span className="text-gray-600">
                        {formatCurrency(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>

                {order.status === 'PENDING' && (
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                  >
                    Konfirmasi Pembayaran
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Payment Confirmation Modal */}
      {selectedOrder && !showVoucherModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Konfirmasi Pembayaran</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600">Meja {selectedOrder.table?.table_number}</p>
              <p className="text-sm text-gray-600">Pelanggan: {selectedOrder.customer_name || 'Tidak diketahui'}</p>
              <p className="text-lg font-semibold">
                Total: {formatCurrency(selectedOrder.total_amount)}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Metode Pembayaran
              </label>
              <div className="space-y-2">
                {(['CASH', 'QRIS'] as const).map((method) => (
                  <label key={method} className="flex items-center">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method}
                      checked={paymentMethod === method}
                      onChange={() => setPaymentMethod(method)}
                      className="mr-2"
                    />
                    <span>{method === 'CASH' ? '💵 Tunai' : '📱 QRIS'}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isUpdating}
              >
                Batal
              </button>
              <button
                onClick={confirmPayment}
                className="flex-1 py-2 px-4 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:bg-gray-400"
                disabled={isUpdating}
              >
                {isUpdating ? 'Memproses...' : 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voucher Modal */}
      {showVoucherModal && voucher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🎫</div>
              <h2 className="text-xl font-bold text-gray-900">Voucher Wi-Fi Anda</h2>
              <p className="text-sm text-gray-600 mt-1">ScanNGo Cafe</p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
              <div className="text-center">
                <p className="text-xs text-emerald-600 mb-1">KODE VOUCHER</p>
                <p className="text-2xl font-mono font-bold text-emerald-700 tracking-wider">
                  {voucher.voucher_code}
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Masa aktif:</span>
                <span className="font-medium">120 menit</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Jumlah data:</span>
                <span className="font-medium">120 MB</span>
              </div>
              <div className="text-sm text-gray-600 mt-3">
                <p>Berikan kode ini ke pelanggan untuk menghubungkan ke Wi-Fi cafe.</p>
              </div>
            </div>

            <button
              onClick={closeModal}
              className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}