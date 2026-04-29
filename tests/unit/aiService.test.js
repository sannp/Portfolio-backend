const AIService = require('../../src/services/aiService');

// Mock all provider services
jest.mock('../../src/services/googleGemini', () => ({
  generateText: jest.fn(),
  analyzeText: jest.fn(),
  chat: jest.fn(),
  embedText: jest.fn()
}));

jest.mock('../../src/services/openAI', () => ({
  generateText: jest.fn(),
  analyzeText: jest.fn(),
  chat: jest.fn(),
  embedText: jest.fn(),
  generateImage: jest.fn()
}));

jest.mock('../../src/services/grokAPI', () => ({
  generateText: jest.fn(),
  analyzeText: jest.fn(),
  chat: jest.fn()
}));

jest.mock('../../src/services/anthropicService', () => ({
  generateText: jest.fn(),
  analyzeText: jest.fn(),
  chat: jest.fn()
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
      openai: {
        model: 'gpt-4o-mini',
        models: ['gpt-4o', 'gpt-4o-mini'],
        maxTokens: 1000,
        temperature: 0.7
      },
      grok: {
        model: 'grok-2-1212',
        models: ['grok-2-1212'],
        maxTokens: 1000,
        temperature: 0.7
      },
      anthropic: {
        model: 'claude-3-sonnet-20240229',
        models: ['claude-3-sonnet-20240229'],
        maxTokens: 1000,
        temperature: 0.7
      }
    };

    const config = {
      'ai.defaultProvider': 'gemini',
      'ai.providers': providers,
      'ai.providers.gemini': providers.gemini,
      'ai.providers.openai': providers.openai,
      'ai.providers.grok': providers.grok,
      'ai.providers.anthropic': providers.anthropic
    };
    return config[key];
  })
}));

const gemini = require('../../src/services/googleGemini');
const openai = require('../../src/services/openAI');
const grok = require('../../src/services/grokAPI');
const anthropic = require('../../src/services/anthropicService');

