# Parser Simplification Specification

**Date:** 2025-11-15
**Phase:** 0.5 (Preparation)
**Context:** LLM-First Architecture Conversion
**Purpose:** Define which parser facts to keep/delete for Phase 2

---

## Overview

The current parser extracts ~100+ fact predicates optimized for pattern matching.
In the LLM-first architecture, the LLM will analyze source code directly,
so many pattern-specific facts become unnecessary.

This document specifies which facts to:
- **KEEP:** Structural facts needed by LLM and downstream components
- **DELETE:** Pattern-specific facts only used by PatternMatcher/IntentLifter
- **SIMPLIFY:** Facts that can be extracted with less code

---

## Current Parser Structure

**Files:**
- `src/parser/fact-extractor.ts` (775 LOC)
- `src/parser/pattern-detector.ts` (43 LOC)
- `src/parser/parser.ts` (134 LOC)
- `src/parser/aux-readers/` (71 LOC)

**Total:** ~1,023 LOC

**Target:** ~600-700 LOC (-30-40%)

---

## Fact Categories

### Category 1: KEEP - Structural Facts (Core)

**Purpose:** Basic entity metadata needed by KB, Spec Generator, Finalization

**Predicates:**
- `is-function`, `is-constant`, `is-class`, `is-method`
- `has-signature` (functions/methods)
- `has-jsdoc` (doc comments)
- `param-count`, `param-names` (function parameters)
- `is-exported` (visibility)
- `has-initializer` (constants/variables with values)
- `initializer-value` (constant values for simple types)

**Location:** `fact-extractor.ts` (lines 63-150, approx)

**Action:** **PRESERVE** - No changes needed

**Rationale:** These facts are structural metadata that the LLM cannot infer
without seeing the entire codebase context. They're needed for:
- Entity identification and deduplication
- Cross-linking (imports/exports/calls)
- Finalization impact scoping

---

### Category 2: KEEP - Relationship Facts

**Purpose:** Inter-entity relationships needed for cross-linking

**Predicates:**
- `imports` (import statements)
- `exports` (export statements)
- `calls` (function calls)
- `extends` (class inheritance)
- `implements` (interface implementation)

**Location:** `fact-extractor.ts` (relation extraction logic)

**Action:** **PRESERVE** - Critical for cross-linking

**Rationale:** The LLM cannot infer cross-file relationships without seeing
all files simultaneously (too expensive). These facts enable:
- Cross-link validation (CTS-03 §5)
- Reverse dependency graph (finalization)
- Architecture map generation

---

### Category 3: DELETE - Pattern-Specific Facts

**Purpose:** Fine-grained facts used by Express/Mongoose/HTTP pattern matchers

**Predicates (Express-specific):**

#### Middleware Detection
- `call-arg-0`, `call-arg-1`, `call-arg-2` (middleware signature detection)
- `param-sig-0`, `param-sig-1`, `param-sig-2` (parameter types)
- `has-next-call` (next() invocation)
- `param-name-0`, `param-name-1`, `param-name-2` (req/res/next names)

#### Route Detection
- `route-verb` (HTTP method)
- `route-path` (URL pattern)
- `route-handler-count`

#### Error Handler Detection
- `error-handler-signature` (4-param signature)
- `has-status-code-assignment`
- `has-error-response`

#### Mongoose-specific
- `schema-field-*` (schema field metadata)
- `model-name`
- `has-mongoose-query` (query method calls)
- `uses-populate`, `uses-select`, etc. (query modifiers)

**Location:**
- `fact-extractor.ts` (lines 200-600, approx - pattern-specific extraction)
- `patterns/express/*.ts` (pattern matcher consumption)

**Action:** **DELETE** in Phase 2.3

**Rationale:** The LLM-first architecture will analyze Express/Mongoose code
semantically without needing these extracted facts. The LLM can see:
```javascript
app.get('/users/:id', (req, res, next) => { ... })
```
...and infer "GET route at /users/:id" without pre-extracted facts.

**LOC Savings:** ~300-400 LOC

