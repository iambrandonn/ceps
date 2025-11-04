# IMPLEMENTATION_PLAN_PHASE3_STEP8.md

**Phase 3, Step 8 — Integration Testing**

**Agents:** All agents (WS-A, WS-D, WS-E+WS-H)
**Depends on:** All previous steps (0-7)
**Estimated Duration:** ~0.5 agent-day per agent (~1.5 agent-days total, parallelized)
**TDD:** Phase -1 → Red → Green → Refactor

---

## Phase -1: Upstream Data Analysis (MANDATORY - Complete Before Tests)

**Critical:** Reference `PHASE3_PROCESS_IMPROVEMENTS.md`. All previous steps must be complete.

### Quick Checklist
- [ ] Review all Phase 3 step outputs (0-7)
- [ ] Document complete data flow: Scan → Parse → Resolve → Index → Score → Reason → Validate → Generate
- [ ] Validate all interfaces between components
- [ ] Run each step independently to understand outputs
- [ ] Design end-to-end test scenarios that exercise full pipeline

**Key validation:** Run full Phase 2 + Phase 3 pipeline on sample project to understand integration points.

**Integration test to run:**
```typescript
// Phase -1: Full pipeline validation
const orchestrator = new Orchestrator();
const result = orchestrator.run({ projectRoot: './sample-express-app' });

console.log('Phases executed:', result.phases);
console.log('Entities:', result.kb.getAllEntities().length);
console.log('Call graph edges:', result.kb.getCallGraph().size);
console.log('Behavior chunks:', result.reasoning.chunks.length);
console.log('Ambiguity queue:', result.reasoning.ambiguityQueue.length);
console.log('Specs generated:', result.specs.length);
```

**Design validation:** Ensure all components integrate without schema mismatches (learned from Step 0!).

---

## Key Corrections (Per Feedback)

**This plan has been updated to align with frozen KB API:**

1. **KB helper names:** Use `kb.findByPath(path)` (returns array) instead of non-existent `getEntityByPath()`; use `kb.getChunksByEntity()` instead of `getBehaviorChunksByEntity()`
2. **getReverseDeps usage:** Call with entity ID argument (`kb.getReverseDeps(entityId)`) instead of no-arg variant returning a map
3. **Spec generation expectations:** Tests read specs from disk (written by orchestrator using `fs.writeFileSync`) instead of expecting non-existent generator methods like `readGeneratedSpecs()`

---

## Objective

Create **comprehensive integration tests** that validate the full Phase 3 pipeline:
1. End-to-end: Codebase → KB → Reasoning → Specs → Validation
2. Real-world scenarios: Express app, React component library, mixed codebase
3. Error paths: Missing files, unparseable code, validation failures
4. Performance: Target <10s for 1000-entity codebase

This step ensures **all Phase 3 components work together correctly** before handoff to Phase 4.

---

## Key Design Principles

- **Test real codebases:** Use fixtures that resemble actual user projects
- **Test error paths:** Validate graceful degradation and error messages
- **Test performance:** Ensure pipeline scales to medium-sized repos
- **Test determinism:** Same input → same output (with `--deterministic`)

---

## Test Fixtures

### Fixture 1: Express API Server (`fixtures/express-api/`)

```
fixtures/express-api/
├── src/
│   ├── app.ts          // Express app setup
│   ├── routes/
│   │   ├── users.ts    // GET /users, POST /users
│   │   └── posts.ts    // GET /posts/:id
│   ├── middleware/
│   │   └── auth.ts     // JWT auth middleware
│   └── utils/
│       └── db.ts       // Database connection
└── package.json
```

**Expected Outcomes:**
- All routes detected and documented
- Middleware documented with purpose
- High confidence for route handlers (Express patterns + hasBody)
- Cross-references: `users.ts` calls `db.ts`

---

### Fixture 2: React Component Library (`fixtures/react-components/`)

```
fixtures/react-components/
├── src/
│   ├── Button.tsx      // Function component with props
│   ├── Card.tsx        // Class component
│   ├── hooks/
│   │   └── useAuth.ts  // Custom hook using useState/useEffect
│   └── utils/
│       └── format.ts   // Utility function (no React)
└── package.json
```

