const request = require('supertest');
const express = require('express');

// Mock the Project model
jest.mock('#models/Projects');

const Project = require('#models/Projects');
const projectsController = require('../../src/api/projects/personal/controllers/projectsController');

describe('Projects Controller Unit Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/', projectsController);
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    test('should retrieve projects with pagination, type filter, and sorting successfully via query params', async () => {
      const mockProjects = [
        { _id: '1', title: 'Test Project', description: 'desc', type: 'project', imageUrl: 'img.jpg', imageAlt: 'alt' }
      ];
      Project.countDocuments.mockResolvedValue(1);
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue(mockProjects)
        })
      };
      Project.find.mockReturnValue(mockQuery);

      const response = await request(app).get('/?type=project&page=1&limit=10&sortBy=title&sortOrder=asc');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Projects retrieved successfully');
      expect(response.body.data.items).toEqual(mockProjects);
      expect(response.body.data.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });
      expect(Project.find).toHaveBeenCalledWith({ type: 'project' });
      expect(mockQuery.sort).toHaveBeenCalledWith({ title: 1 });
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
    });

    test('should retrieve projects with search query successfully', async () => {
      const mockProjects = [
        { _id: '1', title: 'Test Project', description: 'desc', type: 'project', imageUrl: 'img.jpg', imageAlt: 'alt' }
      ];
      Project.countDocuments.mockResolvedValue(1);
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue(mockProjects)
        })
      };
      Project.find.mockReturnValue(mockQuery);

      const response = await request(app).get('/?search=Test');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Project.find).toHaveBeenCalledWith({
        $or: [
          { title: { $regex: 'Test', $options: 'i' } },
          { description: { $regex: 'Test', $options: 'i' } },
          { badges: { $regex: 'Test', $options: 'i' } }
        ]
      });
    });

    test('should handle database error when fetching projects', async () => {
      Project.countDocuments.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Database error');
      expect(response.body.data).toBeNull();
    });
  });

  describe('GET /type/:type', () => {
    test('should retrieve projects filtered by type and paginated successfully', async () => {
      const mockProjects = [
        { _id: '1', title: 'Test Project', description: 'desc', type: 'project', imageUrl: 'img.jpg', imageAlt: 'alt' }
      ];
      Project.countDocuments.mockResolvedValue(1);
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue(mockProjects)
        })
      };
      Project.find.mockReturnValue(mockQuery);

      const response = await request(app).get('/type/project?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toEqual(mockProjects);
      expect(response.body.data.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });
      expect(Project.find).toHaveBeenCalledWith({ type: 'project' });
    });

    test('should return 400 when type is invalid', async () => {
      const response = await request(app).get('/type/invalid');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid type');
    });

    test('should handle database errors when retrieving filtered items', async () => {
      Project.countDocuments.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/type/project');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /', () => {
    const validProject = {
      title: 'Test Project',
      imageUrl: 'http://example.com/image.jpg',
      imageAlt: 'Test Image',
      description: 'Test description',
      type: 'project',
      badges: ['badge1', 'badge2'],
      codeLink: 'http://github.com',
      previewLink: 'http://example.com'
    };

    test('should create new project successfully', async () => {
      Project.findOne.mockResolvedValue(null);
      const mockSave = jest.fn().mockResolvedValue({ _id: '123', ...validProject });
      Project.mockImplementation(() => ({
        save: mockSave
      }));

      const response = await request(app)
        .post('/')
        .send(validProject);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Project Added Successfully');
      expect(mockSave).toHaveBeenCalled();
    });

    test('should return error when title already exists', async () => {
      Project.findOne.mockResolvedValue({ title: 'Test Project' });

      const response = await request(app)
        .post('/')
        .send(validProject);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Title already present.');
    });

    test('should return error when required fields are missing', async () => {
      const response = await request(app)
        .post('/')
        .send({ title: 'Test Project' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    test('should return error when type is invalid', async () => {
      const response = await request(app)
        .post('/')
        .send({ ...validProject, type: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should handle database save error', async () => {
      Project.findOne.mockResolvedValue(null);
      const mockSave = jest.fn().mockRejectedValue(new Error('Database error'));
      Project.mockImplementation(() => ({
        save: mockSave
      }));

      const response = await request(app)
        .post('/')
        .send(validProject);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /:projectId', () => {
    const updateData = {
      title: 'Updated Project',
      imageUrl: 'http://example.com/updated.jpg',
      imageAlt: 'Updated Image',
      description: 'Updated description',
      type: 'project',
      badges: ['new-badge']
    };

    test('should update project successfully', async () => {
      const mockUpdated = { _id: '123', ...updateData };
      const mockSelect = jest.fn().mockResolvedValue(mockUpdated);
      Project.findByIdAndUpdate.mockReturnValue({
        select: mockSelect
      });

      const response = await request(app)
        .put('/123')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Project updated successfully');
      expect(response.body.data).toEqual(mockUpdated);
      expect(Project.findByIdAndUpdate).toHaveBeenCalledWith(
        '123',
        {
          $set: {
            title: updateData.title,
            description: updateData.description,
            imageUrl: updateData.imageUrl,
            imageAlt: updateData.imageAlt,
            badges: updateData.badges,
            codeLink: undefined,
            previewLink: undefined,
            type: 'project'
          }
        },
        { new: true }
      );
    });

    test('should return 400 when required fields are missing for update', async () => {
      const response = await request(app)
        .put('/123')
        .send({ title: 'Updated Project' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    test('should return 404 when project not found during update', async () => {
      const mockSelect = jest.fn().mockResolvedValue(null);
      Project.findByIdAndUpdate.mockReturnValue({
        select: mockSelect
      });

      const response = await request(app)
        .put('/123')
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Project not found');
    });

    test('should handle database error during update', async () => {
      Project.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Update failed'))
      });

      const response = await request(app)
        .put('/123')
        .send(updateData);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /:projectId', () => {
    test('should delete project successfully', async () => {
      const mockDeleted = { _id: '123', title: 'Test Project' };
      const mockSelect = jest.fn().mockResolvedValue(mockDeleted);
      Project.findByIdAndDelete.mockReturnValue({
        select: mockSelect
      });

      const response = await request(app).delete('/123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Project deleted successfully');
      expect(response.body.data).toEqual(mockDeleted);
      expect(Project.findByIdAndDelete).toHaveBeenCalledWith('123');
    });

    test('should return 404 when project not found during delete', async () => {
      const mockSelect = jest.fn().mockResolvedValue(null);
      Project.findByIdAndDelete.mockReturnValue({
        select: mockSelect
      });

      const response = await request(app).delete('/123');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Project not found');
    });

    test('should handle database error during delete', async () => {
      Project.findByIdAndDelete.mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Delete failed'))
      });

      const response = await request(app).delete('/123');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});
