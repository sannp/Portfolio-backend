const Groq = require('groq-sdk');
const config = require('config');

class GroqService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || config.get('ai.providers.groq.apiKey');
    this.defaultModel = config.get('ai.providers.groq.model');
    this.available = !!this.apiKey;
    
    if (this.available) {
      this.client = new Groq({ apiKey: this.apiKey });
    }
  }

  async generateText(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('Groq API key not configured');
    }
    try {
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
    } catch (error) {
      if (error.response) {
        throw new Error(`Groq API Error: ${error.response.data?.error?.message || error.response.statusText}`);
      }
      throw new Error(`Groq API Error: ${error.message}`);
    }
  }

  async generateImage(prompt, options = {}) {
    throw new Error('Image generation not supported by Groq API');
  }

  async analyzeText(text, options = {}) {
    if (!this.apiKey) {
      throw new Error('Groq API key not configured');
    }
    try {
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
    } catch (error) {
      throw new Error(`Groq Text Analysis Error: ${error.message}`);
    }
  }

  async chat(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('Groq API key not configured');
    }
    try {
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
    } catch (error) {
      if (error.response) {
        throw new Error(`Groq Chat Error: ${error.response.data?.error?.message || error.response.statusText}`);
      }
      throw new Error(`Groq Chat Error: ${error.message}`);
    }
  }

  async getModels() {
    if (!this.apiKey) {
      throw new Error('Groq API key not configured');
    }
    try {
      const models = await this.client.models.list();
      return models.data;
    } catch (error) {
      throw new Error(`Groq Models Error: ${error.message}`);
    }
  }
}

module.exports = new GroqService();
