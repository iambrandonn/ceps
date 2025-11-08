# ceps — Implementation Plan (Phase 6: Production Hardening)
**Date:** 2025-11-07
**Scope:** Final-phase plan that turns the Phase 5 baseline into a production-ready release with Tier‑0 framework depth, large-repo performance guarantees, and polished UX/documentation.
**Status:** Wave 1 in progress — Agent 1 (Express) ✅ COMPLETE

---

## 0) Purpose & Context
Phase 6 is the final gate before declaring ceps production-ready. Prior phases already delivered finalization, gating, and deterministic behavior; this effort expands the Tier‑0 reasoning pattern library (Tier‑1 frameworks explicitly deferred), hardens performance on large repositories (benchmark: local clone of `vercel/next.js`), and completes outward-facing UX/documentation per the charter in **AGENTS.md** and **IMPLEMENTATION_PLAN.md**. The phase closes with the M3 gate. fileciteAGENTS.md#L15-L35 fileciteIMPLEMENTATION_PLAN.md#L172-L277

---

## 1) Goals & Success Metrics
1. **Tier‑0 framework coverage:** Express, React, Redux, GraphQL, and HTTP client patterns auto-detect ≥90 % of targeted behaviors in synthetic fixtures and curated real projects; mis-detections become Open Questions with actionable QIDs rather than silent failures. fileciteAGENTS.md#L21-L34
2. **Performance guardrails:** ceps analyzes `vercel/next.js` on workstation-class hardware within agreed CPU/memory budgets, with telemetry proving worker-pool scaling and LLM budget adherence. fileciteCTS-07_Orchestrator_and_Lifecycle.md#L1-L75
3. **Deterministic quality gates:** Coverage, Grounding, Confidence, Link, and Monorepo gates remain green under the expanded workload (LLM-on and `--llm off`). fileciteCTS-07_Orchestrator_and_Lifecycle.md#L40-L110
4. **Operator-facing UX:** CLI/docs clearly explain new capabilities (pattern coverage matrix, performance tuning flags, monorepo navigation) without author-level extension guides. (User direction, Nov 2025.)

---

## 2) Entry & Exit Criteria
- **Entry:**  
  - Phase 5 checkpoints complete; snapshot/finalization stable; current tests (935 passing, 93 %+ coverage) green. fileciteAGENTS.md#L162-L200  
  - **Hardware baseline locked:** Apple M2 Pro (10‑core CPU, 32 GB RAM, NVMe ≥1 GB/s) **or** AMD Ryzen 7 5800X / Intel Core i7‑12700K class desktops (8 physical cores, 32 GB RAM, NVMe ≥1 GB/s); configuration recorded in `DECISIONS.md`.  
  - **Tier-1 scope decision:** Next.js & Prisma deferred to post-M3 (explicitly scoped out here).  
  - Benchmark repo (`vercel/next.js`) cloned at pinned commit `db5528317e24e0316e0497716976a715a325ca09` (Nov 2025) adjacent to ceps repo; script verifies hash before runs.
- **Exit / M3 Gate:**  
  - Tier‑0 accuracy F1 ≥0.90 per framework harness (§5.3.1 manual-labeled 20‑50 snippet corpora).  
  - `next.js` benchmark meets performance SLO (runtime ≤15 min, peak RSS ≤16 GB, LLM tokens ≤1.5 M on baseline hardware) with exit code 0 and all gates green, using telemetry+scripts defined in §3.6/§6.  
  - Documentation + CLI help updated; release notes + M3 gate review document approved (architect + product).  
  - All automated tests (unit, integration, golden specs, benchmark smoke, finalization) passing with ≥80 % branch coverage per workstream. fileciteAGENTS.md#L240-L315

---

## 3) Workstreams & Deliverables

### 3.1 WS‑D Express Pattern Library (Agent 1)
1. **Phase ‑1 analysis:** Capture ts-morph facts emitted for Express fixtures + selected open-source snippets; document namespaces to avoid selector bleed.  
2. **Rule expansion:**  
   - Route trees (flat + nested routers).  
   - Middleware order/arity, async handlers, error chains.  
   - Config-driven mounts (`app.use('/v1', router)`), env-dependent toggles.  
   - Mongoose model detection (schema definitions, hooks, query builders) so routes describe persistence behaviors and confidence downgrades when schema resolution fails.  
