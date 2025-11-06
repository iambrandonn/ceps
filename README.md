# ceps — Codebase to Specification

A one-time-use tool that reverse-engineers JavaScript/TypeScript codebases into human-readable Markdown specifications.

## Current Status

**Phase 1: Foundation — COMPLETE ✅**
**Phase 2: I/O & Templates — COMPLETE ✅**
**Phase 3: Intelligence — COMPLETE ✅**
**Phase 4: Grounding & Polish — COMPLETE ✅**
**Phase 5: Finalization — COMPLETE ✅**

### Phase 1: Foundation (Complete)

Phase 1 established the foundational contracts for the Knowledge Base and CLI infrastructure.

**Completed Deliverables:**
- ✅ Test infrastructure (Vitest, CI/CD, coverage enforcement ≥80%)
- ✅ Minimal CLI harness with argument parsing
- ✅ KB schema (Entity, Relation, Fact, FactSet, BehaviorChunk)
- ✅ ID generation (anchors, QIDs with collision handling)
- ✅ KB API contract (FROZEN - see docs/API.md)
- ✅ API documentation
- ✅ Integration smoke test

**Test Results:**
```
Test Files  6 passed (6)
Tests       62 passed (62)
Coverage    90.71% (exceeds 80% requirement)
```

### Phase 2: I/O & Templates (Complete)

Phase 2 delivers the full end-to-end pipeline from source code to Markdown specifications.

**Completed Deliverables:**
- ✅ Scanner & Loader (file discovery, ignore rules, monorepo detection)
- ✅ Parser & Patterns (TypeScript/Babel, fact extraction, dynamic pattern detection)
- ✅ Spec Generator (root + per-directory specs with templates)
- ✅ LLM Gateway (provider adapters, caching, budget tracking)
- ✅ Orchestrator integration (Scanner → Parser → KB → Generator)
- ✅ End-to-end smoke tests

**Test Results:**
```
Test Files  22 passed (22)
Tests       277 passed (277)
Coverage    94.3% (exceeds 80% requirement)
Duration    2.28s
```

### Phase 3: Intelligence (Complete)

Phase 3 adds the intelligence layer so ceps can reason about intent, confidence, and cross-file relationships.

**Completed Deliverables:**
- ✅ KB indices, reverse-dependency graphs, and confidence scoring API upgrades (WS-A)
- ✅ Reasoning & Ambiguity Resolver with iterative lifting and QID triage (WS-D)
- ✅ Two-phase cross-link validation and deterministic anchor enforcement in Spec Generator (WS-E)
- ✅ Orchestrator coordination, deterministic mode, and link audit tooling (WS-H)

### Phase 4: Grounding & Polish (Complete)

Phase 4 delivers the grounding validator, LLM polish integration, and runtime gates that enforce SADS §10 quality bars.

**Completed Deliverables:**
- ✅ Grounding validator, lexicon pipeline, diagnostics, and adversarial suite (WS-F1)
- ✅ LLM polish integration, budget governor, CLI flag matrix, and deterministic template fallback (WS-F2)
- ✅ Runtime + validation gates, structured run summary, and exit code enforcement (WS-H)

**Test Results:**
```
Test Files  62 passed (62)
Tests       823 passed | 3 skipped (826)
Coverage    93.42% (overall, --coverage run)
Duration    5.57s
```

### Phase 5: Finalization (Complete)

Phase 5 delivers the Finalization Engine, enabling answer-guided re-analysis and spec patching after human review.

**Completed Deliverables:**
- ✅ Answer Parser with QID extraction and validation (Step 1)
- ✅ Snapshot Manager with Merkle tree verification (Step 2)
- ✅ Impact Analyzer with reverse-dependency scoping (Step 3)
- ✅ Spec Patcher with Finalization Summary generation (Step 4)
- ✅ Orchestrator integration for `finalize` command (Step 5)
- ✅ CLI integration with dry-run and reconcile modes (Step 6)
- ✅ End-to-end validation with golden fixtures (Step 7)

**Key Features:**
- **Snapshot Verification:** Detects any file changes since initial run using SHA-256 Merkle trees
- **Impact Scoping:** Selective re-analysis of only affected entities using reverse-dependency traversal
- **QID Resolution:** Removes resolved questions from specs and applies answer text
- **Finalization Summaries:** Audit trail showing what changed during finalization
- **Exit Codes:** 0 (success), 1 (error), 3 (snapshot mismatch), 4 (unknown QIDs)

**Usage:**
```bash
# Preview finalization impacts (dry-run)
npm start finalize -- --answers ./answers.md --dry-run

# Full finalization with deterministic output
npm start finalize -- --answers ./answers.md --deterministic --llm off

# Allow changed files (reconcile mode)
npm start finalize -- --answers ./answers.md --reconcile
```

**Test Results:**
```
Test Files  62 passed (62)
Tests       823 passed | 3 skipped (826)
Coverage    93.42% (overall)
Phase 5     69 new tests added
```

**Critical Bugs Fixed:**
- QID deserialization bug that would have blocked 100% of finalization functionality
- ESM import resolution issues
- Async serialization compatibility

See [PHASE5_OVERALL_FEEDBACK.md](./PHASE5_OVERALL_FEEDBACK.md) for detailed lessons learned and architecture notes.

## Quick Start

### Installation

```bash
npm install
```

### Running Tests

```bash
npm test                  # Run all tests
npm run test:unit         # Run unit tests only
npm run test:integration  # Run integration tests only
npm run test:coverage     # Run with coverage report
```

