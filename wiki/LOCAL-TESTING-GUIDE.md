# Local Testing Guide for Performance Optimization

This guide explains how to test all performance optimization features **locally** before deploying to Cloudflare.

## Prerequisites

```powershell
# Install dependencies
npm install

# Verify database exists
Test-Path data/the-pensive-index.db

# If database doesn't exist, create it
npm run db:setup
```

## Local Testing Environment

### 1. Database Migrations

Apply performance optimization migrations locally:

```powershell
# Run migrations
npm run db:migrate

# Verify migrations applied
sqlite3 data/the-pensive-index.db ".tables"
# Should show: performance_metrics, performance_aggregates, analytics_events, etc.
```

### 2. Start Development Server

```powershell
# Terminal 1: Start Next.js dev server
npm run dev
```

Server will be available at: `http://localhost:3000`

### 3. Test Performance API Endpoints

#### A. Metrics Endpoint

```powershell
# Get all metrics
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/performance/metrics" -Method GET

# Get specific metric
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/performance/metrics?metric=cache_hit_rate" -Method GET

# Get time range
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/performance/metrics?start_date=2025-10-01&end_date=2025-10-08" -Method GET
```

#### B. Cache Invalidation

```powershell
# Invalidate all caches
$body = @{ cacheKey = "all" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/performance/invalidate-cache" -Method POST -ContentType "application/json" -Body $body

# Invalidate specific cache
$body = @{ cacheKey = "search:harry-potter" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/performance/invalidate-cache" -Method POST -ContentType "application/json" -Body $body
```

#### C. Error Logs

```powershell
# Get recent errors
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/performance/errors" -Method GET

# Get filtered errors
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/performance/errors?severity=critical&limit=20" -Method GET
```

#### D. Analytics

```powershell
# Get analytics events
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/performance/analytics" -Method GET

# Get specific event type
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/performance/analytics?event_type=search" -Method GET
```

#### E. Resource Usage

```powershell
# Get current resource usage
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/performance/resource-usage" -Method GET
```

### 4. Test Caching Behavior

#### Search Caching

```powershell
# First request (cold cache)
Measure-Command { 
    Invoke-RestMethod -Uri "http://localhost:3000/api/search?fandom=harry-potter&tags=time-travel,romance" -Method GET
}

# Second request (warm cache - should be faster)
Measure-Command { 
    Invoke-RestMethod -Uri "http://localhost:3000/api/search?fandom=harry-potter&tags=time-travel,romance" -Method GET
}
```

#### Validation Caching

```powershell
# First request (cold cache)
Measure-Command { 
    Invoke-RestMethod -Uri "http://localhost:3000/api/validation/rules?fandom=harry-potter" -Method GET
}

# Second request (warm cache)
Measure-Command { 
    Invoke-RestMethod -Uri "http://localhost:3000/api/validation/rules?fandom=harry-potter" -Method GET
}
```

### 5. Test Rate Limiting

```powershell
# Send multiple requests rapidly
1..100 | ForEach-Object {
    try {
        Invoke-RestMethod -Uri "http://localhost:3000/api/search?fandom=harry-potter" -Method GET
        Write-Host "Request $_: Success" -ForegroundColor Green
    } catch {
        Write-Host "Request $_: Rate Limited" -ForegroundColor Red
    }
    Start-Sleep -Milliseconds 100
}
```

### 6. Performance Testing

Run the test suite:

```powershell
# Terminal 2: Run tests (with dev server running)
npm run test

# Run specific test suites
npm run test -- tests/performance/
npm run test -- tests/contracts/performance-api/
npm run test -- tests/integration/
```

### 7. Monitor Performance Locally

#### Database Queries

```powershell
# Connect to local database
sqlite3 data/the-pensive-index.db

# Check performance metrics
SELECT * FROM performance_metrics ORDER BY recorded_at DESC LIMIT 10;

# Check cache hit rate
SELECT 
    metric_name,
    AVG(metric_value) as avg_value,
    MIN(metric_value) as min_value,
    MAX(metric_value) as max_value
FROM performance_metrics 
WHERE metric_name = 'cache_hit_rate'
    AND recorded_at >= datetime('now', '-1 hour');

# Check error logs
SELECT * FROM error_logs ORDER BY occurred_at DESC LIMIT 10;

# Check analytics
SELECT 
    event_type,
    COUNT(*) as event_count
FROM analytics_events
WHERE occurred_at >= datetime('now', '-1 hour')
GROUP BY event_type;
```

### 8. Simulate Load Testing

```powershell
# Create a simple load test script
$script = @'
$urls = @(
    "http://localhost:3000/api/search?fandom=harry-potter",
    "http://localhost:3000/api/validation/rules?fandom=harry-potter",
    "http://localhost:3000/api/fandoms",
    "http://localhost:3000/api/admin/performance/metrics"
)

1..50 | ForEach-Object -Parallel {
    $url = $using:urls | Get-Random
    try {
        $response = Invoke-RestMethod -Uri $url -Method GET -TimeoutSec 5
        Write-Host "✓ $url" -ForegroundColor Green
    } catch {
        Write-Host "✗ $url - $($_.Exception.Message)" -ForegroundColor Red
    }
} -ThrottleLimit 10
'@

$script | Out-File -FilePath "load-test.ps1" -Encoding UTF8
# Run load test
.\load-test.ps1
```

## Local Testing Checklist