3. **KB wiring:** Ensure inferred behaviors include side effects, error semantics, auth/link references; update confidence scoring weights via calibration harness & KB owner review before merging. fileciteCTS-06_Reasoning_and_Ambiguity_Resolver.md#L1-L120  
4. **Testing:** Polluted fixtures covering competing handlers, dynamic imports, and fallbacks; golden-spec diffs under `--llm off` and `--deterministic`.  
5. **Definition of Done (DoD):** 95 %+ accuracy on curated Express suite, zero gate regressions, documentation entry in pattern matrix.

### 3.2 WS‑D React Pattern Library (Agent 2)
1. Support function/class components, `forwardRef`, suspense/lazy, hooks (built-in + custom), Context provider/consumer mapping, and side-effect detection (`useEffect`, `useLayoutEffect`).  
2. Resolve prop/state relationships to describe inputs/outputs; link to consumers where possible, including styling semantics from **styled-components** (tagged template literals) and **Tailwind CSS** utility clusters (className normalization).  
3. Fixtures must include mixed client/server components and concurrency features; tests assert both positive/negative matches.  
4. DoD: 90 %+ recognition for targeted components, accurate hook side-effect descriptions, deterministic LLM-off prose.

### 3.3 WS‑D Redux Pattern Library (Agent 3)
1. Map action creators, slice reducers, selectors, middleware; respect namespacing for polluted datasets (multiple slices).  
2. Capture side effects (thunks, sagas-lite) as HTTP/IO behaviors; degrade confidence when dynamic dispatch makes inference unsafe.  
3. Expand fixtures with colliding action types and nested selectors; enforce KB chunk assertions so behavior coverage stays explicit.  
4. DoD: Selectors/middleware documented with proper dependencies, Open Questions only for irreducible ambiguity.

### 3.4 WS‑D GraphQL Pattern Library (Agent 4)
1. Pair SDL/Code-first schema definitions with resolver implementations; capture queries/mutations/subscriptions, argument validations, data sources, and **Apollo Server/Client** integration points (e.g., `gql` template tags, `useQuery/useMutation`).  
2. Detect schema stitching and gateway patterns; downgrade confidence + emit Open Questions where fields resolve via remote services.  
3. Provide fixtures combining SDL files, resolver maps, and federated compositions.  
4. DoD: Schema + resolver behaviors described with cross-links, conflict handling for missing resolvers captured as QIDs.

### 3.5 WS‑D HTTP Clients (Axios/Fetch) Pattern Library (Agent 5)
1. Identify outbound calls, request construction, interceptors, retry/backoff logic, and error translation layers.  
2. Surface downstream dependencies (services/hosts) and configuration influences (headers, timeouts).  
3. Fixtures include shared client modules, per-request overrides, and resilience patterns.  
4. DoD: Outbound behaviors summarized with side-effect detail, retries documented, low-confidence dynamic URLs become Open Questions.

### 3.6 WS‑H Performance & Telemetry (Agent 6, starts once §3.1–3.5 reach functional sign-off)
1. **Baseline measurement:** Run ceps against `vercel/next.js` (external checkout) using current defaults; capture runtime, peak RSS, worker utilization, LLM budget.  
2. **Optimizations:**  
   - Worker pool tuning + adaptive chunk sizing (parser + LLM queues).  
   - Memory safeguards (KB chunk streaming, AST pruning validation).  
   - Budget-aware throttling & cache hit-rate improvements.  
3. **Telemetry:** Extend run summaries/JSON logs with queue depth, retry counts, benchmark metadata. fileciteCTS-07_Orchestrator_and_Lifecycle.md#L40-L150  
4. **Acceptance:** Meets committed SLO on baseline hardware (runtime ≤15 min, peak RSS ≤16 GB, LLM tokens ≤1.5 M) with before/after comparison plus reproducibility scripts.

