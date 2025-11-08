# Phase 6 Routing Parser Fix — Plan Review

**Date:** 2025-11-08
**Reviewer:** Plan Review Agent
**Document Reviewed:** `docs/internal/analysis/phase6-routing-parser-fix-readme.md`
**Status:** ✅ **APPROVED WITH CONDITIONS**

---

## Executive Summary

The architect's remediation plan is **architecturally sound** and properly scoped. The proposed solution aligns with SADS component responsibilities, addresses the root cause identified in the Phase -1 investigation, and includes appropriate safeguards. However, there are **critical implementation details** that must be clarified before handoff to the Implementation Agent.

**Verdict:** **APPROVE** with mandatory clarifications in §6 (detailed below).

---

## 1. Strengths of the Plan

### 1.1 Root Cause Alignment ✅

The architect correctly identifies that the parser skips module-level call expressions (SADS §3.1, Component 2 responsibility). This matches the Phase -1 investigation finding that `router.post(...)` calls at module scope produce **zero facts** despite the `router` constant being captured.

**Evidence from investigation:**
- Router entity found: ✅ (ID: `dXIyQqqoq9`)
- Router facts: Only `is-constant`, `initializer`, `initializer-call` ✅
- Route method calls: ❌ **NOT FOUND** (0/23 routes)

**Architect's solution:** Add `ModuleScopeWalker` to traverse `sourceFile.getStatements()` and emit call facts on constant entities.

**Assessment:** This directly addresses the gap without violating component boundaries.

---

### 1.2 Architectural Integrity ✅

**Component responsibilities preserved:**

1. **Parser (CTS-05)** — Extracts facts, emits normalized predicates
   - ✅ New traversal stays within parser boundaries
   - ✅ No logic leak into Reasoning Engine (CTS-06)

2. **Knowledge Base (CTS-01)** — Stores facts with attribution
   - ✅ No schema changes required (existing predicates sufficient)
   - ✅ Anchoring strategy for pseudo-entities maintains determinism

3. **Reasoning Engine (CTS-06)** — Consumes facts, builds behavior chunks
   - ✅ Pattern matchers receive same fact shapes as intra-function calls
   - ✅ No bespoke adapters needed per framework

**SADS compliance:**
- §3.1 (Component 2): Parser extracts call graphs → ✅ Extended to module scope
- §4.2 (Confidence): Facts enable Medium/High confidence → ✅ Resolves forced QIDs
- §8 (Grounding): FactSet attribution preserved → ✅ Chunk-level grounding intact

---

### 1.3 Risk Mitigation ✅

The architect identifies **four critical risks** and provides **concrete mitigations**:

| Risk | Mitigation | Assessment |
|------|------------|------------|
| Performance degradation | Benchmarks, short-circuit visited nodes | ✅ Sufficient |
| Fact explosion / noise | Predicate filtering, deduplication | ✅ Sufficient |
| Downstream regressions | Golden-spec diffs, integration tests | ✅ Sufficient |
| Scope creep | Document as authoritative fix scope | ✅ Sufficient |

**Additional safeguard:** Requirement for ≤10% slowdown on large files (5k+ LOC) with benchmarking enforced before merge.

---

### 1.4 Acceptance Criteria ✅

**Clear, measurable success metrics:**

1. Parser emits module-scope call facts → **Verifiable via unit tests**
2. Express docs cover 23/23 routes with auth/middleware → **Verifiable via re-validation**
3. No test regressions (≥1155 passing, ≥93% coverage) → **Verifiable via CI**
4. Performance delta ≤10% → **Verifiable via benchmarks**
5. Validation F1 ≥0.82 → **Verifiable via accuracy harness**

**Assessment:** Acceptance criteria are **SADS-compliant** and **unambiguous**.

---

## 2. Critical Gaps Requiring Clarification

### 2.1 Pseudo-Entity Strategy (BLOCKER) 🔴

**Issue:** Section 4.1 mentions synthesizing "module-level pseudo-entities" for bare expressions like `app.use(...)` but does not specify:

