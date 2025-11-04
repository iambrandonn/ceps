# ceps — Implementation Plan: Phase 3 (Intelligence Layer)

**Version:** 1.2 (Corrected - Split Structure)
**Date:** 2025-11-03
**Status:** Ready for Agent Execution
**Depends on:** Phase 2 (✅ Complete: Scanner, Parser, KB, Generator pipeline working)

---

## 0) Phase 3 Overview

**Mission:** Add intelligence layer to the ceps pipeline — indices, confidence scoring, reasoning, pattern matching, ambiguity resolution, and cross-link validation.

**Approach:** Test-Driven Development (TDD) with 3 parallel agents following Red-Green-Refactor workflow.

---

## Phase 3 File Structure

This implementation plan is split across multiple files for better manageability:

### Core Implementation Steps
- **[STEP 0](./IMPLEMENTATION_PLAN_PHASE3_STEP0.md)** - Relation Resolution (preparatory step)
- **[STEP 1](./IMPLEMENTATION_PLAN_PHASE3_STEP1.md)** - WS-A: KB Graph Indices
- **[STEP 2](./IMPLEMENTATION_PLAN_PHASE3_STEP2.md)** - WS-A: Confidence Scoring Algorithm
- **[STEP 3](./IMPLEMENTATION_PLAN_PHASE3_STEP3.md)** - WS-D: Reasoning Foundation & Pattern Matching
- **[STEP 4](./IMPLEMENTATION_PLAN_PHASE3_STEP4.md)** - WS-D: Iterative Resolution & Ambiguity Queue
- **[STEP 5](./IMPLEMENTATION_PLAN_PHASE3_STEP5.md)** - WS-D: Framework Pattern Rules (Express & React)
- **[STEP 6](./IMPLEMENTATION_PLAN_PHASE3_STEP6.md)** - WS-E: Two-Phase Cross-Link Validation
- **[STEP 7](./IMPLEMENTATION_PLAN_PHASE3_STEP7.md)** - WS-H: Phase Coordination in Orchestrator
- **[STEP 8](./IMPLEMENTATION_PLAN_PHASE3_STEP8.md)** - Integration Testing (All Agents)

### Supporting Documentation
- **[ACCEPTANCE CRITERIA](./IMPLEMENTATION_PLAN_PHASE3_ACCEPTANCE.md)** - Overall acceptance criteria & critical success factors
- **[SUPPORTING](./IMPLEMENTATION_PLAN_PHASE3_SUPPORTING.md)** - Error handling, performance targets, completion checklist

---

## 1) Parallelization & Coordination Strategy

### Agent Assignment

**Agent 1 (WS-A): KB Indices & Confidence Scoring**
- Deliverables:
  - Relation resolution (Step 0)
  - Graph indices: callGraph, importGraph, reverseDeps (Step 1)
  - Confidence scoring algorithm (Step 2)
- Dependencies: Phase 2 KB schema (✅ frozen)
- Blocks: Agent 2 (reasoning needs confidence API)
- Files: STEP0.md, STEP1.md, STEP2.md

**Agent 2 (WS-D): Reasoning & Ambiguity Resolver**
- Deliverables:
  - Pattern matching & intent lifting (Step 3)
  - Iterative ambiguity resolution (Step 4)
  - Express & React pattern rules (Step 5)
- Dependencies: Agent 1 Step 2 complete (needs confidence API)
- Blocks: None (final reasoning step before integration)
- Files: STEP3.md, STEP4.md, STEP5.md

**Agent 3 (WS-E + WS-H): Cross-link Validation & Phase Coordination**
- Deliverables:
  - Two-phase cross-link validation (Step 6)
  - Orchestrator phase coordination (Step 7)
- Dependencies: None (parallel with Agent 1)
- Blocks: None
- Files: STEP6.md, STEP7.md

**All Agents: Integration Testing**
- Deliverables:
  - End-to-end integration tests (Step 8)
- Dependencies: All steps 0-7 complete
- Files: STEP8.md

### Critical Path

```
Agent 1: Step 0 → Step 1 → Step 2 ──[CHECKPOINT: API Freeze]──┐
                                                                 │
Agent 2: [WAITS for Agent 1 checkpoint] → Step 3 → Step 4 → Step 5
                                                                 │
Agent 3: Step 6 + Step 7 (parallel) ────────────────────────────┤
                                                                 │
                                                                 ▼
                              All Agents: Step 8 (Integration Testing)
```