### 3.7 Documentation & UX Polish (Agent 7, parallel with Performance)
1. Update CLI help and docs to cover new pattern coverage, `--llm` knobs, performance tuning, monorepo navigation.  
2. Refresh onboarding guide with workflow diagrams, golden-spec fixture instructions, and gate expectations; no author-facing extension tutorials per stakeholder guidance.  
3. Produce release notes summarizing Phase 6 additions + upgrade steps.
4. Maintain `docs/pattern-coverage.md` matrix fed by pattern agents; verify every new entry clearly labels confidence bands + auxiliary dependencies.

### 3.8 Auxiliary Pattern & Reader Enhancements (Shared)
**Priority tiers (de-scope lever):**
- **P0 (must land for M3):** Apollo Client/Server bridging, Mongoose modeling (Express + GraphQL), Vitest/Testing Library reader upgrades.  
- **P1 (nice-to-have for M3; drop if Wave 1 slips):** styled-components theme awareness, Tailwind class clustering.  
- **P2 (post-M3 stretch):** Any other ecosystem adapters discovered mid-phase.

**Ownership & dependencies**

| Auxiliary Pattern | Priority | Primary Owner | Key Dependencies | Consumers |
| --- | --- | --- | --- | --- |
| Mongoose (models, hooks, queries) | P0 | Agent 1 (Express) | shared fixtures by Day 5 | Agent 4 (GraphQL) |
| Apollo Server (schema) | P0 | Agent 4 (GraphQL) | none | Agent 2 (React) |
| Apollo Client (hooks/cache) | P0 | Agent 2 (React) | Apollo Server facts | Express/Redux docs |
| Vitest / Testing Library reader | P0 | Shared | parser facts | All agents |
| styled-components | P1 | Agent 2 | none | React doc UX |
| Tailwind CSS | P1 | Agent 2 | none | React doc UX |

**Common requirements**
1. **Apollo Client hooks + cache behaviors:** ensure React pattern tests capture `useQuery`, `useMutation`, and `ApolloProvider` wiring so specs describe data dependencies without duplicating GraphQL prose.  
2. **Styling frameworks:** extend React reasoning to mention styled-components themes and Tailwind utility groupings when they meaningfully affect behavior (e.g., conditional styling tied to props); skip if Wave 1 overruns.  
3. **Testing frameworks (Vitest, Testing Library):** extend auxiliary readers to parse their APIs (Phase 5 only handled generic assertions) so behavior chunks can cite test-backed confidence without documenting the tests.  
4. **Mongoose modeling:** shared fixtures where Express routes, hooks, and models interact; ensure KB facts capture schema fields, hooks, validation, and query semantics for reasoning consumption.  
5. Coordinate ownership across Agents 1–4 so auxiliary work lands alongside primary patterns; every auxiliary change must include accuracy harness updates, lexicon diffs, and documentation callouts to keep Agent 7 aligned.

**Cross-workstream DoD addendum:** For every Tier‑0/auxiliary pattern change the following are mandatory deliverables:
- Lexicon update + validator test covering any new terminology (CTS‑02 alignment).  
- Coverage matrix row in `docs/pattern-coverage.md` describing supported behaviors, confidence expectations, and known gaps.  
- Finalization integration test proving QIDs generated by the pattern can be resolved via `ceps finalize --answers`.  
- KB chunk assertion tests (positive + negative) verifying confidence bands and factSet attribution.
- Error-handling contract: pattern matchers swallow internal errors, emit structured diagnostics, downgrade to Open Questions, and never crash the reasoning pass.

### 3.9 Pattern Library Architecture & Extension Contract
- **Module layout:** `src/reasoning/patterns/<framework>/index.ts` exports `PatternModule` objects; shared helpers live in `src/reasoning/patterns/shared/`.  
- **Interface:** Every pattern implements `{ id, matches(kb, entity), describe(kb) → Chunk[], confidenceAdjustments }`; pattern modules register via `registerPatternModule(module)` in `reasoning/pattern-registry.ts`.  
- **Precedence:** Registry evaluates patterns in deterministic order using explicit priority levels (shared primitives=1, framework core=2, auxiliary adapters=3) and alphabetical ordering inside each priority. Conflicts resolved by scoring: highest confidence chunk retained; ties downgrade both to Open Questions referencing collision context.  
- **Error handling:** Patterns must never throw; unexpected structures emit diagnostics + Open Question per §3.1–3.5 DoD.  
- **Extension points:** Future Tier‑1 patterns plug into same registry; doc updates in `docs/pattern-coverage.md` describe supported behaviors, assumptions, and lexicon additions.  
- **Testing scaffold:** `tests/reasoning/<framework>/*.test.ts` uses shared harness to load fixtures, run reasoning pass, and assert KB chunks/confidence + final spec text. Include Phase‑1 fact inspection notes in each test file header for reviewer context.

