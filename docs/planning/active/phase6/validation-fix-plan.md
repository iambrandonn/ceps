# Phase 6 Wave 1A: Validation Fix Plan — Express Routing Patterns

**Date:** 2025-11-08
**Owner:** Investigation Agent (TBD) → Implementation Agent (TBD)
**Reviewer:** Code Review Agent
**Status:** 🟡 DRAFT — Awaiting review
**Context:** Responds to validation failure report (`docs/internal/analysis/VALIDATION_ISSUE_ROUTES_PATTERN_DETECTION.md`)

---

## Executive Summary

This plan addresses **catastrophic Express routing pattern detection failures** discovered during Wave 1A backend validation. The validation showed:

- **0% route detection** (0/23 routes) — router instances not recognized
- **8% middleware detection** (2/25+) — route handlers not identified as middleware
- **10% Mongoose query detection** (2/20+) — dynamic model resolution not supported

**Root causes identified:**
1. **Router vs App distinction missing** — Pattern only matches `app.get()`, not `router.get()`
2. **Middleware chain not parsed** — `wrapAsync()`, `allowedRoles()` ignored
3. **Dynamic Mongoose models** — `req.model('Name')` not supported
4. **Route handler signature** — Functions with `(req, res, next)` in route definitions not recognized as middleware

**Timeline Impact:** +2-3 weeks to Phase 6 (investigation 1 week, fixes 1-2 weeks, revalidation 3-5 days)

