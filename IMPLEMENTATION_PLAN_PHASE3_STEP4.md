# IMPLEMENTATION_PLAN_PHASE3_STEP4.md

**Phase 3, Step 4 — Iterative Resolution & Ambiguity Queue**

**Agent:** WS-D (Agent 2 — Reasoning)
**Depends on:** STEP3 (Reasoning Foundation)
**Estimated Duration:** ~1.5 agent-days
**TDD:** Phase -1 → Red → Green → Refactor

---

## Phase -1: Upstream Data Analysis (MANDATORY - Complete Before Tests)

**Critical:** Reference `PHASE3_PROCESS_IMPROVEMENTS.md`. Depends on Step 3 (Pattern Matcher).

### Quick Checklist
- [ ] Read Step 3 output: PatternMatcher and IntentLifter interfaces
- [ ] Validate BehaviorChunk structure from Step 3
- [ ] Test integration: Run PatternMatcher to see actual BehaviorChunk output
- [ ] Document what confidence thresholds trigger ambiguity queue (Low < 40)
- [ ] Verify iteration logic works with real chunks from Step 3

**Key validation:** Run integration test with Step 3's PatternMatcher/IntentLifter to see actual BehaviorChunk output and confidence bands before designing iteration logic.

**Integration test to run:**
```typescript
// Phase -1: See what Step 3 actually produces
const chunks = intentLifter.lift(factSets);
console.log('Chunk structure:', chunks[0]);
console.log('Confidence values:', chunks.map(c => c.confidence));
console.log('Low confidence count:', chunks.filter(c => c.confidence === 'Low').length);
```

---

## Objective

Implement the **iterative ambiguity resolution loop** that:
1. Promotes confidence via cross-reference reinforcement
2. Detects convergence or oscillation
3. Generates Open Questions (QIDs) for unresolved Low confidence items
4. Maintains an ambiguity queue for tracking unresolved items

This step completes the **Reasoning & Ambiguity Resolver** (CTS-06) core loop.

---

## Key Design Principles

- **Iterative refinement:** Multiple passes to maximize confidence before emitting QIDs
- **Convergence detection:** Stop when no confidence changes occur across a full pass
- **Oscillation prevention:** Detect cycles and force resolution (QID emission)
- **Cross-reference promotion:** Use callGraph/reverseDeps to reinforce confidence when dependencies are resolved
- **QID generation:** Low confidence items become Open Questions with stable IDs

---

## Data Model (Corrected Field Names)

All code uses **Phase 2 actual APIs**:

```typescript
// BehaviorChunk (src/kb/models.ts)
interface BehaviorChunk {
  id: string;
  targetEntityId: string;        // NOT entityId
  textDraft: string;              // NOT text
  factSetIds: string[];           // Array, NOT single factSetId
  confidence: Confidence;         // 'High' | 'Medium' | 'Low' (capitalized)
  // ...
}

// Open Question
interface OpenQuestion {
  qid: string;                    // Format: Q-<entity-kind>-<counter>
  entityId: string;
  question: string;
  confidence: number;             // Original score before band conversion
  factSetIds: string[];
  // ...
}
```

---

## TDD Implementation Steps

### **Day 1 Morning: Iterative Resolution Loop**

#### Test 1: Basic Convergence Detection

```typescript
// src/reasoning/__tests__/ambiguity-resolver.test.ts
describe('AmbiguityResolver - Convergence', () => {
  it('should detect convergence when no confidence changes', () => {
    const kb = new KnowledgeBase();
    const resolver = new AmbiguityResolver(kb);

    // Insert entities with Medium confidence chunks
    const chunks = [
      { targetEntityId: 'e1', confidence: 'Medium' as Confidence, factSetIds: ['fs1'] },
      { targetEntityId: 'e2', confidence: 'Medium' as Confidence, factSetIds: ['fs2'] }
    ];

    chunks.forEach(c => kb.insertChunk(c));

    const result = resolver.resolve({ maxIterations: 3 });

    expect(result.converged).toBe(true);
    expect(result.iterations).toBe(1); // No changes, converge immediately
  });
});
```

