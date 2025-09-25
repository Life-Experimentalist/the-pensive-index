# Database Documentation

The Pensieve Index uses **Cloudflare D1** (SQLite) with **Drizzle ORM** for type-safe database operations.

## Database Architecture

### Core Entities

The database supports hierarchical fanfiction data with complex validation rules:

```sql
-- Core hierarchical structure
Fandoms
  ├── Tags (simple labels)
  ├── PlotBlocks (structured tropes with trees)
  ├── Characters (canonical character list)
  └── Stories (tagged fanfiction entries)

-- Relationship tables
TagClasses (validation logic)
PlotBlockTrees (hierarchical dependencies)
StoryTags (many-to-many story ↔ tags)
StoryPlotBlocks (many-to-many story ↔ plot blocks)
```

### Schema Overview

#### Primary Tables

**fandoms**
```sql
CREATE TABLE fandoms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  canonical_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**stories**
```sql
CREATE TABLE stories (
  id TEXT PRIMARY KEY,
  fandom_id TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  summary TEXT,
  word_count INTEGER,
  status TEXT CHECK (status IN ('complete', 'in-progress', 'abandoned')),
  rating TEXT CHECK (rating IN ('G', 'T', 'M', 'E')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fandom_id) REFERENCES fandoms(id)
);
```

**tags**
```sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  fandom_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  tag_class_id TEXT,
  aliases TEXT, -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fandom_id) REFERENCES fandoms(id),
  FOREIGN KEY (tag_class_id) REFERENCES tag_classes(id)
);
```

**plot_blocks**
```sql
CREATE TABLE plot_blocks (
  id TEXT PRIMARY KEY,
  fandom_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  parent_id TEXT,
  tree_data TEXT, -- JSON for complex tree structures
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fandom_id) REFERENCES fandoms(id),
  FOREIGN KEY (parent_id) REFERENCES plot_blocks(id)
);
```

#### Validation Tables

**tag_classes**
```sql
CREATE TABLE tag_classes (
  id TEXT PRIMARY KEY,
  fandom_id TEXT NOT NULL,
  name TEXT NOT NULL,
  validation_rules TEXT NOT NULL, -- JSON validation logic
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fandom_id) REFERENCES fandoms(id)
);
```

**validation_rules**
```sql
CREATE TABLE validation_rules (
  id TEXT PRIMARY KEY,
  fandom_id TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  rule_data TEXT NOT NULL, -- JSON rule configuration
  priority INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fandom_id) REFERENCES fandoms(id)
);
```

#### Relationship Tables

**story_tags**
```sql
CREATE TABLE story_tags (
  story_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (story_id, tag_id),
  FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

**story_plot_blocks**
```sql
CREATE TABLE story_plot_blocks (
  story_id TEXT NOT NULL,
  plot_block_id TEXT NOT NULL,
  PRIMARY KEY (story_id, plot_block_id),
  FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
  FOREIGN KEY (plot_block_id) REFERENCES plot_blocks(id) ON DELETE CASCADE
);
```

## Drizzle ORM Schema

### TypeScript Definitions

```typescript
// src/lib/database/schema.ts
import { sqliteTable, text, integer, datetime } from 'drizzle-orm/sqlite-core';

export const fandoms = sqliteTable('fandoms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  canonicalName: text('canonical_name').notNull(),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: datetime('updated_at').default('CURRENT_TIMESTAMP'),
});

export const stories = sqliteTable('stories', {
  id: text('id').primaryKey(),
  fandomId: text('fandom_id').notNull().references(() => fandoms.id),
  title: text('title').notNull(),
  author: text('author').notNull(),
  url: text('url').notNull().unique(),
  summary: text('summary'),
  wordCount: integer('word_count'),
  status: text('status').$type<'complete' | 'in-progress' | 'abandoned'>(),
  rating: text('rating').$type<'G' | 'T' | 'M' | 'E'>(),
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
});

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  fandomId: text('fandom_id').notNull().references(() => fandoms.id),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'),
  tagClassId: text('tag_class_id').references(() => tagClasses.id),
  aliases: text('aliases'), // JSON string
  createdAt: datetime('created_at').default('CURRENT_TIMESTAMP'),
});

// Relations
export const fandomsRelations = relations(fandoms, ({ many }) => ({
  stories: many(stories),
  tags: many(tags),
  plotBlocks: many(plotBlocks),
}));

export const storiesRelations = relations(stories, ({ one, many }) => ({
  fandom: one(fandoms, {
    fields: [stories.fandomId],
    references: [fandoms.id],
  }),
  storyTags: many(storyTags),
  storyPlotBlocks: many(storyPlotBlocks),
}));
```

### Complex Queries

#### Story Search with Tags

```typescript
// Find stories matching multiple tags
export async function findStoriesWithTags(
  fandomId: string,
  tagIds: string[]
): Promise<StoryWithTags[]> {
  return await db
    .select({
      story: stories,
      tags: sql<string[]>`
        json_group_array(
          json_object(
            'id', ${tags.id},
            'name', ${tags.name}
          )
        )
      `,
    })
    .from(stories)
    .innerJoin(storyTags, eq(stories.id, storyTags.storyId))
    .innerJoin(tags, eq(storyTags.tagId, tags.id))
    .where(
      and(
        eq(stories.fandomId, fandomId),
        inArray(tags.id, tagIds)
      )
    )
    .groupBy(stories.id)
    .having(sql`count(DISTINCT ${tags.id}) = ${tagIds.length}`);
}
```

#### Plot Block Tree Traversal

```typescript
// Get complete plot block tree
export async function getPlotBlockTree(
  blockId: string
): Promise<PlotBlockTree> {
  const withClause = sql`
    WITH RECURSIVE plot_tree AS (
      SELECT id, name, parent_id, 0 as level
      FROM plot_blocks
      WHERE id = ${blockId}

      UNION ALL

      SELECT p.id, p.name, p.parent_id, pt.level + 1
      FROM plot_blocks p
      INNER JOIN plot_tree pt ON p.parent_id = pt.id
    )
  `;

  return await db
    .with(withClause)
    .select()
    .from(sql`plot_tree`)
    .orderBy(sql`level`);
}
```

## Migration System

### Migration Files

Migrations are stored in `migrations/` directory:

```
migrations/
├── 0001_initial_schema.sql
├── 0002_add_validation_rules.sql
├── 0003_plot_block_trees.sql
└── 0004_story_submission_workflow.sql
```

### Sample Migration

```sql
-- migrations/0001_initial_schema.sql
-- Create initial database schema

CREATE TABLE fandoms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  canonical_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fandoms_canonical ON fandoms(canonical_name);

CREATE TABLE stories (
  id TEXT PRIMARY KEY,
  fandom_id TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  summary TEXT,
  word_count INTEGER,
  status TEXT CHECK (status IN ('complete', 'in-progress', 'abandoned')),
  rating TEXT CHECK (rating IN ('G', 'T', 'M', 'E')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fandom_id) REFERENCES fandoms(id)
);

CREATE INDEX idx_stories_fandom ON stories(fandom_id);
CREATE INDEX idx_stories_status ON stories(status);
CREATE INDEX idx_stories_word_count ON stories(word_count);

-- Add seed data
INSERT INTO fandoms (id, name, canonical_name, description) VALUES
  ('harry-potter', 'Harry Potter', 'Harry Potter - J. K. Rowling', 'The wizarding world created by J.K. Rowling'),
  ('percy-jackson', 'Percy Jackson', 'Percy Jackson and the Olympians - Rick Riordan', 'Modern Greek mythology series');
```

### Running Migrations

```powershell
# Apply all pending migrations
npm run db:migrate

# Apply specific migration
npm run db:migrate -- --to=0003

# Rollback last migration
npm run db:rollback

# Create new migration
npm run db:create-migration -- --name="add_user_preferences"
```

## Data Seeding

### Seed Configuration

```typescript
// seeds/harry-potter.ts
export const harryPotterSeed = {
  fandom: {
    id: 'harry-potter',
    name: 'Harry Potter',
    canonicalName: 'Harry Potter - J. K. Rowling',
    description: 'The wizarding world created by J.K. Rowling',
  },

  tags: [
    {
      id: 'angst',
      name: 'Angst',
      description: 'Heavy emotional content',
      category: 'tone',
    },
    {
      id: 'time-travel',
      name: 'Time Travel',
      description: 'Characters traveling through time',
      category: 'plot-device',
    },
    {
      id: 'harry-hermione',
      name: 'Harry/Hermione',
      description: 'Romantic relationship between Harry and Hermione',
      category: 'relationship',
      tagClassId: 'harry-shipping',
    },
  ],

  plotBlocks: [
    {
      id: 'goblin-inheritance',
      name: 'Goblin Inheritance',
      description: 'Harry discovers magical inheritance through Gringotts',
      treeData: {
        children: ['black-lordship', 'slytherin-lordship', 'potter-heritage']
      }
    },
    {
      id: 'black-lordship',
      name: 'Black Lordship',
      description: 'Harry inherits the Black family lordship',
      parentId: 'goblin-inheritance',
      treeData: {
        conditions: ['after-sirius-death'],
        children: ['black-head-of-family', 'gryffindor-head-of-family']
      }
    },
  ],

  validationRules: [
    {
      id: 'harry-shipping-exclusive',
      ruleType: 'exclusivity',
      ruleData: {
        tagClass: 'harry-shipping',
        maxSelections: 1,
        message: 'Harry can only be paired with one character'
      }
    },
  ],
};
```

### Seeding Commands

```powershell
# Seed all fandoms
npm run db:seed

# Seed specific fandom
npm run db:seed -- --fandom=harry-potter

# Seed with test stories
npm run db:seed -- --include-stories
```

## Query Optimization

### Indexing Strategy

```sql
-- Core performance indexes
CREATE INDEX idx_stories_fandom_status ON stories(fandom_id, status);
CREATE INDEX idx_stories_word_count_rating ON stories(word_count, rating);
CREATE INDEX idx_story_tags_tag ON story_tags(tag_id);
CREATE INDEX idx_story_plot_blocks_block ON story_plot_blocks(plot_block_id);

-- Full-text search indexes
CREATE VIRTUAL TABLE story_search USING fts5(
  title,
  author,
  summary,
  content=stories,
  content_rowid=rowid
);

-- Triggers to maintain FTS index
CREATE TRIGGER story_search_insert AFTER INSERT ON stories BEGIN
  INSERT INTO story_search(rowid, title, author, summary)
  VALUES (new.rowid, new.title, new.author, new.summary);
END;
```

### Query Performance

```typescript
// Optimized story search with relevance scoring
export async function searchStoriesOptimized(
  fandomId: string,
  pathway: PathwayConfig
): Promise<SearchResults> {
  const query = db
    .select({
      story: stories,
      matchScore: sql<number>`
        (
          -- Tag match scoring
          CASE WHEN ${pathway.tags.length} > 0
          THEN (
            SELECT CAST(COUNT(*) AS REAL) / ${pathway.tags.length}
            FROM story_tags st
            WHERE st.story_id = stories.id
            AND st.tag_id IN ${pathway.tags}
          ) ELSE 0 END
          +
          -- Plot block match scoring
          CASE WHEN ${pathway.plotBlocks.length} > 0
          THEN (
            SELECT CAST(COUNT(*) AS REAL) / ${pathway.plotBlocks.length}
            FROM story_plot_blocks spb
            WHERE spb.story_id = stories.id
            AND spb.plot_block_id IN ${pathway.plotBlocks}
          ) ELSE 0 END
        ) / 2.0
      `,
    })
    .from(stories)
    .where(eq(stories.fandomId, fandomId))
    .orderBy(sql`match_score DESC`)
    .limit(20);

  return await query;
}
```

## Backup and Recovery

### Database Backup

```powershell
# Backup current database
npm run db:backup

# Backup with timestamp
npm run db:backup -- --name="pre-migration-$(Get-Date -Format 'yyyy-MM-dd')"

# Restore from backup
npm run db:restore -- --file="backup-2024-01-15.db"
```

### Data Export

```typescript
// Export fandom data for backup
export async function exportFandomData(fandomId: string) {
  return {
    fandom: await db.select().from(fandoms).where(eq(fandoms.id, fandomId)),
    tags: await db.select().from(tags).where(eq(tags.fandomId, fandomId)),
    plotBlocks: await db.select().from(plotBlocks).where(eq(plotBlocks.fandomId, fandomId)),
    validationRules: await db.select().from(validationRules).where(eq(validationRules.fandomId, fandomId)),
  };
}
```

## Development Tools

### Database Utilities

```powershell
# View database schema
npm run db:schema

# Generate migration from schema changes
npm run db:generate

# View current database state
npm run db:studio

# Reset database to clean state
npm run db:reset
```

### Testing Database

```typescript
// Test database setup
import { beforeEach, afterEach } from 'vitest';

beforeEach(async () => {
  // Create test database
  await resetTestDatabase();
  await seedTestData();
});

afterEach(async () => {
  // Clean up test data
  await cleanupTestDatabase();
});
```

---

*For database deployment configuration, see [Deployment Documentation](../deployment/README.md).*
