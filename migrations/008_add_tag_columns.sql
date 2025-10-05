-- Migration: Add category, requires, and enhances columns to tags table
-- Date: 2025-01-XX
-- Add category column
ALTER TABLE tags
ADD COLUMN category TEXT;
-- Add requires column (JSON array of tag IDs)
ALTER TABLE tags
ADD COLUMN requires TEXT;
-- Add enhances column (JSON array of tag IDs)
ALTER TABLE tags
ADD COLUMN enhances TEXT;