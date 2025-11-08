# Phase 5 — Step 0: Finalization Interface & Persistence Analysis

**Owner:** Phase 5 agent (single-threaded delivery)  
**Depends on:** Phase 4 complete, CTS-04 baseline approved  
**Blocks:** All subsequent Phase 5 steps (snapshot capture, answers ingestion, scoped re-analysis)  
**TDD Discipline:** Applies to any prototype code produced during investigation; primary deliverable is an analysis report feeding later steps.

---

## Objective

Establish the integration architecture for finalization by auditing existing components, selecting the Knowledge Base persistence strategy, and enumerating concrete API extensions / generator hooks / orchestrator phases required before implementation begins.

This step answers: *“How will finalization reuse the existing pipeline without re-running scan/parse, and what code changes are mandatory to make that possible?”*

---

## Estimated Effort

- **Total duration:** 2–3 days (assuming Phase 4 codebase is stable and CTS docs current)
- **Breakdown:** Tasks 1–2 (~1 day), Tasks 3–5 (~1 day), Tasks 6–8 (~0.5–1 day)
- **Risk:** Discovery of major architectural gaps (e.g., KB serialization blocker) may extend timeline and require plan updates.

---

## Investigation Topics & Questions

| Topic | Primary Spec References |
|---|---|
| KB Persistence | CTS-04 §2–§3, CTS-01 §5, SADS §9 |
| KB API Surface | CTS-04 §5, CTS-01 §4 |
| Spec Generator Patch Mode | CTS-04 §5, CTS-03 §3–§5 |
| Orchestrator Integration | CTS-04 §6, CTS-07 §3–§7 |
| Existing Data Contracts | CTS-01 §3, CTS-03 §3, SADS §4 |
| Risk & Dependency Audit | CTS-04 §8, SADS §11 |

1. **Knowledge Base Persistence**
   - Do existing KB modules (`src/kb/*`) already support serialization? If not, what structure must be captured (entities, relations, factSets, indices, chunk metadata)?
   - Storage format decision: JSON vs binary; location `.ceps/kb-state.json` (confirm directory handling).
   - Versioning requirements for persisted KB (schema version field, backward compatibility strategy).
   - Size estimates and performance considerations; identify need for compression or streaming.

2. **KB API Surface**
   - Inventory current public methods (`insert*`, `update*`, `get*`, indices) and map against new needs:
     - `attachAnswer(qid, answer)`
     - `markQIDResolved(qid)`
     - `computeImpactedEntities(resolvedQids, opts)` returning structured impact report (direct/transitive lists, diagnostics)
     - `serialize(path)`, `deserialize(path)` (if persistence selected)
   - Determine whether these live on the KB class or helper services (e.g., `FinalizationService` that wraps KB).
   - Identify required typing updates (`QID`, `ImpactReport` interfaces).

3. **Spec Generator Patch Mode**
   - Review generator entry points (`src/generator/*`) to understand current rendering pipeline.
   - Confirm anchor metadata availability to target specific sections.
   - Identify best insertion point for “patch mode” (load existing Markdown, replace anchor-delimited sections).
   - Define Finalization Summary insertion mechanics (location after title, deterministic ordering).

4. **Orchestrator Integration**
   - Locate orchestrator phase definitions (`src/orchestrator/*`); document current phase sequence.
   - Determine how to add a `finalize` phase that:
     - Loads snapshot + persisted KB
     - Skips scan/parse when KB is available
     - Invokes new finalization controller (answers → impact scope → re-analysis → patch)
   - Confirm CLI configuration plumbing for new flags (`--answers`, `--dry-run`, etc.) and deterministic propagation.

5. **Existing Data Contracts**
   - Verify factSet ↔ chunk attribution (source files in `src/reasoning` / `src/generator`) to ensure re-analysis can target specific chunks.
   - Confirm QID tracking (where QIDs are stored, how they map to entities/chunks).
   - Document any assumptions that later steps must respect (e.g., chunk IDs stability).

6. **Risk & Dependency Audit**
   - Identify potential blockers (e.g., cyclic dependencies preventing serialization, anchor data missing).
   - Suggest mitigation tasks (stub APIs, refactors) that might need to happen before Step 1 can start.

---

## Work Plan (Serial Tasks)

1. **Doc & Code Reconnaissance**
   - Re-read CTS-04 §§2–6, SADS §9, and updated Phase 5 high-level plan to refresh requirements.
   - Inspect relevant code directories:
     - `src/kb/` (models, storage, transaction APIs)
     - `src/orchestrator/` (phase wiring, CLI flag parsing)
     - `src/generator/` (render pipeline, anchor/QID handling)
     - `src/reasoning/` (chunk metadata, confidence scoring)
   - Capture notes on current capabilities vs gaps.
   - Audit existing test fixtures to confirm which produce Open Questions (QIDs), catalog entity types/confidence levels represented, and flag any fixture enhancements required for finalization validation.
   - Review existing error-handling and determinism propagation patterns so proposed partial-success semantics align with established conventions.

