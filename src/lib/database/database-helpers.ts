import crypto from 'crypto';
import { DatabaseConnection } from './index';
import {
  eq,
  and,
  or,
  inArray,
  sql,
  SQL,
} from 'drizzle-orm';
import { fandoms, tags, tagClasses, plotBlocks } from './schema';
import { executeCountQuery, createCountQuery, executeRawQuery } from './db-compatibility';

/**
 * Database query helpers and utilities for The Pensieve Index
 * Provides reusable query patterns and common operations
 */
export class DatabaseHelpers {
  private db: DatabaseConnection;

  constructor(database: DatabaseConnection) {
    this.db = database;
  }

  /**
   * Search utilities
   */
  search = {
    /**
     * Search across multiple entity types
     */
    globalSearch: async (
      query: string,
      type: 'fandom' | 'tag' | 'plot_block' | 'all' = 'all',
      options: {
        limit?: number;
        fandom_id?: string;
      } = {}
    ): Promise<
      Array<{
        id: string;
        name: string;
        type: 'fandom' | 'tag' | 'plot_block';
        description?: string;
        match_score: number;
      }>
    > => {
      const searchTerm = `%${query.toLowerCase()}%`;
      const limit = options.limit || 10;
      const results: any[] = [];

      if (type === 'fandom' || type === 'all') {
        const fandomMatches = await this.db
          .select()
          .from(fandoms)
          .where(
            and(
              eq(fandoms.is_active, true),
              or(
                sql`LOWER(${fandoms.name}) LIKE ${searchTerm}`,
                sql`LOWER(${fandoms.description}) LIKE ${searchTerm}`
              )
            )
          )
          .limit(limit);

        // Add match scores manually
        const scoredFandomMatches = fandomMatches.map(fandom => ({
          id: fandom.id,
          name: fandom.name,
          description: fandom.description,
          type: 'fandom' as const,
          match_score: this.search.calculateMatchScore(fandom.name, fandom.description || '', query),
        }));

        results.push(...scoredFandomMatches);
      }

      if (type === 'tag' || type === 'all') {
        const tagMatches = await this.db
          .select()
          .from(tags)
          .where(
            and(
              eq(tags.is_active, true),
              options.fandom_id ? eq(tags.fandom_id, options.fandom_id) : undefined,
              or(
                sql`LOWER(${tags.name}) LIKE ${searchTerm}`,
                sql`LOWER(${tags.description || ''}) LIKE ${searchTerm}`
              )
            )
          )
          .limit(limit);

        // Add match scores manually
        const scoredTagMatches = tagMatches.map(tag => ({
          id: tag.id,
          name: tag.name,
          description: tag.description || undefined,
          type: 'tag' as const,
          match_score: this.search.calculateMatchScore(tag.name, tag.description || '', query),
        }));

        results.push(...scoredTagMatches);
      }

      if (type === 'plot_block' || type === 'all') {
        const plotBlockMatches = await this.db
          .select()
          .from(plotBlocks)
          .where(
            and(
              eq(plotBlocks.is_active, true),
              options.fandom_id ? eq(plotBlocks.fandom_id, options.fandom_id) : undefined,
              or(
                sql`LOWER(${plotBlocks.name}) LIKE ${searchTerm}`,
                sql`LOWER(${plotBlocks.description}) LIKE ${searchTerm}`
              )
            )
          )
          .limit(limit);

        // Add match scores manually
        const scoredPlotBlockMatches = plotBlockMatches.map(plotBlock => ({
          id: plotBlock.id,
          name: plotBlock.name,
          description: plotBlock.description,
          type: 'plot_block' as const,
          match_score: this.search.calculateMatchScore(plotBlock.name, plotBlock.description || '', query),
        }));

        results.push(...scoredPlotBlockMatches);
      }

      // Sort by match score
      results.sort((a, b) => b.match_score - a.match_score);
      return results.slice(0, limit);
    },

    /**
     * Calculate relevance score for search results
     */
    calculateMatchScore: (name: string, description: string, query: string): number => {
      const lowerName = name.toLowerCase();
      const lowerQuery = query.toLowerCase();

      // Exact name match
      if (lowerName === lowerQuery) return 100;

      // Name starts with query
      if (lowerName.startsWith(lowerQuery)) return 90;

      // Name contains query
      if (lowerName.includes(lowerQuery)) return 75;

      // Description contains query
      if (description.toLowerCase().includes(lowerQuery)) return 50;

      // Partial word match in name
      const words = lowerName.split(' ');
      for (const word of words) {
        if (word.startsWith(lowerQuery)) return 40;
      }

      return 30; // Default lower match
    }
  };

