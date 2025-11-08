# Phase 5 — Step 7 Implementation Plan  
**End-to-End Finalization Validation**

**Owner:** Phase 5 agent (serial execution)  
**Depends on:** Step 6 finalize CLI integration (complete), Steps 1–5 artifacts (snapshot, answers ingestion, impact scoping, re-analysis, spec patching)  
**Blocks:** Phase 5 completion summary and handoff

---

## 1. Objectives & Scope
- Execute end-to-end finalization workflows (dry-run + full run) on baseline fixtures and document results.  
- Ensure all gates (Coverage, Grounding, Finalization) pass, verify deterministic output, and confirm run summaries/logging behave as expected.  
- Capture final process documentation, update completion artifacts, and surface any residual risks.

Out of scope: additional feature work, new fixture creation beyond validation scenarios already defined.

---

## 2. Inputs & Dependencies
- `ceps finalize` CLI implemented in Step 6.  
- Baseline fixture `tests/fixtures/phase5/baseline/tiny-react` with golden files, answers, snapshot.  
- Documentation updates from Steps 1–6 (architecture, CLI help).  
- PROCESS_IMPROVEMENT_GOLDEN_FIXTURES checklist.

---

## 3. Estimated Effort
- Total: 1.5 days  
  - Test execution & validation: 0.5 day  
  - Golden updates & snapshot regeneration: 0.5 day  
  - Documentation and completion artifacts: 0.5 day

---

## 4. Work Plan (Serial Tasks)

1. **Prerequisite Verification**
   - Confirm Steps 1–6 merged and passing unit/integration tests.  
   - Ensure baseline fixture README and snapshot are up to date.  
   - Validate environment variables (LLM credentials) if required.

2. **Dry-Run Validation**
   - Run `ceps finalize --answers tests/fixtures/phase5/baseline/tiny-react/answers.md --dry-run --deterministic`.  
   - Capture console output, run summary, and diagnostics; store snapshots under `tests/fixtures/phase5/baseline/tiny-react/expected/`.  
   - Confirm exit code `0`, no file mutations (check `git status`), warnings align with ImpactReport.
   - Store dry-run output snapshots under `tests/fixtures/phase5/baseline/tiny-react/expected/`.

3. **Full Finalize Run**
   - Execute full finalize (without `--dry-run`) in deterministic mode (from project root):
     ```bash
     npx ceps finalize \
       --answers tests/fixtures/phase5/baseline/tiny-react/answers.md \
       --deterministic
     ```
   - Verification checklist (baseline tiny-react):
     - `src/spec.md`: Finalization Summary block present after title; "Resolved QIDs" count matches answers; updated sections contain refreshed text; resolved QIDs removed from Open Questions.  
     - `spec.md`: Root summary mirrors updated directories; no stale QIDs.  
     - `tests/fixtures/.../.ceps/kb-state.json`: openQuestions length is zero (confirm via script).  
     - Run summary shows exit code 0, counts, warnings (none for baseline).  
   - Restore fixture state between runs (e.g., `git checkout -- tests/fixtures/phase5/baseline/tiny-react/src/spec.md` and `.ceps/kb-state.json`) before rerunning finalize to confirm deterministic output (no diffs).  
   - Validate run summary JSON/text (counts, warnings) matches expectations.

   **LLM-off validation:** run `npx ceps finalize --answers tests/fixtures/phase5/baseline/tiny-react/answers.md --deterministic --llm off` to confirm template-only path succeeds (exit 0, template text present).

4. **Exit Code Matrix Validation**
   - Exit code 0 already validated in Step 3.  
   - Exit code 1 (fatal error):
     - Remove `.ceps/kb-state.json`; run finalize → expect error and exit 1; restore file from git.  
     - Create malformed answers file; run finalize with that path → expect parse error (exit 1).  
   - Exit code 3 (snapshot mismatch): modify a source file (e.g., append comment) and run finalize without `--reconcile` → expect exit 3; rerun with `--reconcile` to confirm warning and success; restore file.  
   - Exit code 4 (partial success): introduce fixture scenario where an entity fails re-analysis (if unavailable, document limitation in completion summary).  