**Expected Outcomes:**
- Function and class components detected
- Hooks usage documented (useState, useEffect)
- High confidence for components (React patterns + returnsJSX)
- No React patterns for `format.ts` (generic function)

---

### Fixture 3: Mixed Codebase with Low Confidence (`fixtures/mixed-low-confidence/`)

```
fixtures/mixed-low-confidence/
├── src/
│   ├── clear.ts        // High confidence: Well-documented function
│   ├── ambiguous.ts    // Medium confidence: Sparse facts, no patterns
│   └── mystery.ts      // Low confidence: Empty body, no docs → QID
└── package.json
```

**Expected Outcomes:**
- `clear.ts` → High confidence chunk
- `ambiguous.ts` → Medium confidence chunk
- `mystery.ts` → Low confidence → QID generated
- Pre-validation passes (QID counts as coverage)

---

### Fixture 4: Validation Failures (`fixtures/validation-failures/`)

```
fixtures/validation-failures/
├── src/
│   ├── exported.ts     // Exported function, no BehaviorChunk (simulate bug)
│   └── broken-link.ts  // Function with cross-ref to nonexistent entity
└── package.json
```

**Expected Outcomes:**
- Pre-validation fails: `exported.ts` missing BehaviorChunk
- Post-validation fails: broken link in generated spec
- Error messages include file paths and entity IDs

---

## TDD Implementation Steps

### **Agent 1 (WS-A): Graph & Scoring Integration Tests**

#### Test 1: Relation Resolution + Graph Building

```typescript
// src/__tests__/integration/graph-integration.test.ts
describe('Integration - Graph Building', () => {
  it('should resolve call relations and build callGraph', async () => {
    const orchestrator = new Orchestrator('fixtures/express-api');

    await orchestrator.runUntil(PipelinePhase.GRAPH_BUILDING);

    const kb = orchestrator.getKnowledgeBase();
    const callGraph = kb.getCallGraph();

    // users.ts calls db.ts
    const [usersEntity] = kb.findByPath('src/routes/users.ts');
    const [dbEntity] = kb.findByPath('src/utils/db.ts');

    expect(usersEntity).toBeDefined();
    expect(dbEntity).toBeDefined();
    expect(callGraph.has(usersEntity.id)).toBe(true);
    expect(callGraph.get(usersEntity.id)).toContain(dbEntity.id);
  });

  it('should build reverseDeps index', async () => {
    const orchestrator = new Orchestrator('fixtures/express-api');

    await orchestrator.runUntil(PipelinePhase.GRAPH_BUILDING);

    const kb = orchestrator.getKnowledgeBase();

    // db.ts is called by users.ts and posts.ts
    const [dbEntity] = kb.findByPath('src/utils/db.ts');
    expect(dbEntity).toBeDefined();

    // getReverseDeps takes entity ID as argument
    const callers = kb.getReverseDeps(dbEntity.id);

    expect(callers.size).toBeGreaterThanOrEqual(2);
  });
});
```

---

#### Test 2: Confidence Scoring with Real FactSets

```typescript
describe('Integration - Confidence Scoring', () => {
  it('should assign High confidence to Express route handlers', async () => {
    const orchestrator = new Orchestrator('fixtures/express-api');

    await orchestrator.runUntil(PipelinePhase.REASONING);

    const kb = orchestrator.getKnowledgeBase();
    const [usersEntity] = kb.findByPath('src/routes/users.ts');
    expect(usersEntity).toBeDefined();

    const chunks = kb.getChunksByEntity(usersEntity.id);

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].confidence).toBe('High'); // Express pattern + hasBody
  });

  it('should assign Low confidence to empty functions', async () => {
    const orchestrator = new Orchestrator('fixtures/mixed-low-confidence');

    await orchestrator.runUntil(PipelinePhase.AMBIGUITY_RESOLUTION);

    const kb = orchestrator.getKnowledgeBase();
    const [mysteryEntity] = kb.findByPath('src/mystery.ts');
    expect(mysteryEntity).toBeDefined();

    const chunks = kb.getChunksByEntity(mysteryEntity.id);

    expect(chunks[0].confidence).toBe('Low');

    const questions = kb.getOpenQuestionsByEntity(mysteryEntity.id);
    expect(questions.length).toBe(1);
    expect(questions[0].qid).toMatch(/^Q-function-\d+$/);
  });
});
```

