# Phase 3 - Step 1: KB Graph Indices

**Owner:** Agent 1 (WS-A)
**Depends on:** Step 0 (relation resolution)
**Blocks:** Step 2 (confidence scoring needs reverseDeps)
**TDD:** Phase -1 → Red → Green → Refactor

---

## Phase -1: Upstream Data Analysis (MANDATORY - Complete Before Tests)

**Critical:** Based on Step 0 lessons learned, we MUST analyze actual data structures before writing tests. Step 0 required 4 iterations because we designed based on assumptions instead of reality. Complete this entire phase before writing any tests.

**Reference:** See `PHASE3_PROCESS_IMPROVEMENTS.md` for detailed guidance.

### A. Identify Data Sources

**Data Source:** `src/reasoning/relation-resolver.ts` - Step 0's output (resolved relations)

**Key files to read:**
- `src/reasoning/relation-resolver.ts` - RelationResolver.resolve() method
- `src/kb/models.ts` - Relation interface
- `tests/integration/phase3-step0-resolver.test.ts` - Real Phase 2 + Step 0 output

**Existing tests showing output format:**
- `tests/unit/reasoning/relation-resolver.test.ts` - Shows resolved relation schema
- `tests/integration/phase3-step0-resolver.test.ts` - Real parser + resolver output

### B. Read Upstream Code - Schema Validation

**Read these specific lines:**
- `src/reasoning/relation-resolver.ts:44-78` - RelationResolver.resolve() return format
- `src/kb/models.ts:30-40` - Relation interface definition

**Document ACTUAL schema (from Step 0):**

#### Resolved Call Relations
```typescript
{
  subjectId: string,      // Caller entity ID (content hash, e.g., 'Xj4kL9mPq2')
  predicate: 'calls',
  objectId: string | null, // Callee entity ID (if resolved) OR null (if unresolved)
  details: {
    originalExpression: string,  // Original text (e.g., 'express.Router()')
    resolved: boolean            // true if objectId is entity ID, false if unresolved
  },
  source: { kind: 'ast', file: string }
}
```

#### Import Relations (unchanged by Step 0)
```typescript
{
  subjectId: string,  // FILE PATH (not entity ID!) - e.g., 'src/a.ts'
  predicate: 'imports',
  objectId: string,   // MODULE SPECIFIER - e.g., './utils' or 'express'
  source: { kind: 'ast', file: string }
  // NO details.imported field - this doesn't exist!
}
```

**Critical findings from Step 0:**
- ✅ Resolved call relations use **entity IDs** (not expression text)
- ✅ Unresolved call relations have **objectId = null** (not expression text)
- ✅ Import relations keyed by **file path** (not entity ID)
- ✅ Import relations have **module specifier** as objectId (not resolved file path)
- ❌ No `details.imported` field (never existed in Phase 2)

### C. Validate Assumptions Checklist

**From original plan → validate against reality:**

- [ ] **Assumption:** Call relations have entity IDs in objectId
  - **Reality:** ✅ TRUE (after Step 0 resolution)
  - **Notes:** Step 0 converts expression text → entity ID, or null if unresolved

- [ ] **Assumption:** Import relations keyed by entity ID
  - **Reality:** ❌ FALSE - keyed by FILE PATH
  - **Impact:** importGraph keys are file paths, not entity IDs

- [ ] **Assumption:** Import objectId contains resolved file paths
  - **Reality:** ❌ FALSE - contains module specifiers ('./utils', 'express')
  - **Impact:** importGraph edges are module specifiers, not file paths

- [ ] **Assumption:** details.resolved field exists on call relations
  - **Reality:** ✅ TRUE (added by Step 0)

- [ ] **Assumption:** Unresolved calls have expression text in objectId
  - **Reality:** ❌ FALSE - have null in objectId
  - **Impact:** Must check `objectId !== null` before adding to graph

### D. Integration Test with Debugging (Run Before Writing Tests)

**Create this test and RUN IT to see actual data:**

