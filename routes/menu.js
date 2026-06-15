const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Helper function for promises
const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
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

// Get all menu items with categories
router.get('/', async (req, res) => {
  try {
    const showAll = req.query.all === '1';
    const categories = await dbAll(
      showAll ? 'SELECT * FROM categories ORDER BY "order"'
              : 'SELECT * FROM categories WHERE is_available = 1 ORDER BY "order"'
    );

    for (let cat of categories) {
      const sql = showAll
        ? 'SELECT * FROM menu_items WHERE category_id = ? ORDER BY "order", id'
        : 'SELECT * FROM menu_items WHERE category_id = ? AND is_available = 1 ORDER BY "order", id';
      cat.items = await dbAll(sql, [cat.id]);
    }

    const result = showAll ? categories : categories.filter(c => c.items.length > 0);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

// Get specific menu item
router.get('/item/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const item = await dbGet('SELECT * FROM menu_items WHERE id = ?', [id]);
    
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch menu item' });
  }
});

module.exports = router;
