# The Pensieve Index - Implementation Roadmap

**Created:** October 10, 2025
**Last Updated:** January 10, 2025
**Status:** Phase D Complete ✅ - Moving to Phase B

## Progress Summary

| Phase                          | Status         | Completion |
| ------------------------------ | -------------- | ---------- |
| **D** - Cloudflare Deployment  | ✅ **COMPLETE** | 100%       |
| **B** - Admin Dashboard Pages  | 🔄 **NEXT**     | 0%         |
| **C** - Linting & TODO Scan    | ⏳ **Pending**  | 0%         |
| **A** - TypeScript Error Fixes | ⏳ **Pending**  | 0%         |
| **Phase 5** - Remove Stubs     | ⏳ **Pending**  | 0%         |
| **Phase 6** - Testing & Docs   | ⏳ **Pending**  | 0%         |

**Execution Order:** D ✅ → **B** (current) → C → A → 5 → 6

## Current State Analysis

### Build Status
- ✅ **Compilation**: Successful (Next.js builds without errors)
- ⚠️ **Type Check**: 216 errors in source files, 880 total (includes tests)
- ⚠️ **Linting**: Not yet run separately
- ✅ **Dev Server**: Running on port 3001

### Files with `@ts-nocheck` (7 files - need cleanup)
1. `app/webhooks/github/route.ts` - Stubbed service methods
2. `src/extension/content-script.ts` - Chrome API types
3. `src/extension/service-worker.ts` - Service worker types
4. `scripts/seed-database.ts` - Drizzle type inference
5. `scripts/seed-pathway-data.ts` - Drizzle type inference
6. `scripts/test-database.ts` - Drizzle select types
7. `src/lib/database/database-helpers.ts` - Schema insert operations

---

## Phase 1: Foundation Fixes (CURRENT)

### 1.1 Type System Cleanup
**Priority:** HIGH
**Estimated Time:** 4-6 hours

**Tasks:**
- [ ] Run ESLint separately: `npm run lint`
- [ ] Fix remaining 216 TypeScript errors in src/app
- [ ] Remove @ts-nocheck from database helpers
- [ ] Add proper slug generation for all inserts
- [ ] Fix Fandom.id type cascading issues (number vs string)
- [ ] Create type-safe utility functions for common operations

**Key Issues:**
- Database schema has `fandoms.id` as INTEGER (number)
- Many components expect `id: string`
- Missing `slug` field in tag/tagClass/plotBlock inserts
- Drizzle ORM type inference issues

### 1.2 UI Theme Consistency
**Priority:** HIGH
**Estimated Time:** 2-3 hours

**Tasks:**
- [ ] Audit app/page.tsx for dark mode issues
- [ ] Fix contrast ratios in both themes
- [ ] Ensure readable text colors
- [ ] Test all interactive elements (buttons, inputs, links)
- [ ] Fix admin dashboard theme issues
- [ ] Standardize Tailwind dark: classes

---

## Phase 2: Admin Dashboard Restructuring

### 2.1 Dashboard Audit
**Priority:** HIGH
**Estimated Time:** 2 hours

**Current Pages:**
```
/admin/
├── analytics/          # Usage metrics, popular fandoms
├── audit-logs/         # System activity tracking
├── fandom-admin/       # Fandom-specific admin (EXISTS but needs review)
├── fandom-assignment/  # Assign fandom admins to fandoms
├── invitations/        # Invite new admins
├── performance/        # System performance metrics
└── (missing pages)
```

**Tasks:**
- [ ] Document purpose of each existing page
- [ ] Identify redundant functionality
- [ ] Design new structure with missing pages

### 2.2 Fandom Management Page
**Priority:** HIGH
**Estimated Time:** 4-6 hours

**Requirements:**
- **Project Admins**: Full CRUD on all fandoms
- **Fandom Admins**: Read-only view of their fandom

**Features:**
- [ ] List all fandoms (table with search/filter)
- [ ] Create new fandom form (name, slug, description, is_active)
- [ ] Edit fandom (inline or modal)
- [ ] Delete fandom (with confirmation, cascade warning)
- [ ] Assign fandom administrators
- [ ] View fandom statistics (tag count, plot block count, stories)

**API Routes:**
- `GET /api/admin/fandoms` - List with pagination
- `POST /api/admin/fandoms` - Create
- `PATCH /api/admin/fandoms/[id]` - Update
- `DELETE /api/admin/fandoms/[id]` - Delete

### 2.3 Tags Management Interface
**Priority:** HIGH
**Estimated Time:** 6-8 hours

