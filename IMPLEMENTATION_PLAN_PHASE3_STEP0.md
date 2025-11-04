# Phase 3 - Step 0: Relation Resolution (Preparatory)

**Owner:** Agent 1 (WS-A)
**Depends on:** Phase 2 complete
**Blocks:** Step 1 (graph indices need resolved relations)
**TDD:** Red → Green → Refactor

---

## Objective

Resolve call relation endpoints from expression text to entity IDs, enabling graph index construction in Step 1.

**Problem:** Phase 2 parser stores call relations with `objectId` containing expression text (e.g., `'app.get(...)'`, `'myFunction()'`, `'obj.method()'`), not entity IDs. Graph indices cannot be built directly from these relations.

**Solution:** Create a `RelationResolver` that:
1. Builds entity lookup table (name → entity ID)
2. Resolves expression text to entity IDs
3. Marks relations as resolved/unresolved
4. Preserves original expression for debugging

---

## Algorithm Specification

```typescript
/**
 * Relation Resolution Algorithm
 *
 * Input: Relations from KB with objectId = expression text
 * Output: Relations with objectId = entity ID (or null if unresolved)
 *
 * For each relation with predicate='calls':
 *   1. Extract callee expression from objectId
 *   2. Attempt to resolve to entity ID via lookup:
 *      - Simple name: 'functionName' → lookup['functionName']
 *      - Qualified name: 'ClassName.methodName' → lookup['ClassName.methodName']
 *      - Member expression: 'obj.method()' → try lookup['method']
 *   3. If resolved:
 *        - Replace objectId with entity ID
 *        - Set details.resolved = true
 *        - Preserve details.originalExpression
 *   4. If unresolved (dynamic, external, etc.):
 *        - Keep objectId as-is
 *        - Set details.resolved = false
 *
 * For relations with other predicates (imports, exports):
 *   - Keep as-is (file paths, no resolution needed)
 */
```

---

## Red: Write Failing Tests

