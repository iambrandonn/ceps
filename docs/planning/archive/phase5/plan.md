# ceps — Phase 5 Implementation Plan (Finalization Engine)

**Status:** 🚧 Ready to start — CTS-04 scope pending implementation; Phase 4 gates remain green.

---

## 1. Context & Goals
- Deliver the Finalization Engine described in SADS §9 and CTS-04 so ceps can ingest human answers, verify repository integrity, and patch only the impacted specification sections.
- Preserve the bounded, one-time nature of ceps: every finalization run must respect the snapshot lock unless `--reconcile` is explicitly requested and labeled best-effort.
- Maintain existing Phase 4 gates (Coverage, Grounding, Link, Determinism) while adding the Finalization Gate: resolved QIDs are removed, summaries are appended, and no unrelated sections change.

---

## 2. Prerequisites & Dependencies
- Phase 4 artifacts are stable with ≥80% branch coverage; orchestrator gates and LLM grounding validator remain in place.
- Knowledge Base:
  - Reverse-dependency index and confidence scoring from Phase 3 must be available.
  - factSet ↔ chunk mappings and QID allocations must already exist (CTS-01/CTS-03).
- Orchestrator CLI must expose deterministic mode and gating infrastructure from CTS-07.
- Test fixtures (integration + golden outputs) are updated to include at least one scenario with unresolved QIDs for validation.

---

## 2.5 Integration Architecture (Scope for Step 0)
- **KB persistence approach:** Persist the full KB (entities, relations, factSets, chunks, indices) to `.ceps/kb-state.json` at the end of a baseline run; finalization loads this snapshot to avoid re-scanning/re-parsing. Decision validated during Step 0; alternative (reconstruct KB from specs) only if persistence proves infeasible.
- **KB API extensions to confirm/implement:**
  - `attachAnswer(qid: string, answer: string): void`
  - `markQIDResolved(qid: string): void`
  - `computeImpactedEntities(resolvedQids: string[], opts): ImpactReport` (wraps reverse-deps traversal with hop/node caps)
  - `serialize(path: string)` / `deserialize(path: string)` (if persistence path chosen)
- **Spec Generator patch mode requirements:**
  - Load existing `spec.md` files, locate sections via anchors, and replace only impacted chunks.
  - Insert deterministic **Finalization Summary** block directly after the document title before other headings.
  - Preserve unchanged sections byte-for-byte; maintain factSetId attribution in regenerated chunks.
- **Orchestrator finalization phase:**
  - New phase runs after snapshot verification, skipping scan/parse/aux phases when persisted KB is available.
  - Hooks for dry-run preview, scope diagnostics, and exit-code management (new code for partial success if needed).
- **Determinism mandate:** All persistence, summary insertion, and CLI flows must honor `--deterministic` (no timestamps or runtime-specific variance).

---

## 3. Serial Work Plan (TDD-first, single agent)

1. **Step 0 — Phase -1 Analysis & Interface Audit**
   - Inspect current KB representations (QID maps, reverse-deps, chunk metadata) and orchestrator hooks to confirm available contracts and persistence options.
   - Decide and document the KB persistence strategy, required API extensions, generator patch entry points, and orchestrator wiring; surface blockers immediately.
   - Produce baseline golden outputs capturing unresolved QIDs and initial `spec.md` structure for later comparison.

2. **Step 1 — Snapshot Capture & Verification (CTS-04 §2)**
   - Implement deterministic Merkle snapshot generator producing `.ceps/snapshot.json` during standard runs.
   - Add verification routine that compares current file hashes against the stored snapshot; mismatch → exit code 3 unless `--reconcile`.
   - Tests: unit coverage for normalization rules (LF endings, BOM stripping), hash determinism, mismatch handling, reconcile labeling.

3. **Step 2 — `answers.md` Ingestion & Validation**
   - Define and document answers format (BNF): `answer := qid ":" SP answer-line { NEWLINE indent answer-line }`, allowing `#` comments and blank lines; enforce UTF-8, max answer length (default 2k chars), and Markdown-compatible multi-line continuations via four-space indentation.
   - Build parser that validates QIDs, supports multi-line entries, ignores comments/blank lines, and rejects malformed, duplicate, or unknown QIDs with actionable errors.
   - Attach answers to KB entities using new APIs, mark unresolved QIDs for follow-up, and record parsing diagnostics for dry-run preview.
   - Tests: parser grammar coverage, multi-line handling, comment stripping, duplicate/unknown QID errors, length limits, KB attachment, dry-run reporting.

4. **Step 3 — Impact Scoping Engine**
   - Leverage KB reverse-deps to compute impacted entities with configurable caps (defaults: hops=3, nodes=250) and produce deterministic impact reports (direct, transitive, total counts).
   - Always include containing directory summaries, package summaries, and root overview; traverse across package boundaries for monorepos without additional caps.
   - Emit scope diagnostics: warn when usage exceeds 80% of caps, flag cap exhaustion (list excluded entities), and guide users to `--finalize-max-*` options.
   - Tests: graph traversal with caps, deterministic ordering, monorepo cross-package cases, scope diagnostics, focus valve interactions, cap-hit warnings, circular dependency safeguards.

5. **Step 4 — Selective Re-Analysis Pipeline**
   - Wire draft → reasoning → (optional) LLM polish → grounding validation for scoped entities only, reusing persisted KB state.
   - Define error policy: continue best-effort on per-entity failures (log, preserve original QID), surface summary of failures, introduce exit code `4` for partial success if any entity fails.
   - Guarantee unaffected chunks remain untouched; enforce deterministic behavior under `--deterministic` (no timestamps, fixed LLM sampling) and document behavior in Step 7.
   - Tests: re-analysis controller unit tests, partial failure handling, unchanged-section assertions, deterministic reruns, coverage ≥80%.

