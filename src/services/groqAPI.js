const Groq = require('groq-sdk');
const config = require('../config');

class GroqService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || config.get('ai.providers.groq.apiKey');
    this.defaultModel = config.get('ai.providers.groq.model');
    this.available = !!this.apiKey;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second

    if (this.available) {
      this.client = new Groq({ apiKey: this.apiKey });
    }
  }

  async _retryWithBackoff(fn, context = 'API call') {
    let lastError;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const errorMessage = error.message || '';
        const isRetryableError =
          errorMessage.includes('503') ||
          errorMessage.includes('Service Unavailable') ||
          errorMessage.toLowerCase().includes('high demand') ||
          errorMessage.toLowerCase().includes('rate limit') ||
          error.status === 503 ||
          error.response?.status === 503;

        if (!isRetryableError || attempt === this.maxRetries) {
          throw error;
        }

        console.warn(`[Groq] ${context} failed (attempt ${attempt + 1}/${this.maxRetries + 1}): ${errorMessage}. Retrying in ${this.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
    throw lastError;
  }

  async generateText(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('Groq API key not configured');
    }
    return this._retryWithBackoff(async () => {
      const completion = await this.client.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: options.model || this.defaultModel,
        max_tokens: options.maxTokens || config.get('ai.providers.groq.maxTokens'),
        temperature: options.temperature || config.get('ai.providers.groq.temperature')
      });

      return {
        content: completion.choices[0]?.message?.content || '',
        usage: completion.usage,
        model: completion.model
      };
    }, 'generateText');
  }

  async generateImage(prompt, options = {}) {
    throw new Error('Image generation not supported by Groq API');
  }

  async analyzeText(text, options = {}) {
    if (!this.apiKey) {
      throw new Error('Groq API key not configured');
    }
    return this._retryWithBackoff(async () => {
      const analysisPrompt = options.analysisPrompt ||
        `Analyze the following text for sentiment, key themes, and classification.
        Provide a structured JSON response with sentiment, themes, and classification.

        Text: "${text}"`;

      const completion = await this.client.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a text analysis expert. Always respond with valid JSON.'
          },
          { role: 'user', content: analysisPrompt }
        ],
        model: options.model || this.defaultModel,
        max_tokens: options.maxTokens || 500,
        temperature: options.temperature || 0.3
      });

      const analysis = completion.choices[0]?.message?.content || '';

      try {
        return JSON.parse(analysis);
      } catch {
        return { rawAnalysis: analysis };
      }
    }, 'analyzeText');
  }

  async chat(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('Groq API key not configured');
    }
    return this._retryWithBackoff(async () => {
      const completion = await this.client.chat.completions.create({
        messages: messages,
        model: options.model || this.defaultModel,
        max_tokens: options.maxTokens || config.get('ai.providers.groq.maxTokens'),
        temperature: options.temperature || config.get('ai.providers.groq.temperature')
      });

      return {
        content: completion.choices[0]?.message?.content || '',
        usage: completion.usage,
        model: completion.model
      };
    }, 'chat');
  }

  async getModels() {
    if (!this.apiKey) {
      throw new Error('Groq API key not configured');
    }
    return this._retryWithBackoff(async () => {
      const models = await this.client.models.list();
      return models.data;
    }, 'getModels');
  }
}

module.exports = new GroqService();
