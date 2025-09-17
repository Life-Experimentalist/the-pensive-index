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
- **Hierarchical Data**: Plot blocks with tree relationships
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
