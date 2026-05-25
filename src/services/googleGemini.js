const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('config');

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
  }

  async generateText(prompt, options = {}) {
    if (!this.client) {
      throw new Error('Gemini API key not configured');
    }
    try {
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
    } catch (error) {
      throw new Error(`Gemini API Error: ${error.message}`);
    }
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
    try {
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
    } catch (error) {
      throw new Error(`Gemini Text Analysis Error: ${error.message}`);
    }
  }

  async embedText(text, options = {}) {
    if (!this.client) {
      throw new Error('Gemini API key not configured');
    }
    try {
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
    } catch (error) {
      throw new Error(`Gemini Embedding Error: ${error.message}`);
    }
  }

  async chat(messages, options = {}) {
    if (!this.client) {
      throw new Error('Gemini API key not configured');
    }
    try {
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
    } catch (error) {
      throw new Error(`Gemini Chat Error: ${error.message}`);
    }
  }
}

module.exports = new GeminiService();
