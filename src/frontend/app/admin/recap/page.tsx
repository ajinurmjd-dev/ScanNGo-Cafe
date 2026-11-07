"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface SalesRecap {
  order_date: string;
  total_transactions: number;
  gross_revenue: number;
  average_basket_size: number;
  unique_tables: number;
}

export default function RecapPage() {
  if (!supabase) {
    throw new Error('Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  const [recaps, setRecaps] = useState<SalesRecap[]>([]);
  const [todayStats, setTodayStats] = useState<{
    gross_revenue: number;
    total_transactions: number;
    average_basket_size: number;
    unique_tables: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecap = async () => {
    try {
      const { data, error } = await supabase!
        .from("sales_recap_daily")
        .select("*")
        .order("order_date", { ascending: false });

      if (error) {
        console.error("Error fetching sales recap:", error);
        return;
      }

      const recapsData = data as SalesRecap[];
      setRecaps(recapsData);

      // Calculate today's stats (current date)
      const today = new Date().toISOString().split('T')[0];
      const todayData = recapsData.find(r => r.order_date === today);
      setTodayStats(todayData || {
        gross_revenue: 0,
        total_transactions: 0,
        average_basket_size: 0,
        unique_tables: 0
      });
    } catch (err) {
      console.error("Exception in fetchRecap:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecap();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          <p className="mt-4 text-gray-500">Memuat data rekapitulasi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">📊 Dashboard Rekap Omzet</h1>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setRefreshing(true);
                fetchRecap();
              }}
              disabled={refreshing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <a
              href="/pos"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              ← Kasir
            </a>
            <a
              href="/kds"
              className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
            >
              ← KDS
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {/* KPI Cards - Today's Stats */}
        {todayStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-emerald-500">
              <p className="text-sm text-gray-500 font-medium mb-1">Pendapatan Kotor</p>
              <p className="text-3xl font-bold text-emerald-700">
                {formatCurrency(todayStats.gross_revenue)}
              </p>
              <p className="text-xs text-gray-400 mt-2">Hari ini</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
              <p className="text-sm text-gray-500 font-medium mb-1">Transaksi Selesai</p>
              <p className="text-3xl font-bold text-blue-700">
                {todayStats.total_transactions}
              </p>
              <p className="text-xs text-gray-400 mt-2">Order PAID/COMPLETED</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
              <p className="text-sm text-gray-500 font-medium mb-1">Rata-rata Keranjang</p>
              <p className="text-3xl font-bold text-purple-700">
                {formatCurrency(todayStats.average_basket_size)}
              </p>
              <p className="text-xs text-gray-400 mt-2">Per transaksi</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
              <p className="text-sm text-gray-500 font-medium mb-1">Meja Terlayani</p>
              <p className="text-3xl font-bold text-orange-700">
                {todayStats.unique_tables}
              </p>
              <p className="text-xs text-gray-400 mt-2">Meja unik</p>
            </div>
          </div>
        )}

        {/* History Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Riwayat Rekapitulasi Harian</h2>
          </div>
          
          {recaps.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">Belum ada data transaksi.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaksi</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pendapatan</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rata-rata Keranjang</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meja Unik</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recaps.map((recap, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{formatDate(recap.order_date)}</div>
                        <div className="text-xs text-gray-500">{recap.order_date}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-blue-700">{recap.total_transactions}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-emerald-700">{formatCurrency(recap.gross_revenue)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-purple-700">{formatCurrency(recap.average_basket_size)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-orange-700">{recap.unique_tables}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Data diambil dari view <code>sales_recap_daily</code> (status: PAID, COMPLETED)
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
