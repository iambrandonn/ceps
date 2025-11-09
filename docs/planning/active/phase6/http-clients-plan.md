# ceps — Implementation Plan: Agent 5 (HTTP Clients Pattern Library)

**Date:** 2025-11-08 (Updated with review feedback)
**Agent:** Agent 5 (HTTP Clients)
**Framework:** Axios, Fetch, HTTP client patterns
**Phase:** 6 (Production Hardening) Wave 1A (Backend Validation Track)
**Status:** ✅ Approved for Implementation
**Review Status:** Approved by Code Review Agent (2025-11-08) with high-priority recommendations incorporated

---

## 0) Context & Objectives

### Purpose
Implement Tier-0 HTTP client pattern library to complete the backend request/response cycle for Express applications. This enables end-to-end backend validation before frontend pattern expansion.

### Strategic Context
**Backend-First Validation Track** (adopted 2025-11-08):
- Express patterns (Agent 1) complete ✅
- HTTP Clients (Agent 5) completes backend coverage
- Real-world validation on 2-3 backend projects (Express + Mongoose + HTTP)
- Frontend agents (React/Redux/GraphQL) deferred pending Wave 1A validation

### Success Metrics
1. **Pattern Accuracy:** F1 ≥0.90 on curated HTTP client fixtures
2. **Integration Quality:** HTTP calls in Express routes documented with retry/error detail
3. **Zero Regressions:** All 1155 existing tests remain green
4. **Backend Coherence:** Request→routing→persistence→external-API cycle fully documented with proper cross-links
5. **Validation Readiness:** Validation automation script delivered and tested

---

## 1) Deliverables & Timeline

### Wave 1A Timeline: 2 Weeks (2025-11-08 to 2025-11-22)

| Week | Days | Milestone | Deliverables |
|------|------|-----------|--------------|
| **Week 1** | Days 1-3 | Phase -1 Analysis + Planning | Analysis doc, fixture strategy, parser instrumentation |
| **Week 1** | Days 4-7 | Core Pattern Implementation (I1) | Axios/Fetch detection, request/response patterns, basic error handling |
| **Week 2** | Days 8-10 | Advanced Patterns (I2) | Retry/timeout/circuit breaker patterns, interceptors, config patterns |
| **Week 2** | Days 11-12 | Validation Tooling | `run-backend-validation.mjs` script implementation |
| **Week 2** | Days 13-14 | Integration & Handoff | Full test suite, lexicon updates, validation script testing |

### Deliverables Checklist

#### Core Implementation
- [ ] **Phase -1 Analysis:** `docs/internal/analysis/phase6-http-clients-phase-minus-one.md`
- [ ] **Pattern Modules (6-8 modules):**
  - `src/reasoning/patterns/http-clients/axios-client.ts` — Instance creation, configuration
  - `src/reasoning/patterns/http-clients/axios-interceptors.ts` — Request/response interceptors
  - `src/reasoning/patterns/http-clients/fetch-patterns.ts` — Fetch API wrappers, error handling
  - `src/reasoning/patterns/http-clients/retry-backoff.ts` — Retry logic, exponential backoff
  - `src/reasoning/patterns/http-clients/timeout-circuit-breaker.ts` — Timeout and circuit breaker patterns
  - `src/reasoning/patterns/http-clients/auth-headers.ts` — Authentication header injection patterns
  - `src/reasoning/patterns/http-clients/error-handling.ts` — HTTP error semantics, status code handling
  - `src/reasoning/patterns/http-clients/request-response-transform.ts` — Data transformation patterns

#### Testing & Fixtures
- [ ] **Unit Tests:** ≥80% branch coverage per module
- [ ] **Integration Tests:** KB chunk assertions, confidence validation, finalization scenarios
- [ ] **Polluted Fixtures:** `tests/fixtures/accuracy/http-clients/` (20-50 snippets)
- [ ] **Ground Truth Files:** JSON annotations for accuracy harness

#### Documentation
- [ ] **Lexicon Updates:** New HTTP client terms + anti-patterns (10-15 entries)
- [ ] **Validator Tests:** 15-20 new lexicon tests (word-boundary safe)
- [ ] **Coverage Matrix:** `docs/pattern-coverage.md` rows for all HTTP patterns
- [ ] **Release Notes:** Feature announcement for M3 package

#### Validation Tooling (NEW — Critical Deliverable)
- [ ] **Validation Script:** `scripts/run-backend-validation.mjs`
  - Accepts list of project directories
  - Runs `ceps --llm off --deterministic` and `ceps --llm on`
  - Captures exit codes, gate status, runtime, spec outputs
  - Generates structured JSON for manual annotation
  - Computes precision/recall/F1 after human labels TP/FP/FN
  - Outputs validation report from template (Appendix A of phase6/plan.md)
- [ ] **Validation Report Template:** Ready for use after Agent 5 completion

---

## 2) Phase -1 Analysis (Days 1-3)

### Objectives
Understand upstream parser output for HTTP client patterns before implementing detection logic.

### Process

#### Step 1: Instrument Existing Fixtures (Day 1)
1. Run ceps on `tests/fixtures/phase5/baseline/tiny-react` (has Axios usage)
2. Dump KB entities/facts to console or JSON:
   ```bash
   CEPS_DEBUG_KB=true npm test -- --run tests/integration/e2e.test.ts
   ```
3. Identify HTTP client call sites:
   - What entity kinds? (function, constant, call expression?)
   - What predicates? (call-arg-0, import-source, initializer?)
   - Are Axios instances vs. direct calls distinguishable?

#### Step 2: Sample Real-World Code (Day 2)
Analyze 2-3 OSS projects with diverse HTTP client usage:
- **Simple:** Single Axios instance, basic GET/POST requests
- **Complex:** Multiple instances, interceptors, retry logic, circuit breakers
- **Examples:**
  - `axios/axios/examples/` (official examples)
  - `sindresorhus/ky` (Fetch wrapper library)
  - Express app with API gateway pattern (outbound HTTP calls)

#### Step 3: Document Findings (Day 2-3)
Create `docs/internal/analysis/phase6-http-clients-phase-minus-one.md`:
- **Entity kinds emitted:** `function`, `constant`, `call`, `import`?
- **Available predicates:** `call-arg-0`, `initializer`, `param-names`, `import-source`?
- **Namespace semantics:** Are call-arg-N reused per call or per module?
- **Parser limitations:**
  - Config objects deeply nested → confidence downgrade
  - Dynamic base URL construction → emit Open Question
  - Runtime-conditional interceptors → flag as pattern detection challenge
