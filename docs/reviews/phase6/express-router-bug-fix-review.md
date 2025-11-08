# Express Router Pattern Bug Fix — Plan Review

**Date:** 2025-11-08
**Reviewer:** Plan Review Agent
**Document Reviewed:** `docs/internal/analysis/BUG_EXPRESS_ROUTER_PATTERN_MATCH_FAILURE.md`
**Status:** ✅ **APPROVED WITH RECOMMENDATIONS**

---

## Executive Summary

This is **excellent bug analysis and TDD fix planning**. The root cause is clearly identified, the fix is minimal and safe, and the testing strategy is comprehensive. The document goes beyond just fixing the bug—it identifies systemic testing gaps and proposes process improvements.

**Verdict:** **APPROVE** with minor recommendations for implementation order and risk mitigation.

---

## 1. Strengths of the Bug Report

### 1.1 Root Cause Analysis ✅ **EXEMPLARY**

**Crystal clear diagnosis:**
- ❌ Parser emits: `'express.Router'`
- ❌ Matcher expects: `'Router'`
- ❌ String comparison fails: `'express.Router' !== 'Router'`

**Evidence provided:**
- ✅ KB dump showing correct parser output (line 87-90)
- ✅ Pattern matcher code showing exact line with bug (line 72)
- ✅ Source code pattern from real file (line 81)

**Why this is exemplary:**
- No ambiguity—anyone can reproduce the issue
- Evidence is machine-readable (JSON) not anecdotal
- Specific line numbers in source code provided

---

### 1.2 TDD Fix Plan ✅ **TEXTBOOK QUALITY**

**Follows Red-Green-Refactor perfectly:**
1. ✅ Write failing tests FIRST (§4.1)
2. ✅ Implement minimal fix (§4.2 - one line)
3. ✅ Verify tests pass (§4.3)
4. ✅ Add integration test (§4.5)
5. ✅ Validate on real codebase (§4.6)

**Test coverage is comprehensive:**
- ✅ Qualified import: `express.Router()`
- ✅ Aliased import: `myExpress.Router()`
- ✅ Bare import: `Router()` (regression test)

**Code examples are executable:**
- Complete test cases provided (§4.1, lines 253-369)
- Integration test provided (§4.5, lines 463-527)
- Can be copy-pasted directly

---

### 1.3 Lessons Learned ✅ **HIGH VALUE**

**Section 3 ("Why Testing Missed This Bug") is gold:**
- Identifies specific test gap (named import vs. namespace import)
- References AGENTS.md best practices
- Proposes concrete checklist (§5.1)
- Suggests process improvements (§5.2 Phase -1 for patterns)

**This prevents future occurrences—not just a band-aid.**

---

### 1.4 Risk Assessment ✅ **THOROUGH**

**Section 6 covers all angles:**
- ✅ Regression risk: LOW (more permissive regex)
- ✅ Performance impact: NEGLIGIBLE (O(1) regex)
- ✅ False positive risk: LOW (specific enough regex)

**Mitigation strategies provided for each risk.**

---

## 2. Recommendations for Implementation

### 2.1 Implementation Order ⚠️ **ADJUST SEQUENCE**

**Current plan (§4):**
1. Write failing unit tests
2. Implement fix
3. Verify unit tests
4. Write integration test
5. Validate on real codebase

**Recommended adjustment:**

**Run integration test BEFORE unit tests to confirm diagnosis:**

```bash
# Step 0 (NEW): Confirm bug reproduces
npm run build
node dist/orchestrator/index.js output-test --llm off --deterministic
cat output-test/spec.md | grep -c "Express Router"
# Expected: 0 (confirms bug)
```

**Why this matters:**
- The investigation found the bug via KB dump analysis
- But we should verify the END-TO-END symptom (missing router section in spec)
- If the spec DOES show routes, then the bug is elsewhere

**Updated sequence:**
1. **Step 0:** Reproduce end-to-end bug (spec missing router section)
2. **Step 1:** Write failing unit tests
3. **Step 2:** Implement fix
4. **Step 3:** Verify unit tests pass
5. **Step 4:** Write integration test
6. **Step 5:** Validate on real codebase (should now show router section)

