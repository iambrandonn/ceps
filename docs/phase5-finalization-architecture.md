# Phase 5 – Finalization Integration Architecture

## 1. Executive Summary
- Persist the hydrated Knowledge Base to `.ceps/kb-state.json` after baseline runs. The snapshot captures entities, factSets, relations, behavior chunks, open questions, and index material in a JSON schema with explicit versioning so finalization can boot without re-scanning.
- Finalization will ingest `answers.md`, map answers onto `OpenQuestion` records, compute an impact report using the existing reverse-dependency graph (default caps: 3 hops / 250 nodes), re-run reasoning + generator only for the scoped entities, and patch the impacted Markdown blocks via anchor-guarded replacement. Changed files gain a deterministic **Finalization Summary** immediately after the document title.
- The CLI will expose `ceps finalize` with `--answers`, `--dry-run`, `--reconcile`, `--finalize-max-hops`, `--finalize-max-nodes`, `--finalize-scope`, and `--finalize-out`. Exit codes extend to include `4` (partial success with unresolved items).
- Baseline artefacts for the `tiny-react` fixture (root spec, directory specs, `qids.json`) have been captured under `tests/fixtures/phase5/baseline/tiny-react/` and will back future finalize regression tests.
- Gaps discovered during Step 0 (specs omit QIDs, root spec embeds live timestamps, coverage gate fails when chunks are absent) are logged with mitigations and must be addressed before Step 1 proceeds.

## 2. Persistence Strategy
- **Location & schema**
  - File: `.ceps/kb-state.json`
  - Envelope:
    ```json
    {
      "version": "1.0",
      "cepsVersion": "0.2.0",
      "generatedAt": "2025-11-05T12:34:56Z",
      "state": { /* serialized KB */ },
      "metadata": {
        "projectRoot": "<absolute path used during capture>",
        "snapshotHash": "<root hash from .ceps/snapshot.json>"
      }
    }
    ```
- **State payload structure**
  - `entities`: array of `{ id, kind, name, path, packageId, signature, visibility, exported, attributes, anchors, qids }`.
  - `factSets`: array of `{ id, facts, sources, evidenceScore, parents }`.
  - `behaviorChunks`: array of `{ id, targetEntityId, textDraft, factSetIds, confidence, assumptions }`.
  - `relations`: array of `{ subjectId, predicate, objectId, details, source }` (objectId may be `null` after resolution).
  - `indices`: object with `byPath`, `byKind`, and `exported` converted to plain arrays (e.g., `byPath[path] = [entityId, ...]`).
  - `openQuestions`: array of `{ qid, entityId, question, confidence, factSetIds, createdAt? }`.
  - `qidSet`: array of allocated QIDs for idempotency.
- **Serialization details**
  - `Map`/`Set` types flatten to arrays and rehydrate during `deserialize`.
  - Derived caches (`callGraphCache`, `importGraphCache`, `reverseDepsCache`) are excluded; they rebuild from relations on demand.
  - Persist optional `answers` map (see §3) to avoid losing applied answers across finalize reruns.
- **Versioning & compatibility**
  - `version` field increments on schema change. `deserialize` rejects unsupported versions with actionable messaging.
  - `metadata.projectRoot` records the baseline run root; finalization will use this for deterministic rendering unless `--finalize-out` overrides.
- **Snapshot capture (Step 1)**
  - `.ceps/snapshot.json` is generated automatically after each baseline run via `captureSnapshot` (`src/snapshot/capture.ts`) and persisted with `writeSnapshot`. The document records normalized file hashes and Merkle root (`rootHash`).
  - `verifySnapshot` (`src/snapshot/verify.ts`) recomputes the snapshot at finalize time, surfacing added/removed/changed files with structured diagnostics.
  - A lightweight benchmark (`npm run snapshot:benchmark`) is available to profile capture performance on large repositories.
- **Future expansion**
  - `fileIndex` is *not* persisted in Step 0. The current patch strategy operates on existing Markdown and KB metadata only. If later steps require package-level statistics to drive summaries, we can persist a slimmed `fileIndex` separately without blocking Step 1.

## 3. Knowledge Base API Extensions

