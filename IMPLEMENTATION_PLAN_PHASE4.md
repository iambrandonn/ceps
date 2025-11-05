# ceps — Phase 4 Implementation Plan (Grounding & Polish)

## 1. Context & Goals
- Elevate the Phase 2/3 pipeline into an LLM-grounded flow that satisfies SADS §8 grounding guarantees and the High-Level Implementation Plan (HLIP) M1 milestone.
- Enforce Coverage, Link, Grounding, and Determinism gates at the orchestrator layer so every run exits with explicit pass/fail semantics while keeping existing M0 gates green.
- Preserve the deterministic template baseline: `--llm off` must continue to emit identical outputs under `--deterministic`, with LLM polish treated as an additive layer backed by reliable fallback.

## 2. Prerequisites & Dependencies
- Phase 3 workstreams are complete and stable (≥80% branch coverage):
  - **WS-A:** KB indices, reverse-deps graph, and confidence scoring API published.
  - **WS-D:** Reasoning & ambiguity resolver produces factSet ↔ behavior chunk attribution.
  - **WS-E:** Two-phase cross-link validation passing; Link gate already enforced.
  - **WS-H:** Orchestrator phase coordination and deterministic mode wiring.
- Phase 2 LLM Gateway skeleton (provider adapters, cache, budget scaffolding) merged and validated via smoke tests.
- Verify Phase 2 provider adapters (Anthropic, OpenAI/Azure, local) availability; document any gaps for WS-F2 Stage A0 Phase-1 analysis.
- Spec generator already emits factSetIds for every behavior chunk and persists mapping back to the KB.
- CI pipeline, fixtures, golden-output harness, and deterministic testing infrastructure in place.

## 3. Workstreams (High-Level Scope)

### 3.1 WS-F1 — Grounding Validator & Rule Engine
**Responsibilities**
- Implement validator core covering SADS §8 and CTS-02 §4.2 requirements: entity/relationship entailment, numeric/enum guardrails, scope enforcement, lexicon normalization, pronoun resolution.
- Provide retry controller (Original → Retry 1 → Retry 2 → template fallback) with progressively stricter prompts.
- Persist validator diagnostics for `--debug` runs (chunk id, failing rule, reason).
- Manage lexicon artifacts (`ceps.lexicon.json` initial contents, update workflow, tests).

**Validator Algorithm (Decision Flow)**
1. Extract referenced identifiers (backticks, PascalCase/camelCase tokens, dotted paths) and numeric literals from candidate chunk.
2. Normalize text using lexicon map; resolve pronouns against chunk-local antecedents.
3. Lookup identifiers via the validator-maintained name index built from KB `getAllEntities()` and constrain matches to the chunk’s factSetId scope; reject if absent or mismatched kind.
4. Validate numeric/enum claims against factSet payloads with the following rules:
   - Permit unit conversion using standard rates (ms↔s, KB↔MB, etc.).
   - Allow nearest-integer rounding when `|converted - original| / original ≤ 0.05`.
   - Examples: `5123ms` → “5 seconds” (5000ms, 2.4% delta) ✅; `5123ms` → “6 seconds” (6000ms, 17% delta) ❌; `127KB` → “0.1 MB” (128KB, 0.8% delta) ✅.
   - Enums must match exactly; no tolerance window.
5. Ensure no out-of-scope references (chunk must only cite its declared factSetIds).
6. On failure, emit diagnostic + retry signal; after second failure, trigger template fallback and log warning.

**Pronoun Resolution Rules**
- Scope limited to a single behavior chunk (may span multiple sentences/bullets).
- First mention of any entity must be explicit; pronouns may only appear after the antecedent within the same chunk.
- Reject chunks beginning with pronouns or referencing entities introduced in other chunks without restatement.

**Adversarial Suite Scope (≥20 scenarios)**
- Hallucinated entities, methods, routes, or configs.
- Numeric drift (rounding beyond threshold, unit swaps).
- Scope violations (references to unrelated modules).
- Synonym drift outside lexicon, pronoun misuse.
- Mixed cases (valid + invalid facts).

