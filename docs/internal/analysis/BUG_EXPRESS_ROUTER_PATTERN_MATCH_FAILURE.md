# Bug Report: Express Router Pattern Match Failure

**Date:** 2025-11-08
**Reporter:** Investigation Agent
**Severity:** 🔴 **CRITICAL** - 0% route detection on real codebases
**Phase:** Phase 6 Wave 1 (Express patterns)
**Status:** Root cause identified, TDD fix plan ready

---

## Executive Summary

**Bug:** Express router pattern matcher fails to detect router instances, resulting in 0% route detection despite parser correctly extracting all facts.

**Root Cause:** String literal mismatch in pattern matcher. Matcher expects `'Router'` but parser emits `'express.Router'`.

**Impact:**
- 0/23 routes detected in validation test (routes.js)
- Parser working correctly (188 facts extracted, 25 route calls captured)
- Pattern matcher completely bypassed (0 behavior chunks generated)

**Fix Complexity:** Simple one-line change + test

**Estimated Effort:** 2-4 hours (test + fix + validation)

---

## 1. Bug Description

### 1.1 Observed Behavior

When running ceps on `output-test/routes.js` with `--llm off`:

```bash
node dist/orchestrator/index.js output-test --llm off --deterministic
```

**Expected output:**
```markdown
## routes.js

### router (Express Router)

**Behavior:**
- Defines POST route: /disclosure/:id
  - Middleware: allowedRoles('ANY'), wrapAsync
  - Handler: updateDisclosure

[... 22 more routes ...]
```

**Actual output:**
```markdown
## routes.js

### findChangedEconomicInterestData
[... only exported functions, NO ROUTER SECTION ...]
```

### 1.2 Root Cause Analysis

**File:** `src/reasoning/patterns/express/router.ts`
**Line:** 47

```typescript
matches(kb: KnowledgeBase, entity: Entity): boolean {
  if (entity.kind !== 'constant') {
    return false;
  }

  // BUG: This check fails for qualified imports
  return hasFact(kb, entity, 'initializer-call', 'Router');
  //                                             ^^^^^^^^
  //                                             Expects: 'Router'
  //                                             Actual:  'express.Router'
}
```

**Source code pattern (routes.js:167):**
```javascript
const router = express.Router();
```

**Parser extraction (correct):**
```json
{
  "subjectId": "dXIyQqqoq9",
  "predicate": "initializer-call",
  "object": "express.Router"
}
```

**Pattern match (incorrect):**
- Matcher looks for: `'Router'`
- Fact contains: `'express.Router'`
- String comparison: `'express.Router' !== 'Router'` → **FAIL** ❌

---

## 2. Evidence

### 2.1 KB Dump Analysis

**Command:**
```bash
npx tsx scripts/debug-kb-dump.mjs output-test
```

**Results:**

**✅ Router entity created:**
```json
{
  "id": "dXIyQqqoq9",
  "kind": "constant",
  "name": "router",
  "path": "routes.js",
  "exported": false
}
```

**✅ Facts extracted (188 total):**
```json
{
  "subjectId": "dXIyQqqoq9",
  "predicate": "initializer-call",
  "object": "express.Router"
}
```

**✅ Route calls extracted (25 calls):**
```json
{
  "subjectId": "dXIyQqqoq9",
  "predicate": "calls-expression",
  "object": "router.post"
}
// ... 24 more calls (router.get, router.put, router.delete, router.use)
```

**❌ Behavior chunks generated: 0**

### 2.2 Pattern Matcher Test

Manual test of matcher:
```typescript
// Entity: router (constant)
// Fact: initializer-call = 'express.Router'

ExpressRouterPattern.matches(kb, routerEntity)
// Returns: false
// Expected: true
```

---

## 3. Why Testing Missed This Bug

### 3.1 Test Coverage Analysis

**File:** `tests/reasoning/express/router.test.ts`

**Existing test fixture:**
```typescript
// Test uses bare 'Router' import
import { Router } from 'express';
const router = Router();
//             ^^^^^^ Parser emits: 'Router' (not qualified)
```

**Real-world code:**
```javascript
import express from 'express';
const router = express.Router();
//             ^^^^^^^^^^^^^^^ Parser emits: 'express.Router' (qualified)
```

### 3.2 Root Cause of Test Gap

**Problem:** Test fixture uses **named import** instead of **namespace import**

