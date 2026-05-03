const express = require('express');
const cors = require('cors');
const config = require('config');
const { createProxyMiddleware } = require('http-proxy-middleware');
const dbManager = require('./database/dbConfig');
const n8nService = require('./services/n8nService');

// Import project routes
const portfolioRoutes = require('./api/projects/portfolio/routes');
const aiRoutes = require('./api/ai/routes');
const researchRoutes = require('./api/research/routes');

const app = express();

// Middleware
app.use(express.json());
app.use(cors(config.has('cors') ? config.get('cors') : {}));

// n8n proxy middleware - must be before other routes
// Only proxy if n8n is enabled
if (process.env.N8N_ENABLED !== 'false') {
  const n8nProxy = createProxyMiddleware({
    target: `http://localhost:${process.env.N8N_PORT || 5678}`,
    changeOrigin: true,
    ws: true,
    pathRewrite: {
      '^/n8n/?': '/'
    },
    onProxyReq: (proxyReq, req, res) => {
      // n8n requires the host header to match its configured host
      proxyReq.setHeader('Host', req.headers.host);
    },
    onError: (err, req, res) => {
      console.error('n8n proxy error:', err.message);
      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          message: 'n8n service unavailable',
          data: {
            status: n8nService.getStatus(),
            error: err.message
          }
        });
      }
    },
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn'
  });

  app.use('/n8n', n8nProxy);
  console.log('🔧 n8n proxy configured at /n8n');
}

// Health check endpoint
app.get('/health', async (req, res) => {
  // Check database connections
  const dbStatus = {
    mongodb: dbManager.connections.mongodb?.readyState === 1 ? 'connected' : 'disconnected',
    postgresql: dbManager.connections.postgresql ? 'connected' : 'disconnected'
  };

  // Check n8n status
  const n8nStatus = process.env.N8N_ENABLED !== 'false' ? n8nService.getStatus() : { enabled: false };

  res.json({
    success: true,
    message: 'Server is running',
    data: {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '2.0.0',
      database: dbStatus,
      n8n: n8nStatus
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