**Lexicon Management**
- File: `src/validation/lexicon/ceps.lexicon.json`.
- Format: JSON object mapping canonical tokens to arrays of synonyms, e.g.:
  ```json
  {
    "fetch": ["retrieve", "get", "load"],
    "validate": ["check", "verify", "ensure"],
    "emit": ["return", "yield", "produce"],
    "persist": ["save", "store"],
    "notify": ["alert", "signal", "announce"]
  }
  ```
- Update workflow: submit PR updating lexicon file plus validator tests covering new synonyms; Reasoning owner reviews for semantic accuracy.
- Tests ensure synonyms normalize to canonical terms and unmapped words trigger validator rejection.
- WS-F1 owns lexicon management; downstream workstreams (WS-F2/WS-H) treat the validator as the enforcement point and do not modify lexicon data.

### 3.2 WS-F2 — LLM Gateway Integration  
**Implements:** CTS-02 §2–§6 (LLM gateway, CLI, retry/fallback), CTS-07 §3–§4 & §7–§10 (budgeting, determinism, telemetry)

**Responsibilities**
- Inject CTS-02 §6 gateway calls into the generator pipeline: wrap `summarize(factSets[], style, options)` for polish and `validate(chunkDraft, factSets[], metadata)` for grounding checks while preserving deterministic behavior.
- Enforce CTS-02 §2 CLI semantics and CTS-07 §4 budgeting: consult token governor before each call, respect `--llm-budget`, `--llm-provider/model`, `--no-llm-cache`, and surface telemetry for WS-H.
- Orchestrate validator retries and template fallback while maintaining factSetId attachment (CTS-02 §5).
- Guarantee template baseline remains selectable via `--llm off` with zero LLM calls; `--deterministic` locks paraphrase variance per CTS-07 §7.

**API Contracts (aligned with CTS)**
- **LLM polish wrapper:** Provide generator helper (e.g., `applyLLMPolish(chunkContext)`) that prepares factSets/style/options then calls CTS-02 §6 `summarize`. Returned text is threaded back into generation flow with provenance data, coordinating with CTS-03 §3 two-phase rendering (anchor index build → render) so polish occurs between phases without breaking anchor consistency.
- **Validator wrapper:** Use CTS-02 §6 `validate` directly (or via thin wrapper) so outcomes remain `accept|retry|fallback`. Feed chunk metadata (chunk id, target entity, confidence) as defined in WS-F1; this metadata is an implementation elaboration used for diagnostics and run-summary context.
- **Budget manager:** Implement helper that delegates to CTS-07 §8 `withBudget(kind, tokens)`; returns `{allowed: boolean, remaining: number}` for generator convenience.
- Update CLI parsing to support CTS-02 §2 flags (`--llm`, `--llm-provider`, `--llm-model`, `--llm-budget`, `--no-llm-cache`, `--deterministic`); add validation tests.

**Fallback Semantics**
- On validator outcome `fallback`, budget exhaustion, or provider/network errors, emit template text, annotate run summary, and ensure Grounding gate treats fallback as pass (factSetIds intact, fallback reason recorded) consistent with CTS-02 §5.

**CLI Flag Ownership**
- Verify Phase 2 implementation status; WS-F2 closes gaps for any missing or partial flags.
- Validation rules (elaborating CTS-02 §2 behavior):
  - `--llm` accepts `on|off` (default `on`). When `off`, related flags (`--llm-budget`, `--llm-provider`, `--llm-model`, `--no-llm-cache`) emit warnings and are ignored.
  - `--llm-provider` limited to `anthropic|openai|azure|local`; unsupported provider yields actionable error listing supported options.
  - `--llm-model` validated against configured provider; mismatches produce descriptive error.
  - `--llm-budget` requires positive integer; missing/zero triggers error; `--llm off` + budget logs “unused budget” warning.
  - `--no-llm-cache` valid only when `--llm on`; otherwise emits warning.
