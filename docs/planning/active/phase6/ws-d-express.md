# Phase 6 — WS‑D Express Pattern Library Detailed Plan
**Owner:** Agent 1 (Express)  
**Date:** 2025‑11‑07  
**Status:** Ready for execution (pre-implementation)  
**Context:** This is the first detailed plan for Phase 6. We will execute Express/Mongoose support end-to-end before locking the other Tier‑0 plans so we can propagate lessons learned (fixtures, accuracy harness mechanics, lexicon updates, doc workflows, etc.) to the remaining agents.

---

## 1. Goals & Scope
1. **Express behavioral coverage ≥95 %** on curated fixtures and representative OSS snippets (routes, middleware, error handling, config-driven mounts, async handlers).  
2. **Mongoose integration (P0 auxiliary):** detect schema/model definitions, hooks, validators, and query builders so Express route behaviors surface persistence semantics with correct confidence bands.  
3. **Deterministic, grounded specs:** all emitted chunks carry factSet IDs, pass grounding validator lexicon checks, and degrade to Open Questions when ambiguity persists.  
4. **Finalization-ready output:** newly generated QIDs can be resolved via `ceps finalize --answers`.  
5. **Performance awareness:** ensure added reasoning logic does not blow up KB query counts; measure impact on benchmark (Next.js) once merged.

---

## 2. Prerequisites & Inputs
- Phase 5 baseline passing (935 tests, 93 %+ coverage).  
- Benchmark repo (`vercel/next.js`) cloned at commit `db5528317e24e0316e0497716976a715a325ca09`.  
- Hardware baseline recorded in `DECISIONS.md`.  
- Existing Express fixtures (`tests/fixtures/tiny-express`, prior phase patterns) as reference starting point.  
- Access to at least two OSS Express projects (e.g., `expressjs/express/examples`, `vercel/next.js` API routes) for Phase ‑1 fact inspection.

---

## 3. Deliverables
1. **Pattern modules:**  
   - `express.routes` (HTTP verbs, router nesting, config mounts).  
   - `express.middleware` (standard + error middleware).  
   - `express.async-handlers` (Promise-based, `async` functions).  
   - `express.config` (env/config influences, `app.set`, feature flags).  
   - `express.mongoose` (bridge to Mongoose facts: schema fields, hooks, transactions).  
2. **Shared helpers:** utilities for route tree flattening, parameter extraction, HTTP method normalization.  
3. **Fixtures:**  
   - `tests/fixtures/accuracy/express` (20‑50 snippets, polluted datasets).  
   - `tests/fixtures/confidence-calibration/express` (High/Medium/Low scoring cases).  
   - Updated `tests/fixtures/tiny-express` with nested routers + Mongoose usage.  
4. **Tests:** unit + integration suites with KB chunk assertions, golden spec expectations, finalization smoke tests.  
5. **Docs:** `docs/pattern-coverage.md` entry, release notes blurb, lexicon additions, decision log updates.  
6. **Tooling:** scripts refreshed to include Express harness cases (`run-tier0-accuracy`, `update-pattern-matrix`).  
7. **Telemetry notes:** measurement of KB chunk counts + runtime before/after to surface perf impact to Agent 6.

---

## 4. Detailed Work Breakdown
### 4.0 Pattern Architecture Implementation (Day 0 prep)
- **PatternModule contract:** Each Express module implements the Phase 6 pattern interface:
  ```ts
  export interface PatternModule {
    id: string;
    priority: 1 | 2 | 3; // shared primitives, framework core, auxiliary adapters
    matches(kb: KnowledgeBase, entity: Entity): boolean;
    describe(kb: KnowledgeBase, entity: Entity): BehaviorChunk[];
    confidenceAdjustments?(kb: KnowledgeBase, entity: Entity): ConfidenceDelta;
  }
  ```
- **Registration:** `src/reasoning/patterns/express/index.ts` exports `registerExpressPatterns()` and calls `registerPatternModule()` for each module (routes, middleware, error, config, mongoose). Modules live under `src/reasoning/patterns/express/`.
- **Precedence:** Honor explicit priorities plus alphabetical ordering per master plan (§3.9). Shared helpers (priority 1) run before core Express patterns (priority 2) and auxiliary adapters (priority 3).
- **Error handling:** Wrap `describe()` logic in try/catch. Unexpected structures emit Low-confidence Open Question chunks with diagnostic metadata; never throw.
- **Unit tests:** For every module, add tests confirming (a) `matches()` accuracy on polluted datasets, (b) `describe()` never throws on malformed entities, (c) `confidenceAdjustments()` stays within ±5 bounds, and (d) registry precedence works (aux adapters yield to core when appropriate). Agent 6 reviews the first PR for contract compliance.

