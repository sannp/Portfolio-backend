const express = require('express');
const config = require('config');
const aiService = require('../../../services/aiService');

const router = express.Router();

// Authentication middleware for AI endpoints
const authenticateApiSecret = (req, res, next) => {
  const providedSecret = req.headers['x-api-secret'];
  const expectedSecret = config.get('security.apiSecret') || process.env.API_SECRET;

  if (!expectedSecret) {
    return res.status(500).json({
      success: false,
      message: 'Server configuration error: API secret not configured',
      data: null
    });
  }

  if (!providedSecret || providedSecret !== expectedSecret) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or missing API secret',
      data: null
    });
  }

  next();
};

// Apply authentication to all AI endpoints
router.use(authenticateApiSecret);

/**
 * GET /api/v1/ai/availability
 * Check AI provider availability and available models
 */
router.get('/availability', async (req, res) => {
  try {
    const availability = await aiService.checkAvailability();
    const allModels = aiService.getAllProviderModels();

    res.json({
      success: true,
      message: 'AI availability status',
      data: {
        available: availability.overallAvailable,
        defaultProvider: availability.defaultProvider,
        priority: availability.priority,
        providers: Object.entries(availability.providers).map(([name, status]) => ({
          name,
          available: status.available,
          models: allModels[name] || status.models,
          error: status.error
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      data: null
    });
  }
});

/**
 * POST /api/v1/ai/generate
 * Generate text using AI
 * Body: { prompt: string, provider?: string, model?: string, temperature?: number, maxTokens?: number }
 */
router.post('/generate', async (req, res) => {
  try {
    const { prompt, provider, model, temperature, maxTokens, fallback } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: prompt',
        data: null
      });
    }

    const options = {
      provider,
      model,
      temperature,
      maxTokens,
      fallback: fallback !== false
    };

    const result = await aiService.generateText(prompt, options);

    res.json({
      success: true,
      message: 'Text generated successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      data: null
    });
  }
});

/**
 * POST /api/v1/ai/chat
 * Chat completion with conversation history
 * Body: { messages: Array<{role: string, content: string}>, provider?: string, model?: string }
 */
router.post('/chat', async (req, res) => {
  try {
    const { messages, provider, model, temperature, maxTokens, fallback } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing or invalid field: messages (must be a non-empty array)',
        data: null
      });
    }

    const options = {
      provider,
      model,
      temperature,
      maxTokens,
      fallback: fallback !== false
    };

    const result = await aiService.chat(messages, options);

    res.json({
      success: true,
      message: 'Chat response generated',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      data: null
    });
  }
});

/**
 * POST /api/v1/ai/embed
 * Generate embeddings for text
 * Body: { text: string, provider?: string, model?: string }
 */
router.post('/embed', async (req, res) => {
  try {
    const { text, provider, model, fallback } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: text',
        data: null
      });
    }

    const options = {
      provider,
      model,
      fallback: fallback !== false
    };

    const result = await aiService.embedText(text, options);

    res.json({
      success: true,
      message: 'Embedding generated successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      data: null
    });
  }
});

/**
 * POST /api/v1/ai/analyze
 * Analyze text (sentiment, themes, classification)
 * Body: { text: string, provider?: string, model?: string }
 */
router.post('/analyze', async (req, res) => {
  try {
    const { text, provider, model, temperature, fallback } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: text',
        data: null
      });
    }

    const options = {
      provider,
      model,
      temperature,
      fallback: fallback !== false
    };

    const result = await aiService.analyzeText(text, options);

    res.json({
      success: true,
      message: 'Text analyzed successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      data: null
    });
  }
});

/**
 * GET /api/v1/ai/providers
 * List all available providers and their models (without checking availability)
 */
router.get('/providers', (req, res) => {
  try {
    const providers = aiService.getAvailableProviders();
    const models = aiService.getAllProviderModels();
    const priority = aiService.providerPriority;

    res.json({
      success: true,
      message: 'Available AI providers',
      data: {
        providers: providers.map(name => ({
          name,
          models: models[name] || []
        })),
        priority,
        defaultProvider: aiService.defaultProvider
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      data: null
    });
  }
});

module.exports = router;
