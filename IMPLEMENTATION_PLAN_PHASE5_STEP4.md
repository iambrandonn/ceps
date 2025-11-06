# Phase 5 — Step 4 Implementation Plan  
**Selective Re-Analysis Pipeline**

**Owner:** Phase 5 agent (serial execution)  
**Depends on:** Step 1 (snapshot capture), Step 2 (answers ingestion), Step 3 (impact scoping), prior phases’ reasoning/generator components  
**Blocks:** Step 5 (spec patching relies on refreshed chunks), Step 6 (finalize command wiring), Step 7 (end-to-end validation)

---

## 1. Objectives & Scope
- Re-run the reasoning → drafting → (optional) LLM polish → grounding validation pipeline on the scoped set of entities produced by Step 3, without touching unaffected chunks.  
- Ensure deterministic behavior under `--deterministic`, enforce error-handling and partial-success policy (exit code `4`), and collect per-entity results for downstream spec patching (Step 5).

Out of scope: spec patching, final summarize/CLI integration—that work happens in Steps 5–6.

---

## 2. Inputs & Dependencies
- **From previous steps:**  
  - Answers attached to KB (Step 2).  
  - ImpactReport (Step 3) with `resolvedEntities`, `impactedEntities`, diagnostics.  
  - Snapshot hash (Step 1) for consistency checks (verify before re-analysis).  
- **Existing components:**  
  - Reasoning engine (`src/reasoning/*`), LLM gateway (`src/llm/*`), grounding validator, generator (template + LLM polish pipeline).  
  - Orchestrator hooks for phase execution.  
- **Configuration defaults:**  
  - Deterministic flag propagation (`--deterministic`).  
  - LLM usage (on/off), budgets, retry behavior defined in Phase 4.

---

## 3. Estimated Effort
- Total: 3 days  
  - API surface & design updates: 0.5 day  
  - Re-analysis controller implementation with selective execution + tests: 1.5 days  
  - Error handling & partial success reporting: 0.5 day  
  - Integration tests & documentation: 0.5 day  
  - Buffer for LLM determinism edge cases: 0.5 day

---

## 4. Work Plan (Serial Tasks)

1. **Requirements Review & Data Contracts**
   - Revisit CTS-04 §5, Step 0 architecture §3 (Finalization process), Phase 4 LLM/gating specs.  
   - Inventory data per entity: factSet IDs, existing `BehaviorChunk`, associated `OpenQuestion`, anchors.  
   - Identify orchestrator entry points (`FinalizationPhase` hook) and confirm available services (`ReasoningService`, `Generator`, `LLMGateway`, `GroundingValidator`).  
   - Verify KB APIs for retrieving/updating chunks and answers (`knowledgeBase.getBehaviorChunk`, etc.); note gaps for follow-up.

2. **API Surface Definition**
   - Define controller interface `reanalyzeEntities(impactReport: ImpactReport, options: ReanalysisOptions): ReanalysisResult`.  
   - Declare TypeScript contracts:
     ```typescript
     export interface ReanalysisOptions {
       deterministicMode: boolean;
       llmEnabled: boolean;
       llmBudgetTokens?: number;
       reasoningEnabled: boolean;  // allow skipping reasoning upgrades if false
     }

     export interface FailedEntity {
       entityId: string;
       reason: 'llm-failure' | 'grounding-reject' | 'kb-inconsistency';
       details: string;
       originalChunk: BehaviorChunk;
     }

     export interface ReanalysisResult {
       updatedChunks: Map<string, BehaviorChunk>; // entityId → refreshed chunk
       failedEntities: FailedEntity[];
       warnings: string[];
       metrics: {
         tokensUsed: number;
         entitiesProcessed: number;
         entitiesFailed: number;
         runtimeMs: number;
       };
     }
     ```
   - Confirm Step 5 consumes `updatedChunks` map (in-memory staging; KB remains unchanged until patching).

3. **Selective Execution Pipeline**
   - Verify snapshot hash (Step 1) still matches before processing; abort with exit code `3` if mismatch and no `--reconcile`.  
   - Process entities in the exact order of `impactReport.impactedEntities` (already sorted).  
   - For each entity (sequentially):
     1. Load original `BehaviorChunk` and factSets from KB (`kb.getChunk(entityId)`, `kb.getFactSetsBySubject`).  
     2. Regenerate deterministic template text using a new helper (e.g., `EntityChunkGenerator`) that mirrors `SpecGenerator.generateChunkDraft` logic (reuse `MarkdownRenderer`).  
     3. If `options.reasoningEnabled`, invoke reasoning refresh (`IntentLifter.liftIntent` + `AmbiguityResolver.enrichChunk`) scoped to this entity to adjust confidence.  
     4. If `options.llmEnabled`, call `LLMGateway.summarize` with deterministic mode flag and budget tracking; capture tokens used.  
     5. Run `GroundingValidator.validate` with retry policy; on failure after retries, fall back to template draft and log warning.  
   - Maintain deterministic execution (no parallelism; neighbors processed sequentially).  
   - Store refreshed chunk in `updatedChunks` map (keyed by entityId) without mutating KB.  
   - Preserve original chunk (for failure reporting) and maintain chunk IDs to simplify Step 5 replacement.

