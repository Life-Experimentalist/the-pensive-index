/**
 * Title Matching Module
 *
 * Fuzzy matching and similarity detection for story titles
 */

export interface TitleMatchResult {
  similarity: number;
  isMatch: boolean;
  normalizedTitle1: string;
  normalizedTitle2: string;
}

export class TitleMatcher {
  private readonly similarityThreshold: number;

  constructor(similarityThreshold: number = 0.85) {
    this.similarityThreshold = similarityThreshold;
  }

  /**
   * Normalize a title for comparison
   */
  normalize(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\bthe\b|\ba\b|\ban\b/g, '') // Remove common articles
      .trim();
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Calculate similarity score between two titles (0-1)
   */
  calculateSimilarity(title1: string, title2: string): number {
    const norm1 = this.normalize(title1);
    const norm2 = this.normalize(title2);

    if (norm1 === norm2) {
      return 1.0;
    }

    const maxLen = Math.max(norm1.length, norm2.length);
    if (maxLen === 0) {
      return 0.0;
    }

    const distance = this.levenshteinDistance(norm1, norm2);
    return 1 - distance / maxLen;
  }

  /**
   * Check if two titles match
   */
  match(title1: string, title2: string, threshold?: number): TitleMatchResult {
    const similarity = this.calculateSimilarity(title1, title2);
    const effectiveThreshold = threshold ?? this.similarityThreshold;

    return {
      similarity,
      isMatch: similarity >= effectiveThreshold,
      normalizedTitle1: this.normalize(title1),
      normalizedTitle2: this.normalize(title2),
    };
  }

  /**
   * Find best match from a list of titles
   */
  findBestMatch(
    targetTitle: string,
    titles: string[]
  ): { title: string; similarity: number; index: number } | null {
    let bestMatch: { title: string; similarity: number; index: number } | null =
      null;

    titles.forEach((title, index) => {
      const similarity = this.calculateSimilarity(targetTitle, title);
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { title, similarity, index };
      }
    });

    return bestMatch;
  }

  /**
   * Check if a title contains another title
   */
  contains(fullTitle: string, partialTitle: string): boolean {
    const normFull = this.normalize(fullTitle);
    const normPartial = this.normalize(partialTitle);
    return normFull.includes(normPartial);
  }
}
