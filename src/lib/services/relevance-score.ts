import type { PathwayItem, Story, Tag, PlotBlock, SearchResult } from '@/types';

export interface ScoreWeights {
  exactMatches: number; // Default: 0.40
  categoryMatches: number; // Default: 0.20
  semanticSimilarity: number; // Default: 0.15
  popularity: number; // Default: 0.10
  recency: number; // Default: 0.08
  userAlignment: number; // Default: 0.07
}

export interface ScoringContext {
  pathway: PathwayItem[];
  tags: Tag[];
  plotBlocks: PlotBlock[];
  userPreferences?: UserScoringPreferences;
  fandomMetrics?: FandomMetrics;
  customWeights?: Partial<ScoreWeights>;
}

export interface UserScoringPreferences {
  preferredRatings: string[];
  preferredLengths: string[];
  preferredStatuses: string[];
  excludedTags: string[];
  boostTags: string[];
  preferPopular: boolean; // Boost popular stories
  preferRecent: boolean; // Boost recently updated stories
  preferComplete: boolean; // Boost completed stories
  noveltyWeight: number; // 0-1, how much to weight novelty vs familiarity
}

export interface FandomMetrics {
  averageKudos: number;
  averageHits: number;
  averageBookmarks: number;
  averageWordCount: number;
  totalStories: number;
  popularTags: string[];
  popularPlotBlocks: string[];
}

export interface DetailedScore {
  finalScore: number;
  breakdown: {
    exactMatches: {
      score: number;
      weight: number;
      details: {
        matchedTags: number;
        matchedPlotBlocks: number;
        totalPathwayItems: number;
        percentage: number;
      };
    };
    categoryMatches: {
      score: number;
      weight: number;
      details: {
        tagCategoryMatches: number;
        plotBlockCategoryMatches: number;
        totalComparisons: number;
        percentage: number;
      };
    };
    semanticSimilarity: {
      score: number;
      weight: number;
      details: {
        commonKeywords: string[];
        keywordOverlap: number;
        titleSimilarity: number;
        summarySimilarity: number;
      };
    };
    popularity: {
      score: number;
      weight: number;
      details: {
        kudosScore: number;
        hitsScore: number;
        bookmarkScore: number;
        normalizedAgainstFandom: boolean;
      };
    };
    recency: {
      score: number;
      weight: number;
      details: {
        daysSinceUpdate: number;
        recencyCategory: 'very_recent' | 'recent' | 'moderate' | 'old';
      };
    };
    userAlignment: {
      score: number;
      weight: number;
      details: {
        ratingMatch: boolean;
        lengthMatch: boolean;
        statusMatch: boolean;
        hasBoostTags: boolean;
        hasExcludedTags: boolean;
      };
    };
  };
  confidence: number; // 0-100, how confident we are in this score
  reasons: string[]; // Human-readable explanations
}

export interface BatchScoringResult {
  scored: Array<{
    story: Story;
    score: DetailedScore;
  }>;
  performance: {
    totalTime: number;
    averageTimePerStory: number;
    cacheHits: number;
    cacheMisses: number;
  };
  statistics: {
    scoreDistribution: {
      excellent: number; // 90-100
      good: number; // 70-89
      fair: number; // 50-69
      poor: number; // 0-49
    };
    averageScore: number;
    medianScore: number;
    standardDeviation: number;
  };
}

/**
 * Relevance Score Service
 *
 * Provides sophisticated story ranking and compatibility scoring for the
 * discovery interface. Implements multi-factor scoring with detailed
 * breakdowns and performance optimization.
 *
 * Features:
 * - Weighted multi-factor scoring algorithm with customizable weights
 * - Detailed score breakdowns for transparency and debugging
 * - Batch scoring optimization for large result sets
 * - Confidence scoring based on data quality and completeness
 * - Adaptive scoring based on fandom-specific metrics
 * - Performance monitoring and caching
 *
 * Performance Requirements:
 * - Individual story scoring: <10ms per story
 * - Batch scoring: <200ms for 100 stories
 * - Memory efficient for large datasets
 * - Cacheable results with invalidation strategies
 */
export class RelevanceScoreService {
  private readonly defaultWeights: ScoreWeights = {
    exactMatches: 0.4,
    categoryMatches: 0.2,
    semanticSimilarity: 0.15,
    popularity: 0.1,
    recency: 0.08,
    userAlignment: 0.07,
  };

