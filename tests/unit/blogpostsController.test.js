const request = require('supertest');
const express = require('express');

jest.mock('../../models/BlogPosts');

const BlogPost = require('../../models/BlogPosts');
const blogpostsController = require('../../src/api/v1/projects/portfolio/controllers/blogpostsController');

describe('BlogPosts Controller', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/', blogpostsController);
    jest.clearAllMocks();
  });

  describe('POST /addnew', () => {
    const validBlogPost = {
      title: 'New Blog Post',
      value: 'new-blog-post',
      content: 'Blog post content',
      intro: 'Blog intro'
    };

    test('should create new blog post successfully', async () => {
      BlogPost.find.mockResolvedValue([]);
      const mockSave = jest.fn().mockResolvedValue({ _id: '123', id: 'post-123', ...validBlogPost });
      BlogPost.mockImplementation(() => ({ save: mockSave }));

      const response = await request(app)
        .post('/addnew')
        .send(validBlogPost);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('BlogPost Added Successfully');
    });

    test('should return error for duplicate title', async () => {
      BlogPost.find.mockResolvedValue([{ title: 'New Blog Post' }]);

      const response = await request(app)
        .post('/addnew')
        .send(validBlogPost);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Title already present.');
    });

    test('should return error when required fields missing', async () => {
      const response = await request(app)
        .post('/addnew')
        .send({ title: 'Post' });

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    test('should handle database save error', async () => {
      BlogPost.find.mockResolvedValue([]);
      const mockSave = jest.fn().mockRejectedValue(new Error('DB error'));
      BlogPost.mockImplementation(() => ({ save: mockSave }));

      const response = await request(app)
        .post('/addnew')
        .send(validBlogPost);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /all', () => {
    test('should return all blog posts', async () => {
      const mockPosts = [
        { _id: '1', title: 'Post 1', id: 'post-1' },
        { _id: '2', title: 'Post 2', id: 'post-2' }
      ];
      BlogPost.find.mockResolvedValue(mockPosts);

      const response = await request(app).get('/all');

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    test('should handle database error', async () => {
      BlogPost.find.mockRejectedValue(new Error('DB error'));

      const response = await request(app).get('/all');

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /:blogpostId', () => {
    test('should return specific blog post by ID', async () => {
      const mockPost = { _id: '123', title: 'Test Post', id: 'post-123' };
      BlogPost.findById.mockResolvedValue(mockPost);

      const response = await request(app).get('/123');

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Test Post');
    });

    test('should handle database error', async () => {
      BlogPost.findById.mockRejectedValue(new Error('DB error'));

      const response = await request(app).get('/123');

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /:blogpostId', () => {
    test('should delete blog post successfully', async () => {
      BlogPost.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const response = await request(app).delete('/123');

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('BlogPost deleted successfully');
    });

    test('should handle delete error', async () => {
      BlogPost.deleteOne.mockRejectedValue(new Error('Delete failed'));

      const response = await request(app).delete('/123');

      expect(response.body.success).toBe(false);
    });
  });
});
