# Phase 6 Routing Parser Fix README

## 1. Purpose
- Document the architectural remediation required to restore Express (and other module-scope) pattern detection after the Phase 6 validation failure.
- Provide implementation guidance that aligns with **SADS.md** responsibilities for the Parser (CTS-05), Knowledge Base (CTS-01), and Reasoning Engine (CTS-06).
- Define acceptance criteria so Implementation and Validation agents can coordinate hand-off without ambiguity.

## 2. Problem Summary
- **Validation finding:** `docs/internal/analysis/VALIDATION_ISSUE_ROUTES_PATTERN_DETECTION.md` reports **0% route detection** on a 2k LOC Express router, blocking Wave 1B.
- **Investigation result:** `docs/internal/analysis/phase6-validation-fix-phase-minus-one.md` confirms the parser **never emits call-expression facts for module-level statements** (e.g., `router.post(...)`).
- **Architectural impact:** Any framework that declares behavior through module-scope calls (Express routers, Fastify, Koa, Redux store wiring, Apollo resolvers, etc.) is invisible to the Reasoning Engine. This violates SADS §3.1 (components 2, 5, 6) because facts never enter the KB, preventing downstream inference and spec generation.

## 3. Fix Objectives
1. **Complete module-scope coverage:** Emit call-expression facts for every top-level statement, not just descendants of functions/classes.
2. **Preserve attribution & determinism:** Facts must retain entity ownership, call ordering, argument indices, and source ranges so grounding (SADS §8) stays intact.
3. **Enable framework patterns:** Express routing/middleware patterns must receive the same fact shapes they already consume for intra-function calls, avoiding bespoke adapters per framework.
4. **Protect performance:** New traversal must avoid quadratic AST walks; benchmarks on ≥5k LOC files must stay within Phase 6 performance budgets.
5. **Deliver regression safety:** Tests and validation flows must prove we fixed Express and did not regress other frameworks.

## 4. Proposed Solution

### 4.1 Parser (CTS-05) Enhancements
- **Introduce a ModuleScopeWalker:** Traverse `sourceFile.getStatements()` once, capturing:
  - Variable declarations (including destructured) and their initializer expressions.
  - Expression statements such as `router.post(...)`, `app.use(...)`, `graphqlHTTP({...})`.
  - Export-assignment statements that immediately invoke framework factories.
- **Normalized call fact emission:**
  - Emit `calls-expression`, `call-arg-{n}`, `call-object`, `call-property`, `call-kind` (function vs. method), and `call-source-range`.
  - Attach facts to the owning entity:
    - For `const router = express.Router()`, emit under the `router` entity.
    - For bare expressions (`app.use(...)`), synthesize/attach to a module-level pseudo-entity keyed by source anchor so the KB can attribute chunks (Section 4.5).
- **Context capture:**
  - Record lexical scope info (`scope:module`, `scope:function:<id>`) so reasoning rules can distinguish module bootstrap code from runtime logic.
  - Preserve chained calls (`router.route('/x').get(handler)`) by iterating property-access descendants and emitting intermediate facts (Section 4.8).
- **Performance guardrails:**
  - Reuse the existing `NodeQueue` abstraction so module traversal shares memoized visitors with the function/class walkers.
  - Add benchmarks (Vitest + ts-node) to prove ≤10% slowdown on `tests/fixtures/perf/large-file.ts`.

### 4.2 Knowledge Base (CTS-01) Updates
- **Schema:** No structural change needed, but we must ensure FactSets can store the new predicates (`scope`, `call-source-range`). Update `docs/API.md` if the predicate list is documented there.
- **Anchoring:** When synthesizing pseudo-entities for bare expressions, allocate deterministic anchors (e.g., `module::<path>#L{line}`) so cross-links and grounding remain deterministic.
- **Confidence:** Bump baseline confidence for Express route chunks once calls arrive; previously forced Open Questions should now resolve to Medium/High bands per SADS §4.2.

