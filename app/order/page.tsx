'use client';

import { Suspense, useState, useMemo, useCallback } from 'react';
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
    <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
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
        return prev.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
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
    setCart((prev) =>
      prev.map((c) => (c.id === itemId ? { ...c, notes } : c))
    );
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

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="bg-red-100 text-red-700 p-4 rounded-lg max-w-md">
          {error}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-emerald-600 text-white rounded-lg"
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
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-6 mt-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Pesanan Dibuat!</h2>
            <p className="text-gray-600 mb-4">Order #{orderId.slice(0, 8).toUpperCase()}</p>

            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
              <p className="text-sm text-gray-500 mb-2">Pesanan:</p>
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between text-sm mb-1">
                  <span>
                    {item.quantity}x {item.name}
                    {item.notes && <span className="text-gray-400"> ({item.notes})</span>}
                  </span>
                  <span>{formatRupiah(item.price * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                <span>Total:</span>
                <span>{formatRupiah(totalAmount)}</span>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Status:</strong> Menunggu Pembayaran di Kasir
              </p>
              <p className="text-sm text-yellow-800 mt-1">
                Silakan menuju kasir untuk melakukan pembayaran (Tunai/QRIS) dan dapatkan password Wi-Fi Anda.
              </p>
            </div>

            <button
              onClick={() => window.location.href = '/'}
              className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium"
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
      <div className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="max-w-md mx-auto">
          <h1 className="text-xl font-bold">Menu Meja {tableNumber}</h1>
        </div>
      </div>

      {/* Cart summary mobile */}
      <div className="max-w-md mx-auto p-4">
        {/* Category Tabs */}
        <CategoryTabs active={activeCategory} onChange={setActiveCategory} />

        {/* Menu List */}
        <div className="mt-4 space-y-3">
          {filteredMenu.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Tidak ada menu di kategori ini.</div>
          ) : (
            filteredMenu.map((item) => (
              <div key={item.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    {item.description && (
                      <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                    )}
                    <p className="text-emerald-600 font-bold mt-2">
                      {formatRupiah(item.price)}
                    </p>
                  </div>
                  <button
                    onClick={() => addToCart(item)}
                    className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center hover:bg-emerald-200 transition"
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
            <h3 className="font-semibold mb-3">Keranjang ({cart.reduce((s, i) => s + i.quantity, 0)} item)</h3>
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-emerald-600 font-semibold mt-1">
                        {formatRupiah(item.price * item.quantity)}
                      </div>
                      <input
                        type="text"
                        placeholder="Catatan (opsional, misal: kurangi es)"
                        value={item.notes}
                        onChange={(e) => updateNotes(item.id, e.target.value)}
                        className="w-full mt-2 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => item.quantity > 1 ? updateQuantity(item.id, -1) : removeFromCart(item.id)}
                          className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-700"
                        >
                          -
                        </button>
                        <span className="font-semibold w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600"
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
        <div className="mt-6 bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nama Pemesan <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Masukkan nama Anda"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-md mx-auto p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-600">Total:</span>
            <span className="text-2xl font-bold text-gray-900">{formatRupiah(totalAmount)}</span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={cart.length === 0 || submitting}
            className={`w-full py-3 rounded-lg font-semibold text-lg transition ${
              cart.length === 0 || submitting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {submitting ? 'Memproses...' : `Pesan Sekarang (${cart.reduce((s, i) => s + i.quantity, 0)} item)`}
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
