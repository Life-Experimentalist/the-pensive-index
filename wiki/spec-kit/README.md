# Spec-Kit Framework Guide

The Pensieve Index uses [Spec-Kit](https://github.com/github/spec-kit) for structured feature development with AI-assisted coding.

## What is Spec-Kit?

Spec-Kit is a development methodology that enforces:

- **Specification-first development**: Write detailed specs before coding
- **Constitutional compliance**: Follow project principles consistently
- **AI-assisted implementation**: Use AI agents for development tasks
- **Test-driven development**: Tests written before implementation

## Development Workflow

### Three-Command Cycle

```powershell
# 1. Create feature specification
/specify "Your feature description here"

# 2. Generate implementation plan
/plan "Technical approach and details"

# 3. Break down into actionable tasks
/tasks
```

### Example Workflow

```powershell
# Specify a new feature
/specify "Add drag-and-drop pathway builder interface for desktop users with visual feedback and conflict detection"

# Plan the implementation
/plan "Use dnd-kit library with React components, implement visual conflict indicators, and integrate with validation engine"

# Generate tasks
/tasks
```

## Specification Templates

### Feature Specification Template

```markdown
# Feature: [Feature Name]

## Overview
Brief description of what this feature does and why it's needed.

## User Stories
- As a [user type], I want [goal] so that [benefit]
- As a [user type], I want [goal] so that [benefit]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Technical Requirements
- Performance targets
- Browser compatibility
- Accessibility requirements

## Design Constraints
- Library-first principle compliance
- Responsive design requirements
- Validation engine integration

## Success Metrics
How we'll measure if this feature is successful.
```

### Implementation Plan Template

```markdown
# Implementation Plan: [Feature Name]

## Architecture Overview
High-level technical approach and component structure.

## Components Required
- Component 1: Purpose and responsibilities
- Component 2: Purpose and responsibilities

## Database Changes
- Schema modifications
- Migration requirements
- Indexing strategy

## API Endpoints
- Endpoint 1: Purpose and specification
- Endpoint 2: Purpose and specification

## Testing Strategy
- Unit test requirements
- Integration test scenarios
- E2E test flows

## Dependencies
- New packages required
- Version constraints
- Potential conflicts

## Implementation Order
1. Step 1: Setup and configuration
2. Step 2: Core functionality
3. Step 3: Integration and testing
```

## Constitutional Compliance

### Core Principles

Every feature must align with our constitution:

1. **Story Library First**: Prioritize finding existing stories over generating new prompts
2. **Hierarchical Data Integrity**: Maintain clean data models with proper validation
3. **Test-First Development**: Write comprehensive tests before implementation
4. **Responsive Design Excellence**: Ensure outstanding mobile and desktop experiences
5. **Community-Driven Growth**: Enable community contribution through submission workflows

### Validation Checklist

Before implementing any feature, verify:

- [ ] Does this support library-first discovery?
- [ ] Are validation rules properly implemented?
- [ ] Do tests cover all critical paths?
- [ ] Is the design responsive and accessible?
- [ ] Does this enable community growth?

## AI Agent Integration

### Recommended AI Agents

- **Claude 3.5 Sonnet**: Primary development agent
- **GitHub Copilot**: Code completion and suggestions
- **Cursor**: IDE integration for pair programming
- **Gemini**: Alternative for complex reasoning tasks

### Agent Instructions

When working with AI agents, provide context:

```
Context: Working on The Pensieve Index, a library-first fanfiction discovery platform.
Constitution: Follow our 5 core principles (library-first, data integrity, TDD, responsive design, community growth).
Tech Stack: Next.js 13+, TypeScript 5.x, React 18+, Tailwind CSS, Cloudflare D1, dnd-kit.
Current Task: [Describe your specific task]
```

### Best Practices

1. **Provide Complete Context**: Share relevant files, specs, and requirements
2. **Follow TDD**: Ask agents to write tests first
3. **Request Explanations**: Understand the reasoning behind suggestions
4. **Iterate Frequently**: Make small changes and validate continuously
5. **Review Thoroughly**: Always review AI-generated code for quality and compliance

## Project Structure

### Spec-Kit Directories

```
.specify/
├── memory/
│   ├── constitution.md      # Core development principles
│   ├── context.md          # Project context and background
│   └── decisions.md        # Architectural decisions
├── templates/
│   ├── specification.md    # Feature spec template
│   ├── plan.md            # Implementation plan template
│   └── tasks.md           # Task breakdown template
└── config.json            # Spec-kit configuration

specs/
├── 001-core-data-models/   # Feature specifications
│   ├── spec.md            # Detailed specification
│   ├── plan.md            # Implementation plan
│   └── tasks.md           # Task breakdown
├── 002-validation-engine/
│   ├── spec.md
│   ├── plan.md
│   └── tasks.md
└── 003-drag-drop-interface/
    ├── spec.md
    ├── plan.md
    └── tasks.md
```

### Feature Numbering

Features are numbered sequentially:

- `001-core-data-models`: Foundational data structures
- `002-validation-engine`: Complex validation logic
- `003-drag-drop-interface`: Desktop interaction system
- `004-mobile-interface`: Mobile-optimized experience
- `005-story-search`: Advanced search functionality

## Task Management

### Task Format

Each task follows a specific format:

```markdown
## T001: Setup TypeScript Configuration

**Priority**: High
**Estimated Time**: 30 minutes
**Dependencies**: None

**Description**: Configure TypeScript with strict mode and project-specific settings.

**Acceptance Criteria**:
- [ ] TypeScript configured with strict mode
- [ ] Path aliases set up for src/ directories
- [ ] Build process validates TypeScript
- [ ] No any types allowed in codebase

**Implementation Notes**:
- Use latest TypeScript 5.x
- Configure path mapping for cleaner imports
- Set up ESLint integration
```

### Task Dependencies

Tasks can depend on other tasks:

```markdown
## T005: Implement Story Search API

**Dependencies**: T001 (TypeScript), T002 (Database), T003 (Validation)
```

### Task Status Tracking

- **Pending**: Not started
- **In Progress**: Currently being worked on
- **Review**: Implementation complete, needs review
- **Done**: Completed and approved

## Testing Requirements

### Test-First Development

Every task that involves code must include tests:

```powershell
# 1. Write failing tests
npm run test -- tests/validation/rules.test.ts

# 2. Get approval on test structure
# (Review with team or AI agent)

# 3. Implement code to pass tests
npm run test -- tests/validation/rules.test.ts --run

# 4. Refactor while keeping tests green
```

### Test Categories

1. **Unit Tests**: Individual functions and components
2. **Integration Tests**: Multiple components working together
3. **E2E Tests**: Complete user workflows
4. **Performance Tests**: Validation engine speed requirements

### Test Coverage Requirements

- **Minimum**: 80% code coverage
- **Critical Paths**: 100% coverage for validation logic
- **Edge Cases**: Comprehensive error handling tests

## Quality Gates

### Pre-Implementation Checklist

Before starting any task:

- [ ] Specification reviewed and approved
- [ ] Implementation plan validated
- [ ] Test strategy defined
- [ ] Dependencies identified
- [ ] Constitutional compliance verified

### Pre-Merge Checklist

Before merging feature branches:

- [ ] All tests passing
- [ ] Code coverage requirements met
- [ ] ESLint checks passing
- [ ] TypeScript compilation successful
- [ ] Manual testing completed
- [ ] Constitutional compliance verified

## Common Patterns

### Feature Implementation Pattern

1. **Specify**: Create detailed feature specification
2. **Plan**: Design technical implementation approach
3. **Task**: Break down into small, manageable tasks
4. **Test**: Write comprehensive test suite
5. **Implement**: Build feature following TDD
6. **Review**: Validate against specifications
7. **Deploy**: Merge and deploy to staging

### Validation Pattern

1. **Define Rules**: Specify validation requirements
2. **Create Tests**: Write test cases for all rule scenarios
3. **Implement Engine**: Build validation logic
4. **Integrate UI**: Connect validation to user interface
5. **Performance**: Ensure <200ms validation time

### Component Pattern

1. **Design API**: Define component props and interface
2. **Write Tests**: Test component behavior
3. **Implement**: Build component following design system
4. **Document**: Add storybook entries and documentation
5. **Integrate**: Connect to application workflow

## Advanced Features

### Custom Spec-Kit Commands

```powershell
# Create architecture decision record
/adr "Decision title and context"

# Generate test plan
/test-plan "Feature area to test"

# Create deployment checklist
/deploy "Environment and requirements"
```

### Integration with IDEs

Configure your IDE for Spec-Kit workflows:

```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Specify Feature",
      "type": "shell",
      "command": "echo",
      "args": ["Use /specify command in terminal"]
    },
    {
      "label": "Run Feature Tests",
      "type": "shell",
      "command": "npm",
      "args": ["run", "test", "--", "tests/features/"]
    }
  ]
}
```

## Troubleshooting

### Common Issues

**Specification Rejected**
- Review constitutional compliance
- Ensure library-first approach
- Add missing acceptance criteria

**Implementation Stalled**
- Break tasks into smaller pieces
- Review dependencies and prerequisites
- Ask for AI agent assistance with specific blockers

**Tests Failing**
- Review test requirements in specification
- Ensure implementation matches expected behavior
- Check for edge cases and error handling

### Getting Help

1. **Review Constitution**: Check if issue relates to core principles
2. **Check Examples**: Look at completed features for patterns
3. **Ask AI Agents**: Provide full context for assistance
4. **Team Discussion**: Use GitHub Discussions for collaboration

---

*For detailed examples of Spec-Kit usage, see the completed feature specifications in the `/specs` directory.*
