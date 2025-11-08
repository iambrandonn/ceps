# Pattern Coverage Matrix

**Version:** Phase 6 I5 (Final)
**Last Updated:** 2025-11-07
**Purpose:** Document supported framework patterns, confidence expectations, and known gaps

---

## Overview

This document tracks which framework-specific behaviors ceps can automatically detect and document. Each entry includes:

1. **Supported Behaviors** - What patterns are recognized
2. **Confidence Expectations** - Expected confidence bands (High/Medium/Low)
3. **Known Gaps** - Limitations and unsupported patterns
4. **Auxiliary Dependencies** - External data sources required (config files, etc.)

---

## Tier 0 Frameworks (Phase 6)

### Express.js

#### Middleware (I1)

| Behavior | Detection Method | Confidence | Notes |
|----------|------------------|------------|-------|
| Standard middleware (3-param: `req, res, next`) | Parameter signature analysis | High (≥70) | Requires param-count + param-names facts |
| Middleware chain processing | Inferred from signature | High | |
| Named middleware functions | Entity name from parser | High | Must be exported function |

**Known Gaps:**
- Inline/anonymous middleware not extracted as separate entities (parser limitation)
- Middleware order/dependencies not tracked
- Dynamic middleware registration not detected

#### Routing (I1)

| Behavior | Detection Method | Confidence | Notes |
|----------|------------------|------------|-------|
| Express Router initialization | `initializer-call: Router` | High | Constant with `Router()` initializer |
| Router entity detection | Constant kind + initializer pattern | High | |

**Known Gaps:**
- Individual route handlers (`.get()`, `.post()`, etc.) not extracted per Phase -1 analysis
- Route paths may not be available (inline handlers)
- HTTP method detection limited by parser facts

#### Error Handling (I2)

| Behavior | Detection Method | Confidence | Notes |
|----------|------------------|------------|-------|
| Error handler middleware (4-param: `err, req, res, next`) | Parameter signature analysis | High | Requires param-count=4 + param-names |
| Error middleware detection | Signature + naming pattern | High | |

**Known Gaps:**
- Error propagation chains not tracked
- Try/catch patterns not detected
- Error transformation logic not documented

#### Async Handling (I2)

| Behavior | Detection Method | Confidence | Notes |
|----------|------------------|------------|-------|
| Async middleware detection | `is-async` or `returns-promise` facts | High (if facts present) | Parser may not emit these facts |
| Promise-based flows | Heuristic: DB/IO calls | Medium | Fallback when async facts missing |

**Known Gaps:**
- Parser doesn't emit `is-async` for inline handlers (per Phase -1)
- Async error handling not explicitly documented
- Promise rejection handling not tracked

#### Configuration & Environment (I3)

| Behavior | Detection Method | Confidence | Notes |
|----------|------------------|------------|-------|
| `app.set()` configuration | `calls-expression: app.set` | High | Explicit configuration setting |
| `app.get()` config reads | `calls-expression: app.get` | High | Config value retrieval |
| `process.env.*` reads | `reads-property: process.env.*` | High (if facts present) | Parser may not emit for all cases |
| Environment variable detection | Property read patterns | High | |

**Known Gaps:**
- Parser may not emit `reads-property` facts for `process.env` access (integration test documents this)
- Config-driven feature flags not explicitly labeled
- Dynamic config keys not resolved
- Config value types not tracked

**Auxiliary Dependencies:**
- None (relies on parser facts only)

---

### Mongoose ODM (I4)

#### Schema Definitions

| Behavior | Detection Method | Confidence | Notes |
|----------|------------------|------------|-------|
| Schema definition (`new Schema({...})`) | `initializer` text pattern match | High (≥70) | Parser doesn't emit `initializer-call` for `new` expressions |
| Field extraction (simple types) | Regex parsing of schema initializer | High | Works for flat field definitions |
| Required fields detection | Regex match: `required: true` | High | Captured in field metadata |
| References to other models | Regex match: `ref: 'ModelName'` | High | Detects `ref` property in field definitions |
| Array references | Regex match: `[{ type: ..., ref: '...' }]` | High | Detects array field references |
| Complex nested schemas | Heuristic + length check | Medium | Degrades to Medium confidence for schemas >1000 chars |