### 4.1 Phase ‑1 Analysis (2 days)
- Instrument parser output for existing Express fixtures; dump KB entries to confirm entity IDs, relation names, call graphs, confidence scaffolding.  
- Analyze OSS samples (one simple, one complex) to catalog patterns: nested routers, dynamic mounts, config toggles, lazy middleware, inline async functions.  
- Document findings in `PHASE6_EXPRESS_PHASE_MINUS_ONE.md` (data shapes, pain points, assumptions). This doc feeds the accuracy harness ground truth.

### 4.2 Pattern Implementation Iterations
| Iteration | Focus | Key Tasks |
| --- | --- | --- |
| **I1 — Route Trees & Middleware** | Baseline coverage | Implement route/middleware matchers, ensure deterministic ordering, add initial fixtures + golden specs, run tests `--llm off`. Run lexicon extractor; propose base Express terminology (route/middleware/handler) and update grounding validator once approved. |
| **I2 — Error Handling & Async** | Reliability | Detect error middleware (arity 4), async handlers (Promise awareness), ensure error propagation text mentions status codes/branches. Add negative tests for mis-detected error handlers. Update coverage matrix entry + finalization scenario for new QIDs. |
| **I3 — Config & Env Influence** | Behavior context | Parse `app.use(app.get('configKey'))`, env-driven toggles, feature-flag checks. Extend lexicon with config terminology; ensure KB assertions capture env gating. |
| **I4 — Mongoose Bridge (P0)** | Persistence semantics | Parse `mongoose.model`, schema definitions, hooks (`pre`, `post`), references; link to Express routes via imports/call graph. Emit side-effect descriptions referencing model names + operations. Draft Mongoose fact API doc for Agent 4 and run grounding validator with new schema terms. |
| **I5 — Polish & Integration** | Docs, Finalization | Wire coverage matrix entry, lexicon tests, finalization scenario, accuracy harness calibration, run full CI (unit + integration + benchmark smoke), update decision log + lessons doc. |

Each iteration follows TDD: write failing tests (unit + integration), implement minimal code, refactor, rerun suites, update docs/fixtures as needed.

**Cross-workstream DoD compliance (per master plan §3.8):**
1. **Lexicon + grounding validator:** After any iteration introducing new terminology, run `scripts/extract-new-terms.mjs`, submit additions in `#ceps-phase6`, update `docs/lexicon.md`, and extend `tests/llm-gateway/grounding-validator.test.ts` with positive + adversarial cases before merging.
2. **Coverage matrix:** Update `docs/pattern-coverage.md` (supported behaviors, confidence, gaps, auxiliary dependencies) after I2 and I4.
3. **Finalization integration:** Maintain at least one Express QID scenario; rerun `ceps finalize --answers` after iterations that change chunk output (I2+).
4. **KB chunk assertions:** Integration tests must assert both expected presence and absence of behaviors with confidence bands and factSet IDs.
5. **Error-handling contract:** Add unit tests per module showing malformed entities yield Low-confidence Open Questions rather than throwing.

---

## 5. Testing & Validation Plan
| Layer | Purpose | Notes |
| --- | --- | --- |
| **Unit tests** | Validate pattern helpers (signature detection, AST traversal, config parsing). | Require ≥80 % branch coverage per helper module, including tests proving error-handling contract (no throws). |
| **Integration tests** | Run reasoning pass on fixtures; assert KB chunks (content, confidence, factSetId) and generated spec sections. | Include positive + negative assertions to avoid cross-entity leakage. |
| **Golden specs** | Prevent prose regressions. | Update `tests/fixtures/tiny-express/expected/spec.md` after each iteration’s review; follow Phase 5 snapshot workflow (regenerate snapshot, run `snapshot-capture` test, batch commits). |
| **Accuracy harness** | Precision/recall measurement on `accuracy/express` corpus (20‑50 snippets). | F1 ≥0.90, precision ≥0.88, recall ≥0.88. Corpus curation detailed below; harness runs nightly once frozen. |
| **Confidence calibration** | Ensure scoring changes stay within ±5 points. | Use dedicated calibration fixtures; failing deltas block merge. |
| **Finalization test** | Ensure QIDs resolved via `ceps finalize --answers`. | Create sample ambiguity (e.g., dynamic route), add `answers.md`, assert QID removal + summary. |
| **Benchmark smoke** | Confirm no regressions on `next.js` baseline. | Run `scripts/run-nextjs-benchmark.mjs --llm off` after I3 and I4 plus Day 10 validation; share metrics JSON with Agent 6 immediately. |

