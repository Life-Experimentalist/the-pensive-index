# The Pensive Index - Deployment Structure

## Current Deployment Configuration

This repository is configured for GitHub Pages deployment with the following structure:

### URL Structure
- **`pensive.vkrishna04.me/`** → Next.js Application (Main Website)
- **`pensive.vkrishna04.me/docs/`** → Current Landing Page (from docs/index.html)
- **`pensive.vkrishna04.me/wiki/`** → Redirects to /docs (for compatibility)

### Build Process

1. **Next.js Build**: `next build` generates the main application
2. **Docs Copy**: Custom script copies `docs/` content to `out/docs/`
3. **Domain Config**: CNAME file copied for custom domain support
4. **Compatibility**: `/wiki` route redirects to `/docs`

### GitHub Actions Workflow

The `.github/workflows/nextjs.yml` workflow:
- Builds the Next.js application with static export
- Copies documentation to the proper routes  
- Deploys to GitHub Pages with custom domain

### Local Development

```bash
# Start Next.js development server
npm run dev

# Build for production (includes docs)
npm run build

# Build only Next.js
npm run build:nextjs

# Build only docs structure
npm run build:docs
```

### Future Migration Path

When ready to make Next.js the primary experience:
1. The current `docs/index.html` landing page will remain at `/docs`
2. Next.js app becomes the main website at `/`
3. Users can access both the new app and the original landing page
4. Gradual migration of users to the new interface

This setup provides a seamless transition path while maintaining the current landing page.