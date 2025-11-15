# Regression Test Strategy - LLM-First Conversion

**Date:** 2025-11-15
**Phase:** 0.6 (Preparation)
**Purpose:** Ensure LLM-first architecture doesn't break existing functionality
**Context:** Pre-conversion test infrastructure setup

---

## Overview

The LLM-first conversion will delete ~4,700 LOC and ~220 pattern tests.
To prevent regression, we need baseline tests that validate core functionality
remains intact before, during, and after the conversion.

---

## Test Categories

### 1. Golden Output Tests (NEW - Phase 0.6)

**Purpose:** Ensure generated specs remain semantically equivalent

**Approach:** Snapshot testing with semantic similarity threshold

**Fixtures:**
- `tests/fixtures/regression/tiny-express/` - 5 files, Express patterns
- `tests/fixtures/regression/tiny-react/` - 5 files, React patterns
- `tests/fixtures/regression/tiny-mongoose/` - 3 files, Mongoose patterns

**Test File:** `tests/regression/golden-output.test.ts` (NEW)

**Workflow:**
1. **Phase 0.6:** Generate baseline specs with current system (fact-based)
2. **Phase 1-2:** After each phase, regenerate specs with LLM-first
3. **Validation:** Compare semantic similarity (>90% threshold)
4. **Failure:** If <90% similar, investigate and document why

**Metrics:**
- Semantic similarity score (>90%)
- Coverage preservation (all entities documented)
- Cross-link preservation (no broken links)
- Confidence distribution (expect improvement: more High, less Medium/Low)

---

### 2. KB Integrity Tests (EXISTING - Enhanced)

**Purpose:** Ensure KB operations remain correct across conversion

**Files:**
- `tests/unit/kb/*.test.ts` (40 tests)

**Action:** **PRESERVE** - No changes needed

**Validation:** All KB tests must pass at every phase checkpoint

---

### 3. Integration Smoke Tests (EXISTING - Enhanced)

**Purpose:** End-to-end validation of core workflow

**Files:**
- `tests/integration/end-to-end-smoke.test.ts`

**Current Coverage:**
- Scanner → Parser → KB → Generator
- LLM Gateway (polish mode)
- Finalization Engine

**Action:** **ENHANCE** - Add LLM-first flow checkpoint

**New Test:** `tests/integration/llm-first-smoke.test.ts` (NEW in Phase 1)

**Workflow:**
```typescript
describe('LLM-First Smoke Test', () => {
  it('should generate spec using LLM analyzer', async () => {
    // Scan + Parse (structural facts only)
    // LLMAnalyze (semantic analysis)
    // Generate spec
    // Validate: coverage, links, confidence
  });
});
```

---

### 4. Semantic Equivalence Validator (NEW - Phase 0.6)

**Purpose:** Automated semantic similarity testing

**File:** `tests/helpers/semantic-similarity.ts` (NEW)

**Implementation:**
```typescript
/**
 * Compare two spec sections for semantic similarity
 * Uses simple heuristics (can enhance with embeddings later)
 */
export function calculateSimilarity(
  baseline: string,
  candidate: string
): number {
  // 1. Normalize: lowercase, trim whitespace, remove markdown
  // 2. Extract key phrases (verbs, nouns, entities)
  // 3. Compare phrase overlap (Jaccard similarity)
  // 4. Bonus for matching: confidence level, entity count, link count
  // Returns: 0.0 - 1.0 (1.0 = identical)
}

export function assertSemanticSimilarity(
  baseline: string,
  candidate: string,
  threshold = 0.90
): void {
  const similarity = calculateSimilarity(baseline, candidate);
  if (similarity < threshold) {
    throw new Error(
      `Semantic similarity ${similarity.toFixed(2)} below threshold ${threshold}`
    );
  }
}
```

---

## Regression Test Matrix

| Phase | Test Suite | Expected Result |
|-------|-----------|-----------------|
| **0.6 (Baseline)** | All tests | 1313 passing, 4 skipped |
| **1 (PoC)** | All tests + LLMAnalyzer tests | 1330+ passing |
| **2.1 (Integration)** | All tests + orchestrator updates | 1330+ passing |
| **2.2 (Deletion)** | All tests - pattern tests | ~900 passing (expected drop) |
| **2.3 (Parser)** | All tests with updated parser | ~900 passing |
| **3 (Validation)** | Full suite + golden output | ~950 passing, golden output >90% similar |

---

## Golden Output Fixtures

### Fixture 1: tiny-express (Express patterns)

**Files:**
- `app.js` - Express server setup
- `middleware.js` - Custom middleware (req/res/next)
- `routes.js` - Route handlers (GET/POST)
- `error.js` - Error handler (4-param)
- `config.js` - Config loading (process.env)

**Expected Entities:** 8 functions, 3 constants

**Expected Confidence (Current):** 6 High, 2 Medium (Express patterns work well)

**Expected Confidence (LLM-First):** 8 High (LLM should understand all)

### Fixture 2: tiny-react (React patterns)

**Files:**
- `Button.jsx` - Functional component with props
- `useCounter.js` - Custom hook
- `context.js` - Context provider
- `utils.js` - Utility functions
- `constants.js` - Constants

**Expected Entities:** 5 functions, 2 constants

