# IMPLEMENTATION_PLAN_PHASE3_SUPPORTING.md

**Phase 3 — Intelligence Layer**
**Supporting Guidelines: Error Handling, Performance, and Completion**

---

## Critical: Phase -1 Process Mandatory

**All Phase 3 steps must complete "Phase -1: Upstream Data Analysis" BEFORE writing tests.**

After Step 0 required 4 iterations due to schema mismatches, we identified that specification-first design (assume → code → discover issues) causes avoidable rework. The solution: mandatory upstream data analysis.

**See:**
- `PHASE3_PROCESS_IMPROVEMENTS.md` - Complete process guidance and Step 0 lessons learned
- Main implementation plan Section 3 - TDD Workflow with Phase -1 Analysis
- Each step file (STEP1-STEP8) - Phase -1 section with specific guidance

**Phase -1 Quick Checklist (must complete for each step):**
1. ✅ Identify data sources (upstream components)
2. ✅ Read upstream CODE (not just docs)
3. ✅ Validate assumptions checklist
4. ✅ Run integration test with debugging
5. ✅ Adjust design based on reality
6. ✅ Only THEN write tests

**Success metric:** Steps 1-8 should require ≤2 iterations each (vs 4 for Step 0).

---

## Note on API Names

**This document has been updated to reflect the frozen KB API method names:**
- Uses `insertChunk()`, `getAllChunks()`, `getChunksByEntity()`, `updateChunk()` (not BehaviorChunk variants)
- Uses `getRelations()` (not getAllRelations)
- Uses `getConfidenceScore()`, `scoreConfidence()` (not computeConfidence)
- Confidence scoring is built into KB (not separate ConfidenceScorer class)

---

## Overview

This document provides **cross-cutting guidelines** for Phase 3 implementation:
1. Error handling standards and patterns
2. Performance targets and optimization strategies
3. Logging and observability conventions
4. Completion checklist reference

All Phase 3 agents (WS-A, WS-D, WS-E+WS-H) must follow these guidelines.

---

## 1. Error Handling Standards

### 1.1 Error Categories

**Category 1: User Errors** (recoverable, informative messages)
- Invalid project path
- Unparseable files (syntax errors)
- Missing dependencies in project
- Configuration errors

**Response:** Throw descriptive error, suggest fix, continue if possible

**Example:**
```typescript
if (!fs.existsSync(projectRoot)) {
  throw new Error(
    `Project root does not exist: ${projectRoot}\n` +
    `Please check the path and try again.`
  );
}
```

---

**Category 2: Internal Errors** (bugs, should not happen in production)
- KB index corruption
- Null pointer exceptions
- Type mismatches

**Response:** Throw error with stack trace, include context (entity ID, file path), halt pipeline

**Example:**
```typescript
const entity = this.kb.getEntity(entityId);
if (!entity) {
  throw new Error(
    `Internal error: Entity not found in KB\n` +
    `Entity ID: ${entityId}\n` +
    `This indicates a bug in the pipeline. Please report.`
  );
}
```

---

**Category 3: Data Quality Issues** (warnings, non-fatal)
- Unresolved call relations
- Low confidence entities
- Missing JSDoc comments

**Response:** Log warning, collect in statistics, continue pipeline

**Example:**
```typescript
if (!relation.details?.resolved) {
  this.logger.warn(
    `Could not resolve call relation: ${relation.subjectId} -> ${relation.objectId}\n` +
    `Expression: ${relation.objectId}\n` +
    `This may reduce confidence scores.`
  );
  this.statistics.unresolvedRelations++;
}
```

---

### 1.2 Error Context

**All errors must include:**
1. **What failed:** Component name + operation (e.g., "RelationResolver.resolve")
2. **Where:** File path, entity ID, line number (if applicable)
3. **Why:** Root cause or hypothesis
4. **How to fix:** Actionable next step (if known)

**Example:**
```typescript
throw new Error(
  `Failed to parse file: ${filePath}\n` +
  `Reason: Unexpected token at line ${lineNumber}\n` +
  `This file may use unsupported syntax. Try updating TypeScript version.`
);
```

