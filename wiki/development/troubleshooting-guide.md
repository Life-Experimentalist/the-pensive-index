# Admin System Troubleshooting Guide

## Quick Diagnostics

### 🚨 Emergency Checklist
Use this checklist for immediate issues:

1. **System Status**: Check `/api/admin/system/health`
2. **User Access**: Verify your current role and permissions
3. **Network**: Confirm internet connectivity
4. **Browser**: Clear cache and cookies
5. **Recent Changes**: Check audit logs for recent modifications

### 🔍 Problem Categories

| Issue Type            | Urgency  | First Action                          |
| --------------------- | -------- | ------------------------------------- |
| 🔥 System Down         | Critical | Check system health endpoint          |
| 🚫 Access Denied       | High     | Verify role and permissions           |
| 🐌 Slow Performance    | Medium   | Check system load metrics             |
| 🔧 Feature Not Working | Medium   | Check feature flags and configuration |
| 📧 Email Issues        | Low      | Verify email service status           |

## Authentication & Access Issues

### Cannot Access Admin Panel

#### Symptoms
- Login page redirects in loop
- "Access denied" on admin routes
- Page loads but shows empty content

#### Diagnostic Steps
1. **Check User Status**:
   ```bash
   # Query user status via API
   GET /api/admin/users/me
   ```
   Expected response should include:
   ```json
   {
     "id": "user_123",
     "role": "fandom-admin",
     "status": "active",
     "permissions": ["user.read", "content.moderate"]
   }
   ```

2. **Verify Role Assignment**:
   - Check if user has any admin role
   - Confirm role is active and not expired
   - Verify role hierarchy is correct

3. **Check Session Validity**:
   - Clear browser cache and cookies
   - Try incognito/private browsing mode
   - Check JWT token expiration

#### Common Solutions

**Solution 1: Role Assignment Issue**
```sql
-- Check user's current role
SELECT u.email, ur.role, ur.status, ur.created_at
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'admin@example.com';
```

**Solution 2: Permission Cache Clear**
1. Navigate to System Administration
2. Click "Clear Permission Cache"
3. Wait 30 seconds for propagation
4. Try accessing admin panel again

**Solution 3: Session Reset**
1. Log out completely
2. Clear all site data in browser
3. Restart browser
4. Log in again

### "Insufficient Permissions" Errors

#### Symptoms
- Can access some admin features but not others
- Error messages: "You don't have permission to perform this action"
- Blank pages where content should appear

#### Diagnostic Process

1. **Check Current Permissions**:
   ```bash
   GET /api/admin/permissions/effective?userEmail=your@email.com
   ```

2. **Compare Required vs Current**:
   - Check what permissions the action requires
   - Verify your current effective permissions
   - Look for permission conflicts or overrides

3. **Verify Hierarchy Rules**:
   - Ensure you're not trying to manage users above your level
   - Check fandom scope restrictions
   - Confirm bulk operation limits

#### Solutions by Role

**For Moderators**:
- Can only moderate content within assigned fandom
- Cannot assign roles or manage users
- Limited audit log access

**For Fandom Admins**:
- Can manage users within fandom scope only
- Cannot assign Project Admin or Super Admin roles
- Cannot access system configuration

**For Project Admins**:
- Cannot assign Super Admin roles
- Cannot modify system-wide configuration
- Can manage cross-fandom operations

### Token and Session Issues

#### Expired Token Problems

**Symptoms**:
- Automatic logouts during work
- "Token expired" errors
- Frequent re-authentication requests

**Solutions**:
1. **Extend Session Timeout**:
   - Navigate to System Settings
   - Increase "Admin Session Timeout"
   - Default: 4 hours, Recommended: 8 hours

2. **Enable Token Refresh**:
   - Check "Auto-refresh tokens" in user preferences
   - Verify refresh token endpoint is working
   - Monitor network tab for 401 responses

