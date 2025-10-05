# Community Submission System Troubleshooting Guide

## Overview

This guide provides comprehensive troubleshooting information for The Pensive Index Community Submission System. It covers common issues, diagnostic procedures, and solutions for users, moderators, and administrators.

## Quick Reference

### Emergency Contacts
- **System Administrator**: admin@the-pensive-index.org
- **Development Team**: dev@the-pensive-index.org
- **Emergency Hotline**: Available in admin dashboard

### System Status
- **Status Page**: https://status.the-pensive-index.org
- **Health Check**: https://the-pensive-index.vercel.app/api/health
- **Maintenance Windows**: Announced 48 hours in advance

---

## Browser Extension Issues

### Extension Not Loading

**Symptoms:**
- Extension icon doesn't appear
- Extension popup shows blank page
- "Extension not found" error

**Diagnostic Steps:**

1. **Check Installation**
   ```javascript
   // Open browser console (F12) and run:
   chrome.runtime.getManifest()
   // Should return extension manifest data
   ```

2. **Verify Permissions**
   - Go to `chrome://extensions/`
   - Check if The Pensive Index extension is enabled
   - Verify it has permissions for the current site

3. **Check for Updates**
   - Extensions auto-update, but can be forced:
   - Chrome: Developer mode → "Update extensions"
   - Edge: "Reload" button on extension card

**Solutions:**

| Issue                  | Solution                             |
| ---------------------- | ------------------------------------ |
| Extension disabled     | Enable in browser extension settings |
| Permissions denied     | Grant site access permissions        |
| Corrupted installation | Remove and reinstall extension       |
| Browser cache          | Clear browser cache and cookies      |

### Story Extraction Failures

**Symptoms:**
- "Unable to extract story data" error
- Partial or incorrect metadata extracted
- Extension shows spinning loader indefinitely

**Diagnostic Steps:**

1. **Check Site Compatibility**
   ```
   Supported Sites:
   ✅ Archive of Our Own (AO3)
   ✅ FanFiction.Net
   ✅ Wattpad
   ✅ YouTube (audiobooks)
   ❌ Other sites (coming soon)
   ```

2. **Verify Page Structure**
   - Ensure you're on a story page (not index/search)
   - Check if site has updated their HTML structure
   - Try refreshing the page

3. **Console Debugging**
   ```javascript
   // Check extraction logs
   console.log('Extension extraction status:',
     localStorage.getItem('pensiveindex_debug'));

   // Manual extraction test
   if (window.PensiveIndexExtractor) {
     window.PensiveIndexExtractor.extractStoryData()
       .then(console.log)
       .catch(console.error);
   }
   ```

**Solutions:**

| Error Message          | Cause                  | Solution                               |
| ---------------------- | ---------------------- | -------------------------------------- |
| "Site not supported"   | Unsupported website    | Only use on supported fanfiction sites |
| "Story not found"      | Wrong page type        | Navigate to actual story page          |
| "Extraction timeout"   | Network/parsing issue  | Refresh page and try again             |
| "Invalid story format" | Unusual page structure | Report to development team             |

### Submission Failures

**Symptoms:**
- "Submission failed" error after clicking Submit
- Form validation errors that seem incorrect
- Network timeout errors

**Diagnostic Steps:**

1. **Check Network Connectivity**
   ```bash
   # Test API connectivity
   curl https://the-pensive-index.vercel.app/api/health
   # Should return {"status": "healthy"}
   ```

2. **Validate Form Data**
   - Ensure all required fields are filled
   - Check email format
   - Verify fandom selection

3. **Check Rate Limits**
   - Extension enforces 5 submissions per hour
   - Check if limit exceeded in extension popup

**Solutions:**

| Issue               | Solution                                   |
| ------------------- | ------------------------------------------ |
| Rate limit exceeded | Wait for rate limit reset (shown in popup) |
| Invalid fandom      | Select from dropdown, don't type freely    |
| Network timeout     | Check internet connection, try again       |
| Server error        | Check status page, report if persistent    |

