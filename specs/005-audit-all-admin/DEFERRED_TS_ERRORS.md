# Deferred TypeScript Errors

## Schema Type Mismatch: fandoms.id (INTEGER vs TEXT)

### Root Cause
The database schema has an inherent type mismatch:
- Migration SQL defines: `fandoms.id INTEGER PRIMARY KEY AUTOINCREMENT`
- Other tables reference it as: `fandom_id TEXT` with `FOREIGN KEY (fandom_id) REFERENCES fandoms(id)`

SQLite allows this due to its flexible type system, but Drizzle ORM's strict TypeScript typing flags this as an error.

### Current State
- Schema kept as `fandoms.id: integer()` to match migration
- Foreign key columns use `text()` for fandom_id references
- Queries use `CAST(fandoms.id AS TEXT)` or `String(fandomId)` conversions as needed
- API routes parse fandom ID strings to integers with `parseInt()`

### Affected Files (Examples)
- `src/lib/database/schema.ts` - fandoms table and all foreign key references
- `app/api/admin/fandom/[id]/route.ts` - Uses parseInt() for route params
- `app/api/v1/fandom/[fandomId]/validate/route.ts` - Converts between string/int
- `src/lib/database/fandom-queries.ts` - Wraps ID parsing

### Errors Remaining
Approximately 600+ cascading type errors from this mismatch, including:
- eq() type mismatches when comparing INTEGER to TEXT
- Insert statement type errors
- Model type inconsistencies

### Recommended Long-term Fix
**Option A (Preferred)**: Update migration to make fandoms.id TEXT with UUID
- Change migration: `id TEXT PRIMARY KEY` 
- Remove autoincrement
- Generate UUIDs in application code (matches pattern used in other tables)
- Update seed data to use UUIDs instead of letting DB generate IDs

**Option B**: Make all fandom_id foreign keys use INTEGER
- Change all fandom_id columns in schema from `text()` to `integer()`
- This is more invasive and doesn't match the pattern of other tables

### Why Deferred
- Requires migration changes and data migration
- Affects 20+ files across the codebase  
- Risk of breaking existing database instances
- Needs coordinated deployment plan

---

## Test Type Issues

### Playwright Test Errors
File: `extension/tests/integration/submission-flow.test.ts`

#### Missing Source Files (Cannot find module)
- `../../../src/background/message-handler`
- `../../../src/content/content-script`
- `../../../src/popup/popup-controller`

**Cause**: Extension source files not present or paths incorrect
**Impact**: ~3 errors
**Fix**: Either add extension source or exclude these tests from type-check

#### Playwright API Mismatches
- `toHaveText` not recognized on Locator assertions (~2 errors)
- `setOfflineMode`, `runtime`, `browser` properties not found (~3 errors)  
- RegExp passed where string expected for assertions (~5 errors)
- BrowserContext 'args' option (~1 error)
- Window extensions (extractStoryMetadata, etc.) (~5 errors)

**Cause**: Playwright version or test helper type mismatch
**Impact**: ~16 errors
**Fix**: Add proper Playwright type declarations or update @playwright/test version

### Total Test Errors: ~24 errors

---

## Missing Module/Exports

### API Constants
- `@/lib/constants/api-endpoints` not found
- Used in: `src/hooks/useCachedApi.ts`
- **Fix**: Create the missing constants file or update import

### Schema Exports  
- `fandomAdminAssignments` table doesn't exist in schema
- Used in: `app/api/admin/fandom/route.ts` (removed in interim fix)
- **Fix**: Either create the table or remove references

---

## Type Interface Mismatches

### Validation Types
Multiple files in `src/lib/services/pathway-validation.ts`:
- ValidationWarning doesn't have 'id' or 'severity' properties (~8 errors)
- PlotBlock missing 'dependencies' property (~4 errors)
- Severity type mismatch: "critical"|"high"|"medium"|"low" vs "error"|"warning"|"info" (~6 errors)

**Fix**: Update type definitions to match usage or vice versa

### Model Mismatches
- PlotBlock.category: `string | null` vs `string | undefined` mismatch
- SearchResult type not exported from @/types
- Tag/PlotBlock missing storyCount property

**Fix**: Align type definitions with schema/usage

---

## SQL Query Type Issues

### COUNT Queries
Already mostly fixed - changed `sql<number>` to `sql`

Remaining: Result destructuring expects 'count' property but Drizzle doesn't infer it
- Example: `const [tagCount] = await db.select({ count: sql\`COUNT(*)\` })`
- tagCount type doesn't have .count property

**Fix**: Properly type the query result or use Drizzle's count() aggregate function

---

## Summary Statistics
- **Total errors before triage**: 737 (reported in issue)
- **After initial shims**: 46 errors
- **After schema revert and fixes**: ~709 errors (mostly cascading from schema mismatch)
- **Core unique issues**: ~10-15 distinct root causes

## Recommendation
The fandoms.id schema mismatch creates too many cascading errors to fix surgically. Recommend:
1. Create a migration to standardize fandoms.id as TEXT/UUID
2. Run migration in development and staging
3. Update all affected code in a coordinated PR
4. For now, use `@ts-ignore` or `@ts-expect-error` with comments on the most critical code paths
