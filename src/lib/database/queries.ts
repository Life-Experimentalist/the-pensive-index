import { DatabaseConnection } from '@/lib/database';
import { schema } from '@/lib/database/schema';
import {
  eq,
  like,
  and,
  or,
  inArray,
  desc,
  asc,
  sql,
  isNull,
  count,
} from 'drizzle-orm';
import { Tag, PlotBlock, Story, TagClass } from '@/types';

/**
 * Query builder utilities for The Pensieve Index database operations
 * Provides high-level interfaces for common database queries
 */
export class QueryBuilder {
  constructor(private db: DatabaseConnection) {}

  /**
   * Story queries
   */
  public readonly stories = {
    /**
     * Find stories by fandom with optional filters
     */
    findByFandom: async (
      fandomId: string,
      filters: {
        page?: number;
        limit?: number;
        tags?: string[];
        plotBlocks?: string[];
        rating?: string[];
        status?: string[];
        minWordCount?: number;
        maxWordCount?: number;
      } = {}
    ) => {
      const {
        page = 1,
        limit = 20,
        tags,
        plotBlocks,
        rating,
        status,
        minWordCount,
        maxWordCount,
      } = filters;
      const offset = (page - 1) * limit;

      let query = this.db.select().from(schema.stories);

      // Apply filters
      const conditions = [eq(schema.stories.fandom_id, fandomId)];

      if (rating && rating.length > 0) {
        conditions.push(inArray(schema.stories.rating, rating));
      }

      if (status && status.length > 0) {
        const validStatuses = status.filter(s =>
          ['complete', 'incomplete', 'abandoned', 'hiatus'].includes(s)
        ) as ('complete' | 'incomplete' | 'abandoned' | 'hiatus')[];
        if (validStatuses.length > 0) {
          conditions.push(inArray(schema.stories.status, validStatuses));
        }
      }

      if (minWordCount !== undefined) {
        conditions.push(sql`${schema.stories.word_count} >= ${minWordCount}`);
      }

      if (maxWordCount !== undefined) {
        conditions.push(sql`${schema.stories.word_count} <= ${maxWordCount}`);
      }

      // Complex tag and plot block filtering would require JOINs
      // For now, apply basic filters
      const results = await query
        .where(and(...conditions))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(schema.stories.created_at));

      return results;
    },

    /**
     * Search stories by text
     */
    searchByText: async (
      searchTerm: string,
      fandomId?: string,
      limit: number = 20
    ) => {
      const conditions = [
        or(
          like(schema.stories.title, `%${searchTerm}%`),
          like(schema.stories.description, `%${searchTerm}%`),
          like(schema.stories.author, `%${searchTerm}%`)
        ),
      ];

      if (fandomId) {
        conditions.push(eq(schema.stories.fandom_id, fandomId));
      }

      return await this.db
        .select()
        .from(schema.stories)
        .where(and(...conditions))
        .limit(limit)
        .orderBy(desc(schema.stories.created_at));
    },

    /**
     * Get story with its tags and plot blocks
     */
    findWithRelations: async (storyId: string) => {
      // Main story query
      const story = await this.db.query.stories.findFirst({
        where: eq(schema.stories.id, storyId),
      });

      if (!story) return null;

      // Get story tags
      const storyTags = await this.db
        .select({
          tag: schema.tags,
          relevance_weight: schema.storyTags.relevance_weight,
        })
        .from(schema.storyTags)
        .innerJoin(schema.tags, eq(schema.storyTags.tag_id, schema.tags.id))
        .where(eq(schema.storyTags.story_id, storyId));

      // Get story plot blocks
      const storyPlotBlocks = await this.db
        .select({
          plot_block: schema.plotBlocks,
          relevance_weight: schema.storyPlotBlocks.relevance_weight,
        })
        .from(schema.storyPlotBlocks)
        .innerJoin(
          schema.plotBlocks,
          eq(schema.storyPlotBlocks.plot_block_id, schema.plotBlocks.id)
        )
        .where(eq(schema.storyPlotBlocks.story_id, storyId));

      return {
        story,
        tags: storyTags,
        plot_blocks: storyPlotBlocks,
      };
    },

