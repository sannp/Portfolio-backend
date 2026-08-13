const mongoose = require('mongoose');
const { Pool } = require('pg');
const config = require('../config');

class DatabaseManager {
  constructor() {
    this.connections = {};
  }

  async connectMongoDB() {
    const mongoUri = config.get('database.mongodb.uri');
    if (!mongoUri) {
      throw new Error('❌ Missing MONGO_DB_CONNECTION environment variable.');
    }

    try {
      const mongoOptions = config.get('database.mongodb.options');
      await mongoose.connect(mongoUri, mongoOptions);
      console.log('✅ MongoDB connected successfully');

      // Initialize GridFS on portfolio database
      const portfolioDb = mongoose.connection.useDb('portfolio');
      this.gfs = new mongoose.mongo.GridFSBucket(portfolioDb.db, {
        bucketName: config.get('upload.bucketName'),
      });

      return mongoose.connection;
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  async connectPostgreSQL() {
    const pgConfig = config.get('database.postgresql');
    if (!pgConfig.host || !pgConfig.database || !pgConfig.username) {
      throw new Error('❌ Missing required PostgreSQL configuration (POSTGRES_DB_HOST, POSTGRES_DB_NAME, POSTGRES_DB_USER).');
    }

    try {
      let sslConfig = pgConfig.ssl;
      if (pgConfig.caCert) {
        sslConfig = {
          rejectUnauthorized: true,
          ca: pgConfig.caCert,
        };
      } else if (pgConfig.ssl) {
        sslConfig = {
          rejectUnauthorized: false,
        };
      }

      const pool = new Pool({
        host: pgConfig.host,
        port: pgConfig.port,
        database: pgConfig.database,
        user: pgConfig.username,
        password: pgConfig.password,
        ssl: sslConfig,
        max: pgConfig.maxConnections,
      });

      // Test connection
      const client = await pool.connect();
      try {
        await client.query('SELECT NOW()');
      } finally {
        client.release();
      }

      console.log('✅ PostgreSQL connected successfully');
      this.connections.postgresql = pool;
      return pool;
    } catch (error) {
      console.error('❌ PostgreSQL connection error:', error);
      throw error;
    }
  }

  async initialize() {
    try {
      await this.connectMongoDB();
    } catch (error) {
      console.warn('⚠️ MongoDB connection failed:', error.message);
    }

    try {
      await this.connectPostgreSQL();
    } catch (error) {
      console.warn('⚠️ PostgreSQL connection failed:', error.message);
    }
  }

  getMongoConnection() {
    return mongoose.connection;
  }

  getPostgresConnection() {
    return this.connections.postgresql;
  }

  getGridFS() {
    return this.gfs;
  }

  async closeAll() {
    await mongoose.disconnect();
    if (this.connections.postgresql) {
      await this.connections.postgresql.end();
    }
  }
}

module.exports = new DatabaseManager();