---

## Website Interface Issues

### Login/Authentication Problems

**Symptoms:**
- Can't sign in to account
- "Session expired" errors
- Redirect loops after login

**Diagnostic Steps:**

1. **Clear Browser Data**
   ```
   Clear the following for the-pensive-index.vercel.app:
   - Cookies
   - Local Storage
   - Session Storage
   - Cache
   ```

2. **Check Authentication Provider**
   - We use Clerk for authentication
   - Try signing in with different method (email vs social)
   - Check if 2FA is causing issues

3. **Network Issues**
   ```bash
   # Test auth endpoints
   curl -I https://the-pensive-index.vercel.app/api/auth/session
   # Should return 200 or 401, not 500
   ```

**Solutions:**

| Problem        | Solution                            |
| -------------- | ----------------------------------- |
| Cookie issues  | Clear cookies and try again         |
| 2FA problems   | Use backup codes or contact support |
| Provider down  | Check Clerk status page             |
| Account locked | Contact administrator               |

### Submission Form Issues

**Symptoms:**
- Form doesn't submit
- Validation errors for valid data
- Page doesn't load

**Diagnostic Steps:**

1. **JavaScript Errors**
   ```javascript
   // Check console for errors (F12)
   // Look for red error messages
   ```

2. **Form Validation**
   - Check all required fields have values
   - Verify email format
   - Ensure URL is valid and accessible

3. **Browser Compatibility**
   ```
   Supported Browsers:
   ✅ Chrome 90+
   ✅ Firefox 88+
   ✅ Safari 14+
   ✅ Edge 90+
   ```

**Solutions:**

| Issue                   | Fix                              |
| ----------------------- | -------------------------------- |
| JavaScript disabled     | Enable JavaScript in browser     |
| Ad blocker interference | Disable ad blocker for this site |
| Browser too old         | Update to supported version      |
| Script errors           | Refresh page, clear cache        |

---

## API Issues

### Rate Limiting

**Symptoms:**
- HTTP 429 "Too Many Requests" errors
- Submissions rejected with rate limit message
- API responses include rate limit headers

**Diagnostic Steps:**

1. **Check Rate Limit Headers**
   ```bash
   curl -I https://the-pensive-index.vercel.app/api/v1/submissions
   # Look for X-RateLimit-* headers
   ```

2. **Review Usage Patterns**
   ```
   Rate Limits:
   - Unauthenticated: 100/hour per IP
   - Authenticated: 1000/hour per user
   - Extension: 200/hour per user
   - Admin: 5000/hour per user
   ```

**Solutions:**

| Limit Type  | Reset Time | Solution                   |
| ----------- | ---------- | -------------------------- |
| IP-based    | 1 hour     | Wait or authenticate       |
| User-based  | 1 hour     | Reduce request frequency   |
| Extension   | 1 hour     | Use web interface instead  |
| Burst limit | 1 minute   | Add delay between requests |

### Authentication Errors

**Symptoms:**
- HTTP 401 "Unauthorized" errors
- "Invalid token" messages
- Session timeout errors

**Diagnostic Steps:**

1. **Token Validation**
   ```javascript
   // Check if token exists
   localStorage.getItem('clerk-db-jwt');

   // Decode token (if exists)
   // Should not be expired
   ```

2. **Permission Verification**
   - Check user role and permissions
   - Verify fandom access (if applicable)
   - Ensure account is not suspended

**Solutions:**

| Error                    | Cause             | Fix                      |
| ------------------------ | ----------------- | ------------------------ |
| No token                 | Not logged in     | Sign in to account       |
| Expired token            | Session timeout   | Refresh page or re-login |
| Invalid token            | Corrupted session | Clear storage, re-login  |
| Insufficient permissions | Role restrictions | Contact administrator    |

### Server Errors

**Symptoms:**
- HTTP 500 "Internal Server Error"
- "Database connection failed"
- Timeout errors (408)

