# ceps — Phase 4 Workstream Plan (WS-F2 LLM Gateway Integration)

## 1. Scope & Objectives
- Integrate LLM polish into the generator pipeline while preserving deterministic template output and enforcing SADS §8 grounding safeguards.
- Implement CLI controls (`--llm`, provider/model/budget/cache flags) and budget manager so runs honor token caps (Phase 4 §5.2 Cost gate) and degrade gracefully to templates.
- Ensure retry/fallback orchestration with WS-F1 validator results in stable, grounded prose and accurate run summaries for WS-H gates.

## 2. Inputs & Dependencies
- Requires WS-F1 validator interface freeze (Stage A0) delivering type definitions, metadata contracts, and mock implementation; capture the unblock in `docs/process/grounding.md`.
- Consumes existing generator templates, chunk metadata, and factSetIds from Phase 3; review generator outputs before test creation (Phase -1 analysis).
- Depends on LLM provider adapters, cache scaffolding, and budget accounting shell from Phase 2—audit existing coverage vs gaps during Phase -1.
- Coordinate with WS-H on run summary schema (Phase 4 §3.3) to surface token usage, fallback counts, adversarial results, and warnings.
- Ensure provider tokenizers available in repo test environment; if not, supply deterministic mocks:
  - Anthropic: `@anthropic-ai/sdk` token estimation API
  - OpenAI/Azure: `tiktoken` encodings (`cl100k_base`, etc.)
  - Local/custom: fallback heuristic (`Math.ceil(text.length / 4)`) with documented variance
  - Record chosen strategy in `docs/process/grounding.md`.

## 3. Work Breakdown (TDD-Centric)
| Stage | Goals | Key Tasks | Tests (Red → Green) |
|-------|-------|-----------|----------------------|
| **A0. Phase -1 Analysis & Audit** | Understand upstream outputs before testing | - Review Phase 3 generator outputs (chunk structure, factSetId plumbing)<br>- Inspect Phase 2 LLM gateway skeleton (adapters, cache, budget placeholders) and document which provider adapters are production-ready vs stubs<br>- Map polish integration against CTS-03 §3 two-phase rendering (anchor index → render) and document intended insertion point<br>- Read WS-F1 interface docs/mocks to understand validator expectations<br>- Capture findings & open questions in `docs/process/grounding.md` | - No code yet; document checklist complete entry in tracker prior to Stage A |
| **A. Interface Alignment** | Lock validator + generator contracts | - Import WS-F1 types/mocks (accept|retry|fallback, ChunkMetadata)<br>- Define generator helper `applyLLMPolish` that prepares factSets/style/options then calls CTS-02 §6 `summarize` (ensure factSetId preservation)<br>- Ensure validator integration calls CTS-02 §6 `validate` via mock to exercise accept/retry/fallback flows | - Contract tests ensuring wrappers delegate to CTS interfaces<br>- Failing integration test verifying generator calls validator with metadata |
| **B. Budget Manager Implementation** | Enforce per-run token caps | - Implement wrapper `withBudgetHelper(kind, estimate)` delegating to CTS-07 §8 `withBudget`; support deterministic mocks for tests<br>- Track consumption per provider + total; apply Cost gate thresholds (Express ≤30k, React ≤40k, monorepo ≤100k tokens)<br>- Emit warnings & fallback on exhaustion; ensure exit code remains 0 when gates satisfied | - Unit tests (≥8): budget approval, denial, cumulative tracking, warning emission, cost gate threshold tests, reset between runs |
| **C. CLI Flag Completion** | Support full flag matrix | - Audit Phase 2 CLI implementation; list existing vs missing flags<br>- Implement validation rules per Phase 4 §3.2 (provider allow list, `--llm off` warning, `--llm-budget` positive integer, `--no-llm-cache` only when `--llm on`)<br>- Update docs/usage examples | - Unit tests (≥10): valid combos, unsupported provider, `--llm off` interactions, `--no-llm-cache` behavior, conflicting flags |
| **D. Template/LLM Orchestration** | Thread LLM stage through generator | - Insert polish stage (chunk → file → directory) respecting deterministic mode semantics (`--llm off` bypass, `--deterministic` locks low-temp sampling)<br>- Ensure helper `applyLLMPolish` assembles factSets/style/options then calls CTS-02 §6 `summarize`, preserving factSetIds and anchors, and executes between CTS-03 §3 two-phase rendering steps (after anchor index build, before final render)<br>- Remove structural diff comparisons unless required; focus on metadata/anchor continuity; template path remains untouched in deterministic + LLM-off modes | - Unit tests (≥12): deterministic bypass (`--llm off --deterministic` byte-identical), locked sampling (`--llm on --deterministic` structural stability), normal variance (`--llm on`), chunk-level invocation, metadata propagation, factSetId preservation, template-only mode byte stability |
| **E. Validator Retry Integration** | Honor accept/retry/fallback contract | - Hook WS-F1 validator responses into retry controller (`accept|retry|fallback`) by delegating to CTS-02 §6 `validate` with chunk draft + factSets<br>- Ensure fallback path reuses template chunk, maintains factSetId, increments fallback counters, logs warning<br>- Verify factSetId/diagnostics forwarded to WS-H run summary | - Unit tests (≥10): accept flow, retry transitions, fallback scenario, prompt key verification, warning logging, factSetId preservation |
| **F. Run Summary + Telemetry** | Surface metrics for WS-H | - Aggregate chunk counts (LLM vs template fallback), token usage per provider, budget exhaustion reasons, retry counts<br>- Emit structured data matching Phase 4 §3.3 schema; validate output against provided JSON example and share with WS-H via tracker<br>- Ensure budget exhaustion alone does not set gate failure flags; respect SADS §6.3 exit code semantics | - Unit tests (≥6): metrics aggregation, zero-LLM run, budget exhaustion run, schema validation, warning propagation |
| **G. Integration Fixtures** | Validate end-to-end behavior | - Update Express/React/monorepo fixtures to exercise LLM on/off, deterministic mode, cost thresholds, adversarial fallback; reuse WS-F1 fixtures where applicable<br>- Provide mock-backed CI scenario + optional manual (real provider) script; document strategy<br>- Confirm outputs grounded/anchored and summarize in tracker | - Integration tests: template mode diff (byte-identical), LLM-on structural verification, fallback triggered by adversarial chunk, cost gate compliance |

