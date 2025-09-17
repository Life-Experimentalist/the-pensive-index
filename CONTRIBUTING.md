# Contributing to The Pensieve Index

Thank you for your interest in contributing to The Pensieve Index! This document provides guidelines for contributing to our library-first story discovery platform.

## 🏗️ Development Philosophy

This project follows **Spec-Driven Development** using [Spec-Kit](https://github.com/github/spec-kit). All features go through a structured three-phase workflow:

1. **`/specify`** - Define user requirements and acceptance criteria
2. **`/plan`** - Create technical implementation approach
3. **`/tasks`** - Generate ordered, testable implementation tasks

## 🎯 Core Principles

Before contributing, please familiarize yourself with our [Constitution](./.specify/memory/constitution.md):

- **Library-First**: Prioritize existing story discovery over prompt generation
- **Test-First**: TDD mandatory (non-negotiable for validation engine)
- **Responsive Design**: Desktop drag-and-drop + mobile tap-to-select
- **Community Growth**: Admin-curated content with public submission workflow

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- [uv](https://github.com/astral-sh/uv) for Python package management (spec-kit requirement)
- Your preferred AI coding agent (Claude, Copilot, Cursor, or Gemini)

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/your-username/the-pensive-index.git
cd the-pensive-index

# Install dependencies
npm install

# Set up development environment
cp .env.example .env.local
# Edit .env.local with your configuration

# Initialize database
npm run db:setup

# Start development server
npm run dev
```

## 📋 Types of Contributions

### 🆕 New Features

All new features must follow the spec-kit workflow:

```bash
# 1. Create feature branch following spec-kit naming
git checkout -b 001-feature-name

# 2. Use spec-kit commands to develop the feature
/specify "Detailed description of what the feature should do"
/plan "Technical approach and implementation details"
/tasks "Generate ordered implementation tasks"

# 3. Implement following TDD principles
# Tests written → User approval → Tests fail → Implementation → Tests pass
```

**Feature Requirements:**
- Must align with library-first principle
- Requires comprehensive validation engine tests
- Must work on both desktop and mobile
- Performance requirements: <200ms validation, <500ms search

### 🐛 Bug Fixes

1. **Create reproduction test case** that demonstrates the bug
2. **Fix the implementation** while ensuring existing tests still pass
3. **Verify the fix** resolves the issue without breaking other functionality
4. **Update documentation** if the bug was related to unclear behavior

### 📖 Documentation

- Update [PROJECT_DOCS.md](./PROJECT_DOCS.md) for technical changes
- Update README.md for user-facing changes
- Add code comments for complex validation logic
- Update spec templates if workflow changes

### 🧪 Testing

We require comprehensive test coverage, especially for:

- **Validation Engine**: Complex rule combinations and tree dependencies
- **Drag-and-Drop**: Desktop and mobile interaction patterns
- **Story Search**: Relevance scoring and pathway matching
- **Admin Functions**: Role-based permissions and content management

## 🔧 Development Workflow

### Branch Naming

Follow spec-kit conventions:
- Feature branches: `001-feature-name`, `002-another-feature`
- Bug fixes: `fix-validation-error-handling`
- Documentation: `docs-update-api-reference`

### Commit Messages

```bash
# Good commit messages
feat: add drag-and-drop pathway builder for desktop
fix: resolve validation conflict resolution modal display
test: add comprehensive plot block tree dependency tests
docs: update constitution with responsive design requirements

# Include implementation details when relevant
feat: implement mobile tap-to-select pathway builder

- Replace drag-and-drop with touch-friendly tap interface
- Maintain same validation engine for consistency
- Add collapsible panels for mobile layout
- Performance tested on modern mobile devices
```

### Pull Request Process

1. **Ensure all tests pass**: `npm run test && npm run test:e2e`
2. **Check code quality**: `npm run lint && npm run type-check`
3. **Verify responsive design**: Test on both desktop and mobile
4. **Include spec artifacts**: If using spec-kit, include generated specs/plans/tasks
5. **Update documentation**: Ensure relevant docs are updated
6. **Request review**: Tag relevant maintainers based on changed areas

### Code Standards

#### TypeScript
```typescript
// ✅ Good: Strict typing, proper interfaces
interface PlotBlock {
  id: string;
  fandomId: string;
  name: string;
  parentBlockId?: string;
  conditions?: PlotBlockCondition[];
}

// ❌ Avoid: any types, loose typing
const plotBlock: any = { /* ... */ };
```

#### React Components
```typescript
// ✅ Good: Functional components with proper TypeScript
interface PathwayBuilderProps {
  fandomId: string;
  onPathwayChange: (pathway: StoryPathway) => void;
}

export function PathwayBuilder({ fandomId, onPathwayChange }: PathwayBuilderProps) {
  // Component implementation
}

// ❌ Avoid: Class components, missing prop types
export function PathwayBuilder(props) {
  // Implementation
}
```

#### Validation Rules
```typescript
// ✅ Good: Comprehensive test coverage for validation
describe('ValidationEngine', () => {
  it('should require harem tag when multiple shipping tags for same character', () => {
    const pathway = {
      tags: ['harry/hermione', 'harry/daphne'],
      plotBlocks: []
    };

    const result = validatePathway(pathway);

    expect(result.conflicts).toContain({
      type: 'conditional_requirement',
      message: 'Multiple Harry shipping tags require "harem" tag',
      suggestedFix: 'Add "harem" tag to pathway'
    });
  });
});
```

## 🎨 UI/UX Guidelines

### Responsive Design
- **Desktop**: Full three-panel layout with drag-and-drop
- **Mobile**: Collapsible panels with tap-to-select
- **Performance**: 60fps interactions on modern devices
- **Accessibility**: Keyboard navigation and screen reader support

### Validation Experience
- **During Selection**: No blocking - users can select impossible combinations
- **On "Finish"**: Show validation modal with clear conflict explanations
- **Conflict Resolution**: Provide one-click fixes and "proceed anyway" option

### Story Discovery
- **Library First**: Always search existing stories before showing prompts
- **Dual Output**: Show both matching stories AND create new story option
- **Novelty Highlights**: Emphasize unique aspects in new story prompts

## 🔍 Testing Guidelines

### Test Types Required

1. **Unit Tests**: All validation rules, utility functions
2. **Component Tests**: React components with user interactions
3. **Integration Tests**: Complete user workflows (pathway creation → search → results)
4. **E2E Tests**: Critical paths including admin workflows

### Test Organization
```
tests/
├── unit/              # Pure function tests
├── components/        # React component tests
├── integration/       # User workflow tests
├── e2e/              # Playwright end-to-end tests
└── validation/       # Comprehensive validation engine tests
```

### Example Test Structure
```typescript
// Component test example
describe('PathwayBuilder', () => {
  it('should allow dragging plot blocks to pathway', async () => {
    render(<PathwayBuilder fandomId="harry-potter" onPathwayChange={mockFn} />);

    const plotBlock = screen.getByText('Goblin Inheritance');
    const pathwayArea = screen.getByTestId('pathway-canvas');

    await user.dragAndDrop(plotBlock, pathwayArea);

    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        plotBlocks: expect.arrayContaining([
          expect.objectContaining({ name: 'Goblin Inheritance' })
        ])
      })
    );
  });
});
```

## 📦 Release Process

1. **Feature Complete**: All spec-kit phases completed (specify → plan → tasks → implementation)
2. **Quality Gates**: All tests pass, performance requirements met
3. **Documentation Updated**: README, PROJECT_DOCS, and relevant guides
4. **Constitution Compliance**: Feature aligns with core principles
5. **Review Approval**: At least one maintainer approval required

## 🚫 What We Don't Accept

- Features that bypass library-first principle
- Code without comprehensive tests (especially validation logic)
- Breaking changes to existing validation rules without migration plan
- Desktop-only features without mobile consideration
- Any changes that violate our [Constitution](./.specify/memory/constitution.md)

## ❓ Questions?

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions about contributing or architecture
- **Spec-Kit Documentation**: For questions about the development workflow

## 🏆 Recognition

Contributors who follow our spec-driven development process and maintain high code quality will be recognized in:

- README.md acknowledgments
- Release notes for significant contributions
- Project documentation for major features

---

Thank you for helping make The Pensieve Index the best fanfiction discovery platform possible! 🌟
