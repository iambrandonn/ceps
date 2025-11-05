# ceps — High‑Level Implementation Plan (HLIP)
**Date:** 2025-11-03 (Updated: Phase 4 complete)
**Scope:** End‑to‑end plan to deliver ceps from architecture to MVP and production, aligned to SADS v1.1 and the CTS suite.
**Audience:** AI agents, engineering reviewers, product.
**Status:** Phases 1-4 complete (✅); Phase 5 ready to start

**Phase 1 Completion:**
- ✅ KB API frozen and documented
- ✅ 62 tests passing, 90.71% coverage
- ✅ All feedback integrated
- ✅ Ready for Phase 2 parallelization

**Phase 2 Completion:**
- ✅ End-to-end pipeline working (Scanner → Parser → KB → Generator)
- ✅ 277 tests passing, 94.3% coverage
- ✅ All 4 agent workstreams complete
- ✅ Production-ready baseline

**Phase 3 Completion:**
- ✅ KB indices & reverse-dependency graph published (WS-A)
- ✅ Confidence scoring API upgraded from stub and integrated with reasoning (WS-A/WS-D)
- ✅ Reasoning & Ambiguity Resolver promotes intent and triages QIDs (WS-D)
- ✅ Two-phase cross-link validation and deterministic anchor enforcement in Spec Generator (WS-E)
- ✅ Orchestrator phase coordination, deterministic mode, and link audits (WS-H)

**Phase 4 Completion:**
- ✅ Grounding Validator & adversarial suite (WS-F1) with lexicon workflow and diagnostics
- ✅ LLM polish integration, budget enforcement, CLI flag matrix (WS-F2)
- ✅ Runtime + validation gates, exit codes, and run summary telemetry (WS-H)
- ✅ All gates passing with deterministic template fallback preserved
- ✅ **Results:** 62 test files, 823 tests passed (3 skipped), 93.42% coverage

**Implementation approach:** This project will be implemented by AI agents using **Test-Driven Development (TDD)**. Milestones are structured for progressive delivery; agents should maximize parallelization wherever dependencies permit.

**TDD workflow for agents:**
1. Write failing unit test(s) for the next small piece of functionality
2. Implement minimal code to make tests pass
3. Refactor while keeping tests green
4. Commit test + implementation together
5. Move to next functionality

Unit tests are **required deliverables** for every workstream and are validated at every milestone gate.

**Primary inputs & references:** SADS v1.1 and CTS question set. fileciteturn0file1 fileciteturn0file0

---

## 0) Key Decisions & Clarifications

**For AI agents implementing this system:**

1. **Parallelization strategy:** After KB API freeze (Phase 1), up to 4 agents can work in parallel on Scanner/Parser/Generator/LLM. See §4 for detailed phases.

2. **LLM provider:** Anthropic Claude (Sonnet) is the primary provider. OpenAI, Azure, and local models are also supported but secondary.

3. **Framework priorities:** Tier 0 patterns (critical) are Express, React, Redux, GraphQL, Axios/Fetch. Next.js and Prisma are Tier 1. See M3 in §5.

4. **Orchestrator evolution:** Starts as minimal CLI harness (Phase 1), adds phase coordination (Phase 3), adds gates (Phase 4), adds production optimization (Phase 6). See WS-H in §6.

5. **Determinism is mandatory:** The Determinism Gate in M0 is required, not optional. With `--deterministic`, identical inputs must produce identical outputs.

6. **Monorepo support from M0:** Small monorepo fixture must be part of M0 integration tests. Basic support required early; UX polish in M3.

7. **Critical path:** KB schema & API contract freeze is the critical bottleneck. All Phase 2 work depends on this checkpoint. Prioritize WS-A completion.

8. **Grounding validation:** LLM outputs must pass strict grounding checks (no new entities, numeric safety, lexicon adherence). Failed validations retry twice, then fall back to templates.

9. **Test-Driven Development (TDD):** All workstreams must follow TDD. Write failing tests before implementation. Unit tests are required deliverables and gate criteria. Target: ≥80% branch coverage for core logic (scoring, validators, generators, parsers).

---

## 1) Objectives & Non‑Goals

### 1.1 Objectives
- Deliver **ceps** as a one‑time use CLI that converts a JS/TS codebase into **Spec‑Ready** Markdown (root + per‑directory `spec.md`) in place.
- Provide **bounded finalization** to ingest answers and selectively re‑analyze impacted areas.
- Make LLM use **optional** (templates produce a complete baseline; LLMs add fluency/synthesis with grounding).

### 1.2 Non‑Goals
- No executable **code generation** or **test generation** (downstream tool).  
- No ongoing **sync** between code and specs post‑finalization.  
- No app runtime execution (static analysis only; optional enumeration probes later).

---

## 2) Delivery Strategy (Milestones)

Milestones are sequenced by functional dependencies and testability. Each milestone delivers a working, testable system with increasing capabilities. Agents should work in parallel wherever possible.

| Milestone | Primary Outcomes | Parallelization Opportunity |
|---|---|---|
| **M0 — Static Baseline** | Scanner/Loader, Parser & Facts, Pattern Detector v1, Knowledge Base, **Spec Generator** (templates), **Root + Per‑dir specs**, link validation, gates (Coverage/Link/Determinism) | **High** — After KB schema freeze, 3-4 workstreams can proceed independently |
| **M1 — LLM & Grounding** | LLM Gateway, Grounding Validator, retries & template fallback, budget/cache, deterministic mode, **chunk‑level attribution** | **Medium** — Provider adapters, validator rules, cache can be built in parallel; some M1 work can start during M0 |
| **M2 — Finalization** | Snapshot/Merkle, `answers.md` ingestion, reverse‑deps scoping (caps), selective re‑analysis & patching, Finalization Summaries | **Low** — Sequential by nature; depends on M0+M1 complete. Snapshot mechanism can be prototyped during M0 |
| **M3 — Pattern Expansion & Polish** | Priority framework patterns (Express, React, Redux, GraphQL, Axios/Fetch), monorepo UX refinements, performance tuning, docs polish | **High** — Each framework pattern can be tackled independently |

