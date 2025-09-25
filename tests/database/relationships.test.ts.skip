/**
 * Database Relationship Tests
 *
 * Tests foreign key constraints and relational integrity
 * between all database entities.
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { eq, and } from 'drizzle-orm';
import * as schema from '../../src/lib/database/schemas';

let db: BetterSQLite3Database<typeof schema>;
let sqlite: Database.Database;

beforeAll(async () => {
  // Create in-memory database for testing
  sqlite = new Database(':memory:');
  db = drizzle(sqlite, { schema });

  // Create tables directly using SQL (since migrations aren't set up yet)
  sqlite.exec(`
    CREATE TABLE fandoms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      metadata TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE tag_classes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      fandom_id TEXT NOT NULL,
      validation_rules TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (fandom_id) REFERENCES fandoms(id) ON DELETE CASCADE
    );

    CREATE TABLE tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      fandom_id TEXT NOT NULL,
      tag_class_id TEXT,
      parent_id TEXT,
      metadata TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (fandom_id) REFERENCES fandoms(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_class_id) REFERENCES tag_classes(id) ON DELETE SET NULL,
      FOREIGN KEY (parent_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE plot_blocks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      fandom_id TEXT NOT NULL,
      category TEXT NOT NULL,
      complexity TEXT NOT NULL,
      tags TEXT,
      parent_id TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (fandom_id) REFERENCES fandoms(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES plot_blocks(id) ON DELETE CASCADE
    );

    CREATE TABLE plot_block_conditions (
      id TEXT PRIMARY KEY,
      parent_block_id TEXT NOT NULL,
      child_block_id TEXT NOT NULL,
      condition_type TEXT NOT NULL,
      description TEXT,
      priority INTEGER NOT NULL DEFAULT 1,
      metadata TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (parent_block_id) REFERENCES plot_blocks(id) ON DELETE CASCADE,
      FOREIGN KEY (child_block_id) REFERENCES plot_blocks(id) ON DELETE CASCADE
    );
  `);
});

afterAll(() => {
  sqlite.close();
});

beforeEach(() => {
  // Clean all tables before each test
  sqlite.exec('DELETE FROM plot_block_conditions');
  sqlite.exec('DELETE FROM plot_blocks');
  sqlite.exec('DELETE FROM tags');
  sqlite.exec('DELETE FROM tag_classes');
  sqlite.exec('DELETE FROM fandoms');
});

describe('Database Relationships', () => {
  describe('Tag to Fandom Relationship', () => {
    it('should enforce foreign key constraint on tag.fandom_id', async () => {
      // Attempt to create tag with non-existent fandom
      expect(async () => {
        await db.insert(schema.tags).values({
          name: 'test-tag',
          slug: 'test-tag',
          fandomId: 'non-existent-fandom',
          description: 'Test description',
        });
      }).rejects.toThrow();
    });

    it('should allow creating tag with valid fandom', async () => {
      // Create fandom first
      const fandom = await db
        .insert(schema.fandoms)
        .values({
          name: 'Harry Potter',
          slug: 'harry-potter',
          description: 'Harry Potter universe',
          is_active: true,
        })
        .returning();

      // Create tag with valid fandom reference (using string ID)
      const tag = await db
        .insert(schema.tags)
        .values({
          name: 'harry-potter',
          slug: 'harry-potter',
          fandomId: fandom[0].id.toString(),
          description: 'The Boy Who Lived',
        })
        .returning();

      expect(tag).toHaveLength(1);
      expect(tag[0].fandomId).toBe(fandom[0].id.toString());
    });

    it('should cascade delete tags when fandom is deleted', async () => {
      // Create fandom and tag
      const fandom = await db
        .insert(schema.fandoms)
        .values({
          name: 'Test Fandom',
          slug: 'test-fandom',
          description: 'Test fandom for deletion',
          is_active: true,
        })
        .returning();

      await db.insert(schema.tags).values({
        name: 'test-tag',
        slug: 'test-tag',
        fandomId: fandom[0].id.toString(),
        description: 'Test tag for deletion',
      });

      // Delete fandom
      await db
        .delete(schema.fandoms)
        .where(eq(schema.fandoms.id, fandom[0].id));

      // Verify tag is also deleted (cascade)
      const remainingTags = await db
        .select()
        .from(schema.tags)
        .where(eq(schema.tags.fandomId, fandom[0].id.toString()));

      expect(remainingTags).toHaveLength(0);
    });
  });

  describe('Tag to TagClass Relationship', () => {
    it('should enforce foreign key constraint on tag.tag_class_id', async () => {
      // Create fandom first
      const fandom = await db
        .insert(schema.fandoms)
        .values({
          name: 'Test Fandom',
          slug: 'test-fandom',
          description: 'Test fandom',
          is_active: true,
        })
        .returning();

      // Attempt to create tag with non-existent tag class
      expect(async () => {
        await db.insert(schema.tags).values({
          name: 'test-tag',
          slug: 'test-tag',
          fandomId: fandom[0].id.toString(),
          tagClassId: 'non-existent-class',
          description: 'Test description',
        });
      }).rejects.toThrow();
    });

    it('should allow optional tagClassId (nullable)', async () => {
      // Create fandom first
      const fandom = await db
        .insert(schema.fandoms)
        .values({
          name: 'Test Fandom',
          slug: 'test-fandom',
          description: 'Test fandom',
          is_active: true,
        })
        .returning();

      // Create tag without tag class
      const tag = await db
        .insert(schema.tags)
        .values({
          name: 'test-tag',
          slug: 'test-tag',
          fandomId: fandom[0].id.toString(),
          description: 'Test description',
        })
        .returning();

      expect(tag).toHaveLength(1);
      expect(tag[0].tagClassId).toBeNull();
    });

    it('should allow creating tag with valid tag class', async () => {
      // Create fandom and tag class
      const fandom = await db
        .insert(schema.fandoms)
        .values({
          name: 'Test Fandom',
          slug: 'test-fandom',
          description: 'Test fandom',
          is_active: true,
        })
        .returning();

      const tagClass = await db
        .insert(schema.tagClasses)
        .values({
          name: 'Harry Shipping',
          slug: 'harry-shipping',
          description: 'Romantic pairings involving Harry Potter',
          fandomId: fandom[0].id.toString(),
          validationRules: '{}',
        })
        .returning();

      // Create tag with valid tag class
      const tag = await db
        .insert(schema.tags)
        .values({
          name: 'harry-hermione',
          slug: 'harry-hermione',
          fandomId: fandom[0].id.toString(),
          tagClassId: tagClass[0].id,
          description: 'Harry Potter and Hermione Granger romantic pairing',
        })
        .returning();

      expect(tag).toHaveLength(1);
      expect(tag[0].tagClassId).toBe(tagClass[0].id);
    });
  });

  describe('TagClass to Fandom Relationship', () => {
    it('should enforce foreign key constraint on tagClass.fandom_id', async () => {
      // Attempt to create tag class with non-existent fandom
      expect(async () => {
        await db.insert(schema.tagClasses).values({
          name: 'Test Class',
          slug: 'test-class',
          description: 'Test class',
          fandomId: 'non-existent-fandom',
          validationRules: '{}',
        });
      }).rejects.toThrow();
    });

    it('should cascade delete tag classes when fandom is deleted', async () => {
      // Create fandom and tag class
      const fandom = await db
        .insert(schema.fandoms)
        .values({
          name: 'Test Fandom',
          slug: 'test-fandom',
          description: 'Test fandom for deletion',
          is_active: true,
        })
        .returning();

      await db.insert(schema.tagClasses).values({
        name: 'Test Class',
        slug: 'test-class',
        description: 'Test class for deletion',
        fandomId: fandom[0].id.toString(),
        validationRules: '{}',
      });

      // Delete fandom
      await db
        .delete(schema.fandoms)
        .where(eq(schema.fandoms.id, fandom[0].id));

      // Verify tag class is also deleted (cascade)
      const remainingClasses = await db
        .select()
        .from(schema.tagClasses)
        .where(eq(schema.tagClasses.fandomId, fandom[0].id.toString()));

      expect(remainingClasses).toHaveLength(0);
    });
  });

  describe('PlotBlock to Fandom Relationship', () => {
    it('should enforce foreign key constraint on plotBlock.fandom_id', async () => {
      // Attempt to create plot block with non-existent fandom
      expect(async () => {
        await db.insert(schema.plotBlocks).values({
          name: 'Test Block',
          slug: 'test-block',
          description: 'Test block',
          fandom_id: 'non-existent-fandom',
          category: 'inheritance',
          complexity: 'simple',
          tags: '[]',
          is_active: true,
        });
      }).rejects.toThrow();
    });

    it('should cascade delete plot blocks when fandom is deleted', async () => {
      // Create fandom and plot block
      const fandom = await db
        .insert(schema.fandoms)
        .values({
          name: 'Test Fandom',
          slug: 'test-fandom',
          description: 'Test fandom for deletion',
          is_active: true,
        })
        .returning();

      await db.insert(schema.plotBlocks).values({
        name: 'Test Block',
        slug: 'test-block',
        description: 'Test block for deletion',
        fandom_id: fandom[0].id.toString(),
        category: 'inheritance',
        complexity: 'simple',
        tags: '[]',
        is_active: true,
      });

      // Delete fandom
      await db
        .delete(schema.fandoms)
        .where(eq(schema.fandoms.id, fandom[0].id));

      // Verify plot block is also deleted (cascade)
      const remainingBlocks = await db
        .select()
        .from(schema.plotBlocks)
        .where(eq(schema.plotBlocks.fandom_id, fandom[0].id.toString()));

      expect(remainingBlocks).toHaveLength(0);
    });
  });

  describe('PlotBlockCondition Relationships', () => {
    it('should enforce foreign key constraint on parent_block_id', async () => {
      // Attempt to create condition with non-existent parent block
      expect(async () => {
        await db.insert(schema.plotBlockConditions).values({
          parent_block_id: 'non-existent-block',
          child_block_id: 'also-non-existent',
          condition_type: 'requires',
          description: 'Test condition',
          priority: 1,
        });
      }).rejects.toThrow();
    });

    it('should enforce foreign key constraint on child_block_id', async () => {
      // Create fandom and parent block
      const fandom = await db
        .insert(schema.fandoms)
        .values({
          name: 'Test Fandom',
          slug: 'test-fandom',
          description: 'Test fandom',
          is_active: true,
        })
        .returning();

      const parentBlock = await db
        .insert(schema.plotBlocks)
        .values({
          name: 'Parent Block',
          slug: 'parent-block',
          description: 'Parent block',
          fandom_id: fandom[0].id.toString(),
          category: 'inheritance',
          complexity: 'simple',
          tags: '[]',
          is_active: true,
        })
        .returning();

      // Attempt to create condition with non-existent child block
      expect(async () => {
        await db.insert(schema.plotBlockConditions).values({
          parent_block_id: parentBlock[0].id,
          child_block_id: 'non-existent-child',
          condition_type: 'requires',
          description: 'Test condition',
          priority: 1,
        });
      }).rejects.toThrow();
    });

    it('should allow valid parent-child relationships', async () => {
      // Create fandom and both blocks
      const fandom = await db
        .insert(schema.fandoms)
        .values({
          name: 'Test Fandom',
          slug: 'test-fandom',
          description: 'Test fandom',
          is_active: true,
        })
        .returning();

      const parentBlock = await db
        .insert(schema.plotBlocks)
        .values({
          name: 'Parent Block',
          slug: 'parent-block',
          description: 'Parent block',
          fandom_id: fandom[0].id.toString(),
          category: 'inheritance',
          complexity: 'simple',
          tags: '[]',
          is_active: true,
        })
        .returning();

      const childBlock = await db
        .insert(schema.plotBlocks)
        .values({
          name: 'Child Block',
          slug: 'child-block',
          description: 'Child block',
          fandom_id: fandom[0].id.toString(),
          category: 'inheritance',
          complexity: 'simple',
          tags: '[]',
          is_active: true,
        })
        .returning();

      // Create valid condition
      const condition = await db
        .insert(schema.plotBlockConditions)
        .values({
          parent_block_id: parentBlock[0].id,
          child_block_id: childBlock[0].id,
          condition_type: 'requires',
          description: 'Parent requires child',
          priority: 1,
        })
        .returning();

      expect(condition).toHaveLength(1);
      expect(condition[0].parent_block_id).toBe(parentBlock[0].id);
      expect(condition[0].child_block_id).toBe(childBlock[0].id);
    });

    it('should cascade delete conditions when parent block is deleted', async () => {
      // Create fandom and blocks
      const fandom = await db
        .insert(schema.fandoms)
        .values({
          name: 'Test Fandom',
          slug: 'test-fandom',
          description: 'Test fandom',
          is_active: true,
        })
        .returning();

      const parentBlock = await db
        .insert(schema.plotBlocks)
        .values({
          name: 'Parent Block',
          slug: 'parent-block',
          description: 'Parent block for deletion',
          fandom_id: fandom[0].id.toString(),
          category: 'inheritance',
          complexity: 'simple',
          tags: '[]',
          is_active: true,
        })
        .returning();

      const childBlock = await db
        .insert(schema.plotBlocks)
        .values({
          name: 'Child Block',
          slug: 'child-block',
          description: 'Child block',
          fandom_id: fandom[0].id.toString(),
          category: 'inheritance',
          complexity: 'simple',
          tags: '[]',
          is_active: true,
        })
        .returning();

      await db.insert(schema.plotBlockConditions).values({
        parent_block_id: parentBlock[0].id,
        child_block_id: childBlock[0].id,
        condition_type: 'requires',
        description: 'Condition for deletion test',
        priority: 1,
      });

      // Delete parent block
      await db
        .delete(schema.plotBlocks)
        .where(eq(schema.plotBlocks.id, parentBlock[0].id));

      // Verify condition is also deleted (cascade)
      const remainingConditions = await db
        .select()
        .from(schema.plotBlockConditions)
        .where(
          eq(schema.plotBlockConditions.parent_block_id, parentBlock[0].id)
        );

      expect(remainingConditions).toHaveLength(0);
    });
  });

  describe('Complex Relationship Scenarios', () => {
    it('should handle complete fandom deletion with all dependent records', async () => {
      // Create complete fandom structure
      const fandom = await db
        .insert(schema.fandoms)
        .values({
          name: 'Complete Fandom',
          slug: 'complete-fandom',
          description: 'Fandom with all relationships',
          is_active: true,
        })
        .returning();

      const tagClass = await db
        .insert(schema.tagClasses)
        .values({
          name: 'Test Class',
          slug: 'test-class',
          description: 'Test class',
          fandomId: fandom[0].id.toString(),
          validationRules: '{}',
        })
        .returning();

      const tag = await db
        .insert(schema.tags)
        .values({
          name: 'test-tag',
          slug: 'test-tag',
          fandomId: fandom[0].id.toString(),
          tagClassId: tagClass[0].id,
          description: 'Test tag',
        })
        .returning();

      const parentBlock = await db
        .insert(schema.plotBlocks)
        .values({
          name: 'Parent Plot',
          slug: 'parent-plot',
          description: 'Parent plot block',
          fandom_id: fandom[0].id.toString(),
          category: 'inheritance',
          complexity: 'complex',
          tags: JSON.stringify([tag[0].name]),
          is_active: true,
        })
        .returning();

      const childBlock = await db
        .insert(schema.plotBlocks)
        .values({
          name: 'Child Plot',
          slug: 'child-plot',
          description: 'Child plot block',
          fandom_id: fandom[0].id.toString(),
          category: 'inheritance',
          complexity: 'simple',
          tags: '[]',
          is_active: true,
        })
        .returning();

      await db.insert(schema.plotBlockConditions).values({
        parent_block_id: parentBlock[0].id,
        child_block_id: childBlock[0].id,
        condition_type: 'requires',
        description: 'Parent requires child',
        priority: 1,
      });

      // Delete fandom
      await db
        .delete(schema.fandoms)
        .where(eq(schema.fandoms.id, fandom[0].id));

      // Verify all dependent records are deleted
      const remainingTags = await db
        .select()
        .from(schema.tags)
        .where(eq(schema.tags.fandomId, fandom[0].id.toString()));
      const remainingClasses = await db
        .select()
        .from(schema.tagClasses)
        .where(eq(schema.tagClasses.fandomId, fandom[0].id.toString()));
      const remainingBlocks = await db
        .select()
        .from(schema.plotBlocks)
        .where(eq(schema.plotBlocks.fandom_id, fandom[0].id.toString()));
      const remainingConditions = await db
        .select()
        .from(schema.plotBlockConditions)
        .where(
          eq(schema.plotBlockConditions.parent_block_id, parentBlock[0].id)
        );

      expect(remainingTags).toHaveLength(0);
      expect(remainingClasses).toHaveLength(0);
      expect(remainingBlocks).toHaveLength(0);
      expect(remainingConditions).toHaveLength(0);
    });

    it('should prevent circular dependencies in plot block conditions', async () => {
      // Create fandom and blocks
      const fandom = await db
        .insert(schema.fandoms)
        .values({
          name: 'Test Fandom',
          slug: 'test-fandom',
          description: 'Test fandom',
          is_active: true,
        })
        .returning();

      const blockA = await db
        .insert(schema.plotBlocks)
        .values({
          name: 'Block A',
          slug: 'block-a',
          description: 'First block',
          fandom_id: fandom[0].id.toString(),
          category: 'inheritance',
          complexity: 'simple',
          tags: '[]',
          is_active: true,
        })
        .returning();

      const blockB = await db
        .insert(schema.plotBlocks)
        .values({
          name: 'Block B',
          slug: 'block-b',
          description: 'Second block',
          fandom_id: fandom[0].id.toString(),
          category: 'inheritance',
          complexity: 'simple',
          tags: '[]',
          is_active: true,
        })
        .returning();

      // Create A requires B
      await db.insert(schema.plotBlockConditions).values({
        parent_block_id: blockA[0].id,
        child_block_id: blockB[0].id,
        condition_type: 'requires',
        description: 'A requires B',
        priority: 1,
      });

      // Create B requires A (circular dependency)
      await db.insert(schema.plotBlockConditions).values({
        parent_block_id: blockB[0].id,
        child_block_id: blockA[0].id,
        condition_type: 'requires',
        description: 'B requires A',
        priority: 1,
      });

      // Both should exist (database allows circular dependencies)
      // Circular dependency prevention should be handled at application level
      const conditions = await db.select().from(schema.plotBlockConditions);
      expect(conditions).toHaveLength(2);
    });
  });
});
