# TypeScript Error Triage - Tasks

## Summary
Total TypeScript errors: **46 errors** across the codebase

## Error Categories

### 1. Missing Clerk Auth (TS2304 - Cannot find name 'auth')
- `app/api/admin/plot-blocks/route.ts` (lines 8, 70)
- **Fix**: Import auth from '@clerk/nextjs/server' or create proper auth shim

### 2. Drizzle SQL Count Query Issues (TS2554 - Expected 0 arguments, but got 1)
- `app/api/admin/fandom/[id]/route.ts` (lines 274, 279, 284)
- `app/api/admin/fandom/route.ts` (line 145)
- `app/api/admin/plot-blocks/route.ts` (line 31)
- `app/api/fandom/route.ts` (line 52)
- **Issue**: `sql<number>` template tag called with COUNT(*) expects 0 args
- **Fix**: Use proper Drizzle count() function or fix sql template usage

### 3. Missing 'count' Property (TS2339)
- `app/api/admin/fandom/[id]/route.ts` (lines 296, 297, 298)
- `app/api/admin/fandom/route.ts` (line 135 - fandomAdminAssignments)
- **Issue**: Drizzle query results don't have expected shape
- **Fix**: Properly type query results or use count() aggregate

### 4. Database ID Type Mismatches (TS2769)
- Multiple files with fandom_id issues
- **Root cause**: fandoms.id is `integer` but referenced as `text` in other tables
- **Fix**: Align schema - change fandoms.id to text OR change all foreign keys to integer

### 5. Missing Test Helper Properties (TS2339)
- `extension/tests/integration/submission-flow.test.ts`
  - `toHaveText` on Locator assertions
  - `extractStoryMetadata` on Window
- **Fix**: Add proper Playwright type declarations or test helper types

### 6. Drizzle Insert Type Mismatches (TS2769)
- `src/lib/database/index.ts` (lines 455, 493, 507, 522)
- Missing required fields in insert statements (slug, parent_id, etc.)
- **Fix**: Add missing fields to insert objects

### 7. Date Type Issues (TS2551)
- `src/lib/database/fandom-queries.ts` (lines 259, 260)
- Calling toISOString() on string type
- **Fix**: Ensure dates are Date objects or use proper string handling

## Top Error Files (by count)
1. `extension/tests/integration/submission-flow.test.ts` - 28 errors
2. `src/lib/database/index.ts` - 4 errors
3. `src/lib/database/fandom-queries.ts` - 6 errors
4. `app/api/admin/fandom/[id]/route.ts` - 6 errors
5. `app/api/admin/fandom/route.ts` - 2 errors
6. `app/api/admin/plot-blocks/route.ts` - 3 errors

## Implementation Plan

### Phase A - Schema ID Type Alignment
- Fix fandoms.id type inconsistency (integer vs text)
- Update all foreign key references consistently

### Phase B - Clerk Auth Import
- Add proper Clerk auth import or shim

### Phase C - Drizzle Query Fixes
- Fix sql COUNT queries
- Add missing count() aggregate helpers
- Fix insert statements with missing fields

### Phase D - Test Type Declarations
- Add Playwright helper type declarations
- Fix Window extension types for tests

### Phase E - Date Handling
- Fix date serialization issues in queries
