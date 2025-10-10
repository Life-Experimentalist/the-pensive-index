# Admin Dashboard Structure Audit

**Date:** October 10, 2025
**Status:** In Review

## Current Pages Inventory

### ✅ User Management
| Path                     | Purpose                | Keep? | Notes                     |
| ------------------------ | ---------------------- | ----- | ------------------------- |
| `/admin/users`           | Manage all users       | YES   | Core functionality        |
| `/admin/invitations`     | Send admin invitations | YES   | User onboarding           |
| `/admin/role-assignment` | Assign roles to users  | MAYBE | May merge with users page |

### ✅ Fandom Management
| Path                       | Purpose                       | Keep? | Notes                 |
| -------------------------- | ----------------------------- | ----- | --------------------- |
| `/admin/fandom-admin`      | Fandom-specific admin panel   | YES   | Per-fandom management |
| `/admin/fandom-assignment` | Assign admins to fandoms      | YES   | Permission management |
| `/admin/project-admin`     | Project-level admin functions | YES   | Global settings       |

### ✅ Content Management
| Path                      | Purpose                  | Keep? | Notes                             |
| ------------------------- | ------------------------ | ----- | --------------------------------- |
| `/admin/tag-classes`      | Manage tag classes       | YES   | Tag organization                  |
| `/admin/validation-rules` | Story validation rules   | YES   | Quality control                   |
| `/admin/rule-templates`   | Reusable rule templates  | MAYBE | Could merge with validation-rules |
| `/admin/submissions`      | Review story submissions | YES   | Core moderation                   |

### ✅ System Management
| Path                 | Purpose                    | Keep? | Notes                 |
| -------------------- | -------------------------- | ----- | --------------------- |
| `/admin/analytics`   | Usage metrics & insights   | YES   | Data-driven decisions |
| `/admin/audit-logs`  | System activity tracking   | YES   | Security & compliance |
| `/admin/performance` | System performance metrics | YES   | Monitoring            |

### ⚠️ Utility/Testing
| Path                     | Purpose                  | Keep? | Notes                |
| ------------------------ | ------------------------ | ----- | -------------------- |
| `/admin/testing-sandbox` | Development testing area | NO    | Remove in production |
| `/admin/unauthorized`    | Permission denied page   | YES   | Error handling       |

---

## Missing Critical Pages

### HIGH PRIORITY

#### 1. Fandoms Management (`/admin/fandoms`)
**Why:** No dedicated page to CRUD fandoms
**Features Needed:**
- List all fandoms with search/filter
- Create new fandom
- Edit fandom (name, slug, description, is_active)
- Delete fandom (with cascade warning)
- View stats (tags, plot blocks, stories per fandom)

#### 2. Tags Management (`/admin/tags`)
**Why:** Tags are managed via tag-classes only
**Features Needed:**
- List all tags (filterable by fandom)
- Create tags
- Bulk operations (activate/deactivate, assign to class)
- Tag hierarchy viewer
- Edit tag metadata

#### 3. Plot Blocks Management (`/admin/plot-blocks` or `/admin/tropes`)
**Why:** Missing UI for plot block/trope creation
**Features Needed:**
- List plot blocks by fandom
- Create plot block with tag combinations
- Visual tag combination builder
- Edit/delete plot blocks
- Preview pathway with plot block

### MEDIUM PRIORITY

#### 4. GitHub Integration Settings (`/admin/github`)
**Features:**
- Configure webhook URL
- Test webhook connection
- View recent webhook events
- Manage GitHub labels for moderation

#### 5. Email Templates (`/admin/email-templates`)
**Features:**
- Edit notification email templates
- Preview emails
- Test email sending

---

## Proposed Reorganization

### Navigation Structure