**Release gates per milestone:** see §7.

**Critical path items:**
- **KB API freeze** must occur early in M0 (blocks all other workstreams)
- **factSet schema** must be finalized before Spec Generator can be completed
- **Orchestrator minimal harness** must exist from M0 start for integration testing

---

## 3) Workstreams (map to CTS)

- **WS‑A Knowledge Base** — CTS‑01. Entity/fact models, confidence scoring, indices, reverse‑deps.  
- **WS‑B Scanner & Loader** — CTS‑05a. Discovery, ignore precedence, monorepo detection, FileIndex/PackageMap.  
- **WS‑C Static Analysis & Patterns** — CTS‑05. Parser/facts, dynamic pattern detector, aux readers (tests/config/OpenAPI/SQL).  
- **WS‑D Reasoning & Ambiguity** — CTS‑06. Rule‑based intent lifting, iterative resolution, triage to Open Questions.  
- **WS‑E Spec Generator** — CTS‑03. Root & per‑directory Markdown, anchors/QIDs, two‑phase linking.  
- **WS‑F LLM Gateway & Grounding** — CTS‑02. Provider adapters, prompts, validator, retries, deterministic mode.  
- **WS‑G Finalization Engine** — CTS‑04. Answers ingestion, snapshot verification, scoped re‑analysis, summaries.  
- **WS‑H Orchestrator & Lifecycle** — CTS‑07. Phase ordering, concurrency, gates, progress, exit codes.

---

## 4) Recommended Build Order & Parallelization Strategy

### Phase 1: Foundation (Sequential)
1. **WS‑H Orchestrator (minimal)** — Bare CLI harness that can invoke components sequentially for testing
2. **WS‑A KB — Core schema** — Entity, Relation, Fact, factSet, Behavior Chunk data models; stable IDs (anchors, QIDs)
3. **WS‑A KB — API contract freeze** — Insert/update/query interfaces that all other components will use

**Checkpoint:** KB API contract is locked and documented. Agents building Scanner, Parser, and Generator can now proceed in parallel.

