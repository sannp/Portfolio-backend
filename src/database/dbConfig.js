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
    try {
      const pgConfig = config.get('database.postgresql');

      // Build SSL config for Aiven (CA cert required)
      // Support both new PORTFOLIO_DB_* and legacy POSTGRES_* variable names
      let sslConfig = (process.env.PORTFOLIO_DB_SSL || process.env.POSTGRES_SSL) === 'true' || pgConfig.ssl;
      if (process.env.PORTFOLIO_DB_CA_CERT || process.env.POSTGRES_CA_CERT || pgConfig.caCert) {
        sslConfig = {
          rejectUnauthorized: true,
          ca: process.env.PORTFOLIO_DB_CA_CERT || process.env.POSTGRES_CA_CERT || pgConfig.caCert,
        };
      }

      const pool = new Pool({
        host: process.env.PORTFOLIO_DB_HOST || process.env.POSTGRES_HOST || pgConfig.host,
        port: process.env.PORTFOLIO_DB_PORT || process.env.POSTGRES_PORT || pgConfig.port,
        database: process.env.PORTFOLIO_DB_NAME || process.env.POSTGRES_DATABASE || pgConfig.database,
        user: process.env.PORTFOLIO_DB_USER || process.env.POSTGRES_USERNAME || pgConfig.username,
        password: process.env.PORTFOLIO_DB_PASS || process.env.PORTFOLIO_DB_PASSWORD || process.env.POSTGRES_PASSWORD || pgConfig.password,
        ssl: sslConfig,
        max: pgConfig.maxConnections || 5,
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

  async connectPortfolioPostgreSQL() {
    try {
      const pgConfig = config.get('database.postgresql');

      // Build SSL config for Aiven (CA cert required)
      let sslConfig = (process.env.PORTFOLIO_DB_SSL || process.env.POSTGRES_SSL) === 'true' || pgConfig.ssl;
      if (process.env.PORTFOLIO_DB_CA_CERT || process.env.POSTGRES_CA_CERT || pgConfig.caCert) {
        sslConfig = {
          rejectUnauthorized: true,
          ca: process.env.PORTFOLIO_DB_CA_CERT || process.env.POSTGRES_CA_CERT || pgConfig.caCert,
        };
      }

      // Use same connection settings but different database name
      const pool = new Pool({
        host: process.env.PORTFOLIO_DB_HOST || process.env.POSTGRES_HOST || pgConfig.host,
        port: process.env.PORTFOLIO_DB_PORT || process.env.POSTGRES_PORT || pgConfig.port,
        database: process.env.PORTFOLIO_RAG_DB_NAME || process.env.PORTFOLIO_DB_NAME || process.env.POSTGRES_DATABASE || pgConfig.database,
        user: process.env.PORTFOLIO_DB_USER || process.env.POSTGRES_USERNAME || pgConfig.username,
        password: process.env.PORTFOLIO_DB_PASS || process.env.PORTFOLIO_DB_PASSWORD || process.env.POSTGRES_PASSWORD || pgConfig.password,
        ssl: sslConfig,
        max: pgConfig.maxConnections || 5,
      });

      // Test connection
      const client = await pool.connect();
      try {
        await client.query('SELECT NOW()');
      } finally {
        client.release();
      }

      console.log('✅ Portfolio PostgreSQL connected successfully');
      this.connections.portfolioPostgresql = pool;
      return pool;
    } catch (error) {
      console.error('❌ Portfolio PostgreSQL connection error:', error);
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
      const pgHost = process.env.PORTFOLIO_DB_HOST || process.env.POSTGRES_HOST;
      const hasPostgresConfig = config.has('database.postgresql.host');
      // Only connect if PORTFOLIO_DB_HOST or POSTGRES_HOST is explicitly set and not empty
      if ((pgHost && pgHost.trim() !== '') || (!pgHost && hasPostgresConfig)) {
        await this.connectPostgreSQL();
      }
    } catch (error) {
      console.warn('⚠️ PostgreSQL connection failed, continuing without it:', error.message);
    }

    try {
      const pgHost = process.env.PORTFOLIO_DB_HOST || process.env.POSTGRES_HOST;
      const hasPostgresConfig = config.has('database.postgresql.host');
      // Only connect portfolio RAG DB if PORTFOLIO_DB_HOST is set and PORTFOLIO_RAG_DB_NAME is different
      if ((pgHost && pgHost.trim() !== '') || (!pgHost && hasPostgresConfig)) {
        await this.connectPortfolioPostgreSQL();
      }
    } catch (error) {
      console.warn('⚠️ Portfolio PostgreSQL connection failed, continuing without it:', error.message);
    }
  }

  getMongoConnection() {
    return mongoose.connection;
  }

  getPostgresConnection() {
    return this.connections.postgresql;
  }

  getPortfolioPostgresConnection() {
    return this.connections.portfolioPostgresql;
  }

  getGridFS() {
    return this.gfs;
  }

  async closeAll() {
    await mongoose.disconnect();
    if (this.connections.postgresql) {
      await this.connections.postgresql.end();
    }
    if (this.connections.portfolioPostgresql) {
      await this.connections.portfolioPostgresql.end();
    }
  }
}

module.exports = new DatabaseManager();
