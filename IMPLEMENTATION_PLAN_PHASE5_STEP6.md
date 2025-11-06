# Phase 5 — Step 6 Implementation Plan  
**CLI Finalize Wiring & Orchestrator Integration**

**Owner:** Phase 5 agent (serial execution)  
**Depends on:** Step 4 (Selective Re-analysis), Step 5 (Spec patching & summaries), Step 2/3 artifacts (answers ingestion, impact report), existing CLI/orchestrator infrastructure  
**Blocks:** Step 7 (end-to-end validation)

---

## 1. Objectives & Scope
- Wire the `ceps finalize` command end-to-end: parse CLI options, verify snapshot, ingest answers, run impact scoping → re-analysis → spec patching, and surface diagnostics/exit codes.  
- Provide `--dry-run` preview, enforce exit codes (`0`, `3`, `4`), and emit run summaries for users/CI.  
- Ensure deterministic behavior under `--deterministic` and proper propagation of LLM/grounding configurations.

Out of scope: additional fixture creation beyond baseline tiny-react, end-to-end CI scripting (Step 7), KB serialization optimizations (handled alongside Step 4/5).

---

## 2. Inputs & Dependencies
- **Artifacts:**  
  - `ReanalysisResult`, `SpecPatchReport`, `ImpactReport` outputs from prior steps (consumed during run).  
  - `answers.md`, `.ceps/snapshot.json`, and KB persistence metadata.  
- **Existing components:** CLI parser (`src/orchestrator/cli.ts`), orchestrator (`Orchestrator` class), snapshot verifier, KB serialization/deserialization.  
- **Reference docs:** CTS-04 §6 (CLI), Step 0 architecture, Phase 5 Steps 1-5 plans, PROCESS_IMPROVEMENT_GOLDEN_FIXTURES.md.

---

## 3. Estimated Effort
- Total: 2.5 days  
  - CLI option wiring & config plumbing: 0.5 day  
  - Finalize orchestrator phase assembly & snapshot checks: 1 day  
  - Dry-run reporting, exit codes, diagnostics: 0.5 day  
  - Documentation, fixture/golden updates, tests: 0.5 day  
  - Buffer for edge cases (answers missing, reconcile mode): 0.5 day

---

## 4. Work Plan (Serial Tasks)

1. **Requirements Review & CLI Spec Audit**
   - Revisit CTS-04 §6, Step 0 architecture, Phase 5 Step 4/5 outputs.  
   - Inventory existing CLI options (`cli.ts`) and orchestrator hooks; confirm deterministic/LLM flags propagation.  
   - Identify any missing config fields (e.g., `--finalize-max-hops`, `--answers` default handling).

2. **CLI Option & Config Wiring**
   - Extend CLI to parse finalize-specific flags: `--answers`, `--dry-run`, `--reconcile`, `--finalize-max-hops`, `--finalize-max-nodes`, `--finalize-scope`.  
   - Validate file existence (`answers.md`), incompatible flag combinations, and default values.  
   - Define `FinalizationConfig` TypeScript interface:
     ```typescript
     export interface FinalizationConfig {
       projectRoot: string;
       answersPath: string;
       outputDir?: string;
       dryRun: boolean;
       reconcile: boolean;
       deterministicMode: boolean;
       scope: 'auto' | 'full';
       maxHops: number;
       maxNodes: number;
       llmEnabled: boolean;
       llmProvider?: string;
       llmModel?: string;
       llmBudget?: number;
       reasoningEnabled: boolean;
       maxIterations: number;
     }
     ```
   - Flag validation rules:
     - `--answers` required (file must exist); error if missing.  
     - `--dry-run` with `--reconcile`: warn that reconcile is ignored.  
     - `--finalize-scope full` overrides `--finalize-max-hops`/`nodes`; warn if both provided.  
     - `--finalize-out` not supported in Phase 5; error if provided.  
     - Validate KB state file exists; error "Baseline run required before finalization" if missing.  
   - Unit tests for CLI parsing (valid/invalid combinations, default config, validation errors).

3. **Finalize Orchestrator Flow**
   - Implement orchestrator method `runFinalize(config)` orchestrating:  
     **Phase 1 — Initialization & Validation**
     1. Validate config (answers path exists, flag compatibility).  
     2. Deserialize KB (`kb.deserialize(path)`); fail with exit code 1 if missing or version mismatch.  
     3. Verify snapshot (`SnapshotVerifier.verify`). On mismatch:
        - Without `--reconcile`: emit error, exit code 3.  
        - With `--reconcile`: log warning, continue (best-effort).  
     **Phase 2 — Answers & Impact**  
     4. Parse answers (`AnswerParser.parse`); on errors exit code 1.  
     5. Attach answers (`kb.attachAnswer`) and compute impact (`ImpactScoper.computeImpact`).  
     **Phase 3 — Re-Analysis & Patching**  
     6. If `dryRun`: skip re-analysis and patching; capture preview plan (see Task 4).  
        Otherwise:  
        a. Run re-analysis (`ReanalysisController.reanalyzeEntities`).  
        b. Patch specs (`SpecPatcher.patchSpecs`), returning `SpecPatchReport`.  
        c. Mark QIDs resolved (`kb.markQIDResolved`) for successful entities; skip failed ones.  
        d. Serialize KB (`kb.serialize`).  
     **Phase 4 — Summary & Exit**  
     7. Build run summary (counts, diagnostics, metrics).  
     8. Determine exit code (0 success, 4 partial success, 3 handled earlier).  
   - Ensure deterministic mode propagates to subcomponents (LLM gateway, reanalysis, spec patcher, summary timestamps).  
   - Integration tests mocking components to ensure correct call sequence.

