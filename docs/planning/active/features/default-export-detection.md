# Default Export Detection Fix - Implementation Plan

**Status:** Ready for Implementation
**Priority:** High (blocks real-world Express app analysis)
**Complexity:** Low (focused parser change)
**Estimated effort:** 2-3 hours

---

## Problem Statement

**Code Review Status:** ✅ Approved with Minor Revisions (2025-11-08)
**Review Document:** `docs/reviews/phase6/features/default-export-detection-plan-review.md`

The parser currently fails to detect **separate default exports**, where an entity is declared first and exported later:

```javascript
const router = express.Router();  // Declaration (line 1)
// ... 3000 lines of code ...
export default router;             // Export (line 3000) ← NOT DETECTED
```

This pattern is extremely common in real-world Express applications and other Node.js code. The parser only detects **inline exports**:

```javascript
export const usersRouter = Router();  // ✅ Works
export function handler() {}          // ✅ Works
```

**Impact:** ceps cannot document the primary API surface of most Express applications.

---

## Root Cause Analysis

### Current Behavior

The parser checks for exports **at declaration time only**:

1. **Functions** (line 34): `const isExported = func.isExported();`
2. **Classes** (line 173): `const isExported = cls.isExported();`
3. **Variables** (line 357-358): Checks if grandparent is an exported VariableStatement

This works for inline exports but misses separate export statements.

### ts-morph API Discovery

Testing revealed the correct API:

```javascript
// For: export default router;
const assignments = sourceFile.getExportAssignments();
assignments.forEach(a => {
  const expr = a.getExpression();  // Returns Identifier("router")
  const name = expr.getText();     // "router"
});
```

**Key findings:**
- `getExportAssignments()` returns `export default X` statements
- Expression gives us the identifier being exported
- Inline default exports (`export default function foo() {}`) already work via `isDefaultExport()`

---

## Solution Design

### Algorithm

Add a **post-processing pass** at the end of `extract()` (before line 640 return statement):

```
1. Call sourceFile.getExportAssignments()
2. For each assignment:
   a. Get the expression (identifier being exported)
   b. Look up entity by name in already-extracted entities array
   c. If found, mark entity.exported = true and visibility = 'public'
   d. Handle default export naming (entity becomes the module's default)
```

### Implementation Location

File: `src/parser/fact-extractor.ts`
Insert: After line 637 (after module-scope calls), before line 640 (return statement)

### Edge Cases

1. **Non-identifier exports**: `export default class {}` (inline) - already handled by `isExported()`
2. **Re-exports**: `export { foo } from './bar'` - already handled by `getExportDeclarations()` (creates relations only)
3. **Named exports**: `export { router as default }` - will be caught by `getExportAssignments()`
4. **Multiple entities with same name**: Use entity array lookup (first match wins)
5. **Export of non-existent identifier**: No-op (entity not found, no update)

### Entity Schema Fields (exported vs visibility)

Per `src/kb/models.ts:53-61`, Entity has both fields:
- `exported?: boolean` - Syntactic fact: entity has export keyword
- `visibility?: 'public' | 'internal'` - Semantic meaning: part of API surface