1. **Entity kind:** What value goes in the `kind` field? New kind `"module-scope"` or reuse `"constant"`?
2. **Entity name:** How is the name derived? `"module::<path>#L{line}"` as anchor, but what about `entity.name`?
3. **Ownership semantics:** If a bare expression calls multiple methods (`app.use(...).use(...)`), do we create one pseudo-entity per statement or per call?
4. **KB API impact:** Does `kb.addEntity()` need changes to support pseudo-entities, or are they indistinguishable from regular entities?

**Why this blocks implementation:**
- Parser must know how to create these entities (API call signature)
- Reasoning Engine must know how to query them (entity kind in predicates)
- Spec Generator must know how to render them (entity name in headings)

**Required clarification:**

```typescript
// Option A: Reuse constant kind with synthetic names
kb.addEntity({
  kind: 'constant',
  name: `module-scope-statement-L${lineNumber}`,
  path: filePath,
  exported: false,
  visibility: 'internal',
  metadata: { synthetic: true, scope: 'module' }
})

// Option B: New kind for module-level code
kb.addEntity({
  kind: 'module-scope',
  name: `L${lineNumber}`,
  path: filePath,
  exported: false,
  visibility: 'internal'
})
```

**Recommendation:** Architect must specify **Option A or B** (or propose alternative) with rationale.

---

### 2.2 Call Fact Ownership (BLOCKER) 🔴

**Issue:** Section 4.1 states:

> "For `const router = express.Router()`, emit under the `router` entity."

**Question:** How does the walker **link** a call expression to the owning entity?

**Example scenario:**
```javascript
const router = express.Router()  // Line 10
router.post('/users', handler)    // Line 20
router.get('/admin', handler)     // Line 30
```

**Required logic:**
1. Parse variable declaration at L10 → create `router` entity
2. Traverse statement at L20 → detect `router.post` call
3. **HOW:** Resolve `router` identifier to entity ID `dXIyQqqoq9`?
4. Emit facts with `subjectId: "dXIyQqqoq9"`

**Implementation sketch shows:**
```typescript
const objectName = calleeExpr.getExpression().getText(); // "router"
const constant = constantsByName.get(objectName);        // Lookup by name
```

**Problem:** This assumes **one entity per name** in the file. What if:
```javascript
function setup() {
  const router = express.Router()  // Entity A
  router.get('/local', handler)
}
const router = express.Router()    // Entity B (module scope)
router.get('/global', handler)
```

**Without scope tracking**, the walker will emit facts on **the wrong entity**.

**Required clarification:**
- Does the walker maintain a **scope stack** (module scope vs. function scope)?
- Does it use ts-morph's `Symbol` resolution to disambiguate?
- Does it skip calls inside functions (already handled by function walker)?

**Recommendation:** Architect must specify **scope resolution strategy** to prevent cross-contamination.

---

### 2.3 Chained Call Handling (CLARIFICATION NEEDED) ⚠️

**Issue:** Section 4.1 mentions:

> "Handle chained calls: `router.post(...).post(...)` (method chaining)"

**Questions:**
1. Does Express actually support `router.post(...).post(...)`? (Answer: **NO**, this is not valid Express syntax)
2. Does the architect mean `router.route('/x').get(...).post(...)`? (Answer: **YES**, this is valid)
3. How are intermediate calls represented?

**Valid Express chaining patterns:**
```javascript
// Pattern 1: Route chaining (common)
router.route('/users')
  .get(getUsers)
  .post(createUser)

// Pattern 2: Middleware chaining (common)
app.use(cors())
   .use(helmet())
   .use(express.json())
```

**Fact emission strategy:**

**Option A: Emit all calls in the chain**
```json
// For router.route('/users').get(getUsers).post(createUser)
{
  "subjectId": "router-entity-id",
  "predicate": "calls-expression",
  "object": "router.route"
},
{
  "subjectId": "router-entity-id",
  "predicate": "call-arg-0",
  "object": "/users"
},
{
  "subjectId": "router-entity-id",
  "predicate": "calls-expression",
  "object": "router.route(...).get"
},
{
  "subjectId": "router-entity-id",
  "predicate": "call-arg-0",
  "object": "getUsers"
}
```

