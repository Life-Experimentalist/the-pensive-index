import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getDatabase, closeDatabase } from '@/lib/database';
import { fandoms, plotBlocks } from '@/lib/database/schema';
import { eq, and, isNull, isNotNull, sql } from 'drizzle-orm';
import type { DatabaseConnection } from '@/lib/database';
import { createTestFandom, createTestPlotBlock } from '../utils/test-data';
import { randomUUID } from 'crypto';

/**
 * Integration Test for Scenario 3: Plot Block Hierarchy
 *
 * This test validates the complete plot block hierarchy management:
 * 1. Create root plot blocks
 * 2. Create child plot blocks with parent relationships
 * 3. Navigate tree structures efficiently
 * 4. Prevent circular dependencies
 * 5. Maintain referential integrity
 * 6. Handle complex tree operations
 */
describe('Plot Block Hierarchy Integration Tests', () => {
  let db: DatabaseConnection;
  let testFandomId: string;
  let rootPlotBlockId: string;
  let childPlotBlockId: string;

  beforeAll(async () => {
    db = await getDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    // Clean up test data
    await db
      .delete(plotBlocks)
      .where(eq(plotBlocks.name, 'Test Root Plot Block'));
    await db
      .delete(plotBlocks)
      .where(eq(plotBlocks.name, 'Test Child Plot Block'));
    await db.delete(fandoms).where(eq(fandoms.name, 'Plot Block Test Fandom'));

    // Create test fandom
    const [fandom] = await db
      .insert(fandoms)
      .values(
        createTestFandom({
          name: 'Plot Block Test Fandom',
          description: 'Test fandom for plot block hierarchy',
        })
      )
      .returning();
    testFandomId = fandom.id;
  });

  describe('Root Plot Block Creation', () => {
    it('should create a root plot block successfully', async () => {
      // Arrange
      const plotBlockData = createTestPlotBlock({
        name: 'Test Root Plot Block',
        description: 'A root plot block for testing',
        fandom_id: testFandomId,
        category: 'general',
        parent_id: null,
      });

      // Act
      const [createdPlotBlock] = await db
        .insert(plotBlocks)
        .values(plotBlockData)
        .returning();

      // Assert
      expect(createdPlotBlock).toBeDefined();
      expect(createdPlotBlock.name).toBe(plotBlockData.name);
      expect(createdPlotBlock.description).toBe(plotBlockData.description);
      expect(createdPlotBlock.fandom_id).toBe(testFandomId);
      expect(createdPlotBlock.parent_id).toBeNull();
      expect(createdPlotBlock.is_active).toBe(true);
      expect(createdPlotBlock.id).toBeDefined();

      rootPlotBlockId = createdPlotBlock.id;
    });

    it('should prevent duplicate plot block names within same fandom', async () => {
      // Arrange
      const plotBlockData = createTestPlotBlock({
        name: 'Test Root Plot Block',
        description: 'Original plot block',
        category: 'inheritance',
        fandom_id: testFandomId,
        parent_id: null,
      });

      await db.insert(plotBlocks).values(plotBlockData);

      // Act & Assert
      const duplicateData = createTestPlotBlock({
        name: 'Test Root Plot Block',
        description: 'Duplicate plot block',
        category: 'inheritance',
        fandom_id: testFandomId,
        parent_id: null,
      });

      await expect(
        db.insert(plotBlocks).values(duplicateData)
      ).rejects.toThrow(); // Should fail on unique constraint
    });

    it('should allow same plot block name in different fandoms', async () => {
      // Arrange
      const [anotherFandom] = await db
        .insert(fandoms)
        .values(
          createTestFandom({
            name: 'Another Plot Block Test Fandom',
            description: 'Another test fandom',
          })
        )
        .returning();

      const plotBlockData = createTestPlotBlock({
        name: 'Test Root Plot Block',
        description: 'Plot block in first fandom',
        category: 'inheritance',
        fandom_id: testFandomId,
        parent_id: null,
      });

      const [firstPlotBlock] = await db
        .insert(plotBlocks)
        .values(plotBlockData)
        .returning();

      // Act
      const sameNameData = createTestPlotBlock({
        name: 'Test Root Plot Block',
        description: 'Plot block in second fandom',
        category: 'inheritance',
        fandom_id: anotherFandom.id,
        parent_id: null,
      });

      const [secondPlotBlock] = await db
        .insert(plotBlocks)
        .values(sameNameData)
        .returning();

      // Assert
      expect(firstPlotBlock.name).toBe(secondPlotBlock.name);
      expect(firstPlotBlock.fandom_id).not.toBe(secondPlotBlock.fandom_id);
      expect(firstPlotBlock.id).not.toBe(secondPlotBlock.id);
    });
  });

  describe('Child Plot Block Creation', () => {
    beforeEach(async () => {
      // Create root plot block for parent-child tests
      const [rootBlock] = await db
        .insert(plotBlocks)
        .values(
          createTestPlotBlock({
            name: 'Test Root Plot Block',
            description: 'Root block for hierarchy tests',
            category: 'inheritance',
            fandom_id: testFandomId,
            parent_id: null,
          })
        )
        .returning();
      rootPlotBlockId = rootBlock.id;
    });

    it('should create a child plot block with valid parent', async () => {
      // Arrange
      const childData = createTestPlotBlock({
        name: 'Test Child Plot Block',
        description: 'A child plot block for testing',
        category: 'lordship',
        fandom_id: testFandomId,
        parent_id: rootPlotBlockId,
      });

      // Act
      const [createdChild] = await db
        .insert(plotBlocks)
        .values(childData)
        .returning();

      // Assert
      expect(createdChild).toBeDefined();
      expect(createdChild.name).toBe(childData.name);
      expect(createdChild.parent_id).toBe(rootPlotBlockId);
      expect(createdChild.fandom_id).toBe(testFandomId);
      expect(createdChild.is_active).toBe(true);

      childPlotBlockId = createdChild.id;
    });

    it('should validate parent belongs to same fandom', async () => {
      // Arrange - Create parent in different fandom
      const [anotherFandom] = await db
        .insert(fandoms)
        .values(
          createTestFandom({
            name: 'Different Fandom',
            description: 'Different fandom for parent validation',
          })
        )
        .returning();

      const [parentInDifferentFandom] = await db
        .insert(plotBlocks)
        .values({
          name: 'Parent in Different Fandom',
          description: 'Parent block in different fandom',
          category: 'inheritance',
          fandom_id: anotherFandom.id,
          parent_id: null,
          is_active: true,
        })
        .returning();

      // Act & Assert - Try to create child with parent from different fandom
      const invalidChildData = {
        name: 'Invalid Child',
        description: 'Child with parent from different fandom',
        category: 'lordship',
        fandom_id: testFandomId,
        parent_id: parentInDifferentFandom.id,
        is_active: true,
      };

      await expect(
        db.insert(plotBlocks).values(invalidChildData)
      ).rejects.toThrow(); // Should fail on foreign key constraint
    });

    it('should prevent self-referencing parent', async () => {
      // Arrange - Create a plot block first
      const [plotBlock] = await db
        .insert(plotBlocks)
        .values({
          name: 'Self Reference Test',
          description: 'Testing self reference prevention',
          category: 'inheritance',
          fandom_id: testFandomId,
          parent_id: null,
          is_active: true,
        })
        .returning();

      // Act & Assert - Try to update to reference itself
      await expect(
        db
          .update(plotBlocks)
          .set({ parent_id: plotBlock.id })
          .where(eq(plotBlocks.id, plotBlock.id))
      ).rejects.toThrow(); // Should fail on check constraint or trigger
    });
  });

  describe('Tree Navigation and Queries', () => {
    beforeEach(async () => {
      // Create a complex hierarchy for testing
      // Root -> Child1 -> Grandchild1
      //      -> Child2 -> Grandchild2
      //                -> Grandchild3

      const [root] = await db
        .insert(plotBlocks)
        .values({
          name: 'Goblin Inheritance',
          description: 'Root inheritance plot block',
          category: 'inheritance',
          fandom_id: testFandomId,
          parent_id: null,
          is_active: true,
        })
        .returning();

      const [child1] = await db
        .insert(plotBlocks)
        .values({
          name: 'Black Lordship',
          description: 'Black family inheritance',
          category: 'lordship',
          fandom_id: testFandomId,
          parent_id: root.id,
          is_active: true,
        })
        .returning();

      const [child2] = await db
        .insert(plotBlocks)
        .values({
          name: 'Potter Heritage',
          description: 'Potter family inheritance',
          category: 'heritage',
          fandom_id: testFandomId,
          parent_id: root.id,
          is_active: true,
        })
        .returning();

      await db.insert(plotBlocks).values([
        {
          name: 'Gryffindor Lordship',
          description: 'Inheriting Gryffindor lordship',
          category: 'foundership',
          fandom_id: testFandomId,
          parent_id: child1.id,
          is_active: true,
        },
        {
          name: 'Multiple House Control',
          description: 'Controlling multiple houses',
          category: 'control',
          fandom_id: testFandomId,
          parent_id: child2.id,
          is_active: true,
        },
        {
          name: 'Hogwarts Control',
          description: 'Gaining control of Hogwarts',
          category: 'control',
          fandom_id: testFandomId,
          parent_id: child2.id,
          is_active: true,
        },
      ]);

      rootPlotBlockId = root.id;
    });

    it('should retrieve all root plot blocks', async () => {
      // Act
      const rootBlocks = await db
        .select()
        .from(plotBlocks)
        .where(
          and(
            eq(plotBlocks.fandom_id, testFandomId),
            isNull(plotBlocks.parent_id),
            eq(plotBlocks.is_active, true)
          )
        );

      // Assert
      expect(rootBlocks).toHaveLength(1);
      expect(rootBlocks[0].name).toBe('Goblin Inheritance');
      expect(rootBlocks[0].parent_id).toBeNull();
    });

    it('should retrieve all children of a specific parent', async () => {
      // Act
      const children = await db
        .select()
        .from(plotBlocks)
        .where(
          and(
            eq(plotBlocks.parent_id, rootPlotBlockId),
            eq(plotBlocks.is_active, true)
          )
        );

      // Assert
      expect(children).toHaveLength(2);
      expect(children.some(child => child.name === 'Black Lordship')).toBe(
        true
      );
      expect(children.some(child => child.name === 'Potter Heritage')).toBe(
        true
      );
    });

    it('should retrieve complete tree structure with recursive CTE', async () => {
      // Act - Use recursive CTE to get entire tree
      const treeQuery = sql`
        WITH RECURSIVE plot_block_tree AS (
          -- Base case: root nodes
          SELECT
            id, name, fandom_id, parent_id, description, category,
            is_active, created_at, updated_at,
            0 as depth,
            CAST(name AS TEXT) as path
          FROM ${plotBlocks}
          WHERE fandom_id = ${testFandomId}
            AND parent_id IS NULL
            AND is_active = true

          UNION ALL

          -- Recursive case: child nodes
          SELECT
            pb.id, pb.name, pb.fandom_id, pb.parent_id, pb.description, pb.category,
            pb.is_active, pb.created_at, pb.updated_at,
            pbt.depth + 1,
            pbt.path || ' -> ' || pb.name
          FROM ${plotBlocks} pb
          INNER JOIN plot_block_tree pbt ON pb.parent_id = pbt.id
          WHERE pb.fandom_id = ${testFandomId}
            AND pb.is_active = true
        )
        SELECT * FROM plot_block_tree
        ORDER BY depth, parent_id, name
      `;

      const treeResults = await db.execute(treeQuery);

      // Assert
      expect(treeResults.length).toBeGreaterThan(0);

      // Check depth levels
      const rootNodes = treeResults.filter((node: any) => node.depth === 0);
      const firstLevel = treeResults.filter((node: any) => node.depth === 1);
      const secondLevel = treeResults.filter((node: any) => node.depth === 2);

      expect(rootNodes).toHaveLength(1);
      expect(firstLevel).toHaveLength(2);
      expect(secondLevel).toHaveLength(3);

      // Check paths
      const pathNodes = treeResults.filter((node: any) =>
        node.path.includes('->')
      );
      expect(pathNodes.length).toBeGreaterThan(0);
    });

    it('should calculate tree statistics efficiently', async () => {
      // Act
      const [stats] = await db.execute(sql`
        WITH RECURSIVE depth_calc AS (
          SELECT id, 0 as depth
          FROM ${plotBlocks}
          WHERE fandom_id = ${testFandomId} AND parent_id IS NULL AND is_active = true

          UNION ALL

          SELECT pb.id, dc.depth + 1
          FROM ${plotBlocks} pb
          INNER JOIN depth_calc dc ON pb.parent_id = dc.id
          WHERE pb.fandom_id = ${testFandomId} AND pb.is_active = true
        ),
        stats AS (
          SELECT
            COUNT(*) as total_nodes,
            MAX(depth) as max_depth,
            COUNT(CASE WHEN depth = 0 THEN 1 END) as root_nodes,
            AVG(CAST(depth AS FLOAT)) as avg_depth
          FROM depth_calc
        )
        SELECT * FROM stats
      `);

      // Assert
      expect(stats).toBeDefined();
      expect((stats as any).total_nodes).toBe(6); // 1 root + 2 children + 3 grandchildren
      expect((stats as any).max_depth).toBe(2);
      expect((stats as any).root_nodes).toBe(1);
    });
  });

  describe('Tree Integrity and Constraints', () => {
    beforeEach(async () => {
      // Create basic hierarchy for constraint testing
      const [root] = await db
        .insert(plotBlocks)
        .values({
          name: 'Test Root',
          description: 'Root for constraint testing',
          category: 'inheritance',
          fandom_id: testFandomId,
          parent_id: null,
          is_active: true,
        })
        .returning();

      const [child] = await db
        .insert(plotBlocks)
        .values({
          name: 'Test Child',
          description: 'Child for constraint testing',
          category: 'lordship',
          fandom_id: testFandomId,
          parent_id: root.id,
          is_active: true,
        })
        .returning();

      rootPlotBlockId = root.id;
      childPlotBlockId = child.id;
    });

    it('should prevent circular dependencies', async () => {
      // Arrange - Create grandchild
      const [grandchild] = await db
        .insert(plotBlocks)
        .values({
          name: 'Test Grandchild',
          description: 'Grandchild for circular dependency test',
          category: 'specific',
          fandom_id: testFandomId,
          parent_id: childPlotBlockId,
          is_active: true,
        })
        .returning();

      // Act & Assert - Try to create circular dependency (grandchild -> root)
      await expect(
        db
          .update(plotBlocks)
          .set({ parent_id: grandchild.id })
          .where(eq(plotBlocks.id, rootPlotBlockId))
      ).rejects.toThrow(); // Should fail on circular dependency check
    });

    it('should handle deletion of parent nodes properly', async () => {
      // Arrange - Verify child exists
      const [childBefore] = await db
        .select()
        .from(plotBlocks)
        .where(eq(plotBlocks.id, childPlotBlockId));
      expect(childBefore.parent_id).toBe(rootPlotBlockId);

      // Act - Delete parent (soft delete by setting inactive)
      await db
        .update(plotBlocks)
        .set({ is_active: false })
        .where(eq(plotBlocks.id, rootPlotBlockId));

      // Assert - Child should remain but orphaned queries should handle this
      const [childAfter] = await db
        .select()
        .from(plotBlocks)
        .where(eq(plotBlocks.id, childPlotBlockId));

      expect(childAfter).toBeDefined();
      expect(childAfter.parent_id).toBe(rootPlotBlockId); // Still references inactive parent

      // Active children with inactive parents should be handled in application logic
      const activeChildrenWithActiveParents = await db
        .select()
        .from(plotBlocks)
        .innerJoin(
          sql`${plotBlocks} as parent_blocks`,
          sql`${plotBlocks}.parent_id = parent_blocks.id AND parent_blocks.is_active = true`
        )
        .where(
          and(
            eq(plotBlocks.fandom_id, testFandomId),
            eq(plotBlocks.is_active, true)
          )
        );

      expect(activeChildrenWithActiveParents).toHaveLength(0); // Child excluded due to inactive parent
    });

    it('should maintain referential integrity during updates', async () => {
      // Arrange - Create another root to move child to
      const [newRoot] = await db
        .insert(plotBlocks)
        .values({
          name: 'New Root',
          description: 'New root for moving child',
          category: 'inheritance',
          fandom_id: testFandomId,
          parent_id: null,
          is_active: true,
        })
        .returning();

      // Act - Move child to new parent
      const [updatedChild] = await db
        .update(plotBlocks)
        .set({
          parent_id: newRoot.id,
          updated_at: new Date(),
        })
        .where(eq(plotBlocks.id, childPlotBlockId))
        .returning();

      // Assert
      expect(updatedChild.parent_id).toBe(newRoot.id);

      // Verify tree structure is maintained
      const newRootChildren = await db
        .select()
        .from(plotBlocks)
        .where(eq(plotBlocks.parent_id, newRoot.id));

      expect(newRootChildren).toHaveLength(1);
      expect(newRootChildren[0].id).toBe(childPlotBlockId);
    });
  });

  describe('Complex Tree Operations', () => {
    it('should handle moving entire subtrees', async () => {
      // Arrange - Create complex hierarchy
      const [root1] = await db
        .insert(plotBlocks)
        .values({
          name: 'Root 1',
          description: 'First root',
          category: 'inheritance',
          fandom_id: testFandomId,
          parent_id: null,
          is_active: true,
        })
        .returning();

      const [root2] = await db
        .insert(plotBlocks)
        .values({
          name: 'Root 2',
          description: 'Second root',
          category: 'inheritance',
          fandom_id: testFandomId,
          parent_id: null,
          is_active: true,
        })
        .returning();

      const [subtreeRoot] = await db
        .insert(plotBlocks)
        .values({
          name: 'Subtree Root',
          description: 'Root of subtree to move',
          category: 'lordship',
          fandom_id: testFandomId,
          parent_id: root1.id,
          is_active: true,
        })
        .returning();

      await db.insert(plotBlocks).values([
        {
          name: 'Subtree Child 1',
          description: 'First child of subtree',
          category: 'specific',
          fandom_id: testFandomId,
          parent_id: subtreeRoot.id,
          is_active: true,
        },
        {
          name: 'Subtree Child 2',
          description: 'Second child of subtree',
          category: 'specific',
          fandom_id: testFandomId,
          parent_id: subtreeRoot.id,
          is_active: true,
        },
      ]);

      // Act - Move subtree from root1 to root2
      await db
        .update(plotBlocks)
        .set({ parent_id: root2.id })
        .where(eq(plotBlocks.id, subtreeRoot.id));

      // Assert - Verify subtree is now under root2
      const root2Children = await db
        .select()
        .from(plotBlocks)
        .where(eq(plotBlocks.parent_id, root2.id));

      expect(root2Children).toHaveLength(1);
      expect(root2Children[0].name).toBe('Subtree Root');

      // Verify grandchildren are still under subtree root
      const subtreeChildren = await db
        .select()
        .from(plotBlocks)
        .where(eq(plotBlocks.parent_id, subtreeRoot.id));

      expect(subtreeChildren).toHaveLength(2);
    });

    it('should support tree pruning operations', async () => {
      // Arrange - Create tree with some nodes to prune
      const [root] = await db
        .insert(plotBlocks)
        .values({
          name: 'Pruning Root',
          description: 'Root for pruning test',
          category: 'inheritance',
          fandom_id: testFandomId,
          parent_id: null,
          is_active: true,
        })
        .returning();

      const branches = await db
        .insert(plotBlocks)
        .values([
          {
            name: 'Keep Branch',
            description: 'Branch to keep',
            category: 'lordship',
            fandom_id: testFandomId,
            parent_id: root.id,
            is_active: true,
          },
          {
            name: 'Prune Branch',
            description: 'Branch to prune',
            category: 'lordship',
            fandom_id: testFandomId,
            parent_id: root.id,
            is_active: true,
          },
        ])
        .returning();

      // Add children to both branches
      await db.insert(plotBlocks).values([
        {
          name: 'Keep Child',
          description: 'Child to keep',
          category: 'specific',
          fandom_id: testFandomId,
          parent_id: branches[0].id,
          is_active: true,
        },
        {
          name: 'Prune Child',
          description: 'Child to prune',
          category: 'specific',
          fandom_id: testFandomId,
          parent_id: branches[1].id,
          is_active: true,
        },
      ]);

      // Act - Prune one branch (soft delete)
      await db
        .update(plotBlocks)
        .set({ is_active: false })
        .where(eq(plotBlocks.id, branches[1].id));

      // Also deactivate its children
      await db
        .update(plotBlocks)
        .set({ is_active: false })
        .where(eq(plotBlocks.parent_id, branches[1].id));

      // Assert - Only active branch and its children remain
      const activeTree = await db
        .select()
        .from(plotBlocks)
        .where(
          and(
            eq(plotBlocks.fandom_id, testFandomId),
            eq(plotBlocks.is_active, true)
          )
        );

      const activeNames = activeTree.map(node => node.name);
      expect(activeNames).toContain('Pruning Root');
      expect(activeNames).toContain('Keep Branch');
      expect(activeNames).toContain('Keep Child');
      expect(activeNames).not.toContain('Prune Branch');
      expect(activeNames).not.toContain('Prune Child');
    });
  });

  describe('Performance Validation', () => {
    it('should complete plot block creation within performance requirements', async () => {
      // Arrange
      const startTime = performance.now();

      const plotBlockData = {
        name: 'Performance Test Plot Block',
        description: 'Testing plot block creation performance',
        category: 'performance',
        fandom_id: testFandomId,
        parent_id: null,
        is_active: true,
      };

      // Act
      const [createdPlotBlock] = await db
        .insert(plotBlocks)
        .values(plotBlockData)
        .returning();
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50); // <50ms requirement
      expect(createdPlotBlock).toBeDefined();
    });

    it('should complete tree traversal within performance requirements', async () => {
      // Arrange - Create a deeper tree for performance testing
      let currentParent = null;

      // Create 5-level deep tree
      for (let level = 0; level < 5; level++) {
        const [node] = await db
          .insert(plotBlocks)
          .values({
            name: `Performance Level ${level}`,
            description: `Node at level ${level}`,
            category: level === 0 ? 'inheritance' : 'lordship',
            fandom_id: testFandomId,
            parent_id: currentParent,
            is_active: true,
          })
          .returning();

        currentParent = node.id;
      }

      const startTime = performance.now();

      // Act - Perform tree traversal query
      const treeQuery = sql`
        WITH RECURSIVE plot_block_tree AS (
          SELECT
            id, name, parent_id, 0 as depth
          FROM ${plotBlocks}
          WHERE fandom_id = ${testFandomId}
            AND parent_id IS NULL
            AND is_active = true

          UNION ALL

          SELECT
            pb.id, pb.name, pb.parent_id, pbt.depth + 1
          FROM ${plotBlocks} pb
          INNER JOIN plot_block_tree pbt ON pb.parent_id = pbt.id
          WHERE pb.fandom_id = ${testFandomId}
            AND pb.is_active = true
        )
        SELECT * FROM plot_block_tree
        ORDER BY depth
      `;

      const results = await db.execute(treeQuery);
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100); // Reasonable performance for tree traversal
      expect(results.length).toBe(5); // 5 levels
    });

    it('should handle bulk plot block operations efficiently', async () => {
      // Arrange
      const startTime = performance.now();

      const bulkData = Array.from({ length: 20 }, (_, i) => ({
        name: `Bulk Plot Block ${i}`,
        description: `Bulk created plot block ${i}`,
        category: 'bulk',
        fandom_id: testFandomId,
        parent_id: null,
        is_active: true,
      }));

      // Act
      const createdBlocks = await db
        .insert(plotBlocks)
        .values(bulkData)
        .returning();
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(200); // Reasonable performance for bulk operation
      expect(createdBlocks).toHaveLength(20);
    });
  });
});