**Add to §4.0 (new section):**

```markdown
### 4.0 Step 0: Reproduce End-to-End Bug (BASELINE)

**Before writing any tests, confirm the bug manifests in the final output:**

```bash
# Rebuild current code (without fix)
npm run build

# Run on failing test case
node dist/orchestrator/index.js output-test --llm off --deterministic

# Check if router section exists in spec
cat output-test/spec.md | grep -A 10 "### router"
```

**Expected output:**
```
[no matches - router section missing]
```

**Baseline metrics:**
- Routes detected: 0/23 (0%)
- Router entity in spec: NO
- Behavior chunks: 0

**Purpose:** Confirms the bug exists end-to-end, not just in unit tests.
**Time:** 5 minutes
```

---

### 2.2 Fix Validation Order ⚠️ **ADJUST**

**Current plan says (§4.6):**
> "Re-run ceps on original failing test"

**But this happens AFTER integration test (§4.5).**

**Recommendation:** Swap order of §4.5 and §4.6

**Rationale:**
1. **§4.6 (real codebase)** should come FIRST after unit tests pass
   - This validates the fix solves the original problem
   - Fast feedback (5 min vs. 30 min for integration test)
2. **§4.5 (integration test)** should come SECOND
   - Ensures the fix works in isolation too
   - Adds regression protection for future

**Updated sequence:**
1. Step 1-3: Unit tests (30 min)
2. **Step 4 (NEW): Validate on routes.js** (5 min) ← Fast win
3. **Step 5: Write integration test** (30 min) ← Regression guard
4. Step 6: Run full test suite (10 min)

---

### 2.3 Regex Specificity ⚠️ **CONSIDER STRICTER PATTERN**

**Current fix (§4.2):**
```typescript
return hasFact(kb, entity, 'initializer-call', /Router$/);
```

**Potential false positives:**
- `'MyCustomRouter'` ← Acceptable (might be Express subclass)
- `'FastifyRouter'` ← **NOT ACCEPTABLE** (different framework!)
- `'VueRouter'` ← **NOT ACCEPTABLE** (client-side router!)

**Problem:** The regex is too permissive for multi-framework codebases.

**Recommended fix (stricter):**
```typescript
// Match only Express Router patterns (bare or qualified with identifier)
const fact = getFirstFact(kb, entity, 'initializer-call');
if (!fact) return false;

const value = String(fact.object);

// Match patterns:
// - 'Router' (bare: import { Router } from 'express')
// - 'express.Router' (qualified: import express from 'express')
// - 'anyIdentifier.Router' (aliased: import * as anyIdentifier from 'express')
return /^(?:[a-zA-Z_$][\w$]*\.)?Router$/.test(value);
```

**Rationale:**
1. ✅ Matches `'Router'` (bare)
2. ✅ Matches `'express.Router'` (qualified)
3. ✅ Matches `'myExpress.Router'` (aliased)
4. ❌ Rejects `'FastifyRouter'` (no dot)
5. ❌ Rejects `'VueRouter'` (no dot)
6. ❌ Rejects `'MyCustomRouter'` (no dot)

**Trade-off:**
- **Stricter regex:** Prevents false positives but might miss edge cases (e.g., custom subclasses)
- **Looser regex:** More permissive but might match non-Express routers

**Recommendation:**
- Start with **looser regex** (`/Router$/`) as proposed
- Add **false positive detection** to validation step (§4.6)
- If false positives found, tighten to stricter regex

**Add to §4.2:**

```markdown
**False Positive Monitoring:**

During validation (§4.6), check for false positives:

```bash
# After fix, check what entities matched as "routers"
cat output-test/spec.md | grep "### .* (Express Router)"
```

**Expected:**
- Only `router` entity (the actual Express router)

**If unexpected entities appear:**
- Tighten regex to: `/^(?:[a-zA-Z_$][\w$]*\.)?Router$/`
- Re-run tests and validation
```