**Implementation:**

```typescript
// src/reasoning/ambiguity-resolver.ts
export interface ResolutionResult {
  converged: boolean;
  iterations: number;
  promoted: number;
  openQuestions: OpenQuestion[];
}

export interface ResolutionOptions {
  maxIterations?: number;
  enableCrossRefPromotion?: boolean;
}

export class AmbiguityResolver {
  constructor(private kb: KnowledgeBase) {}

  resolve(options: ResolutionOptions = {}): ResolutionResult {
    const maxIter = options.maxIterations ?? 10;
    const enablePromotion = options.enableCrossRefPromotion ?? true;

    let iterations = 0;
    let promoted = 0;

    for (let i = 0; i < maxIter; i++) {
      iterations++;
      const changedCount = this.runPromotionPass(enablePromotion);
      promoted += changedCount;

      if (changedCount === 0) {
        // Convergence: no changes in this pass
        return {
          converged: true,
          iterations,
          promoted,
          openQuestions: this.generateOpenQuestions()
        };
      }
    }

    // Max iterations reached without convergence
    return {
      converged: false,
      iterations,
      promoted,
      openQuestions: this.generateOpenQuestions()
    };
  }

  private runPromotionPass(enablePromotion: boolean): number {
    // Stub: returns 0 (no changes)
    return 0;
  }

  private generateOpenQuestions(): OpenQuestion[] {
    // Stub: returns empty array
    return [];
  }
}
```

---

#### Test 2: Cross-Reference Confidence Promotion

```typescript
describe('AmbiguityResolver - Cross-Reference Promotion', () => {
  it('should promote confidence when dependencies are High', () => {
    const kb = new KnowledgeBase();
    const resolver = new AmbiguityResolver(kb);

    // e1 calls e2; e2 is High confidence
    kb.insertEntity({ id: 'e1', kind: 'function', name: 'caller', path: 'a.ts' });
    kb.insertEntity({ id: 'e2', kind: 'function', name: 'callee', path: 'b.ts' });
    kb.insertRelation({
      subjectId: 'e1',
      predicate: 'calls',
      objectId: 'e2',
      details: { resolved: true }
    });

    // e2 has High confidence chunk
    kb.insertChunk({
      id: 'bc1',
      targetEntityId: 'e2',
      textDraft: 'Callee logic',
      confidence: 'High' as Confidence,
      factSetIds: ['fs2']
    });

    // e1 has Medium confidence chunk (score = 50)
    kb.insertFactSet({ id: 'fs1', facts: [{ subjectId: 'e1', predicate: 'hasBody', objectId: 'true' }] });
    kb.insertChunk({
      id: 'bc2',
      targetEntityId: 'e1',
      textDraft: 'Caller logic',
      confidence: 'Medium' as Confidence,
      factSetIds: ['fs1']
    });

    const result = resolver.resolve();

    expect(result.promoted).toBeGreaterThan(0);
    const chunk = kb.getChunk('bc2');
    expect(chunk.confidence).toBe('High'); // Promoted via cross-ref
  });
});
```

**Implementation:**

