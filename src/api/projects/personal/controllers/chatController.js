/**
 * Chat Controller - Handles chat message processing for recruiter chatbot
 * Integrates guardrail service, context builder (RAG), and AI service
 * Includes conversation history management with TTL for memory efficiency
 */

const express = require('express');
const router = express.Router();

const aiService = require('#services/aiService');
const guardrailService = require('../services/guardrailService');
const contextBuilder = require('../services/contextBuilder');
const dbManager = require('#database/dbConfig');

// Conversation history cleanup interval (5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
// Conversation history TTL (30 minutes)
const CONVERSATION_TTL = 30 * 60 * 1000;

class ChatController {
  constructor() {
    this.conversationHistory = new Map(); // Store conversation history by session ID
    this.lastActivity = new Map(); // Track last activity time for TTL
    this.startCleanupInterval();
  }

  /**
   * Start cleanup interval for old conversations
   * @private
   */
  startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      try {
        const now = Date.now();
        let cleanedCount = 0;

        this.lastActivity.forEach((lastActive, sessionId) => {
          if (now - lastActive > CONVERSATION_TTL) {
            this.conversationHistory.delete(sessionId);
            this.lastActivity.delete(sessionId);
            cleanedCount++;
          }
        });

        if (cleanedCount > 0) {
          console.log(`[ChatController] Cleaned up ${cleanedCount} expired conversations`);
        }
      } catch (error) {
        console.error('[ChatController] Error during cleanup interval:', error);
      }
    }, CLEANUP_INTERVAL);
  }

  /**
   * Stop cleanup interval (for graceful shutdown)
   */
  stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('[ChatController] Cleanup interval stopped');
    }
  }

  /**
   * Update last activity time for a session
   * @private
   */
  updateActivity(sessionId) {
    this.lastActivity.set(sessionId, Date.now());
  }

  /**
   * Process a chat message and return AI response
   * @param {String} sessionId - Session identifier
   * @param {String} message - User's message
   * @returns {Promise<Object>} Response with AI answer and metadata
   */
  async processMessage(sessionId, message) {
    try {
      // Get current resume (use portfolio-specific PostgreSQL connection)
      const pool = dbManager.getPortfolioPostgresConnection() || dbManager.getPostgresConnection();
      if (!pool) {
        return {
          success: false,
          message: 'No resume data available. Please create a resume first.',
          metadata: {
            error: 'no_resume'
          }
        };
      }

      const resumeQuery = 'SELECT * FROM resumes ORDER BY updated_at DESC LIMIT 1';
      const resumeResult = await pool.query(resumeQuery);

      if (resumeResult.rows.length === 0) {
        return {
          success: false,
          message: 'No resume data available. Please create a resume first.',
          metadata: {
            error: 'no_resume'
          }
        };
      }

      const resumeId = resumeResult.rows[0].id;

      // Step 1: Guardrail check
      const guardrailResult = await guardrailService.checkQuestion(message);
      
      if (!guardrailResult.isAllowed) {
        return {
          success: false,
          message: guardrailResult.reason,
          metadata: {
            guardrail: 'blocked',
            reason: guardrailResult.reason
          }
        };
      }

      // Step 2: Build context using RAG
      const contextResult = await contextBuilder.buildContext(resumeId, message);

      if (!contextResult.success) {
        return {
          success: false,
          message: 'I apologize, but I could not find relevant information in the resume to answer your question. Please try rephrasing or ask about a different topic.',
          metadata: {
            context: 'not_found'
          }
        };
      }

      // Step 3: Build conversation with context
      const systemPrompt = this._buildSystemPrompt(contextResult.context, resumeResult.rows[0]);

      // Get or initialize conversation history
      let history = this.conversationHistory.get(sessionId) || [];
      
      // Add current message to history
      history.push({
        role: 'user',
        content: message
      });

      // Update activity time
      this.updateActivity(sessionId);

      // Build messages array with system prompt and history
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        ...history.slice(-5) // Keep last 5 messages for context
      ];

      // Step 4: Call AI service with fallback between providers
      const aiResult = await aiService.chat(messages, {
        provider: 'gemini', // Will fallback to other providers
        fallback: true,
        maxTokens: 1000
      });

      if (!aiResult.success) {
        // Return a helpful error message instead of throwing
        const errorDetails = aiResult.error || 'Unknown error';
        console.error('[ChatController] AI service failed:', errorDetails);
        
        return {
          success: false,
          message: 'I apologize, but the AI service is currently unavailable. This could be due to API credit issues or service outages. Please try again later or contact support.',
          metadata: {
            error: 'ai_service_unavailable',
            details: errorDetails,
            fallback: 'If you have resume data, you can still view it via the resume endpoints while AI services are being restored.'
          }
        };
      }

      const aiResponse = aiResult.data.response || aiResult.data.content || aiResult.data.message;

      if (!aiResponse) {
        return {
          success: false,
          message: 'I apologize, but the AI service returned an empty response. Please try your question again.',
          metadata: {
            error: 'empty_ai_response',
            fallback: 'If you have resume data, you can still view it via the resume endpoints.'
          }
        };
      }

      // Add AI response to history
      history.push({
        role: 'assistant',
        content: aiResponse
      });

      // Update conversation history and activity
      this.conversationHistory.set(sessionId, history);
      this.updateActivity(sessionId);

      // Sanitize response to remove potential PII
      const sanitizedResponse = guardrailService.sanitizeResponse(aiResponse);

      return {
        success: true,
        message: sanitizedResponse,
        metadata: {
          provider: aiResult.provider,
          model: aiResult.model,
          contextChunks: contextResult.metadata.totalChunks,
          guardrail: 'passed'
        }
      };

    } catch (error) {
      console.error('Error processing chat message:', error);
      return {
        success: false,
        message: 'I apologize, but I encountered an error processing your request. Please try again.',
        metadata: {
          error: error.message
        }
      };
    }
  }

  /**
   * Build system prompt with resume context
   * @private
   */
  _buildSystemPrompt(context, resume) {
    let prompt = `You are a professional recruiter assistant helping answer questions about a candidate named ${resume.name || 'the candidate'}.

Your role is to provide accurate, professional information based ONLY on the resume data provided below.

${context}

Guidelines:
- Answer questions professionally and concisely
- If the information is not available in the context, clearly state that
- Do not make assumptions or add information not present in the resume
- Focus on professional qualifications, experience, and skills
- Be helpful but maintain professional boundaries
- Use specific details from the resume when available
- If asked about availability, location preferences, or salary expectations, only answer if explicitly stated in the resume
- Do not answer questions about personal life, family, health, politics, or religion
- If a question is outside the scope of professional recruiting, politely decline and redirect to resume-related topics`;

    return prompt;
  }

  /**
   * Clear conversation history for a session
   * @param {String} sessionId - Session identifier
   */
  clearHistory(sessionId) {
    this.conversationHistory.delete(sessionId);
    this.lastActivity.delete(sessionId);
  }

  /**
   * Get conversation history for a session
   * @param {String} sessionId - Session identifier
   * @returns {Array} Conversation history
   */
  getHistory(sessionId) {
    return this.conversationHistory.get(sessionId) || [];
  }

  /**
   * Process message without context (fallback mode)
   * Used when RAG context is not available
   * @param {String} sessionId - Session identifier
   * @param {String} message - User's message
   * @returns {Promise<Object>} Response
   */
  async processMessageWithoutContext(sessionId, message) {
    try {
      // Guardrail check
      const guardrailResult = await guardrailService.checkQuestion(message);
      
      if (!guardrailResult.isAllowed) {
        return {
          success: false,
          message: guardrailResult.reason,
          metadata: {
            guardrail: 'blocked'
          }
        };
      }

      const systemPrompt = `You are a professional recruiter assistant. 
Unfortunately, resume data is not currently available. 
Please inform the user that they need to create a resume first, and suggest they contact support if this seems like an error.
Be polite and professional.`;

      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: message
        }
      ];

      const aiResult = await aiService.chat(messages, {
        provider: 'gemini',
        fallback: true,
        maxTokens: 500
      });

      if (!aiResult.success) {
        console.error('[ChatController] AI service failed (no context):', aiResult.error || 'Unknown error');
        return {
          success: false,
          message: 'I apologize, but the AI service is currently unavailable. Resume data is also not available. Please create a resume first and ensure AI services are configured.',
          metadata: {
            error: 'ai_service_unavailable',
            context: 'unavailable',
            details: aiResult.error || 'Unknown error'
          }
        };
      }

      const aiResponse = aiResult.data.response || aiResult.data.content || aiResult.data.message;

      return {
        success: true,
        message: aiResponse,
        metadata: {
          provider: aiResult.provider,
          model: aiResult.model,
          context: 'unavailable'
        }
      };

    } catch (error) {
      console.error('Error processing message without context:', error);
      return {
        success: false,
        message: 'Resume data is currently unavailable. Please try again later or contact support.',
        metadata: {
          error: error.message
        }
      };
    }
  }
}

