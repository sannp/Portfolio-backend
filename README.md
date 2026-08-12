# Base Server Template

A scalable Node.js/Express boilerplate server with multi-database support, AI integrations, and modular project structure.

## 🚀 Features

- **Multi-Database Support**: MongoDB (Mongoose) & PostgreSQL (via Aiven)
- **AI Integrations**: OpenAI, Google Gemini, Grok (xAI) with unified service layer
- **Modular Architecture**: Project-based routing with configurable structure
- **File Storage**: GridFS for MongoDB file uploads
- **Configuration Management**: Environment-based config system
- **TypeScript Ready**: Structured for easy TypeScript migration

## 📋 Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Runtime | Node.js | 18.x+ |
| Framework | Express.js | 4.21.2 |
| Database | MongoDB | 6.0+ |
| Database | Aiven PostgreSQL | 13+ |
| ODM | Mongoose | 8.14.0 |
| AI Services | OpenAI, Gemini, Grok | Latest |
| Configuration | env (dotenv + src/config.js) | n/a |
| File Upload | Multer + GridFS | 1.4.5-lts.1 |

## 🛠️ Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd base-server-template
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Server

```bash
# Development
npm run dev

# Production
npm start
```

## 📁 Project Structure

```
base-server-template/
├── src/
│   ├── api/
│   │   └── v1/
│   │       └── projects/
│   │           └── portfolio/
│   │               ├── routes.js
│   │               └── controllers/
│   ├── config.js             # Env-driven config (replaces node-config)
│   ├── database/
│   │   └── dbConfig.js       # Database manager
│   ├── services/
│   │   ├── aiService.js      # Unified AI service
│   │   ├── openAI.js         # OpenAI integration
│   │   ├── googleGemini.js   # Gemini integration
│   │   └── grokAPI.js        # Grok integration
│   └── app.js                # Express app configuration
├── models/                    # Mongoose models (legacy)
├── routes/                    # Legacy routes (being migrated)
├── .env.example              # Environment template
├── server.js                 # Server entry point
└── package.json
```

## 🔧 Configuration

### Database Configuration

All database connection values come from environment variables. See `.env.example` for the full list. Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_DEFAULT` | `mongodb` | Which database to use by default (`mongodb` or `postgresql`) |
| `DB_CONNECTION` | — | MongoDB connection URI |
| `MONGO_MAX_POOL_SIZE` | `10` (dev) / `20` (prod) | Mongoose pool size |
| `PORTFOLIO_DB_HOST` | `localhost` | PostgreSQL host |
| `PORTFOLIO_DB_PORT` | `5432` | PostgreSQL port |
| `PORTFOLIO_DB_NAME` | `base_server` | PostgreSQL database name |
| `PORTFOLIO_DB_USER` / `PORTFOLIO_DB_PASS` | — | PostgreSQL credentials |
| `PORTFOLIO_DB_SSL` | `false` | Enable SSL (Aiven) |

Defaults for non-secret values live in `src/config.js`. Override per-environment via env vars.

### AI Service Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_DEFAULT_PROVIDER` | `groq` | Provider to try first |
| `OPENAI_API_KEY` | — | OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o-mini` | Default OpenAI model |
| `OPENAI_MAX_TOKENS` | `1000` | Default max tokens |
| `OPENAI_TEMPERATURE` | `0.7` | Default temperature |
| `GEMINI_API_KEY` | — | Google Gemini API key |
| `GEMINI_MODEL` | `gemini-3.5-flash` | Default Gemini model |
| `GROQ_API_KEY` | — | Groq API key |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Default Groq model |
| `ANTHROPIC_API_KEY` | — | Anthropic API key |
| `ANTHROPIC_MODEL` | `claude-3-5-sonnet-20241022` | Default Anthropic model |

Each provider exposes the same `*_MAX_TOKENS` / `*_TEMPERATURE` overrides. To add a new provider or change defaults, edit the relevant section in `src/config.js`.

## 📚 API Documentation

### Base Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |
| GET | `/` | API overview |
| POST | `/api/v1/ai/:action` | AI service endpoint |

### Portfolio API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/portfolio` | Portfolio project info |
| GET | `/api/v1/portfolio/projects/all` | List all projects |
| POST | `/api/v1/portfolio/projects/addnew` | Create project |
| GET | `/api/v1/portfolio/projects/:id` | Get project |
| PATCH | `/api/v1/portfolio/projects/:id` | Update project |
| DELETE | `/api/v1/portfolio/projects/:id` | Delete project |

### AI Service Usage

```javascript
// Text Generation
POST /api/v1/ai/generate
{
  "prompt": "Write a hello world program",
  "options": {
    "provider": "openai",
    "maxTokens": 1000
  }
}

// Text Analysis
POST /api/v1/ai/analyze
{
  "prompt": "This is amazing!",
  "options": {
    "provider": "gemini"
  }
}

// Image Generation
POST /api/v1/ai/image
{
  "prompt": "A futuristic city",
  "options": {
    "provider": "openai",
    "size": "1024x1024"
  }
}
```

## 🗄️ Database Setup

### MongoDB

```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas
# Update DB_CONNECTION in .env
```

### PostgreSQL (Aiven)

1. Create Aiven PostgreSQL service
2. Update environment variables:
   ```env
   POSTGRES_HOST=your-aiven-host.aivencloud.com
   POSTGRES_PORT=25060
   POSTGRES_DATABASE=defaultdb
   POSTGRES_USERNAME=avnadmin
   POSTGRES_PASSWORD=your-password
   POSTGRES_SSL=true
   ```

## 🔑 API Keys Setup

### OpenAI
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create API key
3. Set `OPENAI_API_KEY` in environment

### Google Gemini
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API key
3. Set `GEMINI_API_KEY` in environment

### Grok (xAI)
1. Go to [xAI Console](https://console.x.ai/)
2. Create API key
3. Set `GROK_API_KEY` in environment

## 🚀 Deployment

### Heroku

```bash
# Install Heroku CLI
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set DB_CONNECTION=your-mongodb-uri
heroku config:set OPENAI_API_KEY=your-openai-key

# Deploy
git push heroku main
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🧪 Adding New Projects

1. Create project folder:
   ```
   src/api/v1/projects/your-project/
   ```

2. Create routes.js:
   ```javascript
   const express = require('express');
   const router = express.Router();
   
   // Import controllers
   const controller = require('./controllers/controller');
   
   router.use('/endpoint', controller);
   
   module.exports = router;
   ```

3. Mount the routes in `src/app.js`:
   ```javascript
   const yourProjectRoutes = require('./api/projects/your-project/routes');
   app.use('/api/your-project', yourProjectRoutes);
   ```

## 🛠️ Development

### Adding New AI Providers

1. Create service file in `src/services/`
2. Implement required methods: `generateText`, `analyzeText`
3. Update `aiService.js` to include new provider
4. Add the provider's defaults to the `ai.providers` block in `src/config.js` (model name, max tokens, temperature, apiKey env var)

### Database Operations

```javascript
const dbManager = require('./src/database/dbConfig');

// MongoDB
const mongoConnection = dbManager.getMongoConnection();
const gfs = dbManager.getGridFS();

// PostgreSQL
const pgPool = dbManager.getPostgresConnection();
```

## 📝 License

ISC License

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request
