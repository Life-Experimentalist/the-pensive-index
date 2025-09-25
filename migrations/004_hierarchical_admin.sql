-- Migration 004: Hierarchical Admin System
-- Extends the admin system to support Project Admins and Fandom Admins
-- with role-based permissions and audit logging
--
-- Created: 2025-09-19
-- Feature: 004-build-a-hierarchical
-- ============================================================================
-- ADMIN ROLES & PERMISSIONS
-- ============================================================================
-- Admin role types enumeration
CREATE TABLE IF NOT EXISTS admin_roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    -- 'ProjectAdmin' or 'FandomAdmin'
    description TEXT NOT NULL,
    level INTEGER NOT NULL,
    -- 1 = Project, 2 = Fandom (for hierarchy)
    permissions TEXT NOT NULL,
    -- JSON array of permission strings
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Insert default admin roles
INSERT
    OR REPLACE INTO admin_roles (id, name, description, level, permissions)
VALUES (
        'project-admin',
        'ProjectAdmin',
        'Global admin with full platform permissions',
        1,
        '["fandom:create", "fandom:edit", "fandom:delete", "admin:assign", "admin:revoke", "validation:global", "audit:view", "users:manage"]'
    ),
    (
        'fandom-admin',
        'FandomAdmin',
        'Fandom-specific admin with content management permissions',
        2,
        '["tags:manage", "plotblocks:manage", "validation:fandom", "submissions:review", "content:moderate"]'
    );
