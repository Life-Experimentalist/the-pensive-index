/**
 * Tag Suggestion Service
 *
 * This service provides intelligent tag suggestions for story submissions
 * using taxonomy-based suggestions, content analysis, and fandom-specific
 * validation with machine learning enhancements.
 */

import { getDatabase } from '../database';
import { storySubmissions } from '../database/schemas/submissions';
import { eq, like, sql, and, inArray } from 'drizzle-orm';

export interface TagSuggestion {
  tag: string;
  confidence: number; // 0-1 scale
  source: 'taxonomy' | 'content' | 'similarity' | 'popularity' | 'manual';
  reasoning: string;
  category?: TagCategory;
}

export interface TagSuggestionResult {
  suggestions: TagSuggestion[];
  automaticTags: string[]; // High confidence tags (>0.9)
  manualReviewTags: string[]; // Medium confidence tags (0.5-0.9)
  rejectedTags: string[]; // Low confidence tags (<0.5)
  totalAnalyzed: number;
  processingTimeMs: number;
}

export interface TagAnalysisContext {
  fandomId: string;
  title: string;
  summary?: string;
  content?: string;
  existingTags?: string[];
  authorHints?: string[];
  similarStoryTags?: string[];
}

export interface TagTaxonomy {
  fandomId: string;
  categories: TagCategoryMap;
  popularTags: Map<string, number>; // tag -> usage count
  tagRelationships: Map<string, string[]>; // tag -> related tags
  prohibitedTags: Set<string>;
}

export interface TagCategoryMap {
  characters: Set<string>;
  relationships: Set<string>;
  genres: Set<string>;
  tropes: Set<string>;
  warnings: Set<string>;
  additional: Set<string>;
}

export enum TagCategory {
  CHARACTER = 'character',
  RELATIONSHIP = 'relationship',
  GENRE = 'genre',
  TROPE = 'trope',
  WARNING = 'warning',
  ADDITIONAL = 'additional',
}

export interface TagSuggestionConfig {
  // Confidence thresholds
  automaticTagThreshold: number; // 0.9 default
  manualReviewThreshold: number; // 0.5 default
  rejectionThreshold: number; // 0.3 default

  // Analysis settings
  maxSuggestions: number; // 20 default
  enableContentAnalysis: boolean; // true default
  enableSimilarityMatching: boolean; // true default
  enablePopularityBoost: boolean; // true default

  // Content analysis weights
  titleWeight: number; // 0.4 default
  summaryWeight: number; // 0.35 default
  contentWeight: number; // 0.25 default

  // Performance settings
  maxSimilarStories: number; // 50 default
  maxContentAnalysisLength: number; // 10000 default
}

export class TagSuggester {
  private config: TagSuggestionConfig;
  private taxonomies: Map<string, TagTaxonomy> = new Map();
  private contentPatterns: Map<string, RegExp[]> = new Map();

  constructor(config: Partial<TagSuggestionConfig> = {}) {
    this.config = {
      automaticTagThreshold: 0.9,
      manualReviewThreshold: 0.5,
      rejectionThreshold: 0.3,
      maxSuggestions: 20,
      enableContentAnalysis: true,
      enableSimilarityMatching: true,
      enablePopularityBoost: true,
      titleWeight: 0.4,
      summaryWeight: 0.35,
      contentWeight: 0.25,
      maxSimilarStories: 50,
      maxContentAnalysisLength: 10000,
      ...config,
    };

    this.initializeContentPatterns();
  }