- **Fixture requirements:**
  - Multiple Axios instances with different configs
  - Shared vs. per-request interceptors
  - Retry logic with varying backoff strategies
  - Fetch wrappers mimicking Axios API

#### Step 4: Update Parser (if needed) (Day 3)
If critical patterns are invisible to parser:
- **Add predicates:** e.g., `axios-config`, `fetch-options`
- **Emit side-effects:** HTTP requests should be marked as `network` I/O
- **Coordinate with WS-C:** File PR for parser enhancements (non-blocking)

**Fallback Strategy (if parser enhancements blocked):**
- Document as "known gap" in Phase -1 analysis and proceed with available predicates
- Emit Medium/Low confidence + Open Questions for patterns requiring new predicates
- Focus implementation on high-confidence patterns (static configs, literal values)
- Defer dynamic patterns to post-M3 if parser enhancements not merged in time

### Outputs
- Phase -1 analysis document (20-30 pages with code examples)
- List of parser limitations (documented, not blocking)
- Fixture strategy for polluted datasets

### Time Investment
**3 days** (Day 1-3 of Week 1)

### Acceptance Criteria
- [ ] Analysis document reviewed by Agent 1 (Express) or Agent 6
- [ ] Parser limitations documented with mitigation strategies
- [ ] Fixture strategy approved (polluted dataset examples)

---

## 3) Core Pattern Implementation — I1 (Days 4-7)

### Objective
Implement basic HTTP client detection for Axios and Fetch with request/response semantics.

### Patterns to Implement

#### 3.1 Axios Client Initialization
**File:** `src/reasoning/patterns/http-clients/axios-client.ts`

**Detection Rules:**
1. `axios.create({ baseURL, timeout, headers })` → Axios instance creation
2. `import axios from 'axios'` → Direct Axios usage
3. Config object extraction: `baseURL`, `timeout`, `headers`, `auth`

**Confidence Scoring:**
- **High (≥70):** Static config objects, literal base URLs
- **Medium (40-69):** Config from imported constants, env vars
- **Low (<40):** Config from dynamic sources → emit Open Question

**Behavior Chunks:**
- "Creates Axios client with base URL `https://api.example.com`"
- "Configures 5-second timeout for all requests"
- "Includes default headers: `Authorization`, `Content-Type`"

**KB Wiring:**
- Link to Express routes that invoke HTTP calls (outbound dependencies)
- Capture side effects: `network` I/O, external API dependency
- Error semantics: Network errors, timeout errors

#### 3.2 Fetch Wrapper Patterns
**File:** `src/reasoning/patterns/http-clients/fetch-patterns.ts`

**Detection Rules:**
1. `fetch(url, { method, headers, body })` → Direct Fetch usage
2. Wrapper functions around Fetch (e.g., `async function apiGet(url) { return fetch(...) }`)
3. Error handling patterns: `.catch()`, `try/catch`, custom error classes

**Confidence Scoring:**
- **High (≥70):** Wrapper functions with consistent error handling
- **Medium (40-69):** Direct fetch calls with basic error handling
- **Low (<40):** No error handling → emit Open Question

**Behavior Chunks:**
- "Wraps `fetch()` with JSON parsing and error handling"
- "Throws custom `ApiError` on non-2xx status codes"
- "Logs failed requests to error monitoring service"

#### 3.3 Request/Response Transformation
**File:** `src/reasoning/patterns/http-clients/request-response-transform.ts`

**Detection Rules:**
1. Axios `transformRequest` / `transformResponse` config options
2. Manual JSON parsing: `response.json()`, `JSON.parse(response.data)`
3. Data normalization: camelCase ↔ snake_case transformations

**Confidence Scoring:**
- **High (≥70):** Explicit transformation functions in config
- **Medium (40-69):** Inline transformations in request/response handlers
- **Low (<40):** Dynamic transformations based on runtime state

**Behavior Chunks:**
- "Transforms request data from camelCase to snake_case before sending"
- "Parses response JSON and normalizes date strings to ISO 8601"
- "Filters sensitive fields from request/response logs"

#### 3.4 Basic Error Handling
**File:** `src/reasoning/patterns/http-clients/error-handling.ts`

**Detection Rules:**
1. `.catch()` handlers on Axios/Fetch promises
2. `try/catch` blocks around HTTP calls
3. Status code checks: `response.status === 200`, `response.ok`
4. Custom error classes: `class ApiError extends Error`

**Confidence Scoring:**
- **High (≥70):** Comprehensive error handling with status code branching
- **Medium (40-69):** Basic error handling (logs + re-throw)
- **Low (<40):** No error handling → emit Open Question

**Behavior Chunks:**
- "Catches network errors and retries up to 3 times"
- "Returns `null` on 404 errors, throws on 5xx errors"
- "Logs errors with request context (URL, method, headers)"

### Testing Strategy

#### Unit Tests (Day 5-6)
**File:** `tests/reasoning/http-clients/*.test.ts`

**Polluted Datasets Required:**
- Multiple Axios instances with overlapping configs
- Mix of Axios and Fetch calls in same module
- Shared error handlers vs. per-request error handlers
- Competing `call-arg-0` facts from different HTTP calls