---

## 3.10) Workstream Status Tracking

**Last Updated:** 2025-11-07

### Wave 1 Pattern Agents

| Agent | Workstream | Status | Completion Date | Key Metrics | Documentation |
|-------|-----------|--------|-----------------|-------------|---------------|
| **Agent 1** | Express Pattern Library | ✅ **COMPLETE** | 2025-11-07 | 8 modules, 1155 tests passing, 49 lexicon terms, 51/51 validator tests | `PHASE6_EXPRESS_I5_FINAL_APPROVAL.md` |
| **Agent 2** | React Pattern Library | 🟡 Ready to start | - | - | Handoff: `docs/internal/PHASE6_EXPRESS_LESSONS.md` |
| **Agent 3** | Redux Pattern Library | 🟡 Ready to start | - | - | Handoff: Express lessons doc |
| **Agent 4** | GraphQL Pattern Library | 🟡 Ready to start | - | - | Handoff: Express lessons doc + `docs/internal/mongoose-facts-api.md` |
| **Agent 5** | HTTP Clients | 🟡 Ready to start | - | - | Handoff: Express lessons doc |

### Wave 2 Support Agents

| Agent | Workstream | Status | Dependencies | Notes |
|-------|-----------|--------|--------------|-------|
| **Agent 6** | Performance & Telemetry | ⏳ Pending Wave 1 | All Wave 1 agents complete | Accuracy harness + benchmark scripts implementation |
| **Agent 7** | Documentation & UX | ⏳ Pending Wave 1 | Coverage matrices from all pattern agents | Release notes, CLI help updates |

### Express Completion Details (Agent 1)

**Iterations Delivered:**
- ✅ **I1:** Middleware & routing patterns
- ✅ **I2:** Error handling & async patterns
- ✅ **I3:** Configuration & environment patterns
- ✅ **I4:** Mongoose ODM integration (schema, model, query)
- ✅ **I5:** Validation sweep, documentation, M3 artifacts

**Pattern Modules (8):**
1. Express middleware (3-param signature)
2. Express routing (Router initialization, HTTP methods)
3. Express error handling (4-param error middleware)
4. Express async (async/Promise detection)
5. Express configuration (app.set/get, process.env)
6. Mongoose schema (fields, refs, required)
7. Mongoose model (registration, schema linking)
8. Mongoose query (read/write, model linking)

**Test Coverage:**
- Total tests: 1155 passing, 4 skipped (up from 935 in Phase 5)
- Express-specific: ~220 tests (unit + integration)
- Branch coverage: ≥80% (CI enforced)

**Quality Gates:**
- ✅ Lexicon validator: 51/51 passing
- ✅ Golden regressions: 100% accept rate
- ✅ All runtime gates: PASS (Coverage/Link/Grounding/Confidence)
- ✅ Finalization: Smoke test passing

**Handoff Materials:**
- ✅ Lessons doc: `docs/internal/PHASE6_EXPRESS_LESSONS.md` (540 lines, gold-standard)
- ✅ Coverage matrix: `docs/pattern-coverage.md` (Express + Mongoose sections)
- ✅ Release notes: `docs/RELEASE_NOTES_PHASE6.md` (Express + Mongoose features)
- ✅ M3 contribution: `docs/reviews/M3_EXPRESS_CONTRIBUTION.md` (265 lines)
- ✅ Decision log: `DECISIONS.md` (I4 + I5 entries)

