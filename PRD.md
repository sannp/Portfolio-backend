# Base Server Template - Product Requirements Document

## 1. Executive Summary

The **Base Server Template** is a scalable Node.js/Express boilerplate designed to eliminate repetitive setup for new projects. It features multi-database support (MongoDB & PostgreSQL), unified AI service integrations (OpenAI, Google Gemini, Grok), modular project-based architecture, and comprehensive configuration management. The template serves as a foundation for rapid development with zero boilerplate overhead, supporting both legacy portfolio functionality and modern AI-powered applications.

---

## 2. Goals & Objectives

| Goal | Description |
|------|-------------|
| Zero Boilerplate | Eliminate repetitive setup for new projects |
| Multi-Database Support | Support MongoDB and PostgreSQL with unified API |
| AI Integration | Provide unified access to OpenAI, Gemini, and Grok APIs |
| Modular Architecture | Enable project-based routing with isolated configurations |
| Rapid Development | Accelerate new project setup with configurable templates |
| Scalability | Support horizontal scaling with connection pooling |
| Developer Experience | Offer consistent APIs, comprehensive documentation, and tooling |

---

## 3. User Stories

| Role | Story | Acceptance Criteria |
|------|-------|---------------------|
| Developer | Create new project without boilerplate setup | Clone template, configure env, start developing in 5 minutes |
| Developer | Switch between databases per project | Config selects MongoDB or PostgreSQL per project |
| Developer | Use AI services with unified API | Single endpoint works with OpenAI, Gemini, or Grok |
| Admin | Add new projects with duplicate title prevention | POST /api/personal/projects/addnew returns error if title exists |
| Admin | Upload project images up to 20MB | POST /api/personal/files/upload accepts jpeg/jpg/png/gif |
| Admin | Delete blog posts without update capability | DELETE /api/personal/blogposts/:id removes post permanently |
| Developer | Receive consistent API responses | All endpoints return `{success, message, data}` format |
| Developer | Get AI-generated content analysis | POST /api/v1/ai/analyze returns sentiment/themes |
| Developer | Generate AI images for content | POST /api/v1/ai/image returns image URLs |

---

## 4. Functional Requirements

### 4.1 Multi-Database Support
- **MongoDB**: Full CRUD with Mongoose ODM, GridFS file storage
- **PostgreSQL**: Connection pooling, Aiven cloud integration
- **Database Selection**: Per-project database configuration
- **Connection Management**: Automatic connection handling and graceful shutdown

### 4.2 AI Service Integration
- **Unified API**: Single endpoint for all AI providers
- **Provider Support**: OpenAI, Google Gemini, Grok (xAI)
- **Fallback Logic**: Automatic provider switching on failures
- **Service Types**: Text generation, analysis, image generation
- **Configuration**: Environment-based API key management

### 4.3 Modular Architecture
- **Project Isolation**: Each project in separate folder structure
- **Configurable Routing**: Dynamic route mounting based on project config
- **Shared Services**: Common utilities, middleware, and database layer
- **Environment Management**: Development, staging, production configurations

### 4.4 Core CRUD Operations (Portfolio Project)
- **Create**: All content types support creation with validation
- **Read**: List all items or retrieve specific by ID
- **Update**: Full or partial updates via PATCH (except BlogPosts)
- **Delete**: Permanent removal with confirmation response

### 4.5 File Management
- **Image Upload**: Type validation (JPEG, JPG, PNG, GIF), 20MB limit
- **GridFS Storage**: Native MongoDB GridFSBucket implementation
- **File Retrieval**: By filename or MongoDB ObjectId
- **Metadata Management**: File size, type, and original name tracking

### 4.6 Configuration System
- **Environment-Based**: JSON configs for different environments
- **Hot Reload**: Configuration changes without server restart
- **Validation**: Schema validation for configuration files
- **Security**: Sensitive data via environment variables

### 4.7 Recruiter Chatbot & Resume Management (Offline Ingestion Only)
- **Recruiter Chatbot**: Integrated chatbot powered by Google Gemini (with fallbacks) using RAG (Retrieval-Augmented Generation) to answer professional questions.
- **RAG Architecture**: Uses `pgvector` in PostgreSQL to do semantic similarity searches over chunked and embedded resume data, reducing LLM context token usage.
- **Offline-Only Resume Updates**: 
  - **No HTTP CRUD Endpoints**: In order to maximize production security and keep the backend API highly secure, there are no public or administrative HTTP REST endpoints for resume management.
  - **Script-Driven Management**: Resume updates, PDF text extraction, AI parsing, and vector embedding generation are strictly performed offline using local developer CLI scripts (`scripts/generate-resume-rag.js`).