**Example Test Structure:**
```typescript
describe('Axios Client Detection', () => {
  it('detects Axios.create() with config', () => {
    const entities = [
      axiosInstanceA,      // baseURL: api.example.com
      axiosInstanceB,      // baseURL: auth.example.com
      expressRouteHandler, // NOT an Axios instance
    ];
    const facts = [
      { entityId: 'axiosInstanceA', predicate: 'call-arg-0', value: '{ baseURL: "https://api.example.com" }' },
      { entityId: 'axiosInstanceB', predicate: 'call-arg-0', value: '{ baseURL: "https://auth.example.com" }' },
      { entityId: 'expressRouteHandler', predicate: 'call-arg-0', value: 'req, res' },
    ];

    const result = axiosClientPattern.describe(kb, entities);

    // Positive assertions (what SHOULD be present)
    expect(result).toContain('Creates Axios client with base URL `https://api.example.com`');

    // Negative assertions (what SHOULD NOT be present) — MANDATORY
    expect(result).not.toContain('auth.example.com'); // Should NOT include other instance
    expect(result).not.toContain('Express'); // Should NOT confuse with Express routes
    expect(result).not.toContain('Mongoose'); // Should NOT confuse with Mongoose
  });
});
```

**Negative Assertion Requirement (Review Feedback):**
- **MANDATORY:** Every integration test must include ≥1 negative assertion
- **Purpose:** Catch selection bugs where patterns detect wrong entities
- **Examples:** Verify HTTP client patterns don't confuse Express routes, Mongoose models, or other HTTP instances

**Coverage Target:** ≥80% branch coverage per pattern module

#### Integration Tests (Day 6-7)
**File:** `tests/integration/http-clients-patterns.test.ts`

**KB Chunk Assertions:**
```typescript
it('generates HTTP client chunks with correct confidence', async () => {
  const kb = await runAnalysis('fixtures/accuracy/http-clients/001-axios-basic.ts');

  const chunks = kb.getBehaviorChunks({ kind: 'http-client' });

  expect(chunks.length).toBeGreaterThan(0);
  chunks.forEach(chunk => {
    expect(chunk.confidence).toBeGreaterThanOrEqual(40); // At least Medium
    expect(chunk.factSetId).toBeDefined(); // Grounding
  });
});
```

**KB Chunk Assertion Coverage Requirement (Review Feedback):**
- **MANDATORY:** All HTTP client patterns must have ≥1 KB chunk assertion test
- **Purpose:** Verify confidence scoring, factSet attribution, and behavioral regression prevention
- **Target:** 8 pattern modules = 8 KB chunk assertion tests minimum

**Finalization Scenario:**
```typescript
it('resolves HTTP client QIDs via finalization', async () => {
  const kb = await runAnalysis('fixtures/accuracy/http-clients/002-dynamic-config.ts');

  const qids = kb.getOpenQuestions();
  expect(qids).toContain('q:abcd1234'); // QID for dynamic base URL

  const answers = { 'q:abcd1234': 'Base URL is https://api.prod.example.com' };
  await finalize(kb, answers);

  const updatedQids = kb.getOpenQuestions();
  expect(updatedQids).not.toContain('q:abcd1234'); // QID removed
});
```

### DoD for I1
- [ ] 4 pattern modules implemented (axios-client, fetch-patterns, request-response-transform, error-handling)
- [ ] Unit tests: ≥80% coverage, polluted datasets, positive/negative assertions
- [ ] Integration tests: KB chunks, confidence validation, finalization
- [ ] Full test suite green: `npm test` (all 1155+ tests passing)
- [ ] Zero regressions in Express patterns

---

## 4) Advanced Patterns — I2 (Days 8-10)

### Objective
Implement retry logic, timeouts, circuit breakers, interceptors, and auth header injection.

### Patterns to Implement

#### 4.1 Retry & Backoff Logic
**File:** `src/reasoning/patterns/http-clients/retry-backoff.ts`

**Detection Rules:**
1. Retry loops: `for (let i = 0; i < maxRetries; i++)`
2. Exponential backoff: `await sleep(baseDelay * 2 ** attempt)`
3. Retry libraries: `axios-retry`, `p-retry`
4. Conditional retries: Only on network errors or 5xx status codes

**Confidence Scoring:**
- **High (≥70):** Explicit retry logic with backoff strategy
- **Medium (40-69):** Basic retry without backoff
- **Low (<40):** Unclear retry semantics → emit Open Question

**Behavior Chunks:**
- "Retries failed requests up to 3 times with exponential backoff"
- "Only retries on network errors and 503 status codes"
- "Uses `axios-retry` library with default config"

#### 4.2 Timeout & Circuit Breaker Patterns
**File:** `src/reasoning/patterns/http-clients/timeout-circuit-breaker.ts`

**Detection Rules:**
1. Timeout config: `timeout: 5000` in Axios config or `AbortSignal.timeout()` for Fetch
2. Circuit breaker libraries: `opossum`, custom implementations
3. Fallback behavior: Return cached data, return error response, throw error

**Confidence Scoring:**
- **High (≥70):** Explicit timeout + circuit breaker with fallback
- **Medium (40-69):** Timeout only, no circuit breaker
- **Low (<40):** No timeout handling → emit Open Question

**Behavior Chunks:**
- "Aborts requests after 10 seconds"
- "Opens circuit after 5 consecutive failures, half-opens after 30 seconds"
- "Returns cached response when circuit is open"

#### 4.3 Axios Interceptors
**File:** `src/reasoning/patterns/http-clients/axios-interceptors.ts`

**Detection Rules:**
1. `axios.interceptors.request.use()` → Request interceptors
2. `axios.interceptors.response.use()` → Response interceptors
3. Common patterns: Auth token injection, logging, error transformation

**Confidence Scoring:**
- **High (≥70):** Static interceptor registration with clear purpose
- **Medium (40-69):** Interceptors with dynamic behavior
- **Low (<40):** Runtime-conditional interceptors → emit Open Question

**Behavior Chunks:**
- "Injects `Authorization: Bearer ${token}` header in request interceptor"
- "Logs all requests with timestamp and correlation ID"
- "Transforms 401 errors to trigger logout flow in response interceptor"

#### 4.4 Authentication Header Injection
**File:** `src/reasoning/patterns/http-clients/auth-headers.ts`

**Detection Rules:**
1. Static headers: `headers: { Authorization: 'Bearer token' }`
2. Dynamic headers: `headers: { Authorization: \`Bearer ${getToken()}\` }`
3. Per-request headers: `axios.get(url, { headers: { ... } })`

**Confidence Scoring:**
- **High (≥70):** Auth headers from secure storage (env vars, secrets manager)
- **Medium (40-69):** Auth headers from config or constants
- **Low (<40):** Hardcoded credentials → emit Open Question + security warning

**Behavior Chunks:**
- "Includes API key from `process.env.API_KEY` in all requests"
- "Fetches JWT token from secure storage before each request"
- "**Security Risk:** Hardcoded API key in source code (QID: q:sec001)"

### Testing Strategy

#### Unit Tests (Day 9)
**Focus on pattern-specific edge cases:**
- Retry logic with max attempts boundary conditions (0, 1, 10, 100)
- Exponential backoff calculations (overflow, precision)
- Timeout edge cases (0ms, 1ms, Infinity)
- Interceptor ordering (multiple interceptors on same axis)

**Polluted Datasets:**
- Multiple retry strategies in same codebase
- Mix of Axios retry config + manual retry loops
- Timeout at instance level vs. per-request override

#### Integration Tests (Day 10)
**Cross-pattern scenarios:**
- Axios instance with retry + timeout + interceptors
- Fetch wrapper with retry + circuit breaker
- Express route calling HTTP client with all patterns active

**KB Linking Validation:**
```typescript
it('links HTTP calls in Express routes to retry/error patterns', async () => {
  const kb = await runAnalysis('fixtures/accuracy/http-clients/005-express-integration.ts');

  const routeChunk = kb.getBehaviorChunk({ name: 'GET /users' });
  const httpCallChunk = kb.getBehaviorChunk({ name: 'axios.get' });

  expect(routeChunk.content).toContain('calls external API with retry logic');
  expect(httpCallChunk.content).toContain('retries up to 3 times');
  expect(routeChunk.linkedChunks).toContain(httpCallChunk.id); // Cross-link
});
```

### DoD for I2
- [ ] 4 additional pattern modules (retry-backoff, timeout-circuit-breaker, axios-interceptors, auth-headers)
- [ ] Unit tests: Edge cases, polluted datasets, boundary conditions
- [ ] Integration tests: Cross-pattern scenarios, KB linking validation
- [ ] Full test suite green: `npm test`
- [ ] No performance regressions (runtime <10% increase on tiny-express)

---

## 5) Validation Tooling — Critical Deliverable (Days 11-12)

### Objective
Implement `scripts/run-backend-validation.mjs` to automate validation on real-world backend projects.

### Requirements (from phase6/plan.md §6)

#### Script Features
1. **Accepts list of project directories** as arguments
   ```bash
   npm run scripts/run-backend-validation.mjs -- /path/to/project1 /path/to/project2
   ```

2. **Runs ceps in both modes:**
   - `ceps <dir> --llm off --deterministic`
   - `ceps <dir> --llm on`

3. **Captures metrics:**
   - Exit codes (0=success, 2=gate failure)
   - Gate status (Coverage/Link/Grounding/Confidence: PASS/FAIL)
   - Runtime (seconds)
   - Peak memory (RSS in MB)
   - Spec.md outputs (file paths)

4. **Generates structured JSON:**
   ```json
   {
     "project": "/path/to/project1",
     "runs": [
       {
         "mode": "llm-off",
         "exitCode": 0,
         "gates": { "coverage": "PASS", "link": "PASS", "grounding": "PASS", "confidence": "PASS" },
         "runtime": 45.3,
         "peakRSS": 512,
         "specFiles": ["spec.md", "src/spec.md", "src/routes/spec.md"]
       },
       {
         "mode": "llm-on",
         "exitCode": 0,
         "gates": { "coverage": "PASS", "link": "PASS", "grounding": "PASS", "confidence": "PASS" },
         "runtime": 120.5,
         "peakRSS": 768,
         "specFiles": ["spec.md", "src/spec.md", "src/routes/spec.md"]
       }
     ],
     "behaviors": [
       { "id": "route-1", "file": "src/routes/users.ts", "detected": null, "accurate": null, "notes": "" }
     ]
   }
   ```

5. **Manual annotation workflow:**
   - Human reviews generated spec.md files
   - Annotates JSON with labels: `detected: true/false`, `accurate: true/false/partial`
   - Categories: Express routes, Mongoose models, HTTP calls, middleware, error handling

6. **Computes accuracy metrics after annotation:**
   ```bash
   npm run scripts/run-backend-validation.mjs -- --compute-metrics validation-results.json
   ```
   - **True Positive:** detected=true, accurate=true
   - **False Positive:** detected=true, accurate=false
   - **False Negative:** detected=false (should have been detected)
   - **Precision:** TP / (TP + FP)
   - **Recall:** TP / (TP + FN)
   - **F1:** 2 * P * R / (P + R)

7. **Outputs validation report:**
   Uses template from `docs/planning/active/phase6/plan.md` Appendix A:
   - Executive summary (Go/No-Go recommendation)
   - Per-project results (precision, recall, F1, gate status)
   - Pattern detection breakdown table
   - Known gaps (Agenda.js, Redis, etc.)
   - Architectural issues (if any)
   - Finalization workflow test results

#### Reusability Requirements (Review Feedback)
The validation script must be reusable for future agents (React, Redux, GraphQL):

**Configuration File Support:**
- Accept optional config file path: `--config validation-config.json`
- Config structure:
  ```json
  {
    "validationTargets": ["../project1", "../project2"],
    "thresholds": { "precision": 0.85, "recall": 0.80, "f1": 0.82 },
    "reportTemplatePath": "docs/planning/active/phase6/plan.md",
    "frameworkName": "http-clients",
    "behaviorCategories": ["HTTP Calls", "Retry Logic", "Error Handling"]
  }
  ```

**Framework-Agnostic Metrics:**
- Metrics computation should not hardcode HTTP-specific categories
- Use `behaviorCategories` array from config (or CLI args)
- Report template should be parameterized with framework name

**Extensibility:**
- Future agents should be able to run validation with minimal code changes
- Example: `npm run scripts/run-backend-validation.mjs -- --config react-validation.json`

### Implementation Steps

#### Day 11: Script Core
1. **Argument parsing:** Accept project directories, flags (--compute-metrics)
2. **ceps execution:** Spawn child processes, capture stdout/stderr
3. **Metrics extraction:** Parse exit codes, gate status from output
4. **JSON generation:** Write structured results to file

#### Day 12: Annotation & Reporting
1. **Manual review workflow:** CLI prompts for annotations (or use JSON editor)
2. **Metrics computation:** Implement precision/recall/F1 calculation
3. **Report generation:** Populate validation report template with data
4. **Testing:** Run on tiny-express fixture, verify metrics accuracy

### Testing Strategy

#### Unit Tests
**File:** `tests/scripts/run-backend-validation.test.ts`

```typescript
describe('Backend Validation Script', () => {
  it('executes ceps in both modes', async () => {
    const result = await runValidation(['fixtures/tiny-express']);

    expect(result.runs).toHaveLength(2);
    expect(result.runs[0].mode).toBe('llm-off');
    expect(result.runs[1].mode).toBe('llm-on');
  });

  it('computes accuracy metrics from annotations', () => {
    const annotations = [
      { detected: true, accurate: true },   // TP
      { detected: true, accurate: false },  // FP
      { detected: false, accurate: null },  // FN
    ];

    const metrics = computeMetrics(annotations);

    expect(metrics.precision).toBeCloseTo(0.5);  // 1 / (1 + 1)
    expect(metrics.recall).toBeCloseTo(0.5);     // 1 / (1 + 1)
    expect(metrics.f1).toBeCloseTo(0.5);
  });
});
```

#### Integration Tests
**File:** `tests/integration/validation-script.test.ts`

```typescript
it('generates validation report for tiny-express', async () => {
  const result = await runValidation(['tests/fixtures/phase5/baseline/tiny-express']);

  expect(result.runs[0].exitCode).toBe(0);
  expect(result.runs[0].gates.coverage).toBe('PASS');
  expect(result.specFiles.length).toBeGreaterThan(0);
});
```

### DoD for Validation Tooling
- [ ] Script implemented: `scripts/run-backend-validation.mjs`
- [ ] Features complete: Execution, metrics capture, JSON output, annotation workflow, metrics computation
- [ ] Unit tests: Argument parsing, metrics calculation, report generation
- [ ] Integration tests: Run on tiny-express, verify all metrics captured
- [ ] Documentation: Usage instructions in script header comments
- [ ] Manual test: Run on 1 real project (if available), verify workflow end-to-end

---

## 6) Integration & Handoff (Days 13-14)

### Objectives
1. Complete cross-workstream DoD requirements
2. Update documentation and release notes
3. Prepare for real-world validation (Week 2)

### Tasks

#### 6.1 Lexicon Updates (Day 13 AM)
**File:** `docs/lexicon.md`

**New Terms (estimated 10-15):**
- **Approved terms:**
  - Axios client, Fetch wrapper, HTTP request, HTTP response
  - Request interceptor, response interceptor, retry logic, exponential backoff
  - Timeout, circuit breaker, auth header, bearer token
  - Status code, network error, API endpoint

- **Anti-patterns:**
  - RESTful API (too generic, prefer "HTTP API")
  - AJAX (deprecated term, use "HTTP request")
  - XMLHttpRequest (legacy API, flag as outdated)

**Validator Tests:**
```typescript
describe('HTTP Clients Lexicon', () => {
  it('accepts approved HTTP client terms', () => {
    expect(validator.validate('Axios client')).toBe(true);
    expect(validator.validate('retry logic')).toBe(true);
    expect(validator.validate('circuit breaker')).toBe(true);
  });

  it('rejects legacy/generic anti-patterns', () => {
    expect(validator.validate('AJAX call')).toBe(false);
    expect(validator.validate('XMLHttpRequest')).toBe(false);
  });

  it('handles compound words correctly', () => {
    expect(validator.validate('request interceptor')).toBe(true);
    expect(validator.validate('intercept request')).toBe(true); // NOT anti-pattern
  });
});
```

**Workflow:**
1. Extract terms from pattern prose: `npm run scripts/extract-new-terms.mjs -- http-clients`
2. Submit to `#ceps-phase6` for architect review (24h SLA)
3. Write validator tests (word-boundary safe)
4. Run full validator suite: 51+15 = 66 tests passing

**Lexicon Approval Fallback (Review Feedback):**
- **If architect unavailable:** Agent 6 serves as backup reviewer (per Communication Plan §11)
- **If both unavailable:** Defer lexicon approval to Day 14 (non-blocking for I1/I2 implementation)
- **Rationale:** Avoid blocking pattern implementation on approval delays; lexicon can be finalized in integration phase

#### 6.2 Coverage Matrix Update (Day 13 PM)
**File:** `docs/pattern-coverage.md`

**Add rows:**
| Pattern | Behaviors Detected | Confidence Range | Known Gaps |
|---------|-------------------|------------------|------------|
| Axios Client Initialization | baseURL, timeout, headers, auth config | 50-90 | Dynamic config from DB |
| Fetch Wrapper Patterns | Error handling, JSON parsing, custom errors | 60-85 | Streaming responses |
| Request/Response Transformation | camelCase/snake_case, date parsing, filters | 55-80 | Complex nested transforms |
| Retry & Backoff Logic | Max retries, backoff strategy, conditional retries | 65-90 | Custom retry libraries (non-Axios) |
| Timeout & Circuit Breaker | Timeout duration, circuit state, fallback | 60-85 | Advanced circuit breaker configs |
| Axios Interceptors | Request/response hooks, auth injection, logging | 70-90 | Runtime-conditional interceptors |
| Auth Header Injection | Bearer tokens, API keys, per-request auth | 55-80 | OAuth flows, token refresh |
| HTTP Error Handling | Status code checks, custom error classes, retries | 65-85 | Complex error recovery strategies |

**Script Usage:**
```bash
npm run scripts/update-pattern-matrix.mjs
```

#### 6.3 Finalization Integration Test (Day 13 PM)
**File:** `tests/integration/http-clients-finalization.test.ts`

**Scenario:**
```typescript
it('resolves HTTP client QIDs via finalization', async () => {
  // 1. Run ceps on fixture with dynamic config
  const kb = await runAnalysis('fixtures/accuracy/http-clients/010-dynamic-base-url.ts');

  // 2. Verify QID generated for low-confidence behavior
  const qids = kb.getOpenQuestions();
  expect(qids.some(q => q.includes('base URL'))).toBe(true);

  // 3. Create answers.md with resolution
  const answersPath = 'fixtures/accuracy/http-clients/answers.md';
  fs.writeFileSync(answersPath, `q:abcd1234: Base URL is https://api.prod.example.com`);

  // 4. Run finalization
  await finalize(kb, answersPath);

  // 5. Verify QID removed, Finalization Summary added
  const updatedQids = kb.getOpenQuestions();
  expect(updatedQids.some(q => q.includes('base URL'))).toBe(false);

  const spec = fs.readFileSync('fixtures/accuracy/http-clients/spec.md', 'utf-8');
  expect(spec).toContain('Finalization Summary');
  expect(spec).toContain('https://api.prod.example.com'); // Resolved value
});
```

#### 6.4 KB Chunk Assertions (Day 13 PM)
**File:** `tests/integration/http-clients-kb-chunks.test.ts`

**Assertions:**
```typescript
it('generates HTTP client chunks with correct confidence bands', async () => {
  const kb = await runAnalysis('fixtures/accuracy/http-clients/');

  const chunks = kb.getBehaviorChunks({ kind: 'http-client' });

  chunks.forEach(chunk => {
    expect(chunk.confidence).toBeGreaterThanOrEqual(40); // At least Medium
    expect(chunk.factSetId).toBeDefined(); // Grounding
    expect(chunk.content).not.toContain('AJAX'); // No anti-patterns
  });
});

