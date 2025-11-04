# IMPLEMENTATION_PLAN_PHASE3_ACCEPTANCE.md

**Phase 3 — Intelligence Layer**
**Acceptance Criteria & Critical Success Factors**

---

## Note on API Names

**This document has been updated to reflect the frozen KB API method names:**
- Uses `getAllChunks()`, `getChunksByEntity()`, `updateChunk()`, `insertChunk()` (not BehaviorChunk variants)
- Uses `getRelations(entityId?)`, `replaceRelations()` (not getAllRelations, updateRelation)
- Uses `getConfidenceScore()`, `scoreConfidence()`, `scoreToConfidenceBand()` (not computeConfidence, getConfidenceBand)
- Uses `getReverseDeps(entityId)` with entity ID parameter (not no-arg variant returning Map)

---

## Overview

This document defines the **acceptance criteria** for Phase 3 completion and the **critical success factors** that must be met before proceeding to Phase 4.

Phase 3 delivers the **intelligence layer** that transforms Phase 2's basic pipeline (Scanner → Parser → KB → Generator) into a reasoning system capable of:
- Resolving call/import relations to entity IDs
- Building graph indices for dependency tracking
- Computing confidence scores with framework pattern detection
- Iteratively promoting confidence via cross-references
- Generating Open Questions (QIDs) for low-confidence items
- Validating 100% coverage and cross-link integrity

---

## Deliverables Checklist

### Code Deliverables

- ✅ **STEP0:** RelationResolver (src/reasoning/relation-resolver.ts)
- ✅ **STEP1:** Graph Indices (callGraph, importGraph, reverseDeps in KnowledgeBase)
- ✅ **STEP2:** ConfidenceScorer (src/kb/confidence-scorer.ts)
- ✅ **STEP3:** PatternMatcher + IntentLifter (src/reasoning/)
- ✅ **STEP4:** AmbiguityResolver (src/reasoning/ambiguity-resolver.ts)
- ✅ **STEP5:** Framework pattern rules (src/reasoning/patterns/express-rules.ts, react-rules.ts)
- ✅ **STEP6:** CrossLinkValidator (src/validation/cross-link-validator.ts)
- ✅ **STEP7:** Orchestrator upgrade (src/orchestrator/orchestrator.ts with 10 phases)
- ✅ **STEP8:** Integration tests (src/__tests__/integration/)

### Test Deliverables

- ✅ **Unit tests:** ~100 new tests across all steps (target: ≥80% branch coverage)
- ✅ **Integration tests:** ~18 tests covering E2E pipeline
- ✅ **Test fixtures:** 4 realistic codebases (Express, React, mixed, validation-failures)
- ✅ **Performance tests:** 1000-entity codebase <10s
- ✅ **Determinism tests:** Same input → identical output

### Documentation Deliverables

- ✅ **Main plan:** IMPLEMENTATION_PLAN_PHASE3.md (overview, parallelization, handoffs)
- ✅ **Step plans:** STEP0.md through STEP8.md (detailed TDD plans)
- ✅ **Acceptance criteria:** This document
- ✅ **Supporting docs:** Error handling, performance targets
- ✅ **Updated AGENTS.md:** Reflect Phase 3 completion status
- ✅ **Updated IMPLEMENTATION_PLAN.md:** Mark Phase 3 complete

---

## Acceptance Criteria

### 1. Functional Requirements

#### 1.1 Relation Resolution (STEP0)
- ✅ Call relations with expression text resolved to entity IDs
- ✅ Unresolved relations marked with `details.resolved = false`
- ✅ Resolution rate: ≥80% for typical codebases
- ✅ Import relations handled (module specifiers → file paths)

#### 1.2 Graph Indices (STEP1)
- ✅ `getCallGraph()` returns Map<entityId, Set<calleeId>>
- ✅ `getImportGraph()` returns Map<entityId, Set<importedId>>
- ✅ `getReverseDeps(entityId)` returns Set<callerId> for the given entity
- ✅ Indices cached and invalidated correctly on KB updates
- ✅ Graph building completes in <1s for 1000 entities

