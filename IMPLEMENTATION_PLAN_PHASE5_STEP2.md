# Phase 5 — Step 2 Implementation Plan  
**answers.md Ingestion & Validation**

**Owner:** Phase 5 agent (serial execution)  
**Depends on:** Step 1 (snapshot capture in place, snapshot hash exposed); Step 0 architecture decisions (answers grammar, KB API contracts)  
**Blocks:** Step 3 (impact scoping relies on attached answers), Step 6 (CLI finalize wiring), Step 5 (spec patching needs resolved QIDs)

---

## 1. Objectives & Scope
- Define, document, and implement the canonical `answers.md` format (per Step 0 grammar) for mapping QIDs to human answers.
- Build ingestion pipeline that parses the Markdown file, validates entries (format, duplicates, unknown QIDs, limits), and attaches answers to KB entities via the new API surface.
- Produce diagnostics consumable by later steps (scope preview, dry-run reporting) while maintaining determinism under `--deterministic`.

Out of scope: impact scoping, re-analysis, spec patching, CLI command wiring (handled in later steps).

---

## 2. Inputs & Dependencies
- **Architecture references:** CTS-04 §5 (Finalization process), Step 0 integration architecture §3 (AnswerRecord, attachAnswer API), Step 0 grammar definition.
- **Upstream artifacts:** `.ceps/snapshot.json` (for context only), baseline fixture `tests/fixtures/phase5/baseline/tiny-react` with captured QIDs, snapshot hash made available by Step 1, user-provided `answers.md`.
- **answers.md location:** Parser accepts raw text or path; Step 2 exposes a `parseAnswersFromFile(path)` helper. CLI wiring (Step 6) will provide `--answers <path>` flag (default TBD).
- **Existing code:** KnowledgeBase class (target for `attachAnswer`, `markQIDResolved`), ambiguity resolver data structures for QID lookup, orchestrator config loader for later CLI integration.

---

## 3. Estimated Effort
- Total: 2–2.5 days  
  - Grammar finalization & documentation updates: 0.25 day  
  - Parser implementation & unit tests: 0.75 day  
  - Validation + KB integration + tests: 0.75 day  
  - Diagnostics generation + fixture updates + docs: 0.5 day  
  - Buffer (edge cases/unicode): 0.25 day

---

## 4. Work Plan (Serial Tasks)

1. **Requirements Refresh & Grammar Finalization**
   - Revisit Step 0 BNF, CTS-04 §5, and architecture report §3.
   - Document grammar with comprehensive examples (single-line, multi-line with 4-space indent, comments `#`, blank lines).
   - Decide limits (max answer length default 2000 chars; treat overflow as warning for now; configurable in CLI later).
   - Document format and examples in `docs/phase5-finalization-architecture.md` appendix, noting guidance on storing `answers.md` in version control (recommended but optional).

2. **Parser Prototype & API Surface Sketch**
   - Design parser interfaces:
     - `parseAnswers(markdown: string): AnswerParseResult`
     - `parseAnswersFromFile(path: string): AnswerParseResult` (handles file reading & normalization).
   - Define structured result (array of `{ qid, answer, lines, warnings }`, plus summary data).
   - Plan error taxonomy (syntax error, duplicate QID, file read failure, encoding error).
   - Sketch `AnswerIngestionReport` TypeScript interface (see Task 6).

3. **Tokenizer & Parser Implementation (TDD)**
   - Write failing unit tests using fixtures (single-line, multi-line with indentation, comment blocks).
   - Implement file reading with error handling:
     - File not found / permissions → descriptive error
     - Non-UTF-8 content → reject with actionable message (no lossy fallback)
     - Empty file → return empty result set without error
   - Implement line-based tokenizer respecting indentation (4-space rule for continuations).
   - Emit structured errors with line numbers and snippet.
   - Handle Unicode content, emoji, and markdown lists within answers.

4. **Validation Rules**
   - Implement validation checks:
     - QID format (`q:<base62>[-n]?`) and existence in KB open questions.
     - Duplicate QIDs within file.
     - Answers exceeding length limit (2000 chars default): emit warning but accept (document rationale).
     - Unknown QIDs → error listing valid QIDs count and first N examples (no fuzzy suggestions to avoid scope creep).
   - Unit tests covering each validation scenario.
   - Duplicate handling policy: duplicates in file → error; repeated ingestion with identical answers → allowed (handled in Task 5 idempotently).