it('links HTTP calls to Express routes correctly', async () => {
  const kb = await runAnalysis('fixtures/accuracy/http-clients/express-integration/');

  const routeChunk = kb.getBehaviorChunk({ name: 'GET /users' });
  const httpChunk = kb.getBehaviorChunk({ name: 'axios.get' });

  expect(routeChunk.linkedChunks).toContain(httpChunk.id);
  expect(httpChunk.content).toContain('retry logic');
});
```

#### 6.5 Error Handling Contract Test (Day 14 AM)
**File:** `tests/reasoning/http-clients/error-handling.test.ts`

**Prove patterns emit Open Questions, never crash:**
```typescript
it('emits Open Question for malformed HTTP config', () => {
  const malformedEntity = {
    id: 'http-1',
    kind: 'constant',
    facts: [
      { predicate: 'initializer', value: '{ invalid json' } // Malformed
    ]
  };

  expect(() => {
    axiosClientPattern.describe(kb, [malformedEntity]);
  }).not.toThrow(); // Must NOT crash

  const qids = kb.getOpenQuestions();
  expect(qids.some(q => q.includes('malformed'))).toBe(true); // Open Question emitted
});
```

#### 6.6 Golden Spec Updates (Day 14 AM)
**Update:** `tests/fixtures/phase5/baseline/tiny-express/expected/spec.md`

**Changes:**
- Add HTTP client documentation for outbound API calls
- Update route handlers to describe external API dependencies
- Verify cross-links from routes → HTTP calls

**Workflow:**
1. Run ceps on tiny-express: `npm run ceps tests/fixtures/phase5/baseline/tiny-express`
2. Review generated spec.md, compare to expected
3. Update expected spec.md if HTTP client patterns are correct
4. Regenerate snapshot: `npx tsx scripts/regenerate-phase5-snapshot.mjs`
5. Verify snapshot test: `npm test -- --run tests/integration/snapshot-capture.test.ts`

#### 6.7 Full Test Suite Validation (Day 14 PM)
**Run complete test suite:**
```bash
npm test
```

**Expected results:**
- All 1155+ tests passing (0 regressions)
- Coverage ≥93% maintained
- New HTTP client tests: ~50 additional tests
- Lexicon validator: 66/66 tests passing

**Gate Validation Checkpoints (Review Feedback):**
Run `ceps` on test fixture to verify all quality gates pass before claiming iteration complete:
```bash
npm run ceps tests/fixtures/phase5/baseline/tiny-express
```

**Expected Gate Status:**
- ✅ Coverage Gate: PASS (100% exported surfaces documented or have QIDs)
- ✅ Link Gate: PASS (No broken cross-links)
- ✅ Grounding Gate: PASS (All chunks have factSetId)
- ✅ Confidence Gate: PASS (Low confidence → Open Question; Medium/High → assertive prose)

**If any gate fails:**
- Investigate pattern bugs (not just test bugs)
- Fix underlying issue in pattern modules
- Re-run gate validation
- **DO NOT** proceed to handoff until all gates green

**If failures:**
- Investigate root cause (pattern bug, test bug, regression)
- Fix before claiming iteration complete
- Re-run full suite

#### 6.8 Release Notes (Day 14 PM)
**File:** `docs/internal/PHASE6_HTTP_CLIENTS_RELEASE_NOTES.md`

**Content:**
- Feature summary: HTTP client pattern library for Axios/Fetch
- Patterns added: 8 modules (list with descriptions)
- Lexicon updates: 15 new terms
- Integration: Express routes now document outbound HTTP calls
- Known gaps: OAuth flows, streaming responses, custom retry libraries
- Next steps: Real-world validation (Week 2)

---

## 7) Fixture Strategy & Accuracy Harness

### Polluted Dataset Requirements

#### Fixture Types
| Type | Purpose | Example File |
|------|---------|--------------|
| **Multiple Axios instances** | Test config selection logic | `001-multi-instance.ts` |
| **Axios + Fetch mixed** | Test framework detection | `002-mixed-clients.ts` |
| **Shared interceptors** | Test instance vs. global config | `003-shared-interceptors.ts` |
| **Per-request overrides** | Test precedence rules | `004-per-request-config.ts` |
| **Retry loops** | Test manual vs. library retries | `005-retry-patterns.ts` |
| **Circuit breaker** | Test fallback behavior | `006-circuit-breaker.ts` |
| **Express integration** | Test cross-framework linking | `007-express-routes.ts` |
| **Security anti-patterns** | Test hardcoded credentials detection | `008-hardcoded-secrets.ts` |
| **OSS-derived** | Test real-world patterns | `009-oss-snippet.ts` |

#### Ground Truth Format
**File:** `tests/fixtures/accuracy/http-clients/001-multi-instance.json`

```json
{
  "id": "001-multi-instance",
  "description": "Multiple Axios instances with different base URLs",
  "snippet": "const apiClient = axios.create({ baseURL: 'https://api.example.com' }); const authClient = axios.create({ baseURL: 'https://auth.example.com' });",
  "expectedBehaviors": [
    "Creates Axios client `apiClient` with base URL `https://api.example.com`",
    "Creates Axios client `authClient` with base URL `https://auth.example.com`"
  ],
  "mustNotContain": [
    "Express router",
    "Mongoose model"
  ],
  "minimumConfidence": 70,
  "patterns": ["axios-client"]
}
```

### Accuracy Harness Mechanics

#### Corpus Curation (Day 7)
1. **Day 7 AM:** Collect 20 snippets from OSS + synthetic cases
2. **Day 7 PM:** Annotate ground truth JSON files
3. **Day 8 AM:** Submit to architect for review (24h SLA)
4. **Day 9 AM:** Address feedback, expand to 30-50 snippets

#### Running Accuracy Tests
**Script:** `scripts/run-tier0-accuracy.mjs`

**Usage:**
```bash
npm run scripts/run-tier0-accuracy.mjs -- http-clients
```

**Expected output:**
```
HTTP Clients Pattern Accuracy Report
====================================
Snippets tested: 50
True Positives: 45
False Positives: 2
False Negatives: 3

