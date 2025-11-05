# ceps — Phase 4 Workstream Plan  
# WS-F1: Grounding Validator & Rule Engine (TDD Execution Playbook)

> **Purpose**  
> Deliver a CTS-02 compliant grounding validator that consumes Phase 3 artifacts, enforces SADS §8 grounding rules, and unblocks WS-F2/WS-H on schedule. This plan follows strict TDD (Red → Green → Refactor → Commit) and assumes no unstated APIs.

---

## 0. Quick Reference
- **Total duration:** ~8 working days (see §3 timeline)
- **Primary dependencies:** Phase 3 KB + generator outputs (verified); CTS-02 §4/§6 (interfaces, prompts)
- **Key artifacts:** `src/validation/*`, `fixtures/adversarial/phase4/*`, `docs/validator-api.md`
- **Coordination tracker:** log every unblock/milestone in `docs/process/grounding.md`
- **Stuck protocol:** see §8

---

## 1. Inputs, Dependencies & Phase‑1 Analysis (Stage A0 – Day 1 AM)

### 1.1 Objectives
Perform Phase‑1 (pre-test) discovery per AGENTS.md before writing any tests or code.

### 1.2 Tasks
- **Review KB APIs (Phase 3 acceptance §3.1):**
  - `getEntity(id)`, `getAllEntities()`, `getRelations(entityId?)`, `getCallGraph()`, `getImportGraph()`, `getReverseDeps(entityId)`
  - Confirm **no** name-based lookup exists → requires validator-local index (handled in Stage A2).
- **Capture parser fact schemas:**
  - Run Phase 3 parser tests with logging to extract `Fact.object` for numeric/enum predicates (timeout, http-method, log-level, etc.).
  - Save representative samples to `fixtures/adversarial/phase4/baseline/fact-schemas.json`.
- **Inspect generator outputs:**
  - Collect `BehaviorChunk` examples (fields: `chunkId`, `targetEntityId`, `factSetIds[]`, `textDraft`, `confidence`).
- **Audit Phase 2 LLM gateway skeleton:** note existing adapters, cache interfaces, budget placeholders.
- **Record findings + open questions** in `docs/process/grounding.md` (Phase‑1 entry).

### 1.3 Exit Criteria
- [ ] `fixtures/adversarial/phase4/baseline/fact-schemas.json` populated (≥30 factSets: 10 high/10 medium/10 low confidence).
- [ ] `docs/process/grounding.md` updated with Phase‑1 analysis summary, gaps, decisions.
- [ ] No code/tests written yet.

---

## 2. Timeline & Daily Plan

| Day | Stage(s) | Focus | Outputs |
|-----|----------|-------|---------|
| 1 AM | A0 | Phase‑1 analysis (KB/parser/generator audit) | Baseline fixtures, fact schema notes |
| 1 PM | A1 | Interface freeze & docs | Validator interfaces, mock, docs/validator-api.md draft |
| 2 | A2 | Entity name index (KB workaround) | `entity-index.ts`, index tests |
| 3 | B | Identifier extraction + scope validation (TDD cycles) | Regex helpers, KB lookup, pronoun heuristic |
| 4 | C | Numeric & enum guardrails (TDD cycles) | Unit conversion helpers, enum registry |
| 5 AM | D | Lexicon loader + normalization | Lexicon JSON, lint command |
| 5 PM – 6 | E | Retry controller, CTS-02 prompt hooks, fallback logic | Retry metadata, fallback hooks |
| 7 AM | F | Diagnostics & deterministic debug traces | Diagnostic formatter, sample JSON |
| 7 PM – 8 | G | Integration + adversarial automation + golden regression | Integration tests, adversarial suite, regression reports |

> Adjust timing if blockers arise (use §8 protocol). Keep commits frequent (after each TDD cycle).

---

## 3. Detailed TDD Work Plan

### Stage A1 – Interface Definition & Freeze (Day 1 PM)
**Goal:** Expose stable, synchronous validator contracts for WS-F2/WS-H before implementation.
**Test file:** `src/validation/__tests__/validator-contract.test.ts`.

1. **Write failing contract test (`src/validation/__tests__/validator-contract.test.ts`):**
   - `expectTypeOf(validate({...})).toEqualTypeOf<ValidationResultAcceptRetryFallback>()`
