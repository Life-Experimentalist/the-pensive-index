/**
 * Content Analysis Module
 *
 * Analyzes story content for similarity detection and duplicate prevention
 */

export interface ContentAnalysisResult {
  similarity: number;
  isMatch: boolean;
  commonPhrases: string[];
  uniqueWords1: number;
  uniqueWords2: number;
  overlapWords: number;
}

export class ContentAnalyzer {
  private readonly similarityThreshold: number;
  private readonly minPhraseLength: number;

  constructor(similarityThreshold: number = 0.75, minPhraseLength: number = 5) {
    this.similarityThreshold = similarityThreshold;
    this.minPhraseLength = minPhraseLength;
  }

  /**
   * Normalize content text for analysis
   */
  normalize(content: string): string {
    return content
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  /**
   * Extract words from content
   */
  private extractWords(content: string): Set<string> {
    const normalized = this.normalize(content);
    const words = normalized.split(/\s+/).filter(word => word.length > 2);
    return new Set(words);
  }

  /**
   * Calculate Jaccard similarity between two content strings
   */
  calculateSimilarity(content1: string, content2: string): number {
    const words1 = this.extractWords(content1);
    const words2 = this.extractWords(content2);

    if (words1.size === 0 && words2.size === 0) {
      return 1.0;
    }

    if (words1.size === 0 || words2.size === 0) {
      return 0.0;
    }

    // Calculate intersection
    const intersection = new Set([...words1].filter(word => words2.has(word)));

    // Calculate union
    const union = new Set([...words1, ...words2]);

    // Jaccard similarity = |intersection| / |union|
    return intersection.size / union.size;
  }

  /**
   * Find common phrases between two content strings
   */
  findCommonPhrases(content1: string, content2: string): string[] {
    const norm1 = this.normalize(content1);
    const norm2 = this.normalize(content2);

    const phrases: string[] = [];
    const words1 = norm1.split(/\s+/);

    // Find common n-grams
    for (let n = this.minPhraseLength; n <= 10; n++) {
      for (let i = 0; i <= words1.length - n; i++) {
        const phrase = words1.slice(i, i + n).join(' ');
        if (norm2.includes(phrase)) {
          phrases.push(phrase);
        }
      }
    }

    // Remove duplicates and return
    return [...new Set(phrases)];
  }

  /**
   * Analyze content similarity
   */
  analyze(content1: string, content2: string): ContentAnalysisResult {
    const words1 = this.extractWords(content1);
    const words2 = this.extractWords(content2);

    const overlapWords = new Set([...words1].filter(word => words2.has(word)))
      .size;

    const similarity = this.calculateSimilarity(content1, content2);
    const commonPhrases = this.findCommonPhrases(content1, content2);

    return {
      similarity,
      isMatch: similarity >= this.similarityThreshold,
      commonPhrases,
      uniqueWords1: words1.size,
      uniqueWords2: words2.size,
      overlapWords,
    };
  }

  /**
   * Check if content is substantially similar
   */
  isSimilar(content1: string, content2: string, threshold?: number): boolean {
    const similarity = this.calculateSimilarity(content1, content2);
    const effectiveThreshold = threshold ?? this.similarityThreshold;
    return similarity >= effectiveThreshold;
  }

  /**
   * Extract key phrases from content
   */
  extractKeyPhrases(content: string, count: number = 10): string[] {
    const normalized = this.normalize(content);
    const words = normalized.split(/\s+/);

    // Extract 3-5 word phrases
    const phrases: Map<string, number> = new Map();

    for (let n = 3; n <= 5; n++) {
      for (let i = 0; i <= words.length - n; i++) {
        const phrase = words.slice(i, i + n).join(' ');
        phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
      }
    }

    // Sort by frequency and return top phrases
    return Array.from(phrases.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([phrase]) => phrase);
  }

  /**
   * Calculate content hash for quick comparison
   */
  getContentHash(content: string): string {
    const normalized = this.normalize(content);
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }
}