---

### **Agent 2 (WS-D): Reasoning & Patterns Integration Tests**

#### Test 3: Framework Pattern Detection

```typescript
// src/__tests__/integration/reasoning-integration.test.ts
describe('Integration - Framework Patterns', () => {
  it('should detect Express routes and generate intent', async () => {
    const orchestrator = new Orchestrator('fixtures/express-api');

    await orchestrator.runUntil(PipelinePhase.REASONING);

    const kb = orchestrator.getKnowledgeBase();
    const [usersEntity] = kb.findByPath('src/routes/users.ts');
    expect(usersEntity).toBeDefined();

    const chunks = kb.getChunksByEntity(usersEntity.id);

    expect(chunks[0].textDraft).toContain('Handles GET requests to `/users`');
  });

  it('should detect React components and hooks', async () => {
    const orchestrator = new Orchestrator('fixtures/react-components');

    await orchestrator.runUntil(PipelinePhase.REASONING);

    const kb = orchestrator.getKnowledgeBase();

    // Function component
    const [buttonEntity] = kb.findByPath('src/Button.tsx');
    expect(buttonEntity).toBeDefined();
    const buttonChunks = kb.getChunksByEntity(buttonEntity.id);
    expect(buttonChunks[0].textDraft).toContain('Renders a React UI component');

    // Custom hook
    const [hookEntity] = kb.findByPath('src/hooks/useAuth.ts');
    expect(hookEntity).toBeDefined();
    const hookChunks = kb.getChunksByEntity(hookEntity.id);
    expect(hookChunks[0].textDraft).toContain('Manages component state'); // useState
  });
});
```

---

#### Test 4: Iterative Ambiguity Resolution

```typescript
describe('Integration - Ambiguity Resolution', () => {
  it('should promote Medium confidence via cross-references', async () => {
    const orchestrator = new Orchestrator('fixtures/express-api');

    // Setup: auth.ts (Medium) is called by multiple High confidence routes
    await orchestrator.runUntil(PipelinePhase.AMBIGUITY_RESOLUTION);

    const kb = orchestrator.getKnowledgeBase();
    const [authEntity] = kb.findByPath('src/middleware/auth.ts');
    expect(authEntity).toBeDefined();

    const chunks = kb.getChunksByEntity(authEntity.id);

    // Should be promoted to High due to 2+ High confidence callers
    expect(chunks[0].confidence).toBe('High');
  });

  it('should generate QIDs for unresolved Low confidence items', async () => {
    const orchestrator = new Orchestrator('fixtures/mixed-low-confidence');

    await orchestrator.runUntil(PipelinePhase.AMBIGUITY_RESOLUTION);

    const kb = orchestrator.getKnowledgeBase();
    const allQuestions = kb.getAllOpenQuestions();

    expect(allQuestions.length).toBeGreaterThan(0);
    expect(allQuestions[0].qid).toMatch(/^Q-/);
  });
});
```

---

### **Agent 3 (WS-E+WS-H): Validation & Pipeline Integration Tests**

#### Test 5: Pre-Generation Validation

```typescript
// src/__tests__/integration/validation-integration.test.ts
describe('Integration - Validation Gates', () => {
  it('should pass pre-validation for complete fixtures', async () => {
    const orchestrator = new Orchestrator('fixtures/express-api');

    await expect(orchestrator.runUntil(PipelinePhase.VALIDATION_PRE)).resolves.not.toThrow();

    const status = orchestrator.getStatus();
    expect(status.statistics.coverage).toBe(100);
  });

  it('should fail pre-validation when exported entity lacks chunk', async () => {
    const orchestrator = new Orchestrator('fixtures/validation-failures');

    await expect(orchestrator.runUntil(PipelinePhase.VALIDATION_PRE)).rejects.toThrow(/Coverage gate failed/);
  });
});
```

---

#### Test 6: Post-Generation Validation