### 4.3 Reasoning Engine & Pattern Library (CTS-06)
- **Express patterns:** Update selectors to accept module-scope facts. Ensure router discovery:
  - Detect `express.Router()` initializers.
  - Match `router.<verb>` calls, capture HTTP verb, path, middleware chain (arguments 1..n-1), and handler (last arg).
  - Handle wrapper utilities (`wrapAsync`, `allowedRoles`) by recursively linking to function entities for documentation.
- **Shared utilities:** Expose a helper for “module-level chained calls” so Redux store setup, GraphQL schema wiring, and HTTP client registries can reuse the same traversal results in future waves.
- **Backfill tests:** Add parser + reasoning tests covering:
  - Plain module-level route declarations.
  - Router factories exported directly (`export default express.Router().get(...);`).
  - Chained route builders (`router.route('/x').post(...)`).
  - Mixed module + function scope scenarios (module-level constant referencing helper functions).

### 4.4 Validation & Tooling
- **Fixtures:**
  - Extend `tests/fixtures/phase5/baseline/tiny-express` with module-scope routes plus expectations while keeping existing golden specs under `expected/`.
  - Add a sanitized large-file regression fixture under `tests/fixtures/phase6/express-routing-large/` with a paired golden spec diff test (`tests/integration/express-routing-large.test.ts`).
- **Automation:**
  - Update `scripts/debug-kb-dump.mjs` to highlight module-scope calls to simplify future investigations.
  - Add a CI gate that fails if any `router.<verb>` pattern is parsed without emitting `calls-expression` facts (simple jq check).
- **Acceptance tests:**
  - Re-run the validation scenario and at least two additional backend repos; require ≥0.82 F1 on routing/middleware detection before unlocking Wave 1B (per Validation Issue §9.2 Option A).

