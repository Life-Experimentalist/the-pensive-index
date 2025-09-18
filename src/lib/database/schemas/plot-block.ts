import { relations } from 'drizzle-orm';
import {
  integer,
  sqliteTable,
  text,
  unique,
  index,
} from 'drizzle-orm/sqlite-core';
import { fandoms } from './fandom';

export const plotBlocks = sqliteTable(
  'plot_blocks',
  {
    id: text('id').primaryKey(),
    fandom_id: integer('fandom_id')
      .notNull()
      .references(() => fandoms.id, { onDelete: 'cascade' }),
    parent_id: text('parent_id'),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    display_order: integer('display_order').notNull(),
    is_active: integer('is_active', { mode: 'boolean' })
      .notNull()
      .default(true),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
  },
  table => ({
    // Unique constraint on fandom_id + parent_id + name combination
    fandomParentNameUnique: unique('plot_blocks_fandom_parent_name_unique').on(
      table.fandom_id,
      table.parent_id,
      table.name
    ),
    // Unique constraint on fandom_id + parent_id + slug combination
    fandomParentSlugUnique: unique('plot_blocks_fandom_parent_slug_unique').on(
      table.fandom_id,
      table.parent_id,
      table.slug
    ),
    // Performance indexes
    fandomIdIdx: index('plot_blocks_fandom_id_idx').on(table.fandom_id),
    parentIdIdx: index('plot_blocks_parent_id_idx').on(table.parent_id),
    slugIdx: index('plot_blocks_slug_idx').on(table.slug),
    displayOrderIdx: index('plot_blocks_display_order_idx').on(
      table.display_order
    ),
    isActiveIdx: index('plot_blocks_is_active_idx').on(table.is_active),
  })
);

export const plotBlocksRelations = relations(plotBlocks, ({ one, many }) => ({
  // Belongs to a fandom
  fandom: one(fandoms, {
    fields: [plotBlocks.fandom_id],
    references: [fandoms.id],
  }),
  // Self-referencing relationship for tree hierarchy
  parent: one(plotBlocks, {
    fields: [plotBlocks.parent_id],
    references: [plotBlocks.id],
    relationName: 'plot_block_hierarchy',
  }),
  children: many(plotBlocks, {
    relationName: 'plot_block_hierarchy',
  }),
}));

// Export types for convenience
export type PlotBlock = typeof plotBlocks.$inferSelect;
export type NewPlotBlock = typeof plotBlocks.$inferInsert;
