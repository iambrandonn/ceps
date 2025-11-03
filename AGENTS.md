# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**ceps** (Codebase to Specification) is a one-time-use tool that reverse-engineers JavaScript/TypeScript codebases into human-readable Markdown specifications. Its purpose is to bootstrap a spec-driven development workflow by extracting behavioral intent from existing code.

**Current Status:** Phase 2 (I/O & Templates) complete. Full end-to-end pipeline working. 277 tests passing with 94.3% coverage. Ready for Phase 3 (Intelligence).

---

## Current Phase

**Phase 3 — Intelligence (Ready to Start)**

- **Status:** Phase 2 complete, end-to-end pipeline working, ready for intelligence layer
- **Depends on:** Phase 2 (✅ Complete)
- **Approach:** TDD-first, 2-3 parallel agents, ~3-4 agent-days per agent
- **Agents:**
  - **Agent 1:** KB Indices & Confidence Scoring (CTS-01)
  - **Agent 2:** Reasoning & Ambiguity Resolver (CTS-06)
  - **Agent 3:** Cross-link Validation & Phase Coordination (CTS-03, CTS-07)
- **Deliverables:**
  - Call/import graphs and reverse-deps indices
  - Confidence scoring algorithm (upgrade from stub)
  - Framework pattern matching (Express, React basics)
  - Intent lifting and iterative resolution
  - Two-phase cross-link validation
  - Open Question (QID) generation
- **Critical Checkpoint:** All agents depend on Phase 2 pipeline (Scanner → Parser → KB → Generator)

---

## Key Design Documents

### Implementation Plans
1. **IMPLEMENTATION_PLAN.md** — 6-phase roadmap with parallelization strategy (4-7 concurrent agents in peak phases)
2. **IMPLEMENTATION_PLAN_PHASE1.md v1.2** — Detailed TDD plan for KB, CLI, and test infrastructure (✅ Complete)

### Component Technical Specifications (CTS)

**All 7 CTS documents complete:**

3. **CTS-01_KnowledgeBase.md** — Entity schema, factSet model, confidence scoring, IDs (anchors/QIDs), storage & indexing, APIs
4. **CTS-02_LLM_Gateway_and_Grounding.md** — Provider adapters, prompts, caching/budgeting, chunk-level grounding, retry/fallback, determinism
5. **CTS-03_Spec_Generator.md** — Root & per-directory generation, anchors/QIDs, cross-linking, style kit, validation
6. **CTS-04_Finalization_Engine.md** — Answers ingestion, snapshot check, impact scoping, selective re-reasoning, patching, summaries
7. **CTS-05_Static_Analysis_and_Pattern_Detection.md** — Scanner, parser/fact extraction, dynamic-pattern detection, auxiliary readers, performance & errors
8. **CTS-06_Reasoning_and_Ambiguity_Resolver.md** — Rules/patterns, iterative lifting, ambiguity queue, confidence upgrades, LLM fusion
9. **CTS-07_Orchestrator_and_Lifecycle.md** — Lifecycle coordination, phases, concurrency, gating, progress, errors, finalization

### Architecture & Design
10. **CTS-Responses.md** — Answers to all SADS-FEEDBACK architectural questions
11. **SADS.md** (System Architecture & Design Specification) — The authoritative architectural blueprint defining:
   - 11 core components and their responsibilities
   - Execution lifecycle and data flows
   - Output format specifications
   - Quality gates and acceptance criteria

12. **PRD2.md** — Product requirements defining objectives, scope, and success criteria

---

## Core Architecture (from SADS.md)