### ✅ Pre-Deployment Verification

- [ ] Database migrations applied successfully
- [ ] Development server starts without errors
- [ ] All API endpoints return valid responses
- [ ] Caching reduces response times (warm vs cold)
- [ ] Rate limiting triggers after threshold
- [ ] Performance metrics recorded in database
- [ ] Error logs capture exceptions
- [ ] Analytics events tracked
- [ ] Resource usage monitored
- [ ] Test suite passes (with server running)

### ✅ Performance Baselines

After running local tests, record baselines:

```powershell
# Generate performance baseline
sqlite3 data/the-pensive-index.db <<EOF
SELECT 
    'Search P95' as metric,
    ROUND(AVG(CASE WHEN metric_name = 'search_p95' THEN metric_value END), 2) as value
FROM performance_metrics
WHERE recorded_at >= datetime('now', '-1 hour')
UNION ALL
SELECT 
    'Cache Hit Rate' as metric,
    ROUND(AVG(CASE WHEN metric_name = 'cache_hit_rate' THEN metric_value END), 2) as value
FROM performance_metrics
WHERE recorded_at >= datetime('now', '-1 hour')
UNION ALL
SELECT 
    'Error Rate' as metric,
    ROUND(AVG(CASE WHEN metric_name = 'error_rate' THEN metric_value END), 4) as value
FROM performance_metrics
WHERE recorded_at >= datetime('now', '-1 hour');
EOF
```

Update `performance-baseline.json` with actual values:

```json
{
  "baseline": {
    "search_p95_ms": 450,
    "validation_p95_ms": 180,
    "cache_hit_rate_percent": 85,
    "error_rate_percent": 0.5
  }
}
```

## Simulating Cloudflare Features Locally

### Caching (KV Simulation)

Local caching uses in-memory storage. To test KV-like behavior:

```powershell
# Install miniflare for local Cloudflare Workers testing
npm install -D miniflare

# Create miniflare test script
$miniflareScript = @'
import { Miniflare } from "miniflare";

const mf = new Miniflare({
  script: `
    export default {
      async fetch(request, env) {
        return new Response("Hello from Miniflare!");
      }
    }
  `,
  kvNamespaces: ["CACHE_KV"]
});

const response = await mf.dispatchFetch("http://localhost:8787/");
console.log(await response.text());
'@

$miniflareScript | Out-File -FilePath "test-miniflare.mjs" -Encoding UTF8
node test-miniflare.mjs
```

### Rate Limiting (Durable Objects Simulation)

Local rate limiting uses in-memory state. Production uses Cloudflare Durable Objects.

### Cron Jobs (Manual Trigger)

Cron jobs can't run automatically locally. Test them manually:

```powershell
# Test metrics aggregation cron
node -e "
const { aggregateMetrics } = require('./src/worker/cron/aggregate-metrics');
aggregateMetrics().then(() => console.log('Metrics aggregated'));
"

# Test analytics aggregation cron
node -e "
const { aggregateAnalytics } = require('./src/worker/cron/aggregate-analytics');
aggregateAnalytics().then(() => console.log('Analytics aggregated'));
"

# Test resource monitoring cron
node -e "
const { monitorResources } = require('./src/worker/cron/monitor-resources');
monitorResources().then(() => console.log('Resources monitored'));
"
```

## Common Issues & Solutions

### Issue: Tests Fail with ECONNREFUSED

**Solution**: Make sure dev server is running in another terminal

```powershell
# Terminal 1
npm run dev

# Terminal 2 (wait for server to start)
npm run test
```

### Issue: Database Locked

**Solution**: Close any open database connections

```powershell
# Kill any processes using the database
Get-Process | Where-Object { $_.ProcessName -like "*sqlite*" } | Stop-Process -Force
```

### Issue: Caching Not Working

**Solution**: Check cache configuration and clear old caches

```powershell
# Invalidate all caches
curl -X POST http://localhost:3000/api/admin/performance/invalidate-cache `
  -H "Content-Type: application/json" `
  -d '{"cacheKey":"all"}'
```

### Issue: Rate Limiting Not Triggering

**Solution**: Check rate limit configuration in `wrangler.toml` and increase request volume

```powershell
# Send more rapid requests
1..200 | ForEach-Object { 
    Invoke-RestMethod -Uri "http://localhost:3000/api/search?fandom=harry-potter" 
}
```

## Next Steps

Once local testing is complete and all checks pass:

1. ✅ Review `performance-baseline.json` with actual local metrics
2. ✅ Document any issues found during testing
3. ✅ Commit all changes to version control
4. 🚀 Deploy to Cloudflare staging following `wiki/deployment/performance-deployment.md`

## Local vs Cloudflare Differences

| Feature | Local Behavior | Cloudflare Behavior |
|---------|----------------|---------------------|
| **Caching** | In-memory (volatile) | KV (persistent, global) |
| **Rate Limiting** | In-memory counters | Durable Objects (distributed) |
| **Cron Jobs** | Manual trigger only | Automatic scheduling |
| **CDN** | No CDN | Global CDN with edge caching |
| **Database** | Local SQLite file | D1 (distributed SQLite) |
| **Performance** | Local machine speed | Global edge network |

**Important**: Always verify on Cloudflare staging before production deployment, as edge behavior differs from local testing.

---

**Last Updated**: 2025-10-08  
**Status**: Ready for local testing