### Phase 2: I/O & Templates (High Parallelization)
Agents can work independently on:
- **WS‑B Scanner & Loader** — File discovery, ignore rules, monorepo detection → produces FileIndex
- **WS‑C Parser & Patterns** — AST parsing, fact extraction, pattern detector → writes to KB
- **WS‑E Spec Generator (templates)** — Markdown rendering from KB data structures; style kit; anchor/QID generation
- **WS‑F LLM Gateway (skeleton)** — Provider adapters, caching infrastructure (can start early; doesn't need full KB yet)

**Checkpoint:** End-to-end smoke test works (scan → parse → store in KB → generate template specs).

### Phase 3: Intelligence (Medium Parallelization)
- **WS‑A KB — Indices & scoring** — Confidence engine, call/import graphs, reverse-deps (uses facts from Parser)
- **WS‑D Reasoning & Ambiguity** — Intent lifting rules, iterative resolution, Open Question triage
- **WS‑E Spec Generator — Linking** — Two-phase cross-link validation
- **WS‑H Orchestrator — Phase coordination** — Add proper phase ordering, basic parallelization, progress tracking

### Phase 4: Grounding & Polish (Medium Parallelization)
- **WS‑F LLM Gateway — Grounding Validator** — Lexicon, validator rules, retry logic, template fallback
- **WS‑F LLM Gateway — Integration** — Wire into Spec Generator pipeline
- **WS‑H Orchestrator — Gates** — Enforce Coverage/Grounding/Link/Determinism gates; exit codes

**Checkpoint:** M0 gates pass. M1 gates pass.

### Phase 5: Finalization (Sequential)
- **WS‑G Finalization Engine** — Snapshot/Merkle, answers ingestion, impact scoping, selective re-analysis

**Checkpoint:** M2 gates pass.

### Phase 6: Production Hardening (High Parallelization)
- **WS‑D Reasoning — Pattern expansion** — Express, React, Redux, GraphQL, Axios/Fetch (each pattern is independent)
- **WS‑H Orchestrator — Performance** — Worker pools, memory optimization, progress/telemetry
- Monorepo UX polish, documentation, CI hardening

**Checkpoint:** M3 gates pass. fileciteturn0file0

---

## 4.1) Visual Dependency & Parallelization Map

```
PHASE 1 (Sequential - Foundation):
┌─────────────────────────┐
│  WS-H: Minimal CLI      │ (bare harness for testing)
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│  WS-A: KB Schema        │ (Entity, Relation, Fact, factSet, anchors, QIDs)
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│  KB API Freeze          │ ⚠️  CHECKPOINT: Blocks all Phase 2 work
└───────────┬─────────────┘
            ↓
        [PARALLEL]

PHASE 2 (High Parallelization - I/O & Templates):
            ┌─────────────────────┐
            │   WS-B: Scanner     │ (FileIndex, monorepo detection)
            └──────────┬──────────┘
            ┌─────────────────────┐
            │   WS-C: Parser      │ (AST, facts, patterns)
            └──────────┬──────────┘
            ┌─────────────────────┐
            │   WS-E: Generator   │ (templates, anchors, QIDs)
            │     (templates)     │
            └──────────┬──────────┘
            ┌─────────────────────┐
            │ WS-F: LLM Gateway   │ (skeleton: adapters, cache)
            │     (skeleton)      │
            └──────────┬──────────┘
                       ↓
            ┌─────────────────────┐
            │  End-to-End Smoke   │ ⚠️  CHECKPOINT: scan→parse→KB→generate
            └───────────┬─────────┘
                        ↓
                    [PARALLEL]

PHASE 3 (Medium Parallelization - Intelligence):
            ┌─────────────────────┐
            │ WS-A: Indices       │ (confidence, call graph, reverse-deps)
            └──────────┬──────────┘
            ┌─────────────────────┐
            │ WS-D: Reasoning     │ (intent lifting, ambiguity)
            └──────────┬──────────┘
            ┌─────────────────────┐
            │ WS-E: Linking       │ (two-phase validation)
            └──────────┬──────────┘
            ┌─────────────────────┐
            │ WS-H: Phase Coord   │ (proper ordering, parallelization)
            └──────────┬──────────┘
                       ↓
                   [PARALLEL]

PHASE 4 (Medium Parallelization - Grounding):
            ┌─────────────────────┐
            │ WS-F: Validator     │ (grounding rules, retries)
            └──────────┬──────────┘
            ┌─────────────────────┐
            │ WS-F: Integration   │ (wire LLM into pipeline)
            └──────────┬──────────┘
            ┌─────────────────────┐
            │ WS-H: Gates         │ (Coverage/Grounding/Link/Determinism)
            └──────────┬──────────┘
                       ↓
            ┌─────────────────────┐
            │ M0 + M1 Gates Pass  │ ⚠️  CHECKPOINT
            └───────────┬─────────┘
                        ↓

PHASE 5 (Sequential - Finalization):
            ┌─────────────────────┐
            │ WS-G: Finalization  │ (snapshot, answers, re-analysis)
            └───────────┬─────────┘
                        ↓
            ┌─────────────────────┐
            │   M2 Gates Pass     │ ⚠️  CHECKPOINT
            └───────────┬─────────┘
                        ↓
                    [PARALLEL]

PHASE 6 (High Parallelization - Production):
            ┌───────┬───────┬───────┬───────┬───────┐
            │Express│ React │ Redux │GraphQL│ HTTP  │ (5 independent agents)
            └───┬───┴───┬───┴───┬───┴───┬───┴───┬───┘
            ┌─────────────────────┐
            │ WS-H: Performance   │ (worker pools, telemetry)
            └──────────┬──────────┘
            ┌─────────────────────┐
            │   Monorepo UX       │
            └──────────┬──────────┘
                       ↓
            ┌─────────────────────┐
            │   M3 Gates Pass     │ ⚠️  FINAL CHECKPOINT
            └─────────────────────┘
```

**Critical path:** WS-H minimal → WS-A schema → **KB API Freeze** → Phase 2 parallel work → End-to-end smoke → Phase 3+ → M0/M1/M2/M3 gates.

---

## 4.2) Parallelization Summary for Agents

**This section provides a quick reference for which work can be done in parallel at each phase.**

### Phase 1: Foundation (SEQUENTIAL - No Parallelization)
**Must be done in order:**
1. Set up test infrastructure (CI, test framework, coverage, golden-test harness)
2. WS-H: Minimal CLI harness
3. WS-A: KB schema (Entity, Relation, Fact, factSet, anchors, QIDs)
4. WS-A: KB API contract definition and tests

**🚨 CRITICAL CHECKPOINT:** KB API Freeze
- All KB interfaces tested (≥80% coverage)
- API contract documented and frozen
- **Nothing in Phase 2 can start until this checkpoint is reached**

---

### Phase 2: I/O & Templates (HIGH PARALLELIZATION - 4 agents)
**After KB API Freeze, these 4 workstreams can proceed in parallel:**

| Agent | Workstream | Deliverables | Dependencies |
|---|---|---|---|
| **Agent 1** | WS-B Scanner & Loader | FileIndex, PackageMap, monorepo detection, ignore rules | KB API (read-only) |
| **Agent 2** | WS-C Parser & Patterns | AST parsing, fact extraction, dynamic patterns, aux readers | KB API (write facts) |
| **Agent 3** | WS-E Generator (templates) | Markdown rendering, anchors, QIDs, style kit | KB API (read facts) |
| **Agent 4** | WS-F LLM Gateway (skeleton) | Provider adapters, caching, budget tracking | KB API (optional; can work independently) |

**Why these can be parallel:**
- Scanner produces FileIndex consumed by Parser (but doesn't need Parser code)
- Parser writes to KB; Generator reads from KB (independent code paths)
- LLM Gateway skeleton doesn't need KB yet (just infrastructure)
- All share KB API contract but don't depend on each other's implementations

**🚨 CHECKPOINT:** End-to-End Smoke Test
- Scanner → Parser → KB → Generator produces template specs
- All Phase 2 unit tests passing (≥80% coverage)

---

### Phase 3: Intelligence (MEDIUM PARALLELIZATION - 4 workstreams)
**These can proceed in parallel (with some internal dependencies):**

| Workstream | Deliverables | Can Start When | Internal Dependencies |
|---|---|---|---|
| **WS-A: Indices** | Confidence scoring, call/import graphs, reverse-deps | Smoke test passes | Needs facts from Parser (Phase 2) |
| **WS-D: Reasoning** | Intent lifting, pattern matching, iterative resolution | Smoke test passes | Needs KB indices (WS-A) |
| **WS-E: Linking** | Two-phase cross-link validation | Smoke test passes | Needs anchors from Generator (Phase 2) |
| **WS-H: Phase Coord** | Proper phase ordering, basic parallelization, progress | Smoke test passes | Needs all Phase 2 components integrated |

**Note:** WS-D depends on WS-A indices, so WS-A should start first. WS-E linking and WS-H coordination can proceed independently.

**Parallelization:** 2-3 agents (WS-A first, then WS-D; WS-E and WS-H in parallel with WS-D)

---

### Phase 4: Grounding & Polish (MEDIUM PARALLELIZATION - 3 workstreams)
**These can proceed in parallel (with some dependencies):**

| Workstream | Deliverables | Can Start When | Dependencies |
|---|---|---|---|
| **WS-F: Validator** | Grounding rules, lexicon, retry logic, template fallback | Phase 3 reasoning complete | Needs factSet attribution from WS-A |
| **WS-F: Integration** | Wire LLM into Spec Generator pipeline | Validator + Generator ready | Needs WS-F Validator + WS-E complete |
| **WS-H: Gates** | Enforce Coverage/Link/Grounding/Determinism gates | All M0 components ready | Needs all WS-A/B/C/D/E |

**Parallelization:** 2 agents (Validator and Gates in parallel; Integration follows Validator)

**🚨 CHECKPOINT:** M0 + M1 Gates Pass
- All quality gates enforced and passing
- Template baseline works (M0)
- LLM polish works with grounding (M1)

---

### Phase 5: Finalization (SEQUENTIAL - No Parallelization)
**Must be done sequentially:**
1. WS-G: Snapshot/Merkle tree generation
2. WS-G: answers.md parsing
3. WS-G: Impact scoping (reverse-deps with caps)
4. WS-G: Selective re-analysis and patching

**Why sequential:** Each step depends on the previous step's output.

**🚨 CHECKPOINT:** M2 Gates Pass
- Finalization mode works correctly
- Only impacted sections re-generated

---

### Phase 6: Production Hardening (HIGH PARALLELIZATION - 5-7 agents)
**Framework patterns (5 independent agents):**

| Agent | Pattern | Deliverables |
|---|---|---|
| **Agent 1** | Express | Routes, middleware, error handling, config |
| **Agent 2** | React | Components, hooks, context, side effects |
| **Agent 3** | Redux | Actions, reducers, selectors, middleware |
| **Agent 4** | GraphQL | Schema, resolvers, mutations, subscriptions |
| **Agent 5** | HTTP Clients | Axios/Fetch with error handling, retries |

**Additional parallel work (separate agents):**
- **Agent 6:** WS-H Performance (worker pools, memory optimization, telemetry)
- **Agent 7:** Monorepo UX polish + documentation

**Why these can be parallel:**
- Each framework pattern is independent (no shared code)
- Performance work touches orchestrator (different codebase area)
- Documentation/UX is independent of pattern logic

**🚨 CHECKPOINT:** M3 Gates Pass
- >90% pattern accuracy for Tier 0 frameworks
- Performance targets met
- All documentation complete

---

### Summary: Maximum Parallelization by Phase

| Phase | Max Agents | What They Work On | Bottleneck |
|---|---:|---|---|
| **Phase 1** | 1-2 | Sequential: Test infra → CLI → KB schema | KB API Freeze |
| **Phase 2** | 4 | Scanner, Parser, Generator, LLM skeleton | End-to-end smoke |
| **Phase 3** | 2-3 | Indices+Reasoning, Linking, Phase coordination | M0 components ready |
| **Phase 4** | 2 | Validator+Gates, Integration | M1 complete |
| **Phase 5** | 1 | Finalization (sequential by nature) | M2 complete |
| **Phase 6** | 5-7 | 5 framework patterns + perf + docs | M3 gates |

**Total parallelization efficiency:** After the initial KB API Freeze bottleneck, 4 agents can work simultaneously in Phase 2. Phase 6 has the highest parallelization (7 agents). Overall, the plan supports **4-7 concurrent agents** during peak phases.

---

## 5) Milestone Breakdown (Deliverables & Acceptance)

### M0 — Static Baseline (templates only)
**Deliverables**
- Scanner/Loader with FileIndex, PackageMap; ignore precedence & monorepo detection.
- Parser & Fact Extractor (TS compiler API/ts‑morph primary; Babel fallback); dynamic pattern detector v1.
- KB with entities, relations, factSets, confidence scoring (H/M/L), indices (call, import, reverse‑deps).
- Spec Generator with style kit, root + per‑dir specs, stable anchors/QIDs, two‑phase link validation.
- CLI: `ceps <project-root>`, `--detail`, `--focus public-api`, `--max-workers`, `--deterministic`.
- Integration fixtures: tiny Express/React/Redux/GraphQL projects; small monorepo fixture; golden‑file tests.

**Acceptance gates**
- **Coverage Gate:** 100% of exported/public surfaces documented to **Spec‑Ready** or carry QIDs.
- **Link Gate:** No broken anchors (validator pass).
- **Determinism Gate:** with `--deterministic`, identical inputs → identical outputs (mandatory).
- **Monorepo Gate:** root spec present; package specs linked correctly (tested on small monorepo fixture).
- **Test Coverage Gate:** ≥80% branch coverage for WS-A/B/C/D/E; all tests passing; TDD workflow followed.

### M1 — LLM & Grounding
**Deliverables**
- LLM Gateway (provider adapters, caching, budgeting) and lexicon for canonical terms.
  - **Primary provider:** Anthropic Claude (Sonnet).
  - **Also supported:** OpenAI, Azure OpenAI, local models.
- Grounding Validator enforcing: **no new entities/relations**, numeric/enum safety, scope adherence, terminology normalization.
- Retry policy (2 attempts with stricter constraints) and template fallback; deterministic mode.
- CLI: `--llm on|off` (default on), `--llm-provider/model`, `--llm-budget`, `--no-llm-cache`.
- Adversarial tests for hallucination attempts, synonym drift, numeric/enum violations.

**Acceptance gates**
- **Grounding Gate:** 100% chunks pass validator or use template fallback; no chunk without factSetId.
- **Cost Gate:** runs within configured token budget on reference repos.
- **Readability Gate:** LLM‑on improves compression & consistency vs template baseline in sample review.
- **Adversarial Gate:** hallucination attempts rejected; validator catches ungrounded claims.
- **Test Coverage Gate:** ≥80% branch coverage for WS-F (LLM Gateway); all grounding validator tests passing; adversarial test suite complete.

### M2 — Finalization
**Deliverables**
- Snapshot/Merkle (`.ceps/snapshot.json`), answers ingestion (`answers.md`), reverse‑deps scoping with caps (default hops=3, nodes=250).  
- Selective re‑analysis pipeline; Finalization Summary patches; `--dry-run`, `--reconcile` flags.

**Acceptance gates**
- **Scope Gate:** only impacted sections re‑generated (scoped diffs).
- **Finalization Gate:** answered QIDs removed; summaries present; gates from M0/M1 still pass.
- **Test Coverage Gate:** ≥80% branch coverage for WS-G (Finalization Engine); snapshot/impact scoping tests passing.

### M3 — Pattern Expansion & Polish
**Deliverables**
- **Priority v1 pattern set** (high parallelization opportunity):
  - **Tier 0 (critical):** Express, React, Redux, GraphQL, Axios/Fetch
  - **Tier 1 (important):** Next.js (routing/data fetching), Prisma
  - **Tier 2 (if time permits):** NestJS, Koa, Node streams/events, TypeORM, Sequelize
- Targeted accuracy tests with curated fixtures per framework.
- Monorepo UX: improved root spec, package indexing, performance tuning.
- Documentation polish: CLI guide, style guide (`ceps-style-1.0`), contributor guide for pattern library.

**Acceptance gates**
- **Pattern Accuracy Gate:** >90% precision/recall on curated fixtures for Tier 0 patterns.
- **Performance Gate:** P95 run time within agreed budget on large sample repo (define threshold based on empirical testing).
- **Documentation Gate:** All user-facing docs complete; pattern library extension guide available.
- **Test Coverage Gate:** ≥80% branch coverage maintained across all workstreams; pattern-specific tests for each Tier 0 framework.

---

## 6) Work Breakdown Structure (WBS)

### WS‑A Knowledge Base (CTS‑01)
- Data model & IDs (entities, factSets, chunks, relations, anchors, QIDs).
- Confidence scoring engine & calibration fixtures.
- Indices: byPath/byKind/exported, call/import graphs, reverse‑deps.
- API: insert/update/query, batch ops, snapshot of maps for generator.

**Unit tests (TDD required):**
- Entity/Relation/Fact model validation and ID generation (anchors, QIDs)
- Confidence scoring algorithm with edge cases (conflicts, dynamic patterns, type coverage)
- Index operations (add, query, update, reverse-deps traversal)
- API contract tests for all insert/update/query operations
- **Target:** ≥80% branch coverage

### WS‑B Scanner & Loader (CTS‑05a)
- Ignore precedence, VCS ignore option, overrides.
- Monorepo detection & PackageMap.
- FileIndex build (deterministic order), classification (code/test/config/contract).

**Unit tests (TDD required):**
- Ignore rule precedence (node_modules, .gitignore, explicit overrides, minified files)
- Monorepo detection heuristics (workspaces, Lerna, Nx, multiple package.json)
- File classification accuracy (code vs test vs config vs contract)
- Deterministic ordering (same input → same FileIndex order)
- **Target:** ≥80% branch coverage

### WS‑C Static Analysis & Patterns (CTS‑05)
- Parser pipeline (TS compiler API/ts‑morph; Babel fallback).
- Fact extraction, side‑effect & error sites, config/env reads.
- Dynamic pattern detector (eval/proxy/reflection/dynamic import).
- Aux readers: tests/config/OpenAPI/SQL → normalized factSets.

**Unit tests (TDD required):**
- Parser for TS/JS/JSX/TSX edge cases; Babel fallback triggers correctly
- Fact extraction accuracy (exports, imports, calls, types, JSDoc, side-effects)
- Dynamic pattern detection (eval, Proxy, Reflect, bracket access, dynamic imports)
- Aux reader parsing (test assertions, config files, OpenAPI, SQL migrations)
- AST pruning (memory efficiency; facts preserved after pruning)
- **Target:** ≥80% branch coverage

### WS‑D Reasoning & Ambiguity (CTS‑06)
- Rule/pattern library for intent lifting.
- Iterative resolver & triage; Critical tagging for exported/flow‑critical items.
- Convergence checks; max iterations; Open Question emission.

**Unit tests (TDD required):**
- Framework pattern matching (Express routes, React hooks, Redux actions, GraphQL resolvers, HTTP clients)
- Intent lifting rules (map code facts → behavior descriptions)
- Iterative resolution (confidence promotion across iterations; convergence detection)
- Critical vs non-critical item classification
- Open Question generation (QID stability, formatting, actionability)
- **Target:** ≥80% branch coverage

### WS‑E Spec Generator (CTS‑03)
- Root & per‑dir renderers; style kit; Open Question formatting.
- Anchor/QID allocation; two‑phase linking; link validator.
- Deterministic text linter when LLM off.

**Unit tests (TDD required):**
- Markdown rendering (root spec, per-directory spec, file sections, element sections)
- Anchor generation (slug + hash; stability; collision handling)
- QID generation (deterministic; collision handling)
- Two-phase cross-link validation (forward references resolved correctly; broken links detected)
- Style kit enforcement (voice, tense, lexicon, format)
- Deterministic output with `--deterministic` flag (identical input → identical Markdown)
- **Target:** ≥80% branch coverage

### WS‑F LLM Gateway & Grounding (CTS‑02)
- Provider adapters; caching/budgeting; deterministic mode.
- Validator rules; lexicon; retry templates; template fallback.

**Unit tests (TDD required):**
- Provider adapters (Anthropic/OpenAI/Azure/local; fallback on failure)
- Caching (cache key generation; cache hit/miss; invalidation)
- Budget tracking (token counting; guard triggers correctly)
- Grounding Validator rules:
  - No new entities/relations (reject hallucinated facts)
  - Numeric/enum safety (reject out-of-range values)
  - Lexicon adherence (reject synonyms outside canonical terms)
  - Scope adherence (reject claims outside factSet scope)
- Retry logic (2 attempts with stricter constraints; then template fallback)
- Deterministic mode (reproducible outputs with fixed seed/temperature)
- **Target:** ≥80% branch coverage

### WS‑G Finalization Engine (CTS‑04)
- Snapshot build/verify; answers ingestion; impact scoping (caps).
- Selective re‑analysis & patching; Finalization Summaries.

**Unit tests (TDD required):**
- Snapshot/Merkle tree generation (deterministic hashing; collision detection)
- Snapshot verification (detect changed files; --reconcile mode)
- answers.md parsing (QID→answer mapping; validation; error handling)
- Impact scoping (reverse-deps traversal; caps at hops=3, nodes=250; configurable)
- Selective re-analysis (only impacted sections re-generated; unchanged sections untouched)
- Finalization Summary generation (added to correct files; format validation)
- QID removal (resolved QIDs deleted; unresolved QIDs preserved)
- **Target:** ≥80% branch coverage

### WS‑H Orchestrator & Lifecycle (CTS‑07)
**Evolution path (clarified):**
- **Phase 1 (M0 start):** Minimal CLI harness—just enough to invoke components sequentially for integration testing. Hardcoded phase order. Basic error handling.
- **Phase 3 (M0 mid):** Phase coordination with proper ordering. Basic parallelization (e.g., parse files in parallel). Progress tracking/logging.
- **Phase 4 (M0 end):** Gate enforcement (Coverage/Link/Determinism). Exit codes. Error policy (continue vs. fail-fast).
- **Phase 6 (M3):** Production-grade orchestration—worker pools, backpressure, memory optimization, telemetry/diagnostics.

**Unit tests (TDD required):**
- CLI argument parsing (flags, defaults, validation, help text)
- Phase execution order (correct sequence; dependencies respected)
- Parallelization (file parsing in parallel; no race conditions)
- Gate enforcement:
  - Coverage Gate (100% exports documented or have QIDs; fail if not met)
  - Link Gate (no broken anchors; fail if invalid cross-links)
  - Grounding Gate (all chunks have factSetId; fail if missing)
  - Determinism Gate (identical inputs → identical outputs with `--deterministic`)
- Exit codes (0=success, 1=error, 2=gate failure, 3=snapshot mismatch)
- Error policy (continue vs fail-fast; partial progress preserved)
- Progress tracking/logging (accurate phase transitions; no missing events)
- **Target:** ≥80% branch coverage

---

## 7) Quality Gates, Reviews & Demos

- **Gate A — Coverage** (M0+): Public exports documented or QIDs present.  
- **Gate B — Linking** (M0+): Cross‑file anchors resolved; no broken links.  
- **Gate C — Grounding** (M1+): All chunks tied to factSets; validator pass or template fallback.  
- **Gate D — Finalization** (M2+): Resolved QIDs removed; scoped diffs only.  
- **Gate E — Determinism** (on demand): Stable output with `--deterministic`.

**Reviews & demos:**  
- End of each milestone: live run on sample repos; review of run summary and selected `spec.md` files.

---

## 8) Tooling, Environments & CI/CD

**Development environment:**
- **Runtime:** Node.js ≥ 18 (recommend 20 LTS)
- **Language:** TypeScript 5.x
- **Package manager:** `pnpm` (preferred) or `npm`
- **Build:** `tsc` + `tsup`/`esbuild`
- **Lint/format:** ESLint + Prettier
- **Tests:** Vitest (preferred) or Jest
- **Coverage:** nyc (Istanbul) or c8 (V8 native coverage)
- **CI:** GitHub Actions (or equivalent) with matrix (Node 18/20)
- **Artifacts:** npm package + changelog; optional standalone binary later

**Test infrastructure setup (Phase 1, before any code):**
1. Initialize repo with `package.json`, `tsconfig.json`, ESLint, Prettier
2. Configure test framework (Vitest/Jest) with TypeScript support
3. Configure coverage tool (nyc/c8) with 80% threshold enforcement
4. Set up CI pipeline (lint, typecheck, test, coverage)
5. Create golden-test harness (compare generated Markdown against checked-in fixtures)
6. Add integration test fixtures directory structure

**CI pipeline (runs on every commit):**
```
1. Install dependencies (pnpm install)
2. Lint (ESLint)
3. Type check (tsc --noEmit)
4. Unit tests (vitest/jest) ← blocks merge on failure
5. Coverage check (≥80% branch) ← blocks merge on drop
6. Integration tests (fixtures)
7. Golden tests (deterministic mode; diff check) ← M0+
8. Grounding tests (LLM validator; adversarial) ← M1+
9. Finalize tests (snapshot, patching) ← M2+
```

**Merge policy:**
- All CI stages must pass
- Coverage must be ≥80% for touched workstreams
- No failing tests allowed
- Golden test diffs must be reviewed and approved if intentional

---

## 9) Testing Plan (TDD-First Approach)

### 9.1 Test-Driven Development (TDD) Workflow
All agents must follow TDD discipline:
1. **Red:** Write a failing unit test for the next piece of functionality
2. **Green:** Write minimal code to make the test pass
3. **Refactor:** Clean up code while keeping tests green
4. **Commit:** Check in test + implementation together
5. **Repeat:** Move to next functionality

**Benefits for this project:**
- Validates KB API contract before consumers depend on it
- Ensures grounding validator catches all adversarial cases
- Proves determinism with repeatable tests
- Documents expected behavior for complex logic (confidence scoring, pattern matching)

### 9.2 Unit Tests (Required for All Workstreams)
- **One test suite per CTS** (WS-A through WS-H)
- **Coverage target:** ≥80% branch coverage for core logic:
  - WS-A: confidence scoring, KB operations, indices
  - WS-B: ignore precedence, monorepo detection, classification
  - WS-C: parsing, fact extraction, pattern detection
  - WS-D: intent lifting, pattern matching, iterative resolution
  - WS-E: Markdown rendering, anchor/QID generation, link validation
  - WS-F: grounding validator, provider adapters, caching
  - WS-G: snapshot, impact scoping, selective re-analysis
  - WS-H: gate enforcement, phase ordering, CLI
- **Run on every commit** in CI pipeline
- **Failing tests block merge**

### 9.3 Integration Tests (End-to-End)
- **Tiny fixture repos** (pinned commits for reproducibility):
  - Express: REST API with middleware, error handling, config
  - React: components, hooks, context, side effects
  - Redux: actions, reducers, selectors, middleware
  - GraphQL: schema, resolvers, mutations, subscriptions
  - HTTP clients: Axios/Fetch with error handling, retries
  - Monorepo: 2-3 packages with cross-dependencies
- **Smoke test:** scan → parse → KB → generate template specs (validates M0 checkpoint)
- **Full pipeline:** includes LLM polish, grounding validation, finalization (validates M1/M2)

### 9.4 Golden Tests (Determinism Validation)
- **LLM-off + `--deterministic`:** Compare generated Markdown byte-for-byte
- **Fixtures:** Run on all integration fixtures
- **Failure = regression:** Any diff in deterministic mode requires investigation
- **Version control golden files:** Check in expected outputs; CI diffs against them

### 9.5 LLM-On Tests
- **Record/replay strategy:** Record LLM responses for repeatable tests (optional)
- **Structure validation:** Assert spec structure (sections, anchors, QIDs) without checking prose
- **Grounding validation:** Verify all chunks have factSetId; no hallucinated entities
- **Cost budgets:** Assert token usage within limits

### 9.6 Adversarial Tests (Security & Correctness)
- **Grounding validator adversarial suite:**
  - Hallucination attempts (inject fake entities)
  - Numeric violations (out-of-range values, type mismatches)
  - Enum safety (invalid enum values)
  - Synonym drift (terms outside lexicon)
  - Scope violations (claims outside factSet scope)
- **Dynamic pattern edge cases:**
  - eval/Function constructor
  - Proxy/Reflect with unknown targets
  - Deeply nested dynamic imports
  - Bracket access on untyped objects
- **Parser edge cases:**
  - Malformed syntax (should fall back to Babel)
  - Massive files (memory limits)
  - Mixed TS/JS/JSX/TSX in same project

### 9.7 CI/CD Test Pipeline
```
On every commit:
1. Lint (ESLint)
2. Type check (tsc --noEmit)
3. Unit tests (all workstreams; ≥80% coverage enforced)
4. Integration tests (fixtures)
5. Golden tests (deterministic mode; diff check)
6. Grounding tests (LLM validator; adversarial suite)
7. Finalize tests (snapshot, impact scoping, patching)

Failure at any stage blocks merge.
```

### 9.8 Coverage Enforcement
- **Tool:** nyc (Istanbul) or c8 (V8 coverage)
- **Threshold:** ≥80% branch coverage for WS-A/B/C/D/E/F/G/H
- **CI enforcement:** Coverage drop blocks merge
- **Exemptions:** Integration glue, CLI help text, logging (minimal coverage OK)

---

## 10) Agent Assignment Strategy

Since implementation will be performed by AI agents, workstream assignments should follow these principles:

**Phase 1 (Foundation):**
- Single agent for WS-H minimal orchestrator (simple CLI harness)
- Single agent for WS-A KB schema & API contract (critical path; must complete before others start)

**Phase 2 (High Parallelization):**
- Agent 1: WS-B Scanner & Loader
- Agent 2: WS-C Parser & Pattern Detector
- Agent 3: WS-E Spec Generator (templates)
- Agent 4: WS-F LLM Gateway skeleton (optional; can start early)

**Phase 3 onwards:**
- Agents can be reassigned or time-slice across remaining workstreams
- Priority: complete M0 gates first (WS-A indices/scoring, WS-D reasoning, WS-E linking, WS-H coordination)

**Pattern expansion (M3):**
- Each Tier 0 framework pattern can be assigned to an independent agent (5 patterns = 5 parallel agents)

**Critical path management:**
- KB API freeze blocks all Phase 2 work—prioritize this checkpoint
- End-to-end smoke test checkpoint blocks Phase 3 intelligence work

---

## 11) Risks & Mitigations (top)

- **Dynamic JS evades static analysis** → pattern detector + Open Questions; targeted heuristics; optional probes later.  
- **LLM cost/latency** → gateway cache, budget guard, selective polishing, template fallback.  
- **Grounding validator too strict/lenient** → lexicon tuning, curated test corpora, retry narrowing.  
- **Monorepo complexity** → package‑aware output; performance tuning; package indexing.  
- **Anchor/QID drift** → content‑hash IDs; two‑phase linking; validator.  
- **Expectation drift (synchronizer)** → enforce snapshot lock; `--reconcile` clearly labeled best‑effort.

---

## 12) Success Metrics

- **Spec Coverage:** ≥99% of public exports have Spec‑Ready sections or QIDs on sample repos.  
- **Grounded Output:** 0 paragraphs without factSetId; zero broken links.  
- **Determinism:** identical output with `--deterministic` on reruns.  
- **Finalization Effectiveness:** ≥90% of answered QIDs resolved without unrelated diffs.  
- **Performance:** P95 run time within agreed budget on benchmark repo.

---

## 13) Dependencies & Externalities

**Required for M1+:**
- **Anthropic API access** (primary LLM provider; Claude Sonnet recommended)
- API key in environment: `CEPS_LLM_API_KEY` or `ANTHROPIC_API_KEY`

**Optional for M1+:**
- OpenAI API access (secondary provider for testing)
- Azure OpenAI endpoint configuration
- Local LLM setup (Ollama, etc.)

**Development environment:**
- Node.js ≥ 18 (recommend 20 LTS)
- TypeScript 5.x toolchain
- pnpm or npm

**Test fixtures needed:**
- Tiny Express app (REST API with middleware, error handling)
- Tiny React app (components, hooks, context)
- Tiny Redux app (actions, reducers, selectors)
- Tiny GraphQL server (schema, resolvers)
- HTTP client examples (Axios, Fetch)
- Small monorepo (2-3 packages with cross-dependencies)
- Sample repos can be OSS or synthetic; must have pinned commits for reproducibility

---

## 14) Handover & Documentation

- Developer docs for CLI, flags, and style guide (`ceps-style-1.0`).  
- Contributor guide for pattern library and lexicon updates.  
- Operational notes for `--deterministic`, budgets, and finalize mode.

---

## 15) Next Steps (Implementation Kickoff)

**Prerequisites (before agent execution):**
1. Finalize SADS v1.1 and CTS set (including CTS‑07 & CTS‑05a).
2. Set up Anthropic API key for M1 LLM work.
3. Identify or create test fixture repos (Express, React, Redux, GraphQL, HTTP clients, monorepo).

**Phase 1 kickoff (Foundation):**
1. **Set up test infrastructure:** CI pipeline (lint, typecheck, test, coverage), test framework (Vitest/Jest), coverage tool (nyc/c8), golden-test harness.
2. **Agent 1:** Implement WS-H minimal orchestrator (bare CLI harness) **with TDD** (write CLI arg parsing tests first).
3. **Agent 2:** Define WS-A KB schema **with TDD** (write model validation tests, then implement models).
4. **Checkpoint:** KB API contract documented, frozen, and **fully tested** (≥80% coverage).

**Phase 2 kickoff (Parallel):**
5. Launch 4 agents in parallel for WS-B/C/E/F (after KB API freeze). **All agents must use TDD.**
6. **Checkpoint:** End-to-end smoke test passing (scan → parse → generate template specs). Unit tests for all Phase 2 workstreams at ≥80% coverage.

**Subsequent phases:**
7. Follow build order in §4; validate gates at each milestone checkpoint.
8. **All development uses TDD workflow:** Red → Green → Refactor → Commit.
9. Draft `answers.md` example format during M0 for M2 preparation.
10. Golden-test harness runs on every commit in CI for determinism validation.

**Phase completion:**
11. **At the end of EVERY phase:** Follow the [Phase Completion Checklist](./PHASE_COMPLETION_CHECKLIST.md) to ensure consistent documentation updates across all phases.
    - Update IMPLEMENTATION_PLAN.md (status + completion summary)
    - Update AGENTS.md (move phase to completed section)
    - Update IMPLEMENTATION_PLAN_PHASE{N}.md (add final results)
    - Update README.md (add phase section, update next steps)
    - Create PHASE{N}_COMPLETION_SUMMARY.md
    - Create PHASE{N}_OVERALL_FEEDBACK.md (comprehensive review)
    - See checklist for detailed step-by-step instructions

---

---

## 16) Summary: Test-Driven Development as Core Discipline

**ceps will be built with TDD as a foundational practice, not an afterthought.**

**Why TDD matters for ceps:**
1. **Correctness:** Confidence scoring, grounding validation, and pattern matching are complex—tests document expected behavior and catch regressions.
2. **Contract validation:** KB API freeze only happens when the contract is **tested and proven** to work.
3. **Determinism proof:** Golden tests validate that `--deterministic` actually produces identical outputs.
4. **Grounding security:** Adversarial tests ensure the validator catches hallucinations before they reach specs.
5. **Parallel work enablement:** Agents can work independently if interfaces are tested upfront (no integration surprises).

**Enforcement:**
- ≥80% branch coverage required for all workstreams (M0/M1/M2/M3 gates)
- CI blocks merge on test failures or coverage drops
- Every commit must include tests for new functionality
- Golden files version-controlled for determinism validation

**Agent instruction:**
Every agent implementing a workstream must start by writing failing tests for the API contract, then implement to make tests pass. Refactor only when tests are green. This is not optional—it's how ceps will be built.

---

*This HLIP reflects the decisions and clarifications captured in the SADS and CTS responses and is intended to feed directly into agent-driven implementation with Test-Driven Development as the core discipline.*
