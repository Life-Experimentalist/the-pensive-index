# Cloudflare Deployment Guide - The Pensieve Index

**Last Updated:** October 10, 2025
**Platform:** Cloudflare Pages + Workers + D1 + KV

## Overview

The Pensieve Index uses Cloudflare's free-tier services for global deployment:
- **Cloudflare Pages**: Static site hosting with automatic builds
- **Cloudflare D1**: Serverless SQLite database
- **Cloudflare KV**: Key-value cache storage
- **Cloudflare Workers**: Edge computing for API routes
- **Cloudflare Analytics**: Usage tracking

---

## Prerequisites

### Required Accounts & Tools
- [x] Cloudflare account (free tier)
- [x] GitHub repository connected
- [x] Node.js 18+ installed
- [x] Wrangler CLI installed globally

```powershell
# Install Wrangler globally
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

---

## Step 1: Cloudflare Pages Setup

### 1.1 Create Pages Project

1. **Go to Cloudflare Dashboard**
   - Navigate to: https://dash.cloudflare.com/
   - Select your account
   - Click "Workers & Pages" → "Create Application" → "Pages"

2. **Connect GitHub Repository**
   - Click "Connect to Git"
   - Authorize Cloudflare to access GitHub
   - Select repository: `Life-Experimentalists/the-pensive-index`
   - Click "Begin setup"

3. **Configure Build Settings**
   ```
   Project name: the-pensive-index
   Production branch: main
   Build command: npm run build:nextjs
   Build output directory: .next
   Root directory: /
   ```

4. **Environment Variables**
   Add these in Cloudflare Pages settings:

   **Required:**
   ```
   NODE_VERSION=18
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-key>
   CLERK_SECRET_KEY=<your-clerk-secret>
   NEXT_PUBLIC_APP_URL=https://the-pensive-index.pages.dev
   DATABASE_URL=<will-be-set-after-D1-setup>
   ```

   **Optional:**
   ```
   GITHUB_WEBHOOK_SECRET=<your-webhook-secret>
   GITHUB_ACCESS_TOKEN=<your-github-token>
   POSTMAN_API_KEY=<your-postman-key>
   ```

5. **Save and Deploy**
   - Click "Save and Deploy"
   - Wait for first build to complete (~3-5 minutes)

### 1.2 Custom Domain (Optional)

1. Go to Pages project → "Custom domains"
2. Click "Set up a custom domain"
3. Enter your domain (e.g., `pensive-index.com`)
4. Follow DNS configuration steps
5. Wait for SSL certificate provisioning

---

## Step 2: Cloudflare D1 Database Setup

### 2.1 Create D1 Database

```powershell
# Create production database
wrangler d1 create pensive-index

# Output will show:
# database_name = "pensive-index"
# database_id = "57eace70-cb4f-4fb2-9a7a-8037960f44d6"
```

### 2.2 Update wrangler.toml

Already configured in `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "pensive-index"
database_id = "57eace70-cb4f-4fb2-9a7a-8037960f44d6"
```

### 2.3 Initialize Database Schema

```powershell
# Create migration file
wrangler d1 migrations create pensive-index initial-schema

# This creates: migrations/0001_initial-schema.sql
```

**Copy schema from `src/lib/database/schema.ts` to migration file:**

```sql
-- migrations/0001_initial-schema.sql

-- Fandoms table
CREATE TABLE fandoms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'User',
  is_active INTEGER DEFAULT 1,
  is_verified INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Tags table
CREATE TABLE tags (
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
  FOREIGN KEY (fandom_id) REFERENCES fandoms(id) ON DELETE CASCADE
);

-- Tag Classes table
CREATE TABLE tag_classes (
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

-- Plot Blocks table
CREATE TABLE plot_blocks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  fandom_id TEXT NOT NULL,
  plot_block_category_id TEXT,
  tag_combinations TEXT,
  context TEXT,
  metadata TEXT,
  is_active INTEGER DEFAULT 1,
  parent_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (fandom_id) REFERENCES fandoms(id) ON DELETE CASCADE
);

