# Deployment Guide: The Pensieve Index

This guide covers deploying The Pensieve Index with a dual-deployment strategy:
- **Documentation** → GitHub Pages
- **Next.js Application** → Cloudflare Pages

## Overview

The Pensieve Index uses a sophisticated architecture that requires specific deployment configurations:

- **Frontend**: Next.js 15.5.4 with App Router
- **Database**: SQLite with Drizzle ORM
- **Authentication**: Clerk
- **Styling**: Tailwind CSS
- **Deployment**: Dual-platform strategy

## 1. GitHub Pages Deployment (Documentation)

GitHub Pages will host the static documentation site from the `/docs` folder.

### Setup Steps

1. **Configure Repository Settings**
   ```powershell
   # Navigate to GitHub repository settings
   # Go to Pages section
   # Set source to "Deploy from a branch"
   # Select branch: main
   # Select folder: /docs
   ```

2. **Build Documentation**
   ```powershell
   # From project root
   npm run build:docs

   # This generates static files in /docs folder
   # Files include: index.html, sitemap.xml, robots.txt, manifest.json
   ```

3. **Custom Domain (Optional)**
   ```powershell
   # Add CNAME file to /docs folder with your domain
   echo "your-domain.com" > docs/CNAME
   ```

### GitHub Pages Configuration

- **URL Pattern**: `https://[username].github.io/the-pensive-index`
- **Custom Domain**: Configure in repository settings
- **SSL**: Automatically enabled by GitHub
- **Build**: Static files from `/docs` folder

## 2. Cloudflare Pages Deployment (Next.js App)

Cloudflare Pages will host the dynamic Next.js application with full-stack capabilities.

### Prerequisites