**Requirements:**
- **Project Admins**: Manage tags across all fandoms
- **Fandom Admins**: Manage only their assigned fandom's tags

**Features:**
- [ ] Fandom selector dropdown (filtered by role)
- [ ] Tag list table (name, slug, category, tag_class, is_active)
- [ ] Create tag form
- [ ] Bulk operations (activate/deactivate, assign to class)
- [ ] Tag hierarchy visualization (parent_id relationships)
- [ ] Tag metadata editor (JSON field)

**Database Tables:**
```sql
tags:
  - id (text, PK)
  - name (text)
  - slug (text) -- REQUIRED
  - description (text nullable)
  - fandom_id (text, FK to fandoms.id)
  - tag_class_id (text nullable, FK to tag_classes.id)
  - parent_id (text nullable, self-reference)
  - metadata (json)
  - is_active (boolean, default true)
  - category (text nullable)
  - requires (json, string[])
  - enhances (json, string[])
```

**API Routes:**
- `GET /api/admin/tags?fandomId=X` - List tags
- `POST /api/admin/tags` - Create tag
- `PATCH /api/admin/tags/[id]` - Update tag
- `DELETE /api/admin/tags/[id]` - Delete tag
- `POST /api/admin/tags/bulk` - Bulk operations

### 2.4 Tropes (Plot Blocks) Management
**Priority:** HIGH
**Estimated Time:** 8-10 hours

**Conceptual Model:**
```
Trope = Named collection of tag combinations + context

Example: "Earlier Emancipation" (Harry Potter)
├── Combination 1 (OR):
│   ├── Tag: "Year 5 End"
│   ├── Tag: "Sirius Death"
│   ├── Tag: "Helpful Goblins"
│   └── Tag: "Sirius Black Inheritance"
├── Combination 2 (OR):
│   ├── Tag: "Harry 4th Champion"
│   ├── Tag: "Helpful Gringotts"
│   └── Tag: "Helpful Goblins"
└── Context: "Harry gains independence earlier..."
```

**Database Schema:**
```sql
plot_blocks:
  - id (text, PK)
  - name (text)
  - slug (text) -- REQUIRED
  - description (text)
  - fandom_id (text, FK)
  - plot_block_category_id (text nullable)
  - tag_combinations (json) -- Array of tag set arrays
  - context (text)
  - metadata (json)
  - is_active (boolean)
  - parent_id (text nullable)

Example tag_combinations JSON:
[
  {
    "operator": "OR",
    "tags": ["tag-id-1", "tag-id-2", "tag-id-3"],
    "description": "Post-Sirius death route"
  },
  {
    "operator": "OR",
    "tags": ["tag-id-4", "tag-id-5"],
    "description": "Triwizard route"
  }
]
```

**Features:**
- [ ] Trope list table (filterable by fandom)
- [ ] Trope builder UI:
  - [ ] Drag-and-drop tag selector
  - [ ] Multiple combination groups (OR logic)
  - [ ] Within-group logic (AND/OR toggle)
  - [ ] Context text editor
  - [ ] Visual preview of tag tree
- [ ] Trope tree visualization (parent-child relationships)
- [ ] Validation: ensure referenced tags exist
- [ ] Preview: show example pathway using trope

**API Routes:**
- `GET /api/admin/plot-blocks?fandomId=X`
- `POST /api/admin/plot-blocks`
- `PATCH /api/admin/plot-blocks/[id]`
- `DELETE /api/admin/plot-blocks/[id]`
- `GET /api/admin/plot-blocks/[id]/preview` - Generate example pathway

### 2.5 Permissions Enforcement
**Priority:** HIGH
**Estimated Time:** 3-4 hours

**Implementation:**
- [ ] Create middleware: `requireFandomAccess(fandomId, requiredRole)`
- [ ] Update AuthContext to include `fandom_access[]`
- [ ] Add UI conditional rendering based on role
- [ ] Validate fandom ownership in all edit operations
- [ ] Add audit logging for permission denials

**Permission Matrix:**
| Action                   | Project Admin | Fandom Admin      |
| ------------------------ | ------------- | ----------------- |
| View all fandoms         | ✅             | ❌ (only assigned) |
| Create fandom            | ✅             | ❌                 |
| Edit any fandom          | ✅             | ❌                 |
| Edit own fandom          | ✅             | ✅                 |
| Create tags (any fandom) | ✅             | ❌                 |
| Create tags (own fandom) | ✅             | ✅                 |
| Edit plot blocks (any)   | ✅             | ❌                 |
| Edit plot blocks (own)   | ✅             | ✅                 |

