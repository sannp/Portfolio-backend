const request = require('supertest');
const express = require('express');

// Mock the Watchlist model
jest.mock('#models/Watchlist');

const Watchlist = require('#models/Watchlist');
const watchlistController = require('../../src/api/projects/personal/controllers/watchlistController');

describe('Watchlist Controller Unit Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/', watchlistController);
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    test('should retrieve all watchlist items successfully', async () => {
      const mockWatchlist = [
        { _id: '1', title: 'Inception', imdbUrl: 'url1', type: 'movie' },
        { _id: '2', title: 'Breaking Bad', imdbUrl: 'url2', type: 'series' }
      ];
      Watchlist.find.mockResolvedValue(mockWatchlist);

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Watchlist retrieved successfully');
      expect(response.body.data).toEqual(mockWatchlist);
      expect(Watchlist.find).toHaveBeenCalledTimes(1);
    });

    test('should handle errors when retrieving watchlist items', async () => {
      Watchlist.find.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Database error');
      expect(response.body.data).toBeNull();
    });
  });

  describe('POST /', () => {
    const validItem = {
      title: 'Inception',
      imdbUrl: 'https://www.imdb.com/title/tt1375666/',
      type: 'movie',
      genres: ['Action', 'Sci-Fi'],
      isWatched: true,
      imageUrl: 'http://example.com/inception.jpg',
      year: '2010',
      imdbRating: '8.8',
      runtime: '148 min',
      plot: 'A thief who steals corporate secrets...'
    };

    test('should create a new watchlist item successfully', async () => {
      const mockSavedItem = { _id: '123', ...validItem };
      const mockSave = jest.fn().mockResolvedValue(mockSavedItem);

      Watchlist.mockImplementation(() => ({
        save: mockSave
      }));

      const response = await request(app)
        .post('/')
        .send(validItem);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Watchlist item added successfully');
      expect(response.body.data).toEqual(mockSavedItem);
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    test('should return validation error when required fields are missing', async () => {
      const response = await request(app)
        .post('/')
        .send({ title: 'Inception' }); // missing imdbUrl and type

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Title, IMDB URL, and Type are required.');
      expect(response.body.data).toBeNull();
      expect(Watchlist).not.toHaveBeenCalled();
    });

    test('should handle database save error', async () => {
      const mockSave = jest.fn().mockRejectedValue(new Error('Save failed'));
      Watchlist.mockImplementation(() => ({
        save: mockSave
      }));

      const response = await request(app)
        .post('/')
        .send(validItem);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Save failed');
      expect(response.body.data).toBeNull();
    });
  });

  describe('PUT /:id', () => {
    const updateData = {
      title: 'Inception (Updated)',
      imdbUrl: 'https://www.imdb.com/title/tt1375666/',
      type: 'movie',
      genres: ['Action', 'Sci-Fi', 'Thriller'],
      isWatched: true,
      imageUrl: 'http://example.com/inception_new.jpg',
      year: '2010',
      imdbRating: '8.9',
      runtime: '148 min',
      plot: 'Updated plot summary'
    };

    test('should update a watchlist item successfully', async () => {
      const mockUpdatedItem = { _id: '123', ...updateData };
      Watchlist.findByIdAndUpdate.mockResolvedValue(mockUpdatedItem);

      const response = await request(app)
        .put('/123')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Watchlist item updated successfully');
      expect(response.body.data).toEqual(mockUpdatedItem);
      expect(Watchlist.findByIdAndUpdate).toHaveBeenCalledWith(
        '123',
        { $set: updateData },
        { new: true }
      );
    });

    test('should return error when watchlist item is not found', async () => {
      Watchlist.findByIdAndUpdate.mockResolvedValue(null);

      const response = await request(app)
        .put('/999')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Watchlist item not found');
      expect(response.body.data).toBeNull();
    });

    test('should handle database errors on update', async () => {
      Watchlist.findByIdAndUpdate.mockRejectedValue(new Error('Update error'));

      const response = await request(app)
        .put('/123')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Update error');
      expect(response.body.data).toBeNull();
    });
  });

  describe('DELETE /:id', () => {
    test('should delete a watchlist item successfully', async () => {
      const mockDeletedItem = { _id: '123', title: 'Inception' };
      Watchlist.findByIdAndDelete.mockResolvedValue(mockDeletedItem);

      const response = await request(app).delete('/123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Watchlist item deleted successfully');
      expect(response.body.data).toEqual(mockDeletedItem);
      expect(Watchlist.findByIdAndDelete).toHaveBeenCalledWith('123');
    });

    test('should return error when watchlist item is not found during delete', async () => {
      Watchlist.findByIdAndDelete.mockResolvedValue(null);

      const response = await request(app).delete('/999');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Watchlist item not found');
      expect(response.body.data).toBeNull();
    });

    test('should handle database errors on delete', async () => {
      Watchlist.findByIdAndDelete.mockRejectedValue(new Error('Delete error'));

      const response = await request(app).delete('/123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Delete error');
      expect(response.body.data).toBeNull();
    });
  });
});
