# Cloudflare Deployment Checklist

**Last Updated:** January 10, 2025

## Pre-Deployment

- [ ] **Cloudflare Account Setup**
  - [ ] Create free Cloudflare account
  - [ ] Verify email address
  - [ ] Note account ID from dashboard

- [ ] **GitHub Repository**
  - [ ] Repository: `Life-Experimentalists/the-pensive-index`
  - [ ] Main branch is up to date
  - [ ] All secrets configured (see `GITHUB_SECRETS_SETUP.md`)

- [ ] **Local Testing**
  - [ ] `npm run build:nextjs` succeeds locally
  - [ ] Dev server runs without errors
  - [ ] Database schema is finalized

## Cloudflare Services Setup

- [ ] **D1 Database**
  - [ ] Created via: `wrangler d1 create pensive-index`
  - [ ] Database ID added to `wrangler.toml`
  - [ ] Migrations created in `migrations/` folder
  - [ ] Schema migration applied: `wrangler d1 migrations apply pensive-index --remote`
  - [ ] Seed data loaded: `wrangler d1 execute pensive-index --remote --file=./migrations/0002_seed-data.sql`

- [ ] **KV Namespace**
  - [ ] Created via: `wrangler kv:namespace create CACHE`
  - [ ] Namespace ID added to `wrangler.toml`
  - [ ] Preview namespace created: `wrangler kv:namespace create CACHE --preview`

- [ ] **Cloudflare Pages**
  - [ ] Project created: "the-pensive-index"
  - [ ] Connected to GitHub repository
  - [ ] Build settings configured:
    - Build command: `npm run build:nextjs`
    - Build output: `.next`
    - Root directory: `/`
    - Node version: `18`
  - [ ] Environment variables set (see checklist below)
  - [ ] D1 binding added: `DB` → `pensive-index`
  - [ ] KV binding added: `CACHE` → KV namespace

- [ ] **Cloudflare Worker**
  - [ ] Deployed via: `wrangler deploy`
  - [ ] Routes configured (if using custom domain)
  - [ ] Logs verified: `wrangler tail`

## Environment Variables (Cloudflare Pages)

### Required
- [ ] `NODE_VERSION` = `18`
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = `pk_test_...` or `pk_live_...`
- [ ] `CLERK_SECRET_KEY` = `sk_test_...` or `sk_live_...`
- [ ] `NEXT_PUBLIC_APP_URL` = `https://the-pensive-index.pages.dev`

### Optional
- [ ] `GITHUB_WEBHOOK_SECRET` = `[random string]`
- [ ] `GITHUB_ACCESS_TOKEN` = `ghp_...`
- [ ] `POSTMAN_API_KEY` = `PMAK-...`

## GitHub Secrets

- [ ] `CLOUDFLARE_API_TOKEN` - API token with necessary permissions
- [ ] `CLOUDFLARE_ACCOUNT_ID` - Account ID from dashboard
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- [ ] `CLERK_SECRET_KEY` - Clerk secret key (optional)
- [ ] `NEXT_PUBLIC_APP_URL` - Production URL
- [ ] `GITHUB_WEBHOOK_SECRET` - Webhook verification (optional)
- [ ] `GITHUB_ACCESS_TOKEN` - GitHub PAT for issues (optional)
- [ ] `POSTMAN_API_KEY` - Postman integration (optional)

## GitHub Actions Workflow

- [ ] `.github/workflows/deploy-cloudflare.yml` exists
- [ ] Workflow file has correct project name
- [ ] Workflow triggers on push to `main`
- [ ] Preview deployments trigger on PRs
- [ ] Database migrations run after deployment

## Deployment Process

- [ ] **Initial Deployment**
  - [ ] Push to `main` branch
  - [ ] GitHub Actions workflow triggers
  - [ ] Build completes successfully
  - [ ] Pages deployment succeeds
  - [ ] Worker deployment succeeds
  - [ ] Database migrations run

- [ ] **Verify Deployment**
  - [ ] Homepage loads: `https://the-pensive-index.pages.dev`
  - [ ] API responds: `https://the-pensive-index.pages.dev/api/fandoms`
  - [ ] Admin dashboard accessible (after auth)
  - [ ] Database queries work
  - [ ] Cache is functioning

## Post-Deployment Testing

- [ ] **Functionality Tests**
  - [ ] Homepage displays fandoms
  - [ ] User authentication works (Clerk)
  - [ ] Admin can sign in
  - [ ] Fandom pages load
  - [ ] Tag selection works
  - [ ] Pathway builder functions
  - [ ] Story search returns results

