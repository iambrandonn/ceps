# ceps — Codebase to Specification

A one-time-use tool that reverse-engineers JavaScript/TypeScript codebases into human-readable Markdown specifications.

## Current Status

**Phase 1: Foundation — COMPLETE ✅**

Phase 1 establishes the foundational contracts for the Knowledge Base and CLI infrastructure.

### Completed Deliverables

- ✅ Test infrastructure (Vitest, CI/CD, coverage enforcement ≥80%)
- ✅ Minimal CLI harness with argument parsing
- ✅ KB schema (Entity, Relation, Fact, FactSet, BehaviorChunk)
- ✅ ID generation (anchors, QIDs with collision handling)
- ✅ KB API contract (FROZEN - see docs/API.md)
- ✅ API documentation
- ✅ Integration smoke test

### Test Results

```
Test Files  6 passed (6)
Tests       62 passed (62)
Coverage    90.71% statements, 92.3% branches (exceeds 80% requirement)
```

### Critical Bug Fixes

All critical bugs from the implementation plan have been addressed:

1. **CRITICAL-1 & 2:** Deep clone in batch transactions (including nested arrays/objects)
2. **CRITICAL-3:** Upsert semantics prevent duplicate index entries
3. **CRITICAL-4:** Index updates when entity properties change
4. **HIGH-1:** QID allocation is idempotent (same inputs → same QID)

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

**Phase 2: I/O & Templates** (Ready to start after KB API Freeze)

Phase 2 will implement 4 parallel workstreams:
- **Agent 1:** Scanner & Loader (CTS-05)
- **Agent 2:** Parser & Patterns (CTS-05)
- **Agent 3:** Spec Generator (CTS-03, template mode)
- **Agent 4:** LLM Gateway (CTS-02, skeleton)

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
