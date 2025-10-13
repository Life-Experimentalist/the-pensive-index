# Architecture — Overview

This document summarizes the system architecture and component responsibilities for The Pensieve Index.

High-level components
- Web UI — Next.js (App Router) React front-end under `app/` with server and client components
- API & Server logic — Next.js route handlers in `app/api/` and Cloudflare Worker entry `worker.ts` for background/scheduled tasks
- Database — Cloudflare D1 (SQLite) with Drizzle ORM for data access and migrations under `migrations/`
- Caching — Cloudflare KV (namespace `CACHE`) and in-memory caches where appropriate
- Rate limiting — Durable Object `RateLimiter` to coordinate quotas and throttling

Data model highlights
- Fandoms → Tags → Tropes (hierarchical trope trees)
- Pathways — user-created selections of tropes/tags that define a story prompt or filter
- Stories — indexed entries with tags, tropes, and metadata used for library-first discovery

Trope tree
- Tropes are stored as nodes with optional parent relationships that form branching trees.
- The validation engine enforces allowed combinations only at finalization time (on Finish) and suggests fixes for impossible states.

Communication & integration
- GitHub Issues — story submissions flow uses GitHub Issues (via `@octokit/rest`) and admin review
- Browser extension — tags and story metadata can be submitted via the extension (see `extension/`)

Deployment topology
- Frontend and server code deploy to Cloudflare Pages + Workers
- Background jobs scheduled via Cloudflare Worker crons (configured in `wrangler.toml`)

Where to update architecture diagrams
- Keep diagrams in `wiki/architecture/diagrams/` and update `ARCHITECTURE.md` when components change.

Checklist before architectural changes
- [ ] Update this document and add an architecture diagram
- [ ] Add migration notes under `migrations/` and `wiki/deployment/`
- [ ] Run integration tests and document rollback steps

Architecture diagram (Mermaid)
-------------------------------

```mermaid
flowchart LR
    subgraph Browser
        A[Next.js UI (Pathway Builder)]
        B[Browser Extension]
    end
    A --> API[Next.js API Routes]
    B --> API
    API --> DB[D1 (SQLite) - Drizzle]
    API --> KV[KV (CACHE)]
    Worker[Cloudflare Worker (Crons & Background)] --> DB
    Worker --> KV
    Worker --> DO[Durable Object: RateLimiter]
    API --> Worker
    API --> GitHub[GitHub Issues]
    GitHub --> Admin[Admin Dashboard]
    Admin --> API
    classDef infra fill:#f9f,stroke:#333,stroke-width:1px;
    class DB,KV,Worker,DO,GitHub infra
```

Diagram notes
- The diagram labels the main runtime components and shows primary request and background flows.
- Responsibilities:
    - UI: pathway building, client validation, search UX
    - API: persistent storage access, search orchestration
    - Worker: background aggregation, scheduled tasks, maintenance
    - DO: shared state for rate limiting and coordination
# System Architecture

## Overview
The Pensieve Index is built as a modern web application following library-first principles with a focus on story discovery before prompt generation.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Browser       │    │   Next.js App   │    │   Cloudflare    │
│   Extension     │    │   (Frontend)    │    │   D1 Database   │
│                 │    │                 │    │                 │
│ Story Submission│◄──►│ Three-Panel UI  │◄──►│ SQLite Engine   │
│ Auto-tagging    │    │ Validation      │    │ Edge Functions  │
└─────────────────┘    │ Search Engine   │    └─────────────────┘
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   GitHub        │
                       │   Issues API    │
                       │                 │
                       │ Story Submission│
                       │ Admin Review    │
                       └─────────────────┘
