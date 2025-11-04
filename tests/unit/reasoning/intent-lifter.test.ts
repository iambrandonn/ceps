/**
 * Phase 3 Step 3: IntentLifter Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IntentLifter } from '../../../src/reasoning/IntentLifter.js';
import { KnowledgeBase } from '../../../src/kb/knowledge-base.js';
import { PatternMatcher } from '../../../src/reasoning/PatternMatcher.js';
import { Entity, FactSet } from '../../../src/kb/models.js';

describe('IntentLifter', () => {
  let lifter: IntentLifter;
  let kb: KnowledgeBase;
  let matcher: PatternMatcher;

  beforeEach(() => {
    kb = new KnowledgeBase();
    matcher = new PatternMatcher(kb);
    lifter = new IntentLifter(kb, matcher);
  });

  describe('liftIntent', () => {
    it('should lift Express route handler to behavior chunk', () => {
      const entity: Entity = {
        id: 'func-handler',
        kind: 'function',
        name: 'getUserHandler',
        path: 'src/routes/users.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-1',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
          { subjectId: entity.id, predicate: 'calls-expression', object: 'app.get' },
          { subjectId: entity.id, predicate: 'call-arg-0', object: '/users/:id' },
          { subjectId: entity.id, predicate: 'has-jsdoc', object: 'Fetches user by ID' },
          { subjectId: entity.id, predicate: 'has-signature', object: '(req, res): void' },
          { subjectId: entity.id, predicate: 'is-exported', object: true },
        ],
        sources: [{ kind: 'ast', file: 'src/routes/users.ts' }],
        evidenceScore: 90,
      };
      kb.insertFactSet(factSet);

      const chunk = lifter.liftIntent([factSet.id]);

      // Verify correct field names (from PHASE3_PLAN_CORRECTIONS.md)
      expect(chunk.targetEntityId).toBe(entity.id); // NOT entityId
      expect(chunk.textDraft).toContain('GET'); // NOT text
      expect(chunk.textDraft).toContain('/users/:id');
      expect(chunk.textDraft).toContain('Fetches user by ID'); // JSDoc included
      expect(chunk.factSetIds).toEqual([factSet.id]); // Array, NOT single factSetId
      // Confidence: Base 40 (exported+jsdoc) + 15 (signature) - 5 (no callers) = 50 = Medium
      expect(chunk.confidence).toBe('Medium');
    });

    it('should lift React component with pattern-based text', () => {
      const entity: Entity = {
        id: 'func-button',
        kind: 'function',
        name: 'Button',
        path: 'src/Button.tsx',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-2',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
          { subjectId: entity.id, predicate: 'is-exported', object: true },
          { subjectId: entity.id, predicate: 'returns-jsx', object: true },
          { subjectId: entity.id, predicate: 'has-jsdoc', object: 'Clickable button component' },
          { subjectId: entity.id, predicate: 'has-signature', object: '(props): JSX.Element' },
        ],
        sources: [{ kind: 'ast', file: 'src/Button.tsx' }],
        evidenceScore: 90,
      };
      kb.insertFactSet(factSet);

      const chunk = lifter.liftIntent([factSet.id]);

      expect(chunk.targetEntityId).toBe(entity.id);
      expect(chunk.textDraft).toContain('Button');
      expect(chunk.textDraft).toContain('component');
      expect(chunk.textDraft).toContain('Clickable button component');
      // Confidence: Base 40 (exported+jsdoc) + 15 (signature) - 5 (no callers) = 50 = Medium
      expect(chunk.confidence).toBe('Medium');
    });

    it('should compute confidence using KB.scoreConfidence', () => {
      const entity: Entity = {
        id: 'func-doc',
        kind: 'function',
        name: 'wellDocumentedFunc',
        path: 'src/api.ts',
        exported: true,
        signature: '(x: number): number',
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-3',
        facts: [
          { subjectId: entity.id, predicate: 'is-exported', object: true },
          { subjectId: entity.id, predicate: 'has-jsdoc', object: 'Well documented' },
          { subjectId: entity.id, predicate: 'has-signature', object: '(x: number): number' },
        ],
        sources: [{ kind: 'ast', file: 'src/api.ts' }],
        evidenceScore: 90,
      };
      kb.insertFactSet(factSet);

      const chunk = lifter.liftIntent([factSet.id]);

      // Should use KB.scoreConfidence (returns 'High' for score ≥70)
      // Base: 40 (exported + jsdoc) + reinforcers: 15 (signature) = 55 = Medium
      expect(chunk.confidence).toBe('Medium');
    });

    it('should produce Low confidence chunk when no pattern matches', () => {
      const entity: Entity = {
        id: 'func-generic',
        kind: 'function',
        name: 'helperFunc',
        path: 'src/utils.ts',
        exported: false,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-4',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
        ],
        sources: [{ kind: 'ast', file: 'src/utils.ts' }],
        evidenceScore: 90,
      };
      kb.insertFactSet(factSet);

      const chunk = lifter.liftIntent([factSet.id]);

      // Base: 20 (no export, no jsdoc) - penalties: 5 (unused) = 15 = Low
      expect(chunk.confidence).toBe('Low');
      expect(chunk.textDraft).toContain('helperFunc');
      expect(chunk.textDraft).toContain('intent unclear');
    });

    it('should use JSDoc in generic text when available', () => {
      const entity: Entity = {
        id: 'func-helper',
        kind: 'function',
        name: 'formatDate',
        path: 'src/utils.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-5',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
          { subjectId: entity.id, predicate: 'has-jsdoc', object: 'Formats date as ISO string' },
        ],
        sources: [{ kind: 'ast', file: 'src/utils.ts' }],
        evidenceScore: 90,
      };
      kb.insertFactSet(factSet);

      const chunk = lifter.liftIntent([factSet.id]);

      expect(chunk.textDraft).toContain('formatDate');
      expect(chunk.textDraft).toContain('Formats date as ISO string');
      expect(chunk.textDraft).not.toContain('intent unclear');
    });

    it('should throw error when no factSets provided', () => {
      expect(() => lifter.liftIntent([])).toThrow('No factSets provided');
    });

    it('should throw error when factSet not found', () => {
      expect(() => lifter.liftIntent(['nonexistent'])).toThrow('FactSet nonexistent not found');
    });

    it('should throw error when entity not found', () => {
      const factSet: FactSet = {
        id: 'fs-orphan',
        facts: [
          { subjectId: 'nonexistent-entity', predicate: 'is-function', object: true },
        ],
        sources: [{ kind: 'ast', file: 'src/test.ts' }],
        evidenceScore: 90,
      };
      kb.insertFactSet(factSet);

      expect(() => lifter.liftIntent([factSet.id])).toThrow('Entity nonexistent-entity not found');
    });

    it('should generate deterministic chunk IDs', () => {
      const entity: Entity = {
        id: 'func-stable',
        kind: 'function',
        name: 'stableFunc',
        path: 'src/test.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-6',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
        ],
        sources: [{ kind: 'ast', file: 'src/test.ts' }],
        evidenceScore: 90,
      };
      kb.insertFactSet(factSet);

      const chunk1 = lifter.liftIntent([factSet.id]);

      // Create new lifter instance (simulates fresh run)
      const lifter2 = new IntentLifter(kb, matcher);
      const chunk2 = lifter2.liftIntent([factSet.id]);

      // IDs should be deterministic (same entity → same chunk ID)
      expect(chunk1.id).toBe(chunk2.id);
    });
  });
});
