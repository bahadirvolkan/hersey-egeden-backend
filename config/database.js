const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const dbPath = path.join(__dirname, '..', 'hersey_egeden.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to SQLite database at', dbPath);
    db.run('PRAGMA foreign_keys = ON');
    runMigrations(db);
  }
});

function runMigrations(db) {
  const migrations = [
    `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('admin_password', 'admin123')`,
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('kitchen_password', 'mutfak123')`,
    `ALTER TABLE orders ADD COLUMN discount DECIMAL(10,2) DEFAULT 0`,
    `ALTER TABLE orders ADD COLUMN extra_charge DECIMAL(10,2) DEFAULT 0`,
    `ALTER TABLE orders ADD COLUMN extra_charge_label TEXT DEFAULT ''`,
    `ALTER TABLE order_items ADD COLUMN name_override TEXT`,
    `ALTER TABLE categories ADD COLUMN is_available INTEGER DEFAULT 1`,
    `ALTER TABLE orders ADD COLUMN bill_requested_at DATETIME`,
    `ALTER TABLE orders ADD COLUMN closed_at DATETIME`,
    `ALTER TABLE menu_items ADD COLUMN "order" INTEGER DEFAULT 0`,
    `ALTER TABLE orders ADD COLUMN payment_nakit DECIMAL(10,2) DEFAULT 0`,
    `ALTER TABLE orders ADD COLUMN payment_kk DECIMAL(10,2) DEFAULT 0`,
    `ALTER TABLE orders ADD COLUMN payment_yemek DECIMAL(10,2) DEFAULT 0`,
    `CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      description TEXT,
      amount DECIMAL(10,2) NOT NULL,
      payment_method TEXT DEFAULT 'nakit',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  ];
  let i = 0;
  const next = () => {
    if (i >= migrations.length) return;
    const sql = migrations[i++];
    db.run(sql, [], (err) => {
      if (err && !err.message.includes('duplicate column') && !err.message.includes('already exists')) {
        console.error('Migration error:', err.message);
      }
      next();
    });
  };
  next();
}

db.query = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      this.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve({ rows: rows || [] });
      });
    } else {
      this.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ rows: [], changes: this.changes });
      });
    }
  });
};

module.exports = db;