**Option B: Emit only leaf calls (simplified)**
```json
// Only final .get() and .post() calls documented
{
  "subjectId": "router-entity-id",
  "predicate": "calls-expression",
  "object": "router.route.get"
},
{
  "subjectId": "router-entity-id",
  "predicate": "route-path",
  "object": "/users"
}
```

**Required clarification:**
- Which option aligns with Express pattern matcher expectations?
- Does the parser emit **all** intermediate calls or only **semantically relevant** ones?
- How does the pattern matcher reconstruct the full chain from facts?

**Recommendation:** Architect must specify **chaining fact model** with examples for `router.route().get()` and `app.use().use()`.

---

### 2.4 Argument Extraction Depth (CLARIFICATION NEEDED) ⚠️

**Issue:** Implementation sketch shows:

```typescript
if (Node.isStringLiteral(arg) || Node.isNumericLiteral(arg)) {
  // Only extract string/number literals
}
```

**Question:** How are **middleware function references** captured?

**Example:**
```javascript
router.post('/users', allowedRoles('ADMIN'), wrapAsync(createUser))
// Arg 0: "/users" (string literal) ✅ Extracted
// Arg 1: allowedRoles('ADMIN') (call expression) ❓ Extracted?
// Arg 2: wrapAsync(createUser) (call expression) ❓ Extracted?
```

**Expected facts for Express pattern matcher:**
```json
{
  "subjectId": "router-entity-id",
  "predicate": "call-arg-0",
  "object": "/users"
},
{
  "subjectId": "router-entity-id",
  "predicate": "call-arg-1",
  "object": "allowedRoles"  // Function name, not full call expression?
},
{
  "subjectId": "router-entity-id",
  "predicate": "call-arg-2",
  "object": "wrapAsync"  // Wrapper name
},
{
  "subjectId": "router-entity-id",
  "predicate": "call-arg-2-wrapped",
  "object": "createUser"  // Actual handler inside wrapper
}
```

**Current function walker (from Phase -1 doc, line 196-204):**
```typescript
args.forEach((arg, index) => {
  if (Node.isStringLiteral(arg) || Node.isNumericLiteral(arg)) {
    facts.push({
      subjectId: entityId,
      predicate: `call-arg-${index}`,
      object: arg.getText().replace(/['\"]/g, ''),
    });
  }
});
```

**Problem:** This **only** captures literals, not function references or call expressions.

**Required clarification:**
- Does the module-scope walker use the **same** argument extraction logic?
- If yes, how will Express patterns detect middleware (they need `allowedRoles`, `wrapAsync` names)?
- If no, what additional argument types are extracted?

**Recommendation:** Architect must specify **argument extraction rules** for module-scope calls, or confirm that middleware detection is **out of scope** for this fix (deferred to future work).

---

### 2.5 Test Fixture Gaps (CLARIFICATION NEEDED) ⚠️

**Issue:** Section 4.4 states:

> "Extend `tests/fixtures/phase5/baseline/tiny-express` with module-scope routes plus expectations."

**Questions:**
1. Does `tiny-express` fixture already exist? (Not mentioned in AGENTS.md fixture list)
2. If not, should it be created in `tests/fixtures/phase6/express/` instead?
3. What is the **minimal fixture** that validates the fix?

**Proposed minimal fixture:**
```javascript
// tests/fixtures/phase6/routing-parser-fix/simple-router.js
import express from 'express'

const router = express.Router()

// Test Case 1: Single-line route
router.get('/simple', simpleHandler)

// Test Case 2: Multi-argument route (middleware)
router.post('/auth', authenticate, createUser)

// Test Case 3: Multiline route
router.put(
  '/admin',
  authorize,
  updateSettings
)

// Test Case 4: Bare app expression
const app = express()
app.use(cors())

export default router
```