1. **Cloudflare Account**: Sign up at [dash.cloudflare.com](https://dash.cloudflare.com)
2. **Domain**: Optional, can use `.pages.dev` subdomain
3. **GitHub Integration**: Connect your repository

### Setup Steps

1. **Create New Pages Project**
   ```bash
   # In Cloudflare Dashboard:
   # Pages → Create a project → Connect to Git
   # Select your repository: the-pensive-index
   # Configure build settings (see below)
   ```

2. **Build Configuration**
   ```yaml
   # Build settings in Cloudflare Pages dashboard
   Framework preset: Next.js
   Build command: npm run build
   Build output directory: .next
   Root directory: / (leave empty for root)
   Node.js version: 18.x or 20.x
   ```

3. **Environment Variables**
   ```bash
   # Add these in Cloudflare Pages → Settings → Environment Variables

   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

   # Database (if using external database)
   DATABASE_URL=file:./data/the-pensive-index.db

   # Next.js
   NODE_ENV=production
   ```

### Database Considerations

For Cloudflare Pages deployment, consider these database options:

1. **SQLite (Current)**
   - Works for development and small-scale production
   - File-based database included in deployment
   - Limited scalability

2. **Cloudflare D1 (Recommended for Production)**
   ```powershell
   # Install Wrangler CLI
   npm install -g wrangler

   # Create D1 database
   wrangler d1 create pensieve-index-db

   # Update wrangler.toml (create if doesn't exist)
   ```

3. **Migration to D1**
   ```toml
   # wrangler.toml
   name = "pensieve-index"
   compatibility_date = "2024-01-15"

   [[d1_databases]]
   binding = "DB"
   database_name = "pensieve-index-db"
   database_id = "your-database-id"
   ```

### Custom Domain Setup

1. **Add Domain to Cloudflare**
   ```bash
   # In Cloudflare Dashboard:
   # Add site → Enter your domain
   # Follow nameserver instructions
   ```

2. **Configure Pages Custom Domain**
   ```bash
   # Pages → your-project → Custom domains
   # Add custom domain → your-domain.com
   # SSL automatically configured
   ```

## 3. CI/CD Pipeline

Create automated deployments using GitHub Actions:

### GitHub Action for Documentation

```yaml
# .github/workflows/deploy-docs.yml
name: Deploy Documentation to GitHub Pages

on:
  push:
    branches: [ main ]
    paths: [ 'docs/**', 'wiki/**' ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build documentation
      run: npm run build:docs

    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./docs
```

### GitHub Action for Cloudflare Pages

Cloudflare Pages automatically deploys when you push to the connected branch, but you can create custom workflows:

```yaml
# .github/workflows/deploy-app.yml
name: Deploy App to Cloudflare Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run tests
      run: npm test

    - name: Type check
      run: npm run type-check

    - name: Build application
      run: npm run build
```

## 4. Production Checklist

### Performance Optimization

- [ ] **Image Optimization**: Use Next.js Image component
- [ ] **Bundle Analysis**: Run `npm run analyze` to check bundle size
- [ ] **Caching**: Configure appropriate cache headers
- [ ] **Database**: Optimize queries and add indexes

### Security Configuration

- [ ] **Environment Variables**: Secure all API keys
- [ ] **CORS**: Configure proper cross-origin settings
- [ ] **CSP**: Content Security Policy headers
- [ ] **Rate Limiting**: Implement API rate limiting

### Monitoring Setup

- [ ] **Analytics**: Configure user analytics
- [ ] **Error Tracking**: Set up error monitoring
- [ ] **Performance**: Monitor Core Web Vitals
- [ ] **Uptime**: Set up uptime monitoring

## 5. Domain Configuration

### Recommended Setup

```bash
# Primary domain: your-domain.com (Cloudflare Pages - Next.js App)
# Documentation: docs.your-domain.com (GitHub Pages - Static docs)
# API: api.your-domain.com (Cloudflare Pages - API routes)
```

### DNS Configuration

```bash
# Cloudflare DNS records
A     your-domain.com       192.0.2.1 (Cloudflare Pages IP)
CNAME docs.your-domain.com  username.github.io
CNAME api.your-domain.com   your-project.pages.dev
```

## 6. Troubleshooting

### Common Issues

1. **Build Failures**
   ```powershell
   # Check Node.js version compatibility
   # Verify all environment variables are set
   # Review build logs for specific errors
   ```

2. **Database Connection Issues**
   ```powershell
   # Verify DATABASE_URL is correctly set
   # Check file permissions for SQLite
   # Consider migrating to Cloudflare D1 for production
   ```

3. **Authentication Problems**
   ```powershell
   # Verify all Clerk environment variables
   # Check domain configuration in Clerk dashboard
   # Ensure redirect URLs match deployment URLs
   ```

### Performance Issues

1. **Slow Page Loads**
   - Enable Cloudflare caching
   - Optimize images and assets
   - Use Next.js Image component
   - Enable compression

2. **Database Performance**
   - Add database indexes
   - Implement query optimization
   - Consider database connection pooling
   - Monitor query performance

## 7. Maintenance

### Regular Tasks

- [ ] **Dependencies**: Update npm packages monthly
- [ ] **Security**: Review and update security configurations
- [ ] **Backups**: Backup database regularly
- [ ] **Monitoring**: Review performance metrics weekly

### Scaling Considerations

- **Database**: Plan migration to Cloudflare D1 or PostgreSQL
- **CDN**: Leverage Cloudflare's global CDN
- **Caching**: Implement Redis for session storage
- **Load Balancing**: Configure multiple deployment regions

## Support Resources

- **Cloudflare Pages**: [developers.cloudflare.com/pages](https://developers.cloudflare.com/pages)
- **GitHub Pages**: [docs.github.com/pages](https://docs.github.com/pages)
- **Next.js Deployment**: [nextjs.org/docs/deployment](https://nextjs.org/docs/deployment)
- **Clerk Documentation**: [clerk.com/docs](https://clerk.com/docs)

---

This deployment strategy provides redundancy, performance, and scalability for The Pensieve Index while maintaining cost-effectiveness through free tier usage of both platforms.