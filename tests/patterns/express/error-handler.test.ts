/**
 * Phase 6 I2: Express Error Handler Pattern Tests
 *
 * Tests detection of Express error middleware (4-param signature).
 * Error handlers have higher priority than standard middleware (priority 2).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeBase } from '../../../src/kb/knowledge-base.js';
import { ExpressErrorHandlerPattern } from '../../../src/reasoning/patterns/express/error-handler.js';
import type { Entity, FactSet } from '../../../src/kb/models.js';

describe('Express Error Handler Pattern', () => {
  let kb: KnowledgeBase;
  let pattern: ExpressErrorHandlerPattern;

  beforeEach(() => {
    kb = new KnowledgeBase();
    pattern = new ExpressErrorHandlerPattern();
  });

  // Helper to add parameter facts
  function addParameterFacts(entityId: string, params: string[]) {
    const facts: FactSet = {
      id: `fs-params-${entityId}`,
      facts: [
        {
          subjectId: entityId,
          predicate: 'param-count',
          object: params.length,
        },
        {
          subjectId: entityId,
          predicate: 'param-names',
          object: params.join(','),  // comma-separated
        },
      ],
      sources: [],
      evidenceScore: 80,
    };
    kb.insertFactSet(facts);
  }

  // Helper to add async facts
  function addAsyncFacts(entityId: string) {
    const facts: FactSet = {
      id: `fs-async-${entityId}`,
      facts: [
        {
          subjectId: entityId,
          predicate: 'is-async',
          object: 'true',
        },
      ],
      sources: [],
      evidenceScore: 80,
    };
    kb.insertFactSet(facts);
  }

  describe('Pattern Matching (matches)', () => {
    it('should detect 4-param error middleware', () => {
      const errorHandler: Entity = {
        id: 'ent_1',
        kind: 'function',
        name: 'errorHandler',
        path: 'middleware.ts',
      };

      kb.insertEntity(errorHandler);
      addParameterFacts(errorHandler.id, ['err', 'req', 'res', 'next']);

      expect(pattern.matches(kb, errorHandler)).toBe(true);
    });

    it('should NOT match 3-param standard middleware', () => {
      const middleware: Entity = {
        id: 'ent_2',
        kind: 'function',
        name: 'authMiddleware',
        path: 'middleware.ts',
      };

      kb.insertEntity(middleware);
      addParameterFacts(middleware.id, ['req', 'res', 'next']);

      expect(pattern.matches(kb, middleware)).toBe(false);
    });

    it('should NOT match 4-param function with wrong parameter names', () => {
      const regularFunc: Entity = {
        id: 'ent_3',
        kind: 'function',
        name: 'processData',
        path: 'utils.ts',
      };

      kb.insertEntity(regularFunc);
      addParameterFacts(regularFunc.id, ['a', 'b', 'c', 'd']);

      expect(pattern.matches(kb, regularFunc)).toBe(false);
    });

    it('should work with polluted KB (multiple functions)', () => {
      // Add standard middleware
      const middleware: Entity = {
        id: 'ent_1',
        kind: 'function',
        name: 'authMiddleware',
        path: 'middleware.ts',
      };
      kb.insertEntity(middleware);
      addParameterFacts(middleware.id, ['req', 'res', 'next']);

      // Add error handler
      const errorHandler: Entity = {
        id: 'ent_2',
        kind: 'function',
        name: 'errorHandler',
        path: 'middleware.ts',
      };
      kb.insertEntity(errorHandler);
      addParameterFacts(errorHandler.id, ['err', 'req', 'res', 'next']);

      // Add generic function with 4 params
      const genericFunc: Entity = {
        id: 'ent_3',
        kind: 'function',
        name: 'processData',
        path: 'utils.ts',
      };
      kb.insertEntity(genericFunc);
      addParameterFacts(genericFunc.id, ['a', 'b', 'c', 'd']);

      // Should match ONLY the error handler
      expect(pattern.matches(kb, middleware)).toBe(false);
      expect(pattern.matches(kb, errorHandler)).toBe(true);
      expect(pattern.matches(kb, genericFunc)).toBe(false);
    });

    it('should NOT match 4-param with partial signature match', () => {
      const partialMatch: Entity = {
        id: 'ent_4',
        kind: 'function',
        name: 'customHandler',
        path: 'middleware.ts',
      };

      kb.insertEntity(partialMatch);
      // err and req match, but res and callback don't
      addParameterFacts(partialMatch.id, ['err', 'req', 'res', 'callback']);

      expect(pattern.matches(kb, partialMatch)).toBe(false);
    });

    it('should NOT match 5+ param functions', () => {
      const fiveParamFunc: Entity = {
        id: 'ent_5',
        kind: 'function',
        name: 'complexHandler',
        path: 'utils.ts',
      };

      kb.insertEntity(fiveParamFunc);
      addParameterFacts(fiveParamFunc.id, ['err', 'req', 'res', 'next', 'extra']);

      expect(pattern.matches(kb, fiveParamFunc)).toBe(false);
    });

    it('should NOT match 4-param function named "errorHandler" with wrong signature', () => {
      const wrongSig: Entity = {
        id: 'ent_6',
        kind: 'function',
        name: 'errorHandler', // Name suggests error handler
        path: 'middleware.ts',
      };

      kb.insertEntity(wrongSig);
      // Wrong parameter names
      addParameterFacts(wrongSig.id, ['a', 'b', 'c', 'd']);

      expect(pattern.matches(kb, wrongSig)).toBe(false);
    });
  });

  describe('Behavior Description (describe)', () => {
    it('should generate error handler behavior chunk', () => {
      const errorHandler: Entity = {
        id: 'ent_1',
        kind: 'function',
        name: 'errorHandler',
        path: 'middleware.ts',
      };

      kb.insertEntity(errorHandler);
      addParameterFacts(errorHandler.id, ['err', 'req', 'res', 'next']);

      const chunks = pattern.describe(kb, errorHandler);

      expect(chunks).toHaveLength(1);
      const chunk = chunks[0];

      // Verify chunk structure
      expect(chunk.id).toBeDefined();
      expect(chunk.targetEntityId).toBe(errorHandler.id);
      expect(chunk.textDraft).toContain('errorHandler');
      expect(chunk.textDraft).toMatch(/Express error handler/i);
      expect(chunk.textDraft).toMatch(/middleware/i);

      // Should mention entity name
      expect(chunk.textDraft).toContain('errorHandler');

      // Should have factSet IDs for grounding
      expect(chunk.factSetIds.length).toBeGreaterThan(0);
    });

    it('should mention typical error handling responsibilities', () => {
      const errorHandler: Entity = {
        id: 'ent_1',
        kind: 'function',
        name: 'errorHandler',
        path: 'middleware.ts',
      };

      kb.insertEntity(errorHandler);
      addParameterFacts(errorHandler.id, ['err', 'req', 'res', 'next']);

      const chunks = pattern.describe(kb, errorHandler);
      const text = chunks[0].textDraft;

      // Should mention error-related concepts
      expect(text).toMatch(/error/i);
      expect(text).toMatch(/middleware chain/i);
    });

    it('should include confidence adjustment (+10)', () => {
      const errorHandler: Entity = {
        id: 'ent_1',
        kind: 'function',
        name: 'errorHandler',
        path: 'middleware.ts',
      };

      kb.insertEntity(errorHandler);
      addParameterFacts(errorHandler.id, ['err', 'req', 'res', 'next']);

      // Check confidence adjustment
      const adjustments = pattern.confidenceAdjustments?.(kb, errorHandler);
      expect(adjustments).toEqual({ delta: 10, reason: 'Express error handler (4-param middleware)' });
    });
  });

  describe('Error Handling Contract', () => {
    it('should NOT throw on missing facts', () => {
      const entity: Entity = {
        id: 'ent_1',
        kind: 'function',
        name: 'brokenFunc',
        path: 'broken.ts',
      };

      kb.insertEntity(entity);
      // No facts added - malformed entity

      expect(() => pattern.matches(kb, entity)).not.toThrow();
      expect(() => pattern.describe(kb, entity)).not.toThrow();
    });

    it('should return Low confidence Open Question for malformed entity', () => {
      const entity: Entity = {
        id: 'ent_1',
        kind: 'function',
        name: 'brokenFunc',
        path: 'broken.ts',
      };

      kb.insertEntity(entity);
      addParameterFacts(entity.id, ['a', 'b', 'c', 'd']); // Wrong param names

      const chunks = pattern.describe(kb, entity);
      expect(chunks).toHaveLength(1);

      // Should emit diagnostic Open Question
      expect(chunks[0].confidence).toBe('Low');
      expect(chunks[0].textDraft).toContain('brokenFunc');
    });
  });

  describe('Confidence Adjustments', () => {
    it('should provide +10 adjustment within ±5 bounds', () => {
      const errorHandler: Entity = {
        id: 'ent_1',
        kind: 'function',
        name: 'errorHandler',
        path: 'middleware.ts',
      };

      kb.insertEntity(errorHandler);
      addParameterFacts(errorHandler.id, ['err', 'req', 'res', 'next']);

      const adjustments = pattern.confidenceAdjustments?.(kb, errorHandler);

      expect(adjustments).toBeDefined();
      expect(adjustments!.delta).toBeGreaterThanOrEqual(5);
      expect(adjustments!.delta).toBeLessThanOrEqual(15);
      expect(adjustments!.reason).toContain('Express');
    });
  });

  describe('Async Detection (I2)', () => {
    it('should detect async error handlers', () => {
      const asyncErrorHandler: Entity = {
        id: 'ent_async_1',
        kind: 'function',
        name: 'asyncErrorHandler',
        path: 'middleware.ts',
      };

      kb.insertEntity(asyncErrorHandler);
      addParameterFacts(asyncErrorHandler.id, ['err', 'req', 'res', 'next']);
      addAsyncFacts(asyncErrorHandler.id);

      const chunks = pattern.describe(kb, asyncErrorHandler);
      expect(chunks).toHaveLength(1);

      const text = chunks[0].textDraft;
      expect(text).toMatch(/async/i);
      expect(text).toMatch(/Promise/i);
      expect(text).toContain('asyncErrorHandler');
    });

    it('should NOT mention async for synchronous error handlers', () => {
      const syncErrorHandler: Entity = {
        id: 'ent_sync_1',
        kind: 'function',
        name: 'syncErrorHandler',
        path: 'middleware.ts',
      };

      kb.insertEntity(syncErrorHandler);
      addParameterFacts(syncErrorHandler.id, ['err', 'req', 'res', 'next']);
      // No async facts added

      const chunks = pattern.describe(kb, syncErrorHandler);
      expect(chunks).toHaveLength(1);

      const text = chunks[0].textDraft;
      expect(text).not.toMatch(/async/i);
      expect(text).not.toMatch(/Promise/i);
    });

    it('should include async facts in grounding', () => {
      const asyncErrorHandler: Entity = {
        id: 'ent_async_2',
        kind: 'function',
        name: 'asyncErrorHandler',
        path: 'middleware.ts',
      };

      kb.insertEntity(asyncErrorHandler);
      addParameterFacts(asyncErrorHandler.id, ['err', 'req', 'res', 'next']);
      addAsyncFacts(asyncErrorHandler.id);

      const chunks = pattern.describe(kb, asyncErrorHandler);
      const factSetIds = chunks[0].factSetIds;

      // Should include both param and async factSets
      expect(factSetIds).toContain('fs-params-ent_async_2');
      expect(factSetIds).toContain('fs-async-ent_async_2');
    });
  });

  describe('Priority', () => {
    it('should have priority 2 (framework core)', () => {
      expect(pattern.priority).toBe(2);
    });
  });
});