All test updates must follow the Phase 5 snapshot discipline (run regeneration script + integration test for `tiny-express`).

### 5.1 Grounding Validator & Lexicon Process
- Run `scripts/extract-new-terms.mjs` at the end of I1 and I3 to capture new nouns/verbs.
- Propose additions (e.g., “middleware chain”, “status code”, “route mount”) in `#ceps-phase6`; architect/Agent 7 approve or revise within 24 h.
- Update `docs/lexicon.md` plus `tests/llm-gateway/grounding-validator.test.ts` with positive + adversarial cases, e.g. accept “Express middleware chain” but reject unsupported synonyms like “servlet”.
- Rerun `npm test -- tests/llm-gateway/grounding-validator.test.ts` before merging each iteration PR.
- If validator rejects Express prose in `--llm on` mode, fall back to deterministic template output per CTS‑02 retry policy and log issue for follow-up.

### 5.2 Accuracy Harness Corpus Curation
- **Day 1-2:** Collect 20‑30 snippets from OSS samples + synthetic cases; annotate expected behaviors/confidence using JSON files (`tests/fixtures/accuracy/express/NNN-description.json`).
- **Day 3:** Architect reviews annotations; mark disputed snippets as `contested: true` (excluded from metrics until resolved).
- **Day 4:** Expand to 20‑50 snippets, freeze corpus, and summarize coverage in `tests/fixtures/accuracy/express/README.md`.
- **Format example:**
  ```json
  {
    "id": "012-nested-router",
    "snippet": "const router = express.Router(); router.use('/users', userRouter);",
    "expectedBehaviors": [
      "mounts nested router at /users",
      "delegates GET /users/:id to userRouter"
    ],
    "minimumConfidence": 70,
    "mustNotContain": ["auth middleware"]
  }
  ```
- **Nightly runs:** `scripts/run-tier0-accuracy.mjs express` calculates precision/recall/F1; regressions below thresholds alert `#ceps-phase6` and block merge until fixed.
---

## 6. Fixtures & Ground Truth
1. **Route pollution fixture:** multiple routers mounting the same path segments to ensure selection logic picks correct handler.  
2. **Middleware priority fixture:** mix of auth/logging/error middleware with similar signatures.  
3. **Config-driven mount fixture:** `if (process.env.FEATURE_X) app.use('/beta', betaRouter);`.  
4. **Mongoose fixture:** Express routes performing CRUD on schemas with pre/post hooks, demonstrating hooking semantics.  
5. **Async/error combo fixture:** `async` handlers that `throw` inside `try/catch`, verifying error semantics captured even with asynchronous flow.  
6. **OSS-derived snippet pack:** sanitized extracts from `expressjs/express/examples/route-separation`, `expressjs/express/examples/mvc`, `vercel/next.js/examples/api-routes`, and one small Express+Mongoose project (<1k LOC). Combined corpus must cover nested routers (≥3 levels), middleware chains (≥5), async handlers with `try/catch`, config-driven mounts, and Mongoose hooks.

Ground truth annotations stored as JSON files per snippet under `tests/fixtures/accuracy/express/`, with `README.md` summarizing coverage and listing any contested snippets pending review.

---