- Test suite (~10 cases) covers valid/invalid combinations, default behaviors, and warning paths.

**Budget Manager Behavior (CTS-07 elaboration)**
- Budget scope is per run across all providers; summary reports total consumption per provider and remaining headroom.
- Token estimation uses provider tokenizers (Anthropic SDK, tiktoken, etc.) based on prompt + response templates; estimation recorded for audit.
- When `withBudget` denies a request, generator switches current and subsequent chunks to template mode, adds warning (“LLM budget exhausted; falling back to templates”), and increments fallback counters.
- Budget exhaustion never aborts the run; fallback maintains Coverage gate compliance.

### 3.3 WS-H — Orchestrator Gate Enforcement
**Responsibilities**
- Formalize gate evaluation order and policy: Coverage → Link → Grounding → Determinism (conditional on `--deterministic`).
- Decide fail-fast vs aggregate: evaluate all gates, record failures, exit with consolidated status (exit code 2 if any gate fails).
- Produce structured run summary (JSON + console table) enumerating per-gate status, counts of fallback chunks, token usage, adversarial suite status.
- Validate CLI UX: incompatible flag combinations raise actionable errors; provide `--debug` exposes validator trace hooks.

**Run Summary Format Example**
```json
{
  "gates": {
    "coverage": {"status": "pass", "exported": 45, "documented": 45, "qids": 0},
    "link": {"status": "pass", "anchors": 123, "broken": 0},
    "grounding": {"status": "pass", "chunks": 287, "validated": 245, "fallback": 42},
    "determinism": {"status": "pass", "reruns": 2, "diffs": 0}
  },
  "tokens": {"total": 28450, "budget": 30000, "providers": {"anthropic": 28450}},
  "adversarial": {"total": 23, "rejected": 23, "pass": true},
  "warnings": ["LLM budget exhausted: 5 chunks fell back to template"],
  "exit_code": 0
}
```

### 3.4 Cross-Cutting Activities
- Documentation updates (`docs/cli.md`, `docs/process/grounding.md`, run summary reference).
- Golden-output fixture refresh to capture template vs LLM-on behavior; ensure deterministic comparisons.
- Coordinate with Reasoning and KB owners to refine fact schemas if validator flags false positives.
- Confirm provider adapter coverage (Anthropic primary, OpenAI/Azure/local secondary) and document support matrix.

## 4. Dependency Graph & Agent Assignment

### 4.1 Dependency Graph
```
Phase 3 Complete
    ↓
Define WS-F1 Validator APIs and Tests
    ↓
┌─────────────────────────────┐
│ WS-F1 Grounding Validator   │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│ WS-F2 LLM Integration       │ (depends on WS-F1 interfaces)
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│ End-to-End Validation       │
└──────────────┬──────────────┘
               ↓
Phase 4 Complete → Phase 5 ready
```

```
WS-F1 APIs Stable
        ↓
┌─────────────────────────────┐
│ WS-H Orchestrator Gates     │ (can progress in parallel with WS-F2 once API known)
└─────────────────────────────┘
```

### 4.2 Agent Assignment (Indicative)
- **Agent 1:** WS-F1 → WS-F2 sequentially (ensures validator contracts and integration remain aligned).
- **Agent 2:** WS-H in parallel once WS-F1 exposes stable validator interface types; collaborates on shared fixtures and end-to-end validation.

### 4.3 Checkpoints
1. **Validator API freeze:** Interfaces agreed between Generator, Validator, and Orchestrator teams; mock implementations available for WS-H tests.
2. **Workstream unit suites green (≥80% coverage each):** WS-F1, WS-F2, WS-H.
3. **End-to-end fixture runs succeed in LLM-on/off modes with gates passing.**
4. **M1 gate report generated and signed off.**

## 5. Deliverables & Acceptance Criteria

