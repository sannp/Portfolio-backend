/**
 * Unit tests for EmbeddingService
 * Tests embedding dimension normalization (padding/truncating) and storage
 */

const embeddingService = require('../../src/api/projects/portfolio/services/embeddingService');
const aiService = require('../../src/services/aiService');
const dbManager = require('../../src/database/dbConfig');

// Mock aiService
jest.mock('../../src/services/aiService', () => ({
  embedText: jest.fn()
}));

// Mock dbConfig
jest.mock('../../src/database/dbConfig', () => ({
  getPortfolioPostgresConnection: jest.fn()
}));

describe('EmbeddingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateQueryEmbedding', () => {
    test('should pad embedding vector with zeros if dimension is less than 1536', async () => {
      // Mock Gemini returning 768 dimensions
      const mock768Vector = Array(768).fill(0.5);
      aiService.embedText.mockResolvedValue({
        success: true,
        provider: 'gemini',
        model: 'text-embedding-004',
        data: { embedding: mock768Vector }
      });

      const embedding = await embeddingService.generateQueryEmbedding('test query');

      expect(embedding).toHaveLength(1536);
      // The first 768 should be 0.5
      expect(embedding.slice(0, 768)).toEqual(mock768Vector);
      // The remaining 768 should be 0
      expect(embedding.slice(768)).toEqual(Array(768).fill(0));
      expect(aiService.embedText).toHaveBeenCalledWith('test query', { provider: 'gemini' });
    });

    test('should truncate embedding vector if dimension is greater than 1536', async () => {
      // Mock hypothetical vector of 2000 dimensions
      const mock2000Vector = Array(2000).fill(1.0);
      aiService.embedText.mockResolvedValue({
        success: true,
        provider: 'custom',
        data: { embedding: mock2000Vector }
      });

      const embedding = await embeddingService.generateQueryEmbedding('test query');

      expect(embedding).toHaveLength(1536);
      expect(embedding).toEqual(Array(1536).fill(1.0));
    });

    test('should keep embedding vector unchanged if dimension is exactly 1536', async () => {
      // Mock OpenAI returning 1536 dimensions
      const mock1536Vector = Array(1536).fill(0.8);
      aiService.embedText.mockResolvedValue({
        success: true,
        provider: 'openai',
        model: 'text-embedding-ada-002',
        data: { embedding: mock1536Vector }
      });

      const embedding = await embeddingService.generateQueryEmbedding('test query');

      expect(embedding).toHaveLength(1536);
      expect(embedding).toEqual(mock1536Vector);
    });

    test('should throw error when AI service fails', async () => {
      aiService.embedText.mockResolvedValue({
        success: false,
        error: 'API quota exceeded'
      });

      await expect(embeddingService.generateQueryEmbedding('test query')).rejects.toThrow();
    });
  });

  describe('generateAndStoreEmbeddings', () => {
    test('should successfully pad and insert embeddings into DB', async () => {
      const mockPool = {
        query: jest.fn().mockResolvedValue({ rows: [{ id: 1 }] })
      };
      dbManager.getPortfolioPostgresConnection.mockReturnValue(mockPool);

      const mock768Vector = Array(768).fill(0.2);
      aiService.embedText.mockResolvedValue({
        success: true,
        provider: 'gemini',
        data: { embedding: mock768Vector }
      });

      const chunks = [
        { text: 'experience chunk', type: 'experience', metadata: { source: 'resume' } }
      ];

      const result = await embeddingService.generateAndStoreEmbeddings(1, chunks);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
      expect(result.failed).toBe(0);

      // Verify delete existing chunks was called
      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM resume_chunks WHERE resume_id = $1',
        [1]
      );

      // Verify insert query was called with padded vector
      const expectedPaddedVectorString = `[${[...mock768Vector, ...Array(768).fill(0)].join(',')}]`;
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO resume_chunks'),
        [1, 'experience chunk', 'experience', JSON.stringify({ source: 'resume' }), expectedPaddedVectorString]
      );
    });

    test('should throw error if PostgreSQL connection is not available', async () => {
      dbManager.getPortfolioPostgresConnection.mockReturnValue(null);

      await expect(
        embeddingService.generateAndStoreEmbeddings(1, [{ text: 'test', type: 'skills', metadata: {} }])
      ).rejects.toThrow('Portfolio PostgreSQL connection not available');
    });
  });
});
