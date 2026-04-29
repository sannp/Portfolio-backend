const request = require('supertest');
const express = require('express');

jest.mock('../../models/Badges');

const Badge = require('../../models/Badges');
const badgesController = require('../../src/api/v1/projects/portfolio/controllers/badgesController');

describe('Badges Controller', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/', badgesController);
    jest.clearAllMocks();
  });

  describe('POST /addnew', () => {
    const validBadge = {
      title: 'New Badge',
      bgColor: '#FF0000',
      color: '#FFFFFF'
    };

    test('should create new badge successfully', async () => {
      Badge.find.mockResolvedValue([]);
      const mockSave = jest.fn().mockResolvedValue({ _id: '123', id: 'badge-123', ...validBadge });
      Badge.mockImplementation(() => ({ save: mockSave }));

      const response = await request(app)
        .post('/addnew')
        .send(validBadge);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Badge Added Successfully');
    });

    test('should return error for duplicate title', async () => {
      Badge.find.mockResolvedValue([{ title: 'New Badge' }]);

      const response = await request(app)
        .post('/addnew')
        .send(validBadge);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Title already present.');
    });

    test('should return error when required fields missing', async () => {
      const response = await request(app)
        .post('/addnew')
        .send({ title: 'Badge' });

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    test('should handle database save error', async () => {
      Badge.find.mockResolvedValue([]);
      const mockSave = jest.fn().mockRejectedValue(new Error('DB error'));
      Badge.mockImplementation(() => ({ save: mockSave }));

      const response = await request(app)
        .post('/addnew')
        .send(validBadge);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /all', () => {
    test('should return all badges', async () => {
      const mockBadges = [
        { _id: '1', title: 'Badge 1', id: 'badge-1' },
        { _id: '2', title: 'Badge 2', id: 'badge-2' }
      ];
      Badge.find.mockResolvedValue(mockBadges);

      const response = await request(app).get('/all');

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    test('should handle database error', async () => {
      Badge.find.mockRejectedValue(new Error('DB error'));

      const response = await request(app).get('/all');

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /:badgeId', () => {
    test('should return specific badge by ID', async () => {
      const mockBadge = { _id: '123', title: 'Test Badge', id: 'badge-123' };
      Badge.findById.mockResolvedValue(mockBadge);

      const response = await request(app).get('/123');

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Test Badge');
    });

    test('should handle database error', async () => {
      Badge.findById.mockRejectedValue(new Error('DB error'));

      const response = await request(app).get('/123');

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /:badgeId', () => {
    const updateData = {
      title: 'Updated Badge',
      bgColor: '#00FF00',
      color: '#000000',
      id: 'badge-123'
    };

    test('should update badge successfully', async () => {
      Badge.updateOne.mockResolvedValue({ nModified: 1 });

      const response = await request(app)
        .patch('/123')
        .send(updateData);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Badge updated successfully');
    });

    test('should return error for missing required fields', async () => {
      const response = await request(app)
        .patch('/123')
        .send({ title: 'Updated' });

      expect(response.body.success).toBe(false);
    });

    test('should handle update error', async () => {
      Badge.updateOne.mockRejectedValue(new Error('Update failed'));

      const response = await request(app)
        .patch('/123')
        .send(updateData);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /:badgeId', () => {
    test('should delete badge successfully', async () => {
      Badge.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const response = await request(app).delete('/123');

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Badge deleted successfully');
    });

    test('should handle delete error', async () => {
      Badge.deleteOne.mockRejectedValue(new Error('Delete failed'));

      const response = await request(app).delete('/123');

      expect(response.body.success).toBe(false);
    });
  });
});