2. **Implement minimal interfaces:**  
   `src/validation/types.ts`:
   ```ts
   export type ValidationOutcome = 'accept' | 'retry' | 'fallback';

   export interface ValidationDiagnostic {
     chunkId: string;
     rule: 'entity' | 'relation' | 'numeric' | 'enum' | 'scope' | 'lexicon' | 'pronoun';
     reason: string;
     context?: { expected?: unknown; actual?: unknown; location?: string };
   }

   export interface ChunkMetadata {
     chunkId: string;
     targetEntityId: string;
     factSetIds: string[];
     confidence: 'High' | 'Medium' | 'Low';
   }

   export interface ValidationResult {
     status: ValidationOutcome;
     diagnostics: ValidationDiagnostic[];
     retryMetadata?: RetryMetadata;
   }

   export interface RetryMetadata { attempt: 0 | 1 | 2; promptKey: 'O' | 'R1' | 'R2'; }

   export interface Validator {
     validate(draft: string, factSetIds: string[], metadata: ChunkMetadata): ValidationResult;
   }
   ```
3. **Add configurable mock (`src/validation/mock-validator.ts`):**
   ```ts
export class MockValidator implements Validator {
     constructor(private nextResult: ValidationResult = { status: 'accept', diagnostics: [] }) {}
     setNextResult(result: ValidationResult) { this.nextResult = result; }
     validate() { return this.nextResult; }
   }
   ```
4. **Update docs:** `docs/validator-api.md` (overview, interfaces, examples).
5. **Log freeze:** update tracker (`docs/process/grounding.md`) with interface freeze note & mock path.

**Completion checklist:**
- [ ] Contract tests failing → implemented → passing.
- [ ] Interfaces documented with CTS-02 references (sections §4.2, §4.4, §6).
- [ ] Mock supports `setNextResult` and schema validation.
- [ ] Changes committed (`test(validator): add contract tests`, `feat(validator): add interfaces`).

---

### Stage A2 – Entity Name Index (Day 2)
**Need:** KB lacks name lookup; build validator-maintained name index once per run (delegates to `kb.getAllEntities()` and caches locally).
**Test file:** `src/validation/__tests__/entity-name-index.test.ts`.

**TDD Cycles:**
1. **Cycle A2.1 – Create failing test (resolve exact name):**
   - `expect(index.find('UserService')).toEqual([entityId])`.
2. **Cycle A2.2 – Implement `EntityNameIndex`:**
   ```ts
   export class EntityNameIndex {
     private byName = new Map<string, Set<string>>();
     constructor(entities: Entity[]) { /* populate map */ }
     find(name: string): string[] { return [...(this.byName.get(name) ?? [])]; }
   }
   ```
3. **Cycle A2.3 – Add collision tests (same name, diff paths).**
4. **Cycle A2.4 – Qualified name test:** `UserService.validateUser`.
5. **Cycle A2.5 – Cache invalidation test (if KB mutable).**

**Deliverables:**
- `src/validation/entity-name-index.ts`
- Tests in `src/validation/__tests__/entity-name-index.test.ts` (≥8 cases)
- Tracker update noting index availability & complexity (O(n) build, O(k) lookup)
- Success: build once per run; reused in Stage B.

---

### Stage B – Identifier, Scope & Pronoun Validation (Days 3–4 morning)
**Objective:** Enforce “no new entities/relations” and pronoun rules. Uses TDD micro cycles.
**Test file:** `src/validation/__tests__/validator-identifiers.test.ts`.

#### Test Inventory (write tests in this order, each fails before implementation):
1. `identifiers.extractBackticked` – `` `UserService` `` → `['UserService']`
2. `identifiers.extractPascalCase` – `UserService` in prose → `['UserService']`
3. `identifiers.extractCamelCase` – `validateUser` → `['validateUser']`
4. `identifiers.extractDottedPaths` – `UserService.validateUser` → `['UserService.validateUser']`
5. `identifiers.excludeCodeBlocks` – fenced code blocks ignored
6. `identifiers.dedupeIdentifiers`
7. `kbLookup.resolvesExactName` – uses Stage A2 index
8. `kbLookup.rejectsUnknownName`
9. `kbLookup.rejectsEntityOutsideFactSet`
10. `kbLookup.rejectsWrongEntityKind`
11. `relations.detectsMissingCall` – relation absent in graph
12. `pronoun.validAntecedent` – antecedent within 2 sentences
13. `pronoun.rejectsMissingAntecedent`
14. `pronoun.rejectsCrossChunkReference`
15. `identifier.mixedValidInvalid` – rejects when any identifier invalid