  /**
   * Tag management utilities
   */
  tags = {
    /**
     * Bulk insert tags
     */
    bulkInsert: async (
      tagData: Array<{
        name: string;
        fandom_id: string;
        description?: string;
        category?: string;
        is_active?: boolean;
        tag_class_id?: string;
      }>,
      options: {
        batchSize?: number;
        onConflict?: 'update' | 'ignore';
      } = {}
    ): Promise<{
      inserted: number;
      updated: number;
      errors: Array<{ batch: number; error: string; tagIds: string[] }>;
    }> => {
      const batchSize = options.batchSize || 50;
      let inserted = 0;
      let updated = 0;
      const errors: Array<{
        batch: number;
        error: string;
        tagIds: string[];
      }> = [];

      for (let i = 0; i < tagData.length; i += batchSize) {
        const batch = tagData.slice(i, i + batchSize);

        try {
          if (options.onConflict === 'ignore') {
            // Check for existing tags first
            const existingNames = await this.db
              .select()
              .from(tags)
              .where(
                and(
                  inArray(
                    tags.name,
                    batch.map(t => t.name)
                  ),
                  eq(tags.fandom_id, batch[0].fandom_id)
                )
              );

            const existingSet = new Set(existingNames.map(e => e.name));
            const newTags = batch
              .filter(t => !existingSet.has(t.name))
              .map(t => ({
                id: crypto.randomUUID(),
                name: t.name,
                fandom_id: t.fandom_id,
                description: t.description || null,
                category: t.category || null,
                is_active: t.is_active !== undefined ? t.is_active : true,
                tag_class_id: t.tag_class_id || null,
                created_at: new Date(),
                updated_at: new Date(),
              }));

            if (newTags.length > 0) {
              await this.db.insert(tags).values(newTags);
              inserted += newTags.length;
            }
          } else {
            // Generate IDs for new tags
            const tagsWithIds = batch.map(t => ({
              id: crypto.randomUUID(),
              name: t.name,
              fandom_id: t.fandom_id,
              description: t.description || null,
              category: t.category || null,
              is_active: t.is_active !== undefined ? t.is_active : true,
              tag_class_id: t.tag_class_id || null,
              created_at: new Date(),
              updated_at: new Date(),
            }));

            await this.db.insert(tags).values(tagsWithIds);
            inserted += tagsWithIds.length;
          }
        } catch (error) {
          errors.push({
            batch: i / batchSize + 1,
            error: error instanceof Error ? error.message : 'Unknown error',
            tagIds: batch.map(t => t.name),
          });
        }
      }

      return { inserted, updated, errors };
    },

    /**
     * Update tag status (active/inactive) in bulk
     */
    bulkUpdateStatus: async (
      tagIds: string[],
      isActive: boolean,
      options: { batchSize?: number } = {}
    ): Promise<{
      updated: number;
      errors: Array<{
        batch: number;
        error: string;
        tagIds: string[];
      }>;
    }> => {
      const batchSize = options.batchSize || 50;
      let updated = 0;
      const errors: Array<{
        batch: number;
        error: string;
        tagIds: string[];
      }> = [];

      for (let i = 0; i < tagIds.length; i += batchSize) {
        const batch = tagIds.slice(i, i + batchSize);

        try {
          await this.db
            .update(tags)
            .set({
              is_active: isActive,
              updated_at: new Date(),
            })
            .where(inArray(tags.id, batch));

          updated += batch.length;
        } catch (error) {
          errors.push({
            batch: i / batchSize + 1,
            error: error instanceof Error ? error.message : 'Unknown error',
            tagIds: batch,
          });
        }
      }

      return { updated, errors };
    },
  };

