require('dotenv').config();
const { app, initializeApp } = require('./src/app');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Initialize database connections
    await initializeApp();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API docs: http://localhost:${PORT}/`);
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