```typescript
// src/reasoning/ambiguity-resolver.ts (continued)
private runPromotionPass(enablePromotion: boolean): number {
  if (!enablePromotion) return 0;

  const chunks = this.kb.getAllChunks();
  let changedCount = 0;

  for (const chunk of chunks) {
    if (chunk.confidence === 'High') continue; // Already max

    const promoted = this.tryPromoteChunk(chunk);
    if (promoted) changedCount++;
  }

  return changedCount;
}

private tryPromoteChunk(chunk: BehaviorChunk): boolean {
  const callGraph = this.kb.getCallGraph();
  const callees = callGraph.get(chunk.targetEntityId) || new Set();

  // Count High confidence callees
  let highCount = 0;
  for (const calleeId of callees) {
    const calleeChunk = this.kb.getChunksByEntity(calleeId)[0];
    if (calleeChunk?.confidence === 'High') {
      highCount++;
    }
  }

  // Promotion rule: 2+ High dependencies → promote Medium to High
  if (chunk.confidence === 'Medium' && highCount >= 2) {
    // Recompute confidence with reinforcement bonus
    const score = this.kb.getConfidenceScore(chunk.factSetIds) + 15; // Cross-ref bonus
    const newBand = this.kb.scoreToConfidenceBand(score);

    if (newBand !== chunk.confidence) {
      // Update chunk in KB
      this.kb.updateChunk(chunk.id, { confidence: newBand });
      return true;
    }
  }

  return false;
}
```

**Note:** Uses KB extensions documented in "KB Interface Extensions (Prerequisites)" section below.

---

### **Day 1 Afternoon: Oscillation Detection**

#### Test 3: Detect Confidence Oscillation

```typescript
describe('AmbiguityResolver - Oscillation Detection', () => {
  it('should detect oscillation and force resolution', () => {
    const kb = new KnowledgeBase();
    const resolver = new AmbiguityResolver(kb);

    // Setup circular dependency: e1 ↔ e2
    kb.insertEntity({ id: 'e1', kind: 'function', name: 'f1', path: 'a.ts' });
    kb.insertEntity({ id: 'e2', kind: 'function', name: 'f2', path: 'b.ts' });
    kb.insertRelation({
      subjectId: 'e1',
      predicate: 'calls',
      objectId: 'e2',
      details: { resolved: true }
    });
    kb.insertRelation({
      subjectId: 'e2',
      predicate: 'calls',
      objectId: 'e1',
      details: { resolved: true }
    });

    // Both Medium confidence
    kb.insertChunk({
      id: 'bc1',
      targetEntityId: 'e1',
      confidence: 'Medium' as Confidence,
      factSetIds: ['fs1']
    });
    kb.insertChunk({
      id: 'bc2',
      targetEntityId: 'e2',
      confidence: 'Medium' as Confidence,
      factSetIds: ['fs2']
    });

    const result = resolver.resolve({ maxIterations: 5 });

    expect(result.converged).toBe(false); // Oscillation prevents convergence
    expect(result.iterations).toBe(5); // Hit max iterations
  });
});
```

**Implementation:**

```typescript
// src/reasoning/ambiguity-resolver.ts (continued)
export class AmbiguityResolver {
  private confidenceHistory: Map<string, Confidence[]> = new Map();

  resolve(options: ResolutionOptions = {}): ResolutionResult {
    const maxIter = options.maxIterations ?? 10;
    const enablePromotion = options.enableCrossRefPromotion ?? true;

    this.confidenceHistory.clear();
    let iterations = 0;
    let promoted = 0;

    for (let i = 0; i < maxIter; i++) {
      iterations++;
      this.snapshotConfidences();

      const changedCount = this.runPromotionPass(enablePromotion);
      promoted += changedCount;

      if (changedCount === 0) {
        return {
          converged: true,
          iterations,
          promoted,
          openQuestions: this.generateOpenQuestions()
        };
      }

      if (this.detectOscillation()) {
        // Force convergence by stopping iteration
        break;
      }
    }

    return {
      converged: false,
      iterations,
      promoted,
      openQuestions: this.generateOpenQuestions()
    };
  }

  private snapshotConfidences(): void {
    const chunks = this.kb.getAllChunks();
    for (const chunk of chunks) {
      if (!this.confidenceHistory.has(chunk.id)) {
        this.confidenceHistory.set(chunk.id, []);
      }
      this.confidenceHistory.get(chunk.id)!.push(chunk.confidence);
    }
  }

  private detectOscillation(): boolean {
    // Check if any chunk has oscillated between two values
    for (const [chunkId, history] of this.confidenceHistory) {
      if (history.length < 3) continue;

      const last3 = history.slice(-3);
      if (last3[0] === last3[2] && last3[0] !== last3[1]) {
        // Pattern: A → B → A (oscillation)
        return true;
      }
    }
    return false;
  }
}
```

