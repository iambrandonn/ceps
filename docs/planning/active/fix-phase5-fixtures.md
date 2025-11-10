# Fix Phase 5 Fixture Corruption

## Problem Statement

The Phase 5 finalization test fixtures in `tests/fixtures/phase5/baseline/tiny-react/` were accidentally overwritten during commit `c0bc311` (Better console logging). The baseline `spec.md` file and `.ceps/kb-state.json` were regenerated with empty data, causing 3 tests in `src/finalize/__tests__/spec-patcher.test.ts` to fail.

## Root Cause

The fixture directory appears to have been used as a test target for running `ceps`, which regenerated the baseline files with minimal/empty content. This overwrote the carefully crafted golden outputs that were established in commit `02ce5e7` (Add finalized golden outputs for Phase 5 validation).

## Failing Tests

1. **`updates impacted specs, removes QIDs, and inserts finalization summaries`**
   - Expects: `spec.md` with Finalization Summary, 6 entities, index entries
   - Gets: `spec.md` with 0 entities, no index entries, dated 2025-11-09

2. **`is idempotent when rerun in deterministic mode with existing summaries`**
   - Same issue: baseline fixture doesn't match expected golden output

3. **`stacks summary blocks when rerun in non-deterministic mode`**
   - Expects: 3 Finalization Summary blocks (1 from baseline + 2 from test runs)
   - Gets: 2 blocks (baseline has 0, test adds 2)

## Affected Files

Files that need to be restored from commit `02ce5e7`:

1. `tests/fixtures/phase5/baseline/tiny-react/spec.md`
   - Current: Empty spec with 0 entities, dated 2025-11-09
   - Expected: Finalized spec with 6 entities, Finalization Summary, index entries

2. `tests/fixtures/phase5/baseline/tiny-react/.ceps/kb-state.json`
   - Current: Empty arrays for entities, factSets, chunks
   - Expected: Contains render entity (QuVnACVfXW) with facts and chunk

3. `tests/fixtures/phase5/baseline/tiny-react/.ceps/snapshot.json`
   - Current: Updated timestamp (2025-11-09T15:23:12.846Z)
   - Expected: Original timestamp (2025-11-06T19:45:54.566Z)

## Solution

### Step 1: Restore Corrupted Fixture Files

Restore the three affected files from the last known good commit (`02ce5e7`):

```bash
git checkout 02ce5e7 -- tests/fixtures/phase5/baseline/tiny-react/spec.md
git checkout 02ce5e7 -- tests/fixtures/phase5/baseline/tiny-react/.ceps/kb-state.json
git checkout 02ce5e7 -- tests/fixtures/phase5/baseline/tiny-react/.ceps/snapshot.json
```

### Step 2: Verify Test Suite

Run the affected tests to confirm they pass:

```bash
npm test -- --run src/finalize/__tests__/spec-patcher.test.ts
```

Expected result: All 6 tests pass (currently 3 fail, 3 pass).

### Step 3: Prevent Future Corruption

Add documentation and safeguards:

1. **Update AGENTS.md** - Add a warning about fixture directories:
   - Document that fixture directories should NEVER be used as test targets for running `ceps`
   - Add `.ceps-ignore` or similar mechanism to prevent accidental regeneration

2. **Add .gitignore entry** - Consider adding a note in the fixture README:
   - Create `tests/fixtures/phase5/baseline/tiny-react/README.md`
   - Document that this is a golden fixture and should not be modified by running ceps

3. **Consider fixture protection** - Add a marker file:
   - Create `tests/fixtures/phase5/baseline/tiny-react/.fixture-readonly`
   - Update ceps to check for this marker and refuse to generate into protected directories

### Step 4: Full Regression Test

Run the complete test suite to ensure no other issues:

```bash
npm test
```

Expected result: 1291 tests pass (currently 1288 pass, 3 fail).

## Prevention Strategies (Future Work)

1. **Read-only fixture marker**: Implement `.fixture-readonly` detection in ceps
2. **Fixture validation script**: Create a pre-commit hook that validates fixture integrity
3. **Snapshot hash checking**: Add test that validates fixture snapshot hasn't changed unexpectedly
4. **Documentation**: Update test creation guidelines to emphasize fixture immutability

## Implementation Checklist

- [ ] Step 1: Restore three corrupted files from git
- [ ] Step 2: Verify spec-patcher tests pass
- [ ] Step 3: Run full test suite
- [ ] Step 4: Add fixture protection documentation
- [ ] Step 5: Commit fix with descriptive message
- [ ] Step 6: (Optional) Implement read-only fixture detection

## Success Criteria

1. All 6 tests in `spec-patcher.test.ts` pass
2. Full test suite returns to 1291 passing tests
3. Fixture files match their state from commit `02ce5e7`
4. Documentation added to prevent future occurrences

## Estimated Effort

- Immediate fix: 5 minutes (restore files, test, commit)
- Documentation: 10 minutes
- Future prevention work: 30-60 minutes (optional, can be deferred)

## Notes

- This is a **critical bug** that affects CI/CD reliability
- The fix is **straightforward** (simple git restore)
- Root cause was likely running `ceps .` from within the repo root, which processed the fixture directory
- Similar issues could affect other fixture directories - consider audit of `tests/fixtures/`
