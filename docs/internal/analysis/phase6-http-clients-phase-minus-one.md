# Phase 6 HTTP Clients: Phase -1 Analysis

**Date:** 2025-11-08
**Agent:** Agent 5 (HTTP Clients)
**Purpose:** Pre-implementation instrumentation to understand parser output for HTTP client code patterns

---

## Overview

Before implementing HTTP client pattern modules, we instrumented representative fixtures to understand what predicates the parser extracts for Axios and Fetch API patterns. This Phase -1 analysis informed the design of all 4 I1 pattern modules.

---

## Methodology

1. Created two representative fixtures:
   - `tests/fixtures/http-clients-analysis/axios-basic.ts` (7 Axios patterns)
   - `tests/fixtures/http-clients-analysis/fetch-patterns.ts` (5 Fetch patterns)

2. Created instrumentation test: `tests/unit/parser/http-clients-phase-minus-one.test.ts`
   - Runs parser on fixtures
   - Inspects entities and factSets
   - Dumps predicates to console

3. Analyzed parser output to discover:
   - Entity kinds for different code structures
   - Available predicates for pattern matching
   - Fact object formats

---

## Key Findings

### 1. Axios Client Instances → `constant` Entities

**Pattern:**
```typescript
export const apiClient = axios.create({ baseURL: '...' });
```

**Parser Output:**
- Entity kind: `constant` (NOT `function`)
- Key predicate: `initializer-call: "axios.create"`
- Config object: Not structured by parser, requires regex parsing

**Implication:** AxiosClientPattern must match `constant` entities with `initializer-call` predicate.

### 2. Fetch API Calls → `function` Entities with `calls-expression`

**Pattern:**
```typescript
export async function fetchUsers() {
  const response = await fetch('https://api.example.com/users');
  return response.json();
}
```

**Parser Output:**
- Entity kind: `function`
- Key predicates:
  - `calls-expression: "fetch"`
  - `calls-expression: "response.json"`
  - `is-async: true`
  - `returns-promise: true`

**Implication:** FetchPattern and RequestResponseTransformPattern can match on `calls-expression` for `fetch` and `response.json()`.

### 3. Error Handling → Multiple Predicates

**Pattern:**
```typescript
export async function safeFetch(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Fetch failed:', error);
    throw error;
  }
}
```

**Parser Output:**
- Key predicates:
  - `has-try-catch: true`
  - `checks-property: "response.ok"`
  - `checks-property: "response.status"`
  - `calls-expression: "fetch"`

**Implication:** HttpErrorHandlingPattern can detect HTTP-specific error handling by looking for HTTP calls + error handling predicates.

### 4. Call Arguments → `call-arg-N` Predicates

**Pattern:**
```typescript
const response = await fetch('https://api.example.com/users');
```

**Parser Output:**
- Predicate: `call-arg-0: "https://api.example.com/users"`
- Object value: Full URL string

**Implication:** Patterns can extract URLs for more detailed descriptions.

### 5. Boolean Facts → Predicate Presence

**Critical Discovery:**
- Parser emits `has-try-catch: true` as a fact
- BUT: `hasFact()` helper expects string/RegExp for value matching
- Calling `hasFact(kb, entity, 'has-try-catch', true)` FAILS because it compares `String(fact.object) === true` (string "true" vs boolean true)

**Fix:** Use `hasFact(kb, entity, 'has-try-catch')` without value parameter to check for predicate presence only.

**Applied to:** FetchPattern, HttpErrorHandlingPattern

---

## Parser Predicate Catalog

### HTTP Client Predicates

| Predicate | Example Value | Used By Pattern |
|-----------|---------------|-----------------|
| `initializer-call` | `"axios.create"` | AxiosClientPattern |
| `calls-expression` | `"fetch"`, `"axios.get"`, `"response.json"` | All patterns |
| `call-arg-0` | `"https://api.example.com/users"` | FetchPattern, AxiosClientPattern |
| `has-try-catch` | `true` | HttpErrorHandlingPattern |
| `checks-property` | `"response.ok"`, `"response.status"` | HttpErrorHandlingPattern |
| `is-async` | `true` | FetchPattern |
| `returns-promise` | `true` | FetchPattern |

