const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const db = require('./config/database');
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize Database
const initDb = () => {
  const sqlFile = path.join(__dirname, 'database', 'init-sqlite.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');
  
  db.exec(sql, (err) => {
    if (err) {
      console.error('Database initialization error:', err);
    } else {
      console.log('Database initialized successfully!');
    }
  });
};

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });
app.set('upload', upload);

// Initialize DB on startup
initDb();

// Routes
app.use('/api/tables', require('./routes/tables'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/kitchen', require('./routes/kitchen'));

// Socket.io Events
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Hersey Egeden Backend is running' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = { app, io };
