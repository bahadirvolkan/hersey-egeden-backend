const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all tables
router.get('/', async (req, res) => {
  try {
    db.all('SELECT * FROM tables ORDER BY table_number', [], (err, rows) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch tables' });
      } else {
        res.json(rows);
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

// Get specific table
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    db.get('SELECT * FROM tables WHERE id = ?', [id], (err, row) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch table' });
      } else if (!row) {
        res.status(404).json({ error: 'Table not found' });
      } else {
        res.json(row);
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch table' });
  }
});

module.exports = router;