---

### **Day 2 Morning: Open Question (QID) Generation**

#### Test 4: Generate QIDs for Low Confidence Items

```typescript
describe('AmbiguityResolver - QID Generation', () => {
  it('should generate QIDs for Low confidence chunks', () => {
    const kb = new KnowledgeBase();
    const resolver = new AmbiguityResolver(kb);

    kb.insertEntity({ id: 'e1', kind: 'function', name: 'foo', path: 'a.ts' });
    kb.insertFactSet({ id: 'fs1', facts: [{ subjectId: 'e1', predicate: 'hasBody', objectId: 'true' }] });
    kb.insertChunk({
      id: 'bc1',
      targetEntityId: 'e1',
      textDraft: 'Unclear logic',
      confidence: 'Low' as Confidence,
      factSetIds: ['fs1']
    });

    const result = resolver.resolve();

    expect(result.openQuestions).toHaveLength(1);
    expect(result.openQuestions[0].qid).toMatch(/^Q-function-\d+$/);
    expect(result.openQuestions[0].entityId).toBe('e1');
    expect(result.openQuestions[0].question).toContain('foo');
  });

  it('should not generate QIDs for Medium/High confidence', () => {
    const kb = new KnowledgeBase();
    const resolver = new AmbiguityResolver(kb);

    kb.insertEntity({ id: 'e1', kind: 'function', name: 'bar', path: 'b.ts' });
    kb.insertChunk({
      id: 'bc1',
      targetEntityId: 'e1',
      confidence: 'High' as Confidence,
      factSetIds: ['fs1']
    });

    const result = resolver.resolve();

    expect(result.openQuestions).toHaveLength(0);
  });
});
```

**Implementation:**