  private scoreCache: Map<string, DetailedScore> = new Map();
  private readonly maxCacheSize = 5000;
  private readonly cacheExpiryMs = 10 * 60 * 1000; // 10 minutes

  /**
   * Calculate detailed relevance score for a single story
   */
  async calculateScore(
    story: Story,
    context: ScoringContext
  ): Promise<DetailedScore> {
    const startTime = Date.now();

    // Check cache first
    const cacheKey = this.generateCacheKey(story.id, context);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Get story metadata
    const storyTags = await this.getStoryTags(story.id);
    const storyPlotBlocks = await this.getStoryPlotBlocks(story.id);

    // Calculate individual factor scores
    const exactMatches = this.calculateExactMatches(
      story,
      context.pathway,
      storyTags,
      storyPlotBlocks
    );

    const categoryMatches = this.calculateCategoryMatches(
      context.pathway,
      context.tags,
      context.plotBlocks,
      storyTags,
      storyPlotBlocks
    );

    const semanticSimilarity = this.calculateSemanticSimilarity(
      story,
      context.pathway,
      context.tags,
      context.plotBlocks
    );

    const popularity = this.calculatePopularityScore(
      story,
      context.fandomMetrics
    );

    const recency = this.calculateRecencyScore(story);

    const userAlignment = this.calculateUserAlignmentScore(
      story,
      storyTags,
      context.userPreferences
    );

    // Apply weights
    const weights = { ...this.defaultWeights, ...context.customWeights };

    const weightedScores = {
      exactMatches: exactMatches.score * weights.exactMatches,
      categoryMatches: categoryMatches.score * weights.categoryMatches,
      semanticSimilarity: semanticSimilarity.score * weights.semanticSimilarity,
      popularity: popularity.score * weights.popularity,
      recency: recency.score * weights.recency,
      userAlignment: userAlignment.score * weights.userAlignment,
    };

    // Calculate final score
    const finalScore = Object.values(weightedScores).reduce(
      (sum, score) => sum + score,
      0
    );

    // Calculate confidence
    const confidence = this.calculateConfidence(
      story,
      exactMatches,
      categoryMatches,
      semanticSimilarity,
      context
    );

    // Generate human-readable reasons
    const reasons = this.generateScoreReasons(
      weightedScores,
      exactMatches,
      categoryMatches,
      semanticSimilarity,
      popularity,
      recency,
      userAlignment
    );

    const detailedScore: DetailedScore = {
      finalScore: Math.max(0, Math.min(100, finalScore)),
      breakdown: {
        exactMatches: {
          score: exactMatches.score,
          weight: weights.exactMatches,
          details: exactMatches.details,
        },
        categoryMatches: {
          score: categoryMatches.score,
          weight: weights.categoryMatches,
          details: categoryMatches.details,
        },
        semanticSimilarity: {
          score: semanticSimilarity.score,
          weight: weights.semanticSimilarity,
          details: semanticSimilarity.details,
        },
        popularity: {
          score: popularity.score,
          weight: weights.popularity,
          details: popularity.details,
        },
        recency: {
          score: recency.score,
          weight: weights.recency,
          details: recency.details,
        },
        userAlignment: {
          score: userAlignment.score,
          weight: weights.userAlignment,
          details: userAlignment.details,
        },
      },
      confidence,
      reasons,
    };

    // Cache the result
    this.setCache(cacheKey, detailedScore);

    return detailedScore;
  }

  /**
   * Batch score multiple stories efficiently
   */
  async batchScore(
    stories: Story[],
    context: ScoringContext
  ): Promise<BatchScoringResult> {
    const startTime = Date.now();
    let cacheHits = 0;
    let cacheMisses = 0;

    const scored = await Promise.all(
      stories.map(async story => {
        const cacheKey = this.generateCacheKey(story.id, context);
        const cached = this.getFromCache(cacheKey);

        if (cached) {
          cacheHits++;
          return { story, score: cached };
        }

        cacheMisses++;
        const score = await this.calculateScore(story, context);
        return { story, score };
      })
    );

    // Calculate statistics
    const scores = scored.map(item => item.score.finalScore);
    const averageScore =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const sortedScores = [...scores].sort((a, b) => a - b);
    const medianScore = sortedScores[Math.floor(sortedScores.length / 2)];

    const variance =
      scores.reduce(
        (sum, score) => sum + Math.pow(score - averageScore, 2),
        0
      ) / scores.length;
    const standardDeviation = Math.sqrt(variance);

    const scoreDistribution = {
      excellent: scores.filter(s => s >= 90).length,
      good: scores.filter(s => s >= 70 && s < 90).length,
      fair: scores.filter(s => s >= 50 && s < 70).length,
      poor: scores.filter(s => s < 50).length,
    };

    const totalTime = Date.now() - startTime;

    return {
      scored,
      performance: {
        totalTime,
        averageTimePerStory: totalTime / stories.length,
        cacheHits,
        cacheMisses,
      },
      statistics: {
        scoreDistribution,
        averageScore,
        medianScore,
        standardDeviation,
      },
    };
  }

