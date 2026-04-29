const config = require('config');
const openAIService = require('./openAI');
const geminiService = require('./googleGemini');
const grokService = require('./grokAPI');
const anthropicService = require('./anthropicService');

class AIService {
  constructor() {
    this.providers = {
      gemini: geminiService,
      openai: openAIService,
      grok: grokService,
      anthropic: anthropicService
    };
    this.providerPriority = ['gemini', 'openai', 'grok', 'anthropic'];
    this.defaultProvider = config.get('ai.defaultProvider');
  }

  async generateText(prompt, options = {}) {
    const requestedProvider = options.provider || this.defaultProvider;
    const providersToTry = this._getProvidersToTry(requestedProvider, options.fallback);

    for (const provider of providersToTry) {
      const service = this.providers[provider];
      if (!service) continue;

      try {
        const result = await service.generateText(prompt, options);
        return {
          success: true,
          provider,
          model: result.model,
          data: result
        };
      } catch (error) {
        console.warn(`Failed with ${provider}: ${error.message}`);
        if (provider === providersToTry[providersToTry.length - 1]) {
          throw new Error(`All AI providers failed. Last error: ${error.message}`);
        }
      }
    }

    throw new Error('No AI providers available');
  }

  _getProvidersToTry(requestedProvider, fallback = true) {
    if (!fallback) {
      return [requestedProvider];
    }

    const providers = new Set([requestedProvider]);
    
    // Add remaining providers in priority order
    for (const provider of this.providerPriority) {
      if (provider !== requestedProvider) {
        providers.add(provider);
      }
    }

    return Array.from(providers);
  }

  async generateImage(prompt, options = {}) {
    const provider = options.provider || this.defaultProvider;
    const service = this.providers[provider];

    if (!service || !service.generateImage) {
      throw new Error(`Image generation not supported by provider '${provider}'`);
    }

    try {
      const result = await service.generateImage(prompt, options);
      return {
        success: true,
        provider,
        data: result
      };
    } catch (error) {
      throw error;
    }
  }

  async analyzeText(text, options = {}) {
    const provider = options.provider || this.defaultProvider;
    const service = this.providers[provider];

    if (!service || !service.analyzeText) {
      throw new Error(`Text analysis not supported by provider '${provider}'`);
    }

    try {
      const result = await service.analyzeText(text, options);
      return {
        success: true,
        provider,
        data: result
      };
    } catch (error) {
      throw error;
    }
  }

  async chat(messages, options = {}) {
    const requestedProvider = options.provider || this.defaultProvider;
    const providersToTry = this._getProvidersToTry(requestedProvider, options.fallback);

    for (const provider of providersToTry) {
      const service = this.providers[provider];
      if (!service || !service.chat) continue;

      try {
        const result = await service.chat(messages, options);
        return {
          success: true,
          provider,
          model: result.model,
          data: result
        };
      } catch (error) {
        console.warn(`Failed with ${provider}: ${error.message}`);
        if (provider === providersToTry[providersToTry.length - 1]) {
          throw new Error(`All AI providers failed. Last error: ${error.message}`);
        }
      }
    }

    throw new Error('No AI providers available with chat capability');
  }

  async embedText(text, options = {}) {
    const requestedProvider = options.provider || this.defaultProvider;
    const providersToTry = this._getProvidersToTry(requestedProvider, options.fallback);

    for (const provider of providersToTry) {
      const service = this.providers[provider];
      if (!service || !service.embedText) continue;

      try {
        const result = await service.embedText(text, options);
        return {
          success: true,
          provider,
          model: result.model,
          data: result
        };
      } catch (error) {
        console.warn(`Failed with ${provider}: ${error.message}`);
        if (provider === providersToTry[providersToTry.length - 1]) {
          throw new Error(`All AI providers failed. Last error: ${error.message}`);
        }
      }
    }

    throw new Error('No AI providers available with embedding capability');
  }

  async checkAvailability() {
    const results = {};
    const providerConfigs = config.get('ai.providers');

    for (const [providerName, service] of Object.entries(this.providers)) {
      const providerConfig = providerConfigs[providerName] || {};
      const availableModels = providerConfig.models || [providerConfig.model].filter(Boolean);

      try {
        // Test with a simple prompt to check if provider is working
        if (service.generateText) {
          await service.generateText('Hi', { maxTokens: 5 });
        }

        results[providerName] = {
          available: true,
          models: availableModels.length > 0 ? availableModels : ['default'],
          error: null
        };
      } catch (error) {
        results[providerName] = {
          available: false,
          models: availableModels.length > 0 ? availableModels : ['default'],
          error: this._sanitizeError(error.message)
        };
      }
    }

    const anyAvailable = Object.values(results).some(r => r.available);

    return {
      overallAvailable: anyAvailable,
      providers: results,
      defaultProvider: this.defaultProvider,
      priority: this.providerPriority
    };
  }

  _sanitizeError(errorMessage) {
    // Remove API keys from error messages
    return errorMessage.replace(/sk-[a-zA-Z0-9]{48,}/g, '[REDACTED]')
                       .replace(/AIza[0-9A-Za-z_-]{35,}/g, '[REDACTED]');
  }

  getAvailableProviders() {
    return Object.keys(this.providers);
  }

  getProviderConfig(provider) {
    return config.get(`ai.providers.${provider}`);
  }

  getAllProviderModels() {
    const providerConfigs = config.get('ai.providers');
    const models = {};

    for (const provider of this.providerPriority) {
      const config = providerConfigs[provider] || {};
      models[provider] = config.models || [config.model].filter(Boolean) || ['default'];
    }

    return models;
  }
}

module.exports = new AIService();