**Test File:** `tests/unit/kb/relation-resolver.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { RelationResolver } from '../../../src/kb/RelationResolver';
import { KnowledgeBase } from '../../../src/kb/knowledge-base';
import { Relation, Entity } from '../../../src/kb/models';

describe('RelationResolver', () => {
  let kb: KnowledgeBase;
  let resolver: RelationResolver;

  beforeEach(() => {
    kb = new KnowledgeBase();
    resolver = new RelationResolver(kb);
  });

  describe('resolve', () => {
    it('should resolve simple function call by name', () => {
      // Setup: two functions, A calls B
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

      const callRelation: Relation = {
        subjectId: funcA.id,
        predicate: 'calls',
        objectId: 'functionB',  // Expression text
        source: { kind: 'ast', file: 'src/a.ts' }
      };

      kb.insertRelation(callRelation);

      // Resolve relations
      const resolved = resolver.resolve(kb.getRelations());

      // Should resolve 'functionB' → 'func-b-def456'
      expect(resolved.length).toBe(1);
      expect(resolved[0].objectId).toBe(funcB.id);
      expect(resolved[0].details?.resolved).toBe(true);
      expect(resolved[0].details?.originalExpression).toBe('functionB');
    });

    it('should resolve qualified method call (ClassName.methodName)', () => {
      const classA: Entity = {
        id: 'class-a-abc123',
        kind: 'class',
        name: 'MyClass',
        path: 'src/class.ts',
        exported: true
      };
      const methodA: Entity = {
        id: 'method-a-def456',
        kind: 'method',
        name: 'myMethod',
        path: 'src/class.ts',
        signature: '(): void',
        exported: true
      };

      kb.insertEntity(classA);
      kb.insertEntity(methodA);

      const callRelation: Relation = {
        subjectId: 'caller-xyz789',
        predicate: 'calls',
        objectId: 'MyClass.myMethod',  // Qualified expression
        source: { kind: 'ast', file: 'src/caller.ts' }
      };

      kb.insertRelation(callRelation);

      const resolved = resolver.resolve(kb.getRelations());

      expect(resolved[0].objectId).toBe(methodA.id);
      expect(resolved[0].details?.resolved).toBe(true);
    });

    it('should mark external library calls as unresolved', () => {
      const funcA: Entity = {
        id: 'func-a-abc123',
        kind: 'function',
        name: 'myFunc',
        path: 'src/a.ts',
        exported: false
      };

      kb.insertEntity(funcA);

      const callRelation: Relation = {
        subjectId: funcA.id,
        predicate: 'calls',
        objectId: 'express.Router',  // External library
        source: { kind: 'ast', file: 'src/a.ts' }
      };

      kb.insertRelation(callRelation);

      const resolved = resolver.resolve(kb.getRelations());

      // Should NOT resolve (external)
      expect(resolved[0].objectId).toBe('express.Router');
      expect(resolved[0].details?.resolved).toBe(false);
      expect(resolved[0].details?.originalExpression).toBe('express.Router');
    });

    it('should mark dynamic calls as unresolved', () => {
      const funcA: Entity = {
        id: 'func-a-abc123',
        kind: 'function',
        name: 'dynamicCaller',
        path: 'src/dynamic.ts',
        exported: false
      };

      kb.insertEntity(funcA);

      const callRelation: Relation = {
        subjectId: funcA.id,
        predicate: 'calls',
        objectId: 'obj[methodName]()',  // Dynamic access
        source: { kind: 'ast', file: 'src/dynamic.ts' }
      };

      kb.insertRelation(callRelation);

      const resolved = resolver.resolve(kb.getRelations());

      expect(resolved[0].objectId).toBe('obj[methodName]()');
      expect(resolved[0].details?.resolved).toBe(false);
    });

    it('should handle member expression calls (obj.method)', () => {
      const methodA: Entity = {
        id: 'method-a-abc123',
        kind: 'method',
        name: 'process',
        path: 'src/service.ts',
        exported: false
      };

      kb.insertEntity(methodA);

      const callRelation: Relation = {
        subjectId: 'caller-xyz789',
        predicate: 'calls',
        objectId: 'service.process',  // Member expression
        source: { kind: 'ast', file: 'src/caller.ts' }
      };

      kb.insertRelation(callRelation);

      const resolved = resolver.resolve(kb.getRelations());

      // Should try to resolve 'process' method
      expect(resolved[0].objectId).toBe(methodA.id);
      expect(resolved[0].details?.resolved).toBe(true);
    });

    it('should preserve import/export relations unchanged', () => {
      const importRelation: Relation = {
        subjectId: 'src/a.ts',
        predicate: 'imports',
        objectId: './b',
        source: { kind: 'ast', file: 'src/a.ts' }
      };

      kb.insertRelation(importRelation);

      const resolved = resolver.resolve(kb.getRelations());

      // Import relations should be unchanged
      expect(resolved[0]).toEqual(importRelation);
    });

    it('should handle multiple calls from same function', () => {
      const funcA: Entity = {
        id: 'func-a-abc123',
        kind: 'function',
        name: 'caller',
        path: 'src/caller.ts',
        exported: false
      };
      const funcB: Entity = {
        id: 'func-b-def456',
        kind: 'function',
        name: 'funcB',
        path: 'src/b.ts',
        exported: true
      };
      const funcC: Entity = {
        id: 'func-c-ghi789',
        kind: 'function',
        name: 'funcC',
        path: 'src/c.ts',
        exported: true
      };

      kb.insertEntity(funcA);
      kb.insertEntity(funcB);
      kb.insertEntity(funcC);

      kb.insertRelation({
        subjectId: funcA.id,
        predicate: 'calls',
        objectId: 'funcB',
        source: { kind: 'ast', file: 'src/caller.ts' }
      });
      kb.insertRelation({
        subjectId: funcA.id,
        predicate: 'calls',
        objectId: 'funcC',
        source: { kind: 'ast', file: 'src/caller.ts' }
      });

      const resolved = resolver.resolve(kb.getRelations());

      expect(resolved.length).toBe(2);
      expect(resolved[0].objectId).toBe(funcB.id);
      expect(resolved[1].objectId).toBe(funcC.id);
    });
  });

  describe('buildEntityLookup', () => {
    it('should build lookup map from entity names', () => {
      const funcA: Entity = {
        id: 'func-a-abc123',
        kind: 'function',
        name: 'myFunction',
        path: 'src/a.ts',
        exported: true
      };
      const classB: Entity = {
        id: 'class-b-def456',
        kind: 'class',
        name: 'MyClass',
        path: 'src/b.ts',
        exported: true
      };

      kb.insertEntity(funcA);
      kb.insertEntity(classB);

      const lookup = resolver.buildEntityLookup();

      expect(lookup.get('myFunction')).toBe(funcA.id);
      expect(lookup.get('MyClass')).toBe(classB.id);
    });

    it('should include qualified names for methods', () => {
      const classA: Entity = {
        id: 'class-a-abc123',
        kind: 'class',
        name: 'MyClass',
        path: 'src/class.ts',
        exported: true
      };
      const methodA: Entity = {
        id: 'method-a-def456',
        kind: 'method',
        name: 'myMethod',
        path: 'src/class.ts',
        exported: true
      };

      kb.insertEntity(classA);
      kb.insertEntity(methodA);

      const lookup = resolver.buildEntityLookup();

      // Methods should be accessible by name alone and qualified name
      expect(lookup.get('myMethod')).toBe(methodA.id);
      expect(lookup.get('MyClass.myMethod')).toBe(methodA.id);
    });
  });
});
```