#### 1.3 Confidence Scoring (STEP2)
- ✅ `getConfidenceScore(factSetIds)` returns 0-100 numeric score
- ✅ `scoreToConfidenceBand(score)` maps score to 'High' | 'Medium' | 'Low'
- ✅ `scoreConfidence(factSetIds)` returns Confidence band directly
- ✅ Algorithm: Base evidence + reinforcers - penalties
- ✅ All entity kinds covered: function, class, interface, type, variable, module
- ✅ Framework patterns contribute to reinforcers
- ✅ Confidence bands: High ≥70, Medium 40-69, Low <40

#### 1.4 Reasoning & Patterns (STEP3-5)
- ✅ `PatternMatcher` detects Express routes, middleware, routers
- ✅ `PatternMatcher` detects React components (function/class), hooks
- ✅ `IntentLifter` generates BehaviorChunks with textDraft and confidence
- ✅ Pattern templates produce readable descriptions
- ✅ Framework patterns boost confidence scores correctly

#### 1.5 Ambiguity Resolution (STEP4)
- ✅ `AmbiguityResolver.resolve()` runs iterative promotion loop
- ✅ Cross-reference promotion: 2+ High deps → promote Medium to High
- ✅ Convergence detection: stops when no changes occur
- ✅ Oscillation detection: prevents infinite loops
- ✅ QID generation: Low confidence → Open Question with stable QID
- ✅ Ambiguity queue tracks unresolved items

#### 1.6 Validation (STEP6)
- ✅ `validatePreGeneration()` enforces 100% coverage gate
- ✅ Exported entities must have BehaviorChunk or QID
- ✅ Coverage calculation: (covered / total_exported) * 100
- ✅ `validatePostGeneration()` detects broken cross-links
- ✅ Anchor map built from generated specs
- ✅ Error messages include file paths and line numbers

#### 1.7 Orchestrator (STEP7)
- ✅ 10-phase pipeline: scanning → parsing → relation-resolution → graph-building → reasoning → ambiguity-resolution → validation-pre → generation → validation-post → complete
- ✅ `run()` executes all phases sequentially
- ✅ `runUntil()` supports partial execution
- ✅ Progress events: `phaseStart`, `phaseComplete`, `phaseError`
- ✅ Validation gates halt pipeline on failure
- ✅ Statistics populated: filesScanned, entitiesFound, relationsResolved, chunksGenerated, openQuestions, coverage

---

### 2. Quality Requirements

#### 2.1 Test Coverage
- ✅ Unit tests: ≥80% branch coverage per component
- ✅ Integration tests: ≥90% system-level coverage
- ✅ All unit tests passing: 277 (Phase 2) + ~100 (Phase 3) = ~377 total
- ✅ All integration tests passing: ~18 tests
- ✅ CI/CD passing: linting, typecheck, tests, coverage

#### 2.2 Performance
- ✅ Relation resolution: <500ms for 1000 relations
- ✅ Graph building: <1s for 1000 entities
- ✅ Confidence scoring: <1ms per entity (single-threaded)
- ✅ Full pipeline: <10s for 1000-entity codebase
- ✅ Memory usage: <500MB for 1000-entity codebase

#### 2.3 Correctness
- ✅ Determinism: Same input → identical output (with --deterministic)
- ✅ No false positives: High confidence assertions must be accurate
- ✅ No false negatives: Exported entities must be documented or carry QIDs
- ✅ Grounding: Every BehaviorChunk traceable to FactSets (validated in STEP6)

#### 2.4 Usability
- ✅ CLI displays progress: phase transitions + incremental statistics
- ✅ CLI displays summary: filesScanned, entitiesFound, coverage, openQuestions
- ✅ Error messages actionable: include phase, file path, entity ID, line number
- ✅ Validation errors block generation by default (configurable in Phase 6)

---

### 3. Technical Requirements

#### 3.1 API Contracts
- ✅ All interfaces frozen at Day 1 of each agent's work
- ✅ KB methods added (using correct frozen names):
  - `getAllChunks()`, `getChunksByEntity()`, `updateChunk()`, `insertChunk()`
  - `insertOpenQuestion()`, `getOpenQuestionsByEntity()`, `getAllOpenQuestions()`
  - `getCallGraph()`, `getImportGraph()`, `getReverseDeps(entityId)`
  - `getRelations(entityId?)`, `replaceRelations()`, `getFactSetsBySubject()`
