# Component Dependency Map - LLM-First Conversion

**Date:** 2025-11-15
**Purpose:** Map test and code dependencies to guide Phase 1-2 conversion
**Context:** Pre-pivot analysis for feature/llm-first-conversion branch

---

## Overview

This document maps which tests depend on which components to guide the LLM-first conversion.
It identifies which tests will be:
- **Deleted:** Pattern matching tests (components being removed)
- **Preserved:** Integration, KB, Scanner, Parser tests (components staying)
- **Modified:** Tests that need updates for new LLMAnalyzer component

---

## Test Summary (Current)

**Total Test Files:** 70
**Total Test Lines:** ~18,492
**Test Pass Status:** 1313 passing, 4 skipped (from STATUS.md)
**Coverage:** 93%+

### Test Categories

1. **Pattern Tests** (~220 tests) - **TO BE DELETED**
   - Express patterns
   - HTTP client patterns
   - Mongoose patterns
   - Future: React, Redux, GraphQL (not yet implemented)

2. **Integration Tests** (~15 tests) - **PRESERVE**
   - End-to-end smoke tests
   - Phase 5 finalization tests
   - Snapshot tests

3. **KB Tests** (~40 tests) - **PRESERVE**
   - Entity management
   - Confidence scoring
   - QID allocation
   - Graph operations

4. **Parser Tests** (~35 tests) - **MODIFY**
   - Fact extraction (keep)
   - Pattern detection (remove/simplify)
   - Auxiliary readers (keep)

5. **Spec Generator Tests** (~29 tests) - **PRESERVE**
   - Markdown generation
   - Cross-linking
   - Anchor generation

6. **LLM Gateway Tests** (~110 tests) - **MODIFY**
   - Grounding validator (keep, enhance)
   - Budget tracking (keep)
   - Provider adapters (keep)
   - Polish mode (replace with analyze mode)

7. **Orchestrator Tests** (~10 tests) - **MODIFY**
   - Phase coordination (update for new flow)
   - Gate validation (preserve)

---

## Component Status

### Components Being REMOVED (Phase 2)

1. **PatternMatcher** (`src/reasoning/pattern-matcher.ts`)
   - **Tests:** `tests/unit/pattern-matcher.test.ts` (if exists)
   - **Lines:** ~500 LOC
   - **Dependent Tests:** All pattern tests

2. **IntentLifter** (`src/reasoning/intent-lifter.ts`)
   - **Tests:** `tests/unit/intent-lifter.test.ts` (if exists)
   - **Lines:** ~400 LOC
   - **Dependent Tests:** Reasoning integration tests

3. **AmbiguityResolver** (`src/reasoning/ambiguity-resolver.ts`)
   - **Tests:** `tests/unit/ambiguity-resolver.test.ts`, `tests/integration/ambiguity-resolution.test.ts`
   - **Lines:** ~300 LOC
   - **Dependent Tests:** Ambiguity queue tests

4. **Pattern Library Modules** (`src/patterns/`)
   - `express/` - 8 modules (~3000 LOC)
   - `http-clients/` - (partial)
   - `mongoose/` - 3 modules
   - **Tests:** `tests/patterns/*` (~1 test file currently, more planned)
   - **Total:** ~3,500 LOC

**Total LOC to Delete:** ~4,700 LOC
**Total Tests to Delete:** ~220 tests (estimated based on coverage plan)

### Components Being ADDED (Phase 1-2)

1. **LLMAnalyzer** (`src/llm/llm-analyzer.ts`)
   - **Purpose:** Direct semantic analysis of source code
   - **Tests:** `tests/unit/llm-analyzer.test.ts` (new)
   - **Estimated LOC:** ~500 LOC
   - **Dependencies:** LLM Gateway, Parser output

2. **Enhanced CostTracker** (`src/llm/cost-tracker.ts`)
   - **Purpose:** Per-run token/cost tracking
   - **Tests:** `tests/unit/cost-tracker.test.ts` (new)
   - **Estimated LOC:** ~200 LOC
   - **Dependencies:** LLM Gateway

### Components Being MODIFIED (Phase 2)

1. **Parser** (`src/parser/`)
   - **Change:** Simplify fact extraction (remove pattern-specific facts)
   - **Tests:** `tests/unit/parser/` - Update expectations
   - **Impact:** Medium - mostly removing code

2. **LLM Gateway** (`src/llm/gateway.ts`)
   - **Change:** Add analyze() method alongside polish()
   - **Tests:** `tests/unit/llm/gateway.test.ts` - Add analyze tests
   - **Impact:** Medium - additive change

3. **Orchestrator** (`src/orchestrator/orchestrator.ts`)
   - **Change:** Update lifecycle: Parse → LLMAnalyze → Generate
   - **Tests:** `tests/integration/orchestrator.test.ts` - Update flow
   - **Impact:** High - flow changes

4. **KB** (`src/knowledge-base/`)
   - **Change:** Minimal - factSet structure unchanged
   - **Tests:** No changes needed
   - **Impact:** Low