2. **Persistence Feasibility Study**
   - Prototype (analysis-only, not committed) how KB data could be serialized (identify required fields, cyclic references, indices).
   - Evaluate file size / serialization time using existing fixtures (if prototype code written, add temporary scripts and discard after measurement).
   - Decide on persistence approach (JSON + schema version recommended) and document justification.

3. **API Gap Mapping**
   - Create table listing needed APIs vs existing functions, indicating:
     - Reuse as-is
     - Extend (specify new parameters)
     - Net-new method (include proposed signature)
   - Define `ImpactReport` structure (fields: `direct`, `transitive`, `total`, `diagnostics`, `warnings`) via TypeScript interface definitions.

4. **Generator Patch Flow Design**
   - Describe algorithm for patch mode:
     1. Load existing Markdown.
     2. Locate sections via anchors.
     3. Replace impacted sections with regenerated text.
     4. Insert/update Finalization Summary block.
   - Note data structures required from KB (chunk IDs, anchor map).
   - Highlight any necessary adjustments to generator outputs (e.g., ensure anchors stored alongside chunk data).

5. **Orchestrator Phase Blueprint**
   - Draft sequence diagram (textual) for finalize command:
     ```
     loadConfig → verifySnapshot → loadKB → parseAnswers → scopeImpacts →
     reanalyzeImpacted → patchSpecs → runGates → emitSummary
     ```
   - Specify CLI flag propagation and exit code mapping (including partial success).
   - Document how dry-run short-circuits mutating steps while still generating diagnostics.
   - Record determinism propagation (`--deterministic` → orchestrator → finalization pipeline → LLM polish / generator) and summarize existing failure-handling patterns to maintain consistency.

6. **Integration Architecture Report**
   - Consolidate findings into `docs/phase5-finalization-architecture.md` (or agreed location) summarizing:
     - Persistence decision and schema outline
     - Required KB / generator / orchestrator changes
     - Open questions or risks
   - Follow this structure for completeness:
     1. Executive Summary
     2. Persistence Strategy (decision, schema outline, versioning, storage location, perf notes)
     3. KB API Extensions (method table with TypeScript signatures, `ImpactReport` definition)
     4. Spec Generator Patch Mode (algorithm, anchor requirements, Finalization Summary mechanics)
     5. Orchestrator Finalization Phase (sequence, CLI flag table, exit codes, dry-run behavior, determinism path)
     6. Data Contract Verification (factSet↔chunk, QID tracking, assumptions)
     7. Risks & Mitigations
     8. Open Questions (owners, follow-up steps)
     9. Sign-off (stakeholders & date)
   - Update `IMPLEMENTATION_PLAN_PHASE5.md` if new blockers or scope adjustments emerge.

7. **Baseline Golden Output Generation**
   - Run the current ceps pipeline on at least one fixture that emits QIDs (augment fixture per audit if needed).
   - Capture baseline artifacts:
     - Generated `spec.md` files with unresolved QIDs
     - Existing `.ceps` artifacts (snapshot, run summaries) if produced
     - Enumerated list of QIDs for constructing future `answers.md`
   - Store results in `tests/fixtures/phase5/baseline/` (or agreed directory) with README noting fixture details and rationale.

8. **Approval Checkpoint**
   - Review report and baseline artifacts with stakeholders (project lead, product owner, reviewer — confirm list at task start).
   - Ensure all questions from reviewer feedback (FEEDBACK-01) are answered explicitly.
   - Obtain go/no-go for proceeding to Step 1.

---

## Deliverables

- Integration Architecture Report (markdown) following the defined structure.
- Baseline golden outputs for Phase 5 fixtures (specs, snapshots, QID inventory).
- Updated backlog/plan (if Step 0 findings require plan adjustments).
- Optional prototypes or scripts (discarded or moved to `/scratch` per repo guidelines) used to validate serialization feasibility.

---

## Exit Criteria

- Persistence strategy chosen and documented with schema outline + versioning approach.
- Comprehensive list of KB/Generator/Orchestrator changes with proposed signatures/interfaces.
- Finalization Summary format and placement confirmed in design notes.
- Dry-run and partial-success behaviors defined at spec level.
- No unresolved critical questions from FEEDBACK-01; any remaining minor questions tracked for future steps.
- Stakeholder sign-off recorded (comment in report or issue tracker reference).
- Baseline fixtures and golden outputs captured, cataloged, and stored for later comparison.

---

## Risks Tracked Forward

- **Serialization performance:** May require streaming or chunked writes if KB size is large; flagged for Step 1 benchmarking.
- **Anchor alignment:** If existing generator anchors are insufficient for precise patching, Step 5 scope may expand.
- **Determinism sensitivity:** Persistence/deserialization could introduce ordering differences; Step 4 must enforce stable sorting.
- **Partial success policy:** Exit code `4` proposal dependent on orchestrator changes; verify acceptance during Step 0 review.

Mitigations and follow-up tasks should be logged during Step 0 so downstream steps have clear context.
