# Deployment Guide

The Pensieve Index is designed for deployment on **Cloudflare Pages** with **Cloudflare D1** database.

## Production Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Cloudflare     │    │  Cloudflare      │    │  GitHub         │
│  Pages          │───▶│  D1 Database     │    │  Repository     │
│  (Next.js App)  │    │  (SQLite)        │    │  (Source)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  NextAuth.js    │    │  Drizzle ORM     │    │  CI/CD          │
│  (Auth)         │    │  (Type Safety)   │    │  (Auto Deploy)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Prerequisites

Before deployment, ensure you have:

- **Cloudflare Account** with Pages access
- **GitHub Repository** with source code
- **Wrangler CLI** installed and authenticated
- **Environment Variables** configured

### Wrangler Setup

```powershell
# Install Wrangler CLI
npm install -g wrangler

# Authenticate with Cloudflare
wrangler auth login

# Verify authentication
wrangler whoami
```

## Environment Configuration

### Production Environment Variables

Create `.env.production` file:

```env
# Database
DATABASE_URL="your-d1-database-url"

# Authentication
NEXTAUTH_URL="https://your-app.pages.dev"
NEXTAUTH_SECRET="your-production-secret-key"

# GitHub OAuth (for admin authentication)
GITHUB_CLIENT_ID="your-github-oauth-client-id"
GITHUB_CLIENT_SECRET="your-github-oauth-client-secret"

# Admin Configuration
ADMIN_GITHUB_USERNAMES="your-username,other-admin"

# Optional: Analytics
ANALYTICS_ID="your-analytics-id"
```

### Cloudflare Pages Configuration

In your Cloudflare Dashboard:

1. **Pages** → **Create Application** → **Connect to Git**
2. Select your GitHub repository
3. Configure build settings:

```yaml
# Build configuration
Build command: npm run build
Build output directory: .next
Root directory: /
Node.js version: 18

# Environment variables
NODE_VERSION: 18
NEXT_TELEMETRY_DISABLED: 1
```

## Database Deployment

### Create D1 Database

```powershell
# Create production database
wrangler d1 create pensieve-index-prod

# Create staging database (optional)
wrangler d1 create pensieve-index-staging
```

### Configure Database Binding

Update `wrangler.toml`:

```toml
name = "pensieve-index"
compatibility_date = "2024-01-15"
compatibility_flags = ["nodejs_compat"]

[env.production]
[[env.production.d1_databases]]
binding = "DB"
database_name = "pensieve-index-prod"
database_id = "your-d1-database-id"

[env.staging]
[[env.staging.d1_databases]]
binding = "DB"
database_name = "pensieve-index-staging"
database_id = "your-staging-database-id"
```

### Run Database Migrations

```powershell
# Apply migrations to production
wrangler d1 migrations apply pensieve-index-prod --env production

# Apply migrations to staging
wrangler d1 migrations apply pensieve-index-staging --env staging

# Seed production database
wrangler d1 execute pensieve-index-prod --file=./seeds/production.sql --env production
```

## Deployment Process

### Automated Deployment (Recommended)

The repository includes GitHub Actions for automated deployment:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:ci

      - name: Build application
        run: npm run build

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: pensieve-index
          directory: .next
```

### Manual Deployment

```powershell
# Build for production
npm run build

# Deploy to Cloudflare Pages
wrangler pages publish .next --project-name=pensieve-index
```

## Domain Configuration

### Custom Domain Setup

1. **Cloudflare Dashboard** → **Pages** → **pensieve-index** → **Custom domains**
2. Add your domain: `pensieve-index.com`
3. Configure DNS records:

```dns
# A record
Type: A
Name: @
Content: 192.0.2.1 (Cloudflare IP)

# CNAME record
Type: CNAME
Name: www
Content: pensieve-index.pages.dev
```

### SSL Configuration

Cloudflare automatically provides SSL certificates. Ensure:

- **SSL/TLS mode**: Full (strict)
- **Always Use HTTPS**: On
- **HTTP Strict Transport Security (HSTS)**: Enabled

## Performance Optimization

### Caching Strategy

Configure caching rules in Cloudflare:

```javascript
// next.config.js - Cache headers
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/fandoms/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400'
          }
        ]
      },
      {
        source: '/api/stories/search',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600'
          }
        ]
      }
    ];
  }
};
```

### Edge Optimization

```toml
# wrangler.toml - Workers configuration
[env.production.vars]
ENVIRONMENT = "production"
ENABLE_EDGE_CACHING = "true"
SEARCH_CACHE_TTL = "300"
FANDOM_CACHE_TTL = "3600"
```

## Monitoring and Analytics

### Error Tracking

Configure Sentry for error monitoring:

```javascript
// sentry.client.config.js
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### Performance Monitoring

