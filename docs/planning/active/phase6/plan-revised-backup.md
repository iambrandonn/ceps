# ceps — Implementation Plan (Phase 6: Production Hardening)
**Date:** 2025-11-08 (Revised)
**Scope:** Final-phase plan that turns the Phase 5 baseline into a production-ready release with Tier‑0 framework depth, large-repo performance guarantees, and polished UX/documentation.
**Status:** Wave 1A (Backend Validation Track) — Agent 1 (Express) ✅ COMPLETE, Agent 5 (HTTP Clients) Ready to start
**Revision:** Backend-first validation strategy adopted to prove architecture soundness before frontend pattern expansion

---

## 0) Purpose & Context

Phase 6 is the final gate before declaring ceps production-ready. Prior phases already delivered finalization, gating, and deterministic behavior; this effort expands the Tier‑0 reasoning pattern library (Tier‑1 frameworks explicitly deferred), hardens performance on large repositories (benchmark: local clone of `vercel/next.js`), and completes outward-facing UX/documentation per the charter in **AGENTS.md** and **IMPLEMENTATION_PLAN.md**. The phase closes with the M3 gate.

**Revised Strategy (2025-11-08):** After Express completion, adopted a **backend-first validation track** to prove architectural soundness on real codebases before expanding to frontend patterns. This conservative approach reduces risk of cascading rework across multiple parallel agents by:

1. Completing HTTP Clients (Agent 5) to round out the backend request/response cycle
2. Validating on 2-3 real-world Express + Mongoose + HTTP projects
3. Documenting gaps and architectural issues before launching React/Redux/GraphQL
4. Allowing time to fix any fundamental problems without impacting 5 parallel agents

This delays frontend work by ~2 weeks but significantly reduces risk of late-phase architectural rework.

---

## 1) Goals & Success Metrics (Revised for Backend-First Track)

### Wave 1A: Backend Validation (Weeks 1-2)
1. **HTTP Client pattern completion:** Axios/Fetch patterns auto-detect ≥90% of targeted behaviors (requests, error handling, retries, interceptors)
2. **Real-world validation:** Run ceps on 2-3 backend projects (Express + Mongoose + HTTP clients) with manual accuracy assessment
3. **Backend coherence:** Full request→routing→persistence→external-API cycle documented end-to-end with proper cross-links
4. **Gate validation:** All quality gates (Coverage/Link/Grounding/Confidence) pass on real codebases, not just fixtures
5. **Finalization proof:** Generate QIDs on real code, create sample answers.md, successfully run `ceps finalize`

### Wave 1B: Frontend Expansion (Weeks 3-4, conditional on Wave 1A success)
1. **Tier‑0 frontend coverage:** React, Redux, GraphQL patterns auto-detect ≥90% of targeted behaviors
2. **Frontend validation:** Run ceps on 1-2 React + Redux applications
3. **Full-stack validation:** Run ceps on project combining Express backend + React frontend

### Wave 2: Performance & Polish (Weeks 5-6)
1. **Performance guardrails:** ceps analyzes `vercel/next.js` within agreed budgets
2. **Documentation complete:** Pattern coverage matrix, CLI help, release notes
3. **M3 gate ready:** All deliverables complete, approval package prepared

---

## 2) Entry & Exit Criteria (Revised)

### Entry
- Phase 5 checkpoints complete; snapshot/finalization stable; current tests (1155 passing, 93%+ coverage) green
- Express patterns (8 modules) complete and approved
- **Hardware baseline locked:** Apple M2 Pro (10‑core CPU, 32 GB RAM, NVMe ≥1 GB/s) **or** AMD Ryzen 7 5800X / Intel Core i7‑12700K class desktops
- **Tier-1 scope decision:** Next.js & Prisma deferred to post-M3
- **Validation targets identified:** 2-3 real backend projects selected for testing

### Exit Criteria (Phased)

**Wave 1A Exit (Backend Validation Checkpoint):**
- HTTP Clients (Agent 5) complete with ≥90% accuracy on fixtures
- Real-world validation complete on 2-3 backend projects
- Validation report documenting:
  - Pattern detection accuracy (precision/recall per pattern type)
  - Gate pass/fail status on real code
  - Known gaps and architectural issues
  - Go/no-go recommendation for Wave 1B
- All gates green on real projects (Coverage/Link/Grounding/Confidence)
- Finalization workflow proven on real QIDs

