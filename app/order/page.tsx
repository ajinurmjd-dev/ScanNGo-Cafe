'use client';

import { Suspense, useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { OrderStatus } from '@/lib/types';

const CATEGORIES = [
  { id: 'COFFEE', label: 'Kopi' },
  { id: 'NON_COFFEE', label: 'Non-Kopi' },
  { id: 'FOOD', label: 'Makanan' },
  { id: 'DESSERT', label: 'Kue' },
] as const;

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);

function CategoryTabs({ active, onChange }: { active: string; onChange: (c: string) => void }) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={`whitespace-nowrap rounded-full px-4 py-2 transition-colors ${
            active === cat.id
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}

export default function OrderPage() {
  const searchParams = useSearchParams();
  const tableNumber = searchParams?.get('table');

  // State
  const [tableId, setTableId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('COFFEE');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Load tables and menu
  useEffect(() => {
    const loadData = async () => {
      if (!tableNumber || isNaN(Number(tableNumber))) {
        setError('Nomor meja tidak valid. Silakan scan QR code di meja Anda kembali.');
        setLoading(false);
        return;
      }

      // Check table exists
      const { data: tableData, error: tableError } = await supabase
        .from('tables')
        .select('id')
        .eq('table_number', Number(tableNumber))
        .single();

      if (tableError || !tableData) {
        setError('Meja tidak terdaftar. Silakan cek nomor meja Anda.');
        setLoading(false);
        return;
      }

      setTableId(tableData.id);

      // Load menu
      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .order('category')
        .order('name');

      if (menuError) {
        setError('Gagal memuat menu. Coba lagi nanti.');
        setLoading(false);
        return;
      }

      setMenu(menuData || []);
      setLoading(false);
    };

    loadData();
  }, [tableNumber]);

  // Cart helpers
  const addToCart = useCallback((item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) => (c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, { ...item, quantity: 1, notes: '' }];
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => prev.filter((c) => c.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.id !== itemId) return c;
        const newQty = Math.max(1, c.quantity + delta);
        return { ...c, quantity: newQty };
      })
    );
  }, []);

  const updateNotes = useCallback((itemId: string, notes: string) => {
    setCart((prev) => prev.map((c) => (c.id === itemId ? { ...c, notes } : c)));
  }, []);

  // Total calculation
  const totalAmount = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  // Submit order
  const handleSubmit = async () => {
    if (!customerName.trim()) {
      alert('Nama pemesan wajib diisi.');
      return;
    }
    if (cart.length === 0) {
      alert('Cart kosong. Silakan pilih menu terlebih dahulu.');
      return;
    }
    if (!tableId) {
      setError('Session error. Silakan reload halaman.');
      return;
    }

    setSubmitting(true);

    // Insert order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        table_id: tableId,
        customer_name: customerName.trim(),
        status: 'PENDING' as OrderStatus,
        total_amount: totalAmount,
      })
      .select()
      .single();

    if (orderError) {
      alert(`Gagal membuat pesanan: ${orderError.message}`);
      setSubmitting(false);
      return;
    }

    // Insert order items
    const orderItems = cart.map((item) => ({
      order_id: orderData.id,
      menu_item_id: item.id,
      quantity: item.quantity,
      subtotal: item.price * item.quantity,
      notes: item.notes || null,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

    if (itemsError) {
      alert(`Gagal menyimpan item pesanan: ${itemsError.message}`);
      setSubmitting(false);
      return;
    }

    setOrderId(orderData.id);
    setSuccess(true);
    setSubmitting(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md rounded-lg bg-red-100 p-4 text-red-700">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 rounded-lg bg-emerald-600 px-6 py-2 text-white"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  // Success state
  if (success && orderId) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto mt-8 max-w-md rounded-2xl bg-white p-6 shadow-lg">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-2xl font-bold">Pesanan Dibuat!</h2>
            <p className="mb-4 text-gray-600">Order #{orderId.slice(0, 8).toUpperCase()}</p>

            <div className="mb-4 rounded-lg bg-gray-50 p-4 text-left">
              <p className="mb-2 text-sm text-gray-500">Pesanan:</p>
              {cart.map((item) => (
                <div key={item.id} className="mb-1 flex justify-between text-sm">
                  <span>
                    {item.quantity}x {item.name}
                    {item.notes && <span className="text-gray-400"> ({item.notes})</span>}
                  </span>
                  <span>{formatRupiah(item.price * item.quantity)}</span>
                </div>
              ))}
              <div className="mt-2 flex justify-between border-t pt-2 font-bold">
                <span>Total:</span>
                <span>{formatRupiah(totalAmount)}</span>
              </div>
            </div>

            <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm text-yellow-800">
                <strong>Status:</strong> Menunggu Pembayaran di Kasir
              </p>
              <p className="mt-1 text-sm text-yellow-800">
                Silakan menuju kasir untuk melakukan pembayaran (Tunai/QRIS) dan dapatkan password
                Wi-Fi Anda.
              </p>
            </div>

            <button
              onClick={() => (window.location.href = '/')}
              className="w-full rounded-lg bg-emerald-600 py-3 font-medium text-white"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filter menu by category
  const filteredMenu = useMemo(
    () => menu.filter((item) => item.category === activeCategory),
    [menu, activeCategory]
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-emerald-600 p-4 text-white shadow-md">
        <div className="mx-auto max-w-md">
          <h1 className="text-xl font-bold">Menu Meja {tableNumber}</h1>
        </div>
      </div>

      {/* Cart summary mobile */}
      <div className="mx-auto max-w-md p-4">
        {/* Category Tabs */}
        <CategoryTabs active={activeCategory} onChange={setActiveCategory} />

        {/* Menu List */}
        <div className="mt-4 space-y-3">
          {filteredMenu.length === 0 ? (
            <div className="py-8 text-center text-gray-500">Tidak ada menu di kategori ini.</div>
          ) : (
            filteredMenu.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    {item.description && (
                      <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                    )}
                    <p className="mt-2 font-bold text-emerald-600">{formatRupiah(item.price)}</p>
                  </div>
                  <button
                    onClick={() => addToCart(item)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 transition hover:bg-emerald-200"
                  >
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Items */}
        {cart.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 font-semibold">
              Keranjang ({cart.reduce((s, i) => s + i.quantity, 0)} item)
            </h3>
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="mt-1 font-semibold text-emerald-600">
                        {formatRupiah(item.price * item.quantity)}
                      </div>
                      <input
                        type="text"
                        placeholder="Catatan (opsional, misal: kurangi es)"
                        value={item.notes}
                        onChange={(e) => updateNotes(item.id, e.target.value)}
                        className="mt-2 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            item.quantity > 1
                              ? updateQuantity(item.id, -1)
                              : removeFromCart(item.id)
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-700"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-sm text-red-500 hover:text-red-700"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customer Form */}
        <div className="mt-6 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Nama Pemesan <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Masukkan nama Anda"
            className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white shadow-lg">
        <div className="mx-auto max-w-md p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-gray-600">Total:</span>
            <span className="text-2xl font-bold text-gray-900">{formatRupiah(totalAmount)}</span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={cart.length === 0 || submitting}
            className={`w-full rounded-lg py-3 text-lg font-semibold transition ${
              cart.length === 0 || submitting
                ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {submitting
              ? 'Memproses...'
              : `Pesan Sekarang (${cart.reduce((s, i) => s + i.quantity, 0)} item)`}
          </button>
        </div>
      </div>
    </div>
  );
}

// Types for local use
interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  category: string;
  is_available: boolean;
  created_at?: string;
  updated_at?: string;
}

interface CartItem extends MenuItem {
  quantity: number;
  notes: string;
}
