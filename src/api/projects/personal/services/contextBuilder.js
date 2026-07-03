/**
 * Context Builder Service - Builds context for AI using RAG (Retrieval-Augmented Generation)
 * Uses pgvector for similarity search to retrieve relevant resume chunks
 * Reduces token usage by ~80-90% compared to sending full resume
 */

const embeddingService = require('./embeddingService');
const dbManager = require('#database/dbConfig');
const config = require('config');

class ContextBuilder {
  constructor() {
    this.topK = config.has('projects.personal.chat.rag.topK') 
      ? config.get('projects.personal.chat.rag.topK') 
      : 5;
    this.similarityThreshold = config.has('projects.personal.chat.rag.similarityThreshold') 
      ? config.get('projects.personal.chat.rag.similarityThreshold') 
      : 0.5; // Lower default threshold (from 0.7 to 0.5) for Gemini embedding compatibility
  }

  /**
   * Build context for a user question using RAG
   * @param {Number} resumeId - Resume ID
   * @param {String} question - User's question
   * @returns {Promise<Object>} Context with relevant chunks and metadata
   */
  async buildContext(resumeId, question) {
    try {
      const pool = dbManager.getPortfolioPostgresConnection();
      if (!pool) {
        throw new Error('Portfolio PostgreSQL connection not available');
      }

      // Generate embedding for the question using AI service
      const queryEmbedding = await embeddingService.generateQueryEmbedding(question);

      // Perform vector similarity search
      const relevantChunks = await this._vectorSearch(pool, resumeId, queryEmbedding);

      if (relevantChunks.length === 0) {
        console.warn('[ContextBuilder] No relevant chunks found for question, trying fallback to resume data');
        // Fallback to using resume data directly
        return await this._buildContextFromResumeData(pool, resumeId, question);
      }

      // Build structured context from retrieved chunks
      const context = this._buildContextFromChunks(relevantChunks, question);

      return context;

    } catch (error) {
      console.error('Error building context:', error);
      // Try fallback to resume data on error
      try {
        const pool = dbManager.getPortfolioPostgresConnection();
        if (pool) {
          console.warn('[ContextBuilder] Using fallback to resume data due to error');
          return await this._buildContextFromResumeData(pool, resumeId, question);
        }
      } catch (fallbackError) {
        console.error('Fallback context build also failed:', fallbackError);
      }
      // Return empty context if everything fails
      return this._buildEmptyContext();
    }
  }

  /**
   * Perform vector similarity search using pgvector
   * @private
   */
  async _vectorSearch(pool, resumeId, queryEmbedding) {
    try {
      const embeddingString = `[${queryEmbedding.join(',')}]`;

      // pgvector cosine similarity search
      const query = `
        SELECT 
          id,
          resume_id,
          chunk_text,
          chunk_type,
          metadata,
          1 - (embedding <=> $1) as similarity
        FROM resume_chunks
        WHERE resume_id = $2
        ORDER BY embedding <=> $1
        LIMIT $3
      `;

      const result = await pool.query(query, [embeddingString, resumeId, this.topK]);

      // Filter by similarity threshold
      const relevantChunks = result.rows
        .filter(row => row.similarity >= this.similarityThreshold)
        .map(row => ({
          id: row.id,
          resumeId: row.resume_id,
          text: row.chunk_text,
          type: row.chunk_type,
          metadata: row.metadata,
          similarity: row.similarity
        }));

      // If no chunks meet threshold, lower threshold and try again with top results
      if (relevantChunks.length === 0 && result.rows.length > 0) {
        console.warn('[ContextBuilder] No chunks above threshold, using top result with lower similarity');
        const topChunk = result.rows[0];
        if (topChunk.similarity >= 0.5) { // Minimum usable similarity
          relevantChunks.push({
            id: topChunk.id,
            resumeId: topChunk.resume_id,
            text: topChunk.chunk_text,
            type: topChunk.chunk_type,
            metadata: topChunk.metadata,
            similarity: topChunk.similarity
          });
        }
      }

      return relevantChunks;

    } catch (error) {
      console.error('Vector search failed:', error);
      return [];
    }
  }

  /**
   * Build structured context from retrieved chunks
   * @private
   */
  _buildContextFromChunks(chunks, question) {
    // Group chunks by type for better organization
    const grouped = {};
    chunks.forEach(chunk => {
      if (!grouped[chunk.type]) {
        grouped[chunk.type] = [];
      }
      grouped[chunk.type].push(chunk);
    });

    // Build context string
    let contextText = '';
    
    // Add system instructions
    contextText += 'You are a recruiter assistant answering questions about a candidate based ONLY on the provided resume data chunks below.\n';
    contextText += 'Do not use any outside knowledge or make assumptions beyond what is explicitly stated in the context.\n';
    contextText += 'If the information is not available in the context, state that clearly.\n\n';

    // Add grouped chunks
    const typeOrder = ['summary', 'experience', 'education', 'skills', 'project'];
    
    typeOrder.forEach(type => {
      if (grouped[type] && grouped[type].length > 0) {
        contextText += `--- ${type.toUpperCase()} ---\n`;
        grouped[type].forEach(chunk => {
          contextText += `${chunk.text}\n`;
        });
        contextText += '\n';
      }
    });

    // Add any remaining chunks
    Object.keys(grouped).forEach(type => {
      if (!typeOrder.includes(type) && grouped[type].length > 0) {
        contextText += `--- ${type.toUpperCase()} ---\n`;
        grouped[type].forEach(chunk => {
          contextText += `${chunk.text}\n`;
        });
        contextText += '\n';
      }
    });

    return {
      success: true,
      context: contextText,
      metadata: {
        totalChunks: chunks.length,
        chunksByType: Object.keys(grouped).reduce((acc, type) => {
          acc[type] = grouped[type].length;
          return acc;
        }, {}),
        avgSimilarity: chunks.reduce((sum, chunk) => sum + chunk.similarity, 0) / chunks.length
      }
    };
  }