  /**
   * Calculate exact matches between pathway and story
   */
  private calculateExactMatches(
    story: Story,
    pathway: PathwayItem[],
    storyTags: string[],
    storyPlotBlocks: string[]
  ): {
    score: number;
    details: DetailedScore['breakdown']['exactMatches']['details'];
  } {
    const pathwayTagIds = pathway.filter(p => p.type === 'tag').map(p => p.id);
    const pathwayPlotBlockIds = pathway
      .filter(p => p.type === 'plot_block')
      .map(p => p.id);

    const matchedTags = pathwayTagIds.filter(id =>
      storyTags.includes(id)
    ).length;
    const matchedPlotBlocks = pathwayPlotBlockIds.filter(id =>
      storyPlotBlocks.includes(id)
    ).length;
    const totalPathwayItems = pathway.length;

    const totalMatches = matchedTags + matchedPlotBlocks;
    const percentage =
      totalPathwayItems > 0 ? (totalMatches / totalPathwayItems) * 100 : 0;

    return {
      score: percentage,
      details: {
        matchedTags,
        matchedPlotBlocks,
        totalPathwayItems,
        percentage,
      },
    };
  }

  /**
   * Calculate category-level matches
   */
  private calculateCategoryMatches(
    pathway: PathwayItem[],
    allTags: Tag[],
    allPlotBlocks: PlotBlock[],
    storyTags: string[],
    storyPlotBlocks: string[]
  ): {
    score: number;
    details: DetailedScore['breakdown']['categoryMatches']['details'];
  } {
    let tagCategoryMatches = 0;
    let plotBlockCategoryMatches = 0;
    let totalComparisons = 0;

    // Get pathway tags and their categories
    const pathwayTagObjects = pathway
      .filter(p => p.type === 'tag')
      .map(p => allTags.find(t => t.id === p.id))
      .filter(Boolean) as Tag[];

    // Get story tags and their categories
    const storyTagObjects = storyTags
      .map(id => allTags.find(t => t.id === id))
      .filter(Boolean) as Tag[];

    // Compare tag categories
    for (const pathwayTag of pathwayTagObjects) {
      for (const storyTag of storyTagObjects) {
        totalComparisons++;
        if (pathwayTag.category === storyTag.category) {
          tagCategoryMatches++;
        }
      }
    }

    // Get pathway plot blocks and their categories
    const pathwayPlotBlockObjects = pathway
      .filter(p => p.type === 'plot_block')
      .map(p => allPlotBlocks.find(pb => pb.id === p.id))
      .filter(Boolean) as PlotBlock[];

    // Get story plot blocks and their categories
    const storyPlotBlockObjects = storyPlotBlocks
      .map(id => allPlotBlocks.find(pb => pb.id === id))
      .filter(Boolean) as PlotBlock[];

    // Compare plot block categories
    for (const pathwayPlotBlock of pathwayPlotBlockObjects) {
      for (const storyPlotBlock of storyPlotBlockObjects) {
        totalComparisons++;
        if (pathwayPlotBlock.category === storyPlotBlock.category) {
          plotBlockCategoryMatches++;
        }
      }
    }

    const totalCategoryMatches = tagCategoryMatches + plotBlockCategoryMatches;
    const percentage =
      totalComparisons > 0
        ? (totalCategoryMatches / totalComparisons) * 100
        : 0;

    return {
      score: percentage,
      details: {
        tagCategoryMatches,
        plotBlockCategoryMatches,
        totalComparisons,
        percentage,
      },
    };
  }