---

## 5. Technical Requirements

| Component | Technology | Version |
|-----------|------------|---------|
| Runtime | Node.js | 18.x+ |
| Framework | Express.js | 4.21.2 |
| Database | MongoDB | 6.0+ |
| Database | PostgreSQL | 13+ |
| ODM | Mongoose | 8.14.0 |
| AI Services | OpenAI SDK | 4.73.1 |
| AI Services | Google Generative AI | 0.21.0 |
| AI Services | xAI (Grok) | REST API |
| Configuration | config | 3.3.12 |
| File Storage | GridFS | Native MongoDB |
| Upload Handler | Multer + Native GridFSBucket | 1.4.5-lts.1 |
| HTTP Client | Axios | 1.7.9 |
| CORS | cors middleware | 2.8.5 |
| Environment | dotenv | 16.5.0 |
| Body Parsing | Built-in express.json() | Native |

### Environment Variables
```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
DB_CONNECTION=mongodb://localhost:27017/base-server
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=base_server
POSTGRES_USERNAME=your_username
POSTGRES_PASSWORD=your_password

# AI Service API Keys
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
GROK_API_KEY=your_grok_api_key

# CORS Configuration
CORS_ORIGIN=*
```

### 5.1 Architecture Overview
```
Client Request → Express Router → Route Handler → Database Manager → MongoDB/PostgreSQL
                                    ↓                              ↓
                              AI Service Layer → AI Providers → AI APIs
                                    ↓
                              Response → JSON Format
```

---

## 6. API Specifications

### 6.1 Response Format
All endpoints return a consistent JSON structure:
```json
{
  "success": boolean,
  "message": string,
  "data": object | array | null
}
```

### 6.2 Core Endpoints

#### Health & System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Server health check |
| GET | / | API overview and documentation |

#### AI Services (/api/v1/ai)
| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | /generate | Generate text content | prompt, options{provider, model, maxTokens} |
| POST | /analyze | Analyze text sentiment/themes | prompt, options{provider} |
| POST | /image | Generate images | prompt, options{provider, size} |

#### Personal Project (/api/personal)
| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| GET | / | Personal project info | - |
| POST | /projects/addnew | Create new project | title, description, imageUrl, imageAlt, badges, buttons |
| GET | /projects/all | Get all projects | - |
| GET | /projects/:id | Get specific project | - |
| PATCH | /projects/:id | Update project | Same as create |
| DELETE | /projects/:id | Delete project | - |
| POST | /files/upload | Upload image file | multipart/form-data |
| GET | /files/all | List all uploaded files | - |
| GET | /files/image/:filename | Get image by filename | - |
| DELETE | /files/:id | Delete file by ID | - |
| POST | /blogposts/addnew | Create blog post |
| GET | /blogposts/all | List all blog posts |
| GET | /blogposts/:id | Get specific blog post |
| DELETE | /blogposts/:id | Delete blog post (no PATCH) |
| GET | /chat | Recruiter chat metadata | - |
| POST | /chat/message | Send recruiter chat message | message, sessionId |
| GET | /chat/history/:sessionId | Get session chat history | - |
| DELETE | /chat/history/:sessionId | Clear session chat history | - |
| GET | /chat/health | Check recruiter chatbot health | - |
| GET | /expenses | List all expenses with optional pagination and date-filtering | page, limit, startDate, endDate (query params) |
| POST | /expenses | Create a new expense | date, place, amount, type, account, isAccounted, information, category, tags, note |
| PUT | /expenses/:id | Update an expense | Same as create (partial fields allowed) |
| DELETE | /expenses/:id | Delete an expense by ID | - |

---

## 7. Data Models

### 7.1 Projects Schema
```javascript
{
  type: String (required, enum: ["design", "project"]),
  title: String (required),
  description: String (required),
  imageUrl: String (required),
  imageAlt: String (default: "placeholder"),
  badges: Array (default: []),
  codeLink: String (optional),
  previewLink: String (optional),
  createdDate: Date (default: Date.now)
}
```

*Note: Designs, Badges, and Categories schemas have been deprecated.*

