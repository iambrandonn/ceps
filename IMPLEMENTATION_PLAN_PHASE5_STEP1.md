# Phase 5 — Step 1 Implementation Plan  
**Snapshot Capture & Verification**

**Owner:** Phase 5 agent (serial execution)  
**Depends on:** Step 0 integration architecture (KB persistence strategy, baseline fixtures)  
**Blocks:** Step 2 (answers ingestion), Step 6 (CLI finalize wiring)

---

## 1. Objectives & Scope
- Implement deterministic snapshot capture that records repository state (`.ceps/snapshot.json`) at the end of a baseline run, following CTS-04 §2.2–§2.3 and Step 0 persistence decisions.
- Provide verification utilities consumed by finalization to compare the current workspace against the stored snapshot, enforcing snapshot integrity before applying answers.
- Ensure snapshot metadata and KB persistence metadata remain in sync (snapshot hash stored alongside `kb-state.json` per Step 0 architecture).

Out of scope: answers parsing, impact scoping, spec patching (handled in later steps).

---

## 2. Inputs & Dependencies
- **Architecture decisions (Step 0):**
  - Snapshot schema (JSON envelope with `version`, `algorithm`, `rootHash`, `files[]`).
  - File normalization rules: UTF-8 read, strip BOM, convert CRLF→LF, trim trailing whitespace.
  - Merkle tree root recorded in both snapshot and KB persistence metadata.
  - Baseline fixture (`tests/fixtures/phase5/baseline/tiny-react/`) for regression validation.
- **Existing modules:**
  - `src/orchestrator` for phase sequencing and CLI options.
  - `scripts`/`utils` directories for file traversal (confirm reuse vs new utility).
- **Spec references:** CTS-04 §2 (snapshot requirements), CTS-07 §6 (CLI expectations), Phase 5 architecture report §2.

---

## 3. Estimated Effort
- Total: 2 days
  - Design & scaffolding: 0.5 day
  - Snapshot builder implementation + unit tests: 0.75 day
  - Verification logic + tests: 0.5 day
  - Orchestrator integration + documentation updates: 0.25 day
- Risk buffer (unexpected filesystem edge cases): 0.5 day

---

## 4. Work Plan (Serial Tasks)

1. **Requirements Refresher & API Sketch**
   - Re-read CTS-04 §2.1–§2.3, Step 0 architecture §2.
   - Draft TypeScript interfaces for snapshot schema (`SnapshotFile`, `SnapshotEntry`).
   - Decide module placement (`src/snapshot/`).

2. **File Normalization Utility**
   - Implement `normalizeFileContent(path)` that applies Step 0 rules (UTF-8, BOM strip, CRLF→LF, trim trailing whitespace).
   - Empty files return empty string (hash equals SHA-256 of empty input: `e3b0c442...`).
   - Binary files skip whitespace trimming (process raw buffer as UTF-8 fallback); document assumption that inputs are text; raise warning if decoding fails.
   - Unit tests covering mixed line endings, BOM, trailing spaces, empty files, Unicode, binary detection behavior.

3. **Merkle Tree Builder**
   - Implement `buildSnapshot(entries: SnapshotEntry[])` producing deterministic root hash by sorting entries by repo-relative POSIX path (lexicographic order) before hashing.
   - Use SHA-256 (Node crypto) with base16 encoding.
   - Unit tests for deterministic hashing, order independence (unsorted input → same root), identical inputs producing same root, empty file handling.

4. **Snapshot Capture Command**
   - Walk project tree with inclusion/exclusion rules:
     - **Include:** source files (`*.js`, `*.ts`, `*.jsx`, `*.tsx`), auxiliary inputs (package manifests, configs, tests, fixtures), documentation relevant to behavior.
     - **Exclude:** generated outputs (`spec.md`, `.ceps/` contents), `node_modules`, build artifacts (`dist/`, `build/`, `coverage/`), VCS directories, temp files.
     - Reuse scanner ignore logic or centralize shared exclusion configuration.
   - Generate sorted `files[]` with `{ path, hash, bytes }`.
   - Create `.ceps/` directory if missing; write snapshot atomically (temp file + rename); provide actionable errors if creation fails.
   - Decide symlink strategy (default: resolve real path if inside workspace, otherwise warn and skip); note in documentation.
   - Integration tests using baseline fixture; golden snapshot stored under `tests/fixtures/phase5/baseline/tiny-react/.ceps/snapshot.json`.