**Diagnostic Steps:**

1. **Check System Status**
   - Visit status page
   - Check health endpoint
   - Review error tracking dashboard (admins)

2. **Identify Error Pattern**
   ```
   Error Types:
   - Database errors: Data layer issues
   - GitHub API errors: Integration problems
   - Email service errors: Notification failures
   - Cache errors: Redis/memory issues
   ```

**Solutions:**

| Error Type     | Immediate Action      | Long-term Fix              |
| -------------- | --------------------- | -------------------------- |
| Database error | Wait 5 minutes, retry | Admin database maintenance |
| GitHub API     | Check GitHub status   | Retry with backoff         |
| Email service  | Non-critical, ignore  | Admin email config check   |
| Memory/cache   | Clear cache, retry    | Admin performance tuning   |

---

## Admin Dashboard Issues

### Queue Management Problems

**Symptoms:**
- Queue not loading
- Incorrect submission counts
- Actions not working (approve/reject)

**Diagnostic Steps:**

1. **Permission Check**
   ```javascript
   // Verify admin permissions
   fetch('/api/v1/admin/permissions')
     .then(r => r.json())
     .then(console.log);
   ```

2. **Database Connectivity**
   ```sql
   -- Check queue table health
   SELECT COUNT(*) FROM queue_entries;
   SELECT COUNT(*) FROM submissions WHERE status = 'pending';
   ```

3. **Performance Issues**
   ```bash
   # Check API response times
   curl -w "%{time_total}" -s -o /dev/null \
     https://the-pensive-index.vercel.app/api/v1/admin/submissions/queue
   ```

**Solutions:**

| Problem            | Diagnostic                | Solution                           |
| ------------------ | ------------------------- | ---------------------------------- |
| Queue empty        | Check filters applied     | Reset filters, verify data         |
| Slow loading       | Check network/performance | Reduce page size, optimize queries |
| Actions failing    | Check permissions         | Verify admin role, refresh session |
| Data inconsistency | Database integrity        | Run data consistency check         |

### Moderator Assignment Issues

**Symptoms:**
- Can't assign submissions to moderators
- Assignments don't persist
- Workload balancing not working

**Diagnostic Steps:**

1. **Moderator Status Check**
   ```sql
   SELECT id, name, role, is_active
   FROM admin_users
   WHERE role IN ('moderator', 'admin');
   ```

2. **Assignment Logic**
   - Check moderator fandom permissions
   - Verify workload limits not exceeded
   - Ensure moderator account is active

3. **Database Constraints**
   ```sql
   -- Check for foreign key issues
   PRAGMA foreign_key_check;
   ```

**Solutions:**

| Issue                   | Cause                | Fix                               |
| ----------------------- | -------------------- | --------------------------------- |
| No available moderators | All at capacity      | Increase limits or add moderators |
| Assignment fails        | Permission issue     | Check fandom access rights        |
| Auto-assignment broken  | Logic error          | Review assignment algorithm       |
| Database errors         | Constraint violation | Check referential integrity       |

---

## GitHub Integration Issues

### Issue Creation Failures

**Symptoms:**
- "GitHub issue creation failed" errors
- Submissions stuck without GitHub issue numbers
- Authentication errors with GitHub API

**Diagnostic Steps:**

1. **GitHub API Status**
   ```bash
   curl -H "Authorization: token YOUR_TOKEN" \
     https://api.github.com/rate_limit
   ```

2. **Repository Access**
   ```bash
   # Check repository permissions
   curl -H "Authorization: token YOUR_TOKEN" \
     https://api.github.com/repos/OWNER/REPO
   ```

3. **Rate Limits**
   - GitHub API: 5000 requests/hour for authenticated users
   - Check current usage in response headers

**Solutions:**