### 7.5 BlogPosts Schema
```javascript
{
  title: String (required),
  value: String (required),
  content: String (required),
  intro: String (required),
  createdDate: Date (default: Date.now)
}
```

### 7.6 GridFS File Storage
- Files stored with crypto-generated filenames (16-byte hex + original extension)
- Bucket name: `uploads`
- Supported formats: JPEG, JPG, PNG, GIF
- Maximum file size: 20MB

### 7.7 Expenses Schema
```javascript
{
  date: Date (required),
  place: String (required),
  amount: Number (required),
  type: String (enum: ["DR", "CR"]),
  account: String,
  isAccounted: Boolean (default: true),
  information: String,
  category: String,
  tags: Array (default: []),
  note: String
}
```

---

## 8. Security Considerations

### 8.1 Data Protection
- **TLS Encryption**: All data transmission must use HTTPS/TLS
- **Environment Variables**: Sensitive configuration (DB_CONNECTION, PORT) stored in `.env`
- **No Hardcoded Secrets**: All credentials externalized

### 8.2 Input Validation
- Mongoose schema validation enforces required fields
- Multer file type filtering prevents non-image uploads
- File size limits (20MB) prevent resource exhaustion

### 8.3 Recommended Enhancements
- [ ] Implement JWT authentication for admin endpoints
- [ ] Add rate limiting to prevent API abuse
- [ ] Enable MongoDB authentication for database connections
- [ ] Add request logging for audit trails
- [x] Implement CORS origin whitelist for production

---

## 9. Deployment Requirements

### 9.1 Heroku Configuration
```
Procfile: web: node app.js
```

### 9.2 Environment Setup
| Config Var | Purpose |
|------------|---------|
| `PORT` | Server listening port (Heroku sets automatically) |
| `DB_CONNECTION` | MongoDB Atlas connection string |

### 9.3 Database
- MongoDB Atlas cluster required
- IP whitelist configuration for Heroku dynos
- Regular backup schedule recommended

### 9.4 Monitoring
- Application logs via `heroku logs --tail`
- MongoDB Atlas performance monitoring
- Error tracking integration recommended (Sentry, etc.)

---

## 10. Future Enhancements

| Priority | Enhancement | Description |
|----------|-------------|-------------|
| High | Authentication | JWT-based admin authentication |
| High | Rate Limiting | Prevent API abuse with express-rate-limit |
| Medium | Pagination | Add limit/offset to list endpoints |
| Medium | Search | Text search across projects and blog posts |
| Medium | Image Optimization | Automatic resizing and WebP conversion |
| Low | API Documentation | Swagger/OpenAPI integration |
| Low | Webhook Support | Notify external services on content changes |
| Low | Analytics | Track content views and popularity |

---

## Appendix: Project Structure

```
base-server-template/
├── config/                    # Configuration files
│   ├── default.json          # Default settings
│   ├── development.json      # Development overrides
│   └── production.json       # Production overrides
├── src/
│   ├── api/
│   │   ├── projects/
│   │   │   └── personal/
│   │   │       ├── routes.js
│   │   │       ├── controllers/
│   │   │       │   ├── watchlistController.js
│   │   │       │   ├── projectsController.js
│   │   │       │   ├── blogpostsController.js
│   │   │       │   ├── filesController.js
│   │   │       │   └── expensesController.js
│   │   │       └── services/
│   │   │           ├── chunkingService.js
│   │   │           ├── contextBuilder.js
│   │   │           └── embeddingService.js
│   │   ├── ai/
│   │   └── research/
│   ├── database/
│   │   └── dbConfig.js       # Multi-database manager
│   ├── services/
│   │   ├── aiService.js      # Unified AI service layer
│   └── app.js                # Express app configuration
├── models/                    # Mongoose models
│   ├── Projects.js           # Project schema
│   ├── Watchlist.js          # Watchlist schema
│   ├── BlogPosts.js          # Blog post schema
│   └── Expenses.js           # Expense schema
├── routes/                    # Legacy routes (being migrated)
├── server.js                 # New server entry point
├── package.json              # Dependencies and scripts
├── Procfile                  # Heroku process configuration
├── README.md                 # Comprehensive documentation
├── PRD.md                    # This document
├── .env.example              # Environment template
├── .env                      # Environment variables (not in git)
└── .gitignore                # Git exclusions
```

---

*Document generated: 2026-04-26*
*Version: 2.0.0 - Base Server Template*
