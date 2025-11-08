# IMPLEMENTATION_PLAN_PHASE3_STEP6.md

**Phase 3, Step 6 — Two-Phase Cross-Link Validation**

**Agent:** WS-E+WS-H (Agent 3 — Cross-Link Validation & Phase Coordination)
**Depends on:** STEP1 (Graph Indices), STEP4 (Ambiguity Queue)
**Estimated Duration:** ~1 agent-day
**TDD:** Phase -1 → Red → Green → Refactor

---

## Phase -1: Upstream Data Analysis (MANDATORY - Complete Before Tests)

**Critical:** Reference `PHASE3_PROCESS_IMPROVEMENTS.md`. Parallel with Agent 1/2 work.

### Quick Checklist
- [ ] Read Phase 2 Spec Generator: How are anchors generated? Format?
- [ ] Read `src/generator/spec-generator.ts`: Anchor format (e.g., `#my-function-abc12345`)
- [ ] Test: Generate spec, extract all anchor links
- [ ] Document anchor format: `#${entityName}-${entityId.slice(0,8)}`
- [ ] Validate: Can we reliably extract entity ID from anchor?

**Key validation:** Run Spec Generator on sample code to see actual anchor format before designing validation logic.

**Integration test to run:**
```typescript
// Phase -1: See actual anchor format
const spec = generator.generate(kb);
console.log('Sample anchors:', spec.match(/#[a-z-]+[0-9A-Za-z]{8}/g));
console.log('Cross-links:', spec.match(/\[.*?\]\(#.*?\)/g));
```

---

## Objective

Implement **two-phase cross-link validation** for spec generation:
1. **Pre-generation validation:** Check anchor completeness (all public entities have BehaviorChunks or QIDs)
2. **Post-generation validation:** Check all cross-references resolve to valid anchors

This step ensures **no broken links** in generated specs and **100% coverage** of public API surface (SADS.md §10, Quality Gates).

---

## Key Design Principles

- **Validation before generation:** Catch missing entities early (fail fast)
- **Validation after generation:** Catch broken links in markdown output
- **Anchor stability:** Entity IDs map to stable markdown anchors
- **Coverage gate enforcement:** All exported entities must be documented or carry QIDs

---

## Data Model (Corrected Field Names)

```typescript
// Anchor Mapping
// NOTE: Phase 2 MarkdownRenderer emits <a id="${entity.id}"></a> anchors
// Therefore, anchorText uses entity.id, NOT entity.name
interface Anchor {
  entityId: string;        // Entity ID from KB (primary key)
  anchorText: string;      // Markdown anchor: #entity-id (e.g., #e1)
  filePath: string;        // spec.md file containing this anchor
}

// Validation Result
interface ValidationResult {
  passed: boolean;
  coverage: number;        // Percentage of public entities covered
  missingEntities: string[]; // Entity IDs without BehaviorChunk or QID
  brokenLinks: BrokenLink[];
}

interface BrokenLink {
  sourceFile: string;
  targetAnchor: string;
  lineNumber: number;
}
```

---

## TDD Implementation Steps

### **Day 1 Morning: Pre-Generation Validation (Coverage Gate)**

#### Test 1: Detect Missing BehaviorChunks for Exported Entities

```typescript
// src/validation/__tests__/cross-link-validator.test.ts
describe('CrossLinkValidator - Pre-Generation', () => {
  it('should fail when exported entity lacks BehaviorChunk', () => {
    const kb = new KnowledgeBase();
    const validator = new CrossLinkValidator(kb);

    // Exported entity without BehaviorChunk
    kb.insertEntity({ id: 'e1', kind: 'function', name: 'foo', path: 'a.ts', exported: true });

    const result = validator.validatePreGeneration();

    expect(result.passed).toBe(false);
    expect(result.missingEntities).toContain('e1');
    expect(result.coverage).toBe(0); // 0 of 1 exported entities covered
  });

  it('should pass when all exported entities have BehaviorChunks', () => {
    const kb = new KnowledgeBase();
    const validator = new CrossLinkValidator(kb);

    kb.insertEntity({ id: 'e1', kind: 'function', name: 'foo', path: 'a.ts', exported: true });
    kb.insertChunk({
      id: 'bc1',
      targetEntityId: 'e1',
      textDraft: 'Does foo logic.',
      confidence: 'High' as Confidence,
      factSetIds: ['fs1']
    });

    const result = validator.validatePreGeneration();

    expect(result.passed).toBe(true);
    expect(result.coverage).toBe(100);
    expect(result.missingEntities).toHaveLength(0);
  });
});
```

**Implementation:**

