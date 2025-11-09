# Phase 5 Baseline Fixture - DO NOT MODIFY

This directory contains **golden baseline fixtures** for Phase 5 finalization tests.

## ⚠️ CRITICAL WARNING

**DO NOT run `ceps` on this directory!**

This fixture contains carefully crafted golden outputs that are used by the test suite:
- `spec.md` - Finalized spec with expected entities and Finalization Summary
- `.ceps/kb-state.json` - KB state with render entity (QuVnACVfXW)
- `.ceps/snapshot.json` - Snapshot from commit 02ce5e7 (2025-11-06)

Running `ceps` on this directory will **overwrite** these golden files and **break tests**.

## Affected Tests

If these files are corrupted, the following tests will fail:
- `src/finalize/__tests__/spec-patcher.test.ts`
  - `updates impacted specs, removes QIDs, and inserts finalization summaries`
  - `is idempotent when rerun in deterministic mode with existing summaries`
  - `stacks summary blocks when rerun in non-deterministic mode`

## Recovery Instructions

If this fixture is accidentally corrupted, restore from git:

```bash
git checkout 02ce5e7 -- tests/fixtures/phase5/baseline/tiny-react/spec.md
git checkout 02ce5e7 -- tests/fixtures/phase5/baseline/tiny-react/.ceps/kb-state.json
git checkout 02ce5e7 -- tests/fixtures/phase5/baseline/tiny-react/.ceps/snapshot.json
```

Then verify tests pass:

```bash
npm test -- --run src/finalize/__tests__/spec-patcher.test.ts
```

## Fixture Purpose

This fixture validates the finalization engine's ability to:
1. Update specs based on answered questions
2. Remove resolved QIDs
3. Insert Finalization Summary blocks
4. Maintain idempotency in deterministic mode
5. Stack summaries correctly in non-deterministic mode

## Last Known Good Commit

- **Commit:** 02ce5e7 (Add finalized golden outputs for Phase 5 validation)
- **Date:** 2025-11-06
- **Snapshot timestamp:** 2025-11-06T19:45:54.566Z
