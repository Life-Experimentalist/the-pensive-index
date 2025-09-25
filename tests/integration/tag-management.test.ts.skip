import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getDatabase, closeDatabase } from '@/lib/database';
import { fandoms, tags, tagClasses } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import type { DatabaseConnection } from '@/lib/database';

/**
 * Integration Test for Scenario 2: Tag and TagClass Management
 *
 * This test validates the complete tag and tag class lifecycle:
 * 1. Create tag classes for organization
 * 2. Create tags within classes and without classes
 * 3. Manage tag-to-class relationships
 * 4. Validate fandom scoping
 * 5. Test tag hierarchy and classification
 */
describe('Tag and TagClass Management Integration Tests', () => {
  let db: DatabaseConnection;
  let testFandomId: string;
  let testTagClassId: string;
  let testTagId: string;

  beforeAll(async () => {
    db = await getDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    // Clean up test data
    await db.delete(tags).where(eq(tags.name, 'Test Tag'));
    await db.delete(tagClasses).where(eq(tagClasses.name, 'Test Tag Class'));
    await db.delete(fandoms).where(eq(fandoms.name, 'Tag Test Fandom'));

    // Create test fandom
    const [fandom] = await db
      .insert(fandoms)
      .values({
        name: 'Tag Test Fandom',
        description: 'Test fandom for tag management',
        slug: 'tag-test-fandom',
        category: 'book',
        is_active: true,
      })
      .returning();
    testFandomId = fandom.id;
  });

  describe('Tag Class Creation and Management', () => {
    it('should create a new tag class successfully', async () => {
      // Arrange
      const tagClassData = {
        name: 'Test Tag Class',
        description: 'A test tag class for integration testing',
        fandom_id: testFandomId,
        validation_rules: JSON.stringify({
          mutually_exclusive: [],
          required_with: [],
          max_selections: null,
        }),
        is_active: true,
      };

      // Act
      const [createdTagClass] = await db
        .insert(tagClasses)
        .values(tagClassData)
        .returning();

      // Assert
      expect(createdTagClass).toBeDefined();
      expect(createdTagClass.name).toBe(tagClassData.name);
      expect(createdTagClass.description).toBe(tagClassData.description);
      expect(createdTagClass.fandom_id).toBe(testFandomId);
      expect(createdTagClass.is_active).toBe(true);
      expect(createdTagClass.id).toBeDefined();

      testTagClassId = createdTagClass.id;
    });

    it('should prevent duplicate tag class names within same fandom', async () => {
      // Arrange
      const tagClassData = {
        name: 'Test Tag Class',
        description: 'Original tag class',
        fandom_id: testFandomId,
        validation_rules: JSON.stringify({}),
        is_active: true,
      };

      await db.insert(tagClasses).values(tagClassData);

      // Act & Assert
      const duplicateData = {
        ...tagClassData,
        description: 'Duplicate tag class',
      };

      await expect(
        db.insert(tagClasses).values(duplicateData)
      ).rejects.toThrow(); // Should fail on unique constraint
    });

    it('should allow same tag class name in different fandoms', async () => {
      // Arrange
      const [anotherFandom] = await db
        .insert(fandoms)
        .values({
          name: 'Another Tag Test Fandom',
          description: 'Another test fandom',
          slug: 'another-tag-test-fandom',
          category: 'movie',
          is_active: true,
        })
        .returning();

      const tagClassData = {
        name: 'Test Tag Class',
        description: 'Tag class in first fandom',
        fandom_id: testFandomId,
        validation_rules: JSON.stringify({}),
        is_active: true,
      };

      const [firstTagClass] = await db
        .insert(tagClasses)
        .values(tagClassData)
        .returning();

      // Act
      const sameNameData = {
        name: 'Test Tag Class',
        description: 'Tag class in second fandom',
        fandom_id: anotherFandom.id,
        validation_rules: JSON.stringify({}),
        is_active: true,
      };

      const [secondTagClass] = await db
        .insert(tagClasses)
        .values(sameNameData)
        .returning();

      // Assert
      expect(firstTagClass.name).toBe(secondTagClass.name);
      expect(firstTagClass.fandom_id).not.toBe(secondTagClass.fandom_id);
      expect(firstTagClass.id).not.toBe(secondTagClass.id);
    });
  });

  describe('Tag Creation and Management', () => {
    beforeEach(async () => {
      // Create test tag class
      const [tagClass] = await db
        .insert(tagClasses)
        .values({
          name: 'Test Tag Class',
          description: 'Test tag class for tags',
          fandom_id: testFandomId,
          validation_rules: JSON.stringify({}),
          is_active: true,
        })
        .returning();
      testTagClassId = tagClass.id;
    });

    it('should create a tag with tag class', async () => {
      // Arrange
      const tagData = {
        name: 'Test Tag',
        description: 'A test tag with class',
        category: 'character',
        fandom_id: testFandomId,
        tag_class_id: testTagClassId,
        is_active: true,
      };

      // Act
      const [createdTag] = await db.insert(tags).values(tagData).returning();

      // Assert
      expect(createdTag).toBeDefined();
      expect(createdTag.name).toBe(tagData.name);
      expect(createdTag.description).toBe(tagData.description);
      expect(createdTag.category).toBe(tagData.category);
      expect(createdTag.fandom_id).toBe(testFandomId);
      expect(createdTag.tag_class_id).toBe(testTagClassId);
      expect(createdTag.is_active).toBe(true);

      testTagId = createdTag.id;
    });

    it('should create a tag without tag class', async () => {
      // Arrange
      const tagData = {
        name: 'Unclassified Test Tag',
        description: 'A test tag without class',
        category: 'theme',
        fandom_id: testFandomId,
        tag_class_id: null,
        is_active: true,
      };

      // Act
      const [createdTag] = await db.insert(tags).values(tagData).returning();

      // Assert
      expect(createdTag).toBeDefined();
      expect(createdTag.name).toBe(tagData.name);
      expect(createdTag.tag_class_id).toBeNull();
      expect(createdTag.fandom_id).toBe(testFandomId);
    });

    it('should prevent duplicate tag names within same fandom', async () => {
      // Arrange
      const tagData = {
        name: 'Test Tag',
        description: 'Original tag',
        category: 'character',
        fandom_id: testFandomId,
        tag_class_id: testTagClassId,
        is_active: true,
      };

      await db.insert(tags).values(tagData);

      // Act & Assert
      const duplicateData = {
        ...tagData,
        description: 'Duplicate tag',
        tag_class_id: null, // Even with different class
      };

      await expect(db.insert(tags).values(duplicateData)).rejects.toThrow(); // Should fail on unique constraint
    });

    it('should validate tag class belongs to same fandom', async () => {
      // Arrange - Create another fandom and tag class
      const [anotherFandom] = await db
        .insert(fandoms)
        .values({
          name: 'Another Fandom',
          description: 'Another fandom',
          slug: 'another-fandom',
          category: 'movie',
          is_active: true,
        })
        .returning();

      const [anotherTagClass] = await db
        .insert(tagClasses)
        .values({
          name: 'Another Tag Class',
          description: 'Tag class in different fandom',
          fandom_id: anotherFandom.id,
          validation_rules: JSON.stringify({}),
          is_active: true,
        })
        .returning();

      // Act & Assert - Try to create tag in first fandom with tag class from second
      const invalidTagData = {
        name: 'Invalid Tag',
        description: 'Tag with mismatched fandom and tag class',
        category: 'character',
        fandom_id: testFandomId,
        tag_class_id: anotherTagClass.id,
        is_active: true,
      };

      await expect(db.insert(tags).values(invalidTagData)).rejects.toThrow(); // Should fail on foreign key constraint
    });
  });

  describe('Tag and TagClass Relationships', () => {
    beforeEach(async () => {
      // Create multiple tag classes
      const [characterClass] = await db
        .insert(tagClasses)
        .values({
          name: 'Characters',
          description: 'Character tags',
          fandom_id: testFandomId,
          validation_rules: JSON.stringify({ max_selections: 3 }),
          is_active: true,
        })
        .returning();

      const [relationshipClass] = await db
        .insert(tagClasses)
        .values({
          name: 'Relationships',
          description: 'Relationship tags',
          fandom_id: testFandomId,
          validation_rules: JSON.stringify({ max_selections: 1 }),
          is_active: true,
        })
        .returning();

      testTagClassId = characterClass.id;

      // Create tags in different classes
      await db.insert(tags).values([
        {
          name: 'Harry Potter',
          description: 'The boy who lived',
          category: 'character',
          fandom_id: testFandomId,
          tag_class_id: characterClass.id,
          is_active: true,
        },
        {
          name: 'Hermione Granger',
          description: 'Brightest witch of her age',
          category: 'character',
          fandom_id: testFandomId,
          tag_class_id: characterClass.id,
          is_active: true,
        },
        {
          name: 'Harry/Hermione',
          description: 'Romantic relationship',
          category: 'relationship',
          fandom_id: testFandomId,
          tag_class_id: relationshipClass.id,
          is_active: true,
        },
        {
          name: 'Time Travel',
          description: 'Stories involving time travel',
          category: 'theme',
          fandom_id: testFandomId,
          tag_class_id: null,
          is_active: true,
        },
      ]);
    });

    it('should retrieve all tags for a specific tag class', async () => {
      // Act
      const characterTags = await db
        .select()
        .from(tags)
        .where(
          and(eq(tags.tag_class_id, testTagClassId), eq(tags.is_active, true))
        );

      // Assert
      expect(characterTags).toHaveLength(2);
      expect(
        characterTags.every(tag => tag.tag_class_id === testTagClassId)
      ).toBe(true);
      expect(characterTags.some(tag => tag.name === 'Harry Potter')).toBe(true);
      expect(characterTags.some(tag => tag.name === 'Hermione Granger')).toBe(
        true
      );
    });

    it('should retrieve unclassified tags', async () => {
      // Act
      const unclassifiedTags = await db
        .select()
        .from(tags)
        .where(
          and(
            eq(tags.tag_class_id, null),
            eq(tags.fandom_id, testFandomId),
            eq(tags.is_active, true)
          )
        );

      // Assert
      expect(unclassifiedTags).toHaveLength(1);
      expect(unclassifiedTags[0].name).toBe('Time Travel');
      expect(unclassifiedTags[0].tag_class_id).toBeNull();
    });

    it('should join tags with their tag classes', async () => {
      // Act
      const tagsWithClasses = await db
        .select({
          tag_id: tags.id,
          tag_name: tags.name,
          tag_category: tags.category,
          class_id: tagClasses.id,
          class_name: tagClasses.name,
          class_description: tagClasses.description,
        })
        .from(tags)
        .leftJoin(tagClasses, eq(tags.tag_class_id, tagClasses.id))
        .where(and(eq(tags.fandom_id, testFandomId), eq(tags.is_active, true)));

      // Assert
      expect(tagsWithClasses).toHaveLength(4);

      const harryTag = tagsWithClasses.find(t => t.tag_name === 'Harry Potter');
      expect(harryTag?.class_name).toBe('Characters');

      const timeTravel = tagsWithClasses.find(
        t => t.tag_name === 'Time Travel'
      );
      expect(timeTravel?.class_name).toBeNull();
    });
  });

  describe('Tag Class Validation Rules', () => {
    it('should store and retrieve complex validation rules', async () => {
      // Arrange
      const complexRules = {
        mutually_exclusive: [
          ['Harry/Hermione', 'Harry/Ginny'],
          ['Draco/Harry', 'Draco/Hermione'],
        ],
        required_with: [['Time Travel', 'Fix-it']],
        max_selections: 2,
        min_selections: 1,
      };

      const tagClassData = {
        name: 'Complex Validation Class',
        description: 'Tag class with complex validation rules',
        fandom_id: testFandomId,
        validation_rules: JSON.stringify(complexRules),
        is_active: true,
      };

      // Act
      const [createdTagClass] = await db
        .insert(tagClasses)
        .values(tagClassData)
        .returning();

      // Assert
      expect(createdTagClass.validation_rules).toBe(
        JSON.stringify(complexRules)
      );

      const retrievedRules = JSON.parse(createdTagClass.validation_rules);
      expect(retrievedRules.mutually_exclusive).toEqual(
        complexRules.mutually_exclusive
      );
      expect(retrievedRules.required_with).toEqual(complexRules.required_with);
      expect(retrievedRules.max_selections).toBe(complexRules.max_selections);
      expect(retrievedRules.min_selections).toBe(complexRules.min_selections);
    });
  });

  describe('Bulk Operations', () => {
    beforeEach(async () => {
      // Create tag class for bulk operations
      const [tagClass] = await db
        .insert(tagClasses)
        .values({
          name: 'Bulk Test Class',
          description: 'Tag class for bulk operations',
          fandom_id: testFandomId,
          validation_rules: JSON.stringify({}),
          is_active: true,
        })
        .returning();
      testTagClassId = tagClass.id;
    });

    it('should create multiple tags in a single transaction', async () => {
      // Arrange
      const tagData = [
        {
          name: 'Bulk Tag 1',
          description: 'First bulk tag',
          category: 'character',
          fandom_id: testFandomId,
          tag_class_id: testTagClassId,
          is_active: true,
        },
        {
          name: 'Bulk Tag 2',
          description: 'Second bulk tag',
          category: 'character',
          fandom_id: testFandomId,
          tag_class_id: testTagClassId,
          is_active: true,
        },
        {
          name: 'Bulk Tag 3',
          description: 'Third bulk tag',
          category: 'character',
          fandom_id: testFandomId,
          tag_class_id: testTagClassId,
          is_active: true,
        },
      ];

      // Act
      const createdTags = await db.insert(tags).values(tagData).returning();

      // Assert
      expect(createdTags).toHaveLength(3);
      expect(createdTags.every(tag => tag.fandom_id === testFandomId)).toBe(
        true
      );
      expect(
        createdTags.every(tag => tag.tag_class_id === testTagClassId)
      ).toBe(true);
    });

    it('should update multiple tags status efficiently', async () => {
      // Arrange - Create tags first
      const createdTags = await db
        .insert(tags)
        .values([
          {
            name: 'Status Test Tag 1',
            description: 'First status test tag',
            category: 'character',
            fandom_id: testFandomId,
            tag_class_id: testTagClassId,
            is_active: true,
          },
          {
            name: 'Status Test Tag 2',
            description: 'Second status test tag',
            category: 'character',
            fandom_id: testFandomId,
            tag_class_id: testTagClassId,
            is_active: true,
          },
        ])
        .returning();

      const tagIds = createdTags.map(tag => tag.id);

      // Act - Deactivate all tags
      const updatedTags = await db
        .update(tags)
        .set({
          is_active: false,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(tags.fandom_id, testFandomId),
            eq(tags.tag_class_id, testTagClassId)
          )
        )
        .returning();

      // Assert
      expect(updatedTags).toHaveLength(2);
      expect(updatedTags.every(tag => tag.is_active === false)).toBe(true);
    });
  });

  describe('Performance Validation', () => {
    it('should complete tag creation within performance requirements', async () => {
      // Arrange
      const startTime = performance.now();

      const tagData = {
        name: 'Performance Test Tag',
        description: 'Testing tag creation performance',
        category: 'performance',
        fandom_id: testFandomId,
        tag_class_id: null,
        is_active: true,
      };

      // Act
      const [createdTag] = await db.insert(tags).values(tagData).returning();
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50); // <50ms requirement
      expect(createdTag).toBeDefined();
    });

    it('should complete tag class creation within performance requirements', async () => {
      // Arrange
      const startTime = performance.now();

      const tagClassData = {
        name: 'Performance Test Class',
        description: 'Testing tag class creation performance',
        fandom_id: testFandomId,
        validation_rules: JSON.stringify({ max_selections: 5 }),
        is_active: true,
      };

      // Act
      const [createdTagClass] = await db
        .insert(tagClasses)
        .values(tagClassData)
        .returning();
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50); // <50ms requirement
      expect(createdTagClass).toBeDefined();
    });

    it('should complete complex tag queries within performance requirements', async () => {
      // Arrange - Create test data
      const [testTagClass] = await db
        .insert(tagClasses)
        .values({
          name: 'Query Performance Class',
          description: 'For testing query performance',
          fandom_id: testFandomId,
          validation_rules: JSON.stringify({}),
          is_active: true,
        })
        .returning();

      await db.insert(tags).values(
        Array.from({ length: 50 }, (_, i) => ({
          name: `Query Test Tag ${i}`,
          description: `Description for tag ${i}`,
          category: 'performance',
          fandom_id: testFandomId,
          tag_class_id: testTagClass.id,
          is_active: true,
        }))
      );

      const startTime = performance.now();

      // Act - Complex query with joins
      const results = await db
        .select({
          tag_name: tags.name,
          tag_category: tags.category,
          class_name: tagClasses.name,
          class_description: tagClasses.description,
        })
        .from(tags)
        .innerJoin(tagClasses, eq(tags.tag_class_id, tagClasses.id))
        .where(
          and(
            eq(tags.fandom_id, testFandomId),
            eq(tags.is_active, true),
            eq(tagClasses.is_active, true)
          )
        );

      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100); // Reasonable performance for complex query
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