## 7. Schedule & Milestones
| Day | Workstream | Milestone |
| --- | --- | --- |
| Day 1 | Phase ‑1 analysis kickoff | Collect KB dumps, document data shapes. |
| Day 2 | Phase ‑1 wrap | Finalize analysis doc, review with architect. |
| Day 3‑4 | Iteration I1 | Routes/middleware patterns + base fixtures/tests. |
| Day 5 | Iteration I2 | Error + async support; run accuracy harness (subset). |
| Day 6 | Iteration I3 | Config/env features; update lexicon/tests. |
| Day 7‑8 | Iteration I4 | Mongoose bridge: schema parsing, fixture integration, calibration checks. If <50 % of in-scope features (basic fields, refs, pre/post hooks) pass by Day 7 noon, log descoping proposal (emit Open Questions for advanced features) in `#ceps-phase6` for architect approval. |
| Day 9 | Iteration I5 | Docs, finalization test, coverage matrix, release notes draft. |
| Day 10 | Validation & handoff | Full CI (unit, integration, golden, benchmark smoke, accuracy harness). Prepare learnings doc for other agents. |
| Day 11-12 | Buffer | Reserved for rework or review delays; usage documented in decision log. |

Target: 2-week window with 2 buffer days for review feedback or unexpected regressions. React/Redux/GraphQL/HTTP detailed plans do not start until Express I2 PR (routes/middleware/error/async) merges to `main` with passing CI, golden specs refreshed, lessons doc drafted, and accuracy harness subset green (target end of Day 5).

---

## 8. Dependencies & Coordination
- **Agent 6 (Performance):** needs before/after metrics; share telemetry snapshots (JSON) after I3 and I4 benchmark runs plus Day 10 validation.  
- **Agent 4 (GraphQL):** depends on Mongoose fact modeling; deliver `docs/internal/mongoose-facts-api.md` draft by Day 6 EOD (entity schema, KB query helpers, linkage guidance). Agent 4 reviews Day 7; incorporate feedback Day 8. Provide early notes if GraphQL work kicks off sooner.  
- **Agent 5 (HTTP clients):** share outbound call detection patterns if Express fixtures reveal overlapping logic.  
- **Agent 7 (Docs):** reviews PRs for I1, I2, I4 within 4 h SLA; final blocking review Day 9 ensures coverage matrix + release notes are accurate. Agent 6 acts as backup reviewer if Agent 7 unavailable.  
- **Decision Log:** record hardware baseline verification, accuracy thresholds achieved, and any descoping decisions.

---

## 9. Risks & Mitigations
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Pattern interface divergence | Integration failures, rework | Follow §4.0 contract; add unit tests for registration + precedence; Agent 6 checks compliance during I1 PR. |
| Mongoose schema parsing more complex than expected | Delays I4, blocks GraphQL handoff | In-scope: basic fields, refs, pre/post hooks, models. Out-of-scope (if needed): virtuals, discriminators, advanced validators. If <50 % in-scope passes by Day 7 noon, propose descoping (emit Open Questions) for architect approval. |
| Accuracy harness ground truth drift | False confidence, unstable metrics | Architect reviews annotations before harness freeze; nightly run with alerting; contested snippets excluded until resolved. |
| Golden spec churn | Review fatigue | Batch prose updates per iteration, run snapshot script once per batch, document diffs in PR summary. |
| Benchmark regression | Could block release | Run `run-nextjs-benchmark` after I3 & I4; if runtime/memory >10 % regression, pause iteration; >20 % blocks merge until optimized. Share metrics with Agent 6 immediately. |
| Lexicon approval delays | Blocks grounding + docs | Submit new terms early (Day 4); architect/Agent 7 SLA 24 h; fallback reviewer (Agent 6) grants provisional approval if needed. |
| Test infrastructure setup issues | Phase ‑1 delayed | Dry-run accuracy harness and benchmark scripts on Day 0; fix tooling before Day 1 kickoff. |

---

## 10. Success Criteria Checklist
- [ ] Phase ‑1 analysis document reviewed/approved.  
- [ ] All new pattern modules merged with ≥80 % coverage + KB chunk assertions.  
- [ ] Accuracy harness F1 ≥0.90 (logs stored in `benchmarks/results`).  
- [ ] Confidence calibration deltas within ±5 points.  
- [ ] Finalization test passes (`ceps finalize --answers`).  
- [ ] Golden spec + snapshot tests updated and verified.  
- [ ] Docs: coverage matrix, release notes, lexicon updates merged.  
- [ ] Decision log updated with hardware baseline verification + Express completion summary.  
- [ ] Lessons learned summary shared to seed other Tier‑0 plans.
- [ ] Grounding validator tests updated with Express terminology/adversarial cases green.

Completion of this checklist signals readiness to start the next detailed plan (React).