-- Story Submissions table
CREATE TABLE story_submissions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  url TEXT NOT NULL,
  fandom_id TEXT NOT NULL,
  tags TEXT,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_by TEXT,
  github_issue_number INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (fandom_id) REFERENCES fandoms(id) ON DELETE CASCADE
);

-- Fandom Admin Assignments table
CREATE TABLE fandom_admin_assignments (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  fandom_id TEXT NOT NULL,
  assigned_at INTEGER NOT NULL DEFAULT (unixepoch()),
  assigned_by TEXT,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (fandom_id) REFERENCES fandoms(id) ON DELETE CASCADE,
  UNIQUE(admin_id, fandom_id)
);

-- Admin Invitations table
CREATE TABLE admin_invitations (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  fandom_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  created_by TEXT,
  FOREIGN KEY (fandom_id) REFERENCES fandoms(id) ON DELETE CASCADE
);

-- Audit Logs table
CREATE TABLE audit_logs (
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

-- Indexes for performance
CREATE INDEX idx_tags_fandom ON tags(fandom_id);
CREATE INDEX idx_tags_class ON tags(tag_class_id);
CREATE INDEX idx_plot_blocks_fandom ON plot_blocks(fandom_id);
CREATE INDEX idx_submissions_fandom ON story_submissions(fandom_id);
CREATE INDEX idx_submissions_status ON story_submissions(status);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
```

### 2.4 Run Migration

```powershell
# Apply to production database
wrangler d1 migrations apply pensive-index --remote

# For local development
wrangler d1 migrations apply pensive-index --local
```

### 2.5 Seed Initial Data

Create `scripts/seed-d1.sql`:

```sql
-- Insert sample fandoms
INSERT INTO fandoms (name, slug, description, is_active) VALUES
  ('Harry Potter', 'harry-potter', 'The wizarding world of Harry Potter', 1),
  ('Percy Jackson', 'percy-jackson', 'Camp Half-Blood and the world of Percy Jackson', 1),
  ('Marvel Cinematic Universe', 'mcu', 'Marvel superheroes and Avengers', 1);

-- Insert sample tag classes for Harry Potter
INSERT INTO tag_classes (id, name, slug, description, fandom_id, validation_rules, is_active) VALUES
  ('tc-hp-shipping', 'Shipping', 'shipping', 'Romantic pairings', '1', '{"mutual_exclusion": {"within_class": true}}', 1),
  ('tc-hp-era', 'Era', 'era', 'Time period of the story', '1', '{"mutual_exclusion": {"within_class": true}}', 1),
  ('tc-hp-au', 'Alternate Universe', 'au', 'AU types and divergences', '1', '{}', 1);
```

**Execute seed:**

```powershell
# Seed production
wrangler d1 execute pensive-index --remote --file=./scripts/seed-d1.sql

# Seed local
wrangler d1 execute pensive-index --local --file=./scripts/seed-d1.sql
```

---

## Step 3: Cloudflare KV Setup

### 3.1 Create KV Namespace

```powershell
# Create production KV namespace
wrangler kv:namespace create CACHE

# Output:
# id = "4e66268461374e29a8b2ad480cbe2ca7"
# title = "the-pensive-index-CACHE"

# Create preview namespace for development
wrangler kv:namespace create CACHE --preview
```

### 3.2 Update wrangler.toml

Already configured:

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "4e66268461374e29a8b2ad480cbe2ca7"
preview_id = "4e66268461374e29a8b2ad480cbe2ca7"
```

### 3.3 Test KV Storage

```powershell
# Write test data
wrangler kv:key put --binding=CACHE "test-key" "test-value"

# Read test data
wrangler kv:key get --binding=CACHE "test-key"

# List all keys
wrangler kv:key list --binding=CACHE
```

---

## Step 4: Environment Configuration

### 4.1 Local Development

Create `.dev.vars` (gitignored):

```env
# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000

# GitHub Integration
GITHUB_WEBHOOK_SECRET=your-webhook-secret
GITHUB_ACCESS_TOKEN=ghp_...

# Postman (optional)
POSTMAN_API_KEY=PMAK-...
```

### 4.2 Production Environment

Set in Cloudflare Pages → Settings → Environment Variables:

**Production Variables:**
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_APP_URL=https://the-pensive-index.pages.dev
GITHUB_WEBHOOK_SECRET=...
GITHUB_ACCESS_TOKEN=...
```

### 4.3 Bind D1 and KV to Pages

In Cloudflare Pages settings:
1. Go to "Settings" → "Functions"
2. Under "Bindings", add:
   - **D1 Databases**: Bind `DB` to `pensive-index`
   - **KV Namespaces**: Bind `CACHE` to your KV namespace

---

## Step 5: Deploy Worker

### 5.1 Build Worker

```powershell
# Compile TypeScript worker
npm run build
```

### 5.2 Deploy to Cloudflare

```powershell
# Deploy production worker
wrangler deploy

# Deploy to preview environment
wrangler deploy --env preview

# View deployment
wrangler deployments list
```

### 5.3 Test Worker

```powershell
# Tail logs in real-time
wrangler tail

# Test locally before deploy
wrangler dev
```

---

## Step 6: Database Connection Update

### 6.1 Update Database Client

Edit `src/lib/database/index.ts`:

```typescript
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

// For Cloudflare Workers/Pages
export function getDatabase(env: { DB: D1Database }) {
  return drizzle(env.DB, { schema });
}

// For local development (keep existing better-sqlite3)
export function getLocalDatabase() {
  const Database = require('better-sqlite3');
  const sqlite = new Database('./data/the-pensive-index.db');
  return drizzle(sqlite, { schema });
}
```

### 6.2 Update API Routes

In API routes, access D1 via platform context:

```typescript
// app/api/fandoms/route.ts
import { getDatabase } from '@/lib/database';

export const runtime = 'edge';

export async function GET(request: Request) {
  const db = getDatabase(request.context.env);
  const fandoms = await db.select().from(schema.fandoms);
  return Response.json(fandoms);
}
```

---

## Step 7: Continuous Deployment

### 7.1 Automatic Deployments

Cloudflare Pages auto-deploys on every push to `main`:

1. Push to GitHub
2. Cloudflare detects commit
3. Runs build command
4. Deploys to production URL
5. Invalidates cache

### 7.2 Preview Deployments

Every PR gets a unique preview URL:
- URL format: `https://<commit-hash>.the-pensive-index.pages.dev`
- Auto-deleted after merge/close

### 7.3 Rollback

```powershell
# List deployments
wrangler deployments list

# Rollback to specific deployment
wrangler rollback <deployment-id>
```

---

## Step 8: Monitoring & Analytics

### 8.1 Enable Analytics

1. Go to Cloudflare Dashboard → Analytics
2. Enable Web Analytics (free)
3. Add analytics script to `app/layout.tsx` (optional)

### 8.2 Performance Monitoring

Built-in metrics in Cloudflare Dashboard:
- Request volume
- Response times (p50, p99)
- Error rates
- Bandwidth usage
- Cache hit ratios

### 8.3 Error Tracking

```typescript
// app/api/error-handler.ts
export function logError(error: Error, context: any) {
  if (process.env.NODE_ENV === 'production') {
    // Send to Cloudflare analytics
    console.error('[ERROR]', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

## Step 9: Cache Strategy

### 9.1 KV Cache Implementation

```typescript
// src/lib/cache/kv-cache.ts
export class KVCache {
  constructor(private kv: KVNamespace) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.kv.get(key, 'json');
    return value as T | null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.kv.put(key, JSON.stringify(value), {
      expirationTtl: ttl || 3600, // 1 hour default
    });
  }

  async invalidate(pattern: string): Promise<void> {
    const { keys } = await this.kv.list({ prefix: pattern });
    await Promise.all(keys.map(k => this.kv.delete(k.name)));
  }
}
```

### 9.2 Cache Usage

```typescript
// Example: Cache fandom list
const cache = new KVCache(env.CACHE);

