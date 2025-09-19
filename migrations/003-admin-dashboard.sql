-- Migration: 003-admin-dashboard
-- Created: 2025-09-19T13:00:00Z
-- Description: Initial schema for admin dashboard functionality
-- ============================================================================
-- ADMIN USERS & PERMISSIONS
-- ============================================================================
CREATE TABLE admin_users (
    id TEXT PRIMARY KEY,
    clerk_user_id TEXT NOT NULL UNIQUE,
    role TEXT CHECK(role IN ('ProjectAdmin', 'FandomAdmin')) NOT NULL,
    fandom_permissions TEXT,
    -- JSON array of fandom IDs for FandomAdmins
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_admin_users_clerk_user_id ON admin_users(clerk_user_id);
CREATE INDEX idx_admin_users_role ON admin_users(role);
-- ============================================================================
-- RULE TEMPLATES (ProjectAdmin)
-- ============================================================================
CREATE TABLE rule_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    definition TEXT NOT NULL,
    -- JSON definition of the rule structure
    created_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES admin_users(id)
);
CREATE INDEX idx_rule_templates_name ON rule_templates(name);
-- ============================================================================
-- VALIDATION RULES (FandomAdmin)
-- ============================================================================
CREATE TABLE validation_rules (
    id TEXT PRIMARY KEY,
    fandom_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    definition TEXT NOT NULL,
    -- JSON definition, potentially based on a template
    is_active BOOLEAN DEFAULT TRUE,
    template_id TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES rule_templates(id),
    FOREIGN KEY (created_by) REFERENCES admin_users(id)
);
CREATE INDEX idx_validation_rules_fandom_id ON validation_rules(fandom_id);
CREATE INDEX idx_validation_rules_is_active ON validation_rules(is_active);
-- ============================================================================
-- TAG CLASSES (FandomAdmin)
-- ============================================================================
CREATE TABLE tag_classes (
    id TEXT PRIMARY KEY,
    fandom_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    constraints TEXT,
    -- JSON defining constraints for tags in this class
    created_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES admin_users(id)
);
CREATE UNIQUE INDEX uidx_tag_classes_fandom_name ON tag_classes(fandom_id, name);
-- ============================================================================
-- PLOT BLOCK HIERARCHIES (FandomAdmin)
-- ============================================================================
CREATE TABLE plot_block_hierarchies (
    id TEXT PRIMARY KEY,
    fandom_id TEXT NOT NULL,
    name TEXT NOT NULL,
    definition TEXT NOT NULL,
    -- JSON representing the tree structure
    created_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES admin_users(id)
);
CREATE INDEX idx_plot_block_hierarchies_fandom_id ON plot_block_hierarchies(fandom_id);
-- ============================================================================
-- TESTING SANDBOX
-- ============================================================================
CREATE TABLE test_scenarios (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    fandom_id TEXT NOT NULL,
    input_data TEXT NOT NULL,
    -- JSON of tags, plot blocks to test
    expected_result TEXT NOT NULL,
    -- JSON of expected validation outcome
    created_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES admin_users(id)
);
-- ============================================================================
-- IMPORT/EXPORT
-- ============================================================================
CREATE TABLE rule_set_exports (
    id TEXT PRIMARY KEY,
    fandom_id TEXT NOT NULL,
    export_data TEXT NOT NULL,
    -- JSON blob of the exported rule set
    version INTEGER NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES admin_users(id)
);