```javascript
// lib/analytics.ts
export function trackSearchPerformance(searchTime: number, resultCount: number) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'search_performance', {
      custom_parameter_1: searchTime,
      custom_parameter_2: resultCount,
    });
  }
}
```

### Database Monitoring

```powershell
# Monitor D1 database usage
wrangler d1 info pensieve-index-prod

# View recent queries
wrangler d1 insights pensieve-index-prod --since=1h
```

## Backup and Recovery

### Automated Backups

```yaml
# .github/workflows/backup.yml
name: Database Backup

on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM UTC

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Backup D1 Database
        run: |
          wrangler d1 export pensieve-index-prod --output="backup-$(date +%Y%m%d).sql"

      - name: Upload to GitHub Releases
        uses: softprops/action-gh-release@v1
        with:
          tag_name: backup-$(date +%Y%m%d)
          files: backup-*.sql
```

### Manual Backup

```powershell
# Export database backup
wrangler d1 export pensieve-index-prod --output="backup-$(Get-Date -Format 'yyyyMMdd').sql"

# Import from backup
wrangler d1 execute pensieve-index-prod --file="backup-20240115.sql"
```

## Security Configuration

### Authentication Security

```javascript
// lib/auth/config.ts
export const authConfig = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Restrict to admin users only
      const adminUsernames = process.env.ADMIN_GITHUB_USERNAMES?.split(',') || [];
      return adminUsernames.includes(user.email || '');
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  }
};
```

### API Security

```javascript
// middleware.ts
import { withAuth } from "next-auth/middleware";
import { ratelimit } from "./lib/ratelimit";

export default withAuth(
  async function middleware(req) {
    // Rate limiting
    const identifier = req.ip ?? '127.0.0.1';
    const { success } = await ratelimit.limit(identifier);

    if (!success) {
      return new Response('Too Many Requests', { status: 429 });
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Protect admin routes
        if (req.nextUrl.pathname.startsWith('/admin')) {
          return !!token?.isAdmin;
        }
        return true;
      },
    },
  }
);
```

## Staging Environment

### Staging Deployment

```powershell
# Deploy to staging
wrangler pages publish .next --project-name=pensieve-index-staging --env=staging

# Run staging migrations
wrangler d1 migrations apply pensieve-index-staging --env staging
```

### Staging Configuration

```toml
# wrangler.toml - Staging environment
[env.staging]
[[env.staging.d1_databases]]
binding = "DB"
database_name = "pensieve-index-staging"
database_id = "your-staging-database-id"

[env.staging.vars]
ENVIRONMENT = "staging"
NEXTAUTH_URL = "https://pensieve-index-staging.pages.dev"
```

## Troubleshooting

### Common Deployment Issues

**Build Failures**
```powershell
# Check build logs
wrangler pages deployment list --project-name=pensieve-index

# View specific deployment logs
wrangler pages deployment tail --project-name=pensieve-index
```

**Database Connection Issues**
```powershell
# Test database connection
wrangler d1 execute pensieve-index-prod --command="SELECT 1"

# Check database bindings
wrangler d1 list
```

**Authentication Problems**
```powershell
# Verify environment variables
wrangler pages project list

# Check OAuth app configuration in GitHub
```

### Performance Issues

**Slow Database Queries**
- Review query execution plans
- Check indexing strategy
- Monitor D1 insights dashboard

**High Response Times**
- Enable Cloudflare caching
- Optimize API endpoints
- Use edge workers for static content

### Rollback Procedures

```powershell
# Rollback to previous deployment
wrangler pages deployment list --project-name=pensieve-index
wrangler pages deployment promote <deployment-id> --project-name=pensieve-index

# Rollback database migration
wrangler d1 migrations list pensieve-index-prod
wrangler d1 execute pensieve-index-prod --file="rollback-migration.sql"
```

## Maintenance

### Regular Maintenance Tasks

```powershell
# Weekly: Update dependencies
npm update

# Monthly: Review database performance
wrangler d1 insights pensieve-index-prod --since=30d

# Quarterly: Security audit
npm audit
wrangler security scan
```

### Database Maintenance

```sql
-- Analyze database performance
ANALYZE;

-- Vacuum database (not needed for D1 but good practice locally)
VACUUM;

-- Update statistics
UPDATE sqlite_stat1 SET tbl='stories' WHERE tbl IS NULL;
```

---

*For additional deployment configurations and advanced setups, contact the development team.*