---

### 2.4 Integration Test Location ⚠️ **CLARIFY**

**Current plan (§4.5, line 462):**
```typescript
// File: tests/integration/express-router-qualified-import.test.ts
```

**Issue:** This creates a new integration test file for a single import style.

**Recommendation:** Add to existing Express integration tests

**Suggested structure:**

```
tests/integration/express-patterns.test.ts (existing)
└── describe('Express Router Pattern')
    ├── it('detects routes with bare import') (existing)
    ├── it('detects routes with qualified import') (NEW)
    ├── it('detects routes with aliased import') (NEW)
    └── it('detects routes with CommonJS require') (NEW)
```

**Benefits:**
- Keeps related tests together
- Avoids test file proliferation
- Easier to maintain

**Update §4.5:**

```markdown
### 4.5 Step 5: Integration Test

**Add to existing integration test file:**

**File:** `tests/integration/express-patterns.test.ts`

```typescript
describe('Express Router Pattern', () => {
  // ... existing tests ...

  describe('import style variations', () => {
    it('should detect routes with qualified import (express.Router)', async () => {
      // ... test code from §4.5 ...
    });

    it('should detect routes with aliased import', async () => {
      // ... similar test with import * as myExpress ...
    });
  });
});
```
```

---

### 2.5 Test Cleanup ⚠️ **ADD TEARDOWN**

**Integration test (§4.5, line 489-490):**
```typescript
const testPath = path.join('/tmp', testFile);
await fs.writeFile(testPath, testCode, 'utf-8');
```

**Issue:** Uses `/tmp` which may not exist on Windows.

**Recommendation:** Use OS-agnostic temp directory

```typescript
import { tmpdir } from 'os';

const testPath = path.join(tmpdir(), testFile);
```

**Also:** Current cleanup is in `finally` block (good), but should handle multiple test files:

```typescript
describe('Express Router - Import Variations', () => {
  const tempFiles: string[] = [];

  afterEach(async () => {
    // Clean up all temp files created during tests
    for (const file of tempFiles) {
      await fs.unlink(file).catch(() => {});
    }
    tempFiles.length = 0;
  });

  it('should detect routes with qualified import', async () => {
    const testPath = path.join(tmpdir(), 'test-qualified.js');
    tempFiles.push(testPath);
    await fs.writeFile(testPath, testCode);
    // ... rest of test ...
  });
});
```

---

## 3. Process Improvement Recommendations

### 3.1 Pattern Testing Checklist ✅ **EXCELLENT**

**Section 5.1 proposes a comprehensive checklist:**
- ✅ Import variations (named, default, namespace, CommonJS, destructured)
- ✅ Real-world validation (survey 3-5 repos)
- ✅ Edge cases (aliased, re-exported, dynamic)

**This should be added to AGENTS.md immediately.**

**Suggested location:**
```
AGENTS.md
└── Test Creation Best Practices
    └── Pattern Matching & Component Integration Tests
        └── Phase -1 Analysis for Pattern Matchers (NEW SECTION)
```

---

### 3.2 Phase -1 for Patterns ✅ **VALUABLE**

**Section 5.2 proposes "Phase -1 for Pattern Development":**
- Survey 3-5 real projects
- Document common import patterns
- Create test fixtures matching real usage
- Validate on real code before marking complete

**This is excellent preventive medicine.**

**Recommendation:** Create template document

**New file:** `docs/process/PATTERN_PHASE_MINUS_ONE_TEMPLATE.md`

