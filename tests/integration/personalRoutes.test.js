const request = require('supertest');
const express = require('express');

// Mock Watchlist model
jest.mock('#models/Watchlist');

const Watchlist = require('#models/Watchlist');
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
      expect(Watchlist.find).toHaveBeenCalledTimes(1);
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

    test('PUT /api/personal/watchlist/:id - should update watchlist item', async () => {
      const mockUpdatedItem = { _id: '123', title: 'Updated Movie', imdbUrl: 'url1', type: 'movie' };
      Watchlist.findByIdAndUpdate.mockResolvedValue(mockUpdatedItem);

      const response = await request(app)
        .put('/api/personal/watchlist/123')
        .send({
          title: 'Updated Movie',
          imdbUrl: 'url1',
          type: 'movie'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Watchlist item updated successfully');
      expect(response.body.data).toEqual(mockUpdatedItem);
    });

    test('DELETE /api/personal/watchlist/:id - should delete watchlist item', async () => {
      const mockDeletedItem = { _id: '123', title: 'Movie 1' };
      Watchlist.findByIdAndDelete.mockResolvedValue(mockDeletedItem);

      const response = await request(app).delete('/api/personal/watchlist/123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Watchlist item deleted successfully');
      expect(response.body.data).toEqual(mockDeletedItem);
    });
  });
});