---

### 1.3 Error Propagation

**Rule:** Errors should propagate to Orchestrator, which decides whether to halt or continue.

**Anti-pattern:** Catching errors silently
```typescript
// BAD
try {
  this.kb.getEntity(id);
} catch (error) {
  // Silent failure, bad!
}
```

**Best practice:** Re-throw with context
```typescript
// GOOD
try {
  this.kb.getEntity(id);
} catch (error) {
  throw new Error(
    `Failed to retrieve entity ${id}: ${error.message}\n` +
    `Context: ${this.context}`
  );
}
```

---

### 1.4 Validation Errors

**Validation failures must:**
1. List all validation issues (not just first failure)
2. Include file paths and line numbers
3. Suggest fixes (e.g., "Add BehaviorChunk for entity X")

**Example:**
```typescript
if (!validationResult.passed) {
  const issues = [
    `Coverage gate failed: ${validationResult.coverage.toFixed(1)}% coverage`,
    `Missing entities (${validationResult.missingEntities.length}):`,
    ...validationResult.missingEntities.map(id => {
      const entity = this.kb.getEntity(id);
      return `  - ${entity.kind} "${entity.name}" at ${entity.path}`;
    }),
    `\nSuggestion: Ensure all exported entities have documentation or carry Open Questions.`
  ];

  throw new Error(issues.join('\n'));
}
```

---

## 2. Performance Targets

### 2.1 Component-Level Targets

| Component | Operation | Target | Measurement |
|-----------|-----------|--------|-------------|
| Scanner | Scan 1000 files | <1s | STEP8 integration test |
| Parser | Parse 1 file (500 LOC) | <50ms | Unit test with timer |
| RelationResolver | Resolve 1000 relations | <500ms | STEP0 performance test |
| Graph Indices | Build graphs (1000 entities) | <1s | STEP1 performance test |
| KB Confidence Scoring | Score 1 entity | <1ms | STEP2 unit test |
| PatternMatcher | Match 1 FactSet | <1ms | STEP3 unit test |
| AmbiguityResolver | 1 iteration (1000 chunks) | <2s | STEP4 performance test |
| CrossLinkValidator | Validate 1000 entities | <1s | STEP6 performance test |
| SpecGenerator | Generate 1 spec file | <100ms | Phase 2 performance test |
| **Full Pipeline** | **1000-entity codebase** | **<10s** | **STEP8 E2E test** |

---

### 2.2 Optimization Strategies

**Strategy 1: Lazy Evaluation**
- Don't compute graphs until first query
- Cache results until invalidation
- Example: `getCallGraph()` in STEP1

**Strategy 2: Batch Operations**
- Process entities in batches of 100
- Reduces function call overhead
- Example: `insertChunk()` in batches (Phase 6)

**Strategy 3: Early Termination**
- Stop reasoning iterations when converged
- Skip validation if no changes since last run
- Example: `AmbiguityResolver.resolve()` convergence detection

**Strategy 4: Incremental Updates**
- Only re-compute affected entities on KB updates
- Use dirty flags for cache invalidation
- Example: Graph indices invalidation in STEP1

**Strategy 5: Profiling**
- Add performance markers in critical paths
- Log timings for phases (via Orchestrator)
- Example: `console.time('relation-resolution')`

---

### 2.3 Performance Testing

**Unit-level performance tests:**
```typescript
// Example: KB confidence scoring performance test
describe('KnowledgeBase - Confidence Scoring Performance', () => {
  it('should score 1000 entities in <1s', () => {
    const kb = new KnowledgeBase();

    // Setup: 1000 entities with FactSets
    for (let i = 0; i < 1000; i++) {
      kb.insertEntity({ id: `e${i}`, kind: 'function', name: `f${i}`, path: `f${i}.ts` });
      kb.insertFactSet({ id: `fs${i}`, facts: [{ subjectId: `e${i}`, predicate: 'hasBody', object: 'true' }], sources: [] });
    }

    const startTime = Date.now();
    for (let i = 0; i < 1000; i++) {
      kb.getConfidenceScore([`fs${i}`]);
    }
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(1000); // <1s
  });
});
```