### Transform Predicates

| Predicate | Example Value | Used By Pattern |
|-----------|---------------|-----------------|
| `calls-expression` | `"response.json"`, `"response.text"`, `"JSON.stringify"` | RequestResponseTransformPattern |

---

## Design Decisions Based on Findings

### 1. Entity Kind Filtering
- **AxiosClientPattern:** Filter for `kind === 'constant'` (not function)
- **All other patterns:** Filter for `kind === 'function'`

### 2. Config Parsing Strategy
Since parser doesn't structure Axios config objects, we implemented regex-based parsing:
```typescript
private parseConfig(initializerText: string): AxiosConfig {
  const baseURLMatch = initializerText.match(/baseURL\s*:\s*['"]([^'"]+)['"]/);
  const timeoutMatch = initializerText.match(/timeout\s*:\s*(\d+)/);
  const headersMatch = initializerText.match(/headers\s*:\s*\{/);

  const isDynamic = this.isDynamicConfig(initializerText);

  return {
    baseURL: baseURLMatch?.[1] || null,
    timeout: timeoutMatch ? parseInt(timeoutMatch[1], 10) : null,
    hasHeaders: !!headersMatch,
    isDynamic,
  };
}
```

### 3. Confidence Scoring
- **High:** Static config with concrete values (baseURL, URLs)
- **Medium:** Dynamic config (function calls, variables) or missing details
- **Low:** Error during analysis

### 4. Boolean Fact Matching
Always use `hasFact(kb, entity, predicate)` without value parameter for boolean predicates.

---

## Test Fixtures Created

### Phase -1 Instrumentation
- `tests/fixtures/http-clients-analysis/axios-basic.ts`
- `tests/fixtures/http-clients-analysis/fetch-patterns.ts`
- `tests/unit/parser/http-clients-phase-minus-one.test.ts`

### I1 Pattern Test Fixtures
- `tests/reasoning/http-clients/axios-client.test.ts` (12 tests)
- `tests/reasoning/http-clients/fetch-patterns.test.ts` (11 tests)
- `tests/reasoning/http-clients/request-response-transform.test.ts` (13 tests)
- `tests/reasoning/http-clients/error-handling.test.ts` (13 tests)

### Integration Test Fixtures
- `tests/fixtures/http-clients-integration/api-client.ts`
- `tests/integration/http-clients-integration.test.ts` (10 tests)

---

## Lessons Learned

### 1. Phase -1 is Critical
Without instrumenting real fixtures, we would have:
- Matched `function` entities for Axios clients (wrong - they're constants)
- Failed to detect error handling (wrong boolean matching)
- Missed URL extraction opportunities

### 2. Parser != Documentation
Never assume predicate names or entity kinds without verifying parser output first.

### 3. Test with Polluted Datasets
Phase -1 tests used isolated fixtures. I1 unit tests used polluted datasets with Express/Mongoose entities to catch false positives. Both approaches are necessary.

---

## Impact on I1 Implementation

All 4 I1 pattern modules were designed using these findings:
1. **AxiosClientPattern:** Matches `constant` entities with `initializer-call: "axios.create"`
2. **FetchPattern:** Matches `function` entities with `calls-expression: "fetch"`
3. **RequestResponseTransformPattern:** Matches `function` entities with `calls-expression: "response.json"` etc.
4. **HttpErrorHandlingPattern:** Matches `function` entities with HTTP calls + error handling predicates

**I1 Results:**
- 49 unit tests passing
- 10 integration tests passing
- Zero false positives in polluted dataset tests
- 1282 total project tests (up from 1155)

---

## Next Steps (I2)

For advanced patterns (retry, timeout, interceptors, auth), we may need additional Phase -1 analysis if parser output for those patterns is unclear. Will assess on a case-by-case basis.
