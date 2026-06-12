-- Create Tables
CREATE TABLE IF NOT EXISTS tables (
  id INT PRIMARY KEY,
  table_number INT UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'available'
);

-- Insert Tables (1-10)
INSERT INTO tables (id, table_number, status) VALUES
(1, 1, 'available'),
(2, 2, 'available'),
(3, 3, 'available'),
(4, 4, 'available'),
(5, 5, 'available'),
(6, 6, 'available'),
(7, 7, 'available'),
(8, 8, 'available'),
(9, 9, 'available'),
(10, 10, 'available')
ON CONFLICT DO NOTHING;

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  "order" INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
  id SERIAL PRIMARY KEY,
  category_id INT REFERENCES categories(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url VARCHAR(255),
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  table_id INT REFERENCES tables(id),
  status VARCHAR(20) DEFAULT 'pending',
  customer_note TEXT,
  total_price DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INT REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id INT REFERENCES menu_items(id),
  quantity INT NOT NULL,
  price_at_purchase DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily Reports
CREATE TABLE IF NOT EXISTS daily_reports (
  id SERIAL PRIMARY KEY,
  report_date DATE UNIQUE NOT NULL,
  total_orders INT DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);

-- Sample Categories
INSERT INTO categories (name, "order") VALUES
('Mezeler', 1),
('Çorbalar', 2),
('Ana Yemekler', 3),
('Balık', 4),
('Tatlılar', 5),
('İçecekler', 6)
ON CONFLICT DO NOTHING;

-- Sample Menu Items
INSERT INTO menu_items (category_id, name, description, price, is_available) VALUES
-- Mezeler
((SELECT id FROM categories WHERE name = 'Mezeler'), 'Hummus', 'Nohut püresi, tahini, limon', 85.00, TRUE),
((SELECT id FROM categories WHERE name = 'Mezeler'), 'Baba Ganoush', 'Patlıcan püresi, tahini', 80.00, TRUE),
((SELECT id FROM categories WHERE name = 'Mezeler'), 'Mutabal', 'Patlıcan, tahini, dı', 90.00, TRUE),

-- Çorbalar
((SELECT id FROM categories WHERE name = 'Çorbalar'), 'Lentil Çorbası', 'Kırmızı mercimek, soğan, sarımsak', 45.00, TRUE),
((SELECT id FROM categories WHERE name = 'Çorbalar'), 'Tavuk Çorbası', 'Tavuk, sebzeler, noodle', 55.00, TRUE),

-- Ana Yemekler
((SELECT id FROM categories WHERE name = 'Ana Yemekler'), 'Adana Kebab', 'Bahçıvan eriştesiyle servis, 250g', 185.00, TRUE),
((SELECT id FROM categories WHERE name = 'Ana Yemekler'), 'İskender Kebab', 'Yoğun sos, tereyağı, pide ekmek', 195.00, TRUE),
((SELECT id FROM categories WHERE name = 'Ana Yemekler'), 'Köfte', 'Ev yapımı köfte, sos ve pirinç', 165.00, TRUE),
((SELECT id FROM categories WHERE name = 'Ana Yemekler'), 'Tavuk Döner', 'Tavuk döner, lavash, sarımsak soslu', 155.00, TRUE),

-- Balık
((SELECT id FROM categories WHERE name = 'Balık'), 'Levrek Izgara', 'Taze levrek, limon, zeytin yağı', 245.00, TRUE),
((SELECT id FROM categories WHERE name = 'Balık'), 'Mezgit Tava', 'Taze mezgit, tartar sos', 185.00, TRUE),

-- Tatlılar
((SELECT id FROM categories WHERE name = 'Tatlılar'), 'Baklava', 'Fıstık ve bal, 100g', 65.00, TRUE),
((SELECT id FROM categories WHERE name = 'Tatlılar'), 'Kunefe', 'Tel kadayıf, öğütülmüş fıstık', 85.00, TRUE),
((SELECT id FROM categories WHERE name = 'Tatlılar'), 'Tiramisu', 'Mascarpone, mascarpone, cacao', 75.00, TRUE),

-- İçecekler
((SELECT id FROM categories WHERE name = 'İçecekler'), 'Ayran', 'Soğuk, tuzlu ayran', 20.00, TRUE),
((SELECT id FROM categories WHERE name = 'İçecekler'), 'Kola', 'Coca-Cola 250ml', 30.00, TRUE),
((SELECT id FROM categories WHERE name = 'İçecekler'), 'Fanta Portakal', 'Fanta 250ml', 30.00, TRUE),
((SELECT id FROM categories WHERE name = 'İçecekler'), 'Çay', 'Sıcak çay', 15.00, TRUE),
((SELECT id FROM categories WHERE name = 'İçecekler'), 'Kahve', 'Türk kahvesi veya Nespresso', 35.00, TRUE)
ON CONFLICT DO NOTHING;
