# The Pensieve Index - Project Documentation

## Table of Contents
1. [Project Vision](#project-vision)
2. [Core User Journey](#core-user-journey)
3. [Development Workflow](#development-workflow)
4. [Data Models](#data-models)
5. [User Interface Design](#user-interface-design)
6. [Technical Specifications](#technical-specifications)

## Project Vision

### Core Problem
Writers struggle with writer's block and readers can't find stories that match their specific, nuanced tastes. Current fanfiction platforms use basic tags that don't capture the complex story elements and tropes readers actually want.

### Solution: Library-First Story Discovery
The Pensieve Index provides a **library-first approach** to fanfiction discovery and creation:

1. **Existing Story Search**: Primary function - find precisely matching tagged stories
2. **Intelligent Prompt Generation**: Secondary function - create detailed prompts when library gaps exist
3. **Hierarchical Tagging System**: Complex tag relationships and plot block dependencies
4. **Community-Driven Growth**: Admin-curated content with public story submission workflow

### User Personas
- **Readers**: Want precise story discovery using complex criteria beyond basic character/genre filtering
- **Writers**: Need inspiration and detailed prompts with logical consistency and novelty highlights
- **Admins**: Require robust content management for tags, plot blocks, and story curation

## Core User Journey

### Primary Workflow
```
1. User creates story pathway
   ├── Desktop: Drag-and-drop interface
   └── Mobile: Tap-to-select interface

2. System searches existing library
   ├── Relevance scoring algorithm
   ├── Complex filtering by pathway
   └── Results with match quality indicators

3. Dual output presentation
   ├── Matching existing stories (if any)
   └── "Create New Story" prompt option
       └── Novelty highlights for unique aspects

4. Story creation/discovery
   ├── Read existing matches, OR
   └── Use enhanced prompt for writing
```

### Story Submission Flow
```
1. Community discovery
   ├── User finds story on AO3/FFN/etc.
   └── Clicks browser extension

2. Manual tagging process
   ├── Extension extracts story metadata
   ├── User builds pathway using simplified interface
   └── Extension validates pathway for conflicts

3. GitHub Issues integration
   ├── Auto-generates GitHub issue
   ├── Includes story details + pathway JSON
   └── Assigns appropriate admin labels

4. Admin review and approval
   ├── Admin reviews submission
   ├── Can modify pathway if needed
   └── Manually adds to database via admin console
```

## Architecture Overview

### Data Hierarchy
```
Fandom (Top Level) - Harry Potter, Percy Jackson, etc.
├── Tags (Simple Labels)
│   ├── Regular Tags: angst, fluff, time-travel, powerful-harry
│   ├── Pairing Tags: harry/hermione, draco/hermione
│   └── Tag Classes: harry-shipping, hermione-shipping
└── Plot Blocks (Structured Tropes with Conditional Trees)
    ├── Goblin Inheritance
    │   ├── Black Lordship
    │   │   ├── After Sirius Death
    │   │   │   ├── Black Head of Family
    │   │   │   ├── Gryffindor Head of Family
    │   │   │   ├── Slytherin Lordship
    │   │   │   ├── Potter Heritage
    │   │   │   ├── Peverell Lordship
    │   │   │   └── Lord of Azkaban
    │   │   └── Emancipation Route
    │   │       ├── Triwizard Tournament Trigger
    │   │       ├── Name from Goblet Trigger
    │   │       └── Post-Tournament Inheritance
    │   ├── Slytherin Lordship
    │   │   ├── Via Lily Potter Heritage
    │   │   ├── Via Voldemort Defeat (3+ times)
    │   │   └── Conquest Right
    │   └── Potter Heritage
    │       ├── Multiple House Control → Hogwarts Control
    │       └── Traditional Inheritance
    └── Wrong-Boy-Who-Lived
        ├── Harry Neglected by Parents
        ├── Harry Abandoned to Relatives
        └── Sibling as False Hero
```

### Validation Engine
The validation engine implements complex rule checking with tree dependency support:

#### Rule Types
1. **Conditional Requirements**: If multiple shipping tags for same character → require `harem` tag
2. **Exclusivity Rules**: `Wrong-Boy-Who-Lived` cannot combine with `Canon-Compliant`
3. **Prerequisite Rules**: `Post-War Auror Training` requires 'Hogwarts Era' or 'War-Time' block
4. **Tree Dependencies**: Plot block children require their parent block to be selected
5. **Complex Conditionals**: Multiple house lordships → Hogwarts control, Emancipation → Inheritance access

#### Validation Timing
- **During Selection**: Users can build any combination (even impossible ones) - no blocking
- **On Checkout**: Validation runs when user clicks "Finish/Complete Pathway" button
- **Conflict Resolution**: Modal displays conflicts with clear explanations and suggested fixes
- **User Choice**: Can proceed with warnings or resolve conflicts before continuing

#### Example Complex Tree Logic
```
IF user selects "After Sirius Death" under Black Lordship:
  THEN enable: Black Head of Family, Gryffindor Head, Slytherin Lordship, etc.
  AND IF "Slytherin Lordship" selected:
    THEN require selection from: Via Lily Potter Heritage, Via Voldemort Defeat, Conquest Right
  AND IF 2+ House Lordships selected:
    THEN auto-suggest: Hogwarts Control option
```

## Development Workflow

### Spec-Kit Integration
This project follows Spec-Driven Development using the three-command cycle:

```powershell
# 1. Define feature requirements and user scenarios
/specify "Add drag-and-drop pathway builder with mobile support and validation engine"

# 2. Create technical implementation plan
/plan "React components with dnd-kit, responsive design using Tailwind, TypeScript validation engine"

# 3. Generate ordered, testable implementation tasks
/tasks

# 4. Execute development following TDD principles
# Tests written → User approval → Tests fail → Implementation → Tests pass
```

### Constitutional Development Principles
1. **Library-First**: All features prioritize existing story discovery over prompt generation
2. **Test-First**: TDD mandatory - especially for validation engine and drag-and-drop interactions
3. **Responsive Design**: Desktop drag-and-drop + mobile tap-to-select interfaces
4. **Community Growth**: Admin-curated content with public submission workflow

### Branch Strategy
- Feature branches follow spec-kit naming: `001-feature-name`, `002-feature-name`
- Each feature gets full `/specify` → `/plan` → `/tasks` cycle
- Constitution compliance verified at each phase
- No feature merges without passing all validation tests

### Quality Gates
- **Specification Phase**: User scenarios must be testable and unambiguous
- **Planning Phase**: Technical approach must align with constitutional principles
- **Task Phase**: Implementation tasks must follow TDD order (tests before code)
- **Execution Phase**: All validation engine changes require comprehensive test coverage

## Data Models

### Core Entities

#### Fandom
```typescript
interface Fandom {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Tag
```typescript
interface Tag {
  id: string;
  fandomId: string;
  name: string;
  description?: string;
  tagClasses: string[]; // e.g., ['harry-shipping', 'main-character']
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Plot Block
```typescript
interface PlotBlock {
  id: string;
  fandomId: string;
  name: string;
  description: string;
  parentBlockId?: string; // For tree structure
  conditions?: PlotBlockCondition[]; // Conditional branching logic
  implications: string[]; // What this block narratively implies
  conflicts: string[]; // IDs of mutually exclusive blocks
  prerequisites: string[]; // Required block IDs
  autoSuggests?: string[]; // Blocks to suggest when this is selected
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PlotBlockCondition {
  id: string;
  name: string; // e.g., "Via Lily Potter Heritage"
  description: string;
  requires?: string[]; // Other conditions that must be met
  enables?: string[]; // What this condition unlocks
}
```

#### Story & Pathway
```typescript
interface Story {
  id: string;
  fandomId: string;
  title: string;
  author: string;
  url: string;
  summary?: string;
  pathway: StoryPathway;
  relevanceScore?: number; // For search ranking
  submittedBy?: string; // User who submitted via extension
  reviewedBy: string; // Admin who approved
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface StoryPathway {
  tags: string[]; // Tag IDs
  plotBlocks: SelectedPlotBlock[]; // Plot blocks with conditions
  validationResult?: ValidationResult;
}

interface SelectedPlotBlock {
  blockId: string;
  selectedConditions?: string[]; // Specific condition IDs chosen
  childBlocks?: SelectedPlotBlock[]; // Nested selections
}
```

### Relationships & Business Logic
- **One Fandom** contains many Tags and Plot Blocks (strict namespacing)
- **Plot Blocks** support parent-child tree relationships with conditional branching
- **Tags** can belong to multiple Tag Classes for cross-referential validation
- **Validation Rules** apply within Fandom scope and support complex tree logic
- **Stories** are tagged with complete pathways (tags + plot blocks + conditions)
- **Admin Roles**: ProjectAdmin (global access), FandomAdmin (scoped to specific fandoms)

## User Interface Design

### Desktop Interface (Three-Panel Layout)

#### Panel 1: Selection
- Fandom selector dropdown
- Tag category filters
- Search functionality
- Tag and Plot Block browsers
- Hierarchical tree view for Plot Blocks

#### Panel 2: Pathway Builder
- Drag-and-drop canvas
- Visual pathway representation
- Real-time organization
- Conditional branching indicators
- Connection lines between related elements

#### Panel 3: Dual Output
- **Existing Stories Section**:
  - Search results with relevance scores
  - Match quality indicators
  - Story previews with pathway highlights
  - "Read Story" links to external sites
- **Create New Story Section**:
  - Always visible prompt generation option
  - Novelty highlights showing unique aspects
  - Detailed prompt with logical consistency
  - Export/Import pathway functionality (JSON)
  - Share pathway option

### Mobile Interface (Responsive Design)

#### Collapsible Panels
- Stack panels vertically
- Expandable sections
- Touch-friendly interactions
- Swipe gestures for navigation

#### Tap-to-Select
- Replace drag-and-drop with tap selection
- Visual feedback for selections
- Easy removal of selected items
- Simplified pathway visualization

### Validation UI Experience
- **During Selection**: Smooth, unblocked interaction - users can select impossible combinations
- **Visual Feedback**: Selected items show in pathway, but no error indicators during selection
- **On "Finish/Complete"**: Validation modal appears if conflicts exist
- **Conflict Display**:
  - Clear error messages with explanations
  - Visual highlighting of conflicting selections
  - Suggested fixes with one-click resolution
  - "Proceed anyway" option vs "Resolve conflicts"
- **Resolution Options**: Remove conflicting items, add required tags, or adjust plot block selections

## Technical Specifications

### Performance Requirements
- **Validation Engine**: <200ms for complex rule sets
- **Story Search**: <500ms for filtered queries
- **Mobile Interactions**: 60fps on modern devices
- **Desktop Drag-Drop**: Smooth with visual feedback

### Technology Stack
- **Frontend**: Next.js 13+ (App Router), React 18+, TypeScript
- **Styling**: Tailwind CSS for responsive design
- **Interactions**: dnd-kit for drag-and-drop functionality
- **Authentication**: NextAuth.js with role-based permissions
- **Database**: Cloudflare D1 (SQLite) for data persistence
- **Deployment**: Cloudflare Pages with edge functions

### Admin System (✅ IMPLEMENTED)
The hierarchical admin system has been **fully implemented and is operational**:

#### Two-Tier Admin Structure
- **Project Admin**: Global system access, can manage all fandoms and assign admin roles
- **Fandom Admin**: Scoped access to specific assigned fandoms only

#### Core Features (All Implemented)
- **Role-Based Access Control (RBAC)**: Comprehensive permission validation system
- **Invitation System**: Project Admins can invite new admins with email-based workflow
- **Audit Logging**: Complete action tracking for all admin operations
- **Dashboard Interfaces**: Dedicated role-specific admin dashboards
- **User Management**: Admin assignment, role modification, and access control
- **Fandom Assignment**: Scoped content management for Fandom Admins
- **Mobile Responsive**: All admin interfaces optimized for mobile devices

#### Technical Implementation
- **PermissionValidator**: Centralized permission checking (sync/async)
- **AdminPermissionGate**: React component for UI permission control
- **Complete Service Layer**: RoleAssignment, FandomAssignment, Invitation, AuditLog services
- **Database Schema**: Full hierarchical admin tables with foreign key constraints
- **API Endpoints**: Secured admin management APIs with role validation
- **43/43 Core Tests Passing**: 100% success rate on core admin functionality

### Security Considerations
- **Hierarchical RBAC**: Strict role-based access control with fandom scoping
- **Comprehensive Audit Trail**: All admin actions logged with user, timestamp, and details
- **Input validation**: All forms and API endpoints validated
- **SQL injection prevention**: Parameterized queries throughout
- **XSS protection**: Input sanitization and output encoding
- **CSRF protection**: Via NextAuth.js and secure session management

### Scalability Plans
- Database indexing for fast searches
- Edge caching for static content
- Component-based architecture for maintainability
- Admin-driven content growth model

## Browser Extension Integration

### Story Submission Workflow
1. **User Discovery**: User finds story on AO3, FFN, Wattpad, etc.
2. **Extension Activation**: User clicks browser extension icon
3. **Auto-Extraction**: Extension extracts story metadata:
   - Title, author, URL
   - Publication date, word count
   - Original summary/description
4. **Manual Pathway Building**: User creates pathway using simplified interface:
   - Same validation rules as main platform
   - Streamlined UI for quicker tagging
   - Real-time conflict detection
5. **GitHub Issue Creation**: Extension auto-generates GitHub issue:
   - Pre-filled template with story details
   - Pathway JSON data
   - Admin review labels
   - Submitter information
6. **Admin Review Process**:
   - Admin reviews submission via GitHub
   - Can modify pathway if needed
   - Manually adds to database via admin console
   - Closes issue when processed

### Extension Technical Scope
- **Site Support**: AO3, FFN, Wattpad (initial), expandable
- **User-Driven Tagging**: Manual pathway creation (not auto-generated)
- **GitHub Integration**: Auto-fill issues with structured data
- **Validation**: Same engine as main platform for consistency
- **Authentication**: User accounts for submission tracking
- **Offline Support**: Cache pathways for later submission

### Extension vs Main Platform
- **Extension**: Simplified tagging interface, story submission focus
- **Main Platform**: Full discovery + prompt generation, comprehensive pathway building
- **Shared**: Same validation engine, same data models, same pathway format

## Future Roadmap

### Phase 1: Core Library-First Platform
- [ ] Three-entity system (Fandoms, Tags, Plot Blocks) with tree structure support
- [ ] Complex validation engine with conditional branching logic
- [ ] Desktop drag-and-drop interface with three-panel layout
- [ ] Admin dashboard with role-based permissions (ProjectAdmin, FandomAdmin)
- [ ] Story search with relevance scoring and pathway matching
- [ ] Dual output: existing stories + create new story prompts

### Phase 2: Responsive & Community Features
- [ ] Mobile responsive interface with tap-to-select
- [ ] Browser extension for story submission (AO3, FFN support)
- [ ] GitHub Issues integration for admin workflow
- [ ] User accounts and pathway export/import functionality
- [ ] Advanced validation rules and conflict resolution UI

### Phase 3: Enhanced Discovery & Curation
- [ ] Machine learning for story relevance scoring
- [ ] Community voting on story-pathway accuracy
- [ ] Advanced analytics for admins (gap analysis, popular combinations)
- [ ] Multi-fandom support with cross-fandom plot blocks
- [ ] API for third-party integrations

### Phase 4: Advanced Platform Features
- [ ] Auto-suggest pathway completions based on existing stories
- [ ] Story update tracking and re-validation
- [ ] Advanced prompt generation with novelty scoring
- [ ] Multi-language support for international fandoms
- [ ] Enterprise features for large fandom communities

---

*This documentation follows Spec-Driven Development principles and is updated with each feature implementation cycle (/specify → /plan → /tasks).*

---

**Next: Spec 002 - Configurable Validation Framework**

```
/specify "Build a configurable validation framework that allows admins to create custom validation rules, tag relationships, and plot block dependencies through an admin interface. The system should support rule templates for common validation patterns (conditional requirements, exclusivity rules, prerequisite dependencies) while allowing admins to define custom rule types. Include a visual rule builder interface where admins can link tags and plot blocks with drag-and-drop connections, set conditions, and test validation scenarios before publishing rules to users."

/plan "Use Next.js 13+ with TypeScript 5.x, React Flow for visual rule builder, and Cloudflare D1 for rule storage. Implement comprehensive API testing with Vitest for unit tests and Postman collections for integration testing of all validation endpoints. Create Postman environment configurations with automated test scripts for rule CRUD operations, validation testing, and error scenarios. Include JSON schema validation in Postman tests and authentication flow testing for admin roles. Use Zod for runtime rule validation and implement rule caching with <100ms evaluation performance target."

/tasks
```


**Spec 003 - Admin Rule Management Dashboard**

```
/specify "Create an admin dashboard for managing validation rules and tag relationships with role-based permissions. ProjectAdmins can create rule templates and manage system-wide validation patterns. FandomAdmins can configure fandom-specific rules, create tag classes, define plot block hierarchies, and link validation conditions. Include a visual rule builder with drag-and-drop interface for connecting tags/plot blocks, conditional logic builder for complex scenarios, rule testing sandbox, and bulk import/export functionality for sharing rule sets between fandoms."

/tasks
```