5. **Verification Utility**
   - Implement `verifySnapshot(snapshotPath, options?: { reconcile?: boolean })` returning structured result:
     - `match`: snapshot aligns with working tree.
     - `mismatch`: include diagnostics (added/removed/changed files) and version support check; unsupported versions throw helpful error.
   - Honor `--reconcile` via `options.reconcile`: mismatch treated as best-effort (warning) but not fatal; orchestrator uses exit code `3` when mismatch without reconcile.
   - Unit tests for mismatch scenarios (file added, removed, content change), reconcile mode behavior, version incompatibility.

6. **Orchestrator Integration**
   - Hook snapshot capture into every baseline run by default (after spec generation, before exit); add `--no-snapshot` escape hatch if necessary.
   - Export verification utility for Step 6 consumption (no finalize CLI wiring yet).
   - Ensure snapshot hash is produced first and made available to KB persistence metadata (implementation may occur in later subtask; document integration contract).
   - Document hash flow in architecture report (snapshot → KB metadata) so later steps enforce consistency.

7. **Documentation & Artifacts**
   - Update `docs/phase5-finalization-architecture.md` appendix if implementation deviates.
   - Add snapshot schema reference and workflow notes to baseline fixture README.
   - Defer CLI finalize documentation to Step 6; note TODO.

---

## 5. Testing Strategy
- **Unit tests**
  - Normalization rules (CRLF, BOM, trailing whitespace, Unicode, empty files, binary fallback).
  - Merkle tree determinism and structure (lexicographic ordering).
  - Verification mismatches (added/removed/changed files, version mismatch, reconcile mode).
  - Symlink handling (if supported) or explicit out-of-scope tests.
- **Integration tests**
  - Snapshot generation on `tiny-react` baseline fixture.
  - Snapshot regenerate + verify to ensure idempotency.
- **Golden tests**
  - Stored `snapshot.json` compared byte-for-byte under deterministic mode.
- **Performance sanity**
  - Benchmark snapshots on medium fixture (if available) to detect obvious performance regressions (record timings).

---

## 6. Deliverables
- `src/snapshot/` module with capture & verification utilities.
- `.ceps/snapshot.json` written during baseline run (with CLI toggle if needed).
- Unit & integration test suites.
- Documentation updates (CLI usage, architecture report appendices).
 - Structured diagnostic format describing snapshot mismatches (added/removed/changed) for orchestrator.

---

## 7. Exit Criteria
- Snapshot capture generates deterministic `.ceps/snapshot.json` matching schema.
- Verification utility detects mismatches with actionable diagnostics.
- Snapshot hash made available for KB persistence metadata (actual serialization implemented in subsequent steps).
- Tests (unit + integration + golden) pass with ≥80% coverage for snapshot module.
- Documentation updated; no open questions from Step 0 remain regarding snapshot handling.
 - Reconcile mode honored (exit code `3` without flag, warning with flag).

---

## 8. Risks & Mitigations
- **Large repositories:** Snapshot traversal may be slow → plan to use streaming reads; monitor performance for Phase 6 optimization.
- **Ignore rule divergence:** If scanner and snapshot walker differ, results may include extra files → reuse scanner ignore logic or centralize pattern list.
- **Environment-sensitive normalization:** CI vs local line endings → comprehensive normalization tests ensure consistency.
- **Hash drift between KB state and snapshot:** Ensure single source of truth (capture snapshot first, pass hash to KB persistence) to avoid mismatches.

---

## 9. Follow-ups for Later Steps
- Step 2 will consume snapshot hash for answers ingestion to confirm baseline context.
- Step 6 will wire verification utility into `ceps finalize`.
- Any additional fixtures requiring snapshots should be scheduled before end-to-end finalization tests (Step 7).