**Wave 1B Exit (Frontend Completion):**
- React, Redux, GraphQL patterns complete with ≥90% accuracy
- Frontend validation complete on 1-2 applications
- Full-stack validation on combined backend + frontend project

**M3 Gate (Final Exit):**
- Tier‑0 accuracy F1 ≥0.90 per framework harness
- `next.js` benchmark meets performance SLO (runtime ≤15 min, peak RSS ≤16 GB, LLM tokens ≤1.5M)
- Documentation + CLI help updated; release notes + M3 gate review approved
- All automated tests passing with ≥80% branch coverage per workstream

---

## 3) Workstreams & Deliverables (Restructured)

### 3.1 Wave 1A: Backend Validation Track

#### 3.1.1 WS‑D HTTP Clients (Agent 5) — PRIORITY 1
**Timeline:** Weeks 1-2 of Wave 1A

**Deliverables:**
1. **Phase ‑1 analysis:** Capture ts-morph facts for Axios/Fetch patterns; document common usage patterns
2. **Pattern modules:**
   - Axios client initialization, interceptors, instance configuration
   - Fetch wrapper patterns, error handling
   - Request/response transformations
   - Retry/backoff logic detection
   - Timeout and circuit breaker patterns
   - Authentication header injection patterns
3. **KB wiring:** Link HTTP calls to Express routes (outbound dependencies), capture side effects, error semantics
4. **Testing:** Polluted fixtures with multiple client instances, shared configs, per-request overrides
5. **Integration:** Ensure HTTP client calls in Express routes are properly documented with retry/error detail

**DoD:**
- 90%+ accuracy on curated HTTP client test suite
- Zero gate regressions on existing Express tests
- Documentation entry in pattern coverage matrix
- Finalization integration test proving HTTP client QIDs can be resolved
- KB chunk assertion tests verifying confidence and factSet attribution

#### 3.1.2 Real-World Validation (All Agents) — PRIORITY 1
**Timeline:** End of Week 2 (after Agent 5 complete)

**Validation Targets:**
1. **Small backend API** (public GitHub, <5k LOC, Express + Mongoose)
2. **Medium backend service** (5-15k LOC, Express + Mongoose + HTTP clients)
3. **Internal/test project** (if available, with known patterns like Agenda.js, JWT auth, file storage)

**Process:**
1. Run `ceps <project-root> --llm off --deterministic` on each target
2. Run `ceps <project-root> --llm on` on each target
3. Manual review of generated `spec.md` files:
   - Are Express routes documented correctly?
   - Are Mongoose models/schemas detected and linked?
   - Are HTTP client calls documented with error handling?
   - Are middleware chains (auth, roles, async wrappers) described?
   - Are side effects (DB, file I/O, external APIs) captured?
4. Capture precision/recall metrics:
   - True positives: Correctly detected behaviors
   - False positives: Hallucinated or incorrect behaviors
   - False negatives: Missing behaviors that should be documented
5. Document known gaps (e.g., Agenda.js job scheduling, S3 operations, specialized auth patterns)
6. Test finalization workflow:
   - Identify 3-5 real QIDs generated by ceps
   - Create sample `answers.md` with resolutions
   - Run `ceps finalize --answers answers.md --llm off`
   - Verify QID removal and Finalization Summary generation

**Deliverables:**
- **Validation Report** (`docs/internal/PHASE6_BACKEND_VALIDATION_REPORT.md`):
  - Executive summary (Go/No-Go for Wave 1B)
  - Per-project results (accuracy metrics, gate status, spec quality assessment)
  - Known gaps and deferred patterns (Agenda.js, specialized auth, etc.)
  - Architectural issues discovered (if any)
  - Recommendations for fixes before Wave 1B

**Go/No-Go Decision:**
- **Go criteria:** ≥85% precision, ≥80% recall on backend validation targets; all gates pass; no blocking architectural issues
- **No-Go criteria:** <80% precision or recall; systematic gate failures; architectural problems requiring significant rework

---

### 3.2 Wave 1B: Frontend Expansion (Conditional on Wave 1A Go)

#### 3.2.1 WS‑D React Pattern Library (Agent 2)
**Timeline:** Weeks 3-4 (parallel with Agents 3-4)