  /**
   * Calculate semantic similarity using text analysis
   */
  private calculateSemanticSimilarity(
    story: Story,
    pathway: PathwayItem[],
    allTags: Tag[],
    allPlotBlocks: PlotBlock[]
  ): {
    score: number;
    details: DetailedScore['breakdown']['semanticSimilarity']['details'];
  } {
    // Extract keywords from pathway
    const pathwayKeywords = this.extractPathwayKeywords(
      pathway,
      allTags,
      allPlotBlocks
    );

    // Extract keywords from story
    const titleKeywords = this.extractKeywordsFromText(story.title || '');
    const summaryKeywords = this.extractKeywordsFromText(story.summary || '');
    const storyKeywords = [...titleKeywords, ...summaryKeywords];

    // Find common keywords
    const commonKeywords = pathwayKeywords.filter(keyword =>
      storyKeywords.some(storyKeyword =>
        this.areKeywordsSimilar(keyword, storyKeyword)
      )
    );

    // Calculate overlap percentage
    const keywordOverlap =
      pathwayKeywords.length > 0
        ? (commonKeywords.length / pathwayKeywords.length) * 100
        : 0;

    // Calculate title similarity (simplified)
    const titleSimilarity = this.calculateTextSimilarity(
      pathwayKeywords.join(' '),
      story.title || ''
    );

    // Calculate summary similarity (simplified)
    const summarySimilarity = this.calculateTextSimilarity(
      pathwayKeywords.join(' '),
      story.summary || ''
    );

    // Combined semantic score
    const semanticScore =
      keywordOverlap * 0.6 + titleSimilarity * 0.25 + summarySimilarity * 0.15;

    return {
      score: Math.min(semanticScore, 100),
      details: {
        commonKeywords,
        keywordOverlap,
        titleSimilarity,
        summarySimilarity,
      },
    };
  }

  /**
   * Calculate popularity score with fandom normalization
   */
  private calculatePopularityScore(
    story: Story,
    fandomMetrics?: FandomMetrics
  ): {
    score: number;
    details: DetailedScore['breakdown']['popularity']['details'];
  } {
    const kudos = story.kudosCount || 0;
    const hits = story.hitCount || 0;
    const bookmarks = story.bookmarkCount || 0;

    let kudosScore: number;
    let hitsScore: number;
    let bookmarkScore: number;
    let normalizedAgainstFandom = false;

    if (fandomMetrics) {
      // Normalize against fandom averages
      kudosScore =
        fandomMetrics.averageKudos > 0
          ? Math.min((kudos / fandomMetrics.averageKudos) * 50, 100)
          : 0;
      hitsScore =
        fandomMetrics.averageHits > 0
          ? Math.min((hits / fandomMetrics.averageHits) * 50, 100)
          : 0;
      bookmarkScore =
        fandomMetrics.averageBookmarks > 0
          ? Math.min((bookmarks / fandomMetrics.averageBookmarks) * 50, 100)
          : 0;
      normalizedAgainstFandom = true;
    } else {
      // Use absolute thresholds
      const maxKudos = 10000;
      const maxHits = 100000;
      const maxBookmarks = 5000;

      kudosScore = Math.min((kudos / maxKudos) * 100, 100);
      hitsScore = Math.min((hits / maxHits) * 100, 100);
      bookmarkScore = Math.min((bookmarks / maxBookmarks) * 100, 100);
    }

    // Weighted combination: kudos 40%, hits 35%, bookmarks 25%
    const combinedScore =
      kudosScore * 0.4 + hitsScore * 0.35 + bookmarkScore * 0.25;

    return {
      score: combinedScore,
      details: {
        kudosScore,
        hitsScore,
        bookmarkScore,
        normalizedAgainstFandom,
      },
    };
  }

  /**
   * Calculate recency score based on last update
   */
  private calculateRecencyScore(story: Story): {
    score: number;
    details: DetailedScore['breakdown']['recency']['details'];
  } {
    if (!story.updatedAt) {
      return {
        score: 0,
        details: {
          daysSinceUpdate: Infinity,
          recencyCategory: 'old',
        },
      };
    }

    const now = Date.now();
    const updatedTime = new Date(story.updatedAt).getTime();
    const daysSinceUpdate = (now - updatedTime) / (1000 * 60 * 60 * 24);

    let score: number;
    let recencyCategory: DetailedScore['breakdown']['recency']['details']['recencyCategory'];

    if (daysSinceUpdate <= 7) {
      score = 100;
      recencyCategory = 'very_recent';
    } else if (daysSinceUpdate <= 30) {
      score = 85;
      recencyCategory = 'recent';
    } else if (daysSinceUpdate <= 365) {
      score = Math.max(0, 85 - ((daysSinceUpdate - 30) / 335) * 85);
      recencyCategory = 'moderate';
    } else {
      score = 0;
      recencyCategory = 'old';
    }

    return {
      score,
      details: {
        daysSinceUpdate: Math.floor(daysSinceUpdate),
        recencyCategory,
      },
    };
  }

