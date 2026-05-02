const express = require('express');
const router = express.Router();
const researchController = require('./controllers/researchController');
const dbManager = require('#database/dbConfig');

// REST endpoints for research (Socket.io handles the streaming)
// These endpoints provide status and management

/**
 * GET /api/research/health
 * Check research service status
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Research service is running',
    data: {
      timestamp: new Date().toISOString(),
      features: ['web-search', 'ai-analysis', 'report-generation'],
      streaming: 'Socket.io'
    }
  });
});

/**
 * GET /api/research/assistant/health
 * Project Assistant detailed health check - service and workflow status
 */
router.get('/assistant/health', async (req, res) => {
  try {
    // Check database connections
    const dbStatus = {
      mongodb: dbManager.connections.mongodb?.readyState === 1 ? 'connected' : 'disconnected',
      postgresql: dbManager.connections.postgresql ? 'connected' : 'disconnected'
    };

    // Get active research jobs count
    const activeJobs = researchController.getActiveJobsCount?.() || 0;

    res.json({
      success: true,
      message: 'Project Assistant health status',
      data: {
        timestamp: new Date().toISOString(),
        status: 'healthy',
        components: {
          database: dbStatus,
          research: {
            activeJobs,
            workflow: 'ready',
            features: ['web-search', 'ai-summarization', 'report-generation', 'streaming']
          }
        },
        version: '2.0.0'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      data: {
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /api/research/start
 * Start a research job via REST (for non-Socket clients)
 * Body: { query: string, threadId: string }
 */
router.post('/start', async (req, res) => {
  try {
    const { query, threadId } = req.body;

    if (!query || !threadId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: query, threadId',
        data: null
      });
    }

    // Start async research (response is immediate, actual work happens in background)
    // For full streaming, clients should use Socket.io
    researchController.startResearch(query, threadId);

    res.json({
      success: true,
      message: 'Research started',
      data: {
        threadId,
        status: 'started',
        note: 'Connect to Socket.io for real-time updates'
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
 * GET /api/research/status/:threadId
 * Get research job status
 */
router.get('/status/:threadId', async (req, res) => {
  try {
    const { threadId } = req.params;
    const status = researchController.getStatus(threadId);

    res.json({
      success: true,
      message: 'Research status',
      data: status
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
 * GET /api/research/result/:threadId
 * Get final research result
 */
router.get('/result/:threadId', async (req, res) => {
  try {
    const { threadId } = req.params;
    const result = researchController.getResult(threadId);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Research result not found or not yet complete',
        data: null
      });
    }

    res.json({
      success: true,
      message: 'Research result',
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

module.exports = router;
