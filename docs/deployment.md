# Deployment Guide

## Overview

The Pensieve Index is designed for deployment on Cloudflare Pages with D1 database integration. This guide covers production deployment, environment setup, and maintenance procedures.

## Prerequisites

- Cloudflare account with Pages and D1 access
- GitHub repository with the codebase
- Domain name (optional)

## Environment Setup

### 1. Cloudflare D1 Database

Create a new D1 database in your Cloudflare dashboard:

```powershell
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create D1 database
wrangler d1 create pensieve-index-prod

# Note the database ID from the output
```

### 2. Database Schema Migration

```powershell
# Run migrations
wrangler d1 migrations apply pensieve-index-prod --local
wrangler d1 migrations apply pensieve-index-prod --remote
```

### 3. Environment Variables

Set up the following environment variables in your Cloudflare Pages dashboard:

#### Required Variables

```bash
# Database
DATABASE_URL="your-d1-database-url"

# Authentication (NextAuth.js)
NEXTAUTH_SECRET="your-secret-key-min-32-chars"
NEXTAUTH_URL="https://your-domain.com"

# GitHub OAuth (for admin authentication)
GITHUB_CLIENT_ID="your-github-oauth-app-id"
GITHUB_CLIENT_SECRET="your-github-oauth-app-secret"

# Node environment
NODE_ENV="production"
```

#### Optional Variables

```bash
# Rate limiting
RATE_LIMIT_REQUESTS="100"
RATE_LIMIT_WINDOW="60000"

# Performance monitoring
ENABLE_PERFORMANCE_LOGGING="true"

# Feature flags
ENABLE_WEBHOOKS="false"
ENABLE_BETA_FEATURES="false"
```

## Deployment Steps

### 1. GitHub Repository Setup

Ensure your repository has the following structure:

```
├── .github/
│   └── workflows/
│       └── deploy.yml
├── app/
├── src/
├── docs/
├── tests/
├── package.json
├── wrangler.toml
└── README.md
```

### 2. Wrangler Configuration

Create or update `wrangler.toml`:

```toml
name = "pensieve-index"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[env.production]
name = "pensieve-index-prod"

[[env.production.d1_databases]]
binding = "DB"
database_name = "pensieve-index-prod"
database_id = "your-database-id"

[build]
command = "npm run build"

[env.production.vars]
NODE_ENV = "production"
```

### 3. Cloudflare Pages Setup

1. Go to Cloudflare Pages dashboard
2. Connect your GitHub repository
3. Set build configuration:
   - Framework preset: Next.js
   - Build command: `npm run build`
   - Build output directory: `.next`
   - Node.js version: 18.x

### 4. Custom Domain (Optional)

1. Add custom domain in Cloudflare Pages
2. Update NEXTAUTH_URL environment variable
3. Configure DNS records

## Database Initialization

### Production Data Seed

```powershell
# Seed with initial fandom data
wrangler d1 execute pensieve-index-prod --command "
INSERT INTO fandoms (id, name, description, slug, is_active, created_at, updated_at)
VALUES
  ('hp-uuid', 'Harry Potter', 'The wizarding world of Harry Potter', 'harry-potter', true, datetime('now'), datetime('now')),
  ('pj-uuid', 'Percy Jackson', 'The world of Percy Jackson and the Olympians', 'percy-jackson', true, datetime('now'), datetime('now'));
"
```

### Admin User Setup

1. Deploy the application
2. Sign in with your GitHub account
3. Manually update the database to grant admin privileges:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@domain.com';
```

## Monitoring and Maintenance

### 1. Performance Monitoring

Monitor application performance through:
- Cloudflare Analytics
- D1 query metrics
- Custom performance logging

Key metrics to track:
- API response times (<50ms for CRUD, <200ms for validation)
- Database query performance
- Error rates
- User engagement

### 2. Database Maintenance

#### Regular Backups

```powershell
# Export database backup
wrangler d1 backup create pensieve-index-prod

# List backups
wrangler d1 backup list pensieve-index-prod

# Restore from backup
wrangler d1 backup restore pensieve-index-prod --backup-id backup-id
```

#### Performance Optimization

Monitor and optimize:
- Query performance
- Index usage
- Connection pooling
- Cache hit rates

### 3. Security Monitoring

Regular security checks:
- Dependency vulnerability scans
- Authentication audit logs
- Rate limiting effectiveness
- API abuse monitoring

## Scaling Considerations

### Performance Optimization

1. **Caching Strategy**
   - Implement Cloudflare caching for static content
   - Use D1 query caching for frequently accessed data
   - Consider Redis for session storage at scale

2. **Database Optimization**
   - Monitor query performance
   - Add indexes for frequently queried fields
   - Implement read replicas if needed

3. **CDN Configuration**
   - Configure Cloudflare CDN settings
   - Optimize asset delivery
   - Enable compression

### Load Testing

Before high-traffic periods:

```powershell
# Install artillery for load testing
npm install -g artillery

# Run load tests
artillery run tests/load/api-endpoints.yml
```

## Rollback Procedures

### Quick Rollback

1. Use Cloudflare Pages deployment history
2. Revert to previous successful deployment
3. Update environment variables if needed

### Database Rollback

```powershell
# Create migration rollback
wrangler d1 migrations create rollback-to-version-x

# Apply rollback migration
wrangler d1 migrations apply pensieve-index-prod --remote
```

## Troubleshooting

### Common Issues

#### Database Connection Issues

```powershell
# Test database connection
wrangler d1 execute pensieve-index-prod --command "SELECT 1;"
```

#### Build Failures

1. Check Node.js version compatibility
2. Verify environment variables
3. Review build logs in Cloudflare Pages

#### Performance Issues

1. Check D1 query metrics
2. Review API response times
3. Monitor memory usage

### Debug Mode

Enable debug logging in production:

```bash
DEBUG_MODE="true"
LOG_LEVEL="debug"
```

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: pensieve-index
          directory: .next
```

## Security Best Practices

### Environment Security

1. Rotate secrets regularly
2. Use least-privilege access
3. Enable Cloudflare security features
4. Implement proper CORS policies

### Application Security

1. Keep dependencies updated
2. Implement proper authentication
3. Validate all user inputs
4. Use HTTPS everywhere

### Database Security

1. Use parameterized queries
2. Implement proper access controls
3. Regular security audits
4. Encrypt sensitive data

## Maintenance Schedule

### Daily
- Monitor error rates
- Check performance metrics
- Review security logs

### Weekly
- Database performance review
- Dependency update check
- Backup verification

### Monthly
- Security audit
- Performance optimization review
- Capacity planning assessment

### Quarterly
- Full security assessment
- Disaster recovery testing
- Architecture review

## Support and Documentation

### Resources
- Cloudflare Pages documentation
- D1 database documentation
- Next.js deployment guides
- Project GitHub repository

### Emergency Contacts
- Infrastructure team
- Security team
- Development team lead

### Incident Response
1. Identify issue severity
2. Implement immediate fixes
3. Communicate with stakeholders
4. Document lessons learned

## Cost Optimization

### Cloudflare Usage Monitoring
- Track D1 database usage
- Monitor Pages build minutes
- Review bandwidth consumption

### Optimization Strategies
- Implement efficient caching
- Optimize database queries
- Minimize API calls
- Use appropriate service tiers

## Future Considerations

### Scaling Plans
- Multi-region deployment
- Advanced caching strategies
- Microservices architecture
- Real-time features

### Technology Updates
- Next.js version upgrades
- D1 feature adoption
- Performance improvements
- Security enhancements