Precision: 0.957 (45 / 47)
Recall: 0.938 (45 / 48)
F1 Score: 0.947

Threshold: ≥0.90 ✅ PASS
```

**Failure Response:**
- If F1 < 0.90: Block merge, refine patterns
- If false positives: Add negative assertions to tests
- If false negatives: Expand detection rules, increase coverage

---

## 8) Cross-Workstream DoD Compliance

### Mandatory Deliverables Checklist

From `IMPLEMENTATION_PLAN_PHASE6.md` §3.8:

- [ ] **Lexicon update + validator test** covering new HTTP client terminology (§6.1)
- [ ] **Coverage matrix row** in `docs/pattern-coverage.md` (§6.2)
- [ ] **Finalization integration test** proving QIDs can be resolved (§6.3)
- [ ] **KB chunk assertions** (positive + negative) verifying confidence/factSet attribution (§6.4)
- [ ] **Error-handling contract** tests showing patterns emit Open Questions, never crash (§6.5)
- [ ] **Golden specs updated:** `tiny-express/expected/spec.md` + snapshot regenerated (§6.6)
- [ ] **Full test suite:** `npm test` green (not just targeted suites) (§6.7)

### Additional Requirements
- [ ] **Validation tooling:** `run-backend-validation.mjs` delivered and tested (§5)
- [ ] **Release notes:** Feature summary for M3 package (§6.8)
- [ ] **Lessons doc:** Update if new pitfalls discovered (optional)

---

## 9) Risk Management

### Identified Risks

| Risk | Impact | Mitigation | Owner |
|------|--------|------------|-------|
| **Parser limitations for dynamic HTTP config** | Low confidence → many Open Questions | Document limitations, emit QIDs, defer complex cases | Agent 5 |
| **Competing with Express patterns** | Axios route handlers confused with Express routes | Polluted datasets, namespace tests, negative assertions | Agent 5 |
| **Retry library diversity** | Missing non-Axios retry patterns | Document known gaps, focus on Axios/Fetch built-in retries | Agent 5 |
| **Security anti-pattern false positives** | Flagging test fixtures as hardcoded secrets | Allowlist patterns (e.g., `// test secret`), emit Medium confidence | Agent 5 |
| **Validation script complexity** | Delayed delivery, incomplete features | Time-box to 2 days, prioritize core features (execution + JSON output) | Agent 5 |
| **Test suite regressions** | Express tests break due to KB changes | Run full suite frequently (after each module), fix immediately | Agent 5 |
| **Lexicon approval delays** | Iteration blocked on architect review | Submit early (Day 13 AM), use 24h SLA + backup reviewer (Agent 6) | Agent 5 |