**Deferred to Wave 2:**
- 🟡 Accuracy harness script implementation (`scripts/run-tier0-accuracy.mjs`)
- 🟡 Benchmark script implementation (`scripts/run-nextjs-benchmark.mjs`)
- **Rationale:** Better coordinated by Agent 6 across all Tier-0 frameworks
- **Evidence:** Integration tests + KB chunk assertions provide proxy validation

**Approval Status:**
- ✅ Code Review Agent: Approved with conditions (2025-11-07)
- ⏳ Product Review: Release notes review pending
- ✅ Handoff Authorized: React/Redux/GraphQL/HTTP cleared to proceed

---

## 4) Schedule & Parallelization Model
| Wave | Weeks | Focus | Agents | Status | Exit Criteria |
| --- | --- | --- | --- | --- | --- |
| Wave 1 | 1–2 | Pattern expansion (Express/React/Redux/GraphQL/HTTP). Performance agent shadows for baselines. | 5 | 🟡 **In Progress** (Express complete, 4 agents pending) | Functional sign-off on fixtures + deterministic golden outputs. |
| Wave 2 | 3 | Performance/telemetry + Doc/UX. Pattern agents fix backlog items. | 3 | Benchmark SLO draft, docs ready for review. |
| Wave 3 | 4 | Shared validation: golden diffs, KB assertions, LLM-off runs, Next.js benchmark rerun, release notes. | All | M3 readiness review + branch freeze. |

Performance work intentionally trails functionality so optimizations target stable behavior and avoid churn on evolving rules (per user decision, Nov 2025).

**Wave 1 exit criteria:** All five pattern agents must (a) hit DoD checklist (accuracy ≥0.90, fixtures merged, lexicon/docs updated, finalization tests passing), (b) have PRs merged to `main` with ≥80 % coverage, and (c) secure architect approval. Approvals follow a 24‑hour SLA: pattern owner opens review request in `#ceps-approvals`; architect responds within 1 business day—if missed, Agent 6 escalates and a deputy reviewer provides sign-off. Allow up to 3 business days contingency; beyond that, descope P1 auxiliary patterns or escalate to product for timeline slip.  
**Wave 2 coordination:** Performance agent acts as integration coordinator; pattern agents reserve 20 % capacity for perf-driven fixes surfaced by profiling. Docs agent cannot begin until coverage matrices delivered (end of Wave 1). Day 2 of Wave 2 includes a proactive `run-nextjs-benchmark` checkpoint; if metrics trend toward SLO breach, perf tiger team activates immediately (Agents 1,2,6).  
**Wave 3 cadence:** Day 1‑2 golden diffs & KB assertion audits; Day 3 benchmark rerun + telemetry review; Day 4 LLM-off + finalization spot checks; Day 5 release notes + M3 review dry run. Critical validation failure triggers immediate escalation and potential schedule extension.

---

## 5) Testing & Validation Strategy
1. **Phase ‑1 analysis** is mandatory before writing tests for each new matcher (inspect KB facts, parser output, and existing fixtures). fileciteAGENTS.md#L318-L324  
2. **TDD discipline:** Every enhancement begins with failing tests; maintain ≥80 % branch coverage per workstream. fileciteAGENTS.md#L240-L314  
   - Include KB chunk assertions in integration tests; e.g.,
     ```ts
     expect(chunks).toContainEqual(
       expect.objectContaining({
         content: expect.stringContaining('handles GET /users'),
         confidence: expect.toBeGreaterThanOrEqual(70),
         factSetId: expect.any(String),
       })
     );
     ```
3. **Pattern harness:** For each Tier‑0 framework, create accuracy suites that compare expected vs observed behaviors; report precision/recall and flag drops below 90 %.  
   - **5.3.1 Accuracy methodology:**  
     1. Curate 20‑50 representative snippets per framework (stored under `tests/fixtures/accuracy/<framework>/`) with architect-reviewed ground truth behaviors.  
     2. Run ceps with `--llm off --deterministic` to collect behavior chunks, then compute precision, recall, and F1 (harmonic mean).  
     3. DoD requires F1 ≥0.90, precision ≥0.88, recall ≥0.88. Failing cases become blocking bugs.  
     4. Accuracy harness runs nightly; regressions fail CI and page pattern owner.  