### 5.1 Workstream Deliverables
- **WS-F1:** Grounding validator module, lexicon asset, retry controller, adversarial test suite, debug diagnostics.
- **WS-F2:** Generator integration hooks, budget governor enforcement, CLI flag coverage, template fallback orchestration.
- **WS-H:** Gate evaluation engine, exit code enforcement, enhanced run summary, CLI validation for new flags.

### 5.2 Gate Criteria (M1 + Regression) — Phase 4 Validation Gates
| Gate | Pass Criteria | Measurement | Failure Exit |
|------|---------------|-------------|--------------|
| **Coverage** (regression) | 100% exported/public surfaces documented or carry QIDs | Existing Phase 3 coverage checks | 2 |
| **Link** (regression) | No broken anchors; two-phase validation clean | Existing Phase 3 link validator | 2 |
| **Grounding** | Every chunk has factSetId AND (passes validator OR uses template fallback) | Validator report across run | 2 |
| **Cost** | Token usage ≤ configured `--llm-budget` for reference fixtures (Express ≤30k, React ≤40k, monorepo ≤100k tokens) | Budget governor metrics | 2 |
| **Readability** | Manual review (3 reviewers: product, engineering, external) across 10 sampled chunks scoring clarity (0-3), conciseness (0-3), accuracy (0-4). Aggregate LLM ≥7/10, template baseline ≥5/10. Results logged in `PHASE4_READABILITY_REVIEW.md` with rubric and notes. | Product/UX review log | Advisory |
| **Adversarial** | 100% of 20+ adversarial tests rejected by validator | Automated suite | 2 |
| **Determinism** | With `--deterministic`, template mode and LLM fallback paths produce identical output across runs | Golden diff harness | 2 |
| **Test Coverage** | ≥80% branch coverage for WS-F1, WS-F2, WS-H suites; all tests green | nyc/c8 reports | 1 |

These validation gates are specific to Phase 4 delivery and supplement the product gates defined in SADS §10 (Coverage, Grounding, Confidence, Monorepo, Finalization, Determinism).

### 5.3 Additional Acceptance Conditions
- Orchestrator exit codes respect SADS §6.3 (0 success, 1 internal error/test failure, 2 gate failure, 3 snapshot mismatch).
- Run summary includes: gate statuses, fallback counts, token spend per provider, adversarial suite outcome, warnings.
- CLI supports `--llm`, `--llm-provider`, `--llm-model`, `--llm-budget`, `--no-llm-cache`, `--deterministic`; invalid combinations raise descriptive errors.
- Template-only path validated (LLM disabled) to ensure Phase 5 Finalization can assume deterministic baseline.

**Reference Fixtures for Cost Gate**
- Express API: `fixtures/integration/express-api` (Phase 2 smoke test) → ≤30k tokens.
- React app: `fixtures/integration/react-app` → ≤40k tokens.
- Small monorepo: `fixtures/integration/monorepo-small` → ≤100k tokens.
- Create/adjust fixtures to meet thresholds if they diverge; capture token usage snapshots in run summary for audit.

## 6. Integration Architecture & Data Flow
1. **Template Draft:** Generator produces deterministic chunk from factSets.
2. **Budget Check:** LLM gateway estimates tokens; governor approves or denies.
3. **LLM Polish (optional):** If budget allows and `--llm on`, gateway generates candidate prose.
4. **Grounding Validation:** Validator inspects candidate; on failure, triggers retry with stricter prompt (R1), then R2.
5. **Fallback & Error Handling:** After R2 failure, budget denial, or provider/network error, generator reverts to template chunk, annotates reason, and records warning.
6. **Aggregation:** LLM-approved chunks reassembled into file/directory specs; factSetIds preserved.
7. **Gate Evaluation:** Post-generation, orchestrator evaluates gates using accumulated metadata.

