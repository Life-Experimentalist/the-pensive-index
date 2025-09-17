import { DatabaseManager } from '@/lib/database';
import { AuthContext } from './middleware';
import { ErrorFactory } from '@/lib/errors';
import { eq, and, inArray } from 'drizzle-orm';
import { fandoms, tags, plotBlocks, tagClasses } from '@/lib/database/schema';

/**
 * Fandom access control and validation utilities
 */
export class FandomAccessValidator {
  /**
   * Validate that all provided entity IDs belong to the specified fandom
   */
  static async validateFandomScope(
    fandomId: string,
    entities: {
      tagIds?: string[];
      plotBlockIds?: string[];
      tagClassIds?: string[];
    }
  ): Promise<{
    isValid: boolean;
    invalidTags: string[];
    invalidPlotBlocks: string[];
    invalidTagClasses: string[];
  }> {
    const dbManager = DatabaseManager.getInstance();
    const db = await dbManager.getConnection();

    const invalidTags: string[] = [];
    const invalidPlotBlocks: string[] = [];
    const invalidTagClasses: string[] = [];

    // Validate tag IDs
    if (entities.tagIds && entities.tagIds.length > 0) {
      const validTags = await db.query.tags.findMany({
        where: and(
          eq(tags.fandom_id, fandomId),
          inArray(tags.id, entities.tagIds),
          eq(tags.is_active, true)
        ),
        columns: { id: true },
      });

      const validTagIds = new Set(validTags.map(tag => tag.id));
      invalidTags.push(...entities.tagIds.filter(id => !validTagIds.has(id)));
    }

    // Validate plot block IDs
    if (entities.plotBlockIds && entities.plotBlockIds.length > 0) {
      const validPlotBlocks = await db.query.plotBlocks.findMany({
        where: and(
          eq(plotBlocks.fandom_id, fandomId),
          inArray(plotBlocks.id, entities.plotBlockIds),
          eq(plotBlocks.is_active, true)
        ),
        columns: { id: true },
      });

      const validPlotBlockIds = new Set(validPlotBlocks.map(pb => pb.id));
      invalidPlotBlocks.push(
        ...entities.plotBlockIds.filter(id => !validPlotBlockIds.has(id))
      );
    }

    // Validate tag class IDs
    if (entities.tagClassIds && entities.tagClassIds.length > 0) {
      const validTagClasses = await db.query.tagClasses.findMany({
        where: and(
          eq(tagClasses.fandom_id, fandomId),
          inArray(tagClasses.id, entities.tagClassIds),
          eq(tagClasses.is_active, true)
        ),
        columns: { id: true },
      });

      const validTagClassIds = new Set(validTagClasses.map(tc => tc.id));
      invalidTagClasses.push(
        ...entities.tagClassIds.filter(id => !validTagClassIds.has(id))
      );
    }

    return {
      isValid:
        invalidTags.length === 0 &&
        invalidPlotBlocks.length === 0 &&
        invalidTagClasses.length === 0,
      invalidTags,
      invalidPlotBlocks,
      invalidTagClasses,
    };
  }

  /**
   * Ensure fandom exists and user has access
   */
  static async validateFandomAccess(
    fandomId: string,
    authContext: AuthContext,
    requiredPermission?: string
  ): Promise<{
    id: string;
    name: string;
    slug: string;
    description: string;
    is_active: boolean;
  }> {
    const dbManager = DatabaseManager.getInstance();
    const db = await dbManager.getConnection();

    // Check if fandom exists
    const fandom = await db.query.fandoms.findFirst({
      where: eq(fandoms.id, fandomId),
    });

    if (!fandom) {
      throw ErrorFactory.notFound('Fandom', fandomId);
    }

    // Check if fandom is active (unless user is admin)
    if (!fandom.is_active && !authContext.isAdmin) {
      throw ErrorFactory.businessRule(
        'fandom_inactive',
        `Fandom "${fandom.name}" is not currently active`
      );
    }

    // Check specific permission if provided
    if (
      requiredPermission &&
      !authContext.user.permissions.includes(requiredPermission)
    ) {
      throw ErrorFactory.authorization(
        `Insufficient permissions for operation on fandom "${fandom.name}"`
      );
    }

    return fandom;
  }

