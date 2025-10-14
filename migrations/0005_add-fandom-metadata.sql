-- Migration: Add metadata column to fandoms table
-- Created: 2025-10-13
-- Description: Adds metadata field for storing additional fandom information as JSON

-- Add metadata field to fandoms
ALTER TABLE fandoms ADD COLUMN metadata TEXT;

-- Note: No index needed for JSON metadata column as it's rarely queried directly
