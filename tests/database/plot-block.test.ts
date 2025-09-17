import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getRawDatabase, closeDatabaseConnection } from '@/database/config';
import type { RawDatabaseConnection } from '@/database/config';

describe('PlotBlock Database Schema', () => {
  let db: RawDatabaseConnection;

  beforeEach(() => {
    db = getRawDatabase();
  });

  afterEach(() => {
    closeDatabaseConnection();
  });

  describe('PlotBlock Table Structure', () => {
    it('should have the correct plot_blocks table structure', async () => {
      // This test will fail until we implement the schema

      // Test that the plot_blocks table exists
      const tableInfo = await db.run(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='plot_blocks'
      `);

      expect(tableInfo).toBeDefined();

      // Test table columns
      const columns = await db.run(`PRAGMA table_info(plot_blocks)`);

      const expectedColumns = [
        { name: 'id', type: 'TEXT', pk: 1, notnull: 1 },
        { name: 'fandom_id', type: 'TEXT', pk: 0, notnull: 1 },
        { name: 'parent_id', type: 'TEXT', pk: 0, notnull: 0 },
        { name: 'name', type: 'TEXT', pk: 0, notnull: 1 },
        { name: 'slug', type: 'TEXT', pk: 0, notnull: 1 },
        { name: 'description', type: 'TEXT', pk: 0, notnull: 0 },
        { name: 'display_order', type: 'INTEGER', pk: 0, notnull: 1 },
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

    it('should have foreign key constraint to fandoms table', async () => {
      // Test foreign key - this will fail until schema is implemented
      const foreignKeys = await db.run(`PRAGMA foreign_key_list(plot_blocks)`);

      const fandomFK = foreignKeys.find(
        (fk: any) =>
          fk.table === 'fandoms' && fk.from === 'fandom_id' && fk.to === 'id'
      );
      expect(fandomFK).toBeDefined();
    });

    it('should have self-referencing foreign key for parent hierarchy', async () => {
      // Test self-referencing foreign key - this will fail until schema is implemented
      const foreignKeys = await db.run(`PRAGMA foreign_key_list(plot_blocks)`);

      const parentFK = foreignKeys.find(
        (fk: any) =>
          fk.table === 'plot_blocks' &&
          fk.from === 'parent_id' &&
          fk.to === 'id'
      );
      expect(parentFK).toBeDefined();
    });

    it('should have unique constraint on fandom_id + parent_id + name combination', async () => {
      // Test compound unique constraint - this will fail until schema is implemented
      const indexes = await db.run(`PRAGMA index_list(plot_blocks)`);

      const compoundIndex = indexes.find(
        (idx: any) =>
          idx.unique === 1 && idx.name.includes('fandom_parent_name')
      );
      expect(compoundIndex).toBeDefined();
    });

    it('should have unique constraint on fandom_id + parent_id + slug combination', async () => {
      // Test compound unique constraint - this will fail until schema is implemented
      const indexes = await db.run(`PRAGMA index_list(plot_blocks)`);

      const compoundIndex = indexes.find(
        (idx: any) =>
          idx.unique === 1 && idx.name.includes('fandom_parent_slug')
      );
      expect(compoundIndex).toBeDefined();
    });

    it('should have performance indexes', async () => {
      // Test performance indexes - this will fail until schema is implemented
      const indexes = await db.run(`PRAGMA index_list(plot_blocks)`);

      // Index on fandom_id for queries
      const fandomIndex = indexes.find((idx: any) =>
        idx.name.includes('fandom_id')
      );
      expect(fandomIndex).toBeDefined();

      // Index on parent_id for tree queries
      const parentIndex = indexes.find((idx: any) =>
        idx.name.includes('parent_id')
      );
      expect(parentIndex).toBeDefined();

      // Index on display_order for sorting
      const orderIndex = indexes.find((idx: any) =>
        idx.name.includes('display_order')
      );
      expect(orderIndex).toBeDefined();

      // Index on is_active for filtering
      const activeIndex = indexes.find((idx: any) =>
        idx.name.includes('active')
      );
      expect(activeIndex).toBeDefined();
    });
  });

  describe('PlotBlock CRUD Operations', () => {
    it('should insert a valid root plot block record', async () => {
      // This test will fail until we implement the schema
      const plotBlockData = {
        id: 'test-plotblock-uuid-1',
        fandom_id: 'test-fandom-uuid',
        parent_id: null, // Root level
        name: 'Goblin Inheritance',
        slug: 'goblin-inheritance',
        description: 'Harry discovers his inheritance through Gringotts',
        display_order: 1,
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      await expect(
        db.run(
          `
          INSERT INTO plot_blocks (id, fandom_id, parent_id, name, slug, description, display_order, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            plotBlockData.id,
            plotBlockData.fandom_id,
            plotBlockData.parent_id,
            plotBlockData.name,
            plotBlockData.slug,
            plotBlockData.description,
            plotBlockData.display_order,
            plotBlockData.is_active,
            plotBlockData.created_at,
            plotBlockData.updated_at,
          ]
        )
      ).resolves.toBeDefined();
    });

    it('should insert a valid child plot block record', async () => {
      // This test will fail until we implement the schema
      const parentData = {
        id: 'test-plotblock-parent',
        fandom_id: 'test-fandom-uuid',
        parent_id: null,
        name: 'Parent Block',
        slug: 'parent-block',
        display_order: 1,
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      const childData = {
        id: 'test-plotblock-child',
        fandom_id: 'test-fandom-uuid',
        parent_id: 'test-plotblock-parent', // Child of parent
        name: 'Child Block',
        slug: 'child-block',
        description: 'A child plot variation',
        display_order: 1,
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      // Insert parent first
      await db.run(
        `
        INSERT INTO plot_blocks (id, fandom_id, parent_id, name, slug, display_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          parentData.id,
          parentData.fandom_id,
          parentData.parent_id,
          parentData.name,
          parentData.slug,
          parentData.display_order,
          parentData.is_active,
          parentData.created_at,
          parentData.updated_at,
        ]
      );

      // Insert child
      await expect(
        db.run(
          `
          INSERT INTO plot_blocks (id, fandom_id, parent_id, name, slug, description, display_order, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            childData.id,
            childData.fandom_id,
            childData.parent_id,
            childData.name,
            childData.slug,
            childData.description,
            childData.display_order,
            childData.is_active,
            childData.created_at,
            childData.updated_at,
          ]
        )
      ).resolves.toBeDefined();
    });

    it('should enforce unique fandom_id + parent_id + name constraint', async () => {
      // This test will fail until we implement the schema
      const plotBlock1 = {
        id: 'test-plotblock-uuid-1',
        fandom_id: 'test-fandom-uuid',
        parent_id: null,
        name: 'Black Lordship',
        slug: 'black-lordship',
        display_order: 1,
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      const plotBlock2 = {
        id: 'test-plotblock-uuid-2',
        fandom_id: 'test-fandom-uuid', // Same fandom
        parent_id: null, // Same parent (null)
        name: 'Black Lordship', // Same name - should fail
        slug: 'black-lordship-alt',
        display_order: 2,
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      // First insert should succeed
      await db.run(
        `
        INSERT INTO plot_blocks (id, fandom_id, parent_id, name, slug, display_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          plotBlock1.id,
          plotBlock1.fandom_id,
          plotBlock1.parent_id,
          plotBlock1.name,
          plotBlock1.slug,
          plotBlock1.display_order,
          plotBlock1.is_active,
          plotBlock1.created_at,
          plotBlock1.updated_at,
        ]
      );

      // Second insert should fail due to unique constraint
      await expect(
        db.run(
          `
          INSERT INTO plot_blocks (id, fandom_id, parent_id, name, slug, display_order, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            plotBlock2.id,
            plotBlock2.fandom_id,
            plotBlock2.parent_id,
            plotBlock2.name,
            plotBlock2.slug,
            plotBlock2.display_order,
            plotBlock2.is_active,
            plotBlock2.created_at,
            plotBlock2.updated_at,
          ]
        )
      ).rejects.toThrow();
    });

    it('should allow same name under different parents', async () => {
      // This test will fail until we implement the schema
      const parent1 = {
        id: 'test-parent-1',
        fandom_id: 'test-fandom-uuid',
        parent_id: null,
        name: 'Parent 1',
        slug: 'parent-1',
        display_order: 1,
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      const parent2 = {
        id: 'test-parent-2',
        fandom_id: 'test-fandom-uuid',
        parent_id: null,
        name: 'Parent 2',
        slug: 'parent-2',
        display_order: 2,
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      const child1 = {
        id: 'test-child-1',
        fandom_id: 'test-fandom-uuid',
        parent_id: 'test-parent-1',
        name: 'Same Name Child',
        slug: 'same-name-child-1',
        display_order: 1,
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      const child2 = {
        id: 'test-child-2',
        fandom_id: 'test-fandom-uuid',
        parent_id: 'test-parent-2', // Different parent
        name: 'Same Name Child', // Same name - should succeed
        slug: 'same-name-child-2',
        display_order: 1,
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      // Insert both parents
      await db.run(
        `
        INSERT INTO plot_blocks (id, fandom_id, parent_id, name, slug, display_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          parent1.id,
          parent1.fandom_id,
          parent1.parent_id,
          parent1.name,
          parent1.slug,
          parent1.display_order,
          parent1.is_active,
          parent1.created_at,
          parent1.updated_at,
        ]
      );

      await db.run(
        `
        INSERT INTO plot_blocks (id, fandom_id, parent_id, name, slug, display_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          parent2.id,
          parent2.fandom_id,
          parent2.parent_id,
          parent2.name,
          parent2.slug,
          parent2.display_order,
          parent2.is_active,
          parent2.created_at,
          parent2.updated_at,
        ]
      );

      // Insert first child
      await db.run(
        `
        INSERT INTO plot_blocks (id, fandom_id, parent_id, name, slug, display_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          child1.id,
          child1.fandom_id,
          child1.parent_id,
          child1.name,
          child1.slug,
          child1.display_order,
          child1.is_active,
          child1.created_at,
          child1.updated_at,
        ]
      );

      // Insert second child - should succeed because different parent
      await expect(
        db.run(
          `
          INSERT INTO plot_blocks (id, fandom_id, parent_id, name, slug, display_order, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            child2.id,
            child2.fandom_id,
            child2.parent_id,
            child2.name,
            child2.slug,
            child2.display_order,
            child2.is_active,
            child2.created_at,
            child2.updated_at,
          ]
        )
      ).resolves.toBeDefined();
    });

    it('should enforce valid parent_id foreign key', async () => {
      // This test will fail until we implement the schema
      const childWithInvalidParent = {
        id: 'test-child-invalid-parent',
        fandom_id: 'test-fandom-uuid',
        parent_id: 'non-existent-parent', // Invalid parent reference
        name: 'Invalid Child',
        slug: 'invalid-child',
        display_order: 1,
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      // Should fail due to foreign key constraint
      await expect(
        db.run(
          `
          INSERT INTO plot_blocks (id, fandom_id, parent_id, name, slug, display_order, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            childWithInvalidParent.id,
            childWithInvalidParent.fandom_id,
            childWithInvalidParent.parent_id,
            childWithInvalidParent.name,
            childWithInvalidParent.slug,
            childWithInvalidParent.display_order,
            childWithInvalidParent.is_active,
            childWithInvalidParent.created_at,
            childWithInvalidParent.updated_at,
          ]
        )
      ).rejects.toThrow();
    });
  });

  describe('PlotBlock Tree Queries', () => {
    it('should support tree hierarchy queries', async () => {
      // This test will fail until we implement the schema

      // Insert test hierarchy: Root -> Child -> Grandchild
      const root = {
        id: 'root-block',
        fandom_id: 'test-fandom-uuid',
        parent_id: null,
        name: 'Root Block',
        slug: 'root-block',
        display_order: 1,
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      const child = {
        id: 'child-block',
        fandom_id: 'test-fandom-uuid',
        parent_id: 'root-block',
        name: 'Child Block',
        slug: 'child-block',
        display_order: 1,
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      const grandchild = {
        id: 'grandchild-block',
        fandom_id: 'test-fandom-uuid',
        parent_id: 'child-block',
        name: 'Grandchild Block',
        slug: 'grandchild-block',
        display_order: 1,
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      // Insert hierarchy
      await db.run(
        `
        INSERT INTO plot_blocks (id, fandom_id, parent_id, name, slug, display_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          root.id,
          root.fandom_id,
          root.parent_id,
          root.name,
          root.slug,
          root.display_order,
          root.is_active,
          root.created_at,
          root.updated_at,
        ]
      );

      await db.run(
        `
        INSERT INTO plot_blocks (id, fandom_id, parent_id, name, slug, display_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          child.id,
          child.fandom_id,
          child.parent_id,
          child.name,
          child.slug,
          child.display_order,
          child.is_active,
          child.created_at,
          child.updated_at,
        ]
      );

      await db.run(
        `
        INSERT INTO plot_blocks (id, fandom_id, parent_id, name, slug, display_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          grandchild.id,
          grandchild.fandom_id,
          grandchild.parent_id,
          grandchild.name,
          grandchild.slug,
          grandchild.display_order,
          grandchild.is_active,
          grandchild.created_at,
          grandchild.updated_at,
        ]
      );

      // Query root level blocks
      const rootBlocks = await db.all(
        `
        SELECT * FROM plot_blocks WHERE parent_id IS NULL AND fandom_id = ? ORDER BY display_order
      `,
        ['test-fandom-uuid']
      );

      expect(rootBlocks).toHaveLength(1);
      expect(rootBlocks[0].name).toBe('Root Block');

      // Query children of root
      const childBlocks = await db.all(
        `
        SELECT * FROM plot_blocks WHERE parent_id = ? ORDER BY display_order
      `,
        ['root-block']
      );

      expect(childBlocks).toHaveLength(1);
      expect(childBlocks[0].name).toBe('Child Block');

      // Query grandchildren
      const grandchildBlocks = await db.all(
        `
        SELECT * FROM plot_blocks WHERE parent_id = ? ORDER BY display_order
      `,
        ['child-block']
      );

      expect(grandchildBlocks).toHaveLength(1);
      expect(grandchildBlocks[0].name).toBe('Grandchild Block');
    });
  });

  describe('PlotBlock Soft Delete Support', () => {
    it('should support soft deletion via is_active flag', async () => {
      // This test will fail until we implement the schema
      const plotBlockData = {
        id: 'test-plotblock-soft-delete',
        fandom_id: 'test-fandom-uuid',
        parent_id: null,
        name: 'Deprecated Block',
        slug: 'deprecated-block',
        display_order: 1,
        is_active: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      // Insert plot block
      await db.run(
        `
        INSERT INTO plot_blocks (id, fandom_id, parent_id, name, slug, display_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          plotBlockData.id,
          plotBlockData.fandom_id,
          plotBlockData.parent_id,
          plotBlockData.name,
          plotBlockData.slug,
          plotBlockData.display_order,
          plotBlockData.is_active,
          plotBlockData.created_at,
          plotBlockData.updated_at,
        ]
      );

      // Soft delete by setting is_active to false
      await db.run(
        `
        UPDATE plot_blocks SET is_active = ?, updated_at = ? WHERE id = ?
      `,
        [false, Date.now(), plotBlockData.id]
      );

      // Verify record still exists but is inactive
      const result = await db.get(
        `
        SELECT * FROM plot_blocks WHERE id = ?
      `,
        [plotBlockData.id]
      );

      expect(result).toBeDefined();
      expect(result.is_active).toBe(0); // SQLite stores boolean as 1/0
    });
  });
});
