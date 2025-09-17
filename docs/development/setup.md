# Development Setup Guide

This guide will help you set up a local development environment for The Pensieve Index.

## Prerequisites

Before starting, ensure you have:

- **Node.js 18+** and npm
- **Git** for version control
- **PowerShell** (Windows) or compatible shell
- **AI Coding Agent**: Claude, GitHub Copilot, Cursor, or Gemini
- **uv** for Python package management (Spec-Kit requirement)

## Quick Setup

### 1. Clone and Install

```powershell
# Clone the repository
git clone https://github.com/Life-Experimentalists/the-pensive-index.git
cd the-pensive-index

# Install dependencies
npm install

# Install additional development dependencies
npm install -D @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-config-prettier
```

### 2. Environment Configuration

```powershell
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your configuration
# Add your database URL, authentication secrets, etc.
```

### 3. Database Setup

```powershell
# Initialize development database
npm run db:setup

# Run migrations
npm run db:migrate

# Seed with sample data
npm run db:seed
```

### 4. Start Development Server

```powershell
# Start the development server
npm run dev

# In another terminal, run tests in watch mode
npm run test:watch
```

Visit `http://localhost:3000` to see the application.

## Development Workflow

### Spec-Kit Development Cycle

This project follows [Spec-Driven Development](https://github.com/github/spec-kit):

```powershell
# 1. Create feature specification
/specify "Your feature description here"

# 2. Create implementation plan
/plan "Technical details and approach"

# 3. Generate implementation tasks
/tasks

# 4. Execute tasks following TDD principles
```

### Branch Management

```powershell
# Feature branches are automatically created by spec-kit
# Format: 001-feature-name, 002-another-feature

# Check current branch
git branch

# Switch between feature branches
git checkout 001-data-models
git checkout 002-validation-engine
```

### Test-Driven Development

Our constitution requires TDD for all features:

```powershell
# 1. Write failing tests first
npm run test -- tests/validation/rules.test.ts

# 2. Get user/reviewer approval on tests

# 3. Implement code to make tests pass
npm run test -- tests/validation/rules.test.ts --run

# 4. Refactor while keeping tests green
```

## Development Commands

### Core Commands

```powershell
# Development server
npm run dev              # Start with hot reload
npm run build           # Production build
npm run start           # Start production server

# Testing
npm run test            # Run all tests
npm run test:watch      # Watch mode for development
npm run test:e2e        # End-to-end tests
npm run test:coverage   # Coverage report

# Code Quality
npm run lint            # ESLint checking
npm run lint:fix        # Auto-fix ESLint issues
npm run type-check      # TypeScript validation
```

### Database Commands

```powershell
# Database management
npm run db:setup        # Initial setup
npm run db:migrate      # Run migrations
npm run db:seed         # Seed sample data
npm run db:reset        # Reset and reseed
```

### Spec-Kit Commands

```powershell
# Feature development workflow
npm run specify         # Create specification
npm run plan           # Generate plan
npm run tasks          # Create tasks
```

## Project Structure

```
the-pensive-index/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Auth route groups
│   ├── api/               # API routes
│   ├── admin/             # Admin pages
│   └── globals.css        # Global styles
├── src/
│   ├── components/        # React components
│   │   ├── ui/           # Base components
│   │   ├── drag-drop/    # Drag-and-drop
│   │   └── admin/        # Admin components
│   ├── lib/              # Utility libraries
│   │   ├── database/     # Database utilities
│   │   ├── validation/   # Validation engine
│   │   └── auth/         # Authentication
│   ├── types/            # TypeScript definitions
│   └── hooks/            # Custom React hooks
├── tests/                 # Test suites
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   ├── e2e/              # End-to-end tests
│   └── fixtures/         # Test data
├── docs/                  # Documentation
├── .specify/             # Spec-kit configuration
└── specs/                # Feature specifications
    ├── 001-data-models/  # Feature specs
    └── 002-validation/   # Implementation plans
```

## Configuration Files

### TypeScript Configuration

The project uses strict TypeScript configuration:

```json
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  }
}
```

### ESLint Rules

Key linting rules for code quality:

- No `any` types allowed
- Explicit function return types preferred
- Unused variables are errors
- TypeScript-specific rules enabled

### Testing Configuration

Tests use Vitest with React Testing Library:

```javascript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts']
  }
});
```

## Development Best Practices

### Code Standards

1. **TypeScript**: Use strict mode, no `any` types
2. **Components**: Functional components with proper TypeScript
3. **Styling**: Tailwind CSS with responsive design
4. **Testing**: Comprehensive coverage, especially for validation

### Git Workflow

```powershell
# Always work on feature branches
git checkout -b 003-new-feature

# Commit frequently with descriptive messages
git commit -m "feat: add validation rule for plot block conflicts"

# Push feature branches for collaboration
git push origin 003-new-feature

# Create pull request when ready
```

### Performance Guidelines

- Validation engine: < 200ms for complex rules
- Story search: < 500ms for queries
- Mobile interactions: 60fps target
- Desktop drag-and-drop: Smooth visual feedback

## Troubleshooting

### Common Setup Issues

**Node.js Version Conflicts**
```powershell
# Check Node.js version
node --version  # Should be 18+

# Use nvm if available
nvm use 18
```

**Database Connection Issues**
```powershell
# Check database URL in .env.local
# Ensure Cloudflare D1 is properly configured
# Verify migration files exist
```

**Test Failures**
```powershell
# Clear test cache
npm run test -- --clearCache

# Run specific test file
npm run test -- tests/specific/file.test.ts

# Debug test with verbose output
npm run test -- --verbose
```

### Getting Help

- **GitHub Issues**: Report development problems
- **Spec-Kit Docs**: Check spec-kit documentation
- **Team Discussion**: Use GitHub Discussions
- **Constitution**: Review development principles

## Next Steps

1. **Read the Constitution**: Understand our development principles
2. **Explore Existing Code**: Look at current implementations
3. **Run Tests**: Ensure everything works locally
4. **Pick a Task**: Check current feature tasks in `/specs`
5. **Follow TDD**: Write tests before implementing

---

*Remember: We're library-first, test-first, and community-driven. Happy coding!*