```typescript
// src/reasoning/ambiguity-resolver.ts (continued)
private generateOpenQuestions(): OpenQuestion[] {
  const chunks = this.kb.getAllChunks();
  const openQuestions: OpenQuestion[] = [];

  for (const chunk of chunks) {
    if (chunk.confidence !== 'Low') continue;

    const entity = this.kb.getEntity(chunk.targetEntityId);
    if (!entity) continue;

    // allocateQID requires: filePath, entityKey (name), ambiguityKind
    const qid = this.kb.allocateQID(entity.path, entity.name, 'behavior');
    const question = this.generateQuestionText(entity, chunk);

    openQuestions.push({
      qid,
      entityId: entity.id,
      question,
      confidence: this.kb.getConfidenceScore(chunk.factSetIds),
      factSetIds: chunk.factSetIds
    });
  }

  return openQuestions;
}

private generateQuestionText(entity: Entity, chunk: BehaviorChunk): string {
  switch (entity.kind) {
    case 'function':
      return `What is the purpose and behavior of function \`${entity.name}\` at ${entity.path}?`;
    case 'class':
      return `What are the responsibilities and contract of class \`${entity.name}\` at ${entity.path}?`;
    case 'module':
      return `What is the role and exported interface of module \`${entity.name}\` at ${entity.path}?`;
    default:
      return `What is the purpose of ${entity.kind} \`${entity.name}\` at ${entity.path}?`;
  }
}
```

---

#### Test 5: Store Open Questions in KB

```typescript
describe('AmbiguityResolver - QID Storage', () => {
  it('should store open questions in KB', () => {
    const kb = new KnowledgeBase();
    const resolver = new AmbiguityResolver(kb);

    kb.insertEntity({ id: 'e1', kind: 'function', name: 'mystery', path: 'x.ts' });
    kb.insertChunk({
      id: 'bc1',
      targetEntityId: 'e1',
      confidence: 'Low' as Confidence,
      factSetIds: ['fs1']
    });

    resolver.resolve();

    const questions = kb.getOpenQuestionsByEntity('e1');
    expect(questions).toHaveLength(1);
    expect(questions[0].qid).toMatch(/^Q-function-\d+$/);
  });
});
```

**Implementation:**

**Note:** Uses KB extensions documented in "KB Interface Extensions (Prerequisites)" section.

```typescript
// src/reasoning/ambiguity-resolver.ts (continued)
private generateOpenQuestions(): OpenQuestion[] {
  const chunks = this.kb.getAllChunks();
  const openQuestions: OpenQuestion[] = [];

  for (const chunk of chunks) {
    if (chunk.confidence !== 'Low') continue;

    const entity = this.kb.getEntity(chunk.targetEntityId);
    if (!entity) continue;

    // allocateQID requires: filePath, entityKey (name), ambiguityKind
    const qid = this.kb.allocateQID(entity.path, entity.name, 'behavior');
    const question = this.generateQuestionText(entity, chunk);

    const oq: OpenQuestion = {
      qid,
      entityId: entity.id,
      question,
      confidence: this.kb.getConfidenceScore(chunk.factSetIds),
      factSetIds: chunk.factSetIds
    };

    openQuestions.push(oq);
    this.kb.insertOpenQuestion(oq); // Store in KB
  }

  return openQuestions;
}
```

---

### **Day 2 Afternoon: Ambiguity Queue Management**

#### Test 6: Track Unresolved Items in Ambiguity Queue

```typescript
describe('AmbiguityResolver - Ambiguity Queue', () => {
  it('should maintain queue of unresolved items', () => {
    const kb = new KnowledgeBase();
    const resolver = new AmbiguityResolver(kb);

    // 3 entities: 1 Low, 1 Medium, 1 High
    kb.insertEntity({ id: 'e1', kind: 'function', name: 'low', path: 'l.ts' });
    kb.insertEntity({ id: 'e2', kind: 'function', name: 'med', path: 'm.ts' });
    kb.insertEntity({ id: 'e3', kind: 'function', name: 'high', path: 'h.ts' });

    kb.insertChunk({
      id: 'bc1',
      targetEntityId: 'e1',
      confidence: 'Low' as Confidence,
      factSetIds: ['fs1']
    });
    kb.insertChunk({
      id: 'bc2',
      targetEntityId: 'e2',
      confidence: 'Medium' as Confidence,
      factSetIds: ['fs2']
    });
    kb.insertChunk({
      id: 'bc3',
      targetEntityId: 'e3',
      confidence: 'High' as Confidence,
      factSetIds: ['fs3']
    });

    resolver.resolve();

    const queue = resolver.getAmbiguityQueue();

    expect(queue).toHaveLength(1); // Only Low confidence
    expect(queue[0].entityId).toBe('e1');
  });
});
```

**Implementation:**

```typescript
// src/reasoning/ambiguity-resolver.ts (continued)
export interface AmbiguityItem {
  entityId: string;
  confidence: Confidence;
  chunkId: string;
  qid?: string;
}

export class AmbiguityResolver {
  private ambiguityQueue: AmbiguityItem[] = [];

  resolve(options: ResolutionOptions = {}): ResolutionResult {
    // ... (existing resolve logic)

    // After resolution loop, build ambiguity queue
    this.buildAmbiguityQueue();

    return {
      converged: /* ... */,
      iterations,
      promoted,
      openQuestions: this.generateOpenQuestions()
    };
  }

  private buildAmbiguityQueue(): void {
    this.ambiguityQueue = [];
    const chunks = this.kb.getAllChunks();

    for (const chunk of chunks) {
      if (chunk.confidence === 'Low') {
        // Find associated QID
        const questions = this.kb.getOpenQuestionsByEntity(chunk.targetEntityId);
        const qid = questions.find(q => q.factSetIds[0] === chunk.factSetIds[0])?.qid;

        this.ambiguityQueue.push({
          entityId: chunk.targetEntityId,
          confidence: chunk.confidence,
          chunkId: chunk.id,
          qid
        });
      }
    }
  }

