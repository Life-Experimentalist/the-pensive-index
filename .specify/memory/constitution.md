# The Pensieve Index Constitution

> **Version 2.0.0** | Ratified: 2025-09-17 | Last Amended: 2025-10-12
>
> *Discovery-focused fanfiction search platform with intelligent prompt generation*

---

## 📋 Meta-Principles (Process Guidelines)

### A. File Management
- **No temporary files in project root** → Use `.specify/temp/` for transient documentation
- **No ad-hoc markdown reports** → All documentation belongs in `docs/`, `wiki/`, or `.specify/`
- **Constitution is singular** → Always update this file; never create duplicates

### B. Development Server Protocol
- **Never auto-start `npm run dev`** → Server lifecycle managed manually by developer
- **Rationale**: Prevents command interference and unintended server terminations
- **Action**: Inform user when dev server is required; await their confirmation

### C. TypeScript & Code Quality
- **Strict mode mandatory** → No `any` types; explicit return types preferred
- **Path aliases required** → Use `@/components/*`, `@/lib/*`, `@/types/*` (see `tsconfig.json`)
- **ESLint enforcement** → Unused variables are errors; TypeScript-specific rules enabled

---

## 🎯 Core Architecture Principles

### I. Discovery-Focused Search
> **Search existing stories first, generate creative prompts second**

The platform's core principle: **help readers find existing stories, then inspire writers to create new ones**.

**Primary Function - Story Search** (70% of value):
- Search existing tagged stories in database with intelligent relevance scoring
- Advanced filtering by tags, tropes, word count, status, rating
- Dual display: Show matching stories **AND** creative prompts side-by-side

**Secondary Function - Prompt Generation** (30% of value):
- Generate detailed story prompts when few matching stories exist
- Highlight "novelty aspects" - unique pathway combinations not well-represented in database
- Suggest additional elements to make new stories stand out

**Implementation Requirements**:
- All pathways must be searchable against the story catalog
- Story search must complete in <500ms for filtered queries
- Prompt generation must identify gaps and suggest creative additions

### II. Hierarchical Data Integrity
> **Complex data relationships must be maintainable, scalable, and fandom-scoped**

**Data Hierarchy**:
```
Fandom (Harry Potter, Percy Jackson)
├── Tags (simple labels: angst, fluff, time-travel, harry/hermione)
│   └── Tag Classes (validation logic: harry-shipping, hermione-shipping)
└── Tropes (structured narrative devices)
    ├── Conditional Branching (Goblin Inheritance → Black Lordship → After Sirius Death)
    └── Tree Dependencies (Multiple House Control → Hogwarts Control)
```

**Requirements**:
- Fandoms strictly namespace Tags and Tropes (no cross-contamination)
- Tropes support tree structures with conditional branching
- Tag Classes enable cross-referential validation (e.g., shipping conflicts)
- Admin roles respect fandom boundaries (`FandomAdmin` vs `ProjectAdmin`)
- All IDs use format: `{fandomSlug}:{entityType}:{slug}` (e.g., `hp:tag:time-travel`)

### III. Test-Driven Development (TDD)
> **TDD is mandatory for validation logic and user interactions (non-negotiable)**

**Workflow**:
1. **Write Tests**: Define behavior with comprehensive test cases
2. **User Approval**: Stakeholder validates test scenarios before implementation
3. **Red Phase**: Run tests (expect failures)
4. **Green Phase**: Implement minimal code to pass tests
5. **Refactor**: Optimize while maintaining test coverage

**Requirements**:
- Validation engine: 100% test coverage with complex rule combinations
- Drag-and-drop interactions: Integration tests with `@testing-library/react`
- E2E tests: Critical user journeys with Playwright
- Performance tests: Validation <200ms, search <500ms

**Tools**:
- **Unit/Integration**: Vitest + React Testing Library
- **E2E**: Playwright for browser automation
- **Coverage**: `npm run test:coverage` must pass >80% threshold

### IV. Responsive Interaction Design
> **User experience must be optimized for both desktop and mobile (60fps minimum)**

**Desktop Experience**:
- Three-panel interface: Selection (left) → Pathway Builder (center) → Output (right)
- Full drag-and-drop with `@dnd-kit/core` (v6.3+)
- Visual feedback: hover states, drop zones, reorder animations
- Keyboard navigation: Tab, Enter, Arrow keys for accessibility

**Mobile Experience**:
- Tap-to-select with collapsible panels
- Touch-friendly hit targets (min 44x44px)
- Swipe gestures for panel navigation
- Bottom-sheet UI patterns for pathway editing