### 4.5 Pseudo-Entity Strategy (Clarifies Review §2.1)
- **Decision:** Reuse the existing `constant` entity kind with deterministic synthetic names so the KB schema and downstream consumers remain unchanged.
- **Creation rule:** When a module-level expression statement lacks an identifier owner, create one pseudo-entity per statement:
  ```typescript
  kb.addEntity({
    id: anchorId('module', filePath, startLine),
    kind: 'constant',
    name: `module::<relPath>#L${startLine}`,
    path: filePath,
    exported: false,
    visibility: 'internal',
    metadata: { synthetic: true, scope: 'module' }
  })
  ```
- **Ownership semantics:** Chained calls inside the same statement attach to this entity via incremental `call-index` facts so ordering remains deterministic.
- **Reasoning impact:** Pattern matchers treat synthetic entities the same as normal constants but can filter on `metadata.synthetic === true` if they ever need to skip bootstrap-only statements.

### 4.6 Scope & Call Fact Ownership (Clarifies Review §2.2)
- **Scope stack:** The walker maintains a stack seeded with `scope:module`. Entering a function pushes `scope:function:<entityId>` frames; exiting pops them.
- **Emission rule:** The call owner is always the entity defined in the innermost scope frame. Module-scope calls inherit the module frame; nested functions keep the behavior we already have.
- **Pseudocode:**
  ```typescript
  function emitCallFacts(node: CallExpression, owner: Entity) {
    const scope = scopeStack.peek();
    kb.addFact(owner.id, 'calls-expression', serializeCall(node));
    kb.addFact(owner.id, 'call-scope', scope.id);
    node.getArguments().forEach((arg, index) => {
      kb.addFact(owner.id, `call-arg-${index}`, serializeArg(arg));
    });
  }
  ```
- **Edge cases covered:**
  - Shadowed names resolved by scope stack membership.
  - Destructured constants create individual entities so references remain precise.
  - Helper-returned routers stay tied to the module entity because the call occurs at import time.

### 4.7 Compatibility Strategy (Clarifies Review §2.6)
- **Decision:** Keep predicate names identical and simply broaden their usage to module scope, ensuring backward compatibility for existing fixtures.
- **Golden updates:** Only fixtures that previously missed module calls will change. We will update Express fixtures, rerun golden tests, and log deltas in `docs/internal/analysis/express-fixture-updates.md`.
- **Fallback parity:** Mirror the module-scope traversal in the Babel fallback. Rollout is guarded by a feature flag (`parser.experimentalModuleScope`) toggled via config to allow quick disablement if regressions surface.

### 4.8 Chained Call Fact Model (Clarifies Review §2.3)
- **Representation:** Each property access in a chain becomes its own call fact linked via `chained-call` predicates. Example for `router.route('/x').get(handler)`:
  ```
  calls-expression: router.route
  call-arg-0: '/x'
  chained-call: router.route -> router.get
  call-arg-0 (router.get): handler
  ```
- **Determinism:** Chained-call facts carry the prior call's hash so pattern matchers can reconstruct the sequence without AST access.

### 4.9 Argument Extraction Rules (Clarifies Review §2.4)
- **Serialization approach:**
  - Identifier/function references → include both text and resolved entity ID.
  - Call expressions (e.g., `allowedRoles([ADMIN])`) → emit nested call facts so auth middleware can inspect literal parameters.
  - Wrapper utilities (`wrapAsync(fn)`) → capture wrapper name, and recursively emit facts for the wrapped entity so documentation surfaces both error handling and handler names.
- **Negative cases:** Non-literal paths or computed middleware arrays trigger lower confidence (per SADS §4.2) but still emit facts with `confidence:low` metadata so Open Questions can be raised when needed.

### 4.10 Fixture & Test Placement (Clarifies Review §2.5)
- **Parser unit fixtures:** `tests/fixtures/parser/module-scope-basic.ts` for minimal scenarios.
- **Integration fixtures:** `tests/fixtures/phase5/baseline/tiny-express` (augmented) and `tests/fixtures/phase6/express-routing-large/` (new). Each contains an `expected/spec.md` plus a short README reminding contributors to regenerate snapshots after modifying module-scope calls.
- **Golden tests:** Updated `tests/integration/express-patterns.test.ts` plus the new large fixture test ensure Express coverage stays green before we unlock Wave 1B.

## 5. Acceptance Criteria
- Parser emits module-scope call facts with correct subjects, predicates, arguments, and source ranges (validated by new unit tests).
- Express reasoning produces Spec-Ready documentation for all 23 routes in the `output-test/routes.js` scenario with accurate auth/middleware notes.
- No regression in existing parser/function-scope tests; test suite count remains ≥1155 passing with coverage ≥93%.
- Performance benchmark delta ≤10% for large-file parsing in deterministic mode.
- Validation report shows Wave 1A backend scenario moved from blocking to passing (F1 ≥0.82) and Wave 1B is formally unblocked in `STATUS.md`.

## 6. Risks & Mitigations
- **Performance degradation:** Mitigate with targeted benchmarks and short-circuit traversal when a node has already been visited in another scope.
- **Fact explosion / noise:** Filter emitted facts to supported predicates and maintain deduplication keyed by `(subjectId, predicate, objectHash)`.
- **Downstream regressions:** Shield by running golden-spec diff tests (Express + ceps self-host) and expanding integration coverage before merging.
- **Scope creep to other frameworks:** Document this README as the authoritative fix scope; additional framework-specific tweaks should branch from the shared module-scope facts once validated.

## 7. Open Questions
1. Do we need an interim mitigation (e.g., disable Express specs) while the fix ships? Product decision pending.
2. Should we backfill CTS-05 with a formal “module scope extraction” section to capture the new contract? (Recommended.)
3. Are there other parsers (Babel fallback) that require matching changes to stay in sync?

## 8. References
- `AGENTS.md` — Phase 6 workflow, validation expectations.
- `SADS.md` — Components 2/5/6 responsibilities, grounding rules (§8), confidence bands (§4.2).
- `docs/internal/analysis/VALIDATION_ISSUE_ROUTES_PATTERN_DETECTION.md` — Failure report.
- `docs/internal/analysis/phase6-validation-fix-phase-minus-one.md` — Investigation details confirming parser gap.