1. Support function/class components, `forwardRef`, suspense/lazy, hooks (built-in + custom), Context provider/consumer mapping, side-effect detection (`useEffect`, `useLayoutEffect`)
2. Resolve prop/state relationships; link to consumers where possible
3. **P1 styling:** styled-components (tagged template literals) and Tailwind CSS (className normalization) — defer if Wave 1A finds architectural issues
4. Fixtures include mixed client/server components; tests assert positive/negative matches
5. DoD: 90%+ recognition, accurate hook side-effect descriptions, deterministic LLM-off prose

#### 3.2.2 WS‑D Redux Pattern Library (Agent 3)
**Timeline:** Weeks 3-4 (parallel with Agents 2, 4)

1. Map action creators, slice reducers, selectors, middleware; respect namespacing for polluted datasets
2. Capture side effects (thunks, sagas-lite) as HTTP/IO behaviors; degrade confidence for dynamic dispatch
3. Fixtures with colliding action types and nested selectors; enforce KB chunk assertions
4. DoD: Selectors/middleware documented with proper dependencies, Open Questions only for irreducible ambiguity

#### 3.2.3 WS‑D GraphQL Pattern Library (Agent 4)
**Timeline:** Weeks 3-4 (parallel with Agents 2-3)

1. Pair SDL/Code-first schema definitions with resolver implementations
2. Capture queries/mutations/subscriptions, argument validations, data sources
3. **P0 Apollo:** Apollo Server/Client integration points (`gql` template tags, `useQuery/useMutation`)
4. Detect schema stitching and gateway patterns; downgrade confidence + emit QIDs for remote resolution
5. Fixtures combining SDL files, resolver maps, federated compositions
6. DoD: Schema + resolver behaviors described with cross-links, conflict handling for missing resolvers

---

### 3.3 Wave 2: Performance & Polish

#### 3.3.1 WS‑H Performance & Telemetry (Agent 6)
**Timeline:** Weeks 5-6 (starts after Wave 1B complete)

1. **Accuracy harness implementation:** `scripts/run-tier0-accuracy.mjs` executes framework accuracy suites across all patterns (Express, React, Redux, GraphQL, HTTP clients)
2. **Benchmark script implementation:** `scripts/run-nextjs-benchmark.mjs` runs ceps against Next.js with performance profiling
3. **Baseline measurement:** Run ceps against `vercel/next.js`; capture runtime, peak RSS, worker utilization, LLM budget
4. **Optimizations:**
   - Worker pool tuning + adaptive chunk sizing
   - Memory safeguards (KB chunk streaming, AST pruning validation)
   - Budget-aware throttling & cache hit-rate improvements
5. **Telemetry:** Extend run summaries/JSON logs with queue depth, retry counts, benchmark metadata
6. **Acceptance:** Meets SLO on baseline hardware (runtime ≤15 min, peak RSS ≤16 GB, LLM tokens ≤1.5M) with before/after comparison

#### 3.3.2 Documentation & UX Polish (Agent 7)
**Timeline:** Weeks 5-6 (parallel with Agent 6)

1. Update CLI help and docs to cover all pattern coverage, `--llm` knobs, performance tuning, monorepo navigation
2. Refresh onboarding guide with workflow diagrams, golden-spec fixture instructions, gate expectations
3. Produce release notes summarizing Phase 6 additions + upgrade steps
4. Maintain `docs/pattern-coverage.md` matrix with all Tier-0 patterns documented
5. Create M3 gate review package (accuracy table, benchmark metrics, gate status, go/no-go recommendation)

---

### 3.4 Auxiliary Pattern & Reader Enhancements (Deferred to Post-Validation)

**Priority tiers adjusted:**
- **P0 (Wave 1A):** Vitest/Testing Library reader upgrades (affects all agents)
- **P0 (Wave 1B):** Apollo Client/Server bridging (GraphQL), Mongoose modeling (already done in Agent 1)
- **P1 (Wave 1B, descope if needed):** styled-components theme awareness, Tailwind class clustering
- **P2 (Post-M3):** Agenda.js, Redis, specialized auth patterns, S3/storage operations

**Rationale:** Defer specialized patterns (Agenda.js, Redis, etc.) until core backend + frontend validation proves architecture is sound. Document as "known gaps" in validation report rather than blocking M3 on their completion.

---

### 3.5 Cross-Workstream DoD (Unchanged)

