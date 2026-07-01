const express = require('express');
const router = express.Router();

// Import controllers
const watchlistController = require('./controllers/watchlistController');

// Watchlist routes
router.use('/watchlist', watchlistController);

// Project info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Personal API v1',
    data: {
      project: 'personal',
      version: '1.0.0',
      endpoints: [
        '/watchlist'
      ]
    }
  });
});

module.exports = router;
