# The Pensieve Index Constitution

## Core Principles

### I. Story Library First
Every feature prioritizes existing story discovery before prompt generation:
- Search existing tagged stories must be the primary function
- Story prompt generation is secondary (only when library gaps exist)
- All pathways must be searchable against the story database
- Library growth through community curation is prioritized

### II. Hierarchical Data Integrity
Complex data relationships must be maintainable and scalable:
- Fandoms contain Tags and Plot Blocks with strict namespacing
- Plot Blocks support tree structures with conditional branching
- Tag Classes enable cross-referential validation (e.g., shipping conflicts)
- Admin roles respect fandom boundaries (FandomAdmin vs ProjectAdmin)

### III. Test-First Development (NON-NEGOTIABLE)
TDD mandatory for all validation logic and user interactions:
- Validation engine tests written → User approved → Tests fail → Then implement
- Complex rule combinations must have comprehensive test coverage
- Drag-and-drop interactions require integration tests
- Red-Green-Refactor cycle strictly enforced

### IV. Responsive Interaction Design
User experience must be optimized for both desktop and mobile:
- Desktop: Full three-panel drag-and-drop interface
- Mobile: Tap-to-select with collapsible panels and touch-friendly design
- Validation conflicts only shown on "Finish" - never during selection
- 60fps performance requirement for all interactive elements

### V. Community-Driven Growth
Platform scalability through decentralized content management:
- Admin curation system for tags, plot blocks, and validation rules
- Public story submission via browser extension with GitHub Issues integration
- Manual review and approval workflow for all story additions
- Role-based permissions ensure content quality and fandom expertise

## Technical Standards

### Platform Requirements
- **Frontend**: Next.js with React/TypeScript, Tailwind CSS, dnd-kit for drag-and-drop
- **Backend**: NextAuth.js for authentication, Cloudflare D1 for database
- **Deployment**: Cloudflare Pages with edge functions
- **Testing**: Comprehensive validation engine testing, responsive UI testing

### Performance Targets
- Pathway validation: <200ms for complex rule sets
- Story search: <500ms for filtered queries
- Mobile interface: 60fps drag interactions on modern devices
- Desktop interface: Smooth drag-and-drop with visual feedback

## Community Integration

### Story Submission Workflow
Public story submission via manual form → Browser extension auto-fills GitHub issue → Admin reviews and manually adds to database via admin console. Extension works on AO3, FFN, etc., for user-driven tagging (not auto-generated). Extension auto-fills story details but requires human verification of pathway tags.

### Content Growth Strategy
Admin-driven content curation enables organic growth. FandomAdmins add Tags, Plot Blocks, and validation rules. Community submits stories with suggested pathways. System suggests "Create New Story" prompts when library gaps exist, highlighting novelty aspects.

## Governance

Constitution supersedes all other practices. Complexity must be justified against library-first principles. Features must demonstrate clear value for writers (prompt generation) AND readers (story discovery). All validation rules must be admin-configurable to support fandom growth.

**Version**: 1.0.0 | **Ratified**: 2025-09-17 | **Last Amended**: 2025-09-17