| Error                 | Cause             | Solution                        |
| --------------------- | ----------------- | ------------------------------- |
| Authentication failed | Invalid token     | Update GitHub token in settings |
| Repository not found  | Wrong repo config | Verify repository settings      |
| Rate limit exceeded   | Too many requests | Wait for reset or upgrade plan  |
| Network timeout       | Connection issue  | Retry with exponential backoff  |

### Webhook Processing Issues

**Symptoms:**
- Webhook events not updating submissions
- "Invalid signature" errors in logs
- Status not syncing between GitHub and system

**Diagnostic Steps:**

1. **Webhook Configuration**
   ```bash
   # Check webhook settings in GitHub repo
   curl -H "Authorization: token YOUR_TOKEN" \
     https://api.github.com/repos/OWNER/REPO/hooks
   ```

2. **Signature Verification**
   ```javascript
   // Verify HMAC signature
   const crypto = require('crypto');
   const signature = crypto
     .createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET)
     .update(payload)
     .digest('hex');
   ```

3. **Event Processing**
   - Check webhook delivery logs in GitHub
   - Review application logs for processing errors
   - Verify event types are supported

**Solutions:**

| Issue             | Fix                                   |
| ----------------- | ------------------------------------- |
| Invalid signature | Update webhook secret in both systems |
| Missing events    | Check webhook event subscriptions     |
| Processing errors | Review and fix webhook handler code   |
| Duplicate events  | Implement idempotency checks          |

---

## Email Notification Issues

### Email Delivery Problems

**Symptoms:**
- Users not receiving notification emails
- Emails going to spam folders
- SMTP connection errors

**Diagnostic Steps:**

1. **SMTP Configuration**
   ```javascript
   // Test SMTP connection
   const nodemailer = require('nodemailer');
   const transporter = nodemailer.createTransporter({
     // Your SMTP config
   });

   transporter.verify((error, success) => {
     console.log(error || 'SMTP connection successful');
   });
   ```

2. **Email Service Status**
   - Check email service provider status
   - Verify SMTP credentials
   - Test with different email addresses

3. **Delivery Tracking**
   ```sql
   -- Check email delivery status
   SELECT delivery_status, COUNT(*)
   FROM email_notifications
   WHERE created_at > unixepoch() - 86400
   GROUP BY delivery_status;
   ```

**Solutions:**

| Problem          | Cause                   | Solution                   |
| ---------------- | ----------------------- | -------------------------- |
| SMTP errors      | Invalid credentials     | Update SMTP settings       |
| Spam folder      | Poor sender reputation  | Configure SPF, DKIM, DMARC |
| High bounce rate | Invalid email addresses | Implement email validation |
| Rate limiting    | Provider limits         | Implement sending queues   |

### Template Rendering Issues

**Symptoms:**
- Emails with missing content
- HTML rendering problems
- Template compilation errors

**Diagnostic Steps:**

1. **Template Syntax**
   ```handlebars
   {{! Check for syntax errors in templates }}
   {{#if submission}}
     Title: {{submission.storyTitle}}
   {{else}}
     No submission data available
   {{/if}}
   ```

2. **Data Validation**
   ```javascript
   // Ensure all required data is present
   const templateData = {
     submission: submission,
     moderator: moderator,
     // ... other required fields
   };
   ```

**Solutions:**

| Error           | Fix                          |
| --------------- | ---------------------------- |
| Missing data    | Add null checks in templates |
| Syntax errors   | Validate template syntax     |
| Encoding issues | Use proper charset headers   |
| Image problems  | Use absolute URLs for images |

---

## Performance Issues

### Slow Response Times

**Symptoms:**
- API endpoints taking >5 seconds
- Database query timeouts
- UI feels sluggish

**Diagnostic Steps:**

1. **Performance Monitoring**
   ```sql
   -- Check slow queries
   SELECT operation_name, AVG(duration_ms), COUNT(*)
   FROM performance_metrics
   WHERE measured_at > unixepoch() - 3600
   GROUP BY operation_name
   HAVING AVG(duration_ms) > 1000
   ORDER BY AVG(duration_ms) DESC;
   ```

