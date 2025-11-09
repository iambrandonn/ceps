# Plan Review: Default Export Detection Fix

**Reviewer:** Code Review Agent
**Date:** 2025-11-08
**Plan Document:** `docs/planning/active/features/default-export-detection.md`
**Status:** ✅ **Approved with Minor Revisions**

---

## Executive Summary

The default export detection fix plan is **fundamentally sound** and ready for implementation with minor revisions. The problem analysis is accurate, the solution design is clean, and the TDD approach is well-structured. Six minor issues need addressing before implementation to ensure full compliance with project specifications.

---

## ✅ Strengths

### 1. Problem Analysis is Accurate
- Correctly identifies the gap: parser only detects inline exports, not separate `export default X` statements
- Real-world impact is well-documented (Express routers commonly use this pattern)
- Root cause analysis shows good understanding of ts-morph API

### 2. Solution Design is Sound
- Post-processing pass approach is clean and non-invasive
- Correct ts-morph API usage (`getExportAssignments()`, `getExportDeclarations()`)
- Handles both default and named exports comprehensively

### 3. TDD Approach Followed
- Red-Green-Refactor workflow explicitly outlined
- Unit tests, integration tests, and fixture validation planned
- Test cases cover edge cases appropriately

### 4. Architecture Compliance
- Aligns with **CTS-05 (Static Analysis Engine)** responsibilities (SADS.md §3.1)
- Maintains fact extraction model (entities → factSets)
- No impact on downstream components (KB, Reasoning, Spec Generator)

### 5. Risk Management
- Performance concerns addressed (O(n) lookup on small arrays)
- Regression testing planned (all 1155 tests must still pass)
- Success criteria are measurable and clear

---

## ⚠️ Issues & Recommendations

### Issue 1: Potential Duplicate Work (Minor)

**Location:** Step 2 (Named Export Processing)

**Issue:** The plan proposes adding **both** default export detection (Step 1) and named export detection (Step 2), but the current parser already handles some named exports via inline detection.

**Question:** Does `getExportDeclarations()` in Step 2 create redundancy with existing export detection?

**Recommendation:**
- Verify which named export patterns are already detected
- Document the gap explicitly (e.g., "only handles `export { foo } from './bar'`, not `export { foo }`")
- Consider deferring Step 2 to a follow-up if it's not blocking the Express use case

**Priority:** Medium

---

### Issue 2: FactSet Predicate Naming (Spec Alignment)

**Location:** Lines 151-155 in implementation code

**Issue:** The plan adds a `is-default-export` fact:

```typescript
entityFactSet.facts.push({
  subjectId: entity.id,
  predicate: 'is-default-export',
  object: true,
});
```

The predicate naming convention doesn't match existing patterns in the parser.

**Recommendation:**
- Review existing predicates in `fact-extractor.ts` (e.g., `call-arg-0`, `has-middleware-signature`)
- Use consistent naming (likely should be `export-kind` with object `'default'`, or `is-default-export` if boolean predicates are standard)
- Document the predicate in the KB schema or pattern library if it's new

**Priority:** High (affects KB schema consistency)

---

### Issue 3: Missing CTS-05 Update Reference

**Location:** Line 417 (Follow-Up Work section)

**Issue:** The plan mentions updating CTS-05 documentation but places it under "Follow-Up Work (Optional)".

Per **AGENTS.md §File Placement Guidelines**, architecture changes should update CTS documents **during implementation**, not as optional follow-up.

**Recommendation:**
- Move CTS-05 update to **Step 4** (alongside fixture regeneration)
- Add a brief note in `CTS-05_Static_Analysis_and_Pattern_Detection.md` § Export Detection explaining the separate export handling

**Priority:** High (documentation completeness)

---

### Issue 4: Integration Test Coverage Gap

**Location:** Step 3, lines 214-267

**Issue:** The integration test verifies:
- Entity marked as exported ✅
- Express pattern matches ✅
- Spec generator includes it ✅