**Validation UX**:
- **No real-time blocking**: Users can build impossible combinations during selection
- **Validation on "Finish"**: Conflicts displayed in modal with suggested fixes
- **Graceful degradation**: Warnings don't block submission; errors do

**Performance Requirements**:
- Drag interactions: 60fps on modern devices
- Pathway validation: <200ms for complex rule sets
- Panel transitions: <300ms with smooth easing

### V. Community-Driven Growth
> **Platform scalability through decentralized content management and curation**

**Story Submission Workflow**:
```
User Action → Browser Extension (AO3/FFN) → GitHub Issue Template
  → Admin Review → Manual Database Entry via Admin Console
```

**Key Points**:
- Extension **auto-fills** story metadata (title, author, URL, summary)
- Extension **suggests** pathway tags (requires human verification)
- No auto-generation: All tags verified by FandomAdmin before database entry
- GitHub Issues serve as submission queue with community voting/discussion

**Content Curation Roles**:
- **ProjectAdmin**: Cross-fandom system configuration, user management
- **FandomAdmin**: Fandom-specific Tags, Tropes, validation rules
- **Contributor**: Story submission suggestions (no direct write access)

**Growth Strategy**:
- Admin-driven Tag/Trope expansion based on community requests
- Quarterly review of top GitHub Issues for new tropes
- System suggests "Create New Story" prompts for pathway gaps
- Novelty aspects highlighted in prompts to encourage unique content

---

## 🛠️ Technical Standards

### Platform Stack (Current - v0.8.0)
```yaml
Frontend:
  - Next.js: 15.5.3 (App Router)
  - React: 18.2.0
  - TypeScript: 5.3.0
  - Tailwind CSS: 4.1.13
  - dnd-kit: 6.3.1 (drag-and-drop)

Backend:
  - NextAuth.js: (via @clerk/nextjs 6.32.0)
  - Drizzle ORM: 0.44.5
  - better-sqlite3: 12.2.0

Database:
  - Primary: SQLite (local dev via better-sqlite3)
  - Production: Cloudflare D1 (SQLite on edge)
  - Cache: Cloudflare KV (future)

Testing:
  - Unit/Integration: Vitest 3.2.4
  - E2E: Playwright 1.40.0
  - Component: React Testing Library 15.0.0

Deployment:
  - Platform: Cloudflare Pages + Workers
  - Build: Wrangler 3.78.12
  - CI/CD: GitHub Actions (future)
```

### Project Structure
```
the-pensive-index/
├── app/                    # Next.js App Router (Presentation Layer)
│   ├── (auth)/            # Auth route groups (sign-in, sign-up)
│   ├── api/               # API routes (/api/v1/fandoms, /api/health)
│   ├── admin/             # Admin dashboard pages
│   ├── fandom/            # Fandom-specific pages (/fandom/[slug])
│   ├── pathway/           # Pathway builder pages
│   └── globals.css        # Global Tailwind imports
│
├── src/                   # Business Logic Layer
│   ├── components/        # React components
│   │   ├── ui/           # Base UI (button, dialog, select - shadcn/ui)
│   │   ├── pathway/      # Pathway builder (drag-drop, validation)
│   │   └── admin/        # Admin-specific components
│   ├── lib/              # Utility libraries
│   │   ├── database/     # Drizzle ORM schema, queries, helpers
│   │   ├── validation/   # Validation engine, rules, schemas
│   │   └── auth/         # NextAuth configuration
│   ├── types/            # TypeScript type definitions
│   ├── hooks/            # Custom React hooks
│   └── middleware/       # Edge middleware (auth, rate limiting)
│
├── tests/                 # Test suites
│   ├── unit/             # Unit tests (validation, utilities)
│   ├── integration/      # Integration tests (API, database)
│   ├── e2e/              # End-to-end tests (Playwright)
│   └── setup.ts          # Test environment configuration
│
├── docs/                  # Documentation
│   ├── specs/            # Feature specifications (archived)
│   └── wiki/             # Architecture, guides, API docs
│
├── scripts/               # Utility scripts
│   ├── setup-database.ts # Database initialization
│   ├── seed-database.ts  # Seed with test data
│   └── migrate-database.ts # Run migrations
│
├── migrations/            # Database migrations (SQL)
├── extension/             # Browser extension (future)
└── .specify/              # Spec-Kit configuration
    ├── memory/           # Constitution (this file)
    └── temp/             # Temporary working files
```

