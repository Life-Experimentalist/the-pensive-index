import { DatabaseConnection } from '@/lib/database';
import { eq, and, inArray, isNull, sql } from 'drizzle-orm';
import { plotBlocks, tags, tagClasses } from '@/lib/database/schema';

/**
 * Performance-optimized tree query utilities for The Pensieve Index
 * Provides efficient hierarchical data retrieval with minimal database calls
 */
export class TreeQueryOptimizer {
  private db: DatabaseConnection;
  private cache: Map<string, any> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  constructor(database: DatabaseConnection) {
    this.db = database;
  }

  /**
   * Get complete plot block tree for a fandom with optimized loading
   * Uses single query with CTE for maximum performance
   */
  async getPlotBlockTree(
    fandomId: string,
    options: {
      includeInactive?: boolean;
      maxDepth?: number;
      useCache?: boolean;
    } = {}
  ): Promise<PlotBlockTreeNode[]> {
    const cacheKey = `plotBlockTree:${fandomId}:${JSON.stringify(options)}`;

    if (options.useCache !== false && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    // Use recursive CTE for efficient tree traversal
    const cteSql = sql`
      WITH RECURSIVE plot_block_tree AS (
        -- Base case: root nodes
        SELECT
          id, name, fandom_id, parent_id, description, category,
          is_active, created_at, updated_at,
          0 as depth,
          CAST(id AS TEXT) as path
        FROM ${plotBlocks}
        WHERE fandom_id = ${fandomId}
          AND parent_id IS NULL
          ${options.includeInactive ? sql`` : sql`AND is_active = true`}

        UNION ALL

        -- Recursive case: child nodes
        SELECT
          pb.id, pb.name, pb.fandom_id, pb.parent_id, pb.description, pb.category,
          pb.is_active, pb.created_at, pb.updated_at,
          pbt.depth + 1,
          pbt.path || '/' || pb.id
        FROM ${plotBlocks} pb
        INNER JOIN plot_block_tree pbt ON pb.parent_id = pbt.id
        WHERE pb.fandom_id = ${fandomId}
          ${options.includeInactive ? sql`` : sql`AND pb.is_active = true`}
          ${options.maxDepth ? sql`AND pbt.depth < ${options.maxDepth}` : sql``}
      )
      SELECT * FROM plot_block_tree
      ORDER BY depth, parent_id, name
    `;

    const results = await this.db.execute(cteSql);
    const tree = this.buildTreeFromFlatResults(results);

    // Cache results
    if (options.useCache !== false) {
      this.cache.set(cacheKey, {
        data: tree,
        timestamp: Date.now(),
      });
    }

    return tree;
  }

  /**
   * Get tag hierarchy with class groupings - optimized for large datasets
   */
  async getTagHierarchy(
    fandomId: string,
    options: {
      includeInactive?: boolean;
      tagClassId?: string;
      useCache?: boolean;
    } = {}
  ): Promise<TagHierarchyNode[]> {
    const cacheKey = `tagHierarchy:${fandomId}:${JSON.stringify(options)}`;

    if (options.useCache !== false && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    // Single optimized query with joins
    const query = this.db
      .select({
        tag_id: tags.id,
        tag_name: tags.name,
        tag_description: tags.description,
        tag_category: tags.category,
        tag_class_id: tags.tag_class_id,
        tag_class_name: tagClasses.name,
        tag_class_description: tagClasses.description,
        tag_is_active: tags.is_active,
        tag_created_at: tags.created_at,
        tag_updated_at: tags.updated_at,
      })
      .from(tags)
      .leftJoin(tagClasses, eq(tags.tag_class_id, tagClasses.id))
      .where(
        and(
          eq(tags.fandom_id, fandomId),
          options.includeInactive ? undefined : eq(tags.is_active, true),
          options.tagClassId
            ? eq(tags.tag_class_id, options.tagClassId)
            : undefined
        )
      )
      .orderBy(tagClasses.name, tags.category, tags.name);

    const results = await query;
    const hierarchy = this.buildTagHierarchy(results);

    // Cache results
    if (options.useCache !== false) {
      this.cache.set(cacheKey, {
        data: hierarchy,
        timestamp: Date.now(),
      });
    }

    return hierarchy;
  }

  /**
   * Batch load multiple trees efficiently
   */
  async batchLoadTrees(
    requests: Array<{
      type: 'plotBlock' | 'tag';
      fandomId: string;
      options?: any;
    }>
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    // Group requests by type for batch processing
    const plotBlockRequests = requests.filter(r => r.type === 'plotBlock');
    const tagRequests = requests.filter(r => r.type === 'tag');

    // Batch load plot block trees
    if (plotBlockRequests.length > 0) {
      const fandomIds = plotBlockRequests.map(r => r.fandomId);
      const batchResults = await this.batchLoadPlotBlockTrees(fandomIds);

      plotBlockRequests.forEach((request, index) => {
        const key = `${request.type}:${request.fandomId}`;
        results.set(key, batchResults[index]);
      });
    }

    // Batch load tag hierarchies
    if (tagRequests.length > 0) {
      const fandomIds = tagRequests.map(r => r.fandomId);
      const batchResults = await this.batchLoadTagHierarchies(fandomIds);

      tagRequests.forEach((request, index) => {
        const key = `${request.type}:${request.fandomId}`;
        results.set(key, batchResults[index]);
      });
    }

    return results;
  }

  /**
   * Get tree statistics for performance monitoring
   */
  async getTreeStatistics(fandomId: string): Promise<{
    plot_blocks: {
      total: number;
      root_nodes: number;
      max_depth: number;
      average_children: number;
    };
    tags: {
      total: number;
      by_class: Record<string, number>;
      unclassified: number;
    };
  }> {
    const [plotBlockStats, tagStats] = await Promise.all([
      this.getPlotBlockStatistics(fandomId),
      this.getTagStatistics(fandomId),
    ]);

    return {
      plot_blocks: plotBlockStats,
      tags: tagStats,
    };
  }

  /**
   * Clear cache for specific fandom or all cache
   */
  clearCache(fandomId?: string): void {
    if (fandomId) {
      const keysToDelete = Array.from(this.cache.keys()).filter(key =>
        key.includes(fandomId)
      );
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  /**
   * Private helper methods
   */
  private buildTreeFromFlatResults(results: any[]): PlotBlockTreeNode[] {
    const nodeMap = new Map<string, PlotBlockTreeNode>();
    const rootNodes: PlotBlockTreeNode[] = [];

    // First pass: create all nodes
    results.forEach(row => {
      const node: PlotBlockTreeNode = {
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        depth: row.depth,
        path: row.path,
        children: [],
        parent_id: row.parent_id,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
      nodeMap.set(row.id, node);
    });

    // Second pass: build relationships
    nodeMap.forEach(node => {
      if (node.parent_id) {
        const parent = nodeMap.get(node.parent_id);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    return rootNodes;
  }

  private buildTagHierarchy(results: any[]): TagHierarchyNode[] {
    const classMap = new Map<string, TagHierarchyNode>();
    const unclassifiedTags: any[] = [];

    results.forEach(row => {
      if (row.tag_class_id) {
        if (!classMap.has(row.tag_class_id)) {
          classMap.set(row.tag_class_id, {
            id: row.tag_class_id,
            name: row.tag_class_name,
            description: row.tag_class_description,
            tags: [],
          });
        }

        const tagClass = classMap.get(row.tag_class_id)!;
        tagClass.tags.push({
          id: row.tag_id,
          name: row.tag_name,
          description: row.tag_description,
          category: row.tag_category,
          is_active: row.tag_is_active,
          created_at: row.tag_created_at,
          updated_at: row.tag_updated_at,
        });
      } else {
        unclassifiedTags.push({
          id: row.tag_id,
          name: row.tag_name,
          description: row.tag_description,
          category: row.tag_category,
          is_active: row.tag_is_active,
          created_at: row.tag_created_at,
          updated_at: row.tag_updated_at,
        });
      }
    });

    const hierarchy = Array.from(classMap.values());

    if (unclassifiedTags.length > 0) {
      hierarchy.push({
        id: 'unclassified',
        name: 'Unclassified Tags',
        description: 'Tags not assigned to any tag class',
        tags: unclassifiedTags,
      });
    }

    return hierarchy;
  }

  private async batchLoadPlotBlockTrees(
    fandomIds: string[]
  ): Promise<PlotBlockTreeNode[][]> {
    // Implementation for batch loading plot block trees
    const results = await Promise.all(
      fandomIds.map(fandomId =>
        this.getPlotBlockTree(fandomId, { useCache: true })
      )
    );
    return results;
  }

  private async batchLoadTagHierarchies(
    fandomIds: string[]
  ): Promise<TagHierarchyNode[][]> {
    // Implementation for batch loading tag hierarchies
    const results = await Promise.all(
      fandomIds.map(fandomId =>
        this.getTagHierarchy(fandomId, { useCache: true })
      )
    );
    return results;
  }

  private async getPlotBlockStatistics(fandomId: string): Promise<{
    total: number;
    root_nodes: number;
    max_depth: number;
    average_children: number;
  }> {
    const [totalCount, rootCount, depthResult] = await Promise.all([
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(plotBlocks)
        .where(
          and(
            eq(plotBlocks.fandom_id, fandomId),
            eq(plotBlocks.is_active, true)
          )
        ),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(plotBlocks)
        .where(
          and(
            eq(plotBlocks.fandom_id, fandomId),
            eq(plotBlocks.is_active, true),
            isNull(plotBlocks.parent_id)
          )
        ),
      this.db.execute(sql`
        WITH RECURSIVE depth_calc AS (
          SELECT id, 0 as depth
          FROM ${plotBlocks}
          WHERE fandom_id = ${fandomId} AND parent_id IS NULL AND is_active = true

          UNION ALL

          SELECT pb.id, dc.depth + 1
          FROM ${plotBlocks} pb
          INNER JOIN depth_calc dc ON pb.parent_id = dc.id
          WHERE pb.fandom_id = ${fandomId} AND pb.is_active = true
        )
        SELECT MAX(depth) as max_depth FROM depth_calc
      `),
    ]);

    const total = totalCount[0]?.count || 0;
    const rootNodes = rootCount[0]?.count || 0;
    const maxDepth = (depthResult[0] as any)?.max_depth || 0;
    const averageChildren = total > 0 ? (total - rootNodes) / (total || 1) : 0;

    return {
      total,
      root_nodes: rootNodes,
      max_depth: maxDepth,
      average_children: parseFloat(averageChildren.toFixed(2)),
    };
  }

  private async getTagStatistics(fandomId: string): Promise<{
    total: number;
    by_class: Record<string, number>;
    unclassified: number;
  }> {
    const results = await this.db
      .select({
        tag_class_id: tags.tag_class_id,
        tag_class_name: tagClasses.name,
        count: sql<number>`count(*)`,
      })
      .from(tags)
      .leftJoin(tagClasses, eq(tags.tag_class_id, tagClasses.id))
      .where(and(eq(tags.fandom_id, fandomId), eq(tags.is_active, true)))
      .groupBy(tags.tag_class_id, tagClasses.name);

    const byClass: Record<string, number> = {};
    let unclassified = 0;
    let total = 0;

    results.forEach(row => {
      const count = row.count || 0;
      total += count;

      if (row.tag_class_id && row.tag_class_name) {
        byClass[row.tag_class_name] = count;
      } else {
        unclassified = count;
      }
    });

    return {
      total,
      by_class: byClass,
      unclassified,
    };
  }
}

/**
 * Tree node interfaces
 */
export interface PlotBlockTreeNode {
  id: string;
  name: string;
  description: string | null;
  category: string;
  depth: number;
  path: string;
  parent_id: string | null;
  children: PlotBlockTreeNode[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TagHierarchyNode {
  id: string;
  name: string;
  description: string | null;
  tags: Array<{
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }>;
}

/**
 * Performance monitoring utilities
 */
export class TreePerformanceMonitor {
  private queryTimes: Map<string, number[]> = new Map();

  recordQueryTime(queryType: string, timeMs: number): void {
    if (!this.queryTimes.has(queryType)) {
      this.queryTimes.set(queryType, []);
    }
    this.queryTimes.get(queryType)!.push(timeMs);

    // Keep only last 100 measurements
    const times = this.queryTimes.get(queryType)!;
    if (times.length > 100) {
      times.shift();
    }
  }

  getAverageQueryTime(queryType: string): number {
    const times = this.queryTimes.get(queryType) || [];
    if (times.length === 0) return 0;
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  getPerformanceReport(): Record<
    string,
    {
      count: number;
      average_ms: number;
      min_ms: number;
      max_ms: number;
    }
  > {
    const report: Record<string, any> = {};

    this.queryTimes.forEach((times, queryType) => {
      if (times.length > 0) {
        report[queryType] = {
          count: times.length,
          average_ms: parseFloat(
            (times.reduce((sum, time) => sum + time, 0) / times.length).toFixed(
              2
            )
          ),
          min_ms: Math.min(...times),
          max_ms: Math.max(...times),
        };
      }
    });

    return report;
  }

  clearMetrics(): void {
    this.queryTimes.clear();
  }
}