**Gap:** The test doesn't verify the **`is-default-export` fact** was actually added to the factSet.

**Recommendation:**
Add assertion after line 256:

```typescript
const routerFactSet = result.factSets.find(fs => fs.id === `${routerEntity!.id}-facts`);
const defaultExportFact = routerFactSet?.facts.find(f => f.predicate === 'is-default-export');
expect(defaultExportFact).toBeDefined();
expect(defaultExportFact?.object).toBe(true);
```

**Priority:** Medium (test completeness)

---

### Issue 5: Test Fixture Organization

**Location:** Step 4, line 270

**Issue:** The plan mentions updating "tiny-express fixture" but doesn't specify the file path.

Per **AGENTS.md §Fixture & Snapshot Discipline**, fixture changes require snapshot regeneration and careful commit discipline.

**Recommendation:**
- Specify exact fixture path (e.g., `tests/fixtures/tiny-express/src/routes/users.js`)
- Include snapshot regeneration command in the plan: `npx tsx scripts/regenerate-phase5-snapshot.mjs`
- Add verification steps from AGENTS.md:
  ```bash
  jq '.files | length' tests/fixtures/tiny-express/.ceps/snapshot.json
  npm test -- --run tests/integration/snapshot-capture.test.ts
  ```

**Priority:** High (required for fixture discipline)

---

### Issue 6: Visibility vs. Exported Flag (Clarification Needed)

**Location:** Lines 143-145 in implementation code

**Issue:** The plan sets both `entity.exported = true` and `entity.visibility = 'public'`:

```typescript
entity.exported = true;
entity.visibility = 'public';
```

**Question:** Are these redundant? Review the KB schema (CTS-01) to confirm:
- Is `visibility` derived from `exported` or independent?
- Should internal entities ever have `exported = true`?

**Recommendation:**
- Verify against `src/kb/knowledge-base.ts` entity schema
- If redundant, remove one and document the relationship
- If independent, add a test case for an exported but internal entity (if such a thing exists)

**Priority:** Medium (schema clarity)

---

## Compliance Summary

| Criterion | Status | Notes |
|-----------|--------|-------|
| SADS.md alignment | ✅ PASS | CTS-05 responsibilities maintained |
| TDD workflow | ✅ PASS | Red-Green-Refactor explicit |
| Test coverage | ⚠️ MINOR GAP | Add factSet assertion (Issue 4) |
| Fixture discipline | ⚠️ MINOR GAP | Add snapshot regen steps (Issue 5) |
| Documentation | ⚠️ MINOR GAP | CTS-05 update not optional (Issue 3) |

---

## Approval Status

### ✅ **Approved with Minor Revisions**

**Required Before Implementation:**
1. ✅ Clarify named export detection scope (Step 2) - verify no duplication
2. ✅ Verify `is-default-export` predicate naming convention with existing patterns
3. ✅ Move CTS-05 documentation update to Step 4 (not optional)
4. ✅ Add factSet assertion to integration test
5. ✅ Specify fixture path and add snapshot regeneration steps
6. ✅ Clarify `exported` vs `visibility` relationship

**Estimated Impact:**
- **Complexity:** Remains LOW (focused parser change)
- **Effort:** Still 2-3 hours (revisions add ~30 minutes)
- **Risk:** LOW (changes are additive, well-tested)

---

## Next Steps

1. **Planning Agent:** Address the 6 recommendations above and update the plan
2. **Code Review Agent:** Re-review updated plan (should be quick approval)
3. **Implementation Agent:** Execute the revised plan following TDD workflow
4. **Update STATUS.md** when moving to implementation phase

---

## Review Notes

The core approach is excellent—these are refinements to ensure full spec compliance. The problem analysis is thorough, the ts-morph API research is solid, and the test strategy follows best practices from Phase 6 Express lessons. Great work! 🎯

---

**Approval Signature:** Code Review Agent
**Review Complete:** 2025-11-08
