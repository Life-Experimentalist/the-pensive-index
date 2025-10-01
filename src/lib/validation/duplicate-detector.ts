/**
 * Duplicate Detection Service
 *
 * This service provides comprehensive duplicate detection for story submissions
 * using URL normalization, title fuzzy matching, and content analysis.
 * Includes performance optimization for large datasets.
 */

import { getDatabase } from '../database';
import { storySubmissions } from '../database/schemas/submissions';
import { eq, like, sql, and } from 'drizzle-orm';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  confidence: number; // 0-1 scale
  matchedSubmissions: DuplicateMatch[];
  reasons: string[];
}

export interface DuplicateMatch {
  submissionId: string;
  matchType: 'exact_url' | 'similar_url' | 'title_fuzzy' | 'content_similar';
  confidence: number;
  details: {
    originalUrl?: string;
    normalizedUrl?: string;
    titleSimilarity?: number;
    contentSimilarity?: number;
  };
}

export interface DuplicateDetectionConfig {
  // URL matching thresholds
  urlSimilarityThreshold: number; // 0.9 default
  urlNormalizationEnabled: boolean; // true default

  // Title matching thresholds
  titleSimilarityThreshold: number; // 0.85 default
  titleFuzzyMatchingEnabled: boolean; // true default

  // Content matching thresholds
  contentSimilarityThreshold: number; // 0.8 default
  contentMatchingEnabled: boolean; // false default - expensive

  // Performance settings
  maxCandidatesPerCheck: number; // 100 default
  enableIndexedSearch: boolean; // true default
}

export class DuplicateDetector {
  private config: DuplicateDetectionConfig;

  constructor(config: Partial<DuplicateDetectionConfig> = {}) {
    this.config = {
      urlSimilarityThreshold: 0.9,
      urlNormalizationEnabled: true,
      titleSimilarityThreshold: 0.85,
      titleFuzzyMatchingEnabled: true,
      contentSimilarityThreshold: 0.8,
      contentMatchingEnabled: false,
      maxCandidatesPerCheck: 100,
      enableIndexedSearch: true,
      ...config,
    };
  }

  /**
   * Main entry point for duplicate detection
   */
  async checkForDuplicates(
    url: string,
    title: string,
    fandomId?: string,
    content?: string
  ): Promise<DuplicateCheckResult> {
    const matches: DuplicateMatch[] = [];
    const reasons: string[] = [];

    try {
      // Step 1: Exact URL match (fastest)
      const exactUrlMatch = await this.checkExactUrl(url);
      if (exactUrlMatch) {
        matches.push(exactUrlMatch);
        reasons.push('Exact URL match found');
      }

      // Step 2: Normalized URL match
      if (this.config.urlNormalizationEnabled && !exactUrlMatch) {
        const normalizedMatches = await this.checkNormalizedUrl(url, fandomId);
        matches.push(...normalizedMatches);
        if (normalizedMatches.length > 0) {
          reasons.push('Similar URL patterns detected');
        }
      }

      // Step 3: Title fuzzy matching
      if (this.config.titleFuzzyMatchingEnabled) {
        const titleMatches = await this.checkTitleSimilarity(title, fandomId);
        matches.push(...titleMatches);
        if (titleMatches.length > 0) {
          reasons.push('Similar titles found');
        }
      }

      // Step 4: Content similarity (expensive, optional)
      if (this.config.contentMatchingEnabled && content) {
        const contentMatches = await this.checkContentSimilarity(
          content,
          fandomId
        );
        matches.push(...contentMatches);
        if (contentMatches.length > 0) {
          reasons.push('Similar content detected');
        }
      }

      // Calculate overall confidence and determine if duplicate
      const result = this.evaluateMatches(matches, reasons);

      return result;
    } catch (error) {
      console.error('Duplicate detection failed:', error);
      return {
        isDuplicate: false,
        confidence: 0,
        matchedSubmissions: [],
        reasons: ['Detection failed due to error'],
      };
    }
  }

  /**
   * Check for exact URL match
   */
  private async checkExactUrl(url: string): Promise<DuplicateMatch | null> {
    const db = await getDatabase();

    const [match] = await db
      .select()
      .from(storySubmissions)
      .where(eq(storySubmissions.storyUrl, url))
      .limit(1);

    if (match) {
      return {
        submissionId: match.id,
        matchType: 'exact_url',
        confidence: 1.0,
        details: {
          originalUrl: url,
          normalizedUrl: url,
        },
      };
    }

    return null;
  }