```typescript
// src/validation/cross-link-validator.ts
import { KnowledgeBase } from '../kb/knowledge-base';
import { Entity, BehaviorChunk, OpenQuestion } from '../kb/models';

export interface ValidationResult {
  passed: boolean;
  coverage: number;
  missingEntities: string[];
  brokenLinks: BrokenLink[];
}

export interface BrokenLink {
  sourceFile: string;
  targetAnchor: string;
  lineNumber: number;
}

export class CrossLinkValidator {
  constructor(private kb: KnowledgeBase) {}

  validatePreGeneration(): ValidationResult {
    const exportedEntities = this.kb.getAllEntities().filter(e => e.exported);
    const missingEntities: string[] = [];

    for (const entity of exportedEntities) {
      const hasChunk = this.kb.getChunksByEntity(entity.id).length > 0;
      const hasQID = this.kb.getOpenQuestionsByEntity(entity.id).length > 0;

      if (!hasChunk && !hasQID) {
        missingEntities.push(entity.id);
      }
    }

    const coverage = exportedEntities.length > 0
      ? ((exportedEntities.length - missingEntities.length) / exportedEntities.length) * 100
      : 100;

    return {
      passed: missingEntities.length === 0,
      coverage,
      missingEntities,
      brokenLinks: []
    };
  }
}
```

---

#### Test 2: Allow QIDs as Coverage (Open Questions Count as Documented)

```typescript
describe('CrossLinkValidator - QID Coverage', () => {
  it('should pass when exported entity has QID (Low confidence)', () => {
    const kb = new KnowledgeBase();
    const validator = new CrossLinkValidator(kb);

    kb.insertEntity({ id: 'e1', kind: 'function', name: 'mystery', path: 'x.ts', exported: true });

    // Low confidence chunk → QID generated
    kb.insertChunk({
      id: 'bc1',
      targetEntityId: 'e1',
      confidence: 'Low' as Confidence,
      factSetIds: ['fs1']
    });
    kb.insertOpenQuestion({
      qid: 'Q-function-1',
      entityId: 'e1',
      question: 'What does mystery do?',
      confidence: 30,
      factSetIds: ['fs1']
    });

    const result = validator.validatePreGeneration();

    expect(result.passed).toBe(true); // QID counts as coverage
    expect(result.coverage).toBe(100);
  });
});
```

---

#### Test 3: Calculate Coverage Percentage

```typescript
describe('CrossLinkValidator - Coverage Calculation', () => {
  it('should calculate coverage correctly for mixed entities', () => {
    const kb = new KnowledgeBase();
    const validator = new CrossLinkValidator(kb);

    // 3 exported entities: 2 with chunks, 1 without
    kb.insertEntity({ id: 'e1', kind: 'function', name: 'f1', path: 'a.ts', exported: true });
    kb.insertEntity({ id: 'e2', kind: 'function', name: 'f2', path: 'b.ts', exported: true });
    kb.insertEntity({ id: 'e3', kind: 'function', name: 'f3', path: 'c.ts', exported: true });

    kb.insertChunk({
      id: 'bc1',
      targetEntityId: 'e1',
      confidence: 'High' as Confidence,
      factSetIds: ['fs1']
    });
    kb.insertChunk({
      id: 'bc2',
      targetEntityId: 'e2',
      confidence: 'Medium' as Confidence,
      factSetIds: ['fs2']
    });
    // e3 has no chunk or QID

    const result = validator.validatePreGeneration();

    expect(result.passed).toBe(false);
    expect(result.coverage).toBeCloseTo(66.67, 1); // 2 of 3
    expect(result.missingEntities).toEqual(['e3']);
  });
});
```

---

### **Day 1 Afternoon: Post-Generation Validation (Anchor Resolution)**

#### Test 4: Build Anchor Map from Generated Specs

```typescript
describe('CrossLinkValidator - Anchor Map', () => {
  it('should build anchor map from markdown files', () => {
    const kb = new KnowledgeBase();
    const validator = new CrossLinkValidator(kb);

    // Mock generated spec files (matching Phase 2 MarkdownRenderer output)
    const specFiles = [
      {
        path: 'src/spec.md',
        content: `
# Functions

<a id="e1"></a>

### foo

Does foo logic.

<a id="e2"></a>

### bar

Does bar logic.
`
      }
    ];

    const anchorMap = validator.buildAnchorMap(specFiles);

    // Keyed by entity.id (not name)
    expect(anchorMap.has('e1')).toBe(true);
    expect(anchorMap.get('e1')!.entityId).toBe('e1');
    expect(anchorMap.get('e1')!.anchorText).toBe('#e1');
    expect(anchorMap.get('e1')!.filePath).toBe('src/spec.md');
    expect(anchorMap.has('e2')).toBe(true);
  });
});
```

**Implementation:**

