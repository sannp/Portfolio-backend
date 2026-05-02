const express = require('express');
const cors = require('cors');
const config = require('config');
const dbManager = require('./database/dbConfig');

// Import project routes
const portfolioRoutes = require('./api/projects/portfolio/routes');
const aiRoutes = require('./api/ai/routes');
const researchRoutes = require('./api/research/routes');

const app = express();

// Middleware
app.use(express.json());
app.use(cors(config.has('cors') ? config.get('cors') : {}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    data: {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '2.0.0'
    }
  });
});

// API routes
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/research', researchRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.send('<h1>Welcome to Portfolio Backend API</h1>');
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    data: {
      path: req.originalUrl,
      method: req.method
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    data: process.env.NODE_ENV === 'development' ? err.stack : null
  });
});

// Initialize database connections
const initializeApp = async () => {
  try {
    await dbManager.initialize();
    console.log('✅ Database connections initialized');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};

module.exports = { app, initializeApp };
