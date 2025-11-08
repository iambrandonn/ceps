# IMPLEMENTATION_PLAN_PHASE3_STEP7.md

**Phase 3, Step 7 — Phase Coordination in Orchestrator**

**Agent:** WS-E+WS-H (Agent 3 — Cross-Link Validation & Phase Coordination)
**Depends on:** All previous steps (0-6)
**Estimated Duration:** ~1 agent-day
**TDD:** Phase -1 → Red → Green → Refactor

---

## Phase -1: Upstream Data Analysis (MANDATORY - Complete Before Tests)

**Critical:** Reference `PHASE3_PROCESS_IMPROVEMENTS.md`. Depends on ALL previous steps.

### Quick Checklist
- [ ] Read Phase 2 Orchestrator: Current phase flow (Scan → Parse → Generate)
- [ ] Read `src/orchestrator/orchestrator.ts`: Existing run() method
- [ ] Document current phase boundaries and handoffs
- [ ] Validate: Where does KB get passed between phases?
- [ ] Test: Run Phase 2 pipeline, observe phase transitions

**Key validation:** Understand existing orchestration flow before adding Phase 3 (Reasoning) phase.

**Integration test to run:**
```typescript
// Phase -1: Observe current phase flow
const orchestrator = new Orchestrator();
orchestrator.run({ projectRoot: './test-project' });
// Log shows: Scan → Parse → Generate (no Reasoning yet)
```

**Design questions to answer:**
- Where does Reasoning fit in the pipeline?
- Scan → Parse → **Reasoning** → Generate?
- Or: Scan → Parse → Generate Draft → **Reasoning** → Generate Final?

---

## Key Corrections (Per Feedback)

**This plan has been updated to align with Phase 2 actual implementation:**

1. **Scanner/Parser integration:** Store `FileIndex` once during scanning, read file contents from disk during parsing (matching Phase 2 CLI pattern)
2. **KB API alignment:** Use `getRelations()`, `insertChunk()`, `getAllChunks()` from frozen Phase 2 API; document new methods `replaceRelations()` and `getFactSetsBySubject()` required for orchestrator
3. **Reasoning wiring:** IntentLifter requires `PatternMatcher` in constructor; returns `BehaviorChunk` that orchestrator must insert
4. **Generation API:** Use actual Phase 2 API (`generateRootSpec`, `generateDirectorySpecs` returning `Record<string,string>`); orchestrator writes files to disk and converts to `SpecFile[]` for validation

---

## Objective

Upgrade the **Orchestrator** (from Phase 2 minimal integration) to support **Phase 3 intelligence workflow**:
1. Coordinate multi-pass reasoning (relation resolution → graph building → reasoning → ambiguity resolution)
2. Integrate CrossLinkValidator into generation pipeline
3. Add progress reporting and error handling
4. Expose pipeline status for CLI/testing

This step completes the **Phase Coordination** requirements from CTS-07 (Orchestrator and Lifecycle).

---

## Key Design Principles

- **Phase-based execution:** Separate concerns (scanning → parsing → reasoning → generation → validation)
- **Fail-fast validation:** Stop pipeline if coverage gate fails
- **Deterministic ordering:** Same input → same execution order
- **Observable progress:** Report phase transitions and statistics

---

## Data Model (Corrected Field Names)

```typescript
// Pipeline Phase Enum
enum PipelinePhase {
  SCANNING = 'scanning',
  PARSING = 'parsing',
  RELATION_RESOLUTION = 'relation-resolution',
  GRAPH_BUILDING = 'graph-building',
  REASONING = 'reasoning',
  AMBIGUITY_RESOLUTION = 'ambiguity-resolution',
  VALIDATION_PRE = 'validation-pre',
  GENERATION = 'generation',
  VALIDATION_POST = 'validation-post',
  COMPLETE = 'complete'
}

// Pipeline Status
interface PipelineStatus {
  currentPhase: PipelinePhase;
  startTime: Date;
  statistics: PipelineStatistics;
  errors: PipelineError[];
}

interface PipelineStatistics {
  filesScanned: number;
  entitiesFound: number;
  relationsResolved: number;
  chunksGenerated: number;
  openQuestions: number;
  coverage: number;
}

interface PipelineError {
  phase: PipelinePhase;
  message: string;
  details?: unknown;
}
```

---

## TDD Implementation Steps

### **Day 1 Morning: Phase Coordination API**

