-- ============================================================================
-- ScanNGo Cafe - Database Schema
-- Supabase PostgreSQL
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. TABLES (Meja cafe)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_number INT NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'AVAILABLE', -- AVAILABLE, OCCUPIED, RESERVED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. MENU_ITEMS (Daftar menu cafe)
-- ============================================================================
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(50) NOT NULL, -- COFFEE, NON_COFFEE, FOOD, DESSERT
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. ORDERS (Pesanan pelanggan)
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    customer_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'PENDING', 
    -- PENDING (belum bayar), PAID (sudah bayar), BREWING (sedang bikin), 
    -- READY (siap diambil), COMPLETED (selesai), CANCELLED
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(20), -- CASH, QRIS, TRANSFER
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. ORDER_ITEMS (Detail pesanan)
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
    quantity INT NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. WIFI_VOUCHERS (Kupon Wi-Fi otomatis)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wifi_vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    voucher_code VARCHAR(20) NOT NULL UNIQUE,
    duration_minutes INT DEFAULT 120,
    is_redeemed BOOLEAN DEFAULT FALSE,
    redeemed_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Indexes untuk performance
-- ============================================================================
CREATE INDEX idx_orders_table_id ON orders(table_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_wifi_vouchers_order_id ON wifi_vouchers(order_id);
CREATE INDEX idx_wifi_vouchers_code ON wifi_vouchers(voucher_code);
CREATE INDEX idx_menu_items_category ON menu_items(category);
