const request = require('supertest');
const express = require('express');

// Mock the Project model
jest.mock('../../models/Projects');

const Project = require('../../models/Projects');
const projectsController = require('../../src/api/v1/projects/portfolio/controllers/projectsController');

describe('Projects Controller', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/', projectsController);
    jest.clearAllMocks();
  });

  describe('POST /addnew', () => {
    const validProject = {
      title: 'Test Project',
      imageUrl: 'http://example.com/image.jpg',
      imageAlt: 'Test Image',
      description: 'Test description',
      badges: ['badge1', 'badge2'],
      button1: 'View',
      button1Url: 'http://example.com',
      button2: 'GitHub',
      button2Url: 'http://github.com'
    };

    test('should create new project successfully', async () => {
      Project.find.mockResolvedValue([]);
      const mockSave = jest.fn().mockResolvedValue({ _id: '123', ...validProject });
      Project.mockImplementation(() => ({
        save: mockSave
      }));

      const response = await request(app)
        .post('/addnew')
        .send(validProject);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Project Added Successfully');
      expect(mockSave).toHaveBeenCalled();
    });

    test('should return error when title already exists', async () => {
      Project.find.mockResolvedValue([{ title: 'Test Project' }]);

      const response = await request(app)
        .post('/addnew')
        .send(validProject);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Title already present.');
    });

    test('should return error when required fields are missing', async () => {
      const response = await request(app)
        .post('/addnew')
        .send({ title: 'Test Project' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    test('should handle database save error', async () => {
      Project.find.mockResolvedValue([]);
      const mockSave = jest.fn().mockRejectedValue(new Error('Database error'));
      Project.mockImplementation(() => ({
        save: mockSave
      }));

      const response = await request(app)
        .post('/addnew')
        .send(validProject);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
    });

    test('should return error when title is missing', async () => {
      const response = await request(app)
        .post('/addnew')
        .send({
          imageUrl: 'http://example.com/image.jpg',
          imageAlt: 'Test Image',
          description: 'Test description'
        });

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    test('should return error when imageUrl is missing', async () => {
      const response = await request(app)
        .post('/addnew')
        .send({
          title: 'Test Project',
          imageAlt: 'Test Image',
          description: 'Test description'
        });

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /all', () => {
    test('should return all projects', async () => {
      const mockProjects = [
        { _id: '1', title: 'Project 1' },
        { _id: '2', title: 'Project 2' }
      ];
      Project.find.mockResolvedValue(mockProjects);

      const response = await request(app).get('/all');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(Project.find).toHaveBeenCalled();
    });

    test('should handle database error when fetching all projects', async () => {
      Project.find.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/all');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
    });

    test('should return empty array when no projects exist', async () => {
      Project.find.mockResolvedValue([]);

      const response = await request(app).get('/all');

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('GET /:projectId', () => {
    test('should return specific project by ID', async () => {
      const mockProject = { _id: '123', title: 'Test Project' };
      Project.findById.mockResolvedValue(mockProject);

      const response = await request(app).get('/123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Test Project');
      expect(Project.findById).toHaveBeenCalledWith('123');
    });

    test('should handle database error when fetching project', async () => {
      Project.findById.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
    });

    test('should return null when project not found', async () => {
      Project.findById.mockResolvedValue(null);

      const response = await request(app).get('/999');

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeNull();
    });
  });

  describe('PATCH /:projectId', () => {
    const updateData = {
      title: 'Updated Project',
      imageUrl: 'http://example.com/updated.jpg',
      imageAlt: 'Updated Image',
      description: 'Updated description'
    };

    test('should update project successfully', async () => {
      Project.updateOne.mockResolvedValue({ nModified: 1 });

      const response = await request(app)
        .patch('/123')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Project updated successfully');
      expect(Project.updateOne).toHaveBeenCalledWith(
        { _id: '123' },
        { $set: expect.any(Object) }
      );
    });

    test('should return error when required fields are missing for update', async () => {
      const response = await request(app)
        .patch('/123')
        .send({ title: 'Updated Project' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    test('should handle database error during update', async () => {
      Project.updateOne.mockRejectedValue(new Error('Update failed'));

      const response = await request(app)
        .patch('/123')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /:projectId', () => {
    test('should delete project successfully', async () => {
      Project.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const response = await request(app).delete('/123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Project deleted successfully');
      expect(Project.deleteOne).toHaveBeenCalledWith({ _id: '123' });
    });

    test('should handle database error during delete', async () => {
      Project.deleteOne.mockRejectedValue(new Error('Delete failed'));

      const response = await request(app).delete('/123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
    });
  });
});
