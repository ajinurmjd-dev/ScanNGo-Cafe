-- ============================================================================
-- ScanNGo Cafe - Triggers & Views
-- ============================================================================

-- ============================================================================
-- TRIGGER: Auto-generate Wi-Fi voucher saat order status berubah ke PAID
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_wifi_voucher()
RETURNS TRIGGER AS $$
BEGIN
    -- Hanya trigger jika status berubah dari PENDING ke PAID
    IF NEW.status = 'PAID' AND OLD.status = 'PENDING' THEN
        INSERT INTO wifi_vouchers (
            order_id,
            voucher_code,
            duration_minutes,
            expires_at
        )
        VALUES (
            NEW.id,
            -- Generate random 6-char alphanumeric code
            UPPER(SUBSTR(MD5(RANDOM()::TEXT || CURRENT_TIMESTAMP::TEXT), 1, 6)),
            120,
            NOW() + INTERVAL '120 minutes'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_wifi_voucher ON orders;
CREATE TRIGGER trg_generate_wifi_voucher
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION generate_wifi_voucher();

-- ============================================================================
-- TRIGGER: Update table status saat order berubah
-- ============================================================================
CREATE OR REPLACE FUNCTION update_table_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Jika ada order PAID/BREWING, table status = OCCUPIED
    IF NEW.status IN ('PAID', 'BREWING', 'READY') THEN
        UPDATE tables SET status = 'OCCUPIED', updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.table_id;
    END IF;
    
    -- Jika order COMPLETED, check apakah ada order lain di table ini
    IF NEW.status = 'COMPLETED' THEN
        IF NOT EXISTS (
            SELECT 1 FROM orders 
            WHERE table_id = NEW.table_id 
            AND status NOT IN ('COMPLETED', 'CANCELLED')
        ) THEN
            UPDATE tables SET status = 'AVAILABLE', updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.table_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_table_status ON orders;
CREATE TRIGGER trg_update_table_status
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_table_status();

-- ============================================================================
-- VIEW: Daily Sales Recap
-- ============================================================================
DROP VIEW IF EXISTS sales_recap_daily CASCADE;
CREATE VIEW sales_recap_daily AS
SELECT 
    DATE(o.created_at) AS order_date,
    COUNT(o.id) AS total_transactions,
    COALESCE(SUM(o.total_amount), 0) AS gross_revenue,
    COALESCE(ROUND(AVG(o.total_amount), 2), 0) AS average_basket_size,
    COUNT(DISTINCT o.table_id) AS unique_tables
FROM orders o
WHERE o.status IN ('PAID', 'COMPLETED')
GROUP BY DATE(o.created_at)
ORDER BY order_date DESC;

-- ============================================================================
-- VIEW: Weekly Sales Recap
-- ============================================================================
DROP VIEW IF EXISTS sales_recap_weekly CASCADE;
CREATE VIEW sales_recap_weekly AS
SELECT 
    DATE_TRUNC('week', o.created_at)::DATE AS week_start,
    COUNT(o.id) AS total_transactions,
    COALESCE(SUM(o.total_amount), 0) AS gross_revenue,
    COALESCE(ROUND(AVG(o.total_amount), 2), 0) AS average_basket_size,
    COUNT(DISTINCT o.table_id) AS unique_tables
FROM orders o
WHERE o.status IN ('PAID', 'COMPLETED')
GROUP BY DATE_TRUNC('week', o.created_at)
ORDER BY week_start DESC;

-- ============================================================================
-- VIEW: Monthly Sales Recap
-- ============================================================================
DROP VIEW IF EXISTS sales_recap_monthly CASCADE;
CREATE VIEW sales_recap_monthly AS
SELECT 
    DATE_TRUNC('month', o.created_at)::DATE AS month_start,
    COUNT(o.id) AS total_transactions,
    COALESCE(SUM(o.total_amount), 0) AS gross_revenue,
    COALESCE(ROUND(AVG(o.total_amount), 2), 0) AS average_basket_size,
    COUNT(DISTINCT o.table_id) AS unique_tables
FROM orders o
WHERE o.status IN ('PAID', 'COMPLETED')
GROUP BY DATE_TRUNC('month', o.created_at)
ORDER BY month_start DESC;

-- ============================================================================
-- VIEW: Category Sales Breakdown
-- ============================================================================
DROP VIEW IF EXISTS sales_by_category CASCADE;
CREATE VIEW sales_by_category AS
SELECT 
    DATE(o.created_at) AS order_date,
    mi.category,
    COUNT(oi.id) AS items_sold,
    COALESCE(SUM(oi.subtotal), 0) AS category_revenue
FROM orders o
INNER JOIN order_items oi ON o.id = oi.order_id
INNER JOIN menu_items mi ON oi.menu_item_id = mi.id
WHERE o.status IN ('PAID', 'COMPLETED')
GROUP BY DATE(o.created_at), mi.category
ORDER BY order_date DESC, category_revenue DESC;

-- ============================================================================
-- VIEW: Active Kitchen Queue (KDS Display)
-- ============================================================================
DROP VIEW IF EXISTS kitchen_queue CASCADE;
CREATE VIEW kitchen_queue AS
SELECT 
    o.id,
    t.table_number,
    o.created_at AS order_time,
    ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - o.created_at))/60)::INT AS wait_minutes,
    STRING_AGG(
        mi.name || ' x' || oi.quantity || 
        CASE WHEN oi.notes IS NOT NULL THEN ' (' || oi.notes || ')' ELSE '' END,
        ', '
    ) AS items_list,
    o.status
FROM orders o
INNER JOIN tables t ON o.table_id = t.id
INNER JOIN order_items oi ON o.id = oi.order_id
INNER JOIN menu_items mi ON oi.menu_item_id = mi.id
WHERE o.status IN ('PAID', 'BREWING')
GROUP BY o.id, t.table_number, o.created_at, o.status
ORDER BY 
    CASE WHEN o.status = 'BREWING' THEN 0 ELSE 1 END,
    o.created_at ASC;