- [ ] **Performance Tests**
  - [ ] Homepage loads < 2 seconds
  - [ ] API responses < 500ms
  - [ ] Database queries < 200ms
  - [ ] Cache hit rate > 60%

- [ ] **Security Tests**
  - [ ] HTTPS enabled
  - [ ] API routes require auth where needed
  - [ ] Admin dashboard requires admin role
  - [ ] SQL injection protection
  - [ ] XSS protection

## Monitoring Setup

- [ ] **Cloudflare Analytics**
  - [ ] Web Analytics enabled
  - [ ] Request volume tracking
  - [ ] Error rate monitoring
  - [ ] Performance metrics

- [ ] **Error Tracking**
  - [ ] Worker logs accessible: `wrangler tail`
  - [ ] Error notifications configured
  - [ ] Health check endpoint created

- [ ] **Uptime Monitoring**
  - [ ] Uptime monitor configured (optional)
  - [ ] Status page created (optional)

## Custom Domain (Optional)

- [ ] **Domain Configuration**
  - [ ] Domain purchased/available
  - [ ] DNS records created:
    - CNAME: `www` → `the-pensive-index.pages.dev`
    - CNAME: `@` → `the-pensive-index.pages.dev` (or use page rule)
  - [ ] SSL certificate provisioned (automatic)
  - [ ] Domain verified in Cloudflare Pages

- [ ] **Update URLs**
  - [ ] `NEXT_PUBLIC_APP_URL` updated to custom domain
  - [ ] Clerk redirect URLs updated
  - [ ] GitHub OAuth URLs updated
  - [ ] Sitemap and robots.txt updated

## Continuous Deployment

- [ ] **Workflow Verification**
  - [ ] Commits to `main` trigger auto-deploy
  - [ ] PRs create preview deployments
  - [ ] Failed builds prevent deployment
  - [ ] Rollback procedure documented

- [ ] **Branch Protection**
  - [ ] Main branch requires PR reviews
  - [ ] Status checks must pass
  - [ ] Successful deployment required

## Documentation

- [ ] **Deployment Docs Updated**
  - [ ] `CLOUDFLARE_DEPLOYMENT.md` reviewed
  - [ ] `GITHUB_SECRETS_SETUP.md` followed
  - [ ] Custom domain setup documented (if applicable)
  - [ ] Troubleshooting guide created

- [ ] **Team Onboarding**
  - [ ] Deployment process documented
  - [ ] Access credentials shared securely
  - [ ] Runbook created for common issues

## Rollback Plan

- [ ] **Rollback Procedure**
  - [ ] Previous deployment can be restored
  - [ ] Database migration rollback tested
  - [ ] Rollback command documented: `wrangler rollback <deployment-id>`

- [ ] **Backup Strategy**
  - [ ] Database backups automated
  - [ ] Environment variables backed up
  - [ ] KV data backed up (if critical)

## Final Verification

- [ ] **Smoke Tests**
  - [ ] All critical paths tested
  - [ ] No console errors in browser
  - [ ] Mobile responsiveness verified
  - [ ] Cross-browser compatibility checked

- [ ] **Performance Baseline**
  - [ ] Initial metrics recorded
  - [ ] Performance budget set
  - [ ] Monitoring alerts configured

- [ ] **Team Notification**
  - [ ] Deployment announced
  - [ ] Known issues documented
  - [ ] Support contacts shared

---

## Quick Reference Commands

```powershell
# Local testing
npm run dev
npm run build:nextjs

# Database management
wrangler d1 migrations create pensive-index <name>
wrangler d1 migrations apply pensive-index --remote
wrangler d1 execute pensive-index --command="SELECT * FROM fandoms"

# KV management
wrangler kv:key list --binding=CACHE
wrangler kv:key get --binding=CACHE <key>
wrangler kv:key put --binding=CACHE <key> <value>

# Worker management
wrangler deploy
wrangler tail
wrangler deployments list

# Pages preview
wrangler pages dev .next --binding DB=pensive-index --binding CACHE=CACHE
```

---

## Success Criteria

✅ All checklist items completed
✅ Application loads successfully
✅ No critical errors in logs
✅ All core features working
✅ Performance meets targets
✅ Security measures in place
✅ Monitoring active
✅ Team has access and knowledge

---

**Deployment Status:** ⏳ Not Started / 🔄 In Progress / ✅ Complete

**Notes:**


**Last Deployed:** _Not yet deployed_

**Deployed By:** _Pending_
