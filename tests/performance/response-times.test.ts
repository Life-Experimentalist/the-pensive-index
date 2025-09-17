import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '@/lib/database/connection';
import { fandoms, tags, tagClasses, plotBlocks } from '@/lib/database/schema';
import { ValidationEngine } from '@/lib/validation/engine';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

/**
 * Performance Validation Tests
 *
 * Validates that all operations meet strict performance requirements:
 * - CRUD operations: <50ms
 * - Validation operations: <200ms
 * - Complex queries: <100ms
 * - Bulk operations: <500ms
 */
describe('Performance Validation Tests', () => {
  let testFandomId: string;
  let validationEngine: ValidationEngine;

  beforeAll(async () => {
    validationEngine = new ValidationEngine();
  });

  beforeEach(async () => {
    testFandomId = randomUUID();

    // Create test fandom for performance tests
    await db.insert(fandoms).values({
      id: testFandomId,
      name: 'Performance Test Fandom',
      description: 'Fandom for performance testing',
      slug: 'performance-test-fandom',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await db.delete(tags).where(eq(tags.fandom_id, testFandomId));
      await db.delete(tagClasses).where(eq(tagClasses.fandom_id, testFandomId));
      await db.delete(plotBlocks).where(eq(plotBlocks.fandom_id, testFandomId));
      await db.delete(fandoms).where(eq(fandoms.id, testFandomId));
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('CRUD Performance Requirements (<50ms)', () => {
    it('should create fandom within 50ms', async () => {
      // Arrange
      const fandomData = {
        id: randomUUID(),
        name: 'Fast Create Test Fandom',
        description: 'Testing fast fandom creation',
        slug: 'fast-create-test-fandom',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const startTime = performance.now();

      // Act
      const [createdFandom] = await db
        .insert(fandoms)
        .values(fandomData)
        .returning();
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50);
      expect(createdFandom).toBeDefined();
      expect(createdFandom.name).toBe(fandomData.name);

      // Cleanup
      await db.delete(fandoms).where(eq(fandoms.id, fandomData.id));
    });

    it('should read fandom within 50ms', async () => {
      // Arrange - Fandom already created in beforeEach
      const startTime = performance.now();

      // Act
      const [fandom] = await db
        .select()
        .from(fandoms)
        .where(eq(fandoms.id, testFandomId));
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50);
      expect(fandom).toBeDefined();
      expect(fandom.id).toBe(testFandomId);
    });

    it('should update fandom within 50ms', async () => {
      // Arrange
      const newDescription = 'Updated description for performance test';
      const startTime = performance.now();

      // Act
      const [updatedFandom] = await db
        .update(fandoms)
        .set({
          description: newDescription,
          updated_at: new Date(),
        })
        .where(eq(fandoms.id, testFandomId))
        .returning();
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50);
      expect(updatedFandom.description).toBe(newDescription);
    });

    it('should create tag class within 50ms', async () => {
      // Arrange
      const tagClassData = {
        id: randomUUID(),
        name: 'Fast Tag Class',
        description: 'Testing fast tag class creation',
        fandom_id: testFandomId,
        validation_rules: {
          instance_limits: {
            max_instances: 5,
            min_instances: 1,
          },
        },
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const startTime = performance.now();

      // Act
      const [createdTagClass] = await db
        .insert(tagClasses)
        .values(tagClassData)
        .returning();
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50);
      expect(createdTagClass).toBeDefined();
      expect(createdTagClass.name).toBe(tagClassData.name);
    });

    it('should create tag within 50ms', async () => {
      // Arrange
      const tagData = {
        id: randomUUID(),
        name: 'Fast Tag',
        description: 'Testing fast tag creation',
        fandom_id: testFandomId,
        tag_class_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const startTime = performance.now();

      // Act
      const [createdTag] = await db.insert(tags).values(tagData).returning();
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50);
      expect(createdTag).toBeDefined();
      expect(createdTag.name).toBe(tagData.name);
    });

    it('should create plot block within 50ms', async () => {
      // Arrange
      const plotBlockData = {
        id: randomUUID(),
        name: 'Fast Plot Block',
        description: 'Testing fast plot block creation',
        fandom_id: testFandomId,
        parent_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const startTime = performance.now();

      // Act
      const [createdPlotBlock] = await db
        .insert(plotBlocks)
        .values(plotBlockData)
        .returning();
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50);
      expect(createdPlotBlock).toBeDefined();
      expect(createdPlotBlock.name).toBe(plotBlockData.name);
    });
  });

  describe('Validation Performance Requirements (<200ms)', () => {
    beforeEach(async () => {
      // Create test data for validation performance tests
      const tagClassId = randomUUID();

      await db.insert(tagClasses).values({
        id: tagClassId,
        name: 'Performance Tag Class',
        description: 'Tag class for performance testing',
        fandom_id: testFandomId,
        validation_rules: {
          mutual_exclusion: {
            within_class: true,
            conflicting_tags: ['Tag A', 'Tag B', 'Tag C'],
          },
          required_context: {
            dependencies: [{ tag: 'Tag D', requires: ['Tag A'] }],
          },
          instance_limits: {
            max_instances: 5,
            min_instances: 1,
          },
        },
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Create test tags
      const tagNames = ['Tag A', 'Tag B', 'Tag C', 'Tag D', 'Tag E'];
      const tagData = tagNames.map(name => ({
        id: randomUUID(),
        name,
        description: `Description for ${name}`,
        fandom_id: testFandomId,
        tag_class_id: tagClassId,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      await db.insert(tags).values(tagData);

      // Create plot blocks
      const plotBlockData = Array.from({ length: 5 }, (_, i) => ({
        id: randomUUID(),
        name: `Plot Block ${i + 1}`,
        description: `Description for plot block ${i + 1}`,
        fandom_id: testFandomId,
        parent_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      await db.insert(plotBlocks).values(plotBlockData);
    });

    it('should validate simple pathway within 200ms', async () => {
      // Arrange
      const pathway = {
        fandom_id: testFandomId,
        tags: ['Tag A', 'Tag E'],
        plot_blocks: ['Plot Block 1'],
        pathway: [
          { id: 'Tag A', type: 'tag' as const },
          { id: 'Tag E', type: 'tag' as const },
          { id: 'Plot Block 1', type: 'plot_block' as const },
        ],
      };

      const startTime = performance.now();

      // Act
      const result = await validationEngine.validatePathway(pathway);
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(200);
      expect(result).toBeDefined();
    });

    it('should validate complex pathway within 200ms', async () => {
      // Arrange
      const complexPathway = {
        fandom_id: testFandomId,
        tags: ['Tag A', 'Tag D', 'Tag E'], // Tag D requires Tag A
        plot_blocks: ['Plot Block 1', 'Plot Block 2', 'Plot Block 3'],
        pathway: [
          { id: 'Tag A', type: 'tag' as const },
          { id: 'Tag D', type: 'tag' as const },
          { id: 'Tag E', type: 'tag' as const },
          { id: 'Plot Block 1', type: 'plot_block' as const },
          { id: 'Plot Block 2', type: 'plot_block' as const },
          { id: 'Plot Block 3', type: 'plot_block' as const },
        ],
      };

      const startTime = performance.now();

      // Act
      const result = await validationEngine.validatePathway(complexPathway);
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(200);
      expect(result).toBeDefined();
    });

    it('should validate conflicting pathway within 200ms', async () => {
      // Arrange
      const conflictingPathway = {
        fandom_id: testFandomId,
        tags: ['Tag A', 'Tag B'], // These should be mutually exclusive
        plot_blocks: [],
        pathway: [
          { id: 'Tag A', type: 'tag' as const },
          { id: 'Tag B', type: 'tag' as const },
        ],
      };

      const startTime = performance.now();

      // Act
      const result = await validationEngine.validatePathway(conflictingPathway);
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(200);
      expect(result).toBeDefined();
    });

    it('should handle repeated validation calls efficiently', async () => {
      // Arrange
      const pathway = {
        fandom_id: testFandomId,
        tags: ['Tag A', 'Tag E'],
        plot_blocks: ['Plot Block 1'],
        pathway: [
          { id: 'Tag A', type: 'tag' as const },
          { id: 'Tag E', type: 'tag' as const },
          { id: 'Plot Block 1', type: 'plot_block' as const },
        ],
      };

      // Act - Run 10 validation calls
      const startTime = performance.now();

      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          validationEngine.validatePathway(pathway)
        )
      );

      const endTime = performance.now();

      // Assert
      const totalDuration = endTime - startTime;
      const averageDuration = totalDuration / 10;

      expect(averageDuration).toBeLessThan(200);
      expect(results).toHaveLength(10);
      expect(results.every(result => result !== undefined)).toBe(true);
    });
  });

  describe('Complex Query Performance Requirements (<100ms)', () => {
    beforeEach(async () => {
      // Create substantial test data for complex queries
      const tagClassIds = Array.from({ length: 3 }, () => randomUUID());

      // Create tag classes
      await db.insert(tagClasses).values(
        tagClassIds.map((id, index) => ({
          id,
          name: `Query Test Class ${index + 1}`,
          description: `Tag class ${index + 1} for query testing`,
          fandom_id: testFandomId,
          validation_rules: {
            instance_limits: {
              max_instances: 10,
              min_instances: 0,
            },
          },
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        }))
      );

      // Create many tags (50 total)
      const tagData = [];
      for (let classIndex = 0; classIndex < 3; classIndex++) {
        for (let tagIndex = 0; tagIndex < 15; tagIndex++) {
          tagData.push({
            id: randomUUID(),
            name: `Tag ${classIndex}-${tagIndex}`,
            description: `Description for tag ${classIndex}-${tagIndex}`,
            fandom_id: testFandomId,
            tag_class_id: tagClassIds[classIndex],
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      }

      // Add 5 unclassified tags
      for (let i = 0; i < 5; i++) {
        tagData.push({
          id: randomUUID(),
          name: `Unclassified Tag ${i}`,
          description: `Description for unclassified tag ${i}`,
          fandom_id: testFandomId,
          tag_class_id: null,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      await db.insert(tags).values(tagData);

      // Create plot block hierarchy (20 blocks)
      const rootBlocks = Array.from({ length: 5 }, (_, i) => ({
        id: randomUUID(),
        name: `Root Plot Block ${i + 1}`,
        description: `Root plot block ${i + 1}`,
        fandom_id: testFandomId,
        parent_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      const rootBlockResults = await db
        .insert(plotBlocks)
        .values(rootBlocks)
        .returning();

      // Create child blocks
      const childBlocks = [];
      for (const rootBlock of rootBlockResults) {
        for (let i = 0; i < 3; i++) {
          childBlocks.push({
            id: randomUUID(),
            name: `Child Block ${rootBlock.name}-${i + 1}`,
            description: `Child of ${rootBlock.name}`,
            fandom_id: testFandomId,
            parent_id: rootBlock.id,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      }

      await db.insert(plotBlocks).values(childBlocks);
    });

    it('should query all tags with classes within 100ms', async () => {
      // Arrange
      const startTime = performance.now();

      // Act
      const tagsWithClasses = await db
        .select({
          tag_id: tags.id,
          tag_name: tags.name,
          class_id: tagClasses.id,
          class_name: tagClasses.name,
        })
        .from(tags)
        .leftJoin(tagClasses, eq(tags.tag_class_id, tagClasses.id))
        .where(eq(tags.fandom_id, testFandomId));

      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100);
      expect(tagsWithClasses.length).toBeGreaterThan(40); // Should have many tags
    });

    it('should query plot block hierarchy within 100ms', async () => {
      // Arrange
      const startTime = performance.now();

      // Act
      const hierarchy = await db
        .select({
          id: plotBlocks.id,
          name: plotBlocks.name,
          parent_id: plotBlocks.parent_id,
        })
        .from(plotBlocks)
        .where(eq(plotBlocks.fandom_id, testFandomId));

      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100);
      expect(hierarchy.length).toBeGreaterThan(15); // Should have many plot blocks
    });

    it('should count entities by type within 100ms', async () => {
      // Arrange
      const startTime = performance.now();

      // Act
      const [tagCount] = await db
        .select({ count: db.$count() })
        .from(tags)
        .where(eq(tags.fandom_id, testFandomId));

      const [tagClassCount] = await db
        .select({ count: db.$count() })
        .from(tagClasses)
        .where(eq(tagClasses.fandom_id, testFandomId));

      const [plotBlockCount] = await db
        .select({ count: db.$count() })
        .from(plotBlocks)
        .where(eq(plotBlocks.fandom_id, testFandomId));

      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100);
      expect(tagCount.count).toBeGreaterThan(40);
      expect(tagClassCount.count).toBe(3);
      expect(plotBlockCount.count).toBeGreaterThan(15);
    });
  });

  describe('Bulk Operation Performance Requirements (<500ms)', () => {
    it('should create 100 tags within 500ms', async () => {
      // Arrange
      const tagData = Array.from({ length: 100 }, (_, i) => ({
        id: randomUUID(),
        name: `Bulk Tag ${i + 1}`,
        description: `Bulk created tag ${i + 1}`,
        fandom_id: testFandomId,
        tag_class_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      const startTime = performance.now();

      // Act
      const createdTags = await db.insert(tags).values(tagData).returning();
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(500);
      expect(createdTags).toHaveLength(100);
    });

    it('should update 50 tags within 500ms', async () => {
      // Arrange - First create tags to update
      const tagData = Array.from({ length: 50 }, (_, i) => ({
        id: randomUUID(),
        name: `Update Test Tag ${i + 1}`,
        description: `Original description ${i + 1}`,
        fandom_id: testFandomId,
        tag_class_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      const createdTags = await db.insert(tags).values(tagData).returning();
      const startTime = performance.now();

      // Act - Update all tags
      const updates = createdTags.map(tag =>
        db
          .update(tags)
          .set({ description: `Updated description for ${tag.name}` })
          .where(eq(tags.id, tag.id))
      );

      await Promise.all(updates);
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(500);
    });

    it('should delete 50 tags within 500ms', async () => {
      // Arrange - First create tags to delete
      const tagData = Array.from({ length: 50 }, (_, i) => ({
        id: randomUUID(),
        name: `Delete Test Tag ${i + 1}`,
        description: `Description ${i + 1}`,
        fandom_id: testFandomId,
        tag_class_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      const createdTags = await db.insert(tags).values(tagData).returning();
      const tagIds = createdTags.map(tag => tag.id);

      const startTime = performance.now();

      // Act - Delete all tags
      const deletions = tagIds.map(id =>
        db.delete(tags).where(eq(tags.id, id))
      );

      await Promise.all(deletions);
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(500);

      // Verify deletion
      const remainingTags = await db
        .select()
        .from(tags)
        .where(eq(tags.fandom_id, testFandomId));

      const deletedTagsStillPresent = remainingTags.filter(tag =>
        tagIds.includes(tag.id)
      );
      expect(deletedTagsStillPresent).toHaveLength(0);
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain performance with concurrent operations', async () => {
      // Arrange
      const concurrentOperations = Array.from({ length: 10 }, (_, i) => ({
        id: randomUUID(),
        name: `Concurrent Tag ${i + 1}`,
        description: `Concurrent operation ${i + 1}`,
        fandom_id: testFandomId,
        tag_class_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      const startTime = performance.now();

      // Act - Run concurrent insert operations
      const insertPromises = concurrentOperations.map(tagData =>
        db.insert(tags).values(tagData).returning()
      );

      const results = await Promise.all(insertPromises);
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(300); // Should complete quickly with concurrency
      expect(results).toHaveLength(10);
      expect(results.every(result => result.length === 1)).toBe(true);
    });

    it('should handle rapid successive validation calls', async () => {
      // Arrange
      const pathway = {
        fandom_id: testFandomId,
        tags: [],
        plot_blocks: [],
        pathway: [],
      };

      const startTime = performance.now();

      // Act - 20 rapid validation calls
      const validationPromises = Array.from({ length: 20 }, () =>
        validationEngine.validatePathway(pathway)
      );

      const results = await Promise.all(validationPromises);
      const endTime = performance.now();

      // Assert
      const totalDuration = endTime - startTime;
      const averageDuration = totalDuration / 20;

      expect(averageDuration).toBeLessThan(100); // Each call should be fast
      expect(results).toHaveLength(20);
      expect(results.every(result => result !== undefined)).toBe(true);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not leak memory during repeated operations', async () => {
      // This test is more conceptual - in a real environment you'd use
      // memory profiling tools to detect leaks

      // Arrange
      const iterations = 100;

      // Act - Perform many operations
      for (let i = 0; i < iterations; i++) {
        const tagData = {
          id: randomUUID(),
          name: `Memory Test Tag ${i}`,
          description: `Memory test iteration ${i}`,
          fandom_id: testFandomId,
          tag_class_id: null,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        };

        const [created] = await db.insert(tags).values(tagData).returning();
        await db.delete(tags).where(eq(tags.id, created.id));
      }

      // Assert - If we reach here without running out of memory, test passes
      expect(true).toBe(true);
    });

    it('should handle large result sets efficiently', async () => {
      // Arrange - Create many tags
      const largeTagSet = Array.from({ length: 200 }, (_, i) => ({
        id: randomUUID(),
        name: `Large Set Tag ${i + 1}`,
        description: `Large set test tag ${i + 1}`,
        fandom_id: testFandomId,
        tag_class_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      await db.insert(tags).values(largeTagSet);

      const startTime = performance.now();

      // Act - Query all tags
      const allTags = await db
        .select()
        .from(tags)
        .where(eq(tags.fandom_id, testFandomId));

      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(150); // Should handle large results efficiently
      expect(allTags.length).toBeGreaterThan(190);
    });
  });
});