### Components PRESERVED (No Changes)

1. **Scanner** (`src/scanner/`) - ✅ No changes
2. **Spec Generator** (`src/spec-generator/`) - ✅ No changes
3. **Finalization Engine** (`src/finalization/`) - ✅ No changes (may need updates after Phase 2)
4. **Grounding Validator** (`src/llm/grounding-validator.ts`) - ✅ Preserved, may enhance

---

## Test File Breakdown

### Pattern Tests (DELETE in Phase 2)

```
tests/patterns/
├── express/
│   └── express-patterns.test.ts (1 file, comprehensive suite)
│       - Middleware patterns
│       - Routing patterns
│       - Error handling
│       - Async patterns
│       - Config patterns
│       - Mongoose integration
│       - (~220 tests estimated based on 8 modules)
```

**Action:** Delete entire `tests/patterns/` directory in Phase 2.2

### Integration Tests (PRESERVE)

```
tests/integration/
├── orchestrator.test.ts - UPDATE (new flow)
├── ambiguity-resolution.test.ts - DELETE (component removed)
├── end-to-end-smoke.test.ts - PRESERVE
├── finalization-engine.test.ts - PRESERVE
├── snapshot-capture.test.ts - PRESERVE
```

**Action:** Keep most, update orchestrator test, delete ambiguity test

### Unit Tests (MIXED)

```
tests/unit/
├── kb/ - PRESERVE (40 tests)
├── parser/ - MODIFY (35 tests)
│   ├── fact-extractor.test.ts - Keep
│   └── pattern-detector.test.ts - Simplify
├── llm/ - MODIFY (110 tests)
│   ├── gateway.test.ts - Add analyze() tests
│   ├── grounding-validator.test.ts - Preserve
│   └── budget.test.ts - Preserve
├── spec-generator/ - PRESERVE (29 tests)
├── reasoning/ - DELETE (pattern/intent/ambiguity tests)
```

---

## Migration Strategy

### Phase 0 (Preparation) - CURRENT
- ✅ Document dependencies (this file)
- [ ] Enhanced CostTracker implementation
- [ ] Parser simplification spec
- [ ] Regression test setup

### Phase 1 (PoC)
- New: `tests/unit/llm-analyzer.test.ts` (TDD)
- New: `tests/integration/llm-analyzer-e2e.test.ts`
- Keep: All existing tests passing

### Phase 2 (Integration)
1. **Phase 2.1:** Add LLMAnalyzer to Orchestrator flow
   - Update: `tests/integration/orchestrator.test.ts`

2. **Phase 2.2:** Delete pattern library
   - Delete: `src/patterns/`, `tests/patterns/`
   - Delete: `src/reasoning/pattern-matcher.ts`, `intent-lifter.ts`, `ambiguity-resolver.ts`
   - Delete: Related tests
   - **Expected:** ~220 tests deleted, ~4700 LOC removed

3. **Phase 2.3:** Simplify parser
   - Update: `tests/unit/parser/*.test.ts`
   - Remove pattern-specific fact extraction

4. **Phase 2.4:** Update lexicon
   - Keep grounding workflow
   - Remove pattern-specific terms

### Phase 3 (Validation)
- Run full test suite (~900 tests remaining, target 80%+ coverage)
- Validate research-coi quality >75% High confidence
- Semantic determinism testing (>90% similarity)

---

## Test Count Projections

| Phase | Test Files | Tests | Coverage |
|-------|-----------|-------|----------|
| **Current (Pre-Pivot)** | 70 | 1313 | 93% |
| **Phase 1 (PoC)** | 72 | 1330 | 93% |
| **Phase 2 (After Deletion)** | ~55 | ~900 | 80%+ target |
| **Phase 3 (Stabilized)** | ~60 | ~950 | 85%+ target |

---

## Critical Dependencies to Watch

1. **Finalization Engine** (CTS-04)
   - Currently uses factSets for impact scoping
   - LLM-first: entity-level tracking + reverse deps
   - **Risk:** May need refactor in Phase 2.9 or defer to later

2. **Grounding Validator**
   - Currently validates against factSets
   - LLM-first: validates against source code facts + LLM output
   - **Risk:** Medium - needs careful testing

3. **Confidence Scoring**
   - Currently: rule-based (pattern weights)
   - LLM-first: LLM self-assessment or heuristic
   - **Risk:** Medium - new algorithm needed

---

## Success Criteria

- ✅ All components categorized (DELETE/PRESERVE/MODIFY/ADD)
- ✅ Test count projections documented
- ✅ Migration sequence clear
- ✅ Risks identified
- [ ] Parser simplification spec written (Phase 0.5)
- [ ] Regression tests ready (Phase 0.6)

---

## References

- **SADS.md §3.1** - 11-component architecture (current) → 7-component (target)
- **Conversion Plan** - `docs/planning/active/llm-first-conversion-plan.md`
- **STATUS.md** - Current test metrics (1313 passing, 93% coverage)