Sequence diagram (simplified):
```
Generator → LLM Gateway → LLM Provider
Generator ← polished text | error
Generator → Grounding Validator (text, factSetIds)
Validator → Generator (accept | retry | fallback)
Generator ← fallback text when fail/budget/error
Generator → Orchestrator (chunk result, diagnostics)
Orchestrator → Gate Engine → Run Summary / Exit Code
```

## 7. Test & Tooling Strategy

### 7.1 TDD Workflow
- Follow Red → Green → Refactor → Commit for every feature.
- Unit tests written first for validator rules, integration seams, and gate evaluation.
- Pull requests must include failing test reference before implementation commit.
- Phase -1 analysis: agents review Phase 3 generator outputs and KB schemas prior to writing tests to model realistic data structures.
- Encourage pairing between WS-F1 and WS-F2 agents when defining validator interfaces to keep tests aligned.

### 7.2 Unit Test Coverage Targets
- **WS-F1 (≥50 tests):** entitlement, numeric/enum, scope, lexicon normalization, retry controller, fallback behavior.
- **WS-F2 (≥50 tests):** LLM call orchestration, factSetId propagation, budget enforcement, CLI flag parsing interactions, deterministic bypass.
- **WS-H (≥25 tests):** gate ordering, mixed pass/fail scenarios, exit code mapping, run summary formatting, CLI validation errors.

### 7.3 Integration & Golden Tests
- End-to-end fixtures: Express app, React app, small monorepo. Execute in both template-only and LLM-enabled modes with `--llm-budget` limits; assert gate outcomes, token budgets, and fallback counts.
- Golden harness:
  - Run with `--llm off --deterministic`, capture outputs, re-run to verify byte-identical results.
  - Force validator rejection (mock invalid LLM response) to confirm template fallback determinism.
  - With `--llm on`, verify structural stability (sections, anchors, factSetIds) rather than prose equality; accept stylistic variance that passes validator.
- Smoke tests for CLI combinations (`--llm off`, `--llm-provider`, unsupported provider, `--deterministic` + `--llm on`, `--no-llm-cache`) verifying expected behavior.

### 7.4 Adversarial Suite
- Dedicated fixture set stored under `fixtures/adversarial/phase4/`.
- Each scenario includes `factSets.json`, `candidate.md`, and expected validator outcome; automated pipeline ensures 100% rejection rate for invalid prose.
- Example scenarios:
  - `hallucinated-entity/`: chunk references `UserService` absent from factSets.
  - `numeric-drift/`: chunk states “10 seconds” while factSet records `5000ms`.
  - `scope-violation/`: chunk references entities from unrelated factSetIds.
  - `synonym-outside-lexicon/`: chunk uses “acquire” for fetch action (not in lexicon).
  - `pronoun-no-antecedent/`: chunk begins “It validates…” with no prior entity reference.
  - `mixed-valid-invalid/`: chunk includes both accurate and hallucinated facts to ensure rejection.
- Include regression tests for hallucination patterns discovered in Phase 2/3.

### 7.5 Tooling & Instrumentation
- Extend `vitest` configuration for targeted suites; enforce coverage thresholds via `c8`.
- Add debug logging toggled by `--debug-grounding` (alias of `--debug` or sub-option) capturing validator path decisions without polluting normal runs.

## 8. Risks & Mitigations
- **LLM variability:** Low-temperature defaults, deterministic mode bypass, cache keyed by (facts, provider, style version); golden tests detect drift.
- **Validator false positives:** Collaborate with Reasoning team to adjust fact schemas; leverage debug traces for rapid diagnosis.
- **Token budget overruns:** Hard budget governor with clear warnings; fallback keeps run viable; summary reports top offending chunks.
- **Gate regressions:** Comprehensive unit + integration tests; fail-safe defaults keep exit code 2 if any gate check raises errors.
- **CLI misuse:** Robust validation with actionable messages; document examples; tests cover negative cases.