#### Test 1: Execute Full Pipeline End-to-End

```typescript
// src/orchestrator/__tests__/orchestrator-phase3.test.ts
describe('Orchestrator - Phase 3 Pipeline', () => {
  it('should execute all phases in correct order', async () => {
    const orchestrator = new Orchestrator('/test/project');
    const phaseLog: string[] = [];

    orchestrator.on('phaseStart', (phase) => {
      phaseLog.push(phase);
    });

    await orchestrator.run();

    expect(phaseLog).toEqual([
      'scanning',
      'parsing',
      'relation-resolution',
      'graph-building',
      'reasoning',
      'ambiguity-resolution',
      'validation-pre',
      'generation',
      'validation-post',
      'complete'
    ]);
  });

  it('should populate KB after parsing phase', async () => {
    const orchestrator = new Orchestrator('/test/project');

    await orchestrator.runUntil(PipelinePhase.PARSING);

    const kb = orchestrator.getKnowledgeBase();
    const entities = kb.getAllEntities();

    expect(entities.length).toBeGreaterThan(0);
  });
});
```

**Implementation:**

```typescript
// src/orchestrator/orchestrator.ts (upgraded from Phase 2)
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { KnowledgeBase } from '../kb/knowledge-base';
import { Scanner } from '../scanner/scanner';
import { Parser } from '../parser/parser';
import { RelationResolver } from '../reasoning/relation-resolver';
import { IntentLifter } from '../reasoning/intent-lifter';
import { AmbiguityResolver } from '../reasoning/ambiguity-resolver';
import { CrossLinkValidator } from '../validation/cross-link-validator';
import { SpecGenerator } from '../generator/spec-generator';
import { PatternMatcher } from '../reasoning/pattern-matcher';
import { FileIndex } from '../types/index';

export enum PipelinePhase {
  SCANNING = 'scanning',
  PARSING = 'parsing',
  RELATION_RESOLUTION = 'relation-resolution',
  GRAPH_BUILDING = 'graph-building',
  REASONING = 'reasoning',
  AMBIGUITY_RESOLUTION = 'ambiguity-resolution',
  VALIDATION_PRE = 'validation-pre',
  GENERATION = 'generation',
  VALIDATION_POST = 'validation-post',
  COMPLETE = 'complete'
}

export interface PipelineStatus {
  currentPhase: PipelinePhase;
  startTime: Date;
  statistics: PipelineStatistics;
  errors: PipelineError[];
}

export interface PipelineStatistics {
  filesScanned: number;
  entitiesFound: number;
  relationsResolved: number;
  chunksGenerated: number;
  openQuestions: number;
  coverage: number;
}

export interface PipelineError {
  phase: PipelinePhase;
  message: string;
  details?: unknown;
}

export class Orchestrator extends EventEmitter {
  private kb: KnowledgeBase;
  private status: PipelineStatus;
  private fileIndex?: FileIndex; // Store scanner output for parsing phase

  constructor(private rootPath: string) {
    super();
    this.kb = new KnowledgeBase();
    this.status = {
      currentPhase: PipelinePhase.SCANNING,
      startTime: new Date(),
      statistics: {
        filesScanned: 0,
        entitiesFound: 0,
        relationsResolved: 0,
        chunksGenerated: 0,
        openQuestions: 0,
        coverage: 0
      },
      errors: []
    };
  }

  async run(): Promise<void> {
    const phases = [
      PipelinePhase.SCANNING,
      PipelinePhase.PARSING,
      PipelinePhase.RELATION_RESOLUTION,
      PipelinePhase.GRAPH_BUILDING,
      PipelinePhase.REASONING,
      PipelinePhase.AMBIGUITY_RESOLUTION,
      PipelinePhase.VALIDATION_PRE,
      PipelinePhase.GENERATION,
      PipelinePhase.VALIDATION_POST,
      PipelinePhase.COMPLETE
    ];

    for (const phase of phases) {
      await this.executePhase(phase);
    }
  }

  async runUntil(targetPhase: PipelinePhase): Promise<void> {
    const phases = Object.values(PipelinePhase);
    const targetIndex = phases.indexOf(targetPhase);

    for (let i = 0; i <= targetIndex; i++) {
      await this.executePhase(phases[i]);
    }
  }

  private async executePhase(phase: PipelinePhase): Promise<void> {
    this.status.currentPhase = phase;
    this.emit('phaseStart', phase);

    try {
      switch (phase) {
        case PipelinePhase.SCANNING:
          await this.runScanning();
          break;
        case PipelinePhase.PARSING:
          await this.runParsing();
          break;
        case PipelinePhase.RELATION_RESOLUTION:
          await this.runRelationResolution();
          break;
        case PipelinePhase.GRAPH_BUILDING:
          await this.runGraphBuilding();
          break;
        case PipelinePhase.REASONING:
          await this.runReasoning();
          break;
        case PipelinePhase.AMBIGUITY_RESOLUTION:
          await this.runAmbiguityResolution();
          break;
        case PipelinePhase.VALIDATION_PRE:
          await this.runPreValidation();
          break;
        case PipelinePhase.GENERATION:
          await this.runGeneration();
          break;
        case PipelinePhase.VALIDATION_POST:
          await this.runPostValidation();
          break;
        case PipelinePhase.COMPLETE:
          // No-op
          break;
      }

      this.emit('phaseComplete', phase);
    } catch (error) {
      this.handlePhaseError(phase, error);
    }
  }

  private async runScanning(): Promise<void> {
    const scanner = new Scanner(this.rootPath);
    this.fileIndex = await scanner.scan();
    this.status.statistics.filesScanned = this.fileIndex.entries.length;
  }

  private async runParsing(): Promise<void> {
    if (!this.fileIndex) {
      throw new Error('Scanning phase must complete before parsing');
    }

    const parser = new Parser();
    const codeFiles = this.fileIndex.entries.filter(e => e.kind === 'code');

    for (const entry of codeFiles) {
      const source = fs.readFileSync(entry.absolutePath, 'utf8');
      await parser.parseAndStore(entry.path, source, this.kb);
    }

    this.status.statistics.entitiesFound = this.kb.getAllEntities().length;
  }

  private async runRelationResolution(): Promise<void> {
    // Implemented in STEP0
    const resolver = new RelationResolver(this.kb);
    const relations = this.kb.getRelations(); // Get all relations (no argument)
    const resolved = resolver.resolve(relations);

    // Replace relations in KB
    // NOTE: Requires KB.replaceRelations() method (see KB Interface Extensions section)
    this.kb.replaceRelations(resolved);

    const resolvedCount = resolved.filter(r => r.details?.resolved).length;
    this.status.statistics.relationsResolved = resolvedCount;
  }

  private async runGraphBuilding(): Promise<void> {
    // Force graph index computation by calling getters
    // These methods cache results on first call
    this.kb.getCallGraph();
    this.kb.getImportGraph();
    // Note: getReverseDeps(entityId) is entity-specific; cache built on first getCallGraph/getImportGraph call
  }

  private async runReasoning(): Promise<void> {
    const matcher = new PatternMatcher(this.kb);
    const lifter = new IntentLifter(this.kb, matcher);
    const entities = this.kb.getAllEntities();

    for (const entity of entities) {
      // Get factSets for this entity
      // NOTE: Requires KB.getFactSetsBySubject() method (see KB Interface Extensions section)
      const factSets = this.kb.getFactSetsBySubject(entity.id);
      if (factSets.length > 0) {
        const chunk = lifter.liftIntent(factSets.map(fs => fs.id));
        this.kb.insertChunk(chunk); // Use correct API name
      }
    }

    this.status.statistics.chunksGenerated = this.kb.getAllChunks().length;
  }

  private async runAmbiguityResolution(): Promise<void> {
    const resolver = new AmbiguityResolver(this.kb);
    const result = resolver.resolve({ maxIterations: 10 });

    this.status.statistics.openQuestions = result.openQuestions.length;
  }

  private async runPreValidation(): Promise<void> {
    const validator = new CrossLinkValidator(this.kb);
    const result = validator.validatePreGeneration();

    this.status.statistics.coverage = result.coverage;

    if (!result.passed) {
      throw new Error(`Coverage gate failed: ${result.missingEntities.length} entities missing BehaviorChunk or QID`);
    }
  }

  private async runGeneration(): Promise<void> {
    if (!this.fileIndex) {
      throw new Error('Scanning phase must complete before generation');
    }

    const generator = new SpecGenerator(this.kb, this.fileIndex);

    // Generate root spec
    const rootSpec = generator.generateRootSpec(this.rootPath);
    const rootSpecPath = path.join(this.rootPath, 'spec.md');
    fs.writeFileSync(rootSpecPath, rootSpec, 'utf8');

    // Generate directory/package specs
    const dirSpecs = generator.generateDirectorySpecs(this.rootPath);
    for (const [specPath, content] of Object.entries(dirSpecs)) {
      const fullPath = path.join(this.rootPath, specPath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }

  private async runPostValidation(): Promise<void> {
    if (!this.fileIndex) {
      throw new Error('Scanning phase must complete before validation');
    }

    const validator = new CrossLinkValidator(this.kb);
    const generator = new SpecGenerator(this.kb, this.fileIndex);

    // Re-generate specs to get content for validation
    const rootSpec = generator.generateRootSpec(this.rootPath);
    const dirSpecs = generator.generateDirectorySpecs(this.rootPath);

    // Convert to SpecFile[] format expected by validator
    const specFiles = [
      { path: 'spec.md', content: rootSpec },
      ...Object.entries(dirSpecs).map(([path, content]) => ({ path, content }))
    ];

    const anchorMap = validator.buildAnchorMap(specFiles);
    const result = validator.validatePostGeneration(specFiles, anchorMap);

    if (!result.passed) {
      throw new Error(`Post-validation failed: ${result.brokenLinks.length} broken links`);
    }
  }

  private handlePhaseError(phase: PipelinePhase, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.status.errors.push({
      phase,
      message: errorMessage,
      details: error
    });

    this.emit('phaseError', phase, error);
    throw error; // Re-throw to halt pipeline
  }

  getKnowledgeBase(): KnowledgeBase {
    return this.kb;
  }

  getStatus(): PipelineStatus {
    return { ...this.status }; // Return copy
  }
}
```

