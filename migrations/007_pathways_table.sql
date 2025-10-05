-- Migration: Create pathways table
-- Description: Adds support for user-created story pathways with UUID-based IDs
CREATE TABLE IF NOT EXISTS pathways (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    fandom_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    selected_tags TEXT NOT NULL DEFAULT '[]',
    selected_plot_blocks TEXT NOT NULL DEFAULT '[]',
    is_public INTEGER NOT NULL DEFAULT 0,
    view_count INTEGER NOT NULL DEFAULT 0,
    match_count INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (fandom_id) REFERENCES fandoms(id) ON DELETE CASCADE
);
-- Index for faster user pathway lookups
CREATE INDEX IF NOT EXISTS idx_pathways_user_id ON pathways(user_id);
-- Index for public pathways
CREATE INDEX IF NOT EXISTS idx_pathways_public ON pathways(is_public)
WHERE is_public = 1;
-- Index for fandom lookups
CREATE INDEX IF NOT EXISTS idx_pathways_fandom_id ON pathways(fandom_id);