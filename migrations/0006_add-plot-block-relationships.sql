-- Migration: Add dependency and relationship columns to plot_blocks
-- Created: 2025-10-14
-- Description: Adds columns for plot block dependencies, requirements, children, conflicts, and enhancements
-- Add dependencies column (JSON array of plot block IDs)
ALTER TABLE plot_blocks
ADD COLUMN dependencies TEXT;
-- Add requires column (JSON array of required plot block IDs)
ALTER TABLE plot_blocks
ADD COLUMN requires TEXT;
-- Add children column (JSON array of child plot block IDs)
ALTER TABLE plot_blocks
ADD COLUMN children TEXT;
-- Add conflicts_with column (JSON array of conflicting plot block IDs)
ALTER TABLE plot_blocks
ADD COLUMN conflicts_with TEXT;
-- Add enhances column (JSON array of plot block IDs that this enhances)
ALTER TABLE plot_blocks
ADD COLUMN enhances TEXT;
-- Note: These are JSON text columns, no indexes needed as relationships are stored as arrays
