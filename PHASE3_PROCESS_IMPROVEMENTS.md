# Phase 3 - Process Improvements Based on Step 0 Learnings

**Date:** 2025-11-04
**Context:** After 4 iterations on Step 0 (Relation Resolution), we identified critical process gaps that should be addressed before continuing with Steps 1-8.

---

## What Went Wrong in Step 0

### The Core Problem: Specification-First Instead of Integration-First

**How Step 0 was planned:**
1. Design algorithm based on assumptions about Phase 2 output
2. Write unit tests with hand-crafted entities
3. Implement algorithm
4. Discover schema mismatches during feedback

**Why it failed:**
- Assumed Phase 2 schema without reading the code
- Entity insertion order in tests didn't match Phase 2's extraction order
- Test assertions only checked "something resolved" (truthy), not correctness
- Took 4 iterations to discover the simple solution (entity array order)

**What finally worked:**
- Read `src/parser/fact-extractor.ts` BEFORE designing algorithm
- Wrote integration test with REAL Phase 2 parser output
- Added debug logging to SEE actual data structures
- Discovered entity array order IS the parent-child relationship
- Tightened assertions to verify exact IDs

---

## Root Cause Analysis

### Missing Step: "Phase -1" - Upstream Data Analysis

The plan jumped straight to algorithm design without:

1. **Reading upstream code** - Should have analyzed `src/parser/fact-extractor.ts` first
2. **Schema validation** - Should have documented what Phase 2 ACTUALLY provides (not assumed)
3. **Integration test first** - Should have used real parser output to understand data structure
4. **Debug-driven design** - Should have added console.log to see actual entity order/IDs

### Weak Test Assertions

**Before:**
```typescript
expect(callRelation.objectId).toBeTruthy();  // Just checks something resolved
```

**After:**
```typescript
expect(callRelation.objectId).toBe(secondClassMethod.id);  // Exact ID
expect(callRelation.objectId).not.toBe(firstClassMethod.id); // No cross-contamination
```

### Idealized Test Data

Unit tests used:
- Entities inserted in random order (not source order)
- IDs like `'class-first-abc123'` (not real content hashes)
- Schema that didn't match Phase 2 (entity ID in imports, `details.imported` field)

---

## Mandatory Process Changes for Steps 1-8

### 1. Add "Phase -1: Upstream Data Analysis" to Every Step

**Before implementing ANY code, each step must complete:**

#### Phase -1 Checklist

**A. Identify Data Sources**
- [ ] What upstream component generates the data we'll consume?
- [ ] What files contain that generation logic?
- [ ] What existing tests show the output format?