### Contingency Plans

**If parser limitations severe:**
- Document in Phase -1 analysis
- Coordinate with WS-C (Parser) for future enhancements
- Focus on high-confidence patterns (static configs)
- Defer dynamic patterns to post-M3

**If validation script delayed:**
- Deliver MVP (execution + JSON output only)
- Manual annotation workflow documented
- Metrics computation deferred to Week 2

**If test suite regressions unfixable:**
- Escalate to Agent 1 (Express) for consultation
- Roll back breaking changes
- Implement fix in separate iteration

---

## 10) Success Criteria & Exit Criteria

### Success Criteria (from §0)
1. ✅ **Pattern Accuracy:** F1 ≥0.90 on curated HTTP client fixtures
2. ✅ **Integration Quality:** HTTP calls in Express routes documented with retry/error detail
3. ✅ **Zero Regressions:** All 1155 existing tests remain green
4. ✅ **Backend Coherence:** Request→routing→persistence→external-API cycle fully documented
5. ✅ **Validation Readiness:** `run-backend-validation.mjs` delivered and tested

### Exit Criteria (Wave 1A)

#### Code Complete
- [ ] 8 pattern modules implemented with ≥80% coverage
- [ ] 50+ tests added (unit + integration)
- [ ] Full test suite green: 1205+ tests passing, 93%+ coverage
- [ ] Zero regressions in Express/Mongoose patterns

