# Performance Optimization Deployment Guide

**Feature**: 003-optimize-the-platform
**Date**: 2025-10-08
**Cloudflare Deployment**

## Prerequisites

- [ ] Cloudflare account with Pages and Workers enabled
- [ ] Wrangler CLI installed (`npm install -g wrangler`)
- [ ] Authenticated with Cloudflare (`wrangler login`)
- [ ] Database migrations 009 and 010 ready
- [ ] All tests passing

## Deployment Steps

### 1. Environment Setup

#### 1.1 Create KV Namespace

```powershell
# Create production KV namespace for caching
npx wrangler kv:namespace create "CACHE"

# Note the ID returned (e.g., 4e66268461374e29a8b2ad480cbe2ca7)
```

#### 1.2 Create D1 Database

```powershell
# Create production database (if not exists)
npx wrangler d1 create pensive-index

# Note the database ID returned
```

#### 1.3 Update wrangler.toml

Verify the following configuration in `wrangler.toml`:

```toml
name = "the-pensive-index"
main = "worker.ts"
compatibility_date = "2024-09-28"
compatibility_flags = ["nodejs_compat"]

# Production environment
[env.production]
vars = {
  ENVIRONMENT = "production",
  CACHE_TTL_SEARCH = "300",       # 5 minutes
  CACHE_TTL_VALIDATION = "3600",  # 1 hour
  CACHE_TTL_STATIC = "86400"      # 24 hours
}

# KV namespace binding
[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_KV_NAMESPACE_ID_HERE"

# D1 database binding
[[d1_databases]]
binding = "DB"
database_name = "pensive-index"
database_id = "YOUR_DATABASE_ID_HERE"

# Durable Objects for rate limiting
[[durable_objects.bindings]]
name = "RATE_LIMITER"
class_name = "RateLimiter"
script_name = "the-pensive-index"

# Scheduled cron triggers
[triggers]
crons = [
  "*/5 * * * *",  # Every 5 minutes - Metrics aggregation
  "0 2 * * *",    # Daily at 2am UTC - Analytics aggregation
  "0 * * * *"     # Every hour - Resource usage monitoring
]
```

### 2. Database Migration

#### 2.1 Apply Performance Tables Migration

```powershell
# Apply migration 009 (performance optimization tables)
npx wrangler d1 execute pensive-index --file=migrations/009_performance_optimization.sql

# Verify tables created
npx wrangler d1 execute pensive-index --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

**Expected tables**:
- `performance_metrics`
- `performance_aggregates`
- `query_performance_logs`
- `rate_limit_violations`
- `analytics_events`
- `analytics_aggregates`
- `error_logs`
- `cache_invalidations`
- `resource_usage`

#### 2.2 Apply Indexes Migration

```powershell
# Apply migration 010 (performance indexes)
npx wrangler d1 execute pensive-index --file=migrations/010_performance_indexes.sql

# Verify indexes created
npx wrangler d1 execute pensive-index --command="SELECT name FROM sqlite_master WHERE type='index' ORDER BY name;"
```

### 3. Deploy Cloudflare Workers

#### 3.1 Build Application

```powershell
# Build Next.js application
npm run build

# Verify build successful
```

#### 3.2 Deploy Workers

```powershell
# Deploy to Cloudflare Pages with Workers
npx wrangler pages deploy .vercel/output/static --project-name=the-pensive-index

# Or deploy worker directly
npx wrangler deploy
```

#### 3.3 Verify Durable Objects

```powershell
# Check Durable Object deployment
npx wrangler tail --format=pretty

# Test rate limiting (should see Durable Object invocation)
curl -X GET https://pensive.vkrishna04.me/api/search
```

### 4. Configure Scheduled Cron Jobs

#### 4.1 Verify Cron Triggers

```powershell
# List scheduled triggers
npx wrangler deployments list

# Check cron configuration
cat wrangler.toml | grep -A 5 "triggers"
```

#### 4.2 Manually Test Cron Jobs

```powershell
# Trigger metrics aggregation manually (for testing)
npx wrangler d1 execute pensive-index --command="SELECT aggregateMetrics();"

# Check if aggregates were created
npx wrangler d1 execute pensive-index --command="SELECT COUNT(*) FROM performance_aggregates;"
```

### 5. Smoke Tests

#### 5.1 Test Cache Functionality

```powershell
# Test search endpoint caching
curl -I https://pensive.vkrishna04.me/api/search?fandom=hp&tags=angst