**Success Criteria:**
- Re-validation F1 ≥ 0.82 (backend validation threshold)
- All 23 routes detected and documented
- Middleware chain preserved (wrapAsync, allowedRoles visible)
- Dynamic Mongoose models documented with caveats

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Phase -1 Investigation Plan](#2-phase--1-investigation-plan)
3. [Fix Plan Overview](#3-fix-plan-overview)
4. [Fix 1: Router Instance Detection](#4-fix-1-router-instance-detection)
5. [Fix 2: Middleware Chain Analysis](#5-fix-2-middleware-chain-analysis)
6. [Fix 3: Dynamic Mongoose Model Resolution](#6-fix-3-dynamic-mongoose-model-resolution)
7. [Fix 4: Route Handler Middleware Recognition](#7-fix-4-route-handler-middleware-recognition)
8. [Test Strategy](#8-test-strategy)
9. [Validation & Acceptance](#9-validation--acceptance)
10. [Timeline & Resources](#10-timeline--resources)
11. [Risk Assessment](#11-risk-assessment)
12. [Decision Log](#12-decision-log)

---

## 1. Problem Statement

### 1.1 Context

Phase 6 Wave 1A introduced a **backend-first validation strategy** to prove architectural soundness before launching frontend agents. The first validation target (`output-test/routes.js`) failed catastrophically:

| Metric | Expected | Actual | Status |
|--------|----------|--------|--------|
| Route detection | 23 routes | 0 routes | ❌ FAIL |
| Middleware detection | 25+ functions | 2 functions | ❌ FAIL |
| Mongoose queries | 20+ operations | 2 operations | ❌ FAIL |
| F1 Score | ≥0.82 | ~0.40 | ❌ FAIL |
| **Go/No-Go Decision** | **GO** | **NO-GO** | 🔴 **BLOCKED** |

### 1.2 Impact

**Wave 1B blocked** — Cannot launch React/Redux/GraphQL agents until backend patterns proven stable.

**M3 gate at risk** — Production readiness depends on Tier-0 framework accuracy (>90% target).

**User trust compromised** — Current output is not "spec-ready" and cannot guide reimplementation.

### 1.3 Scope

**In Scope:**
- Express routing pattern fixes (router instances, middleware chains)
- Mongoose query pattern fixes (dynamic model resolution)
- Route handler middleware recognition
- Test suite updates for realistic scenarios
- Re-validation on original test case

**Out of Scope (Deferred to Wave 2 or Post-M3):**
- Advanced patterns: Agenda.js, JWT custom middleware, file storage abstractions
- GraphQL/REST API documentation generation
- Performance optimization (covered by Agent 6)
- Accuracy harness automation (Agent 6)

---

## 2. Phase -1 Investigation Plan

**Purpose:** Understand why existing patterns failed and confirm root causes before implementation.

**Owner:** Investigation Agent
**Duration:** 3-5 days
**Deliverable:** `docs/internal/analysis/phase6-validation-fix-phase-minus-one.md`

### 2.1 Objectives

1. **Inspect KB facts for `output-test/routes.js`**
   - Run `ceps output-test --llm off --debug` to dump KB state
   - Confirm router entity presence/absence
   - Verify `calls-expression` facts for `router.get/post/put/delete`

2. **Trace pattern matcher execution**
   - Add debug logging to `ExpressRouterPattern.matches()`
   - Determine if router entities exist but don't match pattern
   - Or if parser never created router entities

3. **Analyze middleware detection logic**
   - Confirm why `unsetDisposition` matched but `updateDisclosure` didn't
   - Check if route handlers are parsed as separate entities
   - Verify parameter count/name detection for inline handlers

4. **Investigate Mongoose query failures**
   - Dump `calls-expression` facts for `req.model()` calls
   - Check if dynamic model resolution requires new predicate
   - Verify if `ModelName.updateMany` is in `QUERY_METHODS` list

### 2.2 Investigation Steps

#### Step 1: KB Fact Inspection (Day 1)

**Objective:** Confirm parser output and entity creation.

**Actions:**
```bash
# Generate KB dump for analysis
npm run ceps output-test -- --llm off --debug > debug-output.json

# Or add script:
npx tsx scripts/debug-kb-dump.mjs output-test > kb-facts.json
```

**Analysis Questions:**
- [ ] Are router constants created as entities? (Expected: Yes, `router` constant with `initializer-call: Router`)
- [ ] Do route handler calls exist as facts? (Expected: `calls-expression: router.get`, `call-arg-0: '/disclosure/:id'`)
- [ ] Are inline route handlers parsed as entities? (Expected: No — functions defined inline may not be entities)
- [ ] Are middleware wrapper calls visible? (Expected: `calls-expression: wrapAsync`, `calls-expression: allowedRoles`)

**Expected Findings:**
- ✅ Router constant exists, properly initialized
- ❌ `router.get/post/put/delete` calls NOT emitted as facts (parser limitation)
- OR ✅ Calls exist but pattern matcher regex is wrong
- ❌ Middleware chains not associated with route definitions

#### Step 2: Pattern Matcher Tracing (Day 2)

**Objective:** Isolate whether issue is in parser or pattern matcher.

**Actions:**
1. Add debug logging to `src/reasoning/patterns/express/router.ts:matches()`:
   ```typescript
   matches(kb: KnowledgeBase, entity: Entity): boolean {
     console.log(`[DEBUG] Router pattern checking entity: ${entity.name} (${entity.kind})`);
     console.log(`[DEBUG] Entity facts:`, kb.getFactSetsFor(entity.id));

     if (entity.kind !== 'constant') {
       console.log(`[DEBUG] Rejected: not a constant`);
       return false;
     }

     const hasRouterInit = hasFact(kb, entity, 'initializer-call', 'Router');
     console.log(`[DEBUG] Has Router() init: ${hasRouterInit}`);

     return hasRouterInit;
   }
   ```

2. Run with debug flag:
   ```bash
   npm test -- --run tests/reasoning/express-router-pattern.test.ts 2>&1 | tee router-debug.log
   ```

3. Analyze logs:
   - Does `router` constant from `routes.js` appear in logs?
   - Does it have `initializer-call: Router` fact?
   - Does pattern matcher reject it? If yes, why?

**Expected Findings:**
- Router constant matches correctly (✅)
- But `extractRoutes()` method fails because it looks for `router.get` in `calls-expression` facts (❌)
- The regex on line 148 (`routePattern`) may not match actual fact values

#### Step 3: Middleware Chain Analysis (Day 3)

**Objective:** Understand why route handlers aren't detected as middleware.

**Test Scenario:**
```javascript
// From routes.js line 176
router.post('/disclosure/:id', allowedRoles('ANY'), wrapAsync(updateDisclosure))

// Expected entities:
// 1. router (constant, Router())
// 2. updateDisclosure (function, 3-param: req, res, next) ← WHY NOT DETECTED?
```

**Actions:**
1. Check if `updateDisclosure` is parsed as entity:
   ```bash
   jq '.entities[] | select(.name == "updateDisclosure")' kb-facts.json
   ```

2. If entity exists, check why middleware pattern didn't match:
   - Parameter count correct? (should be 3)
   - Parameter names correct? (req, res, next)
   - Is function exported? (middleware pattern may require `exported: true`)

3. If entity doesn't exist:
   - Confirm parser limitation: inline route handlers not extracted
   - Document workaround: function must be declared separately to be documented

**Expected Findings:**
- Route handlers ARE entities (✅)
- Middleware pattern rejects them because `exported: false` (❌)
- OR parameter names don't match due to JSDoc types (`Request`, `Response`, `NextFunction`)

#### Step 4: Mongoose Query Pattern Investigation (Day 4)

**Objective:** Confirm dynamic model resolution issue and missing operations.

**Test Cases:**
```javascript
// Case 1: Dynamic model resolution (NOT SUPPORTED)
const Disclosure = req.model('Disclosure');
await Disclosure.updateMany({ userId }, { $set: { active: newValue } });

// Case 2: Direct model call (MAY BE SUPPORTED)
await req.model('Disclosure').updateMany({ userId }, { $set: { active } });
```

**Actions:**
1. Check if `req.model()` calls are in KB:
   ```bash
   jq '.factSets[].facts[] | select(.predicate == "calls-expression" and (.object | contains("model")))' kb-facts.json
   ```

2. Verify if `updateMany` is in `QUERY_METHODS.write` (line 28 of `mongoose-query.ts`):
   ```typescript
   write: ['create', 'insertMany', 'updateOne', 'updateMany', ...]
   ```

3. Test pattern matcher with synthetic fixture:
   ```typescript
   // Fixture: dynamic model
   const facts = [
     { predicate: 'calls-expression', object: 'req.model' },
     { predicate: 'call-arg-0', object: "'Disclosure'" },
     { predicate: 'calls-expression', object: 'Disclosure.updateMany' },
   ];
   ```

**Expected Findings:**
- `updateMany` IS in `QUERY_METHODS` (✅)
- Pattern matcher regex `(\\w+)\\.${method}` fails on chained calls like `req.model('X').updateMany` (❌)
- Dynamic model resolution requires new pattern module or enhanced resolution strategy

### 2.3 Deliverables

**Document:** `docs/internal/analysis/phase6-validation-fix-phase-minus-one.md`

**Required Sections:**
1. KB fact dump analysis (router entities, route calls, middleware facts)
2. Pattern matcher trace results (match vs. rejection reasons)
3. Root cause confirmation matrix:

| Issue | Hypothesis | Confirmed? | Evidence |
|-------|-----------|------------|----------|
| Router instances not detected | Pattern only checks `app.*`, not `router.*` | ✅/❌ | KB dump shows... |
| Middleware chain ignored | Middleware not linked to routes | ✅/❌ | No cross-refs in... |
| Dynamic Mongoose models | `req.model()` not resolved | ✅/❌ | Pattern regex fails on... |
| Non-exported route handlers | Middleware pattern requires `exported: true` | ✅/❌ | Entity has `exported: false`... |

4. Parser limitations (if any)
5. Recommendations for fixes (feed into Fix Plan sections 4-7)

**Timeline:** Day 5 (buffer for unexpected findings)

---

## 3. Fix Plan Overview

**Owner:** Implementation Agent
**Duration:** 1-2 weeks (depending on Phase -1 findings)
**Approach:** TDD (Test-Driven Development) per AGENTS.md §295-308

### 3.1 Fix Sequencing

**Wave 1 (Week 1):**
1. **Fix 1:** Router instance detection (Architectural — blocks other fixes)
2. **Fix 2:** Middleware chain analysis (Architectural — blocks route-handler docs)

**Wave 2 (Week 2):**
3. **Fix 3:** Dynamic Mongoose model resolution (Pattern-level — quality issue)
4. **Fix 4:** Route handler middleware recognition (Pattern-level — quality issue)

**Rationale:** Fixes 1-2 are architectural (affect multiple workstreams, block Wave 1B). Fixes 3-4 are pattern-level (reduce quality but don't block other agents).

### 3.2 Dependencies

```
Fix 1 (Router detection)
  └─> Fix 2 (Middleware chains) ← depends on router facts
        └─> Fix 4 (Route handler middleware) ← depends on chain parsing

Fix 3 (Dynamic Mongoose) ← independent, can parallelize with Fix 2
```

### 3.3 Success Metrics

**Per-Fix Acceptance:**
- Unit tests pass (Red → Green → Refactor)
- Integration tests pass (end-to-end with fixtures)
- Coverage ≥80% for modified modules
- Lexicon validation green (if new terms added)

**Overall Validation Success:**
- Re-run `ceps output-test --llm off`
- F1 score ≥ 0.82 (backend threshold)
- All 23 routes documented
- All middleware chains preserved
- Dynamic Mongoose models documented with caveats

---

## 4. Fix 1: Router Instance Detection

**Priority:** 🔴 CRITICAL (Architectural)
**Effort:** 3-5 days
**Owner:** Implementation Agent

### 4.1 Root Cause

**Current Implementation** (`src/reasoning/patterns/express/router.ts:137-192`):

```typescript
private extractRoutes(kb: KnowledgeBase, entity: Entity): RouteHandler[] {
  // Line 148: Pattern only matches entity.name or 'router'
  const routePattern = new RegExp(`^(${entity.name}|router)\\.(get|post|put|delete|patch)$`, 'i');

  for (let i = 0; i < facts.length; i++) {
    const fact = facts[i];
    if (fact.predicate === 'calls-expression') {
      const match = String(fact.object).match(routePattern);
      // ...
    }
  }
}
```

**Problem:** This works IF `calls-expression` fact contains exact string `"router.get"`. But if parser emits:
- `"express.Router().get"` (chained call)
- `"usersRouter.get"` (named router variable)
- Route call not emitted as fact (parser limitation)

Then pattern fails.

### 4.2 Investigation Required

**Phase -1 must answer:**
1. What does `calls-expression` fact actually contain for `router.post('/disclosure/:id', ...)`?
2. Is the router entity itself detected? (constant initialized with `Router()`)
3. Are route method calls (`router.get/post`) associated with the router entity or separate?

**Possible Scenarios:**

| Scenario | Parser Output | Pattern Fix |
|----------|---------------|-------------|
| A: Router calls not emitted | No `calls-expression` for `router.get` | **Parser enhancement** (out of scope) + workaround doc |
| B: Router calls under different entity | `app` entity has `router.get` facts | **Cross-entity linking** (new pattern logic) |
| C: Regex mismatch | `calls-expression: "router.get"` exists but regex fails | **Regex fix** (simple) |
| D: Multiple routers | `usersRouter`, `postsRouter` both have `.get` facts | **Entity-aware extraction** (medium complexity) |

### 4.3 Proposed Solution (Scenario C/D — Most Likely)

**Assumption:** Router entities exist, route calls are facts, regex/entity association is wrong.

#### Code Changes

**File:** `src/reasoning/patterns/express/router.ts`

**Change 1: Generalize route extraction**

```typescript
// OLD (line 148):
const routePattern = new RegExp(`^(${entity.name}|router)\\.(get|post|put|delete|patch)$`, 'i');

// NEW: Match any identifier followed by HTTP method
const routePattern = new RegExp(`^(\\w+)\\.(get|post|put|delete|patch)$`, 'i');

// VALIDATION: Check if matched identifier is this entity
for (const fact of facts) {
  if (fact.predicate === 'calls-expression') {
    const match = String(fact.object).match(routePattern);
    if (match) {
      const identifier = match[1];

      // Only accept if identifier matches entity name or 'router' (generic)
      if (identifier === entity.name || identifier === 'router') {
        // Extract route...
      }
    }
  }
}
```

**Change 2: Support nested/chained router calls**

```typescript
// Handle: app.use('/api/disclosures', router)
// Then: router.post('/disclosure/:id', ...)
// Result: Effective path is /api/disclosures/disclosure/:id

// This requires router mounting facts — defer to Fix 2 (middleware chains)
```

**Change 3: Handle named router instances**

```typescript
// Example: const usersRouter = express.Router();
// Parser may emit: usersRouter.get(...)

// Solution: Trust entity.name match
const routePattern = new RegExp(`^${entity.name}\\.(get|post|put|delete|patch)$`, 'i');
```

**Recommendation:** Start with **Change 1** (generalized regex), validate with Phase -1 KB dump, then decide if Changes 2-3 are needed.

### 4.4 Test Strategy

**TDD Workflow:**

**Red (Failing Tests):**

```typescript
// File: tests/reasoning/express-router-pattern.test.ts

describe('Router instance detection', () => {
  it('detects routes on named router instance', () => {
    const router: Entity = {
      id: 'router-named',
      kind: 'constant',
      name: 'disclosuresRouter', // Named, not generic 'router'
      path: 'routes/disclosures.js',
      exported: true,
    };

    const factSet: FactSet = {
      id: 'fs-routes',
      facts: [
        { subjectId: router.id, predicate: 'initializer-call', object: 'Router' },
        { subjectId: router.id, predicate: 'calls-expression', object: 'disclosuresRouter.post' },
        { subjectId: router.id, predicate: 'call-arg-0', object: "'/disclosure/:id'" },
        { subjectId: router.id, predicate: 'calls-expression', object: 'disclosuresRouter.get' },
        { subjectId: router.id, predicate: 'call-arg-0', object: "'/disclosures'" },
      ],
      sources: [],
      evidenceScore: 80,
    };

    kb.insertEntity(router);
    kb.insertFactSet(factSet);

    const pattern = new ExpressRouterPattern();
    expect(pattern.matches(kb, router)).toBe(true);

    const chunks = pattern.describe(kb, router);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].textDraft).toContain('POST /disclosure/:id');
    expect(chunks[0].textDraft).toContain('GET /disclosures');
  });

  it('handles multiple routers in same file', () => {
    // Polluted dataset: 2 routers, ensure routes don't cross-contaminate
    const usersRouter: Entity = { id: 'r1', kind: 'constant', name: 'usersRouter', path: 'routes.js', exported: true };
    const postsRouter: Entity = { id: 'r2', kind: 'constant', name: 'postsRouter', path: 'routes.js', exported: true };

    const factSet: FactSet = {
      id: 'fs-multi',
      facts: [
        { subjectId: 'r1', predicate: 'initializer-call', object: 'Router' },
        { subjectId: 'r1', predicate: 'calls-expression', object: 'usersRouter.get' },
        { subjectId: 'r1', predicate: 'call-arg-0', object: "'/users'" },

        { subjectId: 'r2', predicate: 'initializer-call', object: 'Router' },
        { subjectId: 'r2', predicate: 'calls-expression', object: 'postsRouter.get' },
        { subjectId: 'r2', predicate: 'call-arg-0', object: "'/posts'" },
      ],
      sources: [],
      evidenceScore: 80,
    };

    kb.insertEntity(usersRouter);
    kb.insertEntity(postsRouter);
    kb.insertFactSet(factSet);

    const pattern = new ExpressRouterPattern();

    const usersChunks = pattern.describe(kb, usersRouter);
    expect(usersChunks[0].textDraft).toContain('GET /users');
    expect(usersChunks[0].textDraft).not.toContain('/posts');

    const postsChunks = pattern.describe(kb, postsRouter);
    expect(postsChunks[0].textDraft).toContain('GET /posts');
    expect(postsChunks[0].textDraft).not.toContain('/users');
  });
});
```

**Green (Implementation):**
- Modify `extractRoutes()` method per Change 1 above
- Run tests until green

**Refactor:**
- Extract route extraction logic to helper function
- Add comments explaining entity-aware matching
- Ensure no performance regression (benchmark if needed)

**Integration Test:**

```typescript
// File: tests/integration/express-router-real-world.test.ts

describe('Express router with real-world patterns', () => {
  it('documents nested router with multiple routes', async () => {
    const kb = new KnowledgeBase();
    const parser = new Parser();

    // Fixture simulating routes.js structure
    const code = `
      const express = require('express');
      const router = express.Router();

      router.post('/disclosure/:id', allowedRoles('ANY'), wrapAsync(updateDisclosure));
      router.get('/disclosures', allowedRoles('ANY'), wrapAsync(getDisclosures));
      router.put('/disclosure/:id/submit', allowedRoles('ANY'), wrapAsync(submitDisclosure));

      module.exports = router;
    `;

    const { entities, factSets } = await parser.parse(code, 'routes.js');
    entities.forEach(e => kb.insertEntity(e));
    factSets.forEach(fs => kb.insertFactSet(fs));

    const routerEntity = entities.find(e => e.kind === 'constant' && e.name === 'router');
    expect(routerEntity).toBeDefined();

    const pattern = new ExpressRouterPattern();
    const chunks = pattern.describe(kb, routerEntity!);

    expect(chunks[0].textDraft).toContain('POST /disclosure/:id');
    expect(chunks[0].textDraft).toContain('GET /disclosures');
    expect(chunks[0].textDraft).toContain('PUT /disclosure/:id/submit');
  });
});
```

### 4.5 Acceptance Criteria

- [ ] Unit tests pass (polluted datasets, negative assertions)
- [ ] Integration test with realistic router fixture passes
- [ ] Coverage ≥80% for `router.ts` module
- [ ] Re-validation on `output-test/routes.js` shows routes detected (may be partial until Fix 2)
- [ ] No regressions in existing Express tests (all 1155 tests still pass)

### 4.6 Rollback Plan

**If fix introduces regressions:**
1. Revert `router.ts` changes
2. Add feature flag: `--experimental-router-detection`
3. Document limitation in spec output:
   ```markdown
   ## Known Limitations
   - Router instances: Only generic `router.get()` calls detected, not named routers (`usersRouter.get()`)
   ```

### 4.7 Documentation Updates

**File:** `docs/internal/analysis/phase6-validation-fix-phase-minus-one.md`
- Add section: "Router Instance Detection — Implementation Notes"
- Document regex change and rationale

**File:** `src/reasoning/patterns/express/router.ts` (inline comments)
- Explain entity-aware route extraction
- Document tested edge cases

---

## 5. Fix 2: Middleware Chain Analysis

**Priority:** 🔴 CRITICAL (Architectural)
**Effort:** 5-7 days
**Owner:** Implementation Agent
**Depends On:** Fix 1 (router detection must work first)

### 5.1 Root Cause

**Current Limitation:** Route definitions like:

```javascript
router.post('/disclosure/:id', allowedRoles('ANY'), wrapAsync(updateDisclosure))
```

Are detected as routes (Fix 1), but middleware chain (`allowedRoles`, `wrapAsync`) is **not captured**.

**Impact:**
- Authorization requirements invisible (`allowedRoles('ANY')` vs `allowedRoles([ADMIN])`)
- Error handling semantics missing (`wrapAsync` means async errors are caught)
- Route handler function not linked to route definition

**Expected Spec Output:**

```markdown
### POST /disclosure/:id

**Handler:** updateDisclosure
**Middleware Chain:**
1. allowedRoles('ANY') — Authorization: any authenticated user
2. wrapAsync — Async error handling wrapper

**Parameters:**
- `:id` — Disclosure ID (path parameter)

**Behavior:**
- Updates disclosure entity by ID
- Requires authentication (any role)
- Database operation: [links to updateDisclosure function]
```

### 5.2 Investigation Required

**Phase -1 must answer:**
1. Are middleware wrapper calls (`allowedRoles`, `wrapAsync`) emitted as facts?
2. Are they associated with route definition or separate?
3. How to determine call order (middleware chain is order-sensitive)?

**Possible Parser Outputs:**

| Scenario | Parser Emits | Fix Approach |
|----------|--------------|--------------|
| A: No middleware facts | Only `router.post` and handler name | **Parser enhancement** (out of scope) + workaround |
| B: Middleware as separate facts | `call-arg-1: allowedRoles`, `call-arg-2: wrapAsync` | **Argument parsing** (medium complexity) |
| C: Nested calls | `wrapAsync(updateDisclosure)` is separate expression | **Expression tree traversal** (high complexity) |

### 5.3 Proposed Solution (Scenario B — Most Likely)

**Assumption:** Route definition arguments are emitted as `call-arg-N` facts in order.

#### Pattern: Route with Middleware

```javascript
router.post('/path', middleware1, middleware2, handler)
```

**Expected Facts:**
```typescript
{ predicate: 'calls-expression', object: 'router.post' }
{ predicate: 'call-arg-0', object: "'/path'" }        // Path
{ predicate: 'call-arg-1', object: 'middleware1' }    // First middleware
{ predicate: 'call-arg-2', object: 'middleware2' }    // Second middleware
{ predicate: 'call-arg-3', object: 'handler' }        // Final handler
```

#### Code Changes

**File:** `src/reasoning/patterns/express/router.ts`

**Change 1: Extract middleware chain**

```typescript
interface RouteHandler {
  method: HttpMethod;
  path: string;
  middlewareChain: string[];  // NEW: ordered middleware
  handler: string;            // NEW: final handler function
}

private extractRoutes(kb: KnowledgeBase, entity: Entity): RouteHandler[] {
  const routes: RouteHandler[] = [];

  for (const factSet of factSets) {
    const facts = factSet.facts.filter(f => f.subjectId === entity.id);

    for (let i = 0; i < facts.length; i++) {
      const fact = facts[i];

      if (fact.predicate === 'calls-expression') {
        const match = String(fact.object).match(routePattern);
        if (match) {
          const method = normalizeHttpMethod(match[2]);

          // Extract ALL arguments after route path
          const args: string[] = [];
          for (let j = i + 1; j < facts.length; j++) {
            const nextFact = facts[j];

            if (nextFact.predicate === 'calls-expression') {
              break; // Hit next route definition
            }

            if (nextFact.predicate.startsWith('call-arg-')) {
              const argIndex = parseInt(nextFact.predicate.split('-')[2]);
              args[argIndex] = String(nextFact.object);
            }
          }

          // args[0] = path, args[1..n-1] = middleware, args[n] = handler
          const path = args[0] || '(dynamic)';
          const handler = args[args.length - 1] || '(anonymous)';
          const middlewareChain = args.slice(1, -1); // Everything between path and handler

          routes.push({ method, path, middlewareChain, handler });
        }
      }
    }
  }

  return routes;
}
```

**Change 2: Enhance behavior description**

```typescript
describe(kb: KnowledgeBase, entity: Entity): BehaviorChunk[] {
  const routes = this.extractRoutes(kb, entity);

  if (routes.length === 0) {
    // Fallback to simple description
    return [{ textDraft: `Express Router ${entity.name}`, ... }];
  }

  // Rich description with middleware chains
  let textDraft = `Express Router ${entity.name} with route handlers:\n\n`;

  for (const route of routes) {
    textDraft += `**${route.method} ${route.path}**\n`;

    if (route.middlewareChain.length > 0) {
      textDraft += `- Middleware: ${route.middlewareChain.join(' → ')}\n`;
    }

    textDraft += `- Handler: ${route.handler}\n\n`;
  }

  return [{ id: chunkId, targetEntityId: entity.id, textDraft, factSetIds, confidence: 'High' }];
}
```

**Change 3: Link to handler entities**

```typescript
// After extracting routes, resolve handler names to entities
private linkHandlerEntities(kb: KnowledgeBase, routes: RouteHandler[]): void {
  for (const route of routes) {
    const handlerEntity = this.findEntityByName(kb, route.handler);

    if (handlerEntity) {
      // Create relationship: route uses handler
      // (Deferred to KB relationship tracking — out of scope for this fix)

      // For now, just note in description
      route.handler += ` (entity: ${handlerEntity.id})`;
    }
  }
}
```

### 5.4 Test Strategy

**TDD Workflow:**

**Red (Failing Tests):**

```typescript
// File: tests/reasoning/express-router-pattern.test.ts

describe('Middleware chain detection', () => {
  it('extracts middleware chain from route definition', () => {
    const router: Entity = {
      id: 'router-1',
      kind: 'constant',
      name: 'router',
      path: 'routes.js',
      exported: true,
    };

    const factSet: FactSet = {
      id: 'fs-chain',
      facts: [
        { subjectId: router.id, predicate: 'initializer-call', object: 'Router' },
        { subjectId: router.id, predicate: 'calls-expression', object: 'router.post' },
        { subjectId: router.id, predicate: 'call-arg-0', object: "'/disclosure/:id'" },
        { subjectId: router.id, predicate: 'call-arg-1', object: 'allowedRoles' },
        { subjectId: router.id, predicate: 'call-arg-2', object: 'wrapAsync' },
        { subjectId: router.id, predicate: 'call-arg-3', object: 'updateDisclosure' },
      ],
      sources: [],
      evidenceScore: 80,
    };

    kb.insertEntity(router);
    kb.insertFactSet(factSet);

    const pattern = new ExpressRouterPattern();
    const chunks = pattern.describe(kb, router);

    expect(chunks[0].textDraft).toContain('POST /disclosure/:id');
    expect(chunks[0].textDraft).toContain('Middleware: allowedRoles → wrapAsync');
    expect(chunks[0].textDraft).toContain('Handler: updateDisclosure');
  });

  it('handles routes without middleware', () => {
    const factSet: FactSet = {
      id: 'fs-no-middleware',
      facts: [
        { subjectId: 'r1', predicate: 'initializer-call', object: 'Router' },
        { subjectId: 'r1', predicate: 'calls-expression', object: 'router.get' },
        { subjectId: 'r1', predicate: 'call-arg-0', object: "'/health'" },
        { subjectId: 'r1', predicate: 'call-arg-1', object: 'healthCheck' },
      ],
      sources: [],
      evidenceScore: 80,
    };

    // Should NOT show "Middleware: (none)" — omit if empty
    const chunks = pattern.describe(kb, router);
    expect(chunks[0].textDraft).toContain('Handler: healthCheck');
    expect(chunks[0].textDraft).not.toContain('Middleware');
  });

  it('handles nested middleware calls (wrapAsync wrapping handler)', () => {
    // Challenge: wrapAsync(updateDisclosure) may be parsed as nested expression
    // Expected: call-arg-2: 'wrapAsync', with nested 'updateDisclosure' inside

    // This test will FAIL initially — acceptable limitation to document
    // OR implement expression tree parsing (deferred to post-M3)
  });
});
```

**Green (Implementation):**
- Implement `extractRoutes()` changes
- Run tests until green
- Document limitations (nested calls not fully supported)

**Refactor:**
- Extract middleware chain formatting to helper
- Add JSDoc comments for new `RouteHandler` interface

### 5.5 Acceptance Criteria

- [ ] Middleware chains extracted for routes with 1-3 middleware functions
- [ ] Handler function name captured
- [ ] Route descriptions include middleware and handler
- [ ] Unit tests pass (including polluted datasets)
- [ ] Integration test with `output-test/routes.js` shows middleware chains
- [ ] Coverage ≥80% for modified sections

**Limitation Documented:**
- Nested calls (`wrapAsync(updateDisclosure)`) may show `wrapAsync` as handler, not `updateDisclosure`
- Workaround: Declare handlers separately (already best practice)

### 5.6 Impact on Spec Output

**Before Fix 2:**
```markdown
### POST /disclosure/:id
- Handler: (not documented)
```

**After Fix 2:**
```markdown
### POST /disclosure/:id
- Middleware: allowedRoles → wrapAsync
- Handler: updateDisclosure
```

**After Fix 4 (Route Handler Middleware Recognition):**
```markdown
### POST /disclosure/:id
- Middleware: allowedRoles → wrapAsync
- Handler: updateDisclosure ([link to function spec](#updateDisclosure))
  - Async route handler that processes requests (req, res, next signature)
  - Database: Updates Disclosure model
```

---

## 6. Fix 3: Dynamic Mongoose Model Resolution

**Priority:** 🟡 MEDIUM (Pattern-level)
**Effort:** 3-4 days
**Owner:** Implementation Agent
**Can Parallelize With:** Fix 2

### 6.1 Root Cause

**Current Pattern** (`src/reasoning/patterns/express/mongoose-query.ts:213-251`):

```typescript
private extractQueryOperations(kb: KnowledgeBase, entity: Entity): QueryOperation[] {
  for (const fact of callExprs) {
    const callExpr = String(fact.object);

    // Pattern: ModelName.method(...)
    for (const method of ALL_QUERY_METHODS) {
      const pattern = new RegExp(`(\\w+)\\.${method}\\b`);
      const match = callExpr.match(pattern);
      // ...
    }
  }
}
```

**Problem:** This works for static models:

```javascript
const Disclosure = require('./models/Disclosure');
await Disclosure.updateMany({ userId }, { $set: { active } });
// ✅ Matches: 'Disclosure.updateMany'
```

But fails for dynamic models:

```javascript
const Disclosure = req.model('Disclosure');
await Disclosure.updateMany(...);
// ❌ Parser may emit: 'req.model', then 'Disclosure.updateMany'
// Pattern doesn't link these two calls
```

**Or chained dynamic calls:**

```javascript
await req.model('Disclosure').updateMany(...);
// ❌ Parser may emit: 'req.model(...).updateMany'
// Regex `(\\w+)\\.updateMany` matches 'model' (wrong!) or ')' (syntax error)
```

### 6.2 Investigation Required

**Phase -1 must answer:**
1. How are `req.model('ModelName')` calls represented in KB?
2. Is model name extractable from `call-arg-0` of `req.model` call?
3. Are chained calls preserved or split?

**Possible Parser Outputs:**

| Code Pattern | Parser Facts | Fix Approach |
|--------------|--------------|--------------|
| `const M = req.model('Disclosure'); M.updateMany()` | Two separate expressions | **Assignment tracking** (medium) |
| `req.model('Disclosure').updateMany()` | Chained expression | **Regex enhancement** (simple) |
| `const modelName = 'Disclosure'; req.model(modelName)` | Dynamic string, not literal | **Low confidence + caveat** (acceptable) |

### 6.3 Proposed Solution

**Strategy:** Support chained calls, document limitation for dynamic strings.

#### Code Changes

**File:** `src/reasoning/patterns/express/mongoose-query.ts`

**Change 1: Detect req.model() chained calls**

```typescript
private extractQueryOperations(kb: KnowledgeBase, entity: Entity): QueryOperation[] {
  const operations: QueryOperation[] = [];

  for (const fact of callExprs) {
    const callExpr = String(fact.object);

    // Pattern 1: Static model (existing)
    for (const method of ALL_QUERY_METHODS) {
      const staticPattern = new RegExp(`(\\w+)\\.${method}\\b`);
      const staticMatch = callExpr.match(staticPattern);

      if (staticMatch) {
        operations.push({ modelName: staticMatch[1], method, category: this.getMethodCategory(method) });
      }
    }

    // Pattern 2: Dynamic req.model('ModelName').method(...)
    for (const method of ALL_QUERY_METHODS) {
      const dynamicPattern = new RegExp(`req\\.model\\(['"]([^'"]+)['"]\\)\\.${method}\\b`);
      const dynamicMatch = callExpr.match(dynamicPattern);

      if (dynamicMatch) {
        const modelName = dynamicMatch[1];
        operations.push({ modelName, method, category: this.getMethodCategory(method) });
      }
    }
  }

  return operations;
}
```

**Change 2: Fallback for assignment pattern**

```typescript
// If we see: req.model('Disclosure') but NO chained call
// Check next facts for variable assignment, then use of that variable

// Example:
// fact 1: calls-expression: req.model
// fact 2: call-arg-0: 'Disclosure'
// fact 3: assigned-to-variable: Disclosure  (hypothetical predicate)
// fact 4: calls-expression: Disclosure.updateMany

// Implementation: Track last req.model() call, associate next query with that model
let lastReqModel: string | null = null;

for (const fact of callExprs) {
  const callExpr = String(fact.object);

  if (callExpr === 'req.model') {
    // Find model name from next call-arg-0
    const modelNameFact = getFirstFact(kb, entity, 'call-arg-0'); // Simplified
    if (modelNameFact) {
      lastReqModel = String(modelNameFact.object).replace(/['"]/g, '');
    }
  } else if (lastReqModel && ALL_QUERY_METHODS.some(m => callExpr.includes(`.${m}`))) {
    // This is a query on the dynamically resolved model
    operations.push({ modelName: lastReqModel, method: '...', category: 'read' });
    lastReqModel = null; // Reset
  }
}
```

**Change 3: Add confidence caveat for unresolved models**

```typescript
describe(kb: KnowledgeBase, entity: Entity): BehaviorChunk[] {
  const operations = this.extractQueryOperations(kb, entity);

  let textDraft = '';
  for (const op of operations) {
    const modelEntity = this.resolveModelEntity(kb, entity, op.modelName);

    if (!modelEntity) {
      // Model not resolved — add caveat
      textDraft += `Performs Mongoose ${op.category} query (${op.method}) on ${op.modelName} (model resolved dynamically at runtime).`;
    } else {
      // Normal flow
      textDraft += `Performs Mongoose ${op.category} query (${op.method}): ${op.modelName}.`;
    }
  }

  return [{ textDraft, confidence: modelEntity ? 'High' : 'Medium', ... }];
}
```

### 6.4 Test Strategy

**TDD Workflow:**

**Red (Failing Tests):**

```typescript
// File: tests/reasoning/express/mongoose-query-pattern.test.ts

describe('Dynamic Mongoose model resolution', () => {
  it('detects chained req.model().updateMany() calls', () => {
    const handler: Entity = {
      id: 'handler-1',
      kind: 'function',
      name: 'changeDisclosureActive',
      path: 'routes.js',
      exported: true,
    };

    const factSet: FactSet = {
      id: 'fs-dynamic',
      facts: [
        { subjectId: handler.id, predicate: 'is-function', object: true },
        { subjectId: handler.id, predicate: 'calls-expression', object: "req.model('Disclosure').updateMany" },
      ],
      sources: [],
      evidenceScore: 70,
    };

    kb.insertEntity(handler);
    kb.insertFactSet(factSet);

    const pattern = new MongooseQueryPattern();
    expect(pattern.matches(kb, handler)).toBe(true);

    const chunks = pattern.describe(kb, handler);
    expect(chunks[0].textDraft).toContain('updateMany');
    expect(chunks[0].textDraft).toContain('Disclosure');
    expect(chunks[0].textDraft).toContain('resolved dynamically');
  });

  it('handles assignment pattern (req.model → variable → query)', () => {
    const factSet: FactSet = {
      id: 'fs-assignment',
      facts: [
        { subjectId: 'h1', predicate: 'calls-expression', object: 'req.model' },
        { subjectId: 'h1', predicate: 'call-arg-0', object: "'Disclosure'" },
        { subjectId: 'h1', predicate: 'calls-expression', object: 'Disclosure.updateMany' },
      ],
      sources: [],
      evidenceScore: 70,
    };

    kb.insertEntity(handler);
    kb.insertFactSet(factSet);

    const chunks = pattern.describe(kb, handler);
    expect(chunks[0].textDraft).toContain('Disclosure');
    expect(chunks[0].textDraft).toContain('updateMany');
  });

  it('documents limitation for dynamic string model names', () => {
    // const modelName = getModelName(); req.model(modelName).find();
    // Expected: Not detected OR low confidence with caveat

    const factSet: FactSet = {
      id: 'fs-dynamic-string',
      facts: [
        { subjectId: 'h1', predicate: 'calls-expression', object: 'req.model' },
        { subjectId: 'h1', predicate: 'call-arg-0', object: 'modelName' }, // Variable, not literal
      ],
      sources: [],
      evidenceScore: 50,
    };

    kb.insertEntity(handler);
    kb.insertFactSet(factSet);

    const pattern = new MongooseQueryPattern();
    // May not match — acceptable limitation
    const matched = pattern.matches(kb, handler);

    if (matched) {
      const chunks = pattern.describe(kb, handler);
      expect(chunks[0].confidence).toBe('Low');
      expect(chunks[0].textDraft).toContain('model name not statically determined');
    }
  });
});
```

**Green:** Implement Change 1 (chained calls), then Change 2 (assignment) if needed.

**Refactor:** Extract model name extraction to helper function.

### 6.5 Acceptance Criteria

- [ ] Chained `req.model('X').method()` calls detected
- [ ] Assignment pattern supported (if facts available)
- [ ] Dynamic string model names documented as limitation
- [ ] Confidence downgraded to Medium for unresolved models
- [ ] Unit tests pass
- [ ] Integration test with `output-test/routes.js` shows Mongoose queries

**Documented Limitation:**
```markdown
## Known Limitations: Mongoose Query Detection

- **Dynamic model names:** If model name is computed at runtime (e.g., `req.model(getModelName())`), pattern will not detect query. Workaround: Use static model imports where possible.
- **Confidence:** Queries on dynamically resolved models are marked Medium confidence with caveat "(model resolved dynamically at runtime)".
```

### 6.6 Impact on Validation Metrics

**Before Fix 3:**
- Mongoose query detection: 10% (2/20 queries)

**After Fix 3:**
- Mongoose query detection: ~70% (14/20 queries)
- Remaining 30% are queries with dynamic model names (acceptable limitation)

---

## 7. Fix 4: Route Handler Middleware Recognition

**Priority:** 🟡 MEDIUM (Pattern-level)
**Effort:** 2-3 days
**Owner:** Implementation Agent
**Depends On:** Fix 2 (middleware chains must be extracted first)

### 7.1 Root Cause

**Current Middleware Pattern** (`src/reasoning/patterns/express/middleware.ts:32-59`):

```typescript
matches(kb: KnowledgeBase, entity: Entity): boolean {
  if (entity.kind !== 'function') return false;

  const paramCount = getParameterCount(kb, entity);
  if (paramCount !== 3) return false;

  const paramNames = getParameterNames(kb, entity);
  const namesStr = paramNames.join(',').toLowerCase();
  return /req.*res.*next/i.test(namesStr);
}
```

**Problem:** This correctly identifies middleware, but only for exported functions:

```javascript
// ✅ DETECTED (exported)
function unsetDisposition(req, res, next) { ... }
module.exports = { unsetDisposition };

// ❌ NOT DETECTED (not exported, used inline)
async function updateDisclosure(req, res, next) { ... }
router.post('/disclosure/:id', wrapAsync(updateDisclosure));
```

**Why?** Pattern matcher may only process exported entities, or route handlers have `exported: false` flag.

### 7.2 Investigation Required

**Phase -1 must answer:**
1. Do route handler functions exist as entities?
2. Are they marked `exported: false`?
3. Does middleware pattern skip non-exported functions?

**Possible Scenarios:**

| Scenario | Entity Exists? | Exported? | Pattern Match? | Fix |
|----------|----------------|-----------|----------------|-----|
| A | ❌ No | N/A | ❌ | Parser limitation (out of scope) |
| B | ✅ Yes | ❌ No | ❌ | **Remove export requirement** |
| C | ✅ Yes | ✅ Yes | ✅ | Already works (investigate why test case failed) |

### 7.3 Proposed Solution (Scenario B — Most Likely)

**Assumption:** Route handlers ARE entities but middleware pattern requires `exported: true`.

#### Code Changes

**File:** `src/reasoning/patterns/express/middleware.ts`

**Change 1: Remove export requirement**

```typescript
// OLD: No explicit export check, but reasoning engine may filter by exported

// NEW: Process ALL functions with (req, res, next) signature
matches(kb: KnowledgeBase, entity: Entity): boolean {
  if (entity.kind !== 'function') return false;

  const paramCount = getParameterCount(kb, entity);
  if (paramCount !== 3) return false;

  const paramNames = getParameterNames(kb, entity);
  const namesStr = paramNames.join(',').toLowerCase();

  return /req.*res.*next/i.test(namesStr);
  // No check for entity.exported — intentionally omitted
}
```

**Change 2: Confidence adjustment based on usage**

```typescript
confidenceAdjustments(kb: KnowledgeBase, entity: Entity): ConfidenceDelta | undefined {
  if (!this.matches(kb, entity)) return undefined;

  // Higher confidence if function is used in route definition
  const usedInRoute = this.isUsedAsRouteHandler(kb, entity);

  if (usedInRoute) {
    return { adjustment: 15, reason: 'Express route handler (used in router definition)' };
  } else if (entity.exported) {
    return { adjustment: 10, reason: 'Express middleware (exported)' };
  } else {
    return { adjustment: 5, reason: 'Express middleware signature (not exported)' };
  }
}

private isUsedAsRouteHandler(kb: KnowledgeBase, entity: Entity): boolean {
  // Check if entity name appears in any router's route definitions
  // This requires access to router entities — may need KB query helper

  const routerEntities = kb.getAllEntities().filter(e =>
    e.kind === 'constant' &&
    hasFact(kb, e, 'initializer-call', 'Router')
  );

  for (const router of routerEntities) {
    const factSets = getFactSets(kb, router);
    for (const fs of factSets) {
      for (const fact of fs.facts) {
        if (fact.predicate.startsWith('call-arg-') && String(fact.object) === entity.name) {
          return true; // Found entity name in route arguments
        }
      }
    }
  }

  return false;
}
```

**Change 3: Enhance description for route handlers**

```typescript
describe(kb: KnowledgeBase, entity: Entity): BehaviorChunk[] {
  if (!this.matches(kb, entity)) return [];

  const isRouteHandler = this.isUsedAsRouteHandler(kb, entity);

  let textDraft = '';
  if (isRouteHandler) {
    textDraft = `Express route handler ${entity.name} that processes HTTP requests. Takes request, response, and next function as parameters.`;
  } else {
    textDraft = `Express middleware function ${entity.name} that processes requests in the middleware chain. Takes request, response, and next function as parameters.`;
  }

  return [{ textDraft, confidence: 'High', ... }];
}
```

### 7.4 Test Strategy

**TDD Workflow:**

**Red (Failing Tests):**

```typescript
// File: tests/reasoning/express-middleware-pattern.test.ts

describe('Route handler middleware recognition', () => {
  it('matches non-exported route handlers', () => {
    const handler: Entity = {
      id: 'handler-1',
      kind: 'function',
      name: 'updateDisclosure',
      path: 'routes.js',
      exported: false, // ← Key difference
    };

    const factSet: FactSet = {
      id: 'fs-handler',
      facts: [
        { subjectId: handler.id, predicate: 'is-function', object: true },
        { subjectId: handler.id, predicate: 'param-count', object: 3 },
        { subjectId: handler.id, predicate: 'param-0', object: 'req' },
        { subjectId: handler.id, predicate: 'param-1', object: 'res' },
        { subjectId: handler.id, predicate: 'param-2', object: 'next' },
      ],
      sources: [],
      evidenceScore: 80,
    };

    kb.insertEntity(handler);
    kb.insertFactSet(factSet);

    const pattern = new ExpressMiddlewarePattern();
    expect(pattern.matches(kb, handler)).toBe(true);

    const chunks = pattern.describe(kb, handler);
    expect(chunks[0].textDraft).toContain('Express');
    expect(chunks[0].textDraft).toContain('updateDisclosure');
  });

  it('distinguishes route handlers from generic middleware', () => {
    const router: Entity = {
      id: 'router-1',
      kind: 'constant',
      name: 'router',
      path: 'routes.js',
      exported: true,
    };

    const handler: Entity = {
      id: 'handler-1',
      kind: 'function',
      name: 'updateDisclosure',
      path: 'routes.js',
      exported: false,
    };

    const routerFactSet: FactSet = {
      id: 'fs-router',
      facts: [
        { subjectId: router.id, predicate: 'initializer-call', object: 'Router' },
        { subjectId: router.id, predicate: 'calls-expression', object: 'router.post' },
        { subjectId: router.id, predicate: 'call-arg-0', object: "'/disclosure/:id'" },
        { subjectId: router.id, predicate: 'call-arg-1', object: 'wrapAsync' },
        { subjectId: router.id, predicate: 'call-arg-2', object: 'updateDisclosure' }, // ← Handler referenced
      ],
      sources: [],
      evidenceScore: 80,
    };

    const handlerFactSet: FactSet = {
      id: 'fs-handler',
      facts: [
        { subjectId: handler.id, predicate: 'is-function', object: true },
        { subjectId: handler.id, predicate: 'param-count', object: 3 },
        { subjectId: handler.id, predicate: 'param-0', object: 'req' },
        { subjectId: handler.id, predicate: 'param-1', object: 'res' },
        { subjectId: handler.id, predicate: 'param-2', object: 'next' },
      ],
      sources: [],
      evidenceScore: 80,
    };

    kb.insertEntity(router);
    kb.insertEntity(handler);
    kb.insertFactSet(routerFactSet);
    kb.insertFactSet(handlerFactSet);

    const pattern = new ExpressMiddlewarePattern();
    const chunks = pattern.describe(kb, handler);

    expect(chunks[0].textDraft).toContain('route handler'); // Not generic "middleware"

    const delta = pattern.confidenceAdjustments(kb, handler);
    expect(delta?.adjustment).toBeGreaterThan(10); // Higher confidence for route handlers
  });
});
```

**Green:** Implement Change 1 (remove export check), then Changes 2-3 (usage-based classification).

**Refactor:** Extract route handler detection to shared helper (may be reused by other patterns).

### 7.5 Acceptance Criteria

- [ ] Non-exported functions with (req, res, next) signature are detected
- [ ] Route handlers distinguished from generic middleware
- [ ] Confidence adjustment based on usage in routes
- [ ] Unit tests pass
- [ ] Integration test shows route handlers documented
- [ ] Re-validation metrics improve (middleware detection >60%)

### 7.6 Impact on Validation Metrics

**Before Fix 4:**
- Middleware detection: 8% (2/25)

**After Fix 4:**
- Middleware detection: ~70% (18/25)
- Remaining functions may be error handlers (4-param) or utilities (2-param) — correctly excluded

---

## 8. Test Strategy

**Overall Approach:** Follow TDD best practices from AGENTS.md §333-382.

### 8.0 Root Cause: Why Did 1155 Existing Tests Fail Us?

**Critical Context:** We had 1155 passing tests with 93%+ coverage, yet 0% route detection on a real file. This is a **test strategy failure**, not just a code bug.

#### The Problem: Synthetic Test Data vs Real Parser Output

**What Went Wrong:**

1. **Unit tests used hand-crafted KB facts** that didn't match real parser output:
   ```typescript
   // ❌ TEST (What we thought parser emitted):
   { predicate: 'calls-expression', object: 'router.post' }
   { predicate: 'call-arg-0', object: "'/disclosure/:id'" }

   // ✅ REALITY (What parser actually emits):
   { predicate: 'calls-expression', object: 'router' }  // Or no fact at all
   { predicate: 'member-access', object: 'post' }       // Separate fact
   // OR: Route calls not emitted as facts (parser limitation)
   ```

2. **Integration tests used tiny synthetic fixtures**:
   ```javascript
   // tests/fixtures/tiny-express/app.js (SYNTHETIC)
   const app = express();
   app.get('/users', (req, res) => res.json(users));

   // vs. REAL-WORLD CODE:
   const router = express.Router();
   router.post('/disclosure/:id', allowedRoles('ANY'), wrapAsync(updateDisclosure));
   ```

3. **No end-to-end validation on OSS codebases** until now (Wave 1A validation was the FIRST real-world test).

4. **Coverage metrics misled us:** 93% branch coverage meant "all code paths executed," not "all real-world patterns tested."

#### Why This Escaped Code Review

**Review focused on:**
- ✅ Test count (1155 tests)
- ✅ Coverage percentage (93%)
- ✅ Test organization (unit, integration, fixtures)
- ✅ TDD workflow (Red-Green-Refactor)

**Review missed:**
- ❌ **Phase -1 analysis verification** — Did we dump KB from real OSS Express projects?
- ❌ **Parser output validation** — Are test facts structurally identical to parser output?
- ❌ **Negative validation** — Did we test on files where patterns SHOULD fail?
- ❌ **Real-world fixture requirement** — Synthetic fixtures too simple

#### Lessons Applied in This Plan

**New Requirements (Added to §8.4):**

1. **Mandatory Phase -1 KB dump before writing tests:**
   ```bash
   # BEFORE writing any pattern matcher tests:
   npm run ceps <real-oss-project> -- --llm off --debug > kb-dump.json
   jq '.factSets[].facts[] | select(.predicate == "calls-expression")' kb-dump.json

   # THEN design test facts to match EXACTLY what parser emits
   ```

2. **OSS fixture requirement (not just synthetic):**
   - Every pattern module MUST have 1-2 tests using real OSS code samples
   - Minimum: Run ceps on `expressjs/express/examples/` and verify output

3. **Negative validation tests:**
   ```typescript
   it('does NOT detect app.get() as router.get()', () => {
     // Ensure pattern distinguishes app instances from router instances
   });

   it('does NOT cross-contaminate routes between routers', () => {
     // Polluted dataset: 2 routers, verify routes don't bleed
   });
   ```

4. **End-to-end validation checkpoints:**
   - After each iteration (I1, I2, I3), run validation on 1-2 OSS projects
   - Don't wait until "all patterns complete" to validate on real code

5. **Test review checklist item:**
   - [ ] Tests use facts from real parser output (Phase -1 verified)
   - [ ] At least 1 OSS-derived fixture per pattern
   - [ ] Negative assertions present (what should NOT match)
   - [ ] End-to-end validation on real codebase

**Added to Acceptance Criteria (§9.1):**
- [ ] **Phase -1 analysis confirmed test facts match parser output** (NEW)
- [ ] **At least 1 OSS-derived test per fix** (NEW)
- [ ] **Negative validation tests present** (NEW)

#### Impact on Future Agents (React/Redux/GraphQL/HTTP)

**Before starting Wave 1B, React/Redux/GraphQL/HTTP agents MUST:**

1. Run Phase -1 analysis on real OSS projects:
   - React: Analyze `facebook/react/fixtures/` or popular OSS React app
   - Redux: Analyze `reduxjs/redux/examples/`
   - GraphQL: Analyze `apollographql/` or real GraphQL server
   - HTTP: Analyze real Axios/Fetch usage in OSS backend

2. Create OSS-derived fixtures BEFORE writing pattern matchers

3. Add end-to-end validation to Definition of Done (DoD):
   - "Pattern complete" = unit tests + integration tests + **validation on 1-2 OSS projects**

**Process Change Proposed:**
- Add "End-to-End Validation Checkpoint" after each iteration
- Update `docs/internal/PHASE6_EXPRESS_LESSONS.md` with "Test Strategy Failure Post-Mortem"
- Create `scripts/validate-pattern-on-oss.mjs` script for automated OSS validation

---

### 8.1 Test Pyramid

```
       /\
      /  \    End-to-End (1-2 tests)
     /----\   - Full validation: ceps on output-test/routes.js
    /      \  - Golden spec comparison
   /--------\
  / Integration \ (5-10 tests per fix)
 /--------------\  - Real fixtures (tiny-express, OSS samples)
/  Unit Tests    \ (20-50 tests per fix)
/------------------\  - Pattern matching, polluted datasets
      SOLID FOUNDATION
```

### 8.2 Polluted Dataset Requirements

**Per AGENTS.md §336-365 and Phase 6 Express lessons:**

**For Router Pattern (Fix 1):**
- Multiple routers in same file
- Named router instances (`usersRouter`, `postsRouter`)
- Generic `router` variable
- Competing `calls-expression` facts from different entities

**For Middleware Chain (Fix 2):**
- Routes with 0, 1, 2, 3+ middleware
- Nested middleware calls (`wrapAsync(allowedRoles(...))`)
- Inline anonymous functions vs named handlers

**For Mongoose Queries (Fix 3):**
- Static model imports vs dynamic `req.model()`
- Chained calls vs assignment pattern
- Multiple query methods in same function

**For Route Handler Middleware (Fix 4):**
- Exported vs non-exported functions
- 2-param, 3-param, 4-param functions (ensure correct filtering)
- Functions used in routes vs standalone middleware

### 8.3 Regression Guards

**Behavioral Regression Guards (AGENTS.md §367-372):**

1. **Golden spec fixtures:** Create expected spec for `output-test/routes.js` after fixes:
   ```typescript
   // File: tests/integration/validation-golden-spec.test.ts

   it('generates expected spec for routes.js after fixes', async () => {
     const result = await runCeps('output-test', { llm: 'off', deterministic: true });
     const actualSpec = fs.readFileSync('output-test/spec.md', 'utf8');
     const expectedSpec = fs.readFileSync('tests/fixtures/golden/routes-spec.md', 'utf8');

     expect(actualSpec).toBe(expectedSpec);
   });
   ```

2. **KB chunk assertions:** Verify routes are in Knowledge Base:
   ```typescript
   it('adds route chunks to KB', async () => {
     const kb = await runCepsAndGetKB('output-test');
     const routerEntity = kb.getEntitiesByKind('constant').find(e => e.name === 'router');
     const chunks = kb.getChunksByEntity(routerEntity.id);

     expect(chunks.length).toBeGreaterThan(0);
     expect(chunks[0].textDraft).toContain('POST /disclosure/:id');
   });
   ```

3. **Gate validation:** Ensure fixes don't break gates:
   ```typescript
   it('passes all quality gates after fixes', async () => {
     const result = await runCeps('output-test', { llm: 'off' });

     expect(result.gates.coverage).toBe('PASS');
     expect(result.gates.link).toBe('PASS');
     expect(result.gates.grounding).toBe('PASS');
     expect(result.gates.confidence).toBe('PASS');
   });
   ```

4. **LLM-off contract:** All fixes must work with `--llm off`:
   ```typescript
   it('generates meaningful descriptions without LLM', async () => {
     const result = await runCeps('output-test', { llm: 'off' });
     const spec = fs.readFileSync('output-test/spec.md', 'utf8');

     expect(spec).not.toContain('intent unclear from static analysis');
     expect(spec).toContain('POST /disclosure/:id');
     expect(spec).toContain('Express route handler');
   });
   ```

### 8.4 Phase -1 Analysis for Test Creation

**Before writing ANY tests:**
1. Run KB dump script on `output-test/routes.js`
2. Document actual parser output in Phase -1 doc
3. Design test fixtures to match real parser behavior
4. Avoid "cherry-picking" facts (include ALL competing candidates)

---

## 9. Validation & Acceptance

### 9.1 Unit Test Acceptance

**Per Fix:**
- [ ] All unit tests pass (Red → Green → Refactor complete)
- [ ] Coverage ≥80% for modified modules
- [ ] No regressions (all 1155 existing tests still pass)
- [ ] Lexicon validation green (if new terms added)
- [ ] **NEW: Phase -1 analysis confirmed test facts match parser output**
- [ ] **NEW: At least 1 OSS-derived test per fix (not just synthetic)**
- [ ] **NEW: Negative validation tests present (what should NOT match)**

### 9.2 Integration Test Acceptance

**After All Fixes:**
- [ ] End-to-end test with `output-test/routes.js` passes
- [ ] Golden spec comparison passes (or diff is acceptable)
- [ ] All quality gates PASS
- [ ] LLM-off mode generates meaningful descriptions

### 9.3 Re-Validation Criteria

**Run validation protocol from revised Phase 6 plan (§5.2):**

1. **Fixture-based accuracy:** F1 ≥0.90 on curated Express fixtures
2. **Real-world validation:** F1 ≥0.82 on `output-test/routes.js`
3. **Manual review:** Spot-check 10 routes for correctness

**Metrics Calculation:**

```typescript
// Validation script: scripts/run-backend-validation.mjs

const results = {
  routes: {
    expected: 23,
    detected: 0,  // Before fixes
    detected: 20, // After fixes (target)
    truePositives: 20,
    falsePositives: 0,
    falseNegatives: 3,
  },

  middleware: {
    expected: 25,
    detected: 2,  // Before fixes
    detected: 18, // After fixes (target)
  },

  mongooseQueries: {
    expected: 20,
    detected: 2,  // Before fixes
    detected: 14, // After fixes (target)
  },
};

const precision = results.routes.truePositives / (results.routes.truePositives + results.routes.falsePositives);
const recall = results.routes.truePositives / (results.routes.truePositives + results.routes.falseNegatives);
const f1 = 2 * (precision * recall) / (precision + recall);

console.log(`Precision: ${(precision * 100).toFixed(1)}%`);
console.log(`Recall: ${(recall * 100).toFixed(1)}%`);
console.log(`F1: ${(f1 * 100).toFixed(1)}%`);

// Target: F1 ≥ 82%
```

### 9.4 Go/No-Go Decision Criteria

**GO (Proceed to Wave 1B):**
- ✅ F1 ≥ 0.82 on `output-test/routes.js`
- ✅ Precision ≥ 85%, Recall ≥ 80%
- ✅ All quality gates PASS
- ✅ No blocking architectural issues
- ✅ LLM-off mode produces spec-ready output

**NO-GO (Iterate on fixes):**
- ❌ F1 < 0.82
- ❌ Systematic pattern confusion (e.g., routes vs middleware)
- ❌ Gate failures concentrated in specific patterns
- ❌ LLM-off prose unreadable

**Qualitative Override (per revised Phase 6 plan §5.2):**
Even if metrics pass, recommend NO-GO if:
- Spec output is misleading (hallucinations)
- Critical patterns missing (e.g., authorization invisible)
- Architectural issues discovered (cross-framework impact)

---

## 10. Timeline & Resources

### 10.1 Effort Estimates

| Phase | Owner | Duration | Dependencies |
|-------|-------|----------|--------------|
| **Phase -1: Investigation** | Investigation Agent | 3-5 days | None |
| **Fix 1: Router Detection** | Implementation Agent | 3-5 days | Phase -1 complete |
| **Fix 2: Middleware Chains** | Implementation Agent | 5-7 days | Fix 1 complete |
| **Fix 3: Dynamic Mongoose** | Implementation Agent | 3-4 days | Phase -1 complete (can parallelize with Fix 2) |
| **Fix 4: Route Handler Middleware** | Implementation Agent | 2-3 days | Fix 2 complete |
| **Validation & Testing** | Implementation Agent + Code Review Agent | 3-5 days | All fixes complete |
| **TOTAL** | | **19-29 days (3-6 weeks)** | Sequential + parallel |

### 10.2 Optimized Schedule (Parallelization)

**Week 1: Investigation + Fix 1**
- Days 1-5: Phase -1 investigation (Investigation Agent)
- Days 3-5: Begin Fix 1 (Router Detection) — can start after Phase -1 Day 3 findings

**Week 2: Fix 1 + Fix 2 + Fix 3 (Parallel)**
- Days 1-3: Complete Fix 1 (Router Detection)
- Days 1-5: Fix 3 (Dynamic Mongoose) — parallel track
- Days 4-7: Fix 2 (Middleware Chains) — starts after Fix 1

**Week 3: Fix 4 + Validation**
- Days 1-3: Fix 4 (Route Handler Middleware)
- Days 4-7: Integration testing, re-validation, golden spec creation

**Total Optimized Timeline:** 3 weeks (21 days)

### 10.3 Resource Requirements

**Agents:**
- **Investigation Agent** (1 agent, Week 1)
- **Implementation Agent** (1 agent, Weeks 1-3)
- **Code Review Agent** (intermittent, review after each fix)

**Tooling:**
- `scripts/debug-kb-dump.mjs` — KB fact dump script (NEW, created in Phase -1)
- `scripts/run-backend-validation.mjs` — Validation metrics script (from revised Phase 6 plan)
- Existing test infrastructure (Vitest, fixtures)

**Fixtures:**
- `output-test/routes.js` — Primary validation target (existing)
- `tests/fixtures/golden/routes-spec.md` — Golden spec for regression (NEW, created post-fixes)
- Polluted datasets for unit tests (NEW, created per fix)

---

## 11. Risk Assessment

### 11.1 High Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Parser limitations block fixes** | 40% | HIGH | Phase -1 investigation confirms early; document limitations; defer to post-M3 |
| **Regex complexity causes false positives** | 30% | MEDIUM | Polluted dataset tests catch cross-contamination; negative assertions mandatory |
| **Fixes introduce regressions** | 25% | HIGH | Golden spec tests; run full test suite after each fix; rollback plan ready |
| **Timeline slips beyond 3 weeks** | 50% | MEDIUM | Parallelization strategy; accept pattern-level limitations; focus on architectural fixes |

### 11.2 Medium Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Dynamic model resolution unsolvable** | 20% | MEDIUM | Document limitation; downgrade confidence; defer full solution to post-M3 |
| **Middleware chain parsing incomplete** | 30% | MEDIUM | Support simple cases (1-3 middleware); document nested call limitation |
| **Re-validation still fails (F1 < 0.82)** | 15% | HIGH | Iterate on fixes; adjust acceptance threshold if qualitative output good |

### 11.3 Low Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Test suite becomes too slow** | 10% | LOW | Optimize polluted dataset size; parallelize test execution |
| **Lexicon validation fails** | 5% | LOW | Reuse existing Express lexicon terms; validate early |

### 11.4 Risk Acceptance

**Out of Scope / Acceptable Limitations:**
- **Nested middleware calls** (`wrapAsync(allowedRoles(...))`) — Document limitation, defer to post-M3
- **Dynamic model names from variables** (`req.model(getModelName())`) — Low confidence + caveat acceptable
- **Router mounting paths** (`app.use('/api', router)`) — Defer to post-M3 (cross-entity linking complex)

**Documented in spec output:**
```markdown
## Known Limitations

- **Nested middleware calls:** If middleware is nested (e.g., `wrapAsync(allowedRoles(...))`), inner middleware may not be visible. Workaround: Use flat middleware chains where possible.
- **Dynamic model resolution:** Mongoose queries using dynamically computed model names cannot be fully analyzed. Workaround: Use static model imports.
- **Router mount paths:** Effective route paths (e.g., `/api` + `/users`) are not computed. Each router's paths are documented relative to its mount point.
```

---

## 12. Decision Log

### Decision 1: Sequential vs Parallel Fix Approach

**Date:** 2025-11-08
**Decision:** Hybrid approach — Fix 1-2 sequential (architectural), Fix 3 parallel, Fix 4 after Fix 2
**Rationale:**
- Fix 1 (Router Detection) blocks Fix 2 (Middleware Chains) because chains depend on route facts
- Fix 3 (Dynamic Mongoose) is independent and can parallelize with Fix 2
- Fix 4 (Route Handler Middleware) needs Fix 2's middleware chain extraction

**Alternative Rejected:** Full parallelization — would cause integration conflicts and rework

---

### Decision 2: TDD Discipline vs Fast Implementation

**Date:** 2025-11-08
**Decision:** Strict TDD (Red-Green-Refactor) for all fixes
**Rationale:**
- AGENTS.md §295-308 mandates TDD
- Phase 3 lessons (TEST_COVERAGE_GAP_ANALYSIS.md) show bugs escape without realistic tests
- Polluted datasets catch cross-entity contamination that simple tests miss

**Alternative Rejected:** Write code first, add tests later — historically causes regressions

---

### Decision 3: Parser Enhancement vs Pattern Workarounds

**Date:** 2025-11-08
**Decision:** Pattern workarounds preferred; defer parser changes to post-M3
**Rationale:**
- Parser changes are high-risk (affect all frameworks)
- Phase -1 investigation may reveal patterns work with existing parser output
- M3 gate focused on Tier-0 framework patterns, not parser completeness

**Alternative Rejected:** Enhance parser to emit route handler facts — out of scope, delays M3

---

### Decision 4: Validation Threshold Adjustment

**Date:** 2025-11-08
**Decision:** Maintain F1 ≥ 0.82 threshold; no relaxation
**Rationale:**
- Revised Phase 6 plan sets 0.82 for real-world validation (vs 0.90 for fixtures)
- Gap accounts for dynamic patterns and edge cases
- Qualitative override allows NO-GO even if metrics pass

**Alternative Rejected:** Lower threshold to 0.70 — would compromise spec-ready quality

---

### Decision 5: Scope of Fixes (All 4 vs Critical Only)

**Date:** 2025-11-08
**Decision:** Implement all 4 fixes (Router, Middleware Chain, Dynamic Mongoose, Route Handler)
**Rationale:**
- Fixes 1-2 are architectural (block Wave 1B)
- Fixes 3-4 are pattern-level (quality issues, but affect validation metrics)
- Timeline (3 weeks) is acceptable vs risk of partial solution

**Alternative Rejected:** Fixes 1-2 only — would fail re-validation (F1 ~0.60 estimated)

---

## Appendix A: Phase -1 Investigation Template

**File:** `docs/internal/analysis/phase6-validation-fix-phase-minus-one.md`

```markdown
# Phase 6 Validation Fix — Phase -1 Investigation

**Date:** 2025-11-XX
**Owner:** Investigation Agent
**Purpose:** Confirm root causes before implementing fixes

---

## 1. KB Fact Dump Analysis

### 1.1 Router Entities

**Command:**
```bash
npm run ceps output-test -- --llm off --debug > kb-dump.json
jq '.entities[] | select(.kind == "constant" and .name == "router")' kb-dump.json
```

**Findings:**
- [ ] Router constant exists
- [ ] Has `initializer-call: Router` fact
- [ ] Route method calls present (`calls-expression: router.post`)
- [ ] Route paths extractable (`call-arg-0: '/disclosure/:id'`)

**Evidence:** [Paste JSON output here]

### 1.2 Route Handler Entities

**Command:**
```bash
jq '.entities[] | select(.name == "updateDisclosure")' kb-dump.json
```

**Findings:**
- [ ] Handler function exists as entity
- [ ] Has 3-parameter signature
- [ ] Parameter names: [req, res, next] or [Request, Response, NextFunction]
- [ ] Exported: true/false

**Evidence:** [Paste JSON output here]

### 1.3 Mongoose Query Facts

**Command:**
```bash
jq '.factSets[].facts[] | select(.predicate == "calls-expression" and (.object | contains("model")))' kb-dump.json
```

**Findings:**
- [ ] `req.model` calls present
- [ ] Model name in `call-arg-0`
- [ ] Query method calls linked to model

**Evidence:** [Paste JSON output here]

---

## 2. Pattern Matcher Traces

[Add debug logs from pattern matchers here]

---

## 3. Root Cause Confirmation Matrix

| Issue | Hypothesis | Confirmed? | Evidence | Recommended Fix |
|-------|-----------|------------|----------|-----------------|
| Router instances not detected | Pattern regex wrong | ✅/❌ | KB dump line X | Fix 1: Regex adjustment |
| Middleware chain ignored | No middleware facts | ✅/❌ | No `call-arg-N` for middleware | Fix 2: Argument parsing |
| Dynamic Mongoose models | Chained calls not matched | ✅/❌ | Regex fails on `req.model().find` | Fix 3: Dynamic pattern |
| Non-exported route handlers | Middleware pattern requires export | ✅/❌ | Entity has `exported: false` | Fix 4: Remove export check |

---

## 4. Parser Limitations (If Any)

[Document any parser limitations discovered]

**Limitation 1:** [Description]
- Impact: [Which fix is blocked]
- Workaround: [Defer to post-M3 / Document in spec]

---

## 5. Recommendations for Fixes

[Based on findings, confirm/adjust fix plans in validation-fix-plan.md]

**Fix 1 (Router Detection):** [Proceed as planned / Adjust regex / Defer]
**Fix 2 (Middleware Chains):** [Proceed / Parser limitation blocks / Partial solution OK]
**Fix 3 (Dynamic Mongoose):** [Proceed / Document limitation only]
**Fix 4 (Route Handler Middleware):** [Proceed / Already works (investigate false negative)]

---

## 6. Next Steps

1. Update `validation-fix-plan.md` with confirmed approaches
2. Create polluted dataset fixtures based on real parser output
3. Begin Fix 1 implementation (TDD)
```

---

## Appendix B: Validation Metrics Script

**File:** `scripts/run-backend-validation.mjs`

```javascript
#!/usr/bin/env node

/**
 * Backend Validation Script
 *
 * Runs ceps on specified project and calculates precision/recall/F1.
 * Usage: npx tsx scripts/run-backend-validation.mjs output-test
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const projectPath = process.argv[2];
if (!projectPath) {
  console.error('Usage: npx tsx scripts/run-backend-validation.mjs <project-path>');
  process.exit(1);
}

// Run ceps
console.log(`Running ceps on ${projectPath}...`);
execSync(`npm run ceps ${projectPath} -- --llm off --deterministic`, { stdio: 'inherit' });

// Load generated spec
const specPath = path.join(projectPath, 'spec.md');
const spec = fs.readFileSync(specPath, 'utf8');

// Manual annotation (replace with automated checks once golden spec exists)
console.log('\n=== Manual Review Required ===');
console.log('Review the generated spec and annotate results:');
console.log(`  1. Open ${specPath}`);
console.log('  2. Count routes, middleware, Mongoose queries');
console.log('  3. Identify true positives, false positives, false negatives');
console.log('  4. Calculate metrics:\n');

console.log('Precision = TP / (TP + FP)');
console.log('Recall = TP / (TP + FN)');
console.log('F1 = 2 * (Precision * Recall) / (Precision + Recall)');

// TODO: Automate with golden spec comparison
// TODO: Add JSON output for CI integration
```

---

## Appendix C: Success Criteria Checklist

### Phase -1 Investigation Complete

- [ ] KB fact dump analyzed
- [ ] Root causes confirmed (4/4)
- [ ] Parser limitations documented
- [ ] Phase -1 doc created and reviewed

### Fix 1: Router Detection Complete

- [ ] Unit tests pass (polluted datasets)
- [ ] Integration test passes
- [ ] Coverage ≥80%
- [ ] No regressions (1155 tests pass)
- [ ] Routes visible in re-validation (partial OK)

### Fix 2: Middleware Chains Complete

- [ ] Middleware chain extraction works
- [ ] Handler names linked to routes
- [ ] Unit tests pass
- [ ] Integration test with nested routes passes
- [ ] Spec output shows middleware chains

### Fix 3: Dynamic Mongoose Complete

- [ ] Chained `req.model().method()` detected
- [ ] Assignment pattern supported (if facts available)
- [ ] Limitation documented
- [ ] Unit tests pass
- [ ] Mongoose queries visible in re-validation

### Fix 4: Route Handler Middleware Complete

- [ ] Non-exported handlers detected
- [ ] Route handlers distinguished from middleware
- [ ] Unit tests pass
- [ ] Integration test shows route handler docs

### Final Validation Complete

- [ ] Re-run ceps on `output-test/routes.js`
- [ ] F1 ≥ 0.82 (or qualitative GO)
- [ ] All 23 routes documented
- [ ] Middleware chains preserved
- [ ] All quality gates PASS
- [ ] Golden spec regression test created
- [ ] Code Review Agent approval obtained

### Wave 1B Clearance

- [ ] Go/No-Go decision: **GO**
- [ ] Validation report published
- [ ] React/Redux/GraphQL/HTTP agents cleared to start
- [ ] Phase 6 plan updated with actual timeline
- [ ] **NEW: Process improvements documented for future agents (§8.0 lessons)**

### Process Improvements for Future Agents

**Mandatory changes before Wave 1B starts:**

- [ ] Update `docs/internal/PHASE6_EXPRESS_LESSONS.md` with §8.0 "Test Strategy Failure Post-Mortem"
- [ ] Create `scripts/validate-pattern-on-oss.mjs` for automated OSS validation
- [ ] Update DoD (Definition of Done) for pattern modules:
  - Old DoD: Unit tests + Integration tests + Coverage ≥80%
  - **NEW DoD:** Unit tests + Integration tests + Coverage ≥80% + **End-to-end validation on 1-2 OSS projects**
- [ ] Add to Code Review Agent checklist:
  - [ ] Phase -1 analysis doc exists and shows parser output inspection
  - [ ] Test facts match parser output (not hand-crafted assumptions)
  - [ ] At least 1 OSS-derived fixture per pattern
  - [ ] Negative validation tests present

---

**Plan Status:** 🟡 DRAFT — Awaiting Code Review Agent feedback

**Next Action:** Submit to Code Review Agent for review of:
1. Investigation plan completeness
2. Fix sequencing and dependencies
3. **Test strategy and root cause analysis (§8.0 — why did 1155 tests fail?)**
4. Test improvements (Phase -1 verification, OSS fixtures, negative tests)
5. Timeline realism (3 weeks optimistic vs 6 weeks pessimistic)
6. Risk mitigation for parser limitations
7. Process improvements for future agents

**Approval Criteria:**
- [ ] All Must-Have items addressed (investigation, fix approach, test strategy, timeline)
- [ ] Should-Have items documented (risks, limitations, decision log)
- [ ] Plan is actionable (no ambiguous "investigate further" without process)
- [ ] Success criteria measurable (F1 threshold, gate status, golden spec match)
