import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getRawDatabase, closeDatabaseConnection } from '@/database/config';
import type { RawDatabaseConnection } from '@/database/config';

describe('TagClass Database Schema', () => {
  let db: RawDatabaseConnection;

  beforeEach(async () => {
    db = getRawDatabase();

    // Clean the database before each test
    try {
      await db.run('DELETE FROM tag_classes');
      await db.run('DELETE FROM tags');
      await db.run('DELETE FROM fandoms');
    } catch (error) {
      // Tables might not exist yet, that's okay
    }

    // Create test fandoms that the TagClass tests reference
    try {
      await db.run(
        `
        INSERT INTO fandoms (id, name, slug, description, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        [
          'test-fandom-uuid',
          'Test Fandom',
          'test-fandom',
          'A test fandom for tag class tests',
          1,
          Date.now(),
          Date.now(),
        ]
      );

      await db.run(
        `
        INSERT INTO fandoms (id, name, slug, description, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        [
          'harry-potter-uuid',
          'Harry Potter',
          'harry-potter',
          'Harry Potter fandom for testing',
          1,
          Date.now(),
          Date.now(),
        ]
      );

      await db.run(
        `
        INSERT INTO fandoms (id, name, slug, description, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        [
          'percy-jackson-uuid',
          'Percy Jackson',
          'percy-jackson',
          'Percy Jackson fandom for testing',
          1,
          Date.now(),
          Date.now(),
        ]
      );
    } catch (error) {
      // Fandoms table might not exist yet, that's okay
    }
  });

  afterEach(() => {
    closeDatabaseConnection();
  });

  describe('TagClass Table Structure', () => {
    it('should have the correct tag_classes table structure', async () => {
      // This test will fail until we implement the schema

      // Test that the tag_classes table exists
      const tableInfo = await db.run(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='tag_classes'
      `);

      expect(tableInfo).toBeDefined();

      // Test table columns
      const columns = await db.run(`PRAGMA table_info(tag_classes)`);

      const expectedColumns = [
        { name: 'id', type: 'TEXT', pk: 1, notnull: 1 },
        { name: 'fandom_id', type: 'TEXT', pk: 0, notnull: 1 },
        { name: 'name', type: 'TEXT', pk: 0, notnull: 1 },
        { name: 'slug', type: 'TEXT', pk: 0, notnull: 1 },
        { name: 'description', type: 'TEXT', pk: 0, notnull: 0 },
        { name: 'validation_rules', type: 'TEXT', pk: 0, notnull: 0 },
        { name: 'is_active', type: 'INTEGER', pk: 0, notnull: 1 },
        { name: 'created_at', type: 'INTEGER', pk: 0, notnull: 1 },
        { name: 'updated_at', type: 'INTEGER', pk: 0, notnull: 1 },
      ];

      expectedColumns.forEach(expectedCol => {
        const column = columns.find(
          (col: any) => col.name === expectedCol.name
        );
        expect(column).toBeDefined();
        expect(column.type).toBe(expectedCol.type);
        expect(column.pk).toBe(expectedCol.pk);
        expect(column.notnull).toBe(expectedCol.notnull);
      });
    });

    it('should have foreign key constraint to fandoms table', async () => {
      // Test foreign key - this will fail until schema is implemented
      const foreignKeys = await db.run(`PRAGMA foreign_key_list(tag_classes)`);

      const fandomFK = foreignKeys.find(
        (fk: any) =>
          fk.table === 'fandoms' && fk.from === 'fandom_id' && fk.to === 'id'
      );
      expect(fandomFK).toBeDefined();
    });

    it('should have unique constraint on fandom_id + name combination', async () => {
      // Test compound unique constraint - this will fail until schema is implemented
      const indexes = await db.run(`PRAGMA index_list(tag_classes)`);

      const compoundIndex = indexes.find(
        (idx: any) => idx.unique === 1 && idx.name.includes('fandom_name')
      );
      expect(compoundIndex).toBeDefined();
    });

    it('should have unique constraint on fandom_id + slug combination', async () => {
      // Test compound unique constraint - this will fail until schema is implemented
      const indexes = await db.run(`PRAGMA index_list(tag_classes)`);

      const compoundIndex = indexes.find(
        (idx: any) => idx.unique === 1 && idx.name.includes('fandom_slug')
      );
      expect(compoundIndex).toBeDefined();
    });

    it('should have performance indexes', async () => {
      // Test performance indexes - this will fail until schema is implemented
      const indexes = await db.run(`PRAGMA index_list(tag_classes)`);

      // Index on fandom_id for queries
      const fandomIndex = indexes.find((idx: any) =>
        idx.name.includes('fandom_id')
      );
      expect(fandomIndex).toBeDefined();

      // Index on is_active for filtering
      const activeIndex = indexes.find((idx: any) =>
        idx.name.includes('active')
      );
      expect(activeIndex).toBeDefined();
    });
  });

  describe('TagClass CRUD Operations', () => {
    it('should insert a valid tag class record', async () => {
      // This test will fail until we implement the schema
      const tagClassData = {
        id: 'test-tagclass-uuid-1',
        fandom_id: 'test-fandom-uuid',
        name: 'harry-shipping',
        slug: 'harry-shipping',
        description: 'Validation rules for Harry Potter shipping tags',
        validation_rules: JSON.stringify({
          mutually_exclusive: ['harry/hermione', 'harry/ginny', 'harry/luna'],
          required_context: ['character:harry-potter'],
        }),
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      await expect(
        db.run(
          `
          INSERT INTO tag_classes (id, fandom_id, name, slug, description, validation_rules, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            tagClassData.id,
            tagClassData.fandom_id,
            tagClassData.name,
            tagClassData.slug,
            tagClassData.description,
            tagClassData.validation_rules,
            tagClassData.is_active,
            tagClassData.created_at,
            tagClassData.updated_at,
          ]
        )
      ).resolves.toBeDefined();
    });

    it('should enforce unique fandom_id + name constraint', async () => {
      // This test will fail until we implement the schema
      const tagClass1 = {
        id: 'test-tagclass-uuid-1',
        fandom_id: 'test-fandom-uuid',
        name: 'character-classification',
        slug: 'character-classification',
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      const tagClass2 = {
        id: 'test-tagclass-uuid-2',
        fandom_id: 'test-fandom-uuid', // Same fandom
        name: 'character-classification', // Same name - should fail
        slug: 'character-classification-alt',
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      // First insert should succeed
      await db.run(
        `
        INSERT INTO tag_classes (id, fandom_id, name, slug, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        [
          tagClass1.id,
          tagClass1.fandom_id,
          tagClass1.name,
          tagClass1.slug,
          tagClass1.is_active,
          tagClass1.created_at,
          tagClass1.updated_at,
        ]
      );

      // Second insert should fail due to unique fandom_id + name constraint
      await expect(
        db.run(
          `
          INSERT INTO tag_classes (id, fandom_id, name, slug, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
          [
            tagClass2.id,
            tagClass2.fandom_id,
            tagClass2.name,
            tagClass2.slug,
            tagClass2.is_active,
            tagClass2.created_at,
            tagClass2.updated_at,
          ]
        )
      ).rejects.toThrow();
    });

    it('should allow same name in different fandoms', async () => {
      // This test will fail until we implement the schema
      const tagClass1 = {
        id: 'test-tagclass-uuid-1',
        fandom_id: 'harry-potter-uuid',
        name: 'shipping-rules',
        slug: 'shipping-rules',
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      const tagClass2 = {
        id: 'test-tagclass-uuid-2',
        fandom_id: 'percy-jackson-uuid', // Different fandom
        name: 'shipping-rules', // Same name - should succeed
        slug: 'shipping-rules',
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      // Both inserts should succeed
      await db.run(
        `
        INSERT INTO tag_classes (id, fandom_id, name, slug, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        [
          tagClass1.id,
          tagClass1.fandom_id,
          tagClass1.name,
          tagClass1.slug,
          tagClass1.is_active,
          tagClass1.created_at,
          tagClass1.updated_at,
        ]
      );

      await expect(
        db.run(
          `
          INSERT INTO tag_classes (id, fandom_id, name, slug, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
          [
            tagClass2.id,
            tagClass2.fandom_id,
            tagClass2.name,
            tagClass2.slug,
            tagClass2.is_active,
            tagClass2.created_at,
            tagClass2.updated_at,
          ]
        )
      ).resolves.toBeDefined();
    });

    it('should allow null validation_rules', async () => {
      // This test will fail until we implement the schema
      const tagClassData = {
        id: 'test-tagclass-no-rules',
        fandom_id: 'test-fandom-uuid',
        name: 'simple-classification',
        slug: 'simple-classification',
        description: 'A simple tag class without validation rules',
        validation_rules: null,
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      await expect(
        db.run(
          `
          INSERT INTO tag_classes (id, fandom_id, name, slug, description, validation_rules, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            tagClassData.id,
            tagClassData.fandom_id,
            tagClassData.name,
            tagClassData.slug,
            tagClassData.description,
            tagClassData.validation_rules,
            tagClassData.is_active,
            tagClassData.created_at,
            tagClassData.updated_at,
          ]
        )
      ).resolves.toBeDefined();
    });

    it('should store and retrieve JSON validation rules', async () => {
      // This test will fail until we implement the schema
      const validationRules = {
        mutually_exclusive: ['option1', 'option2'],
        required_tags: ['base-tag'],
        max_selections: 2,
      };

      const tagClassData = {
        id: 'test-tagclass-json-rules',
        fandom_id: 'test-fandom-uuid',
        name: 'json-rules-test',
        slug: 'json-rules-test',
        validation_rules: JSON.stringify(validationRules),
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      // Insert with JSON rules
      await db.run(
        `
        INSERT INTO tag_classes (id, fandom_id, name, slug, validation_rules, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          tagClassData.id,
          tagClassData.fandom_id,
          tagClassData.name,
          tagClassData.slug,
          tagClassData.validation_rules,
          tagClassData.is_active,
          tagClassData.created_at,
          tagClassData.updated_at,
        ]
      );

      // Retrieve and validate JSON rules
      const result = await db.get(
        `
        SELECT validation_rules FROM tag_classes WHERE id = ?
      `,
        [tagClassData.id]
      );

      expect(result?.validation_rules).toBeDefined();
      const retrievedRules = JSON.parse(result.validation_rules);
      expect(retrievedRules).toEqual(validationRules);
    });
  });

  describe('TagClass Soft Delete Support', () => {
    it('should support soft deletion via is_active flag', async () => {
      // This test will fail until we implement the schema
      const tagClassData = {
        id: 'test-tagclass-soft-delete',
        fandom_id: 'test-fandom-uuid',
        name: 'deprecated-class',
        slug: 'deprecated-class',
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      // Insert tag class
      await db.run(
        `
        INSERT INTO tag_classes (id, fandom_id, name, slug, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        [
          tagClassData.id,
          tagClassData.fandom_id,
          tagClassData.name,
          tagClassData.slug,
          tagClassData.is_active,
          tagClassData.created_at,
          tagClassData.updated_at,
        ]
      );

      // Soft delete by setting is_active to false
      await db.run(
        `
        UPDATE tag_classes SET is_active = ?, updated_at = ? WHERE id = ?
      `,
        [false, Date.now(), tagClassData.id]
      );

      // Verify record still exists but is inactive
      const result = await db.get(
        `
        SELECT * FROM tag_classes WHERE id = ?
      `,
        [tagClassData.id]
      );

      expect(result).toBeDefined();
      expect(result.is_active).toBe(0); // SQLite stores boolean as 1/0
    });
  });
});