---

### **Day 1 Afternoon: Progress Reporting & Error Handling**

#### Test 2: Emit Progress Events

```typescript
describe('Orchestrator - Progress Reporting', () => {
  it('should emit phaseStart and phaseComplete events', async () => {
    const orchestrator = new Orchestrator('/test/project');
    const events: string[] = [];

    orchestrator.on('phaseStart', (phase) => events.push(`start:${phase}`));
    orchestrator.on('phaseComplete', (phase) => events.push(`complete:${phase}`));

    await orchestrator.runUntil(PipelinePhase.PARSING);

    expect(events).toContain('start:scanning');
    expect(events).toContain('complete:scanning');
    expect(events).toContain('start:parsing');
    expect(events).toContain('complete:parsing');
  });

  it('should populate statistics after each phase', async () => {
    const orchestrator = new Orchestrator('/test/project');

    await orchestrator.runUntil(PipelinePhase.PARSING);

    const status = orchestrator.getStatus();
    expect(status.statistics.filesScanned).toBeGreaterThan(0);
    expect(status.statistics.entitiesFound).toBeGreaterThan(0);
  });
});
```

---

#### Test 3: Handle Phase Errors

```typescript
describe('Orchestrator - Error Handling', () => {
  it('should capture phase errors and halt pipeline', async () => {
    const orchestrator = new Orchestrator('/nonexistent/path');
    const errors: PipelineError[] = [];

    orchestrator.on('phaseError', (phase, error) => {
      errors.push({ phase, message: error.message });
    });

    await expect(orchestrator.run()).rejects.toThrow();

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].phase).toBe(PipelinePhase.SCANNING);
  });

  it('should record errors in status', async () => {
    const orchestrator = new Orchestrator('/nonexistent/path');

    try {
      await orchestrator.run();
    } catch (error) {
      // Expected
    }

    const status = orchestrator.getStatus();
    expect(status.errors.length).toBeGreaterThan(0);
  });
});
```

