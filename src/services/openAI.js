const OpenAI = require('openai');
const config = require('config');

class OpenAIService {
  constructor() {
    const openaiConfig = config.get('ai.providers.openai');
    this.client = new OpenAI({
      apiKey: openaiConfig.apiKey || process.env.OPENAI_API_KEY,
    });
    this.defaultModel = openaiConfig.model;
  }

  async generateText(prompt, options = {}) {
    try {
      const messages = [
        { role: 'user', content: prompt }
      ];

      const completion = await this.client.chat.completions.create({
        model: options.model || this.defaultModel,
        messages: options.messages || messages,
        max_tokens: options.maxTokens || config.get('ai.providers.openai.maxTokens'),
        temperature: options.temperature || config.get('ai.providers.openai.temperature'),
        ...options
      });

      return {
        content: completion.choices[0].message.content,
        usage: completion.usage,
        model: completion.model
      };
    } catch (error) {
      throw new Error(`OpenAI API Error: ${error.message}`);
    }
  }

  async generateImage(prompt, options = {}) {
    try {
      const response = await this.client.images.generate({
        model: options.model || 'dall-e-3',
        prompt: prompt,
        n: options.n || 1,
        size: options.size || '1024x1024',
        quality: options.quality || 'standard',
        response_format: options.responseFormat || 'url'
      });

      return {
        images: response.data,
        created: response.created
      };
    } catch (error) {
      throw new Error(`OpenAI Image Generation Error: ${error.message}`);
    }
  }

  async analyzeText(text, options = {}) {
    try {
      const analysisPrompt = options.analysisPrompt || 
        `Analyze the following text for sentiment, key themes, and classification:\n\n"${text}"\n\nProvide a structured JSON response.`;

      const messages = [
        { role: 'system', content: 'You are a text analysis expert. Always respond with valid JSON.' },
        { role: 'user', content: analysisPrompt }
      ];

      const completion = await this.client.chat.completions.create({
        model: options.model || this.defaultModel,
        messages: messages,
        max_tokens: options.maxTokens || 500,
        temperature: options.temperature || 0.3
      });

      const analysis = completion.choices[0].message.content;
      
      try {
        return JSON.parse(analysis);
      } catch {
        return { rawAnalysis: analysis };
      }
    } catch (error) {
      throw new Error(`OpenAI Text Analysis Error: ${error.message}`);
    }
  }

  async embedText(text, options = {}) {
    try {
      const response = await this.client.embeddings.create({
        model: options.model || 'text-embedding-ada-002',
        input: text
      });

      return {
        embedding: response.data[0].embedding,
        usage: response.usage
      };
    } catch (error) {
      throw new Error(`OpenAI Embedding Error: ${error.message}`);
    }
  }
}

module.exports = new OpenAIService();