```markdown
# Pattern Phase -1 Survey Template

## Framework: [Express / React / Redux / etc.]

### 1. Repository Survey

**Repos Analyzed:**
1. [repo-name] ([GitHub URL]) - [stars] ⭐
2. [repo-name] ([GitHub URL]) - [stars] ⭐
3. [repo-name] ([GitHub URL]) - [stars] ⭐

### 2. Import Pattern Analysis

**Most Common Import Style (>50%):**
```javascript
// Example code
```

**Second Most Common (20-50%):**
```javascript
// Example code
```

**Edge Cases Found (<20%):**
```javascript
// Example code
```

### 3. Naming Conventions

**Variable naming patterns:**
- [pattern 1] (60% prevalence)
- [pattern 2] (30% prevalence)

**Casing conventions:**
- [camelCase / PascalCase / snake_case]

### 4. Framework-Specific Idioms

**Common patterns observed:**
1. [pattern description]
2. [pattern description]

**Anti-patterns observed:**
1. [anti-pattern description]

### 5. Test Fixture Design

**Fixture 1: Most common pattern**
```javascript
// Realistic code based on survey
```

**Fixture 2: Second most common**
```javascript
// ...
```

**Fixture 3: Edge cases**
```javascript
// ...
```

### 6. Validation Plan

**Real codebase validation:**
- [ ] Repo 1: [expected routes/components/etc.]
- [ ] Repo 2: [expected routes/components/etc.]
- [ ] Repo 3: [expected routes/components/etc.]

**Success criteria:**
- Detection rate ≥80% on all repos
- No false positives
- F1 score ≥0.82
```

---

### 3.3 Integration Test Mandate ✅ **AGREED**

**Section 5.3 proposes mandatory integration tests:**
- Unit tests (pattern logic)
- Integration test (parser → pattern → KB)
- Validation on 1+ real codebase

**This should be added to Phase 6 Express Lessons AND propagated to other pattern workstreams.**

---

## 4. Minor Issues & Suggestions

### 4.1 Timeline Estimate ⚠️ **OPTIMISTIC**

**Section 7 estimates: 2-4 hours total**

**Issue:** This assumes:
- No unexpected test failures
- No debugging needed
- Clean integration test on first try
- No false positives in validation

**Recommendation:** Add 50% buffer

**Revised estimate: 3-6 hours**

**Breakdown:**
| Step | Original | Revised | Notes |
|------|----------|---------|-------|
| Write failing tests | 30 min | 45 min | May need debugging |
| Implement fix | 5 min | 10 min | May iterate on regex |
| Verify unit tests | 5 min | 15 min | May reveal issues |
| Integration test | 30 min | 45 min | Debugging temp file issues |
| Validate on routes.js | 15 min | 30 min | May need spec inspection |
| Full test suite | 10 min | 20 min | May reveal regressions |
| Documentation | 30 min | 45 min | AGENTS.md updates |
| Code review | 1 hour | 1.5 hours | Thorough review |
| **TOTAL** | **2h 45m** | **4h 30m** | **+65%** |

---

### 4.2 Acceptance Criteria ⚠️ **INCOMPLETE**

**Section 8 lists acceptance criteria, but some are ambiguous:**

```markdown
- [ ] routes.js validation shows 23/23 routes detected
```

**Issue:** "Detected" is vague. What does detection mean?
- Routes appear as bullets in spec?
- Router entity has a section?
- All HTTP methods captured?

**Recommendation:** Make criteria measurable

**Revised acceptance criteria:**

```markdown
## 8. Acceptance Criteria

**Fix is complete when:**

- [x] Root cause documented (this document)
- [ ] **Test Phase:**
  - [ ] 3 new unit tests written (qualified, aliased, bare imports)
  - [ ] All 3 unit tests FAIL before fix applied
  - [ ] Integration test added to `tests/integration/express-patterns.test.ts`
- [ ] **Implementation Phase:**
  - [ ] Fix implemented in `src/reasoning/patterns/express/router.ts` (line 47)
  - [ ] All new unit tests PASS after fix
  - [ ] Integration test PASSES after fix
- [ ] **Validation Phase:**
  - [ ] Full test suite passes (≥1155 tests, 0 failures, ≥93% coverage)
  - [ ] `output-test/spec.md` contains section: `### router (Express Router)`
  - [ ] Router section documents ≥20/23 routes (87%+ detection)
  - [ ] No false positive router entities detected
