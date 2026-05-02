const tavilyService = require('../services/tavilyService');
const aiService = require('#services/aiService');

class ResearchNodes {
  async researcherNode(state) {
    console.log('--- RESEARCHER ---');
    const { query } = state;

    try {
      const searchResult = await tavilyService.search(query, {
        searchDepth: 'advanced',
        maxResults: 5
      });

      if (!searchResult.success) {
        return {
          researchData: 'Research failed due to an error.',
          messages: [{ role: 'system', content: 'Research failed.' }]
        };
      }

      return {
        researchData: searchResult.formattedResults,
        messages: [{ 
          role: 'system', 
          content: `Research completed. Found data:\n${searchResult.formattedResults}` 
        }]
      };
    } catch (error) {
      console.error('[ResearchNodes] Tavily search failed:', error);
      return {
        researchData: 'Research failed due to an error.',
        messages: [{ role: 'system', content: 'Research failed.' }]
      };
    }
  }

  async analystNode(state) {
    console.log('--- ANALYST ---');
    const { query, researchData } = state;

    const prompt = `You are an expert analyst. Your job is to analyze the provided research data 
and structure the findings to directly answer the user's query. Extract key themes, 
evaluate the credibility of the information, and synthesize a comprehensive overview.

User Query: ${query}

Research Data:
${researchData}

Provide a detailed analysis.`;

    try {
      const result = await aiService.generateText(prompt, {
        provider: 'gemini',
        model: process.env.ANALYST_MODEL || 'gemini-2.5-flash',
        temperature: 0,
        maxTokens: 8192
      });

      return {
        analysisData: result.data.content,
        messages: [{ 
          role: 'assistant', 
          content: result.data.content 
        }]
      };
    } catch (error) {
      console.error('[ResearchNodes] Analysis failed:', error);
      return {
        analysisData: 'Analysis failed due to an error.',
        messages: [{ 
          role: 'assistant', 
          content: 'Analysis failed.' 
        }]
      };
    }
  }

  async writerNode(state) {
    console.log('--- WRITER ---');
    const { query, analysisData } = state;

    const prompt = `You are a professional technical writer and synthesizer. 
Based on the provided analysis, create a final, well-structured, and easy-to-read markdown report 
answering the original query.

Original Query: ${query}

Analysis to base report on:
${analysisData}

Write the final report in Markdown. Make it engaging, clear, and comprehensive.`;

    try {
      // Use fast model since we just need formatting/synthesis
      const result = await aiService.generateText(prompt, {
        provider: 'gemini',
        model: process.env.FAST_MODEL || 'gemini-2.5-flash',
        temperature: 0.2,
        maxTokens: 8192
      });

      return {
        finalReport: result.data.content,
        messages: [{ 
          role: 'assistant', 
          content: result.data.content 
        }]
      };
    } catch (error) {
      console.error('[ResearchNodes] Writing failed:', error);
      return {
        finalReport: 'Report generation failed due to an error.',
        messages: [{ 
          role: 'assistant', 
          content: 'Report generation failed.' 
        }]
      };
    }
  }
}

module.exports = new ResearchNodes();
