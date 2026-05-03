require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const { app, initializeApp } = require('./src/app');
const n8nService = require('./src/services/n8nService');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Initialize database connections
    await initializeApp();

    // Start n8n subprocess (if enabled)
    if (process.env.N8N_ENABLED !== 'false') {
      try {
        await n8nService.start();
      } catch (err) {
        console.error('⚠️  n8n failed to start, continuing without it:', err.message);
      }
    }

    // Create HTTP server (required for Socket.io)
    const server = http.createServer(app);

    // Setup Socket.io
    const io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
      }
    });

    // Setup research socket handlers
    const SocketHandler = require('./src/api/research/socketHandler');
    new SocketHandler(io);

    // Start the server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API docs: http://localhost:${PORT}/`);
      console.log(`🤖 AI endpoints: /api/ai/*`);
      console.log(`📁 Portfolio endpoints: /api/portfolio/*`);
      console.log(`🔬 Research endpoints: /api/research/*`);
      console.log(`🔌 Socket.io enabled for real-time research streaming`);
      if (process.env.N8N_ENABLED !== 'false' && n8nService.getStatus().isReady) {
        console.log(`⚡ n8n workflows: http://localhost:${PORT}/n8n/`);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  const dbManager = require('./src/database/dbConfig');
  await n8nService.stop();
  await dbManager.closeAll();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  const dbManager = require('./src/database/dbConfig');
  await n8nService.stop();
  await dbManager.closeAll();
  process.exit(0);
});

startServer();