For every Tier‑0/auxiliary pattern change:
- Lexicon update + validator test covering any new terminology
- Coverage matrix row in `docs/pattern-coverage.md`
- Finalization integration test proving QIDs can be resolved
- KB chunk assertion tests (positive + negative) verifying confidence bands and factSet attribution
- Error-handling contract: patterns never throw; emit diagnostics + Open Questions instead

---

### 3.6 Pattern Library Architecture & Extension Contract (Unchanged)

- **Module layout:** `src/reasoning/patterns/<framework>/index.ts` exports `PatternModule` objects
- **Interface:** `{ id, matches(kb, entity), describe(kb) → Chunk[], confidenceAdjustments }`
- **Precedence:** Deterministic order (shared primitives=1, framework core=2, auxiliary=3) + alphabetical
- **Error handling:** Patterns must never throw; emit diagnostics + Open Questions
- **Testing scaffold:** `tests/reasoning/<framework>/*.test.ts` with Phase‑1 fact inspection notes

---

## 3.7 Workstream Status Tracking (Revised)

**Last Updated:** 2025-11-08

### Wave 1A: Backend Validation Track

| Agent | Workstream | Status | Start Date | Target Completion | Key Metrics |
|-------|-----------|--------|-----------|-------------------|-------------|
| **Agent 1** | Express Pattern Library | ✅ **COMPLETE** | 2025-11-01 | 2025-11-07 | 8 modules, 1155 tests passing, 49 lexicon terms, 51/51 validator tests |
| **Agent 5** | HTTP Clients Pattern Library | 🟢 **READY TO START** | 2025-11-08 | 2025-11-15 | Target: 90%+ accuracy, ~50 tests, 10-15 lexicon terms |
| **Validation** | Real-World Backend Testing | ⏳ **PENDING Agent 5** | 2025-11-15 | 2025-11-18 | 2-3 projects, validation report, go/no-go decision |

### Wave 1B: Frontend Expansion (Conditional)

| Agent | Workstream | Status | Dependencies | Target Completion |
|-------|-----------|--------|--------------|-------------------|
| **Agent 2** | React Pattern Library | ⏸️ **ON HOLD** | Wave 1A Go decision | 2025-11-29 |
| **Agent 3** | Redux Pattern Library | ⏸️ **ON HOLD** | Wave 1A Go decision | 2025-11-29 |
| **Agent 4** | GraphQL Pattern Library | ⏸️ **ON HOLD** | Wave 1A Go decision | 2025-11-29 |

### Wave 2: Support Agents

| Agent | Workstream | Status | Dependencies | Notes |
|-------|-----------|--------|--------------|-------|
| **Agent 6** | Performance & Telemetry | ⏳ **PENDING Wave 1B** | All Tier-0 patterns complete | Accuracy harness + benchmark scripts |
| **Agent 7** | Documentation & UX | ⏳ **PENDING Wave 1B** | Coverage matrices from all agents | Release notes, CLI help, M3 package |

---

## 4) Schedule & Parallelization Model (Revised)

| Wave | Weeks | Focus | Agents | Status | Exit Criteria |
| --- | --- | --- | --- | --- | --- |
| **Wave 1A** | 1–2 | HTTP Clients + Backend Validation | 1 active (Agent 5) | 🟢 **READY TO START** | Agent 5 DoD + Validation Report with Go/No-Go recommendation |
| **Wave 1B** | 3–4 | Frontend Expansion (React/Redux/GraphQL) | 3 parallel (Agents 2-4) | ⏸️ **BLOCKED on 1A** | Frontend patterns complete, validation on 1-2 React apps |
| **Wave 2** | 5–6 | Performance/Telemetry + Docs/UX | 2 parallel (Agents 6-7) | ⏳ **PENDING 1B** | Benchmark SLO met, M3 package complete |
| **Wave 3** | 7 | Final validation + M3 review | All | ⏳ **PENDING Wave 2** | M3 gate approval, release tag |

**Critical Path:**
1. Agent 5 (HTTP Clients) — 2 weeks
2. Backend Validation — 3 days
3. **DECISION POINT:** If validation shows architectural issues, fix before proceeding
4. Agents 2-4 (Frontend) — 2 weeks (parallel)
5. Agents 6-7 (Performance + Docs) — 2 weeks (parallel)
6. Final M3 review — 1 week

**Total Timeline:** 7-8 weeks (vs. original 4 weeks), but with significantly reduced rework risk

---

