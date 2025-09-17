import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getRawDatabase, closeDatabaseConnection } from '@/database/config';
import type { RawDatabaseConnection } from '@/database/config';

describe('Tag Database Schema', () => {
  let db: RawDatabaseConnection;

  beforeEach(() => {
    db = getRawDatabase();
  });

  beforeEach(async () => {
    // Clean the database before each test
    try {
      await db.run('DELETE FROM tags');
      await db.run('DELETE FROM fandoms');
    } catch (error) {
      // Tables might not exist yet, that's okay
    }

    // Create test fandoms that the Tag tests reference
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
          'A test fandom for tag tests',
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
          'another-fandom-uuid',
          'Another Fandom',
          'another-fandom',
          'Another test fandom for tag tests',
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

    // Create test tag classes that some Tag tests reference
    try {
      await db.run(
        `
        INSERT INTO tag_classes (id, fandom_id, name, slug, description, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          'test-tagclass-uuid',
          'test-fandom-uuid',
          'Test Tag Class',
          'test-tag-class',
          'A test tag class for tag tests',
          1,
          Date.now(),
          Date.now(),
        ]
      );
    } catch (error) {
      // Tag classes table might not exist yet, that's okay
    }
  });

  afterEach(() => {
    closeDatabaseConnection();
  });

  describe('Tag Table Structure', () => {
    it('should have the correct tag table structure', async () => {
      // This test will fail until we implement the schema

      // Test that the tags table exists
      const tableInfo = await db.run(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='tags'
      `);

      expect(tableInfo).toBeDefined();

      // Test table columns
      const columns = await db.run(`PRAGMA table_info(tags)`);

      const expectedColumns = [
        { name: 'id', type: 'TEXT', pk: 1, notnull: 1 },
        { name: 'fandom_id', type: 'TEXT', pk: 0, notnull: 1 },
        { name: 'name', type: 'TEXT', pk: 0, notnull: 1 },
        { name: 'slug', type: 'TEXT', pk: 0, notnull: 1 },
        { name: 'description', type: 'TEXT', pk: 0, notnull: 0 },
        { name: 'tag_class_id', type: 'TEXT', pk: 0, notnull: 0 },
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
      const foreignKeys = await db.run(`PRAGMA foreign_key_list(tags)`);

      const fandomFK = foreignKeys.find(
        (fk: any) =>
          fk.table === 'fandoms' && fk.from === 'fandom_id' && fk.to === 'id'
      );
      expect(fandomFK).toBeDefined();
    });

    it('should have foreign key constraint to tag_classes table', async () => {
      // Test foreign key constraint to tag_classes table
      const foreignKeys = await db.run(`PRAGMA foreign_key_list(tags)`);

      const tagClassFK = foreignKeys.find(
        (fk: any) =>
          fk.table === 'tag_classes' &&
          fk.from === 'tag_class_id' &&
          fk.to === 'id'
      );
      expect(tagClassFK).toBeDefined();
    });

    it('should have unique constraint on fandom_id + name combination', async () => {
      // Test compound unique constraint - this will fail until schema is implemented
      const indexes = await db.run(`PRAGMA index_list(tags)`);

      const compoundIndex = indexes.find(
        (idx: any) => idx.unique === 1 && idx.name.includes('fandom_name')
      );
      expect(compoundIndex).toBeDefined();
    });

    it('should have unique constraint on fandom_id + slug combination', async () => {
      // Test compound unique constraint - this will fail until schema is implemented
      const indexes = await db.run(`PRAGMA index_list(tags)`);

      const compoundIndex = indexes.find(
        (idx: any) => idx.unique === 1 && idx.name.includes('fandom_slug')
      );
      expect(compoundIndex).toBeDefined();
    });

    it('should have performance indexes', async () => {
      // Test performance indexes - this will fail until schema is implemented
      const indexes = await db.run(`PRAGMA index_list(tags)`);

      // Index on fandom_id for queries
      const fandomIndex = indexes.find((idx: any) =>
        idx.name.includes('fandom_id')
      );
      expect(fandomIndex).toBeDefined();

      // Index on tag_class_id for classification queries
      const tagClassIndex = indexes.find((idx: any) =>
        idx.name.includes('tag_class')
      );
      expect(tagClassIndex).toBeDefined();

      // Index on is_active for filtering
      const activeIndex = indexes.find((idx: any) =>
        idx.name.includes('active')
      );
      expect(activeIndex).toBeDefined();
    });
  });

  describe('Tag CRUD Operations', () => {
    it('should insert a valid tag record', async () => {
      // This test will fail until we implement the schema
      const tagData = {
        id: 'test-tag-uuid-1',
        fandom_id: 'test-fandom-uuid',
        name: 'time-travel',
        slug: 'time-travel',
        description: 'Stories involving time travel mechanics',
        tag_class_id: 'test-tagclass-uuid',
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      await expect(
        db.run(
          `
          INSERT INTO tags (id, fandom_id, name, slug, description, tag_class_id, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            tagData.id,
            tagData.fandom_id,
            tagData.name,
            tagData.slug,
            tagData.description,
            tagData.tag_class_id,
            tagData.is_active,
            tagData.created_at,
            tagData.updated_at,
          ]
        )
      ).resolves.toBeDefined();
    });

    it('should enforce unique fandom_id + name constraint', async () => {
      // This test will fail until we implement the schema
      const tag1 = {
        id: 'test-tag-uuid-1',
        fandom_id: 'test-fandom-uuid',
        name: 'harry/hermione',
        slug: 'harry-hermione',
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      const tag2 = {
        id: 'test-tag-uuid-2',
        fandom_id: 'test-fandom-uuid', // Same fandom
        name: 'harry/hermione', // Same name - should fail
        slug: 'harry-hermione-alt',
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      // First insert should succeed
      await db.run(
        `
        INSERT INTO tags (id, fandom_id, name, slug, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        [
          tag1.id,
          tag1.fandom_id,
          tag1.name,
          tag1.slug,
          tag1.is_active,
          tag1.created_at,
          tag1.updated_at,
        ]
      );

      // Second insert should fail due to unique fandom_id + name constraint
      await expect(
        db.run(
          `
          INSERT INTO tags (id, fandom_id, name, slug, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
          [
            tag2.id,
            tag2.fandom_id,
            tag2.name,
            tag2.slug,
            tag2.is_active,
            tag2.created_at,
            tag2.updated_at,
          ]
        )
      ).rejects.toThrow();
    });

    it('should allow same name in different fandoms', async () => {
      // This test will fail until we implement the schema
      const tag1 = {
        id: 'test-tag-uuid-1',
        fandom_id: 'harry-potter-uuid',
        name: 'time-travel',
        slug: 'time-travel',
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      const tag2 = {
        id: 'test-tag-uuid-2',
        fandom_id: 'percy-jackson-uuid', // Different fandom
        name: 'time-travel', // Same name - should succeed
        slug: 'time-travel',
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      // Both inserts should succeed
      await db.run(
        `
        INSERT INTO tags (id, fandom_id, name, slug, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        [
          tag1.id,
          tag1.fandom_id,
          tag1.name,
          tag1.slug,
          tag1.is_active,
          tag1.created_at,
          tag1.updated_at,
        ]
      );

      await expect(
        db.run(
          `
          INSERT INTO tags (id, fandom_id, name, slug, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
          [
            tag2.id,
            tag2.fandom_id,
            tag2.name,
            tag2.slug,
            tag2.is_active,
            tag2.created_at,
            tag2.updated_at,
          ]
        )
      ).resolves.toBeDefined();
    });

    it('should allow null tag_class_id', async () => {
      // This test will fail until we implement the schema
      const tagData = {
        id: 'test-tag-null-class',
        fandom_id: 'test-fandom-uuid',
        name: 'unclassified-tag',
        slug: 'unclassified-tag',
        description: 'A tag without classification',
        tag_class_id: null,
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      await expect(
        db.run(
          `
          INSERT INTO tags (id, fandom_id, name, slug, description, tag_class_id, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            tagData.id,
            tagData.fandom_id,
            tagData.name,
            tagData.slug,
            tagData.description,
            tagData.tag_class_id,
            tagData.is_active,
            tagData.created_at,
            tagData.updated_at,
          ]
        )
      ).resolves.toBeDefined();
    });
  });

  describe('Tag Soft Delete Support', () => {
    it('should support soft deletion via is_active flag', async () => {
      // This test will fail until we implement the schema
      const tagData = {
        id: 'test-tag-soft-delete',
        fandom_id: 'test-fandom-uuid',
        name: 'deprecated-tag',
        slug: 'deprecated-tag',
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      // Insert tag
      await db.run(
        `
        INSERT INTO tags (id, fandom_id, name, slug, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        [
          tagData.id,
          tagData.fandom_id,
          tagData.name,
          tagData.slug,
          tagData.is_active,
          tagData.created_at,
          tagData.updated_at,
        ]
      );

      // Soft delete by setting is_active to false
      await db.run(
        `
        UPDATE tags SET is_active = ?, updated_at = ? WHERE id = ?
      `,
        [false, Date.now(), tagData.id]
      );

      // Verify record still exists but is inactive
      const result = await db.run(
        `
        SELECT * FROM tags WHERE id = ?
      `,
        [tagData.id]
      );

      expect(result[0]).toBeDefined();
      expect(result[0].is_active).toBe(0); // SQLite stores boolean as 1/0
    });
  });
});
