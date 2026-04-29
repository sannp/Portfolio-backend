const request = require('supertest');
const express = require('express');

jest.mock('../../models/Categories');

const Category = require('../../models/Categories');
const categoriesController = require('../../src/api/v1/projects/portfolio/controllers/categoriesController');

describe('Categories Controller', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/', categoriesController);
    jest.clearAllMocks();
  });

  describe('POST /addnew', () => {
    const validCategory = {
      title: 'New Category',
      value: 'new-category',
      category: 'main'
    };

    test('should create new category successfully', async () => {
      Category.find.mockResolvedValue([]);
      const mockSave = jest.fn().mockResolvedValue({ _id: '123', id: 'cat-123', ...validCategory });
      Category.mockImplementation(() => ({ save: mockSave }));

      const response = await request(app)
        .post('/addnew')
        .send(validCategory);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Category Added Successfully');
    });

    test('should return error for duplicate title', async () => {
      Category.find.mockResolvedValue([{ title: 'New Category' }]);

      const response = await request(app)
        .post('/addnew')
        .send(validCategory);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Title already present.');
    });

    test('should return error when required fields missing', async () => {
      const response = await request(app)
        .post('/addnew')
        .send({ title: 'Category' });

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    test('should handle database save error', async () => {
      Category.find.mockResolvedValue([]);
      const mockSave = jest.fn().mockRejectedValue(new Error('DB error'));
      Category.mockImplementation(() => ({ save: mockSave }));

      const response = await request(app)
        .post('/addnew')
        .send(validCategory);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /all', () => {
    test('should return all categories', async () => {
      const mockCategories = [
        { _id: '1', title: 'Category 1', id: 'cat-1' },
        { _id: '2', title: 'Category 2', id: 'cat-2' }
      ];
      Category.find.mockResolvedValue(mockCategories);

      const response = await request(app).get('/all');

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    test('should handle database error', async () => {
      Category.find.mockRejectedValue(new Error('DB error'));

      const response = await request(app).get('/all');

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /:categoryId', () => {
    test('should return specific category by ID', async () => {
      const mockCategory = { _id: '123', title: 'Test Category', id: 'cat-123' };
      Category.findById.mockResolvedValue(mockCategory);

      const response = await request(app).get('/123');

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Test Category');
    });

    test('should handle database error', async () => {
      Category.findById.mockRejectedValue(new Error('DB error'));

      const response = await request(app).get('/123');

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /:categoryId', () => {
    const updateData = {
      title: 'Updated Category',
      value: 'updated-category',
      category: 'updated',
      id: 'cat-123'
    };

    test('should update category successfully', async () => {
      Category.updateOne.mockResolvedValue({ nModified: 1 });

      const response = await request(app)
        .patch('/123')
        .send(updateData);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Category updated successfully');
    });

    test('should return error for missing required fields', async () => {
      const response = await request(app)
        .patch('/123')
        .send({ title: 'Updated' });

      expect(response.body.success).toBe(false);
    });

    test('should handle update error', async () => {
      Category.updateOne.mockRejectedValue(new Error('Update failed'));

      const response = await request(app)
        .patch('/123')
        .send(updateData);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /:categoryId', () => {
    test('should delete category successfully', async () => {
      Category.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const response = await request(app).delete('/123');

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Category deleted successfully');
    });

    test('should handle delete error', async () => {
      Category.deleteOne.mockRejectedValue(new Error('Delete failed'));

      const response = await request(app).delete('/123');

      expect(response.body.success).toBe(false);
    });
  });
});
