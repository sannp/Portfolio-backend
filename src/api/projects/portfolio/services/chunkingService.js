/**
 * Chunking Service - Breaks resume data into semantic chunks for embedding
 * Optimizes for RAG by creating focused, context-rich chunks (200-300 tokens)
 */

class ChunkingService {
  /**
   * Chunk resume data into semantic pieces
   * @param {Object} resumeData - Resume data object
   * @returns {Array} Array of chunks with metadata
   */
  chunkResume(resumeData) {
    const chunks = [];

    // Chunk summary
    if (resumeData.summary) {
      chunks.push({
        text: resumeData.summary,
        type: 'summary',
        metadata: {
          source: 'summary',
          name: resumeData.name
        }
      });
    }

    // Chunk experience
    if (resumeData.experience && Array.isArray(resumeData.experience)) {
      resumeData.experience.forEach((exp, index) => {
        const expText = this._formatExperienceChunk(exp);
        if (expText) {
          chunks.push({
            text: expText,
            type: 'experience',
            metadata: {
              source: 'experience',
              index: index,
              company: exp.company,
              title: exp.title,
              duration: exp.duration
            }
          });
        }
      });
    }

    // Chunk education
    if (resumeData.education && Array.isArray(resumeData.education)) {
      resumeData.education.forEach((edu, index) => {
        const eduText = this._formatEducationChunk(edu);
        if (eduText) {
          chunks.push({
            text: eduText,
            type: 'education',
            metadata: {
              source: 'education',
              index: index,
              institution: edu.institution,
              degree: edu.degree,
              field: edu.field
            }
          });
        }
      });
    }

    // Chunk skills
    if (resumeData.skills) {
      const skillsText = this._formatSkillsChunk(resumeData.skills);
      if (skillsText) {
        chunks.push({
          text: skillsText,
          type: 'skills',
          metadata: {
            source: 'skills',
            categories: Object.keys(resumeData.skills)
          }
        });
      }
    }

    // Chunk projects
    if (resumeData.projects && Array.isArray(resumeData.projects)) {
      resumeData.projects.forEach((project, index) => {
        const projectText = this._formatProjectChunk(project);
        if (projectText) {
          chunks.push({
            text: projectText,
            type: 'project',
            metadata: {
              source: 'project',
              index: index,
              name: project.name,
              technologies: project.technologies
            }
          });
        }
      });
    }

    return chunks;
  }

  /**
   * Format experience entry into a chunk
   * @private
   */
  _formatExperienceChunk(exp) {
    const parts = [];
    
    if (exp.title && exp.company) {
      parts.push(`${exp.title} at ${exp.company}`);
    }
    
    if (exp.duration) {
      parts.push(`Duration: ${exp.duration}`);
    }
    
    if (exp.description) {
      parts.push(exp.description);
    }
    
    if (exp.responsibilities && Array.isArray(exp.responsibilities)) {
      parts.push('Key responsibilities:');
      exp.responsibilities.forEach(resp => {
        parts.push(`- ${resp}`);
      });
    }
    
    if (exp.achievements && Array.isArray(exp.achievements)) {
      parts.push('Key achievements:');
      exp.achievements.forEach(achievement => {
        parts.push(`- ${achievement}`);
      });
    }
    
    return parts.length > 0 ? parts.join('\n') : null;
  }

  /**
   * Format education entry into a chunk
   * @private
   */
  _formatEducationChunk(edu) {
    const parts = [];
    
    if (edu.degree && edu.institution) {
      parts.push(`${edu.degree} from ${edu.institution}`);
    }
    
    if (edu.field) {
      parts.push(`Field of study: ${edu.field}`);
    }
    
    if (edu.graduationYear) {
      parts.push(`Graduated: ${edu.graduationYear}`);
    }
    
    if (edu.gpa) {
      parts.push(`GPA: ${edu.gpa}`);
    }
    
    if (edu.coursework && Array.isArray(edu.coursework)) {
      parts.push('Relevant coursework:');
      edu.coursework.forEach(course => {
        parts.push(`- ${course}`);
      });
    }
    
    return parts.length > 0 ? parts.join('\n') : null;
  }

  /**
   * Format skills into a chunk
   * @private
   */
  _formatSkillsChunk(skills) {
    const parts = [];
    
    if (typeof skills === 'string') {
      return skills;
    }
    
    if (typeof skills === 'object') {
      Object.entries(skills).forEach(([category, skillList]) => {
        if (Array.isArray(skillList)) {
          parts.push(`${category}: ${skillList.join(', ')}`);
        } else if (typeof skillList === 'string') {
          parts.push(`${category}: ${skillList}`);
        }
      });
    }
    
    return parts.length > 0 ? parts.join('\n') : null;
  }

  /**
   * Format project entry into a chunk
   * @private
   */
  _formatProjectChunk(project) {
    const parts = [];
    
    if (project.name) {
      parts.push(`Project: ${project.name}`);
    }
    
    if (project.description) {
      parts.push(project.description);
    }
    
    if (project.technologies) {
      const techString = Array.isArray(project.technologies) 
        ? project.technologies.join(', ') 
        : project.technologies;
      parts.push(`Technologies: ${techString}`);
    }
    
    if (project.role) {
      parts.push(`Role: ${project.role}`);
    }
    
    if (project.duration) {
      parts.push(`Duration: ${project.duration}`);
    }
    
    if (project.outcomes && Array.isArray(project.outcomes)) {
      parts.push('Outcomes:');
      project.outcomes.forEach(outcome => {
        parts.push(`- ${outcome}`);
      });
    }
    
    return parts.length > 0 ? parts.join('\n') : null;
  }

  /**
   * Estimate token count for a text chunk
   * Approximate: 1 token ≈ 4 characters
   * @private
   */
  _estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  /**
   * Split large chunks into smaller ones if needed
   * @param {Array} chunks - Array of chunks to process
   * @param {Number} maxTokens - Maximum tokens per chunk (default: 300)
   * @returns {Array} Processed chunks
   */
  splitLargeChunks(chunks, maxTokens = 300) {
    const processedChunks = [];
    
    chunks.forEach(chunk => {
      const tokens = this._estimateTokens(chunk.text);
      
      if (tokens <= maxTokens) {
        processedChunks.push(chunk);
      } else {
        // Split large chunk into smaller pieces
        const sentences = chunk.text.split(/(?<=[.!?])\s+/);
        let currentChunk = '';
        let currentTokens = 0;
        
        sentences.forEach(sentence => {
          const sentenceTokens = this._estimateTokens(sentence);
          
          if (currentTokens + sentenceTokens > maxTokens && currentChunk) {
            processedChunks.push({
              ...chunk,
              text: currentChunk.trim()
            });
            currentChunk = sentence;
            currentTokens = sentenceTokens;
          } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
            currentTokens += sentenceTokens;
          }
        });
        
        if (currentChunk) {
          processedChunks.push({
            ...chunk,
            text: currentChunk.trim()
          });
        }
      }
    });
    
    return processedChunks;
  }
}

module.exports = new ChunkingService();
