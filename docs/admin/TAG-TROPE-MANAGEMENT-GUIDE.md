# Tag & Trope Management Guide

## Overview

The Pensieve Index has a comprehensive tag and trope (plot blocks) management system. Here's where everything is located and how it works.

---

## 🎯 Admin Pages for Tag/Trope Management

### 1. **Tag Classes Management**
📍 Location: `/admin/tag-classes`
📄 File: `app/admin/tag-classes/page.tsx`

**Features:**
- View all tag classes by fandom
- Create new tag classes
- Edit existing tag classes
- Delete tag classes (ProjectAdmin only)
- Configure validation rules
- Manage tag hierarchies

**Current Status:** ✅ UI Built (Mock Data) - Needs API Integration

```tsx
// Example: Creating a tag class
{
  name: 'harry-shipping',
  description: 'Romantic pairings involving Harry Potter',
  fandom: 'Harry Potter',
  mutuallyExclusive: true,
  maxSelections: 1,
  validationRules: [...]
}
```

---

### 2. **Fandom Admin Dashboard**
📍 Location: `/admin/fandom-admin`
📄 File: `app/admin/fandom-admin/page.tsx`

**Features:**
- Quick access to tag management
- Plot blocks management
- Validation rules
- Story submissions review

**Current Status:** ⚠️ UI Shell Only - No Functionality Yet

**Action Cards:**
- "Manage Tags" - Add or edit fandom tags
- "Plot Blocks" - Manage plot block library
- "Validation Rules" - Configure tag validation
- "Review Stories" - Moderate submissions

---

## 🔌 API Endpoints

### Tag Classes API

#### **List Tag Classes**
```
GET /api/admin/tag-classes?fandomId={id}
```
📄 File: `app/api/admin/tag-classes/route.ts`
- Lists all tag classes for a fandom
- Supports fandom scoping for FandomAdmin
- Returns paginated results

#### **Create Tag Class**
```
POST /api/admin/tag-classes
```
Request Body:
```json
{
  "name": "character-focus",
  "description": "Main character focus tags",
  "fandomId": "harry-potter",
  "isActive": true
}
```

#### **Get Specific Tag Class**
```
GET /api/admin/tag-classes/[id]
```
📄 File: `app/api/admin/tag-classes/[id]/route.ts`

#### **Update Tag Class**
```
PUT /api/admin/tag-classes/[id]
```

#### **Delete Tag Class**
```
DELETE /api/admin/tag-classes/[id]
```

---

### Tags API (V1)

#### **List Tags**
```
GET /api/v1/tags?fandom_id={id}&search={query}
```
📄 File: `app/api/v1/tags/route.ts`

#### **Create Tag**
```
POST /api/v1/tags
```
Request Body:
```json
{
  "fandom_id": 1,
  "name": "Time Travel",
  "description": "Stories involving time travel",
  "category": "plot-device",
  "tag_class_id": "uuid"
}
```

#### **Update Tag**
```
PUT /api/v1/tags/[id]
```

#### **Delete Tag** (Soft Delete)
```
DELETE /api/v1/tags/[id]
```

---

### Fandom-Scoped Tags

#### **Get Tags for Fandom**
```
GET /api/fandoms/[fandomSlug]/tags
```
📄 File: `app/api/fandoms/[fandom]/tags/route.ts`
- Returns all active tags for a specific fandom
- Used in pathway builder interface

#### **Get Tropes for Fandom**
```
GET /api/fandoms/[fandomSlug]/tropes
```
📄 File: `app/api/fandoms/[fandom]/tropes/route.ts`
- Returns all plot blocks (tropes) for a specific fandom

---

## 📚 Database Models

### Tag Model
📄 File: `src/lib/database/models/tag.ts`

**Methods:**
```typescript
class TagModel {
  // Read operations
  static async getByFandom(fandomId: string): Promise<Tag[]>
  static async getByCategory(fandomId: string, category: string): Promise<Tag[]>
  static async getById(id: string): Promise<Tag | null>
  static async search(filters: TagSearchFilters): Promise<Tag[]>

  // Write operations
  static async create(data: CreateTagData): Promise<Tag>
  static async update(id: string, data: UpdateTagData): Promise<Tag | null>
  static async softDelete(id: string): Promise<boolean>
}
```

