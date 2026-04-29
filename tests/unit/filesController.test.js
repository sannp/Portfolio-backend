const request = require('supertest');
const express = require('express');

// Mock mongoose
jest.mock('mongoose', () => ({
  Types: {
    ObjectId: jest.fn((id) => id || 'mocked-object-id')
  }
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

// Mock database manager
jest.mock('../../src/database/dbConfig', () => ({
  getGridFS: jest.fn()
}));

const dbManager = require('../../src/database/dbConfig');
const filesController = require('../../src/api/v1/projects/portfolio/controllers/filesController');

describe('Files Controller', () => {
  let app;
  let mockGfs;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/', filesController);
    jest.clearAllMocks();

    mockGfs = {
      find: jest.fn(),
      openDownloadStream: jest.fn(),
      openUploadStream: jest.fn(),
      delete: jest.fn()
    };
  });

  describe('GET /image/:filename', () => {
    test('should return image successfully', async () => {
      const mockFiles = [{ _id: 'file123', filename: 'test.jpg' }];
      const mockPipe = jest.fn();
      mockGfs.find.mockReturnValue({ toArray: jest.fn().mockResolvedValue(mockFiles) });
      mockGfs.openDownloadStream.mockReturnValue({ pipe: mockPipe });
      dbManager.getGridFS.mockReturnValue(mockGfs);

      await request(app).get('/image/test.jpg');

      expect(mockGfs.find).toHaveBeenCalledWith({ filename: 'test.jpg' });
      expect(mockGfs.openDownloadStream).toHaveBeenCalledWith('file123');
    }, 5000);

    test('should return 404 when image not found', async () => {
      mockGfs.find.mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) });
      dbManager.getGridFS.mockReturnValue(mockGfs);

      const response = await request(app).get('/image/nonexistent.jpg');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No Image Available');
    });

    test('should return 500 when GridFS not initialized', async () => {
      dbManager.getGridFS.mockReturnValue(null);

      const response = await request(app).get('/image/test.jpg');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('GridFS not initialized');
    });

    test('should handle database error', async () => {
      mockGfs.find.mockReturnValue({ toArray: jest.fn().mockRejectedValue(new Error('DB error')) });
      dbManager.getGridFS.mockReturnValue(mockGfs);

      const response = await request(app).get('/image/test.jpg');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /image/:filename', () => {
    test('should delete image successfully', async () => {
      const mockFiles = [{ _id: 'file123' }];
      mockGfs.find.mockReturnValue({ toArray: jest.fn().mockResolvedValue(mockFiles) });
      mockGfs.delete.mockResolvedValue();
      dbManager.getGridFS.mockReturnValue(mockGfs);

      const response = await request(app).delete('/image/test.jpg');

      expect(response.status).toBe(200);
    });

    test('should return error for invalid filename', async () => {
      dbManager.getGridFS.mockReturnValue(mockGfs);

      const response = await request(app).delete('/image/undefined');

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid Filename');
    });

    test('should return error when image not found', async () => {
      mockGfs.find.mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) });
      dbManager.getGridFS.mockReturnValue(mockGfs);

      const response = await request(app).delete('/image/nonexistent.jpg');

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Image not found');
    });

    test('should return error when GridFS not initialized', async () => {
      dbManager.getGridFS.mockReturnValue(null);

      const response = await request(app).delete('/image/test.jpg');

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('GridFS not initialized');
    });
  });

  describe('GET /all', () => {
    test('should return all files', async () => {
      const mockFiles = [
        { _id: '1', filename: 'file1.jpg' },
        { _id: '2', filename: 'file2.png' }
      ];
      mockGfs.find.mockReturnValue({ toArray: jest.fn().mockResolvedValue(mockFiles) });
      dbManager.getGridFS.mockReturnValue(mockGfs);

      const response = await request(app).get('/all');

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    test('should return error when no files exist', async () => {
      mockGfs.find.mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) });
      dbManager.getGridFS.mockReturnValue(mockGfs);

      const response = await request(app).get('/all');

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No files exist');
    });

    test('should return error when GridFS not initialized', async () => {
      dbManager.getGridFS.mockReturnValue(null);

      const response = await request(app).get('/all');

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('GridFS not initialized');
    });
  });

  describe('GET /file/:id', () => {
    test('should return file by id successfully', async () => {
      const mockFiles = [{ _id: 'file123' }];
      mockGfs.find.mockReturnValue({ toArray: jest.fn().mockResolvedValue(mockFiles) });
      mockGfs.openDownloadStream.mockReturnValue({ pipe: jest.fn() });
      dbManager.getGridFS.mockReturnValue(mockGfs);

      await request(app).get('/file/file123');

      expect(mockGfs.find).toHaveBeenCalledWith({ _id: 'file123' });
    }, 3000);

    test('should return error for invalid file id', async () => {
      dbManager.getGridFS.mockReturnValue(mockGfs);

      const response = await request(app).get('/file/undefined');

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid File Id');
    });

    test('should return error when file not found', async () => {
      mockGfs.find.mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) });
      dbManager.getGridFS.mockReturnValue(mockGfs);

      const response = await request(app).get('/file/nonexistent');

      expect(response.body.success).toBe(false);
    });

    test('should return error when GridFS not initialized', async () => {
      dbManager.getGridFS.mockReturnValue(null);

      const response = await request(app).get('/file/123');

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('GridFS not initialized');
    });
  });

  describe('DELETE /:id', () => {
    test('should delete file by id successfully', async () => {
      mockGfs.delete.mockResolvedValue();
      dbManager.getGridFS.mockReturnValue(mockGfs);

      const response = await request(app).delete('/file123');

      expect(response.status).toBe(200);
    });

    test('should return error for invalid file id', async () => {
      dbManager.getGridFS.mockReturnValue(mockGfs);

      const response = await request(app).delete('/undefined');

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid File Id');
    });

    test('should return error when GridFS not initialized', async () => {
      dbManager.getGridFS.mockReturnValue(null);

      const response = await request(app).delete('/123');

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('GridFS not initialized');
    });

    test('should handle delete error', async () => {
      mockGfs.delete.mockRejectedValue(new Error('Delete failed'));
      dbManager.getGridFS.mockReturnValue(mockGfs);

      const response = await request(app).delete('/123');

      expect(response.body.success).toBe(false);
    });
  });
});