### 3.1 Proposed Interfaces
```typescript
export interface PersistOptions {
  statePath: string;              // default: .ceps/kb-state.json
  metadata?: Record<string, unknown>;
}

export interface ImpactScopeOptions {
  maxHops?: number;               // default 3
  maxNodes?: number;              // default 250
  includeDirectories?: boolean;   // include directory/package rollups
  scope?: 'auto' | 'full';
}

export interface ImpactReport {
  seedQids: string[];
  resolvedEntities: string[];     // entities directly answered
  impactedEntities: string[];     // transitive closure respecting caps
  impactedDirectories: string[];
  diagnostics: {
    hopsTraversed: number;
    nodesTraversed: number;
    capped: boolean;
    excluded: string[];           // entities dropped by cap
    warnings: string[];
  };
}

export interface AnswerRecord {
  qid: string;
  entityId: string;
  answer: string;
  appliedAt: string;              // ISO timestamp
  factSetIds: string[];
}
```

- `impactedDirectories` enumerates the spec files that must be regenerated (e.g., `spec.md`, `src/spec.md`, `packages/app/spec.md`), preserving deterministic patch targets for directory and package summaries.

### 3.1.1 Impact Scoping Behaviour

- Deterministic **breadth-first traversal** starts from the resolved entities. Reverse dependencies are collected from the KB for both `calls` (entity-level) and `imports` (file/module-level) and are processed in sorted order so output remains stable.
- Caps apply only when `scope === 'auto'`:
  - `maxHops` guards depth. When the next hop would exceed the cap, the neighbour is recorded in `diagnostics.excluded` and a hop-cap warning references `--finalize-max-hops`.
  - `maxNodes` guards breadth. When visiting the next node would exceed the cap, the node is excluded and a warning references `--finalize-max-nodes`.
- `scope === 'full'` disables both caps but still records traversal metrics for diagnostics.
- Nodes that cannot be resolved back to KB entities or file paths (e.g., external module specifiers) are captured in `diagnostics.warnings` with a sample of identifiers to aid debugging.
- Directory and package rollups:
  - Always include the root `spec.md`.
  - Add `<dir>/spec.md` for every impacted directory derived from `entity.path`.
  - Detect monorepo packages via `packages/<name>` or `entity.packageId` so package-level summaries stay in sync.
- Diagnostics quick reference:

| Condition | Diagnostic Output | Suggested Flag |
|-----------|------------------|----------------|
| Hop cap reached | `capped: true`, warning recommending `--finalize-max-hops` | `--finalize-max-hops` / `--finalize-scope full` |
| Node cap reached | `capped: true`, warning recommending `--finalize-max-nodes` | `--finalize-max-nodes` / `--finalize-scope full` |
| Node usage ≥80% | Warning with usage percentage | `--finalize-max-nodes` |
| Unresolved nodes | Warning listing skipped identifiers | Investigate KB coverage or answers |

### 3.2 New / Extended Methods
| Method | Signature | Purpose |
| -- | -- | -- |
| `serialize` | `(options?: PersistOptions) => Promise<void>` | Write KB state + metadata to JSON |
| `deserialize` | `(path: string) => Promise<void>` | Load KB state into a fresh instance (clearing caches) |
| `attachAnswer` | `(qid: string, answer: string) => AnswerRecord` | Validate QID existence, store answer, associate with factSets |
| `markQIDResolved` | `(qid: string) => void` | Remove QID from `openQuestions` & entity indices after successful patch |
| `computeImpactReport` | `(resolvedQids: string[], opts?: ImpactScopeOptions) => ImpactReport` | Traverse reverse-deps across entity IDs & file-path edges, apply caps, emit diagnostics |
| `listOpenQuestions` | `() => OpenQuestion[]` | Current open-question inventory (exposes existing `openQuestions` map) |
| `getResolvedAnswers` | `() => AnswerRecord[]` | Optional helper to expose applied answers for run summary |

### 3.3 Behavioural Notes
- `attachAnswer` normalises input (trim whitespace, collapse internal newlines) and rejects duplicates. Answers exceeding 2 k characters raise `KBError`.
- `computeImpactReport` normalises reverse-dep nodes: file-path keys (from import relations) are mapped back to owning entities via `byPath`; unresolved edges are recorded in diagnostics and dropped.
- `markQIDResolved` removes the QID from `qids` set to keep future allocations deterministic, and clears any pending `AnswerRecord` once the patch succeeds.
- If reasoning fails to lift an answer out of Low confidence (e.g., LLM fallback, missing facts), the QID remains open and the run exits with code `4`, listing the unresolved item in the summary.
- `serialize` writes atomically (temp file + rename) to avoid partial state on crash.