    /**
     * Count stories by various criteria
     */
    count: async (
      filters: {
        fandomId?: string;
        status?: string[];
        rating?: string[];
      } = {}
    ) => {
      const conditions = [];

      if (filters.fandomId) {
        conditions.push(eq(schema.stories.fandom_id, filters.fandomId));
      }

      if (filters.status && filters.status.length > 0) {
        const validStatuses = filters.status.filter(s =>
          ['complete', 'incomplete', 'abandoned', 'hiatus'].includes(s)
        ) as ('complete' | 'incomplete' | 'abandoned' | 'hiatus')[];
        if (validStatuses.length > 0) {
          conditions.push(inArray(schema.stories.status, validStatuses));
        }
      }

      if (filters.rating && filters.rating.length > 0) {
        conditions.push(inArray(schema.stories.rating, filters.rating));
      }

      const result = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.stories)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return Number(result[0]?.count || 0);
    },
  };

  /**
   * Tag queries
   */
  public readonly tags = {
    /**
     * Find tags by fandom with optional class filter
     */
    findByFandom: async (
      fandomId: string,
      options: {
        tagClassId?: string;
        search?: string;
        page?: number;
        limit?: number;
      } = {}
    ) => {
      const { tagClassId, search, page = 1, limit = 100 } = options;
      const offset = (page - 1) * limit;

      const conditions = [eq(schema.tags.fandom_id, fandomId)];

      if (tagClassId) {
        conditions.push(eq(schema.tags.tag_class_id, tagClassId));
      }

      if (search) {
        conditions.push(like(schema.tags.name, `%${search}%`));
      }

      return await this.db
        .select()
        .from(schema.tags)
        .where(and(...conditions))
        .limit(limit)
        .offset(offset)
        .orderBy(asc(schema.tags.name));
    },

    /**
     * Get tags with their usage count
     */
    findWithUsageCount: async (fandomId: string, limit: number = 50) => {
      return await this.db
        .select({
          tag: schema.tags,
          usage_count: sql<number>`count(${schema.storyTags.story_id})`,
        })
        .from(schema.tags)
        .leftJoin(schema.storyTags, eq(schema.tags.id, schema.storyTags.tag_id))
        .where(eq(schema.tags.fandom_id, fandomId))
        .groupBy(schema.tags.id)
        .orderBy(desc(sql`count(${schema.storyTags.story_id})`))
        .limit(limit);
    },

    /**
     * Find related tags based on co-occurrence
     */
    findRelated: async (tagId: string, limit: number = 10) => {
      // Find tags that frequently appear with the given tag
      return await this.db
        .select({
          tag: schema.tags,
          co_occurrence_count: sql<number>`count(*)`,
        })
        .from(schema.storyTags)
        .innerJoin(
          sql`${schema.storyTags} as st2`,
          sql`${schema.storyTags.story_id} = st2.story_id AND st2.tag_id != ${tagId}`
        )
        .innerJoin(schema.tags, sql`${schema.tags.id} = st2.tag_id`)
        .where(eq(schema.storyTags.tag_id, tagId))
        .groupBy(sql`st2.tag_id`, schema.tags.id)
        .orderBy(desc(sql`count(*)`))
        .limit(limit);
    },
  };

  /**
   * Plot block queries
   */
  public readonly plotBlocks = {
    /**
     * Find plot blocks by fandom and category
     */
    findByFandom: async (
      fandomId: string,
      options: {
        category?: string;
        search?: string;
        page?: number;
        limit?: number;
      } = {}
    ) => {
      const { category, search, page = 1, limit = 50 } = options;
      const offset = (page - 1) * limit;

      const conditions = [eq(schema.plotBlocks.fandom_id, fandomId)];

      if (category) {
        conditions.push(eq(schema.plotBlocks.category, category));
      }

      if (search) {
        conditions.push(
          or(
            like(schema.plotBlocks.name, `%${search}%`),
            like(schema.plotBlocks.description, `%${search}%`)
          )!
        );
      }

      return await this.db
        .select()
        .from(schema.plotBlocks)
        .where(and(...conditions))
        .limit(limit)
        .offset(offset)
        .orderBy(asc(schema.plotBlocks.name));
    },

    /**
     * Get plot block with its conditions
     */
    findWithConditions: async (plotBlockId: string) => {
      const plotBlock = await this.db.query.plotBlocks.findFirst({
        where: eq(schema.plotBlocks.id, plotBlockId),
      });

      if (!plotBlock) return null;

      const conditions = await this.db
        .select()
        .from(schema.plotBlockConditions)
        .where(eq(schema.plotBlockConditions.plot_block_id, plotBlockId))
        .orderBy(asc(schema.plotBlockConditions.order));

      return {
        plot_block: plotBlock,
        conditions,
      };
    },

    /**
     * Find plot blocks with usage statistics
     */
    findWithUsageCount: async (fandomId: string, limit: number = 30) => {
      return await this.db
        .select({
          plot_block: schema.plotBlocks,
          usage_count: sql<number>`count(${schema.storyPlotBlocks.story_id})`,
        })
        .from(schema.plotBlocks)
        .leftJoin(
          schema.storyPlotBlocks,
          eq(schema.plotBlocks.id, schema.storyPlotBlocks.plot_block_id)
        )
        .where(eq(schema.plotBlocks.fandom_id, fandomId))
        .groupBy(schema.plotBlocks.id)
        .orderBy(desc(sql`count(${schema.storyPlotBlocks.story_id})`))
        .limit(limit);
    },
  };

  /**
   * Fandom queries
   */
  public readonly fandoms = {
    /**
     * Find all fandoms with story counts
     */
    findWithStoryCounts: async () => {
      return await this.db
        .select({
          fandom: schema.fandoms,
          story_count: sql<number>`count(${schema.stories.id})`,
        })
        .from(schema.fandoms)
        .leftJoin(
          schema.stories,
          eq(schema.fandoms.id, schema.stories.fandom_id)
        )
        .groupBy(schema.fandoms.id)
        .orderBy(asc(schema.fandoms.name));
    },

    /**
     * Search fandoms by name
     */
    search: async (searchTerm: string, limit: number = 20) => {
      return await this.db
        .select()
        .from(schema.fandoms)
        .where(like(schema.fandoms.name, `%${searchTerm}%`))
        .limit(limit)
        .orderBy(asc(schema.fandoms.name));
    },
  };

  /**
   * Administrative queries
   */
  public readonly admin = {
    /**
     * Get database statistics
     */
    getStatistics: async () => {
      const [fandomCount, tagCount, plotBlockCount, storyCount, tagClassCount] =
        await Promise.all([
          this.db.select({ count: sql<number>`count(*)` }).from(schema.fandoms),
          this.db.select({ count: sql<number>`count(*)` }).from(schema.tags),
          this.db
            .select({ count: sql<number>`count(*)` })
            .from(schema.plotBlocks),
          this.db.select({ count: sql<number>`count(*)` }).from(schema.stories),
          this.db
            .select({ count: sql<number>`count(*)` })
            .from(schema.tagClasses),
        ]);

      return {
        fandoms: Number(fandomCount[0]?.count || 0),
        tags: Number(tagCount[0]?.count || 0),
        plot_blocks: Number(plotBlockCount[0]?.count || 0),
        stories: Number(storyCount[0]?.count || 0),
        tag_classes: Number(tagClassCount[0]?.count || 0),
      };
    },

    /**
     * Find orphaned records
     */
    findOrphanedRecords: async () => {
      // Tags without valid fandom
      const orphanedTags = await this.db
        .select()
        .from(schema.tags)
        .leftJoin(schema.fandoms, eq(schema.tags.fandom_id, schema.fandoms.id))
        .where(isNull(schema.fandoms.id))
        .limit(100);

      // Plot blocks without valid fandom
      const orphanedPlotBlocks = await this.db
        .select()
        .from(schema.plotBlocks)
        .leftJoin(
          schema.fandoms,
          eq(schema.plotBlocks.fandom_id, schema.fandoms.id)
        )
        .where(isNull(schema.fandoms.id))
        .limit(100);

      return {
        orphaned_tags: orphanedTags,
        orphaned_plot_blocks: orphanedPlotBlocks,
      };
    },
  };
}
