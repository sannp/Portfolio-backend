require('dotenv').config();
const http = require('http');
const config = require('config');
const { Server } = require('socket.io');
const { app, initializeApp } = require('./src/app');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Initialize database connections
    await initializeApp();

    // Create HTTP server (required for Socket.io)
    const server = http.createServer(app);

    // Setup Socket.io
    const corsOptions = config.has('cors') ? { ...config.get('cors') } : {};
    let corsOrigin = process.env.CORS_ORIGIN;
    if (corsOrigin) {
      if (corsOrigin.includes(',')) {
        corsOrigin = corsOrigin.split(',').map(o => o.trim());
      }
    } else {
      corsOrigin = corsOptions.origin || '*';
    }

    const io = new Server(server, {
      cors: {
        origin: corsOrigin,
        methods: ['GET', 'POST'],
        credentials: corsOptions.credentials
      },
      destroyUpgrade: false
    });

    // Setup research socket handlers
    const SocketHandler = require('./src/api/research/socketHandler');
    new SocketHandler(io);

    // Setup portfolio chat socket handlers
    const PortfolioSocketHandler = require('./src/api/projects/portfolio/socketHandler');
    new PortfolioSocketHandler(io);

    // Start the server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API docs: http://localhost:${PORT}/`);
      console.log(`🤖 AI endpoints: /api/ai/*`);
      console.log(`📁 Portfolio endpoints: /api/portfolio/*`);
      console.log(`🔬 Research endpoints: /api/research/*`);
      console.log(`💬 Portfolio Chat: /api/portfolio/chat/*`);
      console.log(`🔌 Socket.io enabled for real-time research and portfolio chat`);
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
  await dbManager.closeAll();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  const dbManager = require('./src/database/dbConfig');
  await dbManager.closeAll();
  process.exit(0);
});

startServer();