  /**
   * Check for similar URLs using normalization
   */
  private async checkNormalizedUrl(
    url: string,
    fandomId?: string
  ): Promise<DuplicateMatch[]> {
    const db = await getDatabase();
    const normalizedUrl = this.normalizeUrl(url);
    const urlPattern = this.createUrlPattern(normalizedUrl);

    // Get candidate submissions
    const conditions = [like(storySubmissions.storyUrl, urlPattern)];
    if (fandomId) {
      conditions.push(eq(storySubmissions.fandomId, fandomId));
    }

    const candidates = await db
      .select()
      .from(storySubmissions)
      .where(and(...conditions))
      .limit(this.config.maxCandidatesPerCheck);
    const matches: DuplicateMatch[] = [];

    for (const candidate of candidates) {
      const candidateNormalized = this.normalizeUrl(candidate.storyUrl);
      const similarity = this.calculateUrlSimilarity(
        normalizedUrl,
        candidateNormalized
      );

      if (similarity >= this.config.urlSimilarityThreshold) {
        matches.push({
          submissionId: candidate.id,
          matchType: 'similar_url',
          confidence: similarity,
          details: {
            originalUrl: candidate.storyUrl,
            normalizedUrl: candidateNormalized,
          },
        });
      }
    }

    return matches;
  }

  /**
   * Check for title similarity using fuzzy matching
   */
  private async checkTitleSimilarity(
    title: string,
    fandomId?: string
  ): Promise<DuplicateMatch[]> {
    const db = await getDatabase();
    const normalizedTitle = this.normalizeTitle(title);

    // Get candidates using basic text search first
    const conditions = [];
    if (fandomId) {
      conditions.push(eq(storySubmissions.fandomId, fandomId));
    }

    const candidates = await db
      .select()
      .from(storySubmissions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(this.config.maxCandidatesPerCheck);
    const matches: DuplicateMatch[] = [];

    for (const candidate of candidates) {
      const candidateTitle = this.normalizeTitle(candidate.storyTitle);
      const similarity = this.calculateTitleSimilarity(
        normalizedTitle,
        candidateTitle
      );

      if (similarity >= this.config.titleSimilarityThreshold) {
        matches.push({
          submissionId: candidate.id,
          matchType: 'title_fuzzy',
          confidence: similarity,
          details: {
            titleSimilarity: similarity,
          },
        });
      }
    }

    return matches;
  }

  /**
   * Check for content similarity (expensive operation)
   */
  private async checkContentSimilarity(
    content: string,
    fandomId?: string
  ): Promise<DuplicateMatch[]> {
    // This is a simplified implementation
    // In production, you'd want to use more sophisticated content similarity algorithms
    const db = await getDatabase();

    // For now, just check if content exists and do basic similarity
    const contentHash = this.createContentHash(content);

    const conditions = [sql`length(${storySubmissions.summary}) > 0`];
    if (fandomId) {
      conditions.push(eq(storySubmissions.fandomId, fandomId));
    }

    const candidates = await db
      .select()
      .from(storySubmissions)
      .where(and(...conditions))
      .limit(this.config.maxCandidatesPerCheck);
    const matches: DuplicateMatch[] = [];

    for (const candidate of candidates) {
      if (candidate.summary) {
        const candidateHash = this.createContentHash(candidate.summary);
        const similarity = this.calculateContentSimilarity(
          contentHash,
          candidateHash
        );

        if (similarity >= this.config.contentSimilarityThreshold) {
          matches.push({
            submissionId: candidate.id,
            matchType: 'content_similar',
            confidence: similarity,
            details: {
              contentSimilarity: similarity,
            },
          });
        }
      }
    }

    return matches;
  }

  /**
   * Normalize URL for comparison
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);

      // Remove common tracking parameters
      const paramsToRemove = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'ref',
        'referrer',
      ];
      paramsToRemove.forEach(param => urlObj.searchParams.delete(param));

      // Normalize path
      let path = urlObj.pathname;

      // Remove trailing slashes
      path = path.replace(/\/+$/, '') || '/';

      // Handle common fanfiction site patterns
      if (urlObj.hostname.includes('archiveofourown.org')) {
        // AO3: /works/12345/chapters/67890 -> /works/12345
        path = path.replace(/\/chapters\/\d+$/, '');
      } else if (urlObj.hostname.includes('fanfiction.net')) {
        // FFN: /s/12345/1/Title -> /s/12345
        path = path.replace(/\/\d+\/.*$/, '');
      }

      return `${urlObj.protocol}//${urlObj.hostname}${path}${urlObj.search}`;
    } catch (error) {
      // If URL parsing fails, return cleaned version
      return url.toLowerCase().trim();
    }
  }

  /**
   * Create URL pattern for SQL LIKE matching
   */
  private createUrlPattern(normalizedUrl: string): string {
    // Extract the core identifier from the URL
    const match = normalizedUrl.match(/\/(\d+)/);
    if (match) {
      return `%/${match[1]}%`;
    }
    return `%${normalizedUrl.split('/').pop()}%`;
  }

  /**
   * Calculate URL similarity using string distance
   */
  private calculateUrlSimilarity(url1: string, url2: string): number {
    if (url1 === url2) {
      return 1.0;
    }

    // Use Levenshtein distance for basic similarity
    const distance = this.levenshteinDistance(url1, url2);
    const maxLength = Math.max(url1.length, url2.length);

    return maxLength === 0 ? 1.0 : (maxLength - distance) / maxLength;
  }

  /**
   * Normalize title for comparison
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, ' ') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Calculate title similarity using fuzzy matching
   */
  private calculateTitleSimilarity(title1: string, title2: string): number {
    if (title1 === title2) {
      return 1.0;
    }

    // Use Levenshtein distance with normalization
    const distance = this.levenshteinDistance(title1, title2);
    const maxLength = Math.max(title1.length, title2.length);

    return maxLength === 0 ? 1.0 : (maxLength - distance) / maxLength;
  }

  /**
   * Create simple content hash for comparison
   */
  private createContentHash(content: string): string {
    // Simple hash - in production use proper content fingerprinting
    return content
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200); // Take first 200 chars for comparison
  }

