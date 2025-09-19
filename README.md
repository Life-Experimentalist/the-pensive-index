# 🌟 The Pensieve Index

**Library-first story discovery platform and intelligent prompt generator for fanfiction**

[![Spec-Kit](https://img.shields.io/badge/Built%20with-Spec--Kit-blue.svg)](https://github.com/github/spec-kit)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-13+-black.svg)](https://nextjs.org/)

## 🎯 Vision

The Pensieve Index solves a fundamental problem in fanfiction: **readers can't find stories that match their specific, nuanced tastes, and writers struggle with detailed prompt generation**.

Unlike existing platforms that use basic tags, we provide:

- 🔍 **Library-First Discovery**: Search existing tagged stories with complex criteria before generating new prompts
- 🌳 **Hierarchical Tagging**: Plot blocks with conditional branching (e.g., Goblin Inheritance → Black Lordship → After Sirius Death)
- 🎯 **Dual Output**: Show matching stories AND enhanced prompts with novelty highlights
- 👥 **Community Curation**: Admin-driven content growth with browser extension for story submission

## 🚀 Quick Start

### Prerequisites
- [Node.js 18+](https://nodejs.org/)
- [uv](https://github.com/astral-sh/uv) for Python package management (spec-kit requirement)
- Git and your preferred AI coding agent (Claude, Copilot, Cursor, or Gemini)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/the-pensive-index.git
cd the-pensive-index

# Install dependencies
npm install

# Set up development database
npm run db:setup

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the platform in action.

## 🏗️ Development Workflow

This project follows [Spec-Driven Development](https://github.com/github/spec-kit) using the three-command cycle:

```bash
# 1. Define feature requirements
/specify "Add mobile drag-and-drop pathway builder with validation"

# 2. Create technical implementation plan
/plan "React Native gestures, responsive Tailwind, TypeScript validation"

# 3. Generate ordered implementation tasks
/tasks

# 4. Execute with TDD: Tests → User Approval → Implementation
```

### Core Principles
- **Library-First**: Prioritize existing story discovery over prompt generation
- **Test-First**: TDD mandatory (non-negotiable for validation engine)
- **Responsive Design**: Desktop drag-and-drop + mobile tap-to-select
- **Community Growth**: Admin-curated content with public submission workflow

## 🏛️ Architecture

### Data Hierarchy
```
Fandom (Harry Potter, Percy Jackson)
├── Tags (angst, fluff, harry/hermione)
│   └── Tag Classes (harry-shipping, hermione-shipping)
└── Plot Blocks (Structured Tropes)
    ├── Goblin Inheritance
    │   ├── Black Lordship
    │   │   ├── After Sirius Death
    │   │   │   ├── Black Head of Family
    │   │   │   ├── Slytherin Lordship
    │   │   │   └── Potter Heritage
    │   │   └── Emancipation Route
    │   └── Multiple House Control → Hogwarts Control
    └── Wrong-Boy-Who-Lived
```

### User Journey
1. **Pathway Creation**: User builds story criteria using drag-and-drop or tap-to-select
2. **Library Search**: System searches existing tagged stories with relevance scoring
3. **Dual Output**: Shows matching stories + "Create New Story" prompt with novelty highlights
4. **Story Submission**: Community tags stories via browser extension → GitHub issues → Admin review

## 🛠️ Tech Stack

- **Frontend**: Next.js 13+ (App Router), React 18+, TypeScript 5.x
- **Styling**: Tailwind CSS for responsive design
- **Interactions**: dnd-kit for drag-and-drop functionality
- **Authentication**: NextAuth.js with role-based permissions
- **Database**: Cloudflare D1 (SQLite) for data persistence
- **Deployment**: Cloudflare Pages with edge functions
- **Testing**: React Testing Library, Playwright E2E

## 📱 User Interface

### Desktop (Three-Panel Layout)
- **Selection Panel**: Fandom selector, tag browsers, plot block trees
- **Pathway Builder**: Drag-and-drop canvas with visual connections
- **Output Panel**: Story results + prompt generation with novelty highlights

### Mobile (Responsive Design)
- **Collapsible Panels**: Stack vertically with touch-friendly interactions
- **Tap-to-Select**: Replace drag-and-drop with intuitive tap selection
- **Simplified Validation**: Same engine, streamlined conflict resolution

- **Desktop**: Full three-panel drag-and-drop interface
- **Mobile**: Tap-to-select with collapsible panels
- **Performance**: <200ms validation, <500ms search, 60fps interactions

## 👥 User Roles

### Admin Hierarchy
- **ProjectAdmin**: Manage all fandoms, admin roles, system settings
- **FandomAdmin**: Manage content within assigned fandom(s) only

### Community Features
- **Story Submission**: Public form for submitting story URLs with manual tagging
- **Browser Extension**: Auto-fills GitHub issues with story details and suggested pathways
- **Admin Review**: Manual verification and database addition through admin console

## 🔧 Development Workflow

This project uses [Spec-Kit](https://github.com/specify-dev) for structured development:

```powershell
# Create a new feature
/specify "Add validation engine for plot block conflicts"

# Plan implementation
/plan "TypeScript, React, dnd-kit integration"

# Generate tasks
/tasks

# Execute development tasks
# Follow TDD: Tests → Implementation → Validation
```

## 🏁 Getting Started

### Prerequisites
- Node.js 18+
- PowerShell (Windows) or compatible shell
- Git

### Initial Setup
1. **Clone the repository**
   ```powershell
   git clone https://github.com/Life-Experimentalists/the-pensive-index.git
   cd the-pensive-index
   ```

2. **Install dependencies**
   ```powershell
   npm install
   ```

3. **Set up environment**
   ```powershell
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Initialize database**
   ```powershell
   npm run db:setup
   ```

5. **Run development server**
   ```powershell
   npm run dev
   ```

### Development Commands
```powershell
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run all tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

## 📋 Project Status

- [x] Project initialization and spec framework
- [ ] Core data models (Fandoms, Tags, Plot Blocks)
- [ ] Validation engine with conflict detection
- [ ] Drag-and-drop pathway builder
- [ ] Story search and discovery
- [ ] Admin dashboard
- [ ] Mobile responsive interface
- [ ] Browser extension
- [ ] Performance optimization

## 🤝 Contributing

1. **Feature Development**: Use the `/specify` workflow for new features
2. **Follow TDD**: All features must have tests before implementation
3. **Responsive Design**: Test on both desktop and mobile
4. **Constitution Compliance**: All changes must align with project constitution

## 📚 Documentation

- [Project Documentation](./PROJECT_DOCS.md) - Complete technical overview
- [Constitution](./.specify/memory/constitution.md) - Development principles
- [Spec Templates](./.specify/templates/) - Development workflow templates

## 📄 License

This project is licensed under the MIT License.

## 🔗 Links

- **Documentation**: [PROJECT_DOCS.md](./PROJECT_DOCS.md)
- **Issues**: [GitHub Issues](https://github.com/Life-Experimentalists/the-pensive-index/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Life-Experimentalists/the-pensive-index/discussions)

---

> Built with ❤️ by the [Life Experimentalists](https://github.com/Life-Experimentalists) team


---

specs

You're absolutely right! Let's get the core functionality working first before adding crossover complexity. Here's the proper sequence:

## Corrected Development Sequence

### **Phase 1: Core Admin System (Spec 004 - Simplified)**

```powershell
/specify "Build a hierarchical admin system with Project Admins who can create fandoms and assign Fandom Admins, plus Fandom Admins who manage their specific fandom content. Project Admins have global permissions to create/edit fandoms, assign admin roles, and access all validation rules. Fandom Admins can only manage tags, plot blocks, validation rules, and story submissions for their assigned fandoms. Include role-based access control, admin invitation system, and audit logging for all admin actions. Focus on single-fandom management first."
```

### **Phase 2: Fandom Content Management (Spec 005 - Simplified)**

```powershell
/specify "Create a modular fandom creation system where Project Admins can add new fandoms with custom taxonomies, and Fandom Admins can populate them with tags, plot blocks, characters, and validation rules. Support fandom templates for common genres, bulk import/export of fandom content, and hierarchical content organization. Include content approval workflows, version control for fandom data, and automated content validation to ensure data integrity. Single-fandom focus only."
```

### **Phase 3: Public User Interface (Spec 006)**

```powershell
/specify "Build the main public-facing story discovery interface that allows anonymous users to browse fandoms, build story pathways using drag-and-drop (desktop) or tap-to-select (mobile), and discover existing stories or generate new story prompts. Implement the library-first approach with relevance scoring, advanced filtering, responsive design, real-time pathway validation, and dual output showing matching stories plus create-new-story prompts with novelty highlights. Single-fandom stories only."
```

### **Phase 4: Community Features (Spec 007)**

```powershell
/specify "Implement the community-driven story submission system with browser extension integration, GitHub Issues workflow, and moderation queue. Users can submit stories via browser extension from AO3/FFN, admins review submissions through GitHub Issues, and approved stories automatically integrate into the database. Include submission validation, duplicate detection, tag suggestion AI, automated quality scoring, and community feedback mechanisms."
```

### **Phase 5: Performance & Polish (Spec 008)**

```powershell
/specify "Optimize the platform for production scale with caching strategies, database indexing, API rate limiting, and CDN integration. Implement search result caching, validation rule caching, story metadata caching, and real-time invalidation. Add performance monitoring, analytics tracking, error reporting, and automated scaling for high-traffic scenarios."
```

### **Phase 6: Crossover Support (Spec 009 - Future)**

```powershell
/specify "Extend the platform with crossover fanfiction support, allowing stories that combine multiple fandoms. Add crossover relationship management, cross-fandom validation rules, shared concept mappings, and crossover-specific pathway building. Include crossover templates, conflict resolution systems, and enhanced search for crossover content."
```

## Why This Sequence Makes Sense:

### **Phase 1-2: Admin Foundation**
- Get basic admin roles working
- Create/manage fandoms
- Add tags, plot blocks, validation rules
- **Test with 1-2 fandoms (Harry Potter, Percy Jackson)**

### **Phase 3: User Interface**
- Build the public story discovery interface
- Pathway builder (drag-and-drop)
- Search and filtering
- **Test with real users on single fandoms**

### **Phase 4: Community**
- Story submission workflow
- Moderation tools
- **Grow content organically**

### **Phase 5: Production Ready**
- Performance optimization
- Monitoring and analytics
- **Handle real traffic**

### **Phase 6: Advanced Features**
- Add crossover support once core is solid
- **Complex feature on stable foundation**

## Immediate Benefits:

1. **Working System Faster**: You'll have a usable platform after Phase 3
2. **User Feedback**: Real users can test single-fandom functionality
3. **Proven Architecture**: Crossovers build on tested foundation
4. **Reduced Complexity**: Easier to debug without crossover interactions
5. **Progressive Enhancement**: Each phase adds value

## Current Focus:

Start with **Spec 004** (basic admin system) and get:
- Project Admin dashboard working
- Fandom creation
- Basic role management
- Simple tag/plot block management

Then move to **Spec 006** (user interface) to get:
- Public story discovery
- Pathway building
- Search functionality

This gives you a **Minimum Viable Product** that users can actually use and provide feedback on, before adding the complexity of crossover management.

Should we proceed with the simplified Spec 004 first?