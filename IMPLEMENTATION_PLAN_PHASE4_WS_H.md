# ceps — Phase 4 Workstream Plan (WS-H Orchestrator Gates & Run Summary)

## 1. Scope & Objectives
- Implement CTS-07 §5–§11 (phase coordination, gating, exit codes, telemetry, error handling) and enforce SADS §6.3 exit code semantics for Phase 4 delivery.
- Operate two categories of gates:
  1. **Runtime gates (exit-code enforcing):** Coverage, Link, Grounding, Determinism, Confidence, Monorepo (CTS-07 §5.1). Failures → exit code 2.
  2. **Validation/CI gates (reporting only):** Cost, Adversarial, Test Coverage, Readability (Phase 4 §5.2). Failures recorded in run summary/warnings but do not change exit code.
- Validate CLI options (`--llm`, `--llm-budget`, `--deterministic`, `--max-workers`, `--focus`, etc.) against CTS-02 §2 / CTS-07 §7 so invalid combinations fail fast with actionable guidance.
- Produce structured run summaries (JSON + console table) capturing gate outcomes, validation results, token usage, fallback counts, and warnings per Phase 4 §3.3.

## 2. Inputs & Dependencies
- **Phase -1 analysis (Stage A0) required:** audit Phase 3 orchestrator implementation to document existing `orchestrate`, `registerPhase`, `emitProgress`, gate wiring, error handling (CTS-07 §8–§10) and capture gaps in `docs/process/grounding.md`.
- Requires WS-F1 validator diagnostics payload (accept|retry|fallback with rule diagnostics) and WS-F2 run summary metrics (token usage, fallback counts, budget exhaustion flags).
- Consumes existing Phase 3 gate implementations (Coverage, Link, Determinism, Confidence, Monorepo) for regression; extends them with new validation gates.
- Needs access to integration fixtures (Express, React, monorepo) after WS-F2 updates to validate LLM-on/off permutations and Cost gate thresholds.
- Coordinate with CLI owner to ensure flag validation logic matches documentation (CTS-02 §2) and that help text reflects new error messages.
- Review Phase 4 §3.3 run summary example before implementation to ensure schema parity.

## 3. Work Breakdown (TDD-Centric)
| Stage | Goals | Key Tasks | Tests (Red → Green) |
|-------|-------|-----------|----------------------|
| **A0. Phase -1 Analysis & Schema Freeze** | Understand current orchestrator state | - Inspect Phase 3 orchestrator modules to document existing gate implementations, `orchestrate` entry point, progress events, error handling (CTS-07 §8–§10).<br>- Define canonical `RunSummary` TypeScript interface in `src/orchestrator/types/run-summary.ts` matching Phase 4 §3.3 and add JSON Schema (`schemas/run-summary.schema.json`). Export types for WS-F2.<br>- Share schema with WS-F2/WS-F1 via tracker (record version, fields) and build JSON Schema validator for integration tests.<br>- Capture findings, gaps, and schema version in `docs/process/grounding.md`; no code changes yet. | - Schema contract test (`src/orchestrator/__tests__/run-summary-schema.test.ts`) verifying example payload matches interface.<br>- Document completion entry in tracker and notify WS-F2 of schema version. |
| **A. Interface Alignment & Stubs** | Prepare mocks & interfaces | - Create mocks for WS-F1 diagnostics, WS-F2 telemetry, validation gate reports using schema from Stage A0.<br>- Define helper interfaces for aggregated gate inputs (runtime vs validation) and CI metadata.<br>- Ensure mocks cover cost/adversarial/test coverage/readability fields. | - Contract tests ensuring mocks conform to interfaces and JSON Schema. |
| **B. Gate Evaluation Engine** | Compute pass/fail per runtime gate | - Implement runtime gate evaluators for Coverage, Link, Grounding, Determinism, Confidence, Monorepo (CTS-07 §5).<br>- Aggregate errors, warnings, remediation hints; support extensible registry for future gates.<br>- Consume WS-F1/WS-F2 payloads (factSetId preservation, fallback reasons).<br>- Define grounding gate input contract: aggregated chunk reports containing `factSetIds[]`, validator outcomes, fallback metadata (`factSetIdPreserved`, `templateUsed`, warnings). | - Unit tests (≥16): individual gate pass/fail, multiple failure aggregation, deterministic gate conditional logic (`--deterministic` flag), confidence downgrade logic, monorepo linking regression, chunk with missing factSetIds → fail, fallback without preservation → fail. |
| **B2. Validation Gate Aggregation** | Ingest CI/validation results | - Define inputs for Cost, Adversarial, Test Coverage, Readability gates (from WS-F2 metrics, CI coverage reports, manual review log).<br>- Normalize validation gate results into summary warnings with thresholds from Phase 4 §5.2.<br>- Ensure validation gate failures do not alter exit code but update summary status.<br>- Clarify Cost gate semantics: exceeding per-fixture thresholds → validation failure (warning only); budget exhaustion alone triggers warning but not validation failure. | - Unit tests (≥8): cost threshold exceeded (Express >30k tokens) → warning; budget exhaustion warning without threshold failure; adversarial suite failure → warning; coverage <80% → warning; readability score <7/10 → advisory note. |
| **C. Failure Policy & Exit Codes** | Map outcomes to exit codes | - Implement policy: runtime gate failure → exit code 2; CLI/config errors → exit 1; snapshot mismatch exit 3 (SADS §6.3).<br>- Ensure validation gate failures (Cost, Adversarial, Test Coverage, Readability) generate warnings but do not affect exit code.<br>- Integrate CTS-07 error handling policy: continue on recoverable errors, halt on fatal orchestrator errors. | - Unit tests (≥8): single gate failure, multiple runtime failures, validation gate failure (no exit change), configuration errors (exit 1), snapshot mismatch (exit 3). |
| **D. Run Summary Rendering** | Emit JSON + console table | - Render JSON summary using canonical schema; include runtime gate statuses, validation gate results (Cost/Adversarial/Test Coverage/Readability), token metrics, warnings, manual review notes.<br>- Render console summary highlighting failures (runtime) and warnings (validation); optional `--json-summary` output flag.<br>- Ensure deterministic ordering and JSON Schema validation before emitting. | - Unit tests (≥12): JSON schema validation, console formatting, warning inclusion, deterministic sorting, validation gate reporting (including advisory messages). |
| **E. CLI Validation Enhancements** | Catch invalid flag combos | - Validate `--llm` combinations, `--llm-budget`, `--deterministic`, `--max-workers`, `--focus`, `--max-iterations` per CTS-02 §2 / CTS-07 §7.<br>- Surface actionable error/warning messages and update CLI help text (`docs/cli.md`).<br>- Ensure determinism gate only active when `--deterministic` flag supplied. | - Unit tests (≥10): invalid combos, warnings, help text formatting, determinism flag handling. |
| **F. Integration Verification** | Exercise gates across fixtures | - Execute Express/React/monorepo fixtures with scenarios: all pass, runtime gate failures (Coverage, Grounding, Determinism, Confidence), validation gate failures (Cost via budget exhaustion, Adversarial via WS-F1 fixtures, Test Coverage via synthetic coverage report, Readability via manual review file `docs/PHASE4_READABILITY_REVIEW.md`).<br>- Capture run summaries, verify exit codes, and log scenario coverage in `docs/process/grounding.md`. | - Integration tests: pass scenario, each runtime gate failure, mixed failures, validation gate warning reporting, schema validation against JSON output. |

