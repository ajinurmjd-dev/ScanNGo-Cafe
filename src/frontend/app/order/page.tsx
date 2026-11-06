"use client";

import { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

import type { Database } from "@/types/database";

type Category = "COFFEE" | "NON_COFFEE" | "FOOD" | "DESSERT";
type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
type TableRecord = Database["public"]["Tables"]["tables"]["Row"];

interface CartItem extends MenuItem {
  quantity: number;
  notes: string;
}

function OrderContent() {
  const searchParams = useSearchParams();
  const tableNumber = searchParams.get("table");

  const [selectedTable, setSelectedTable] = useState<TableRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category | "ALL">("ALL");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [dbReady, setDbReady] = useState(false);
  const [customerName, setCustomerName] = useState("");
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
      setError("Silakan scan QR code yang valid untuk melanjutkan pemesanan.");
      return;
    }

    const numTable = parseInt(tableNumber, 10);
    if (isNaN(numTable)) {
      setError("Nomor meja tidak valid.");
      return;
    }

    fetchTable(numTable);
  }, [tableNumber]);

  const fetchTable = async (tableNumber: number) => {
    if (!supabase) {
      setError("Koneksi database tidak tersedia. Silakan coba lagi.");
      return;
    }

    const { data, error } = await supabase
      .from("tables")
      .select("*")
      .eq("table_number", tableNumber)
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
      setError("Koneksi database tidak tersedia. Silakan coba lagi.");
      return;
    }

    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("is_available", true)
      .order("name");

    if (error) {
      setError("Gagal memuat menu. Silakan coba lagi.");
      return;
    }

    setMenuItems(data || []);
  };

  // Keranjang functions
  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1, notes: "" }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const updateNotes = (id: string, notes: string) => {
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, notes } : i)));
  };

  // Hitung total
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Submit order
  const handleSubmit = async () => {
    if (cart.length === 0) {
      setError("Keranjang kosong. Silakan pilih menu terlebih dahulu.");
      return;
    }
    if (!customerName.trim()) {
      setError("Nama pemesan wajib diisi.");
      return;
    }
    if (!supabase) {
      setError("Koneksi database tidak tersedia. Silakan coba lagi.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Insert order
      const orderTotal = Math.round(total * 100) / 100;
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          table_id: selectedTable!.id,
          customer_name: customerName.trim(),
          status: "PENDING",
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

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

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
      setCustomerName("");
    } catch (err) {
      setError(`Gagal menyimpan pesanan: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter menu by category
  const filteredMenu = activeCategory === "ALL"
    ? menuItems
    : menuItems.filter((item) => item.category === activeCategory);

  const categories: (Category | "ALL")[] = ["ALL", "COFFEE", "NON_COFFEE", "FOOD", "DESSERT"];

  // Render success view
  if (successOrder) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto p-6">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-green-600 mb-4">
              Pesanan Berhasil!
            </h2>
            <div className="text-sm text-gray-500 mb-6">
              <p>Order #{successOrder.order_id.slice(0, 8)}</p>
              <p>Meja {successOrder.table_number}</p>
            </div>

            <div className="border-t border-b py-4 mb-6">
              {successOrder.items.map((item) => (
                <div key={item.id} className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.quantity > 1 && (
                      <p className="text-sm text-gray-500">x{item.quantity}</p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-gray-400 italic">&ldquo;{item.notes}&rdquo;</p>
                    )}
                  </div>
                  <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>

            <div className="text-xl font-bold mb-8">
              Total: {formatCurrency(successOrder.total)}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <div className="flex-1">
                  <p className="font-medium text-yellow-800 mb-1">Status Pesanan:</p>
                  <span className="inline-block px-3 py-1 bg-yellow-200 text-yellow-800 text-sm font-medium rounded-full mb-2">
                    Menunggu Pembayaran di Kasir
                  </span>
                  <p className="text-sm text-yellow-700 mt-2">
                    Silakan ke kasir untuk membayar (Tunai/QRIS) dan dapatkan kode voucher Wi-Fi Anda.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setSuccessOrder(null);
                setCart([]);
                setCustomerName("");
              }}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
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
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">☕ ScanNGo Cafe</h1>
          {selectedTable ? (
            <p className="text-sm text-gray-600 mt-1">
              Meja {selectedTable.table_number} ({selectedTable.status})
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-1">Memuat data meja...</p>
          )}
        </div>
      </header>

      {/* Error message */}
      {error && (
        <div className="max-w-md mx-auto px-4 py-2">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        </div>
      )}

      <main className="max-w-md mx-auto pb-24">
        {/* Category tabs */}
        <div className="max-w-md mx-auto px-4 mt-4">
          <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {cat === "ALL" ? "Semua" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Menu items */}
        <div className="max-w-md mx-auto px-4 mt-6">
          <div className="space-y-4">
            {filteredMenu.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-sm p-4 flex gap-4">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(item.price)}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => addToCart(item)}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Tambah
                    </button>
                    <span className="text-sm text-gray-600">
                      {item.category === "COFFEE" ? "☕" : item.category === "FOOD" ? "🍔" : item.category === "DESSERT" ? "🍰" : "🥤"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filteredMenu.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Tidak ada menu tersedia di kategori ini.
            </div>
          )}
        </div>
      </main>

      {/* Sticky cart summary */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-md mx-auto p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <p className="font-semibold text-gray-900">
                  {cart.length} item{cart.length > 1 ? "s" : ""}
                </p>
                <p className="text-sm text-gray-500">
                  Subtotal: {formatCurrency(total)}
                </p>
              </div>
              <button
                onClick={() => setCart([])}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Hapus
              </button>
            </div>

            {/* Cart items summary */}
            <div className="mb-3 max-h-24 overflow-y-auto scrollbar-hide">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center mb-1 text-sm">
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  <span className="text-gray-600">
                    {item.notes ? `(${item.notes})` : ""}
                  </span>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !customerName.trim()}
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                isSubmitting || !customerName.trim()
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              {isSubmitting ? "Mengirim pesanan..." : `Pesan Sekarang - ${formatCurrency(total)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    }>
      <OrderContent />
    </Suspense>
  );
}