// Try cache first
let fandoms = await cache.get<Fandom[]>('fandoms:active');

if (!fandoms) {
  // Cache miss - fetch from D1
  fandoms = await db.select().from(schema.fandoms);
  await cache.set('fandoms:active', fandoms, 3600); // 1 hour TTL
}

return fandoms;
```

---

## Step 10: Testing Deployment

### 10.1 Pre-Deployment Checklist

- [ ] All environment variables set in Cloudflare
- [ ] D1 database migrated and seeded
- [ ] KV namespace created and bound
- [ ] Worker deployed successfully
- [ ] API routes return expected data
- [ ] Authentication works (Clerk)
- [ ] Admin dashboard accessible

### 10.2 Post-Deployment Tests

```powershell
# Test API endpoints
curl https://the-pensive-index.pages.dev/api/fandoms

# Test homepage
curl https://the-pensive-index.pages.dev

# Test admin (requires auth)
# Visit in browser: https://the-pensive-index.pages.dev/admin
```

### 10.3 Load Testing (Optional)

```powershell
# Install k6
choco install k6

# Run load test
k6 run tests/load-test.js
```

---

## Troubleshooting

### Issue: Build Fails on Cloudflare

**Solution:**
- Check build logs in Cloudflare dashboard
- Verify `NODE_VERSION=18` is set
- Ensure all dependencies in `package.json`
- Try building locally first: `npm run build:nextjs`

### Issue: D1 Migration Fails

**Solution:**
```powershell
# Check migration status
wrangler d1 migrations list pensive-index

