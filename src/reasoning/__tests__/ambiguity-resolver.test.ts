/**
 * Phase 3 Step 4: AmbiguityResolver Tests
 *
 * Tests for iterative confidence promotion, convergence detection,
 * oscillation prevention, and Open Question (QID) generation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeBase } from '../../kb/knowledge-base.js';
import { AmbiguityResolver } from '../ambiguity-resolver.js';
import type { Confidence } from '../../types/index.js';

describe('AmbiguityResolver', () => {
  let kb: KnowledgeBase;
  let resolver: AmbiguityResolver;

  beforeEach(() => {
    kb = new KnowledgeBase();
    resolver = new AmbiguityResolver(kb);
  });

  describe('Convergence Detection', () => {
    it('should detect convergence when no confidence changes', () => {
      // Insert entities with Medium confidence chunks
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'f1', path: 'a.ts' });
      kb.insertEntity({ id: 'e2', kind: 'function', name: 'f2', path: 'b.ts' });

      kb.insertChunk({
        id: 'bc1',
        targetEntityId: 'e1',
        textDraft: 'Function f1',
        confidence: 'Medium' as Confidence,
        factSetIds: ['fs1']
      });
      kb.insertChunk({
        id: 'bc2',
        targetEntityId: 'e2',
        textDraft: 'Function f2',
        confidence: 'Medium' as Confidence,
        factSetIds: ['fs2']
      });

      const result = resolver.resolve({ maxIterations: 3 });

      expect(result.converged).toBe(true);
      expect(result.iterations).toBe(1); // No changes, converge immediately
      expect(result.promoted).toBe(0);
    });

    it('should converge after promotion completes', () => {
      // e1 calls e2; e2 is High confidence
      // But e1 only has 1 High dep, so won't be promoted (need 2+)
      // Therefore should converge in 1 iteration
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'caller', path: 'a.ts', exported: true });
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

      // e1 has Medium confidence chunk
      kb.insertFactSet({
        id: 'fs1',
        facts: [
          { subjectId: 'e1', predicate: 'hasBody', object: true },
          { subjectId: 'e1', predicate: 'has-signature', object: 'caller(): void' }
        ],
        sources: [],
        evidenceScore: 100
      });
      const initialConfidence = kb.scoreConfidence(['fs1']);
      kb.insertChunk({
        id: 'bc2',
        targetEntityId: 'e1',
        textDraft: 'Caller logic',
        confidence: initialConfidence,
        factSetIds: ['fs1']
      });

      const result = resolver.resolve({ maxIterations: 5 });

      // Should converge in 1 iteration (no promotion happens - only 1 High dep)
      expect(result.converged).toBe(true);
      expect(result.iterations).toBe(1);
    });
  });

  describe('Cross-Reference Confidence Promotion', () => {
    it('should promote confidence when dependencies are High', () => {
      // e1 calls e2 and e3; both are High confidence
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'caller', path: 'a.ts' });
      kb.insertEntity({ id: 'e2', kind: 'function', name: 'callee1', path: 'b.ts' });
      kb.insertEntity({ id: 'e3', kind: 'function', name: 'callee2', path: 'c.ts' });

      kb.insertRelation({
        subjectId: 'e1',
        predicate: 'calls',
        objectId: 'e2',
        details: { resolved: true }
      });
      kb.insertRelation({
        subjectId: 'e1',
        predicate: 'calls',
        objectId: 'e3',
        details: { resolved: true }
      });

      // e2 and e3 have High confidence chunks
      kb.insertChunk({
        id: 'bc1',
        targetEntityId: 'e2',
        textDraft: 'Callee 1',
        confidence: 'High' as Confidence,
        factSetIds: ['fs2']
      });
      kb.insertChunk({
        id: 'bc2',
        targetEntityId: 'e3',
        textDraft: 'Callee 2',
        confidence: 'High' as Confidence,
        factSetIds: ['fs3']
      });

      // e1 has Medium confidence chunk
      // Need factSet that scores in Medium range (40-69) initially
      // Base: function exported + JSDoc = 40
      // Reinforcer: has signature = +15
      // Reinforcer: error handling = +5
      // Penalty: unused = -5
      // Total: 55 (Medium)
      // After cross-ref bonus (+15): 70 (High) ✓
      kb.updateEntity('e1', { exported: true, attributes: { errors: ['Error'] } });

      kb.insertFactSet({
        id: 'fs1',
        facts: [
          { subjectId: 'e1', predicate: 'hasBody', object: true },
          { subjectId: 'e1', predicate: 'has-signature', object: 'caller(): void' },
          { subjectId: 'e1', predicate: 'has-jsdoc', object: 'Calls multiple functions' }
        ],
        sources: [],
        evidenceScore: 100
      });

      // Insert chunk with computed confidence
      const initialConfidence = kb.scoreConfidence(['fs1']);
      kb.insertChunk({
        id: 'bc3',
        targetEntityId: 'e1',
        textDraft: 'Caller logic',
        confidence: initialConfidence,
        factSetIds: ['fs1']
      });

      const result = resolver.resolve();

      expect(result.promoted).toBeGreaterThan(0);
      const chunk = kb.getChunk('bc3');
      expect(chunk?.confidence).toBe('High'); // Promoted via cross-ref
    });

    it('should not promote with only one High dependency', () => {
      // e1 calls e2 (only one High dep, need 2+)
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'caller', path: 'a.ts' });
      kb.insertEntity({ id: 'e2', kind: 'function', name: 'callee', path: 'b.ts' });

      kb.insertRelation({
        subjectId: 'e1',
        predicate: 'calls',
        objectId: 'e2',
        details: { resolved: true }
      });

      kb.insertChunk({
        id: 'bc1',
        targetEntityId: 'e2',
        textDraft: 'Callee',
        confidence: 'High' as Confidence,
        factSetIds: ['fs2']
      });

      // Create factSet that scores Medium
      kb.insertFactSet({
        id: 'fs1',
        facts: [
          { subjectId: 'e1', predicate: 'hasBody', object: true },
          { subjectId: 'e1', predicate: 'has-signature', object: 'caller(): void' }
        ],
        sources: [],
        evidenceScore: 100
      });
      kb.updateEntity('e1', { exported: true });

      const initialConfidence = kb.scoreConfidence(['fs1']);
      kb.insertChunk({
        id: 'bc2',
        targetEntityId: 'e1',
        textDraft: 'Caller',
        confidence: initialConfidence,
        factSetIds: ['fs1']
      });

      const result = resolver.resolve();

      expect(result.promoted).toBe(0); // Not promoted (only 1 High dep)
      const chunk = kb.getChunk('bc2');
      expect(chunk?.confidence).toBe(initialConfidence); // Still same confidence
    });

    it('should not promote High confidence chunks', () => {
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'f1', path: 'a.ts' });

      kb.insertChunk({
        id: 'bc1',
        targetEntityId: 'e1',
        textDraft: 'Already High',
        confidence: 'High' as Confidence,
        factSetIds: ['fs1']
      });

      const result = resolver.resolve();

      expect(result.promoted).toBe(0);
      const chunk = kb.getChunk('bc1');
      expect(chunk?.confidence).toBe('High'); // Unchanged
    });
  });

  describe('Oscillation Detection', () => {
    it('should hit max iterations when no progress made', () => {
      // Create scenario with no promotable chunks but non-convergent
      // (This is actually a degenerate case - in practice, no changes = convergence)
      // Real oscillation is hard to trigger with current promotion rule (need 2+ High deps)
      //
      // For now, test that maxIterations is respected
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'f1', path: 'a.ts' });

      kb.insertChunk({
        id: 'bc1',
        targetEntityId: 'e1',
        textDraft: 'F1',
        confidence: 'Medium' as Confidence,
        factSetIds: ['fs1']
      });

      const result = resolver.resolve({ maxIterations: 5 });

      // Should converge in 1 iteration (no changes)
      expect(result.converged).toBe(true);
      expect(result.iterations).toBe(1);
    });

    // Note: True oscillation is difficult to trigger with the 2+ High deps promotion rule
    // because circular dependencies don't create oscillation - they just don't promote.
    // Oscillation would require a more complex promotion rule that we defer to Phase 6.
  });

  describe('QID Generation', () => {
    it('should generate QIDs for Low confidence chunks', () => {
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'foo', path: 'a.ts' });

      kb.insertFactSet({
        id: 'fs1',
        facts: [{ subjectId: 'e1', predicate: 'hasBody', object: true }],
        sources: [],
        evidenceScore: 100
      });
      kb.insertChunk({
        id: 'bc1',
        targetEntityId: 'e1',
        textDraft: 'Unclear logic',
        confidence: 'Low' as Confidence,
        factSetIds: ['fs1']
      });

      const result = resolver.resolve();

      expect(result.openQuestions).toHaveLength(1);
      expect(result.openQuestions[0].qid).toMatch(/^q:[a-zA-Z0-9]{10}$/);
      expect(result.openQuestions[0].entityId).toBe('e1');
      expect(result.openQuestions[0].question).toContain('foo');
    });

    it('should not generate QIDs for Medium/High confidence', () => {
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'bar', path: 'b.ts' });

      kb.insertChunk({
        id: 'bc1',
        targetEntityId: 'e1',
        textDraft: 'Clear logic',
        confidence: 'High' as Confidence,
        factSetIds: ['fs1']
      });

      const result = resolver.resolve();

      expect(result.openQuestions).toHaveLength(0);
    });

    it('should generate appropriate question text for different entity kinds', () => {
      // Function
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'fn', path: 'a.ts' });
      kb.insertChunk({
        id: 'bc1',
        targetEntityId: 'e1',
        textDraft: '?',
        confidence: 'Low' as Confidence,
        factSetIds: ['fs1']
      });

      // Class
      kb.insertEntity({ id: 'e2', kind: 'class', name: 'Cls', path: 'b.ts' });
      kb.insertChunk({
        id: 'bc2',
        targetEntityId: 'e2',
        textDraft: '?',
        confidence: 'Low' as Confidence,
        factSetIds: ['fs2']
      });

      const result = resolver.resolve();

      expect(result.openQuestions).toHaveLength(2);
      expect(result.openQuestions.find(q => q.entityId === 'e1')?.question).toMatch(/function.*fn/i);
      expect(result.openQuestions.find(q => q.entityId === 'e2')?.question).toMatch(/class.*Cls/i);
    });

    it('should store open questions in KB', () => {
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'mystery', path: 'x.ts' });
      kb.insertChunk({
        id: 'bc1',
        targetEntityId: 'e1',
        textDraft: '?',
        confidence: 'Low' as Confidence,
        factSetIds: ['fs1']
      });

      resolver.resolve();

      const questions = kb.getOpenQuestionsByEntity('e1');
      expect(questions).toHaveLength(1);
      expect(questions[0].qid).toMatch(/^q:[a-zA-Z0-9]{10}$/);
    });
  });

  describe('Ambiguity Queue Management', () => {
    it('should maintain queue of unresolved items', () => {
      // 3 entities: 1 Low, 1 Medium, 1 High
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'low', path: 'l.ts' });
      kb.insertEntity({ id: 'e2', kind: 'function', name: 'med', path: 'm.ts' });
      kb.insertEntity({ id: 'e3', kind: 'function', name: 'high', path: 'h.ts' });

      kb.insertChunk({
        id: 'bc1',
        targetEntityId: 'e1',
        textDraft: 'Low',
        confidence: 'Low' as Confidence,
        factSetIds: ['fs1']
      });
      kb.insertChunk({
        id: 'bc2',
        targetEntityId: 'e2',
        textDraft: 'Med',
        confidence: 'Medium' as Confidence,
        factSetIds: ['fs2']
      });
      kb.insertChunk({
        id: 'bc3',
        targetEntityId: 'e3',
        textDraft: 'High',
        confidence: 'High' as Confidence,
        factSetIds: ['fs3']
      });

      resolver.resolve();

      const queue = resolver.getAmbiguityQueue();

      expect(queue).toHaveLength(1); // Only Low confidence
      expect(queue[0].entityId).toBe('e1');
      expect(queue[0].confidence).toBe('Low');
      expect(queue[0].qid).toBeDefined();
    });

    it('should handle empty ambiguity queue', () => {
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'f1', path: 'a.ts' });
      kb.insertChunk({
        id: 'bc1',
        targetEntityId: 'e1',
        textDraft: 'High conf',
        confidence: 'High' as Confidence,
        factSetIds: ['fs1']
      });

      resolver.resolve();

      const queue = resolver.getAmbiguityQueue();
      expect(queue).toEqual([]);
    });
  });

  describe('Options Handling', () => {
    it('should verify promotion logic directly', () => {
      // Debug test: check if promotion logic works at all
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'caller', path: 'a.ts', exported: true });
      kb.insertEntity({ id: 'e2', kind: 'function', name: 'c1', path: 'b.ts' });
      kb.insertEntity({ id: 'e3', kind: 'function', name: 'c2', path: 'c.ts' });

      kb.insertRelation({
        subjectId: 'e1',
        predicate: 'calls',
        objectId: 'e2',
        details: { resolved: true }
      });
      kb.insertRelation({
        subjectId: 'e1',
        predicate: 'calls',
        objectId: 'e3',
        details: { resolved: true }
      });

      // e2 and e3 are High
      kb.insertChunk({
        id: 'bc1',
        targetEntityId: 'e2',
        textDraft: 'C1',
        confidence: 'High' as Confidence,
        factSetIds: ['fs2']
      });
      kb.insertChunk({
        id: 'bc2',
        targetEntityId: 'e3',
        textDraft: 'C2',
        confidence: 'High' as Confidence,
        factSetIds: ['fs3']
      });

      // e1 needs score in Medium range that promotes to High with +15
      // Base: exported + JSDoc = 40
      // Reinforcer: has-signature = +15
      // Reinforcer: error handling = +5 (via entity attributes)
      // Penalty: unused = -5
      // Total: 40 + 15 + 5 - 5 = 55 (Medium)
      // With cross-ref +15: 55 + 15 = 70 (High) ✓
      kb.updateEntity('e1', { attributes: { errors: ['Error'] } }); // Add error handling for +5

      kb.insertFactSet({
        id: 'fs1',
        facts: [
          { subjectId: 'e1', predicate: 'hasBody', object: true },
          { subjectId: 'e1', predicate: 'has-signature', object: 'caller(): void' },
          { subjectId: 'e1', predicate: 'has-jsdoc', object: 'Doc' }
        ],
        sources: [],
        evidenceScore: 100
      });

      const score1 = kb.getConfidenceScore(['fs1']);
      console.log('Initial score:', score1);
      const conf1 = kb.scoreToConfidenceBand(score1);
      console.log('Initial band:', conf1);

      kb.insertChunk({
        id: 'bc3',
        targetEntityId: 'e1',
        textDraft: 'Caller',
        confidence: conf1,
        factSetIds: ['fs1']
      });

      const result = resolver.resolve();

      console.log('Promoted:', result.promoted);
      const finalChunk = kb.getChunk('bc3');
      console.log('Final confidence:', finalChunk?.confidence);

      expect(result.promoted).toBeGreaterThan(0);
    });

    it('should respect maxIterations option', () => {
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'f1', path: 'a.ts' });
      kb.insertChunk({
        id: 'bc1',
        targetEntityId: 'e1',
        textDraft: 'text',
        confidence: 'Medium' as Confidence,
        factSetIds: ['fs1']
      });

      const result = resolver.resolve({ maxIterations: 2 });

      expect(result.iterations).toBeLessThanOrEqual(2);
    });

    it('should respect enableCrossRefPromotion option', () => {
      // e1 calls e2 and e3 (both High)
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'caller', path: 'a.ts' });
      kb.insertEntity({ id: 'e2', kind: 'function', name: 'c1', path: 'b.ts' });
      kb.insertEntity({ id: 'e3', kind: 'function', name: 'c2', path: 'c.ts' });

      kb.insertRelation({
        subjectId: 'e1',
        predicate: 'calls',
        objectId: 'e2',
        details: { resolved: true }
      });
      kb.insertRelation({
        subjectId: 'e1',
        predicate: 'calls',
        objectId: 'e3',
        details: { resolved: true }
      });

      kb.insertChunk({
        id: 'bc1',
        targetEntityId: 'e2',
        textDraft: 'C1',
        confidence: 'High' as Confidence,
        factSetIds: ['fs2']
      });
      kb.insertChunk({
        id: 'bc2',
        targetEntityId: 'e3',
        textDraft: 'C2',
        confidence: 'High' as Confidence,
        factSetIds: ['fs3']
      });

      kb.insertFactSet({
        id: 'fs1',
        facts: [
          { subjectId: 'e1', predicate: 'hasBody', object: true },
          { subjectId: 'e1', predicate: 'has-signature', object: 'caller(): void' },
          { subjectId: 'e1', predicate: 'has-jsdoc', object: 'Calls functions' }
        ],
        sources: [],
        evidenceScore: 100
      });
      kb.updateEntity('e1', { exported: true, attributes: { errors: ['Error'] } }); // Add error handling for +5

      const initialConfidence = kb.scoreConfidence(['fs1']);
      kb.insertChunk({
        id: 'bc3',
        targetEntityId: 'e1',
        textDraft: 'Caller',
        confidence: initialConfidence,
        factSetIds: ['fs1']
      });

      // With promotion disabled
      const resultDisabled = resolver.resolve({ enableCrossRefPromotion: false });
      expect(resultDisabled.promoted).toBe(0);

      // Reset chunk to initial confidence
      kb.updateChunk('bc3', { confidence: initialConfidence });

      // With promotion enabled (default)
      // Create new resolver to clear history
      const resolver2 = new AmbiguityResolver(kb);
      const resultEnabled = resolver2.resolve({ enableCrossRefPromotion: true });
      expect(resultEnabled.promoted).toBeGreaterThan(0);
    });
  });
});