**Expected facts:**
- 3 router call expressions (get, post, put)
- 1 app call expression (use)
- Route paths: `/simple`, `/auth`, `/admin`
- Middleware: `authenticate`, `authorize`, `cors`

**Required clarification:**
- Where should the new fixture live? (phase5 vs. phase6 directory)
- Should it include **non-Express** patterns (Fastify, Koa) to prove generality?
- What is the **expected output spec** for this fixture?

**Recommendation:** Architect must specify **fixture location** and **expected spec output** (checked-in golden file).

---

### 2.6 Backward Compatibility Strategy (CLARIFICATION NEEDED) ⚠️

**Issue:** Section 6 (Open Questions, item 3) asks:

> "Will existing tests break if new facts are emitted?"

**Analysis:** This is **highly likely** if tests assert exact fact counts or specific factSet contents.

**Example test that will break:**
```typescript
// tests/parser/fact-extractor.test.ts (hypothetical)
test('extracts facts from constants', () => {
  const facts = extractFacts('const router = express.Router()')
  expect(facts).toHaveLength(3) // is-constant, initializer, initializer-call
  // ❌ WILL FAIL if module-scope walker emits additional facts
})
```

**Mitigation options:**

**Option A: Additive-only facts**
- Module-scope walker emits **new** facts with distinct predicates
- Existing predicates (`is-constant`, `initializer`) unchanged
- Tests that check for presence (not absence) still pass

**Option B: Flag-gated behavior**
- Add parser option `extractModuleScopeCalls: boolean` (default `false`)
- Phase 6 integration sets to `true`
- Existing tests remain unchanged (use default `false`)
- Deprecate flag in Phase 7

**Option C: Test migration**
- Update all affected tests to expect new facts
- Risk: Introduces noise in unrelated test files

**Required clarification:**
- Which option does the architect prefer?
- If Option A, what are the **new** predicate names? (e.g., `module-calls-expression` vs. `calls-expression`)
- If Option B, where is the flag added? (Parser constructor? extractFacts() parameters?)

**Recommendation:** Architect must specify **compatibility strategy** to prevent 1000+ test failures on first parser change.

---

## 3. Minor Issues & Suggestions

### 3.1 Performance Benchmark Specification 📊

**Current spec (§4.1):**
> "Add benchmarks... prove ≤10% slowdown on `tests/fixtures/perf/large-file.ts`."

**Issues:**
1. `large-file.ts` does not exist (not in fixture list)
2. No baseline timing defined (10% slower than what?)
3. No specification for benchmark harness (Vitest? Custom script?)

**Suggestion:**
```markdown
**Performance Benchmarks:**
1. **Create fixture:** `tests/fixtures/perf/large-file.ts` (5000 LOC, 50 module-level calls, 200 functions)
2. **Baseline:** Run current parser 10 times, record mean time (e.g., 450ms)
3. **Threshold:** New parser must complete in ≤495ms (450ms * 1.10)
4. **Harness:** `tests/performance/parser-benchmark.test.ts` using Vitest's `bench()` API
5. **CI gate:** Fail PR if benchmark exceeds threshold
```

**Recommendation:** Add explicit benchmark specification to §4.1.

---

### 3.2 CTS-05 Amendment Process 📝

**Current spec (§7, Open Questions, item 2):**
> "Should we backfill CTS-05 with a formal 'module scope extraction' section?"

**Reviewer answer:** **YES, MANDATORY.**

**Rationale:**
- CTS-05 is the **authoritative** parser specification
- Module-scope extraction is a **fundamental** capability (not a patch)
- Future agents will reference CTS-05 when extending other framework patterns

