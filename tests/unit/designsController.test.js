const request = require('supertest');
const express = require('express');

jest.mock('../../models/Designs');

const Design = require('../../models/Designs');
const designsController = require('../../src/api/v1/projects/portfolio/controllers/designsController');

describe('Designs Controller', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/', designsController);
    jest.clearAllMocks();
  });

  describe('POST /addnew', () => {
    const validDesign = {
      title: 'Test Design',
      imageUrl: 'http://example.com/design.jpg',
      imageAlt: 'Test Design Image',
      description: 'Test design description',
      badges: ['ui', 'ux'],
      button1: 'View',
      button1Url: 'http://example.com'
    };

    test('should create new design successfully', async () => {
      Design.find.mockResolvedValue([]);
      const mockSave = jest.fn().mockResolvedValue({ _id: '123', ...validDesign });
      Design.mockImplementation(() => ({ save: mockSave }));

      const response = await request(app)
        .post('/addnew')
        .send(validDesign);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Design Added Successfully');
    });

    test('should return error for duplicate title', async () => {
      Design.find.mockResolvedValue([{ title: 'Test Design' }]);

      const response = await request(app)
        .post('/addnew')
        .send(validDesign);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Title already present.');
    });

    test('should return error when required fields missing', async () => {
      const response = await request(app)
        .post('/addnew')
        .send({ title: 'Test' });

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    test('should handle database save error', async () => {
      Design.find.mockResolvedValue([]);
      const mockSave = jest.fn().mockRejectedValue(new Error('DB error'));
      Design.mockImplementation(() => ({ save: mockSave }));

      const response = await request(app)
        .post('/addnew')
        .send(validDesign);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /all', () => {
    test('should return all designs', async () => {
      const mockDesigns = [
        { _id: '1', title: 'Design 1' },
        { _id: '2', title: 'Design 2' }
      ];
      Design.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockDesigns)
      });

      const response = await request(app).get('/all');

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    test('should handle database error', async () => {
      Design.find.mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('DB error'))
      });

      const response = await request(app).get('/all');

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /:designId', () => {
    test('should return specific design', async () => {
      const mockDesign = { _id: '123', title: 'Test Design' };
      Design.findById.mockResolvedValue(mockDesign);

      const response = await request(app).get('/123');

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Test Design');
    });

    test('should handle database error', async () => {
      Design.findById.mockRejectedValue(new Error('DB error'));

      const response = await request(app).get('/123');

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /:designId', () => {
    const updateData = {
      title: 'Updated Design',
      imageUrl: 'http://example.com/updated.jpg',
      imageAlt: 'Updated',
      description: 'Updated description'
    };

    test('should update design successfully', async () => {
      Design.updateOne.mockResolvedValue({ nModified: 1 });

      const response = await request(app)
        .patch('/123')
        .send(updateData);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Design updated successfully');
    });

    test('should return error for missing required fields', async () => {
      const response = await request(app)
        .patch('/123')
        .send({ title: 'Updated' });

      expect(response.body.success).toBe(false);
    });

    test('should handle update error', async () => {
      Design.updateOne.mockRejectedValue(new Error('Update failed'));

      const response = await request(app)
        .patch('/123')
        .send(updateData);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /:designId', () => {
    test('should delete design successfully', async () => {
      Design.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const response = await request(app).delete('/123');

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Design deleted successfully');
    });

    test('should handle delete error', async () => {
      Design.deleteOne.mockRejectedValue(new Error('Delete failed'));

      const response = await request(app).delete('/123');

      expect(response.body.success).toBe(false);
    });
  });
});