**Estimated Duration:**
- Agent 1: 3-4 agent-days (Steps 0-2)
- Agent 2: 4-5 agent-days (Steps 3-5, sequential after Agent 1)
- Agent 3: 3-4 agent-days (Steps 6-7, parallel)
- Integration: 1 agent-day (all agents)
- **Total: 5-7 calendar days with 3 parallel agents**

---

## 2) Interface Contracts (Frozen at Day 1)

### Agent 1 → Agent 2 Contract (WS-A → WS-D)

**KB Index & Scoring API (must be frozen after Step 2):**

```typescript
// src/kb/knowledge-base.ts additions

export class KnowledgeBase {
  // Graph indices (Step 1)
  getCallGraph(): Map<string, Set<string>>;
  getImportGraph(): Map<string, Set<string>>;
  getReverseDeps(entityId: string): Set<string>;

  // Confidence scoring (Step 2)
  // NOTE: scoreConfidence already exists as stub in Phase 2 (returns 'Medium')
  // Step 2 will REPLACE stub with actual weighted scoring algorithm
  scoreConfidence(factSetIds: string[]): Confidence;  // Returns 'High' | 'Medium' | 'Low'

  // Optional: Expose numeric score for testing/transparency (Step 2 decision)
  getConfidenceScore?(factSetIds: string[]): number;  // Returns 0-100 (optional helper)

  // Helper: Get all entities (needed by Agent 2 & 3)
  getAllEntities(): Entity[];

  // Helper: Get all factSets (needed by Agent 2)
  getAllFactSets(): FactSet[];
}
```

### Agent 2 → Agent 3 Contract (WS-D → WS-E)

**Reasoning Output Interface:**

```typescript
// src/reasoning/types.ts

export interface ReasoningOutput {
  chunks: BehaviorChunk[];  // All behavior chunks (High/Medium/Low)
  ambiguityQueue: AmbiguityItem[];  // Low confidence items with QIDs
  iterations: number;
  converged: boolean;
}

export interface AmbiguityItem {
  chunk: BehaviorChunk;
  qid: string;
  reason: string;
}
```

### Agent 3 Internal Contract (WS-E + WS-H)

**Cross-Link Validation API:**

```typescript
// src/generator/cross-link-validator.ts

export interface AnchorMetadata {
  anchor: string;  // e.g., "#my-function-abc12345"
  path: string;    // Entity path
  entityName: string;
}

export interface ValidationReport {
  totalLinks: number;
  validLinks: number;
  brokenLinks: BrokenLink[];
}
```

---

## 3) TDD Workflow with Phase -1 Analysis (MANDATORY)

**Critical Lesson from Step 0:** After 4 iterations on Step 0, we identified that the specification-first approach (design algorithm → write tests → discover mismatches) caused avoidable rework. The solution is to add mandatory "Phase -1: Upstream Data Analysis" before any test writing.

### Phase -1: Upstream Data Analysis (Complete Before Tests)

**Every step must complete this analysis before writing ANY tests:**

#### A. Identify Data Sources
- What upstream component generates the data we'll consume?
- What files contain that generation logic?
- What existing tests show the output format?