# Force reapply
wrangler d1 migrations apply pensive-index --remote --force
```

### Issue: KV Not Accessible

**Solution:**
- Verify binding name matches `wrangler.toml`
- Check KV namespace ID is correct
- Ensure binding is added in Pages settings

### Issue: 500 Errors on API Routes

**Solution:**
- Check worker logs: `wrangler tail`
- Verify D1 binding exists
- Check database schema matches queries

---

## Cost Estimate (Free Tier)

| Service | Free Tier | Usage Estimate |
|---------|-----------|----------------|
| Pages | 500 builds/month | ~50-100 builds |
| Workers | 100k requests/day | ~1-5k/day |
| D1 | 5 GB storage, 5M reads/day | <100 MB, ~10k reads |
| KV | 1 GB storage, 100k reads/day | <10 MB, ~1k reads |
| **Total** | **$0/month** | Well within free tier |

---

## Next Steps

1. ✅ Complete this guide
2. 🔄 Test deployment workflow
3. 📊 Monitor analytics for 1 week
4. 🚀 Optimize cache hit rates
5. 📈 Scale as needed (upgrade plans)

---

## Useful Commands Reference

```powershell
# Development
npm run dev                    # Local dev server
wrangler dev                   # Local worker testing
wrangler d1 execute DB --local # Query local D1

# Deployment
wrangler deploy                # Deploy worker
git push origin main           # Trigger Pages deploy

# Database
wrangler d1 migrations create DB <name>  # New migration
wrangler d1 migrations apply DB --remote # Apply to prod
wrangler d1 execute DB --command="..."   # Run SQL

# Cache
wrangler kv:key put --binding=CACHE <key> <value>
wrangler kv:key get --binding=CACHE <key>
wrangler kv:key list --binding=CACHE

# Monitoring
wrangler tail                  # Live logs
wrangler deployments list      # Deployment history
```

---

**Documentation Version:** 1.0.0
**Last Reviewed:** October 10, 2025
**Maintained By:** The Pensieve Index Team
