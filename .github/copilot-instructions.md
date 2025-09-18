# The Pensieve Index Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-09-18

## Project Overview

The Pensieve Index is a **library-first story discovery platform** and intelligent prompt generator for fanfiction. It prioritizes finding existing tagged stories before generating new story prompts, enabling readers to find precisely matching stories and writers to discover gaps for new content.

## Core User Journey

1. **Pathway Creation**: User builds story pathway using drag-and-drop (desktop) or tap-to-select (mobile)
2. **Library Search**: System searches existing tagged stories with relevance scoring
3. **Dual Output**: Shows matching stories + "Create New Story" prompt with novelty highlights
4. **Story Submission**: Community tags new stories via browser extension â†’ GitHub issues â†’ Admin review

## Active Technologies

- TypeScript 5.x with Next.js 13+ (App Router)
- React 18+ with Tailwind CSS for styling
- dnd-kit for drag-and-drop interactions
- NextAuth.js for authentication and admin roles
- Cloudflare D1 (SQLite) for database
- Cloudflare Pages for deployment

## Project Structure

```
app/                    # Next.js app directory
â”œâ”€â”€ (auth)/            # Auth route groups
â”œâ”€â”€ api/               # API routes
â”œâ”€â”€ admin/             # Admin dashboard
â””â”€â”€ fandom/            # Fandom-specific pages

src/
â”œâ”€â”€ components/        # React components
â”‚   â”œâ”€â”€ ui/           # Base UI components
â”‚   â”œâ”€â”€ drag-drop/    # Drag & drop interface
â”‚   â””â”€â”€ admin/        # Admin components
â”œâ”€â”€ lib/              # Utility libraries
â”‚   â”œâ”€â”€ validation/   # Validation engine
â”‚   â””â”€â”€ database/     # Database utilities
â”œâ”€â”€ types/            # TypeScript definitions
â””â”€â”€ hooks/            # Custom React hooks

tests/
â”œâ”€â”€ components/       # Component tests
â”œâ”€â”€ validation/       # Validation engine tests
â”œâ”€â”€ integration/      # Integration tests
â””â”€â”€ e2e/             # End-to-end tests
```

## Core Concepts

### Data Hierarchy

- **Fandoms** (top-level): Harry Potter, Percy Jackson, etc.
- **Tags** (simple labels): angst, fluff, time-travel, harry/hermione
- **Plot Blocks** (structured tropes): Goblin Inheritance, Wrong-Boy-Who-Lived
- **Tag Classes** (validation logic): harry-shipping, hermione-shipping

### Plot Block Tree Structure

Plot Blocks support conditional branching with tree dependencies:

```
Goblin Inheritance
â”œâ”€â”€ Black Lordship
â”‚   â”œâ”€â”€ After Sirius Death
â”‚   â”‚   â”œâ”€â”€ Black Head of Family
â”‚   â”‚   â”œâ”€â”€ Gryffindor Head of Family
â”‚   â”‚   â”œâ”€â”€ Slytherin Lordship
â”‚   â”‚   â”œâ”€â”€ Potter Heritage
â”‚   â”‚   â”œâ”€â”€ Peverell Lordship
â”‚   â”‚   â””â”€â”€ Lord of Azkaban
â”‚   â””â”€â”€ Emancipation Route
â”‚       â”œâ”€â”€ Triwizard Tournament Trigger
â”‚       â”œâ”€â”€ Name from Goblet Trigger
â”‚       â””â”€â”€ Post-Tournament Inheritance
â”œâ”€â”€ Slytherin Lordship
â”‚   â”œâ”€â”€ Via Lily Potter Heritage
â”‚   â”œâ”€â”€ Via Voldemort Defeat (3+ times)
â”‚   â””â”€â”€ Conquest Right
â””â”€â”€ Potter Heritage
    â”œâ”€â”€ Multiple House Control â†’ Hogwarts Control
    â””â”€â”€ Traditional Inheritance
```

### Story Workflow Priority

1. **Library First**: Search existing tagged stories in database
2. **Show Both**: Display matching stories AND create prompt option
3. **Prompt Enhancement**: Highlight novelty aspects for new stories
4. **Community Growth**: Browser extension enables story submission workflow

### Validation Strategy

- Users can build impossible combinations during selection
- Validation occurs only on "Finish" button click
- Conflicts displayed with suggested fixes in modal

## Commands

```powershell
# Spec-Kit Development Workflow
/specify "feature description"   # Create specification
/plan "technical details"        # Generate implementation plan
/tasks                          # Break down into actionable tasks

# Development Commands
npm run dev              # Start development server
npm run build           # Build for production
npm run test            # Run all tests
npm run test:watch      # Run tests in watch mode
npm run lint            # ESLint checking
npm run type-check      # TypeScript validation
```

## Code Style

### TypeScript

- Strict mode enabled, no any types
- Use proper type definitions in src/types/
- Prefer interfaces for object shapes
- Use const assertions for readonly data

### React

- Functional components with hooks
- Use proper TypeScript for props
- Extract custom hooks for reusable logic
- Follow React 18+ patterns

### Next.js App Router

- Use app directory structure
- Server components by default
- Client components marked with "use client"
- API routes in app/api/ directory

### Testing

- TDD approach: Tests before implementation
- Component tests with React Testing Library
- Integration tests for user workflows
- E2E tests for critical paths

## Performance Requirements

- Validation engine: <200ms for complex rule sets
- Story search: <500ms for filtered queries
- Mobile drag interactions: 60fps on modern devices
- Desktop drag-and-drop: Smooth with visual feedback

## Responsive Design

- Desktop: Three-panel interface (Selection, Pathway, Output)
- Mobile: Tap-to-select with collapsible panels
- Touch-friendly interactions on mobile
- Keyboard navigation support

## Recent Changes

- 2025-09-17: Initial project setup with constitution and templates
- Next.js app directory structure established
- Drag-and-drop validation engine architecture planned

<!-- MANUAL ADDITIONS START -->
<!-- Add project-specific guidelines, coding standards, or team preferences here -->
<!-- MANUAL ADDITIONS END -->


