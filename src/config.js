// src/config.js
// Replaces the `config` npm package for this project.
// - Reads from process.env with sensible defaults
// - dotenv must be loaded before this module is required
// - Exports a frozen object tree plus get/has/getCorsOptions helpers
'use strict';

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

// --- coercion helpers -----------------------------------------------------

const int  = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const num  = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const bool = (v, d) => (v == null ? d : String(v).toLowerCase() === 'true');
const str  = (v, d) => (v == null || v === '' ? d : String(v));
const arr  = (v, d) => {
  if (v == null || v === '') return d;
  if (String(v).trim().startsWith('[')) {
    try { return JSON.parse(v); } catch (_) { /* fall through */ }
  }
  return String(v).split(',').map(s => s.trim()).filter(Boolean);
};

// --- defaults tree --------------------------------------------------------

const defaults = {
  server: {
    port: int(process.env.PORT, isProd ? 3000 : 5000),
    host: str(process.env.SERVER_HOST, isProd ? '0.0.0.0' : 'localhost'),
  },
  security: {
    apiSecret: str(process.env.API_SECRET, ''),
  },
  database: {
    default: str(process.env.DB_DEFAULT, 'mongodb'),
    mongodb: {
      uri: str(process.env.DB_CONNECTION || process.env.MONGODB_URI, 'mongodb://localhost:27017/portfolio'),
      options: {
        maxPoolSize: int(process.env.MONGO_MAX_POOL_SIZE, isProd ? 20 : 10),
        serverSelectionTimeoutMS: int(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS, 5000),
        socketTimeoutMS: int(process.env.MONGO_SOCKET_TIMEOUT_MS, 45000),
      },
    },
    postgresql: {
      host: str(process.env.PORTFOLIO_DB_HOST || process.env.POSTGRES_HOST, 'localhost'),
      port: int(process.env.PORTFOLIO_DB_PORT || process.env.POSTGRES_PORT, 5432),
      database: str(process.env.PORTFOLIO_DB_NAME || process.env.POSTGRES_DATABASE, 'base_server'),
      username: str(process.env.PORTFOLIO_DB_USER || process.env.POSTGRES_USERNAME, ''),
      password: str(process.env.PORTFOLIO_DB_PASS || process.env.POSTGRES_PASSWORD, ''),
      ssl: bool(process.env.PORTFOLIO_DB_SSL || process.env.POSTGRES_SSL, false),
      maxConnections: int(process.env.PORTFOLIO_DB_MAX_CONNECTIONS, 10),
    },
  },
  ai: {
    defaultProvider: str(process.env.AI_DEFAULT_PROVIDER, 'groq'),
    providers: {
      gemini: {
        apiKey: str(process.env.GEMINI_API_KEY, ''),
        model: str(process.env.GEMINI_MODEL, 'gemini-3.5-flash'),
        maxTokens: int(process.env.GEMINI_MAX_TOKENS, 1000),
        temperature: num(process.env.GEMINI_TEMPERATURE, 0.7),
      },
      openai: {
        apiKey: str(process.env.OPENAI_API_KEY, ''),
        model: str(process.env.OPENAI_MODEL, 'gpt-4o-mini'),
        maxTokens: int(process.env.OPENAI_MAX_TOKENS, 1000),
        temperature: num(process.env.OPENAI_TEMPERATURE, 0.7),
      },
      groq: {
        apiKey: str(process.env.GROQ_API_KEY, ''),
        model: str(process.env.GROQ_MODEL, 'llama-3.3-70b-versatile'),
        maxTokens: int(process.env.GROQ_MAX_TOKENS, 1000),
        temperature: num(process.env.GROQ_TEMPERATURE, 0.7),
      },
      anthropic: {
        apiKey: str(process.env.ANTHROPIC_API_KEY, ''),
        model: str(process.env.ANTHROPIC_MODEL, 'claude-3-5-sonnet-20241022'),
        maxTokens: int(process.env.ANTHROPIC_MAX_TOKENS, 1000),
        temperature: num(process.env.ANTHROPIC_TEMPERATURE, 0.7),
      },
    },
  },
  projects: {
    personal: {
      chat: {
        rag: {
          topK: int(process.env.RAG_TOP_K, 5),
          similarityThreshold: num(process.env.RAG_SIMILARITY_THRESHOLD, 0.5),
        },
      },
    },
    research: {
      analystModel: str(process.env.ANALYST_MODEL, 'gemini-2.5-flash'),
      fastModel: str(process.env.FAST_MODEL, 'gemini-2.5-flash'),
      maxRequestsPerIp: int(process.env.MAX_REQUESTS_PER_IP, 2),
    },
  },
  upload: {
    maxFileSize: int(process.env.MAX_FILE_SIZE, 20000000),
    allowedTypes: arr(process.env.UPLOAD_ALLOWED_TYPES, ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']),
    bucketName: str(process.env.UPLOAD_BUCKET, 'uploads'),
  },
  cors: {
    origin: arr(process.env.CORS_ORIGIN, isProd
      ? ['https://sanket-patil.web.app', 'https://sanket-patil.firebaseapp.com', 'https://ai-research-assistant-ashy.vercel.app']
      : ['http://localhost:8080', 'https://sanket-patil.web.app', 'https://sanket-patil.firebaseapp.com', 'https://ai-research-assistant-ashy.vercel.app']
    ),
    credentials: bool(process.env.CORS_CREDENTIALS, true),
  },
};

// --- freeze (shallow, leaf values only) -----------------------------------

function freezeLeaves(obj) {
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v && typeof v === 'object' && !Object.isFrozen(v)) freezeLeaves(v);
  }
  return obj;
}
freezeLeaves(defaults);

// --- dot-path resolver ----------------------------------------------------

function resolveDot(obj, path) {
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

// --- exports --------------------------------------------------------------

const config = defaults;

config.get = function get(key) {
  return resolveDot(config, key);
};

config.has = function has(key) {
  const v = resolveDot(config, key);
  if (v == null) return false;
  if (typeof v === 'string' && v === '') return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
};

config.getCorsOptions = function getCorsOptions() {
  const env = process.env.CORS_ORIGIN;
  let origin;
  if (env) {
    origin = env.includes(',') ? env.split(',').map(s => s.trim()).filter(Boolean) : env;
  } else {
    origin = config.get('cors.origin');
  }
  return {
    origin,
    credentials: config.get('cors.credentials'),
  };
};

module.exports = config;