**Known Gaps:**
- Virtuals not detected (deferred to post-M3)
- Discriminators not supported (deferred)
- Advanced validators beyond `required` not parsed (deferred)
- Methods and statics not detected
- Deeply nested objects may have incomplete field extraction
- Schema options (timestamps, versionKey, etc.) not captured

**Auxiliary Dependencies:**
- None (relies on parser facts only)

#### Model Definitions

| Behavior | Detection Method | Confidence | Notes |
|----------|------------------|------------|-------|
| Model registration (`mongoose.model()`) | `initializer-call: mongoose.model` | High | Strong signal from parser |
| Model name extraction | Regex: first argument to `mongoose.model()` | High | Extracted from initializer text |
| Schema reference resolution | Identifier lookup via KB | High (if resolved) | Links model to schema entity |
| Schema field inheritance | KB chunk lookup for linked schema | High (if schema has chunks) | Inherits field info from schema's behavior chunk |
| Unresolved schema reference | Schema identifier not found in KB | Medium | Degrades confidence, notes "(not resolved)" |

**Known Gaps:**
- Dynamic model names (e.g., `mongoose.model(getName(), schema)`) not resolved
- Models created in loops or conditionally not tracked
- Model methods and statics not detected
- Populate strategies not documented

**Auxiliary Dependencies:**
- None (relies on KB entity linking)

#### Query Operations

| Behavior | Detection Method | Confidence | Notes |
|----------|------------------|------------|-------|
| Read queries (`find`, `findOne`, `findById`) | `calls-expression` pattern match | High (if model resolved) | Detects query method calls |
| Write queries (`create`, `updateOne`, `deleteOne`) | `calls-expression` pattern match | High (if model resolved) | Categorizes as write operations |
| Model identifier resolution | KB lookup via model name | High/Medium/Low | Confidence depends on resolution success |
| Field information inheritance | Linked model → schema → fields | High (if fully resolved) | Enriches query description with field context |
| Unresolved model reference | Model identifier not found | Low | Emits "(model not resolved)" |

**Known Gaps:**
- Aggregation pipelines not supported (deferred)
- `populate()` calls not detected
- Query builder chains (`.where()`, `.select()`) not parsed
- Query options (sort, limit, skip) not captured
- Dynamic model access (e.g., `models[name].find()`) not resolved
- Query arguments (filter objects) not analyzed

**Auxiliary Dependencies:**
- None (relies on KB linking for model/schema info)

**Integration with Express:**
- Mongoose queries detected in Express route handlers (router constants)
- Queries linked to models, models linked to schemas
- Full chain: Route → Query → Model → Schema → Fields

---

## Phase 6 Express Workstream Summary (I1-I5 Complete)

**Completion Date:** 2025-11-07
**Status:** ✅ Ready for handoff to React/Redux/GraphQL/HTTP agents

### Overall Coverage

| Pattern Area | Supported Behaviors | Confidence | Test Coverage | Notes |
|--------------|-------------------|------------|---------------|-------|
| **Middleware** | Standard (3-param) middleware detection | High (≥70) | Unit + Integration | Signature-based detection |
| **Routing** | Router initialization, HTTP method detection | High | Unit + Integration | Limited by parser facts for paths |
| **Error Handling** | Error middleware (4-param) detection | High | Unit + Integration | Signature-based detection |
| **Async** | async/Promise-based flow detection | High/Medium | Unit + Integration | Depends on parser facts |
| **Configuration** | app.set/get, process.env reads | High | Unit + Integration | Parser limitation documented |
| **Mongoose Schema** | Field extraction, required, references | High | Unit + Integration | Complex schemas → Medium |
| **Mongoose Model** | Model registration, schema linking | High | Unit + Integration | Unresolved refs → Medium |
| **Mongoose Query** | Read/write queries, model linking | High/Med/Low | Unit + Integration | Confidence varies by resolution |

### Key Achievements