## 9. Phase Completion Process
- Execute **PHASE_COMPLETION_CHECKLIST.md** (create/update if missing) covering documentation updates, CI verification, artifact capture.
- Update `IMPLEMENTATION_PLAN.md`, `AGENTS.md`, and this plan with final status and metrics.
- Publish `PHASE4_COMPLETION_SUMMARY.md` (results, metrics, gates) and `PHASE4_OVERALL_FEEDBACK.md` (retro, follow-ups).
- Refresh README (phase status, next steps) and relevant docs (`docs/cli.md`, `docs/process/grounding.md`).
- Archive run summaries and test reports under `.ceps/artifacts/phase4/` (if policy allows) for Phase 5 reference.

**Phase Completion Checklist** (maintain in `PHASE_COMPLETION_CHECKLIST.md`)
- [ ] WS-F1, WS-F2, WS-H unit suites passing with ≥80% branch coverage.
- [ ] Integration fixtures (Express, React, monorepo) pass in template-only and LLM-enabled modes.
- [ ] Adversarial suite rejects 100% invalid candidates.
- [ ] Golden tests green (`--llm off --deterministic` and fallback determinism).
- [ ] Regression gates (Coverage, Link, Determinism) pass.
- [ ] M1 gates (Grounding, Cost, Readability, Adversarial) pass per §5.2.
- [ ] Run summary archived with token usage within thresholds.
- [ ] Documentation updates merged (`IMPLEMENTATION_PLAN.md`, `AGENTS.md`, README, CLI/grounding docs).
- [ ] `PHASE4_COMPLETION_SUMMARY.md` and `PHASE4_OVERALL_FEEDBACK.md` published.
- [ ] Artifacts stored under `.ceps/artifacts/phase4/`.
- [ ] Phase 5 readiness review completed (Finalization prerequisites confirmed).

## 10. Out of Scope / Deferred
- Finalization Engine implementation (Phase 5, CTS-04).
- Framework-specific prompt tuning beyond baseline lexicon.
- Performance telemetry, worker-pool optimizations, and advanced gate overrides (Phase 6).
- Extended reconciliation workflows beyond existing `--reconcile` flag semantics.

## 11. CTS Traceability Matrix

| Workstream | CTS / SADS References | Plan Elaborations & Notes |
|------------|-----------------------|---------------------------|
| **WS-F1 Grounding Validator** | CTS-02 §4.2 (validation rules), §4.3 (outcomes), §4.4 (retry prompts), §6 (validator interface); SADS §8 (Grounding) | Adds numeric tolerance formula (≤5% delta), pronoun heuristic, lexicon JSON format/workflow, diagnostics schema, adversarial coverage, and optional metadata parameter for diagnostics when invoking `validate`. |
| **WS-F2 LLM Gateway Integration** | CTS-02 §2–§6 (CLI, prompting, fallback, gateway APIs), CTS-07 §3–§4 (lifecycle, budgeting), §7–§10 (determinism, telemetry) | Wraps CTS `summarize`, `validate`, and `withBudget`; specifies tokenizer guidance, CLI validation UX, fallback logging, run-summary metrics. |
| **WS-H Orchestrator Gates** | CTS-07 §5–§11 (phase coordination, gates, exit codes, metrics); SADS §6.3 (exit codes), §10 (product gates) | Implements gate sequencing, exit codes, structured run summary; introduces supplemental validation gates (Cost, Readability, Adversarial, Test Coverage) for Phase 4 acceptance. |
| **Cross-Cutting Documentation & Artifacts** | CTS-02 §7 (acceptance), CTS-07 §12 (observability) | Ensures `docs/cli.md`, `docs/validator-api.md`, tracker updates, and artifact archives capture CTS contracts and runtime metrics. |

**Interface alignment:** Phase 4 references the canonical CTS-02 §6 (`summarize`, `validate`) and CTS-07 §8 (`withBudget`) interfaces. Any helper functions must delegate to these. Proposed interface improvements should be made by updating CTS first, then revising this plan.
