/**
 * Guardrail Service - Detects out-of-scope questions for recruiter chatbot
 * Uses keyword-based filtering for fast and reliable classification
 * Ensures the chatbot only answers professional, resume-related questions
 */

class GuardrailService {
  constructor() {
    // Out-of-scope topics and keywords
    this.outOfScopeTopics = {
      personal: ['family', 'marriage', 'married', 'children', 'parents', 'spouse', 'relationship', 'dating', 'personal life'],
      health: ['health', 'medical', 'illness', 'disease', 'sick', 'doctor', 'hospital', 'medication'],
      politics: ['politics', 'political', 'election', 'vote', 'government', 'president', 'congress'],
      religion: ['religion', 'religious', 'god', 'faith', 'church', 'temple', 'mosque', 'bible', 'quran'],
      finance: ['salary', 'income', 'money', 'bank', 'bank account', 'credit card', 'debt', 'loan', 'investment'],
      hobbies: ['hobbies', 'leisure', 'entertainment', 'movies', 'music', 'games', 'sports'],
      inappropriate: ['hack', 'steal', 'illegal', 'crime', 'violence', 'harmful', 'offensive']
    };
  }

  /**
   * Check if a question is within scope for the recruiter chatbot
   * @param {String} question - User's question
   * @returns {Promise<Object>} { isAllowed: boolean, reason: string }
   */
  async checkQuestion(question) {
    // Use keyword-based filtering (fast and reliable)
    const keywordResult = this._checkKeywords(question);
    return keywordResult;
  }

  /**
   * Keyword-based filtering for out-of-scope topics
   * @private
   */
  _checkKeywords(question) {
    if (!question || typeof question !== 'string') {
      return { isAllowed: true, reason: null };
    }

    const lowerQuestion = question.toLowerCase();

    for (const [category, keywords] of Object.entries(this.outOfScopeTopics)) {
      for (const keyword of keywords) {
        if (lowerQuestion.includes(keyword)) {
          return {
            isAllowed: false,
            reason: `This question about ${category} is outside the scope of a professional recruiter chatbot. Please focus on resume-related topics like experience, skills, education, and projects.`
          };
        }
      }
    }

    return { isAllowed: true, reason: null };
  }

  /**
   * Check if text contains PII (Personally Identifiable Information)
   * Additional safety layer
   * @param {String} text - Text to check
   * @returns {Boolean} True if PII detected
   */
  containsPII(text) {
    if (!text || typeof text !== 'string') {
      return false;
    }

    const piiPatterns = [
      /\d{3}-\d{2}-\d{4}/, // SSN pattern
      /\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}/, // Credit card pattern
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/ // Email pattern
    ];

    return piiPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Sanitize response to remove any potential sensitive information
   * @param {String} response - AI response to sanitize
   * @returns {String} Sanitized response
   */
  sanitizeResponse(response) {
    if (!response || typeof response !== 'string') {
      return response || '';
    }

    // Remove potential PII patterns
    let sanitized = response;
    
    // Remove SSN-like patterns
    sanitized = sanitized.replace(/\d{3}-\d{2}-\d{4}/g, '[REDACTED]');
    
    // Remove credit card-like patterns
    sanitized = sanitized.replace(/\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}/g, '[REDACTED]');
    
    // Remove email addresses (except for the candidate's own)
    sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED]');

    return sanitized;
  }
}

module.exports = new GuardrailService();