```typescript
// tests/integration/phase3-step1-indices-analysis.test.ts
describe('Phase -1: Analyze Step 0 Output for Indices', () => {
  it('should inspect actual resolved relation format', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const extractor = new FactExtractor();
    const kb = new KnowledgeBase();
    const resolver = new RelationResolver(kb);

    // Create file with imports and calls
    const sourceFile = project.createSourceFile(
      'src/app.ts',
      `
      import { helper } from './utils';

      export function app() {
        helper();
        console.log('external');
      }
      `
    );

    // Extract and resolve
    const result = extractor.extract(sourceFile, 'src/app.ts');
    result.entities.forEach(e => kb.insertEntity(e));
    result.relations.forEach(r => kb.insertRelation(r));
    const resolved = resolver.resolve(kb.getRelations());

    // DEBUG: See actual structure
    console.log('\n=== RESOLVED CALL RELATIONS ===');
    resolved.filter(r => r.predicate === 'calls').forEach(r => {
      console.log({
        subjectId: r.subjectId,
        objectId: r.objectId,
        resolved: r.details?.resolved,
        originalExpr: r.details?.originalExpression
      });
    });

    console.log('\n=== IMPORT RELATIONS ===');
    resolved.filter(r => r.predicate === 'imports').forEach(r => {
      console.log({
        subjectId: r.subjectId,  // Expect: file path
        objectId: r.objectId     // Expect: module specifier
      });
    });

    // Validate schema assumptions
    const callRel = resolved.find(r => r.predicate === 'calls' && r.details?.resolved);
    if (callRel) {
      expect(callRel.objectId).toMatch(/^[0-9A-Za-z]{10,16}$/); // Hash format
      expect(callRel.details?.resolved).toBe(true);
      expect(callRel.details?.originalExpression).toBeDefined();
    }

    const unresolvedCall = resolved.find(r => r.predicate === 'calls' && !r.details?.resolved);
    if (unresolvedCall) {
      expect(unresolvedCall.objectId).toBeNull(); // NOT expression text!
    }

    const importRel = resolved.find(r => r.predicate === 'imports');
    if (importRel) {
      expect(importRel.subjectId).toMatch(/^src\//); // File path format
      expect(importRel.objectId).toMatch(/^\.\/|^\.\.\//); // Relative import
    }
  });
});
```

**RUN THIS TEST and analyze output before continuing!**

### E. Gap Analysis & Design Adjustment

**Gaps between plan and reality:**

1. **Import Graph Keys:** Plan assumed entity IDs, reality is file paths
   - **Adjustment:** importGraph will use file paths as keys (as written in plan)
   - **No code change needed** - plan already had this correct

2. **Import Graph Values:** Plan assumed resolved file paths, reality is module specifiers
   - **Adjustment:** importGraph edges are module specifiers (not resolved paths)
   - **Limitation:** Can't directly join importGraph to callGraph without path resolution
   - **Acceptable:** This is correct behavior - shows what each file imports (by specifier)

3. **Unresolved Calls:** Plan didn't specify handling of null objectId
   - **Adjustment:** Skip relations where `objectId === null` or `!details?.resolved`
   - **Code change:** Add null check in graph building loops

4. **ReverseDeps with Mixed Types:** reverseDeps will contain both entity IDs (from calls) and file paths (from imports)
   - **Adjustment:** Document that reverseDeps can return mixed identifier types
   - **Acceptable:** Consumers must handle both entity IDs and file paths

**Design Validation:**
- ✅ callGraph: entity ID → Set<entity ID> (correct)
- ✅ importGraph: file path → Set<module specifier> (correct)
- ⚠️ reverseDeps: mixed (entity ID | file path) → Set<entity ID | file path>
  - Need to document this clearly

**Approval needed:** No - adjustments are clarifications, not fundamental changes.

---

## Objective

Add `callGraph`, `importGraph`, and `reverseDeps` indices to KnowledgeBase to support cross-reference reasoning and impact scoping.

