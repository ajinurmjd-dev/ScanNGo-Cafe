'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Category = 'COFFEE' | 'NON_COFFEE' | 'FOOD' | 'DESSERT';
type MenuItem = Database['public']['Tables']['menu_items']['Row'];
type TableRecord = Database['public']['Tables']['tables']['Row'];

interface CartItem extends MenuItem {
  quantity: number;
  notes: string;
}

function OrderContent() {
  if (!supabase) {
    throw new Error(
      'Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  const searchParams = useSearchParams();
  const tableNumber = searchParams.get('table');

  const [selectedTable, setSelectedTable] = useState<TableRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category | 'ALL'>('ALL');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<{
    order_id: string;
    table_number: number;
    items: CartItem[];
    total: number;
  } | null>(null);

  // Validasi meja
  useEffect(() => {
    if (!tableNumber) {
      setError('Silakan scan QR code yang valid untuk melanjutkan pemesanan.');
      return;
    }

    const numTable = parseInt(tableNumber, 10);
    if (isNaN(numTable)) {
      setError('Nomor meja tidak valid.');
      return;
    }

    fetchTable(numTable);
  }, [tableNumber]);

  const fetchTable = async (tableNumber: number) => {
    if (!supabase) {
      setError('Koneksi database tidak tersedia. Silakan coba lagi.');
      return;
    }

    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('table_number', tableNumber)
      .single();

    if (error || !data) {
      setError(`Meja ${tableNumber} tidak tersedia. Silakan coba meja lain.`);
      return;
    }

    setSelectedTable(data);
  };

  // Fetch menu items
  useEffect(() => {
    if (!selectedTable) return;

    fetchMenuItems();
  }, [selectedTable]);

  const fetchMenuItems = async () => {
    if (!supabase) {
      setError('Koneksi database tidak tersedia. Silakan coba lagi.');
      return;
    }

    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_available', true)
      .order('name');

    if (error) {
      setError('Gagal memuat menu. Silakan coba lagi.');
      return;
    }

    setMenuItems(data || []);
  };

  // Keranjang functions
  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1, notes: '' }];
    });
  };

  // Hitung total
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Submit order
  const handleSubmit = async () => {
    if (cart.length === 0) {
      setError('Keranjang kosong. Silakan pilih menu terlebih dahulu.');
      return;
    }
    if (!customerName.trim()) {
      setError('Nama pemesan wajib diisi.');
      return;
    }
    if (!supabase) {
      setError('Koneksi database tidak tersedia. Silakan coba lagi.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Insert order
      const orderTotal = Math.round(total * 100) / 100;
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          table_id: selectedTable!.id,
          customer_name: customerName.trim(),
          status: 'PENDING',
          total_amount: orderTotal,
        })
        .select()
        .single();

      if (orderError) {
        throw new Error(orderError.message);
      }

      const orderId = orderData!.id;

      // 2. Insert order items
      const orderItems = cart.map((item) => ({
        order_id: orderId,
        menu_item_id: item.id,
        quantity: item.quantity,
        subtotal: Math.round(item.price * item.quantity * 100) / 100,
        notes: item.notes || null,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

      if (itemsError) {
        throw new Error(itemsError.message);
      }

      // Success
      setSuccessOrder({
        order_id: orderId,
        table_number: selectedTable!.table_number,
        items: cart,
        total: orderTotal,
      });
      setCart([]);
      setCustomerName('');
    } catch (err) {
      setError(`Gagal menyimpan pesanan: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter menu by category
  const filteredMenu =
    activeCategory === 'ALL'
      ? menuItems
      : menuItems.filter((item) => item.category === activeCategory);

  const categories: (Category | 'ALL')[] = ['ALL', 'COFFEE', 'NON_COFFEE', 'FOOD', 'DESSERT'];

  // Render success view
  if (successOrder) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-md p-6">
          <div className="rounded-xl bg-white p-8 text-center shadow-lg">
            <h2 className="mb-4 text-2xl font-bold text-green-600">Pesanan Berhasil!</h2>
            <div className="mb-6 text-sm text-gray-500">
              <p>Order #{successOrder.order_id.slice(0, 8)}</p>
              <p>Meja {successOrder.table_number}</p>
            </div>

            <div className="mb-6 border-b border-t py-4">
              {successOrder.items.map((item) => (
                <div key={item.id} className="mb-2 flex items-start justify-between">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.quantity > 1 && <p className="text-sm text-gray-500">x{item.quantity}</p>}
                    {item.notes && (
                      <p className="text-xs italic text-gray-400">&ldquo;{item.notes}&rdquo;</p>
                    )}
                  </div>
                  <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>

            <div className="mb-8 text-xl font-bold">
              Total: {formatCurrency(successOrder.total)}
            </div>

            <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-start">
                <div className="flex-1">
                  <p className="mb-1 font-medium text-yellow-800">Status Pesanan:</p>
                  <span className="mb-2 inline-block rounded-full bg-yellow-200 px-3 py-1 text-sm font-medium text-yellow-800">
                    Menunggu Pembayaran di Kasir
                  </span>
                  <p className="mt-2 text-sm text-yellow-700">
                    Silakan ke kasir untuk membayar (Tunai/QRIS) dan dapatkan kode voucher Wi-Fi
                    Anda.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setSuccessOrder(null);
                setCart([]);
                setCustomerName('');
              }}
              className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700"
            >
              Buat Pesanan Baru
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="mx-auto max-w-md px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">☕ ScanNGo Cafe</h1>
          {selectedTable ? (
            <p className="mt-1 text-sm text-gray-600">
              Meja {selectedTable.table_number} ({selectedTable.status})
            </p>
          ) : (
            <p className="mt-1 text-sm text-gray-500">Memuat data meja...</p>
          )}
        </div>
      </header>

      {/* Error message */}
      {error && (
        <div className="mx-auto max-w-md px-4 py-2">
          <div className="relative rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-md pb-24">
        {/* Category tabs */}
        <div className="mx-auto mt-4 max-w-md px-4">
          <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {cat === 'ALL' ? 'Semua' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Menu items */}
        <div className="mx-auto mt-6 max-w-md px-4">
          <div className="space-y-4">
            {filteredMenu.map((item) => (
              <div key={item.id} className="flex gap-4 rounded-xl bg-white p-4 shadow-sm">
                <div className="flex-1">
                  <div className="mb-1 flex items-start justify-between">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(item.price)}
                    </span>
                  </div>
                  {item.description && (
                    <p className="mb-2 line-clamp-2 text-sm text-gray-500">{item.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => addToCart(item)}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    >
                      Tambah
                    </button>
                    <span className="text-sm text-gray-600">
                      {item.category === 'COFFEE'
                        ? '☕'
                        : item.category === 'FOOD'
                          ? '🍔'
                          : item.category === 'DESSERT'
                            ? '🍰'
                            : '🥤'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filteredMenu.length === 0 && (
            <div className="py-8 text-center text-gray-500">
              Tidak ada menu tersedia di kategori ini.
            </div>
          )}
        </div>
      </main>

      {/* Sticky cart summary */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white shadow-lg">
          <div className="mx-auto max-w-md p-4">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <p className="font-semibold text-gray-900">
                  {cart.length} item{cart.length > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-gray-500">Subtotal: {formatCurrency(total)}</p>
              </div>
              <button
                onClick={() => setCart([])}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Hapus
              </button>
            </div>

            {/* Cart items summary */}
            <div className="scrollbar-hide mb-3 max-h-24 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.id} className="mb-1 flex items-center justify-between text-sm">
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  <span className="text-gray-600">{item.notes ? `(${item.notes})` : ''}</span>
                </div>
              ))}
            </div>

            {/* Customer name input */}
            <div className="mb-3">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nama pemesan (wajib)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !customerName.trim()}
              className={`w-full rounded-lg py-3 font-medium transition-colors ${
                isSubmitting || !customerName.trim()
                  ? 'cursor-not-allowed bg-gray-300'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isSubmitting ? 'Mengirim pesanan...' : `Pesan Sekarang - ${formatCurrency(total)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600"></div>
        </div>
      }
    >
      <OrderContent />
    </Suspense>
  );
}
