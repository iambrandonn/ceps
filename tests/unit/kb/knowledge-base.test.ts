import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeBase } from '../../../src/kb/knowledge-base';
import { Entity, FactSet, BehaviorChunk, OpenQuestion } from '../../../src/kb/models';

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

  // Phase 3 Step 4: BehaviorChunk Extensions
  describe('BehaviorChunk Extensions', () => {
    it('should return all chunks via getAllChunks', () => {
      kb.insertChunk({
        id: 'c1',
        targetEntityId: 'e1',
        textDraft: 'text1',
        confidence: 'High',
        factSetIds: ['fs1']
      });
      kb.insertChunk({
        id: 'c2',
        targetEntityId: 'e2',
        textDraft: 'text2',
        confidence: 'Low',
        factSetIds: ['fs2']
      });

      const chunks = kb.getAllChunks();
      expect(chunks).toHaveLength(2);
      expect(chunks.map(c => c.id)).toEqual(expect.arrayContaining(['c1', 'c2']));
    });

    it('should filter chunks by entity via getChunksByEntity', () => {
      kb.insertChunk({
        id: 'c1',
        targetEntityId: 'e1',
        textDraft: 'text1',
        confidence: 'High',
        factSetIds: ['fs1']
      });
      kb.insertChunk({
        id: 'c2',
        targetEntityId: 'e1',
        textDraft: 'text2',
        confidence: 'Medium',
        factSetIds: ['fs2']
      });
      kb.insertChunk({
        id: 'c3',
        targetEntityId: 'e2',
        textDraft: 'text3',
        confidence: 'Low',
        factSetIds: ['fs3']
      });

      const e1Chunks = kb.getChunksByEntity('e1');
      expect(e1Chunks).toHaveLength(2);
      expect(e1Chunks.map(c => c.id)).toEqual(expect.arrayContaining(['c1', 'c2']));
      expect(e1Chunks.map(c => c.id)).not.toContain('c3');
    });

    it('should return empty array for non-existent entity', () => {
      kb.insertChunk({
        id: 'c1',
        targetEntityId: 'e1',
        textDraft: 'text',
        confidence: 'High',
        factSetIds: ['fs1']
      });

      const chunks = kb.getChunksByEntity('e-nonexistent');
      expect(chunks).toEqual([]);
    });

    it('should update chunk confidence via updateChunk', () => {
      kb.insertChunk({
        id: 'c1',
        targetEntityId: 'e1',
        textDraft: 'text',
        confidence: 'Medium',
        factSetIds: ['fs1']
      });

      kb.updateChunk('c1', { confidence: 'High' });

      const updated = kb.getChunk('c1');
      expect(updated?.confidence).toBe('High');
      expect(updated?.textDraft).toBe('text'); // Other fields unchanged
    });

    it('should update multiple fields via updateChunk', () => {
      kb.insertChunk({
        id: 'c1',
        targetEntityId: 'e1',
        textDraft: 'old text',
        confidence: 'Medium',
        factSetIds: ['fs1']
      });

      kb.updateChunk('c1', {
        confidence: 'High',
        textDraft: 'new text',
        assumptions: ['Assumes valid input']
      });

      const updated = kb.getChunk('c1');
      expect(updated?.confidence).toBe('High');
      expect(updated?.textDraft).toBe('new text');
      expect(updated?.assumptions).toEqual(['Assumes valid input']);
    });

    it('should throw error when updating non-existent chunk', () => {
      expect(() => {
        kb.updateChunk('c-nonexistent', { confidence: 'High' });
      }).toThrow('Chunk c-nonexistent not found');
    });
  });

  // Phase 3 Step 4: OpenQuestion Storage
  describe('OpenQuestion Storage', () => {
    it('should store and retrieve open questions', () => {
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
      expect(retrieved[0].question).toBe('What does this do?');
    });

    it('should filter open questions by entity', () => {
      kb.insertOpenQuestion({
        qid: 'Q-function-1',
        entityId: 'e1',
        question: 'Q1',
        confidence: 20,
        factSetIds: ['fs1']
      });
      kb.insertOpenQuestion({
        qid: 'Q-function-2',
        entityId: 'e1',
        question: 'Q2',
        confidence: 25,
        factSetIds: ['fs2']
      });
      kb.insertOpenQuestion({
        qid: 'Q-class-1',
        entityId: 'e2',
        question: 'Q3',
        confidence: 30,
        factSetIds: ['fs3']
      });

      const e1Questions = kb.getOpenQuestionsByEntity('e1');
      expect(e1Questions).toHaveLength(2);
      expect(e1Questions.map(q => q.qid)).toEqual(expect.arrayContaining(['Q-function-1', 'Q-function-2']));
      expect(e1Questions.map(q => q.qid)).not.toContain('Q-class-1');
    });

    it('should return empty array for entity with no questions', () => {
      kb.insertOpenQuestion({
        qid: 'Q-function-1',
        entityId: 'e1',
        question: '?',
        confidence: 20,
        factSetIds: ['fs1']
      });

      const questions = kb.getOpenQuestionsByEntity('e-nonexistent');
      expect(questions).toEqual([]);
    });

    it('should return all open questions via getAllOpenQuestions', () => {
      kb.insertOpenQuestion({
        qid: 'Q-function-1',
        entityId: 'e1',
        question: '?',
        confidence: 20,
        factSetIds: ['fs1']
      });
      kb.insertOpenQuestion({
        qid: 'Q-class-1',
        entityId: 'e2',
        question: '?',
        confidence: 30,
        factSetIds: ['fs2']
      });

      const all = kb.getAllOpenQuestions();
      expect(all).toHaveLength(2);
      expect(all.map(q => q.qid)).toEqual(expect.arrayContaining(['Q-function-1', 'Q-class-1']));
    });

    it('should handle empty open questions gracefully', () => {
      const all = kb.getAllOpenQuestions();
      expect(all).toEqual([]);

      const byEntity = kb.getOpenQuestionsByEntity('e1');
      expect(byEntity).toEqual([]);
    });
  });
});