**Proposed CTS-05 amendment:**
```markdown
### 3.5 Module-Scope Call Extraction (Added 2025-11-08)

**Responsibility:** Capture call expressions at module level (outside functions/classes).

**Inputs:**
- SourceFile AST
- Constant entity map (from §3.4)

**Outputs:**
- `calls-expression`, `call-arg-{n}`, `call-object`, `call-property` facts
- Attached to constant entities or synthesized pseudo-entities

**Algorithm:**
1. Traverse `sourceFile.getStatements()`
2. For each ExpressionStatement or VariableStatement:
   - Detect CallExpression nodes
   - Resolve callee to constant entity (if applicable)
   - Emit facts with `subjectId = constantEntityId`
3. For bare expressions (e.g., `app.use()`):
   - Synthesize pseudo-entity with deterministic anchor
   - Emit facts on pseudo-entity

**Scope Handling:**
- Module-scope calls ONLY (skip nested function/class bodies)
- Maintain scope stack to avoid cross-contamination

**Performance:**
- Single-pass traversal (no redundant walks)
- Short-circuit visited nodes
- Target: ≤10% overhead vs. baseline
```

**Recommendation:** Architect must write CTS-05 amendment **before** implementation begins.

---

### 3.3 Validation Timeline Clarification 📅

**Current spec (§5):**
> "Re-run the validation scenario and at least two additional backend repos."

**Issues:**
1. Which "two additional backend repos"? (Not specified)
2. Who sources them? (Implementation Agent? Validation Agent? User-provided?)
3. What if repos are unavailable or proprietary?

**Suggestion:**
```markdown
**Validation Repositories:**
1. **Primary:** `output-test/routes.js` (already available, 2k LOC)
2. **Secondary 1:** Kuali COI backend subset (user-provided, requires sanitization)
3. **Secondary 2:** ceps self-host (`src/` directory — 10k+ LOC, no Express but validates no regression)

**Acceptance:**
- Primary F1 ≥0.82 (Express routing)
- Secondary 1 F1 ≥0.75 (real-world complexity)
- Secondary 2 F1 unchanged from Phase 5 baseline (regression check)

**Contingency:** If Secondary 1 unavailable, substitute with `express/examples` repo (MIT licensed, public).
```

**Recommendation:** Specify validation repos **now** to avoid scrambling during re-validation phase.

---

### 3.4 Rollback Plan 🔙

**Missing:** No contingency if the fix fails validation or causes critical regressions.

**Suggested addition to §6 (Risks & Mitigations):**

```markdown
**Rollback Strategy:**
1. **Trigger conditions:**
   - Validation F1 <0.70 after 2 fix iterations
   - Critical regressions in non-Express patterns (React, Redux, etc.)
   - Performance degradation >20% (double threshold)

2. **Rollback steps:**
   - Revert parser changes (git revert)
   - Mark Express as "Tier 1 (deferred)" in AGENTS.md
   - Proceed with Wave 1B (React/Redux/GraphQL) using existing parser
   - Defer Express to Phase 7 (post-M3)

3. **Communication:**
   - Update STATUS.md with rollback decision
   - Notify stakeholders of scope reduction
   - Document lessons learned in `docs/internal/analysis/routing-parser-fix-rollback.md`
```

**Recommendation:** Add rollback plan to README to give Implementation Agent clear exit criteria.

---

## 4. Alignment with SADS & CTS

### 4.1 SADS Compliance ✅

| SADS Section | Requirement | Plan Compliance |
|--------------|-------------|-----------------|
| §3.1 (Component 2) | Parser extracts call graphs | ✅ Extended to module scope |
| §4.2 (Confidence) | Facts enable Medium/High confidence | ✅ Resolves forced QIDs |
| §5 (Execution Flow) | Parse → Extract Facts → Draft | ✅ No flow changes |
| §8 (Grounding) | Every chunk has factSetId | ✅ Attribution preserved |
| §10 (Quality Gates) | Coverage, Grounding, Confidence | ✅ All gates addressable |

**Overall:** No SADS violations detected.

---

### 4.2 CTS-05 Compliance ✅

**Current CTS-05 responsibilities (Static Analysis Engine):**
- Extract exports, declarations, signatures
- Build call/import graphs
- Detect side-effects (I/O, network, DB)
- Flag dynamic patterns (eval, reflection)