#### Documentation Complete
- [ ] Lexicon: 15 new terms + anti-patterns, 66/66 validator tests passing
- [ ] Coverage matrix: 8 rows added
- [ ] Release notes: Feature summary ready for M3 package
- [ ] Phase -1 analysis: Documented parser limitations and fixture strategy

#### Validation Tooling Complete
- [ ] `run-backend-validation.mjs` delivered
- [ ] Features: Execution, metrics capture, JSON output, annotation workflow, metrics computation
- [ ] Tested on tiny-express fixture
- [ ] Usage instructions documented

#### Integration Complete
- [ ] KB chunk assertions: Confidence, factSet attribution, cross-links verified
- [ ] Finalization: QID resolution tested end-to-end
- [ ] Golden specs: tiny-express updated, snapshot regenerated
- [ ] Error handling: Patterns emit Open Questions, never crash

#### Handoff Ready
- [ ] Release notes shared in `#ceps-phase6`
- [ ] Validation script shared with Agent 6 (shadow observer)
- [ ] Code reviewed and approved by architect
- [ ] Ready for real-world validation (Week 2)

---

## 11) Coordination & Communication

### Stakeholders
- **Agent 1 (Express):** Consult on integration patterns, KB linking
- **Agent 6 (Performance):** Shadow observer for validation process, harness prototyping
- **Architect:** Lexicon approval (24h SLA), code review, validation plan approval
- **Project Lead:** Timeline approval, validation target selection, resource allocation

### Communication Cadence

#### Daily Updates (Async)
**Channel:** `#ceps-phase6`

**Format:**
```
Agent 5 — Day X Update
Yesterday: Phase -1 analysis (Axios instance detection)
Today: Implement axios-client pattern + unit tests
Blockers: None
Metrics: 0/8 modules, 0/50 tests, accuracy F1: N/A
```

#### Weekly Sync (30 min)
**Participants:** All Phase 6 agents + architect + project lead

**Agenda:**
- Progress updates (1 min per agent)
- Blockers & cross-dependencies (5 min)
- Lexicon approvals (5 min)
- Validation planning (10 min)
- Next week priorities (5 min)

#### Milestone Reviews
**Checkpoints:**
- **Day 7 (I1 complete):** Demo basic HTTP client detection
- **Day 10 (I2 complete):** Demo retry/interceptor patterns
- **Day 14 (Wave 1A complete):** Demo validation script, review exit criteria

