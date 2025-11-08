# Phase 6 WS-D Express: Phase -1 Analysis
**Date:** 2025-11-07
**Status:** Complete
**Purpose:** Document parser output and KB facts for Express patterns to inform pattern matcher design

---

## Executive Summary

Analyzed the `tiny-express` fixture (6 files) to understand how the existing Phase 2 parser extracts facts from Express code. Key findings:

1. **Top-level exports are captured** as entities (functions, constants)
2. **Inline/anonymous handlers are NOT extracted** as separate entities
3. **Router mount calls are captured** with path arguments  (`call-arg-0: /users`)
4. **Middleware signatures detected** via param-count and param-names
5. **Async keywords NOT captured** in current parser output

---

## Fixture Overview

### Files Analyzed
- `src/app.ts` - Express app creation with middleware & route mounts
- `src/middleware/auth.ts` - Standard 3-param middleware function
- `src/routes/users.ts` - Router with async GET/POST handlers (inline)
- `src/routes/posts.ts` - Router with handlers
- `src/utils/db.ts` - Database utility function

### Entities Extracted (6 total)
| Entity | Kind | Exported | Path | Notes |
|---|---|---|---|---|
| `createApp` | function | ✅ | src/app.ts | Mounts routers at `/users`, `/posts` |
| `authMiddleware` | function | ✅ | src/middleware/auth.ts | 3-param middleware |
| `postsRouter` | constant | ✅ | src/routes/posts.ts | Initialized with `Router()` |
| `usersRouter` | constant | ✅ | src/routes/users.ts | Initialized with `Router()` |
| `getDb` | function | ✅ | src/utils/db.ts | Database helper |
| *(anonymous)* | *(missing)* | N/A | src/routes/users.ts | **Inline route handlers not extracted!** |

---

## Available Fact Predicates (Phase 2 Parser Output)

From the `tiny-express` fixture, these predicates are available:

- `is-function` / `is-constant`
- `has-signature`
- `param-count` / `param-names`
- `calls-expression` - Call site expressions (e.g., `app.use`, `express.json`)
- `call-arg-0` - First argument to most recent call
- `initializer` / `initializer-call` - Constant initialization

### Missing Predicates (Phase 6 Needed)
- `is-async` / `returns-promise` - Not emitted for async functions!
- `http-method` - Not extracted from `router.get(...)` calls
- `route-path` - Not explicitly extracted (only in `call-arg-0`)
- `error-handler-arity` - Not distinct from regular param-count

---

## Pattern Detection Challenges

### Challenge 1: Inline Route Handlers Not Extracted
**Problem:**
```ts
usersRouter.get('/', async (req, res) => { ... });
```
The inline arrow function is NOT extracted as a separate entity, so we can't attach facts to it.

**Solution:**
Pattern matchers must work at the **router constant level** (e.g., `usersRouter`) and infer behaviors from **calls-expression facts** on the parent entity.

### Challenge 2: Multiple `calls-expression` + `call-arg-0` Facts
**Problem:**
The `createApp` entity has multiple `app.use` calls with different arguments:
```
calls-expression: app.use
calls-expression: app.use
call-arg-0: /users
calls-expression: app.use
call-arg-0: /posts
```

Parser emits facts **in document order**, but predicates are NOT namespaced per call. This creates ambiguity: which `call-arg-0` belongs to which `app.use`?

**Solution (from Phase 3 lessons):**
Search forward from `calls-expression` fact to find the NEXT `call-arg-0` before hitting another `calls-expression`. This associates arguments with specific calls.

**Reference:** See `PatternMatcher.ts:89-113` (matchExpressRouteHandler fix from FEEDBACK2).

### Challenge 3: Async Detection Missing
**Problem:**
The inline handlers in `users.ts` are declared `async`, but no `is-async` or `returns-promise` facts are emitted.

**Root Cause:**
Parser only extracts facts for **top-level exported entities**, not inline/anonymous functions.

**Solution:**
For Phase 6 I1, accept this limitation. Mark routes with database calls as "potentially async" with Medium confidence. For I2 (async support), we may need parser enhancements.

### Challenge 4: Router Initialization Pattern
**Problem:**
`usersRouter` is a constant with `initializer-call: Router`, but there's no direct link to the route handler calls (`usersRouter.get(...)`) in the facts.

**Solution:**
Use `calls-expression` facts that match `/^(usersRouter|postsRouter|router)\.(get|post|put|delete|patch)$/` to detect route definitions. Confidence scoring should check if the entity is initialized with `Router()`.