---

## Phase 3: Cloudflare Integration

### 3.1 Cloudflare Pages Setup
**Priority:** MEDIUM
**Estimated Time:** 2-3 hours

**Tasks:**
- [ ] Connect GitHub repo to Cloudflare Pages
- [ ] Configure build settings:
  - Build command: `npm run build:nextjs`
  - Build output: `.next`
  - Root directory: `/`
  - Node version: 18+
- [ ] Set environment variables (migrate from .env.local)
- [ ] Configure custom domain (if applicable)
- [ ] Test preview deployments
- [ ] Setup production branch (main)

### 3.2 Cloudflare D1 Migration
**Priority:** MEDIUM
**Estimated Time:** 4-6 hours

**Tasks:**
- [ ] Create D1 database: `wrangler d1 create pensieve-index-db`
- [ ] Update wrangler.toml with D1 binding
- [ ] Migrate schema from SQLite to D1
- [ ] Update database connection logic:
  ```typescript
  // Before: better-sqlite3
  // After: D1 client via platform.env.DB
  ```
- [ ] Test queries locally with Wrangler dev
- [ ] Add migration scripts for D1
- [ ] Seed initial data (fandoms, sample tags)
- [ ] Update all database queries to use D1 syntax

**Key Differences:**
- D1 is SQL-based (like SQLite) but runs on Cloudflare Edge
- Use `env.DB.prepare()` instead of `db.prepare()`
- Async-only (no sync queries)
- Limited to SQL (Drizzle ORM may need adapter)

### 3.3 Cloudflare KV for Caching
**Priority:** MEDIUM
**Estimated Time:** 2-3 hours

**Use Cases:**
- Fandom list cache (TTL: 1 hour)
- Tag metadata cache (TTL: 30 minutes)
- Search result cache (TTL: 5 minutes)
- User session data (TTL: 24 hours)

**Tasks:**
- [ ] Create KV namespace: `wrangler kv:namespace create CACHE`
- [ ] Add KV binding to wrangler.toml
- [ ] Implement cache wrapper service:
  ```typescript
  class KVCache {
    async get<T>(key: string): Promise<T | null>
    async set<T>(key: string, value: T, ttl?: number): Promise<void>
    async invalidate(pattern: string): Promise<void>
  }
  ```
- [ ] Add cache invalidation on data mutations
- [ ] Test cache hit rates with analytics

### 3.4 Cloudflare Workers Analytics
**Priority:** LOW
**Estimated Time:** 1-2 hours

**Tasks:**
- [ ] Enable Analytics in Cloudflare dashboard
- [ ] Add analytics binding to worker.ts
- [ ] Track custom metrics:
  - Pathway builds per day
  - Story searches per fandom
  - Tag usage frequency
  - API response times
- [ ] Create dashboards in Cloudflare UI

### 3.5 Cloudflare Images (Optional)
**Priority:** LOW
**Estimated Time:** 3-4 hours

**Use Cases:**
- Fandom banner images
- User avatars
- Story cover art (if community submits)

**Tasks:**
- [ ] Enable Cloudflare Images
- [ ] Create upload API route
- [ ] Implement image variants (thumbnail, full)
- [ ] Add to fandom edit form
- [ ] Store image IDs in database

---

## Phase 4: Remove Stubs & Complete Implementation

### 4.1 Service Implementation
**Priority:** HIGH
**Estimated Time:** 8-12 hours

**Stubbed Services:**
1. **TemplateService** (src/lib/admin/services/TemplateService.ts)
   - Currently: All methods throw "Not implemented"
   - Decision: Remove entirely or implement?
   - If implement: Define template schema, CRUD operations

2. **Queue Operations** (webhook handler)
   - `createQueueEntry()`
   - `updateQueueEntry()`
   - `getQueueEntryBySubmissionId()`
   - Implement using database queue table

3. **Submission Services**
   - `updateSubmissionStatus()`
   - `getSubmissionById()`
   - `createSubmission()`
   - Connect to `story_submissions` table

4. **Email Notifications**
   - `sendApprovalNotification()`
   - `sendRejectionNotification()`
   - `sendChangesRequestedNotification()`
   - Implement with Cloudflare Email Workers or external service

### 4.2 GitHub Webhook Completion
**Priority:** HIGH
**Estimated Time:** 4-6 hours