```
📊 Dashboard (current /admin/page.tsx)
├── Overview stats
└── Quick actions

👥 Users & Permissions
├── Users (/admin/users)
├── Invitations (/admin/invitations)
└── Audit Logs (/admin/audit-logs)

🌍 Content Management
├── Fandoms (/admin/fandoms) ← NEW
├── Tags (/admin/tags) ← NEW
├── Plot Blocks (/admin/plot-blocks) ← NEW
├── Tag Classes (/admin/tag-classes)
└── Validation Rules (/admin/validation-rules)

📝 Moderation
├── Submissions (/admin/submissions)
└── Reported Content (/admin/reports) ← FUTURE

🔧 Configuration
├── Project Settings (/admin/project-admin)
├── Fandom Assignment (/admin/fandom-assignment)
└── GitHub Integration (/admin/github) ← NEW

📈 Analytics & Monitoring
├── Analytics (/admin/analytics)
└── Performance (/admin/performance)
```

---

## Permission Matrix by Page

| Page                  | Project Admin | Fandom Admin | Notes                                     |
| --------------------- | ------------- | ------------ | ----------------------------------------- |
| **Dashboard**         | ✅ Full        | ✅ Limited    | Fandom admins see their fandom stats only |
| **Users**             | ✅ Full        | ❌ None       | Only project admins manage users          |
| **Invitations**       | ✅ Full        | ❌ None       | Only project admins invite                |
| **Audit Logs**        | ✅ All logs    | ✅ Own fandom | Filtered by permission                    |
| **Fandoms**           | ✅ CRUD all    | ✅ View own   | Fandom admins can view, not edit          |
| **Tags**              | ✅ All fandoms | ✅ Own fandom | Scoped by fandom_access                   |
| **Plot Blocks**       | ✅ All fandoms | ✅ Own fandom | Scoped by fandom_access                   |
| **Tag Classes**       | ✅ All fandoms | ✅ Own fandom | Scoped by fandom_access                   |
| **Validation Rules**  | ✅ All fandoms | ✅ Own fandom | Scoped by fandom_access                   |
| **Submissions**       | ✅ All fandoms | ✅ Own fandom | Moderation scoped                         |
| **Project Settings**  | ✅ Full        | ❌ None       | Global settings only                      |
| **Fandom Assignment** | ✅ Full        | ❌ None       | Assign admins to fandoms                  |
| **Analytics**         | ✅ All data    | ✅ Own fandom | Scoped analytics                          |
| **Performance**       | ✅ Full        | ❌ None       | System metrics                            |

---

## Current Page Details

### `/admin/users`
**Purpose:** Manage all platform users
**Features:**
- List users with pagination
- Search by email/name
- Filter by role (User, FandomAdmin, ProjectAdmin)
- Edit user roles
- Activate/deactivate accounts

**Database Tables:**
- `users` (id, email, name, role, is_active, is_verified)
- `fandom_admin_assignments` (admin_id, fandom_id)

### `/admin/invitations`
**Purpose:** Invite new administrators
**Features:**
- Send invitation emails
- Set role (FandomAdmin, ProjectAdmin)
- Assign fandom (for FandomAdmin)
- Track invitation status (pending, accepted, expired)
- Resend invitations

**Database Tables:**
- `admin_invitations` (id, email, role, fandom_id, status, expires_at)

### `/admin/role-assignment`
**Purpose:** Change user roles
**Features:**
- Assign role to existing user
- Update from User → FandomAdmin → ProjectAdmin
- Remove admin privileges
- View role history

**Justification:** ⚠️ **REDUNDANT** - Can be merged into `/admin/users`

### `/admin/fandom-admin`
**Purpose:** Fandom-specific administration
**Features:**
- View assigned fandoms
- Manage tags for assigned fandoms
- View fandom statistics
- Moderate fandom submissions

**Justification:** ✅ **KEEP** - Essential for fandom admins

### `/admin/fandom-assignment`
**Purpose:** Assign FandomAdmins to specific fandoms
**Features:**
- Select user (must have FandomAdmin role)
- Select fandom
- Add/remove assignments
- View all assignments

**Justification:** ✅ **KEEP** - Permission management

### `/admin/project-admin`
**Purpose:** Global project settings
**Features:**
- Site-wide configuration
- Feature flags
- Email settings
- API keys management

**Justification:** ✅ **KEEP** - System configuration

### `/admin/tag-classes`
**Purpose:** Manage tag classification system
**Features:**
- Create tag classes (e.g., "Shipping", "AU Type", "Character Focus")
- Define validation rules for each class
- Set mutual exclusivity rules
- Define required context