- [ ] **Documentation Phase:**
  - [ ] AGENTS.md updated with Pattern Testing Checklist (§5.1)
  - [ ] Pattern Phase -1 Survey template created
  - [ ] Phase 6 Express Lessons doc updated

**Go/No-Go Decision:**
- ✅ **GO:** Router section present, ≥20/23 routes detected, 0 false positives
- ❌ **NO-GO:** Router section missing OR <17/23 routes detected OR false positives found
```

---

### 4.3 False Positive Testing ⚠️ **ADD EXPLICIT TEST**

**Current plan mentions false positives (§6.3) but no explicit test.**

**Recommendation:** Add negative test case

**Add to §4.1:**

```typescript
describe('ExpressRouterPattern', () => {
  // ... existing tests ...

  describe('negative cases (should NOT match)', () => {
    it('should not match non-Express routers', async () => {
      const kb = new KnowledgeBase();

      // Test case 1: Fastify router (different framework)
      const fastifyRouter: Entity = {
        id: 'test-fastify',
        kind: 'constant',
        name: 'router',
        path: 'test-fastify.js',
        exported: false,
        visibility: 'internal',
      };

      kb.addEntity(fastifyRouter);
      kb.addFactSet({
        id: 'test-fastify-facts',
        facts: [
          { subjectId: fastifyRouter.id, predicate: 'is-constant', object: true },
          {
            subjectId: fastifyRouter.id,
            predicate: 'initializer-call',
            object: 'fastify.router' // Lowercase 'router'
          },
        ],
        sources: [{ kind: 'ast', file: 'test-fastify.js' }],
        evidenceScore: 100,
      });

      const pattern = new ExpressRouterPattern();
      expect(pattern.matches(kb, fastifyRouter)).toBe(false);

      // Test case 2: Vue Router (client-side)
      const vueRouter: Entity = {
        id: 'test-vue',
        kind: 'constant',
        name: 'router',
        path: 'test-vue.js',
        exported: false,
        visibility: 'internal',
      };

      kb.addEntity(vueRouter);
      kb.addFactSet({
        id: 'test-vue-facts',
        facts: [
          { subjectId: vueRouter.id, predicate: 'is-constant', object: true },
          {
            subjectId: vueRouter.id,
            predicate: 'initializer-call',
            object: 'VueRouter.createRouter' // Different method
          },
        ],
        sources: [{ kind: 'ast', file: 'test-vue.js' }],
        evidenceScore: 100,
      });

      expect(pattern.matches(kb, vueRouter)).toBe(false);
    });
  });
});
```

---

### 4.4 Documentation Location ⚠️ **CLARIFY**

**Section 5 proposes updates to:**
- AGENTS.md
- Phase 6 Express Lessons doc

**But doesn't specify WHEN these updates happen.**

**Recommendation:** Make it part of the fix acceptance criteria

**Add to §8:**

```markdown
**Documentation Updates (Required Before Merge):**

1. **AGENTS.md** (`/AGENTS.md`)
   - Add §5.1 Pattern Testing Checklist to "Test Creation Best Practices"
   - Add §5.2 Phase -1 analysis guidance

2. **Pattern Survey Template** (`docs/process/PATTERN_PHASE_MINUS_ONE_TEMPLATE.md`)
   - Create new template file (see §3.2 in review)

3. **Phase 6 Express Lessons** (`docs/internal/lessons/PHASE6_EXPRESS_LESSONS.md`)
   - Add "Import Style Variations" lesson
   - Document this bug as case study
   - Add integration test mandate