3. **Check Token Validity**:
   ```javascript
   // In browser console
   const token = localStorage.getItem('admin_token');
   const decoded = JSON.parse(atob(token.split('.')[1]));
   console.log('Token expires:', new Date(decoded.exp * 1000));
   ```

## User Management Issues

### Users Not Appearing in Lists

#### Common Causes
1. **Filter Settings**: Incorrect filters applied
2. **Scope Limitations**: User outside your management scope
3. **Status Filters**: User in different status category
4. **Search Issues**: Search terms too restrictive

#### Diagnostic Steps

1. **Check Applied Filters**:
   - Clear all filters and search terms
   - Verify date range settings
   - Check status filter (active/inactive/all)

2. **Verify Management Scope**:
   ```bash
   GET /api/admin/users?includeScope=true
   ```
   This shows which users you can manage based on your role.

3. **Check User Status**:
   ```sql
   SELECT email, status, role, fandom_id, created_at
   FROM users
   WHERE email LIKE '%search-term%';
   ```

#### Solutions

**Clear All Filters**:
1. Click "Reset Filters" button
2. Ensure "All Status" is selected
3. Clear search box
4. Refresh page

**Expand Search Scope**:
- For Fandom Admins: Check if user is in different fandom
- For Project Admins: Verify cross-fandom permissions
- For Super Admins: Check if user exists in system

### Bulk Operations Failing

#### Symptoms
- Bulk operations timeout
- Partial completion with errors
- "Operation too large" messages

#### Diagnostic Approach

1. **Check Operation Size**:
   - Maximum bulk operation: 100 users at once
   - Split large operations into smaller batches
   - Monitor system resources during operations

2. **Verify Target User Permissions**:
   ```bash
   POST /api/admin/roles/validate-bulk
   {
     "userEmails": ["user1@example.com", "user2@example.com"],
     "targetRole": "moderator",
     "dryRun": true
   }
   ```

3. **Check for Conflicts**:
   - Users already have target role
   - Permission conflicts prevent assignment
   - Users outside management scope

#### Solutions

**Batch Processing**:
```javascript
// Split large arrays into smaller chunks
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

const userEmails = [...]; // Your large list
const batches = chunkArray(userEmails, 50);

for (const batch of batches) {
  await processBulkOperation(batch);
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between batches
}
```

**Error Recovery**:
1. Note which users failed in bulk operation
2. Check individual error messages
3. Retry failed users individually
4. Document any persistent issues

## Performance Issues

### Slow Page Loading

#### Symptoms
- Pages take >5 seconds to load
- Timeouts on large user lists
- Unresponsive interface elements

#### Performance Diagnostics

1. **Check System Health**:
   ```bash
   GET /api/admin/system/health
   ```
   Look for:
   - Database response time >1000ms
   - Memory usage >80%
   - Active user count vs limits

2. **Monitor Network Requests**:
   - Open browser Developer Tools (F12)
   - Go to Network tab
   - Reload page and check request times
   - Look for requests taking >3 seconds

3. **Database Performance**:
   ```sql
   -- Check for slow queries
   SHOW PROCESSLIST;

   -- Check table sizes
   SELECT table_name, round(((data_length + index_length) / 1024 / 1024), 2) 'Size in MB'
   FROM information_schema.tables
   WHERE table_schema = 'admin_system'
   ORDER BY (data_length + index_length) DESC;
   ```

#### Performance Solutions

**Optimize Queries**:
1. **Add Pagination**: Limit results to 20-50 items per page
2. **Use Filters**: Encourage filtered searches instead of viewing all
3. **Lazy Loading**: Load additional data as needed

**Cache Management**:
1. **Clear Application Cache**:
   ```bash
   POST /api/admin/system/cache/clear
   ```

2. **Enable Query Caching**:
   - Navigate to System Settings
   - Enable "Query Result Caching"
   - Set cache duration to 5-10 minutes