---

### AdminQueries - Tag Classes
📄 File: `src/lib/database/admin-queries.ts`

**Methods:**
```typescript
class AdminQueries {
  tagClasses = {
    // List with pagination and fandom filtering
    list: async (filters: FilterOptions): Promise<PaginatedResult<TagClass>>

    // Find by ID
    findById: async (id: string): Promise<TagClass | null>

    // Create tag class
    create: async (data: Omit<TagClass, 'id' | 'created_at' | 'updated_at'>): Promise<TagClass>

    // Update tag class
    update: async (id: string, updates: Partial<TagClass>): Promise<TagClass | null>

    // Soft delete
    deactivate: async (id: string): Promise<boolean>
  }
}
```

---

## 🎨 UI Components

### Tag Management Components

**No dedicated tag management UI components yet.** Current pages use:
- Mock data (`mockTagClasses` in tag-classes/page.tsx)
- Basic CRUD buttons (View, Edit, Delete)
- Search/filter interface

**Needed Components:**
1. `TagEditor` - Form for creating/editing tags
2. `TagClassEditor` - Form for tag classes with validation rules
3. `TagList` - List view with actions
4. `ValidationRuleBuilder` - Visual rule configurator

---

## 🔐 User Integration with Clerk

### Current Setup

**Authentication:** ✅ Clerk is handling all authentication
- Sign in/sign up flows
- User sessions
- Protected routes

**Admin Users:** ⚠️ Dual System (Needs Consolidation)

#### Current State:
```
┌─────────────────────────────────────────────────┐
│  Clerk Users (Authentication)                   │
│  - userId (Clerk ID)                            │
│  - Email, Name                                  │
│  - publicMetadata.role (string)                 │
└──────────────┬──────────────────────────────────┘
               │
               │ Synced via webhook?
               ▼
┌─────────────────────────────────────────────────┐
│  admin_users table (Database)                   │
│  - id (Clerk ID)                                │
│  - email, name                                  │
│  - role (ProjectAdmin | FandomAdmin)            │
│  - fandom_access (array)                        │
│  - permissions (array)                          │
└─────────────────────────────────────────────────┘
```

### ✅ Recommended Approach: Use Clerk as Primary

**Option 1: Clerk + Metadata (Simpler)**
```typescript
// Store everything in Clerk
user.publicMetadata = {
  role: 'ProjectAdmin' | 'FandomAdmin',
  fandomAccess: ['harry-potter', 'percy-jackson'],
  permissions: ['tag:create', 'tag:edit', 'story:moderate']
}

// No need for admin_users table
// Query Clerk API for admin list
```

**Option 2: Clerk + Database Sync (Current - Needs Webhook)**
```typescript
// Keep admin_users table for:
// - Fast local queries
// - Audit logs
// - Permission caching

// Sync via Clerk webhook:
// POST /api/webhooks/clerk
// Events: user.created, user.updated, user.deleted
```

---

## 🚀 Implementation Status

### ✅ Completed
- [x] Database schema for tags and tag classes
- [x] Tag Model with CRUD operations
- [x] AdminQueries for tag classes
- [x] API endpoints for tag classes (GET, POST, PUT, DELETE)
- [x] API endpoints for tags (V1)
- [x] Tag Classes management page UI
- [x] Fandom-scoped tag/trope endpoints
- [x] Clerk authentication integration

### ⚠️ In Progress / Needs Work
- [ ] Connect Tag Classes UI to real API (currently mock data)
- [ ] Build dedicated Tag Editor component
- [ ] Build Plot Block (Trope) management UI
- [ ] Implement Clerk webhook for user sync
- [ ] Consolidate user management (Clerk vs admin_users table)
- [ ] Add bulk tag operations
- [ ] Tag import/export functionality

### ❌ Not Started
- [ ] Visual validation rule builder
- [ ] Tag relationship graph view
- [ ] Tag usage analytics
- [ ] Tag synonym management
- [ ] Automated tag suggestions

---

## 📋 Quick Start Guide

