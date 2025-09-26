import { eq, sql, and, or, like, desc, asc } from 'drizzle-orm';
import { getDatabase } from '../config';
import {
  stories,
  storyTags,
  storyPlotBlocks,
  tags,
  plotBlocks,
} from '../schema';

export interface StorySearchFilters {
  tags?: string[];
  plotBlocks?: string[];
  minWordCount?: number;
  maxWordCount?: number;
  status?: string;
  language?: string;
  rating?: string;
  requireAll?: boolean;
  excludeTags?: string[];
}

export interface StorySearchResult {
  id: number;
  title: string;
  summary: string;
  author: string;
  wordCount: number;
  status: string;
  url: string;
  rating?: string;
  language: string;
  relevanceScore: number;
  matchedTags: string[];
  matchedPlotBlocks: string[];
  lastUpdated: Date;
}

export interface StoryMetadata {
  id: number;
  title: string;
  author: string;
  summary: string;
  wordCount: number;
  chapterCount: number;
  status: string;
  url: string;
  sourceType: string;
  sourceId: string;
  rating?: string;
  language: string;
  publishedAt?: Date;
  updatedAt?: Date;
  tags: Array<{ id: number; name: string; category?: string }>;
  plotBlocks: Array<{ id: number; name: string; description?: string }>;
}