4. **Golden-spec regressions:** Extend `tiny-react`, `tiny-express`, and add new fixtures as needed; follow the snapshot discipline in `tests/fixtures/phase5/baseline`. fileciteAGENTS.md#L254-L274  
5. **LLM-off parity:** Run deterministic tests (`--llm off --deterministic`) to ensure template prose remains Spec-Ready if the gateway is disabled. fileciteAGENTS.md#L312-L315  
6. **Benchmark suite:** Add CI job (nightly/weekly) that runs ceps on `vercel/next.js`, collects metrics, and fails if SLOs regress. (Repo stored adjacent to ceps; path configurable.)  
7. **Confidence calibration:** Maintain `tests/fixtures/confidence-calibration/<framework>/` with known High/Medium/Low examples; assert score deltas stay within ±5 points after each merge. Fail CI if calibration drifts beyond threshold.  
8. **Finalization compatibility:** For each framework fixture, capture at least one QID, craft `answers.md`, run `ceps finalize --answers answers.md --llm off`, and assert QID removal + Finalization Summary updates.

---

## 6) Tooling & Integration Notes
- **Repository layout:** Keep `vercel/next.js` as a sibling directory; add config flag/env (`CEPS_BENCHMARK_PATH`) so perf scripts locate it without vendoring.  
- **Automation scripts:**  
  - `scripts/run-tier0-accuracy.mjs` — executes framework accuracy suites, outputs coverage table.  
  - `scripts/run-nextjs-benchmark.mjs` — runs ceps against Next.js with perf profile, exports metrics JSON for CI comparison.  
  - `scripts/update-pattern-matrix.mjs` — regenerates documentation snippet showing supported behaviors vs confidence levels.  
- **Benchmark repo setup:** `scripts/setup-benchmark.sh` clones `vercel/next.js` at commit `db5528317e24e0316e0497716976a715a325ca09` into `../next.js-benchmark/` (script asserts hash via `git rev-parse --verify`); requires ~500 MB disk & 16 GB RAM for analysis. Contributors on constrained hardware may run `scripts/run-nextjs-benchmark.mjs --focus public-api` for smoke validation.  
- **Telemetry hooks:** Extend orchestrator metrics emission (per CTS‑07) to capture worker utilization and queue depth for dashboards. fileciteCTS-07_Orchestrator_and_Lifecycle.md#L40-L150
- **Metrics storage:** Benchmark script writes `benchmarks/results/<date>-<commit>.json` with schema `{timestamp, commit, runtime_sec, peak_rss_mb, llm_tokens, exit_code, gates}`; `scripts/plot-benchmark-trends.mjs` visualizes trends for M3 review.  
- **CI cadence:** Nightly benchmark job runs `--llm off --deterministic` (cost-free) to catch regressions early; weekly job runs `--llm on` to validate full SLO compliance.

---

## 7) Risks & Mitigations
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Pattern regressions silently reduce coverage | Specs omit behaviors, failing Coverage Gate | Mandatory polluted fixtures + KB chunk assertions; nightly tier0 accuracy run; gate fails on drop. |
| Benchmark drift in Next.js repo | Metrics become non-comparable | Pin to known commit hash per quarter; track hash in benchmark report; rerun on updates intentionally. |
| Performance tuning fights in-flight pattern changes | Schedule churn, unstable metrics | Delay aggressive optimizations until Wave 2; performance agent only profiles in Wave 1. |
| Benchmark SLO miss | Release cannot ship | If `run-nextjs-benchmark` exceeds SLO, enter perf tiger team (Agents 1,2,6); halt docs/release work until regression fixed or scope valve applied (`--focus public-api`). |
| LLM budget spikes due to new behaviors | Cost overruns, latency | Enforce stricter budget guard + fallback thresholds; document deterministic fallback expectations. |
| Documentation lags new capabilities | Users confused about coverage | Embed Agent 7 as required reviewer on pattern PRs; CI check ensures new `src/reasoning/patterns/**` diffs include updates to `docs/pattern-coverage.md`; block merge otherwise. |
| Auxiliary pattern scope creep | Schedule slip, unfinished integrations | Prioritize P0 aux features first; track P1/P2 on backlog. If Wave 1 slips >3 days, automatically defer Tailwind/styled-components to post-M3. |
| Inter-agent coordination overhead | Duplicate work, blocking PRs | Daily 15‑min standup during Wave 1; Agent 6 facilitates integration decisions and records outcomes in `DECISIONS.md`. |
| Benchmark CI failures | Hidden regressions persist | Nightly --llm off benchmark alerts #phase6-agents; owner triages within 1 day. Weekly --llm on benchmark for full SLO validation; failure blocks release freeze. |

