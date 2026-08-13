const request = require('supertest');
const express = require('express');

// Mock all models
jest.mock('#models/Watchlist');
jest.mock('#models/Projects');
jest.mock('#models/BlogPosts');
jest.mock('#models/Expenses');

// Mock database manager
jest.mock('../../src/database/dbConfig', () => ({
  getGridFS: jest.fn(),
  getPortfolioPostgresConnection: jest.fn()
}));

// Mock config
jest.mock('../../src/config', () => ({
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
const Expenses = require('#models/Expenses');
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
      expect(response.body.data.endpoints).toContain('/expenses');
      expect(response.body.data.endpoints).toContain('/chat');
    });
  });

  describe('Watchlist Endpoints', () => {
    test('GET /api/personal/watchlist - should retrieve watchlist items with pagination, filter, and sorting via query params', async () => {
      const mockWatchlist = [{ _id: '1', title: 'Movie 1', imdbUrl: 'url1', type: 'movie', isWatched: true, imdbRating: '8.8' }];
      Watchlist.countDocuments.mockResolvedValue(1);
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockWatchlist)
      };
      Watchlist.find.mockReturnValue(mockQuery);

      const response = await request(app).get('/api/personal/watchlist?isWatched=true&page=1&limit=10&sortBy=rating&sortOrder=desc');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Watchlist retrieved successfully');
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.pagination).toBeDefined();
      expect(Watchlist.find).toHaveBeenCalledWith({ isWatched: true });
      expect(mockQuery.sort).toHaveBeenCalledWith({ imdbRating: -1 });
    });

    test('GET /api/personal/watchlist/type/:type - should retrieve watchlist items filtered by type', async () => {
      const mockWatchlist = [{ _id: '1', title: 'Movie 1', imdbUrl: 'url1', type: 'movie' }];
      Watchlist.countDocuments.mockResolvedValue(1);
      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockWatchlist)
      };
      Watchlist.find.mockReturnValue(mockQuery);

      const response = await request(app).get('/api/personal/watchlist/type/movie');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.pagination).toBeDefined();
      expect(Watchlist.find).toHaveBeenCalledWith({ type: 'movie' });
    });

    test('GET /api/personal/watchlist/type/:type - should retrieve watchlist items filtered by type and isWatched query param', async () => {
      const mockWatchlist = [{ _id: '1', title: 'Movie 1', imdbUrl: 'url1', type: 'movie', isWatched: true }];
      Watchlist.countDocuments.mockResolvedValue(1);
      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockWatchlist)
      };
      Watchlist.find.mockReturnValue(mockQuery);

      const response = await request(app).get('/api/personal/watchlist/type/movie?isWatched=true');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(Watchlist.find).toHaveBeenCalledWith({ type: 'movie', isWatched: true });
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
    test('POST /api/personal/projects - should create project', async () => {
      Project.findOne.mockResolvedValue(null);
      const mockSave = jest.fn().mockResolvedValue({ _id: '123', title: 'Test' });
      Project.mockImplementation(() => ({ save: mockSave }));

      const response = await request(app)
        .post('/api/personal/projects')
        .send({
          title: 'Test Project',
          imageUrl: 'http://example.com/img.jpg',
          imageAlt: 'Test',
          description: 'Test desc',
          type: 'project'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('GET /api/personal/projects - should return all projects', async () => {
      Project.countDocuments.mockResolvedValue(1);
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue([{ _id: '1', title: 'Project 1' }])
        })
      };
      Project.find.mockReturnValue(mockQuery);

      const response = await request(app).get('/api/personal/projects');

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

  describe('Expenses Endpoints', () => {
    test('GET /api/personal/expenses - should retrieve expenses with pagination', async () => {
      const mockExpenses = [{ _id: '1', date: new Date().toISOString(), place: 'Grocery Store', amount: 1500 }];
      Expenses.countDocuments.mockResolvedValue(1);
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockExpenses)
      };
      Expenses.find.mockReturnValue(mockQuery);

      const response = await request(app).get('/api/personal/expenses?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Expenses retrieved successfully');
      expect(response.body.data.items).toHaveLength(1);
      expect(Expenses.find).toHaveBeenCalled();
    });

    test('POST /api/personal/expenses - should create expense', async () => {
      const mockSavedExpense = { _id: '123', place: 'Supermarket', amount: 2000 };
      const mockSave = jest.fn().mockResolvedValue(mockSavedExpense);
      Expenses.mockImplementation(() => ({ save: mockSave }));

      const response = await request(app)
        .post('/api/personal/expenses')
        .send({
          date: '2026-07-07T00:00:00.000Z',
          place: 'Supermarket',
          amount: 2000
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Expense added successfully');
      expect(response.body.data).toEqual(mockSavedExpense);
    });
  });

  afterAll(() => {
    const { chatController } = require('../../src/api/projects/personal/controllers/chatController');
    chatController.stopCleanupInterval();
  });
});