**Expected Confidence (Current):** 2 High, 5 Medium (React patterns weak in current system)

**Expected Confidence (LLM-First):** 6-7 High (LLM should recognize React idioms)

### Fixture 3: tiny-mongoose (Mongoose patterns)

**Files:**
- `UserSchema.js` - Schema definition
- `UserModel.js` - Model export
- `queries.js` - Query helpers (find, populate, etc.)

**Expected Entities:** 4 functions, 1 constant (schema)

**Expected Confidence (Current):** 3 High, 2 Medium (Mongoose patterns good)

**Expected Confidence (LLM-First):** 4-5 High (LLM should understand all)

---

## Implementation Plan (Phase 0.6)

### Step 1: Create Fixtures ✓ (Reuse Existing)

**Action:** Use existing test fixtures as regression baselines

**Fixtures to use:**
- `tests/fixtures/tiny-react/` - Already exists (Phase 5)
- `tests/fixtures/mongoose-basic/` - Already exists (Phase 6)
- Create: `tests/fixtures/regression/tiny-express/` (NEW)

**Benefit:** Reuse existing fixtures saves time, provides continuity

### Step 2: Generate Baseline Specs

**Script:** `scripts/generate-regression-baselines.sh`

```bash
#!/bin/bash
# Generate baseline specs for regression testing

set -e

FIXTURES=(
  "tests/fixtures/tiny-react"
  "tests/fixtures/mongoose-basic"
  "tests/fixtures/regression/tiny-express"
)

for fixture in "${FIXTURES[@]}"; do
  echo "Generating baseline for $fixture..."

  # Run ceps with LLM off (deterministic)
  ./dist/orchestrator/cli.js "$fixture" --llm off

  # Copy specs to baseline directory
  mkdir -p "$fixture/.baseline"
  find "$fixture" -name "spec.md" -exec cp {} "$fixture/.baseline/" \;

  echo "✓ Baseline saved to $fixture/.baseline/"
done

echo "All regression baselines generated!"
```

### Step 3: Create Semantic Similarity Helper

**File:** `tests/helpers/semantic-similarity.ts`

**Implementation:** Simple Jaccard similarity on key phrases

**Test:** `tests/helpers/semantic-similarity.test.ts`

### Step 4: Create Golden Output Test

**File:** `tests/regression/golden-output.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { assertSemanticSimilarity } from '../helpers/semantic-similarity';
import fs from 'fs';
import path from 'path';

const FIXTURES = [
  'tests/fixtures/tiny-react',
  'tests/fixtures/mongoose-basic',
  'tests/fixtures/regression/tiny-express'
];

describe('Golden Output Regression Tests', () => {
  FIXTURES.forEach(fixture => {
    it(`should generate semantically equivalent spec for ${path.basename(fixture)}`, () => {
      const baselineSpec = fs.readFileSync(
        path.join(fixture, '.baseline', 'spec.md'),
        'utf-8'
      );

      const currentSpec = fs.readFileSync(
        path.join(fixture, 'spec.md'),
        'utf-8'
      );

      // Assert >90% semantic similarity
      assertSemanticSimilarity(baselineSpec, currentSpec, 0.90);
    });
  });
});
```

---

## Regression Testing Workflow

### Phase 0.6 (NOW)
1. ✓ Create regression test strategy (this doc)
2. [ ] Create tiny-express fixture
3. [ ] Generate baseline specs for all 3 fixtures
4. [ ] Implement semantic similarity helper
5. [ ] Create golden output test
6. [ ] Add to CI (run on every commit)

### Phase 1-2 (During Conversion)
- Run `npm test` after every checkpoint
- Run golden output tests after Phase 2 complete
- Investigate any <90% similarity scores
- Document expected differences (e.g., LLM uses better wording)

### Phase 3 (Validation)
- Full regression sweep on research-coi
- Compare baseline metrics with new metrics
- Validate improvement: High confidence 212 → 335+ (75%)
- Validate quality: No broken links, 100% coverage

---

## Success Criteria

- [x] Regression test strategy documented
- [ ] 3 regression fixtures ready (tiny-express, tiny-react, tiny-mongoose)
- [ ] Baseline specs generated and committed
- [ ] Semantic similarity helper implemented and tested
- [ ] Golden output test passing with baseline vs baseline (sanity check)
- [ ] CI integration ready
- [ ] All existing tests passing (1313 passing, 4 skipped)

---

## Risk Mitigation

### Risk 1: Semantic similarity threshold too strict

**Mitigation:** Start with 90%, adjust to 85% if LLM produces better prose
**Fallback:** Manual review of failing cases

### Risk 2: Test fixtures don't cover edge cases

**Mitigation:** Use research-coi for comprehensive validation (Phase 3)
**Fallback:** Add more fixtures if needed

### Risk 3: Golden output tests fail spuriously

**Mitigation:** Use deterministic mode (--llm off) for baselines
**Fallback:** Update baselines if LLM output is provably better

---

## References

- **Component Dependency Map** - Test impact analysis
- **Parser Simplification Spec** - Parser changes to validate
- **LLM-First Conversion Plan** - Overall migration timeline
- **Phase 5 Fixtures** - Existing test fixtures to reuse
