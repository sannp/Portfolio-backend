const Anthropic = require('@anthropic-ai/sdk');
const config = require('config');

class AnthropicService {
  constructor() {
    const anthropicConfig = config.get('ai.providers.anthropic');
    this.client = new Anthropic({
      apiKey: anthropicConfig.apiKey || process.env.ANTHROPIC_API_KEY,
    });
    this.defaultModel = anthropicConfig.model || 'claude-3-sonnet-20240229';
  }

  async generateText(prompt, options = {}) {
    try {
      const message = await this.client.messages.create({
        model: options.model || this.defaultModel,
        max_tokens: options.maxTokens || config.get('ai.providers.anthropic.maxTokens') || 1000,
        temperature: options.temperature || config.get('ai.providers.anthropic.temperature') || 0.7,
        messages: [
          { role: 'user', content: prompt }
        ],
        ...options
      });

      return {
        content: message.content[0].text,
        usage: {
          input_tokens: message.usage.input_tokens,
          output_tokens: message.usage.output_tokens
        },
        model: message.model
      };
    } catch (error) {
      throw new Error(`Anthropic API Error: ${error.message}`);
    }
  }

  async analyzeText(text, options = {}) {
    try {
      const analysisPrompt = options.analysisPrompt || 
        `Analyze the following text for sentiment, key themes, and classification.
        Provide a structured JSON response with the following fields:
        - sentiment: (positive/negative/neutral)
        - themes: array of key themes
        - classification: category of the text
        - confidence: confidence score (0-1)
        
        Text to analyze: "${text}"`;

      const message = await this.client.messages.create({
        model: options.model || this.defaultModel,
        max_tokens: options.maxTokens || 500,
        temperature: options.temperature || 0.3,
        messages: [
          { 
            role: 'assistant', 
            content: 'You are a text analysis expert. Always respond with valid JSON.' 
          },
          { role: 'user', content: analysisPrompt }
        ]
      });

      const analysis = message.content[0].text;

      try {
        return JSON.parse(analysis);
      } catch {
        return { rawAnalysis: analysis };
      }
    } catch (error) {
      throw new Error(`Anthropic Text Analysis Error: ${error.message}`);
    }
  }

  async chat(messages, options = {}) {
    try {
      // Convert messages to Anthropic format (user/assistant only)
      const anthropicMessages = messages.map(msg => ({
        role: msg.role === 'system' ? 'assistant' : msg.role,
        content: msg.content
      }));

      const message = await this.client.messages.create({
        model: options.model || this.defaultModel,
        max_tokens: options.maxTokens || config.get('ai.providers.anthropic.maxTokens') || 1000,
        temperature: options.temperature || config.get('ai.providers.anthropic.temperature') || 0.7,
        messages: anthropicMessages,
        ...options
      });

      return {
        content: message.content[0].text,
        usage: {
          input_tokens: message.usage.input_tokens,
          output_tokens: message.usage.output_tokens
        },
        model: message.model
      };
    } catch (error) {
      throw new Error(`Anthropic Chat Error: ${error.message}`);
    }
  }

  async embedText(text, options = {}) {
    throw new Error('Embedding not supported by Anthropic API');
  }

  async generateImage(prompt, options = {}) {
    throw new Error('Image generation not supported by Anthropic API');
  }
}

module.exports = new AnthropicService();
