# Pattern Coverage Matrix

**Version:** Phase 6 I3
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

## Future Iterations (Planned)

### Iteration I4 (Mongoose)
- Schema definitions
- Model registration
- Hooks (pre/post)
- Query builders
- Validation rules

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
