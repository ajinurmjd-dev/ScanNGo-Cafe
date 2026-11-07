'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { OrderStatus } from '@/lib/types';

interface KitchenQueueItem {
  id: string;
  table_number: number;
  created_at: string;
  wait_minutes: number;
  items_list: string;
  status: OrderStatus;
}

export default function KDSPage() {
  if (!supabase) {
    throw new Error(
      'Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  const [queue, setQueue] = useState<KitchenQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial data from kitchen_queue view
  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const { data, error } = await supabase!
          .from('kitchen_queue')
          .select('*')
          .order('status', { ascending: true })
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching kitchen queue:', error);
          return;
        }

        setQueue(data as KitchenQueueItem[]);
      } catch (err) {
        console.error('Exception in fetchQueue:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQueue();

    // Set up realtime subscription for PAID and BREWING orders
    const channel = supabase!
      .channel('kds_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload: any) => {
        // eslint-disable-next-line no-console
        console.log('KDS Realtime update:', payload.eventType, payload.new.id);
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
        .from('orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating status:', error);
        toast.error(`Gagal update status ke ${newStatus}`);
        return;
      }
    } catch (err) {
      console.error('Exception in updateStatus:', err);
      toast.error('Terjadi kesalahan');
    }
  };

  const formatTime = (timeStr: string) => {
    return new Date(timeStr).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: OrderStatus) => {
    const colors: Record<OrderStatus, string> = {
      PENDING: 'border-gray-300 bg-gray-50',
      PAID: 'border-yellow-400 bg-yellow-50',
      BREWING: 'border-orange-400 bg-orange-50',
      READY: 'border-green-400 bg-green-50',
      COMPLETED: 'border-gray-300 bg-gray-50 opacity-75',
      CANCELLED: 'border-red-400 bg-red-50',
    };
    return colors[status];
  };

  const getStatusBadge = (status: OrderStatus) => {
    const badges: Record<OrderStatus, { text: string; bg: string }> = {
      PENDING: { text: 'PENDING', bg: 'bg-gray-100 text-gray-800' },
      PAID: { text: 'PAID', bg: 'bg-yellow-100 text-yellow-800' },
      BREWING: { text: 'BREWING', bg: 'bg-orange-100 text-orange-800' },
      READY: { text: 'READY', bg: 'bg-green-100 text-green-800' },
      COMPLETED: { text: 'SELESAI', bg: 'bg-gray-200 text-gray-700' },
      CANCELLED: { text: 'CANCELLED', bg: 'bg-red-100 text-red-800' },
    };
    return badges[status];
  };

  const getNextAction = (status: OrderStatus) => {
    const actions: Record<OrderStatus, { label: string; next: OrderStatus }> = {
      PENDING: { label: 'Bayar', next: 'PAID' },
      PAID: { label: 'Mulai Buat', next: 'BREWING' },
      BREWING: { label: 'Siap Saji', next: 'READY' },
      READY: { label: 'Selesai Diambil', next: 'COMPLETED' },
      COMPLETED: { label: 'Selesai', next: 'COMPLETED' },
      CANCELLED: { label: 'Batal', next: 'CANCELLED' },
    };
    return actions[status];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <h1 className="text-2xl font-bold text-gray-900">🏪 Kitchen Display System</h1>
          <div className="flex gap-2">
            <a
              href="/pos"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              ← Kasir
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4">
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600"></div>
            <p className="mt-4 text-lg text-gray-500">Memuat antrean dapur...</p>
          </div>
        ) : queue.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white py-24 text-center shadow-sm">
            <div className="mb-4 text-6xl">🍳</div>
            <h3 className="mb-2 text-2xl font-bold text-gray-900">Dapur Kosong</h3>
            <p className="text-lg text-gray-500">Tidak ada pesanan yang sedang diproses.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {queue.map((order) => {
              const statusBadge = getStatusBadge(order.status);
              const nextAction = getNextAction(order.status);

              return (
                <div
                  key={order.id}
                  className={`rounded-xl border-l-8 bg-white p-5 shadow-sm ${getStatusColor(order.status)}`}
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        Meja {order.table_number}
                      </h3>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-sm text-gray-500">⏳ {order.wait_minutes} menit</span>
                        <span className="text-xs text-gray-400">
                          • {formatTime(order.created_at)}
                        </span>
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusBadge.bg}`}>
                      {statusBadge.text}
                    </span>
                  </div>

                  <div className="mb-4 rounded-lg bg-gray-50 p-3">
                    <p className="mb-2 text-sm font-medium text-gray-700">Pesanan:</p>
                    <p className="text-sm leading-relaxed text-gray-900">{order.items_list}</p>
                  </div>

                  {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                    <button
                      onClick={() => updateStatus(order.id, nextAction.next)}
                      className={`w-full rounded-lg px-4 py-3 text-lg font-bold transition-colors ${
                        order.status === 'PAID'
                          ? 'bg-orange-600 text-white hover:bg-orange-700'
                          : order.status === 'BREWING'
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'cursor-not-allowed bg-gray-400'
                      }`}
                      disabled={
                        (order.status as string) === 'COMPLETED' ||
                        (order.status as string) === 'CANCELLED'
                      }
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