## 4. Test Inventory & Coverage Targets
- **Unit suites (≥40 tests, ≥80% branch coverage):**
  - `src/orchestrator/__tests__/run-summary-schema.test.ts`
  - `src/orchestrator/__tests__/gate-engine.test.ts`
  - `src/orchestrator/__tests__/validation-gates.test.ts`
  - `src/orchestrator/__tests__/exit-codes.test.ts`
  - `src/orchestrator/__tests__/summary-renderer.test.ts`
  - `src/orchestrator/__tests__/cli-validation.test.ts`
- **Integration suites:**
  - Scenario scripts invoking CLI with different flag sets, verifying exit codes and summary JSON (validated via schema).
  - Reuse WS-F1 adversarial fixtures for Grounding/Adversarial tests and WS-F2 outputs for Cost gate; document reuse in tracker.
- **Golden summary:** Snapshot clean run and synthetic failures (runtime failure, validation warning) to ensure deterministic formatting.

## 5. Deliverables
- Gate evaluation engine covering runtime gates (Coverage, Link, Grounding, Determinism, Confidence, Monorepo) with extensible registry plus validation gate aggregator for Cost/Adversarial/Test Coverage/Readability warnings.
- Exit code policy implementation aligned with SADS §6.3 and CTS-07 §9 error handling guidelines.
- Canonical run summary schema (`RunSummary` interface + JSON Schema) with renderer producing JSON/console output.
- CLI validation updates (flags, help text) covering CTS-02 §2 and CTS-07 §7 configuration options.
- Integration scripts demonstrating runtime gate failures, validation warnings, and schema validation.
- Updated documentation (`docs/cli.md`, `docs/process/grounding.md`, run summary schema reference) and test/coverage reports.

## 6. Parallelization & Collaboration Notes
- Begin once WS-F1 publishes diagnostic schema and WS-F2 shares initial telemetry payloads; log availability in `docs/process/grounding.md`.
- Stage A0 schema freeze informs WS-F2; any schema updates require mutual agreement and tracker entry.
- Provide gate failure hooks to WS-F1/WS-F2 for contextual warnings (e.g., fallback counts); ensure naming matches schema.
- Document CLI validation outcomes and run summary examples in `docs/cli.md`; note completion in tracker to close loop.

## 7. Completion Checklist (WS-H)
- [ ] Phase -1 analysis (Stage A0) complete; schema frozen and shared via tracker.
- [ ] Gate evaluators for runtime gates implemented with ≥80% coverage; regression tests for Confidence/Monorepo gates passing.
- [ ] Exit code policy verified (0 success, 1 configuration/test failure, 2 runtime gate failure, 3 snapshot mismatch) with schema-validated summaries for validation gates (warnings only).
- [ ] Run summary JSON + console outputs match canonical schema and pass golden tests; validation gate results (Cost, Adversarial, Test Coverage, Readability) reported as warnings/advisories.
- [ ] CLI rejects invalid flag combinations (`--llm`, `--llm-budget`, `--deterministic`, `--max-workers`, `--focus`, etc.) with actionable messages and help text updates (`docs/cli.md`).
- [ ] Integration scenarios (runtime failures, validation warnings, mixed cases) executed with expected exit codes and schema validation.
- [ ] Artifacts (summaries, logs) archived for Phase 4 completion package; tracker updated with schema versions, fixture coverage, and completion status.
