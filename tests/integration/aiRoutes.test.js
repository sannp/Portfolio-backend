const request = require('supertest');
const express = require('express');

// Mock config before requiring routes
jest.mock('config', () => ({
  get: jest.fn((key) => {
    if (key === 'security.apiSecret') return 'test-api-secret';
    if (key === 'ai.defaultProvider') return 'gemini';
    if (key === 'ai.providers') {
      return {
        gemini: { models: ['gemini-1.5-pro'] },
        openai: { models: ['gpt-4o-mini'] }
      };
    }
    return null;
  })
}));

// Mock aiService
jest.mock('../../src/services/aiService', () => ({
  checkAvailability: jest.fn(),
  getAvailableProviders: jest.fn(),
  getAllProviderModels: jest.fn(),
  providerPriority: ['gemini', 'openai', 'grok', 'anthropic'],
  defaultProvider: 'gemini',
  generateText: jest.fn(),
  chat: jest.fn(),
  embedText: jest.fn(),
  analyzeText: jest.fn()
}));

const aiService = require('../../src/services/aiService');
const aiRoutes = require('../../src/api/v1/ai/routes');

describe('AI Routes Integration', () => {
  let app;
  const API_SECRET = 'test-api-secret';

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/ai', aiRoutes);
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    test('should return 401 without API secret', async () => {
      const response = await request(app)
        .get('/api/v1/ai/providers');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Unauthorized');
    });

    test('should return 401 with invalid API secret', async () => {
      const response = await request(app)
        .get('/api/v1/ai/providers')
        .set('X-API-Secret', 'wrong-secret');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should return 500 when API secret not configured', async () => {
      const originalGet = require('config').get;
      require('config').get = jest.fn((key) => {
        if (key === 'security.apiSecret') return '';
        return originalGet(key);
      });

      const response = await request(app)
        .get('/api/v1/ai/providers')
        .set('X-API-Secret', 'any-secret');

      expect(response.status).toBe(500);

      require('config').get = originalGet;
    });
  });

  describe('GET /api/v1/ai/providers', () => {
    test('should return list of providers with valid auth', async () => {
      aiService.getAvailableProviders.mockReturnValue(['gemini', 'openai', 'grok', 'anthropic']);
      aiService.getAllProviderModels.mockReturnValue({
        gemini: ['gemini-1.5-pro', 'gemini-1.5-flash'],
        openai: ['gpt-4o-mini'],
        grok: ['grok-2-1212'],
        anthropic: ['claude-3-sonnet-20240229']
      });

      const response = await request(app)
        .get('/api/v1/ai/providers')
        .set('X-API-Secret', API_SECRET);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.providers).toHaveLength(4);
      expect(response.body.data.priority).toEqual(['gemini', 'openai', 'grok', 'anthropic']);
      expect(response.body.data.defaultProvider).toBe('gemini');
    });

    test('should handle service errors gracefully', async () => {
      aiService.getAvailableProviders.mockImplementation(() => {
        throw new Error('Service error');
      });

      const response = await request(app)
        .get('/api/v1/ai/providers')
        .set('X-API-Secret', API_SECRET);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/ai/availability', () => {
    test('should return availability status with valid auth', async () => {
      aiService.checkAvailability.mockResolvedValue({
        overallAvailable: true,
        providers: {
          gemini: { available: true, models: ['gemini-pro'], error: null },
          openai: { available: false, models: ['gpt-4'], error: 'Quota exceeded' }
        },
        defaultProvider: 'gemini',
        priority: ['gemini', 'openai']
      });
      aiService.getAllProviderModels.mockReturnValue({
        gemini: ['gemini-1.5-pro'],
        openai: ['gpt-4o-mini']
      });

      const response = await request(app)
        .get('/api/v1/ai/availability')
        .set('X-API-Secret', API_SECRET);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.available).toBe(true);
      expect(response.body.data.providers).toBeInstanceOf(Array);
      expect(aiService.checkAvailability).toHaveBeenCalled();
    });

    test('should handle checkAvailability errors', async () => {
      aiService.checkAvailability.mockRejectedValue(new Error('Connection failed'));

      const response = await request(app)
        .get('/api/v1/ai/availability')
        .set('X-API-Secret', API_SECRET);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Connection failed');
    });
  });

  describe('POST /api/v1/ai/generate', () => {
    test('should return 400 when prompt is missing', async () => {
      const response = await request(app)
        .post('/api/v1/ai/generate')
        .set('X-API-Secret', API_SECRET)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('prompt');
    });

    test('should generate text with valid prompt and auth', async () => {
      aiService.generateText.mockResolvedValue({
        success: true,
        provider: 'gemini',
        model: 'gemini-1.5-pro',
        data: { content: 'Hello world', usage: {} }
      });

      const response = await request(app)
        .post('/api/v1/ai/generate')
        .set('X-API-Secret', API_SECRET)
        .send({ prompt: 'Say hello', provider: 'gemini', temperature: 0.7 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.provider).toBe('gemini');
      expect(aiService.generateText).toHaveBeenCalledWith('Say hello', {
        provider: 'gemini',
        model: undefined,
        temperature: 0.7,
        maxTokens: undefined,
        fallback: true
      });
    });

    test('should handle generation errors', async () => {
      aiService.generateText.mockRejectedValue(new Error('All providers failed'));

      const response = await request(app)
        .post('/api/v1/ai/generate')
        .set('X-API-Secret', API_SECRET)
        .send({ prompt: 'Test' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    test('should respect fallback: false option', async () => {
      aiService.generateText.mockResolvedValue({
        success: true,
        provider: 'openai',
        data: {}
      });

      await request(app)
        .post('/api/v1/ai/generate')
        .set('X-API-Secret', API_SECRET)
        .send({ prompt: 'Test', provider: 'openai', fallback: false });

      expect(aiService.generateText).toHaveBeenCalledWith(
        'Test',
        expect.objectContaining({ fallback: false })
      );
    });
  });

  describe('POST /api/v1/ai/chat', () => {
    test('should return 400 when messages is missing', async () => {
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .set('X-API-Secret', API_SECRET)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('messages');
    });

    test('should return 400 when messages is empty array', async () => {
      const response = await request(app)
        .post('/api/v1/ai/chat')
        .set('X-API-Secret', API_SECRET)
        .send({ messages: [] });

      expect(response.status).toBe(400);
    });

    test('should complete chat with valid messages', async () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' },
        { role: 'user', content: 'How are you?' }
      ];

      aiService.chat.mockResolvedValue({
        success: true,
        provider: 'gemini',
        model: 'gemini-1.5-pro',
        data: { content: 'I am doing well!' }
      });

      const response = await request(app)
        .post('/api/v1/ai/chat')
        .set('X-API-Secret', API_SECRET)
        .send({ messages, provider: 'gemini', maxTokens: 100 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(aiService.chat).toHaveBeenCalledWith(
        messages,
        expect.objectContaining({ provider: 'gemini', maxTokens: 100 })
      );
    });
  });

  describe('POST /api/v1/ai/embed', () => {
    test('should return 400 when text is missing', async () => {
      const response = await request(app)
        .post('/api/v1/ai/embed')
        .set('X-API-Secret', API_SECRET)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('text');
    });

    test('should generate embedding with valid text', async () => {
      aiService.embedText.mockResolvedValue({
        success: true,
        provider: 'openai',
        model: 'text-embedding-ada-002',
        data: { embedding: [0.1, 0.2, 0.3] }
      });

      const response = await request(app)
        .post('/api/v1/ai/embed')
        .set('X-API-Secret', API_SECRET)
        .send({ text: 'Hello world', provider: 'openai' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.data.embedding).toEqual([0.1, 0.2, 0.3]);
    });
  });

  describe('POST /api/v1/ai/analyze', () => {
    test('should return 400 when text is missing', async () => {
      const response = await request(app)
        .post('/api/v1/ai/analyze')
        .set('X-API-Secret', API_SECRET)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('text');
    });

    test('should analyze text successfully', async () => {
      aiService.analyzeText.mockResolvedValue({
        success: true,
        provider: 'gemini',
        data: {
          sentiment: 'positive',
          themes: ['customer satisfaction'],
          confidence: 0.92
        }
      });

      const response = await request(app)
        .post('/api/v1/ai/analyze')
        .set('X-API-Secret', API_SECRET)
        .send({ text: 'I love this product!', temperature: 0.3 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.data.sentiment).toBe('positive');
    });
  });
});
