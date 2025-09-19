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
import { executeRawQuery, getCountValue, compatibleSelect } from './db-compatibility';

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
      const query = sql`
        SELECT
          t.id as "tag.id",
          t.name as "tag.name",
          t.fandom_id as "tag.fandom_id",
          t.description as "tag.description",
          t.category as "tag.category",
          t.is_active as "tag.is_active",
          t.created_at as "tag.created_at",
          t.updated_at as "tag.updated_at",
          t.requires as "tag.requires",
          t.enhances as "tag.enhances",
          t.tag_class_id as "tag.tag_class_id",
          st.relevance_weight
        FROM
          story_tags st
        INNER JOIN
          tags t ON st.tag_id = t.id
        WHERE
          st.story_id = ${storyId}
      `;

      const storyTags = await executeRawQuery(this.db, query);

      // Get story plot blocks
      const plotBlocksQuery = sql`
        SELECT
          pb.id as "plot_block.id",
          pb.name as "plot_block.name",
          pb.fandom_id as "plot_block.fandom_id",
          pb.category as "plot_block.category",
          pb.description as "plot_block.description",
          pb.is_active as "plot_block.is_active",
          pb.created_at as "plot_block.created_at",
          pb.updated_at as "plot_block.updated_at",
          pb.conflicts_with as "plot_block.conflicts_with",
          pb.requires as "plot_block.requires",
          pb.enhances as "plot_block.enhances",
          pb.parent_id as "plot_block.parent_id",
          pb.has_custom_path as "plot_block.has_custom_path",
          pb.depth as "plot_block.depth",
          pb.path as "plot_block.path",
          pb.children as "plot_block.children",
          spb.relevance_weight
        FROM
          story_plot_blocks spb
        INNER JOIN
          plot_blocks pb ON spb.plot_block_id = pb.id
        WHERE
          spb.story_id = ${storyId}
      `;

      const storyPlotBlocks = await executeRawQuery(this.db, plotBlocksQuery);

      /* Original code that was replaced:
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
      */

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

      // Use raw SQL with compatibility utilities
      let query = sql`SELECT COUNT(*) as count FROM ${schema.stories}`;

      if (conditions.length > 0) {
        const whereClause = and(...conditions);
        // @ts-ignore - Adding WHERE clause to the query
        query = sql`${query} WHERE ${whereClause}`;
      }

      const result = await executeRawQuery(this.db, query);
      return getCountValue(result);
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
      // Use raw SQL for complex queries with aggregates
      const query = sql`
        SELECT
          t.id as "tag.id",
          t.name as "tag.name",
          t.fandom_id as "tag.fandom_id",
          t.description as "tag.description",
          t.category as "tag.category",
          t.is_active as "tag.is_active",
          t.created_at as "tag.created_at",
          t.updated_at as "tag.updated_at",
          t.requires as "tag.requires",
          t.enhances as "tag.enhances",
          t.tag_class_id as "tag.tag_class_id",
          COUNT(st.story_id) as usage_count
        FROM
          tags t
        LEFT JOIN
          story_tags st ON t.id = st.tag_id
        WHERE
          t.fandom_id = ${fandomId}
        GROUP BY
          t.id
        ORDER BY
          COUNT(st.story_id) DESC
        LIMIT
          ${limit}
      `;

      return await executeRawQuery(this.db, query);
    },

    /**
     * Find related tags based on co-occurrence
     */
    findRelated: async (tagId: string, limit: number = 10) => {
      // Find tags that frequently appear with the given tag
      const query = sql`
        SELECT
          t.id as "tag.id",
          t.name as "tag.name",
          t.fandom_id as "tag.fandom_id",
          t.description as "tag.description",
          t.category as "tag.category",
          t.is_active as "tag.is_active",
          t.created_at as "tag.created_at",
          t.updated_at as "tag.updated_at",
          t.requires as "tag.requires",
          t.enhances as "tag.enhances",
          t.tag_class_id as "tag.tag_class_id",
          COUNT(*) as co_occurrence_count
        FROM
          story_tags st1
        INNER JOIN
          story_tags st2 ON st1.story_id = st2.story_id AND st2.tag_id != ${tagId}
        INNER JOIN
          tags t ON t.id = st2.tag_id
        WHERE
          st1.tag_id = ${tagId}
        GROUP BY
          st2.tag_id, t.id
        ORDER BY
          COUNT(*) DESC
        LIMIT
          ${limit}
      `;

      return await executeRawQuery(this.db, query);
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
      const query = sql`
        SELECT
          pb.id as "plot_block.id",
          pb.name as "plot_block.name",
          pb.fandom_id as "plot_block.fandom_id",
          pb.category as "plot_block.category",
          pb.description as "plot_block.description",
          pb.is_active as "plot_block.is_active",
          pb.created_at as "plot_block.created_at",
          pb.updated_at as "plot_block.updated_at",
          pb.conflicts_with as "plot_block.conflicts_with",
          pb.requires as "plot_block.requires",
          pb.enhances as "plot_block.enhances",
          pb.parent_id as "plot_block.parent_id",
          pb.has_custom_path as "plot_block.has_custom_path",
          pb.depth as "plot_block.depth",
          pb.path as "plot_block.path",
          pb.children as "plot_block.children",
          COUNT(spb.story_id) as usage_count
        FROM
          plot_blocks pb
        LEFT JOIN
          story_plot_blocks spb ON pb.id = spb.plot_block_id
        WHERE
          pb.fandom_id = ${fandomId}
        GROUP BY
          pb.id
        ORDER BY
          COUNT(spb.story_id) DESC
        LIMIT
          ${limit}
      `;

      return await executeRawQuery(this.db, query);
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
      // Use raw SQL for complex queries with aggregates
      const query = sql`
        SELECT
          f.id as "fandom.id",
          f.name as "fandom.name",
          f.description as "fandom.description",
          f.slug as "fandom.slug",
          f.is_active as "fandom.is_active",
          f.created_at as "fandom.created_at",
          f.updated_at as "fandom.updated_at",
          COUNT(s.id) as story_count
        FROM
          fandoms f
        LEFT JOIN
          stories s ON f.id = s.fandom_id
        GROUP BY
          f.id
        ORDER BY
          f.name ASC
      `;

      return await executeRawQuery(this.db, query);
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
      // Use raw SQL queries for counting
      const fandomCountQuery = sql`SELECT COUNT(*) as count FROM fandoms`;
      const tagCountQuery = sql`SELECT COUNT(*) as count FROM tags`;
      const plotBlockCountQuery = sql`SELECT COUNT(*) as count FROM plot_blocks`;
      const storyCountQuery = sql`SELECT COUNT(*) as count FROM stories`;
      const tagClassCountQuery = sql`SELECT COUNT(*) as count FROM tag_classes`;

      const [fandomCount, tagCount, plotBlockCount, storyCount, tagClassCount] =
        await Promise.all([
          executeRawQuery(this.db, fandomCountQuery),
          executeRawQuery(this.db, tagCountQuery),
          executeRawQuery(this.db, plotBlockCountQuery),
          executeRawQuery(this.db, storyCountQuery),
          executeRawQuery(this.db, tagClassCountQuery),
        ]);

      return {
        fandoms: getCountValue(fandomCount),
        tags: getCountValue(tagCount),
        plot_blocks: getCountValue(plotBlockCount),
        stories: getCountValue(storyCount),
        tag_classes: getCountValue(tagClassCount),
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