**Why needed:** Reasoning engine (Agent 2) needs to:
- Find callers of a function (for confidence promotion)
- Trace import dependencies
- Compute reverse dependencies for ambiguity resolution

---

## Algorithm Specification

**Updated based on Phase -1 findings:**

```typescript
/**
 * Graph Indices:
 *
 * callGraph: Map<EntityId, Set<EntityId>>
 *   - Key: Caller entity ID
 *   - Value: Set of callee entity IDs
 *   - Built from relations with predicate='calls' and details.resolved=true
 *   - IMPORTANT: Skip relations where objectId === null (unresolved external calls)
 *
 * importGraph: Map<FilePath, Set<ModuleSpecifier>>
 *   - Key: Importing file path (e.g., 'src/a.ts')
 *   - Value: Set of module specifiers (e.g., './utils', 'express')
 *   - Built from relations with predicate='imports'
 *   - NOTE: Keys are file paths (not entity IDs), values are module specifiers (not resolved paths)
 *
 * reverseDeps: Map<EntityId | FilePath, Set<EntityId | FilePath>>
 *   - Key: Target entity ID or file path
 *   - Value: Set of dependent entity IDs or file paths
 *   - Built by inverting callGraph and importGraph edges
 *   - MIXED TYPES: Can return both entity IDs (from calls) and file paths (from imports)
 *   - Consumers must handle both identifier types
 *
 * Lazy Building & Caching:
 *   - Indices built on first access
 *   - Cached for subsequent calls
 *   - Invalidated when relations change (insertRelation)
 *
 * Index Maintenance:
 *   - When insertRelation called → invalidate all caches
 *   - Next access rebuilds from current state.relations
 */
```

---

## Red: Write Failing Tests

