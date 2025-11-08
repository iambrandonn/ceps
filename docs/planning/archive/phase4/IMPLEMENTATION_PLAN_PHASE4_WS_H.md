# ceps — Phase 4 Workstream Plan (WS-H Orchestrator Gates & Run Summary)

## 1. Scope & Objectives
- Implement CTS-07 §5–§11 (phase coordination, gating, exit codes, telemetry, error handling) and enforce SADS §6.3 exit code semantics for Phase 4 delivery.
- Operate gates with exit code enforcement per Phase 4 acceptance criteria (IMPLEMENTATION_PLAN_PHASE4.md:179-189):
  1. **Runtime gates (exit code 2):** Coverage, Link, Grounding, Determinism, Confidence, Monorepo (CTS-07 §5.1). Failures → exit code 2.
  2. **Cost & Adversarial gates (exit code 2):** Token budget and validator test suite failures → exit code 2.
  3. **Test Coverage gate (exit code 1):** Branch coverage failures → exit code 1 (test failure, highest priority).
  4. **Readability gate (advisory only):** Manual review failures → warnings only, exit code 0.
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
| **B2. Validation Gate Aggregation** | Ingest CI/validation results | - Define inputs for Cost, Adversarial, Test Coverage, Readability gates (from WS-F2 metrics, CI coverage reports, manual review log).<br>- Normalize validation gate results per Phase 4 acceptance criteria:<br>&nbsp;&nbsp;• Cost gate: budget exceeded → exit 2<br>&nbsp;&nbsp;• Adversarial gate: test failures → exit 2<br>&nbsp;&nbsp;• Test Coverage gate: <80% → exit 1 (highest priority)<br>&nbsp;&nbsp;• Readability gate: below threshold → advisory only (exit 0)<br>- Clarify Cost gate semantics: exceeding per-fixture thresholds (Express ≤30k, React ≤40k, monorepo ≤100k) → exit 2. | - Unit tests (≥8): cost threshold exceeded → exit 2; adversarial suite failure → exit 2; coverage <80% → exit 1; test coverage failure takes precedence over cost failure; readability score <7/10 → advisory (exit 0); exit code priority validation (1 > 2 > 0). |
| **C. Failure Policy & Exit Codes** | Map outcomes to exit codes | - Implement policy per Phase 4 acceptance criteria:<br>&nbsp;&nbsp;• Test Coverage failure → exit 1 (highest priority)<br>&nbsp;&nbsp;• Runtime gate failure → exit 2<br>&nbsp;&nbsp;• Cost/Adversarial failure → exit 2<br>&nbsp;&nbsp;• Readability failure → exit 0 (advisory only)<br>&nbsp;&nbsp;• CLI/config errors → exit 1<br>&nbsp;&nbsp;• Snapshot mismatch → exit 3 (SADS §6.3)<br>- Integrate CTS-07 error handling policy: continue on recoverable errors, halt on fatal orchestrator errors. | - Unit tests (≥10): test coverage failure (exit 1), runtime gate failure (exit 2), cost failure (exit 2), adversarial failure (exit 2), readability failure (exit 0), exit code priority (1 > 2 > 0), configuration errors (exit 1), snapshot mismatch (exit 3). |
| **D. Run Summary Rendering** | Emit JSON + console table | - Render JSON summary using canonical schema; include:<br>&nbsp;&nbsp;• Runtime gate statuses (Coverage, Link, Grounding, Determinism, Confidence, Monorepo)<br>&nbsp;&nbsp;• Validation gate results (Cost, Adversarial with rejected/total counts, Test Coverage, Readability)<br>&nbsp;&nbsp;• Fallback counts (LLM-polished vs template-fallback chunks from Grounding gate)<br>&nbsp;&nbsp;• Token spend per provider (anthropic, openai, azure, local breakdown)<br>&nbsp;&nbsp;• Adversarial suite outcome (rejected/total, pass/fail status)<br>&nbsp;&nbsp;• Warnings (budget exhaustion, validation failures, etc.)<br>&nbsp;&nbsp;• Manual review notes (if available)<br>- Render console summary highlighting failures (runtime) and warnings (validation); optional `--json-summary` output flag.<br>- Ensure deterministic ordering and JSON Schema validation before emitting. | - Unit tests (≥12): JSON schema validation, console formatting, warning inclusion, deterministic sorting, validation gate reporting (including advisory messages), fallback count display, per-provider token breakdown, adversarial outcome display. |
| **E. CLI Validation Enhancements** | Catch invalid flag combos | - Validate `--llm` combinations, `--llm-budget`, `--deterministic`, `--max-workers`, `--focus`, `--max-iterations` per CTS-02 §2 / CTS-07 §7.<br>- Surface actionable error/warning messages and update CLI help text (`docs/cli.md`).<br>- Ensure determinism gate only active when `--deterministic` flag supplied. | - Unit tests (≥10): invalid combos, warnings, help text formatting, determinism flag handling. |
| **F. Integration Verification** | Exercise gates across fixtures | - Execute Express/React/monorepo fixtures with scenarios: all pass, runtime gate failures (Coverage, Grounding, Determinism, Confidence → exit 2), cost gate failure (budget exhaustion → exit 2), adversarial gate failure (WS-F1 fixtures → exit 2), test coverage failure (synthetic report → exit 1), readability advisory (manual review file `docs/PHASE4_READABILITY_REVIEW.md` → exit 0), mixed failures with exit code priority (1 > 2 > 0).<br>- Capture run summaries, verify exit codes match Phase 4 acceptance criteria, and log scenario coverage in `docs/process/grounding.md`. | - Integration tests (≥12): pass scenario, each runtime gate failure (exit 2), cost failure (exit 2), adversarial failure (exit 2), test coverage failure (exit 1), readability advisory (exit 0), mixed failures with priority, schema validation against JSON output. |

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
- Gate evaluation engine covering:
  - Runtime gates (exit 2): Coverage, Link, Grounding, Determinism, Confidence, Monorepo
  - Cost & Adversarial gates (exit 2): Token budget, validator test suite
  - Test Coverage gate (exit 1): Branch coverage (highest priority)
  - Readability gate (exit 0): Manual review (advisory only)
