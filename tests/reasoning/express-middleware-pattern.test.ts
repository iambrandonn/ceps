/**
 * Phase 6 I1: Express Middleware Pattern Tests
 *
 * Tests for detecting Express middleware functions (3-param: req, res, next).
 * Following TDD discipline - tests written before implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExpressMiddlewarePattern } from '../../src/reasoning/patterns/express/middleware.js';
import { KnowledgeBase } from '../../src/kb/knowledge-base.js';
import { Entity, FactSet } from '../../src/kb/models.js';
import { PatternPriority } from '../../src/reasoning/patterns/types.js';

describe('ExpressMiddlewarePattern', () => {
  let kb: KnowledgeBase;
  let pattern: ExpressMiddlewarePattern;

  beforeEach(() => {
    kb = new KnowledgeBase();
    pattern = new ExpressMiddlewarePattern();
  });

  describe('module metadata', () => {
    it('has correct ID', () => {
      expect(pattern.id).toBe('express.middleware');
    });

    it('has FRAMEWORK_CORE priority', () => {
      expect(pattern.priority).toBe(PatternPriority.FRAMEWORK_CORE);
    });
  });

  describe('matches()', () => {
    it('matches function with 3 params named req, res, next', () => {
      const entity: Entity = {
        id: 'middleware-1',
        kind: 'function',
        name: 'authMiddleware',
        path: 'middleware/auth.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-1',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
          { subjectId: entity.id, predicate: 'param-count', object: 3 },
          { subjectId: entity.id, predicate: 'param-names', object: 'req,res,next' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      expect(pattern.matches(kb, entity)).toBe(true);
    });

    it('matches with spaces in param-names', () => {
      const entity: Entity = {
        id: 'middleware-2',
        kind: 'function',
        name: 'loggingMiddleware',
        path: 'middleware/logging.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-2',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
          { subjectId: entity.id, predicate: 'param-count', object: 3 },
          { subjectId: entity.id, predicate: 'param-names', object: 'req, res, next' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      expect(pattern.matches(kb, entity)).toBe(true);
    });

    it('matches with case variations', () => {
      const entity: Entity = {
        id: 'middleware-3',
        kind: 'function',
        name: 'middleware',
        path: 'middleware/test.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-3',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
          { subjectId: entity.id, predicate: 'param-count', object: 3 },
          { subjectId: entity.id, predicate: 'param-names', object: 'Req,Res,Next' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      expect(pattern.matches(kb, entity)).toBe(true);
    });

    it('does not match function with wrong param count', () => {
      const entity: Entity = {
        id: 'not-middleware-1',
        kind: 'function',
        name: 'regularFunction',
        path: 'utils/helpers.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-4',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
          { subjectId: entity.id, predicate: 'param-count', object: 2 },
          { subjectId: entity.id, predicate: 'param-names', object: 'req,res' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      expect(pattern.matches(kb, entity)).toBe(false);
    });

    it('does not match function with wrong param names', () => {
      const entity: Entity = {
        id: 'not-middleware-2',
        kind: 'function',
        name: 'otherFunction',
        path: 'utils/helpers.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-5',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
          { subjectId: entity.id, predicate: 'param-count', object: 3 },
          { subjectId: entity.id, predicate: 'param-names', object: 'a,b,c' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      expect(pattern.matches(kb, entity)).toBe(false);
    });

    it('does not match non-function entities', () => {
      const entity: Entity = {
        id: 'not-function',
        kind: 'constant',
        name: 'middleware',
        path: 'constants.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-6',
        facts: [
          { subjectId: entity.id, predicate: 'is-constant', object: true },
          { subjectId: entity.id, predicate: 'param-count', object: 3 },
          { subjectId: entity.id, predicate: 'param-names', object: 'req,res,next' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      expect(pattern.matches(kb, entity)).toBe(false);
    });

    it('handles entity with no facts gracefully', () => {
      const entity: Entity = {
        id: 'no-facts',
        kind: 'function',
        name: 'emptyFunc',
        path: 'empty.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      expect(pattern.matches(kb, entity)).toBe(false);
    });

    it('does not throw on malformed data (error handling contract)', () => {
      const entity: Entity = {
        id: 'malformed',
        kind: 'function',
        name: 'badFunc',
        path: 'bad.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-7',
        facts: [
          { subjectId: entity.id, predicate: 'param-count', object: 'not-a-number' },
          { subjectId: entity.id, predicate: 'param-names', object: null },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      expect(() => pattern.matches(kb, entity)).not.toThrow();
      expect(pattern.matches(kb, entity)).toBe(false);
    });
  });

  describe('describe()', () => {
    it('generates behavior chunk for middleware', () => {
      const entity: Entity = {
        id: 'middleware-1',
        kind: 'function',
        name: 'authMiddleware',
        path: 'middleware/auth.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-1',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
          { subjectId: entity.id, predicate: 'param-count', object: 3 },
          { subjectId: entity.id, predicate: 'param-names', object: 'req,res,next' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].targetEntityId).toBe(entity.id);
      expect(chunks[0].textDraft).toContain('middleware');
      expect(chunks[0].textDraft).toContain('authMiddleware');
      expect(chunks[0].confidence).toBe('High');
      expect(chunks[0].factSetIds).toContain('fs-1');
    });

    it('includes app.use call if present', () => {
      const entity: Entity = {
        id: 'middleware-2',
        kind: 'function',
        name: 'corsMiddleware',
        path: 'middleware/cors.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-2',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
          { subjectId: entity.id, predicate: 'param-count', object: 3 },
          { subjectId: entity.id, predicate: 'param-names', object: 'req,res,next' },
          { subjectId: entity.id, predicate: 'calls-expression', object: 'app.use' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].textDraft).toContain('middleware');
    });

    it('returns empty array for non-matching entity (should not be called)', () => {
      const entity: Entity = {
        id: 'not-middleware',
        kind: 'function',
        name: 'regularFunc',
        path: 'utils/helpers.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const chunks = pattern.describe(kb, entity);
      expect(chunks).toEqual([]);
    });

    it('does not throw on error (error handling contract)', () => {
      const entity: Entity = {
        id: 'error-case',
        kind: 'function',
        name: 'badMiddleware',
        path: 'bad.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      // Intentionally broken data
      const factSet: FactSet = {
        id: 'fs-broken',
        facts: [
          { subjectId: entity.id, predicate: 'param-count', object: 3 },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      expect(() => pattern.describe(kb, entity)).not.toThrow();
    });
  });

  describe('confidenceAdjustments()', () => {
    it('returns positive adjustment for middleware pattern', () => {
      const entity: Entity = {
        id: 'middleware-1',
        kind: 'function',
        name: 'authMiddleware',
        path: 'middleware/auth.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-1',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
          { subjectId: entity.id, predicate: 'param-count', object: 3 },
          { subjectId: entity.id, predicate: 'param-names', object: 'req,res,next' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const delta = pattern.confidenceAdjustments?.(kb, entity);

      expect(delta).toBeDefined();
      expect(delta?.adjustment).toBeGreaterThan(0);
      expect(delta?.adjustment).toBeLessThanOrEqual(15); // Max per pattern
      expect(delta?.reason).toContain('Express');
    });
  });
});