---

### Category 4: KEEP - Side Effect Hints

**Purpose:** Side effect detection for behavior specifications

**Predicates:**
- `has-io-operation` (fs, http, db access)
- `has-async` (async/await usage)
- `has-promise` (Promise usage)
- `has-error-throw` (throws exceptions)
- `has-console-log` (logging)
- `has-process-exit` (process control)

**Location:** `fact-extractor.ts` (`detectSideEffects`, `detectErrors`)

**Action:** **SIMPLIFY** - Keep detection, remove detailed extraction

**Current:** Extracts every I/O call location and type
**Simplified:** Just flag entity as "has I/O" (boolean)

**Rationale:** The LLM needs to know if a function has side effects, but
doesn't need every specific fs.readFile call extracted as a fact.

**LOC Savings:** ~50-100 LOC (simplify, don't delete)

---

### Category 5: KEEP - Config/Environment Facts

**Purpose:** Configuration and environment variable usage

**Predicates:**
- `reads-config` (config file access)
- `reads-env` (process.env.* usage)
- `config-key` (specific keys read)

**Location:** `fact-extractor.ts` (config detection)

**Action:** **KEEP** - Important for deployment specs

**Rationale:** Config/env dependencies are critical for deployment and
cannot be easily inferred by LLM without scanning entire codebase.

---

### Category 6: KEEP - Auxiliary Readers

**Purpose:** Extract facts from tests, config files, etc.

**Files:**
- `aux-readers/test-reader.ts` (36 LOC)
- `aux-readers/config-reader.ts` (35 LOC)

**Action:** **PRESERVE** - No changes

**Rationale:** These provide valuable context (test names/assertions, config
structure) that the LLM can use for better semantic analysis.

---

### Category 7: DELETE - Pattern Detector

**Purpose:** Detect patterns that reduce static resolvability (dynamic imports, eval, etc.)

**File:** `pattern-detector.ts` (43 LOC)

**Action:** **KEEP** (minimal changes)

**Rationale:** Even in LLM-first architecture, we want to flag dynamic code
patterns and downgrade confidence. However, we may simplify the detection
logic since pattern matching is gone.

**Decision:** Keep for now, revisit in Phase 2.3

---

## Detailed Deletion Plan

### Phase 2.3: Parser Simplification

#### Step 1: Remove Express-specific fact extraction

**Files to modify:**
- `src/parser/fact-extractor.ts`

**Functions to delete:**
```typescript
// DELETE these methods (estimated lines):
- extractMiddlewareSignature() // ~40 lines
- extractRouteInfo() // ~60 lines
- extractErrorHandlerSignature() // ~40 lines
- detectExpressPatterns() // ~50 lines
```

**Total:** ~190 LOC deleted

#### Step 2: Remove Mongoose-specific fact extraction

**Functions to delete:**
```typescript
- extractSchemaFields() // ~80 lines
- extractModelMetadata() // ~40 lines
- detectMongooseQueries() // ~60 lines
```

**Total:** ~180 LOC deleted

#### Step 3: Simplify side effect detection

**Current logic:**
```typescript
// Extracts every specific I/O call
facts.push({ predicate: 'fs-read-call', object: 'readFile' });
facts.push({ predicate: 'fs-write-call', object: 'writeFileSync' });
facts.push({ predicate: 'http-request', object: 'fetch' });
// ... 20+ specific predicates
```

**Simplified logic:**
```typescript
// Just flag categories
attributes.sideEffects = {
  io: true,           // Has any I/O (fs, net, db)
  async: true,        // Uses async/await or Promises
  stateful: false,    // Modifies module-level state
  network: true       // Makes network requests
};
```

**Total:** ~100 LOC simplified to ~20 LOC (~80 LOC savings)

#### Step 4: Remove call-argument extraction for pattern matching

**Current:** Extracts argument types/names for every function call
**New:** Only extract call relationships (caller -> callee)

**Total:** ~50 LOC deleted

---

## Migration Checklist

### Pre-Deletion (Phase 0.5) - CURRENT
- [x] Document all fact categories
- [x] Identify LOC savings (~400-450 LOC)
- [x] Mark patterns for deletion
- [ ] Update tests/unit/parser/*.test.ts expectations (Phase 2.3)

### Deletion (Phase 2.3)
1. **Remove Express-specific extraction** (~190 LOC)
   - Update tests: `tests/unit/parser/fact-extractor.test.ts`
   - Remove Express-specific test cases

2. **Remove Mongoose-specific extraction** (~180 LOC)
   - Update tests: `tests/unit/parser/mongoose-extraction.test.ts` (if exists)

3. **Simplify side effect detection** (~80 LOC savings)
   - Update tests: `tests/unit/parser/side-effect-detection.test.ts`
   - Change assertions from specific facts to category flags

4. **Remove pattern-specific call-arg extraction** (~50 LOC)
   - Update tests: `tests/unit/parser/call-extraction.test.ts`

**Expected Result:**
- Parser: 775 LOC → ~475 LOC (-40%)
- Tests: Update ~30 test cases, remove ~50 test cases
- Coverage: Maintain 80%+ (simpler code is easier to test)

---

## Fact Predicates: Before vs After

### Before (Current)

**Fact Count:** ~100+ predicates

**Sample predicates:**
```
is-function, has-signature, param-count, param-names, param-sig-0, param-sig-1,
param-sig-2, param-name-0, param-name-1, param-name-2, has-next-call,
route-verb, route-path, route-handler-count, error-handler-signature,
has-status-code-assignment, has-error-response, schema-field-name,
schema-field-type, schema-field-required, model-name, has-mongoose-query,
uses-populate, uses-select, uses-limit, fs-read-call, fs-write-call,
http-request, call-arg-0, call-arg-1, call-arg-2, ...
```

### After (Phase 2.3)

**Fact Count:** ~40-50 predicates

**Core predicates (kept):**
```
is-function, is-constant, is-class, is-method,
has-signature, has-jsdoc, param-count, param-names,
is-exported, has-initializer, initializer-value,
imports, exports, calls, extends, implements,
reads-config, reads-env, config-key,
has-io-operation, has-async, has-promise, has-error-throw
```

**Deleted predicates:**
```
All Express-specific: route-*, middleware-*, error-handler-*
All Mongoose-specific: schema-*, model-*, uses-*
All pattern-matching: call-arg-*, param-sig-*, param-name-*
```

---

## Impact Analysis

### Components Affected

1. **KB (Knowledge Base)** - No changes
   - FactSet structure unchanged
   - Fewer facts per entity (less storage)

2. **LLMAnalyzer** - Benefits
   - Cleaner fact input (less noise)
   - Can focus on structural facts only

3. **Spec Generator** - No changes
   - Doesn't consume pattern-specific facts

4. **Finalization** - No changes
   - Uses entity-level tracking, not fine-grained facts

5. **Grounding Validator** - Benefits
   - Fewer facts to validate (faster)

### Tests Affected

**Delete:**
- `tests/patterns/` - All pattern tests (~220 tests)

**Update:**
- `tests/unit/parser/fact-extractor.test.ts` - Remove pattern expectations (~30 updates)
- `tests/integration/parser-reasoning.test.ts` - Update assertions (~10 updates)

**Preserve:**
- `tests/unit/parser/imports-exports.test.ts` - No changes
- `tests/unit/parser/side-effects.test.ts` - Minor simplification

---

## Success Criteria

- [x] All fact categories documented
- [x] Deletion plan created
- [x] LOC savings estimated (~400-450 LOC)
- [x] Test impact analyzed (~80 test updates/deletions)
- [ ] Tests updated in Phase 2.3
- [ ] Coverage maintained at 80%+

---

## References

- **CTS-05** (Static Analysis & Pattern Detection) - Original parser spec
- **Component Dependency Map** - Test categorization
- **LLM-First Conversion Plan** - Overall migration strategy
- **Phase 6 Express Implementation** - Pattern-specific fact examples
