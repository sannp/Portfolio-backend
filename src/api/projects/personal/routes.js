const express = require('express');
const router = express.Router();

// Import controllers
const watchlistController = require('./controllers/watchlistController');
const projectsController = require('./controllers/projectsController');
const blogpostsController = require('./controllers/blogpostsController');
const filesController = require('./controllers/filesController');
const { router: chatController } = require('./controllers/chatController');

// Watchlist routes
router.use('/watchlist', watchlistController);
router.use('/projects', projectsController);
router.use('/blogposts', blogpostsController);
router.use('/files', filesController);
router.use('/chat', chatController);

// Project info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Personal API v1',
    data: {
      project: 'personal',
      version: '1.0.0',
      endpoints: [
        '/watchlist',
        '/projects',
        '/blogposts',
        '/files',
        '/chat'
      ]
    }
  });
});

module.exports = router;
