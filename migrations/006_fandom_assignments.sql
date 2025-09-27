-- Migration: Add Fandom Assignments Table
-- This tracks which FandomAdmins are assigned to which fandoms
CREATE TABLE IF NOT EXISTS user_fandom_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    -- Clerk user ID
    fandom_id INTEGER NOT NULL,
    -- Reference to fandoms table
    role TEXT NOT NULL CHECK (role IN ('FandomAdmin')),
    -- Future-proof for other fandom roles
    assigned_by TEXT NOT NULL,
    -- Clerk user ID of who assigned this
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    -- Constraints
    UNIQUE(user_id, fandom_id),
    -- One assignment per user per fandom
    FOREIGN KEY (fandom_id) REFERENCES fandoms(id) ON DELETE CASCADE
);
-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_fandom_assignments_user_id ON user_fandom_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_fandom_assignments_fandom_id ON user_fandom_assignments(fandom_id);
CREATE INDEX IF NOT EXISTS idx_user_fandom_assignments_active ON user_fandom_assignments(is_active);
-- Add created_at and updated_at if not exists
ALTER TABLE fandoms
ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE fandoms
ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;