**Database Optimization**:
```sql
-- Add indexes for common queries
CREATE INDEX idx_users_role_status ON users(role, status);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_users_email ON users(email);
```

### Memory and Resource Issues

#### Symptoms
- Browser becomes unresponsive
- "Out of memory" errors
- System becomes sluggish

#### Resource Diagnostics

1. **Check Browser Memory**:
   - Open Task Manager (Ctrl+Shift+Esc)
   - Find browser process
   - Note memory usage (>2GB is concerning)

2. **Monitor Server Resources**:
   ```bash
   GET /api/admin/system/metrics
   ```
   Check:
   - CPU usage <80%
   - Memory usage <85%
   - Disk space >20% free

#### Resource Solutions

**Browser Optimization**:
1. Close unnecessary browser tabs
2. Disable browser extensions during admin work
3. Use Chrome/Firefox with sufficient RAM allocation
4. Clear browser cache regularly

**Server Optimization**:
1. **Scale Resources**: Increase server memory/CPU
2. **Optimize Queries**: Review slow query log
3. **Clean Up Data**: Archive old audit logs
4. **Connection Pooling**: Optimize database connections

## Data and Content Issues

### Missing or Corrupted Data

#### Symptoms
- Users report missing content
- Inconsistent data between pages
- Database constraint errors

#### Data Diagnostics

1. **Check Data Integrity**:
   ```sql
   -- Verify referential integrity
   SELECT u.email
   FROM users u
   LEFT JOIN user_roles ur ON u.id = ur.user_id
   WHERE ur.user_id IS NULL AND u.status = 'active';

   -- Check for orphaned records
   SELECT COUNT(*) FROM audit_logs al
   LEFT JOIN users u ON al.actor_id = u.id
   WHERE u.id IS NULL;
   ```

2. **Verify Backup Status**:
   ```bash
   GET /api/admin/system/backup/status
   ```

3. **Check Recent Changes**:
   ```bash
   GET /api/admin/audit?action=DATA_DELETION&startDate=yesterday
   ```

#### Data Recovery Solutions

**Restore from Backup**:
1. Identify last good backup before issue
2. Calculate data loss window
3. Coordinate with users about temporary downtime
4. Restore data and verify integrity

**Repair Data Inconsistencies**:
```sql
-- Fix orphaned user roles
DELETE FROM user_roles
WHERE user_id NOT IN (SELECT id FROM users);

-- Fix missing default permissions
INSERT INTO user_permissions (user_id, permission)
SELECT u.id, 'user.read'
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id AND up.permission = 'user.read'
WHERE up.user_id IS NULL AND u.role IN ('moderator', 'fandom-admin');
```

### Audit Log Issues

#### Symptoms
- Missing audit entries
- Inconsistent timestamps
- Unable to export audit logs

#### Audit Diagnostics

1. **Check Audit Service**:
   ```bash
   GET /api/admin/system/services/audit/health
   ```

2. **Verify Recent Entries**:
   ```sql
   SELECT COUNT(*) as entries, DATE(timestamp) as date
   FROM audit_logs
   WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
   GROUP BY DATE(timestamp)
   ORDER BY date DESC;
   ```

3. **Check Export Functionality**:
   ```bash
   GET /api/admin/audit/export?format=json&limit=10
   ```

#### Audit Solutions

**Restart Audit Service**:
1. Navigate to System Administration
2. Click "Service Management"
3. Restart "Audit Log Service"
4. Monitor for new entries

**Rebuild Audit Indexes**:
```sql
-- Rebuild audit log indexes
DROP INDEX idx_audit_timestamp ON audit_logs;
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);

DROP INDEX idx_audit_actor ON audit_logs;
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
```

## Email and Notification Issues

### Invitations Not Being Sent

#### Symptoms
- Users not receiving invitation emails
- Invitation status stuck at "sending"
- Email service errors in logs

#### Email Diagnostics

1. **Check Email Service Status**:
   ```bash
   GET /api/admin/system/services/email/health
   ```