**Test File:** `tests/unit/kb/kb-indices.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeBase } from '../../../src/kb/knowledge-base';
import { Entity, Relation } from '../../../src/kb/models';

describe('KnowledgeBase Graph Indices', () => {
  let kb: KnowledgeBase;

  beforeEach(() => {
    kb = new KnowledgeBase();
  });

  describe('callGraph', () => {
    it('should build call graph from resolved call relations', () => {
      // Setup: function A calls function B
      const funcA: Entity = {
        id: 'func-a-abc123',
        kind: 'function',
        name: 'functionA',
        path: 'src/a.ts',
        exported: true
      };
      const funcB: Entity = {
        id: 'func-b-def456',
        kind: 'function',
        name: 'functionB',
        path: 'src/b.ts',
        exported: true
      };

      kb.insertEntity(funcA);
      kb.insertEntity(funcB);

      kb.insertRelation({
        subjectId: funcA.id,
        predicate: 'calls',
        objectId: funcB.id,
        details: { resolved: true, originalExpression: 'functionB' },
        source: { kind: 'ast', file: 'src/a.ts' }
      });

      // When: get call graph
      const callGraph = kb.getCallGraph();

      // Then: funcA → funcB edge exists
      expect(callGraph.has(funcA.id)).toBe(true);
      expect(callGraph.get(funcA.id)?.has(funcB.id)).toBe(true);
    });

    it('should handle transitive calls (A → B → C)', () => {
      const funcA: Entity = {
        id: 'func-a-abc123',
        kind: 'function',
        name: 'functionA',
        path: 'src/a.ts',
        exported: true
      };
      const funcB: Entity = {
        id: 'func-b-def456',
        kind: 'function',
        name: 'functionB',
        path: 'src/b.ts',
        exported: true
      };
      const funcC: Entity = {
        id: 'func-c-ghi789',
        kind: 'function',
        name: 'functionC',
        path: 'src/c.ts',
        exported: true
      };

      kb.insertEntity(funcA);
      kb.insertEntity(funcB);
      kb.insertEntity(funcC);

      kb.insertRelation({
        subjectId: funcA.id,
        predicate: 'calls',
        objectId: funcB.id,
        details: { resolved: true },
        source: { kind: 'ast', file: 'src/a.ts' }
      });
      kb.insertRelation({
        subjectId: funcB.id,
        predicate: 'calls',
        objectId: funcC.id,
        details: { resolved: true },
        source: { kind: 'ast', file: 'src/b.ts' }
      });

      const callGraph = kb.getCallGraph();

      expect(callGraph.get(funcA.id)?.has(funcB.id)).toBe(true);
      expect(callGraph.get(funcB.id)?.has(funcC.id)).toBe(true);
    });

    it('should handle cyclic calls (A → B → A)', () => {
      const funcA: Entity = {
        id: 'func-a-abc123',
        kind: 'function',
        name: 'functionA',
        path: 'src/a.ts',
        exported: true
      };
      const funcB: Entity = {
        id: 'func-b-def456',
        kind: 'function',
        name: 'functionB',
        path: 'src/b.ts',
        exported: true
      };

      kb.insertEntity(funcA);
      kb.insertEntity(funcB);

      kb.insertRelation({
        subjectId: funcA.id,
        predicate: 'calls',
        objectId: funcB.id,
        details: { resolved: true },
        source: { kind: 'ast', file: 'src/a.ts' }
      });
      kb.insertRelation({
        subjectId: funcB.id,
        predicate: 'calls',
        objectId: funcA.id,
        details: { resolved: true },
        source: { kind: 'ast', file: 'src/b.ts' }
      });

      const callGraph = kb.getCallGraph();

      expect(callGraph.get(funcA.id)?.has(funcB.id)).toBe(true);
      expect(callGraph.get(funcB.id)?.has(funcA.id)).toBe(true);
    });

    it('should skip unresolved call relations', () => {
      const funcA: Entity = {
        id: 'func-a-abc123',
        kind: 'function',
        name: 'functionA',
        path: 'src/a.ts',
        exported: true
      };

      kb.insertEntity(funcA);

      kb.insertRelation({
        subjectId: funcA.id,
        predicate: 'calls',
        objectId: 'express.Router',  // Unresolved external call
        details: { resolved: false, originalExpression: 'express.Router' },
        source: { kind: 'ast', file: 'src/a.ts' }
      });

      const callGraph = kb.getCallGraph();

      // Should not include unresolved relations
      expect(callGraph.has(funcA.id)).toBe(false);
    });
  });

  describe('importGraph', () => {
    it('should build import graph from import relations', () => {
      kb.insertRelation({
        subjectId: 'src/a.ts',
        predicate: 'imports',
        objectId: 'src/b.ts',
        source: { kind: 'ast', file: 'src/a.ts' }
      });

      const importGraph = kb.getImportGraph();

      expect(importGraph.has('src/a.ts')).toBe(true);
      expect(importGraph.get('src/a.ts')?.has('src/b.ts')).toBe(true);
    });

    it('should handle transitive imports (A imports B imports C)', () => {
      kb.insertRelation({
        subjectId: 'src/a.ts',
        predicate: 'imports',
        objectId: 'src/b.ts',
        source: { kind: 'ast', file: 'src/a.ts' }
      });
      kb.insertRelation({
        subjectId: 'src/b.ts',
        predicate: 'imports',
        objectId: 'src/c.ts',
        source: { kind: 'ast', file: 'src/b.ts' }
      });

      const importGraph = kb.getImportGraph();

      expect(importGraph.get('src/a.ts')?.has('src/b.ts')).toBe(true);
      expect(importGraph.get('src/b.ts')?.has('src/c.ts')).toBe(true);
    });

    it('should handle circular imports (A imports B imports A)', () => {
      kb.insertRelation({
        subjectId: 'src/a.ts',
        predicate: 'imports',
        objectId: 'src/b.ts',
        source: { kind: 'ast', file: 'src/a.ts' }
      });
      kb.insertRelation({
        subjectId: 'src/b.ts',
        predicate: 'imports',
        objectId: 'src/a.ts',
        source: { kind: 'ast', file: 'src/b.ts' }
      });

      const importGraph = kb.getImportGraph();

      expect(importGraph.get('src/a.ts')?.has('src/b.ts')).toBe(true);
      expect(importGraph.get('src/b.ts')?.has('src/a.ts')).toBe(true);
    });
  });

  describe('reverseDeps', () => {
    it('should return entities that depend on the given entity (calls)', () => {
      const funcA: Entity = {
        id: 'func-a-abc123',
        kind: 'function',
        name: 'functionA',
        path: 'src/a.ts',
        exported: true
      };
      const funcB: Entity = {
        id: 'func-b-def456',
        kind: 'function',
        name: 'functionB',
        path: 'src/b.ts',
        exported: true
      };
      const funcC: Entity = {
        id: 'func-c-ghi789',
        kind: 'function',
        name: 'functionC',
        path: 'src/c.ts',
        exported: true
      };

      kb.insertEntity(funcA);
      kb.insertEntity(funcB);
      kb.insertEntity(funcC);

      // B calls A, C calls A
      kb.insertRelation({
        subjectId: funcB.id,
        predicate: 'calls',
        objectId: funcA.id,
        details: { resolved: true },
        source: { kind: 'ast', file: 'src/b.ts' }
      });
      kb.insertRelation({
        subjectId: funcC.id,
        predicate: 'calls',
        objectId: funcA.id,
        details: { resolved: true },
        source: { kind: 'ast', file: 'src/c.ts' }
      });

      const reverseDeps = kb.getReverseDeps(funcA.id);

      expect(reverseDeps.size).toBe(2);
      expect(reverseDeps.has(funcB.id)).toBe(true);
      expect(reverseDeps.has(funcC.id)).toBe(true);
    });

    it('should return empty set for entities with no dependents', () => {
      const funcA: Entity = {
        id: 'func-a-abc123',
        kind: 'function',
        name: 'functionA',
        path: 'src/a.ts',
        exported: true
      };

      kb.insertEntity(funcA);

      const reverseDeps = kb.getReverseDeps(funcA.id);

      expect(reverseDeps.size).toBe(0);
    });

    it('should handle mixed relations (calls + imports)', () => {
      kb.insertRelation({
        subjectId: 'src/b.ts',
        predicate: 'imports',
        objectId: 'src/a.ts',
        source: { kind: 'ast', file: 'src/b.ts' }
      });

      const funcA: Entity = {
        id: 'func-a-abc123',
        kind: 'function',
        name: 'functionA',
        path: 'src/a.ts',
        exported: true
      };
      const funcB: Entity = {
        id: 'func-b-def456',
        kind: 'function',
        name: 'functionB',
        path: 'src/b.ts',
        exported: true
      };

      kb.insertEntity(funcA);
      kb.insertEntity(funcB);

      kb.insertRelation({
        subjectId: funcB.id,
        predicate: 'calls',
        objectId: funcA.id,
        details: { resolved: true },
        source: { kind: 'ast', file: 'src/b.ts' }
      });

      const reverseDepsFunc = kb.getReverseDeps(funcA.id);

      expect(reverseDepsFunc.has(funcB.id)).toBe(true);
    });

    it('should include file-level import dependencies', () => {
      // Setup: src/a.ts imports src/b.ts, src/c.ts imports src/b.ts
      kb.insertRelation({
        subjectId: 'src/a.ts',
        predicate: 'imports',
        objectId: 'src/b.ts',
        source: { kind: 'ast', file: 'src/a.ts' }
      });
      kb.insertRelation({
        subjectId: 'src/c.ts',
        predicate: 'imports',
        objectId: 'src/b.ts',
        source: { kind: 'ast', file: 'src/c.ts' }
      });

      // When: get reverse deps for src/b.ts (the imported file)
      const reverseDeps = kb.getReverseDeps('src/b.ts');

      // Then: should include both importing files
      expect(reverseDeps.size).toBe(2);
      expect(reverseDeps.has('src/a.ts')).toBe(true);
      expect(reverseDeps.has('src/c.ts')).toBe(true);
    });
  });

  describe('index caching and invalidation', () => {
    it('should cache indices after first build', () => {
      const funcA: Entity = {
        id: 'func-a-abc123',
        kind: 'function',
        name: 'functionA',
        path: 'src/a.ts',
        exported: true
      };
      const funcB: Entity = {
        id: 'func-b-def456',
        kind: 'function',
        name: 'functionB',
        path: 'src/b.ts',
        exported: true
      };

      kb.insertEntity(funcA);
      kb.insertEntity(funcB);

      kb.insertRelation({
        subjectId: funcA.id,
        predicate: 'calls',
        objectId: funcB.id,
        details: { resolved: true },
        source: { kind: 'ast', file: 'src/a.ts' }
      });

      // First call builds cache
      const callGraph1 = kb.getCallGraph();
      // Second call returns cached
      const callGraph2 = kb.getCallGraph();

      // Should be same reference (cached)
      expect(callGraph1).toBe(callGraph2);
    });

    it('should invalidate cache when new relation added', () => {
      const funcA: Entity = {
        id: 'func-a-abc123',
        kind: 'function',
        name: 'functionA',
        path: 'src/a.ts',
        exported: true
      };
      const funcB: Entity = {
        id: 'func-b-def456',
        kind: 'function',
        name: 'functionB',
        path: 'src/b.ts',
        exported: true
      };
      const funcC: Entity = {
        id: 'func-c-ghi789',
        kind: 'function',
        name: 'functionC',
        path: 'src/c.ts',
        exported: true
      };

      kb.insertEntity(funcA);
      kb.insertEntity(funcB);
      kb.insertEntity(funcC);

      kb.insertRelation({
        subjectId: funcA.id,
        predicate: 'calls',
        objectId: funcB.id,
        details: { resolved: true },
        source: { kind: 'ast', file: 'src/a.ts' }
      });

      // Build cache
      let callGraph = kb.getCallGraph();
      expect(callGraph.has(funcA.id)).toBe(true);

      // Add new relation
      kb.insertRelation({
        subjectId: funcA.id,
        predicate: 'calls',
        objectId: funcC.id,
        details: { resolved: true },
        source: { kind: 'ast', file: 'src/a.ts' }
      });

      // Cache should be invalidated and rebuilt
      callGraph = kb.getCallGraph();
      expect(callGraph.get(funcA.id)?.has(funcC.id)).toBe(true);
    });
  });
});
```