6. **Step 5 — Spec Patching & Finalization Summaries**
   - Implement generator patch mode: load existing `spec.md`, replace impacted sections via anchors, preserve unaffected text, and ensure factSet attribution persists.
   - Design deterministic **Finalization Summary** block inserted after the main title:
     ```
     ## Finalization Summary
     - Resolved QIDs: <count>
     - Updated Sections: <comma-separated anchors>
     - Notes:
       - <per-QID change bullet referencing qid>
     ```
     In non-deterministic mode optionally append timestamp; in deterministic mode omit time metadata.
   - Ensure repeated finalization runs append new summary entries (most recent first) without duplicating resolved QIDs.
   - Tests: golden comparisons for patched specs, summary formatting/placement, repeated finalization behavior, anchor preservation, factSet attribution checks.

7. **Step 6 — CLI & Orchestrator Wiring (CTS-07 §6)**
   - Add `ceps finalize` command with flags (`--answers`, `--dry-run`, `--reconcile`, `--finalize-max-hops`, `--finalize-max-nodes`, `--finalize-scope`, `--finalize-out <dir>` if alternative output needed later).
   - Dry-run must emit structured preview (answered QIDs, entity counts, cap status, list of files/sections) and guidance when caps approached/hit; no filesystem writes.
   - Integrate exit codes (`0` success, `3` snapshot mismatch, `4` partial success), progress reporting, and ensure repeated finalization runs reuse snapshots correctly; document `--deterministic` propagation.
   - Tests: CLI argument validation, dry-run output snapshot tests, exit code matrix (including partial success), cap-warning scenarios, repeated finalize semantics.

8. **Step 7 — End-to-End Validation & Documentation Updates**
   - Run full pipeline on fixtures: baseline run → record snapshot → execute finalize with answers (dry-run + mutating) → repeat finalize with second answers set to confirm cumulative behavior; ensure all gates (existing + finalization) pass.
   - Update documentation: README workflow section, new Finalization user guide (workflow, answers format, dry-run usage, troubleshooting), IMPLEMENTATION_PLAN.md status, AGENTS.md phase summary, PHASE5_COMPLETION_SUMMARY.md; refresh `README_CTS_Index.md` if needed.
   - Update CI pipeline: add finalize job (baseline + finalize with fixture answers), add golden tests for finalized outputs, and ensure coverage thresholds/gates remain enforced post-finalize.
   - Capture residual risks and open questions for Phase 6 if any validator gaps remain.

---

## 4. Quality Gates & Exit Criteria
- **Finalization Gate:** Answered QIDs removed, Finalization Summaries appended, no unrelated spec diffs.
- **Snapshot Gate:** Snapshot hash matches unless `--reconcile`; best-effort flag propagated.
- **Performance Gate:** Finalization targeting ≤10% of entities completes within 20% of baseline runtime on reference fixtures (excluding external LLM latency spikes).
- Existing gates (Coverage, Grounding, Link, Determinism, Confidence, Monorepo) continue to pass in both standard and finalize runs.
- CI executes finalize workflow (including dry-run) on reference fixtures with deterministic mode enabled and validates golden outputs for baseline + finalized specs.

---

## 5. Test Strategy
- **Unit tests:** Each step above delivers dedicated suites with ≥80% branch coverage (snapshot hashing incl. CRLF/BOM cases, answers parser grammar/limits, scoping traversal with caps/monorepos, re-analysis controller error handling, summary renderer determinism, CLI flag matrix).
- **Integration tests:** Scenario-driven runs covering success, snapshot mismatch variants (added/removed/changed files), dry-run preview, cap overflow, reconcile mode, repeated finalization with cumulative summaries, partial-success paths, and deterministic reruns.
- **Golden tests:** Deterministic outputs before/after finalize, ensuring only targeted sections change; include multi-run goldens verifying summary accumulation and unchanged sections.
- **Adversarial tests:** Malformed answers, conflicting QIDs, scope explosion attempts, LLM failures triggering template fallback, grounding rejects during re-analysis, circular dependency graphs.
- **Performance checks:** Benchmark finalize vs baseline on reference repo with controlled scope to assert runtime gate.

---

## 6. Deliverables
- Finalization Engine implementation (snapshot capture, answers ingestion, scoped re-analysis, spec patching).
- Updated CLI with finalize command and documentation.
- Expanded test suites (unit, integration, golden, adversarial) validating the full finalize lifecycle.
- Finalization-focused documentation set (user workflow, answers format, troubleshooting, CI updates).
- Phase 5 completion artifacts per PHASE_COMPLETION_CHECKLIST.md, including status updates and completion summary.

---

## Golden Fixture & Snapshot Management (Phase 5)

Whenever Phase 5 work modifies `tests/fixtures/phase5/baseline/tiny-react`, implementers must:

- **Place files correctly**
  - Persisted report outputs (consumed by later steps) stay in the fixture root.
  - Test expectation files live under `tests/fixtures/phase5/baseline/tiny-react/expected/`.
- **Regenerate snapshot**
  1. Run `npx tsx scripts/regenerate-phase5-snapshot.mjs`.
  2. Verify snapshot contents:
     ```bash
     jq '.files | length' tests/fixtures/phase5/baseline/tiny-react/.ceps/snapshot.json
     jq -r '.files[].path' tests/fixtures/phase5/baseline/tiny-react/.ceps/snapshot.json | sort
     ```
  3. Execute snapshot test: `npm test -- --run tests/integration/snapshot-capture.test.ts`.
  4. Commit updated `.ceps/snapshot.json` with fixture changes and rerun full `npm test`.
- **Reviewer checklist:** confirm the above steps whenever golden files change.