**Run tests (should fail):**
```bash
pnpm test tests/unit/kb/relation-resolver.test.ts
```

Expected: All tests fail (`RelationResolver` not implemented).

---

## Green: Implement Relation Resolver

**Implementation File:** `src/kb/RelationResolver.ts`

```typescript
import { KnowledgeBase } from './knowledge-base';
import { Relation, Entity } from './models';

export class RelationResolver {
  private entityLookup: Map<string, string> = new Map();

  constructor(private kb: KnowledgeBase) {}

  /**
   * Resolve call relations by converting expression text to entity IDs.
   * Returns new array of relations with resolved objectIds.
   */
  resolve(relations: Relation[]): Relation[] {
    // Build entity lookup once
    this.entityLookup = this.buildEntityLookup();

    const resolved: Relation[] = [];

    for (const relation of relations) {
      if (relation.predicate === 'calls') {
        const entityId = this.resolveCallExpression(relation.objectId || '');

        resolved.push({
          ...relation,
          objectId: entityId || relation.objectId,
          details: {
            ...relation.details,
            originalExpression: relation.objectId,
            resolved: !!entityId
          }
        });
      } else {
        // Non-call relations (imports, exports) pass through unchanged
        resolved.push(relation);
      }
    }

    return resolved;
  }

  /**
   * Build entity lookup map: entity name → entity ID.
   * Also includes qualified names (ClassName.methodName).
   *
   * **Name Collision Limitation:**
   * - Keys entries solely by entity.name (e.g., 'render', 'index')
   * - Identically-named functions in different modules will collide
   * - Last-processed entity wins (map overwrites previous entry)
   * - Common helper names like 'render', 'index', 'handler' are prone to collisions
   *
   * **Mitigation Strategies (for future enhancement):**
   * - Option A: Use (path, name) tuple as key: `"src/a.ts::render"`
   * - Option B: Store arrays of entity IDs: `Map<string, string[]>`
   * - Option C: Warn on collisions during lookup building
   * - Option D: Prefer exported entities over internal when collision occurs
   *
   * **Current Behavior:** Simple name-based lookup. Step 1 graph accuracy may be
   * reduced for common helper names. Most unique exported API functions will resolve correctly.
   */
  buildEntityLookup(): Map<string, string> {
    const lookup = new Map<string, string>();

    // Get all entities (need getAllEntities() helper)
    const entities = this.getAllEntitiesFromKB();

    for (const entity of entities) {
      // Add simple name
      // NOTE: This will overwrite previous entries with same name (collision)
      // TODO (future): Consider disambiguation strategy (path-qualified keys, arrays, or warnings)
      lookup.set(entity.name, entity.id);

      // For methods, add qualified name (ClassName.methodName)
      if (entity.kind === 'method') {
        const className = this.getClassNameForMethod(entity);
        if (className) {
          lookup.set(`${className}.${entity.name}`, entity.id);
        }
      }
    }

    return lookup;
  }

  /**
   * Resolve call expression text to entity ID.
   * Returns null if unresolved (external library, dynamic, etc.).
   */
  private resolveCallExpression(expr: string): string | null {
    // Remove trailing parens and args: 'func()' → 'func'
    const cleaned = expr.replace(/\(.*$/, '').trim();

    // Simple name: 'functionName'
    if (this.entityLookup.has(cleaned)) {
      return this.entityLookup.get(cleaned)!;
    }

    // Qualified name: 'ClassName.methodName'
    if (cleaned.includes('.')) {
      // Try full qualified name first
      if (this.entityLookup.has(cleaned)) {
        return this.entityLookup.get(cleaned)!;
      }

      // Try just the method name (for member expressions like 'obj.method')
      const parts = cleaned.split('.');
      const methodName = parts[parts.length - 1];
      if (this.entityLookup.has(methodName)) {
        return this.entityLookup.get(methodName)!;
      }
    }

    // Unresolved (external library, dynamic access, etc.)
    return null;
  }

  /**
   * Get class name for a method entity.
   * Heuristic: Find class entity in same file with method path.
   */
  private getClassNameForMethod(methodEntity: Entity): string | null {
    const entities = this.getAllEntitiesFromKB();

    // Find class in same file
    for (const entity of entities) {
      if (entity.kind === 'class' && entity.path === methodEntity.path) {
        return entity.name;
      }
    }

    return null;
  }

  /**
   * Helper: Get all entities from KB.
   * Uses KB.getAllEntities() added below.
   */
  private getAllEntitiesFromKB(): Entity[] {
    return this.kb.getAllEntities();
  }
}
```

