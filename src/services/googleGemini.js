const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

class GeminiService {
  constructor() {
    const geminiConfig = config.get('ai.providers.gemini');
    const apiKey = process.env.GEMINI_API_KEY || geminiConfig.apiKey;

    if (!apiKey) {
      this.client = null;
      this.available = false;
    } else {
      this.client = new GoogleGenerativeAI(apiKey);
      this.available = true;
    }
    this.defaultModel = geminiConfig.model;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
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

        console.warn(`[Gemini] ${context} failed (attempt ${attempt + 1}/${this.maxRetries + 1}): ${errorMessage}. Retrying in ${this.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
    throw lastError;
  }

  async generateText(prompt, options = {}) {
    if (!this.client) {
      throw new Error('Gemini API key not configured');
    }
    return this._retryWithBackoff(async () => {
      const model = this.client.getGenerativeModel({
        model: options.model || this.defaultModel
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        content: text,
        model: options.model || this.defaultModel
      };
    }, 'generateText');
  }

  async generateImage(prompt, options = {}) {
    // Note: Gemini doesn't directly generate images like DALL-E
    // This would be a placeholder for image-related capabilities
    throw new Error('Image generation not supported by Gemini API');
  }

  async analyzeText(text, options = {}) {
    if (!this.client) {
      throw new Error('Gemini API key not configured');
    }
    return this._retryWithBackoff(async () => {
      const model = this.client.getGenerativeModel({
        model: options.model || this.defaultModel
      });

      const analysisPrompt = options.analysisPrompt ||
        `Analyze the following text for sentiment, key themes, and classification.
        Provide a structured JSON response with the following fields:
        - sentiment: (positive/negative/neutral)
        - themes: array of key themes
        - classification: category of the text
        - confidence: confidence score (0-1)

        Text to analyze: "${text}"`;

      const result = await model.generateContent(analysisPrompt);
      const response = await result.response;
      const analysis = response.text();

      try {
        return JSON.parse(analysis);
      } catch {
        return { rawAnalysis: analysis };
      }
    }, 'analyzeText');
  }

  async embedText(text, options = {}) {
    if (!this.client) {
      throw new Error('Gemini API key not configured');
    }
    return this._retryWithBackoff(async () => {
      const modelName = options.model || 'gemini-embedding-001';
      const model = this.client.getGenerativeModel({
        model: modelName
      });

      let result;
      if (modelName.startsWith('gemini-embedding')) {
        result = await model.embedContent({
          content: { parts: [{ text: text }] },
          outputDimensionality: 1536
        });
      } else {
        result = await model.embedContent(text);
      }

      const embedding = result.embedding;

      return {
        embedding: embedding.values,
        model: modelName
      };
    }, 'embedText');
  }

  async chat(messages, options = {}) {
    if (!this.client) {
      throw new Error('Gemini API key not configured');
    }
    return this._retryWithBackoff(async () => {
      const model = this.client.getGenerativeModel({
        model: options.model || this.defaultModel
      });

      const chat = model.startChat({
        history: messages.slice(0, -1).map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        })),
        generationConfig: {
          maxOutputTokens: options.maxTokens || config.get('ai.providers.gemini.maxTokens'),
          temperature: options.temperature || config.get('ai.providers.gemini.temperature'),
        }
      });

      const lastMessage = messages[messages.length - 1];
      const result = await chat.sendMessage(lastMessage.content);
      const response = await result.response;

      return {
        content: response.text(),
        model: options.model || this.defaultModel
      };
    }, 'chat');
  }
}

module.exports = new GeminiService();
