# Phase 5 — Step 3 Implementation Plan  
**Impact Scoping Engine**

**Owner:** Phase 5 agent (serial delivery)  
**Depends on:** Step 1 (snapshot hash availability), Step 2 (answers ingestion & KB attachAnswer), Step 0 architecture (reverse-dependency design)  
**Blocks:** Step 4 (selective re-analysis), Step 6 (CLI finalize wiring), Step 5 (spec patching needs scoped entity list)

---

## 1. Objectives & Scope
- Use resolved QIDs (from Step 2) to compute impacted entities via the reverse-dependency graph, honoring default caps (max hops=3, max nodes=250) and monorepo summary rules outlined in CTS-04 §4.  
- Produce deterministic `ImpactReport` objects (per Step 0 architecture §3) that include direct, transitive, and summary-level impacts (directories/packages/root).  
- Emit actionable diagnostics for dry-run previews, including cap utilization, excluded entities, and guidance on expanding scope.

Out of scope: selective re-analysis, spec patching, CLI wiring; those consume the ImpactReport in later steps.

---

## 2. Inputs & Dependencies
- **KnowledgeBase state:**  
  - Reverse dependency indices (`reverseDeps` Map) and entity metadata (`entities`, `byPath`, `byKind`) from earlier phases.  
  - Answers map (`answers` Map) populated by Step 2 (`attachAnswer`).  
- **Architecture references:** CTS-04 §4 (impact scoping), Step 0 architecture §3 (`ImpactReport`), Step 1 snapshot metadata for context.  
- **Config defaults:** max hops=3, max nodes=250, scope modes (`auto`, `full`).  
- **Fixtures:** baseline `tiny-react` fixture with answers and QIDs to validate scoping behavior.

---

## 3. Estimated Effort
- Total: 2.5–3 days  
  - Graph API design & tests: 0.5 day  
  - Traversal implementation (caps, monorepo summaries) + unit tests: 1.25 days  
  - Diagnostics & reporting: 0.5 day  
  - Integration tests with fixtures + documentation updates: 0.5 day  
  - Buffer for edge cases (cycles, large graphs): 0.25 day

---

## 4. Work Plan (Serial Tasks)

1. **Requirements Refresh & Data Audit**
   - Re-read CTS-04 §4, Step 0 architecture §3.  
   - Inspect KB reverse-dep structures to confirm availability:
     - `reverseDeps` Map (entityId → dependents).  
     - `byPath` index (path → entityIds).  
     - `entities` Map (entityId → Entity metadata).  
     - `answers` Map (QID → AnswerRecord).  
   - Verify helper methods (`getReverseDeps`, `getEntity`, etc.); document gaps and raise blockers early.

2. **ImpactReport Interface Finalization**
   - Use Step 0 architecture §3.1 interface:
     ```typescript
     interface ImpactReport {
       seedQids: string[];
       resolvedEntities: string[];
       impactedEntities: string[];
       impactedDirectories: string[];
       diagnostics: {
         hopsTraversed: number;
         nodesTraversed: number;
         capped: boolean;
         excluded: string[];
         warnings: string[];
       };
     }
     ```
   - Define deterministic ordering:
     - `seedQids`, `resolvedEntities`, `impactedEntities`, `diagnostics.excluded`: sorted alphabetically by ID.  
     - `impactedDirectories`: sorted lexicographically by POSIX path.  
     - `diagnostics.warnings`: sorted alphabetically for stable diffs.

3. **Seed Collection & Validation**
   - Implement function to collect seed entities from resolved QIDs (answers map).  
   - Validate seeds:
     - Each QID must map to a valid entity (Step 2 already ensures this).  
     - If mapping missing, throw error (signals upstream bug).  
   - Deduplicate seeds (same entity answered multiple times).  
   - Unit tests covering multiple answers, repeated runs, edge cases.

4. **Traversal Algorithm (Caps & Monorepo Rules)**
   - Implement deterministic **BFS** traversal (layered by hop) starting from all seeds simultaneously.  
   - Honor scope modes:  
     - `auto` (default): apply `maxHops` (3) and `maxNodes` (250) caps.  
     - `full`: disable caps (traverse entire reachable graph).  
   - Caps in `auto` mode: stop traversal when hop reaches `maxHops` or total nodes exceed `maxNodes`; record excluded entities.  
   - Process neighbors in sorted order to maintain determinism; maintain visited set to avoid cycles.  
   - Handle mixed node IDs: map file-path entries via `byPath`; if unresolved, log warning and skip.  
   - Always include summaries derived from impacted entities:  
     - Directories (from `entity.path`).  
     - Packages (from `entity.packageId` when present).  
     - Root summary (added once).  
   - Unit tests covering linear/tree/diamond/cyclic graphs, monotonicity of caps, monorepo inclusion.

