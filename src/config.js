'use strict';

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
    port: int(process.env.PORT, 5000),
    host: str(process.env.SERVER_HOST, '0.0.0.0'),
  },
  security: {
    apiSecret: str(process.env.API_SECRET, ''),
  },
  database: {
    mongodb: {
      uri: str(process.env.MONGO_DB_CONNECTION, ''),
      options: {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      },
    },
    postgresql: {
      host: str(process.env.POSTGRES_DB_HOST, ''),
      port: int(process.env.POSTGRES_DB_PORT, 5432),
      database: str(process.env.POSTGRES_DB_NAME, ''),
      username: str(process.env.POSTGRES_DB_USER, ''),
      password: str(process.env.POSTGRES_DB_PASS, ''),
      ssl: bool(process.env.POSTGRES_DB_SSL, false),
      caCert: str(process.env.POSTGRES_DB_CA_CERT, ''),
      maxConnections: 10,
    },
  },
  ai: {
    defaultProvider: str(process.env.AI_DEFAULT_PROVIDER, 'groq'),
    providers: {
      gemini: {
        apiKey: str(process.env.GEMINI_API_KEY, ''),
        model: 'gemini-3.5-flash',
        maxTokens: 1000,
        temperature: 0.7,
      },
      openai: {
        apiKey: str(process.env.OPENAI_API_KEY, ''),
        model: 'gpt-4o-mini',
        maxTokens: 1000,
        temperature: 0.7,
      },
      groq: {
        apiKey: str(process.env.GROQ_API_KEY, ''),
        model: 'llama-3.3-70b-versatile',
        maxTokens: 1000,
        temperature: 0.7,
      },
      anthropic: {
        apiKey: str(process.env.ANTHROPIC_API_KEY, ''),
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 1000,
        temperature: 0.7,
      },
    },
  },
  projects: {
    personal: {
      chat: {
        rag: {
          topK: 5,
          similarityThreshold: 0.5,
        },
      },
    },
    research: {
      analystModel: 'gemini-2.5-flash',
      fastModel: 'gemini-2.5-flash',
      maxRequestsPerIp: 2,
    },
  },
  upload: {
    maxFileSize: 20000000,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
    bucketName: 'uploads',
  },
  cors: {
    origin: arr(process.env.CORS_ORIGIN, ['*']),
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
