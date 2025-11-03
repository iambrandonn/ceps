# ceps — Codebase to Specification

A one-time-use tool that reverse-engineers JavaScript/TypeScript codebases into human-readable Markdown specifications.

## Current Status

**Phase 1: Foundation — COMPLETE ✅**
**Phase 2: I/O & Templates — COMPLETE ✅**

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

```bash
npm start <project-root>

# With flags
npm start . -- --deterministic --max-workers 4

# Display version
npm start -- --version
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

**Phase 3: Intelligence** (Ready to start)

Phase 3 will implement 2-3 parallel workstreams:
- **Agent 1:** KB Indices & Confidence Scoring (CTS-01)
- **Agent 2:** Reasoning & Ambiguity Resolver (CTS-06)
- **Agent 3:** Cross-link Validation & Phase Coordination (CTS-03, CTS-07)

**Deliverables:**
- Call/import graphs and reverse-deps indices
- Confidence scoring algorithm (upgrade from stub)
- Framework pattern matching (Express, React basics)
- Intent lifting and iterative resolution
- Two-phase cross-link validation
- Open Question (QID) generation

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for the complete roadmap.

## Documentation

- **[AGENTS.md](./AGENTS.md)** — Quick reference for developers
- **[SADS.md](./SADS.md)** — System Architecture & Design Specification
- **[PRD2.md](./PRD2.md)** — Product Requirements Document
- **[docs/API.md](./docs/API.md)** — KB API Reference (FROZEN)
- **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** — 6-phase implementation roadmap
- **[IMPLEMENTATION_PLAN_PHASE1.md](./IMPLEMENTATION_PLAN_PHASE1.md)** — Detailed Phase 1 plan

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