  /**
   * Get user's accessible fandoms based on permissions
   */
  static async getUserAccessibleFandoms(
    authContext: AuthContext,
    options: {
      includeInactive?: boolean;
      permission?: string;
    } = {}
  ): Promise<
    Array<{
      id: string;
      name: string;
      slug: string;
      description: string;
      is_active: boolean;
      access_level: 'admin' | 'write' | 'read';
    }>
  > {
    const dbManager = DatabaseManager.getInstance();
    const db = await dbManager.getConnection();

    // Build filter conditions
    const conditions = [];
    if (!options.includeInactive) {
      conditions.push(eq(fandoms.is_active, true));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get all fandoms
    const allFandoms = await db.query.fandoms.findMany({
      where: whereClause,
      orderBy: [fandoms.name],
    });

    // Determine access level for each fandom
    const accessibleFandoms = allFandoms.map(fandom => {
      let accessLevel: 'admin' | 'write' | 'read' = 'read';

      if (authContext.isAdmin) {
        accessLevel = 'admin';
      } else if (
        authContext.user.permissions.some(
          p =>
            p.includes('create:') ||
            p.includes('update:') ||
            p.includes('delete:')
        )
      ) {
        accessLevel = 'write';
      }

      return {
        ...fandom,
        access_level: accessLevel,
      };
    });

    // Filter by required permission if specified
    if (options.permission) {
      return accessibleFandoms.filter(fandom => {
        if (authContext.isAdmin) return true;
        return authContext.user.permissions.includes(options.permission!);
      });
    }

    return accessibleFandoms;
  }

  /**
   * Validate entity relationships within fandom scope
   */
  static async validateEntityRelationships(
    fandomId: string,
    relationships: {
      tagToTagClass?: Array<{ tagId: string; tagClassId: string }>;
      plotBlockHierarchy?: Array<{ childId: string; parentId: string }>;
      tagDependencies?: Array<{ tagId: string; dependsOn: string[] }>;
    }
  ): Promise<{
    isValid: boolean;
    errors: Array<{
      type:
        | 'invalid_tag_class'
        | 'invalid_parent'
        | 'circular_dependency'
        | 'cross_fandom_reference';
      message: string;
      entityId: string;
      relatedId?: string;
    }>;
  }> {
    const dbManager = DatabaseManager.getInstance();
    const db = await dbManager.getConnection();
    const errors = [];

    // Validate tag to tag class relationships
    if (relationships.tagToTagClass) {
      for (const { tagId, tagClassId } of relationships.tagToTagClass) {
        // Check if tag belongs to fandom
        const tag = await db.query.tags.findFirst({
          where: and(eq(tags.id, tagId), eq(tags.fandom_id, fandomId)),
        });

        if (!tag) {
          errors.push({
            type: 'cross_fandom_reference' as const,
            message: `Tag ${tagId} does not belong to fandom ${fandomId}`,
            entityId: tagId,
            relatedId: fandomId,
          });
          continue;
        }

        // Check if tag class belongs to fandom
        const tagClass = await db.query.tagClasses.findFirst({
          where: and(
            eq(tagClasses.id, tagClassId),
            eq(tagClasses.fandom_id, fandomId)
          ),
        });

        if (!tagClass) {
          errors.push({
            type: 'invalid_tag_class' as const,
            message: `Tag class ${tagClassId} does not belong to fandom ${fandomId}`,
            entityId: tagId,
            relatedId: tagClassId,
          });
        }
      }
    }

    // Validate plot block hierarchy
    if (relationships.plotBlockHierarchy) {
      for (const { childId, parentId } of relationships.plotBlockHierarchy) {
        // Check if both plot blocks belong to fandom
        const [child, parent] = await Promise.all([
          db.query.plotBlocks.findFirst({
            where: and(
              eq(plotBlocks.id, childId),
              eq(plotBlocks.fandom_id, fandomId)
            ),
          }),
          db.query.plotBlocks.findFirst({
            where: and(
              eq(plotBlocks.id, parentId),
              eq(plotBlocks.fandom_id, fandomId)
            ),
          }),
        ]);

        if (!child) {
          errors.push({
            type: 'cross_fandom_reference' as const,
            message: `Child plot block ${childId} does not belong to fandom ${fandomId}`,
            entityId: childId,
            relatedId: fandomId,
          });
        }

        if (!parent) {
          errors.push({
            type: 'invalid_parent' as const,
            message: `Parent plot block ${parentId} does not belong to fandom ${fandomId}`,
            entityId: childId,
            relatedId: parentId,
          });
        }
      }

      // Check for circular dependencies in plot block hierarchy
      const circularDeps = this.detectCircularDependencies(
        relationships.plotBlockHierarchy
      );
      errors.push(
        ...circularDeps.map(dep => ({
          type: 'circular_dependency' as const,
          message: `Circular dependency detected in plot block hierarchy: ${dep.cycle.join(
            ' -> '
          )}`,
          entityId: dep.cycle[0],
          relatedId: dep.cycle[dep.cycle.length - 1],
        }))
      );
    }

    // Validate tag dependencies
    if (relationships.tagDependencies) {
      for (const { tagId, dependsOn } of relationships.tagDependencies) {
        // Check if all tags belong to fandom
        const allTagIds = [tagId, ...dependsOn];
        const validTags = await db.query.tags.findMany({
          where: and(inArray(tags.id, allTagIds), eq(tags.fandom_id, fandomId)),
          columns: { id: true },
        });

        const validTagIds = new Set(validTags.map(t => t.id));
        const invalidIds = allTagIds.filter(id => !validTagIds.has(id));

        for (const invalidId of invalidIds) {
          errors.push({
            type: 'cross_fandom_reference' as const,
            message: `Tag ${invalidId} does not belong to fandom ${fandomId}`,
            entityId: tagId,
            relatedId: invalidId,
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Detect circular dependencies in parent-child relationships
   */
  private static detectCircularDependencies(
    relationships: Array<{ childId: string; parentId: string }>
  ): Array<{ cycle: string[] }> {
    const graph = new Map<string, string[]>();
    const cycles: Array<{ cycle: string[] }> = [];

    // Build adjacency list
    for (const { childId, parentId } of relationships) {
      if (!graph.has(parentId)) {
        graph.set(parentId, []);
      }
      graph.get(parentId)!.push(childId);
    }

    // DFS to detect cycles
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          // Found cycle
          const cycleStart = path.indexOf(neighbor);
          cycles.push({
            cycle: [...path.slice(cycleStart), neighbor],
          });
          return true;
        }
      }

      recursionStack.delete(node);
      path.pop();
      return false;
    };

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return cycles;
  }
}
