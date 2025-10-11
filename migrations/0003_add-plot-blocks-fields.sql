-- Migration: Add category and tag_combination to plot_blocks table
-- Created: 2025-10-10
-- Description: Adds support for plot block categories and tag combinations
-- Add category field to plot_blocks
ALTER TABLE plot_blocks
ADD COLUMN category TEXT;
-- Add tag_combination field to plot_blocks (stored as JSON text)
ALTER TABLE plot_blocks
ADD COLUMN tag_combination TEXT;
-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_plot_blocks_category ON plot_blocks(category);
-- Create index for fandom_id + category filtering
CREATE INDEX IF NOT EXISTS idx_plot_blocks_fandom_category ON plot_blocks(fandom_id, category);