1. **Pattern Architecture:** Established `PatternModule` contract with priority system, error handling, and precedence rules
2. **Lexicon Foundation:** 49 approved terms + 15 anti-patterns validated with 51/51 passing tests
3. **Integration:** Full Express ↔ Mongoose linking (routes → queries → models → schemas → fields)
4. **Validation:** Golden specs, KB chunk assertions, finalization compatibility, LLM-off determinism
5. **Documentation:** Coverage matrix, lessons learned, internal API docs, decision log

### Lessons for Future Agents

See `docs/internal/PHASE6_EXPRESS_LESSONS.md` for detailed guidance on:
- Phase -1 analysis workflow
- Fixture strategy (polluted datasets)
- Accuracy harness mechanics
- Lexicon testing checklist
- Benchmark integration
- Cross-workstream DoD compliance

### Known Limitations

**Parser-Dependent:**
- Individual route handler signatures not extracted (parser limitation per Phase -1)
- `process.env` reads may not emit facts in all cases (documented in integration tests)
- Dynamic patterns (computed paths, conditional routes) → Open Questions

**Mongoose Scope:**
- Virtuals, discriminators, advanced validators deferred to post-M3
- Aggregation pipelines, populate chains not supported
- Schema options (timestamps, versionKey) not captured

**Future Enhancements:**
- Middleware ordering and dependency tracking
- Error propagation chains
- Query argument analysis (filter objects, sort/limit/skip)

### Metrics (To Be Confirmed in Validation Sweep)

- **Accuracy:** Target F1 ≥0.90 (precision ≥0.88, recall ≥0.88)
- **Test Coverage:** 1155+ tests passing, ≥80% branch coverage
- **Benchmark:** <10% regression from I4 baseline
- **Gates:** Coverage/Link/Grounding/Confidence/Monorepo all green

---

## Future Iterations (Planned)

### React (Tier 0)
- Function/class components
- Hooks (built-in + custom)
- Context providers/consumers
- Side effects (`useEffect`, `useLayoutEffect`)
- Prop/state relationships

### Redux (Tier 0)
- Action creators
- Slice reducers
- Selectors
- Middleware (thunks, sagas)
- Side effects

### GraphQL (Tier 0)
- Schema definitions (SDL/code-first)
- Resolvers
- Queries/mutations/subscriptions
- Data sources
- Federated schemas

### HTTP Clients (Tier 0)
- Axios/Fetch patterns
- Request construction
- Interceptors
- Retry/backoff logic
- Error translation

---

## Confidence Band Reference

Per SADS §4.2:

| Band | Threshold | Spec Output | Use Case |
|------|-----------|-------------|----------|
| **High** | ≥70 | Assertive prose | Strong signal from pattern match + complete facts |
| **Medium** | 40-69 | Assertive prose + optional *Assumptions* | Partial facts or heuristic match |
| **Low** | <40 | **Open Question (QID)** | Ambiguous or missing facts |

---

## Testing Strategy

### Accuracy Harness

For each pattern, we maintain:

1. **Corpus:** 20-50 annotated code snippets under `tests/fixtures/accuracy/<framework>/`
2. **Ground Truth:** JSON files with expected behaviors, confidence, and anti-patterns
3. **Metrics:** Precision, Recall, F1 (target: F1 ≥0.90)
4. **Nightly Runs:** Automated accuracy checks via `scripts/run-tier0-accuracy.mjs`

### Regression Guards

- **Golden specs:** Integration tests diff generated specs against expected outputs
- **KB chunk assertions:** Tests interrogate KB for chunks, confidence, and factSet IDs
- **Gate validation:** Coverage/Link/Grounding gates must pass
- **LLM-off contract:** All patterns work with `--llm off --deterministic`

---

## Maintenance Schedule

- **Per-iteration:** Update after each Phase 6 iteration (I1, I2, I3, I4)
- **Post-merge:** Refresh when new patterns land in `main`
- **Quarterly:** Review accuracy metrics and adjust confidence thresholds if needed

---

## References

- **SADS.md §4.2:** Confidence bands specification
- **IMPLEMENTATION_PLAN_PHASE6.md §3:** Workstream deliverables
- **IMPLEMENTATION_PLAN_PHASE6_WS_D_EXPRESS.md §5.2:** Accuracy harness details
- **docs/lexicon.md:** Approved terminology for each pattern