#### B. Read Upstream Code (Don't Assume)
- Read the ACTUAL implementation (not just docs/specs)
- Document the REAL schema (fields, types, formats)
- Identify implicit relationships (array order, key structure, etc.)
- Note what fields are MISSING (don't assume they exist)

#### C. Validate Assumptions
- Create a checklist of schema assumptions from the plan
- Mark each assumption TRUE/FALSE based on code reading
- Document gaps between plan assumptions and reality

#### D. Integration Test with Debugging (BEFORE Unit Tests)
- Write integration test using actual upstream component
- Add console.log/debugging to see real data structures
- Run test and analyze output
- Document findings (entity order, ID format, key structure, etc.)

#### E. Gap Analysis & Design Adjustment
- Compare plan's algorithm with available data
- Adjust design to work with ACTUAL data (not idealized)
- Document limitations based on real constraints
- Get approval for adjusted design if significantly different

**Success Criteria:** Phase -1 complete when you can answer "What does the ACTUAL data look like?" with concrete examples, not assumptions.

**Reference:** See `PHASE3_PROCESS_IMPROVEMENTS.md` for detailed examples and Step 0 lessons learned.

### TDD Workflow (After Phase -1 Complete)

1. **Phase -1:** Complete upstream data analysis (see above)
2. **RED (Integration First):** Write failing integration test with real upstream data
3. **RED (Unit Tests):** Write failing unit tests that mirror real data structure
4. **GREEN:** Implement minimum code to pass tests
5. **REFACTOR:** Clean up code while keeping tests green
6. **Commit:** Check in with clear message

**Test Assertion Standard:** All tests must assert **correctness** (exact values), not just **completion** (truthy checks).

**Before (too weak):**
```typescript
expect(result).toBeTruthy();  // Just checks something happened
```

**After (correct):**
```typescript
expect(result).toBe(expectedValue);  // Exact value
expect(result).not.toBe(wrongValue);  // No cross-contamination
```

---

## 4) Handoff Protocol

### Day 1 Kickoff
1. All agents read this main document and their assigned step files
2. All agents read `PHASE3_PROCESS_IMPROVEMENTS.md` for Step 0 lessons learned
3. Agent 1 begins Step 0 Phase -1 analysis immediately
4. Agent 2 sets up development environment, waits for Agent 1 checkpoint
5. Agent 3 begins Steps 6 & 7 Phase -1 analysis immediately (parallel)

### Agent 1 Checkpoint (After Step 2)
1. Agent 1 commits with message: `[CHECKPOINT] WS-A API frozen: graph indices + confidence scoring`
2. Agent 1 publishes test fixtures for confidence scoring edge cases
3. Agent 1 notifies Agent 2: "API frozen, you can begin Step 3"
4. Agent 2 begins Step 3 (imports frozen API)

### Integration Checkpoint (After Steps 0-7)
1. All agents complete individual step acceptance criteria
2. All agents commit to separate branches: `phase3-agent1`, `phase3-agent2`, `phase3-agent3`
3. Agents coordinate Step 8 integration testing together
4. After Step 8 passes, merge all branches to main

---

## 5) Explicit Deferrals (Out of Scope for Phase 3)

Phase 3 focuses on **foundational intelligence**. The following are explicitly deferred:

### Deferred to Phase 4 (Grounding & Polish)
- LLM Gateway integration with grounding validator
- Chunk-level grounding validation against factSets
- LLM-assisted synthesis and fluency polishing
- Grounding Gate enforcement

### Deferred to Phase 5 (Finalization)
- Answer ingestion from `answers.md`
- Impact-scoped re-reasoning
- Spec patching and QID removal
- Finalization summaries

### Deferred to Phase 6 (Production Hardening)
- Extended pattern library (Next.js, Prisma, Redux, GraphQL, Axios, Koa, NestJS, etc.)
- Performance optimization (caching, budgets, telemetry)
- Advanced error recovery (OOM handling, streaming)
- Production-grade logging and diagnostics

### Phase 3 Pattern Library Scope (Tier 0 Only)
**In Scope:**
- Express basics: Route handlers (`app.get/post/put/delete`), middleware (`app.use`), error handlers
- React basics: Functional components, JSX return, basic hooks (`useState`, `useEffect`, `useContext`, `useRef`, `useMemo`, `useCallback`)

**Out of Scope (Phase 6):**
- Next.js, Redux, GraphQL, Prisma, TypeORM, Sequelize, Axios, Fetch, Koa, NestJS, Vue, Svelte, etc.

---

## 6) Phase 3 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 2 Outputs (Available)                                 │
│ • KB with entities, relations (subjectId/predicate/objectId)│
│ • Relations have expression text in objectId (not entity IDs)│
│ • FactSets with facts (subjectId/predicate/object)          │
│ • Template-based specs (no confidence, no reasoning yet)    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ Step 0: Resolve    │ (Agent 1)
        │ Relations          │ Expression text → Entity IDs
        │ (Preparatory)      │
        └────────┬───────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ Step 1: Build      │ (Agent 1)
        │ Graph Indices      │
        │ • callGraph        │
        │ • importGraph      │
        │ • reverseDeps      │
        └────────┬───────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ Step 2: Confidence │ (Agent 1)
        │ Scoring Algorithm  │
        │ (weighted rules)   │
        └────────┬───────────┘
                 │
                 │ Freeze API ◀────────────────┐
                 │                              │
                 ▼                              │
        ┌────────────────────┐                 │
        │ Step 3-5:          │ (Agent 2)       │
        │ Reasoning Engine   │ (waits)         │
        │ • Pattern matching │                 │
        │ • Intent lifting   │                 │
        │ • Iterative loop   │                 │
        │ • Ambiguity queue  │                 │
        │ • Framework rules  │                 │
        └────────┬───────────┘                 │
                 │                              │
                 ├──────────────────────────────┤
                 │                              │
                 ▼                              ▼
        ┌────────────────────┐       ┌────────────────────┐
        │ Step 6: Two-Phase  │       │ Step 7: Phase      │
        │ Cross-Linking      │       │ Coordination       │
        │ (Agent 3)          │       │ (Agent 3)          │
        └────────┬───────────┘       └────────┬───────────┘
                 │                              │
                 └──────────┬───────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │ Step 8: Integration   │
                │ (all 3 agents)        │
                │ • E2E smoke tests     │
                │ • Confidence bands OK │
                │ • QIDs generated      │
                │ • Links validated     │
                └───────────────────────┘
```

---

## 6) Key Phase 2 API Reference (For Agent Context)

### KB Data Models (src/kb/models.ts)

```typescript
export interface Entity {
  id: string;              // Content-based anchor (not auto-increment)
  kind: EntityKind;        // 'module' | 'file' | 'function' | 'class' | 'method' | 'constant' | etc.
  name: string;
  path: string;            // Repo-relative POSIX path (NOT filePath)
  packageId?: string;
  signature?: string;
  visibility?: 'public' | 'internal';
  exported?: boolean;      // Boolean (NOT exportInfo object)
  attributes?: {
    sideEffects?: string[];
    errors?: string[];
    configInfluences?: string[];
    concurrencyNotes?: string[];
  };
  anchors?: string[];
  qids?: string[];
}

export interface Relation {
  subjectId: string;       // NOT sourceId
  predicate:               // NOT kind
    | 'imports'
    | 'exports'
    | 'calls'
    | 'reads'
    | 'writes'
    | 'publishes'
    | 'subscribes'
    | 'uses-config'
    | 'uses-env';
  objectId?: string;       // NOT targetId; may be expression text for 'calls'
  details?: Record<string, unknown>;
  source?: Source;
}

export interface FactSet {
  id: string;
  facts: Fact[];           // NO entityId field on FactSet
  sources: Source[];       // NOT provenance
  evidenceScore: number;   // 0-100, NOT confidence
  parents?: string[];
}

export interface Fact {
  subjectId: string;       // Entity ID (association via this field)
  predicate: string;       // NOT kind
  object?: unknown;        // NOT value
  qualifiers?: Record<string, unknown>;
  source?: Source;
}

export interface BehaviorChunk {
  id: string;
  targetEntityId: string;  // NOT entityId
  textDraft: string;       // NOT text
  factSetIds: string[];    // Array, NOT single factSetId
  confidence: Confidence;  // 'High' | 'Medium' | 'Low', NOT number
  assumptions?: string[];
}

export type Confidence = 'High' | 'Medium' | 'Low';  // Capitalized
```

### KB API (src/kb/knowledge-base.ts)

```typescript
export class KnowledgeBase {
  // Phase 1 APIs (frozen)
  insertEntity(entity: Entity): void;           // NOT addEntity
  insertRelation(relation: Relation): void;     // NOT addRelation
  insertFactSet(factSet: FactSet): void;        // NOT addFactSet
  insertChunk(chunk: BehaviorChunk): void;

  getEntity(id: string): Entity | undefined;
  getFactSet(id: string): FactSet | undefined;
  getChunk(id: string): BehaviorChunk | undefined;
  getRelations(entityId?: string): Relation[];

  findByPath(path: string): Entity[];
  listExported(): Entity[];

  allocateQID(filePath: string, entityKey: string, ambiguityKind: string): string;

  beginBatch(): void;
  commit(): void;
  rollback(): void;

  // Phase 2 additions (needed by Phase 3)
  updateEntity(id: string, updates: Partial<Entity>): void;

  // Phase 3 additions by Agent 1 (Step 2 replaces scoreConfidence stub)
  scoreConfidence(factSetIds: string[]): Confidence;  // Replaces stub with weighted algorithm
  getConfidenceScore(factSetIds: string[]): number;  // Helper: returns 0-100 score
  scoreToConfidenceBand(score: number): Confidence;  // Helper: converts score to band

  // Phase 3 stubs (Agent 1 will implement in graph steps)
  neighbors(entityId: string, relation: string): Entity[];  // Currently returns []
  listOpenQuestions(): Array<{ qid: string; entityId: string; text: string }>;  // Currently returns []
}
```

### Scanner API (src/scanner/scanner.ts)

```typescript
export class Scanner {
  constructor(rootPath: string, ignoreOptions?: IgnoreRulesOptions);  // NO KB in constructor
  async scan(): Promise<FileIndex>;  // Returns FileIndex, doesn't modify KB
}

export interface FileIndex {
  entries: FileEntry[];
  packages: PackageMap;
  rootPath: string;
}
```

### Parser API (src/parser/parser.ts)

```typescript
export class Parser {
  constructor();  // NO KB in constructor

  async parse(filePath: string, source: string): Promise<ParseResult>;

  async parseAndStore(
    filePath: string,
    source: string,
    kb: KnowledgeBase  // KB passed as parameter
  ): Promise<ParseResult>;
}

export interface ParseResult {
  filePath: string;
  entities: Entity[];
  relations: Relation[];
  factSets: FactSet[];
  errors: ParseError[];
}
```

### SpecGenerator API (src/generator/spec-generator.ts)

```typescript
export class SpecGenerator {
  constructor(kb: KnowledgeBase, fileIndex?: FileIndex);

  // Returns content, does NOT write files
  generateRootSpec(projectRoot: string): string;
  generateDirectorySpecs(projectRoot: string): Record<string, string>;  // Map: path → content
}
```

---

## 7) TDD Workflow (Red-Green-Refactor)

All development in Phase 3 **must** follow Test-Driven Development:

1. **Red:** Write failing unit test for next functionality
2. **Green:** Write minimal code to make test pass
3. **Refactor:** Clean up code while keeping tests green
4. **Commit:** Check in test + implementation together
5. **Repeat:** Move to next functionality

**Coverage target:** ≥80% branch coverage for all Phase 3 code

**CI enforcement:** Tests must pass, coverage must not drop, linting/typecheck must succeed

---

## 8) Quick Start for Agents

### Agent 1 (WS-A)
1. Read this document (IMPLEMENTATION_PLAN_PHASE3.md)
2. Read your step files: STEP0.md, STEP1.md, STEP2.md
3. Create branch: `phase3-agent1`
4. Begin Step 0 immediately
5. After Step 2, commit with `[CHECKPOINT]` message and notify Agent 2

### Agent 2 (WS-D)
1. Read this document (IMPLEMENTATION_PLAN_PHASE3.md)
2. Read your step files: STEP3.md, STEP4.md, STEP5.md
3. Create branch: `phase3-agent2`
4. Wait for Agent 1 checkpoint notification
5. Begin Step 3 (import frozen API from Agent 1)

### Agent 3 (WS-E + WS-H)
1. Read this document (IMPLEMENTATION_PLAN_PHASE3.md)
2. Read your step files: STEP6.md, STEP7.md
3. Create branch: `phase3-agent3`
4. Begin Steps 6 & 7 immediately (no dependencies)

### All Agents (Integration)
1. After individual steps complete, coordinate on Step 8
2. Read STEP8.md together
3. Run integration tests as a team
4. After Step 8 passes, merge all branches to main

---

## 9) References

- **CTS-01**: Knowledge Base technical specification
- **CTS-03**: Spec Generator technical specification
- **CTS-06**: Reasoning & Ambiguity Resolver technical specification
- **CTS-07**: Orchestrator & Lifecycle technical specification
- **SADS.md**: System Architecture & Design Specification
- **PHASE3_PLAN_CORRECTIONS.md**: Detailed corrections applied to this plan

---

**End of Main Overview Document**

See individual STEP files for detailed implementation instructions.