---

#### Test 4: Validation Gate Stops Pipeline

```typescript
describe('Orchestrator - Validation Gates', () => {
  it('should stop pipeline if pre-validation fails', async () => {
    const orchestrator = new Orchestrator('/test/project');

    // Mock KB with missing entities
    const kb = orchestrator.getKnowledgeBase();
    kb.insertEntity({ id: 'e1', kind: 'function', name: 'foo', path: 'a.ts', exported: true });
    // No BehaviorChunk for e1

    await expect(orchestrator.runUntil(PipelinePhase.VALIDATION_PRE)).rejects.toThrow(/Coverage gate failed/);

    const status = orchestrator.getStatus();
    expect(status.currentPhase).toBe(PipelinePhase.VALIDATION_PRE);
    expect(status.errors).toContainEqual(
      expect.objectContaining({ phase: PipelinePhase.VALIDATION_PRE })
    );
  });
});
```

---

### **Day 1 Evening: CLI Integration**

#### Test 5: CLI Displays Pipeline Progress

```typescript
// src/__tests__/cli-phase3.test.ts
describe('CLI - Phase 3 Integration', () => {
  it('should display progress during pipeline execution', async () => {
    const output: string[] = [];
    const cli = new CLI({
      onLog: (msg: string) => output.push(msg)
    });

    await cli.run({ projectRoot: '/test/project' });

    expect(output).toContainEqual(expect.stringContaining('Phase: scanning'));
    expect(output).toContainEqual(expect.stringContaining('Phase: parsing'));
    expect(output).toContainEqual(expect.stringContaining('Phase: reasoning'));
    expect(output).toContainEqual(expect.stringContaining('Phase: validation-pre'));
    expect(output).toContainEqual(expect.stringContaining('Phase: generation'));
  });

  it('should display statistics summary at end', async () => {
    const output: string[] = [];
    const cli = new CLI({
      onLog: (msg: string) => output.push(msg)
    });

    await cli.run({ projectRoot: '/test/project' });

    const summary = output.join('\n');
    expect(summary).toContain('Files scanned:');
    expect(summary).toContain('Entities found:');
    expect(summary).toContain('Coverage:');
    expect(summary).toContain('Open questions:');
  });
});
```