**Run tests (should fail):**
```bash
pnpm test tests/unit/kb/kb-indices.test.ts
```

Expected: All tests fail (methods not implemented).

---

## Green: Implement KB Graph Indices

**Implementation File:** `src/kb/knowledge-base.ts` (extend existing class)

```typescript
import { RelationResolver } from './RelationResolver';

export class KnowledgeBase {
  // ... existing fields ...

  // NEW: Graph index caches (lazy-built, invalidated on relation changes)
  private callGraphCache: Map<string, Set<string>> | null = null;
  private importGraphCache: Map<string, Set<string>> | null = null;
  private reverseDepsCache: Map<string, Set<string>> | null = null;

  // ... existing methods ...

  /**
   * Returns the call graph: Map from caller entity ID to set of callee entity IDs.
   * Graph is built from resolved call relations (predicate='calls', details.resolved=true).
   * Lazy-built and cached; invalidated on relation changes.
   */
  getCallGraph(): Map<string, Set<string>> {
    if (this.callGraphCache) {
      return this.callGraphCache;
    }

    // Resolve relations first (Step 0)
    const resolver = new RelationResolver(this);
    const resolvedRelations = resolver.resolve(this.state.relations);

    // Build graph from resolved call relations
    const graph = new Map<string, Set<string>>();
    for (const relation of resolvedRelations) {
      if (relation.predicate === 'calls' && relation.details?.resolved) {
        if (!graph.has(relation.subjectId)) {
          graph.set(relation.subjectId, new Set());
        }
        graph.get(relation.subjectId)!.add(relation.objectId!);
      }
    }

    this.callGraphCache = graph;
    return graph;
  }

  /**
   * Returns the import graph: Map from importing file path to set of imported file paths.
   * Graph is built from import relations (predicate='imports').
   * Lazy-built and cached; invalidated on relation changes.
   */
  getImportGraph(): Map<string, Set<string>> {
    if (this.importGraphCache) {
      return this.importGraphCache;
    }

    const graph = new Map<string, Set<string>>();
    for (const relation of this.state.relations) {
      if (relation.predicate === 'imports') {
        if (!graph.has(relation.subjectId)) {
          graph.set(relation.subjectId, new Set());
        }
        if (relation.objectId) {
          graph.get(relation.subjectId)!.add(relation.objectId);
        }
      }
    }

    this.importGraphCache = graph;
    return graph;
  }

  /**
   * Returns the set of entities that depend on the given entity (reverse dependencies).
   * Includes both 'calls' and 'imports' relations.
   * Lazy-built and cached; invalidated on relation changes.
   */
  getReverseDeps(entityId: string): Set<string> {
    if (!this.reverseDepsCache) {
      this.buildReverseDepsCache();
    }

    return this.reverseDepsCache!.get(entityId) || new Set();
  }

  /**
   * Build reverse dependencies cache by inverting call and import graphs.
   *
   * Captures both entity-level and file-level dependencies:
   * - Entity-level: resolved 'calls' relations (e.g., funcB.id → funcA.id means funcA has reverse dep funcB)
   * - File-level: 'imports' relations (e.g., 'src/a.ts' → 'src/b.ts' means 'src/b.ts' has reverse dep 'src/a.ts')
   *
   * Note: RelationResolver passes 'imports' relations through unchanged (only processes 'calls'),
   * so import relations are available in resolvedRelations with original subjectId/objectId (file paths).
   */
  private buildReverseDepsCache(): void {
    const reverseDeps = new Map<string, Set<string>>();

    // Resolve relations first (processes 'calls', passes 'imports' through unchanged)
    const resolver = new RelationResolver(this);
    const resolvedRelations = resolver.resolve(this.state.relations);

    // Invert edges from callGraph and importGraph
    for (const relation of resolvedRelations) {
      if ((relation.predicate === 'calls' && relation.details?.resolved) ||
          relation.predicate === 'imports') {
        const targetId = relation.objectId;
        if (targetId) {
          if (!reverseDeps.has(targetId)) {
            reverseDeps.set(targetId, new Set());
          }
          reverseDeps.get(targetId)!.add(relation.subjectId);
        }
      }
    }

    this.reverseDepsCache = reverseDeps;
  }

  /**
   * Override insertRelation to invalidate graph caches.
   */
  insertRelation(relation: Relation): void {
    const state = this.getActiveState();
    state.relations.push(relation);

    // Invalidate graph caches
    this.callGraphCache = null;
    this.importGraphCache = null;
    this.reverseDepsCache = null;
  }

  // ... rest of existing methods ...
}
```

**Run tests (should pass):**
```bash
pnpm test tests/unit/kb/kb-indices.test.ts
```

Expected: All tests pass.

---

## Refactor: Optimize & Document

- Add JSDoc comments to public methods
- Consider performance: graph building is O(n) where n = number of relations
- For large codebases (>10k relations), consider incremental updates instead of full invalidation
- Add metrics/telemetry for cache hit rates (deferred to Phase 6)

---

## Acceptance Criteria (Step 1)

- ✅ All tests in `kb-indices.test.ts` pass (≥80% branch coverage)
- ✅ `getCallGraph()` returns correct edges for resolved 'calls' relations
- ✅ `getImportGraph()` returns correct edges for 'imports' relations
- ✅ `getReverseDeps()` returns correct reverse dependencies (calls + imports)
- ✅ Indices handle transitive, cyclic, and mixed relations correctly
- ✅ Indices are lazy-built and cached
- ✅ Caches invalidated when `insertRelation()` called
- ✅ Unresolved call relations skipped in callGraph

---

**End of Step 1**

Proceed to Step 2 (Confidence Scoring) after this step passes all tests.
