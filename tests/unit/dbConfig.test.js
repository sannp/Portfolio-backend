const mongoose = require('mongoose');
const { Pool } = require('pg');

// Mock mongoose
jest.mock('mongoose', () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  createConnection: jest.fn(() => ({
    on: jest.fn(),
    once: jest.fn(),
    close: jest.fn().mockResolvedValue()
  })),
  connection: {
    db: {},
    useDb: jest.fn(() => ({ db: {} }))
  },
  mongo: {
    GridFSBucket: jest.fn()
  }
}));

// Mock pg
jest.mock('pg', () => ({
  Pool: jest.fn()
}));

// Mock config
jest.mock('../../src/config', () => {
  const configObj = {
    'database.default': 'mongodb',
    'database.mongodb': {
      uri: 'mongodb://localhost:27017/test',
      options: { useNewUrlParser: true }
    },
    'database.mongodb.uri': 'mongodb://localhost:27017/test',
    'database.mongodb.options': { useNewUrlParser: true },
    'database.postgresql': {
      host: 'localhost',
      port: 5432,
      database: 'testdb',
      username: 'testuser',
      password: 'testpass',
      ssl: false,
      maxConnections: 10
    },
    'database.postgresql.host': 'localhost',
    'upload.bucketName': 'uploads'
  };

  return {
    get: jest.fn((key) => configObj[key]),
    has: jest.fn((key) => key in configObj)
  };
});

const dbManager = require('../../src/database/dbConfig');

describe('DatabaseManager', () => {
  const envVars = [
    'DB_DEFAULT',
    'DB_CONNECTION',
    'PORTFOLIO_DB_SSL',
    'POSTGRES_SSL',
    'PORTFOLIO_DB_CA_CERT',
    'POSTGRES_CA_CERT',
    'PORTFOLIO_DB_HOST',
    'POSTGRES_HOST',
    'PORTFOLIO_DB_PORT',
    'POSTGRES_PORT',
    'PORTFOLIO_DB_NAME',
    'POSTGRES_DATABASE',
    'PORTFOLIO_DB_USER',
    'POSTGRES_USERNAME',
    'PORTFOLIO_DB_PASS',
    'PORTFOLIO_DB_PASSWORD',
    'POSTGRES_PASSWORD',
    'PORTFOLIO_RAG_DB_NAME'
  ];
  const envBackup = {};

  beforeAll(() => {
    envVars.forEach(v => {
      envBackup[v] = process.env[v];
      delete process.env[v];
    });
  });

  afterAll(() => {
    envVars.forEach(v => {
      if (envBackup[v] !== undefined) {
        process.env[v] = envBackup[v];
      }
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the singleton state
    dbManager.connections = {};
    dbManager.gfs = null;
  });

  describe('constructor', () => {
    test('should initialize with empty connections', () => {
      expect(dbManager.connections).toEqual({});
    });

    test('should set default database from config', () => {
      expect(dbManager.defaultDB).toBe('mongodb');
    });
  });

  describe('connectMongoDB', () => {
    test('should connect to MongoDB successfully', async () => {
      mongoose.connect.mockResolvedValue();
      mongoose.mongo.GridFSBucket.mockImplementation(() => ({ gfs: true }));

      const result = await dbManager.connectMongoDB();

      expect(mongoose.connect).toHaveBeenCalledWith(
        'mongodb://localhost:27017/test',
        { useNewUrlParser: true }
      );
      expect(mongoose.mongo.GridFSBucket).toHaveBeenCalled();
      expect(dbManager.gfs).toBeDefined();
    });

    test('should throw error when MongoDB connection fails', async () => {
      mongoose.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(dbManager.connectMongoDB()).rejects.toThrow('Connection failed');
    });
  });

  describe('connectPostgreSQL', () => {
    test('should connect to PostgreSQL successfully', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient)
      };
      Pool.mockImplementation(() => mockPool);

      const result = await dbManager.connectPostgreSQL();

      expect(Pool).toHaveBeenCalledWith({
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
        ssl: false,
        max: 10
      });
      expect(mockClient.query).toHaveBeenCalledWith('SELECT NOW()');
      expect(mockClient.release).toHaveBeenCalled();
      expect(dbManager.connections.postgresql).toBe(mockPool);
    });

    test('should throw error when PostgreSQL connection fails', async () => {
      Pool.mockImplementation(() => {
        throw new Error('PG Connection failed');
      });

      await expect(dbManager.connectPostgreSQL()).rejects.toThrow('PG Connection failed');
    });

    test('should throw error when query test fails', async () => {
      const mockClient = {
        query: jest.fn().mockRejectedValue(new Error('Query failed')),
        release: jest.fn()
      };
      const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient)
      };
      Pool.mockImplementation(() => mockPool);

      await expect(dbManager.connectPostgreSQL()).rejects.toThrow('Query failed');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('initialize', () => {
    test('should initialize both databases successfully', async () => {
      mongoose.connect.mockResolvedValue();
      mongoose.mongo.GridFSBucket.mockReturnValue({});

      const mockClient = {
        query: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      Pool.mockImplementation(() => ({
        connect: jest.fn().mockResolvedValue(mockClient)
      }));

      await dbManager.initialize();

      expect(mongoose.connect).toHaveBeenCalled();
    });

    test('should continue if MongoDB fails but PostgreSQL succeeds', async () => {
      mongoose.connect.mockRejectedValue(new Error('Mongo failed'));

      const mockClient = {
        query: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      Pool.mockImplementation(() => ({
        connect: jest.fn().mockResolvedValue(mockClient)
      }));

      await dbManager.initialize();

      expect(dbManager.connections.postgresql).toBeDefined();
    });

    test('should continue if PostgreSQL fails but MongoDB succeeds', async () => {
      mongoose.connect.mockResolvedValue();
      mongoose.mongo.GridFSBucket.mockReturnValue({});
      Pool.mockImplementation(() => {
        throw new Error('PG failed');
      });

      await dbManager.initialize();

      expect(dbManager.gfs).toBeDefined();
    });
  });

  describe('getters', () => {
    test('getMongoConnection should return mongoose connection', () => {
      const result = dbManager.getMongoConnection();
      expect(result).toBe(mongoose.connection);
    });

    test('getPostgresConnection should return postgresql pool', () => {
      dbManager.connections.postgresql = { pool: true };
      const result = dbManager.getPostgresConnection();
      expect(result).toEqual({ pool: true });
    });

    test('getGridFS should return gfs instance', () => {
      dbManager.gfs = { bucket: true };
      const result = dbManager.getGridFS();
      expect(result).toEqual({ bucket: true });
    });

    test('getGridFS should return null if not initialized', () => {
      dbManager.gfs = null;
      const result = dbManager.getGridFS();
      expect(result).toBeNull();
    });
  });

  describe('closeAll', () => {
    test('should close all connections', async () => {
      const mockEnd = jest.fn().mockResolvedValue();
      dbManager.connections.postgresql = { end: mockEnd };
      mongoose.disconnect.mockResolvedValue();

      await dbManager.closeAll();

      expect(mongoose.disconnect).toHaveBeenCalled();
      expect(mockEnd).toHaveBeenCalled();
    });

    test('should handle case when postgresql connection not connected', async () => {
      mongoose.disconnect.mockResolvedValue();

      await dbManager.closeAll();

      expect(mongoose.disconnect).toHaveBeenCalled();
    });
  });
});