  /**
   * Calculate content similarity
   */
  private calculateContentSimilarity(
    content1: string,
    content2: string
  ): number {
    if (content1 === content2) {
      return 1.0;
    }

    const distance = this.levenshteinDistance(content1, content2);
    const maxLength = Math.max(content1.length, content2.length);

    return maxLength === 0 ? 1.0 : (maxLength - distance) / maxLength;
  }

  /**
   * Levenshtein distance algorithm
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Evaluate all matches and determine final result
   */
  private evaluateMatches(
    matches: DuplicateMatch[],
    reasons: string[]
  ): DuplicateCheckResult {
    if (matches.length === 0) {
      return {
        isDuplicate: false,
        confidence: 0,
        matchedSubmissions: [],
        reasons: ['No duplicates found'],
      };
    }

    // Sort matches by confidence (highest first)
    matches.sort((a, b) => b.confidence - a.confidence);

    // Calculate overall confidence
    let maxConfidence = 0;
    let isDuplicate = false;

    for (const match of matches) {
      if (match.matchType === 'exact_url' && match.confidence === 1.0) {
        isDuplicate = true;
        maxConfidence = 1.0;
        break;
      }

      if (match.confidence > maxConfidence) {
        maxConfidence = match.confidence;
      }

      // High confidence thresholds for different match types
      if (
        (match.matchType === 'similar_url' && match.confidence >= 0.95) ||
        (match.matchType === 'title_fuzzy' && match.confidence >= 0.9) ||
        (match.matchType === 'content_similar' && match.confidence >= 0.85)
      ) {
        isDuplicate = true;
      }
    }

    return {
      isDuplicate,
      confidence: maxConfidence,
      matchedSubmissions: matches,
      reasons,
    };
  }

  /**
   * Batch duplicate check for multiple submissions
   */
  async batchCheckDuplicates(
    submissions: Array<{
      url: string;
      title: string;
      fandomId?: string;
      content?: string;
    }>
  ): Promise<DuplicateCheckResult[]> {
    const results: DuplicateCheckResult[] = [];

    for (const submission of submissions) {
      const result = await this.checkForDuplicates(
        submission.url,
        submission.title,
        submission.fandomId,
        submission.content
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Update detection configuration
   */
  updateConfig(newConfig: Partial<DuplicateDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): DuplicateDetectionConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const duplicateDetector = new DuplicateDetector();
