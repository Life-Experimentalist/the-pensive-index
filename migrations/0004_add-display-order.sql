-- Migration: Add display_order to plot_blocks table
-- Created: 2025-10-13
-- Description: Adds display_order field for ordering plot blocks in the UI

-- Add display_order field to plot_blocks (if not exists)
-- SQLite doesn't support ADD COLUMN IF NOT EXISTS, so we'll use a workaround
-- First, check if the column exists by trying to query it
-- If it fails, add the column

-- For better-sqlite3, we can just try to add it and ignore errors
-- But for proper migration, we'll add it unconditionally
ALTER TABLE plot_blocks ADD COLUMN display_order INTEGER DEFAULT 0 NOT NULL;

-- Create index for display_order
CREATE INDEX IF NOT EXISTS plot_blocks_display_order_idx ON plot_blocks(display_order);

-- Update existing rows to have sequential display_order based on created_at
UPDATE plot_blocks
SET display_order = (
  SELECT COUNT(*)
  FROM plot_blocks pb2
  WHERE pb2.fandom_id = plot_blocks.fandom_id
    AND pb2.created_at <= plot_blocks.created_at
);