## 4. Test Inventory & Coverage Targets
- **Phase -1 prerequisite:** Complete Stage A0 analysis and document generator/validator interfaces before authoring any tests (AGENTS.md Test Best Practices).
- **Unit suites (≥50 tests total, ≥80% branch coverage):**
  - `generator.llm-orchestration.spec.ts` (Stage D, ≥12 tests).
  - `budget.manager.spec.ts` (Stage B, ≥10 tests including cost gate thresholds).
  - `cli.llm-flags.spec.ts` (Stage C, ≥10 tests covering validation matrix).
  - `validator.retry-integration.spec.ts` (Stage E, ≥10 tests for accept/retry/fallback pathways).
  - `run-summary.metrics.spec.ts` (Stage F, ≥8 tests validating schema, warnings, exit code behavior).
  - `llm.det-mode.spec.ts` (Stage D/E, ≥6 tests covering `--llm off --deterministic` byte identity, `--llm on --deterministic` structural stability, and normal variance behavior).
- **Integration fixtures:**
  - `fixtures/integration/express-api` (template vs LLM-on, cost threshold ≤30k).
  - `fixtures/integration/react-app` (structural validation, deterministic bypass, ≤40k).
  - `fixtures/integration/monorepo-small` (token budget aggregate reporting, ≤100k).
  - Reuse WS-F1 adversarial fixtures to force fallback path.
- **Golden checks:** Execute Phase 3 golden harness with `--llm off --deterministic` (expect byte-identical output) and with `--llm on --deterministic` (structural verification: anchors, factSetIds, chunk ordering). Document results in tracker.
- **Mock strategy:** All unit tests rely on deterministic provider mocks. Automated CI integration tests run exclusively with mocked providers; an optional manual script can hit real providers for exploratory validation but is excluded from acceptance gates (document usage in README).

## 5. Deliverables
- Generator integration layer with configurable LLM stage and deterministic fallback.
- Budget manager module with documented API and token usage reporting.
- CLI flag implementation + validation with updated docs (`docs/cli.md`).
- Run summary producer aligning with WS-H schema (fallback counts, token tallies, warnings).
- Updated fixtures demonstrating LLM on/off parity and fallback behavior.
- Documentation set: updates to `docs/cli.md`, notes in `docs/process/grounding.md`, run summary schema sample in `docs/examples/run-summary.json`, and test strategy notes for real-provider script.
- Coverage report (≥80%) and archived test artifacts for WS-H verification.

## 6. Parallelization & Collaboration Notes
- WS-F2 Stage A starts once WS-F1 Stage A0 (interface freeze) is logged in `docs/process/grounding.md`; later stages may still depend on Stage B adversarial fixtures for integration tests.
- Prior to Stage F completion, share proposed telemetry fields and run summary sample with WS-H; record agreement in tracker.
- Provide reference generator hooks and fallback events to WS-F1 (for adversarial suite reuse) and WS-H (for gate wiring); note availability in tracker.
- When reusing WS-F1 adversarial fixtures (Stage G), document which scenarios were exercised and any adaptations in `docs/process/grounding.md`.
- Coordinate with documentation owner for CLI updates; include usage examples for `--llm`, `--llm-budget`, `--deterministic`, and note completion in tracker.

## 7. Completion Checklist (WS-F2)
- [ ] Phase -1 analysis documented in `docs/process/grounding.md` with findings and open questions resolved.
- [ ] LLM integration respects `--llm` flag and deterministic mode bypass (unit + integration coverage).
- [ ] Budget manager enforces caps, logs warnings, meets Cost gate thresholds (Express ≤30k, React ≤40k, monorepo ≤100k), and falls back without aborting runs.
- [ ] CLI flag suite passes with coverage for valid/invalid combinations per Phase 4 §3.2.
- [ ] Retry loop honors WS-F1 contract (`accept → render`, `retry → R1/R2 prompts`, `fallback → template reuse`) with factSetId preservation.
- [ ] Run summary exposes token usage, fallback counts, warnings, and matches Phase 4 §3.3 schema; sample archived.
- [ ] Integration fixtures updated and passing in both template-only and LLM-enabled configurations (mock-backed CI + documented real-provider path).
- [ ] Golden tests green (`--llm off --deterministic` byte-identical; fallback determinism; LLM-on structural stability).
- [ ] Test execution logs, coverage reports, and run summaries archived under `.ceps/artifacts/phase4/ws-f2/`.
- [ ] Documentation updates prepared (CLI reference, run summary example, tracker entries) and cross-linked in `docs/process/grounding.md`.