-- ============================================================================
-- ADMIN USER ASSIGNMENTS
-- ============================================================================
-- Links users to admin roles with optional fandom scope
CREATE TABLE IF NOT EXISTS admin_assignments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    -- References Clerk user ID
    role_id TEXT NOT NULL,
    fandom_id TEXT,
    -- NULL for ProjectAdmin, required for FandomAdmin
    assigned_by TEXT NOT NULL,
    -- User ID of assigning admin
    is_active BOOLEAN DEFAULT TRUE,
    expires_at DATETIME,
    -- Optional expiration for temporary assignments
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES admin_roles(id),
    FOREIGN KEY (fandom_id) REFERENCES fandoms(id),
    -- Ensure one active assignment per user per fandom
    UNIQUE(user_id, role_id, fandom_id)
    WHERE is_active = TRUE
);
-- Index for efficient permission lookups
CREATE INDEX IF NOT EXISTS idx_admin_assignments_user_active ON admin_assignments(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_admin_assignments_fandom ON admin_assignments(fandom_id)
WHERE fandom_id IS NOT NULL;
-- ============================================================================
-- ADMIN INVITATIONS
-- ============================================================================
-- Tracks pending admin invitations
CREATE TABLE IF NOT EXISTS admin_invitations (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    role_id TEXT NOT NULL,
    fandom_id TEXT,
    -- NULL for ProjectAdmin invitations
    invited_by TEXT NOT NULL,
    -- User ID of inviting admin
    invitation_token TEXT NOT NULL UNIQUE,
    message TEXT,
    -- Optional personalized message
    status TEXT DEFAULT 'pending',
    -- 'pending', 'accepted', 'expired', 'revoked'
    expires_at DATETIME NOT NULL,
    accepted_at DATETIME,
    accepted_by TEXT,
    -- User ID when accepted
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES admin_roles(id),
    FOREIGN KEY (fandom_id) REFERENCES fandoms(id)
);
-- Index for token lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_admin_invitations_token ON admin_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_status_expires ON admin_invitations(status, expires_at);
-- ============================================================================
-- AUDIT LOGGING
-- ============================================================================
-- Comprehensive audit trail for all admin actions
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    -- Actor performing the action
    user_email TEXT NOT NULL,
    -- For historical reference
    action TEXT NOT NULL,
    -- Action type (e.g., 'admin:assign', 'fandom:create')
    resource_type TEXT NOT NULL,
    -- Type of affected resource
    resource_id TEXT,
    -- ID of affected resource
    fandom_id TEXT,
    -- Associated fandom (if applicable)
    details TEXT,
    -- JSON object with action details
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    -- If success = FALSE
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Indexes for efficient audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON admin_audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_timestamp ON admin_audit_logs(action, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_fandom_timestamp ON admin_audit_logs(fandom_id, timestamp DESC)
WHERE fandom_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON admin_audit_logs(resource_type, resource_id);
-- ============================================================================
-- PERMISSION CACHING
-- ============================================================================
-- Materialized view for fast permission lookups
CREATE TABLE IF NOT EXISTS admin_permission_cache (
    user_id TEXT NOT NULL,
    permission TEXT NOT NULL,
    fandom_id TEXT,
    -- NULL for global permissions
    granted BOOLEAN DEFAULT TRUE,
    expires_at DATETIME,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, permission, COALESCE(fandom_id, ''))
);
-- Index for permission checks
CREATE INDEX IF NOT EXISTS idx_permission_cache_lookup ON admin_permission_cache(user_id, permission, fandom_id);
-- ============================================================================
-- TRIGGERS FOR AUDIT LOGGING
-- ============================================================================
-- Trigger to log admin assignment changes
CREATE TRIGGER IF NOT EXISTS audit_admin_assignments_insert
AFTER
INSERT ON admin_assignments BEGIN
INSERT INTO admin_audit_logs (
        id,
        user_id,
        user_email,
        action,
        resource_type,
        resource_id,
        fandom_id,
        details,
        timestamp
    )
VALUES (
        hex(randomblob(16)),
        NEW.assigned_by,
        '',
        -- Will be populated by application
        'admin:assign',
        'admin_assignment',
        NEW.id,
        NEW.fandom_id,
        json_object(
            'assigned_user_id',
            NEW.user_id,
            'role_id',
            NEW.role_id,
            'fandom_id',
            NEW.fandom_id
        ),
        CURRENT_TIMESTAMP
    );
END;
-- Trigger to log admin assignment revocations
CREATE TRIGGER IF NOT EXISTS audit_admin_assignments_update
AFTER
UPDATE ON admin_assignments
    WHEN OLD.is_active = TRUE
    AND NEW.is_active = FALSE BEGIN
INSERT INTO admin_audit_logs (
        id,
        user_id,
        user_email,
        action,
        resource_type,
        resource_id,
        fandom_id,
        details,
        timestamp
    )
VALUES (
        hex(randomblob(16)),
        NEW.assigned_by,
        -- Should be updated to current user in app
        '',
        'admin:revoke',
        'admin_assignment',
        NEW.id,
        NEW.fandom_id,
        json_object(
            'revoked_user_id',
            NEW.user_id,
            'role_id',
            NEW.role_id,
            'fandom_id',
            NEW.fandom_id
        ),
        CURRENT_TIMESTAMP
    );
END;
-- ============================================================================
-- VIEWS FOR CONVENIENT QUERIES
-- ============================================================================
-- View for active admin assignments with role details
CREATE VIEW IF NOT EXISTS active_admin_assignments AS
SELECT aa.id,
    aa.user_id,
    aa.fandom_id,
    ar.name as role_name,
    ar.description as role_description,
    ar.level as role_level,
    ar.permissions,
    f.name as fandom_name,
    aa.assigned_by,
    aa.expires_at,
    aa.created_at
FROM admin_assignments aa
    JOIN admin_roles ar ON aa.role_id = ar.id
    LEFT JOIN fandoms f ON aa.fandom_id = f.id
WHERE aa.is_active = TRUE
    AND (
        aa.expires_at IS NULL
        OR aa.expires_at > CURRENT_TIMESTAMP
    );
-- View for pending invitations with role details
CREATE VIEW IF NOT EXISTS pending_admin_invitations AS
SELECT ai.id,
    ai.email,
    ai.invitation_token,
    ar.name as role_name,
    ar.description as role_description,
    f.name as fandom_name,
    ai.invited_by,
    ai.message,
    ai.expires_at,
    ai.created_at
FROM admin_invitations ai
    JOIN admin_roles ar ON ai.role_id = ar.id
    LEFT JOIN fandoms f ON ai.fandom_id = f.id
WHERE ai.status = 'pending'
    AND ai.expires_at > CURRENT_TIMESTAMP;
-- ============================================================================
-- CLEANUP PROCEDURES
-- ============================================================================
-- Note: These would typically be run by a scheduled job
-- Clean up expired invitations (older than 30 days)
-- UPDATE admin_invitations
-- SET status = 'expired'
-- WHERE status = 'pending'
--   AND expires_at < datetime('now', '-30 days');
-- Clean up old audit logs (older than 2 years)
-- DELETE FROM admin_audit_logs
-- WHERE timestamp < datetime('now', '-2 years');