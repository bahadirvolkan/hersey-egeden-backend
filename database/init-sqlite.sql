-- SQLite Schema for Hersey Egeden

-- Tables
CREATE TABLE IF NOT EXISTS tables (
  id INTEGER PRIMARY KEY,
  table_number INTEGER UNIQUE NOT NULL,
  status TEXT DEFAULT 'available'
);

-- Insert Tables (1-10)
INSERT OR IGNORE INTO tables (id, table_number, status) VALUES
(1, 1, 'available'),
(2, 2, 'available'),
(3, 3, 'available'),
(4, 4, 'available'),
(5, 5, 'available'),
(6, 6, 'available'),
(7, 7, 'available'),
(8, 8, 'available'),
(9, 9, 'available'),
(10, 10, 'available');

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_id INTEGER REFERENCES tables(id),
  status TEXT DEFAULT 'pending',
  customer_note TEXT,
  total_price DECIMAL(10, 2),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id INTEGER REFERENCES menu_items(id),
  quantity INTEGER NOT NULL,
  price_at_purchase DECIMAL(10, 2),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily Reports
CREATE TABLE IF NOT EXISTS daily_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_date DATE UNIQUE NOT NULL,
  total_orders INTEGER DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);