**Verification:**
- [ ] All 3 documents updated in same PR as fix
- [ ] Links between documents verified (no broken references)
```

---

## 5. Comparison to Original Validation Issue

### 5.1 Root Cause Mismatch 🔴 **CRITICAL FINDING**

**WAIT—This bug report contradicts the original validation issue!**

**Original validation report said:**
> `docs/internal/analysis/VALIDATION_ISSUE_ROUTES_PATTERN_DETECTION.md`
> **Root Cause (Phase -1 investigation):** Parser doesn't emit module-scope call expressions

**This bug report says:**
> **Root Cause:** Parser DOES emit facts correctly (188 facts, 25 route calls)
> **Actual problem:** Pattern matcher string mismatch (`'Router'` vs. `'express.Router'`)

### 5.2 Implication 🔴 **MODULE-SCOPE PARSER FIX MAY NOT BE NEEDED**

**Question:** If the parser is already working correctly, why are we planning the module-scope extraction enhancement?

**From this bug report (line 122-139):**
```json
✅ Route calls extracted (25 calls):
{
  "subjectId": "dXIyQqqoq9",
  "predicate": "calls-expression",
  "object": "router.post"
}
// ... 24 more calls (router.get, router.put, router.delete, router.use)
```

**This means:**
1. ✅ Parser IS extracting `router.post` calls
2. ✅ Parser IS associating calls with router entity
3. ✅ Parser IS capturing all 25 route definitions

**So the module-scope parser fix (from previous documents) may be:**
- ❌ **Unnecessary** (parser already works)
- ❌ **Solving the wrong problem** (pattern matcher is the issue)

### 5.3 Required Clarification 🔴 **BLOCKER**

**Before implementing EITHER fix, we need to answer:**

**Q1:** Does the current parser emit `router.post` facts at module scope or not?

**Evidence from KB dump (this bug report, line 131-138):**
```json
{
  "subjectId": "dXIyQqqoq9",
  "predicate": "calls-expression",
  "object": "router.post"
}
```

**This fact EXISTS**, which means parser IS extracting module-scope calls.

**Q2:** If module-scope calls are already extracted, what was the Phase -1 investigation finding?

**From `phase6-validation-fix-phase-minus-one.md` (line 104):**
```
**Search for router.* calls across ALL entities:**
Result: **ZERO matches** ❌
```

**CONTRADICTION:** Phase -1 said ZERO router calls found. This bug report shows 25 router calls found.

**Q3:** Which KB dump is correct?
- Phase -1 dump: 0 router calls
- This bug report dump: 25 router calls

**Possible explanations:**
1. **Different test runs:** Phase -1 ran on old parser, this ran on new parser (with module-scope fix already applied?)
2. **Different search queries:** Phase -1 searched wrong entity or used wrong predicate
3. **Tool error:** KB dump script had a bug

---

### 5.4 URGENT RECOMMENDATION 🔴 **HALT IMPLEMENTATION**

**I recommend HALTING all implementation until this contradiction is resolved.**

**Action Plan:**

**Step 1: Re-run KB dump on CURRENT codebase (no fixes applied)**

```bash
# Use current production code (no router fix, no module-scope fix)
git status # Verify clean state
npm run build
npx tsx scripts/debug-kb-dump.mjs output-test

# Check for router entity
jq '.entities[] | select(.name == "router")' output-test/kb-dump.json

