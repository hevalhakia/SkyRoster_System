const express = require('express');
const cors = require('cors');
const { login, authenticateToken } = require('./auth');

const app = express();
const port = 3000;

console.log('INDEX.JS LOADED');

// ========================================
//  CORS MIDDLEWARE (Preflight dahil)
// ========================================
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Allow all localhost/127.0.0.1 ports for development
    const allowedOrigins = [
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://localhost:5501',
      'http://127.0.0.1:5501'
    ];
    
    // Check if origin is localhost on any port
    if (origin.match(/^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):\d+$/)) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
};

app.use(cors(corsOptions));

console.log('CORS MIDDLEWARE APPLIED');

app.use(express.json());

// ========================================
//  MySQL Pool
// ========================================
const mysql = require('mysql2/promise');

// Use environment variables when available, otherwise default to local dev values
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'apiuser';
const DB_PASS = process.env.DB_PASS || 'apipassword';
const DB_NAME = process.env.DB_NAME || 'new_schemaSkyroster_db';

let pool;
try {
  pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  console.log('MySQL pool created for', DB_USER + '@' + DB_HOST, 'DB:', DB_NAME);
} catch (err) {
  console.error('Failed to create MySQL pool:', err.message);
  pool = null;
}

// ========================================
//  AUTH ROUTES
// ========================================

// POST /auth/login  → JWT üretir
app.post('/auth/login', (req, res) => {
  console.log('POST /auth/login called');
  login(req, res, pool);
});

// Basit health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========================================
//  PROTECTED ROUTES (JWT zorunlu)
// ========================================

const flightsRouter = require('./routes/flights')(pool);
const cabinCrewRouter = require('./routes/cabinCrew')(pool);
const vehicleTypesRouter = require('./routes/vehicleTypes')(pool);
const menusRouter = require('./routes/menus')(pool);
const rolesRouter = require('./routes/roles')(pool);
const passengersRouter = require('./routes/passengers')(pool);
const rosterRouter = require('./routes/roster')(pool);

app.use('/flights', authenticateToken, flightsRouter);
app.use('/cabincrew', authenticateToken, cabinCrewRouter);
app.use('/vehicletypes', authenticateToken, vehicleTypesRouter);
app.use('/menus', authenticateToken, menusRouter);
app.use('/roles', authenticateToken, rolesRouter);
app.use('/passengers', authenticateToken, passengersRouter);
app.use('/roster', authenticateToken, rosterRouter);

// ========================================
//  404 ve ERROR HANDLER (opsiyonel)
// ========================================
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

app.use((err, req, res, next) => {
  console.error('UNHANDLED ERROR:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// ========================================
//  EXPORT APP & START SERVER
// ========================================
module.exports = app;

// Start server only if this file is run directly (not imported for testing)
if (require.main === module) {
  app.listen(port, '0.0.0.0', () => {
    console.log('*** INDEX.JS SERVER STARTED ***');
    console.log(`Listening at http://0.0.0.0:${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
  });
}