### Components
1. **Codebase Scanner & Loader** (CTS-05a) — File discovery and indexing
2. **Static Analysis Engine** (CTS-05) — AST parsing via TypeScript compiler API / ts-morph
3. **Dynamic Pattern Detector** (CTS-05) — Identifies patterns that reduce static resolvability
4. **Auxiliary Readers** (CTS-05) — Extracts facts from tests, configs, contracts
5. **Knowledge Base (KB)** (CTS-01) — Central memory for entities, facts, relationships, confidence scores
6. **Reasoning & Inference Engine** (CTS-06) — Framework-aware pattern matching (Express, React, NestJS, etc.)
7. **LLM Gateway** (CTS-02) — Provider-agnostic integration for summarization and synthesis
8. **Ambiguity Resolver** (CTS-06) — Iterative confidence promotion or Open Question generation
9. **Specification Generator** (CTS-03) — Markdown output with stable anchors and cross-links
10. **Finalization Engine** (CTS-04) — Answer-guided re-analysis and spec patching
11. **Orchestrator** (CTS-07) — Phase coordination and parallelization

### Execution Flow
```
Scan → Parse/Extract Facts → Draft (templates) → LLM Polish (grounded)
  → Ambiguity Queue → Iterative Resolution
  → Generate Specs (root + directories, in-place)
  → (Optional) Finalization: ingest answers → scope impacts → re-reason → patch
```

---

## Key Design Principles

1. **Behavior-first:** Document intent and outcomes, not line-by-line algorithms
2. **Iterative comprehension:** Multiple reasoning cycles to maximize confidence
3. **Minimal human interruption:** Batch questions; resolve automatically when possible
4. **LLM-assisted, not LLM-dependent:** Deterministic templates + optional LLM polish
5. **Grounding:** Every behavior chunk must be attributable to factSets (SADS.md §8)
6. **Test-Driven Development (TDD):** All implementation follows Red-Green-Refactor workflow

---

## Output Specification

### Generated Files
- **Root spec.md** — System overview, architecture map, conventions, index (always generated)
- **Per-directory spec.md** — In-place documentation for each source directory

### Confidence Bands (SADS.md §4.2)
- **High (≥70):** Assertive prose
- **Medium (40-69):** Assertive prose with optional *Assumptions* bullet
- **Low (<40):** Emit as **Open Question** with QID (never assert)

### Quality Gates (SADS.md §10)
1. **Coverage Gate:** 100% of exported/public surfaces documented or carry QIDs
2. **Grounding Gate:** Every paragraph/bullet has a factSetId; no broken cross-links
3. **Confidence Gate:** Low confidence → Open Question; Medium/High → assertive prose
4. **Monorepo Gate:** Root overview present; package specs linked correctly
5. **Finalization Gate:** All answered QIDs removed; summaries added

---

## Planned CLI Interface (SADS.md §6)

```bash
# Default: in-place generation
ceps <project-root>

# Finalization (answer-guided, impact-scoped)
ceps finalize --answers ./answers.md

# Options
--detail spec-ready|exhaustive|minimal   # Detail level (default: spec-ready)
--llm on|off                              # LLM usage (default: on)
--llm-provider openai|anthropic|azure|local
--llm-model <name>
--llm-budget <tokens>
--deterministic                           # Lock paraphrase variance
--focus public-api                        # Scope valve for large repos
--max-workers <n>
--max-iterations <n>
--reconcile                               # Allow changed snapshot during finalize
--dry-run                                 # Preview finalization impacts
```

---

## Technology Decisions

- **Node.js:** ≥ 18 LTS (recommend 20)
- **TypeScript:** 5.x for parsing (JS/TS/JSX/TSX)
- **Package manager:** pnpm (preferred) or npm
- **Test framework:** Vitest (preferred) or Jest
- **Primary Parser:** TypeScript compiler API / ts-morph
- **Fallback Parser:** Babel for edge syntax
- **Framework Patterns (Tier 0):** Express, React, Redux, GraphQL, Axios/Fetch
- **Framework Patterns (Tier 1):** Next.js, Prisma

---

## Implementation Status

