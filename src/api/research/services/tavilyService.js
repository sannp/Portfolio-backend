const { tavily } = require('@tavily/core');

class TavilyService {
  constructor() {
    this.client = null;
  }

  _initClient() {
    if (!this.client) {
      if (!process.env.TAVILY_API_KEY) {
        throw new Error('TAVILY_API_KEY environment variable is required');
      }
      this.client = tavily({ apiKey: process.env.TAVILY_API_KEY });
    }
    return this.client;
  }

  async search(query, options = {}) {
    try {
      const client = this._initClient();
      const searchResponse = await client.search(query, {
        searchDepth: options.searchDepth || 'advanced',
        maxResults: options.maxResults || 5,
        ...options
      });

      const resultsString = searchResponse.results
        .map((r) => `Source: ${r.url}\nContent: ${r.content}\n`)
        .join('---\n');

      return {
        success: true,
        results: searchResponse.results,
        formattedResults: resultsString,
        count: searchResponse.results.length
      };
    } catch (error) {
      console.error('[TavilyService] Search failed:', error);
      return {
        success: false,
        error: error.message,
        results: [],
        formattedResults: 'Research failed due to an error.'
      };
    }
  }
}

module.exports = new TavilyService();