**Tasks:**
- [ ] Remove @ts-nocheck from route.ts
- [ ] Implement all service method calls
- [ ] Add proper error handling
- [ ] Test with GitHub webhook simulator
- [ ] Validate signature verification
- [ ] Handle all event types (labeled, unlabeled, closed, etc.)

### 4.3 Codebase TODO Scan
**Priority:** MEDIUM
**Estimated Time:** 2-4 hours

**Tasks:**
- [ ] Run grep for TODO/FIXME/HACK/XXX comments
- [ ] For each TODO:
  - If simple (< 30 min): Implement immediately
  - If complex: Create detailed in-place TODO with context
- [ ] Document all deferred TODOs in TODOS.md
- [ ] Prioritize and schedule

**Command:**
```powershell
Select-String -Path (Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.jsx) `
  -Pattern "(TODO|FIXME|HACK|XXX):" |
  Select-Object Filename,LineNumber,Line
```

---

## Phase 5: Testing & Quality

### 5.1 End-to-End User Flow
**Priority:** HIGH
**Estimated Time:** 4-6 hours

**Test Scenarios:**
1. User Journey:
   - [ ] Landing page → Sign up
   - [ ] Select fandom
   - [ ] Build pathway with drag-and-drop
   - [ ] Search for matching stories
   - [ ] View story results
   - [ ] Submit new story (if no match)

2. Admin Journey:
   - [ ] Login as project admin
   - [ ] Create new fandom
   - [ ] Add tags to fandom
   - [ ] Create plot block (trope)
   - [ ] Review submitted story
   - [ ] Approve/reject submission

### 5.2 Performance Testing
**Priority:** MEDIUM
**Estimated Time:** 2-3 hours

**Metrics:**
- [ ] Pathway search response time (target: < 500ms)
- [ ] Fandom list load (target: < 200ms)
- [ ] Tag autocomplete (target: < 100ms)
- [ ] Database query optimization
- [ ] API route benchmarks

### 5.3 Security Audit
**Priority:** HIGH
**Estimated Time:** 3-4 hours

**Checks:**
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (React escaping + CSP headers)
- [ ] CSRF protection (Next.js built-in)
- [ ] Rate limiting on API routes
- [ ] Permission enforcement on all mutations
- [ ] Secure webhook signature validation
- [ ] Environment variable security

---

## Phase 6: Documentation

### 6.1 Developer Documentation
**Tasks:**
- [ ] Update README with current architecture
- [ ] Document tag/trope system design
- [ ] API route documentation
- [ ] Database schema documentation
- [ ] Cloudflare setup guide
- [ ] Local development guide

### 6.2 Admin Manual
**Tasks:**
- [ ] How to create fandoms
- [ ] How to manage tags
- [ ] How to build tropes
- [ ] How to moderate submissions
- [ ] Permission model explanation
- [ ] Troubleshooting guide

### 6.3 User Guide
**Tasks:**
- [ ] How to build pathways
- [ ] Understanding tropes
- [ ] Submitting stories
- [ ] Browsing fandoms

---

## Immediate Next Steps (Next 2 Hours)

1. **Fix Type Errors** ✅ (In Progress)
   - Target: Reduce from 216 to < 50
   - Focus on database query files
   - Remove unnecessary @ts-nocheck

2. **Theme Fixes**
   - Homepage dark mode audit
   - Admin dashboard theme consistency

3. **Admin Dashboard Audit**
   - Document existing pages
   - Plan fandom/tags/tropes structure

---

## Success Metrics

### Technical
- [ ] 0 TypeScript errors
- [ ] 0 ESLint errors
- [ ] All tests passing
- [ ] Build time < 60s
- [ ] Type check time < 30s

### Functional
- [ ] All user flows tested
- [ ] All admin flows tested
- [ ] Database migrations working
- [ ] Cloudflare deployment successful
- [ ] No stubbed implementations

### Quality
- [ ] Documentation complete
- [ ] Code coverage > 70%
- [ ] Performance targets met
- [ ] Security audit passed
- [ ] Accessibility (WCAG AA) compliance

---

## Timeline Estimate

| Phase     | Duration       | Dependencies         |
| --------- | -------------- | -------------------- |
| Phase 1   | 1-2 days       | None                 |
| Phase 2   | 3-4 days       | Phase 1 complete     |
| Phase 3   | 2-3 days       | Can parallel Phase 2 |
| Phase 4   | 2-3 days       | Phase 2 complete     |
| Phase 5   | 2-3 days       | All phases           |
| Phase 6   | 1-2 days       | Phase 5 complete     |
| **Total** | **11-17 days** |                      |

---

*Last Updated: October 10, 2025*