```

## Core Components

### 1. Frontend Application (Next.js 13+)
- **Three-Panel Interface**: Selection, Pathway Builder, Output
- **Responsive Design**: Desktop drag-and-drop, mobile tap-to-select
- **Real-time Validation**: Client-side validation engine
- **State Management**: React Query for server state, React hooks for UI state

### 2. API Layer
- **RESTful Endpoints**: CRUD operations for all entities
- **Fandom-Scoped**: All content operations scoped by fandom
- **Role-Based Access**: ProjectAdmin vs FandomAdmin permissions
- **Validation Engine**: Complex rule checking and conflict resolution

### 3. Database Layer (Cloudflare D1)
- **Hierarchical Data**: Tropes with tree relationships
- **Tag Classification**: Tag classes for validation logic
- **Story Pathways**: Complete tagging information for stories
- **Performance Optimized**: Indexed queries for fast searches

### 4. Browser Extension
- **Multi-Site Support**: AO3, FFN, Wattpad compatibility
- **Manual Tagging**: User-driven pathway creation
- **GitHub Integration**: Automatic issue creation
- **Offline Caching**: Store pathways for later submission

## Data Flow

### Story Discovery Flow
```
User Input → Pathway Builder → Validation Engine → Story Search → Dual Output
    ↓              ↓               ↓                 ↓           ↓
Select Tags → Build Pathway → Check Conflicts → Find Stories → Show Results
                                                               + Prompts
```

### Story Submission Flow
```
Extension → Manual Tagging → GitHub Issue → Admin Review → Database
    ↓           ↓               ↓            ↓            ↓
Site Data → User Pathway → Auto Template → Admin Edit → Story Added
```

## Technology Stack

### Frontend
- **Next.js 13+**: App Router, Server Components
- **React 18+**: Functional components, hooks
- **TypeScript 5.x**: Strict mode, full type safety
- **Tailwind CSS**: Responsive design system
- **dnd-kit**: Drag-and-drop interactions

### Backend
- **Next.js API Routes**: Serverless functions
- **Drizzle ORM**: Type-safe database queries
- **Zod**: Runtime validation schemas
- **NextAuth.js**: Authentication and authorization

### Database
- **Cloudflare D1**: SQLite on the edge
- **Hierarchical Queries**: CTE for tree structures
- **Indexes**: Optimized for search performance
- **Migrations**: Version-controlled schema changes

### Testing
- **Vitest**: Unit and integration testing
- **Playwright**: End-to-end testing
- **React Testing Library**: Component testing
- **Comprehensive Coverage**: TDD enforcement

## Performance Architecture

### Response Time Requirements
- **Validation Engine**: < 200ms for complex rule sets
- **Story Search**: < 500ms for filtered queries
- **CRUD Operations**: < 50ms for simple operations
- **Mobile Interactions**: 60fps on modern devices

### Optimization Strategies
- **Edge Deployment**: Cloudflare Pages for global distribution
- **Database Indexing**: Optimized query performance
- **Client-Side Caching**: React Query for data persistence
- **Code Splitting**: Dynamic imports for large components

## Security Architecture

### Authentication & Authorization
- **Role-Based Access Control**: ProjectAdmin, FandomAdmin
- **Fandom Scoping**: Content access limited by permissions
- **Session Management**: NextAuth.js secure sessions
- **API Protection**: Middleware for route protection

### Data Protection
- **Input Validation**: Zod schemas for all inputs
- **SQL Injection Prevention**: Parameterized queries via Drizzle
- **XSS Protection**: React's built-in escaping
- **CSRF Protection**: NextAuth.js token validation

## Scalability Considerations

### Horizontal Scaling
- **Stateless Architecture**: No server-side session storage
- **Database Scaling**: Cloudflare D1 auto-scaling
- **CDN Distribution**: Static assets via Cloudflare
- **Edge Functions**: Computation near users

### Vertical Scaling
- **Efficient Queries**: Optimized database access patterns
- **Component Optimization**: React.memo and useMemo
- **Bundle Optimization**: Tree shaking and code splitting
- **Caching Strategy**: Multiple layers of caching

---

*This architecture supports our library-first approach while maintaining high performance and scalability.*
