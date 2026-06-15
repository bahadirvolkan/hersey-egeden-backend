const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

// Image upload
router.post('/upload', async (req, res) => {
  const upload = req.app.get('upload');
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: 'Upload failed: ' + err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    const row = await dbGet("SELECT value FROM settings WHERE key = 'admin_password'");
    const adminPassword = row ? row.value : (process.env.ADMIN_PASSWORD || 'admin123');
    if (password === adminPassword) {
      res.json({ success: true, token: 'admin-token-' + Date.now() });
    } else {
      res.status(401).json({ error: 'Invalid password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get settings
router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const rows = await dbAll('SELECT key, value FROM settings');
    const s = {};
    for (const r of rows) s[r.key] = r.value;
    res.json(s);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Update passwords
router.put('/settings/passwords', authMiddleware, async (req, res) => {
  try {
    const { admin_password, kitchen_password, current_password } = req.body;
    const row = await dbGet("SELECT value FROM settings WHERE key = 'admin_password'");
    const currentAdmin = row ? row.value : (process.env.ADMIN_PASSWORD || 'admin123');
    if (current_password !== currentAdmin) {
      return res.status(401).json({ error: 'Mevcut şifre hatalı' });
    }
    if (admin_password) {
      await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('admin_password', ?)", [admin_password]);
    }
    if (kitchen_password) {
      await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('kitchen_password', ?)", [kitchen_password]);
    }
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// Get all orders for a table (for bill print)
router.get('/table/:tableId/bill', authMiddleware, async (req, res) => {
  try {
    const { tableId } = req.params;
    const table = await dbGet('SELECT * FROM tables WHERE id = ?', [tableId]);
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const orders = await dbAll(
      `SELECT * FROM orders WHERE table_id = ? AND DATE(datetime(created_at, '+3 hours')) = DATE(datetime('now', '+3 hours'))`,
      [tableId]
    );
    for (const order of orders) {
      order.items = await dbAll(`
        SELECT oi.*, COALESCE(oi.name_override, m.name) as name
        FROM order_items oi
        LEFT JOIN menu_items m ON oi.menu_item_id = m.id
        WHERE oi.order_id = ?`, [order.id]);
    }
    res.json({ table_number: table.table_number, orders });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// Get single order detail (admin)
router.get('/orders/:id', authMiddleware, async (req, res) => {
  try {
    const order = await dbGet(`
      SELECT o.*, t.table_number FROM orders o
      JOIN tables t ON o.table_id = t.id
      WHERE o.id = ?`, [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Not found' });
    const items = await dbAll(`
      SELECT oi.*, COALESCE(oi.name_override, m.name) as name, m.name as menu_name
      FROM order_items oi
      LEFT JOIN menu_items m ON oi.menu_item_id = m.id
      WHERE oi.order_id = ?`, [req.params.id]);
    res.json({ ...order, items });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// Edit order (admin) — ürün ekle/çıkar, indirim, ilave ücret
router.put('/orders/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { items, discount, extra_charge, extra_charge_label } = req.body;

    // order_items güncelle: önce hepsini sil, sonra yeniden ekle
    await dbRun('DELETE FROM order_items WHERE order_id = ?', [id]);
    for (const item of items) {
      await dbRun(
        'INSERT INTO order_items (order_id, menu_item_id, quantity, price_at_purchase, name_override) VALUES (?, ?, ?, ?, ?)',
        [id, item.menu_item_id || null, item.quantity, item.price_at_purchase, item.name_override || null]
      );
    }

    // Toplam hesapla
    const itemsTotal = items.reduce((s, i) => s + i.price_at_purchase * i.quantity, 0);
    const disc = parseFloat(discount) || 0;
    const extra = parseFloat(extra_charge) || 0;
    const newTotal = Math.max(0, itemsTotal - disc + extra);

    await dbRun(
      'UPDATE orders SET total_price = ?, discount = ?, extra_charge = ?, extra_charge_label = ? WHERE id = ?',
      [newTotal, disc, extra, extra_charge_label || '', id]
    );

    const updated = await dbGet('SELECT * FROM orders WHERE id = ?', [id]);
    const updatedItems = await dbAll(`
      SELECT oi.*, COALESCE(oi.name_override, m.name) as name
      FROM order_items oi LEFT JOIN menu_items m ON oi.menu_item_id = m.id
      WHERE oi.order_id = ?`, [id]);
    res.json({ ...updated, items: updatedItems });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// Get all orders (with filter)
router.get('/orders', authMiddleware, async (req, res) => {
  try {
    const { status, date } = req.query;
    let query = `
      SELECT
        o.id,
        o.table_id,
        t.table_number,
        o.status,
        o.total_price,
        o.created_at,
        o.completed_at,
        o.bill_requested_at,
        o.closed_at,
        COUNT(oi.id) as item_count
      FROM orders o
      JOIN tables t ON o.table_id = t.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
    `;

    const conditions = [];
    const params = [];

    if (status) {
      conditions.push(`o.status = ?`);
      params.push(status);
    }

    if (date) {
      conditions.push(`DATE(datetime(o.created_at, '+3 hours')) = ?`);
      params.push(date);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY o.id, t.table_number ORDER BY o.created_at DESC';

    const result = await dbAll(query, params);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get daily report
router.get('/daily-report', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const reportDate = date || new Date().toISOString().split('T')[0];

    const result = await dbGet(`
      SELECT 
        COUNT(DISTINCT id) as total_orders,
        COALESCE(SUM(total_price), 0) as total_revenue,
        COUNT(DISTINCT table_id) as unique_tables
      FROM orders
      WHERE DATE(datetime(created_at, '+3 hours')) = ?
    `, [reportDate]);

    res.json({
      date: reportDate,
      ...result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch daily report' });
  }
});

// Complete order
router.put('/orders/:id/complete', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await dbRun(
      'UPDATE orders SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['completed', id]
    );
    const io = req.app.get('io');
    io.emit('order:completed', { order_id: id });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to complete order' });
  }
});

// Close table (admin)
router.post('/table/:tableId/close', authMiddleware, async (req, res) => {
  try {
    const { tableId } = req.params;
    await dbRun('UPDATE tables SET status = ? WHERE id = ?', ['available', tableId]);
    await dbRun(
      `UPDATE orders SET status = 'closed', closed_at = CURRENT_TIMESTAMP
       WHERE table_id = ? AND status IN ('pending','completed') AND DATE(created_at,'localtime') = DATE('now','localtime')`,
      [tableId]
    );
    const io = req.app.get('io');
    io.emit('table:closed', { table_id: parseInt(tableId) });
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// Get all categories (admin)
router.get('/categories', authMiddleware, async (req, res) => {
  try {
    const cats = await dbAll('SELECT * FROM categories ORDER BY "order"');
    res.json(cats);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Add category
router.post('/categories', authMiddleware, async (req, res) => {
  try {
    const { name, image_url } = req.body;
    const maxOrder = await dbGet('SELECT MAX("order") as m FROM categories');
    const result = await dbRun(
      'INSERT INTO categories (name, "order", image_url, is_available) VALUES (?, ?, ?, 1)',
      [name, (maxOrder && maxOrder.m ? maxOrder.m : 0) + 1, image_url || null]
    );
    const cat = await dbGet('SELECT * FROM categories WHERE id = ?', [result.lastID]);
    res.status(201).json(cat);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// Update category
router.put('/categories/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, is_available, image_url } = req.body;
    const updates = []; const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (is_available !== undefined) { updates.push('is_available = ?'); params.push(is_available ? 1 : 0); }
    if (image_url !== undefined) { updates.push('image_url = ?'); params.push(image_url); }
    if (!updates.length) return res.status(400).json({ error: 'No fields' });
    params.push(id);
    await dbRun('UPDATE categories SET ' + updates.join(', ') + ' WHERE id = ?', params);
    const cat = await dbGet('SELECT * FROM categories WHERE id = ?', [id]);
    res.json(cat);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Delete category
router.delete('/categories/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await dbRun('DELETE FROM menu_items WHERE category_id = ?', [id]);
    await dbRun('DELETE FROM categories WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Add menu item (Admin)
router.post('/menu', authMiddleware, async (req, res) => {
  try {
    const { category_id, name, description, price, image_url } = req.body;
    const result = await dbRun(
      'INSERT INTO menu_items (category_id, name, description, price, image_url) VALUES (?, ?, ?, ?, ?)',
      [category_id, name, description, price, image_url]
    );
    
    const item = await dbGet('SELECT * FROM menu_items WHERE id = ?', [result.lastID]);
    res.status(201).json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add menu item' });
  }
});

// Update menu item (Admin)
router.put('/menu/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, image_url, is_available } = req.body;
    
    let sql = 'UPDATE menu_items SET ';
    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (price !== undefined) { updates.push('price = ?'); params.push(price); }
    if (image_url !== undefined) { updates.push('image_url = ?'); params.push(image_url); }
    if (is_available !== undefined) { updates.push('is_available = ?'); params.push(is_available ? 1 : 0); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    sql += updates.join(', ') + ' WHERE id = ?';
    params.push(id);

    await dbRun(sql, params);
    const item = await dbGet('SELECT * FROM menu_items WHERE id = ?', [id]);

    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Notify clients
    const io = req.app.get('io');
    io.emit('menu:updated', item);

    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// Delete menu item (Admin)
router.delete('/menu/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await dbRun('DELETE FROM menu_items WHERE id = ?', [id]);
    
    const io = req.app.get('io');
    io.emit('menu:deleted', { id });

    res.json({ success: true, message: 'Menu item deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

module.exports = router;
