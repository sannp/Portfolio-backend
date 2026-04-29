const mongoose = require('mongoose');
const { Pool } = require('pg');
const config = require('config');

class DatabaseManager {
  constructor() {
    this.connections = {};
    this.defaultDB = process.env.DB_DEFAULT || config.get('database.default');
  }

  async connectMongoDB() {
    try {
      const mongoUri = process.env.DB_CONNECTION || config.get('database.mongodb.uri');
      const mongoOptions = config.get('database.mongodb.options');
      await mongoose.connect(mongoUri, mongoOptions);
      console.log('✅ MongoDB connected successfully');
      
      // Initialize GridFS
      this.gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: config.get('upload.bucketName'),
      });
      
      return mongoose.connection;
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  async connectPostgreSQL() {
    try {
      const pgConfig = config.get('database.postgresql');
      
      // Build SSL config for Aiven (CA cert required)
      let sslConfig = process.env.POSTGRES_SSL === 'true' || pgConfig.ssl;
      if (process.env.POSTGRES_CA_CERT || pgConfig.caCert) {
        sslConfig = {
          rejectUnauthorized: true,
          ca: process.env.POSTGRES_CA_CERT || pgConfig.caCert,
        };
      }
      
      const pool = new Pool({
        host: process.env.POSTGRES_HOST || pgConfig.host,
        port: process.env.POSTGRES_PORT || pgConfig.port,
        database: process.env.POSTGRES_DATABASE || pgConfig.database,
        user: process.env.POSTGRES_USERNAME || pgConfig.username,
        password: process.env.POSTGRES_PASSWORD || pgConfig.password,
        ssl: sslConfig,
        max: pgConfig.maxConnections || 5,
      });

      // Test connection
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
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
      const hasMongoUri = process.env.DB_CONNECTION || config.has('database.mongodb.uri');
      if (this.defaultDB === 'mongodb' || hasMongoUri) {
        await this.connectMongoDB();
      }
    } catch (error) {
      console.warn('⚠️ MongoDB connection failed, continuing without it:', error.message);
    }

    try {
      const pgHost = process.env.POSTGRES_HOST;
      const hasPostgresConfig = config.has('database.postgresql.host');
      // Only connect if POSTGRES_HOST is explicitly set and not empty
      if ((pgHost && pgHost.trim() !== '') || (!pgHost && hasPostgresConfig)) {
        await this.connectPostgreSQL();
      }
    } catch (error) {
      console.warn('⚠️ PostgreSQL connection failed, continuing without it:', error.message);
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