**Database Tables:**
- `tag_classes` (id, name, slug, fandom_id, validation_rules)

**Justification:** ✅ **KEEP** - Tag organization system

### `/admin/validation-rules`
**Purpose:** Define story submission validation
**Features:**
- Create custom validation rules
- Set required fields
- Define tag count limits (min/max)
- Character count limits
- Rating requirements

**Justification:** ✅ **KEEP** - Quality control

### `/admin/rule-templates`
**Purpose:** Pre-defined validation rule sets
**Features:**
- Save common rule combinations
- Apply template to fandoms
- Share templates across fandoms

**Justification:** ⚠️ **MAYBE MERGE** - Could be part of validation-rules

### `/admin/submissions`
**Purpose:** Moderate community story submissions
**Features:**
- View submission queue
- Approve/reject submissions
- Request changes
- Add to database
- Send notifications

**Justification:** ✅ **CRITICAL** - Core moderation workflow

### `/admin/analytics`
**Purpose:** Platform usage insights
**Features:**
- Most popular fandoms
- Tag usage frequency
- User growth metrics
- Story submission trends
- Search query analytics

**Justification:** ✅ **KEEP** - Data-driven decisions

### `/admin/audit-logs`
**Purpose:** Track all admin actions
**Features:**
- Log viewer with filters
- Search by user/action/date
- Export logs
- Security monitoring

**Justification:** ✅ **CRITICAL** - Compliance & security

### `/admin/performance`
**Purpose:** System performance monitoring
**Features:**
- API response times
- Database query performance
- Error rates
- Resource usage
- Uptime metrics

**Justification:** ✅ **KEEP** - System health

### `/admin/testing-sandbox`
**Purpose:** Development testing environment
**Features:**
- Test UI components
- Try API endpoints
- Database query testing

**Justification:** ❌ **REMOVE IN PRODUCTION** - Dev tool only

### `/admin/unauthorized`
**Purpose:** Permission denied error page
**Features:**
- User-friendly error message
- Link back to authorized sections
- Contact admin option

**Justification:** ✅ **KEEP** - Error handling

---

## Recommended Actions

### Immediate (This Sprint)

1. ✅ **Keep all existing pages** (except testing-sandbox)
2. 🆕 **Add missing pages:**
   - `/admin/fandoms` - CRUD for fandoms
   - `/admin/tags` - Comprehensive tag management
   - `/admin/plot-blocks` - Trope/plot block builder

3. 🔄 **Merge/Simplify:**
   - Consider merging `role-assignment` into `users` page
   - Consider merging `rule-templates` into `validation-rules`

### Future Enhancements

- `/admin/reports` - Community reports moderation
- `/admin/github` - Webhook configuration
- `/admin/email-templates` - Customize notifications
- `/admin/api-docs` - Internal API documentation

---

## Navigation Layout Recommendation

### Sidebar Menu (Grouped)

```tsx
{
  "Dashboard": { icon: "📊", path: "/admin" },

  "Content": {
    icon: "📝",
    items: [
      { label: "Fandoms", path: "/admin/fandoms" }, // NEW
      { label: "Tags", path: "/admin/tags" }, // NEW
      { label: "Plot Blocks", path: "/admin/plot-blocks" }, // NEW
      { label: "Tag Classes", path: "/admin/tag-classes" },
      { label: "Validation Rules", path: "/admin/validation-rules" }
    ]
  },

  "Moderation": {
    icon: "✅",
    items: [
      { label: "Submissions", path: "/admin/submissions" },
      { label: "Fandom Admin", path: "/admin/fandom-admin" }
    ]
  },

  "Users": {
    icon: "👥",
    items: [
      { label: "All Users", path: "/admin/users" },
      { label: "Invitations", path: "/admin/invitations" },
      { label: "Fandom Assignment", path: "/admin/fandom-assignment" }
    ]
  },

  "System": {
    icon: "⚙️",
    items: [
      { label: "Project Settings", path: "/admin/project-admin" },
      { label: "Analytics", path: "/admin/analytics" },
      { label: "Performance", path: "/admin/performance" },
      { label: "Audit Logs", path: "/admin/audit-logs" }
    ]
  }
}
```

---

*Last Updated: October 10, 2025*