### Escalation Protocol
- **Blocker >24h:** Raise in `#ceps-phase6` + weekly sync
- **Lexicon approval delayed:** Escalate to Agent 6 (backup reviewer)
- **Validation script complexity:** Escalate to project lead (scope reduction decision)
- **Test suite regression:** Escalate to Agent 1 (Express) for consultation

---

## 12) Lessons Learned (To Be Updated)

### Lessons from Express (Agent 1)
1. **Always do Phase -1 analysis** before writing tests (saves 2 days of debugging)
2. **Use polluted datasets** in tests (competing candidates catch selection bugs)
3. **Run FULL test suite** (`npm test`) before claiming iteration complete
4. **Add word-boundary tests** for anti-patterns (regex bugs hide in compound words)
5. **Run benchmarks early** (after I3, not just I5) to catch performance regressions

### New Lessons (To Be Discovered)
- TBD after implementation

### Lessons Doc Update Process (Review Feedback)
**When to update lessons docs:**
- If new pitfalls discovered during implementation → create `docs/internal/PHASE6_HTTP_CLIENTS_LESSONS.md`
- If lessons apply to all Tier-0 agents → contribute to shared `docs/internal/PHASE6_EXPRESS_LESSONS.md`
- Update during Day 14 (Integration & Handoff) if significant learnings emerge

**Documentation target:**
- HTTP-specific lessons → separate doc for future HTTP-related patterns
- General pattern development lessons → add to Express lessons doc (shared resource)

---

## 13) Appendices

### Appendix A: Phase -1 Analysis Template

**File:** `docs/internal/analysis/phase6-http-clients-phase-minus-one.md`

**Sections:**
1. **Objective:** Understand parser output for HTTP client patterns
2. **Methodology:** Instrumentation, OSS samples, parser inspection
3. **Findings:**
   - Entity kinds emitted
   - Available predicates
   - Namespace semantics
   - Parser limitations
4. **Fixture Requirements:** Polluted datasets needed
5. **Recommendations:** Pattern detection strategy
6. **Appendix:** Code examples, KB dumps

### Appendix B: Ground Truth JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "description": { "type": "string" },
    "snippet": { "type": "string" },
    "expectedBehaviors": { "type": "array", "items": { "type": "string" } },
    "mustNotContain": { "type": "array", "items": { "type": "string" } },
    "minimumConfidence": { "type": "number", "minimum": 0, "maximum": 100 },
    "patterns": { "type": "array", "items": { "type": "string" } }
  },
  "required": ["id", "snippet", "expectedBehaviors", "minimumConfidence"]
}
```

### Appendix C: Validation Report Template

See `docs/planning/active/phase6/plan.md` Appendix A for full template.

**Key Sections:**
- Executive Summary (Go/No-Go)
- Per-Project Results (precision, recall, F1, gates)
- Pattern Detection Breakdown
- Known Gaps
- Architectural Issues (if any)
- Finalization Workflow Test
- Recommendations

---

## 14) Approval & Next Steps

### Document Status
**Status:** ✅ **APPROVED FOR IMPLEMENTATION**
**Version:** 1.1 (Updated with review feedback)
**Date:** 2025-11-08
**Review Date:** 2025-11-08

### Approval Process
1. ✅ **Code Review Agent:** Architecture, testing, compliance — **APPROVED**
2. [ ] **Project Lead Review:** Verify alignment with backend-first strategy, timeline feasibility — **PENDING**
3. [ ] **Agent 1 (Express) Review:** Confirm integration patterns, KB linking approach — **OPTIONAL**
4. [ ] **Agent 6 Review:** Shadow observer role, validation script coordination — **OPTIONAL**

### Review Outcome
**Code Review Agent Verdict:** ✅ **APPROVED WITH HIGH-PRIORITY RECOMMENDATIONS**

**High-Priority Recommendations (Incorporated):**
- ✅ Recommendation 1: Negative assertions emphasized in testing strategy (§3)
- ✅ Recommendation 4: Parser enhancement fallback strategy added (§2)
- ✅ Recommendation 6: Gate validation checkpoints added (§6.7)

**Medium-Priority Recommendations (Incorporated):**
- ✅ Recommendation 3: Reusability requirements for validation script (§5)
- ✅ Recommendation 5: Lexicon approval fallback plan (§6.1)
- ✅ Recommendation 7: Lessons doc update process (§12)

### Review Checklist
- ✅ Timeline feasible (2 weeks for 8 modules + validation tooling)
- ✅ Pattern scope appropriate (Tier-0 only, defer complex cases)
- ✅ Testing strategy comprehensive (polluted datasets, KB assertions, finalization)
- ✅ Validation tooling requirements clear (features, timeline, deliverables, reusability)
- ✅ Cross-workstream DoD compliance confirmed
- ✅ Risk mitigation adequate with fallback plans
- ✅ Gate validation checkpoints explicit
- ✅ Negative assertion requirements emphasized

### Conditions for Implementation Start
1. ✅ Address High Priority recommendations (COMPLETE)
2. ✅ Update plan document with clarifications (COMPLETE)
3. ✅ Lexicon approval fallback specified (COMPLETE)
4. [ ] Project Lead approval (PENDING)

### Next Steps After Final Approval
1. **Day 1:** Begin Phase -1 analysis (parser instrumentation)
2. **Day 3:** Submit Phase -1 analysis doc for architect review
3. **Day 4:** Start I1 implementation (core patterns)
4. **Day 7:** I1 complete, demo to stakeholders
5. **Day 10:** I2 complete (advanced patterns)
6. **Day 12:** Validation tooling complete
7. **Day 14:** Wave 1A complete, ready for real-world validation

---

## 15) Review Feedback Changelog

**Version 1.1 Changes (2025-11-08):**

### High-Priority Updates
1. **§3 Testing Strategy:** Added mandatory negative assertion requirement with examples
2. **§2 Phase -1 Analysis:** Added parser enhancement fallback strategy
3. **§6.7 Full Test Suite Validation:** Added explicit gate validation checkpoints

### Medium-Priority Updates
4. **§5 Validation Tooling:** Added reusability requirements (config file, framework-agnostic metrics)
5. **§6.1 Lexicon Updates:** Added lexicon approval fallback plan
6. **§12 Lessons Learned:** Added lessons doc update process

### Documentation Updates
7. **§0 Status:** Updated to "Approved for Implementation" with review status
8. **§14 Approval:** Updated with review outcome and changelog
9. Added KB chunk assertion coverage target (8 tests minimum)

---

**End of Implementation Plan**
