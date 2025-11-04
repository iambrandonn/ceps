import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeBase } from '../../../src/kb/knowledge-base.js';
import { Entity, Relation } from '../../../src/kb/models.js';

/**
 * Unit tests for KB Graph Indices (Phase 3 Step 1)
 *
 * Tests callGraph, importGraph, and reverseDeps indices.
 * Schema validated via Phase -1 analysis with real Phase 2 + Step 0 data.
 */
describe('KnowledgeBase - Graph Indices', () => {
  let kb: KnowledgeBase;

  beforeEach(() => {
    kb = new KnowledgeBase();
  });

  describe('getCallGraph', () => {
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

      // Resolved call relation (Step 0 output format)
      kb.insertRelation({
        subjectId: funcA.id,
        predicate: 'calls',
        objectId: funcB.id,
        details: { resolved: true, originalExpression: 'functionB()' },
        source: { kind: 'ast', file: 'src/a.ts' }
      });

      // When: get call graph
      const callGraph = kb.getCallGraph();

      // Then: funcA → funcB edge exists
      expect(callGraph.has(funcA.id)).toBe(true);
      expect(callGraph.get(funcA.id)?.has(funcB.id)).toBe(true);
      expect(callGraph.get(funcA.id)?.size).toBe(1);
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
        details: { resolved: true, originalExpression: 'functionB()' },
        source: { kind: 'ast', file: 'src/a.ts' }
      });
      kb.insertRelation({
        subjectId: funcB.id,
        predicate: 'calls',
        objectId: funcC.id,
        details: { resolved: true, originalExpression: 'functionC()' },
        source: { kind: 'ast', file: 'src/b.ts' }
      });

      const callGraph = kb.getCallGraph();

      // Verify both edges exist independently
      expect(callGraph.get(funcA.id)?.has(funcB.id)).toBe(true);
      expect(callGraph.get(funcB.id)?.has(funcC.id)).toBe(true);

      // Verify no spurious transitive edge
      expect(callGraph.get(funcA.id)?.has(funcC.id)).toBe(false);
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
        details: { resolved: true, originalExpression: 'functionB()' },
        source: { kind: 'ast', file: 'src/a.ts' }
      });
      kb.insertRelation({
        subjectId: funcB.id,
        predicate: 'calls',
        objectId: funcA.id,
        details: { resolved: true, originalExpression: 'functionA()' },
        source: { kind: 'ast', file: 'src/b.ts' }
      });

      const callGraph = kb.getCallGraph();

      // Both directions should exist
      expect(callGraph.get(funcA.id)?.has(funcB.id)).toBe(true);
      expect(callGraph.get(funcB.id)?.has(funcA.id)).toBe(true);
    });

    it('should skip unresolved call relations (objectId = null)', () => {
      const funcA: Entity = {
        id: 'func-a-abc123',
        kind: 'function',
        name: 'functionA',
        path: 'src/a.ts',
        exported: true
      };

      kb.insertEntity(funcA);

      // Unresolved external call (Step 0 format: objectId = null)
      kb.insertRelation({
        subjectId: funcA.id,
        predicate: 'calls',
        objectId: null,  // Unresolved!
        details: { resolved: false, originalExpression: 'console.log' },
        source: { kind: 'ast', file: 'src/a.ts' }
      });

      const callGraph = kb.getCallGraph();

      // Should not include unresolved relations
      expect(callGraph.has(funcA.id)).toBe(false);
      expect(callGraph.size).toBe(0);
    });

    it('should skip unresolved call relations (details.resolved = false)', () => {
      const funcA: Entity = {
        id: 'func-a-abc123',
        kind: 'function',
        name: 'functionA',
        path: 'src/a.ts',
        exported: true
      };

      kb.insertEntity(funcA);

      // Unresolved call with expression text (old format - should also be skipped)
      kb.insertRelation({
        subjectId: funcA.id,
        predicate: 'calls',
        objectId: 'externalLib.method',  // Expression text, not entity ID
        details: { resolved: false, originalExpression: 'externalLib.method()' },
        source: { kind: 'ast', file: 'src/a.ts' }
      });

      const callGraph = kb.getCallGraph();

      // Should not include unresolved relations
      expect(callGraph.has(funcA.id)).toBe(false);
      expect(callGraph.size).toBe(0);
    });

    it('should handle multiple calls from same function', () => {
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

      // A calls both B and C
      kb.insertRelation({
        subjectId: funcA.id,
        predicate: 'calls',
        objectId: funcB.id,
        details: { resolved: true, originalExpression: 'functionB()' },
        source: { kind: 'ast', file: 'src/a.ts' }
      });
      kb.insertRelation({
        subjectId: funcA.id,
        predicate: 'calls',
        objectId: funcC.id,
        details: { resolved: true, originalExpression: 'functionC()' },
        source: { kind: 'ast', file: 'src/a.ts' }
      });

      const callGraph = kb.getCallGraph();

      expect(callGraph.get(funcA.id)?.size).toBe(2);
      expect(callGraph.get(funcA.id)?.has(funcB.id)).toBe(true);
      expect(callGraph.get(funcA.id)?.has(funcC.id)).toBe(true);
    });
  });

  describe('getImportGraph', () => {
    it('should build import graph from import relations', () => {
      // Import relations use FILE PATHS as subjectId (Phase -1 confirmed)
      kb.insertRelation({
        subjectId: 'src/a.ts',
        predicate: 'imports',
        objectId: './b',
        source: { kind: 'ast', file: 'src/a.ts' }
      });

      const importGraph = kb.getImportGraph();

      expect(importGraph.has('src/a.ts')).toBe(true);
      expect(importGraph.get('src/a.ts')?.has('./b')).toBe(true);
    });

    it('should handle transitive imports (A imports B imports C)', () => {
      kb.insertRelation({
        subjectId: 'src/a.ts',
        predicate: 'imports',
        objectId: './b',
        source: { kind: 'ast', file: 'src/a.ts' }
      });
      kb.insertRelation({
        subjectId: 'src/b.ts',
        predicate: 'imports',
        objectId: './c',
        source: { kind: 'ast', file: 'src/b.ts' }
      });

      const importGraph = kb.getImportGraph();

      expect(importGraph.get('src/a.ts')?.has('./b')).toBe(true);
      expect(importGraph.get('src/b.ts')?.has('./c')).toBe(true);
    });

    it('should handle circular imports (A imports B imports A)', () => {
      kb.insertRelation({
        subjectId: 'src/a.ts',
        predicate: 'imports',
        objectId: './b',
        source: { kind: 'ast', file: 'src/a.ts' }
      });
      kb.insertRelation({
        subjectId: 'src/b.ts',
        predicate: 'imports',
        objectId: './a',
        source: { kind: 'ast', file: 'src/b.ts' }
      });

      const importGraph = kb.getImportGraph();

      expect(importGraph.get('src/a.ts')?.has('./b')).toBe(true);
      expect(importGraph.get('src/b.ts')?.has('./a')).toBe(true);
    });

    it('should handle multiple imports from same file', () => {
      kb.insertRelation({
        subjectId: 'src/a.ts',
        predicate: 'imports',
        objectId: './b',
        source: { kind: 'ast', file: 'src/a.ts' }
      });
      kb.insertRelation({
        subjectId: 'src/a.ts',
        predicate: 'imports',
        objectId: './c',
        source: { kind: 'ast', file: 'src/a.ts' }
      });
      kb.insertRelation({
        subjectId: 'src/a.ts',
        predicate: 'imports',
        objectId: 'express',
        source: { kind: 'ast', file: 'src/a.ts' }
      });

      const importGraph = kb.getImportGraph();

      expect(importGraph.get('src/a.ts')?.size).toBe(3);
      expect(importGraph.get('src/a.ts')?.has('./b')).toBe(true);
      expect(importGraph.get('src/a.ts')?.has('./c')).toBe(true);
      expect(importGraph.get('src/a.ts')?.has('express')).toBe(true);
    });
  });

  describe('getReverseDeps', () => {
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
        details: { resolved: true, originalExpression: 'functionA()' },
        source: { kind: 'ast', file: 'src/b.ts' }
      });
      kb.insertRelation({
        subjectId: funcC.id,
        predicate: 'calls',
        objectId: funcA.id,
        details: { resolved: true, originalExpression: 'functionA()' },
        source: { kind: 'ast', file: 'src/c.ts' }
      });

      // When: get reverse deps for A
      const reverseDeps = kb.getReverseDeps(funcA.id);

      // Then: B and C depend on A
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

    it('should include file-level import dependencies', () => {
      // Setup: src/a.ts imports src/b.ts, src/c.ts imports src/b.ts
      kb.insertRelation({
        subjectId: 'src/a.ts',
        predicate: 'imports',
        objectId: './b',  // Module specifier
        source: { kind: 'ast', file: 'src/a.ts' }
      });
      kb.insertRelation({
        subjectId: 'src/c.ts',
        predicate: 'imports',
        objectId: './b',
        source: { kind: 'ast', file: 'src/c.ts' }
      });

      // NOTE: Import relations use module specifiers as objectId, not resolved file paths
      // So we query by module specifier, not by file path
      const reverseDeps = kb.getReverseDeps('./b');

      // Then: should include both importing files
      expect(reverseDeps.size).toBe(2);
      expect(reverseDeps.has('src/a.ts')).toBe(true);
      expect(reverseDeps.has('src/c.ts')).toBe(true);
    });

    it('should handle mixed relations (calls + imports)', () => {
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

      // Import relation (file level)
      kb.insertRelation({
        subjectId: 'src/b.ts',
        predicate: 'imports',
        objectId: './a',
        source: { kind: 'ast', file: 'src/b.ts' }
      });

      // Call relation (entity level)
      kb.insertRelation({
        subjectId: funcB.id,
        predicate: 'calls',
        objectId: funcA.id,
        details: { resolved: true, originalExpression: 'functionA()' },
        source: { kind: 'ast', file: 'src/b.ts' }
      });

      // Check entity-level reverse dep
      const reverseDepsEntity = kb.getReverseDeps(funcA.id);
      expect(reverseDepsEntity.has(funcB.id)).toBe(true);

      // Check file-level reverse dep
      const reverseDepsFile = kb.getReverseDeps('./a');
      expect(reverseDepsFile.has('src/b.ts')).toBe(true);
    });

    it('should not include unresolved call relations in reverse deps', () => {
      const funcA: Entity = {
        id: 'func-a-abc123',
        kind: 'function',
        name: 'functionA',
        path: 'src/a.ts',
        exported: true
      };

      kb.insertEntity(funcA);

      // Unresolved call (should be skipped)
      kb.insertRelation({
        subjectId: funcA.id,
        predicate: 'calls',
        objectId: null,
        details: { resolved: false, originalExpression: 'externalLib()' },
        source: { kind: 'ast', file: 'src/a.ts' }
      });

      // Query reverse deps for the unresolved target
      const reverseDeps = kb.getReverseDeps('externalLib');

      expect(reverseDeps.size).toBe(0);
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
        details: { resolved: true, originalExpression: 'functionB()' },
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
        details: { resolved: true, originalExpression: 'functionB()' },
        source: { kind: 'ast', file: 'src/a.ts' }
      });

      // Build cache
      let callGraph = kb.getCallGraph();
      expect(callGraph.has(funcA.id)).toBe(true);
      expect(callGraph.get(funcA.id)?.has(funcC.id)).toBe(false);

      // Add new relation
      kb.insertRelation({
        subjectId: funcA.id,
        predicate: 'calls',
        objectId: funcC.id,
        details: { resolved: true, originalExpression: 'functionC()' },
        source: { kind: 'ast', file: 'src/a.ts' }
      });

      // Cache should be invalidated and rebuilt
      callGraph = kb.getCallGraph();
      expect(callGraph.get(funcA.id)?.has(funcC.id)).toBe(true);
    });

    it('should invalidate all caches when relation added', () => {
      const funcA: Entity = {
        id: 'func-a-abc123',
        kind: 'function',
        name: 'functionA',
        path: 'src/a.ts',
        exported: true
      };

      kb.insertEntity(funcA);

      kb.insertRelation({
        subjectId: 'src/a.ts',
        predicate: 'imports',
        objectId: './b',
        source: { kind: 'ast', file: 'src/a.ts' }
      });

      // Build all caches
      const callGraph1 = kb.getCallGraph();
      const importGraph1 = kb.getImportGraph();
      const reverseDeps1 = kb.getReverseDeps(funcA.id);

      // Add new relation
      kb.insertRelation({
        subjectId: funcA.id,
        predicate: 'calls',
        objectId: 'some-id',
        details: { resolved: true, originalExpression: 'someFunc()' },
        source: { kind: 'ast', file: 'src/a.ts' }
      });

      // All caches should be invalidated (different references)
      const callGraph2 = kb.getCallGraph();
      const importGraph2 = kb.getImportGraph();

      expect(callGraph2).not.toBe(callGraph1);
      expect(importGraph2).not.toBe(importGraph1);
    });
  });
});