  /**
   * Fandom statistics
   */
  stats = {
    /**
     * Get fandom statistics
     */
    getFandomStats: async (
      fandomId: string
    ): Promise<{
      totals: {
        tags: number;
        plot_blocks: number;
        tag_classes: number;
      };
      active: {
        tags: number;
        plot_blocks: number;
        tag_classes: number;
      };
      categories: {
        tag_categories: Record<string, number>;
        plot_block_categories: Record<string, number>;
      };
      relationships: {
        tags_with_classes: number;
        tags_without_classes: number;
        plot_blocks_with_parents: number;
        root_plot_blocks: number;
      };
    }> => {
      const [
        tagStatsResult,
        plotBlockStatsResult,
        tagClassStatsResult,
        tagCategoriesResult,
        plotBlockCategoriesResult,
        tagClassRelationsResult,
        plotBlockRelationsResult,
      ] = await Promise.all([
        // Tag statistics
        executeRawQuery(this.db, sql`SELECT count(*) as total,
                     sum(case when is_active = true then 1 else 0 end) as active
                     FROM tags WHERE fandom_id = ${fandomId}`),

        // Plot block statistics
        executeRawQuery(this.db, sql`SELECT count(*) as total,
                     sum(case when is_active = true then 1 else 0 end) as active
                     FROM plot_blocks WHERE fandom_id = ${fandomId}`),

        // Tag class statistics
        executeRawQuery(this.db, sql`SELECT count(*) as total,
                     sum(case when is_active = true then 1 else 0 end) as active
                     FROM tag_classes WHERE fandom_id = ${fandomId}`),

        // Tag categories
        executeRawQuery(this.db, sql`SELECT category, count(*) as count
                     FROM tags
                     WHERE fandom_id = ${fandomId} AND is_active = true
                     GROUP BY category`),

        // Plot block categories
        executeRawQuery(this.db, sql`SELECT category, count(*) as count
                     FROM plot_blocks
                     WHERE fandom_id = ${fandomId} AND is_active = true
                     GROUP BY category`),

        // Tag class relationships
        this.db
          .run(sql`SELECT
                     sum(case when tag_class_id is not null then 1 else 0 end) as with_class,
                     sum(case when tag_class_id is null then 1 else 0 end) as without_class
                     FROM tags
                     WHERE fandom_id = ${fandomId} AND is_active = true`),

        // Plot block relationships
        this.db
          .run(sql`SELECT
                     sum(case when parent_id is not null then 1 else 0 end) as with_parent,
                     sum(case when parent_id is null then 1 else 0 end) as root_nodes
                     FROM plot_blocks
                     WHERE fandom_id = ${fandomId} AND is_active = true`),
      ]);

      // Process results
      const tagStats = tagStatsResult.rows;
      const plotBlockStats = plotBlockStatsResult.rows;
      const tagClassStats = tagClassStatsResult.rows;
      const tagCategories = tagCategoriesResult.rows;
      const plotBlockCategories = plotBlockCategoriesResult.rows;
      const tagClassRelations = tagClassRelationsResult.rows;
      const plotBlockRelations = plotBlockRelationsResult.rows;

      const tagCategoryMap: Record<string, number> = {};
      tagCategories.forEach((cat: any) => {
        if (cat.category) {
          tagCategoryMap[cat.category] = cat.count || 0;
        }
      });

      const plotBlockCategoryMap: Record<string, number> = {};
      plotBlockCategories.forEach((cat: any) => {
        if (cat.category) {
          plotBlockCategoryMap[cat.category] = cat.count || 0;
        }
      });

      return {
        totals: {
          tags: tagStats[0]?.total || 0,
          plot_blocks: plotBlockStats[0]?.total || 0,
          tag_classes: tagClassStats[0]?.total || 0,
        },
        active: {
          tags: tagStats[0]?.active || 0,
          plot_blocks: plotBlockStats[0]?.active || 0,
          tag_classes: tagClassStats[0]?.active || 0,
        },
        categories: {
          tag_categories: tagCategoryMap,
          plot_block_categories: plotBlockCategoryMap,
        },
        relationships: {
          tags_with_classes: tagClassRelations[0]?.with_class || 0,
          tags_without_classes: tagClassRelations[0]?.without_class || 0,
          plot_blocks_with_parents: plotBlockRelations[0]?.with_parent || 0,
          root_plot_blocks: plotBlockRelations[0]?.root_nodes || 0,
        },
      };
    },

    /**
     * Get global admin dashboard stats
     */
    getAdminDashboardStats: async (): Promise<{
      fandoms: Array<{
        id: string;
        name: string;
        tag_count: number;
        plot_block_count: number;
        tag_class_count: number;
        last_activity: Date | null;
      }>;
      totals: {
        fandoms: number;
        tags: number;
        plot_blocks: number;
        tag_classes: number;
      };
    }> => {
      const [fandomDetails, globalTotals] = await Promise.all([
        // Per-fandom details
        this.db
          .run(sql`
            SELECT
              f.id,
              f.name,
              (SELECT count(*) FROM tags WHERE fandom_id = f.id AND is_active = true) as tag_count,
              (SELECT count(*) FROM plot_blocks WHERE fandom_id = f.id AND is_active = true) as plot_block_count,
              (SELECT count(*) FROM tag_classes WHERE fandom_id = f.id AND is_active = true) as tag_class_count
            FROM fandoms f
            WHERE f.is_active = true
          `),

        // Global totals
        Promise.all([
          executeRawQuery(this.db, sql`SELECT count(*) as count FROM fandoms WHERE is_active = true`),
          executeRawQuery(this.db, sql`SELECT count(*) as count FROM tags WHERE is_active = true`),
          executeRawQuery(this.db, sql`SELECT count(*) as count FROM plot_blocks WHERE is_active = true`),
          executeRawQuery(this.db, sql`SELECT count(*) as count FROM tag_classes WHERE is_active = true`),
        ]),
      ]);

      return {
        fandoms: fandomDetails.rows,
        totals: {
          fandoms: globalTotals[0].rows[0]?.count || 0,
          tags: globalTotals[1].rows[0]?.count || 0,
          plot_blocks: globalTotals[2].rows[0]?.count || 0,
          tag_classes: globalTotals[3].rows[0]?.count || 0,
        },
      };
    },
  };

