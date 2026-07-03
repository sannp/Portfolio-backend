const request = require('supertest');
const express = require('express');

// Mock all models
jest.mock('#models/Watchlist');
jest.mock('#models/Projects');
jest.mock('#models/BlogPosts');

// Mock database manager
jest.mock('../../src/database/dbConfig', () => ({
  getGridFS: jest.fn(),
  getPortfolioPostgresConnection: jest.fn()
}));

// Mock config
jest.mock('config', () => ({
  get: jest.fn((key) => {
    const configData = {
      'upload.maxFileSize': 20000000,
      'upload.allowedTypes': ['image/jpeg', 'image/png', 'image/gif'],
      'upload.bucketName': 'uploads',
      'ai.providers.gemini': { apiKey: 'dummy', models: ['dummy'] },
      'ai.providers.openai': { apiKey: 'dummy', models: ['dummy'] },
      'ai.providers.grok': { apiKey: 'dummy', models: ['dummy'] },
      'ai.providers.anthropic': { apiKey: 'dummy', models: ['dummy'] },
      'ai.defaultProvider': 'gemini',
      'projects.personal.chat.enabled': false
    };
    if (key in configData) {
      return configData[key];
    }
    return {};
  }),
  has: jest.fn((key) => {
    const keys = [
      'upload.maxFileSize',
      'upload.allowedTypes',
      'upload.bucketName',
      'ai.providers.gemini',
      'ai.providers.openai',
      'ai.providers.grok',
      'ai.providers.anthropic',
      'ai.defaultProvider',
      'projects.personal.chat.enabled'
    ];
    return keys.includes(key);
  })
}));

const Watchlist = require('#models/Watchlist');
const Project = require('#models/Projects');
const personalRoutes = require('../../src/api/projects/personal/routes');

describe('Personal Routes Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/personal', personalRoutes);
    jest.clearAllMocks();
  });

  describe('GET /api/personal', () => {
    test('should return personal API info', async () => {
      const response = await request(app).get('/api/personal');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Personal API v1');
      expect(response.body.data.project).toBe('personal');
      expect(response.body.data.endpoints).toContain('/watchlist');
      expect(response.body.data.endpoints).toContain('/projects');
      expect(response.body.data.endpoints).toContain('/blogposts');
      expect(response.body.data.endpoints).toContain('/files');
      expect(response.body.data.endpoints).toContain('/chat');
    });
  });

  describe('Watchlist Endpoints', () => {
    test('GET /api/personal/watchlist - should retrieve watchlist items', async () => {
      Watchlist.find.mockResolvedValue([{ _id: '1', title: 'Movie 1', imdbUrl: 'url1', type: 'movie' }]);

      const response = await request(app).get('/api/personal/watchlist');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Watchlist retrieved successfully');
      expect(response.body.data).toHaveLength(1);
    });

    test('POST /api/personal/watchlist - should create watchlist item', async () => {
      const mockSavedItem = { _id: '123', title: 'Movie 1', imdbUrl: 'url1', type: 'movie' };
      const mockSave = jest.fn().mockResolvedValue(mockSavedItem);
      Watchlist.mockImplementation(() => ({
        save: mockSave
      }));

      const response = await request(app)
        .post('/api/personal/watchlist')
        .send({
          title: 'Movie 1',
          imdbUrl: 'url1',
          type: 'movie'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Watchlist item added successfully');
      expect(response.body.data).toEqual(mockSavedItem);
    });
  });

  describe('Projects Endpoints', () => {
    test('POST /api/personal/projects/addnew - should create project', async () => {
      Project.find.mockResolvedValue([]);
      const mockSave = jest.fn().mockResolvedValue({ _id: '123', title: 'Test' });
      Project.mockImplementation(() => ({ save: mockSave }));

      const response = await request(app)
        .post('/api/personal/projects/addnew')
        .send({
          title: 'Test Project',
          imageUrl: 'http://example.com/img.jpg',
          imageAlt: 'Test',
          description: 'Test desc',
          type: 'project'
        });

      expect(response.status).toBe(200);
    });

    test('GET /api/personal/projects/all - should return all projects', async () => {
      Project.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue([{ _id: '1', title: 'Project 1' }])
        })
      });

      const response = await request(app).get('/api/personal/projects/all');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('BlogPosts Endpoints', () => {
    test('should have blogposts routes available', async () => {
      const response = await request(app).get('/api/personal/blogposts/all');
      expect(response.status).not.toBe(404);
    });
  });

  describe('Files Endpoints', () => {
    test('should have files routes available', async () => {
      const response = await request(app).get('/api/personal/files/all');
      expect(response.status).not.toBe(404);
    });
  });

  afterAll(() => {
    const { chatController } = require('../../src/api/projects/personal/controllers/chatController');
    chatController.stopCleanupInterval();
  });
});
