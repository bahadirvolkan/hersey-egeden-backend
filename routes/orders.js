const express = require('express');
const router = express.Router();
const db = require('../config/database');

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

// Create new order
router.post('/', async (req, res) => {
  try {
    const { table_id, items, customer_note } = req.body;

    // Validate table
    const table = await dbGet('SELECT * FROM tables WHERE id = ?', [table_id]);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Calculate total price
    let total_price = 0;
    for (let item of items) {
      const menuItem = await dbGet('SELECT price FROM menu_items WHERE id = ?', [item.menu_item_id]);
      if (!menuItem) {
        return res.status(404).json({ error: `Menu item ${item.menu_item_id} not found` });
      }
      total_price += menuItem.price * item.quantity;
    }

    // Create order
    const orderResult = await dbRun(
      'INSERT INTO orders (table_id, customer_note, total_price, status) VALUES (?, ?, ?, ?)',
      [table_id, customer_note || null, total_price, 'pending']
    );

    const order_id = orderResult.lastID;

    // Add order items
    for (let item of items) {
      const menuItem = await dbGet('SELECT price FROM menu_items WHERE id = ?', [item.menu_item_id]);
      await dbRun(
        'INSERT INTO order_items (order_id, menu_item_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?)',
        [order_id, item.menu_item_id, item.quantity, menuItem.price]
      );
    }

    // Emit socket event
    const io = req.app.get('io');
    io.emit('order:created', { order_id, table_id, total_price });

    // Emit print event — local print-agent listens and prints
    const itemsForPrint = await Promise.all(items.map(async (item) => {
      const m = await dbGet('SELECT name, price FROM menu_items WHERE id = ?', [item.menu_item_id]);
      return { name: m ? m.name : '', quantity: item.quantity, price_at_purchase: m ? m.price : 0 };
    }));
    io.emit('print:order', {
      id: order_id,
      table_number: table.table_number,
      total_price,
      customer_note,
      items: itemsForPrint,
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order_id,
      total_price
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Request bill
router.post('/table/:tableId/bill-request', async (req, res) => {
  try {
    const { tableId } = req.params;
    const table = await dbGet('SELECT * FROM tables WHERE id = ?', [tableId]);
    if (!table) return res.status(404).json({ error: 'Table not found' });
    await dbRun('UPDATE tables SET status = ? WHERE id = ?', ['bill_requested', tableId]);
    await dbRun(
      `UPDATE orders SET bill_requested_at = CURRENT_TIMESTAMP WHERE table_id = ? AND status IN ('pending','completed') AND bill_requested_at IS NULL`,
      [tableId]
    );
    const io = req.app.get('io');
    io.emit('bill:requested', { table_id: parseInt(tableId), table_number: table.table_number });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed' });
  }
});

// Get orders by table
router.get('/table/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;
    const orders = await dbAll(
      `SELECT * FROM orders WHERE table_id = ? AND status != 'closed' AND DATE(datetime(created_at, '+3 hours')) = DATE(datetime('now', '+3 hours')) ORDER BY created_at DESC`,
      [tableId]
    );
    for (let order of orders) {
      order.items = await dbAll(`
        SELECT oi.quantity, oi.price_at_purchase, m.name
        FROM order_items oi
        JOIN menu_items m ON oi.menu_item_id = m.id
        WHERE oi.order_id = ?
      `, [order.id]);
    }
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get order by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const order = await dbGet('SELECT * FROM orders WHERE id = ?', [id]);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const items = await dbAll(`
      SELECT oi.*, m.name, m.price 
      FROM order_items oi
      JOIN menu_items m ON oi.menu_item_id = m.id
      WHERE oi.order_id = ?
    `, [id]);

    order.items = items;
    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

module.exports = router;