**Implementation:**

```typescript
// src/cli.ts (upgraded from Phase 1/2)
import { Orchestrator, PipelinePhase } from './orchestrator/orchestrator';

export interface CLIOptions {
  projectRoot: string;
  onLog?: (message: string) => void;
}

export class CLI {
  constructor(private options: { onLog?: (message: string) => void } = {}) {}

  async run(options: CLIOptions): Promise<void> {
    const orchestrator = new Orchestrator(options.projectRoot);

    // Subscribe to progress events
    orchestrator.on('phaseStart', (phase: PipelinePhase) => {
      this.log(`Phase: ${phase}`);
    });

    orchestrator.on('phaseComplete', (phase: PipelinePhase) => {
      const status = orchestrator.getStatus();
      this.log(`  ✓ ${phase} complete`);

      // Display incremental statistics
      if (phase === PipelinePhase.PARSING) {
        this.log(`    Entities found: ${status.statistics.entitiesFound}`);
      } else if (phase === PipelinePhase.REASONING) {
        this.log(`    Chunks generated: ${status.statistics.chunksGenerated}`);
      } else if (phase === PipelinePhase.VALIDATION_PRE) {
        this.log(`    Coverage: ${status.statistics.coverage.toFixed(1)}%`);
      }
    });

    orchestrator.on('phaseError', (phase: PipelinePhase, error: Error) => {
      this.log(`  ✗ ${phase} failed: ${error.message}`);
    });

    try {
      await orchestrator.run();

      // Display final summary
      const status = orchestrator.getStatus();
      this.log('\n=== Summary ===');
      this.log(`Files scanned: ${status.statistics.filesScanned}`);
      this.log(`Entities found: ${status.statistics.entitiesFound}`);
      this.log(`Relations resolved: ${status.statistics.relationsResolved}`);
      this.log(`Chunks generated: ${status.statistics.chunksGenerated}`);
      this.log(`Open questions: ${status.statistics.openQuestions}`);
      this.log(`Coverage: ${status.statistics.coverage.toFixed(1)}%`);
    } catch (error) {
      const status = orchestrator.getStatus();
      this.log('\n=== Pipeline Failed ===');
      this.log(`Phase: ${status.currentPhase}`);
      this.log(`Errors: ${status.errors.length}`);

      for (const err of status.errors) {
        this.log(`  [${err.phase}] ${err.message}`);
      }

      throw error;
    }
  }

  private log(message: string): void {
    if (this.options.onLog) {
      this.options.onLog(message);
    } else {
      console.log(message);
    }
  }
}
```

---

## Interface Contract Updates (Day 1)

**KB Additional Methods** (add to `src/kb/knowledge-base.ts`):