**Plan additions:**
- ✅ Module-scope call extraction (natural extension of call graphs)
- ✅ Constant-to-call linkage (enhances call graph completeness)

**Gaps:**
- ⚠️ No formal CTS-05 amendment yet (see §3.2 above)

**Verdict:** Compliant with CTS-05 spirit; requires documentation update.

---

### 4.3 CTS-01 Compliance ✅

**Knowledge Base impact:**
- ✅ No schema changes (existing predicates sufficient)
- ✅ Entity model accommodates pseudo-entities (metadata field available)
- ✅ Anchoring strategy maintains determinism

**Open question:** Does pseudo-entity creation use existing `kb.addEntity()` API? (Answer needed in §2.1)

---

### 4.4 CTS-06 Compliance ✅

**Reasoning Engine impact:**
- ✅ Pattern matchers receive expected fact shapes
- ✅ No new predicates required (reuse `calls-expression`, etc.)
- ✅ Selector logic unchanged (same queries work on module-scope facts)

**Enhancement:** Express patterns can now query module-scope facts without code changes (just relaxing scope filters).

---

## 5. Implementation Readiness Assessment

### 5.1 Readiness Checklist

| Requirement | Status | Blocker? |
|-------------|--------|----------|
| **Root cause identified** | ✅ Complete | No |
| **Architectural solution defined** | ✅ Complete | No |
| **Component boundaries respected** | ✅ Complete | No |
| **Risk mitigations specified** | ✅ Complete | No |
| **Acceptance criteria defined** | ✅ Complete | No |
| **Pseudo-entity strategy** | ❌ Incomplete | **YES** 🔴 |
| **Call fact ownership** | ❌ Incomplete | **YES** 🔴 |
| **Chained call handling** | ❌ Incomplete | No (can defer) |
| **Argument extraction rules** | ❌ Incomplete | No (can simplify) |
| **Test fixtures specified** | ❌ Incomplete | No (can infer) |
| **Backward compatibility** | ❌ Incomplete | **YES** 🔴 |
| **CTS-05 amendment** | ❌ Not started | No (parallel work) |
| **Validation repos identified** | ❌ Not specified | No (can substitute) |

**Blocking issues:** 3 (pseudo-entities, ownership, compatibility)
**Non-blocking clarifications:** 5 (chaining, arguments, fixtures, CTS-05, repos)

---

### 5.2 Recommended Next Steps

**Before Implementation Begins:**

1. **BLOCKER 1 (Pseudo-Entities):** Architect must specify entity creation strategy (§2.1 Option A or B)
2. **BLOCKER 2 (Ownership):** Architect must specify scope resolution strategy (§2.2)
3. **BLOCKER 3 (Compatibility):** Architect must choose backward compatibility approach (§2.6 Option A, B, or C)

**Parallel Work (Can Start Immediately):**

4. **CTS-05 Amendment:** Architect writes formal spec (§3.2)
5. **Validation Repos:** Architect identifies/prepares 2 secondary repos (§3.3)
6. **Performance Fixture:** Create `large-file.ts` benchmark fixture (§3.1)

**Implementation Phase (After Blockers Resolved):**

7. **Parser Enhancement:** Implement ModuleScopeWalker per clarified spec
8. **Test Expansion:** Add unit + integration tests for module-scope extraction
9. **Express Patterns:** Update selectors to consume module-scope facts
10. **Re-Validation:** Run accuracy harness on 3 repos, verify F1 ≥0.82

**Estimated Timeline (After Blockers Resolved):**
- Week 1: Parser implementation + unit tests
- Week 2: Integration tests + Express pattern updates
- Week 3: Performance tuning + regression testing
- Week 4: Re-validation + bugfixes