- Exit code policy implementation per Phase 4 acceptance criteria (IMPLEMENTATION_PLAN_PHASE4.md:179-189), SADS §6.3, and CTS-07 §9 error handling guidelines.
- Canonical run summary schema (`RunSummary` interface + JSON Schema) with renderer producing JSON/console output, including:
  - Runtime and validation gate statuses
  - **Fallback counts** (LLM-polished vs template-fallback chunks)
  - **Token spend per provider** (anthropic, openai, azure, local)
  - **Adversarial suite outcome** (rejected/total, pass/fail)
  - Warnings and manual review notes
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
- [ ] Exit code policy verified per Phase 4 acceptance criteria: exit 1 (test coverage/config errors), exit 2 (runtime/cost/adversarial failures), exit 0 (success or readability advisory only), exit 3 (snapshot mismatch).
- [ ] Run summary JSON + console outputs match canonical schema and pass golden tests; gate results correctly categorized by exit code behavior (Cost/Adversarial → exit 2, Test Coverage → exit 1, Readability → advisory/exit 0). Summary includes: **fallback counts** (LLM-polished vs template), **token spend per provider** (anthropic/openai/azure/local breakdown), **adversarial suite outcome** (rejected/total), and **warnings**.
- [ ] CLI rejects invalid flag combinations (`--llm`, `--llm-budget`, `--deterministic`, `--max-workers`, `--focus`, etc.) with actionable messages and help text updates (`docs/cli.md`).
- [ ] Integration scenarios (runtime failures exit 2, cost/adversarial failures exit 2, test coverage failures exit 1, readability advisories exit 0, mixed cases with priority) executed with expected exit codes and schema validation.
- [ ] Artifacts (summaries, logs) archived for Phase 4 completion package; tracker updated with schema versions, fixture coverage, and completion status.