5. **Scope Diagnostics & User Guidance**
   - Compute diagnostics metrics (`hopsTraversed`, `nodesTraversed`, `capped`).  
   - Emit warnings when approaching caps (e.g., >80% node usage) or when hop cap reached with exclusions; include guidance (`--finalize-max-*`, `--finalize-scope full`).  
   - Populate `diagnostics.warnings` with deterministic, actionable messages.  
   - Unit tests verifying warnings for near-cap, cap-hit, full scope scenarios.

6. **ImpactReport Assembly**
   - Aggregate outputs into `ImpactReport`:
     - `seedQids` from answers.  
     - `resolvedEntities` (seed entities).  
     - `impactedEntities` (transitive closure from BFS, deduplicated).  
     - `impactedDirectories` (directories/packages/root).  
     - `diagnostics` (caps and warnings).  
   - Apply global caps across all seeds (single traversal).  
   - Ensure ordering per Task 2; no snapshot hash included.  
   - Integration tests verifying baseline fixture output and multi-answer scenarios.

7. **Baseline Fixture & Golden Outputs**
   - Update `tests/fixtures/phase5/baseline/tiny-react/impact.report.json` (report output used by later steps).  
   - Store additional expectation files under `tests/fixtures/phase5/baseline/tiny-react/expected/` when needed (e.g., cap-hit scenario outputs).  
   - Update README with explanation of expected scope results, regeneration instructions, and how to interpret diagnostics.

   **Snapshot Regeneration Checklist (REQUIRED)**
   - [ ] Run `npx tsx scripts/regenerate-phase5-snapshot.mjs` after modifying fixture files.
   - [ ] Verify snapshot contents (`jq '.files | length' tests/fixtures/phase5/baseline/tiny-react/.ceps/snapshot.json`) and ensure new paths appear.
   - [ ] Execute snapshot test: `npm test -- --run tests/integration/snapshot-capture.test.ts`.
   - [ ] Commit updated `.ceps/snapshot.json` alongside fixture changes and rerun full `npm test`.

8. **Documentation & Knowledge Sharing**
   - Update `docs/phase5-finalization-architecture.md` with traversal rules, cap behavior, monorepo handling, and diagnostics format.  
   - Draft dry-run output example for future CLI guide.  
   - Log any follow-up work (e.g., caching strategies for large repos).

---

## 5. Testing Strategy
- **Unit tests**
  - Seed extraction, duplicate answers, stale QID detection.  
  - Traversal on synthetic graphs (linear, tree, diamond, cyclic) with caps and monorepo nodes.  
  - Diagnostics generation (cap warnings, suggestions).  
- **Integration tests**
  - Baseline fixture run: answers → seeds → impact report matches golden JSON.  
  - Scenario where caps hit (simulate large fan-out) to assert exclusions/warnings.  
- **Golden tests**
  - Deterministic `impact.report.json` for baseline fixture.  
- **Determinism checks**
  - Ensure repeated runs produce identical ImpactReports (sorted ordering, no random iteration).

---

## 6. Deliverables
- Impact scoping module (`src/finalize/impact-scope.ts`) with traversal and diagnostics.  
- Updated KnowledgeBase utilities (if helper methods needed).  
- Fixture goldens (`impact.report.json`) and unit/integration test suites.  
- Documentation updates (architecture appendix and fixture README).

---

## 7. Exit Criteria
- Seeds derived from answers map deterministically with validation and descriptive warnings.  
- Impact traversal respects hop/node caps, includes monorepo summaries, and handles cycles without infinite loops.  
- ImpactReport matches architecture contract (sorted arrays, diagnostics populated) and fixture goldens.  
- Tests (unit + integration + golden) pass with ≥80% coverage over impact scoping logic.  
- Documentation reflects traversal rules and diagnostics format; any new risks noted for later steps.

---

## 8. Risks & Mitigations
- **Reverse-deps quality issues:** If KB lacks certain edges, impact scope may miss entities → add assertions/tests; flag data gaps early for upstream fixes.  
- **Performance on large graphs:** Monitor traversal time; consider memoization or cap early exit for Phase 6 if needed.  
- **Monorepo edge cases:** Confirm package/directory mapping works for complex structures; add tests.  
- **Multiple answers batches:** Ensure seeds deduplicated across runs; maintain idempotency.

---

## 9. Follow-ups for Later Steps
- Step 4 uses ImpactReport to drive selective re-analysis.  
- Step 6 presents diagnostics via CLI `--dry-run` output.  
- Step 5 relies on impacted entity list to determine which spec sections to patch.  
- Potential caching/performance improvements deferred to Phase 6 once workloads measured.