2. **Verify Email Configuration**:
   ```bash
   GET /api/admin/system/config/email
   ```
   Check:
   - SMTP server settings
   - Authentication credentials
   - Rate limiting settings

3. **Check Email Queue**:
   ```bash
   GET /api/admin/system/email/queue
   ```

#### Email Solutions

**Test Email Service**:
```bash
POST /api/admin/system/email/test
{
  "to": "admin@example.com",
  "subject": "Test Email",
  "body": "This is a test email to verify service functionality."
}
```

**Clear Email Queue**:
1. Navigate to System Administration
2. Click "Email Management"
3. View stuck emails in queue
4. Retry failed emails or clear queue

**Update Email Templates**:
1. Check if invitation template is corrupted
2. Reset to default template
3. Test with simplified template

### Notification Delivery Issues

#### Symptoms
- Users not receiving system notifications
- Delayed notification delivery
- Duplicate notifications

#### Notification Diagnostics

1. **Check User Notification Preferences**:
   ```sql
   SELECT u.email, np.notification_type, np.enabled
   FROM users u
   JOIN notification_preferences np ON u.id = np.user_id
   WHERE u.email = 'user@example.com';
   ```

2. **Verify Notification Service**:
   ```bash
   GET /api/admin/system/services/notifications/health
   ```

#### Notification Solutions

**Reset User Preferences**:
```sql
-- Reset to default notification preferences
UPDATE notification_preferences
SET enabled = true
WHERE notification_type IN ('role_change', 'invitation', 'security_alert');
```

**Restart Notification Service**:
1. System Administration → Service Management
2. Restart "Notification Service"
3. Monitor delivery metrics

## Integration and API Issues

### API Endpoints Not Responding

#### Symptoms
- 500 Internal Server Error responses
- Timeout errors on API calls
- Inconsistent API behavior

#### API Diagnostics

1. **Check API Health**:
   ```bash
   GET /api/health
   GET /api/admin/health
   ```

2. **Monitor API Logs**:
   ```bash
   GET /api/admin/system/logs?service=api&level=error
   ```

3. **Test Specific Endpoints**:
   ```bash
   # Test user endpoint
   GET /api/admin/users?limit=1

   # Test auth endpoint
   GET /api/admin/auth/verify
   ```

#### API Solutions

**Restart API Service**:
1. System Administration → Service Management
2. Restart "API Service"
3. Monitor service startup logs

**Check Rate Limiting**:
```bash
# Check if rate limiting is causing issues
GET /api/admin/system/rate-limits/status
```

**API Error Recovery**:
1. Clear API response cache
2. Restart background job processors
3. Verify database connections

## Security Issues

### Suspicious Activity Detection

#### Security Symptoms
- Multiple failed login attempts
- Unusual access patterns
- Permission violations in audit logs

#### Security Diagnostics

1. **Check Security Events**:
   ```bash
   GET /api/admin/audit?action=SECURITY_VIOLATION&startDate=today
   ```

2. **Monitor Failed Logins**:
   ```sql
   SELECT ip_address, COUNT(*) as attempts, MAX(timestamp) as last_attempt
   FROM audit_logs
   WHERE action = 'LOGIN_FAILED'
   AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
   GROUP BY ip_address
   HAVING attempts > 5
   ORDER BY attempts DESC;
   ```

3. **Check Permission Violations**:
   ```bash
   GET /api/admin/audit?action=PERMISSION_DENIED&limit=50
   ```

#### Security Solutions

**Block Suspicious IPs**:
```bash
POST /api/admin/security/ip/block
{
  "ip": "192.168.1.100",
  "reason": "Multiple failed login attempts",
  "duration": "24h"
}
```

**Force Password Reset**:
```bash
POST /api/admin/users/{userId}/force-password-reset
{
  "reason": "Security precaution",
  "notify": true
}
```