## 5) Testing & Validation Strategy (Enhanced)

### 5.1 Pattern Testing (Per Agent, Unchanged)
1. **Phase ‑1 analysis** mandatory before writing tests
2. **TDD discipline:** ≥80% branch coverage per workstream
3. Include KB chunk assertions in integration tests
4. **Pattern harness:** Accuracy suites with precision/recall ≥90%

### 5.2 Real-World Validation (NEW — Wave 1A Critical Path)

**Validation Targets (2-3 backend projects):**
- Small Express API (<5k LOC)
- Medium Express + Mongoose service (5-15k LOC)
- Test project with known specialized patterns (Agenda.js, JWT, etc.)

**Validation Process:**
1. Run both `--llm off --deterministic` and `--llm on` modes
2. Manual spec quality review:
   - Route detection accuracy
   - Model/schema detection and linking
   - HTTP client call documentation
   - Middleware chain descriptions
   - Side effect capture (DB, I/O, external APIs)
   - Cross-link correctness (routes → models → HTTP clients)
3. Compute accuracy metrics:
   - Precision: % of documented behaviors that are correct
   - Recall: % of actual behaviors that are documented
   - F1 score: Harmonic mean of precision and recall
4. Gate validation: All gates (Coverage/Link/Grounding/Confidence) must pass
5. Finalization workflow test: Generate QIDs, create answers, run finalize, verify patching

**Success Criteria:**
- Precision ≥85%, Recall ≥80%, F1 ≥0.82 on backend validation targets
- All gates green on all validation projects
- Finalization workflow completes successfully
- No systematic architectural issues discovered

**Failure Response:**
- If validation fails, pause Wave 1B and fix issues
- Document root causes in validation report
- Estimate fix timeline (if >1 week, escalate to product)
- Re-run validation after fixes
- Only proceed to Wave 1B after validation passes

### 5.3 Frontend Validation (Wave 1B)
- Same process as backend validation
- Run on 1-2 React applications
- Full-stack test on combined Express backend + React frontend

### 5.4 Golden-Spec Regressions (Ongoing)
- Extend `tiny-react`, `tiny-express` fixtures as patterns expand
- Follow snapshot discipline from Phase 5
- LLM-off parity tests ensure deterministic prose remains Spec-Ready

### 5.5 Benchmark Suite (Wave 2)
- CI job runs ceps on `vercel/next.js`, collects metrics, fails if SLOs regress
- Nightly `--llm off --deterministic` runs (cost-free)
- Weekly `--llm on` runs for full SLO validation

---

## 6) Tooling & Integration Notes (Unchanged)

- **Repository layout:** Keep `vercel/next.js` as sibling directory
- **Automation scripts:**
  - `scripts/run-tier0-accuracy.mjs` — framework accuracy suites (Agent 6, Wave 2)
  - `scripts/run-nextjs-benchmark.mjs` — Next.js performance profiling (Agent 6, Wave 2)
  - `scripts/update-pattern-matrix.mjs` — regenerate coverage documentation
  - **NEW:** `scripts/run-backend-validation.mjs` — automates validation process on target projects (Wave 1A)
- **Benchmark repo setup:** `scripts/setup-benchmark.sh` clones Next.js at pinned commit
- **Telemetry hooks:** Extend orchestrator metrics (queue depth, worker utilization)
- **Metrics storage:** `benchmarks/results/<date>-<commit>.json`
- **CI cadence:** Nightly deterministic runs, weekly LLM-enabled runs

---

## 7) Risks & Mitigations (Updated)

| Risk | Impact | Mitigation | Status |
| --- | --- | --- | --- |
| **Architectural issues discovered during validation** | Could require significant rework across all patterns | Backend-first validation catches issues early, before 5 parallel agents start | ✅ **MITIGATED** by new approach |
| **Validation reveals systemic pattern detection failures** | M3 timeline at risk | Go/No-Go decision after validation; fix before proceeding to Wave 1B | ⏳ **MONITORING** |
| Backend validation shows <80% recall | Specs missing critical behaviors | Iterate on Express/Mongoose/HTTP patterns before moving to frontend | ⏳ **MONITORING** |
| Wave 1A takes >2 weeks | Delays entire Phase 6 | Agent 5 has clear scope; validation is time-boxed to 3 days | ⏳ **MONITORING** |
| Pattern regressions silently reduce coverage | Specs omit behaviors | Mandatory polluted fixtures + KB chunk assertions; nightly accuracy runs | ✅ **ONGOING** |
| Benchmark drift in Next.js repo | Metrics non-comparable | Pin to known commit hash; track hash in benchmark report | ✅ **CONTROLLED** |
| Performance tuning fights pattern changes | Schedule churn | Delay optimizations until Wave 2; Agent 6 only profiles in Wave 1 | ✅ **PLANNED** |
| LLM budget spikes | Cost overruns | Enforce budget guard + fallback thresholds | ✅ **CONTROLLED** |
| Documentation lags new capabilities | User confusion | Agent 7 required reviewer on pattern PRs; CI checks pattern-coverage.md updates | ✅ **ENFORCED** |

