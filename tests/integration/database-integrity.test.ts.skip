import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '@/lib/database/connection';
import { fandoms, tags, tagClasses, plotBlocks } from '@/lib/database/schema';
import { eq, and, isNull, isNotNull } from 'drizzle-orm';
import { randomUUID } from 'crypto';

/**
 * Database Integrity Tests
 *
 * Validates that database constraints, relationships, and data integrity
 * are properly maintained across all operations. Tests foreign key constraints,
 * unique constraints, referential integrity, and data consistency.
 */
describe('Database Integrity Tests', () => {
  let testFandomId: string;

  beforeAll(async () => {
    testFandomId = randomUUID();

    // Create test fandom for integrity tests
    await db.insert(fandoms).values({
      id: testFandomId,
      name: 'Integrity Test Fandom',
      description: 'Fandom for database integrity testing',
      slug: 'integrity-test-fandom',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
  });

  afterAll(async () => {
    // Clean up all test data
    try {
      await db.delete(tags).where(eq(tags.fandom_id, testFandomId));
      await db.delete(tagClasses).where(eq(tagClasses.fandom_id, testFandomId));
      await db.delete(plotBlocks).where(eq(plotBlocks.fandom_id, testFandomId));
      await db.delete(fandoms).where(eq(fandoms.id, testFandomId));
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Foreign Key Constraints', () => {
    it('should prevent creating tag with invalid fandom_id', async () => {
      // Arrange
      const invalidFandomId = randomUUID();
      const tagData = {
        id: randomUUID(),
        name: 'Invalid Fandom Tag',
        description: 'Tag with invalid fandom reference',
        fandom_id: invalidFandomId, // This fandom doesn't exist
        tag_class_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Act & Assert
      await expect(db.insert(tags).values(tagData)).rejects.toThrow();
    });

    it('should prevent creating tag class with invalid fandom_id', async () => {
      // Arrange
      const invalidFandomId = randomUUID();
      const tagClassData = {
        id: randomUUID(),
        name: 'Invalid Fandom Tag Class',
        description: 'Tag class with invalid fandom reference',
        fandom_id: invalidFandomId, // This fandom doesn't exist
        validation_rules: {},
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Act & Assert
      await expect(
        db.insert(tagClasses).values(tagClassData)
      ).rejects.toThrow();
    });

    it('should prevent creating plot block with invalid fandom_id', async () => {
      // Arrange
      const invalidFandomId = randomUUID();
      const plotBlockData = {
        id: randomUUID(),
        name: 'Invalid Fandom Plot Block',
        description: 'Plot block with invalid fandom reference',
        fandom_id: invalidFandomId, // This fandom doesn't exist
        parent_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Act & Assert
      await expect(
        db.insert(plotBlocks).values(plotBlockData)
      ).rejects.toThrow();
    });

    it('should prevent creating tag with invalid tag_class_id', async () => {
      // Arrange
      const invalidTagClassId = randomUUID();
      const tagData = {
        id: randomUUID(),
        name: 'Invalid Tag Class Tag',
        description: 'Tag with invalid tag class reference',
        fandom_id: testFandomId,
        tag_class_id: invalidTagClassId, // This tag class doesn't exist
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Act & Assert
      await expect(db.insert(tags).values(tagData)).rejects.toThrow();
    });

    it('should prevent creating plot block with invalid parent_id', async () => {
      // Arrange
      const invalidParentId = randomUUID();
      const plotBlockData = {
        id: randomUUID(),
        name: 'Invalid Parent Plot Block',
        description: 'Plot block with invalid parent reference',
        fandom_id: testFandomId,
        parent_id: invalidParentId, // This parent doesn't exist
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Act & Assert
      await expect(
        db.insert(plotBlocks).values(plotBlockData)
      ).rejects.toThrow();
    });
  });

  describe('Unique Constraints', () => {
    it('should prevent duplicate fandom slugs', async () => {
      // Arrange
      const duplicateFandomData = {
        id: randomUUID(),
        name: 'Duplicate Slug Fandom',
        description: 'Fandom with duplicate slug',
        slug: 'integrity-test-fandom', // Same slug as test fandom
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Act & Assert
      await expect(
        db.insert(fandoms).values(duplicateFandomData)
      ).rejects.toThrow();
    });

    it('should allow duplicate tag names across different fandoms', async () => {
      // Arrange - Create another fandom
      const otherFandomId = randomUUID();
      await db.insert(fandoms).values({
        id: otherFandomId,
        name: 'Other Test Fandom',
        description: 'Another fandom for testing',
        slug: 'other-test-fandom',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const tagName = 'Duplicate Tag Name';

      // Create tag in first fandom
      const firstTag = {
        id: randomUUID(),
        name: tagName,
        description: 'First tag with this name',
        fandom_id: testFandomId,
        tag_class_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Create tag in second fandom
      const secondTag = {
        id: randomUUID(),
        name: tagName,
        description: 'Second tag with same name',
        fandom_id: otherFandomId,
        tag_class_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Act & Assert - Both should succeed
      await expect(db.insert(tags).values(firstTag)).resolves.toBeDefined();
      await expect(db.insert(tags).values(secondTag)).resolves.toBeDefined();

      // Cleanup
      await db.delete(tags).where(eq(tags.fandom_id, otherFandomId));
      await db.delete(fandoms).where(eq(fandoms.id, otherFandomId));
    });

    it('should prevent duplicate tag names within same fandom', async () => {
      // Arrange
      const tagName = 'Unique Tag Name';
      const firstTag = {
        id: randomUUID(),
        name: tagName,
        description: 'First tag',
        fandom_id: testFandomId,
        tag_class_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const duplicateTag = {
        id: randomUUID(),
        name: tagName, // Same name in same fandom
        description: 'Duplicate tag',
        fandom_id: testFandomId,
        tag_class_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Act
      await db.insert(tags).values(firstTag);

      // Assert - Second insert should fail
      await expect(db.insert(tags).values(duplicateTag)).rejects.toThrow();

      // Cleanup
      await db.delete(tags).where(eq(tags.id, firstTag.id));
    });
  });

  describe('Referential Integrity', () => {
    it('should maintain referential integrity when deleting fandom', async () => {
      // Arrange - Create temporary fandom with related data
      const tempFandomId = randomUUID();
      await db.insert(fandoms).values({
        id: tempFandomId,
        name: 'Temporary Fandom',
        description: 'Fandom to be deleted',
        slug: 'temporary-fandom',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Create related data
      const tagClassId = randomUUID();
      await db.insert(tagClasses).values({
        id: tagClassId,
        name: 'Temp Tag Class',
        description: 'Tag class in temporary fandom',
        fandom_id: tempFandomId,
        validation_rules: {},
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const tagId = randomUUID();
      await db.insert(tags).values({
        id: tagId,
        name: 'Temp Tag',
        description: 'Tag in temporary fandom',
        fandom_id: tempFandomId,
        tag_class_id: tagClassId,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const plotBlockId = randomUUID();
      await db.insert(plotBlocks).values({
        id: plotBlockId,
        name: 'Temp Plot Block',
        description: 'Plot block in temporary fandom',
        fandom_id: tempFandomId,
        parent_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Act - Try to delete fandom (should fail due to foreign key constraints)
      await expect(
        db.delete(fandoms).where(eq(fandoms.id, tempFandomId))
      ).rejects.toThrow();

      // Verify data still exists
      const existingTags = await db
        .select()
        .from(tags)
        .where(eq(tags.fandom_id, tempFandomId));
      const existingTagClasses = await db
        .select()
        .from(tagClasses)
        .where(eq(tagClasses.fandom_id, tempFandomId));
      const existingPlotBlocks = await db
        .select()
        .from(plotBlocks)
        .where(eq(plotBlocks.fandom_id, tempFandomId));

      expect(existingTags).toHaveLength(1);
      expect(existingTagClasses).toHaveLength(1);
      expect(existingPlotBlocks).toHaveLength(1);

      // Cleanup - Delete in correct order
      await db.delete(tags).where(eq(tags.fandom_id, tempFandomId));
      await db.delete(tagClasses).where(eq(tagClasses.fandom_id, tempFandomId));
      await db.delete(plotBlocks).where(eq(plotBlocks.fandom_id, tempFandomId));
      await db.delete(fandoms).where(eq(fandoms.id, tempFandomId));
    });

    it('should maintain referential integrity when deleting tag class', async () => {
      // Arrange
      const tagClassId = randomUUID();
      await db.insert(tagClasses).values({
        id: tagClassId,
        name: 'Test Tag Class for Deletion',
        description: 'Tag class to test deletion',
        fandom_id: testFandomId,
        validation_rules: {},
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const tagId = randomUUID();
      await db.insert(tags).values({
        id: tagId,
        name: 'Tag with Class Reference',
        description: 'Tag that references the class',
        fandom_id: testFandomId,
        tag_class_id: tagClassId,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Act - Try to delete tag class (should fail due to foreign key constraint)
      await expect(
        db.delete(tagClasses).where(eq(tagClasses.id, tagClassId))
      ).rejects.toThrow();

      // Verify tag class and tag still exist
      const existingTagClass = await db
        .select()
        .from(tagClasses)
        .where(eq(tagClasses.id, tagClassId));
      const existingTag = await db
        .select()
        .from(tags)
        .where(eq(tags.id, tagId));

      expect(existingTagClass).toHaveLength(1);
      expect(existingTag).toHaveLength(1);

      // Cleanup - Delete in correct order
      await db.delete(tags).where(eq(tags.id, tagId));
      await db.delete(tagClasses).where(eq(tagClasses.id, tagClassId));
    });

    it('should maintain plot block hierarchy integrity', async () => {
      // Arrange - Create parent and child plot blocks
      const parentBlockId = randomUUID();
      await db.insert(plotBlocks).values({
        id: parentBlockId,
        name: 'Parent Plot Block',
        description: 'Parent for hierarchy test',
        fandom_id: testFandomId,
        parent_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const childBlockId = randomUUID();
      await db.insert(plotBlocks).values({
        id: childBlockId,
        name: 'Child Plot Block',
        description: 'Child for hierarchy test',
        fandom_id: testFandomId,
        parent_id: parentBlockId,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Act - Try to delete parent (should fail due to foreign key constraint)
      await expect(
        db.delete(plotBlocks).where(eq(plotBlocks.id, parentBlockId))
      ).rejects.toThrow();

      // Verify both blocks still exist
      const existingParent = await db
        .select()
        .from(plotBlocks)
        .where(eq(plotBlocks.id, parentBlockId));
      const existingChild = await db
        .select()
        .from(plotBlocks)
        .where(eq(plotBlocks.id, childBlockId));

      expect(existingParent).toHaveLength(1);
      expect(existingChild).toHaveLength(1);

      // Cleanup - Delete in correct order
      await db.delete(plotBlocks).where(eq(plotBlocks.id, childBlockId));
      await db.delete(plotBlocks).where(eq(plotBlocks.id, parentBlockId));
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistent timestamps', async () => {
      // Arrange
      const beforeCreate = new Date();

      const tagData = {
        id: randomUUID(),
        name: 'Timestamp Test Tag',
        description: 'Tag for timestamp testing',
        fandom_id: testFandomId,
        tag_class_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Act
      const [createdTag] = await db.insert(tags).values(tagData).returning();

      const afterCreate = new Date();

      // Assert
      expect(createdTag.created_at).toBeInstanceOf(Date);
      expect(createdTag.updated_at).toBeInstanceOf(Date);
      expect(createdTag.created_at.getTime()).toBeGreaterThanOrEqual(
        beforeCreate.getTime()
      );
      expect(createdTag.created_at.getTime()).toBeLessThanOrEqual(
        afterCreate.getTime()
      );
      expect(createdTag.updated_at.getTime()).toBeGreaterThanOrEqual(
        createdTag.created_at.getTime()
      );

      // Test update timestamp
      const beforeUpdate = new Date();

      const [updatedTag] = await db
        .update(tags)
        .set({
          description: 'Updated description',
          updated_at: new Date(),
        })
        .where(eq(tags.id, createdTag.id))
        .returning();

      const afterUpdate = new Date();

      expect(updatedTag.updated_at.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime()
      );
      expect(updatedTag.updated_at.getTime()).toBeLessThanOrEqual(
        afterUpdate.getTime()
      );
      expect(updatedTag.updated_at.getTime()).toBeGreaterThan(
        updatedTag.created_at.getTime()
      );

      // Cleanup
      await db.delete(tags).where(eq(tags.id, createdTag.id));
    });

    it('should maintain boolean field consistency', async () => {
      // Arrange & Act
      const tagData = {
        id: randomUUID(),
        name: 'Boolean Test Tag',
        description: 'Tag for boolean testing',
        fandom_id: testFandomId,
        tag_class_id: null,
        is_active: false, // Explicitly set to false
        created_at: new Date(),
        updated_at: new Date(),
      };

      const [createdTag] = await db.insert(tags).values(tagData).returning();

      // Assert
      expect(createdTag.is_active).toBe(false);
      expect(typeof createdTag.is_active).toBe('boolean');

      // Test toggle
      const [updatedTag] = await db
        .update(tags)
        .set({
          is_active: true,
          updated_at: new Date(),
        })
        .where(eq(tags.id, createdTag.id))
        .returning();

      expect(updatedTag.is_active).toBe(true);
      expect(typeof updatedTag.is_active).toBe('boolean');

      // Cleanup
      await db.delete(tags).where(eq(tags.id, createdTag.id));
    });

    it('should handle JSON field consistency', async () => {
      // Arrange
      const validationRules = {
        mutual_exclusion: {
          within_class: true,
          conflicting_tags: ['Tag A', 'Tag B'],
        },
        required_context: {
          dependencies: [{ tag: 'Tag C', requires: ['Tag A'] }],
        },
        instance_limits: {
          max_instances: 5,
          min_instances: 1,
        },
      };

      const tagClassData = {
        id: randomUUID(),
        name: 'JSON Test Tag Class',
        description: 'Tag class for JSON testing',
        fandom_id: testFandomId,
        validation_rules: validationRules,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Act
      const [createdTagClass] = await db
        .insert(tagClasses)
        .values(tagClassData)
        .returning();

      // Assert
      expect(createdTagClass.validation_rules).toEqual(validationRules);
      expect(typeof createdTagClass.validation_rules).toBe('object');

      // Test update with different JSON
      const updatedRules = {
        instance_limits: {
          max_instances: 10,
          min_instances: 0,
        },
      };

      const [updatedTagClass] = await db
        .update(tagClasses)
        .set({
          validation_rules: updatedRules,
          updated_at: new Date(),
        })
        .where(eq(tagClasses.id, createdTagClass.id))
        .returning();

      expect(updatedTagClass.validation_rules).toEqual(updatedRules);

      // Cleanup
      await db.delete(tagClasses).where(eq(tagClasses.id, createdTagClass.id));
    });
  });

  describe('Null Value Handling', () => {
    it('should properly handle nullable fields', async () => {
      // Arrange & Act - Create tag without tag_class_id
      const tagData = {
        id: randomUUID(),
        name: 'Null Test Tag',
        description: 'Tag for null testing',
        fandom_id: testFandomId,
        tag_class_id: null, // Explicitly null
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const [createdTag] = await db.insert(tags).values(tagData).returning();

      // Assert
      expect(createdTag.tag_class_id).toBeNull();

      // Test setting non-null value
      const tagClassId = randomUUID();
      await db.insert(tagClasses).values({
        id: tagClassId,
        name: 'Null Test Tag Class',
        description: 'Tag class for null testing',
        fandom_id: testFandomId,
        validation_rules: {},
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const [updatedTag] = await db
        .update(tags)
        .set({
          tag_class_id: tagClassId,
          updated_at: new Date(),
        })
        .where(eq(tags.id, createdTag.id))
        .returning();

      expect(updatedTag.tag_class_id).toBe(tagClassId);

      // Test setting back to null
      const [nullifiedTag] = await db
        .update(tags)
        .set({
          tag_class_id: null,
          updated_at: new Date(),
        })
        .where(eq(tags.id, createdTag.id))
        .returning();

      expect(nullifiedTag.tag_class_id).toBeNull();

      // Cleanup
      await db.delete(tags).where(eq(tags.id, createdTag.id));
      await db.delete(tagClasses).where(eq(tagClasses.id, tagClassId));
    });

    it('should properly handle plot block parent_id nullability', async () => {
      // Arrange & Act - Create root plot block (parent_id = null)
      const rootBlockData = {
        id: randomUUID(),
        name: 'Root Block',
        description: 'Root plot block',
        fandom_id: testFandomId,
        parent_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const [rootBlock] = await db
        .insert(plotBlocks)
        .values(rootBlockData)
        .returning();

      // Assert
      expect(rootBlock.parent_id).toBeNull();

      // Create child block
      const childBlockData = {
        id: randomUUID(),
        name: 'Child Block',
        description: 'Child plot block',
        fandom_id: testFandomId,
        parent_id: rootBlock.id,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const [childBlock] = await db
        .insert(plotBlocks)
        .values(childBlockData)
        .returning();

      expect(childBlock.parent_id).toBe(rootBlock.id);

      // Test making child into root (parent_id = null)
      const [updatedChild] = await db
        .update(plotBlocks)
        .set({
          parent_id: null,
          updated_at: new Date(),
        })
        .where(eq(plotBlocks.id, childBlock.id))
        .returning();

      expect(updatedChild.parent_id).toBeNull();

      // Cleanup
      await db.delete(plotBlocks).where(eq(plotBlocks.id, childBlock.id));
      await db.delete(plotBlocks).where(eq(plotBlocks.id, rootBlock.id));
    });
  });

  describe('Transaction Integrity', () => {
    it('should maintain data integrity during transaction rollback', async () => {
      // Arrange
      const tagData = {
        id: randomUUID(),
        name: 'Transaction Test Tag',
        description: 'Tag for transaction testing',
        fandom_id: testFandomId,
        tag_class_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      try {
        // Act - Simulate a transaction that should fail
        await db.transaction(async tx => {
          // Insert valid tag
          await tx.insert(tags).values(tagData);

          // Try to insert invalid tag (should cause rollback)
          await tx.insert(tags).values({
            id: randomUUID(),
            name: 'Invalid Transaction Tag',
            description: 'This should fail',
            fandom_id: randomUUID(), // Invalid fandom ID
            tag_class_id: null,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          });
        });

        // If we reach here, the transaction didn't fail as expected
        expect(true).toBe(false); // This should not happen
      } catch (error) {
        // Expected to fail
        expect(error).toBeDefined();
      }

      // Assert - First tag should not exist (transaction rolled back)
      const existingTags = await db
        .select()
        .from(tags)
        .where(eq(tags.id, tagData.id));
      expect(existingTags).toHaveLength(0);
    });

    it('should maintain data integrity during successful transaction', async () => {
      // Arrange
      const tagClassData = {
        id: randomUUID(),
        name: 'Transaction Success Tag Class',
        description: 'Tag class for successful transaction',
        fandom_id: testFandomId,
        validation_rules: {},
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const tagData = {
        id: randomUUID(),
        name: 'Transaction Success Tag',
        description: 'Tag for successful transaction',
        fandom_id: testFandomId,
        tag_class_id: tagClassData.id,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Act
      await db.transaction(async tx => {
        await tx.insert(tagClasses).values(tagClassData);
        await tx.insert(tags).values(tagData);
      });

      // Assert - Both records should exist
      const existingTagClass = await db
        .select()
        .from(tagClasses)
        .where(eq(tagClasses.id, tagClassData.id));
      const existingTag = await db
        .select()
        .from(tags)
        .where(eq(tags.id, tagData.id));

      expect(existingTagClass).toHaveLength(1);
      expect(existingTag).toHaveLength(1);
      expect(existingTag[0].tag_class_id).toBe(tagClassData.id);

      // Cleanup
      await db.delete(tags).where(eq(tags.id, tagData.id));
      await db.delete(tagClasses).where(eq(tagClasses.id, tagClassData.id));
    });
  });

  describe('Concurrent Operations Integrity', () => {
    it('should handle concurrent inserts without conflicts', async () => {
      // Arrange
      const concurrentTags = Array.from({ length: 10 }, (_, i) => ({
        id: randomUUID(),
        name: `Concurrent Tag ${i + 1}`,
        description: `Concurrent operation test ${i + 1}`,
        fandom_id: testFandomId,
        tag_class_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      // Act - Run concurrent insert operations
      const insertPromises = concurrentTags.map(tagData =>
        db.insert(tags).values(tagData).returning()
      );

      const results = await Promise.all(insertPromises);

      // Assert
      expect(results).toHaveLength(10);
      expect(results.every(result => result.length === 1)).toBe(true);

      // Verify all tags exist
      const existingTags = await db
        .select()
        .from(tags)
        .where(eq(tags.fandom_id, testFandomId));

      const insertedTagIds = results.map(result => result[0].id);
      const foundTagIds = existingTags
        .filter(tag => insertedTagIds.includes(tag.id))
        .map(tag => tag.id);

      expect(foundTagIds).toHaveLength(10);

      // Cleanup
      await Promise.all(
        insertedTagIds.map(id => db.delete(tags).where(eq(tags.id, id)))
      );
    });

    it('should handle concurrent updates without data corruption', async () => {
      // Arrange - Create a tag to update
      const tagData = {
        id: randomUUID(),
        name: 'Concurrent Update Tag',
        description: 'Original description',
        fandom_id: testFandomId,
        tag_class_id: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const [createdTag] = await db.insert(tags).values(tagData).returning();

      // Act - Run concurrent updates
      const updatePromises = Array.from({ length: 5 }, (_, i) =>
        db
          .update(tags)
          .set({
            description: `Updated description ${i + 1}`,
            updated_at: new Date(),
          })
          .where(eq(tags.id, createdTag.id))
          .returning()
      );

      const updateResults = await Promise.all(updatePromises);

      // Assert
      expect(updateResults).toHaveLength(5);
      expect(updateResults.every(result => result.length === 1)).toBe(true);

      // Verify final state is consistent
      const [finalTag] = await db
        .select()
        .from(tags)
        .where(eq(tags.id, createdTag.id));

      expect(finalTag).toBeDefined();
      expect(finalTag.description).toMatch(/^Updated description \d+$/);
      expect(finalTag.updated_at.getTime()).toBeGreaterThan(
        finalTag.created_at.getTime()
      );

      // Cleanup
      await db.delete(tags).where(eq(tags.id, createdTag.id));
    });
  });
});