**Enable Additional Security**:
1. Enable two-factor authentication for all admins
2. Implement IP whitelisting for admin access
3. Set up automated security alerts

## System Recovery Procedures

### Emergency Response Plan

#### Critical System Failure

1. **Immediate Assessment** (5 minutes):
   - Check system health endpoints
   - Verify database connectivity
   - Test critical user pathways

2. **Service Recovery** (15 minutes):
   - Restart failed services
   - Clear stuck processes
   - Restore from last backup if needed

3. **User Communication** (30 minutes):
   - Post status update
   - Notify affected users
   - Provide ETA for full restoration

#### Data Recovery Process

1. **Stop All Services** to prevent further data corruption
2. **Assess Damage** by checking data integrity
3. **Restore from Backup** using most recent valid backup
4. **Verify Restoration** by testing key functionality
5. **Resume Services** and monitor closely

### Backup and Restore

#### Manual Backup Creation

```bash
# Create immediate backup
POST /api/admin/system/backup/create
{
  "type": "full",
  "reason": "Pre-maintenance backup",
  "includeAuditLogs": true
}
```

#### Restore from Backup

```bash
# List available backups
GET /api/admin/system/backup/list

# Restore specific backup
POST /api/admin/system/backup/restore
{
  "backupId": "backup_20240121_120000",
  "confirmRestore": true,
  "notifyUsers": true
}
```

## Prevention and Monitoring

### Preventive Measures

#### Regular Maintenance

1. **Weekly Tasks**:
   - Review audit logs for anomalies
   - Check system performance metrics
   - Verify backup completion
   - Update user access reviews

2. **Monthly Tasks**:
   - Archive old audit logs
   - Review and update documentation
   - Test emergency procedures
   - Security assessment

3. **Quarterly Tasks**:
   - Full system backup verification
   - User permission audit
   - Performance optimization review
   - Update security policies

#### Monitoring Setup

**Key Metrics to Monitor**:
- Response time <2 seconds for 95% of requests
- Error rate <1% of total requests
- Memory usage <80% of available
- Disk space >20% free
- Active user sessions

**Alert Thresholds**:
```json
{
  "responseTime": {
    "warning": 3000,
    "critical": 5000
  },
  "errorRate": {
    "warning": 0.05,
    "critical": 0.10
  },
  "memoryUsage": {
    "warning": 0.80,
    "critical": 0.90
  }
}
```

### Documentation and Training

#### Keep Updated Documentation

1. **Change Logs**: Document all configuration changes
2. **Procedure Updates**: Update troubleshooting steps based on new issues
3. **Contact Information**: Maintain current support contact details
4. **Access Credentials**: Keep emergency access information secure but accessible

#### Team Training

1. **Regular Training Sessions**: Monthly troubleshooting workshops
2. **Incident Post-Mortems**: Learn from each major issue
3. **Cross-Training**: Ensure multiple people can handle each procedure
4. **Emergency Contacts**: Maintain 24/7 contact rotation

## Emergency Contacts

### Support Escalation

| Issue Level          | Response Time | Contact Method                     |
| -------------------- | ------------- | ---------------------------------- |
| Critical System Down | 15 minutes    | Emergency hotline: +1-XXX-XXX-XXXX |
| High Priority Issues | 2 hours       | Support ticket + email             |
| Standard Issues      | 24 hours      | Support ticket                     |
| General Questions    | 48 hours      | Knowledge base + email             |

### Internal Contacts

- **System Administrator**: admin@pensieve-index.com
- **Security Team**: security@pensieve-index.com
- **Database Administrator**: dba@pensieve-index.com
- **Development Team**: dev@pensieve-index.com

### External Vendors

- **Hosting Provider**: Contact through admin portal
- **Email Service**: Check service status page
- **Monitoring Service**: Status dashboard available
- **Backup Provider**: Emergency restore hotline available

Remember: When in doubt, escalate early rather than risk extended downtime or data loss.