// Export singleton instance
const chatController = new ChatController();

// REST API endpoints for chat
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Portfolio Chat API v1',
    data: {
      status: 'active',
      endpoints: [
        'POST /message',
        'GET /history/:sessionId',
        'DELETE /history/:sessionId',
        'GET /health'
      ]
    }
  });
});

router.post('/message', async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
        data: null
      });
    }

    const sessionIdFinal = sessionId || req.ip || 'default-session';
    const result = await chatController.processMessage(sessionIdFinal, message);

    res.json(result);
  } catch (error) {
    console.error('Error in /chat/message:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing message',
      data: null
    });
  }
});

router.delete('/history/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    chatController.clearHistory(sessionId);

    res.json({
      success: true,
      message: 'Conversation history cleared',
      data: { sessionId }
    });
  } catch (error) {
    console.error('Error clearing history:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing history',
      data: null
    });
  }
});

router.get('/history/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = chatController.getHistory(sessionId);

    res.json({
      success: true,
      message: 'Conversation history retrieved',
      data: { history }
    });
  } catch (error) {
    console.error('Error getting history:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting history',
      data: null
    });
  }
});

// Health check for chat service
router.get('/health', (req, res) => {
  const pool = dbManager.getPortfolioPostgresConnection() || dbManager.getPostgresConnection();
  
  res.json({
    success: true,
    message: 'Chat service is running',
    data: {
      timestamp: new Date().toISOString(),
      database: pool ? 'connected' : 'disconnected',
      conversations: chatController.conversationHistory.size,
      features: ['rag-context', 'guardrails', 'multi-provider-ai', 'memory-management']
    }
  });
});

// Export both the controller instance and the router for socket handler
module.exports = { chatController, router };
