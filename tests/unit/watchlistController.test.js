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
    test('should retrieve watchlist items with pagination, filter, and sorting successfully via query params', async () => {
      const mockWatchlist = [
        { _id: '1', title: 'Inception', imdbUrl: 'url1', type: 'movie', isWatched: true, imdbRating: '8.8' }
      ];
      Watchlist.countDocuments.mockResolvedValue(1);
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockWatchlist)
      };
      Watchlist.find.mockReturnValue(mockQuery);

      const response = await request(app).get('/?isWatched=true&page=1&limit=10&sortBy=rating&sortOrder=desc');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Watchlist retrieved successfully');
      expect(response.body.data.items).toEqual(mockWatchlist);
      expect(response.body.data.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });
      expect(Watchlist.find).toHaveBeenCalledWith({ isWatched: true });
      expect(mockQuery.sort).toHaveBeenCalledWith({ imdbRating: -1 });
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    test('should handle errors when retrieving watchlist items', async () => {
      Watchlist.countDocuments.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Database error');
      expect(response.body.data).toBeNull();
    });
  });

  describe('GET /type/:type', () => {
    test('should retrieve watchlist items filtered by type and paginated successfully', async () => {
      const mockWatchlist = [
        { _id: '1', title: 'Inception', imdbUrl: 'url1', type: 'movie' }
      ];
      Watchlist.countDocuments.mockResolvedValue(1);
      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockWatchlist)
      };
      Watchlist.find.mockReturnValue(mockQuery);

      const response = await request(app).get('/type/movie?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toEqual(mockWatchlist);
      expect(response.body.data.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });
      expect(Watchlist.find).toHaveBeenCalledWith({ type: 'movie' });
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    test('should retrieve watchlist items filtered by type, isWatched, and genre successfully', async () => {
      const mockWatchlist = [
        { _id: '1', title: 'Inception', imdbUrl: 'url1', type: 'movie', isWatched: true, genres: ['Action'] }
      ];
      Watchlist.countDocuments.mockResolvedValue(1);
      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockWatchlist)
      };
      Watchlist.find.mockReturnValue(mockQuery);

      const response = await request(app).get('/type/movie?isWatched=true&genre=Action');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toEqual(mockWatchlist);
      expect(Watchlist.find).toHaveBeenCalledWith({ type: 'movie', isWatched: true, genres: 'Action' });
    });

    test('should retrieve watchlist items with search query successfully', async () => {
      const mockWatchlist = [
        { _id: '1', title: 'Inception', imdbUrl: 'url1', type: 'movie', genres: ['Action'] }
      ];
      Watchlist.countDocuments.mockResolvedValue(1);
      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockWatchlist)
      };
      Watchlist.find.mockReturnValue(mockQuery);

      const response = await request(app).get('/type/movie?search=Incept');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toEqual(mockWatchlist);
      expect(Watchlist.find).toHaveBeenCalledWith({
        type: 'movie',
        $or: [
          { title: { $regex: 'Incept', $options: 'i' } },
          { genres: { $regex: 'Incept', $options: 'i' } }
        ]
      });
    });

    test('should handle database errors when retrieving filtered items', async () => {
      Watchlist.countDocuments.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/type/movie');

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