```typescript
describe('Integration - Post-Validation', () => {
  it('should pass post-validation when all links resolve', async () => {
    const orchestrator = new Orchestrator('fixtures/express-api');

    await expect(orchestrator.run()).resolves.not.toThrow();

    const status = orchestrator.getStatus();
    expect(status.currentPhase).toBe(PipelinePhase.COMPLETE);
  });

  it('should fail post-validation on broken links', async () => {
    const orchestrator = new Orchestrator('fixtures/validation-failures/broken-link');

    await expect(orchestrator.run()).rejects.toThrow(/broken links/);
  });
});
```

---

#### Test 7: Full End-to-End Pipeline

```typescript
describe('Integration - Full Pipeline', () => {
  it('should execute complete pipeline and generate specs', async () => {
    const fs = require('fs');
    const path = require('path');
    const orchestrator = new Orchestrator('fixtures/express-api');

    await orchestrator.run();

    const kb = orchestrator.getKnowledgeBase();
    const status = orchestrator.getStatus();

    // Verify statistics
    expect(status.statistics.filesScanned).toBeGreaterThan(0);
    expect(status.statistics.entitiesFound).toBeGreaterThan(0);
    expect(status.statistics.chunksGenerated).toBeGreaterThan(0);
    expect(status.statistics.coverage).toBe(100);

    // Verify generated specs exist on disk (written by orchestrator in runGeneration phase)
    const rootSpecPath = path.join('fixtures/express-api', 'spec.md');
    expect(fs.existsSync(rootSpecPath)).toBe(true);

    const rootSpecContent = fs.readFileSync(rootSpecPath, 'utf-8');
    expect(rootSpecContent).toContain('System Overview');
    expect(rootSpecContent).toContain('Conventions');

    // Verify directory spec exists
    const dirSpecPath = path.join('fixtures/express-api', 'src', 'spec.md');
    expect(fs.existsSync(dirSpecPath)).toBe(true);

    const dirSpecContent = fs.readFileSync(dirSpecPath, 'utf-8');
    expect(dirSpecContent).toContain('Functions');
  });
});
```

---

### **All Agents: Performance & Determinism Tests**

#### Test 8: Performance Benchmarks

```typescript
// src/__tests__/integration/performance.test.ts
describe('Integration - Performance', () => {
  it('should process 1000-entity codebase in <10s', async () => {
    const orchestrator = new Orchestrator('fixtures/large-codebase');

    const startTime = Date.now();
    await orchestrator.run();
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(10000); // 10 seconds

    const status = orchestrator.getStatus();
    expect(status.statistics.entitiesFound).toBeGreaterThanOrEqual(1000);
  });
});
```

**Note:** Requires creating `fixtures/large-codebase/` with 1000+ entities. Use script to generate synthetic codebase.

---

#### Test 9: Determinism (Same Input → Same Output)

```typescript
describe('Integration - Determinism', () => {
  it('should produce identical output for same input', async () => {
    const orchestrator1 = new Orchestrator('fixtures/express-api');
    const orchestrator2 = new Orchestrator('fixtures/express-api');

    await orchestrator1.run();
    await orchestrator2.run();

    const kb1 = orchestrator1.getKnowledgeBase();
    const kb2 = orchestrator2.getKnowledgeBase();

    // Compare chunks
    const chunks1 = kb1.getAllChunks();
    const chunks2 = kb2.getAllChunks();

    expect(chunks1.length).toBe(chunks2.length);

    for (let i = 0; i < chunks1.length; i++) {
      expect(chunks1[i].targetEntityId).toBe(chunks2[i].targetEntityId);
      expect(chunks1[i].confidence).toBe(chunks2[i].confidence);
      expect(chunks1[i].textDraft).toBe(chunks2[i].textDraft);
    }

    // Compare generated specs (read from disk after each run)
    // Note: Both runs write to the same fixture directory
    // To test true determinism, we compare in-memory output or snapshots
    // For simplicity, verify chunks are deterministic (specs depend on chunks)
  });
});
```

---

## Fixture Setup Scripts

Create test fixtures programmatically to avoid manual maintenance:

```typescript
// scripts/generate-fixtures.ts
import * as fs from 'fs';
import * as path from 'path';

export function generateExpressFixture(): void {
  const fixtureDir = 'fixtures/express-api/src';
  fs.mkdirSync(fixtureDir, { recursive: true });

  // Generate app.ts
  fs.writeFileSync(path.join(fixtureDir, 'app.ts'), `