---

## 8) Deliverables Checklist
1. Tier‑0 pattern code + tests + fixtures merged with accuracy reports ≥90 %.  
2. Updated golden-spec snapshots and KB assertion suites.  
3. Benchmark tooling + published baseline vs optimized metrics for `vercel/next.js`.  
4. Orchestrator telemetry + performance tuning patches.  
5. Updated CLI help, docs, release notes.  
6. M3 gate review document summarizing metrics, open issues, and go/no-go recommendation.

Upon completion, tag release candidate (`v1.0.0-rc6` placeholder) and hand off to product for final approvals.

### 8.1 M3 Gate Review Package
- **Owner:** Agent 6 (Performance) with support from Agent 7 (Docs).  
- **Contents:** Tier‑0 accuracy table (precision/recall/F1), benchmark metrics vs SLO, coverage/grounding/link/confidence/monorepo gate status, documentation checklist, open issues with severity + mitigation, recommendation (Go/No-Go).  
- **Approvers:** Lead architect + product manager.  
- **Versioning:** Stored at `docs/reviews/M3_Gate_<date>.md`; linked from DECISIONS log.  
- **Release tagging:** `v1.0.0-rc6` (6th RC aligning with Phase 0‑5 checkpoints). Final `v1.0.0` tag follows once Go decision recorded and no blockers remain for 48 h.

---

## 9) Communication Plan
- **Weekly Phase 6 sync (30 min):** Pattern leads share accuracy metrics, blockers.  
- **Mid-wave checkpoint:** Performance + Docs demo telemetry dashboards and doc changes.  
- **Daily async updates:** Post in `#ceps-phase6` with status template (Yesterday/Today/Blockers/Metrics).  
- **Decision log:** Capture deviations (e.g., new SLO numbers) in `DECISIONS.md` to keep architecture artifacts current.
- **Daily status template:**  
  ```
  Agent #: 
  Yesterday: 
  Today: 
  Blockers: 
  Metrics: {testsGreen: x/y, coverage: z%, fixtures: n/m, accuracyF1: %, benchmarkRuntime: }
  ```
- **Decision log scope:** Record hardware baselines, SLO changes, scope descopes, escalation outcomes; include date, owner, approver. File lives at repo root (`DECISIONS.md`).  
- **Escalation protocol:**  
  - Blocker >24 h → raise in channel + weekly sync; architect assigns resolver.  
  - Cross-agent conflict → Agent 6 mediates; unresolved within 24 h escalated to architect for decision.  
  - Benchmark SLO risk or gate regression → immediate ping to product + architect; may trigger schedule adjustment.  
  - Regression response: fix-forward if resolution <2 h; otherwise revert offending PR and reopen once validated.
- **Approval SLA:** Architect (or delegate) acknowledges PR reviews within 24 h; if no response, Agent 6 pings `#ceps-approvals` and assigns predesignated backup reviewer (Doc: `DECISIONS.md`).

---

## 10) Open Questions & Future Triggers
- **Status:** All previously open questions resolved (hardware baseline locked; Tier‑1 scope deferred).  
- **Re-open triggers:**  
  1. Product requests Tier‑1 (Next.js/Prisma) coverage during Phase 6.  
  2. Benchmark hardware profile changes (different core count/RAM or cloud runners).  
  3. P0 auxiliary patterns threaten timeline, requiring descoping beyond Tailwind/styled-components.  
Any trigger adds a new entry to this section and `DECISIONS.md`, plus an updated plan revision. fileciteAGENTS.md#L149-L199