### Linting & Type Checking

```bash
npm run lint              # Run ESLint
npm run typecheck         # Run TypeScript type checking
npm run format            # Format code with Prettier
```

### Running the CLI

**Initial spec generation:**
```bash
npm start <project-root>

# With flags
npm start . -- --deterministic --max-workers 4

# Display version
npm start -- --version
```

**Finalization workflow:**
```bash
# 1. Review generated specs and answer questions in answers.md

# 2. Preview impacts (dry-run)
npm start finalize -- --answers ./answers.md --dry-run

# 3. Run finalization
npm start finalize -- --answers ./answers.md --deterministic --llm off

# 4. Review updated specs with Finalization Summaries
```

## Architecture

See [SADS.md](./SADS.md) for the complete system architecture and design specification.

### Core Components (Phase 1)

1. **Knowledge Base (KB)** — Central memory for entities, facts, relationships, and confidence scores
2. **Orchestrator** — Minimal CLI harness for Phase 1 (expanded in later phases)

### API Documentation

See [docs/API.md](./docs/API.md) for the complete KB API reference.

**IMPORTANT:** The KB API is **FROZEN** after Phase 1. No signature changes allowed.

## Technology Stack

- **Runtime:** Node.js ≥18 LTS
- **Language:** TypeScript 5.x
- **Test Framework:** Vitest
- **Coverage:** V8
- **Linting:** ESLint + Prettier
- **CI/CD:** GitHub Actions

## Project Structure

```
ceps/
├── src/
│   ├── kb/                 # Knowledge Base implementation
│   │   ├── knowledge-base.ts
│   │   ├── models.ts
│   │   └── id-generation.ts
│   ├── orchestrator/       # CLI and orchestration
│   │   ├── index.ts
│   │   └── cli.ts
│   └── types/              # Shared TypeScript types
│       └── index.ts
├── tests/
│   ├── unit/               # Unit tests
│   └── integration/        # Integration tests
├── docs/
│   └── API.md              # API documentation
├── SADS.md                 # System Architecture & Design Spec
├── IMPLEMENTATION_PLAN_PHASE1.md  # Phase 1 implementation plan
└── package.json
```

## Next Steps

**Phase 6: Production Hardening** (Ready to start)

Phase 6 will implement 5-7 parallel workstreams:
- **Agent 1:** Express.js patterns (routes, middleware, error handlers)
- **Agent 2:** React patterns (components, hooks, context)
- **Agent 3:** Redux patterns (actions, reducers, selectors)
- **Agent 4:** GraphQL patterns (resolvers, schemas)
- **Agent 5:** HTTP client patterns (Axios, Fetch)
- **Agent 6:** Performance optimizations and telemetry
- **Agent 7:** Documentation and examples

**Deliverables:**
- Framework pattern library expansion (Tier 0 + Tier 1)
- Performance profiling and optimization
- Large repo stress testing
- Production telemetry and monitoring
- User documentation and tutorials

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for the complete roadmap.

## Documentation

### Core Documentation
- **[AGENTS.md](./AGENTS.md)** — Quick reference for developers
- **[SADS.md](./SADS.md)** — System Architecture & Design Specification
- **[PRD2.md](./PRD2.md)** — Product Requirements Document
- **[docs/API.md](./docs/API.md)** — KB API Reference (FROZEN)
- **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** — 6-phase implementation roadmap

### Phase-Specific Documentation
- **[IMPLEMENTATION_PLAN_PHASE1.md](./IMPLEMENTATION_PLAN_PHASE1.md)** — Phase 1 detailed plan
- **[IMPLEMENTATION_PLAN_PHASE5.md](./IMPLEMENTATION_PLAN_PHASE5.md)** — Phase 5 detailed plan
- **[PHASE5_OVERALL_FEEDBACK.md](./PHASE5_OVERALL_FEEDBACK.md)** — Phase 5 lessons learned and architecture

### Component Technical Specifications (CTS)
- **[CTS-01_KnowledgeBase.md](./CTS-01_KnowledgeBase.md)** — KB schema, confidence, storage
- **[CTS-02_LLM_Gateway_and_Grounding.md](./CTS-02_LLM_Gateway_and_Grounding.md)** — LLM integration and grounding
- **[CTS-03_Spec_Generator.md](./CTS-03_Spec_Generator.md)** — Spec generation and formatting
- **[CTS-04_Finalization_Engine.md](./CTS-04_Finalization_Engine.md)** — Answer ingestion and patching
- **[CTS-05_Static_Analysis_and_Pattern_Detection.md](./CTS-05_Static_Analysis_and_Pattern_Detection.md)** — Scanner and parser
- **[CTS-06_Reasoning_and_Ambiguity_Resolver.md](./CTS-06_Reasoning_and_Ambiguity_Resolver.md)** — Reasoning engine
- **[CTS-07_Orchestrator_and_Lifecycle.md](./CTS-07_Orchestrator_and_Lifecycle.md)** — Orchestrator lifecycle

## Contributing

Phase 1 is complete and the KB API is frozen. All future development must maintain API compatibility.

### Development Workflow

1. **Red:** Write failing unit test
2. **Green:** Write minimal code to make test pass
3. **Refactor:** Clean up code while keeping tests green
4. **Commit:** Check in test + implementation together
5. **Repeat:** Move to next functionality

### Coverage Requirements

- Minimum 80% branch coverage enforced by CI
- Tests must pass before merge
- Linting and type checking must succeed

## License

MIT