#### Implementation Guidance
- **Identifier extraction helper:** (after tests pass)
  ```ts
  const BACKTICK = /`([^`]+)`/g;
  const PASCAL = /\b[A-Z][a-z]+(?:[A-Z][a-z]+)*\b/g;
  const CAMEL = /\b[a-z]+(?:[A-Z][a-z]+)+\b/g;
  const DOTTED = /\b[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)+\b/g;
  const CODE_BLOCK = /```[\s\S]*?```/g;
  ```
- **Pronoun heuristic:** maintain ordered list of identifiers with sentence indices; pronouns allowed if antecedent within last 2 sentences. Pronouns: `it/its`, `they/their`, `this/that/these/those`.
- **Scope check:** ensure identifiers resolved belong to one of the `factSetIds` using KB relations (call/import graphs). If relation absent → `retry`.
- **Diagnostic examples** (failures):
  ```json
  {
    "chunkId": "chunk-42",
    "rule": "relation",
    "reason": "Relation 'UserService -> AdminService' not observed in call graph",
    "context": {"expected": ["AdminService"], "actual": []}
  }
  ```

#### Completion Criteria
- [ ] Tests 1–15 written → fail → implemented → pass.
- [ ] Coverage ≥80% for `src/validation/identifier-extractor.ts` and `src/validation/entity-name-index.ts`.
- [ ] Tracker update: Stage B complete (include PR/commit refs).
- [ ] Commit after each TDD cycle (`test`, `feat`, `refactor`).

---

### Stage C – Numeric & Enum Guardrails (Day 4)
**Goal:** Validate numeric claims per CTS-02 §4.2 (strict equality + nearest-integer rounding) and enums.
**Test file:** `src/validation/__tests__/validator-numeric.test.ts`.

#### TDD Test Order (each failing before code):
1. `numeric.exactMatch` – `delay 5000ms` vs fact `5000` (ms) → accept
2. `numeric.unitConversion` – `5 seconds` vs fact `5000`ms → accept
3. `numeric.nearestIntegerRounding` – `5123ms` vs `5 seconds` → accept (5.123s rounds to 5)
4. `numeric.roundedValueMismatch` – `5123ms` vs `6 seconds` → retry (5.123s rounds to 5, not 6)
5. `numeric.reverseConversion` – `0.1 MB` vs `102400`B → accept
6. `numeric.percentConversion` – `50%` vs `0.5` → accept
7. `numeric.stringFactObject` – fact object `"5000 ms"` → handled via parser schema interpreter
8. `numeric.unknownUnit` – fallback with diagnostic
9. `enum.httpMethodValid` – `GET` accepted
10. `enum.httpMethodInvalid` – `FETCH` fallback
11. `enum.caseSensitive` – `get` rejected
12. `enum.missingRegistryEntry` – skip enum validation

**Fact schema interpreter micro-cycles** (build before numeric assertions):
- **Cycle C0:** Write failing test in `src/validation/__tests__/fact-schema-interpreter.test.ts` for string facts like `{object: "5000 ms"}` mapping to `{value: 5000, unit: 'ms'}`.
- **Cycle C1:** Implement parser in `src/validation/fact-schema-interpreter.ts` handling numeric strings with units (ms, s, KB, MB, etc.).
- **Cycle C2:** Add tests for structured objects (e.g., `{value:5000, unit:'ms'}`) and percentages, ensuring normalization.
- **Cycle C3:** Add negative tests for unknown formats → interpreter returns `null`, causing validator to fall back.
- Commit after each cycle (`test`, `feat`, `refactor`).

#### Implementation Highlights
- **Unit conversion tables:** time (ms, s, min, h), data (B, KB, MB, GB), percent.
- **Fact schema interpreter (`src/validation/fact-schema-interpreter.ts`):** from Stage A0 fact examples (strings like `"5000ms"`), parse number + unit.
- **CTS-02 §4.2 validation logic:**
  1. Convert fact value to text's unit (human-friendly direction)
  2. Round converted fact to nearest integer: `Math.round(convertedFactValue)`
  3. Compare with strict equality: `roundedFactValue !== textValue` → diagnostic
- **Fallback criteria:** Ratio-based (≥2.0x difference) for unrecoverable errors (e.g., 5s vs 10s)
- **Enum registry:** static map per predicate; keep in `src/validation/enums.ts`.
- **Diagnostics:** include `expected` vs `actual` values, units, rounded values.

#### Completion Criteria
- [ ] 12+ tests written → pass.
- [ ] `docs/validator-api.md` updated with conversion table & enum registry reference.
- [ ] CTS-02 §4.2 compliance verified (strict equality + nearest-integer rounding).
- [ ] Coverage ≥80% for numeric/enums modules.

---

### Stage D – Lexicon Normalization (Day 5 AM)
**Objective:** Normalize synonyms to canonical verbs (SADS §7.3).
**Test file:** `src/validation/__tests__/validator-lexicon.test.ts`.

#### TDD Tests
1. `lexicon.loadValidJson`
2. `lexicon.rejectMalformedJson`
3. `lexicon.normalizeKnownSynonym` – `"retrieve"` → `"fetch"`
4. `lexicon.rejectUnknownSynonym` – returns original string, triggers diagnostic
5. `lexicon.caseInsensitive`
6. `lexicon.lintCommand` – CLI script ensures JSON sorted/no duplicates
7. `lexicon.updateWorkflowDocExists`
8. `lexicon.prNumericalChecks` (optional)

#### Implementation
- File: `src/validation/lexicon/ceps.lexicon.json` with initial 20 canonical verbs (`validate`, `compute`, `transform`, `emit`, `persist`, `fetch`, `authorize`, `schedule`, `retry`, `cache`, `map`, `filter`, `aggregate`, `normalize`, `publish`, `subscribe`, `configure`, `monitor`, `guard`, `route`).
- Loader caches JSON, exposes `normalize(term: string): string`.
- CLI lint (`pnpm lexicon:lint`) ensures alphabetical order, duplicates flagged.
- Document workflow: `docs/process/lexicon-updates.md` (steps for adding synonyms).

#### Completion Criteria
- [ ] Tests passing, coverage ≥80%.
- [ ] Lint command wired into package.json (`"lexicon:lint": "node scripts/lint-lexicon.js"`).
- [ ] Docs updated, tracker entry logged.

---

### Stage E – Retry Controller & Template Fallback (Day 5 PM–Day 6)
**Objective:** Implement `accept|retry|fallback` flow aligned with CTS-02 §4.4.
**Test file:** `src/validation/__tests__/validator-retry.test.ts`.

#### TDD Test Cases (10+):
1. `retry.acceptFlow` – validator returns accept → generator uses LLM text.
2. `retry.firstRetry` – validator returns retry → uses prompt `R1`.
3. `retry.secondRetry` – validator returns retry after R1 → uses `R2`.
4. `retry.templateFallback` – validator returns fallback → generator reverts to template.
5. `retry.promptKeysMatchCTS02` – strings from CTS-02 (O/R1/R2) used verbatim.
6. `retry.factSetIdPreserved` – fallback keeps original factSetId.
7. `retry.warningLogged` – fallback triggers warning entry.
8. `retry.metricsIncremented` – fallback increments counter for run summary.
9. `retry.mockValidatorIntegration` – uses WS-F1 mock to simulate accept/retry/fallback.
10. `retry.templateTrusted` – fallback bypass re-validation (document assumption).

#### Implementation Tips
- Retry metadata produced by validator indicates attempt count & prompt key.
- LLM gateway consumes `promptKey` to choose template (O/R1/R2).
- Template fallback assumed valid (per SADS); log reason, skip re-validation.
- Update tracker with pointer to CTS-02 prompt reference.

#### Completion Criteria
- [ ] Tests written/passing.
- [ ] Fallback warnings recorded in run summary structure.
- [ ] `docs/process/grounding.md` updated with prompt mapping & fallback semantics.
- [ ] Commit history shows TDD cycles.

---

### Stage F – Diagnostics & Deterministic Debug (Day 7 AM)
**Objective:** Produce stable, meaningful diagnostics under `--debug`.
**Test file:** `src/validation/__tests__/validator-diagnostics.test.ts`.

#### TDD Tests (≥6)
1. `diagnostics.debugOffNoOutput`
2. `diagnostics.debugOnOutputsSorted` – sorted by `(chunkId, rule, reason)`
3. `diagnostics.includesContext` – expected/actual/location present when provided
4. `diagnostics.stripNonDeterministicValues`
5. `diagnostics.sampleFileUpToDate` – compare to `docs/examples/validator-diagnostics.json`
6. `diagnostics.factSetIdIncluded`

#### Implementation
- Diagnostic builder collects info from identifiers, numeric, enum, relations.
- Provide helper `renderDiagnostics(result, options)` used by WS-H.
- Produce sample JSON and update tracker to notify WS-H.

#### Completion Criteria
- [ ] Tests pass, coverage ≥80%.
- [ ] Sample file committed; tracker entry referencing it.
- [ ] README snippet (docs/validator-api.md) shows diagnostic example.

---

### Stage G – Integration, Adversarial & Regression (Day 7 PM – Day 8)

#### G.1 Integration Tests (write before final implementation)
- Test file: `src/validation/__tests__/validator-integration.test.ts`.
- Use realistic KB + factSets from Stage A0 baseline.
- Scenarios:
  1. Happy path chunk (High confidence) → `accept`.
  2. Chunk with unknown entity → `retry`.
  3. Chunk with large numeric drift (≥2x difference) → `fallback`.
- Ensure tests fail before Stage B–F finish, pass after.

#### G.2 Adversarial Suite Runner
- Test file: `src/validation/__tests__/validator-adversarial.test.ts`.
- Iterate directories under `fixtures/adversarial/phase4/`:
  ```ts
  const fixtures = readdirSync(ADVERSARIAL_DIR);
  fixtures.forEach(fixture => {
    const { factSets, candidate, expected } = loadFixture(fixture);
    it(`adversarial: ${fixture}`, () => {
      const result = validator.validate(candidate.text, candidate.factSetIds, candidate.metadata);
      expect(result.status).toBe(expected.status);
    });
  });
  ```
- Ensure 100% of invalid scenarios produce `retry` or `fallback` as expected.
- Record executed scenarios and outcomes in `docs/process/grounding.md` for WS-F2 reuse.

#### G.3 Golden Regression
- Re-run Phase 3 generator integration tests in both modes:
  1. **Baseline (template-only):** `pnpm test:integration --filter generator` (validator disabled) to ensure no regressions.
  2. **Validator enabled:** enable grounding mode using the generator flag documented in `docs/validator-api.md` (e.g., `VALIDATOR_MODE=grounding pnpm test:integration --filter generator`). Record exact command in `docs/process/grounding.md`.
- Capture pass/fail counts and diff any changed golden files; expect ≥95% of template chunks produce `accept`.
- Log false positives (≤5%) in tracker with TODOs (Phase 3 debt) and attach summary to Phase 4 completion package.

#### Completion Criteria
- [ ] Integration tests fail→pass following validator stages.
- [ ] Adversarial suite covers ≥24 scenarios; 100% rejection rate for invalid chunks.
- [ ] Golden regression results recorded; false positives ≤5%.
- [ ] Artifacts stored under `.ceps/artifacts/phase4/ws-f1/`.

---

## 4. Test & Coverage Summary

| Stage | Test File(s) | # Tests | Notes |
|-------|--------------|---------|-------|
| A1 | `src/validation/__tests__/validator-contract.test.ts` | 3 | Interface & mock |
| A2 | `src/validation/__tests__/entity-name-index.test.ts` | ≥8 | Name index cases |
| B | `src/validation/__tests__/validator-identifiers.test.ts` | ≥18 | Extraction + scope + pronouns |
| C | `src/validation/__tests__/validator-numeric.test.ts` | ≥12 | Conversion + enums + fact schema interpreter |
| D | `src/validation/__tests__/validator-lexicon.test.ts` | ≥8 | Loader + lint |
| E | `src/validation/__tests__/validator-retry.test.ts` | ≥10 | Accept/retry/fallback |
| F | `src/validation/__tests__/validator-diagnostics.test.ts` | ≥6 | Deterministic output |
| G | `src/validation/__tests__/validator-integration.test.ts`, `src/validation/__tests__/validator-adversarial.test.ts`, golden harness | ≥12 | Integration + regression |
| **Total** | **≥77** | ≥80% branch coverage required |

Ensure `pnpm test:coverage` runs green after each stage with ≥80% branch coverage for `src/validation/**`.

---

## 5. Deliverables & Success Metrics

| Deliverable | Success Criteria |
|-------------|-----------------|
| Validator module (`src/validation/*`) | Interfaces frozen Day 1; synchronous API; tested via unit + integration suites |
| Entity name index | Handles collisions, qualified names, cached per run |
| Numeric/enum guardrails | CTS-02 §4.2 compliant (strict equality + nearest-integer rounding); enum registry documented; false positives ≤5% |
| Lexicon + workflow | Initial 20 canonical entries; lint command; update guide |
| Retry controller | CTS-02 prompts (O/R1/R2) embedded; fallback warnings; template reuse |
| Diagnostics | Deterministic JSON; sample in `docs/examples/validator-diagnostics.json` |
| Fixtures | Baseline & adversarial directories structured per §3 Stage G |
| Documentation | `docs/validator-api.md`, `docs/process/lexicon-updates.md`, tracker updates |
| Metrics | - ≥77 tests passing (unit + integration)  
           - ≥80% branch coverage validator modules  
           - Adversarial suite 100% rejection rate  
           - Golden regression ≥95% accept rate  
           - Performance: name index build O(n) once; record observed validation latency (document in tracker; optimize later if > Phase 6 target) |

---

## 6. Coordination & Handoffs

- **WS-F2:** Unblocked at end of Stage A1 (interfaces + mock). Update tracker immediately. Provide example usage in docs.
- **WS-H:** After Stage F, share diagnostics sample and structure. Confirm run summary schema alignment via tracker.
- **Shared fixtures:** WS-F1 owns adversarial fixtures; WS-F2 may reuse but must not modify baseline set.
- **Tracker updates:** Log Stage completions, blockers, schema agreements, golden test results in `docs/process/grounding.md`.

---

## 7. Completion Checklist
- [ ] Phase‑1 analysis completed and logged.
- [ ] Interfaces & mocks frozen (Stage A1) with documentation.
- [ ] Entity name index implemented + tested (Stage A2).
- [ ] Identifier/scope/pronoun validations implemented via TDD cycles.
- [ ] Numeric/enums guardrails implemented with documented conversions.
- [ ] Lexicon loader + workflow docs completed.
- [ ] Retry controller honors CTS-02 prompts; fallback preserves factSetIds.
- [ ] Diagnostics deterministic; sample JSON archived.
- [ ] Integration + adversarial suites passing; golden regression results captured.
- [ ] Coverage ≥80% for validator modules; ≥77 tests executed.
- [ ] Docs (`validator-api`, `lexicon-updates`) updated; artifacts archived under `.ceps/artifacts/phase4/ws-f1/`.
- [ ] Tracker updated with final status, metrics, outstanding follow-ups.
- [ ] CTS-02 compliance verified (rules §4.2, prompts §4.4, interface §6).

---

## 8. Stuck Protocol
1. **Pause implementation**; write blocker summary in `BLOCKERS.md`.
2. **Document in tracker** (`docs/process/grounding.md`) with timestamp, owner, mitigation steps.
3. **Attempt workaround** if within WS-F1 scope (e.g., name index Stage A2).
4. **If dependency external (WS-F2/WS-H/Phase 3):** notify coordination channel (or leave TODO if async).
5. **Resume TDD** once blocker cleared; note resolution in tracker.

---

## 9. Appendices

### 9.1 Fixture Directory Template
```
fixtures/adversarial/phase4/
├── README.md
├── baseline/
│   ├── fact-schemas.json
│   ├── factSets-high.json
│   ├── factSets-medium.json
│   ├── factSets-low.json
│   └── chunks.json
├── hallucinated-entity/
│   ├── factSets.json
│   ├── candidate.md
│   └── expected.json
├── hallucinated-relation/
│   └── ...
├── numeric-drift-forward/
├── numeric-drift-reverse/
├── enum-mismatch/
├── pronoun-no-antecedent/
├── cross-chunk-pronoun/
└── mixed-valid-invalid-identifiers/
```

### 9.2 Commit Discipline
- For each TDD cycle:  
  1. `test(validator): add failing test for {feature}`  
  2. `feat(validator): implement {feature}`  
  3. `refactor(validator): tidy {module}` (if needed)
- Push at least once per day; ensure CI passes.

### 9.3 Roadmap Notes (Phase 6 follow-up)
- Enhanced identifier extraction (kebab-case, snake_case, Unicode).
- Expanded lexicon (≥50 entries) and natural language heuristics.
- Performance profiling & indexing optimizations.

---

This plan now mirrors Phase 3 execution templates, enforces strict TDD, and removes assumptions about non-existent APIs. Agents should follow stages sequentially, logging progress in `docs/process/grounding.md` and coordinating with WS-F2/WS-H at defined checkpoints.
