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

    // Setup personal chat socket handlers
    const PersonalSocketHandler = require('./src/api/projects/personal/socketHandler');
    new PersonalSocketHandler(io);

    // Start the server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
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

// Uncaught exception handler — alert and exit
process.on('uncaughtException', async (error) => {
  console.error('💥 Uncaught Exception:', error);
  try {
    const whatsappService = require('./src/services/whatsappService');
    await whatsappService.sendAlert(`Uncaught Exception: ${error.message}`);
  } catch (_) { /* best effort */ }
  process.exit(1);
});

// Unhandled promise rejection handler — alert
process.on('unhandledRejection', async (reason) => {
  console.error('💥 Unhandled Rejection:', reason);
  try {
    const whatsappService = require('./src/services/whatsappService');
    await whatsappService.sendAlert(`Unhandled Rejection: ${reason}`);
  } catch (_) { /* best effort */ }
});

startServer();