describe('AIService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize providers in correct priority order', () => {
      expect(AIService.providers).toHaveProperty('gemini');
      expect(AIService.providers).toHaveProperty('openai');
      expect(AIService.providers).toHaveProperty('grok');
      expect(AIService.providers).toHaveProperty('anthropic');
      expect(AIService.providerPriority).toEqual(['gemini', 'openai', 'grok', 'anthropic']);
    });

    test('should set default provider from config', () => {
      expect(AIService.defaultProvider).toBe('gemini');
    });
  });

  describe('_getProvidersToTry', () => {
    test('should return all providers in priority order when fallback is true', () => {
      const result = AIService._getProvidersToTry('gemini', true);
      expect(result).toEqual(['gemini', 'openai', 'grok', 'anthropic']);
    });

    test('should return only requested provider when fallback is false', () => {
      const result = AIService._getProvidersToTry('openai', false);
      expect(result).toEqual(['openai']);
    });

    test('should reorder providers when starting with non-default', () => {
      const result = AIService._getProvidersToTry('anthropic', true);
      // Should start with anthropic, then follow priority for others
      expect(result[0]).toBe('anthropic');
      expect(result).toContain('gemini');
      expect(result).toContain('openai');
      expect(result).toContain('grok');
    });
  });

  describe('generateText', () => {
    test('should return success response with provider and model', async () => {
      gemini.generateText.mockResolvedValue({
        content: 'Hello!',
        model: 'gemini-1.5-pro',
        usage: { input_tokens: 10, output_tokens: 5 }
      });

      const result = await AIService.generateText('Say hello', { provider: 'gemini' });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('gemini');
      expect(result.model).toBe('gemini-1.5-pro');
      expect(result.data.content).toBe('Hello!');
      expect(gemini.generateText).toHaveBeenCalledWith('Say hello', { provider: 'gemini' });
    });

    test('should fallback to next provider when first fails', async () => {
      gemini.generateText.mockRejectedValue(new Error('Gemini quota exceeded'));
      openai.generateText.mockResolvedValue({
        content: 'Hello from OpenAI',
        model: 'gpt-4o-mini',
        usage: { prompt_tokens: 10, completion_tokens: 5 }
      });

      const result = await AIService.generateText('Say hello');

      expect(result.success).toBe(true);
      expect(result.provider).toBe('openai');
      expect(gemini.generateText).toHaveBeenCalled();
      expect(openai.generateText).toHaveBeenCalled();
    });

    test('should try all providers and throw when all fail', async () => {
      gemini.generateText.mockRejectedValue(new Error('Gemini error'));
      openai.generateText.mockRejectedValue(new Error('OpenAI error'));
      grok.generateText.mockRejectedValue(new Error('Grok error'));
      anthropic.generateText.mockRejectedValue(new Error('Anthropic error'));

      await expect(AIService.generateText('Say hello')).rejects.toThrow('All AI providers failed');

      expect(gemini.generateText).toHaveBeenCalled();
      expect(openai.generateText).toHaveBeenCalled();
      expect(grok.generateText).toHaveBeenCalled();
      expect(anthropic.generateText).toHaveBeenCalled();
    });

    test('should not fallback when fallback option is false', async () => {
      gemini.generateText.mockRejectedValue(new Error('Gemini error'));

      await expect(
        AIService.generateText('Say hello', { provider: 'gemini', fallback: false })
      ).rejects.toThrow('All AI providers failed');

      expect(gemini.generateText).toHaveBeenCalled();
      expect(openai.generateText).not.toHaveBeenCalled();
    });
  });

  describe('chat', () => {
    test('should successfully complete chat with messages', async () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' }
      ];

      gemini.chat.mockResolvedValue({
        content: 'I am doing well!',
        model: 'gemini-1.5-pro'
      });

      const result = await AIService.chat(messages, { provider: 'gemini' });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('gemini');
      expect(result.data.content).toBe('I am doing well!');
    });

    test('should fallback when provider lacks chat capability', async () => {
      const messages = [{ role: 'user', content: 'Hello' }];

      // Mock gemini without chat method
      const originalChat = gemini.chat;
      gemini.chat = undefined;

      openai.chat.mockResolvedValue({
        content: 'Hello from OpenAI',
        model: 'gpt-4o-mini'
      });

      const result = await AIService.chat(messages);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('openai');

      // Restore
      gemini.chat = originalChat;
    });
  });

  describe('embedText', () => {
    test('should generate embeddings successfully', async () => {
      openai.embedText.mockResolvedValue({
        embedding: [0.1, 0.2, 0.3],
        model: 'text-embedding-ada-002'
      });

      const result = await AIService.embedText('Hello world', { provider: 'openai' });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('openai');
      expect(result.data.embedding).toEqual([0.1, 0.2, 0.3]);
    });

    test('should skip providers without embed capability', async () => {
      // grok and anthropic don't have embedText
      grok.embedText = undefined;
      anthropic.embedText = undefined;

      gemini.embedText = jest.fn().mockRejectedValue(new Error('Gemini embed error'));
      openai.embedText.mockResolvedValue({
        embedding: [0.1, 0.2, 0.3],
        model: 'text-embedding-ada-002'
      });

      const result = await AIService.embedText('Hello');

      expect(result.success).toBe(true);
      expect(result.provider).toBe('openai');
    });
  });

  describe('analyzeText', () => {
    test('should analyze text successfully', async () => {
      gemini.analyzeText.mockResolvedValue({
        sentiment: 'positive',
        themes: ['greeting'],
        confidence: 0.95
      });

      const result = await AIService.analyzeText('I love this product!', { provider: 'gemini' });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('gemini');
      expect(result.data.sentiment).toBe('positive');
    });
  });

  describe('checkAvailability', () => {
    test('should return availability status for all providers', async () => {
      gemini.generateText.mockResolvedValue({ content: 'Hi', model: 'gemini-pro' });
      openai.generateText.mockRejectedValue(new Error('OpenAI quota exceeded'));
      grok.generateText.mockResolvedValue({ content: 'Hello', model: 'grok-beta' });
      anthropic.generateText.mockRejectedValue(new Error('Anthropic API Error'));

      const result = await AIService.checkAvailability();

      expect(result.overallAvailable).toBe(true);
      expect(result.providers.gemini.available).toBe(true);
      expect(result.providers.openai.available).toBe(false);
      expect(result.providers.openai.error).toContain('quota exceeded');
      expect(result.providers.grok.available).toBe(true);
      expect(result.providers.anthropic.available).toBe(false);
    });

    test('should return overallAvailable as false when all providers fail', async () => {
      gemini.generateText.mockRejectedValue(new Error('Error'));
      openai.generateText.mockRejectedValue(new Error('Error'));
      grok.generateText.mockRejectedValue(new Error('Error'));
      anthropic.generateText.mockRejectedValue(new Error('Error'));

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
      expect(providers).toContain('gemini');
      expect(providers).toContain('openai');
      expect(providers).toContain('grok');
      expect(providers).toContain('anthropic');
    });
  });

  describe('getAllProviderModels', () => {
    test('should return models for all providers in priority order', () => {
      const models = AIService.getAllProviderModels();
      expect(models.gemini).toEqual(['gemini-1.5-pro', 'gemini-1.5-flash']);
      expect(models.openai).toEqual(['gpt-4o', 'gpt-4o-mini']);
      expect(models.grok).toEqual(['grok-2-1212']);
      expect(models.anthropic).toEqual(['claude-3-sonnet-20240229']);
    });
  });
});
