require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize DB and run migrations FIRST before anything else
const { initializeDatabase } = require('./db/migrate');
initializeDatabase();

// Import routes
const healthRoutes       = require('./routes/health');
const collectorRoutes    = require('./routes/collectors');
const recyclerRoutes     = require('./routes/recyclers');
const materialRoutes     = require('./routes/materials');
const priceRoutes        = require('./routes/prices');
const lotRoutes          = require('./routes/lots');
const transactionRoutes  = require('./routes/transactions');
const traceabilityRoutes = require('./routes/traceability');
const matchRoutes        = require('./routes/match');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logger (development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/health',        healthRoutes);
app.use('/api/collectors',    collectorRoutes);
app.use('/api/recyclers',     recyclerRoutes);
app.use('/api/materials',     materialRoutes);
app.use('/api/prices',        priceRoutes);
app.use('/api/lots',          lotRoutes);
app.use('/api/transactions',  transactionRoutes);
app.use('/api/traceability',  traceabilityRoutes);
app.use('/api/match',         matchRoutes);

// ─── Root ─────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'Kabadiwala Connect API',
    version: '1.0.0',
    description: 'Backend API for the Kabadiwala Connect e-waste / scrap platform',
    docs: '/api/health',
  });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Kabadiwala Connect API running on http://localhost:${PORT}`);
  console.log(`📦 Health check: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
