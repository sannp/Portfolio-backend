const request = require('supertest');
const express = require('express');

// Mock ServerLog model
jest.mock('#models/ServerLog');
const ServerLog = require('#models/ServerLog');
const researchRoutes = require('../../src/api/research/routes');

describe('Logging Middleware Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/research', researchRoutes);
    jest.clearAllMocks();
    
    // Setup mock save method
    ServerLog.prototype.save = jest.fn().mockResolvedValue({});
  });

  it('should log a request to the database when accessing /api/research/health', async () => {
    await request(app)
      .get('/api/research/health')
      .expect(200);

    // Wait for the 'finish' event to trigger and save the log
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(ServerLog.prototype.save).toHaveBeenCalled();
  });
});