# Check response headers:
# - X-Cache-Status should be MISS (first request)
# - Cache-Control should be set
# - X-Cache-Key should be present

# Make same request again
curl -I https://pensive.vkrishna04.me/api/search?fandom=hp&tags=angst

# X-Cache-Status should now be HIT
```

#### 5.2 Test Rate Limiting

```powershell
# Make 70 requests rapidly (should trigger rate limit)
for ($i=1; $i -le 70; $i++) {
  curl https://pensive.vkrishna04.me/api/search
}

# Should see 429 Too Many Requests after 60 requests
# Response should include Retry-After header
```

#### 5.3 Test Performance Dashboard

```powershell
# Access admin dashboard (requires authentication)
curl https://pensive.vkrishna04.me/admin/performance

# Should return 200 OK with HTML content

# Test metrics API
curl https://pensive.vkrishna04.me/api/admin/performance/metrics

# Should return JSON with performance data
```

#### 5.4 Test Cache Invalidation

```powershell
# Invalidate cache via API (requires admin auth)
curl -X POST https://pensive.vkrishna04.me/api/admin/performance/invalidate-cache \
  -H "Content-Type: application/json" \
  -d '{"type": "PREFIX", "value": "search:"}'

# Should return: {"success": true, "affectedKeys": <number>}

# Verify cache cleared
curl -I https://pensive.vkrishna04.me/api/search?fandom=hp&tags=angst
# X-Cache-Status should be MISS again
```

### 6. Monitoring Setup

#### 6.1 Verify Cloudflare Analytics

1. Login to Cloudflare Dashboard: https://dash.cloudflare.com/
2. Navigate to Workers & Pages → the-pensive-index
3. Check Analytics tab shows requests, CPU time, errors

#### 6.2 Verify Custom Monitoring

```powershell
# Check performance metrics collection
npx wrangler d1 execute pensive-index --command="SELECT COUNT(*) FROM performance_metrics WHERE timestamp > (strftime('%s', 'now') - 3600);"

# Should show requests from last hour

# Check error logging
npx wrangler d1 execute pensive-index --command="SELECT * FROM error_logs ORDER BY timestamp DESC LIMIT 5;"
```

#### 6.3 Set Up Alerts

**Manual Setup** (Cloudflare Dashboard):
1. Go to Workers & Pages → the-pensive-index → Settings
2. Configure notifications for:
   - Error rate >5%
   - CPU time >8ms
   - Request failures

### 7. Performance Baseline

#### 7.1 Run Load Tests

```powershell
# Run performance test suite
npm run test:performance

# Save baseline
npm run test:performance -- --reporter=json > performance-baseline.json
```

#### 7.2 Record Baseline Metrics

Document current performance:

| Metric                   | Value  | Target | Status |
| ------------------------ | ------ | ------ | ------ |
| Search p95 response time | ___ ms | <500ms | ⬜      |
| Validation response time | ___ ms | <200ms | ⬜      |
| Cache hit rate           | ___ %  | >80%   | ⬜      |
| Error rate               | ___ %  | <1%    | ⬜      |

### 8. Rollback Procedures

#### 8.1 Emergency Rollback

```powershell
# Rollback to previous deployment
npx wrangler rollback

# Verify rollback successful
curl https://pensive.vkrishna04.me/
```

#### 8.2 Database Rollback

```powershell
# Drop performance tables (if migration failed)
npx wrangler d1 execute pensive-index --command="DROP TABLE IF EXISTS performance_metrics;"
# ... repeat for all tables

# Re-run migrations with fixes
npx wrangler d1 execute pensive-index --file=migrations/009_performance_optimization.sql
```

#### 8.3 Cache Flush (Emergency)

```powershell
# Clear all KV cache entries
npx wrangler kv:key delete --namespace-id=YOUR_KV_ID --all

# Or via API
curl -X POST https://pensive.vkrishna04.me/api/admin/performance/invalidate-cache \
  -H "Content-Type: application/json" \
  -d '{"type": "FULL"}'