  /**
   * Utility functions
   */
  utils = {
    /**
     * Check if an entity exists
     */
    checkExists: async (
      type: 'fandom' | 'tag' | 'plot_block' | 'tag_class',
      id: string
    ): Promise<boolean> => {
      let query;

      switch (type) {
        case 'fandom':
          query = this.db
            .select()
            .from(fandoms)
            .where(and(eq(fandoms.id, id), eq(fandoms.is_active, true)));
          break;
        case 'tag':
          query = this.db
            .select()
            .from(tags)
            .where(and(eq(tags.id, id), eq(tags.is_active, true)));
          break;
        case 'plot_block':
          query = this.db
            .select()
            .from(plotBlocks)
            .where(and(eq(plotBlocks.id, id), eq(plotBlocks.is_active, true)));
          break;
        case 'tag_class':
          query = this.db
            .select()
            .from(tagClasses)
            .where(and(eq(tagClasses.id, id), eq(tagClasses.is_active, true)));
          break;
        default:
          return false;
      }

      const result = await query;
      return result.length > 0;
    },

    /**
     * Generate a slug from a name
     */
    generateSlug: (name: string): string => {
      return name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
    },

    /**
     * Check if a slug is unique
     */
    isSlugUnique: async (
      name: string,
      excludeId?: string
    ): Promise<boolean> => {
      const slug = name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      const query = excludeId
        ? this.db
            .select()
            .from(fandoms)
            .where(and(eq(fandoms.slug, slug), sql`id != ${excludeId}`))
        : this.db.select().from(fandoms).where(eq(fandoms.slug, slug));

      const results = await query;
      return results.length === 0;
    },

    /**
     * Build filters for a database query
     */
    buildFilters: (
      filters: Record<string, any>,
      validFilterKeys: string[]
    ): SQL[] => {
      const conditions: SQL[] = [];

      Object.entries(filters).forEach(([key, value]) => {
        if (validFilterKeys.includes(key) && value !== undefined && value !== null) {
          conditions.push(sql`${sql.identifier(key)} = ${value}`);
        }
      });

      return conditions;
    },
  };
}