### ✅ Completed (Phases 0-2)
1. ~~Resolve outstanding questions in SADS-FEEDBACK.md~~ → **Done** (see CTS-Responses.md)
2. ~~Create all Component Technical Specs (CTS)~~ → **Done** (all 7 CTS documents complete)
3. ~~Create Phase 1 implementation plan~~ → **Done** (IMPLEMENTATION_PLAN_PHASE1.md v1.2)
4. ~~Execute Phase 1 implementation~~ → **Done** (IMPLEMENTATION_PLAN_PHASE1.md v1.2)
   - ✅ KB schema & API contract (TDD, frozen)
   - ✅ Minimal CLI harness
   - ✅ Test infrastructure (Vitest, CI, coverage)
   - ✅ **Results:** 62 tests passing, 90.71% coverage
5. ~~Execute Phase 2 implementation~~ → **Done** (2025-11-03)
   - ✅ Scanner & Loader (Agent 1: 38 tests, 98.2% coverage)
   - ✅ Parser & Patterns (Agent 2: 35 tests, 87.06% coverage)
   - ✅ Spec Generator templates (Agent 3: 29 tests, 82.27% coverage)
   - ✅ LLM Gateway skeleton (Agent 4: 110 tests, 97.96% coverage)
   - ✅ Orchestrator integration (Scanner → Parser → KB → Generator)
   - ✅ End-to-end smoke test (3 comprehensive integration tests)
   - ✅ **Results:** 277 tests passing, 94.3% coverage, production-ready

### 📋 Next (Phase 3)
6. **Phase 3 implementation:** Indices, Reasoning (CTS-06), Linking
   - **Status:** Ready to start
   - **2-3 parallel agents**
   - All depend on Phase 2 pipeline ✅

### 📋 Future (Phase 4-6)
6. Phase 3 implementation: Indices, Reasoning (CTS-06), Linking
   - **2-3 parallel agents**
7. Phase 4 implementation: Grounding Validator (CTS-02), Gates (CTS-07)
   - **2 parallel agents**
8. Phase 5 implementation: Finalization Engine (CTS-04)
   - **Sequential** (1 agent)
9. Phase 6 implementation: Framework patterns, performance, documentation
   - **5-7 parallel agents**

---

## CTS Coverage by Phase

**Phase 1 (Foundation):**
- CTS-01: Knowledge Base (partial: schema + API; scoring deferred to Phase 3)
- CTS-07: Orchestrator (minimal: CLI harness only)

**Phase 2 (I/O & Templates):**
- CTS-05: Scanner & Loader, Parser & Fact Extractor, Auxiliary Readers
- CTS-03: Spec Generator (template mode)
- CTS-02: LLM Gateway (skeleton)

**Phase 3 (Intelligence):**
- CTS-01: Knowledge Base (indices + confidence scoring)
- CTS-06: Reasoning & Ambiguity Resolver
- CTS-03: Spec Generator (linking)
- CTS-07: Orchestrator (phase coordination)

**Phase 4 (Grounding & Polish):**
- CTS-02: LLM Gateway (grounding validator + integration)
- CTS-07: Orchestrator (gates)

**Phase 5 (Finalization):**
- CTS-04: Finalization Engine

**Phase 6 (Production Hardening):**
- CTS-05: Pattern library expansion (Express, React, Redux, GraphQL, HTTP)
- CTS-07: Orchestrator (performance, telemetry)

---

## Implementation Approach (TDD-First)

**All development follows Test-Driven Development:**

1. **Red:** Write failing unit test for next functionality
2. **Green:** Write minimal code to make test pass
3. **Refactor:** Clean up code while keeping tests green
4. **Commit:** Check in test + implementation together
5. **Repeat:** Move to next functionality

**Coverage target:** ≥80% branch coverage for all workstreams

**CI enforcement:** Tests must pass, coverage must not drop, linting/typecheck must succeed

---

## Parallelization Strategy (IMPLEMENTATION_PLAN.md §4)