export class StoryModel {
  /**
   * Search stories with relevance scoring
   */
  static async search(
    fandomId: number,
    filters: StorySearchFilters,
    limit: number = 20,
    offset: number = 0
  ): Promise<StorySearchResult[]> {
    const db = getDatabase();

    // Build base query
    let query = db
      .select({
        id: stories.id,
        title: stories.title,
        summary: stories.summary,
        author: stories.author,
        wordCount: stories.word_count,
        status: stories.status,
        url: stories.url,
        rating: stories.rating,
        language: stories.language,
        updatedAt: stories.updated_at,
      })
      .from(stories)
      .where(and(eq(stories.fandom_id, fandomId), eq(stories.is_active, true)));

    // Apply filters
    const conditions = [
      eq(stories.fandom_id, fandomId),
      eq(stories.is_active, true),
    ];

    if (filters.minWordCount) {
      conditions.push(sql`${stories.word_count} >= ${filters.minWordCount}`);
    }

    if (filters.maxWordCount) {
      conditions.push(sql`${stories.word_count} <= ${filters.maxWordCount}`);
    }

    if (filters.status) {
      conditions.push(eq(stories.status, filters.status));
    }

    if (filters.language) {
      conditions.push(eq(stories.language, filters.language));
    }

    if (filters.rating) {
      conditions.push(eq(stories.rating, filters.rating));
    }

    const baseResults = await db
      .select({
        id: stories.id,
        title: stories.title,
        summary: stories.summary,
        author: stories.author,
        wordCount: stories.word_count,
        status: stories.status,
        url: stories.url,
        rating: stories.rating,
        language: stories.language,
        updatedAt: stories.updated_at,
      })
      .from(stories)
      .where(and(...conditions))
      .orderBy(desc(stories.updated_at))
      .limit(limit)
      .offset(offset);

    // Calculate relevance scores and get matched elements
    const results: StorySearchResult[] = [];

    for (const story of baseResults) {
      const relevanceData = await this.calculateRelevance(
        story.id,
        filters.tags || [],
        filters.plotBlocks || []
      );

      results.push({
        ...story,
        wordCount: story.wordCount || 0,
        relevanceScore: relevanceData.score,
        matchedTags: relevanceData.matchedTags,
        matchedPlotBlocks: relevanceData.matchedPlotBlocks,
        lastUpdated: story.updatedAt || new Date(),
      });
    }

    // Sort by relevance if search terms provided
    if (filters.tags?.length || filters.plotBlocks?.length) {
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    return results;
  }

  /**
   * Get full story metadata with all relationships
   */
  static async getById(storyId: number): Promise<StoryMetadata | null> {
    const db = getDatabase();

    const story = await db
      .select()
      .from(stories)
      .where(and(eq(stories.id, storyId), eq(stories.is_active, true)))
      .limit(1);

    if (story.length === 0) {
      return null;
    }

    const storyData = story[0];

    // Get associated tags
    const storyTagsData = await db
      .select({
        id: tags.id,
        name: tags.name,
        category: sql<string>`COALESCE(${tags.category}, '')`,
      })
      .from(storyTags)
      .innerJoin(tags, eq(storyTags.tag_id, tags.id))
      .where(eq(storyTags.story_id, storyId));

    // Get associated plot blocks
    const storyPlotsData = await db
      .select({
        id: plotBlocks.id,
        name: plotBlocks.name,
        description: plotBlocks.description,
      })
      .from(storyPlotBlocks)
      .innerJoin(plotBlocks, eq(storyPlotBlocks.plot_block_id, plotBlocks.id))
      .where(eq(storyPlotBlocks.story_id, storyId));

    return {
      id: storyData.id,
      title: storyData.title,
      author: storyData.author,
      summary: storyData.summary || '',
      wordCount: storyData.word_count || 0,
      chapterCount: storyData.chapter_count || 1,
      status: storyData.status,
      url: storyData.url,
      sourceType: storyData.source_type,
      sourceId: storyData.source_id,
      rating: storyData.rating || undefined,
      language: storyData.language,
      publishedAt: storyData.published_at || undefined,
      updatedAt: storyData.updated_at || undefined,
      tags: storyTagsData.map(tag => ({
        id: tag.id,
        name: tag.name,
        category: tag.category || undefined,
      })),
      plotBlocks: storyPlotsData.map(plot => ({
        id: plot.id,
        name: plot.name,
        description: plot.description || undefined,
      })),
    };
  }

  /**
   * Calculate relevance score for story against search criteria
   */
  private static async calculateRelevance(
    storyId: number,
    searchTags: string[],
    searchPlotBlocks: string[]
  ): Promise<{
    score: number;
    matchedTags: string[];
    matchedPlotBlocks: string[];
  }> {
    const db = getDatabase();

    const matchedTags: string[] = [];
    const matchedPlotBlocks: string[] = [];
    let score = 0;

    // Check tag matches
    if (searchTags.length > 0) {
      const tagMatches = await db
        .select({ name: tags.name })
        .from(storyTags)
        .innerJoin(tags, eq(storyTags.tag_id, tags.id))
        .where(
          and(
            eq(storyTags.story_id, storyId),
            sql`LOWER(${tags.name}) IN (${sql.join(
              searchTags.map(t => t.toLowerCase()),
              sql`, `
            )})`
          )
        );

      matchedTags.push(...tagMatches.map(t => t.name));
      score += tagMatches.length * 10; // 10 points per tag match
    }

    // Check plot block matches
    if (searchPlotBlocks.length > 0) {
      const plotMatches = await db
        .select({ name: plotBlocks.name })
        .from(storyPlotBlocks)
        .innerJoin(plotBlocks, eq(storyPlotBlocks.plot_block_id, plotBlocks.id))
        .where(
          and(
            eq(storyPlotBlocks.story_id, storyId),
            sql`LOWER(${plotBlocks.name}) IN (${sql.join(
              searchPlotBlocks.map(p => p.toLowerCase()),
              sql`, `
            )})`
          )
        );

      matchedPlotBlocks.push(...plotMatches.map(p => p.name));
      score += plotMatches.length * 15; // 15 points per plot block match
    }

    // Bonus for multiple matches
    const totalMatches = matchedTags.length + matchedPlotBlocks.length;
    if (totalMatches > 1) {
      score += totalMatches * 5; // Bonus points for multiple matches
    }

    return {
      score,
      matchedTags,
      matchedPlotBlocks,
    };
  }

  /**
   * Get popular stories by fandom
   */
  static async getPopular(
    fandomId: number,
    limit: number = 10
  ): Promise<StorySearchResult[]> {
    const db = getDatabase();

    const stories = await db
      .select({
        id: stories.id,
        title: stories.title,
        summary: stories.summary,
        author: stories.author,
        wordCount: stories.word_count,
        status: stories.status,
        url: stories.url,
        rating: stories.rating,
        language: stories.language,
        updatedAt: stories.updated_at,
      })
      .from(stories)
      .where(and(eq(stories.fandom_id, fandomId), eq(stories.is_active, true)))
      .orderBy(desc(stories.word_count), desc(stories.updated_at))
      .limit(limit);

    return stories.map(story => ({
      ...story,
      wordCount: story.wordCount || 0,
      relevanceScore: 50, // Base popularity score
      matchedTags: [],
      matchedPlotBlocks: [],
      lastUpdated: story.updatedAt || new Date(),
    }));
  }

  /**
   * Get recently updated stories
   */
  static async getRecent(
    fandomId: number,
    limit: number = 10
  ): Promise<StorySearchResult[]> {
    const db = getDatabase();

    const recentStories = await db
      .select({
        id: stories.id,
        title: stories.title,
        summary: stories.summary,
        author: stories.author,
        wordCount: stories.word_count,
        status: stories.status,
        url: stories.url,
        rating: stories.rating,
        language: stories.language,
        updatedAt: stories.updated_at,
      })
      .from(stories)
      .where(and(eq(stories.fandom_id, fandomId), eq(stories.is_active, true)))
      .orderBy(desc(stories.updated_at))
      .limit(limit);

    return recentStories.map(story => ({
      ...story,
      wordCount: story.wordCount || 0,
      relevanceScore: 30, // Base recency score
      matchedTags: [],
      matchedPlotBlocks: [],
      lastUpdated: story.updatedAt || new Date(),
    }));
  }
}
