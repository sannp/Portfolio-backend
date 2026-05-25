const express = require('express');
const cors = require('cors');
const config = require('config');
const mongoose = require('mongoose');
const axios = require('axios');
const dbManager = require('./database/dbConfig');

// Import project routes
const portfolioRoutes = require('./api/projects/portfolio/routes');
const aiRoutes = require('./api/ai/routes');
const researchRoutes = require('./api/research/routes');

const app = express();

// Setup CORS options dynamically
const getCorsOptions = () => {
  const options = config.has('cors') ? { ...config.get('cors') } : {};
  let corsOrigin = process.env.CORS_ORIGIN;
  if (corsOrigin) {
    if (corsOrigin.includes(',')) {
      options.origin = corsOrigin.split(',').map(o => o.trim());
    } else {
      options.origin = corsOrigin;
    }
  }
  return options;
};

app.use(cors(getCorsOptions()));
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  // Check database connections
  // Mongoose connection states: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  const dbStatus = {
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    postgresql: dbManager.connections.postgresql ? 'connected' : 'disconnected'
  };

  // Check external n8n server
  let n8nStatus = { status: 'unknown', url: process.env.N8N_SERVER_URL || 'https://n8n-server-wewk.onrender.com' };
  try {
    const n8nUrl = process.env.N8N_SERVER_URL || 'https://n8n-server-wewk.onrender.com';
    const response = await axios.get(`${n8nUrl}/healthz`, { timeout: 5000 });
    const isHealthy = response.status === 200 && response.data?.status === 'ok';
    n8nStatus = { status: isHealthy ? 'connected' : 'error', url: n8nUrl, health: response.data };
  } catch (error) {
    n8nStatus = { status: 'disconnected', url: process.env.N8N_SERVER_URL || 'https://n8n-server-wewk.onrender.com', error: error.message };
  }

  res.json({
    success: true,
    message: 'Server is running',
    data: {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '2.0.0',
      database: dbStatus,
      services: {
        n8n: n8nStatus
      }
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
                --primary: #3b82f6; /* blue */
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
            <p>High-performance backend serving AI integrations and portfolio management.</p>
            
            <div class="btn-group">
                <a href="/api/portfolio" class="btn btn-primary">
                    Portfolio API
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

module.exports = { app, initializeApp };