---

## 8) Deliverables Checklist (Phased)

### Wave 1A Deliverables
- ✅ Express pattern library (8 modules) — **COMPLETE**
- ⏳ HTTP Clients pattern library + tests + fixtures
- ⏳ Backend validation report with accuracy metrics and go/no-go recommendation
- ⏳ Updated pattern coverage matrix (Express + Mongoose + HTTP clients)
- ⏳ Known gaps documentation (Agenda.js, Redis, specialized auth, etc.)

### Wave 1B Deliverables (Conditional on 1A Go)
- ⏳ React pattern library + tests + fixtures
- ⏳ Redux pattern library + tests + fixtures
- ⏳ GraphQL + Apollo pattern library + tests + fixtures
- ⏳ Frontend validation report (1-2 React apps)
- ⏳ Full-stack validation (Express + React combined project)
- ⏳ Updated pattern coverage matrix (all Tier-0 patterns)

### Wave 2 Deliverables
- ⏳ Accuracy harness scripts (`run-tier0-accuracy.mjs`)
- ⏳ Benchmark scripts (`run-nextjs-benchmark.mjs`, `setup-benchmark.sh`)
- ⏳ Benchmark tooling + baseline vs optimized metrics for `vercel/next.js`
- ⏳ Orchestrator telemetry + performance tuning patches
- ⏳ Updated CLI help, docs, release notes
- ⏳ M3 gate review document (accuracy table, benchmark metrics, gates, recommendation)

### M3 Final Deliverables
- ⏳ All Tier-0 pattern code + tests + fixtures merged with accuracy ≥90%
- ⏳ All golden-spec snapshots and KB assertion suites updated
- ⏳ Performance SLO met on Next.js benchmark
- ⏳ All gates passing (Coverage/Link/Grounding/Confidence/Monorepo)
- ⏳ Release candidate tagged (`v1.0.0-rc6`)
- ⏳ Final v1.0.0 tag after 48h no-blocker period

---

## 9) Communication Plan (Unchanged)

- **Weekly Phase 6 sync (30 min):** Pattern leads share accuracy metrics, blockers
- **Mid-wave checkpoint:** Performance + Docs demo telemetry dashboards and doc changes
- **Daily async updates:** Post in `#ceps-phase6` with status template
- **Decision log:** Capture deviations in `DECISIONS.md`
- **Daily status template:**
  ```
  Agent #:
  Yesterday:
  Today:
  Blockers:
  Metrics: {testsGreen: x/y, coverage: z%, fixtures: n/m, accuracyF1: %, benchmarkRuntime: }
  ```
- **Escalation protocol:**
  - Blocker >24 h → raise in channel + weekly sync
  - Cross-agent conflict → Agent 6 mediates
  - Benchmark SLO risk or gate regression → immediate ping to product + architect
- **Approval SLA:** Architect responds within 24 h; Agent 6 escalates if missed

---

## 10) Open Questions & Future Triggers

### Resolved (2025-11-08)
- ✅ **Strategy pivot approved:** Backend-first validation track adopted to reduce risk
- ✅ **Tier-1 scope:** Next.js & Prisma deferred to post-M3
- ✅ **Hardware baseline:** Locked in DECISIONS.md

### Open (Pending Wave 1A Validation)
- **Validation target selection:** Finalize 2-3 backend projects for testing (by 2025-11-09)
- **Known gap prioritization:** After validation, decide which specialized patterns (Agenda.js, Redis, auth) to target post-M3
- **Performance targets:** Confirm Next.js benchmark SLO after Wave 1A validates on smaller projects