## 3.1 answers.md Format & Validation
- **Grammar:**
  - Lines beginning with `#` are comments and ignored.
  - Entries follow `q:<QID>: <answer>` on a single line. Multi-line answers use 4-space indentation on continuation lines (blank continuation lines must also include 4 spaces).
  - Example:
    ```markdown
    # Example answers
    q:q123456789: Primary answer text
        Additional context line
        - bullet point

    q:q987654321: Single-line answer
    ```
- **Limits & validation (Step 2):**
  - Maximum answer length defaults to 2000 characters (configurable later). Exceeding entries are accepted with warnings.
  - Duplicate QIDs within the file produce validation errors.
  - Unknown QIDs produce descriptive errors and are surfaced in ingestion diagnostics.
  - Invalid indentation or malformed lines include line numbers and raw content in parse errors.
- **Diagnostics:** `AnswerIngestionReport` captures `validAnswers`, `invalidEntries`, `unknownQids`, `warnings`, and a `summary` (counts) for CLI dry-run output.
- **Fixtures:** `tests/fixtures/phase5/baseline/tiny-react/answers.md` exercises the grammar; golden outputs (`answers.parse.json`, `answers.report.json`) ensure deterministic parsing/ingestion.

## 4. Spec Generator Patch Mode
- **Anchor-based replacement**
  1. Parse existing Markdown into block segments keyed by `<a id="<entityId>"></a>` markers (current renderer emits these per entity).
  2. For each impacted entity, regenerate its Markdown snippet (file heading, metadata, behaviour bullets, open questions) using updated KB chunks.
  3. Replace the old block with the new one, preserving surrounding whitespace.
  4. If an entity moves (path change), update directory spec membership by relocating blocks based on `entity.path`.
- **Finalization Summary**
  - Insert immediately after the document title (`# …`) as:
    ```
    ## Finalization Summary
    - Resolved QIDs: <count>
    - Updated Sections: <comma-separated anchor slugs>
    - Notes:
      - <QID> …description…
    ```
  - Deterministic mode omits timestamps; non-deterministic runs may append `- Ran on 2025-11-05T12:34:56Z`.
  - Summaries stack newest-first with blank line separation.
- **Handling Open Questions**
  - Generator will be updated to emit unresolved QIDs inline (e.g., under a dedicated “Open Questions” subheading per entity). This change is prerequisite before Step 1 so finalization can physically remove resolved entries.
  - When a QID is resolved, the patcher removes the corresponding bullet; if all QIDs cleared, the entire Open Questions subsection is pruned.
- **FactSet attribution**
  - Regenerated content continues to derive from KB behaviour chunks; factSet linkage remains in KB rather than Markdown. No inline metadata is required at this stage, but we will emit hidden HTML comments (`<!-- factSetIds: [...] -->`) if later validation needs to confirm grounding.
- **Determinism safeguards**
  - Root spec currently embeds `new Date().toISOString()` which breaks deterministic mode; Step 1 will guard this behind `deterministicMode` and reuse the persisted `generatedAt` timestamp.
  - Patching enforces consistent newline handling (LF) and avoids trailing whitespace to ensure diff stability.

## 5. Orchestrator Finalization Phase
- **CLI surface**
  - Command: `ceps finalize --answers ./answers.md [options]`
  - Flags:
    | Flag | Description |
    | -- | -- |
    | `--answers <path>` | Required path to answers Markdown |
    | `--dry-run` | Compute scope and show preview without writing files |
    | `--reconcile` | Allow snapshot mismatch; mark run as best-effort |
    | `--finalize-max-hops <n>` | Override hop cap (default 3) |
    | `--finalize-max-nodes <n>` | Override node cap (default 250) |
    | `--finalize-scope <auto\|full>` | Disable caps when set to `full` |
    | `--finalize-out <dir>` | Optional alternate output directory |
    | `--no-snapshot` | (Baseline runs only) skip capture when benchmarking or debugging |
- **Execution flow**
  1. Load config & CLI flags (inherits `--deterministic`, `--llm on/off`, budgets).
  2. Read `.ceps/snapshot.json`; if mismatched and no `--reconcile`, abort with exit code `3`.
  3. `KnowledgeBase.deserialize` to hydrate state; if missing, fall back to legacy full scan (with warning).
  4. Parse `answers.md` (`QID: answer` with indentation for multi-line details); attach answers into KB.
  5. Generate `ImpactReport` with caps and display diagnostics (cap utilisation, excluded nodes).
  6. If `--dry-run`, render structured preview (JSON + human summary) and exit `0`.
  7. For each impacted entity: run draft → reasoning → (optional) LLM polish → grounding validator using existing component APIs.
  8. Apply spec patch mode; append/update summaries; track touched files for run summary.
  9. Update KB (`markQIDResolved`) and write fresh `.ceps/kb-state.json`.
 10. Re-evaluate runtime gates over patched outputs; add Finalization Gate (answered QIDs removed, summaries present, scope respected).
 11. Emit run summary and exit code:
     - `0` success
     - `3` snapshot mismatch without reconcile
     - `4` partial success (some answers rejected or chunks failed to regenerate; unresolved QIDs stay open with diagnostics)
