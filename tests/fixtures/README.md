# Test Fixtures

Test fixtures for integration and smoke tests.

## Phase 2 Fixtures (To Be Created)

### tiny-express/
- Minimal Express REST API
- Routes, middleware, error handling, config
- Used for testing Scanner, Parser, Generator end-to-end

### tiny-react/
- Minimal React app
- Components, hooks, context, side effects
- Used for testing component parsing and spec generation

### tiny-monorepo/
- Minimal monorepo with 2-3 packages
- Cross-package dependencies
- Used for testing monorepo detection and per-package specs

## Creating Fixtures

Each fixture should:
1. Be minimal (10-20 files max)
2. Use pinned dependencies for reproducibility
3. Have a package.json with clear structure
4. Include README explaining what it tests

## Usage

Fixtures are used by:
- Integration tests (tests/integration/phase2-smoke.test.ts)
- End-to-end smoke tests
- Golden tests (deterministic output validation)

## See Also

- IMPLEMENTATION_PLAN.md §9 (Testing Plan)
- IMPLEMENTATION_PLAN_PHASE2.md §0.1 (Smoke Test)