**Integration-level performance tests:** See STEP8.md for full pipeline performance test.

---

### 2.4 Memory Targets

| Codebase Size | Max Memory Usage | Notes |
|---------------|------------------|-------|
| 100 entities | <50MB | Typical small project |
| 1000 entities | <500MB | Medium project (Phase 3 target) |
| 10,000 entities | <2GB | Large monorepo (Phase 6 optimization) |

**Memory optimization strategies:**
- Stream file reads (don't load all files in memory)
- Clear caches periodically (e.g., after each directory)
- Use WeakMap for entity references (garbage collection)

---

## 3. Logging and Observability

### 3.1 Log Levels

**DEBUG:** Detailed diagnostics (disabled by default)
- Entity/relation creation
- Graph cache hits/misses
- Pattern matching attempts

**INFO:** Major phase transitions (always on)
- Phase start/complete
- Statistics updates
- Validation results

**WARN:** Recoverable issues (always on)
- Unresolved relations
- Low confidence entities
- Missing optional metadata

**ERROR:** Failures that halt pipeline (always on)
- Parse errors
- Validation failures
- Internal errors

---

### 3.2 Logging Format

**Standard format:** `[LEVEL] [Component] Message`

**Example:**
```
[INFO] [Orchestrator] Phase: scanning
[INFO] [Scanner] Found 125 files
[INFO] [Orchestrator] Phase: parsing
[WARN] [Parser] Could not resolve import: ./missing-module
[INFO] [Orchestrator] Phase: reasoning
[INFO] [IntentLifter] Generated 98 BehaviorChunks
[INFO] [Orchestrator] Phase: validation-pre
[INFO] [CrossLinkValidator] Coverage: 96.5% (94/97 entities)
[ERROR] [CrossLinkValidator] Coverage gate failed: 3 entities missing chunks
```

---

### 3.3 Progress Reporting

**CLI should display:**
1. Current phase name
2. Incremental statistics (after each phase)
3. Final summary (at end of pipeline)
4. Errors/warnings (as they occur)

**Example output:**
```
Phase: scanning
  ✓ scanning complete (125 files)

Phase: parsing
  ✓ parsing complete (312 entities found)

Phase: reasoning
  ✓ reasoning complete (298 chunks generated)

Phase: validation-pre
  ✓ validation-pre complete (Coverage: 96.5%)

Phase: generation
  ✓ generation complete

Phase: validation-post
  ✓ validation-post complete (0 broken links)

=== Summary ===
Files scanned: 125
Entities found: 312
Relations resolved: 487
Chunks generated: 298
Open questions: 14
Coverage: 96.5%
```

---

### 3.4 Observability Hooks

**For future phases (Phase 6):**
- Telemetry events (OpenTelemetry)
- Metrics collection (Prometheus)
- Distributed tracing (for parallel agents)

**Phase 3 minimal observability:**
- Event emitters in Orchestrator (`phaseStart`, `phaseComplete`, `phaseError`)
- Statistics object (`PipelineStatistics`)
- Error collection (`PipelineError[]`)

---

## 4. Testing Guidelines

### 4.1 Unit Test Structure

**Follow AAA pattern:**
1. **Arrange:** Setup KB, entities, relations
2. **Act:** Call method under test
3. **Assert:** Verify expected outcome

**Example:**
```typescript
describe('RelationResolver', () => {
  it('should resolve call expression to entity ID', () => {
    // Arrange
    const kb = new KnowledgeBase();
    kb.insertEntity({ id: 'e1', kind: 'function', name: 'foo', path: 'a.ts' });
    kb.insertRelation({ subjectId: 'e2', predicate: 'calls', objectId: 'foo()' });

    // Act
    const resolver = new RelationResolver(kb);
    const resolved = resolver.resolve(kb.getRelations());

    // Assert
    expect(resolved[0].objectId).toBe('e1');
    expect(resolved[0].details?.resolved).toBe(true);
  });
});
```

---

### 4.2 Integration Test Structure

**Use realistic fixtures:**
1. Setup test project in `fixtures/`
2. Run full pipeline via Orchestrator
3. Verify outputs (KB state, generated specs, statistics)

**Example:** See STEP8.md for full integration test examples.

---

### 4.3 Test Naming Conventions

**Unit tests:** `<Component> - <Feature>`
- `RelationResolver - Basic Resolution`
- `KnowledgeBase - Confidence Scoring`

**Integration tests:** `Integration - <Scenario>`
- `Integration - Full Pipeline`
- `Integration - Validation Gates`

---

### 4.4 Coverage Targets

**Unit tests:** ≥80% branch coverage per component
**Integration tests:** ≥90% system-level coverage

**Coverage exclusions:**
- Test files (`**/*.test.ts`)
- Fixture generation scripts (`scripts/generate-fixtures.ts`)
- CLI argument parsing (deferred to Phase 6)

---

## 5. Code Style and Conventions

### 5.1 TypeScript Style

**Naming:**
- Classes: `PascalCase` (e.g., `RelationResolver`)
- Interfaces: `PascalCase` (e.g., `ValidationResult`)
- Functions/methods: `camelCase` (e.g., `getConfidenceScore`, `resolveRelations`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_ITERATIONS`)
- Private fields: `camelCase` with `private` keyword (e.g., `private kb: KnowledgeBase`)

**Imports:**
- Group by: stdlib → third-party → internal
- Sort alphabetically within groups
- Use absolute imports for `src/` (e.g., `import { KB } from '../kb/knowledge-base'`)

---

### 5.2 Comment Conventions

**JSDoc for public APIs:**
```typescript
/**
 * Resolves call relation expression text to entity IDs.
 *
 * @param relations - Relations with expression text in objectId
 * @returns Relations with resolved entity IDs
 */
export function resolve(relations: Relation[]): Relation[] {
  // ...
}
```

**Inline comments for complex logic:**
```typescript
// Try to resolve call expression to entity ID
const entityId = this.resolveCallExpression(relation.objectId || '');

// Mark resolved/unresolved in details
return {
  ...relation,
  objectId: entityId || relation.objectId,
  details: {
    originalExpression: relation.objectId,
    resolved: !!entityId
  }
};
```

---

### 5.3 File Organization

**Standard file structure:**
```
src/
├── kb/                   # Knowledge Base (Phase 1)
│   ├── models.ts         # Data model interfaces
│   ├── knowledge-base.ts # KB implementation
│   ├── confidence-scorer.ts # Phase 3 STEP2
│   └── __tests__/
├── scanner/              # Scanner & Loader (Phase 2)
├── parser/               # Parser & Fact Extractor (Phase 2)
├── reasoning/            # Phase 3 STEP0-5
│   ├── relation-resolver.ts
│   ├── pattern-matcher.ts
│   ├── intent-lifter.ts
│   ├── ambiguity-resolver.ts
│   ├── patterns/
│   │   ├── express-rules.ts
│   │   └── react-rules.ts
│   └── __tests__/
├── validation/           # Phase 3 STEP6
│   ├── cross-link-validator.ts
│   └── __tests__/
├── generator/            # Spec Generator (Phase 2)
├── orchestrator/         # Phase 3 STEP7
│   ├── orchestrator.ts
│   └── __tests__/
└── __tests__/
    └── integration/      # Phase 3 STEP8
```

---

## 6. Completion Checklist

**Before declaring Phase 3 complete, verify:**

See **PHASE_COMPLETION_CHECKLIST.md** for comprehensive sign-off steps.

**Quick checklist:**
1. ✅ All 9 STEP files completed (STEP0-8)
2. ✅ All unit tests passing (~377 total)
3. ✅ All integration tests passing (~18 tests)
4. ✅ Coverage ≥80% (unit), ≥90% (integration)
5. ✅ Performance tests passing (<10s for 1000 entities)
6. ✅ Determinism test passing (same input → same output)
7. ✅ CI/CD passing (linting, typecheck, tests, coverage)
8. ✅ AGENTS.md updated (Phase 3 marked complete)
9. ✅ IMPLEMENTATION_PLAN.md updated (Phase 3 marked complete)
10. ✅ Git commit + tag (`v0.3.0`)

---

## 7. Common Pitfalls and Anti-Patterns

### Pitfall 1: Using Wrong Field Names

**Anti-pattern:** `entity.filePath`, `chunk.entityId`, `chunk.text`

**Best practice:** Use corrected field names from PHASE3_PLAN_CORRECTIONS.md
- `entity.path`, `chunk.targetEntityId`, `chunk.textDraft`

---

### Pitfall 2: Silent Failures

**Anti-pattern:** Catching errors without logging or re-throwing

**Best practice:** Always log warnings for recoverable issues, re-throw with context for failures

---

### Pitfall 3: N+1 Query Performance

**Anti-pattern:** Looping over entities and calling `kb.getFactSets()` each time

**Best practice:** Batch fetch all FactSets, build lookup map

---

### Pitfall 4: Non-Determinism

**Anti-pattern:** Using `new Date()`, `Math.random()`, or unsorted maps

**Best practice:** Use counter-based IDs, sort all collections, no timestamps in output

---

### Pitfall 5: Skipping TDD

**Anti-pattern:** Writing implementation first, backfilling tests later

**Best practice:** Red → Green → Refactor (test first, always)

---

## 8. Agent Coordination

### Handoff Protocol

**Agent 1 (WS-A) completes STEP0-2:**
1. Freeze KB API (graph methods, confidence methods)
2. Document in STEP2.md
3. Notify Agent 2 and Agent 3 via interface contract

**Agent 2 (WS-D) completes STEP3-5:**
1. Freeze PatternMatcher and IntentLifter APIs
2. Document in STEP5.md
3. Notify Agent 3 via interface contract

**Agent 3 (WS-E+WS-H) completes STEP6-7:**
1. Uses frozen APIs from Agent 1 and Agent 2
2. No changes to upstream interfaces without coordination
3. Documents integration points in STEP7.md

**All agents complete STEP8 (integration testing) in parallel:**
- Agent 1: Graph + scoring integration tests
- Agent 2: Reasoning + patterns integration tests
- Agent 3: Validation + pipeline integration tests

---

### Communication Protocol

**If API change needed after handoff:**
1. Open issue in shared tracker (GitHub Issues, Jira, etc.)
2. Discuss impact with affected agents
3. Update interface contract document
4. All agents update their code + tests
5. Verify integration tests still pass

**If bug found in upstream component:**
1. Report in shared tracker with repro steps
2. Upstream agent fixes + adds regression test
3. Downstream agent verifies fix
4. All integration tests re-run

---

## 9. References

### Key Documents

1. **IMPLEMENTATION_PLAN_PHASE3.md** — Main overview, parallelization strategy
2. **STEP0-8.md** — Detailed TDD plans for each step
3. **ACCEPTANCE.md** — Acceptance criteria and critical success factors
4. **PHASE_COMPLETION_CHECKLIST.md** — Final sign-off checklist
5. **PHASE3_PLAN_CORRECTIONS.md** — Corrected field names and API calls
6. **SADS.md** — Authoritative architectural blueprint
7. **CTS-01 through CTS-07** — Component technical specifications

---

### External Resources

- **TypeScript Handbook:** https://www.typescriptlang.org/docs/handbook/
- **Vitest Documentation:** https://vitest.dev/
- **TDD Best Practices:** Red-Green-Refactor cycle, AAA pattern
- **SOLID Principles:** Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion

---

## 10. Contact and Support

**For questions about Phase 3 implementation:**
- Refer to STEP files for detailed guidance
- Check PHASE3_PLAN_CORRECTIONS.md for corrected APIs
- Review ACCEPTANCE.md for completion criteria

**For coordination between agents:**
- Use shared issue tracker
- Follow handoff protocol (section 8)
- Document interface changes in STEP files

---

**End of Phase 3 Supporting Guidelines**
