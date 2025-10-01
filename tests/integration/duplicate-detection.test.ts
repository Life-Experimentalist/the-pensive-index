import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from 'better-sqlite3';

// Import the duplicate detection services we need to test
// Note: These imports will fail initially - that's expected in TDD
import { DuplicateDetector } from '@/src/lib/validation/duplicate-detector';
import { UrlNormalizer } from '@/src/lib/validation/url-normalizer';
import { TitleMatcher } from '@/src/lib/validation/title-matcher';
import { ContentAnalyzer } from '@/src/lib/validation/content-analyzer';

// Mock database
vi.mock('@/src/lib/database', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Duplicate Detection Integration Tests', () => {
  let mockDb: Database;
  let duplicateDetector: DuplicateDetector;
  let sampleStories: Array<{
    id: string;
    url: string;
    title: string;
    author: string;
    summary: string;
    wordCount: number;
    fandomId: string;
  }>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup sample stories for testing
    sampleStories = [
      {
        id: 'story-1',
        url: 'https://archiveofourown.org/works/12345',
        title: 'Harry Potter and the Time Turner',
        author: 'TestAuthor1',
        summary: 'Harry goes back in time to fix everything that went wrong.',
        wordCount: 50000,
        fandomId: 'harry-potter',
      },
      {
        id: 'story-2',
        url: 'https://www.fanfiction.net/s/67890/1/',
        title: 'Time Travel Harry Potter',
        author: 'TestAuthor2',
        summary:
          'After the war, Harry finds himself sent back to his first year.',
        wordCount: 45000,
        fandomId: 'harry-potter',
      },
      {
        id: 'story-3',
        url: 'https://archiveofourown.org/works/11111',
        title: 'The Boy Who Lived Again',
        author: 'DifferentAuthor',
        summary: 'Completely different story about dragons and magic.',
        wordCount: 75000,
        fandomId: 'harry-potter',
      },
      {
        id: 'story-4',
        url: 'https://wattpad.com/story/22222-percy-jackson-adventures',
        title: 'Percy Jackson: New Quest',
        author: 'CampAuthor',
        summary: 'Percy embarks on a new adventure to save Camp Half-Blood.',
        wordCount: 30000,
        fandomId: 'percy-jackson',
      },
    ];

    // Note: This will fail until DuplicateDetector is implemented
    duplicateDetector = new DuplicateDetector({
      database: mockDb,
      similarityThresholds: {
        url: 0.9,
        title: 0.8,
        content: 0.7,
      },
      performanceTargets: {
        maxResponseTime: 200, // 200ms target
        batchSize: 100,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('URL Normalization and Similarity Matching', () => {
    it('should normalize AO3 URLs correctly', () => {
      // Arrange
      const urlVariations = [
        'https://archiveofourown.org/works/12345',
        'https://archiveofourown.org/works/12345/',
        'https://archiveofourown.org/works/12345?view_full_work=true',
        'https://archiveofourown.org/works/12345/chapters/67890',
        'http://archiveofourown.org/works/12345',
        'archiveofourown.org/works/12345',
      ];

      // Act
      const normalizedUrls = urlVariations.map(url =>
        UrlNormalizer.normalize(url)
      );

      // Assert
      const expectedNormalized = 'https://archiveofourown.org/works/12345';
      normalizedUrls.forEach(normalized => {
        expect(normalized).toBe(expectedNormalized);
      });
    });

    it('should normalize FFN URLs correctly', () => {
      // Arrange
      const ffnVariations = [
        'https://www.fanfiction.net/s/12345/1/',
        'https://www.fanfiction.net/s/12345/1/Story-Title',
        'https://m.fanfiction.net/s/12345/1/',
        'http://fanfiction.net/s/12345/1/',
        'https://www.fanfiction.net/s/12345/2/', // Different chapter
        'fanfiction.net/s/12345/1/',
      ];

      // Act
      const normalizedUrls = ffnVariations.map(url =>
        UrlNormalizer.normalize(url)
      );

      // Assert
      const expectedNormalized = 'https://www.fanfiction.net/s/12345';
      normalizedUrls.forEach(normalized => {
        expect(normalized).toBe(expectedNormalized);
      });
    });

    it('should detect URL duplicates across different formats', async () => {
      // Arrange
      const newSubmission = {
        url: 'http://archiveofourown.org/works/12345?view_full_work=true',
        title: 'Different Title',
        author: 'Different Author',
        summary: 'Different summary',
        fandomId: 'harry-potter',
      };

      // Mock database to return existing story
      vi.mocked(mockDb.select).mockReturnValue([sampleStories[0]]);

      // Act
      const duplicateResult = await duplicateDetector.checkForDuplicates(
        newSubmission
      );

      // Assert
      expect(duplicateResult.isDuplicate).toBe(true);
      expect(duplicateResult.matches).toHaveLength(1);
      expect(duplicateResult.matches[0]).toMatchObject({
        type: 'url',
        similarity: 1.0, // Exact URL match after normalization
        existingStory: expect.objectContaining({
          id: 'story-1',
        }),
      });
    });

    it('should handle malformed URLs gracefully', () => {
      // Arrange
      const malformedUrls = [
        'not-a-url',
        'https://',
        'ftp://example.com/story',
        '://malformed-protocol',
        'https://archiveofourown.org/works/', // Missing work ID
        'https://www.fanfiction.net/s/', // Missing story ID
        null,
        undefined,
        '',
      ];

      // Act & Assert
      malformedUrls.forEach(url => {
        expect(() => {
          UrlNormalizer.normalize(url);
        }).not.toThrow(); // Should handle gracefully, not crash

        const normalized = UrlNormalizer.normalize(url);
        expect(typeof normalized === 'string' || normalized === null).toBe(
          true
        );
      });
    });
  });

  describe('Title Fuzzy Matching with Various Scenarios', () => {
    it('should detect similar titles with minor differences', async () => {
      // Arrange
      const titleVariations = [
        'Harry Potter and the Time Turner',
        'Harry Potter & the Time Turner',
        'Harry Potter and the Time-Turner',
        'Harry Potter and The Time Turner',
        'HP and the Time Turner',
        'Harry Potter: Time Turner',
      ];

      const baseTitle = 'Harry Potter and the Time Turner';

      // Act
      const similarities = titleVariations.map(title =>
        TitleMatcher.calculateSimilarity(baseTitle, title)
      );

      // Assert
      similarities.forEach(similarity => {
        expect(similarity).toBeGreaterThan(0.7); // 70% similarity threshold
        expect(similarity).toBeLessThanOrEqual(1.0);
      });

      // First item should be exact match
      expect(similarities[0]).toBe(1.0);
    });

    it('should not match completely different titles', async () => {
      // Arrange
      const differentTitles = [
        'Percy Jackson and the Lightning Thief',
        'Naruto: The Last Adventure',
        'Star Wars: A New Hope',
        'Lord of the Rings: Fellowship',
      ];

      const baseTitle = 'Harry Potter and the Time Turner';

      // Act
      const similarities = differentTitles.map(title =>
        TitleMatcher.calculateSimilarity(baseTitle, title)
      );

      // Assert
      similarities.forEach(similarity => {
        expect(similarity).toBeLessThan(0.5); // Below threshold
      });
    });

    it('should handle title variations with different character encodings', async () => {
      // Arrange
      const encodingVariations = [
        "Harry Potter and the Philosopher's Stone",
        "Harry Potter and the Philosopher's Stone", // Different apostrophe
        "Harry Potter and the Philosopher's Stone", // Unicode apostrophe
        'Harry Potter and the Philosophers Stone', // No apostrophe
        "Harry Potter and the Philosopher's Stone", // Regular apostrophe
      ];

      // Act
      const similarities = encodingVariations.map((title, index) => {
        if (index === 0) {
          return 1.0; // Base comparison
        }
        return TitleMatcher.calculateSimilarity(encodingVariations[0], title);
      });

      // Assert
      similarities.forEach(similarity => {
        expect(similarity).toBeGreaterThan(0.9); // High similarity despite encoding differences
      });
    });

    it('should detect duplicate titles in existing database', async () => {
      // Arrange
      const newSubmission = {
        url: 'https://wattpad.com/story/99999-time-travel-story',
        title: 'Time Travel Harry Potter', // Similar to story-2
        author: 'NewAuthor',
        summary: 'Different summary but similar title',
        fandomId: 'harry-potter',
      };

      // Mock database to return existing stories
      vi.mocked(mockDb.select).mockReturnValue(sampleStories);

      // Act
      const duplicateResult = await duplicateDetector.checkForDuplicates(
        newSubmission
      );

      // Assert
      expect(duplicateResult.isDuplicate).toBe(true);
      expect(
        duplicateResult.matches.some(match => match.type === 'title')
      ).toBe(true);

      const titleMatch = duplicateResult.matches.find(
        match => match.type === 'title'
      );
      expect(titleMatch.similarity).toBeGreaterThan(0.8);
      expect(titleMatch.existingStory.id).toBe('story-2');
    });
  });

  describe('Duplicate Detection Workflow Integration', () => {
    it('should perform complete duplicate check workflow', async () => {
      // Arrange
      const newSubmission = {
        url: 'https://archiveofourown.org/works/99999',
        title: 'Unique New Story Title',
        author: 'UniqueAuthor',
        summary:
          'A completely unique story that should not match anything existing.',
        wordCount: 25000,
        fandomId: 'harry-potter',
      };

      // Mock database to return existing stories
      vi.mocked(mockDb.select).mockReturnValue(sampleStories);

      // Act
      const startTime = Date.now();
      const duplicateResult = await duplicateDetector.checkForDuplicates(
        newSubmission
      );
      const endTime = Date.now();

      // Assert
      // Performance check - should complete within 200ms
      expect(endTime - startTime).toBeLessThan(200);

      expect(duplicateResult).toMatchObject({
        isDuplicate: expect.any(Boolean),
        matches: expect.any(Array),
        checkedAt: expect.any(Date),
        processingTime: expect.any(Number),
        checksPerformed: expect.objectContaining({
          urlCheck: true,
          titleCheck: true,
          contentCheck: expect.any(Boolean),
        }),
      });

      // Should not be duplicate for unique content
      expect(duplicateResult.isDuplicate).toBe(false);
      expect(duplicateResult.matches).toHaveLength(0);
    });

    it('should handle multi-level duplicate detection', async () => {
      // Arrange - Story that matches on multiple criteria
      const multiMatchSubmission = {
        url: 'https://archiveofourown.org/works/12345', // URL match
        title: 'Harry Potter and the Time Turner', // Title match
        author: 'TestAuthor1', // Author match
        summary: 'Harry goes back in time to fix everything that went wrong.', // Content match
        wordCount: 50000,
        fandomId: 'harry-potter',
      };

      // Mock database to return existing stories
      vi.mocked(mockDb.select).mockReturnValue(sampleStories);

      // Act
      const duplicateResult = await duplicateDetector.checkForDuplicates(
        multiMatchSubmission
      );

      // Assert
      expect(duplicateResult.isDuplicate).toBe(true);
      expect(duplicateResult.matches.length).toBeGreaterThan(1);

      // Should have multiple match types
      const matchTypes = duplicateResult.matches.map(match => match.type);
      expect(matchTypes).toContain('url');
      expect(matchTypes).toContain('title');
      expect(matchTypes).toContain('content');

      // Highest confidence match should be first
      const similarities = duplicateResult.matches.map(
        match => match.similarity
      );
      expect(similarities[0]).toBeGreaterThanOrEqual(similarities[1]);
    });

    it('should store duplicate detection results for audit', async () => {
      // Arrange
      const newSubmission = {
        url: 'https://example.com/story/audit-test',
        title: 'Audit Test Story',
        author: 'AuditAuthor',
        summary: 'Story for testing audit trail',
        fandomId: 'harry-potter',
      };

      // Mock database calls
      vi.mocked(mockDb.select).mockReturnValue(sampleStories);
      vi.mocked(mockDb.insert).mockReturnValue({ lastInsertRowid: 1 });

      // Act
      const duplicateResult = await duplicateDetector.checkForDuplicates(
        newSubmission,
        {
          storeAuditLog: true,
          submissionId: 'test-submission-123',
        }
      );

      // Assert - Audit record should be created
      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          submissionId: 'test-submission-123',
          duplicateCheckResult: expect.any(String), // JSON stringified result
          checkedAt: expect.any(Date),
          processingTimeMs: expect.any(Number),
        })
      );
    });

    it('should handle batch duplicate checking efficiently', async () => {
      // Arrange - Multiple submissions for batch processing
      const batchSubmissions = Array.from({ length: 50 }, (_, i) => ({
        url: `https://example.com/story/${i}`,
        title: `Batch Test Story ${i}`,
        author: `BatchAuthor${i}`,
        summary: `Batch test story number ${i} for performance testing`,
        fandomId: 'harry-potter',
      }));

      // Mock database to return existing stories
      vi.mocked(mockDb.select).mockReturnValue(sampleStories);

      // Act
      const startTime = Date.now();
      const batchResults = await duplicateDetector.checkBatch(batchSubmissions);
      const endTime = Date.now();

      // Assert
      // Total batch processing should be efficient
      expect(endTime - startTime).toBeLessThan(1000); // 1 second for 50 items
      expect(batchResults).toHaveLength(50);

      batchResults.forEach(result => {
        expect(result).toMatchObject({
          isDuplicate: expect.any(Boolean),
          matches: expect.any(Array),
          processingTime: expect.any(Number),
        });
      });
    });
  });

  describe('False Positive and False Negative Test Cases', () => {
    it('should not flag legitimate sequels as duplicates', async () => {
      // Arrange - Legitimate sequel
      const sequel = {
        url: 'https://archiveofourown.org/works/99999',
        title: 'Harry Potter and the Time Turner: Part Two',
        author: 'TestAuthor1', // Same author as original
        summary:
          'The sequel to Harry Potter and the Time Turner, continuing the story.',
        wordCount: 60000,
        fandomId: 'harry-potter',
      };

      // Mock database to return existing stories including original
      vi.mocked(mockDb.select).mockReturnValue(sampleStories);

      // Act
      const duplicateResult = await duplicateDetector.checkForDuplicates(
        sequel
      );

      // Assert
      expect(duplicateResult.isDuplicate).toBe(false);

      // Should have low similarity matches but not above threshold
      if (duplicateResult.matches.length > 0) {
        duplicateResult.matches.forEach(match => {
          expect(match.similarity).toBeLessThan(0.8); // Below duplicate threshold
        });
      }
    });

    it('should not flag different stories with common tropes as duplicates', async () => {
      // Arrange - Different stories with similar tropes
      const commonTropeStories = [
        {
          title: 'Time Travel Fix-It: Harry Edition',
          summary: 'Harry travels back to fix his mistakes and save everyone.',
        },
        {
          title: 'Redo: Harry Potter Style',
          summary:
            'What if Harry could go back and change everything that went wrong?',
        },
        {
          title: 'Second Chances for the Boy Who Lived',
          summary:
            'Harry gets another chance to make things right through time travel.',
        },
      ];

      // Act
      const similarities = [];
      for (let i = 0; i < commonTropeStories.length; i++) {
        for (let j = i + 1; j < commonTropeStories.length; j++) {
          const similarity = await ContentAnalyzer.compareContent(
            commonTropeStories[i].summary,
            commonTropeStories[j].summary
          );
          similarities.push(similarity);
        }
      }

      // Assert - Should have moderate similarity but not be flagged as duplicates
      similarities.forEach(similarity => {
        expect(similarity).toBeGreaterThan(0.3); // Some similarity due to common trope
        expect(similarity).toBeLessThan(0.7); // But not duplicate level
      });
    });

    it('should catch subtle duplicates with rephrased content', async () => {
      // Arrange - Same story with rephrased summary
      const rephrased = {
        url: 'https://different-site.com/story/subtle-duplicate',
        title: 'The Time-Traveling Potter',
        author: 'DifferentPseudonym',
        summary:
          'Potter travels through time in order to repair all the things that went awry.',
        wordCount: 49000, // Similar word count
        fandomId: 'harry-potter',
      };

      // Mock database to return existing stories
      vi.mocked(mockDb.select).mockReturnValue(sampleStories);

      // Act
      const duplicateResult = await duplicateDetector.checkForDuplicates(
        rephrased
      );

      // Assert
      expect(duplicateResult.isDuplicate).toBe(true);

      const contentMatch = duplicateResult.matches.find(
        match => match.type === 'content'
      );
      expect(contentMatch).toBeTruthy();
      expect(contentMatch.similarity).toBeGreaterThan(0.7);
    });

    it('should handle cross-platform duplicates', async () => {
      // Arrange - Same story posted on different platforms
      const crossPlatform = {
        url: 'https://wattpad.com/story/duplicate-cross-platform',
        title: 'Harry Potter and the Time Turner',
        author: 'TestAuthor1_Wattpad', // Slightly different username
        summary: 'Harry goes back in time to fix everything that went wrong.',
        wordCount: 50500, // Slightly different due to platform formatting
        fandomId: 'harry-potter',
      };

      // Mock database to return existing stories
      vi.mocked(mockDb.select).mockReturnValue(sampleStories);

      // Act
      const duplicateResult = await duplicateDetector.checkForDuplicates(
        crossPlatform
      );

      // Assert
      expect(duplicateResult.isDuplicate).toBe(true);

      // Should match on title and content despite different URL and slight author variation
      const hasContentMatch = duplicateResult.matches.some(
        match => match.type === 'content' && match.similarity > 0.8
      );
      const hasTitleMatch = duplicateResult.matches.some(
        match => match.type === 'title' && match.similarity > 0.9
      );

      expect(hasContentMatch || hasTitleMatch).toBe(true);
    });
  });

  describe('Performance Testing for Large Story Databases', () => {
    it('should maintain performance with large dataset', async () => {
      // Arrange - Mock large database
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: `story-${i}`,
        url: `https://example.com/story/${i}`,
        title: `Story Title ${i}`,
        author: `Author${i % 100}`, // 100 different authors
        summary: `This is story number ${i} with various content and themes.`,
        wordCount: 10000 + i * 100,
        fandomId: i % 2 === 0 ? 'harry-potter' : 'percy-jackson',
      }));

      // Mock database with large dataset
      vi.mocked(mockDb.select).mockReturnValue(largeDataset);

      const newSubmission = {
        url: 'https://archiveofourown.org/works/performance-test',
        title: 'Performance Test Story',
        author: 'PerformanceAuthor',
        summary: 'Testing duplicate detection performance with large dataset',
        fandomId: 'harry-potter',
      };

      // Act
      const startTime = Date.now();
      const duplicateResult = await duplicateDetector.checkForDuplicates(
        newSubmission
      );
      const endTime = Date.now();

      // Assert - Must complete within performance target
      expect(endTime - startTime).toBeLessThan(200); // 200ms target

      expect(duplicateResult).toMatchObject({
        isDuplicate: expect.any(Boolean),
        matches: expect.any(Array),
        processingTime: expect.any(Number),
      });
    });

    it('should optimize database queries for duplicate detection', async () => {
      // Arrange
      const newSubmission = {
        url: 'https://archiveofourown.org/works/query-optimization',
        title: 'Query Optimization Test',
        author: 'QueryAuthor',
        summary: 'Testing database query optimization',
        fandomId: 'harry-potter',
      };

      // Mock database calls to track queries
      const mockSelect = vi.mocked(mockDb.select);
      mockSelect.mockReturnValue(sampleStories.slice(0, 3)); // Return subset

      // Act
      await duplicateDetector.checkForDuplicates(newSubmission);

      // Assert - Should use optimized queries
      expect(mockSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          // Should filter by fandom first to reduce dataset size
          where: expect.stringContaining('fandomId'),
          // Should use indexes for performance
          orderBy: expect.any(String),
          limit: expect.any(Number),
        })
      );

      // Should not query more than necessary
      expect(mockSelect).toHaveBeenCalledTimes(1);
    });

    it('should handle memory efficiently with large result sets', async () => {
      // Arrange - Simulate memory constraints
      const memoryConstraints = {
        maxBatchSize: 1000,
        maxConcurrentChecks: 10,
      };

      const largeSubmissionBatch = Array.from({ length: 5000 }, (_, i) => ({
        url: `https://example.com/memory-test/${i}`,
        title: `Memory Test Story ${i}`,
        author: `MemoryAuthor${i}`,
        summary: `Memory test story ${i}`,
        fandomId: 'harry-potter',
      }));

      // Act
      const memoryBefore = process.memoryUsage().heapUsed;
      const results = await duplicateDetector.checkBatch(largeSubmissionBatch, {
        batchSize: memoryConstraints.maxBatchSize,
        maxConcurrent: memoryConstraints.maxConcurrentChecks,
      });
      const memoryAfter = process.memoryUsage().heapUsed;

      // Assert
      expect(results).toHaveLength(5000);

      // Memory usage should not grow excessively
      const memoryIncrease = memoryAfter - memoryBefore;
      const maxAllowedIncrease = 100 * 1024 * 1024; // 100MB
      expect(memoryIncrease).toBeLessThan(maxAllowedIncrease);
    });
  });
});
