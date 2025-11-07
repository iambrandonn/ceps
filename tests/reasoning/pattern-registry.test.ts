/**
 * Phase 6: Pattern Registry Tests
 *
 * Tests for the pattern module registration and execution system.
 * Following TDD discipline - write tests before implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PatternRegistry } from '../../src/reasoning/patterns/pattern-registry.js';
import {
  PatternModule,
  PatternPriority,
  PatternRegistrationError,
  ConfidenceDelta,
} from '../../src/reasoning/patterns/types.js';
import { KnowledgeBase } from '../../src/kb/knowledge-base.js';
import { Entity, BehaviorChunk } from '../../src/kb/models.js';

describe('PatternRegistry', () => {
  let kb: KnowledgeBase;
  let registry: PatternRegistry;

  beforeEach(() => {
    kb = new KnowledgeBase();
    registry = new PatternRegistry();
  });

  describe('registration', () => {
    it('registers a valid pattern module', () => {
      const mockPattern: PatternModule = {
        id: 'test.pattern',
        priority: PatternPriority.FRAMEWORK_CORE,
        matches: () => true,
        describe: () => [],
      };

      expect(() => registry.register(mockPattern)).not.toThrow();
    });

    it('throws PatternRegistrationError for duplicate ID', () => {
      const pattern1: PatternModule = {
        id: 'test.duplicate',
        priority: PatternPriority.FRAMEWORK_CORE,
        matches: () => true,
        describe: () => [],
      };

      const pattern2: PatternModule = {
        id: 'test.duplicate', // Same ID
        priority: PatternPriority.FRAMEWORK_CORE,
        matches: () => true,
        describe: () => [],
      };

      registry.register(pattern1);
      expect(() => registry.register(pattern2)).toThrow(PatternRegistrationError);
      expect(() => registry.register(pattern2)).toThrow(/already registered/i);
    });

    it('validates pattern ID format', () => {
      const invalidPattern: PatternModule = {
        id: '', // Empty ID
        priority: PatternPriority.FRAMEWORK_CORE,
        matches: () => true,
        describe: () => [],
      };

      expect(() => registry.register(invalidPattern)).toThrow(PatternRegistrationError);
      expect(() => registry.register(invalidPattern)).toThrow(/invalid id/i);
    });

    it('validates required methods exist', () => {
      const invalidPattern = {
        id: 'test.invalid',
        priority: PatternPriority.FRAMEWORK_CORE,
        // Missing matches and describe methods
      } as PatternModule;

      expect(() => registry.register(invalidPattern)).toThrow(PatternRegistrationError);
    });
  });

  describe('precedence and ordering', () => {
    it('evaluates patterns in priority order (higher priority first)', () => {
      const matchOrder: string[] = [];

      const lowPriority: PatternModule = {
        id: 'test.low',
        priority: PatternPriority.AUXILIARY_ADAPTERS,
        matches: (kb, entity) => {
          matchOrder.push('low');
          return false;
        },
        describe: () => [],
      };

      const highPriority: PatternModule = {
        id: 'test.high',
        priority: PatternPriority.SHARED_PRIMITIVES,
        matches: (kb, entity) => {
          matchOrder.push('high');
          return false;
        },
        describe: () => [],
      };

      const midPriority: PatternModule = {
        id: 'test.mid',
        priority: PatternPriority.FRAMEWORK_CORE,
        matches: (kb, entity) => {
          matchOrder.push('mid');
          return false;
        },
        describe: () => [],
      };

      // Register in random order
      registry.register(lowPriority);
      registry.register(highPriority);
      registry.register(midPriority);

      const entity: Entity = {
        id: 'test-entity',
        kind: 'function',
        name: 'testFunc',
        path: 'test.ts',
      };

      registry.match(kb, entity);

      // Should evaluate in priority order: high (1), mid (2), low (3)
      expect(matchOrder).toEqual(['high', 'mid', 'low']);
    });

    it('within same priority, evaluates patterns alphabetically by ID', () => {
      const matchOrder: string[] = [];

      const patternZ: PatternModule = {
        id: 'test.z',
        priority: PatternPriority.FRAMEWORK_CORE,
        matches: (kb, entity) => {
          matchOrder.push('z');
          return false;
        },
        describe: () => [],
      };

      const patternA: PatternModule = {
        id: 'test.a',
        priority: PatternPriority.FRAMEWORK_CORE,
        matches: (kb, entity) => {
          matchOrder.push('a');
          return false;
        },
        describe: () => [],
      };

      const patternM: PatternModule = {
        id: 'test.m',
        priority: PatternPriority.FRAMEWORK_CORE,
        matches: (kb, entity) => {
          matchOrder.push('m');
          return false;
        },
        describe: () => [],
      };

      // Register in random order
      registry.register(patternZ);
      registry.register(patternA);
      registry.register(patternM);

      const entity: Entity = {
        id: 'test-entity',
        kind: 'function',
        name: 'testFunc',
        path: 'test.ts',
      };

      registry.match(kb, entity);

      // Should evaluate alphabetically: a, m, z
      expect(matchOrder).toEqual(['a', 'm', 'z']);
    });
  });

  describe('pattern matching', () => {
    it('returns first matching pattern', () => {
      const pattern1: PatternModule = {
        id: 'test.first',
        priority: PatternPriority.FRAMEWORK_CORE,
        matches: () => false,
        describe: () => [],
      };

      const pattern2: PatternModule = {
        id: 'test.second',
        priority: PatternPriority.FRAMEWORK_CORE,
        matches: () => true, // This matches
        describe: () => [
          {
            id: 'chunk-1',
            targetEntityId: 'test-entity',
            textDraft: 'Second pattern matched',
            factSetIds: [],
            confidence: 'High',
          },
        ],
      };

      const pattern3: PatternModule = {
        id: 'test.third',
        priority: PatternPriority.FRAMEWORK_CORE,
        matches: () => true, // Would also match, but comes after
        describe: () => [
          {
            id: 'chunk-2',
            targetEntityId: 'test-entity',
            textDraft: 'Third pattern matched',
            factSetIds: [],
            confidence: 'High',
          },
        ],
      };

      registry.register(pattern1);
      registry.register(pattern2);
      registry.register(pattern3);

      const entity: Entity = {
        id: 'test-entity',
        kind: 'function',
        name: 'testFunc',
        path: 'test.ts',
      };

      const match = registry.match(kb, entity);
      expect(match).toBeDefined();
      expect(match?.id).toBe('test.second');
    });

    it('returns null when no patterns match', () => {
      const pattern: PatternModule = {
        id: 'test.nomatch',
        priority: PatternPriority.FRAMEWORK_CORE,
        matches: () => false,
        describe: () => [],
      };

      registry.register(pattern);

      const entity: Entity = {
        id: 'test-entity',
        kind: 'function',
        name: 'testFunc',
        path: 'test.ts',
      };

      const match = registry.match(kb, entity);
      expect(match).toBeNull();
    });

    it('handles pattern.matches() errors gracefully (treats as no match)', () => {
      const buggyPattern: PatternModule = {
        id: 'test.buggy',
        priority: PatternPriority.FRAMEWORK_CORE,
        matches: () => {
          throw new Error('Simulated matcher error');
        },
        describe: () => [],
      };

      registry.register(buggyPattern);

      const entity: Entity = {
        id: 'test-entity',
        kind: 'function',
        name: 'testFunc',
        path: 'test.ts',
      };

      // Should not throw, should treat as no match
      const match = registry.match(kb, entity);
      expect(match).toBeNull();
    });
  });

  describe('behavior chunk generation', () => {
    it('calls describe() on matched pattern', () => {
      const pattern: PatternModule = {
        id: 'test.describe',
        priority: PatternPriority.FRAMEWORK_CORE,
        matches: () => true,
        describe: (kb, entity) => [
          {
            id: 'chunk-1',
            targetEntityId: entity.id,
            textDraft: `Handles ${entity.name}`,
            factSetIds: ['factset-1'],
            confidence: 'High',
          },
        ],
      };

      registry.register(pattern);

      const entity: Entity = {
        id: 'test-entity',
        kind: 'function',
        name: 'testFunc',
        path: 'test.ts',
      };

      const chunks = registry.describe(kb, entity);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].textDraft).toBe('Handles testFunc');
      expect(chunks[0].confidence).toBe('High');
      expect(chunks[0].factSetIds).toEqual(['factset-1']);
    });

    it('returns empty array when no pattern matches', () => {
      const pattern: PatternModule = {
        id: 'test.nomatch',
        priority: PatternPriority.FRAMEWORK_CORE,
        matches: () => false,
        describe: () => [],
      };

      registry.register(pattern);

      const entity: Entity = {
        id: 'test-entity',
        kind: 'function',
        name: 'testFunc',
        path: 'test.ts',
      };

      const chunks = registry.describe(kb, entity);
      expect(chunks).toEqual([]);
    });

    it('handles pattern.describe() errors gracefully (returns Low-confidence Open Question)', () => {
      const buggyPattern: PatternModule = {
        id: 'test.buggy-describe',
        priority: PatternPriority.FRAMEWORK_CORE,
        matches: () => true,
        describe: () => {
          throw new Error('Simulated describe error');
        },
      };

      registry.register(buggyPattern);

      const entity: Entity = {
        id: 'test-entity',
        kind: 'function',
        name: 'testFunc',
        path: 'test.ts',
      };

      // Should not throw, should return error chunk
      const chunks = registry.describe(kb, entity);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].confidence).toBe('Low');
      expect(chunks[0].textDraft).toMatch(/pattern.*failed/i);
      expect(chunks[0].textDraft).toMatch(/test\.buggy-describe/);
    });
  });

  describe('confidence adjustments', () => {
    it('applies confidence adjustments from matched pattern', () => {
      const pattern: PatternModule = {
        id: 'test.confidence',
        priority: PatternPriority.FRAMEWORK_CORE,
        matches: () => true,
        describe: () => [],
        confidenceAdjustments: () => ({
          adjustment: 10,
          reason: 'Strong framework signal',
        }),
      };

      registry.register(pattern);

      const entity: Entity = {
        id: 'test-entity',
        kind: 'function',
        name: 'testFunc',
        path: 'test.ts',
      };

      const delta = registry.getConfidenceAdjustments(kb, entity);
      expect(delta).toBeDefined();
      expect(delta?.adjustment).toBe(10);
      expect(delta?.reason).toBe('Strong framework signal');
    });

    it('returns undefined when no pattern matches', () => {
      const pattern: PatternModule = {
        id: 'test.nomatch',
        priority: PatternPriority.FRAMEWORK_CORE,
        matches: () => false,
        describe: () => [],
        confidenceAdjustments: () => ({
          adjustment: 10,
          reason: 'Should not be called',
        }),
      };

      registry.register(pattern);

      const entity: Entity = {
        id: 'test-entity',
        kind: 'function',
        name: 'testFunc',
        path: 'test.ts',
      };

      const delta = registry.getConfidenceAdjustments(kb, entity);
      expect(delta).toBeUndefined();
    });

    it('returns undefined when matched pattern has no confidenceAdjustments method', () => {
      const pattern: PatternModule = {
        id: 'test.no-adjustments',
        priority: PatternPriority.FRAMEWORK_CORE,
        matches: () => true,
        describe: () => [],
        // No confidenceAdjustments method
      };

      registry.register(pattern);

      const entity: Entity = {
        id: 'test-entity',
        kind: 'function',
        name: 'testFunc',
        path: 'test.ts',
      };

      const delta = registry.getConfidenceAdjustments(kb, entity);
      expect(delta).toBeUndefined();
    });
  });

  describe('error handling contract', () => {
    it('never throws from match() even with buggy pattern', () => {
      const buggyPattern: PatternModule = {
        id: 'test.exploding',
        priority: PatternPriority.FRAMEWORK_CORE,
        matches: () => {
          throw new Error('Boom!');
        },
        describe: () => {
          throw new Error('Also boom!');
        },
      };

      registry.register(buggyPattern);

      const entity: Entity = {
        id: 'test-entity',
        kind: 'function',
        name: 'testFunc',
        path: 'test.ts',
      };

      expect(() => registry.match(kb, entity)).not.toThrow();
      expect(() => registry.describe(kb, entity)).not.toThrow();
      expect(() => registry.getConfidenceAdjustments(kb, entity)).not.toThrow();
    });
  });
});