---

## Express Pattern Recognition Strategy

Based on this analysis, here's the recommended approach for Phase 6 patterns:

### Pattern 1: Route Mounts (e.g., `app.use('/users', usersRouter)`)
**Target Entity:** The function/constant that calls `app.use`
**Detection:**
- `calls-expression` matches `app.use`
- Look for `call-arg-0` immediately following (path)
- May have another `call-arg-0` or other args (router reference)

**Confidence:** High (≥70) if path literal found, Medium (40-69) if dynamic

### Pattern 2: Middleware (3-param functions)
**Target Entity:** Exported function
**Detection:**
- `param-count: 3`
- `param-names` matches `/req.*res.*next/i`

**Confidence:** High (≥70)

### Pattern 3: Error Handlers (4-param functions)
**Target Entity:** Exported function
**Detection:**
- `param-count: 4`
- `param-names` matches `/err.*req.*res.*next/i`

**Confidence:** High (≥70)
**Priority:** Must check BEFORE generic middleware (higher specificity)

### Pattern 4: Router Definitions (constants initialized with `Router()`)
**Target Entity:** Exported constant
**Detection:**
- `is-constant: true`
- `initializer-call: Router`

**Confidence:** High (≥70)

### Pattern 5: Route Handlers (calls on router constants)
**Target Entity:** Same entity as Pattern 4 (the router constant)
**Detection:**
- Entity matches Pattern 4
- `calls-expression` matches `/(router|[a-z]+Router)\.(get|post|put|delete|patch)/`
- Extract HTTP method from match
- Look for `call-arg-0` after the call (route path)

**Confidence:** High (≥70) if path literal, Medium if expression

**Challenges:**
- Must handle multiple route definitions per router
- Must parse facts in order to associate paths with methods
- Cannot detect async behavior of inline handlers

---

## Recommendations for Phase 6 Implementation

### Iteration I1 (Routes & Middleware)
1. ✅ Implement Pattern 2 (Middleware) - straightforward
2. ✅ Implement Pattern 4 (Router constants) - straightforward
3. ✅ Implement Pattern 1 (Route mounts) - requires FEEDBACK2-style argument association
4. ⚠️ **Defer Pattern 5 (Route handlers on routers)** - too complex for I1, needs multi-fact parsing

### Iteration I2 (Error & Async)
1. Implement Pattern 3 (Error handlers)
2. Investigate parser enhancements for inline `async` detection
3. If parser changes infeasible, use heuristics (DB calls → likely async, Medium confidence)

### Iteration I3 (Config)
1. Detect `app.set(...)`, `app.get(configKey)`, `process.env.*` reads
2. Associate config influences with routes/middleware

### Iteration I4 (Mongoose)
1. Analyze Mongoose fixture (needs to be created)
2. Detect `mongoose.model(...)`, schema definitions, hooks

---

## Testing Implications

### Polluted Datasets Required
Per AGENTS.md §"Test Creation Best Practices", pattern tests must include:

1. **Multiple routers in same file** - ensure we don't cross-match
2. **Multiple `app.use` calls with different paths** - test argument association
3. **Mix of middleware + route handlers** - test precedence
4. **Dynamic route paths** - test confidence downgrade

### Example Polluted Fixture Structure
```ts
// File: polluted-routes.ts
export const router1 = Router();
export const router2 = Router();

router1.get('/users', handler1);  // Should match
router2.post('/posts', handler2); // Should NOT appear in router1 description
router1.get('/admin', handler3);  // Should also match router1

// Ensure router2 facts don't leak into router1 behavior chunks
```

---

## Next Steps

1. ✅ **Phase -1 analysis complete** - documented in this file
2. **Day 3**: Begin I1 implementation with TDD
   - Start with middleware pattern (simplest)
   - Add router constant detection
   - Add route mount detection with argument association
3. **Day 4**: Continue I1 with polluted fixtures and KB chunk assertions
4. **Day 5**: I2 (error handlers + async heuristics)

---

## Appendix: Full Parser Output

For detailed parser output, see `scripts/phase6-dump-express-facts.mjs` output above.

Key observations:
- `authMiddleware`: param-count=3, param-names="req,res,next" ✅ Perfect for middleware detection
- `createApp`: Multiple `app.use` calls with paths ✅ Good for mount detection
- `usersRouter`/`postsRouter`: initializer-call=Router ✅ Good for router detection
- Missing: inline handler facts, async indicators ❌ Limitation for I1