  /**
   * Calculate user alignment score based on preferences
   */
  private calculateUserAlignmentScore(
    story: Story,
    storyTags: string[],
    preferences?: UserScoringPreferences
  ): {
    score: number;
    details: DetailedScore['breakdown']['userAlignment']['details'];
  } {
    if (!preferences) {
      return {
        score: 50, // Neutral score
        details: {
          ratingMatch: false,
          lengthMatch: false,
          statusMatch: false,
          hasBoostTags: false,
          hasExcludedTags: false,
        },
      };
    }

    let score = 0;
    let factors = 0;

    // Rating preference
    const ratingMatch =
      preferences.preferredRatings.length === 0 ||
      preferences.preferredRatings.includes(story.rating || 'unrated');
    if (preferences.preferredRatings.length > 0) {
      factors++;
      if (ratingMatch) score += 20;
    }

    // Length preference
    const lengthCategory = this.categorizeLengthByWordCount(
      story.wordCount || 0
    );
    const lengthMatch =
      preferences.preferredLengths.length === 0 ||
      preferences.preferredLengths.includes(lengthCategory);
    if (preferences.preferredLengths.length > 0) {
      factors++;
      if (lengthMatch) score += 20;
    }

    // Status preference
    const statusMatch =
      preferences.preferredStatuses.length === 0 ||
      preferences.preferredStatuses.includes(story.status || 'unknown');
    if (preferences.preferredStatuses.length > 0) {
      factors++;
      if (statusMatch) score += 20;
    }

    // Boost tags
    const hasBoostTags =
      preferences.boostTags.length > 0 &&
      preferences.boostTags.some(tagId => storyTags.includes(tagId));
    if (preferences.boostTags.length > 0) {
      factors++;
      if (hasBoostTags) score += 30; // Bonus for boost tags
    }

    // Excluded tags (penalty)
    const hasExcludedTags =
      preferences.excludedTags.length > 0 &&
      preferences.excludedTags.some(tagId => storyTags.includes(tagId));
    if (hasExcludedTags) {
      score = Math.max(0, score - 40); // Heavy penalty for excluded tags
    }

    const finalScore = factors > 0 ? (score / factors) * 5 : 50; // Scale to 0-100

    return {
      score: Math.max(0, Math.min(100, finalScore)),
      details: {
        ratingMatch,
        lengthMatch,
        statusMatch,
        hasBoostTags,
        hasExcludedTags,
      },
    };
  }

  /**
   * Calculate confidence in the score
   */
  private calculateConfidence(
    story: Story,
    exactMatches: any,
    categoryMatches: any,
    semanticSimilarity: any,
    context: ScoringContext
  ): number {
    let confidence = 100;

    // Reduce confidence for incomplete data
    if (!story.title) confidence -= 10;
    if (!story.summary) confidence -= 15;
    if (!story.updatedAt) confidence -= 10;
    if ((story.kudosCount || 0) === 0 && (story.hitCount || 0) === 0)
      confidence -= 15;

    // Reduce confidence for low pathway matches
    if (exactMatches.details.percentage < 20) confidence -= 20;
    if (categoryMatches.details.percentage < 30) confidence -= 10;

    // Reduce confidence for insufficient semantic data
    if (semanticSimilarity.details.commonKeywords.length === 0)
      confidence -= 10;

    return Math.max(0, confidence);
  }

