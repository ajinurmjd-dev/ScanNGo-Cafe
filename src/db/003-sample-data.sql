-- ============================================================================
-- ScanNGo Cafe - Sample Data (Dummy)
-- ============================================================================

-- ============================================================================
-- Insert Tables (10 meja)
-- ============================================================================
INSERT INTO tables (table_number, status) VALUES
(1, 'AVAILABLE'),
(2, 'AVAILABLE'),
(3, 'AVAILABLE'),
(4, 'AVAILABLE'),
(5, 'AVAILABLE'),
(6, 'AVAILABLE'),
(7, 'AVAILABLE'),
(8, 'AVAILABLE'),
(9, 'AVAILABLE'),
(10, 'AVAILABLE');

-- ============================================================================
-- Insert Menu Items
-- ============================================================================
-- Coffee
INSERT INTO menu_items (name, description, price, category, is_available) VALUES
('Espresso', 'Single shot espresso', 18000, 'COFFEE', TRUE),
('Americano', 'Espresso dengan air panas', 22000, 'COFFEE', TRUE),
('Cappuccino', 'Espresso, steamed milk, foam', 28000, 'COFFEE', TRUE),
('Latte', 'Espresso dengan susu', 30000, 'COFFEE', TRUE),
('Caramel Macchiato', 'Latte dengan caramel syrup', 35000, 'COFFEE', TRUE),
('Iced Coffee', 'Cold brew coffee', 25000, 'COFFEE', TRUE);

-- Non-Coffee
INSERT INTO menu_items (name, description, price, category, is_available) VALUES
('Green Tea Latte', 'Matcha latte', 32000, 'NON_COFFEE', TRUE),
('Chocolate', 'Hot/Iced chocolate', 28000, 'NON_COFFEE', TRUE),
('Lemon Tea', 'Fresh lemon tea', 20000, 'NON_COFFEE', TRUE),
('Thai Tea', 'Thai milk tea', 25000, 'NON_COFFEE', TRUE);

-- Food
INSERT INTO menu_items (name, description, price, category, is_available) VALUES
('Croissant', 'French butter croissant', 22000, 'FOOD', TRUE),
('Sandwich Club', 'Triple decker sandwich', 45000, 'FOOD', TRUE),
('Nasi Goreng', 'Fried rice dengan telur', 35000, 'FOOD', TRUE),
('French Fries', 'Kentang goreng', 18000, 'FOOD', TRUE);

-- Dessert
INSERT INTO menu_items (name, description, price, category, is_available) VALUES
('Tiramisu', 'Classic Italian dessert', 38000, 'DESSERT', TRUE),
('Cheesecake', 'New York style', 40000, 'DESSERT', TRUE),
('Brownies', 'Chocolate fudge brownies', 25000, 'DESSERT', TRUE);

-- ============================================================================
-- Sample Orders (untuk testing)
-- Tidak akan trigger auto-voucher karena statusnya langsung COMPLETED
-- ============================================================================

-- Order dari kemarin (untuk testing recap)
INSERT INTO orders (id, table_id, customer_name, status, total_amount, payment_method, created_at) VALUES
(uuid_generate_v4(), (SELECT id FROM tables WHERE table_number = 1), 'Budi', 'COMPLETED', 60000, 'CASH', NOW() - INTERVAL '1 day'),
(uuid_generate_v4(), (SELECT id FROM tables WHERE table_number = 2), 'Ani', 'COMPLETED', 85000, 'QRIS', NOW() - INTERVAL '1 day'),
(uuid_generate_v4(), (SELECT id FROM tables WHERE table_number = 3), 'Citra', 'COMPLETED', 45000, 'CASH', NOW() - INTERVAL '1 day');

-- Order hari ini (status PENDING untuk simulasi flow)
INSERT INTO orders (id, table_id, customer_name, status, total_amount, payment_method, notes) VALUES
(uuid_generate_v4(), (SELECT id FROM tables WHERE table_number = 5), 'Dedi', 'PENDING', 58000, NULL, 'Less sugar'),
(uuid_generate_v4(), (SELECT id FROM tables WHERE table_number = 6), 'Eka', 'PENDING', 70000, NULL, NULL);

COMMIT;
