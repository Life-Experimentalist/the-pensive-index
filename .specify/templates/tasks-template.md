# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **The Pensieve Index**: Next.js web application structure
- **Components**: `src/components/`, `tests/components/`
- **API Routes**: `app/api/`, `tests/api/`
- **Validation Engine**: `src/lib/validation/`, `tests/validation/`
- **UI Tests**: `tests/e2e/` for Playwright, `tests/components/` for unit tests
- Paths shown below assume Next.js app directory structure

## Phase 3.1: Setup
- [ ] T001 Create Next.js project structure with app directory and TypeScript
- [ ] T002 Install dependencies: Next.js, React, Tailwind CSS, dnd-kit, NextAuth.js, Cloudflare D1
- [ ] T003 [P] Configure ESLint, Prettier, and TypeScript strict mode

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T004 [P] Validation engine test for Plot Block conflicts in tests/validation/test_conflicts.ts
- [ ] T005 [P] Drag-and-drop component test in tests/components/test_pathway_builder.tsx
- [ ] T006 [P] Fandom API route test in tests/api/test_fandoms.ts
- [ ] T007 [P] Admin authentication test in tests/integration/test_admin_auth.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [ ] T008 [P] Fandom model in src/types/fandom.ts
- [ ] T009 [P] Tag and Plot Block models in src/types/content.ts
- [ ] T010 [P] Validation engine core in src/lib/validation/engine.ts
- [ ] T011 Pathway builder drag-and-drop component in src/components/drag-drop/PathwayBuilder.tsx
- [ ] T012 Story search API route in app/api/stories/search/route.ts
- [ ] T013 Admin dashboard authentication middleware
- [ ] T014 Responsive mobile interface components

## Phase 3.4: Integration
- [ ] T015 Connect validation engine to UI with real-time feedback
- [ ] T016 Integrate Cloudflare D1 database with API routes
- [ ] T017 NextAuth.js configuration for admin roles
- [ ] T018 GitHub Issues integration for story submissions

## Phase 3.5: Polish
- [ ] T019 [P] Performance tests for validation engine (<200ms) in tests/performance/
- [ ] T020 [P] E2E tests for complete user workflows in tests/e2e/
- [ ] T021 [P] Update documentation in docs/
- [ ] T022 Accessibility testing and improvements
- [ ] T023 Mobile responsiveness validation across devices

## Dependencies
- Tests (T004-T007) before implementation (T008-T014)
- T008 blocks T009, T015
- T016 blocks T018
- Implementation before polish (T019-T023)

## Parallel Example
```
# Launch T004-T007 together:
Task: "Contract test POST /api/users in tests/contract/test_users_post.py"
Task: "Contract test GET /api/users/{id} in tests/contract/test_users_get.py"
Task: "Integration test registration in tests/integration/test_registration.py"
Task: "Integration test auth in tests/integration/test_auth.py"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task
- Avoid: vague tasks, same file conflicts

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - Each contract file → contract test task [P]
   - Each endpoint → implementation task

2. **From Data Model**:
   - Each entity → model creation task [P]
   - Relationships → service layer tasks

3. **From User Stories**:
   - Each story → integration test [P]
   - Quickstart scenarios → validation tasks

4. **Ordering**:
   - Setup → Tests → Models → Services → Endpoints → Polish
   - Dependencies block parallel execution

## Validation Checklist
*GATE: Checked by main() before returning*

- [ ] All contracts have corresponding tests
- [ ] All entities have model tasks
- [ ] All tests come before implementation
- [ ] Parallel tasks truly independent
- [ ] Each task specifies exact file path
- [ ] No task modifies same file as another [P] task