2. **Database Analysis**
   ```sql
   -- Analyze query performance
   EXPLAIN QUERY PLAN
   SELECT * FROM submissions
   WHERE status = 'pending'
   ORDER BY created_at DESC
   LIMIT 25;
   ```

3. **Cache Hit Rates**
   ```bash
   # Check Redis cache statistics
   redis-cli info stats | grep keyspace_hits
   ```

**Solutions:**

| Issue               | Cause               | Solution                 |
| ------------------- | ------------------- | ------------------------ |
| Database slow       | Missing indexes     | Add appropriate indexes  |
| Memory usage high   | Poor caching        | Optimize cache strategy  |
| Network latency     | Geographic distance | Use CDN, edge locations  |
| Inefficient queries | Poor SQL            | Optimize query structure |

### High Memory Usage

**Symptoms:**
- Out of memory errors
- Application crashes
- Slow garbage collection

**Diagnostic Steps:**

1. **Memory Profiling**
   ```javascript
   // Check Node.js memory usage
   console.log(process.memoryUsage());

   // Heap snapshot analysis
   const v8 = require('v8');
   const heapSnapshot = v8.writeHeapSnapshot();
   ```

2. **Cache Analysis**
   ```bash
   # Check Redis memory usage
   redis-cli info memory
   ```

**Solutions:**

| Problem          | Fix                          |
| ---------------- | ---------------------------- |
| Memory leaks     | Profile and fix leaking code |
| Large datasets   | Implement pagination         |
| Cache bloat      | Set appropriate TTL values   |
| Heavy processing | Use streaming/chunking       |

---

## Data Issues

### Data Corruption

**Symptoms:**
- Inconsistent data between tables
- Foreign key constraint violations
- Duplicate entries where they shouldn't exist

**Diagnostic Steps:**

1. **Integrity Checks**
   ```sql
   -- SQLite integrity check
   PRAGMA integrity_check;

   -- Foreign key check
   PRAGMA foreign_key_check;

   -- Check for orphaned records
   SELECT s.id FROM submissions s
   LEFT JOIN fandoms f ON s.fandom_slug = f.slug
   WHERE f.slug IS NULL;
   ```

2. **Data Consistency**
   ```sql
   -- Check queue/submission consistency
   SELECT COUNT(*) FROM submissions s
   LEFT JOIN queue_entries q ON s.id = q.submission_id
   WHERE s.status = 'pending' AND q.id IS NULL;
   ```

**Solutions:**

| Issue                  | Resolution                                  |
| ---------------------- | ------------------------------------------- |
| Foreign key violations | Restore from backup, fix references         |
| Duplicate primary keys | Identify source, merge or delete duplicates |
| Orphaned records       | Clean up orphaned data                      |
| Inconsistent status    | Run data reconciliation script              |

### Backup and Recovery

**Symptoms:**
- Need to restore from backup
- Data loss incident
- Migration rollback needed

**Recovery Procedures:**

1. **Immediate Response**
   ```bash
   # Stop application to prevent further data loss
   systemctl stop pensiveindex-app

   # Create current state backup before recovery
   sqlite3 current.db ".backup emergency_backup.db"
   ```

2. **Restore Process**
   ```bash
   # Restore from backup
   sqlite3 production.db ".restore backup_file.db"

   # Verify integrity
   sqlite3 production.db "PRAGMA integrity_check;"

   # Restart application
   systemctl start pensiveindex-app
   ```

3. **Post-Recovery Validation**
   ```sql
   -- Verify critical data
   SELECT COUNT(*) FROM submissions;
   SELECT COUNT(*) FROM admin_users;
   SELECT MAX(created_at) FROM submissions;
   ```

---

## Security Issues

### Suspicious Activity Detection

**Warning Signs:**
- Unusual API request patterns
- Multiple failed login attempts
- Abnormal submission patterns
- Unauthorized access attempts

**Diagnostic Steps:**