### Phase 1: Foundation (Sequential)
- **1 agent:** KB schema → API contract → freeze
- **Bottleneck:** KB API Freeze blocks Phase 2

### Phase 2: I/O & Templates (High Parallelization — 4 agents)
After KB API Freeze:
- **Agent 1:** Scanner & Loader
- **Agent 2:** Parser & Patterns
- **Agent 3:** Spec Generator (templates)
- **Agent 4:** LLM Gateway (skeleton)

### Phase 3+: Intelligence & Patterns
- **Phase 3:** 2-3 agents (Indices, Reasoning, Linking)
- **Phase 4:** 2 agents (Grounding, Gates)
- **Phase 5:** 1 agent (Finalization, sequential by nature)
- **Phase 6:** 5-7 agents (5 framework patterns + perf + docs)

---

## Important Constraints

- **No runtime execution:** Static analysis only (SADS.md §1.3)
- **Tests are facts, not outputs:** Test files inform behavior but are not documented in specs
- **Privacy relaxed:** LLMs may see entire project files
- **One-time tool:** Not designed for ongoing sync after initial run
- **In-place output default:** spec.md files generated alongside source code
- **Determinism is mandatory:** With `--deterministic`, identical inputs must produce identical outputs

---

## Phase 1 Critical Success Factors

1. **KB API must be frozen** — No signature changes after Phase 1; all Phase 2 agents depend on this
2. **TDD discipline must be followed** — No implementation without failing tests first
3. **All critical bugs fixed** — Phase 1 plan v1.2 addresses all critical bugs from both reviews:
   - Batch transaction deep cloning (including nested arrays/objects)
   - Index maintenance on entity updates
   - CLI flag validation
   - Entity kind runtime validation
   - QID allocation idempotency
4. **≥80% test coverage required** — CI enforced
5. **API documentation complete** — docs/API.md with signatures, parameters, examples, stub clarifications

---

## Reference Documents

### For Active Development (Phase 1)
- **IMPLEMENTATION_PLAN_PHASE1.md v1.2** — Step-by-step TDD plan with code examples (all critical bugs fixed)
- **CTS-01_KnowledgeBase.md** — KB technical specification
- **CTS-07_Orchestrator_and_Lifecycle.md** — Orchestrator spec (minimal CLI harness for Phase 1)
- **SADS.md** — Architectural blueprint

### For Active Development (Phase 2+)
- **IMPLEMENTATION_PLAN.md** — Overall 6-phase strategy
- **CTS-02_LLM_Gateway_and_Grounding.md** — LLM Gateway & Grounding Validator spec
- **CTS-03_Spec_Generator.md** — Spec Generator spec
- **CTS-04_Finalization_Engine.md** — Finalization Engine spec
- **CTS-05_Static_Analysis_and_Pattern_Detection.md** — Scanner, Parser, Pattern Detector spec
- **CTS-06_Reasoning_and_Ambiguity_Resolver.md** — Reasoning & Ambiguity Resolver spec

### For Context
- **CTS-Responses.md** — Resolved architectural questions
- **PRD2.md** — Product vision and objectives

### Process Documents
- **PHASE_COMPLETION_CHECKLIST.md** — Standard steps for completing any phase (documentation updates, verification)

### Historical
- **SADS-FEEDBACK.md** — Original architectural questions (now resolved in CTS-Responses.md)

---

## Quick Reference: CTS File Locations

All CTS documents are in the repository root:

- `CTS-01_KnowledgeBase.md`
- `CTS-02_LLM_Gateway_and_Grounding.md`
- `CTS-03_Spec_Generator.md`
- `CTS-04_Finalization_Engine.md`
- `CTS-05_Static_Analysis_and_Pattern_Detection.md`
- `CTS-06_Reasoning_and_Ambiguity_Resolver.md`
- `CTS-07_Orchestrator_and_Lifecycle.md`
