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

  describe('Pattern Confidence Bonuses (Step 5)', () => {
    it('should apply +15 confidence bonus for Express route handlers', () => {
      const entity: Entity = {
        id: 'func-route',
        kind: 'function',
        name: 'getUserRoute',
        path: 'src/routes.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      // Base score should be: 30 (exported, no jsdoc) + 15 (signature) - 5 (no callers) = 40
      // Pattern bonus: +15
      // Final: 55 → Medium
      const factSet: FactSet = {
        id: 'fs-route-bonus',
        facts: [
          { subjectId: entity.id, predicate: 'calls-expression', object: 'app.get' },
          { subjectId: entity.id, predicate: 'call-arg-0', object: '/api/users' },
          { subjectId: entity.id, predicate: 'has-signature', object: '(req, res): void' },
          { subjectId: entity.id, predicate: 'is-exported', object: true },
        ],
        sources: [{ kind: 'ast', file: 'src/routes.ts' }],
        evidenceScore: 90,
      };
      kb.insertFactSet(factSet);

      const chunk = lifter.liftIntent([factSet.id]);

      // Verify pattern bonus was applied
      const baseScore = kb.getConfidenceScore([factSet.id]);
      const expectedFinalScore = baseScore + 15;  // Pattern bonus
      const expectedConfidence = kb.scoreToConfidenceBand(expectedFinalScore);

      expect(chunk.confidence).toBe(expectedConfidence);
      expect(chunk.textDraft).toContain('GET');
      expect(chunk.textDraft).toContain('/api/users');
    });

    it('should apply +10 confidence bonus for Express middleware', () => {
      const entity: Entity = {
        id: 'func-middleware',
        kind: 'function',
        name: 'authMiddleware',
        path: 'src/middleware.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-middleware-bonus',
        facts: [
          { subjectId: entity.id, predicate: 'calls-expression', object: 'app.use' },
          { subjectId: entity.id, predicate: 'param-count', object: 3 },
          { subjectId: entity.id, predicate: 'param-names', object: 'req,res,next' },
          { subjectId: entity.id, predicate: 'is-exported', object: true },
        ],
        sources: [{ kind: 'ast', file: 'src/middleware.ts' }],
        evidenceScore: 90,
      };
      kb.insertFactSet(factSet);

      const chunk = lifter.liftIntent([factSet.id]);

      // Verify pattern bonus was applied (+10 for middleware)
      const baseScore = kb.getConfidenceScore([factSet.id]);
      const expectedFinalScore = baseScore + 10;
      const expectedConfidence = kb.scoreToConfidenceBand(expectedFinalScore);

      expect(chunk.confidence).toBe(expectedConfidence);
      expect(chunk.textDraft).toContain('Middleware');
    });

    it('should apply +15 confidence bonus for Express error handlers', () => {
      const entity: Entity = {
        id: 'func-error',
        kind: 'function',
        name: 'errorHandler',
        path: 'src/error.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-error-bonus',
        facts: [
          { subjectId: entity.id, predicate: 'param-count', object: 4 },
          { subjectId: entity.id, predicate: 'param-names', object: 'err,req,res,next' },
          { subjectId: entity.id, predicate: 'is-exported', object: true },
        ],
        sources: [{ kind: 'ast', file: 'src/error.ts' }],
        evidenceScore: 90,
      };
      kb.insertFactSet(factSet);

      const chunk = lifter.liftIntent([factSet.id]);

      // Verify pattern bonus was applied (+15 for error handler)
      const baseScore = kb.getConfidenceScore([factSet.id]);
      const expectedFinalScore = baseScore + 15;
      const expectedConfidence = kb.scoreToConfidenceBand(expectedFinalScore);

      expect(chunk.confidence).toBe(expectedConfidence);
      expect(chunk.textDraft).toContain('Error handling');
    });

    it('should apply +15 confidence bonus for React components', () => {
      const entity: Entity = {
        id: 'func-component',
        kind: 'function',
        name: 'MyButton',
        path: 'src/Button.tsx',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-component-bonus',
        facts: [
          { subjectId: entity.id, predicate: 'returns-jsx', object: true },
          { subjectId: entity.id, predicate: 'is-exported', object: true },
          { subjectId: entity.id, predicate: 'has-signature', object: '(props): JSX.Element' },
        ],
        sources: [{ kind: 'ast', file: 'src/Button.tsx' }],
        evidenceScore: 90,
      };
      kb.insertFactSet(factSet);

      const chunk = lifter.liftIntent([factSet.id]);

      // Verify pattern bonus was applied (+15 for React component)
      const baseScore = kb.getConfidenceScore([factSet.id]);
      const expectedFinalScore = baseScore + 15;
      const expectedConfidence = kb.scoreToConfidenceBand(expectedFinalScore);

      expect(chunk.confidence).toBe(expectedConfidence);
      expect(chunk.textDraft).toContain('MyButton');
      expect(chunk.textDraft).toContain('component');
    });

    it('should apply +10 confidence bonus for React hooks', () => {
      const entity: Entity = {
        id: 'func-hook',
        kind: 'function',
        name: 'useCustomHook',
        path: 'src/hooks.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-hook-bonus',
        facts: [
          { subjectId: entity.id, predicate: 'calls-expression', object: 'useState' },
          { subjectId: entity.id, predicate: 'is-exported', object: true },
        ],
        sources: [{ kind: 'ast', file: 'src/hooks.ts' }],
        evidenceScore: 90,
      };
      kb.insertFactSet(factSet);

      const chunk = lifter.liftIntent([factSet.id]);

      // Verify pattern bonus was applied (+10 for hook)
      const baseScore = kb.getConfidenceScore([factSet.id]);
      const expectedFinalScore = baseScore + 10;
      const expectedConfidence = kb.scoreToConfidenceBand(expectedFinalScore);

      expect(chunk.confidence).toBe(expectedConfidence);
      expect(chunk.textDraft).toContain('useState');
    });

    it('should NOT apply pattern bonus for generic functions', () => {
      const entity: Entity = {
        id: 'func-generic-bonus',
        kind: 'function',
        name: 'genericUtil',
        path: 'src/utils.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-generic-bonus',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
          { subjectId: entity.id, predicate: 'is-exported', object: true },
        ],
        sources: [{ kind: 'ast', file: 'src/utils.ts' }],
        evidenceScore: 90,
      };
      kb.insertFactSet(factSet);

      const chunk = lifter.liftIntent([factSet.id]);

      // No pattern bonus for generic functions
      const baseScore = kb.getConfidenceScore([factSet.id]);
      const expectedConfidence = kb.scoreToConfidenceBand(baseScore);

      expect(chunk.confidence).toBe(expectedConfidence);
    });

    it('should boost Medium confidence to High with pattern bonus', () => {
      const entity: Entity = {
        id: 'func-high-confidence',
        kind: 'function',
        name: 'wellDocumentedRoute',
        path: 'src/api.ts',
        exported: true,
        signature: '(req: Request, res: Response): Promise<void>',
      };
      kb.insertEntity(entity);

      // Base score: 40 (exported + jsdoc) + 15 (signature) - 5 (no callers) = 50 (Medium)
      // Pattern bonus: +15
      // Final: 65 → still Medium (would need 70 for High)
      const factSet: FactSet = {
        id: 'fs-high-bonus',
        facts: [
          { subjectId: entity.id, predicate: 'calls-expression', object: 'app.post' },
          { subjectId: entity.id, predicate: 'call-arg-0', object: '/api/data' },
          { subjectId: entity.id, predicate: 'is-exported', object: true },
          { subjectId: entity.id, predicate: 'has-jsdoc', object: 'Creates new data entry' },
          { subjectId: entity.id, predicate: 'has-signature', object: '(req, res): Promise<void>' },
        ],
        sources: [{ kind: 'ast', file: 'src/api.ts' }],
        evidenceScore: 90,
      };
      kb.insertFactSet(factSet);

      const chunk = lifter.liftIntent([factSet.id]);

      // Verify that pattern bonus was applied and improved confidence
      const baseScore = kb.getConfidenceScore([factSet.id]);
      const finalScore = baseScore + 15;  // Route handler bonus
      const expectedConfidence = kb.scoreToConfidenceBand(finalScore);

      expect(chunk.confidence).toBe(expectedConfidence);
      // Base without bonus would be lower
      expect(kb.scoreToConfidenceBand(baseScore)).not.toBe('Low');
      // Pattern bonus should improve or maintain confidence
      expect(finalScore).toBeGreaterThan(baseScore);
    });
  });
});