  getAmbiguityQueue(): AmbiguityItem[] {
    return [...this.ambiguityQueue]; // Return copy
  }
}
```

---

## KB Interface Extensions (Prerequisites)

**IMPORTANT:** Step 4 requires additional KB methods beyond Phase 2's API. Agent 1 must implement these extensions before Agent 2 begins Step 4 implementation.

### Phase 2 Existing Methods (for reference)
```typescript
// Already available in Phase 2 KB:
insertChunk(chunk: BehaviorChunk): void;
getChunk(id: string): BehaviorChunk | undefined;
allocateQID(filePath: string, entityKey: string, ambiguityKind: string): string;
scoreConfidence(factSetIds: string[]): Confidence;
getConfidenceScore(factSetIds: string[]): number;
scoreToConfidenceBand(score: number): Confidence;
```

### Required KB Extensions for Step 4

**Add to `src/kb/knowledge-base.ts`:**

```typescript
export class KnowledgeBase {
  // Existing Phase 2 methods...

  // -------- BehaviorChunk Extensions (Step 4) --------

  /**
   * Returns all behavior chunks in the KB.
   * Used by AmbiguityResolver to iterate over chunks during resolution.
   */
  getAllChunks(): BehaviorChunk[] {
    const state = this.getActiveState();
    return Array.from(state.chunks.values());
  }

  /**
   * Returns all behavior chunks associated with a given entity.
   * Used for cross-reference analysis (finding chunks for callees).
   */
  getChunksByEntity(entityId: string): BehaviorChunk[] {
    const state = this.getActiveState();
    return Array.from(state.chunks.values())
      .filter(chunk => chunk.targetEntityId === entityId);
  }

  /**
   * Updates a behavior chunk with partial updates (e.g., confidence promotion).
   * Used by AmbiguityResolver to promote chunk confidence during iteration.
   */
  updateChunk(id: string, updates: Partial<BehaviorChunk>): void {
    const state = this.getActiveState();
    const existing = state.chunks.get(id);
    if (!existing) {
      throw new Error(`Chunk ${id} not found`);
    }
    state.chunks.set(id, { ...existing, ...updates });
  }

  // -------- OpenQuestion Storage (Step 4) --------

  /**
   * Inserts an open question (QID) into the KB.
   * Used by AmbiguityResolver to store generated QIDs for Low confidence items.
   */
  insertOpenQuestion(oq: OpenQuestion): void {
    const state = this.getActiveState();
    if (!state.openQuestions) {
      state.openQuestions = new Map();
    }
    state.openQuestions.set(oq.qid, oq);
  }

  /**
   * Returns all open questions associated with a given entity.
   * Used by AmbiguityResolver to build ambiguity queue.
   */
  getOpenQuestionsByEntity(entityId: string): OpenQuestion[] {
    const state = this.getActiveState();
    if (!state.openQuestions) return [];
    return Array.from(state.openQuestions.values())
      .filter(oq => oq.entityId === entityId);
  }

  /**
   * Returns all open questions in the KB.
   * Used by Spec Generator to emit QID sections.
   */
  getAllOpenQuestions(): OpenQuestion[] {
    const state = this.getActiveState();
    if (!state.openQuestions) return [];
    return Array.from(state.openQuestions.values());
  }
}
```

### KnowledgeBaseState Extension

**Update `src/kb/models.ts` to add `openQuestions` to state:**

```typescript
export interface KnowledgeBaseState {
  entities: Map<string, Entity>;
  factSets: Map<string, FactSet>;
  chunks: Map<string, BehaviorChunk>;
  relations: Relation[];
  openQuestions?: Map<string, OpenQuestion>; // NEW for Step 4

  // Indices
  byKind: Map<EntityKind, Set<string>>;
  byPath: Map<string, Set<string>>;
  exported: Set<string>;

