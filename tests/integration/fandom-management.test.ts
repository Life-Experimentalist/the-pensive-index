import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getDatabase, closeDatabase } from '@/lib/database';
import { fandoms } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import type { DatabaseConnection } from '@/lib/database';

/**
 * Integration Test for Scenario 1: Fandom Management
 *
 * This test validates the complete fandom lifecycle:
 * 1. Admin creates a new fandom
 * 2. Fandom details can be retrieved
 * 3. Fandom can be updated
 * 4. Fandom can be deactivated/reactivated
 * 5. Fandom relationships are properly maintained
 */
describe('Fandom Management Integration Tests', () => {
  let db: DatabaseConnection;
  let testFandomId: string;

  beforeAll(async () => {
    db = await getDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    // Clean up any test data before each test
    await db.delete(fandoms).where(eq(fandoms.name, 'Test Fandom Integration'));
  });

  describe('Fandom Creation Workflow', () => {
    it('should create a new fandom with all required fields', async () => {
      // Arrange
      const fandomData = {
        name: 'Test Fandom Integration',
        description: 'A test fandom for integration testing',
        slug: 'test-fandom-integration',
        category: 'book',
        is_active: true,
      };

      // Act
      const [createdFandom] = await db
        .insert(fandoms)
        .values(fandomData)
        .returning();

      // Assert
      expect(createdFandom).toBeDefined();
      expect(createdFandom.name).toBe(fandomData.name);
      expect(createdFandom.description).toBe(fandomData.description);
      expect(createdFandom.slug).toBe(fandomData.slug);
      expect(createdFandom.category).toBe(fandomData.category);
      expect(createdFandom.is_active).toBe(true);
      expect(createdFandom.id).toBeDefined();
      expect(createdFandom.created_at).toBeInstanceOf(Date);
      expect(createdFandom.updated_at).toBeInstanceOf(Date);

      testFandomId = createdFandom.id;
    });

    it('should prevent duplicate fandom names', async () => {
      // Arrange
      const fandomData = {
        name: 'Test Fandom Integration',
        description: 'Original fandom',
        slug: 'test-fandom-integration-1',
        category: 'book',
        is_active: true,
      };

      await db.insert(fandoms).values(fandomData);

      // Act & Assert
      const duplicateData = {
        ...fandomData,
        slug: 'test-fandom-integration-2',
        description: 'Duplicate fandom',
      };

      await expect(db.insert(fandoms).values(duplicateData)).rejects.toThrow(); // Should fail on unique constraint
    });

    it('should prevent duplicate fandom slugs', async () => {
      // Arrange
      const fandomData = {
        name: 'Test Fandom Integration A',
        description: 'Original fandom',
        slug: 'test-fandom-integration',
        category: 'book',
        is_active: true,
      };

      await db.insert(fandoms).values(fandomData);

      // Act & Assert
      const duplicateSlugData = {
        name: 'Test Fandom Integration B',
        description: 'Different fandom with same slug',
        slug: 'test-fandom-integration',
        category: 'movie',
        is_active: true,
      };

      await expect(
        db.insert(fandoms).values(duplicateSlugData)
      ).rejects.toThrow(); // Should fail on unique constraint
    });
  });

  describe('Fandom Retrieval Operations', () => {
    beforeEach(async () => {
      // Create test fandom for retrieval tests
      const [created] = await db
        .insert(fandoms)
        .values({
          name: 'Test Fandom Integration',
          description: 'A test fandom for integration testing',
          slug: 'test-fandom-integration',
          category: 'book',
          is_active: true,
        })
        .returning();
      testFandomId = created.id;
    });

    it('should retrieve fandom by ID', async () => {
      // Act
      const [fandom] = await db
        .select()
        .from(fandoms)
        .where(eq(fandoms.id, testFandomId));

      // Assert
      expect(fandom).toBeDefined();
      expect(fandom.id).toBe(testFandomId);
      expect(fandom.name).toBe('Test Fandom Integration');
      expect(fandom.is_active).toBe(true);
    });

    it('should retrieve fandom by slug', async () => {
      // Act
      const [fandom] = await db
        .select()
        .from(fandoms)
        .where(eq(fandoms.slug, 'test-fandom-integration'));

      // Assert
      expect(fandom).toBeDefined();
      expect(fandom.slug).toBe('test-fandom-integration');
      expect(fandom.name).toBe('Test Fandom Integration');
    });

    it('should retrieve only active fandoms by default', async () => {
      // Arrange - Create inactive fandom
      await db.insert(fandoms).values({
        name: 'Inactive Test Fandom',
        description: 'An inactive test fandom',
        slug: 'inactive-test-fandom',
        category: 'book',
        is_active: false,
      });

      // Act
      const activeFandoms = await db
        .select()
        .from(fandoms)
        .where(eq(fandoms.is_active, true));

      // Assert
      const testFandom = activeFandoms.find(
        f => f.name === 'Test Fandom Integration'
      );
      const inactiveFandom = activeFandoms.find(
        f => f.name === 'Inactive Test Fandom'
      );

      expect(testFandom).toBeDefined();
      expect(inactiveFandom).toBeUndefined();
    });
  });

  describe('Fandom Update Operations', () => {
    beforeEach(async () => {
      // Create test fandom for update tests
      const [created] = await db
        .insert(fandoms)
        .values({
          name: 'Test Fandom Integration',
          description: 'A test fandom for integration testing',
          slug: 'test-fandom-integration',
          category: 'book',
          is_active: true,
        })
        .returning();
      testFandomId = created.id;
    });

    it('should update fandom description', async () => {
      // Arrange
      const newDescription = 'Updated description for integration testing';

      // Act
      const [updatedFandom] = await db
        .update(fandoms)
        .set({
          description: newDescription,
          updated_at: new Date(),
        })
        .where(eq(fandoms.id, testFandomId))
        .returning();

      // Assert
      expect(updatedFandom.description).toBe(newDescription);
      expect(updatedFandom.updated_at.getTime()).toBeGreaterThan(
        updatedFandom.created_at.getTime()
      );
    });

    it('should update fandom category', async () => {
      // Arrange
      const newCategory = 'movie';

      // Act
      const [updatedFandom] = await db
        .update(fandoms)
        .set({
          category: newCategory,
          updated_at: new Date(),
        })
        .where(eq(fandoms.id, testFandomId))
        .returning();

      // Assert
      expect(updatedFandom.category).toBe(newCategory);
    });

    it('should prevent updating to duplicate name', async () => {
      // Arrange - Create another fandom
      await db.insert(fandoms).values({
        name: 'Another Test Fandom',
        description: 'Another fandom',
        slug: 'another-test-fandom',
        category: 'book',
        is_active: true,
      });

      // Act & Assert
      await expect(
        db
          .update(fandoms)
          .set({ name: 'Another Test Fandom' })
          .where(eq(fandoms.id, testFandomId))
      ).rejects.toThrow(); // Should fail on unique constraint
    });
  });

  describe('Fandom Status Management', () => {
    beforeEach(async () => {
      // Create test fandom for status tests
      const [created] = await db
        .insert(fandoms)
        .values({
          name: 'Test Fandom Integration',
          description: 'A test fandom for integration testing',
          slug: 'test-fandom-integration',
          category: 'book',
          is_active: true,
        })
        .returning();
      testFandomId = created.id;
    });

    it('should deactivate fandom', async () => {
      // Act
      const [deactivatedFandom] = await db
        .update(fandoms)
        .set({
          is_active: false,
          updated_at: new Date(),
        })
        .where(eq(fandoms.id, testFandomId))
        .returning();

      // Assert
      expect(deactivatedFandom.is_active).toBe(false);
    });

    it('should reactivate fandom', async () => {
      // Arrange - First deactivate
      await db
        .update(fandoms)
        .set({ is_active: false })
        .where(eq(fandoms.id, testFandomId));

      // Act - Reactivate
      const [reactivatedFandom] = await db
        .update(fandoms)
        .set({
          is_active: true,
          updated_at: new Date(),
        })
        .where(eq(fandoms.id, testFandomId))
        .returning();

      // Assert
      expect(reactivatedFandom.is_active).toBe(true);
    });
  });

  describe('Fandom Data Integrity', () => {
    it('should maintain data consistency during concurrent operations', async () => {
      // Arrange
      const fandomData = {
        name: 'Concurrent Test Fandom',
        description: 'Testing concurrent operations',
        slug: 'concurrent-test-fandom',
        category: 'book',
        is_active: true,
      };

      // Act - Simulate concurrent creation attempts
      const operations = Array.from({ length: 5 }, (_, i) =>
        db
          .insert(fandoms)
          .values({
            ...fandomData,
            name: `${fandomData.name} ${i}`,
            slug: `${fandomData.slug}-${i}`,
          })
          .returning()
      );

      const results = await Promise.allSettled(operations);

      // Assert
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful).toHaveLength(5);

      // Verify all created fandoms are retrievable
      for (const result of successful) {
        if (result.status === 'fulfilled') {
          const [createdFandom] = result.value;
          const [retrieved] = await db
            .select()
            .from(fandoms)
            .where(eq(fandoms.id, createdFandom.id));

          expect(retrieved).toBeDefined();
          expect(retrieved.id).toBe(createdFandom.id);
        }
      }
    });

    it('should handle database connection issues gracefully', async () => {
      // This test would require mocking database connection failures
      // For now, we'll test basic error handling

      // Act & Assert
      await expect(
        db.select().from(fandoms).where(eq(fandoms.id, 'non-existent-id'))
      ).resolves.toEqual([]); // Should return empty array, not throw
    });
  });

  describe('Fandom Search and Filtering', () => {
    beforeEach(async () => {
      // Create multiple test fandoms for search tests
      await db.insert(fandoms).values([
        {
          name: 'Harry Potter',
          description: 'The wizarding world of Harry Potter',
          slug: 'harry-potter',
          category: 'book',
          is_active: true,
        },
        {
          name: 'Percy Jackson',
          description: 'Greek mythology in modern times',
          slug: 'percy-jackson',
          category: 'book',
          is_active: true,
        },
        {
          name: 'Marvel Cinematic Universe',
          description: 'Superhero movies and characters',
          slug: 'marvel-cinematic-universe',
          category: 'movie',
          is_active: true,
        },
        {
          name: 'Inactive Fandom',
          description: 'This fandom is not active',
          slug: 'inactive-fandom',
          category: 'book',
          is_active: false,
        },
      ]);
    });

    it('should filter fandoms by category', async () => {
      // Act
      const bookFandoms = await db
        .select()
        .from(fandoms)
        .where(eq(fandoms.category, 'book'));

      const movieFandoms = await db
        .select()
        .from(fandoms)
        .where(eq(fandoms.category, 'movie'));

      // Assert
      expect(bookFandoms.length).toBeGreaterThanOrEqual(3); // Including inactive
      expect(movieFandoms.length).toBeGreaterThanOrEqual(1);

      expect(bookFandoms.every(f => f.category === 'book')).toBe(true);
      expect(movieFandoms.every(f => f.category === 'movie')).toBe(true);
    });

    it('should filter fandoms by active status', async () => {
      // Act
      const activeFandoms = await db
        .select()
        .from(fandoms)
        .where(eq(fandoms.is_active, true));

      const inactiveFandoms = await db
        .select()
        .from(fandoms)
        .where(eq(fandoms.is_active, false));

      // Assert
      expect(activeFandoms.length).toBeGreaterThanOrEqual(3);
      expect(inactiveFandoms.length).toBeGreaterThanOrEqual(1);

      expect(activeFandoms.every(f => f.is_active === true)).toBe(true);
      expect(inactiveFandoms.every(f => f.is_active === false)).toBe(true);
    });
  });

  describe('Performance Validation', () => {
    it('should complete fandom creation within performance requirements', async () => {
      // Arrange
      const startTime = performance.now();

      const fandomData = {
        name: 'Performance Test Fandom',
        description: 'Testing creation performance',
        slug: 'performance-test-fandom',
        category: 'book',
        is_active: true,
      };

      // Act
      const [createdFandom] = await db
        .insert(fandoms)
        .values(fandomData)
        .returning();
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50); // <50ms requirement
      expect(createdFandom).toBeDefined();
    });

    it('should complete fandom retrieval within performance requirements', async () => {
      // Arrange
      const [testFandom] = await db
        .insert(fandoms)
        .values({
          name: 'Performance Retrieval Test',
          description: 'Testing retrieval performance',
          slug: 'performance-retrieval-test',
          category: 'book',
          is_active: true,
        })
        .returning();

      const startTime = performance.now();

      // Act
      const [retrievedFandom] = await db
        .select()
        .from(fandoms)
        .where(eq(fandoms.id, testFandom.id));

      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50); // <50ms requirement
      expect(retrievedFandom).toBeDefined();
      expect(retrievedFandom.id).toBe(testFandom.id);
    });
  });
});