5. **KB Integration Hooks**
   - Implement KB methods per Step 0 architecture:
     - `attachAnswer(qid: string, answer: string): AnswerRecord` (store `qid`, `entityId`, `answer`, `appliedAt`, `factSetIds`).
     - `markQIDResolved(qid: string): void`.
   - Maintain `answers` Map/QID index for idempotency; repeated attachments with identical answer become no-ops (log warning if text differs).
   - Ensure answers stored alongside factSet references (from open question metadata).
   - Integration with KB serialization deferred to later step; document contract that `answers` map must be persisted.
   - Write unit tests for KB methods (idempotency, duplicate attachments, retrieval).

6. **Dry-Run Diagnostics & Reporting**
   - Produce structured `AnswerIngestionReport` capturing:
     ```typescript
     interface AnswerIngestionReport {
       validAnswers: AnswerRecord[];
       invalidEntries: Array<{ line: number; qid?: string; error: string }>;
       unknownQids: string[];
       warnings: string[];
       summary: { totalEntries: number; validCount: number; invalidCount: number; unknownCount: number };
     }
     ```
     - Deterministic ordering (sort by line number then QID).
     - Summary counts for CLI dry-run output (Step 6).
   - Integration tests to ensure deterministic ordering of diagnostics.

7. **Fixture & Golden Asset Updates**
   - Create `tests/fixtures/phase5/baseline/tiny-react/answers.md` covering single-line and multi-line answers.
   - Add golden JSON outputs: `answers.parse.json` and `answers.report.json`.
   - Update baseline README describing example answers.

8. **Documentation & Knowledge Sharing**
   - Update `docs/phase5-finalization-architecture.md` with grammar, limits, validation rules.
   - Draft user-facing snippet for future finalize guide (format + examples) and guidance on committing `answers.md` (recommended unless sensitive).
   - Log assumptions/open questions for downstream steps (e.g., answer length configurability).

---

## 5. Testing Strategy
- **Unit tests**
  - Parser grammar scenarios (single-line, multi-line, comments, blank lines, indentation errors).
  - Validation cases (duplicate QID, unknown QID, malformed QID, length overflow).
  - KB attachAnswer and markQIDResolved behavior (idempotent, persists answer metadata).
- **Integration tests**
  - Parse + attach workflow on baseline fixture (ensures QIDs resolved).
  - Failure scenarios (answers referencing removed QIDs).
- **Golden tests**
  - Parser output stored under `tests/fixtures/phase5/baseline/tiny-react/answers.parse.json`.
  - Diagnostics output for dry-run preview stored as `answers.report.json` (stable ordering).
- **Determinism checks**
  - Ensure parser + diagnostics produce identical output under repeated runs with `--deterministic`.
- **Performance sanity**
  - Large answers file (100 entries) to confirm ingestion stays performant (<100ms target; guideline, flag for Phase 6 if exceeded).

---

## 6. Deliverables
- Parser and validation module (`src/finalize/answers-parser.ts` or similar).
- KB methods (`attachAnswer`, `markQIDResolved`) with tests.
- Structured `AnswerIngestionReport` consumed by later phases.
- Updated fixtures (answers.md + goldens).
- Documentation updates capturing format and validation rules.

---

## 7. Exit Criteria
- `answers.md` grammar documented with examples and limits.
- Parser ingests baseline fixture answers and attaches them to KB without manual intervention.
- Validation errors are descriptive and deterministic (include line numbers).
- Diagnostics report enumerates valid/invalid entries for dry-run usage.
- Unit/integration/golden tests pass with ≥80% coverage over parser + KB ingestion logic.
- No unresolved questions from Step 0 regarding answers ingestion; new questions documented for later steps if uncovered.

---

## 8. Risks & Mitigations
- **Complex Markdown in answers:** Limit supported formatting (plain text, lists) and warn on unsupported constructs; document constraints.
- **QID drift between runs:** Ensure validation is executed after snapshot verification; store applied answers for reuse in repeated finalization runs.
- **Large answers file:** Monitor performance; consider streaming parser if needed (flag for Phase 6).
- **Internationalization:** Unicode handling tested; if issues arise, capture follow-up for Phase 6 localization work.

---

## 9. Follow-ups for Later Steps
- Step 3 consumes `AnswerIngestionReport` to gather resolved QIDs for impact scoping.
- Step 6 uses diagnostics for CLI `--dry-run` preview and exit messaging.
- Step 5 relies on `attachAnswer` metadata to remove QIDs and produce summaries.
- KB serialization (persisting answers map) will be implemented alongside snapshot integration in a subsequent step.