  // QID counter
  qidCounters: Map<string, number>;
}
```

### Test Coverage for KB Extensions

**Add to `tests/unit/kb/knowledge-base.test.ts`:**

```typescript
describe('KnowledgeBase - BehaviorChunk Extensions', () => {
  it('should return all chunks via getAllChunks', () => {
    const kb = new KnowledgeBase();
    kb.insertChunk({ id: 'c1', targetEntityId: 'e1', textDraft: 'text', confidence: 'High', factSetIds: [] });
    kb.insertChunk({ id: 'c2', targetEntityId: 'e2', textDraft: 'text', confidence: 'Low', factSetIds: [] });

    const chunks = kb.getAllChunks();
    expect(chunks).toHaveLength(2);
  });

  it('should filter chunks by entity via getChunksByEntity', () => {
    const kb = new KnowledgeBase();
    kb.insertChunk({ id: 'c1', targetEntityId: 'e1', textDraft: 'text', confidence: 'High', factSetIds: [] });
    kb.insertChunk({ id: 'c2', targetEntityId: 'e1', textDraft: 'text2', confidence: 'Medium', factSetIds: [] });
    kb.insertChunk({ id: 'c3', targetEntityId: 'e2', textDraft: 'text3', confidence: 'Low', factSetIds: [] });

    const e1Chunks = kb.getChunksByEntity('e1');
    expect(e1Chunks).toHaveLength(2);
  });

  it('should update chunk confidence via updateChunk', () => {
    const kb = new KnowledgeBase();
    kb.insertChunk({ id: 'c1', targetEntityId: 'e1', textDraft: 'text', confidence: 'Medium', factSetIds: [] });

    kb.updateChunk('c1', { confidence: 'High' });

    const updated = kb.getChunk('c1');
    expect(updated?.confidence).toBe('High');
  });
});

