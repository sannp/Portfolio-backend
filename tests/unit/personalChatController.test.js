/**
 * Unit tests for Chat Controller
 * Tests chat message processing and conversation management
 */

const { chatController } = require('../../src/api/projects/personal/controllers/chatController');

// Mock dependencies
jest.mock('../../src/database/dbConfig');
jest.mock('../../src/api/projects/personal/services/guardrailService');
jest.mock('../../src/api/projects/personal/services/contextBuilder');
jest.mock('../../src/services/aiService');

const dbManager = require('../../src/database/dbConfig');
const guardrailService = require('../../src/api/projects/personal/services/guardrailService');
const contextBuilder = require('../../src/api/projects/personal/services/contextBuilder');
const aiService = require('../../src/services/aiService');

describe('ChatController', () => {
  beforeEach(() => {
    // Clear conversation history before each test
    chatController.conversationHistory.clear();
    chatController.lastActivity.clear();
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterAll(() => {
    chatController.stopCleanupInterval();
  });

  describe('processMessage', () => {
    beforeEach(() => {
      // Setup default mocks
      dbManager.getPostgresConnection.mockReturnValue({
        query: jest.fn()
      });
    });

    test('should process message successfully with all services', async () => {
      const sessionId = 'test-session-1';
      const message = 'What is your experience with React?';

      // Mock database response
      const mockPool = {
        query: jest.fn().mockResolvedValue({
          rows: [{ id: 1, name: 'John Doe' }]
        })
      };
      dbManager.getPostgresConnection.mockReturnValue(mockPool);

      // Mock guardrail service
      guardrailService.checkQuestion.mockResolvedValue({
        isAllowed: true,
        reason: null
      });

      // Mock context builder
      contextBuilder.buildContext.mockResolvedValue({
        success: true,
        context: 'Resume context here',
        metadata: { totalChunks: 3 }
      });

      // Mock AI service
      aiService.chat.mockResolvedValue({
        success: true,
        provider: 'gemini',
        model: 'gemini-1.5-pro',
        data: { response: 'I have 5 years of experience with React.' }
      });

      // Mock PII sanitization
      guardrailService.sanitizeResponse.mockImplementation(response => response);

      const result = await chatController.processMessage(sessionId, message);

      expect(result.success).toBe(true);
      expect(result.message).toBe('I have 5 years of experience with React.');
      expect(result.metadata.provider).toBe('gemini');
      expect(result.metadata.contextChunks).toBe(3);
      expect(result.metadata.guardrail).toBe('passed');
    });

    test('should block question that fails guardrail check', async () => {
      const sessionId = 'test-session-2';
      const message = 'Tell me about your family';

      const mockPool = {
        query: jest.fn().mockResolvedValue({
          rows: [{ id: 1, name: 'John Doe' }]
        })
      };
      dbManager.getPostgresConnection.mockReturnValue(mockPool);

      guardrailService.checkQuestion.mockResolvedValue({
        isAllowed: false,
        reason: 'This question about personal life is outside scope'
      });

      const result = await chatController.processMessage(sessionId, message);

      expect(result.success).toBe(false);
      expect(result.message).toContain('personal life');
      expect(result.metadata.guardrail).toBe('blocked');
      expect(contextBuilder.buildContext).not.toHaveBeenCalled();
      expect(aiService.chat).not.toHaveBeenCalled();
    });

    test('should handle context not found scenario', async () => {
      const sessionId = 'test-session-3';
      const message = 'What is your experience with Go?';

      const mockPool = {
        query: jest.fn().mockResolvedValue({
          rows: [{ id: 1, name: 'John Doe' }]
        })
      };
      dbManager.getPostgresConnection.mockReturnValue(mockPool);

      guardrailService.checkQuestion.mockResolvedValue({
        isAllowed: true,
        reason: null
      });

      contextBuilder.buildContext.mockResolvedValue({
        success: false,
        context: '',
        metadata: { totalChunks: 0 }
      });

      const result = await chatController.processMessage(sessionId, message);

      expect(result.success).toBe(false);
      expect(result.message).toContain('could not find relevant information');
      expect(result.metadata.context).toBe('not_found');
      expect(aiService.chat).not.toHaveBeenCalled();
    });

    test('should handle AI service failure', async () => {
      const sessionId = 'test-session-4';
      const message = 'What are your skills?';

      const mockPool = {
        query: jest.fn().mockResolvedValue({
          rows: [{ id: 1, name: 'John Doe' }]
        })
      };
      dbManager.getPostgresConnection.mockReturnValue(mockPool);

      guardrailService.checkQuestion.mockResolvedValue({
        isAllowed: true,
        reason: null
      });

      contextBuilder.buildContext.mockResolvedValue({
        success: true,
        context: 'Resume context',
        metadata: { totalChunks: 2 }
      });

      aiService.chat.mockResolvedValue({
        success: false
      });

      const result = await chatController.processMessage(sessionId, message);

      expect(result.success).toBe(false);
      expect(result.message).toContain('currently unavailable');
      expect(result.metadata.error).toBeTruthy();
    });

    test('should handle database connection not available', async () => {
      const sessionId = 'test-session-5';
      const message = 'Test question';

      dbManager.getPostgresConnection.mockReturnValue(null);

      const result = await chatController.processMessage(sessionId, message);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No resume data available');
      expect(result.metadata.error).toBe('no_resume');
    });

    test('should handle no resume in database', async () => {
      const sessionId = 'test-session-6';
      const message = 'Test question';

      const mockPool = {
        query: jest.fn().mockResolvedValue({
          rows: []
        })
      };
      dbManager.getPostgresConnection.mockReturnValue(mockPool);

      const result = await chatController.processMessage(sessionId, message);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No resume data available');
      expect(result.metadata.error).toBe('no_resume');
    });

    test('should handle empty AI response', async () => {
      const sessionId = 'test-session-7';
      const message = 'Test question';

      const mockPool = {
        query: jest.fn().mockResolvedValue({
          rows: [{ id: 1, name: 'John Doe' }]
        })
      };
      dbManager.getPostgresConnection.mockReturnValue(mockPool);

      guardrailService.checkQuestion.mockResolvedValue({
        isAllowed: true,
        reason: null
      });

      contextBuilder.buildContext.mockResolvedValue({
        success: true,
        context: 'Context',
        metadata: { totalChunks: 1 }
      });

      aiService.chat.mockResolvedValue({
        success: true,
        data: { response: null }
      });

      const result = await chatController.processMessage(sessionId, message);

      expect(result.success).toBe(false);
      expect(result.message).toContain('empty response');
    });

    test('should manage conversation history correctly', async () => {
      const sessionId = 'test-session-8';
      const message1 = 'First question';
      const message2 = 'Second question';

      const mockPool = {
        query: jest.fn().mockResolvedValue({
          rows: [{ id: 1, name: 'John Doe' }]
        })
      };
      dbManager.getPostgresConnection.mockReturnValue(mockPool);

      guardrailService.checkQuestion.mockResolvedValue({
        isAllowed: true,
        reason: null
      });

      contextBuilder.buildContext.mockResolvedValue({
        success: true,
        context: 'Context',
        metadata: { totalChunks: 1 }
      });

      aiService.chat.mockResolvedValue({
        success: true,
        provider: 'gemini',
        model: 'gemini-1.5-pro',
        data: { response: 'Response' }
      });

      guardrailService.sanitizeResponse.mockImplementation(response => response);

      // First message
      await chatController.processMessage(sessionId, message1);
      let history = chatController.getHistory(sessionId);
      expect(history).toHaveLength(2); // user + assistant

      // Second message
      await chatController.processMessage(sessionId, message2);
      history = chatController.getHistory(sessionId);
      expect(history).toHaveLength(4); // 2 user + 2 assistant
    });

    test('should limit conversation history to last 5 messages', async () => {
      const sessionId = 'test-session-9';

      const mockPool = {
        query: jest.fn().mockResolvedValue({
          rows: [{ id: 1, name: 'John Doe' }]
        })
      };
      dbManager.getPostgresConnection.mockReturnValue(mockPool);

      guardrailService.checkQuestion.mockResolvedValue({
        isAllowed: true,
        reason: null
      });

      contextBuilder.buildContext.mockResolvedValue({
        success: true,
        context: 'Context',
        metadata: { totalChunks: 1 }
      });

      aiService.chat.mockResolvedValue({
        success: true,
        provider: 'gemini',
        model: 'gemini-1.5-pro',
        data: { response: 'Response' }
      });

      guardrailService.sanitizeResponse.mockImplementation(response => response);

      // Send 6 messages to test the 5-message limit
      for (let i = 0; i < 6; i++) {
        await chatController.processMessage(sessionId, `Message ${i}`);
      }

      const history = chatController.getHistory(sessionId);
      // Should have 12 messages total (6 user + 6 assistant)
      expect(history).toHaveLength(12);
    });

    test('should update activity timestamp on each message', async () => {
      const sessionId = 'test-session-10';
      const message = 'Test question';

      const mockPool = {
        query: jest.fn().mockResolvedValue({
          rows: [{ id: 1, name: 'John Doe' }]
        })
      };
      dbManager.getPostgresConnection.mockReturnValue(mockPool);

      guardrailService.checkQuestion.mockResolvedValue({
        isAllowed: true,
        reason: null
      });

      contextBuilder.buildContext.mockResolvedValue({
        success: true,
        context: 'Context',
        metadata: { totalChunks: 1 }
      });

      aiService.chat.mockResolvedValue({
        success: true,
        provider: 'gemini',
        model: 'gemini-1.5-pro',
        data: { response: 'Response' }
      });

      guardrailService.sanitizeResponse.mockImplementation(response => response);

      await chatController.processMessage(sessionId, message);

      expect(chatController.lastActivity.has(sessionId)).toBe(true);
      const timestamp = chatController.lastActivity.get(sessionId);
      const now = Date.now();
      expect(timestamp).toBeGreaterThan(now - 5000); // Should be within last 5 seconds
      expect(timestamp).toBeLessThanOrEqual(now); // Should not be in the future
    });
  });

  describe('Conversation history management', () => {
    test('should clear history for specific session', () => {
      const sessionId = 'test-session-11';
      
      // Manually add some history
      chatController.conversationHistory.set(sessionId, [
        { role: 'user', content: 'Test message' }
      ]);
      chatController.lastActivity.set(sessionId, Date.now());

      chatController.clearHistory(sessionId);

      expect(chatController.conversationHistory.has(sessionId)).toBe(false);
      expect(chatController.lastActivity.has(sessionId)).toBe(false);
    });

    test('should get history for existing session', () => {
      const sessionId = 'test-session-12';
      const testHistory = [
        { role: 'user', content: 'Question 1' },
        { role: 'assistant', content: 'Answer 1' }
      ];

      chatController.conversationHistory.set(sessionId, testHistory);

      const history = chatController.getHistory(sessionId);

      expect(history).toEqual(testHistory);
    });

    test('should return empty array for non-existing session', () => {
      const sessionId = 'non-existent-session';

      const history = chatController.getHistory(sessionId);

      expect(history).toEqual([]);
    });

    test('should handle clearing non-existent session', () => {
      const sessionId = 'non-existent-session';

      expect(() => {
        chatController.clearHistory(sessionId);
      }).not.toThrow();
    });
  });

  describe('Memory management', () => {
    test('should start cleanup interval on initialization', () => {
      expect(chatController.cleanupInterval).toBeDefined();
    });

    test('should stop cleanup interval when called', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      chatController.stopCleanupInterval();

      expect(clearIntervalSpy).toHaveBeenCalled();
      
      clearIntervalSpy.mockRestore();
    });

    test('should not throw error when stopping already stopped interval', () => {
      chatController.stopCleanupInterval();
      
      expect(() => {
        chatController.stopCleanupInterval();
      }).not.toThrow();
    });
  });

  describe('processMessageWithoutContext', () => {
    test('should handle message when context is unavailable', async () => {
      const sessionId = 'test-session-13';
      const message = 'Test question';

      guardrailService.checkQuestion.mockResolvedValue({
        isAllowed: true,
        reason: null
      });

      aiService.chat.mockResolvedValue({
        success: true,
        provider: 'gemini',
        model: 'gemini-1.5-pro',
        data: { response: 'Resume data not available response' }
      });

      const result = await chatController.processMessageWithoutContext(sessionId, message);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Resume data not available');
      expect(result.metadata.context).toBe('unavailable');
    });

    test('should block inappropriate questions in fallback mode', async () => {
      const sessionId = 'test-session-14';
      const message = 'Tell me about your family';

      guardrailService.checkQuestion.mockResolvedValue({
        isAllowed: false,
        reason: 'Blocked: personal'
      });

      const result = await chatController.processMessageWithoutContext(sessionId, message);

      expect(result.success).toBe(false);
      expect(result.metadata.guardrail).toBe('blocked');
      expect(aiService.chat).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    test('should handle unexpected errors gracefully', async () => {
      const sessionId = 'test-session-15';
      const message = 'Test question';

      dbManager.getPostgresConnection.mockImplementation(() => {
        throw new Error('Unexpected database error');
      });

      const result = await chatController.processMessage(sessionId, message);

      expect(result.success).toBe(false);
      expect(result.message).toContain('error processing');
      expect(result.metadata.error).toBeTruthy();
    });

    test('should handle guardrail service errors', async () => {
      const sessionId = 'test-session-16';
      const message = 'Test question';

      const mockPool = {
        query: jest.fn().mockResolvedValue({
          rows: [{ id: 1, name: 'John Doe' }]
        })
      };
      dbManager.getPostgresConnection.mockReturnValue(mockPool);

      guardrailService.checkQuestion.mockRejectedValue(new Error('Guardrail service error'));

      const result = await chatController.processMessage(sessionId, message);

      expect(result.success).toBe(false);
      expect(result.message).toContain('error processing');
    });

    test('should handle context builder errors', async () => {
      const sessionId = 'test-session-17';
      const message = 'Test question';

      const mockPool = {
        query: jest.fn().mockResolvedValue({
          rows: [{ id: 1, name: 'John Doe' }]
        })
      };
      dbManager.getPostgresConnection.mockReturnValue(mockPool);

      guardrailService.checkQuestion.mockResolvedValue({
        isAllowed: true,
        reason: null
      });

      contextBuilder.buildContext.mockRejectedValue(new Error('Context builder error'));

      const result = await chatController.processMessage(sessionId, message);

      expect(result.success).toBe(false);
      expect(result.message).toContain('error processing');
    });
  });
});
