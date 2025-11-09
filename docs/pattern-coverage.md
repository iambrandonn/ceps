# Pattern Coverage Matrix

**Version:** Phase 6 (Express + Mongoose + HTTP Clients I1)
**Last Updated:** 2025-11-08
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

---

## HTTP Clients (Phase 6 - I1 Complete)

**Completion Date:** 2025-11-08
**Status:** ✅ I1 complete (core patterns), I2 deferred to future iteration

### Axios Client Patterns (I1)

| Behavior | Detection Method | Confidence | Notes |
|----------|------------------|------------|-------|
| Axios client initialization (`axios.create()`) | `initializer-call: axios.create` | High (≥70) | Constant entity with axios.create initializer |
| Base URL extraction | Regex parsing of `baseURL` in config | High | Static string literals |
| Timeout configuration | Regex parsing of `timeout` in config | High | Numeric literals |
| Default headers detection | Regex parsing of `headers` object | High | Presence detection only |
| Dynamic configuration | Heuristic: function calls/variables in config | Medium | Lower confidence for dynamic configs |

**Known Gaps:**
- Individual header keys not parsed (only presence detection)
- Nested config objects may be incomplete
- Config from imported modules not resolved
- Interceptors not detected in I1 (deferred to I2)

**Auxiliary Dependencies:**
- None (relies on parser facts only)

### Fetch API Patterns (I1)

| Behavior | Detection Method | Confidence | Notes |
|----------|------------------|------------|-------|
| Fetch wrapper functions | `calls-expression: fetch` | High | Function entities calling fetch() |
| URL extraction | `call-arg-0` fact | High (if present) | Parser may not always emit URL |
| Error handling detection | `has-try-catch` or `calls-expression: Error` | High (if present) | Parser-dependent |
| Async function detection | `is-async` or `returns-promise` facts | High | Parser may not emit for all cases |

**Known Gaps:**
- Fetch options (method, headers, body) not parsed
- AbortController/signal patterns not detected (deferred to I2)
- Dynamic URLs from variables not resolved
- Inline fetch calls not extracted as separate entities

**Auxiliary Dependencies:**
- None (relies on parser facts only)

### Request/Response Transformation (I1)

| Behavior | Detection Method | Confidence | Notes |
|----------|------------------|------------|-------|
| JSON response parsing (`response.json()`) | `calls-expression: response.json` | High | Direct method call detection |
| Text response extraction (`response.text()`) | `calls-expression: response.text` | High | Direct method call detection |
| Request serialization (`JSON.stringify()`) | `calls-expression: JSON.stringify` | High | Direct method call detection |
| Response parsing (`JSON.parse()`) | `calls-expression: JSON.parse` | High | Direct method call detection |

**Known Gaps:**
- Custom transformation functions not detected
- Data normalization logic (camelCase ↔ snake_case) not analyzed
- Blob/ArrayBuffer/FormData handling not supported
- Axios `transformRequest`/`transformResponse` config not parsed

**Auxiliary Dependencies:**
- None (relies on parser facts only)

### HTTP Error Handling (I1)

| Behavior | Detection Method | Confidence | Notes |
|----------|------------------|------------|-------|
| Try-catch blocks around HTTP calls | `has-try-catch` + HTTP call detection | High (if matched) | Requires both signals present |
| response.ok checking | `checks-property: response.ok` | High (if present) | Parser may not emit for all cases |
| response.status checking | `checks-property: response.status` | High (if present) | Parser-dependent |
| HTTP call detection | `calls-expression: fetch/axios.*` | High | Multiple HTTP call variants supported |

**Known Gaps:**
- Parser doesn't always emit `has-try-catch` or `checks-property` facts (integration test warnings document this)
- Error propagation chains not tracked
- Custom error classes not detected
- Status code branching logic not analyzed
- Error retry patterns not detected (deferred to I2)

**Auxiliary Dependencies:**
- None (relies on parser facts only)

### HTTP Clients I1 Summary

**Overall Coverage:**

| Pattern Area | Supported Behaviors | Confidence | Test Coverage | Notes |
|--------------|-------------------|------------|---------------|-------|
| **Axios Client** | Client initialization, config extraction | High (≥70) | Unit + Integration | Dynamic configs → Medium |
| **Fetch API** | Wrapper function detection, URL extraction | High | Unit + Integration | Parser-limited on URLs |
| **Transforms** | JSON parsing/serialization detection | High | Unit + Integration | Simple transform patterns only |
| **Error Handling** | Try-catch + status checking | High | Unit + Integration | Parser-dependent facts |

**Test Results:**
- **Unit Tests:** 49 tests passing (4 modules × 11-13 tests each)
- **Integration Tests:** 10 tests passing (with documented parser limitations)
- **Total Tests:** 59 HTTP client tests (1285 total project tests)
- **Coverage:** 100% of I1 patterns tested with polluted datasets

**Key Achievements:**
1. **Phase -1 Analysis:** Documented parser predicate catalog and boolean fact matching limitations
2. **TDD Approach:** All 4 I1 modules implemented with tests-first methodology
3. **Negative Assertions:** Polluted dataset tests prevent cross-contamination with Express/Mongoose
4. **Integration:** Patterns registered in orchestrator, wired into reasoning pipeline
5. **Lexicon:** 23 approved HTTP client terms + 9 anti-patterns added

**Lessons Learned:**
1. **Boolean Fact Matching:** Parser emits `has-try-catch: true` but `hasFact()` expects string values - must check predicate presence only
2. **Entity Kinds:** Axios clients are `constant` entities (not `function`), discovered via Phase -1
3. **Parser Limitations:** Interceptor calls create module-level entities, making linking difficult
4. **Integration Test Strategy:** Tests should skip gracefully when parser doesn't emit expected facts (expected behavior)

### I2 Patterns (Deferred to Future Iteration)

Based on Phase -1 analysis, the following patterns were assessed and deferred due to complexity vs value tradeoff:

**Deferred Patterns:**
- **Retry & Backoff Logic:** Parser doesn't emit loop predicates; requires complex inference with lower confidence
- **Timeout Patterns:** AbortController detection possible but partially covered by I1 (Axios timeout in config)
- **Axios Interceptors:** Parser creates module-level entities for interceptor calls, difficult to link to clients
- **Auth Header Injection:** Could extend I1 config parsing but adds limited incremental value

**Rationale:**
- I1 already covers 80% use case (client detection, basic error handling, transforms)
- I2 patterns require significantly more inference with lower confidence outcomes
- Similar to Express Wave 1 (deferred accuracy harness to Wave 2), focus on reliable patterns first
- Future iterations can revisit with improved parser support or different detection strategies

**Future Work:**
- Evaluate if `axios-retry` library usage can be detected via imports
- Consider generic retry pattern detection across all async functions (not HTTP-specific)
- Explore AST-based loop analysis for retry detection

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