- **Determinism path**
  - `--deterministic` propagates via orchestrator to finalization controller: skips timestamps, forces template fallback when LLM variance would break determinism, ensures generated text sorts anchors deterministically.
  - Snapshot verification always uses normalised LF + trimmed trailing whitespace (matching hashing rules in CTS-04 §2.3).

## 6. Data Contract Verification (Step 0 Findings)
- **KB state**
  - `KnowledgeBase` stores entities/factSets/chunks/indices in Maps & Sets (`src/kb/knowledge-base.ts:17-53`).
  - Behaviour chunks are now consumed directly by the generator for behaviour sections (`src/generator/spec-generator.ts:296-326`).
  - Reverse dependencies combine entity IDs and file-path nodes depending on relation type (`src/kb/knowledge-base.ts:739-789`).
- **Open questions**
  - `AmbiguityResolver` generates QIDs with `q:` prefix and stores them in an `openQuestions` Map keyed by QID (`src/reasoning/ambiguity-resolver.ts:180-207`).
  - Entities do not currently retain their QIDs (`entity.qids` remains `undefined`), so finalization must continue querying KB rather than the entity structure.
- **Spec outputs**
  - Entity sections are delimited by `<a id="<entity.id>"></a>` before headings (`src/generator/markdown-renderer.ts:23-49`), enabling anchor-based patching.
  - Root specs suppress timestamps when deterministic mode is enabled (`src/generator/spec-generator.ts:82-87`).
  - Open Question content now renders inline with QIDs (`tests/fixtures/phase5/baseline/tiny-react/src/spec.md`).
- **Fixtures**
  - Only `tiny-react` currently emits a Low-confidence chunk → QID (`src/tests/fixtures/tiny-react/src/Card.tsx` data via Step-0 script); other fixtures need enhancement if multiple QID scenarios are required.
- **Gate behaviour**
  - Parser now emits baseline factSets for classes (`src/parser/fact-extractor.ts`), allowing the Phase 3 orchestrator to generate chunks so exported classes satisfy the coverage gate when reasoning runs.

## 7. Risks & Mitigations
| Risk | Impact | Mitigation |
| -- | -- | -- |
| Specs lack inline QIDs / behaviour text | Finalization cannot remove or update answered questions | ✅ Generator updated to emit behaviour sections and Open Question bullets |
| Root spec timestamp violates determinism | Deterministic runs will diff even without logical change | ✅ Timestamp suppressed when `--deterministic` |
| Reverse-deps mix entity IDs and file paths | Impact scope may miss dependencies or over-expand | Normalise nodes in `computeImpactReport`; surface warnings when paths cannot be resolved |
| Persistence file size on large repos | JSON write/read may become slow | Serialize using streaming writer and support gzip option if needed in Phase 6 (documented as future optimisation) |
| Missing `fileIndex` on load | Some summaries/patch logic might need directory metadata | Derive directories from `entity.path` for now; revisit if later steps require richer data |
| Partial failures during re-analysis | Users may lose track of unanswered QIDs | Introduce exit code `4` with structured diagnostics listing failures and leave QIDs open |

## 8. Open Questions
1. **Should we persist `FileIndex` metadata?**  
   - *Owner:* Step 1 (Snapshot & KB persistence) — evaluate after serialisation prototype; currently deferred.
2. **How should factSet attribution be surfaced post-finalization?**  
   - *Owner:* Step 4 (Selective re-analysis) — decide whether to emit HTML comments or rely solely on KB.
3. **Do we need a separate audit trail for applied answers?**  
   - *Owner:* Step 6 (CLI wiring) — consider writing a `.ceps/finalize-log.json` for troubleshooting.
4. **Answers that downgrade confidence but keep QID open?**  
   - *Status:* Resolved — finalization records the answer, leaves the QID open, and exits with code `4` while surfacing the failure in the run summary.

## 9. Sign-off
| Role | Stakeholder | Status |
| -- | -- | -- |
| Project Lead | _TBD_ | Pending |
| Product Owner | _TBD_ | Pending |
| Technical Reviewer | _TBD_ | Pending |