```typescript
// src/validation/cross-link-validator.ts (continued)
export interface SpecFile {
  path: string;
  content: string;
}

export interface Anchor {
  entityId: string;
  anchorText: string;
  filePath: string;
}

export class CrossLinkValidator {
  // ... (existing methods)

  buildAnchorMap(specFiles: SpecFile[]): Map<string, Anchor> {
    const anchorMap = new Map<string, Anchor>();

    for (const file of specFiles) {
      const lines = file.content.split('\n');
      for (const line of lines) {
        // Match HTML anchor tags emitted by Phase 2 MarkdownRenderer: <a id="entity-id"></a>
        const match = line.match(/<a id="([^"]+)"><\/a>/);
        if (match) {
          const entityId = match[1];
          const anchorText = `#${entityId}`;

          anchorMap.set(entityId, {
            entityId,
            anchorText,
            filePath: file.path
          });
        }
      }
    }

    return anchorMap;
  }
}
```

---

#### Test 5: Detect Broken Cross-References

```typescript
describe('CrossLinkValidator - Broken Links', () => {
  it('should detect broken cross-reference links', () => {
    const kb = new KnowledgeBase();
    const validator = new CrossLinkValidator(kb);

    const specFiles = [
      {
        path: 'src/spec.md',
        content: `
<a id="e1"></a>

### foo

Calls [bar](#e2).

Calls [missing](#e-missing).
`
      }
    ];

    const anchorMap = new Map<string, Anchor>([
      ['e2', { entityId: 'e2', anchorText: '#e2', filePath: 'src/spec.md' }]
      // 'e-missing' is not in anchor map
    ]);

    const result = validator.validatePostGeneration(specFiles, anchorMap);

    expect(result.passed).toBe(false);
    expect(result.brokenLinks).toHaveLength(1);
    expect(result.brokenLinks[0].targetAnchor).toBe('#e-missing');
    expect(result.brokenLinks[0].sourceFile).toBe('src/spec.md');
  });

  it('should pass when all cross-references resolve', () => {
    const kb = new KnowledgeBase();
    const validator = new CrossLinkValidator(kb);

    const specFiles = [
      {
        path: 'src/spec.md',
        content: `
<a id="e1"></a>

### foo

Calls [bar](#e2).
`
      }
    ];

    const anchorMap = new Map<string, Anchor>([
      ['e2', { entityId: 'e2', anchorText: '#e2', filePath: 'src/spec.md' }]
    ]);

    const result = validator.validatePostGeneration(specFiles, anchorMap);

    expect(result.passed).toBe(true);
    expect(result.brokenLinks).toHaveLength(0);
  });
});
```

**Implementation:**

```typescript
// src/validation/cross-link-validator.ts (continued)
validatePostGeneration(specFiles: SpecFile[], anchorMap: Map<string, Anchor>): ValidationResult {
  const brokenLinks: BrokenLink[] = [];

  for (const file of specFiles) {
    const lines = file.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match markdown links: [text](#anchor)
      const linkRegex = /\[([^\]]+)\]\(#([^)]+)\)/g;
      let match;

      while ((match = linkRegex.exec(line)) !== null) {
        const targetAnchor = `#${match[2]}`;
        const targetEntityId = match[2]; // Anchor targets entity.id, not entity.name

        // Check if the entity ID exists in the anchor map
        if (!anchorMap.has(targetEntityId)) {
          brokenLinks.push({
            sourceFile: file.path,
            targetAnchor,
            lineNumber: i + 1
          });
        }
      }
    }
  }

  return {
    passed: brokenLinks.length === 0,
    coverage: 100, // Post-generation coverage check deferred to pre-generation
    missingEntities: [],
    brokenLinks
  };
}
```

---

### **Day 1 Evening: Integration with Spec Generator**

#### Test 6: End-to-End Validation Flow

```typescript
// src/validation/__tests__/cross-link-validator-integration.test.ts
describe('CrossLinkValidator - E2E Integration', () => {
  it('should validate full pipeline: KB → Spec → Validation', () => {
    const kb = new KnowledgeBase();
    const generator = new SpecGenerator(kb);
    const validator = new CrossLinkValidator(kb);

    // Setup: 2 functions, f1 calls f2
    kb.insertEntity({ id: 'e1', kind: 'function', name: 'f1', path: 'src/a.ts', exported: true });
    kb.insertEntity({ id: 'e2', kind: 'function', name: 'f2', path: 'src/a.ts', exported: true });
    kb.insertRelation({
      subjectId: 'e1',
      predicate: 'calls',
      objectId: 'e2',
      details: { resolved: true }
    });

    kb.insertChunk({
      id: 'bc1',
      targetEntityId: 'e1',
      textDraft: 'Calls f2 for processing.',
      confidence: 'High' as Confidence,
      factSetIds: ['fs1']
    });
    kb.insertChunk({
      id: 'bc2',
      targetEntityId: 'e2',
      textDraft: 'Processes data.',
      confidence: 'High' as Confidence,
      factSetIds: ['fs2']
    });

    // Pre-generation validation
    const preResult = validator.validatePreGeneration();
    expect(preResult.passed).toBe(true);
    expect(preResult.coverage).toBe(100);

    // Generate specs using actual Phase 2 API
    const projectRoot = '/test/project';
    const specsMap = generator.generateDirectorySpecs(projectRoot);

    // Convert Record<string,string> to SpecFile[]
    const specFiles = Object.entries(specsMap).map(([path, content]) => ({
      path,
      content
    }));

    // Post-generation validation
    const anchorMap = validator.buildAnchorMap(specFiles);
    const postResult = validator.validatePostGeneration(specFiles, anchorMap);

    expect(postResult.passed).toBe(true);
    expect(postResult.brokenLinks).toHaveLength(0);
  });
});
```

---

## Interface Contract Updates (Day 1)

**CrossLinkValidator API** (add to `src/validation/cross-link-validator.ts`):

```typescript
export class CrossLinkValidator {
  constructor(private kb: KnowledgeBase);

