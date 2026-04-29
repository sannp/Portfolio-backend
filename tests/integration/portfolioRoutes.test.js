const request = require('supertest');
const express = require('express');

// Mock all models
jest.mock('../../models/Projects');
jest.mock('../../models/Designs');
jest.mock('../../models/Badges');
jest.mock('../../models/Categories');
jest.mock('../../models/BlogPosts');

// Mock database manager
jest.mock('../../src/database/dbConfig', () => ({
  getGridFS: jest.fn()
}));

// Mock config
jest.mock('config', () => ({
  get: jest.fn((key) => {
    const config = {
      'upload.maxFileSize': 20000000,
      'upload.allowedTypes': ['image/jpeg', 'image/png', 'image/gif'],
      'upload.bucketName': 'uploads'
    };
    return config[key];
  })
}));

const Project = require('../../models/Projects');
const portfolioRoutes = require('../../src/api/v1/projects/portfolio/routes');

describe('Portfolio Routes Integration', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/portfolio', portfolioRoutes);
    jest.clearAllMocks();
  });

  describe('GET /api/v1/portfolio', () => {
    test('should return portfolio API info', async () => {
      const response = await request(app).get('/api/v1/portfolio');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Portfolio API v1');
      expect(response.body.data.project).toBe('portfolio');
      expect(response.body.data.endpoints).toContain('/projects');
      expect(response.body.data.endpoints).toContain('/designs');
      expect(response.body.data.endpoints).toContain('/badges');
      expect(response.body.data.endpoints).toContain('/categories');
      expect(response.body.data.endpoints).toContain('/blogposts');
      expect(response.body.data.endpoints).toContain('/files');
    });
  });

  describe('Projects Endpoints', () => {
    test('POST /api/v1/portfolio/projects/addnew - should create project', async () => {
      Project.find.mockResolvedValue([]);
      const mockSave = jest.fn().mockResolvedValue({ _id: '123', title: 'Test' });
      Project.mockImplementation(() => ({ save: mockSave }));

      const response = await request(app)
        .post('/api/v1/portfolio/projects/addnew')
        .send({
          title: 'Test Project',
          imageUrl: 'http://example.com/img.jpg',
          imageAlt: 'Test',
          description: 'Test desc'
        });

      expect(response.status).toBe(200);
    });

    test('GET /api/v1/portfolio/projects/all - should return all projects', async () => {
      Project.find.mockResolvedValue([{ _id: '1', title: 'Project 1' }]);

      const response = await request(app).get('/api/v1/portfolio/projects/all');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('GET /api/v1/portfolio/projects/:id - should return specific project', async () => {
      Project.findById.mockResolvedValue({ _id: '123', title: 'Test' });

      const response = await request(app).get('/api/v1/portfolio/projects/123');

      expect(response.status).toBe(200);
    });
  });

  describe('Designs Endpoints', () => {
    test('should have designs routes available', async () => {
      const response = await request(app).get('/api/v1/portfolio/designs/all');

      // Should not return 404 (routes should exist)
      expect(response.status).not.toBe(404);
    });
  });

  describe('Badges Endpoints', () => {
    test('should have badges routes available', async () => {
      const response = await request(app).get('/api/v1/portfolio/badges/all');

      expect(response.status).not.toBe(404);
    });
  });

  describe('Categories Endpoints', () => {
    test('should have categories routes available', async () => {
      const response = await request(app).get('/api/v1/portfolio/categories/all');

      expect(response.status).not.toBe(404);
    });
  });

  describe('BlogPosts Endpoints', () => {
    test('should have blogposts routes available', async () => {
      const response = await request(app).get('/api/v1/portfolio/blogposts/all');

      expect(response.status).not.toBe(404);
    });
  });

  describe('Files Endpoints', () => {
    test('should have files routes available', async () => {
      const response = await request(app).get('/api/v1/portfolio/files/all');

      expect(response.status).not.toBe(404);
    });
  });
});