  /**
   * Build empty context when no chunks are found
   * @private
   */
  _buildEmptyContext() {
    return {
      success: false,
      context: '',
      metadata: {
        totalChunks: 0,
        chunksByType: {},
        avgSimilarity: 0
      }
    };
  }

  /**
   * Build context from resume data directly (fallback when embeddings unavailable)
   * @private
   */
  async _buildContextFromResumeData(pool, resumeId, question) {
    try {
      // Get resume data
      const resumeQuery = 'SELECT * FROM resumes WHERE id = $1';
      const resumeResult = await pool.query(resumeQuery, [resumeId]);

      if (resumeResult.rows.length === 0) {
        console.warn('[ContextBuilder] No resume found for fallback');
        return this._buildEmptyContext();
      }

      const resume = resumeResult.rows[0];
      
      // Build context from resume fields
      let contextText = 'You are a recruiter assistant answering questions about a candidate based ONLY on the provided resume data below.\n';
      contextText += 'Do not use any outside knowledge or make assumptions beyond what is explicitly stated in the context.\n';
      contextText += 'If the information is not available in the context, state that clearly.\n\n';

      // Add summary
      if (resume.summary) {
        contextText += '--- SUMMARY ---\n';
        contextText += `${resume.summary}\n\n`;
      }

      // Add contact info (limited)
      if (resume.email || resume.phone) {
        contextText += '--- CONTACT ---\n';
        if (resume.email) contextText += `Email: ${resume.email}\n`;
        if (resume.phone) contextText += `Phone: ${resume.phone}\n`;
        contextText += '\n';
      }

      // Add professional links
      if (resume.linkedin || resume.github) {
        contextText += '--- PROFILES ---\n';
        if (resume.linkedin) contextText += `LinkedIn: ${resume.linkedin}\n`;
        if (resume.github) contextText += `GitHub: ${resume.github}\n`;
        contextText += '\n';
      }

      // Add job preferences
      if (resume.notice_period || resume.current_location || resume.preferred_location || resume.expected_salary) {
        contextText += '--- PREFERENCES ---\n';
        if (resume.notice_period) contextText += `Notice Period: ${resume.notice_period}\n`;
        if (resume.current_location) contextText += `Current Location: ${resume.current_location}\n`;
        if (resume.preferred_location) contextText += `Preferred Location: ${resume.preferred_location}\n`;
        if (resume.expected_salary) contextText += `Expected Salary: ${resume.expected_salary}\n`;
        contextText += '\n';
      }

      return {
        success: true,
        context: contextText,
        metadata: {
          source: 'resume_data_fallback',
          resumeId: resume.id
        }
      };

    } catch (error) {
      console.error('Error building context from resume data:', error);
      return this._buildEmptyContext();
    }
  }

  /**
   * Get broader context by retrieving related projects from MongoDB
   * This can be used to supplement the RAG context with project details
   * @param {Array} projectNames - Array of project names mentioned in resume
   * @returns {Promise<Object>} Additional project context
   */
  async getProjectContext(projectNames) {
    try {
      // This would query MongoDB for project details
      // For now, return empty - to be implemented based on project structure
      return {
        success: true,
        projects: [],
        metadata: {
          totalProjects: 0
        }
      };
    } catch (error) {
      console.error('Error getting project context:', error);
      return {
        success: false,
        projects: [],
        metadata: {
          totalProjects: 0
        }
      };
    }
  }

  /**
   * Build enhanced context with both RAG chunks and project details
   * @param {Number} resumeId - Resume ID
   * @param {String} question - User's question
   * @returns {Promise<Object>} Enhanced context
   */
  async buildEnhancedContext(resumeId, question) {
    try {
      // Get RAG context
      const ragContext = await this.buildContext(resumeId, question);

      // Extract project names from chunks if available
      const projectNames = this._extractProjectNames(ragContext);

      // Get additional project context
      const projectContext = await this.getProjectContext(projectNames);

      // Combine contexts
      let combinedContext = ragContext.context;
      
      if (projectContext.success && projectContext.projects.length > 0) {
        combinedContext += '\n--- ADDITIONAL PROJECT DETAILS ---\n';
        projectContext.projects.forEach(project => {
          combinedContext += `Project: ${project.name}\n`;
          combinedContext += `${project.description}\n\n`;
        });
      }

      return {
        success: true,
        context: combinedContext,
        metadata: {
          ...ragContext.metadata,
          additionalProjects: projectContext.projects.length
        }
      };

    } catch (error) {
      console.error('Error building enhanced context:', error);
      return this._buildEmptyContext();
    }
  }

  /**
   * Extract project names from context
   * @private
   */
  _extractProjectNames(contextResult) {
    const names = [];
    
    if (contextResult.metadata.chunksByType.project) {
      // This would parse project names from the chunks
      // For now, return empty array
    }
    
    return names;
  }

  /**
   * Update topK value
   * @param {Number} value - New topK value
   */
  setTopK(value) {
    this.topK = value;
  }

  /**
   * Update similarity threshold
   * @param {Number} value - New threshold value (0-1)
   */
  setSimilarityThreshold(value) {
    if (value >= 0 && value <= 1) {
      this.similarityThreshold = value;
    } else {
      console.warn('Invalid similarity threshold, must be between 0 and 1');
    }
  }
}

module.exports = new ContextBuilder();
