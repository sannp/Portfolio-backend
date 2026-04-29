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
| Database | PostgreSQL | 13+ |
| ODM | Mongoose | 8.14.0 |
| AI Services | OpenAI, Gemini, Grok | Latest |
| Configuration | config | 3.3.12 |
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
├── config/                    # Configuration files
│   ├── default.json          # Default settings
│   ├── development.json      # Development overrides
│   └── production.json       # Production overrides
├── src/
│   ├── api/
│   │   └── v1/
│   │       └── projects/
│   │           └── portfolio/
│   │               ├── routes.js
│   │               └── controllers/
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

Edit `config/default.json` or environment variables:

```json
{
  "database": {
    "default": "mongodb",
    "mongodb": {
      "uri": "mongodb://localhost:27017/base-server"
    },
    "postgresql": {
      "host": "localhost",
      "port": 5432,
      "database": "base_server"
    }
  }
}
```

### AI Service Configuration

```json
{
  "ai": {
    "defaultProvider": "openai",
    "providers": {
      "openai": {
        "apiKey": "your-api-key",
        "model": "gpt-3.5-turbo"
      },
      "gemini": {
        "apiKey": "your-api-key",
        "model": "gemini-pro"
      },
      "grok": {
        "apiKey": "your-api-key",
        "model": "grok-beta"
      }
    }
  }
}
```

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

3. Update config to enable project:
   ```json
   {
     "projects": {
       "your-project": {
         "database": "mongodb",
         "enabled": true,
         "routes": ["endpoint"]
       }
     }
   }
   ```

## 🛠️ Development

### Adding New AI Providers

1. Create service file in `src/services/`
2. Implement required methods: `generateText`, `analyzeText`
3. Update `aiService.js` to include new provider
4. Add configuration to config files

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
