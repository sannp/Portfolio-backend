/**
 * Embedding Service - Generates and stores embeddings for resume chunks
 * Uses AI service to generate embeddings with fallback between providers
 * Stores embeddings in PostgreSQL with pgvector
 */

const aiService = require('#services/aiService');
const dbManager = require('#database/dbConfig');

class EmbeddingService {
  constructor() {
    this.embeddingDimension = 1536; // OpenAI embedding dimension
    this.batchSize = 10; // Process 10 chunks at a time
  }

  /**
   * Generate embeddings for resume chunks and store in database
   * @param {Number} resumeId - Resume ID
   * @param {Array} chunks - Array of chunks with text and metadata
   * @returns {Promise<Object>} Result with success status and statistics
   */
  async generateAndStoreEmbeddings(resumeId, chunks) {
    try {
      const pool = dbManager.getPortfolioPostgresConnection();
      if (!pool) {
        throw new Error('Portfolio PostgreSQL connection not available');
      }

      // Delete existing chunks for this resume
      await this.deleteResumeChunks(resumeId);

      let processedCount = 0;
      let failedCount = 0;

      // Process chunks in batches
      for (let i = 0; i < chunks.length; i += this.batchSize) {
        const batch = chunks.slice(i, i + this.batchSize);
        
        for (const chunk of batch) {
          try {
            // Generate embedding using AI service with fallback between providers
            const embeddingResult = await aiService.embedText(chunk.text, {
              provider: 'gemini' // Will fallback to other providers if needed
            });

            if (!embeddingResult.success) {
              console.error(`Failed to generate embedding for chunk: ${chunk.type}`);
              failedCount++;
              continue;
            }

            let embedding = embeddingResult.data.embedding;

            // Normalize embedding dimension to match expected dimension (1536)
            if (embedding.length < this.embeddingDimension) {
              embedding = [...embedding, ...new Array(this.embeddingDimension - embedding.length).fill(0)];
            } else if (embedding.length > this.embeddingDimension) {
              embedding = embedding.slice(0, this.embeddingDimension);
            }

            // Store chunk with embedding in database
            const query = `
              INSERT INTO resume_chunks (resume_id, chunk_text, chunk_type, metadata, embedding)
              VALUES ($1, $2, $3, $4, $5)
              RETURNING id
            `;

            const values = [
              resumeId,
              chunk.text,
              chunk.type,
              JSON.stringify(chunk.metadata),
              `[${embedding.join(',')}]` // Convert array to PostgreSQL vector format
            ];

            await pool.query(query, values);
            processedCount++;
            
          } catch (error) {
            console.error(`Error processing chunk:`, error);
            failedCount++;
          }
        }
      }

      return {
        success: true,
        processed: processedCount,
        failed: failedCount,
        total: chunks.length
      };

    } catch (error) {
      console.error('Error in generateAndStoreEmbeddings:', error);
      throw error;
    }
  }

  /**
   * Delete all chunks for a specific resume
   * @param {Number} resumeId - Resume ID
   * @returns {Promise<void>}
   */
  async deleteResumeChunks(resumeId) {
    try {
      const pool = dbManager.getPortfolioPostgresConnection();
      if (!pool) {
        throw new Error('Portfolio PostgreSQL connection not available');
      }

      const query = 'DELETE FROM resume_chunks WHERE resume_id = $1';
      await pool.query(query, [resumeId]);

    } catch (error) {
      console.error('Error deleting resume chunks:', error);
      throw error;
    }
  }

  /**
   * Update embeddings for specific chunk types (efficient partial updates)
   * @param {Number} resumeId - Resume ID
   * @param {Array} chunks - Array of chunks to update
   * @returns {Promise<Object>} Result with success status
   */
  async updateEmbeddings(resumeId, chunks) {
    try {
      // Delete chunks of specific types that are being updated
      const chunkTypes = [...new Set(chunks.map(c => c.type))];

      const pool = dbManager.getPortfolioPostgresConnection();
      if (!pool) {
        throw new Error('Portfolio PostgreSQL connection not available');
      }

      const deleteQuery = `
        DELETE FROM resume_chunks 
        WHERE resume_id = $1 AND chunk_type = ANY($2)
      `;
      await pool.query(deleteQuery, [resumeId, chunkTypes]);

      // Generate and store new embeddings
      return await this.generateAndStoreEmbeddings(resumeId, chunks);

    } catch (error) {
      console.error('Error updating embeddings:', error);
      throw error;
    }
  }

  /**
   * Generate embedding for a single query text
   * @param {String} text - Query text
   * @returns {Promise<Array>} Embedding vector
   */
  async generateQueryEmbedding(text) {
    try {
      const result = await aiService.embedText(text, {
        provider: 'gemini' // Prefers Ollama, will fallback
      });

      if (!result.success) {
        throw new Error('Failed to generate query embedding');
      }

      let embedding = result.data.embedding;

      // Normalize embedding dimension to match expected dimension (1536)
      if (embedding.length < this.embeddingDimension) {
        embedding = [...embedding, ...new Array(this.embeddingDimension - embedding.length).fill(0)];
      } else if (embedding.length > this.embeddingDimension) {
        embedding = embedding.slice(0, this.embeddingDimension);
      }

      return embedding;

    } catch (error) {
      console.error('Error generating query embedding:', error);
      throw error;
    }
  }

  /**
   * Get embedding statistics for a resume
   * @param {Number} resumeId - Resume ID
   * @returns {Promise<Object>} Statistics
   */
  async getEmbeddingStats(resumeId) {
    try {
      const pool = dbManager.getPortfolioPostgresConnection();
      if (!pool) {
        throw new Error('Portfolio PostgreSQL connection not available');
      }

      const query = `
        SELECT 
          chunk_type,
          COUNT(*) as count,
          AVG(length(chunk_text)) as avg_length
        FROM resume_chunks
        WHERE resume_id = $1
        GROUP BY chunk_type
      `;

      const result = await pool.query(query, [resumeId]);

      const stats = {
        total: 0,
        byType: {}
      };

      result.rows.forEach(row => {
        stats.byType[row.chunk_type] = {
          count: parseInt(row.count),
          avgLength: parseInt(row.avg_length)
        };
        stats.total += parseInt(row.count);
      });

      return stats;

    } catch (error) {
      console.error('Error getting embedding stats:', error);
      throw error;
    }
  }
}

module.exports = new EmbeddingService();