**B. Read Upstream Code**
- [ ] Read the ACTUAL implementation (not just docs/specs)
- [ ] Document the REAL schema (fields, types, formats)
- [ ] Identify implicit relationships (array order, key structure, etc.)
- [ ] Note what fields are MISSING (don't assume they exist)

**C. Validate Assumptions**
- [ ] Create a checklist of schema assumptions
- [ ] Mark each assumption TRUE/FALSE based on code reading
- [ ] Document gaps between plan assumptions and reality

**D. Integration Test with Debugging (BEFORE Unit Tests)**
- [ ] Write integration test using actual upstream component
- [ ] Add console.log/debugging to see real data structures
- [ ] Run test and analyze output
- [ ] Document findings (entity order, ID format, key structure, etc.)

**E. Gap Analysis & Design Adjustment**
- [ ] Compare plan's algorithm with available data
- [ ] Adjust design to work with ACTUAL data (not idealized)
- [ ] Document limitations based on real constraints
- [ ] Get approval for adjusted design if significantly different

**Example - Step 1 (KB Graph Indices) Phase -1:**
```markdown
### Phase -1: Upstream Data Analysis

**Data Source:** `src/reasoning/relation-resolver.ts` (Step 0 output)

**Schema Validation:**
- [ ] Read RelationResolver.resolve() implementation
- [ ] Document resolved relation schema:
  - objectId: Entity ID or null (not expression text)
  - details.resolved: boolean
  - details.originalExpression: string (preserved)
- [ ] Verify import relations schema:
  - subjectId: File path (not entity ID)
  - objectId: Module specifier
  - No details.imported field
- [ ] Test with real Phase 2 parser:
  - Extract entities/relations from sample code
  - Run through RelationResolver
  - Console.log the resolved relations
  - Verify schema matches documentation

**Integration Test (with debugging):**
```typescript
it('should analyze resolved relation schema before building indices', () => {
  // Use real Phase 2 parser
  const sourceFile = project.createSourceFile('src/sample.ts', `...`);
  const result = extractor.extract(sourceFile, 'src/sample.ts');

  // Insert and resolve
  result.entities.forEach(e => kb.insertEntity(e));
  result.relations.forEach(r => kb.insertRelation(r));
  const resolved = resolver.resolve(kb.getRelations());

  // DEBUG: See actual structure
  console.log('Resolved call relations:',
    resolved.filter(r => r.predicate === 'calls'));
  console.log('Import relations:',
    resolved.filter(r => r.predicate === 'imports'));

  // Validate schema
  const callRel = resolved.find(r => r.predicate === 'calls');
  expect(callRel.objectId).toMatch(/^[0-9A-Za-z]{10,16}$/); // Hash format
  expect(callRel.details?.originalExpression).toBeDefined();
  expect(callRel.details?.resolved).toBe(true);
});
```

**Findings:**
- Resolved relations use entity IDs (not expression text) ✅
- Import relations still keyed by file path ✅
- Need to handle both resolved (entity ID) and unresolved (null) cases
```

---

### 2. Strengthen Test Assertions

**Requirement:** All tests must assert **correctness**, not just **completion**.

**Before (TOO WEAK):**
```typescript
expect(result).toBeTruthy();
expect(result.length).toBeGreaterThan(0);
expect(callRelation.objectId).toBeTruthy();
```

**After (CORRECT):**
```typescript
// Assert exact values
expect(result).toEqual([expectedId1, expectedId2]);
expect(result.length).toBe(2); // Exact count

// Assert exact IDs
expect(callRelation.objectId).toBe(expectedMethodId);
expect(callRelation.objectId).not.toBe(wrongMethodId);

// Verify no cross-contamination
expect(firstClassResult).not.toContain(secondClassEntity.id);
```

**Test Review Checklist:**
- [ ] Assertions verify EXACT values (not just truthy)
- [ ] Tests verify correctness (not just "something happened")
- [ ] Negative assertions check for cross-contamination
- [ ] Edge cases have explicit expected outcomes

---

### 3. Integration Tests Before Unit Tests

**New Order:**
1. **Phase -1:** Upstream data analysis (read code, debug real data)
2. **RED (Integration Test First):** Write integration test with real upstream data
3. **RED (Unit Tests):** Write unit tests that mirror real data structure
4. **GREEN:** Implement to pass tests
5. **REFACTOR:** Clean up while keeping tests green

**Why Integration First:**
- Reveals real data structure immediately
- Catches schema mismatches early
- Provides realistic test fixtures for unit tests
- Validates assumptions before deep implementation

**Example:**
```typescript
// FIRST: Integration test (validates approach works with real data)
describe('Integration: KB Graph Indices with Real Parser', () => {
  it('should build call graph from Phase 2 + Step 0 pipeline', () => {
    // Use actual Phase 2 parser and Step 0 resolver
    const result = extractor.extract(sourceFile, 'src/app.ts');
    result.entities.forEach(e => kb.insertEntity(e));
    result.relations.forEach(r => kb.insertRelation(r));
    const resolved = resolver.resolve(kb.getRelations());

    // Add resolved relations to KB
    resolved.forEach(r => kb.insertRelation(r));

    // Build indices
    const callGraph = kb.getCallGraph();

    // Assert correctness with real entity IDs
    expect(callGraph.get(callerEntity.id)).toContain(calleeEntity.id);
  });
});

// SECOND: Unit tests (use structure learned from integration test)
describe('Unit: KB Graph Indices', () => {
  it('should build call graph from resolved relations', () => {
    // Now we know the real schema, so unit test mirrors it
    // ...
  });
});
```

---

### 4. Update Step Implementation Template

Each step file should follow this structure:

```markdown
# Phase 3 - Step N: [Title]

**Owner:** Agent X
**Depends on:** [Dependencies]
**TDD:** Red → Green → Refactor

---

## Phase -1: Upstream Data Analysis (MANDATORY - Complete Before Tests)

### A. Data Sources
- Upstream component: [Component that generates input data]
- Key files: [Files to read]
- Existing tests: [Tests that show output format]

### B. Schema Validation Checklist
- [ ] Read upstream implementation
- [ ] Document actual schema (not assumed)
- [ ] Identify implicit relationships (array order, etc.)
- [ ] Note missing fields
- [ ] Validate all assumptions from original plan

### C. Integration Test with Debugging
- [ ] Write integration test with real upstream data
- [ ] Add debug logging to see structures
- [ ] Run and analyze output
- [ ] Document findings

### D. Design Adjustment (if needed)
- [ ] Compare plan with reality
- [ ] Adjust algorithm for actual data
- [ ] Document limitations
- [ ] Get approval if significant changes

---

## Objective

[Original objective text]

---

## Algorithm Specification

[Adjusted based on Phase -1 findings]

---

## RED: Write Failing Tests

### Integration Test (FIRST)
[Integration test using real upstream data]

### Unit Tests (SECOND)
[Unit tests mirroring real data structure]

---

## GREEN: Implement

[Implementation code]

---

## REFACTOR: Clean Up

[Refactoring guidance]

---

## Acceptance Criteria

- [ ] All tests passing (integration + unit)
- [ ] Test assertions verify correctness (exact values)
- [ ] Integration test uses real upstream data
- [ ] Schema documented matches reality
- [ ] No assumptions left unvalidated
```

---

## Specific Recommendations for Remaining Steps

### Step 1: KB Graph Indices

**Phase -1 Focus:**
- Read `src/reasoning/relation-resolver.ts` output format
- Verify resolved relation schema (objectId = entity ID or null)
- Test import relation key structure (file paths, not entity IDs)
- Debug actual call graph structure with real parser output

**Key Questions to Validate:**
- Are import relations keyed by file path or entity ID?
- Do resolved call relations always have entity IDs?
- What happens with unresolved calls (objectId = null)?
- How should reverseDeps handle file-path keyed imports?

### Step 2: Confidence Scoring

**Phase -1 Focus:**
- Read `src/kb/knowledge-base.ts` factSet storage
- Understand factSet.facts array structure
- Verify what metadata is available (coverage, source, etc.)
- Test scoring with real Phase 2 extracted facts

**Key Questions to Validate:**
- What fields exist in FactSet.facts[]?
- Are source locations preserved?
- How many facts typically in a factSet?
- What confidence signals are actually available?

### Step 3: Reasoning & Pattern Matching

**Phase -1 Focus:**
- Read `src/parser/fact-extractor.ts` predicate generation
- Verify what predicates Phase 2 ACTUALLY emits
- Test pattern detection with real extracted facts
- Identify what predicates are MISSING

**Key Questions to Validate:**
- Does Phase 2 emit `calls-expression` predicate?
- Are call arguments captured?
- Is parameter count/names available?
- Do we need to enhance Phase 2 first?

### Steps 4-8: Apply Same Process

Each step must complete Phase -1 analysis before writing tests.

---

## Success Criteria for Process Improvements

**These improvements are successful if:**

1. **Steps 1-8 require ≤2 iterations each** (vs 4 for Step 0)
2. **Schema mismatches caught in Phase -1** (not during feedback)
3. **Integration tests pass on first try** (real data validated upfront)
4. **Test assertions verify correctness** (exact values, no truthy checks)
5. **No "discovered limitations" in feedback** (limitations identified in Phase -1)

---

## Action Items

### Before Starting Step 1:

- [ ] Review this process improvement document with user
- [ ] Update IMPLEMENTATION_PLAN_PHASE3_STEP1.md to include Phase -1 section
- [ ] Create Phase -1 template for agents to follow
- [ ] Add Phase -1 completion as a gate before "RED" phase

### During Each Step:

- [ ] Complete entire Phase -1 checklist
- [ ] Document findings in step file
- [ ] Get approval if design needs adjustment
- [ ] Write integration test with debugging BEFORE unit tests
- [ ] Assert exact values (not truthy)
- [ ] Verify no schema mismatches in feedback

### After Each Step:

- [ ] Review if Phase -1 caught all issues
- [ ] Update process if new gaps discovered
- [ ] Document lessons in step completion notes

---

## Step 2 Learnings: Type Safety and Documentation

**Date:** 2025-11-04
**Context:** Step 2 (Confidence Scoring) completed successfully on first iteration using Phase -1 process. Code review revealed 3 issues that tests didn't catch.

### What Phase -1 Got Right

Step 2 followed the Phase -1 process and **succeeded on first iteration**:
- ✅ Read upstream code before designing algorithm
- ✅ Validated actual predicates Phase 2 generates
- ✅ Wrote integration test with debugging
- ✅ Discovered only 6 of 14 signals available
- ✅ Adjusted design before implementing

**Result:** 0 schema mismatches, 0 design reworks, 356 tests passing on first try.

### What Tests Still Missed (Process Gaps)

Code review found 3 issues that tests didn't catch:

#### Issue #1: Documentation Drift

**Problem:** Acceptance criteria said "all reinforcers/penalties implemented" but only 6 of 14 signals were available.

**Why Tests Missed:** Tests validated implementation correctly. Gap was in **process** - Phase -1 findings weren't propagated to acceptance criteria.

**Fix:** Update acceptance doc AS PART OF Phase -1 workflow.

#### Issue #2: Type System Violations

**Problem:** `mergeFactSets` used wrong type for `allSources`, incompatible with `Source` type.

**Why Tests Missed:** **Vitest doesn't run TypeScript type checking**. Runtime tests pass even with type violations.

**Fix:** Add `pnpm typecheck` as required gate in workflow.

#### Issue #3: Generated Artifacts Not Validated

**Problem:** Spec generator showed private methods as public because they lacked `@internal` tags.

**Why Tests Missed:** **No tests validate generated spec output** against code.

**Fix:** Add spec validation tests (Phase 6).

### New Mandatory Process Steps

#### 5. Add Type Checking to Workflow

**Add to every step's completion checklist:**

```bash
# Before committing
pnpm test          # Runtime validation
pnpm typecheck     # Type safety validation ⚠️ NEW
pnpm lint          # Code quality
```

**Add to CI Pipeline:**
```yaml
- name: Test
  run: pnpm test
- name: Typecheck   # ⚠️ ADD THIS
  run: pnpm typecheck
- name: Lint
  run: pnpm lint
```

**Why:** Vitest uses esbuild transform which is more lenient than `tsc --noEmit`. Type violations can pass tests but break type contracts.

#### 6. Update Acceptance Criteria in Phase -1

**Enhanced Phase -1 Checklist:**

**E. Gap Analysis & Design Adjustment**
- [ ] Compare plan's algorithm with available data
- [ ] Adjust design to work with ACTUAL data (not idealized)
- [ ] Document limitations based on real constraints
- [ ] **⚠️ NEW:** Update acceptance criteria if scope changes
- [ ] **⚠️ NEW:** Mark deferred features explicitly with rationale
- [ ] Get approval for adjusted design if significantly different

**Example:**
```markdown
## Acceptance Criteria

- ✅ **Phase 3 reinforcers implemented** (4 of 7):
  - ✅ +15 type annotations
  - ✅ +10 callers≥3
  - ✅ +5 callers 1-2
  - ✅ +5 error handling
  - ⏸️ **DEFERRED to Phase 6:** +10 test coverage (needs test-reader enhancement)
  - ⏸️ **DEFERRED to Phase 6:** +5 complete JSDoc (needs JSDoc parser)
  - ⏸️ **DEFERRED to Phase 6:** +5 config doc (needs config-reader)
```

**Why:** Acceptance docs are contracts. When Phase -1 reveals scope changes, the contract must update immediately.

#### 7. Plan for Generated Artifact Validation (Phase 6)

**Add to Phase 6 backlog:**

```typescript
// tests/unit/generator/spec-validation.test.ts

describe('Spec Generation Validation', () => {
  it('should not document private methods as public API', () => {
    const spec = parseGeneratedSpec('src/kb/spec.md');
    const privateMethodsInSpec = spec.methods.filter(m =>
      m.visibility === 'Public' && isActuallyPrivate(m.name)
    );
    expect(privateMethodsInSpec).toHaveLength(0);
  });

  it('should document all public methods', () => {
    const codePublicMethods = extractPublicMethods('src/kb/knowledge-base.ts');
    const specPublicMethods = parseGeneratedSpec('src/kb/spec.md').methods;
    expect(specPublicMethods.map(m => m.name)).toEqual(
      expect.arrayContaining(codePublicMethods.map(m => m.name))
    );
  });

  it('should have matching signatures between code and spec', () => {
    const codeSignatures = extractSignatures('src/kb/knowledge-base.ts');
    const specSignatures = parseGeneratedSpec('src/kb/spec.md').signatures;
    codeSignatures.forEach(({ name, signature }) => {
      expect(specSignatures[name]).toBe(signature);
    });
  });
});
```

**Why:** Generated artifacts (specs, docs) need round-trip validation to catch discrepancies.

---

## Updated Step Completion Checklist

**Before committing any step:**

```bash
# 1. Run tests
pnpm test
✓ 356 tests passing
✓ ≥80% coverage

# 2. Run type checking ⚠️ NEW
pnpm typecheck
✓ No TypeScript errors

# 3. Run linter
pnpm lint
✓ No lint errors

# 4. Verify acceptance criteria updated ⚠️ NEW
- [ ] If Phase -1 revealed scope changes, acceptance doc updated
- [ ] Deferred features marked explicitly with rationale
- [ ] All implemented features marked as complete

# 5. Create checkpoint commit
git add -A
git commit -m "[CHECKPOINT] Phase 3 Step N: Title"
```

---

## Success Metrics Update

**Original (after Step 0):**
- Steps require ≤2 iterations each
- Schema mismatches caught in Phase -1
- Integration tests pass on first try

**Updated (after Step 2):**
- Steps require ≤2 iterations each ✅ (Step 2 = 1 iteration)
- Schema mismatches caught in Phase -1 ✅ (0 schema issues)
- Integration tests pass on first try ✅ (356 tests passing)
- **NEW:** Type checking passes alongside tests
- **NEW:** Acceptance docs updated when scope changes
- **NEW:** No "undocumented limitations" in review

---

## Summary

**Step 0 lesson:** Don't theorize about upstream data structure. **Look at it.**

**Step 2 lesson:** Runtime tests aren't enough. **Type-check and document scope changes.**

**The enhanced workflow:**
1. Phase -1: Upstream analysis + update acceptance docs
2. RED: Integration test first, then unit tests
3. GREEN: Implement with strong assertions
4. REFACTOR: Clean up
5. **VERIFY: Test + typecheck + lint**
6. COMMIT: Checkpoint with complete docs

**The validation:** Steps require ≤2 iterations AND pass both runtime + type checking.

**The outcome:** Faster implementation, fewer surprises, stronger type safety, accurate documentation.