### Re-open Triggers
1. Wave 1A validation fails go/no-go criteria (precision <85% or recall <80%)
2. Systematic gate failures discovered during validation (Coverage/Link/Grounding)
3. Architectural issues require >1 week to fix (escalate timeline to product)
4. Product requests Tier‑1 (Next.js/Prisma) coverage during Phase 6
5. Benchmark hardware profile changes

---

## 11) Decision Log Entries (New)

**Decision:** Adopt backend-first validation track for Phase 6 Wave 1
**Date:** 2025-11-08
**Owner:** Project Lead
**Rationale:** After Express completion, identified need to validate tool on real codebases before launching 5 parallel frontend agents. Conservative approach reduces risk of cascading rework if architectural issues emerge.
**Impact:** Delays frontend work by ~2 weeks, extends Phase 6 from 4 weeks to 7-8 weeks, but significantly reduces risk
**Approver:** Architect (implied by strategic decision)

**Decision:** Defer specialized backend patterns (Agenda.js, Redis, specialized auth) to post-M3
**Date:** 2025-11-08
**Owner:** Project Lead
**Rationale:** Focus validation on core Express + Mongoose + HTTP client patterns first. Document specialized patterns as "known gaps" rather than blocking M3 completion.
**Impact:** Reduces Wave 1A scope, allows faster validation cycle
**Approver:** Architect (implied)

---

## Appendix A: Validation Report Template

```markdown
# Phase 6 Backend Validation Report

**Date:** [YYYY-MM-DD]
**Validation Engineer:** [Name/Agent ID]
**Projects Tested:** [List 2-3 projects with LOC counts]

## Executive Summary
- **Go/No-Go Recommendation:** [GO | NO-GO]
- **Overall Precision:** [X.XX]
- **Overall Recall:** [X.XX]
- **F1 Score:** [X.XX]
- **Gates Status:** [All Pass | X Failed]

## Per-Project Results

### Project 1: [Name] ([LOC])
- **Precision:** [X.XX] — % of documented behaviors that are correct
- **Recall:** [X.XX] — % of actual behaviors documented
- **F1:** [X.XX]
- **Gates:** Coverage [PASS/FAIL], Link [PASS/FAIL], Grounding [PASS/FAIL], Confidence [PASS/FAIL]
- **Spec Quality:** [Subjective assessment]
- **Notable Successes:** [Bullet list]
- **Notable Failures:** [Bullet list]

[Repeat for Projects 2-3]

## Pattern Detection Breakdown

| Pattern Type | True Positives | False Positives | False Negatives | Precision | Recall |
|-------------|----------------|-----------------|-----------------|-----------|--------|
| Express Routes | X | X | X | X.XX | X.XX |
| Middleware Chains | X | X | X | X.XX | X.XX |
| Mongoose Models | X | X | X | X.XX | X.XX |
| Mongoose Queries | X | X | X | X.XX | X.XX |
| HTTP Client Calls | X | X | X | X.XX | X.XX |
| Error Handling | X | X | X | X.XX | X.XX |
| Auth Middleware | X | X | X | X.XX | X.XX |

## Known Gaps (Deferred Patterns)
- **Agenda.js:** Job scheduling patterns detected as generic functions (no specialized behavior)
- **Redis:** Cache operations detected as I/O side effects (no cache semantics)
- **JWT Auth:** Basic detection as middleware, but no specialized auth flow description
- **S3/File Storage:** Detected as I/O side effects (no storage provider specifics)

## Architectural Issues
[List any fundamental problems discovered]
- Issue 1: [Description, impact, recommended fix]
- Issue 2: [Description, impact, recommended fix]

## Finalization Workflow Test
- **QIDs Generated:** [Count]
- **Sample answers.md Created:** [Yes/No]
- **Finalize Command:** [Success/Failure]
- **QID Removal:** [Verified/Failed]
- **Finalization Summaries:** [Present/Missing]

## Recommendations
1. [If GO] Proceed to Wave 1B with current patterns; document known gaps for post-M3
2. [If NO-GO] Fix issues X, Y, Z before proceeding; estimated fix time: [duration]
3. [Optional] Consider prioritizing pattern P for post-M3 based on validation findings

## Appendix: Sample Spec Excerpts
[Include 2-3 examples of generated spec.md sections showing quality]
```

---

**Document Status:** Draft for review (2025-11-08)
**Next Action:** Share with project lead for approval, then replace existing plan.md
