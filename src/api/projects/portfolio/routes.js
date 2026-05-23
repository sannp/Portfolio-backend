const express = require('express');
const router = express.Router();

// Import controllers
const projectsController = require('./controllers/projectsController');
const designsController = require('./controllers/designsController');
const badgesController = require('./controllers/badgesController');
const categoriesController = require('./controllers/categoriesController');
const blogpostsController = require('./controllers/blogpostsController');
const filesController = require('./controllers/filesController');
const { router: chatController } = require('./controllers/chatController');

// Project routes
router.use('/projects', projectsController);
router.use('/designs', designsController);
router.use('/badges', badgesController);
router.use('/categories', categoriesController);
router.use('/blogposts', blogpostsController);
router.use('/files', filesController);
router.use('/chat', chatController);

// Project info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Portfolio API v1',
    data: {
      project: 'portfolio',
      version: '1.0.0',
      endpoints: [
        '/projects',
        '/designs', 
        '/badges',
        '/categories',
        '/blogposts',
        '/files',
        '/chat'
      ]
    }
  });
});

module.exports = router;