### Adding a New Tag (Manual - No UI Yet)

**Via API:**
```bash
# 1. Create tag via API
POST /api/v1/tags
{
  "fandom_id": 1,
  "name": "Dimension Travel",
  "description": "Travel between dimensions/universes",
  "category": "plot-device"
}

# 2. Tag will be available in pathway builder immediately
GET /api/fandoms/harry-potter/tags
# Returns: [..., "Dimension Travel"]
```

**Via Database:**
```javascript
// scripts/add-tag.js
const TagModel = require('@/lib/database/models/tag');

await TagModel.create({
  fandomId: '1',
  name: 'Dimension Travel',
  description: 'Travel between dimensions',
  category: 'plot-device',
  isActive: true
});
```

---

### Adding a Tag Class

**Via API:**
```bash
POST /api/admin/tag-classes
{
  "name": "time-mechanics",
  "description": "How time travel works in the story",
  "fandomId": "harry-potter",
  "isActive": true
}
```

---

## 🔧 Next Steps for Full Integration

### Priority 1: Connect Existing UI to API
1. Replace mock data in `tag-classes/page.tsx` with real API calls
2. Implement create/edit/delete functionality
3. Add error handling and loading states

### Priority 2: Build Tag Management UI
1. Create `/admin/tags` page
2. Build TagEditor component
3. Add bulk operations (import, export, batch edit)

### Priority 3: Consolidate User Management
1. Choose: Clerk-only or Clerk + Database sync
2. If sync: Implement Clerk webhook
3. Update admin dashboard to show Clerk users
4. Remove hardcoded admin user count (currently shows 1)

### Priority 4: Plot Blocks (Tropes)
1. Create PlotBlockModel (similar to TagModel)
2. Build `/admin/plot-blocks` management page
3. Implement tree structure for hierarchical tropes

---

## 📁 File Reference

### Admin Pages
- `app/admin/tag-classes/page.tsx` - Tag class management UI
- `app/admin/fandom-admin/page.tsx` - Fandom admin dashboard
- `app/admin/page.tsx` - Main admin dashboard

### API Routes
- `app/api/admin/tag-classes/route.ts` - Tag classes list & create
- `app/api/admin/tag-classes/[id]/route.ts` - Tag class get/update/delete
- `app/api/v1/tags/route.ts` - Tags list & create
- `app/api/v1/tags/[id]/route.ts` - Tag get/update/delete
- `app/api/fandoms/[fandom]/tags/route.ts` - Fandom tags endpoint
- `app/api/fandoms/[fandom]/tropes/route.ts` - Fandom tropes endpoint

### Models & Queries
- `src/lib/database/models/tag.ts` - Tag model with CRUD
- `src/lib/database/admin-queries.ts` - Admin-specific queries
- `src/lib/database/schema.ts` - Database schema definitions

### Types
- `src/types/admin.ts` - Admin types (TagClass, ValidationRule, etc.)
- `src/lib/database/schema.ts` - Drizzle ORM types

---

## 💡 Tips

1. **For Tag/Trope Management:** Use `/admin/tag-classes` page (exists) or build new `/admin/tags` page
2. **For User Management:** Currently showing 1 admin from `admin_users` table - needs Clerk integration
3. **For API Testing:** Use `/api/v1/tags` endpoints - they're working and tested
4. **For Quick Tag Addition:** Use fandom-specific API endpoints that are already working

---

## 🆘 Common Issues

**Issue:** Admin dashboard shows 0 users
**Solution:** ✅ Fixed! Now queries admin_users table correctly (shows 1 admin)

**Issue:** Tags not showing in pathway builder
**Solution:** Check `/api/fandoms/[fandom]/tags` endpoint - it's working for Harry Potter

**Issue:** Can't create tags from UI
**Solution:** Build tag editor component, connect to POST /api/v1/tags endpoint

**Issue:** User count should include all Clerk users, not just admins
**Solution:** Query Clerk API or sync users to database via webhook

---

## 📞 Contact

For questions about tag management implementation, check:
- API documentation: `wiki/api.md`
- Database models: `src/lib/database/models/`
- Test files: `tests/admin/api/tag-classes.test.ts`
