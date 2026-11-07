"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { OrderStatus } from "@/lib/types";
import type { Database } from "@/types/database";

interface KitchenQueueItem {
  id: string;
  table_number: number;
  order_time: string;
  wait_minutes: number;
  items_list: string;
  status: OrderStatus;
}

export default function KDSPage() {
  if (!supabase) {
    throw new Error('Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  const [queue, setQueue] = useState<KitchenQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial data from kitchen_queue view
  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const { data, error } = await supabase!
          .from("kitchen_queue")
          .select("*")
          .order("status", { ascending: true })
          .order("order_time", { ascending: true });

        if (error) {
          console.error("Error fetching kitchen queue:", error);
          return;
        }

        setQueue(data as KitchenQueueItem[]);
      } catch (err) {
        console.error("Exception in fetchQueue:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchQueue();

    // Set up realtime subscription for PAID and BREWING orders
    const channel = supabase!
      .channel("kds_orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload: any) => {
        // eslint-disable-next-line no-console
        console.log("KDS Realtime update:", payload.eventType, payload.new.id);
        fetchQueue();
      })
      .subscribe();

    return () => {
      supabase!.removeChannel(channel);
    };
  }, []);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase!
        .from("orders")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId);

      if (error) {
        console.error("Error updating status:", error);
        toast.error(`Gagal update status ke ${newStatus}`);
        return;
      }
    } catch (err) {
      console.error("Exception in updateStatus:", err);
      toast.error("Terjadi kesalahan");
    }
  };

  const formatTime = (timeStr: string) => {
    return new Date(timeStr).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: OrderStatus) => {
    const colors: Record<OrderStatus, string> = {
      PENDING: 'border-gray-300 bg-gray-50',
      PAID: 'border-yellow-400 bg-yellow-50',
      BREWING: 'border-orange-400 bg-orange-50',
      READY: 'border-green-400 bg-green-50',
      COMPLETED: 'border-gray-300 bg-gray-50 opacity-75',
      CANCELLED: 'border-red-400 bg-red-50'
    };
    return colors[status];
  };

  const getStatusBadge = (status: OrderStatus) => {
    const badges: Record<OrderStatus, {text: string, bg: string}> = {
      PENDING: { text: 'PENDING', bg: 'bg-gray-100 text-gray-800' },
      PAID: { text: 'PAID', bg: 'bg-yellow-100 text-yellow-800' },
      BREWING: { text: 'BREWING', bg: 'bg-orange-100 text-orange-800' },
      READY: { text: 'READY', bg: 'bg-green-100 text-green-800' },
      COMPLETED: { text: 'SELESAI', bg: 'bg-gray-200 text-gray-700' },
      CANCELLED: { text: 'CANCELLED', bg: 'bg-red-100 text-red-800' }
    };
    return badges[status];
  };

  const getNextAction = (status: OrderStatus) => {
    const actions: Record<OrderStatus, {label: string, next: OrderStatus}> = {
      PENDING: { label: 'Bayar', next: 'PAID' },
      PAID: { label: 'Mulai Buat', next: 'BREWING' },
      BREWING: { label: 'Siap Saji', next: 'READY' },
      READY: { label: 'Selesai Diambil', next: 'COMPLETED' },
      COMPLETED: { label: 'Selesai', next: 'COMPLETED' },
      CANCELLED: { label: 'Batal', next: 'CANCELLED' }
    };
    return actions[status];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">🏪 Kitchen Display System</h1>
          <div className="flex gap-2">
            <a
              href="/pos"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              ← Kasir
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            <p className="mt-4 text-gray-500 text-lg">Memuat antrean dapur...</p>
          </div>
        ) : queue.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300">
            <div className="text-6xl mb-4">🍳</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Dapur Kosong</h3>
            <p className="text-gray-500 text-lg">Tidak ada pesanan yang sedang diproses.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {queue.map((order) => {
              const statusBadge = getStatusBadge(order.status);
              const nextAction = getNextAction(order.status);
              
              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-xl shadow-sm p-5 border-l-8 ${getStatusColor(order.status)}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        Meja {order.table_number}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-500">⏳ {order.wait_minutes} menit</span>
                        <span className="text-xs text-gray-400">• {formatTime(order.order_time)}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusBadge.bg}`}>
                      {statusBadge.text}
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Pesanan:</p>
                    <p className="text-sm text-gray-900 leading-relaxed">
                      {order.items_list}
                    </p>
                  </div>

                  {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                    <button
                      onClick={() => updateStatus(order.id, nextAction.next)}
                      className={`w-full py-3 px-4 rounded-lg font-bold text-lg transition-colors ${
                        order.status === 'PAID' ? 'bg-orange-600 hover:bg-orange-700 text-white' :
                        order.status === 'BREWING' ? 'bg-green-600 hover:bg-green-700 text-white' :
                        'bg-gray-400 cursor-not-allowed'
                      }`}
                      disabled={(order.status as string) === 'COMPLETED' || (order.status as string) === 'CANCELLED'}
                    >
                      {nextAction.label}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