4. **Error Handling & Partial Success Policy**
   - Recognize failure scenarios: LLM error/budget exhaustion, grounding reject after retries, missing KB data (factSets/chunk).  
   - On failure: append `FailedEntity`, retain original chunk, keep QIDs unresolved, and emit deterministic warning (include entityId + reason).  
   - Emit exit code `4` if `failedEntities.length > 0`; still produce `updatedChunks` for successful entities.  
   - Unit tests simulating each failure type, ensuring warnings logged and diagnostics populated.

5. **Determinism & LLM Behavior**
   - If `options.deterministicMode` is true:  
     - Invoke LLM gateway in deterministic configuration (temperature 0, caching).  
     - If LLM cannot guarantee determinism, skip polish and use template chunk (record warning).  
   - Ensure chunk ordering and text reproduction deterministic (tests compare repeated runs byte-for-byte).  
   - Document fallback behavior (template-only) when LLM disabled or deterministic mode enforced.

6. **Output Assembly for Step 5**
   - Aggregate metrics (tokens, counts, runtime) during processing.  
   - Return `ReanalysisResult` with populated maps/arrays; ensure warnings include cap diagnostics from Step 3 if relevant.  
   - Do not mutate KB or KB serialization; Step 5 will consume `updatedChunks` to patch specs.  
   - Integration tests on baseline fixture verifying expected chunk updates, plus scenario with partial failures.

7. **Fixture & Golden Assets**
   - Produce fixture outputs:  
     - `reanalysis.success.json` (all entities succeed).  
     - `reanalysis.partial.json` (mixed success with exit code `4`).  
     - Additional targeted fixtures (e.g., LLM failure, grounding reject) as needed.  
   - Store test expectation variants under `tests/fixtures/phase5/baseline/tiny-react/expected/` when they are purely verification artifacts.  
   - Update README detailing scenarios, expected exit codes, and regeneration steps.

   **Snapshot Regeneration Checklist (REQUIRED)**
   - [ ] Run `npx tsx scripts/regenerate-phase5-snapshot.mjs` after modifying fixture files.  
   - [ ] Verify snapshot contents (`jq '.files | length' tests/fixtures/phase5/baseline/tiny-react/.ceps/snapshot.json`) and confirm new files present.  
   - [ ] Execute snapshot test: `npm test -- --run tests/integration/snapshot-capture.test.ts`.  
   - [ ] Commit updated `.ceps/snapshot.json` together with fixture changes and rerun full `npm test`.

8. **Documentation Updates**
   - Extend `docs/phase5-finalization-architecture.md` with controller flow diagram, interface definitions, failure policy, determinism rules.  
   - Document how warnings/metrics feed the CLI dry-run summary.  
   - Note deferred enhancements (parallel processing, caching) for Phase 6 backlog.

---

## 5. Testing Strategy
- **Unit tests**
  - Controller logic (entity ordering, selective execution).  
  - Failure handling (LLM failure, grounding reject, KB data missing).  
  - Determinism enforcement (repeated runs).  
- **Integration tests**
  - Baseline fixture finalization pass verifying specific chunk updates.  
  - Scenario with mixed success/failure and correct exit code `4`.  
- **Golden tests**
  - Stored re-analysis outputs (`reanalysis.output.json`) ensuring deterministic text.  
- **Performance sanity**
  - Measure re-analysis time vs impacted entity count; capture metrics for Step 7 reports.

---

## 6. Deliverables
- Re-analysis controller module and wiring into orchestrator finalization path.  
- Updated KB or intermediate structures to hold refreshed chunks.  
- Test suites (unit, integration, golden) validating selective pipeline.  
- Documentation updates covering flow, error policy, and determinism.

---

## 7. Exit Criteria
- Impacted entities re-analyzed deterministically with refreshed chunks ready for patching.  
- Failures handled gracefully (exit code `4`, diagnostics recorded).  
- Tests (unit + integration + golden) pass with ≥80% coverage over re-analysis logic.  
- Documentation updated with re-analysis flow, determinism behavior, and failure policy.  
- No open questions blocking Step 5 patching.

---

## 8. Risks & Mitigations
- **LLM non-determinism:** enforce template fallback under `--deterministic`, use caching for LLM outputs.  
- **Grounding failures:** ensure retries + template fallback to preserve coverage.  
- **Performance:** monitor re-analysis time; consider batching entities for large scopes.  
- **State drift:** ensure KB updates are transactional; rollback on failure if needed.
- **Sequential execution:** current step runs sequentially by design; note parallelization as Phase 6 enhancement once correctness validated.

---

## 9. Follow-ups for Later Steps
- Step 5 consumes `ReanalysisResult` to patch specs.  
- Step 6 surfaces diagnostics/partial success in CLI output.  
- Step 7 validates end-to-end finalization run with selective re-analysis.