**Total:** 4 weeks (matches architect's estimate in Phase -1 doc)

---

## 6. Verdict & Approval Conditions

### 6.1 Final Verdict

**APPROVED WITH CONDITIONS** ✅

**Conditions for Implementation Handoff:**

1. ✅ **Architecture is sound** — No SADS/CTS violations
2. ✅ **Scope is appropriate** — Fixes root cause without gold-plating
3. ✅ **Risks are identified** — Mitigations are concrete
4. ❌ **Blockers must be resolved** — 3 critical clarifications required (§2.1, §2.2, §2.6)
5. ⚠️ **Documentation incomplete** — CTS-05 amendment needed (non-blocking)

**Status:** **HOLD** until architect provides clarifications on blockers.

---

### 6.2 Required Architect Response

Please provide the following in a **clarifications document** (`docs/internal/analysis/routing-parser-fix-clarifications.md`):

**BLOCKER 1 (§2.1): Pseudo-Entity Strategy**
```markdown
### Pseudo-Entity Creation

**Decision:** [Option A / Option B / Alternative]

**Rationale:** [Why this approach]

**API Usage:**
```typescript
// Example code showing kb.addEntity() call
```

**BLOCKER 2 (§2.2): Call Fact Ownership**
```markdown
### Scope Resolution Strategy

**Decision:** [Scope stack / Symbol resolution / Skip nested functions]

**Implementation:**
```typescript
// Pseudocode showing scope tracking
```

**Edge Cases:**
- [ ] Shadowed variable names
- [ ] Nested functions with same constant name
- [ ] Destructured constants
```

**BLOCKER 3 (§2.6): Backward Compatibility**
```markdown
### Compatibility Approach

**Decision:** [Option A / Option B / Option C]

**Test Migration Plan:** [If applicable]

**Predicate Naming:** [If Option A]
```

**CLARIFICATIONS (Non-Blocking):**
- §2.3: Chained call fact model (example for `router.route().get()`)
- §2.4: Argument extraction rules (middleware references)
- §2.5: Test fixture location and golden spec

---

### 6.3 Approval Timeline

**Blocker Resolution Deadline:** 24 hours (2025-11-09, 5 PM)

**Reason:** Implementation Agent is ready to start, but cannot proceed without entity/ownership/compatibility decisions.

**If Deadline Missed:**
- Option 1: Defer fix to Phase 7 (proceed with Wave 1B using Express workaround)
- Option 2: Extend timeline by +1 week (delayed M3 delivery)

---

## 7. Positive Highlights

Despite the clarifications needed, this is **excellent architectural work**:

1. ✅ **Root cause properly diagnosed** — Phase -1 investigation was thorough
2. ✅ **Solution is minimal** — No over-engineering or unnecessary abstractions
3. ✅ **Component boundaries respected** — Parser stays in parser, patterns stay in reasoning
4. ✅ **Risks anticipated** — Performance, regression, scope creep all addressed
5. ✅ **Acceptance criteria measurable** — F1 scores, test counts, benchmark thresholds

**Confidence Level:** **HIGH** — With blockers resolved, this plan will succeed.

---

## 8. References

- **Validation Issue:** `docs/internal/analysis/VALIDATION_ISSUE_ROUTES_PATTERN_DETECTION.md`
- **Phase -1 Investigation:** `docs/internal/analysis/phase6-validation-fix-phase-minus-one.md`
- **Architect Plan:** `docs/internal/analysis/phase6-routing-parser-fix-readme.md`
- **SADS:** `SADS.md` §3.1, §4.2, §8
- **CTS-05:** `CTS-05_Static_Analysis_and_Pattern_Detection.md`
- **CTS-01:** `CTS-01_KnowledgeBase.md`
- **CTS-06:** `CTS-06_Reasoning_and_Ambiguity_Resolver.md`

---

**Review Status:** ✅ **COMPLETE**

**Next Agent:** Architect (clarifications) → Implementation Agent (after clarifications received)

**Blocking Issues:** 3 critical clarifications (pseudo-entities, ownership, compatibility)

**Priority:** 🔴 **CRITICAL** — Wave 1B cannot start until routing fix validated

---

**End of Plan Review**
