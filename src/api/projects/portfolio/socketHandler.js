/**
 * Socket Handler - Manages real-time portfolio chat connections
 * Follows pattern from research socket handler with portfolio chat events
 */

const { chatController } = require('./controllers/chatController');

// Simple in-memory rate limiting
const ipRequestCounts = new Map();
const MAX_REQUESTS_PER_IP = parseInt(process.env.MAX_CHAT_REQUESTS_PER_IP) || 10;

// Reset quotas every hour
setInterval(() => {
  ipRequestCounts.clear();
  console.log('[Portfolio Chat Rate Limit] Flushed all IP request quotas.');
}, 60 * 60 * 1000);

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`[Portfolio Chat] Client connected: ${socket.id}`);

      // Initialize chat session
      socket.on('portfolio:chat:connect', async (payload) => {
        const sessionId = payload?.sessionId || socket.id;
        console.log(`[Portfolio Chat] Session initialized: ${sessionId}`);

        // Emit success response
        socket.emit('portfolio:chat:connected', {
          success: true,
          sessionId,
          message: 'Portfolio chat session initialized',
          timestamp: new Date().toISOString()
        });
      });

      // Process portfolio chat question
      socket.on('portfolio:chat:message', async (payload) => {
        const sessionId = payload?.sessionId || socket.id;
        const message = payload?.message;

        console.log(`[Portfolio Chat] Message received [Session: ${sessionId}]: ${message}`);

        // Rate limiting
        const clientIpHeader = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
        const ipString = Array.isArray(clientIpHeader) ? clientIpHeader[0] : (clientIpHeader || 'unknown');
        const ip = ipString.split(',')[0].trim();

        const currentCount = ipRequestCounts.get(ip) || 0;
        if (currentCount >= MAX_REQUESTS_PER_IP) {
          console.log(`[Portfolio Chat Rate Limit] IP ${ip} exceeded quota. Current: ${currentCount}`);
          socket.emit('portfolio:chat:error', {
            message: 'Rate limit exceeded. Maximum 10 requests per hour per IP.',
            type: 'rate_limit'
          });
          return;
        }
        ipRequestCounts.set(ip, currentCount + 1);

        if (!message) {
          socket.emit('portfolio:chat:error', {
            message: 'Missing message field',
            type: 'validation_error'
          });
          return;
        }

        // Emit typing indicator
        socket.emit('portfolio:chat:typing', {
          isTyping: true
        });

        try {
          // Process message through chat controller
          const response = await chatController.processMessage(sessionId, message);

          // Emit typing indicator stopped
          socket.emit('portfolio:chat:typing', {
            isTyping: false
          });

          if (response.success) {
            // Stream the response in chunks for real-time effect
            const chunkSize = 20;
            for (let i = 0; i < response.message.length; i += chunkSize) {
              const chunk = response.message.slice(i, i + chunkSize);
              socket.emit('portfolio:chat:token', chunk);
              
              // Small delay for natural typing effect
              await new Promise(resolve => setTimeout(resolve, 30));
            }

            // Emit complete response
            socket.emit('portfolio:chat:response', {
              success: true,
              message: response.message,
              metadata: response.metadata,
              timestamp: new Date().toISOString()
            });

          } else {
            // Emit error response
            socket.emit('portfolio:chat:error', {
              message: response.message,
              type: response.metadata?.error || 'processing_error',
              timestamp: new Date().toISOString()
            });
          }

        } catch (error) {
          console.error(`[Portfolio Chat] Error processing message:`, error);

          // Stop typing indicator
          socket.emit('portfolio:chat:typing', {
            isTyping: false
          });

          socket.emit('portfolio:chat:error', {
            message: 'An error occurred processing your request. Please try again.',
            type: 'server_error',
            timestamp: new Date().toISOString()
          });
        }
      });

      // Clear conversation history
      socket.on('portfolio:chat:clear', async (payload) => {
        const sessionId = payload?.sessionId || socket.id;
        console.log(`[Portfolio Chat] Clearing history [Session: ${sessionId}]`);

        chatController.clearHistory(sessionId);

        socket.emit('portfolio:chat:cleared', {
          success: true,
          message: 'Conversation history cleared',
          timestamp: new Date().toISOString()
        });
      });

      // Get conversation history
      socket.on('portfolio:chat:history', async (payload) => {
        const sessionId = payload?.sessionId || socket.id;
        console.log(`[Portfolio Chat] Getting history [Session: ${sessionId}]`);

        const history = chatController.getHistory(sessionId);

        socket.emit('portfolio:chat:history', {
          success: true,
          history,
          timestamp: new Date().toISOString()
        });
      });

      // Disconnect handler
      socket.on('portfolio:chat:disconnect', async (payload) => {
        const sessionId = payload?.sessionId || socket.id;
        console.log(`[Portfolio Chat] Session disconnected: ${sessionId}`);

        // Optional: Clear history on disconnect
        // chatController.clearHistory(sessionId);
      });

      // Socket disconnect
      socket.on('disconnect', () => {
        console.log(`[Portfolio Chat] Client disconnected: ${socket.id}`);
      });
    });
  }
}

module.exports = SocketHandler;