4. **Dry-Run Preview & Diagnostics**
   - Dry-run skips re-analysis and patching; no LLM calls or disk writes.  
   - Emit report summarizing impact scope (entities/files that would change), using mock `SpecPatchReport`.  
   - Format console output (counts, warnings, cap diagnostics) with deterministic ordering, e.g.:
     ```
     === Finalization Preview (Dry Run) ===

     Answers: ./answers.md
     Resolved QIDs: 3

     Impact Scope:
       Seed Entities: 2
       Impacted Entities: 15
       Impacted Files: 3 spec files
       Scope: auto (max hops: 3, max nodes: 250)
       Capped: No

     Would Re-Analyze: 15 entities
     Would Update: spec.md, src/spec.md, src/utils/spec.md

     Warnings: none

     Exit Code: 0
     ```
   - Unit/integration tests covering dry-run output and zero side effects on disk.

5. **Exit Codes & Error Handling**
   - Map results to exit codes:  
     - `0`: finalize succeeded (no failures).  
     - `1`: fatal error (answers missing/malformed, KB missing/version mismatch, internal error).  
     - `3`: snapshot mismatch without `--reconcile`.  
     - `4`: partial success (entities failed re-analysis/patch).  
   - Ensure failures propagate diagnostics (target entity + reason).  
   - Add guardrails for missing answers/QID mismatches (exit with error).  
   - Tests verifying exit code matrix.

6. **Run Summary & Logging**
   - Produce structured run summary using `FinalizationRunSummary` interface:
     ```typescript
     interface FinalizationRunSummary {
       exitCode: 0 | 3 | 4;
       status: 'success' | 'snapshot-mismatch' | 'partial-success';
       resolvedQids: number;
       patchedFiles: number;
       updatedEntities: number;
       failedEntities: number;
       resolvedQidList: string[];
       patchedFilePaths: string[];
       failedEntityDetails: Array<{ entityId: string; reason: string }>;
       warnings: string[];
       impactDiagnostics: { hopsTraversed: number; nodesTraversed: number; capped: boolean; };
       metrics: { tokensUsed: number; runtimeMs: number; snapshotVerified: boolean; };
       startedAt?: string;
       completedAt?: string;
     }
     ```
   - Emit console output + optional JSON artifact if requested (future hook).  
   - Ensure deterministic ordering in logs.

7. **Documentation & Help Text**
   - Update CLI help (`--help`) and README/CLI docs with finalize usage, flags, workflows.  
   - Document dry-run workflow, reconcile semantics, exit codes.  
   - Log follow-ups (future JSON export, progress bars).

8. **Fixture & Golden Updates**
   - Capture sample finalize run outputs (e.g., dry-run console snapshot, run summary JSON) under `tests/fixtures/phase5/baseline/tiny-react/` as needed.  
   - Store test-only expectations in `tests/fixtures/phase5/baseline/tiny-react/expected/` (e.g., CLI output snapshots).  
   - Update fixture README with instructions for running `ceps finalize` on tiny-react (dry-run + full run), expected exit codes, and regeneration steps.

   **Snapshot Regeneration Checklist (REQUIRED)**
   - [ ] Run `npx tsx scripts/regenerate-phase5-snapshot.mjs` after modifying fixtures.  
   - [ ] Verify snapshot contents (`jq '.files | length' tests/fixtures/phase5/baseline/tiny-react/.ceps/snapshot.json`) and ensure new paths listed.  
   - [ ] Execute snapshot test: `npm test -- --run tests/integration/snapshot-capture.test.ts`.  
   - [ ] Commit updated `.ceps/snapshot.json` and rerun full `npm test`.

---

## 5. Testing Strategy
- **Unit tests:** CLI parsing/validation, configuration plumbing, exit code logic.  
- **Integration tests:** End-to-end finalize run (answers → patch) on tiny-react; dry-run mode; reconcile mode warning.  
- **Golden tests:** Deterministic run summary output, CLI dry-run snapshots stored under `expected/`.  
- **Regression tests:** Snapshot mismatch scenario, partial success path (exit code 4).  
- **Performance sanity:** Confirm finalize run completes within target budget on fixture.

---

## 6. Deliverables
- Updated CLI (`cli.ts`) and orchestrator finalize flow (`Orchestrator.runFinalize`).  
- Dry-run output formatter and run summary generator.  
- Fixture artifacts (run summaries, CLI snapshots) + README updates.  
- Documentation updates (CLI usage, finalize workflow).  
- Test suites (unit/integration/golden) covering finalize command.

---

## 7. Exit Criteria
- `ceps finalize` command executes end-to-end with correct exit codes for success, snapshot mismatch, partial success.  
- Dry-run mode outputs deterministic preview with zero file mutations.  
- Run summary and diagnostics accurately reflect spec patch results.  
- Tests (unit + integration + golden) pass with ≥80% coverage over CLI/orchestrator changes.  
- Documentation/help text updated; no open issues blocking Step 7.

---

## 8. Risks & Mitigations
- **Config drift:** centralize finalize options in shared config object; add unit tests.  
- **Snapshot misuse:** explicit pre-check ensures mismatch triggers exit code 3 unless `--reconcile`.  
- **Partial success confusion:** run summary + exit code 4 highlight unresolved entities; CLI instructions for next steps.  
- **Determinism drift:** propagate `--deterministic` to all subcomponents, fallback to template outputs when needed.  
- **Fixture upkeep:** rely on regeneration checklist to avoid snapshot mismatches (see above).

---

## 9. Follow-ups for Later Steps
- Step 7 executes full end-to-end finalize on fixtures/CI.  
- Future Phase 6 could add JSON summary export, progress bars, and parallelization tuning.
