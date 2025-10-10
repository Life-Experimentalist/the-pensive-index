-- Migration: 0001_initial-schema
-- Created: 2025-01-10
-- Description: Initial database schema for The Pensieve Index
-- ======================================
-- CORE TABLES
-- ======================================
-- Fandoms table
CREATE TABLE IF NOT EXISTS fandoms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'User',
    is_active INTEGER DEFAULT 1,
    is_verified INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
-- ======================================
-- TAGGING SYSTEM
-- ======================================
-- Tag Classes table (validation logic containers)
CREATE TABLE IF NOT EXISTS tag_classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT NOT NULL,
    fandom_id TEXT NOT NULL,
    validation_rules TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (fandom_id) REFERENCES fandoms(id) ON DELETE CASCADE
);
-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    fandom_id TEXT NOT NULL,
    tag_class_id TEXT,
    parent_id TEXT,
    metadata TEXT,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    category TEXT,
    requires TEXT,
    enhances TEXT,
    FOREIGN KEY (fandom_id) REFERENCES fandoms(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_class_id) REFERENCES tag_classes(id) ON DELETE
    SET NULL,
        FOREIGN KEY (parent_id) REFERENCES tags(id) ON DELETE
    SET NULL
);
-- ======================================
-- PLOT BLOCKS (TROPES)
-- ======================================
-- Plot Block Categories table
CREATE TABLE IF NOT EXISTS plot_block_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    fandom_id TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (fandom_id) REFERENCES fandoms(id) ON DELETE CASCADE
);
-- Plot Blocks table (structured tropes with tag combinations)
CREATE TABLE IF NOT EXISTS plot_blocks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    fandom_id TEXT NOT NULL,
    plot_block_category_id TEXT,
    tag_combinations TEXT,
    -- JSON array of tag sets
    context TEXT,
    metadata TEXT,
    is_active INTEGER DEFAULT 1,
    parent_id TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (fandom_id) REFERENCES fandoms(id) ON DELETE CASCADE,
    FOREIGN KEY (plot_block_category_id) REFERENCES plot_block_categories(id) ON DELETE
    SET NULL,
        FOREIGN KEY (parent_id) REFERENCES plot_blocks(id) ON DELETE
    SET NULL
);
-- ======================================
-- STORY SUBMISSIONS
-- ======================================
-- Story Submissions table (community-submitted stories)
CREATE TABLE IF NOT EXISTS story_submissions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    url TEXT NOT NULL,
    fandom_id TEXT NOT NULL,
    tags TEXT,
    -- JSON array of tag IDs
    summary TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    submitted_by TEXT,
    github_issue_number INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (fandom_id) REFERENCES fandoms(id) ON DELETE CASCADE,
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE
    SET NULL
);
-- ======================================
-- ADMIN & PERMISSIONS
-- ======================================
-- Fandom Admin Assignments table
CREATE TABLE IF NOT EXISTS fandom_admin_assignments (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    fandom_id TEXT NOT NULL,
    assigned_at INTEGER NOT NULL DEFAULT (unixepoch()),
    assigned_by TEXT,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (fandom_id) REFERENCES fandoms(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE
    SET NULL,
        UNIQUE(admin_id, fandom_id)
);
-- Admin Invitations table
CREATE TABLE IF NOT EXISTS admin_invitations (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    fandom_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    created_by TEXT,
    FOREIGN KEY (fandom_id) REFERENCES fandoms(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE
    SET NULL
);
-- ======================================
-- AUDIT & LOGGING
-- ======================================
-- Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    changes TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- ======================================
-- PERFORMANCE INDEXES
-- ======================================
-- Fandoms indexes
CREATE INDEX IF NOT EXISTS idx_fandoms_slug ON fandoms(slug);
CREATE INDEX IF NOT EXISTS idx_fandoms_active ON fandoms(is_active);
-- Tags indexes
CREATE INDEX IF NOT EXISTS idx_tags_fandom ON tags(fandom_id);
CREATE INDEX IF NOT EXISTS idx_tags_class ON tags(tag_class_id);
CREATE INDEX IF NOT EXISTS idx_tags_parent ON tags(parent_id);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_tags_active ON tags(is_active);
-- Tag Classes indexes
CREATE INDEX IF NOT EXISTS idx_tag_classes_fandom ON tag_classes(fandom_id);
CREATE INDEX IF NOT EXISTS idx_tag_classes_slug ON tag_classes(slug);
-- Plot Blocks indexes
CREATE INDEX IF NOT EXISTS idx_plot_blocks_fandom ON plot_blocks(fandom_id);
CREATE INDEX IF NOT EXISTS idx_plot_blocks_category ON plot_blocks(plot_block_category_id);
CREATE INDEX IF NOT EXISTS idx_plot_blocks_parent ON plot_blocks(parent_id);
CREATE INDEX IF NOT EXISTS idx_plot_blocks_slug ON plot_blocks(slug);
CREATE INDEX IF NOT EXISTS idx_plot_blocks_active ON plot_blocks(is_active);
-- Plot Block Categories indexes
CREATE INDEX IF NOT EXISTS idx_plot_block_categories_fandom ON plot_block_categories(fandom_id);
CREATE INDEX IF NOT EXISTS idx_plot_block_categories_slug ON plot_block_categories(slug);
-- Submissions indexes
CREATE INDEX IF NOT EXISTS idx_submissions_fandom ON story_submissions(fandom_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON story_submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_by ON story_submissions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON story_submissions(created_at);
-- Fandom Admin Assignments indexes
CREATE INDEX IF NOT EXISTS idx_fandom_admins_admin ON fandom_admin_assignments(admin_id);
CREATE INDEX IF NOT EXISTS idx_fandom_admins_fandom ON fandom_admin_assignments(fandom_id);
-- Admin Invitations indexes
CREATE INDEX IF NOT EXISTS idx_invitations_email ON admin_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON admin_invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_fandom ON admin_invitations(fandom_id);
-- Audit Logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);