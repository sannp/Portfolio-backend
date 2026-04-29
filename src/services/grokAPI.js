const axios = require('axios');
const config = require('config');

class GrokService {
  constructor() {
    this.apiKey = config.get('ai.providers.grok.apiKey') || process.env.GROK_API_KEY;
    this.baseURL = 'https://api.x.ai/v1';
    this.defaultModel = config.get('ai.providers.grok.model');
  }

  async makeRequest(endpoint, data) {
    try {
      const response = await axios.post(`${this.baseURL}${endpoint}`, data, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Grok API Error: ${error.response.data.error?.message || error.response.statusText}`);
      }
      throw new Error(`Grok API Error: ${error.message}`);
    }
  }

  async generateText(prompt, options = {}) {
    try {
      const data = {
        model: options.model || this.defaultModel,
        messages: options.messages || [
          { role: 'user', content: prompt }
        ],
        max_tokens: options.maxTokens || config.get('ai.providers.grok.maxTokens'),
        temperature: options.temperature || config.get('ai.providers.grok.temperature'),
        ...options
      };

      const response = await this.makeRequest('/chat/completions', data);

      return {
        content: response.choices[0].message.content,
        usage: response.usage,
        model: response.model
      };
    } catch (error) {
      throw new Error(`Grok Text Generation Error: ${error.message}`);
    }
  }

  async generateImage(prompt, options = {}) {
    // Note: Grok may not have image generation capabilities
    throw new Error('Image generation not supported by Grok API');
  }

  async analyzeText(text, options = {}) {
    try {
      const analysisPrompt = options.analysisPrompt || 
        `Analyze the following text for sentiment, key themes, and classification.
        Provide a structured JSON response with sentiment, themes, and classification.
        
        Text: "${text}"`;

      const data = {
        model: options.model || this.defaultModel,
        messages: [
          { 
            role: 'system', 
            content: 'You are a text analysis expert. Always respond with valid JSON.' 
          },
          { role: 'user', content: analysisPrompt }
        ],
        max_tokens: options.maxTokens || 500,
        temperature: options.temperature || 0.3
      };

      const response = await this.makeRequest('/chat/completions', data);
      const analysis = response.choices[0].message.content;

      try {
        return JSON.parse(analysis);
      } catch {
        return { rawAnalysis: analysis };
      }
    } catch (error) {
      throw new Error(`Grok Text Analysis Error: ${error.message}`);
    }
  }

  async chat(messages, options = {}) {
    try {
      const data = {
        model: options.model || this.defaultModel,
        messages: messages,
        max_tokens: options.maxTokens || config.get('ai.providers.grok.maxTokens'),
        temperature: options.temperature || config.get('ai.providers.grok.temperature'),
        ...options
      };

      const response = await this.makeRequest('/chat/completions', data);

      return {
        content: response.choices[0].message.content,
        usage: response.usage,
        model: response.model
      };
    } catch (error) {
      throw new Error(`Grok Chat Error: ${error.message}`);
    }
  }

  async getModels() {
    try {
      const response = await axios.get(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      throw new Error(`Grok Models Error: ${error.message}`);
    }
  }
}

module.exports = new GrokService();