1. **Log Analysis**
   ```bash
   # Check access logs for suspicious patterns
   grep "401\|403" /var/log/nginx/access.log | tail -100

   # Look for brute force attempts
   grep "failed login" /var/log/application.log
   ```

2. **Rate Limit Analysis**
   ```sql
   -- Check for rate limit violations
   SELECT ip_address, COUNT(*), MAX(timestamp)
   FROM rate_limit_violations
   WHERE timestamp > unixepoch() - 3600
   GROUP BY ip_address
   HAVING COUNT(*) > 10
   ORDER BY COUNT(*) DESC;
   ```

**Response Actions:**

| Threat Level | Action                                |
| ------------ | ------------------------------------- |
| Low          | Monitor and log                       |
| Medium       | Implement temporary IP blocks         |
| High         | Lock affected accounts, notify users  |
| Critical     | Emergency lockdown, incident response |

### Data Breach Response

**Immediate Actions:**

1. **Containment**
   ```bash
   # Immediately block suspicious IPs
   iptables -A INPUT -s SUSPICIOUS_IP -j DROP

   # Revoke potentially compromised tokens
   # (Implementation depends on auth system)
   ```

2. **Assessment**
   - Identify scope of potential breach
   - Determine what data may have been accessed
   - Check audit logs for unauthorized access

3. **Notification**
   - Notify affected users within 72 hours
   - Contact regulatory authorities if required
   - Coordinate with legal team

---

## Escalation Procedures

### When to Escalate

| Issue Severity | Escalation Time | Contact                 |
| -------------- | --------------- | ----------------------- |
| Low            | 24 hours        | Regular support         |
| Medium         | 4 hours         | Senior support          |
| High           | 1 hour          | On-call engineer        |
| Critical       | Immediate       | Emergency response team |

### Escalation Information to Provide

1. **Problem Description**
   - What happened?
   - When did it start?
   - How many users affected?
   - What troubleshooting was attempted?

2. **Technical Details**
   - Error messages and stack traces
   - Relevant log entries
   - System metrics during incident
   - Steps to reproduce

3. **Business Impact**
   - Number of affected users
   - Impact on core functionality
   - Revenue or reputation impact
   - Regulatory implications

### Contact Information

```
Emergency Escalation:
- Phone: +1-XXX-XXX-XXXX
- Email: emergency@the-pensive-index.org
- Slack: #incident-response

Regular Support:
- Email: support@the-pensive-index.org
- Ticket System: https://support.the-pensive-index.org
- Response SLA: 4 hours business days
```

---

## Prevention and Monitoring

### Proactive Monitoring

1. **Health Checks**
   ```bash
   # Automated health check script
   #!/bin/bash
   response=$(curl -s -o /dev/null -w "%{http_code}" \
     https://the-pensive-index.vercel.app/api/health)

   if [ $response != "200" ]; then
     echo "Health check failed: $response"
     # Send alert
   fi
   ```

2. **Performance Monitoring**
   ```javascript
   // Application performance monitoring
   const responseTime = Date.now() - startTime;

   if (responseTime > 5000) {
     logger.warn('Slow response detected', {
       endpoint: req.path,
       responseTime,
       userId: req.user?.id
     });
   }
   ```

### Maintenance Best Practices

1. **Regular Tasks**
   - Daily: Check system health, review error logs
   - Weekly: Analyze performance metrics, update dependencies
   - Monthly: Full backup verification, security audit
   - Quarterly: Disaster recovery test, capacity planning

2. **Preventive Measures**
   ```sql
   -- Clean up old data regularly
   DELETE FROM performance_metrics
   WHERE measured_at < unixepoch() - 2592000; -- 30 days

   -- Optimize database
   VACUUM;
   ANALYZE;
   ```

This troubleshooting guide provides comprehensive coverage of common issues and their solutions. Keep this document updated as new issues are discovered and resolved. For issues not covered here, follow the escalation procedures to get expert assistance.