**Relationship:** These are separate but related. An entity can be:
- `exported: true, visibility: 'public'` - Typical exported entity (what we're adding)
- `exported: false, visibility: 'internal'` - Typical internal entity
- Future: Could support `exported: false, visibility: 'public'` for inferred API surface

Both fields should be set together when marking an entity as exported.

---

## Implementation Steps

### Step 1: Add Default Export Processing (TDD)

**Test first** (Red):

```typescript
// File: tests/unit/parser/fact-extractor.test.ts

it('should mark separate default exports as exported', () => {
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile(
    'test.ts',
    `
    const router = express.Router();
    export default router;
    `
  );

  const extractor = new FactExtractor();
  const result = extractor.extract(sourceFile, 'test.ts');

  const routerEntity = result.entities.find(e => e.name === 'router');
  expect(routerEntity).toBeDefined();
  expect(routerEntity?.exported).toBe(true);
  expect(routerEntity?.visibility).toBe('public');
});
```

**Implementation** (Green):

```typescript
// File: src/parser/fact-extractor.ts
// Insert after line 637, before return statement

// Process default exports (export default X)
sourceFile.getExportAssignments().forEach((assignment) => {
  if (!assignment.isExportEquals()) {
    const expr = assignment.getExpression();

    // Only handle identifier exports (e.g., "export default router")
    // Inline exports (e.g., "export default function foo() {}")
    // are already handled by isExported() checks
    if (Node.isIdentifier(expr)) {
      const exportedName = expr.getText();

      // Find the entity in already-extracted entities
      const entity = entities.find(e => e.name === exportedName);

      if (entity) {
        // Mark as exported
        entity.exported = true;
        entity.visibility = 'public';

        // Add a fact indicating this is the default export
        // Naming convention verified: follows existing boolean patterns
        // (is-function, is-class, is-method, is-constant, is-async)
        const entityFactSet = factSets.find(fs => fs.id === `${entity.id}-facts`);
        if (entityFactSet) {
          entityFactSet.facts.push({
            subjectId: entity.id,
            predicate: 'is-default-export',
            object: true,
          });
        }
      }
    }
  }
});

return { entities, relations, factSets };
```

### Step 2: Add Named Export Processing

**Current Gap:** The parser's `getExportDeclarations()` (line 337) only processes **re-exports** (`export { foo } from './bar'`), which create relations but don't mark entities as exported. Local named exports (`export { foo, bar }`) are not handled at all.

**This step closes that gap** by processing local named exports.

**Test:**

```typescript
it('should mark separate named exports as exported', () => {
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile(
    'test.ts',
    `
    const helper = () => 'test';
    const utils = { foo: 1 };
    export { helper, utils };
    `
  );

  const extractor = new FactExtractor();
  const result = extractor.extract(sourceFile, 'test.ts');

  const helperEntity = result.entities.find(e => e.name === 'helper');
  const utilsEntity = result.entities.find(e => e.name === 'utils');

  expect(helperEntity?.exported).toBe(true);
  expect(utilsEntity?.exported).toBe(true);
});
```

**Implementation:**

```typescript
// Also process named exports (export { foo, bar })
sourceFile.getExportDeclarations().forEach((exportDecl) => {
  // Skip re-exports (export { foo } from './bar')
  if (exportDecl.getModuleSpecifier()) {
    return;
  }

  // Process named exports (export { foo, bar })
  exportDecl.getNamedExports().forEach((namedExport) => {
    const name = namedExport.getName();
    const entity = entities.find(e => e.name === name);

    if (entity) {
      entity.exported = true;
      entity.visibility = 'public';
    }
  });
});
```

### Step 3: Integration Test with Express Router

**Test:**

```typescript
// File: tests/integration/express-router-export.test.ts

import { describe, it, expect } from 'vitest';
import { Project } from 'ts-morph';
import { FactExtractor } from '../../src/parser/fact-extractor';
import { KnowledgeBase } from '../../src/kb/knowledge-base';
import { ExpressRouterPattern } from '../../src/reasoning/patterns/express/router';

describe('Express Router with Default Export', () => {
  it('should detect and document exported router', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'routes.js',
      `
      import express from 'express';
      const router = express.Router();

      router.get('/users', (req, res) => {
        res.json({ users: [] });
      });

      export default router;
      `
    );

    // Extract entities
    const extractor = new FactExtractor();
    const result = extractor.extract(sourceFile, 'routes.js');

    // Verify router is marked as exported
    const routerEntity = result.entities.find(e => e.name === 'router');
    expect(routerEntity).toBeDefined();
    expect(routerEntity?.exported).toBe(true);

    // Verify Express pattern matches
    const kb = new KnowledgeBase();
    result.entities.forEach(e => kb.insertEntity(e));
    result.factSets.forEach(fs => kb.insertFactSet(fs));

    const pattern = new ExpressRouterPattern();
    expect(pattern.matches(kb, routerEntity!)).toBe(true);

    const chunks = pattern.describe(kb, routerEntity!);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].textDraft).toContain('Express Router');
    expect(chunks[0].textDraft).toContain('GET /users');

    // Verify the is-default-export fact was added (Issue 4 from code review)
    const routerFactSet = result.factSets.find(fs => fs.id === `${routerEntity!.id}-facts`);
    expect(routerFactSet).toBeDefined();
    const defaultExportFact = routerFactSet?.facts.find(f => f.predicate === 'is-default-export');
    expect(defaultExportFact).toBeDefined();
    expect(defaultExportFact?.object).toBe(true);
  });
});
```

### Step 4: Update Fixtures, Documentation, and Verification

#### 4a. Update tiny-express Fixture

**File:** `tests/fixtures/tiny-express/src/routes/default-export.js` (new file)

Create a test file demonstrating the default export pattern:

```javascript
import { Router } from 'express';

const apiRouter = Router();

apiRouter.get('/status', (req, res) => {
  res.json({ status: 'ok' });
});

export default apiRouter;  // ← This is what we're testing
```

**Expected spec:** `tests/fixtures/tiny-express/src/routes/spec.md` should now include:

```markdown
### apiRouter

**Visibility:** Public (exported)

**Behavior:**

- Express Router apiRouter that defines HTTP route handlers. Routes: GET /status.
```

**Note:** The `tiny-express` fixture does not use snapshots (unlike `phase5/baseline/tiny-react`), so no snapshot regeneration is needed.

#### 4b. Update CTS-05 Documentation (Issue 3 from code review)

**File:** `CTS-05_Static_Analysis_and_Pattern_Detection.md`

Add to § Export Detection (or create if not exists):

```markdown
### Export Detection

The parser detects exports using multiple strategies:

1. **Inline exports** (at declaration): `export function foo() {}`
   - Detected via `isExported()` method on AST nodes
2. **Separate default exports**: `const x = 1; export default x;`
   - Detected via `getExportAssignments()` post-processing pass
3. **Separate named exports**: `const x = 1; export { x };`
   - Detected via `getExportDeclarations()` post-processing pass
4. **Re-exports**: `export { foo } from './bar';`
   - Creates relations (tracked separately from entity export status)

**Implementation:** See `src/parser/fact-extractor.ts`, lines 640-670.
```

#### 4c. Verify All Tests Pass

```bash
# Run full test suite
npm test

# Verify no regressions
# Expected: 1155+ tests passing (we're adding new tests)
# Expected: Coverage ≥93% maintained
```

---

## Testing Strategy

### Unit Tests (TDD)

✅ **Test file:** `tests/unit/parser/fact-extractor.test.ts`

Add test cases for:
1. Default export of identifier (`export default router`)
2. Named exports (`export { foo, bar }`)
3. Mixed exports (both named and default in same file)
4. Export of function (ensure no regression)
5. Export of class (ensure no regression)

### Integration Tests

✅ **Test file:** `tests/integration/express-router-export.test.ts`

Verify end-to-end:
1. Parser extracts entity
2. Entity marked as exported
3. Express pattern matches
4. Spec generator includes it

### Fixture Validation

Update or add fixtures:
- `tests/fixtures/tiny-express/src/routes/` - add default export example
- Regenerate expected specs
- Ensure golden tests pass

### Manual Verification

Test against real-world code:
```bash
npm start output-test -- --llm off --no-snapshot
# Should now document the router with all 22 routes
```

---

## Expected Behavior Changes

### Before Fix

**Output:** Router not in spec (marked as internal)
```markdown
# src/server/resources/disclosures

**Directory Overview:** This directory contains 40 entities.

## routes.js

### findChangedEconomicInterestData
...
(router not documented)
```

**KB State:**
```json
{
  "name": "router",
  "exported": false,
  "visibility": "internal"
}
```

### After Fix

**Output:** Router documented with routes
```markdown
# src/server/resources/disclosures

**Directory Overview:** This directory contains 41 entities.

## routes.js

### router

**Visibility:** Public (exported)

**Behavior:**

- Express Router router that defines HTTP route handlers. Routes: POST /disclosure/:id, POST /migration-disclosure, PUT /disclosure/:userId/disclosure-active, POST /disclosure, POST /disclosure/:id/disposition/:typeCd, POST /disclosure/:id/unset-disposition, POST /disclosure/:id/submit, POST /disclosure/:id/resubmit, POST /disclosure/:id/approve, POST /disclosure/:id/revise, POST /disclosure/:id/return, GET /review/disclosures, GET /my/disclosures, GET /disclosures-for-delegate/:userId, GET /disclosure/:id, POST /disclosure/:id/request-to-send-back, DELETE /disclosure/:id/request-to-send-back, GET /disclosure-versions/:userId, GET /disclosure/users/:userId, GET /view/disclosures, GET /review/disclosures, GET /review/disclosures/listview, GET /disclosure/:id/notify-reporter-delegate-complete.

### findChangedEconomicInterestData
...
```

**KB State:**
```json
{
  "name": "router",
  "exported": true,
  "visibility": "public"
}
```

---

## Risks & Mitigations

### Risk 1: Performance Impact
**Concern:** Extra pass over entities might be slow
**Mitigation:** Entities array is small (typically <100), lookup is O(n), negligible impact

### Risk 2: Name Collision
**Concern:** Multiple entities with same name
**Mitigation:** Use first match (matches current behavior); consider adding path check if needed

### Risk 3: Breaking Existing Tests
**Concern:** Tests might expect certain entities to be internal
**Mitigation:** Review test failures; update expectations as needed (this is correct behavior)

### Risk 4: Incomplete Coverage
**Concern:** Missing other export patterns (destructuring, etc.)
**Mitigation:** Start with most common patterns (default + named); iterate based on real-world needs

---

## Success Criteria

1. ✅ All unit tests pass (including new default export tests)
2. ✅ Integration test with Express router passes
3. ✅ Real-world test case (`output-test/routes.js`) shows router in spec
4. ✅ No regression in existing tests (all 1155 tests still pass)
5. ✅ Test coverage ≥93% maintained

---

## Follow-Up Work (Optional)

### Future Enhancements

1. **Destructured exports**: `export const { foo, bar } = utils;`
2. **Namespace exports**: `export * as utils from './utils';`
3. **Type-only exports**: `export type { Foo } from './types';` (mark differently)
4. **Export aliases**: `export { foo as bar };` (track original name)

### Additional Documentation

1. Add example to parser documentation (if exists)
2. Update CHANGELOG.md when releasing

---

## Code Review Resolutions

This section documents how each issue from the code review was addressed:

### ✅ Issue 1: Named Export Scope Clarification
**Resolution:** Added explicit gap analysis to Step 2 showing that current `getExportDeclarations()` only handles re-exports, not local named exports. Step 2 is necessary, not redundant.

### ✅ Issue 2: FactSet Predicate Naming
**Resolution:** Verified `is-default-export` follows existing boolean predicate pattern (`is-function`, `is-class`, `is-method`, `is-async`). Added comment in implementation code documenting this.

### ✅ Issue 3: CTS-05 Update Not Optional
**Resolution:** Moved CTS-05 documentation update from "Follow-Up Work (Optional)" to Step 4b, making it part of the required implementation.

### ✅ Issue 4: Integration Test Coverage Gap
**Resolution:** Added factSet assertion to integration test (Step 3, lines 288-293) to verify the `is-default-export` fact is correctly added.

### ✅ Issue 5: Fixture Path and Snapshot Discipline
**Resolution:** Specified exact fixture path (`tests/fixtures/tiny-express/src/routes/default-export.js`) and clarified that tiny-express doesn't use snapshots (unlike phase5 fixtures).

### ✅ Issue 6: Exported vs Visibility Clarification
**Resolution:** Added "Entity Schema Fields" section documenting the relationship between `exported` (syntactic) and `visibility` (semantic) fields per `src/kb/models.ts`.

---

## References

- **SADS.md § 3.2:** Static Analysis Engine responsibilities
- **AGENTS.md § Test Creation Best Practices:** TDD workflow
- **ts-morph docs:** [ExportAssignment API](https://ts-morph.com/details/exports)
- **Code review:** `docs/reviews/phase6/features/default-export-detection-plan-review.md`
- **Issue root cause:** See investigation at top of this document