| Import Style | Parser Output | Pattern Match |
|--------------|---------------|---------------|
| `import { Router } from 'express'; Router()` | `'Router'` | ✅ PASS |
| `import express from 'express'; express.Router()` | `'express.Router'` | ❌ FAIL |

**Why this happened:**

1. **Incomplete fixture coverage:** Test only covered one import style
2. **No "real-world" validation:** Phase 6 validation plan called for testing on actual codebases, but Express patterns were tested in isolation first
3. **Phase -1 not followed:** The Express pattern tests did not include a "Phase -1 analysis" step to review how real codebases import Express
4. **Pattern assumption:** Developer assumed all imports would be bare (like React's `import { useState }`)

### 3.3 Lessons Learned

From **AGENTS.md Test Creation Best Practices**:

> **Model realistic upstream data structure**
> - Don't cherry-pick facts/data - include ALL items that would realistically be present
> - Understand how upstream components (parser, scanner, etc.) emit data

**Applied to this case:**

- ❌ Test used **idealized** import style (named import)
- ❌ Did not survey **real Express codebases** to see common patterns
- ❌ Did not test **multiple import variations**

**Phase 6 Express Lessons Doc** should have flagged this:
> "Survey 3-5 real Express projects before writing tests to understand import patterns"

### 3.4 Additional Test Gaps

**Other import styles NOT tested:**

1. **Aliased imports:**
   ```javascript
   import * as myExpress from 'express';
   const router = myExpress.Router();
   // Parser output: 'myExpress.Router'
   ```

2. **Destructured with rename:**
   ```javascript
   import { Router as ExpressRouter } from 'express';
   const router = ExpressRouter();
   // Parser output: 'ExpressRouter'
   ```

3. **CommonJS require:**
   ```javascript
   const express = require('express');
   const router = express.Router();
   // Parser output: 'express.Router'
   ```

4. **Dynamic require:**
   ```javascript
   const { Router } = require('express');
   const router = Router();
   // Parser output: 'Router'
   ```

---

## 4. TDD Fix Plan

### 4.1 Step 1: Write Failing Test (RED)

**File:** `tests/reasoning/express/router.test.ts`

**Add new test case BEFORE fixing code:**

```typescript
describe('ExpressRouterPattern', () => {
  // ... existing tests ...

  describe('import style variations', () => {
    it('should match router with qualified import (express.Router)', async () => {
      // ARRANGE: Create test fixture with qualified import
      const kb = new KnowledgeBase();

      // Simulate what parser emits for:
      // import express from 'express';
      // const router = express.Router();
      const routerEntity: Entity = {
        id: 'test-router-qualified',
        kind: 'constant',
        name: 'router',
        path: 'test-qualified.js',
        exported: false,
        visibility: 'internal',
      };

      kb.addEntity(routerEntity);

      // Critical: Use 'express.Router' not 'Router'
      const factSet: FactSet = {
        id: 'test-router-qualified-facts',
        facts: [
          { subjectId: routerEntity.id, predicate: 'is-constant', object: true },
          {
            subjectId: routerEntity.id,
            predicate: 'initializer-call',
            object: 'express.Router' // <-- Qualified name
          },
          {
            subjectId: routerEntity.id,
            predicate: 'calls-expression',
            object: 'router.get'
          },
        ],
        sources: [{ kind: 'ast', file: 'test-qualified.js' }],
        evidenceScore: 100,
      };

      kb.addFactSet(factSet);

      // ACT
      const pattern = new ExpressRouterPattern();
      const matches = pattern.matches(kb, routerEntity);

      // ASSERT
      expect(matches).toBe(true); // Will FAIL with current code
    });

    it('should match router with aliased import (myExpress.Router)', async () => {
      // Test for: import * as myExpress from 'express'
      const kb = new KnowledgeBase();
      const routerEntity: Entity = {
        id: 'test-router-alias',
        kind: 'constant',
        name: 'router',
        path: 'test-alias.js',
        exported: false,
        visibility: 'internal',
      };

      kb.addEntity(routerEntity);
      kb.addFactSet({
        id: 'test-router-alias-facts',
        facts: [
          { subjectId: routerEntity.id, predicate: 'is-constant', object: true },
          {
            subjectId: routerEntity.id,
            predicate: 'initializer-call',
            object: 'myExpress.Router' // <-- Aliased
          },
        ],
        sources: [{ kind: 'ast', file: 'test-alias.js' }],
        evidenceScore: 100,
      });

      const pattern = new ExpressRouterPattern();
      expect(pattern.matches(kb, routerEntity)).toBe(true); // Will FAIL
    });

    it('should still match router with bare import (Router)', async () => {
      // Regression test: ensure original case still works
      // Test for: import { Router } from 'express'
      const kb = new KnowledgeBase();
      const routerEntity: Entity = {
        id: 'test-router-bare',
        kind: 'constant',
        name: 'router',
        path: 'test-bare.js',
        exported: false,
        visibility: 'internal',
      };

      kb.addEntity(routerEntity);
      kb.addFactSet({
        id: 'test-router-bare-facts',
        facts: [
          { subjectId: routerEntity.id, predicate: 'is-constant', object: true },
          {
            subjectId: routerEntity.id,
            predicate: 'initializer-call',
            object: 'Router' // <-- Bare name (original test case)
          },
        ],
        sources: [{ kind: 'ast', file: 'test-bare.js' }],
        evidenceScore: 100,
      });

      const pattern = new ExpressRouterPattern();
      expect(pattern.matches(kb, routerEntity)).toBe(true); // Should PASS
    });
  });
});
```

**Verify tests fail:**
```bash
npm test -- tests/reasoning/express/router.test.ts --run
```

**Expected output:**
```
❌ FAIL  tests/reasoning/express/router.test.ts
  ExpressRouterPattern
    import style variations
      ✗ should match router with qualified import (express.Router)
      ✗ should match router with aliased import (myExpress.Router)
      ✓ should still match router with bare import (Router)
```

---

### 4.2 Step 2: Implement Fix (GREEN)

**File:** `src/reasoning/patterns/express/router.ts`

**Change line 47 from:**
```typescript
return hasFact(kb, entity, 'initializer-call', 'Router');
```

**To:**
```typescript
// Match Router() with any qualifier (express.Router, myExpress.Router, or bare Router)
return hasFact(kb, entity, 'initializer-call', /Router$/);
```

**Explanation:**
- `hasFact` helper supports regex patterns (line 30 in `helpers.ts`)
- Regex `/Router$/` matches any string **ending with** `'Router'`
- Matches:
  - ✅ `'Router'` (bare)
  - ✅ `'express.Router'` (qualified)
  - ✅ `'myExpress.Router'` (aliased)
  - ✅ `'anyNamespace.Router'` (generic)
- Does NOT match:
  - ❌ `'RouterFactory'` (not ending with Router)
  - ❌ `'router'` (lowercase)

**Alternative (more strict):**
```typescript
// Only match known Express import patterns
const fact = getFirstFact(kb, entity, 'initializer-call');
if (!fact) return false;

const value = String(fact.object);
return value === 'Router' ||
       value === 'express.Router' ||
       /^[a-zA-Z_$][\w$]*\.Router$/.test(value);
```

**Recommendation:** Use regex approach (simpler, covers edge cases)

---

### 4.3 Step 3: Verify Tests Pass (GREEN)

**Run tests:**
```bash
npm test -- tests/reasoning/express/router.test.ts --run
```

**Expected output:**
```
✓ PASS  tests/reasoning/express/router.test.ts
  ExpressRouterPattern
    import style variations
      ✓ should match router with qualified import (express.Router)
      ✓ should match router with aliased import (myExpress.Router)
      ✓ should still match router with bare import (Router)
```

---

### 4.4 Step 4: Refactor (if needed)

**Current implementation is clean. No refactoring needed.**

---

### 4.5 Step 5: Integration Test

**Add end-to-end test with real fixture:**

**File:** `tests/integration/express-router-qualified-import.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { KnowledgeBase } from '../../src/kb/knowledge-base.js';
import { Parser } from '../../src/parser/parser.js';
import { ExpressRouterPattern } from '../../src/reasoning/patterns/express/router.js';
import { promises as fs } from 'fs';
import path from 'path';

describe('Express Router - Qualified Import (Integration)', () => {
  it('should detect routes with qualified import (express.Router)', async () => {
    // ARRANGE: Create realistic test file
    const testCode = `
import express from 'express';

const router = express.Router();

router.post('/users', createUser);
router.get('/users/:id', getUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

export default router;
`;

    const testFile = 'test-qualified-router.js';
    const testPath = path.join('/tmp', testFile);
    await fs.writeFile(testPath, testCode, 'utf-8');

    try {
      // ACT: Parse and analyze
      const kb = new KnowledgeBase();
      const parser = new Parser({ moduleScopeCalls: true });
      const result = await parser.parseFile(testPath);

      kb.addEntity(result.entity);
      for (const factSet of result.factSets) {
        kb.addFactSet(factSet);
      }

      const routerEntity = result.entities.find(e => e.name === 'router');
      expect(routerEntity).toBeDefined();

      const pattern = new ExpressRouterPattern();

      // ASSERT: Pattern should match
      expect(pattern.matches(kb, routerEntity!)).toBe(true);

      // Generate behavior chunks
      const chunks = pattern.describe(kb, routerEntity!);
      expect(chunks.length).toBeGreaterThan(0);

      const behaviorText = chunks[0].bullets.join('\n');

      // Should document all 4 routes
      expect(behaviorText).toContain('POST /users');
      expect(behaviorText).toContain('GET /users/:id');
      expect(behaviorText).toContain('PUT /users/:id');
      expect(behaviorText).toContain('DELETE /users/:id');
    } finally {
      // Cleanup
      await fs.unlink(testPath).catch(() => {});
    }
  });
});
```

**Run integration test:**
```bash
npm test -- tests/integration/express-router-qualified-import.test.ts --run
```

---

### 4.6 Step 6: Validate on Real Codebase

**Re-run ceps on original failing test:**

```bash
# Rebuild with fix
npm run build

# Re-run on routes.js
node dist/orchestrator/index.js output-test --llm off --deterministic

# Check output
cat output-test/spec.md
```

**Expected output (success criteria):**

```markdown
## routes.js

### router (Express Router)

**Behavior:**

Express Router instance with 25 route definitions:

- **router.use** (6 calls): Mounts sub-routers
  - `/disclosure/:disclosureId/comments` → commentsRouter
  - `/disclosure/:disclosureId/dispositions` → dispositionsRouter
  - [... 4 more mounts ...]

- **POST /disclosure/:id**
  - Middleware: allowedRoles('ANY'), wrapAsync
  - Handler: updateDisclosure

- **POST /migration-disclosure**
  - Middleware: allowedRoles([ADMIN]), wrapAsync
  - Handler: migrateDisclosure

[... 21 more routes ...]
```

**Validation metrics:**

| Metric | Before Fix | After Fix | Target |
|--------|-----------|-----------|--------|
| Routes detected | 0/23 (0%) | 23/23 (100%) | ≥20/23 (≥87%) |
| Router entity in spec | ❌ No | ✅ Yes | Required |
| Behavior chunks | 0 | 1+ | ≥1 |

---

## 5. Testing Strategy Improvements

### 5.1 Pattern Testing Checklist (New)

Before marking any pattern module "complete", ensure tests cover:

**Import Variations:**
- [ ] Named import: `import { Thing } from 'lib'`
- [ ] Default import: `import lib from 'lib'; lib.Thing()`
- [ ] Namespace import: `import * as lib from 'lib'; lib.Thing()`
- [ ] CommonJS require: `const lib = require('lib'); lib.Thing()`
- [ ] Destructured require: `const { Thing } = require('lib')`

**Real-World Validation:**
- [ ] Survey 3-5 popular repos using this framework
- [ ] Document common import patterns found
- [ ] Create test fixtures matching real-world usage
- [ ] Run pattern on actual codebase (not just synthetic fixtures)

**Edge Cases:**
- [ ] Aliased imports: `import lib as alias`
- [ ] Re-exported symbols: `export { Thing } from 'lib'`
- [ ] Dynamic imports (if applicable)

### 5.2 Phase -1 for Pattern Development

Add to **AGENTS.md Test Creation Best Practices**:

> **Phase -1 Analysis for Pattern Matchers**
>
> Before implementing any framework pattern, conduct a survey of real-world usage:
>
> 1. **Find 3-5 popular open-source projects** using the framework
> 2. **Analyze import patterns:**
>    - How do they import the framework? (named, default, namespace)
>    - What naming conventions are common? (camelCase, PascalCase, prefixes)
>    - Are there framework-specific idioms?
> 3. **Document findings** in `docs/internal/analysis/PATTERN_SURVEY_{framework}.md`
> 4. **Create test fixtures** that match the MOST COMMON patterns (not idealized patterns)
> 5. **Validate on real code** before marking pattern as "complete"
>
> This prevents "works in tests, fails in production" bugs.

### 5.3 Integration Test Requirements

Update **Phase 6 Express Lessons** to mandate:

> **Integration Test Requirement:**
>
> Every pattern module MUST have:
> 1. Unit tests (pattern matcher logic)
> 2. Integration test with realistic fixture (parser → pattern → KB)
> 3. Validation run on 1+ real codebase
>
> Integration test should use **full code string** (not hand-crafted facts) to ensure parser output matches pattern expectations.

---

## 6. Risk Assessment

### 6.1 Regression Risk

**LOW** - Fix is conservative and backward compatible

- Regex `/Router$/` is **more permissive** than exact match `'Router'`
- All existing tests should continue to pass
- Does not change parser behavior

**Mitigation:**
- Run full test suite after fix: `npm test`
- Verify no test failures in other pattern modules
- Check that existing Express fixtures still pass

### 6.2 Performance Impact

**NEGLIGIBLE** - Regex match is O(1) for short strings

- Average `initializer-call` value length: ~15 chars
- Regex is simple (no backtracking): `/Router$/`
- Called once per constant entity (not in hot loop)

### 6.3 False Positive Risk

**LOW** - Regex is specific enough

**Could match (false positives):**
- `'CustomRouter'` - Acceptable (might be valid Express router subclass)
- `'myLib.Router'` - Acceptable (might be Express aliased)

**Will NOT match (correct negatives):**
- `'RouterFactory'` (ends with 'Factory' not 'Router')
- `'router'` (lowercase)
- `'Routers'` (plural)

**Mitigation:**
- If false positives occur in practice, tighten regex to:
  ```typescript
  /^(?:express|[a-zA-Z_$][\w$]*)\.Router$|^Router$/
  ```
  This only matches:
  - `'Router'` (bare)
  - `'<identifier>.Router'` (qualified with valid JS identifier)

---

## 7. Implementation Timeline

**Total estimated time: 2-4 hours**

| Step | Task | Time | Owner |
|------|------|------|-------|
| 1 | Write failing unit tests (Step 4.1) | 30 min | Implementation Agent |
| 2 | Implement fix (Step 4.2) | 5 min | Implementation Agent |
| 3 | Verify unit tests pass (Step 4.3) | 5 min | Implementation Agent |
| 4 | Write integration test (Step 4.5) | 30 min | Implementation Agent |
| 5 | Rebuild and validate on routes.js (Step 4.6) | 15 min | Implementation Agent |
| 6 | Run full test suite | 10 min | CI |
| 7 | Update documentation (lessons learned) | 30 min | Implementation Agent |
| 8 | Code review | 1 hour | Code Review Agent |

---

## 8. Acceptance Criteria

**Fix is complete when:**

- [x] Root cause documented (this document)
- [ ] Failing tests written and committed
- [ ] Fix implemented (one-line change)
- [ ] All new tests pass (unit + integration)
- [ ] Full test suite passes (no regressions)
- [ ] routes.js validation shows 23/23 routes detected
- [ ] AGENTS.md updated with new Pattern Testing Checklist
- [ ] Phase 6 lessons doc updated

---

## 9. Related Issues

**Original validation report:** `docs/internal/analysis/VALIDATION_ISSUE_ROUTES_PATTERN_DETECTION.md`

**Phase -1 investigation:** `docs/internal/analysis/phase6-validation-fix-phase-minus-one.md`

**Phase 6 Express Lessons:** `docs/internal/lessons/PHASE6_EXPRESS_LESSONS.md` (to be updated)

---

## 10. Lessons Learned Summary

### For Future Pattern Development:

1. **Never assume import style** - Always test multiple import variations
2. **Survey real codebases first** - Understand common patterns before writing tests
3. **Use full code strings in tests** - Don't hand-craft facts; let parser generate them
4. **Validate on real code early** - Synthetic fixtures hide real-world issues
5. **Phase -1 is mandatory** - Analyze before implementing, not after failing

### For Testing Strategy:

1. **"Maximally polluted" datasets apply to import patterns too**
   - Test bare imports, qualified imports, aliased imports simultaneously
   - Include edge cases from day one

2. **Integration tests are not optional**
   - Unit tests verify logic
   - Integration tests verify assumptions about upstream components

3. **Real-world validation catches what tests miss**
   - No amount of synthetic fixtures replaces running on actual codebases
   - Validation should happen DURING development, not just at end

---

**Report Status:** ✅ **COMPLETE** - Ready for Implementation Agent

**Next Steps:**
1. Implementation Agent: Execute TDD fix plan (Section 4)
2. Code Review Agent: Review fix + updated tests
3. Validation Agent: Re-run routes.js validation

**Priority:** 🔴 **CRITICAL** - Blocks Phase 6 Wave 1 completion

---

**End of Bug Report**