- ✅ Correct field names used throughout:
  - Entity: `path` (not filePath), `exported` (not exportInfo)
  - Relation: `subjectId/predicate/objectId` (not sourceId/kind/targetId)
  - BehaviorChunk: `targetEntityId` (not entityId), `textDraft` (not text), `factSetIds` array (not single factSetId)
  - Confidence: `'High' | 'Medium' | 'Low'` (capitalized, not numeric)

#### 3.2 Code Quality
- ✅ TypeScript strict mode enabled
- ✅ No `any` types (except in test fixtures)
- ✅ ESLint passing (no warnings)
- ✅ Prettier formatted
- ✅ All TODOs resolved or documented for future phases

#### 3.3 Documentation
- ✅ All public APIs documented (JSDoc comments)
- ✅ Step plans include TDD examples with before/after code
- ✅ Integration points documented in each STEP file
- ✅ Explicit deferrals listed (what's NOT in Phase 3)

---

## Critical Success Factors

### CSF-1: Correct Phase 2 API Usage

**Requirement:** All Phase 3 code must use **actual Phase 2 APIs** (not assumptions from FEEDBACK1.md).

**Verification:**
- ✅ All field names corrected per PHASE3_PLAN_CORRECTIONS.md
- ✅ No references to `filePath`, use `path`
- ✅ No references to `entityId` in BehaviorChunk, use `targetEntityId`
- ✅ No references to `text` in BehaviorChunk, use `textDraft`
- ✅ No references to single `factSetId`, use array `factSetIds`
- ✅ No references to numeric confidence, use `'High' | 'Medium' | 'Low'`
- ✅ KB methods use correct names: `insertEntity`, `insertRelation`, `insertFactSet`, `insertChunk`

**Impact if not met:** Integration tests will fail, blocking Phase 3 completion.

---

### CSF-2: Graph Indices Must Be Fast

**Requirement:** Call/import graph queries must return in <10ms for typical use (100-1000 queries per pipeline run).

**Verification:**
- ✅ Graphs cached after first computation
- ✅ Invalidation only on `insertRelation()` or `replaceRelations()`
- ✅ Performance test: 1000 `getCallGraph()` calls <10ms total

**Impact if not met:** Pipeline will be too slow for large codebases (Phase 6 performance goals at risk).

---

### CSF-3: Confidence Scoring Must Be Calibrated

**Requirement:** Confidence bands must match reality:
- High confidence (≥70) → assertions are accurate
- Medium confidence (40-69) → assertions are reasonable but may need assumptions
- Low confidence (<40) → emit as Open Question, never assert

**Verification:**
- ✅ Manual review of generated specs for all test fixtures
- ✅ No High confidence assertions that are obviously wrong
- ✅ No Low confidence items documented as assertions
- ✅ Framework patterns contribute correctly (Express route → +15 score)

**Impact if not met:** Users will not trust generated specs, undermining core value proposition.

---

### CSF-4: Validation Gates Must Be Reliable

**Requirement:** Coverage gate must prevent generation when exported entities lack documentation.

**Verification:**
- ✅ Pre-validation fails for `fixtures/validation-failures/exported.ts`
- ✅ Pre-validation passes for all other fixtures
- ✅ QIDs count as valid coverage (Low confidence entities)
- ✅ Post-validation detects broken links in generated specs

**Impact if not met:** Generated specs will have missing sections or broken links, failing SADS.md Quality Gates.

---

### CSF-5: Determinism Must Be Absolute

**Requirement:** With `--deterministic` flag, identical input must produce byte-for-byte identical output.

**Verification:**
- ✅ Integration test: run pipeline twice, compare outputs
- ✅ No timestamps in generated specs
- ✅ No randomness in QID allocation (counter-based, deterministic)
- ✅ No dependency on filesystem traversal order (sort all file lists)

**Impact if not met:** Cannot use for CI/CD diffing, cannot verify LLM outputs in Phase 4.

---

### CSF-6: TDD Discipline Maintained

**Requirement:** All code written via Red-Green-Refactor workflow (test first, implementation second).

**Verification:**
- ✅ Every step plan includes failing tests before implementation
- ✅ Test coverage ≥80% (proof that tests were written alongside code)
- ✅ No "write code then backfill tests" (evidenced by git commit history)

**Impact if not met:** Technical debt accumulates, bugs discovered late, rework required.

---

### CSF-7: Agent Handoffs Are Clean

**Requirement:** Each agent completes their work independently, with frozen interfaces between agents.

**Verification:**
- ✅ Agent 1 freezes KB graph API at Day 1 of STEP1
- ✅ Agent 2 freezes PatternMatcher API at Day 1 of STEP3
- ✅ Agent 3 uses frozen APIs from Agents 1 and 2
- ✅ No API changes after handoff without coordination

**Impact if not met:** Integration failures, merge conflicts, schedule delays.

---

## Phase 3 Completion Checklist

Use **PHASE_COMPLETION_CHECKLIST.md** (existing document) for final sign-off steps:

1. ✅ Run full test suite: `pnpm test`
2. ✅ Run coverage report: `pnpm test:coverage` (≥80% branch coverage)
3. ✅ Run linting: `pnpm lint`
4. ✅ Run typecheck: `pnpm typecheck`
5. ✅ Run integration tests: `pnpm test:integration`
6. ✅ Run performance tests: `pnpm test:perf`
7. ✅ Update AGENTS.md: Mark Phase 3 complete
8. ✅ Update IMPLEMENTATION_PLAN.md: Mark Phase 3 complete
9. ✅ Update package.json: Bump version to 0.3.0
10. ✅ Git commit: "Phase 3 complete" with summary of deliverables
11. ✅ Create git tag: `v0.3.0`

---

## Readiness for Phase 4

**Phase 4 can begin when:**

1. ✅ All Phase 3 acceptance criteria met (above)
2. ✅ All critical success factors verified
3. ✅ PHASE_COMPLETION_CHECKLIST.md completed
4. ✅ Phase 3 deliverables committed to git
5. ✅ Integration tests pass in CI/CD (GitHub Actions or equivalent)

**Phase 4 deliverables depend on:**
- KB with BehaviorChunks (from Phase 3 reasoning)
- Confidence scores (from Phase 3 scoring algorithm)
- Open Questions with QIDs (from Phase 3 ambiguity resolver)
- Validation gates (from Phase 3 cross-link validator)

**Phase 4 will add:**
- LLM-based grounding validator (CTS-02)
- Chunk-level attribution to FactSets
- Quality gates enforcement in Orchestrator (CTS-07)
- Template polish with optional LLM assistance

---

## Risk Mitigation

### Risk: Graph Building Performance Degrades at Scale
**Mitigation:** Performance tests in STEP8 catch regressions early. If <10s target missed, profile and optimize graph building (lazy evaluation, incremental updates).

### Risk: Confidence Calibration Is Wrong
**Mitigation:** Manual review of all test fixture outputs during STEP8. Adjust scoring weights if needed. Defer LLM-assisted calibration to Phase 6.

### Risk: Agent Handoffs Fail Due to API Mismatches
**Mitigation:** Freeze interfaces at Day 1 of each agent's work. Use integration tests in STEP8 to catch mismatches early.

### Risk: Determinism Breaks Due to External Dependencies
**Mitigation:** Avoid timestamps, randomness, network calls in pipeline. Use snapshot testing in STEP8 to verify determinism.

---

## Sign-Off

**Phase 3 is complete and ready for Phase 4 when:**

- [ ] All acceptance criteria met (functional, quality, technical)
- [ ] All critical success factors verified
- [ ] All 7 risks mitigated
- [ ] PHASE_COMPLETION_CHECKLIST.md completed
- [ ] Manual review by product owner/tech lead (if applicable)

**Sign-off date:** _____________

**Sign-off by:** _____________

---

**End of Phase 3 Acceptance Criteria**
