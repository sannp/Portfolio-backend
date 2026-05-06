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

// n8n proxy middleware - must be before other routes and body parsers
// Proxy is always enabled to allow external n8n processes

// Main n8n proxy - passes paths as-is (n8n configured with N8N_PATH=/n8n/)
const n8nProxy = createProxyMiddleware({
  target: `http://localhost:${process.env.N8N_PORT || 5678}`,
  changeOrigin: true,
  ws: true,
  pathRewrite: { '^/n8n/': '/' },
  onProxyReq: (proxyReq, req, res) => {
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

// Static asset proxy - forward to n8n's /assets/ path
const n8nAssetProxy = createProxyMiddleware({
  target: `http://localhost:${process.env.N8N_PORT || 5678}`,
  changeOrigin: true,
  pathRewrite: { '^/': '/assets/' },
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('Host', req.headers.host);
  },
  onError: (err, req, res) => {
    console.error('n8n asset proxy error:', err.message);
    if (!res.headersSent) res.status(503).send('n8n asset service unavailable');
  },
  logLevel: 'warn'
});

// REST API proxy - forward to n8n's /rest/ path
const n8nRestProxy = createProxyMiddleware({
  target: `http://localhost:${process.env.N8N_PORT || 5678}`,
  changeOrigin: true,
  ws: true,
  pathRewrite: { '^/': '/rest/' },
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('Host', req.headers.host);
  },
  onError: (err, req, res) => {
    console.error('n8n rest proxy error:', err.message);
    if (!res.headersSent) res.status(503).send('n8n rest service unavailable');
  },
  logLevel: 'warn'
});

// Webhook proxy - forward to n8n's /webhook/ path
const n8nWebhookProxy = createProxyMiddleware({
  target: `http://localhost:${process.env.N8N_PORT || 5678}`,
  changeOrigin: true,
  pathRewrite: { '^/': '/webhook/' },
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('Host', req.headers.host);
  },
  onError: (err, req, res) => {
    console.error('n8n webhook proxy error:', err.message);
    if (!res.headersSent) res.status(503).send('n8n webhook service unavailable');
  },
  logLevel: 'warn'
});

app.use('/n8n', n8nProxy);
app.use('/assets', n8nAssetProxy);
app.use('/rest', n8nRestProxy);
app.use('/webhook', n8nWebhookProxy);
console.log('🔧 n8n proxy: /n8n, /assets, /rest, /webhook configured');

// Standard Middleware (must be after proxy)
app.use(express.json());
app.use(cors(config.has('cors') ? config.get('cors') : {}));

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
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Portfolio Backend API</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
        <style>
            :root {
                --primary: #FF6C37; /* n8n orange */
                --bg: #0b0e14;
                --card-bg: rgba(23, 28, 38, 0.8);
                --text: #f1f5f9;
                --accent: #3b82f6;
            }
            body {
                font-family: 'Outfit', sans-serif;
                background-color: var(--bg);
                color: var(--text);
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background-image: 
                    radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.05) 0%, transparent 40%),
                    radial-gradient(circle at 80% 80%, rgba(255, 108, 55, 0.05) 0%, transparent 40%);
            }
            .container {
                text-align: center;
                padding: 3.5rem 2.5rem;
                background: var(--card-bg);
                backdrop-filter: blur(20px);
                border-radius: 32px;
                border: 1px solid rgba(255, 255, 255, 0.08);
                box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.7);
                max-width: 480px;
                width: 90%;
                position: relative;
                overflow: hidden;
            }
            .container::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, var(--accent), var(--primary));
            }
            .icon-wrapper {
                width: 64px;
                height: 64px;
                background: rgba(255, 255, 255, 0.03);
                border-radius: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 1.5rem;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            h1 {
                font-size: 2.25rem;
                font-weight: 600;
                margin: 0 0 1rem;
                letter-spacing: -0.02em;
                background: linear-gradient(135deg, #fff 0%, #94a3b8 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            p {
                color: #94a3b8;
                margin-bottom: 2.5rem;
                line-height: 1.6;
                font-size: 1.05rem;
            }
            .btn-group {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 0.9rem 2rem;
                border-radius: 16px;
                font-weight: 600;
                text-decoration: none;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                cursor: pointer;
                border: none;
                font-size: 1rem;
            }
            .btn-primary {
                background: var(--primary);
                color: white;
                box-shadow: 0 10px 25px -5px rgba(255, 108, 55, 0.4);
            }
            .btn-primary:hover {
                transform: translateY(-3px);
                box-shadow: 0 15px 30px -5px rgba(255, 108, 55, 0.5);
                filter: brightness(1.1);
            }
            .btn-secondary {
                background: rgba(255, 255, 255, 0.04);
                color: #e2e8f0;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            .btn-secondary:hover {
                background: rgba(255, 255, 255, 0.08);
                border-color: rgba(255, 255, 255, 0.2);
                transform: translateY(-2px);
            }
            .status-badge {
                display: inline-flex;
                align-items: center;
                padding: 6px 12px;
                background: rgba(16, 185, 129, 0.1);
                color: #10b981;
                border-radius: 100px;
                font-size: 0.75rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-bottom: 1.5rem;
                gap: 6px;
            }
            .dot {
                width: 6px;
                height: 6px;
                background-color: #10b981;
                border-radius: 50%;
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
                70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
                100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="status-badge">
                <div class="dot"></div>
                API Online
            </div>
            <h1>Portfolio Core</h1>
            <p>High-performance backend serving AI integrations and automated workflows via n8n.</p>
            
            <div class="btn-group">
                <a href="/n8n/" class="btn btn-primary">
                    Launch n8n Workflows
                </a>
                <a href="/health" class="btn btn-secondary">
                    System Health Check
                </a>
            </div>
        </div>
    </body>
    </html>
  `);
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

module.exports = { app, initializeApp, n8nProxy };
