-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Resume metadata table with production-ready constraints
CREATE TABLE IF NOT EXISTS resumes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(50),
  linkedin VARCHAR(255),
  github VARCHAR(255),
  notice_period VARCHAR(100),
  current_location VARCHAR(100),
  preferred_location VARCHAR(100),
  expected_salary VARCHAR(100),
  summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' OR email IS NULL),
  CONSTRAINT valid_url CHECK (
    (linkedin IS NULL OR linkedin ~* '^https?://') AND
    (github IS NULL OR github ~* '^https?://')
  )
);

-- Resume chunks with embeddings for RAG
CREATE TABLE IF NOT EXISTS resume_chunks (
  id SERIAL PRIMARY KEY,
  resume_id INTEGER REFERENCES resumes(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_type VARCHAR(50) CHECK (chunk_type IN ('summary', 'experience', 'education', 'skills', 'project')),
  metadata JSONB,
  embedding vector(1536), -- OpenAI embedding dimension
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_chunk_text CHECK (length(chunk_text) > 0 AND length(chunk_text) <= 10000)
);

-- Create index for similarity search with IVFFlat (good for medium datasets)
-- Lists parameter should be sqrt(rows) for optimal performance
CREATE INDEX IF NOT EXISTS resume_chunks_embedding_idx ON resume_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create index for resume_id lookup (critical for JOINs)
CREATE INDEX IF NOT EXISTS resume_chunks_resume_id_idx ON resume_chunks(resume_id);

-- Create index for chunk_type lookup (useful for filtering)
CREATE INDEX IF NOT EXISTS resume_chunks_chunk_type_idx ON resume_chunks(chunk_type);

-- Create GIN index on metadata for JSONB queries
CREATE INDEX IF NOT EXISTS resume_chunks_metadata_idx ON resume_chunks USING GIN (metadata);

-- Create index on created_at for cleanup operations
CREATE INDEX IF NOT EXISTS resume_chunks_created_at_idx ON resume_chunks(created_at);

-- Add trigger for automatic updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_resumes_updated_at BEFORE UPDATE ON resumes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable monitoring extension (optional, for performance tracking)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
