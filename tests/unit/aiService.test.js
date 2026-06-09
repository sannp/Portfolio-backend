const AIService = require('../../src/services/aiService');

// Mock all provider services
jest.mock('../../src/services/googleGemini', () => ({
  generateText: jest.fn(),
  analyzeText: jest.fn(),
  chat: jest.fn(),
  embedText: jest.fn(),
  available: true
}));

jest.mock('../../src/services/groqAPI', () => ({
  generateText: jest.fn(),
  analyzeText: jest.fn(),
  chat: jest.fn(),
  available: true
}));

jest.mock('config', () => ({
  get: jest.fn((key) => {
    const providers = {
      gemini: {
        model: 'gemini-1.5-pro',
        models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
        maxTokens: 1000,
        temperature: 0.7
      },
      groq: {
        model: 'llama-3.3-70b-versatile',
        models: ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile'],
        maxTokens: 1000,
        temperature: 0.7
      }
    };

    const config = {
      'ai.defaultProvider': 'groq',
      'ai.providers': providers,
      'ai.providers.gemini': providers.gemini,
      'ai.providers.groq': providers.groq
    };
    return config[key];
  })
}));

const gemini = require('../../src/services/googleGemini');
const groq = require('../../src/services/groqAPI');

describe('AIService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize providers in correct priority order', () => {
      expect(AIService.providers).toHaveProperty('groq');
      expect(AIService.providers).toHaveProperty('gemini');
      expect(AIService.providerPriority).toEqual(['groq', 'gemini']);
    });

    test('should set default provider from config', () => {
      expect(AIService.defaultProvider).toBe('groq');
    });
  });

  describe('_getProvidersToTry', () => {
    test('should return all providers in priority order when fallback is true', () => {
      const result = AIService._getProvidersToTry('groq', true);
      expect(result).toEqual(['groq', 'gemini']);
    });

    test('should return only requested provider when fallback is false', () => {
      const result = AIService._getProvidersToTry('gemini', false);
      expect(result).toEqual(['gemini']);
    });

    test('should reorder providers when starting with non-default', () => {
      const result = AIService._getProvidersToTry('gemini', true);
      // Should start with gemini, then follow priority for others
      expect(result[0]).toBe('gemini');
      expect(result).toContain('groq');
    });
  });

  describe('generateText', () => {
    test('should return success response with provider and model', async () => {
      groq.generateText.mockResolvedValue({
        content: 'Hello!',
        model: 'llama-3.3-70b-versatile',
        usage: { input_tokens: 10, output_tokens: 5 }
      });

      const result = await AIService.generateText('Say hello', { provider: 'groq' });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('groq');
      expect(result.model).toBe('llama-3.3-70b-versatile');
      expect(result.data.content).toBe('Hello!');
      expect(groq.generateText).toHaveBeenCalledWith('Say hello', { provider: 'groq' });
    });

    test('should fallback to next provider when first fails', async () => {
      groq.generateText.mockRejectedValue(new Error('Groq quota exceeded'));
      gemini.generateText.mockResolvedValue({
        content: 'Hello from Gemini',
        model: 'gemini-1.5-pro',
        usage: { prompt_tokens: 10, completion_tokens: 5 }
      });

      const result = await AIService.generateText('Say hello');

      expect(result.success).toBe(true);
      expect(result.provider).toBe('gemini');
      expect(groq.generateText).toHaveBeenCalled();
      expect(gemini.generateText).toHaveBeenCalled();
    });

    test('should try all providers and throw when all fail', async () => {
      groq.generateText.mockRejectedValue(new Error('Groq error'));
      gemini.generateText.mockRejectedValue(new Error('Gemini error'));

      await expect(AIService.generateText('Say hello')).rejects.toThrow('All AI providers failed');

      expect(groq.generateText).toHaveBeenCalled();
      expect(gemini.generateText).toHaveBeenCalled();
    });

    test('should not fallback when fallback option is false', async () => {
      groq.generateText.mockRejectedValue(new Error('Groq error'));

      await expect(
        AIService.generateText('Say hello', { provider: 'groq', fallback: false })
      ).rejects.toThrow('All AI providers failed');

      expect(groq.generateText).toHaveBeenCalled();
      expect(gemini.generateText).not.toHaveBeenCalled();
    });
  });

  describe('chat', () => {
    test('should successfully complete chat with messages', async () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' }
      ];

      groq.chat.mockResolvedValue({
        content: 'I am doing well!',
        model: 'llama-3.3-70b-versatile'
      });

      const result = await AIService.chat(messages, { provider: 'groq' });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('groq');
      expect(result.data.content).toBe('I am doing well!');
    });

    test('should fallback when provider lacks chat capability', async () => {
      const messages = [{ role: 'user', content: 'Hello' }];

      // Mock groq without chat method
      const originalChat = groq.chat;
      groq.chat = undefined;

      gemini.chat.mockResolvedValue({
        content: 'Hello from Gemini',
        model: 'gemini-1.5-pro'
      });

      const result = await AIService.chat(messages);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('gemini');

      // Restore
      groq.chat = originalChat;
    });
  });

  describe('embedText', () => {
    test('should generate embeddings successfully', async () => {
      gemini.embedText.mockResolvedValue({
        embedding: [0.1, 0.2, 0.3],
        model: 'gemini-embedding'
      });

      const result = await AIService.embedText('Hello world', { provider: 'gemini' });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('gemini');
      expect(result.data.embedding).toEqual([0.1, 0.2, 0.3]);
    });

    test('should skip providers without embed capability', async () => {
      // groq doesn't have embedText
      groq.embedText = undefined;

      gemini.embedText.mockResolvedValue({
        embedding: [0.1, 0.2, 0.3],
        model: 'gemini-embedding'
      });

      const result = await AIService.embedText('Hello');

      expect(result.success).toBe(true);
      expect(result.provider).toBe('gemini');
    });
  });

  describe('analyzeText', () => {
    test('should analyze text successfully', async () => {
      groq.analyzeText.mockResolvedValue({
        sentiment: 'positive',
        themes: ['greeting'],
        confidence: 0.95
      });

      const result = await AIService.analyzeText('I love this product!', { provider: 'groq' });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('groq');
      expect(result.data.sentiment).toBe('positive');
    });
  });

  describe('checkAvailability', () => {
    test('should return availability status for all providers', async () => {
      groq.generateText.mockResolvedValue({ content: 'Hi', model: 'llama-3.3-70b-versatile' });
      gemini.generateText.mockRejectedValue(new Error('Gemini quota exceeded'));

      const result = await AIService.checkAvailability();

      expect(result.overallAvailable).toBe(true);
      expect(result.providers.groq.available).toBe(true);
      expect(result.providers.gemini.available).toBe(false);
      expect(result.providers.gemini.error).toContain('quota exceeded');
    });

    test('should return overallAvailable as false when all providers fail', async () => {
      groq.generateText.mockRejectedValue(new Error('Error'));
      gemini.generateText.mockRejectedValue(new Error('Error'));

      const result = await AIService.checkAvailability();

      expect(result.overallAvailable).toBe(false);
    });
  });

  describe('_sanitizeError', () => {
    test('should remove OpenAI API keys from error messages', () => {
      const errorWithKey = 'Error: sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
      const sanitized = AIService._sanitizeError(errorWithKey);
      expect(sanitized).not.toContain('sk-abc123');
      expect(sanitized).toContain('[REDACTED]');
    });

    test('should remove Gemini API keys from error messages', () => {
      const errorWithKey = 'Error: AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0';
      const sanitized = AIService._sanitizeError(errorWithKey);
      expect(sanitized).not.toContain('AIzaSyA1B2');
      expect(sanitized).toContain('[REDACTED]');
    });

    test('should handle errors without API keys', () => {
      const normalError = 'Network error: Connection timeout';
      const sanitized = AIService._sanitizeError(normalError);
      expect(sanitized).toBe('Network error: Connection timeout');
    });
  });

  describe('getAvailableProviders', () => {
    test('should return array of provider names', () => {
      const providers = AIService.getAvailableProviders();
      expect(providers).toContain('groq');
      expect(providers).toContain('gemini');
    });
  });

  describe('getAllProviderModels', () => {
    test('should return models for all providers in priority order', () => {
      const models = AIService.getAllProviderModels();
      expect(models.groq).toEqual(['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile']);
      expect(models.gemini).toEqual(['gemini-1.5-pro', 'gemini-1.5-flash']);
    });
  });
});