  /**
   * Generate human-readable score explanations
   */
  private generateScoreReasons(
    weightedScores: Record<string, number>,
    exactMatches: any,
    categoryMatches: any,
    semanticSimilarity: any,
    popularity: any,
    recency: any,
    userAlignment: any
  ): string[] {
    const reasons: string[] = [];

    // Exact matches
    if (weightedScores.exactMatches > 15) {
      reasons.push(
        `Strong pathway match (${
          exactMatches.details.matchedTags +
          exactMatches.details.matchedPlotBlocks
        }/${exactMatches.details.totalPathwayItems} elements)`
      );
    } else if (weightedScores.exactMatches > 8) {
      reasons.push(
        `Moderate pathway match (${
          exactMatches.details.matchedTags +
          exactMatches.details.matchedPlotBlocks
        }/${exactMatches.details.totalPathwayItems} elements)`
      );
    }

    // Category matches
    if (weightedScores.categoryMatches > 10) {
      reasons.push('Similar themes and elements');
    }

    // Popularity
    if (weightedScores.popularity > 7) {
      reasons.push('Popular and well-received story');
    }

    // Recency
    if (weightedScores.recency > 5) {
      reasons.push(
        `Recently updated (${recency.details.daysSinceUpdate} days ago)`
      );
    }

    // User alignment
    if (weightedScores.userAlignment > 5) {
      reasons.push('Matches your preferences');
    } else if (userAlignment.details.hasExcludedTags) {
      reasons.push('Contains tags you typically avoid');
    }

    return reasons;
  }

  // Helper methods

  private async getStoryTags(storyId: string): Promise<string[]> {
    // In practice, query the database for story tags
    return [];
  }

  private async getStoryPlotBlocks(storyId: string): Promise<string[]> {
    // In practice, query the database for story plot blocks
    return [];
  }

  private extractPathwayKeywords(
    pathway: PathwayItem[],
    allTags: Tag[],
    allPlotBlocks: PlotBlock[]
  ): string[] {
    const keywords: string[] = [];

    pathway.forEach(item => {
      if (item.type === 'tag') {
        const tag = allTags.find(t => t.id === item.id);
        if (tag) {
          keywords.push(tag.name);
          keywords.push(...this.extractKeywordsFromText(tag.name));
        }
      } else if (item.type === 'plot_block') {
        const plotBlock = allPlotBlocks.find(pb => pb.id === item.id);
        if (plotBlock) {
          keywords.push(plotBlock.name);
          keywords.push(...this.extractKeywordsFromText(plotBlock.name));
        }
      }
    });

    return [...new Set(keywords.filter(k => k.length > 2))];
  }

  private extractKeywordsFromText(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[\/\-\s\(\)\[\]]+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word));
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
    ]);
    return stopWords.has(word.toLowerCase());
  }

  private areKeywordsSimilar(keyword1: string, keyword2: string): boolean {
    const k1 = keyword1.toLowerCase();
    const k2 = keyword2.toLowerCase();

    // Exact match
    if (k1 === k2) return true;

    // Substring match (for plurals, variations)
    if (k1.includes(k2) || k2.includes(k1)) return true;

    // Could add more sophisticated similarity here (edit distance, etc.)
    return false;
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    // Simplified text similarity - in practice would use proper NLP
    const words1 = this.extractKeywordsFromText(text1);
    const words2 = this.extractKeywordsFromText(text2);

    if (words1.length === 0 || words2.length === 0) return 0;

    const commonWords = words1.filter(word =>
      words2.some(w2 => this.areKeywordsSimilar(word, w2))
    );

    return (commonWords.length / Math.max(words1.length, words2.length)) * 100;
  }

  private categorizeLengthByWordCount(wordCount: number): string {
    if (wordCount < 1000) return 'drabble';
    if (wordCount < 5000) return 'oneshot';
    if (wordCount < 20000) return 'short';
    if (wordCount < 50000) return 'medium';
    if (wordCount < 100000) return 'long';
    return 'epic';
  }

  private generateCacheKey(storyId: string, context: ScoringContext): string {
    const pathwayHash = context.pathway
      .map(p => `${p.type}:${p.id}`)
      .sort()
      .join(',');
    const preferencesHash = context.userPreferences
      ? JSON.stringify(context.userPreferences).substring(0, 50)
      : 'none';
    return `${storyId}:${pathwayHash}:${preferencesHash}`;
  }

  private getFromCache(key: string): DetailedScore | null {
    return this.scoreCache.get(key) || null;
  }

  private setCache(key: string, score: DetailedScore): void {
    if (this.scoreCache.size >= this.maxCacheSize) {
      const firstKey = this.scoreCache.keys().next().value;
      this.scoreCache.delete(firstKey);
    }

    this.scoreCache.set(key, score);
  }

  /**
   * Clear the scoring cache
   */
  clearCache(): void {
    this.scoreCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.scoreCache.size,
      maxSize: this.maxCacheSize,
      hitRate: 0, // Would track this in practice
    };
  }
}

// Export singleton instance
export const relevanceScoreService = new RelevanceScoreService();