# Check for route calls
jq '.factSets[].facts[] | select(.predicate == "calls-expression" and (.object | tostring | contains("router")))' output-test/kb-dump.json | wc -l
```

**Expected outcomes:**

**Outcome A: 0 route calls found**
- Phase -1 investigation was correct
- This bug report is based on NEW code (with module-scope fix already applied)
- Action: Implement module-scope parser fix FIRST, then router pattern fix

**Outcome B: 25 route calls found**
- Phase -1 investigation had an error (wrong search query)
- This bug report is correct
- Action: Skip module-scope parser fix, implement router pattern fix ONLY

**Outcome C: Some calls found (1-24, not 25)**
- Parser partially works (some module-scope calls, not all)
- Action: Implement both fixes in sequence

**Step 2: Update all related documents based on outcome**

**If Outcome A (0 calls):**
- ✅ Module-scope parser fix is correct priority
- ✅ Router pattern fix happens AFTER module-scope fix
- ❌ This bug report is premature (testing unreleased code)

**If Outcome B (25 calls):**
- ❌ Module-scope parser fix is UNNECESSARY
- ✅ Router pattern fix is correct priority
- ✅ Update all prior docs to remove module-scope fix

**If Outcome C (partial calls):**
- ✅ Both fixes needed
- ✅ Clarify which calls are missing and why

---

## 6. Conditional Approval

### 6.1 Approval Status

**IF** the contradiction in §5 is resolved and Outcome B is confirmed (parser already works, only pattern matcher broken):

**THEN:** ✅ **APPROVED** with recommendations in §2-4

**IF** Outcome A or C (parser is actually broken):

**THEN:** ⚠️ **CONDITIONAL APPROVAL** — this fix must wait until module-scope parser fix is complete

---

### 6.2 Implementation Priority Matrix

| Scenario | Module-Scope Parser Fix | Router Pattern Fix | Order |
|----------|------------------------|-------------------|-------|
| **Outcome A** (0 calls) | Required | Required | Parser → Pattern |
| **Outcome B** (25 calls) | NOT NEEDED | Required | Pattern only |
| **Outcome C** (1-24 calls) | Required | Required | Parser → Pattern |

---

## 7. Final Recommendations Summary

### 7.1 IMMEDIATE ACTION (Before Any Implementation)

1. 🔴 **CRITICAL:** Re-run KB dump to confirm route call count (§5.4)
2. 🔴 **CRITICAL:** Resolve contradiction between Phase -1 and this bug report
3. 🔴 **CRITICAL:** Determine implementation order based on KB dump results

### 7.2 IF APPROVED (Outcome B: Parser works, pattern broken)

**Implementation improvements:**
1. ⚠️ Add Step 0: Reproduce end-to-end bug (§2.1)
2. ⚠️ Swap validation and integration test order (§2.2)
3. ⚠️ Consider stricter regex pattern (§2.3)
4. ⚠️ Add false positive test cases (§4.3)
5. ⚠️ Use OS-agnostic temp directory (§2.5)

**Timeline adjustments:**
6. ⚠️ Increase estimate from 2-4 hours to 3-6 hours (§4.1)

**Documentation requirements:**
7. ✅ Create Pattern Phase -1 Survey template (§3.2)
8. ✅ Add pattern testing checklist to AGENTS.md (§3.1)
9. ✅ Update acceptance criteria with measurable metrics (§4.2)

---

## 8. Review Verdict

**Status:** ⚠️ **CONDITIONAL APPROVAL**

**Conditions:**
1. **BLOCKER:** Resolve Phase -1 vs. Bug Report contradiction (§5)
2. **BLOCKER:** Re-run KB dump and confirm route call count
3. **BLOCKER:** Determine if module-scope parser fix is actually needed

**IF** conditions resolved and Outcome B confirmed:
- ✅ **APPROVE** with recommendations in §2-4
- ✅ Router pattern fix can proceed immediately
- ✅ Module-scope parser fix can be canceled/deferred

**IF** Outcome A or C:
- ⚠️ **DEFER** router pattern fix until after module-scope parser fix
- ⚠️ Update bug report to reflect actual root cause
- ⚠️ Revise implementation timeline

---

## 9. Questions for Investigation Agent

**Please answer these questions before implementation begins:**

1. **KB Dump Discrepancy:**
   - Phase -1 investigation: 0 router calls found
   - This bug report: 25 router calls found
   - Which is correct? Were different versions of code tested?

2. **Parser Status:**
   - Does the CURRENT parser (production) emit `router.post` calls?
   - Or was this bug report testing WITH module-scope fix already applied?

3. **Test Environment:**
   - What version of code was used for KB dump in this bug report?
   - Was it run on `main` branch or a feature branch?

4. **Root Cause:**
   - Is the REAL root cause:
     - Parser gap (0 calls emitted) → needs module-scope fix
     - Pattern matcher bug (calls emitted but not matched) → needs regex fix
     - Both (some calls emitted, pattern also broken) → needs both fixes

---

**Review Status:** ⚠️ **CONDITIONAL** - Awaiting clarification on §5

**Next Agent:** Investigation Agent (resolve contradiction) → Implementation Agent (after clarification)

**Priority:** 🔴 **CRITICAL** - Must resolve before proceeding

---

**End of Review**