  // Pre-generation: Check coverage of exported entities
  validatePreGeneration(): ValidationResult;

  // Post-generation: Check anchor resolution
  validatePostGeneration(specFiles: SpecFile[], anchorMap: Map<string, Anchor>): ValidationResult;

  // Helper: Build anchor map from generated specs
  buildAnchorMap(specFiles: SpecFile[]): Map<string, Anchor>;
}
```

**New Types** (add to `src/validation/types.ts`):

```typescript
export interface ValidationResult {
  passed: boolean;
  coverage: number;
  missingEntities: string[];
  brokenLinks: BrokenLink[];
}

export interface BrokenLink {
  sourceFile: string;
  targetAnchor: string;
  lineNumber: number;
}

export interface SpecFile {
  path: string;
  content: string;
}

export interface Anchor {
  entityId: string;
  anchorText: string;
  filePath: string;
}
```

---

## Test Coverage Targets

- **Pre-generation validation:** 5 tests (missing entities, QID coverage, coverage calculation, multiple files, edge cases)
- **Anchor map building:** 3 tests (basic, nested sections, edge cases)
- **Post-generation validation:** 4 tests (broken links, all valid, line numbers, multiple files)
- **E2E integration:** 2 tests (full pipeline, error handling)

**Total:** ~14 tests, targeting ≥80% branch coverage

---

## Integration Points

### Inputs
- **From STEP1:** Graph indices (for cross-reference tracing)
- **From STEP4:** Ambiguity queue (entities with QIDs)
- **From Phase 2 Generator:** Spec content as string

### Outputs
- **To STEP7:** Validation results trigger re-generation or error reporting
- **To STEP8:** Validation included in integration tests
- **To Orchestrator:** Validation gates control pipeline progression

---

## Explicit Deferrals

**NOT in Phase 3:**
1. **Cross-file link validation:** Specs in different directories (Phase 4)
2. **External link validation:** URLs to docs, GitHub (Phase 6)
3. **Anchor normalization:** Handling special characters in entity names (Phase 6)
4. **Incremental validation:** Only validate changed files (Phase 6)

**In Phase 3:**
1. Pre-generation coverage gate (100% exported entities)
2. Post-generation anchor resolution (single directory)
3. Basic markdown link parsing (`[text](#anchor)`)

---

## Completion Criteria

**STEP6 is complete when:**

1. ✅ All 14 tests passing
2. ✅ `validatePreGeneration()` checks coverage of exported entities
3. ✅ `validatePostGeneration()` detects broken links in markdown
4. ✅ `buildAnchorMap()` extracts anchors from generated specs
5. ✅ QIDs count as valid coverage (Low confidence entities)
6. ✅ Validation errors include file paths and line numbers
7. ✅ ≥80% branch coverage maintained
8. ✅ E2E integration test: KB → Generator → Validator → Pass
9. ✅ E2E integration test: KB with missing entity → Validator → Fail

---

## Next Steps

**After STEP6 completion:**
- ✅ Proceed to **STEP7** (Phase Coordination in Orchestrator)
- ✅ Agent 3 completes both STEP6 and STEP7 before handoff

**Dependencies resolved:**
- STEP1 provides graph indices for tracing
- STEP4 provides Open Questions for coverage check
- Phase 2 Generator provides spec content

---

## Critical Success Factors

1. **Coverage gate must be enforced:** No generation if validation fails (configurable in Phase 6)
2. **Anchor format must match generator output:** CrossLinkValidator must parse `<a id="${entity.id}"></a>` tags emitted by Phase 2 MarkdownRenderer. Anchors are keyed by entity.id (NOT entity.name) to ensure uniqueness.
3. **Validation must be fast:** Target <1s for 1000 entities (critical for large repos)
4. **Error messages must be actionable:** Include file paths, line numbers, entity IDs

---

**End of STEP6**
