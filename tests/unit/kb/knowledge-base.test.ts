import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeBase } from '../../../src/kb/knowledge-base';
import { Entity, FactSet, BehaviorChunk } from '../../../src/kb/models';

describe('KnowledgeBase', () => {
  let kb: KnowledgeBase;

  beforeEach(() => {
    kb = new KnowledgeBase();
  });

  describe('Entity Operations', () => {
    it('should insert an entity', () => {
      const entity: Entity = {
        id: 'entity-1',
        kind: 'function',
        name: 'fetchUser',
        path: 'src/api/users.ts',
      };
      kb.insertEntity(entity);
      expect(kb.getEntity('entity-1')).toEqual(entity);
    });

    // FIX CRITICAL-3: Test upsert semantics (no duplicate index entries)
    it('should handle re-inserting same entity ID without duplicating indices', () => {
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'v1', path: 'test.ts', exported: true });
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'v2', path: 'test.ts', exported: true });

      const entities = kb.findByPath('test.ts');
      expect(entities).toHaveLength(1); // Should not have duplicates
      expect(entities[0].name).toBe('v2'); // Should have updated name
    });

    it('should update an existing entity', () => {
      const entity: Entity = {
        id: 'entity-1',
        kind: 'function',
        name: 'fetchUser',
        path: 'src/api/users.ts',
      };
      kb.insertEntity(entity);
      kb.updateEntity('entity-1', { signature: 'fetchUser(id: string): Promise<User>' });
      expect(kb.getEntity('entity-1')?.signature).toBe('fetchUser(id: string): Promise<User>');
    });

    // FIX CRITICAL-4: Test that indices are updated when entity properties change
    it('should update indices when entity path changes', () => {
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'foo', path: 'old.ts', exported: false });
      kb.updateEntity('e1', { path: 'new.ts' });

      expect(kb.findByPath('old.ts')).toHaveLength(0);
      expect(kb.findByPath('new.ts')).toHaveLength(1);
      expect(kb.findByPath('new.ts')[0].id).toBe('e1');
    });

    it('should update exported index when entity export status changes', () => {
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'foo', path: 'test.ts', exported: false });
      kb.updateEntity('e1', { exported: true });

      const exported = kb.listExported();
      expect(exported).toHaveLength(1);
      expect(exported[0].id).toBe('e1');
    });

    it('should replace nested attributes object when updated', () => {
      kb.insertEntity({
        id: 'e1',
        kind: 'function',
        name: 'foo',
        path: 'test.ts',
        attributes: { sideEffects: ['old'] },
      });

      kb.updateEntity('e1', {
        attributes: { sideEffects: ['new'] },
      });

      const entity = kb.getEntity('e1');
      expect(entity?.attributes?.sideEffects).toEqual(['new']);
    });

    it('should throw error when updating nonexistent entity', () => {
      expect(() => kb.updateEntity('nonexistent', { name: 'test' })).toThrow(
        'Entity not found: nonexistent'
      );
    });

    it('should find entities by path', () => {
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'foo', path: 'src/test.ts' });
      kb.insertEntity({ id: 'e2', kind: 'function', name: 'bar', path: 'src/test.ts' });
      kb.insertEntity({ id: 'e3', kind: 'function', name: 'baz', path: 'src/other.ts' });

      const entities = kb.findByPath('src/test.ts');
      expect(entities).toHaveLength(2);
      expect(entities.map((e) => e.id).sort()).toEqual(['e1', 'e2']);
    });

    it('should list exported entities', () => {
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'foo', path: 'test.ts', exported: true });
      kb.insertEntity({ id: 'e2', kind: 'function', name: 'bar', path: 'test.ts', exported: false });

      const exported = kb.listExported();
      expect(exported).toHaveLength(1);
      expect(exported[0].id).toBe('e1');
    });
  });

  describe('FactSet Operations', () => {
    it('should insert a factSet', () => {
      const factSet: FactSet = {
        id: 'fs-1',
        facts: [{ subjectId: 'e1', predicate: 'calls', object: 'e2' }],
        sources: [{ kind: 'ast', file: 'test.ts' }],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);
      expect(kb.getFactSet('fs-1')).toEqual(factSet);
    });
  });

  describe('BehaviorChunk Operations', () => {
    it('should link a chunk to factSets', () => {
      const chunk: BehaviorChunk = {
        id: 'chunk-1',
        targetEntityId: 'e1',
        textDraft: 'This function fetches a user',
        factSetIds: ['fs-1', 'fs-2'],
        confidence: 'High',
      };
      kb.insertChunk(chunk);
      expect(kb.getChunk('chunk-1')).toEqual(chunk);
    });
  });

  describe('Batch Operations', () => {
    it('should support batch transactions', () => {
      kb.beginBatch();
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'foo', path: 'test.ts' });
      kb.insertEntity({ id: 'e2', kind: 'function', name: 'bar', path: 'test.ts' });
      kb.commit();

      expect(kb.getEntity('e1')).toBeDefined();
      expect(kb.getEntity('e2')).toBeDefined();
    });

    // FIX CRITICAL-1 & 2: Test that rollback actually works (deep clone)
    it('should rollback changes to entities', () => {
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'foo', path: 'test.ts' });

      kb.beginBatch();
      kb.updateEntity('e1', { name: 'bar' });
      kb.rollback();

      expect(kb.getEntity('e1')?.name).toBe('foo'); // Should be unchanged
    });

    it('should rollback new entities', () => {
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'foo', path: 'test.ts' });

      kb.beginBatch();
      kb.insertEntity({ id: 'e2', kind: 'function', name: 'bar', path: 'test.ts' });
      kb.rollback();

      expect(kb.getEntity('e1')).toBeDefined(); // Unchanged
      expect(kb.getEntity('e2')).toBeUndefined(); // Rolled back
    });

    it('should rollback index changes', () => {
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'foo', path: 'old.ts' });

      kb.beginBatch();
      kb.updateEntity('e1', { path: 'new.ts' });
      kb.rollback();

      expect(kb.findByPath('old.ts')).toHaveLength(1);
      expect(kb.findByPath('new.ts')).toHaveLength(0);
    });

    it('should throw error when calling beginBatch twice (nested batch)', () => {
      kb.beginBatch();
      expect(() => kb.beginBatch()).toThrow('Batch already in progress');
      kb.rollback(); // Clean up
    });

    it('should throw error when committing without batch', () => {
      expect(() => kb.commit()).toThrow('No batch in progress');
    });

    it('should throw error when rolling back without batch', () => {
      expect(() => kb.rollback()).toThrow('No batch in progress');
    });
  });

  describe('Stub APIs (Phase 3)', () => {
    it('should return Low confidence for non-existent factSets', () => {
      // Phase 3 Step 2: Real confidence scoring implemented (stub replaced)
      const score = kb.scoreConfidence(['fs-nonexistent']);
      expect(score).toBe('Low');  // Returns 0 → 'Low' for missing factSets
    });

    it('should return empty array for neighbors (stubbed)', () => {
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'foo', path: 'test.ts' });
      const neighbors = kb.neighbors('e1', 'calls');
      expect(neighbors).toEqual([]);
    });

    it('should return empty array for listOpenQuestions (stubbed)', () => {
      const questions = kb.listOpenQuestions();
      expect(questions).toEqual([]);
    });

    it('should allocate QID using generateQID', () => {
      const qid = kb.allocateQID('src/test.ts', 'foo', 'missing-type');
      expect(qid).toMatch(/^q:[a-zA-Z0-9]{10}$/);
    });

    it('should track allocated QIDs (idempotent allocation)', () => {
      const qid1 = kb.allocateQID('src/test.ts', 'foo', 'missing-type');
      expect(kb.validateQIDUniqueness(qid1)).toBe(false); // Already allocated

      // Calling allocateQID again with same inputs returns the same QID (idempotent)
      const qid2 = kb.allocateQID('src/test.ts', 'foo', 'missing-type');
      expect(qid2).toBe(qid1); // Same QID returned

      // Different entity produces different QID
      const qid3 = kb.allocateQID('src/test.ts', 'bar', 'missing-type');
      expect(qid3).not.toBe(qid1);
      expect(kb.validateQIDUniqueness(qid3)).toBe(false); // Also allocated
    });
  });
});