import express from 'express';
import { usersRouter } from './routes/users';

const app = express();
app.use('/users', usersRouter);

export default app;
  `);

  // Generate routes/users.ts
  fs.mkdirSync(path.join(fixtureDir, 'routes'), { recursive: true });
  fs.writeFileSync(path.join(fixtureDir, 'routes/users.ts'), `
import { Router } from 'express';
import { getDb } from '../utils/db';

const router = Router();

router.get('/', async (req, res) => {
  const db = await getDb();
  const users = await db.collection('users').find().toArray();
  res.json(users);
});

export default router;
  `);

  // Generate utils/db.ts
  fs.mkdirSync(path.join(fixtureDir, 'utils'), { recursive: true });
  fs.writeFileSync(path.join(fixtureDir, 'utils/db.ts'), `
import { MongoClient } from 'mongodb';

let db: any;

export async function getDb() {
  if (!db) {
    const client = await MongoClient.connect('mongodb://localhost');
    db = client.db('test');
  }
  return db;
}
  `);
}

// Run: ts-node scripts/generate-fixtures.ts
generateExpressFixture();
```

---

## Test Coverage Targets

- **Graph integration:** 3 tests (callGraph, importGraph, reverseDeps)
- **Confidence integration:** 3 tests (High, Medium, Low scenarios)
- **Reasoning integration:** 4 tests (Express patterns, React patterns, cross-ref promotion, QID generation)
- **Validation integration:** 4 tests (pre-validation pass/fail, post-validation pass/fail)
- **E2E pipeline:** 2 tests (full pipeline, spec generation)
- **Performance:** 1 test (1000 entities <10s)
- **Determinism:** 1 test (same input → same output)

**Total:** ~18 integration tests, targeting ≥90% **system-level coverage** (all components together)

---

## Acceptance Criteria

**STEP8 is complete when:**

1. ✅ All 18 integration tests passing
2. ✅ 4 test fixtures created (Express, React, mixed, validation-failures)
3. ✅ Fixture generation scripts working
4. ✅ Full pipeline E2E test passes for all fixtures
5. ✅ Performance test: <10s for 1000 entities
6. ✅ Determinism test: same input → identical output
7. ✅ Error path tests: validation failures handled gracefully
8. ✅ Generated specs validated: contain expected content
9. ✅ ≥90% system-level coverage maintained

---

## Integration Points

### Inputs
- **From STEP0-7:** All Phase 3 components
- **Test fixtures:** Realistic codebases representing target use cases

### Outputs
- **To Phase Completion:** Validation that Phase 3 is production-ready
- **To Phase 4:** Baseline integration tests for grounding validator
- **To Documentation:** Example outputs for user docs

---

## Completion Criteria for Phase 3

**Phase 3 is complete when:**

1. ✅ All Steps 0-8 complete (all agents)
2. ✅ All unit tests passing (277 from Phase 2 + ~100 from Phase 3)
3. ✅ All integration tests passing (18 tests)
4. ✅ ≥80% branch coverage for unit tests
5. ✅ ≥90% system-level coverage for integration tests
6. ✅ CI/CD passing (linting, typecheck, tests, coverage)
7. ✅ Performance benchmarks met (<10s for 1000 entities)
8. ✅ Documentation updated (see PHASE_COMPLETION_CHECKLIST.md)

---

## Next Steps

**After STEP8 completion:**
- ✅ Run **Phase 3 Completion Checklist** (see PHASE_COMPLETION_CHECKLIST.md)
- ✅ Update **AGENTS.md** to reflect Phase 3 completion
- ✅ Update **IMPLEMENTATION_PLAN.md** to mark Phase 3 complete
- ✅ Create **IMPLEMENTATION_PLAN_PHASE4.md** for next phase
- ✅ Commit Phase 3 deliverables to git

---

## Critical Success Factors

1. **Fixtures must be realistic:** Resemble actual user codebases, not toy examples
2. **Tests must be maintainable:** Use fixture generation scripts, not hand-written files
3. **Performance tests must be reliable:** Run on consistent hardware, measure multiple runs
4. **Determinism must be absolute:** No timestamps, no randomness, no dependency on external state

---

**End of STEP8**