5. **Gate Verification**
   - Re-run validation suite (Coverage, Grounding, Finalization) to confirm all pass.  
   - Finalization Gate: verify spec patches applied, summaries present, resolved QIDs removed (Section 3 checklist).  
   - Execute snapshot test to ensure new outputs captured.  
   - Run full `npm test` to confirm no regressions.

6. **Documentation & Artifact Updates**
   - Update README/CLI docs with final workflow examples and dry-run/full-run commands.  
   - Summarize results in `PHASE5_COMPLETION_SUMMARY.md` using template:
     ```
     # Phase 5 — Finalization Engine — Completion Summary

     **Completion Date:** YYYY-MM-DD  
     **Status:** ✅ Complete

     ## Overview
     <brief recap>

     ## Deliverables Completed
     - [x] Step 1 …
     ...

     ## Test Results
     - Total Tests: XXX
     - Passing: XXX
     - Coverage: XX.XX%
     - Exit Code Matrix: codes 0,1,3,(4 if validated)

     ## Validation Results
     - ✅ Dry-run …
     - ✅ Full finalize …
     - ✅ Determinism …
     - ✅ Gates (Coverage, Grounding, Finalization)

     ## Metrics
     - Finalize runtime: X.XXs
     - Files updated: …
     - Tokens used: …

     ## Known Limitations
     - …

     ## Residual Risks
     - …

     ## Follow-Up Items
     - …

     ## Sign-Off
     Implementation: <date>  
     Validation: <date>  
     Documentation: <date>
     ```
   - Update AGENTS.md/IMPLEMENTATION_PLAN_PHASE5.md with completion notes.

7. **Fixture & Snapshot Maintenance**
   - Commit updated spec files, summaries, run-summary outputs as goldens under appropriate directories.  
   - Regenerate snapshot and update `.ceps/snapshot.json`.  
   - Confirm README reflects locations of new goldens and regeneration process; document commands for restoring fixture state.

   **Snapshot Regeneration Checklist (REQUIRED)**
   - [ ] `npx tsx scripts/regenerate-phase5-snapshot.mjs`  
   - [ ] `jq '.files | length' tests/fixtures/phase5/baseline/tiny-react/.ceps/snapshot.json`  
   - [ ] `jq -r '.files[].path' ... | sort` to confirm file list  
   - [ ] `npm test -- --run tests/integration/snapshot-capture.test.ts`  
   - [ ] Commit updated snapshot with fixtures; rerun `npm test`

8. **Handoff Preparation**
   - Compile checklist of follow-up tasks (if any) for Phase 6 or future maintenance.  
   - Ensure all TODOs in code/docs resolved or tracked; perform final self-review for acceptance.

---

## 5. Testing Strategy
- **End-to-end dry-run + full-run** on tiny-react fixture with deterministic mode.  
- **Regression suite:** `npm test`, snapshot capture, finalize-specific tests.  
- **Golden validations:** Diff spec files and run summaries against expected outputs.  
- **Determinism checks:** Repeat finalize run to confirm no diffs in deterministic mode.

---

## 6. Deliverables
- Validated end-to-end finalize runs (dry-run + full run) with logs and run summaries.  
- Updated fixtures/goldens (spec.md after finalize, run summary outputs).  
- Documentation updates (CLI docs, README, completion summary).  
- Phase 5 completion artifacts and residual risk log.

---

## 7. Exit Criteria
- Dry-run and full finalize runs succeed with correct exit codes and deterministic output.  
- All gates (Coverage, Grounding, Finalization) pass using updated specs.  
- Snapshot updated and snapshot tests green.  
- Documentation (CLI help, README, completion summary) reflects final workflow.  
- No unresolved TODOs or blockers for Phase 6.

---

## 8. Risks & Mitigations
- **Fixture drift:** rely on regeneration checklist; reviewers confirm snapshot updated.  
- **Determinism regressions:** run finalize multiple times; add regression tests if diffs observed.  
- **LLM dependency:** run with `--llm off` fallback to confirm template mode still works.  
- **Residual failures:** exit code 4 indicates outstanding issues; document and resolve before completion.

---

## 9. Follow-ups for Future Phases
- Consider adding automate script for full finalize + diff checking (Phase 6).  
- Evaluate CI integration to run finalize in deterministic mode on reference fixtures.