```

## Post-Deployment Checklist

- [ ] All database migrations applied successfully
- [ ] KV namespace created and bound
- [ ] Durable Objects deployed and functional
- [ ] Cron jobs scheduled and running
- [ ] Cache working (HIT/MISS cycle verified)
- [ ] Rate limiting enforcing limits
- [ ] Performance dashboard accessible
- [ ] Error logging capturing errors
- [ ] Analytics tracking user events
- [ ] Resource usage monitoring active
- [ ] Smoke tests all passing
- [ ] Performance baseline recorded
- [ ] Monitoring alerts configured
- [ ] Rollback procedure tested

## Gradual Rollout Plan

### Phase 1: Canary (1% Traffic)

```powershell
# Configure 1% traffic routing in Cloudflare
# Dashboard → Workers & Pages → the-pensive-index → Settings → Routes
```

**Monitor for 24 hours**:
- Error rate should remain <1%
- Cache hit rate should reach >80%
- No increase in 500 errors

### Phase 2: Limited (10% Traffic)

**If Phase 1 successful**, increase to 10% traffic

**Monitor for 48 hours**:
- Performance metrics stable
- Resource usage within limits
- User feedback positive

### Phase 3: Full Rollout (100% Traffic)

**If Phase 2 successful**, route 100% traffic

**Monitor for 7 days**:
- Weekly performance review
- Capacity planning check
- User satisfaction survey

## Troubleshooting Deployment Issues

### Issue: Database Migration Fails

```powershell
# Check database connection
npx wrangler d1 execute pensive-index --command="SELECT 1;"

# Check existing tables
npx wrangler d1 execute pensive-index --command="SELECT name FROM sqlite_master WHERE type='table';"

# Drop failed tables and retry
npx wrangler d1 execute pensive-index --command="DROP TABLE IF EXISTS performance_metrics;"
npx wrangler d1 execute pensive-index --file=migrations/009_performance_optimization.sql
```

### Issue: KV Namespace Not Binding

**Error**: `Error: KV namespace 'CACHE' not found`

**Solution**:
1. Verify namespace ID in wrangler.toml matches created namespace
2. Check binding name is correct (`CACHE`)
3. Redeploy worker after updating wrangler.toml

### Issue: Cron Jobs Not Executing

**Symptoms**: No entries in performance_aggregates

**Diagnosis**:
```powershell
# Check worker logs during cron execution window
npx wrangler tail --format=pretty

# Manually test cron handler
# (Add test endpoint in development)
```

**Solution**:
1. Verify cron syntax in wrangler.toml
2. Check worker exports `scheduled` handler
3. Review cron job code for errors
4. Check worker logs for exceptions

### Issue: Rate Limiting Not Working

**Symptoms**: No 429 errors despite high traffic

**Diagnosis**:
```powershell
# Check Durable Object binding
npx wrangler dev

# Check rate limiter class
cat src/worker/rate-limiter.ts
```

**Solution**:
1. Verify Durable Object class name matches binding
2. Check RateLimiter exported from worker.ts
3. Verify migration applied for Durable Objects
4. Redeploy with `npx wrangler deploy`

## Environment Variables Reference

### Production Environment

```bash
ENVIRONMENT=production
CACHE_TTL_SEARCH=300
CACHE_TTL_VALIDATION=3600
CACHE_TTL_STATIC=86400
```

### Development Environment

```bash
ENVIRONMENT=development
CACHE_TTL_SEARCH=60
CACHE_TTL_VALIDATION=300
CACHE_TTL_STATIC=3600
```

## Free-Tier Resource Limits

| Resource        | Daily Limit | Monthly Limit | Notes                 |
| --------------- | ----------- | ------------- | --------------------- |
| D1 Queries      | 100,000     | ~3M           | Reads + Writes        |
| KV Reads        | 100,000     | ~3M           | GET operations        |
| KV Writes       | 1,000       | ~30,000       | SET/DELETE operations |
| KV Storage      | -           | 1 GB          | Total data stored     |
| Worker Requests | 100,000     | ~3M           | Total invocations     |
| Worker CPU      | 10ms/req    | -             | Per request limit     |
| Durable Objects | -           | 1M requests   | Total DO invocations  |

**Monitoring**: Set up alerts at 80% and 95% of each limit

## Support

- **Documentation**: [Performance Runbook](../performance-runbook.md)
- **API Docs**: [API Reference](../api.md)
- **GitHub Issues**: https://github.com/Life-Experimentalist/the-pensive-index/issues
- **Cloudflare Docs**: https://developers.cloudflare.com/

---

**Last Updated**: 2025-10-08
**Next Review**: 2026-01-08
**Owner**: Operations Team