**Note:** This implementation requires `KB.getAllEntities()` helper. Add to `src/kb/knowledge-base.ts`:

```typescript
export class KnowledgeBase {
  // ... existing methods ...

  /**
   * Get all entities in the KB.
   * Added for Phase 3 (needed by relation resolver and reasoning engine).
   */
  getAllEntities(): Entity[] {
    const state = this.getActiveState();
    return Array.from(state.entities.values());
  }

  /**
   * Get all factSets in the KB.
   * Added for Phase 3 (needed by reasoning engine).
   */
  getAllFactSets(): FactSet[] {
    const state = this.getActiveState();
    return Array.from(state.factSets.values());
  }
}
```

**Run tests (should pass):**
```bash
pnpm test tests/unit/kb/relation-resolver.test.ts
```

Expected: All tests pass.

---

## Refactor: Clean Up & Document

- Add JSDoc comments to public methods
- Handle edge cases (empty expressions, malformed calls)
- Optimize lookup (consider caching for large codebases)
- Add logging for unresolved relations (debugging aid)

---

## Acceptance Criteria (Step 0)

- ✅ All tests in `relation-resolver.test.ts` pass (≥80% branch coverage)
- ✅ Simple function calls resolved correctly
- ✅ Qualified method calls (ClassName.methodName) resolved correctly
- ✅ External library calls marked as unresolved
- ✅ Dynamic calls marked as unresolved
- ✅ Import/export relations pass through unchanged
- ✅ Multiple calls from same function handled correctly
- ✅ Entity lookup includes simple and qualified names
- ✅ `KB.getAllEntities()` and `KB.getAllFactSets()` helpers added

---

## Integration with Step 1

After Step 0 completes, Step 1 will use `RelationResolver` in graph index construction:

```typescript
// In KnowledgeBase.getCallGraph() implementation (Step 1)
getCallGraph(): Map<string, Set<string>> {
  if (this.callGraphCache) {
    return this.callGraphCache;
  }

  // Resolve relations first (Step 0)
  const resolver = new RelationResolver(this);
  const resolvedRelations = resolver.resolve(this.state.relations);

  // Build graph from resolved relations
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
```

---

**End of Step 0**

Proceed to Step 1 after this step passes all tests.