### Coding Standards

**TypeScript**:
- Strict mode enabled (`strict: true` in tsconfig.json)
- No `any` types; use `unknown` with type guards if needed
- Explicit return types for exported functions
- Use path aliases: `@/components/*`, `@/lib/*`, `@/types/*`

**React**:
- Functional components with hooks (no class components)
- Server Components by default; mark Client Components with `"use client"`
- Proper TypeScript for props (no inline types)
- Extract custom hooks for reusable logic

**Next.js App Router**:
- Use `app/` directory structure (not `pages/`)
- API routes in `app/api/` (route handlers, not API routes)
- File-based routing: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- Server Actions for mutations (future)

**Database**:
- Use Drizzle ORM for all queries (no raw SQL except migrations)
- Transactions for multi-step operations
- Proper error handling with typed errors
- Index optimization for search queries

**Validation**:
- Zod schemas for all input validation
- Separate schemas for create/update/patch operations
- Custom error messages for user-facing errors
- Validation engine in `src/lib/validation/`

### Performance Targets
| Metric                   | Target | Measurement                              |
| ------------------------ | ------ | ---------------------------------------- |
| Pathway Validation       | <200ms | Complex rule sets with tree dependencies |
| Story Search             | <500ms | Filtered queries across 10k+ stories     |
| Mobile Drag Interactions | 60fps  | Touch gestures on mid-range devices      |
| Desktop Drag-and-Drop    | 60fps  | Mouse interactions with visual feedback  |
| API Response Time        | <100ms | Simple CRUD operations                   |
| Page Load (FCP)          | <1.5s  | First Contentful Paint on 3G             |

---

## 🔐 Governance & Compliance

### Constitution Authority
- **Supersedes all other practices**: This document is the single source of truth
- **Change Control**: Updates require documented rationale + stakeholder approval
- **Version Control**: Semantic versioning (MAJOR.MINOR.PATCH)
- **Conflict Resolution**: Constitution > Spec-Kit templates > Copilot instructions

### Feature Justification Requirements
Every new feature must demonstrate:
1. **Discovery-Focused Alignment**: How does it improve finding existing stories?
2. **Dual Value Proposition**: Benefits for readers (discovery) AND writers (inspiration)
3. **Complexity Justification**: Is the added complexity worth the UX gain?
4. **Admin Configurability**: Can FandomAdmins customize it without code changes?

### Spec-Kit Workflow
```bash
# 1. Define feature requirements
/speckit.specify "Add trope tree visualization with conditional branching"

# 2. Create technical implementation plan
/speckit.plan "React Flow for tree rendering, TypeScript for type safety"

# 3. Generate ordered implementation tasks
/speckit.tasks

# 4. TDD Cycle: Tests → User Approval → Red → Green → Refactor
```

### Documentation Requirements
- All new features: Update `wiki/` documentation
- API changes: Update `wiki/api.md` with OpenAPI examples
- Architecture changes: Update `wiki/architecture/ARCHITECTURE.md`
- Breaking changes: Update this Constitution with version bump

---

## 📜 Appendix: Key Definitions

**Discovery-Focused**: The platform's core principle - prioritize searching existing story catalog before suggesting new content creation.

**Pathway**: A user-constructed combination of Tags and Tropes representing story search criteria (e.g., "time-travel + harry/hermione + goblin-inheritance").

**Trope**: A structured narrative device with conditional branching and dependencies (e.g., "Goblin Inheritance" → "Black Lordship" → "After Sirius Death").

**Tag**: A simple label without hierarchical structure used for categorization (e.g., "angst", "harry/hermione", "time-travel").

**Tag Class**: A validation group enabling cross-referential conflict detection (e.g., "harry-shipping" prevents multiple Harry pairings in same pathway).

**Relevance Score**: Calculated matching percentage between a pathway and a story, based on matched tags, tropes, and contextual factors (0-100%).

**Novelty Highlight**: An aspect of a pathway that's rare or under-explored in the existing story catalog, used to guide prompt generation.

**FandomAdmin**: An admin role scoped to a specific fandom with rights to manage Tags, Tropes, and validation rules for that fandom only.

**ProjectAdmin**: A global admin role with cross-fandom system configuration, user management, and database access rights.

---

*Constitution maintained by: Krishna GSVV (@VKrishna04)*
*Organization: Life-Experimentalists*
*Repository: [the-pensive-index](https://github.com/Life-Experimentalists/the-pensive-index)*