```typescript
export class KnowledgeBase {
  // Existing methods from Phase 2:
  // - getRelations(entityId?: string): Relation[]  ✅ Already exists
  // - insertChunk(chunk: BehaviorChunk): void       ✅ Already exists (Step 4)
  // - getAllChunks(): BehaviorChunk[]               ✅ Already exists (Step 4)

  // NEW methods required for Phase 3 orchestrator:

  /**
   * Replace all relations in KB with new array.
   * Used after RelationResolver to store resolved relations.
   */
  replaceRelations(relations: Relation[]): void {
    const state = this.getActiveState();
    state.relations = [...relations];
  }

  /**
   * Get all factSets that have facts with the given entityId as subjectId.
   * Used by IntentLifter to gather facts for an entity.
   */
  getFactSetsBySubject(entityId: string): FactSet[] {
    const state = this.getActiveState();
    const result: FactSet[] = [];
    for (const factSet of state.factSets.values()) {
      // Check if any fact in this factSet has matching subjectId
      if (factSet.facts.some(f => f.subjectId === entityId)) {
        result.push(factSet);
      }
    }
    return result;
  }
}
```

**SpecGenerator Methods** (already implemented in Phase 2):

```typescript
export class SpecGenerator {
  // Phase 2 API (no changes needed):
  constructor(kb: KnowledgeBase, fileIndex?: FileIndex);
  generateRootSpec(projectRoot: string): string;
  generateDirectorySpecs(projectRoot: string): Record<string, string>;

  // Orchestrator writes files using fs.writeFileSync (see runGeneration implementation)
}
```

---

## Test Coverage Targets

- **Phase execution:** 5 tests (full pipeline, runUntil, phase order, statistics, KB state)
- **Progress reporting:** 3 tests (events, statistics updates, phase transitions)
- **Error handling:** 4 tests (phase errors, error recording, halt pipeline, error details)
- **Validation gates:** 2 tests (pre-validation gate, post-validation gate)
- **CLI integration:** 3 tests (progress display, summary, error display)

**Total:** ~17 tests, targeting ≥80% branch coverage

---

## Integration Points

### Inputs
- **From STEP0:** RelationResolver
- **From STEP1:** Graph indices (called in graph-building phase)
- **From STEP3:** IntentLifter
- **From STEP4:** AmbiguityResolver
- **From STEP6:** CrossLinkValidator

### Outputs
- **To CLI:** Pipeline status and progress events
- **To STEP8:** Orchestrator provides end-to-end execution for integration tests
- **To Phase 4:** Orchestrator provides foundation for grounding gates

---

## Explicit Deferrals

**NOT in Phase 3:**
1. **Concurrency control:** Parallel parsing/reasoning (Phase 6)
2. **LLM budget management:** Token tracking, caching (Phase 4)
3. **Incremental execution:** Resume from checkpoint (Phase 6)
4. **Multi-output formats:** JSON, HTML specs (Phase 6)

**In Phase 3:**
1. Sequential phase execution (deterministic, simple)
2. Basic progress reporting (phase transitions + statistics)
3. Fail-fast validation gates (halt on error)
4. In-memory pipeline (no checkpointing)

---

## Completion Criteria

**STEP7 is complete when:**

1. ✅ All 17 tests passing
2. ✅ Orchestrator executes all 10 phases in correct order
3. ✅ `runUntil()` supports partial execution (for testing)
4. ✅ Progress events emitted: `phaseStart`, `phaseComplete`, `phaseError`
5. ✅ Statistics populated after each phase
6. ✅ Pre-validation gate halts pipeline on coverage failure
7. ✅ Post-validation gate halts pipeline on broken links
8. ✅ CLI displays progress and summary
9. ✅ Error messages include phase and details
10. ✅ ≥80% branch coverage maintained

---

## Next Steps

**After STEP7 completion:**
- ✅ **Agent 3 (WS-E+WS-H) work complete** — Steps 6-7 done
- ✅ Proceed to **STEP8** (Integration Testing across all 3 agents)

**Dependencies resolved:**
- All Phase 3 components (Steps 0-6) integrated
- CLI upgraded to Phase 3 capabilities
- Orchestrator ready for Phase 4 enhancements (grounding, LLM)

---

## Critical Success Factors

1. **Phase order must be deterministic:** No race conditions, same input → same output
2. **Validation gates must be reliable:** No false positives/negatives
3. **Progress reporting must be real-time:** Events emitted immediately, not batched
4. **Error handling must preserve context:** Include phase, file, entity ID in errors

---

**End of STEP7**
