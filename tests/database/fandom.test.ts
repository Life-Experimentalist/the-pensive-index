import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getRawDatabase, closeDatabaseConnection } from '@/database/config';
import type { RawDatabaseConnection } from '@/database/config';

describe('Fandom Database Schema', () => {
  let db: RawDatabaseConnection;

  beforeEach(() => {
    db = getRawDatabase();
  });

  beforeEach(async () => {
    // Clean the database before each test
    try {
      await db.run('DELETE FROM fandoms');
    } catch (error) {
      // Table might not exist yet, that's okay
    }
  });

  afterEach(() => {
    closeDatabaseConnection();
  });

  describe('Fandom Table Structure', () => {
    it('should have the correct fandom table structure', async () => {
      // This test will fail until we implement the schema

      // Test that the fandoms table exists
      const tableInfo = await db.run(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='fandoms'
      `);

      expect(tableInfo).toBeDefined();

      // Test table columns
      const columns = await db.run(`PRAGMA table_info(fandoms)`);

      const expectedColumns = [
        { name: 'id', type: 'TEXT', pk: 1, notnull: 1 },
        { name: 'name', type: 'TEXT', pk: 0, notnull: 1 },
        { name: 'slug', type: 'TEXT', pk: 0, notnull: 1 },
        { name: 'description', type: 'TEXT', pk: 0, notnull: 0 },
        { name: 'is_active', type: 'INTEGER', pk: 0, notnull: 1 },
        { name: 'created_at', type: 'INTEGER', pk: 0, notnull: 1 },
        { name: 'updated_at', type: 'INTEGER', pk: 0, notnull: 1 },
      ];

      expectedColumns.forEach((expectedCol) => {
        const column = columns.find(
          (col: any) => col.name === expectedCol.name
        );
        expect(column).toBeDefined();
        expect(column.type).toBe(expectedCol.type);
        expect(column.pk).toBe(expectedCol.pk);
        expect(column.notnull).toBe(expectedCol.notnull);
      });
    });

    it('should have unique constraints on name and slug', async () => {
      // Test unique constraints - this will fail until schema is implemented
      const indexes = await db.run(`PRAGMA index_list(fandoms)`);

      // Check for unique index on name
      const nameIndex = indexes.find(
        (idx: any) => idx.name.includes('name') && idx.unique === 1
      );
      expect(nameIndex).toBeDefined();

      // Check for unique index on slug
      const slugIndex = indexes.find(
        (idx: any) => idx.name.includes('slug') && idx.unique === 1
      );
      expect(slugIndex).toBeDefined();
    });

    it('should have an index on is_active column', async () => {
      // Test performance index - this will fail until schema is implemented
      const indexes = await db.run(`PRAGMA index_list(fandoms)`);

      const activeIndex = indexes.find((idx: any) =>
        idx.name.includes('active')
      );
      expect(activeIndex).toBeDefined();
    });
  });

  describe('Fandom CRUD Operations', () => {
    it('should insert a valid fandom record', async () => {
      // This test will fail until we implement the schema
      const fandomData = {
        id: 'test-uuid-1',
        name: 'Harry Potter',
        slug: 'harry-potter',
        description: 'The wizarding world by J.K. Rowling',
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      await expect(
        db.run(
          `
          INSERT INTO fandoms (id, name, slug, description, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
          [
            fandomData.id,
            fandomData.name,
            fandomData.slug,
            fandomData.description,
            fandomData.is_active,
            fandomData.created_at,
            fandomData.updated_at,
          ]
        )
      ).resolves.toBeDefined();
    });

    it('should enforce unique name constraint', async () => {
      // This test will fail until we implement the schema
      const fandom1 = {
        id: 'test-uuid-1',
        name: 'Harry Potter',
        slug: 'harry-potter',
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      const fandom2 = {
        id: 'test-uuid-2',
        name: 'Harry Potter', // Same name - should fail
        slug: 'harry-potter-alt',
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      // First insert should succeed
      await db.run(
        `
        INSERT INTO fandoms (id, name, slug, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [
          fandom1.id,
          fandom1.name,
          fandom1.slug,
          fandom1.is_active,
          fandom1.created_at,
          fandom1.updated_at,
        ]
      );

      // Second insert should fail due to unique name constraint
      await expect(
        db.run(
          `
          INSERT INTO fandoms (id, name, slug, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
          [
            fandom2.id,
            fandom2.name,
            fandom2.slug,
            fandom2.is_active,
            fandom2.created_at,
            fandom2.updated_at,
          ]
        )
      ).rejects.toThrow();
    });

    it('should enforce unique slug constraint', async () => {
      // This test will fail until we implement the schema
      const fandom1 = {
        id: 'test-uuid-1',
        name: 'Harry Potter',
        slug: 'harry-potter',
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      const fandom2 = {
        id: 'test-uuid-2',
        name: 'Harry Potter Alternative',
        slug: 'harry-potter', // Same slug - should fail
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      // First insert should succeed
      await db.run(
        `
        INSERT INTO fandoms (id, name, slug, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [
          fandom1.id,
          fandom1.name,
          fandom1.slug,
          fandom1.is_active,
          fandom1.created_at,
          fandom1.updated_at,
        ]
      );

      // Second insert should fail due to unique slug constraint
      await expect(
        db.run(
          `
          INSERT INTO fandoms (id, name, slug, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
          [
            fandom2.id,
            fandom2.name,
            fandom2.slug,
            fandom2.is_active,
            fandom2.created_at,
            fandom2.updated_at,
          ]
        )
      ).rejects.toThrow();
    });

    it('should allow null description', async () => {
      // This test will fail until we implement the schema
      const fandomData = {
        id: 'test-uuid-null-desc',
        name: 'Test Fandom',
        slug: 'test-fandom',
        description: null,
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      await expect(
        db.run(
          `
          INSERT INTO fandoms (id, name, slug, description, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
          [
            fandomData.id,
            fandomData.name,
            fandomData.slug,
            fandomData.description,
            fandomData.is_active,
            fandomData.created_at,
            fandomData.updated_at,
          ]
        )
      ).resolves.toBeDefined();
    });

    it('should default is_active to true', async () => {
      // This test will fail until we implement the schema
      const fandomData = {
        id: 'test-uuid-default',
        name: 'Default Active Fandom',
        slug: 'default-active',
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      await db.run(
        `
        INSERT INTO fandoms (id, name, slug, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `,
        [
          fandomData.id,
          fandomData.name,
          fandomData.slug,
          fandomData.created_at,
          fandomData.updated_at,
        ]
      );

      const result = await db.run(
        `
        SELECT is_active FROM fandoms WHERE id = ?
      `,
        [fandomData.id]
      );

      expect(result[0]?.is_active).toBe(1); // SQLite stores boolean as 1/0
    });
  });

  describe('Fandom Soft Delete Support', () => {
    it('should support soft deletion via is_active flag', async () => {
      // This test will fail until we implement the schema
      const fandomData = {
        id: 'test-uuid-soft-delete',
        name: 'Soft Delete Test',
        slug: 'soft-delete-test',
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      // Insert fandom
      await db.run(
        `
        INSERT INTO fandoms (id, name, slug, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [
          fandomData.id,
          fandomData.name,
          fandomData.slug,
          fandomData.is_active,
          fandomData.created_at,
          fandomData.updated_at,
        ]
      );

      // Soft delete by setting is_active to false
      await db.run(
        `
        UPDATE fandoms SET is_active = ?, updated_at = ? WHERE id = ?
      `,
        [false, Date.now(), fandomData.id]
      );

      // Verify record still exists but is inactive
      const result = await db.run(
        `
        SELECT * FROM fandoms WHERE id = ?
      `,
        [fandomData.id]
      );

      expect(result[0]).toBeDefined();
      expect(result[0].is_active).toBe(0); // SQLite stores boolean as 1/0
    });
  });
});