describe('KnowledgeBase - OpenQuestion Storage', () => {
  it('should store and retrieve open questions', () => {
    const kb = new KnowledgeBase();
    const oq: OpenQuestion = {
      qid: 'Q-function-1',
      entityId: 'e1',
      question: 'What does this do?',
      confidence: 25,
      factSetIds: ['fs1']
    };

    kb.insertOpenQuestion(oq);

    const retrieved = kb.getOpenQuestionsByEntity('e1');
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].qid).toBe('Q-function-1');
  });

  it('should return all open questions via getAllOpenQuestions', () => {
    const kb = new KnowledgeBase();
    kb.insertOpenQuestion({ qid: 'Q-function-1', entityId: 'e1', question: '?', confidence: 20, factSetIds: [] });
    kb.insertOpenQuestion({ qid: 'Q-class-1', entityId: 'e2', question: '?', confidence: 30, factSetIds: [] });

    const all = kb.getAllOpenQuestions();
    expect(all).toHaveLength(2);
  });
});
```

**NOTE:** Implement and test these KB extensions BEFORE writing Step 4 AmbiguityResolver tests.

**OpenQuestion Model** (add to `src/kb/models.ts`):

```typescript
export interface OpenQuestion {
  qid: string;              // Format: Q-<entity-kind>-<counter>
  entityId: string;
  question: string;
  confidence: number;       // Original score before band conversion
  factSetIds: string[];
  createdAt?: Date;
}
```

---

## Test Coverage Targets

- **Convergence detection:** 3 tests (immediate, after 2 iterations, max iterations)
- **Cross-reference promotion:** 4 tests (via calls, via imports, threshold logic, no promotion)
- **Oscillation detection:** 2 tests (circular deps, long chains)
- **QID generation:** 5 tests (Low → QID, Medium/High → no QID, QID format, all entity kinds, storage)
- **Ambiguity queue:** 3 tests (queue building, filtering, ordering)

**Total:** ~17 tests, targeting ≥80% branch coverage

---

## Integration Points

### Inputs
- **From STEP3:** IntentLifter produces BehaviorChunks with initial confidence
- **From STEP1:** getCallGraph(), getImportGraph(), getReverseDeps() for cross-ref analysis

### Outputs
- **To STEP6:** Ambiguity queue for cross-link validation
- **To STEP8:** OpenQuestion list for final spec generation
- **To KB:** Updated BehaviorChunks with promoted confidence, stored OpenQuestions

---

## Explicit Deferrals

**NOT in Phase 3:**
1. **LLM-assisted resolution:** Phase 6 (CTS-06 §5)
2. **Multi-iteration promotion rules:** Phase 6 (complex heuristics)
3. **User-provided answers ingestion:** Phase 5 (Finalization Engine, CTS-04)

**In Phase 3:**
1. Single-pass cross-reference promotion (2+ High dependencies → promote Medium)
2. Basic oscillation detection (A → B → A pattern)
3. QID generation for Low confidence only
4. Ambiguity queue tracking for downstream validation

---

## Completion Criteria

**STEP4 is complete when:**

1. ✅ All 17 tests passing
2. ✅ `AmbiguityResolver.resolve()` implements iterative loop with convergence detection
3. ✅ Cross-reference promotion works for 2+ High dependencies
4. ✅ Oscillation detection prevents infinite loops
5. ✅ QIDs generated for all Low confidence chunks
6. ✅ Open questions stored in KB via `insertOpenQuestion()`
7. ✅ Ambiguity queue exposed via `getAmbiguityQueue()`
8. ✅ KB interface contract updated with new methods
9. ✅ ≥80% branch coverage maintained
10. ✅ Integration tests pass: IntentLifter → AmbiguityResolver → QID generation

---

## Next Steps

**After STEP4 completion:**
- ✅ Proceed to **STEP5** (Framework Pattern Rules for Express & React)
- ✅ Agent 2 completes both STEP4 and STEP5 before handoff to Agent 3

**Dependencies resolved:**
- STEP3 (Reasoning Foundation) provides IntentLifter
- STEP1 (Graph Indices) provides graph queries
- STEP2 (Confidence Scoring) provides scoring algorithm

---

## Critical Success Factors

1. **Convergence must be reliable:** Avoid infinite loops via max iterations and oscillation detection
2. **QID format must be stable:** Once allocated, QIDs persist through finalization (Phase 5)
3. **Cross-reference logic must be deterministic:** Same input → same promotion decisions
4. **No premature QID generation:** Only emit QIDs after all promotion attempts exhausted

---

## API Alignment Summary

**All Step 4 code has been updated to align with Phase 2/Step 2 frozen APIs:**

### Confidence Scoring
- ✅ Replaced `kb.computeConfidence(factSetIds)` → `kb.getConfidenceScore(factSetIds)`
- ✅ Replaced `kb.getConfidenceBand(score)` → `kb.scoreToConfidenceBand(score)`
- ✅ Primary API: `kb.scoreConfidence(factSetIds)` returns Confidence band directly (when band needed without numeric score)

### BehaviorChunk Operations
- ✅ Uses Phase 2 existing: `kb.insertChunk()`, `kb.getChunk()`
- ✅ Added KB extensions: `kb.getAllChunks()`, `kb.getChunksByEntity()`, `kb.updateChunk()`
- ✅ All tests use correct method names

### QID Allocation
- ✅ Uses correct signature: `kb.allocateQID(entity.path, entity.name, 'behavior')`
- ✅ NOT the incorrect: `kb.allocateQID(entity.kind)` (which doesn't match frozen API)

### OpenQuestion Storage
- ✅ Added KB extensions: `kb.insertOpenQuestion()`, `kb.getOpenQuestionsByEntity()`, `kb.getAllOpenQuestions()`
- ✅ Added `openQuestions` map to `KnowledgeBaseState`
- ✅ Includes full test coverage for KB extensions

**Agent 1 must implement KB extensions BEFORE Agent 2 begins Step 4 implementation.**

---

**End of STEP4**
