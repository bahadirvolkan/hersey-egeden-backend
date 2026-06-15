const express = require('express');
const router = express.Router();
const db = require('../config/database');

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []));
});

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) { err ? reject(err) : resolve({ lastID: this.lastID }); });
});

const kitchenAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || !token.startsWith('kitchen-token-')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Login
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    const rows = await new Promise((resolve, reject) =>
      db.all("SELECT value FROM settings WHERE key = 'kitchen_password'", [], (err, rows) => err ? reject(err) : resolve(rows || []))
    );
    const kitchenPassword = rows.length > 0 ? rows[0].value : (process.env.KITCHEN_PASSWORD || 'mutfak123');
    if (password === kitchenPassword) {
      res.json({ success: true, token: 'kitchen-token-' + Date.now() });
    } else {
      res.status(401).json({ error: 'Hatalı şifre' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get active orders (pending)
router.get('/orders', kitchenAuth, async (req, res) => {
  try {
    const orders = await dbAll(`
      SELECT o.id, o.table_id, t.table_number, o.status, o.customer_note, o.total_price, o.created_at
      FROM orders o
      JOIN tables t ON o.table_id = t.id
      WHERE o.status = 'pending'
      ORDER BY o.created_at ASC
    `);

    for (let order of orders) {
      order.items = await dbAll(`
        SELECT oi.quantity, oi.price_at_purchase, m.name
        FROM order_items oi
        JOIN menu_items m ON oi.menu_item_id = m.id
        WHERE oi.order_id = ?
      `, [order.id]);
    }

    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get bill requests
router.get('/bill-requests', kitchenAuth, async (req, res) => {
  try {
    const tables = await dbAll(
      'SELECT * FROM tables WHERE status = ? ORDER BY table_number',
      ['bill_requested']
    );
    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Close table
router.post('/table/:tableId/close', kitchenAuth, async (req, res) => {
  try {
    const { tableId } = req.params;
    await dbRun('UPDATE tables SET status = ? WHERE id = ?', ['available', tableId]);
    await dbRun(
      `UPDATE orders SET status = 'closed', closed_at = CURRENT_TIMESTAMP
       WHERE table_id = ? AND status IN ('pending','completed') AND DATE(datetime(created_at, '+3 hours')) = DATE(datetime('now', '+3 hours'))`,
      [tableId]
    );
    const io = req.app.get('io');
    io.emit('table:closed', { table_id: parseInt(tableId) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Today's completed orders grouped by table
router.get('/completed', kitchenAuth, async (req, res) => {
  try {
    const orders = await dbAll(`
      SELECT o.id, o.table_id, t.table_number, t.status as table_status,
             o.total_price, o.created_at, o.completed_at, o.customer_note,
             o.discount, o.extra_charge, o.extra_charge_label,
             o.bill_requested_at, o.closed_at
      FROM orders o
      JOIN tables t ON o.table_id = t.id
      WHERE o.status IN ('completed', 'closed')
        AND DATE(datetime(o.created_at, '+3 hours')) = DATE(datetime('now', '+3 hours'))
      ORDER BY o.table_id, o.created_at ASC
    `);

    for (const order of orders) {
      order.items = await dbAll(`
        SELECT oi.quantity, oi.price_at_purchase,
               COALESCE(oi.name_override, m.name) as name
        FROM order_items oi
        LEFT JOIN menu_items m ON oi.menu_item_id = m.id
        WHERE oi.order_id = ?
      `, [order.id]);
    }

    // Masaya göre grupla
    const tableMap = {};
    for (const o of orders) {
      if (!tableMap[o.table_id]) {
        tableMap[o.table_id] = {
          table_id: o.table_id,
          table_number: o.table_number,
          table_status: o.table_status,
          orders: [],
          table_total: 0,
        };
      }
      tableMap[o.table_id].orders.push(o);
      tableMap[o.table_id].table_total += parseFloat(o.total_price) || 0;
    }

    res.json(Object.values(tableMap).sort((a, b) => a.table_number - b.table_number));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed' });
  }
});

// Complete order
router.put('/orders/:id/complete', kitchenAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await dbRun(
      'UPDATE orders SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['completed', id]
    );
    const io = req.app.get('io');
    io.emit('order:completed', { order_id: id });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to complete order' });
  }
});

module.exports = router;