  /**
   * Main entry point for tag suggestions
   */
  async suggestTags(context: TagAnalysisContext): Promise<TagSuggestionResult> {
    const startTime = Date.now();

    try {
      // Load or build taxonomy for this fandom
      const taxonomy = await this.getTaxonomy(context.fandomId);

      // Collect suggestions from different sources
      const allSuggestions: TagSuggestion[] = [];

      // 1. Taxonomy-based suggestions
      const taxonomySuggestions = await this.getTaxonomySuggestions(
        context,
        taxonomy
      );
      allSuggestions.push(...taxonomySuggestions);

      // 2. Content analysis suggestions
      if (this.config.enableContentAnalysis) {
        const contentSuggestions = await this.getContentAnalysisSuggestions(
          context,
          taxonomy
        );
        allSuggestions.push(...contentSuggestions);
      }

      // 3. Similarity-based suggestions
      if (this.config.enableSimilarityMatching) {
        const similaritySuggestions = await this.getSimilarityBasedSuggestions(
          context
        );
        allSuggestions.push(...similaritySuggestions);
      }

      // 4. Popularity-based suggestions
      if (this.config.enablePopularityBoost) {
        const popularitySuggestions = await this.getPopularityBasedSuggestions(
          context,
          taxonomy
        );
        allSuggestions.push(...popularitySuggestions);
      }

      // Deduplicate and merge suggestions
      const mergedSuggestions = this.mergeSuggestions(allSuggestions);

      // Filter by existing tags
      const filteredSuggestions = this.filterExistingTags(
        mergedSuggestions,
        context.existingTags || []
      );

      // Sort by confidence and limit results
      const finalSuggestions = filteredSuggestions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, this.config.maxSuggestions);

      // Categorize suggestions by confidence
      const result = this.categorizeSuggestions(finalSuggestions);

      result.processingTimeMs = Date.now() - startTime;
      result.totalAnalyzed = allSuggestions.length;

      return result;
    } catch (error) {
      console.error('Tag suggestion failed:', error);
      return this.getEmptyResult(Date.now() - startTime);
    }
  }

  /**
   * Get taxonomy-based suggestions
   */
  private async getTaxonomySuggestions(
    context: TagAnalysisContext,
    taxonomy: TagTaxonomy
  ): Promise<TagSuggestion[]> {
    const suggestions: TagSuggestion[] = [];
    const searchText = `${context.title} ${
      context.summary || ''
    }`.toLowerCase();

    // Check each category for matches
    for (const [categoryName, tags] of Object.entries(taxonomy.categories)) {
      const category = categoryName as keyof TagCategoryMap;

      for (const tag of tags) {
        const tagLower = tag.toLowerCase();

        // Check for exact matches or partial matches
        if (searchText.includes(tagLower)) {
          const confidence = this.calculateTaxonomyConfidence(
            tag,
            searchText,
            category
          );

          suggestions.push({
            tag,
            confidence,
            source: 'taxonomy',
            reasoning: `Found in ${category} taxonomy`,
            category: this.mapToTagCategory(category),
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Get content analysis suggestions
   */
  private async getContentAnalysisSuggestions(
    context: TagAnalysisContext,
    taxonomy: TagTaxonomy
  ): Promise<TagSuggestion[]> {
    const suggestions: TagSuggestion[] = [];

    // Analyze title
    const titleSuggestions = this.analyzeTextForTags(
      context.title,
      taxonomy,
      this.config.titleWeight
    );
    suggestions.push(...titleSuggestions);

    // Analyze summary
    if (context.summary) {
      const summarySuggestions = this.analyzeTextForTags(
        context.summary,
        taxonomy,
        this.config.summaryWeight
      );
      suggestions.push(...summarySuggestions);
    }

    // Analyze content (if available and not too long)
    if (
      context.content &&
      context.content.length <= this.config.maxContentAnalysisLength
    ) {
      const contentSuggestions = this.analyzeTextForTags(
        context.content,
        taxonomy,
        this.config.contentWeight
      );
      suggestions.push(...contentSuggestions);
    }

    return suggestions;
  }

  /**
   * Get similarity-based suggestions from similar stories
   */
  private async getSimilarityBasedSuggestions(
    context: TagAnalysisContext
  ): Promise<TagSuggestion[]> {
    const db = await getDatabase();

    // Find similar stories by title/summary similarity
    const similarStories = await db
      .select()
      .from(storySubmissions)
      .where(
        and(
          eq(storySubmissions.fandomId, context.fandomId),
          sql`${storySubmissions.tags} IS NOT NULL`
        )
      )
      .limit(this.config.maxSimilarStories);

    const suggestions: TagSuggestion[] = [];
    const tagCounts = new Map<string, number>();

    for (const story of similarStories) {
      const similarity = this.calculateStorySimilarity(context, story);

      if (similarity > 0.3) {
        // Only consider reasonably similar stories
        const storyTags = story.tags || [];

        for (const tag of storyTags) {
          const currentCount = tagCounts.get(tag) || 0;
          tagCounts.set(tag, currentCount + similarity);
        }
      }
    }

    // Convert counts to suggestions
    tagCounts.forEach((score, tag) => {
      const confidence = Math.min(0.8, score / 3); // Max confidence 0.8 for similarity

      if (confidence >= this.config.rejectionThreshold) {
        suggestions.push({
          tag,
          confidence,
          source: 'similarity',
          reasoning: `Found in ${Math.round(score)} similar stories`,
        });
      }
    });

    return suggestions;
  }

  /**
   * Get popularity-based suggestions
   */
  private async getPopularityBasedSuggestions(
    context: TagAnalysisContext,
    taxonomy: TagTaxonomy
  ): Promise<TagSuggestion[]> {
    const suggestions: TagSuggestion[] = [];

    // Get top popular tags for this fandom
    const topTags = Array.from(taxonomy.popularTags.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10); // Top 10 most popular

    for (const [tag, count] of topTags) {
      // Only suggest if there's some relevance to the story
      const relevance = this.calculatePopularityRelevance(tag, context);

      if (relevance > 0.2) {
        const popularity = Math.min(1, count / 100); // Normalize popularity
        const confidence = relevance * popularity * 0.6; // Max 0.6 confidence for popularity

        suggestions.push({
          tag,
          confidence,
          source: 'popularity',
          reasoning: `Popular tag (${count} uses) with contextual relevance`,
        });
      }
    }

    return suggestions;
  }

  /**
   * Analyze text for potential tags using patterns and keywords
   */
  private analyzeTextForTags(
    text: string,
    taxonomy: TagTaxonomy,
    weight: number
  ): TagSuggestion[] {
    const suggestions: TagSuggestion[] = [];
    const lowerText = text.toLowerCase();

    // Check content patterns
    const patterns = this.contentPatterns.get(taxonomy.fandomId) || [];

    for (const pattern of patterns) {
      const matches = lowerText.match(pattern);
      if (matches) {
        // Extract potential tags from pattern matches
        // This is a simplified implementation
        const confidence = weight * 0.7; // Base confidence from pattern matching

        suggestions.push({
          tag: matches[0], // Simplified - would need better extraction
          confidence,
          source: 'content',
          reasoning: 'Content pattern match',
        });
      }
    }

    return suggestions;
  }

  /**
   * Calculate taxonomy-based confidence
   */
  private calculateTaxonomyConfidence(
    tag: string,
    searchText: string,
    category: string
  ): number {
    const tagLower = tag.toLowerCase();

    // Exact word match gets higher confidence
    const words = searchText.split(/\s+/);
    const exactMatch = words.some(word => word === tagLower);

    if (exactMatch) {
      return 0.95;
    }

    // Partial match confidence based on category importance
    const categoryWeights = {
      characters: 0.8,
      relationships: 0.85,
      genres: 0.7,
      tropes: 0.75,
      warnings: 0.9,
      additional: 0.6,
    };

    const baseConfidence =
      categoryWeights[category as keyof typeof categoryWeights] || 0.6;

    // Adjust for match quality
    const matchQuality = tagLower.length / searchText.length;
    return Math.min(0.9, baseConfidence * (0.5 + matchQuality));
  }

  /**
   * Calculate story similarity for similarity-based suggestions
   */
  private calculateStorySimilarity(
    context: TagAnalysisContext,
    story: any
  ): number {
    let similarity = 0;
    let factors = 0;

    // Title similarity
    if (story.storyTitle) {
      similarity += this.calculateTextSimilarity(
        context.title,
        story.storyTitle
      );
      factors++;
    }

    // Summary similarity
    if (context.summary && story.summary) {
      similarity += this.calculateTextSimilarity(
        context.summary,
        story.summary
      );
      factors++;
    }

    return factors > 0 ? similarity / factors : 0;
  }

  /**
   * Simple text similarity calculation
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set();
    words1.forEach(word => {
      if (words2.has(word)) {
        intersection.add(word);
      }
    });

    const union = new Set();
    words1.forEach(word => union.add(word));
    words2.forEach(word => union.add(word));

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Calculate popularity-based relevance
   */
  private calculatePopularityRelevance(
    tag: string,
    context: TagAnalysisContext
  ): number {
    const searchText = `${context.title} ${
      context.summary || ''
    }`.toLowerCase();
    const tagLower = tag.toLowerCase();

    // Check if tag appears in context
    if (searchText.includes(tagLower)) {
      return 0.8;
    }

    // Check for related words (simplified)
    const tagWords = tagLower.split(/[-\s]+/);
    const matches = tagWords.filter(word => searchText.includes(word));

    return (matches.length / tagWords.length) * 0.5;
  }

  /**
   * Merge duplicate suggestions and combine confidence scores
   */
  private mergeSuggestions(suggestions: TagSuggestion[]): TagSuggestion[] {
    const merged = new Map<string, TagSuggestion>();

    for (const suggestion of suggestions) {
      const existing = merged.get(suggestion.tag);

      if (existing) {
        // Combine confidences (weighted average)
        const totalWeight = 1 + 1; // Both suggestions have weight 1
        const combinedConfidence =
          (existing.confidence + suggestion.confidence) / totalWeight;

        existing.confidence = Math.min(0.95, combinedConfidence * 1.2); // Boost for multiple sources
        existing.reasoning += `, ${suggestion.reasoning}`;
      } else {
        merged.set(suggestion.tag, { ...suggestion });
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Filter out tags that already exist
   */
  private filterExistingTags(
    suggestions: TagSuggestion[],
    existingTags: string[]
  ): TagSuggestion[] {
    const existingSet = new Set(existingTags.map(tag => tag.toLowerCase()));

    return suggestions.filter(
      suggestion => !existingSet.has(suggestion.tag.toLowerCase())
    );
  }

  /**
   * Categorize suggestions by confidence level
   */
  private categorizeSuggestions(
    suggestions: TagSuggestion[]
  ): TagSuggestionResult {
    const automaticTags: string[] = [];
    const manualReviewTags: string[] = [];
    const rejectedTags: string[] = [];

    for (const suggestion of suggestions) {
      if (suggestion.confidence >= this.config.automaticTagThreshold) {
        automaticTags.push(suggestion.tag);
      } else if (suggestion.confidence >= this.config.manualReviewThreshold) {
        manualReviewTags.push(suggestion.tag);
      } else if (suggestion.confidence >= this.config.rejectionThreshold) {
        rejectedTags.push(suggestion.tag);
      }
    }

    return {
      suggestions,
      automaticTags,
      manualReviewTags,
      rejectedTags,
      totalAnalyzed: 0, // Will be set by caller
      processingTimeMs: 0, // Will be set by caller
    };
  }

  /**
   * Get or build taxonomy for fandom
   */
  private async getTaxonomy(fandomId: string): Promise<TagTaxonomy> {
    // Check cache first
    const cached = this.taxonomies.get(fandomId);
    if (cached) {
      return cached;
    }

    // Build taxonomy from existing submissions
    const taxonomy = await this.buildTaxonomy(fandomId);
    this.taxonomies.set(fandomId, taxonomy);

    return taxonomy;
  }

  /**
   * Build taxonomy from existing fandom submissions
   */
  private async buildTaxonomy(fandomId: string): Promise<TagTaxonomy> {
    const db = await getDatabase();

    const submissions = await db
      .select()
      .from(storySubmissions)
      .where(
        and(
          eq(storySubmissions.fandomId, fandomId),
          sql`${storySubmissions.tags} IS NOT NULL`
        )
      );

    const categories: TagCategoryMap = {
      characters: new Set(),
      relationships: new Set(),
      genres: new Set(),
      tropes: new Set(),
      warnings: new Set(),
      additional: new Set(),
    };

    const popularTags = new Map<string, number>();
    const tagRelationships = new Map<string, string[]>();

    // Analyze existing tags
    for (const submission of submissions) {
      const tags = submission.tags || [];

      for (const tag of tags) {
        // Count popularity
        popularTags.set(tag, (popularTags.get(tag) || 0) + 1);

        // Categorize tag (simplified categorization)
        const category = this.categorizeTag(tag);
        categories[category].add(tag);

        // Build relationships (tags that appear together)
        for (const otherTag of tags) {
          if (tag !== otherTag) {
            if (!tagRelationships.has(tag)) {
              tagRelationships.set(tag, []);
            }
            const relationships = tagRelationships.get(tag);
            if (relationships) {
              relationships.push(otherTag);
            }
          }
        }
      }
    }

    return {
      fandomId,
      categories,
      popularTags,
      tagRelationships,
      prohibitedTags: new Set(), // Could be configured per fandom
    };
  }

  /**
   * Categorize a tag into its type
   */
  private categorizeTag(tag: string): keyof TagCategoryMap {
    const tagLower = tag.toLowerCase();

    // Simple heuristics - in production, use better classification
    if (
      tagLower.includes('/') ||
      tagLower.includes('x ') ||
      tagLower.includes(' x ')
    ) {
      return 'relationships';
    }

    if (
      ['angst', 'fluff', 'hurt/comfort', 'romance', 'drama', 'humor'].some(
        genre => tagLower.includes(genre)
      )
    ) {
      return 'genres';
    }

    if (
      ['violence', 'death', 'mature', 'explicit'].some(warning =>
        tagLower.includes(warning)
      )
    ) {
      return 'warnings';
    }

    // Default to characters for names or additional for others
    return /^[A-Z]/.test(tag) ? 'characters' : 'additional';
  }

  /**
   * Map category string to enum
   */
  private mapToTagCategory(category: string): TagCategory {
    const mapping: Record<string, TagCategory> = {
      characters: TagCategory.CHARACTER,
      relationships: TagCategory.RELATIONSHIP,
      genres: TagCategory.GENRE,
      tropes: TagCategory.TROPE,
      warnings: TagCategory.WARNING,
      additional: TagCategory.ADDITIONAL,
    };

    return mapping[category] || TagCategory.ADDITIONAL;
  }

  /**
   * Initialize content patterns for tag detection
   */
  private initializeContentPatterns(): void {
    // Add common patterns for different fandoms
    // This is simplified - in production, load from configuration

    const commonPatterns = [
      /time[- ]travel/gi,
      /alternate[- ]universe/gi,
      /soulmate/gi,
      /enemies[- ]to[- ]lovers/gi,
      /hurt[\/\-\s]comfort/gi,
      /slow[- ]burn/gi,
    ];

    // Apply common patterns to all fandoms for now
    this.contentPatterns.set('default', commonPatterns);
  }

  /**
   * Get empty result for error cases
   */
  private getEmptyResult(processingTimeMs: number): TagSuggestionResult {
    return {
      suggestions: [],
      automaticTags: [],
      manualReviewTags: [],
      rejectedTags: [],
      totalAnalyzed: 0,
      processingTimeMs,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<TagSuggestionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Clear taxonomy cache
   */
  clearTaxonomyCache(): void {
    this.taxonomies.clear();
  }

  /**
   * Get configuration
   */
  getConfig(): TagSuggestionConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const tagSuggester = new TagSuggester();
