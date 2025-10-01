/**
 * Database Migration for Performance Optimization (T042)
 * Implements performance indexes and optimizations for the community submission system
 */
-- Migration: 004_performance_optimization.sql
-- Date: 2024-01-01
-- Description: Add performance indexes and optimizations for community submission system
BEGIN;
-- =================================================================
-- PRIMARY PERFORMANCE INDEXES
-- =================================================================
-- Submissions table performance indexes
CREATE INDEX IF NOT EXISTS idx_submissions_status_priority ON submissions(status, priority DESC, submission_date DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_fandom_status ON submissions(fandom_slug, status)
WHERE status IN ('pending', 'under_review');
CREATE INDEX IF NOT EXISTS idx_submissions_moderator_workload ON submissions(assigned_moderator_id, status)
WHERE assigned_moderator_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_submissions_date_status ON submissions(submission_date DESC, status);
-- Queue management indexes
CREATE INDEX IF NOT EXISTS idx_queue_positions_active ON submission_queue(queue_position ASC)
WHERE queue_position > 0;
CREATE INDEX IF NOT EXISTS idx_queue_moderator_assignment ON submission_queue(
    assigned_moderator_id,
    priority DESC,
    created_at ASC
)
WHERE assigned_moderator_id IS NOT NULL;
-- =================================================================
-- MODERATION WORKFLOW INDEXES
-- =================================================================
-- Moderation history performance
CREATE INDEX IF NOT EXISTS idx_moderation_history_submission_date ON moderation_history(submission_id, action_date DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_history_moderator_stats ON moderation_history(moderator_id, action_date DESC, action_type);
-- Moderator workload tracking
CREATE INDEX IF NOT EXISTS idx_moderator_assignments_active ON moderator_assignments(moderator_id, assigned_date DESC)
WHERE status = 'active';
-- =================================================================
-- GITHUB INTEGRATION INDEXES
-- =================================================================
-- GitHub issue tracking
CREATE INDEX IF NOT EXISTS idx_submissions_github_issue ON submissions(github_issue_number)
WHERE github_issue_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_github_webhooks_processing ON github_webhooks(issue_number, processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_github_webhooks_unprocessed ON github_webhooks(created_at ASC)
WHERE processed_at IS NULL;
-- =================================================================
-- EMAIL NOTIFICATION INDEXES
-- =================================================================
-- Email delivery tracking
CREATE INDEX IF NOT EXISTS idx_email_notifications_delivery ON email_notifications(recipient_email, status, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_notifications_template_stats ON email_notifications(template_type, status, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_notifications_failed ON email_notifications(created_at ASC)
WHERE status IN ('failed', 'bounced');
-- =================================================================
-- EXTENSION AND SUBMISSION INDEXES
-- =================================================================
-- Fandom and tag performance
CREATE INDEX IF NOT EXISTS idx_fandoms_active_name ON fandoms(is_active, name ASC)
WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tags_fandom_usage ON tags(fandom_slug, usage_count DESC)
WHERE is_active = true;
-- Submission tags for filtering
CREATE INDEX IF NOT EXISTS idx_submission_tags_compound ON submission_tags(submission_id, tag_id);
CREATE INDEX IF NOT EXISTS idx_submission_tags_tag_lookup ON submission_tags(tag_id, submission_id);
-- =================================================================
-- ADMIN AND USER MANAGEMENT INDEXES
-- =================================================================
-- Admin user lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_clerk_active ON admin_users(clerk_user_id)
WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_admin_users_role_permissions ON admin_users(role, is_active)
WHERE is_active = true;
-- User session tracking
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, expires_at DESC)
WHERE expires_at > CURRENT_TIMESTAMP;
-- =================================================================
-- ANALYTICS AND REPORTING INDEXES
-- =================================================================
-- Performance metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_operation ON performance_metrics(operation_name, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_slow ON performance_metrics(recorded_at DESC)
WHERE duration_ms > 5000;
-- Audit logs for admin actions
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id, created_at DESC);
-- =================================================================
-- FULL-TEXT SEARCH INDEXES (SQLite FTS)
-- =================================================================
-- Create FTS virtual table for story search
CREATE VIRTUAL TABLE IF NOT EXISTS submissions_fts USING fts5(
    story_title,
    story_author,
    story_description,
    custom_tags,
    content = 'submissions',
    content_rowid = 'id'
);
-- Populate FTS table
INSERT
    OR REPLACE INTO submissions_fts(
        rowid,
        story_title,
        story_author,
        story_description,
        custom_tags
    )
SELECT id,
    story_title,
    story_author,
    story_description,
    custom_tags
FROM submissions;
-- FTS triggers for automatic updates
CREATE TRIGGER IF NOT EXISTS submissions_fts_insert
AFTER
INSERT ON submissions BEGIN
INSERT INTO submissions_fts(
        rowid,
        story_title,
        story_author,
        story_description,
        custom_tags
    )
VALUES (
        new.id,
        new.story_title,
        new.story_author,
        new.story_description,
        new.custom_tags
    );
END;
CREATE TRIGGER IF NOT EXISTS submissions_fts_update
AFTER
UPDATE ON submissions BEGIN
DELETE FROM submissions_fts
WHERE rowid = old.id;
INSERT INTO submissions_fts(
        rowid,
        story_title,
        story_author,
        story_description,
        custom_tags
    )
VALUES (
        new.id,
        new.story_title,
        new.story_author,
        new.story_description,
        new.custom_tags
    );
END;
CREATE TRIGGER IF NOT EXISTS submissions_fts_delete
AFTER DELETE ON submissions BEGIN
DELETE FROM submissions_fts
WHERE rowid = old.id;
END;
-- =================================================================
-- PARTITIONING SETUP (for large datasets)
-- =================================================================
-- Create monthly partitions for large tables (example for audit_logs)
CREATE TABLE IF NOT EXISTS audit_logs_2024_01 (
    LIKE audit_logs INCLUDING ALL,
    CHECK (
        created_at >= '2024-01-01'
        AND created_at < '2024-02-01'
    )
);
CREATE TABLE IF NOT EXISTS audit_logs_2024_02 (
    LIKE audit_logs INCLUDING ALL,
    CHECK (
        created_at >= '2024-02-01'
        AND created_at < '2024-03-01'
    )
);
-- =================================================================
-- MATERIALIZED VIEW ALTERNATIVES (for SQLite)
-- =================================================================
-- Create optimized views for common queries
CREATE VIEW IF NOT EXISTS v_submission_queue_optimized AS
SELECT s.id,
    s.story_title,
    s.story_author,
    s.status,
    s.priority,
    s.submission_date,
    s.fandom_slug,
    f.name AS fandom_name,
    s.assigned_moderator_id,
    au.name AS moderator_name,
    au.email AS moderator_email,
    sq.queue_position,
    COUNT(mh.id) AS moderation_action_count
FROM submissions s
    JOIN fandoms f ON s.fandom_slug = f.slug
    LEFT JOIN admin_users au ON s.assigned_moderator_id = au.id
    LEFT JOIN submission_queue sq ON s.id = sq.submission_id
    LEFT JOIN moderation_history mh ON s.id = mh.submission_id
WHERE s.status IN ('pending', 'under_review', 'changes_requested')
GROUP BY s.id,
    f.name,
    au.name,
    au.email,
    sq.queue_position;
-- Moderator workload view
CREATE VIEW IF NOT EXISTS v_moderator_workload AS
SELECT au.id AS moderator_id,
    au.name AS moderator_name,
    au.email AS moderator_email,
    COUNT(
        CASE
            WHEN s.status IN ('pending', 'under_review') THEN 1
        END
    ) AS active_assignments,
    COUNT(
        CASE
            WHEN s.status = 'approved'
            AND DATE(mh.action_date) = DATE('now') THEN 1
        END
    ) AS approved_today,
    COUNT(
        CASE
            WHEN s.status = 'rejected'
            AND DATE(mh.action_date) = DATE('now') THEN 1
        END
    ) AS rejected_today,
    AVG(
        CASE
            WHEN mh.action_type IN ('approve', 'reject') THEN julianday(mh.action_date) - julianday(s.submission_date)
        END
    ) AS avg_review_days
FROM admin_users au
    LEFT JOIN submissions s ON au.id = s.assigned_moderator_id
    LEFT JOIN moderation_history mh ON s.id = mh.submission_id
    AND au.id = mh.moderator_id
WHERE au.role IN ('admin', 'moderator')
    AND au.is_active = true
GROUP BY au.id,
    au.name,
    au.email;
-- Queue statistics view
CREATE VIEW IF NOT EXISTS v_queue_statistics AS
SELECT COUNT(*) AS total_submissions,
    COUNT(
        CASE
            WHEN status = 'pending' THEN 1
        END
    ) AS pending_count,
    COUNT(
        CASE
            WHEN status = 'under_review' THEN 1
        END
    ) AS under_review_count,
    COUNT(
        CASE
            WHEN status = 'changes_requested' THEN 1
        END
    ) AS changes_requested_count,
    COUNT(
        CASE
            WHEN status = 'approved' THEN 1
        END
    ) AS approved_count,
    COUNT(
        CASE
            WHEN status = 'rejected' THEN 1
        END
    ) AS rejected_count,
    AVG(
        CASE
            WHEN status IN ('approved', 'rejected') THEN julianday('now') - julianday(submission_date)
        END
    ) AS avg_processing_days,
    MIN(
        CASE
            WHEN status IN ('pending', 'under_review', 'changes_requested') THEN julianday('now') - julianday(submission_date)
        END
    ) AS oldest_pending_days
FROM submissions;
-- =================================================================
-- PERFORMANCE MONITORING TABLES
-- =================================================================
-- Table for tracking query performance
CREATE TABLE IF NOT EXISTS query_performance_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query_name VARCHAR(100) NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    row_count INTEGER,
    cache_hit BOOLEAN DEFAULT false,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_query_perf_name_time (query_name, executed_at DESC),
    INDEX idx_query_perf_slow (execution_time_ms DESC, executed_at DESC)
);
-- Table for API endpoint performance
CREATE TABLE IF NOT EXISTS api_performance_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    response_time_ms INTEGER NOT NULL,
    status_code INTEGER NOT NULL,
    user_agent TEXT,
    ip_address VARCHAR(45),
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_api_perf_endpoint (endpoint, executed_at DESC),
    INDEX idx_api_perf_slow (response_time_ms DESC, executed_at DESC)
);
-- =================================================================
-- CLEANUP AND MAINTENANCE PROCEDURES
-- =================================================================
-- Create cleanup trigger for old performance logs (keep last 30 days)
CREATE TRIGGER IF NOT EXISTS cleanup_query_performance_log
AFTER
INSERT ON query_performance_log
    WHEN (
        SELECT COUNT(*)
        FROM query_performance_log
    ) > 100000 BEGIN
DELETE FROM query_performance_log
WHERE executed_at < datetime('now', '-30 days')
LIMIT 10000;
END;
CREATE TRIGGER IF NOT EXISTS cleanup_api_performance_log
AFTER
INSERT ON api_performance_log
    WHEN (
        SELECT COUNT(*)
        FROM api_performance_log
    ) > 100000 BEGIN
DELETE FROM api_performance_log
WHERE executed_at < datetime('now', '-30 days')
LIMIT 10000;
END;
-- =================================================================
-- ANALYZE TABLES FOR QUERY OPTIMIZER
-- =================================================================
-- Update table statistics for query optimizer
ANALYZE;
-- =================================================================
-- PERFORMANCE VALIDATION
-- =================================================================
-- Create a procedure to validate index effectiveness
-- (This would be implemented as application code since SQLite doesn't have stored procedures)
-- Example performance test queries that should be fast with new indexes:
-- 1. Queue retrieval with filters (should use idx_submissions_status_priority)
-- SELECT * FROM submissions
-- WHERE status = 'pending' AND priority = 'high'
-- ORDER BY submission_date DESC LIMIT 50;
-- 2. Moderator workload query (should use idx_submissions_moderator_workload)
-- SELECT COUNT(*) FROM submissions
-- WHERE assigned_moderator_id = 'mod_123' AND status IN ('pending', 'under_review');
-- 3. Fandom filtering (should use idx_submissions_fandom_status)
-- SELECT * FROM submissions
-- WHERE fandom_slug = 'harry-potter' AND status = 'approved'
-- ORDER BY submission_date DESC;
-- 4. Full-text search (should use submissions_fts)
-- SELECT * FROM submissions_fts
-- WHERE submissions_fts MATCH 'time travel harry hermione'
-- ORDER BY rank LIMIT 20;
COMMIT;
-- =================================================================
-- POST-MIGRATION PERFORMANCE VERIFICATION
-- =================================================================
-- After migration, run EXPLAIN QUERY PLAN on key queries to verify index usage
-- Example verification queries:
-- EXPLAIN QUERY PLAN
-- SELECT s.*, f.name as fandom_name
-- FROM submissions s
-- JOIN fandoms f ON s.fandom_slug = f.slug
-- WHERE s.status = 'pending'
-- ORDER BY s.priority DESC, s.submission_date ASC
-- LIMIT 50;
-- Expected: Should show index usage for status and ordering