/**
 * Phase 6: Shared Pattern Helpers Tests
 *
 * Tests for common utilities used by pattern modules.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  hasFact,
  getFactsByPredicate,
  getFirstFact,
  normalizeHttpMethod,
  getParameterNames,
  getParameterCount,
  isAsync,
  getFactSets,
  HTTP_METHODS,
} from '../../src/reasoning/patterns/shared/helpers.js';
import { KnowledgeBase } from '../../src/kb/knowledge-base.js';
import { Entity, FactSet, Fact } from '../../src/kb/models.js';

describe('Pattern Helpers', () => {
  let kb: KnowledgeBase;
  let testEntity: Entity;

  beforeEach(() => {
    kb = new KnowledgeBase();

    testEntity = {
      id: 'test-entity-1',
      kind: 'function',
      name: 'testFunc',
      path: 'test.ts',
    };

    kb.insertEntity(testEntity);
  });

  describe('hasFact', () => {
    it('returns true when fact with predicate exists', () => {
      const factSet: FactSet = {
        id: 'fs-1',
        facts: [
          {
            subjectId: testEntity.id,
            predicate: 'is-async',
            object: 'true',
          },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      expect(hasFact(kb, testEntity, 'is-async')).toBe(true);
    });

    it('returns false when fact does not exist', () => {
      expect(hasFact(kb, testEntity, 'nonexistent')).toBe(false);
    });

    it('matches exact object value when string provided', () => {
      const factSet: FactSet = {
        id: 'fs-1',
        facts: [
          {
            subjectId: testEntity.id,
            predicate: 'http-method',
            object: 'GET',
          },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      expect(hasFact(kb, testEntity, 'http-method', 'GET')).toBe(true);
      expect(hasFact(kb, testEntity, 'http-method', 'POST')).toBe(false);
    });

    it('matches regex pattern when regex provided', () => {
      const factSet: FactSet = {
        id: 'fs-1',
        facts: [
          {
            subjectId: testEntity.id,
            predicate: 'calls-expression',
            object: 'app.get',
          },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      expect(hasFact(kb, testEntity, 'calls-expression', /^app\.(get|post)$/)).toBe(true);
      expect(hasFact(kb, testEntity, 'calls-expression', /^app\.delete$/)).toBe(false);
    });
  });

  describe('getFactsByPredicate', () => {
    it('returns all matching facts', () => {
      const factSet: FactSet = {
        id: 'fs-1',
        facts: [
          {
            subjectId: testEntity.id,
            predicate: 'side-effect',
            object: 'network-io',
          },
          {
            subjectId: testEntity.id,
            predicate: 'side-effect',
            object: 'db-write',
          },
          {
            subjectId: testEntity.id,
            predicate: 'other',
            object: 'value',
          },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const facts = getFactsByPredicate(kb, testEntity, 'side-effect');
      expect(facts).toHaveLength(2);
      expect(facts[0].object).toBe('network-io');
      expect(facts[1].object).toBe('db-write');
    });

    it('returns empty array when no matches', () => {
      const facts = getFactsByPredicate(kb, testEntity, 'nonexistent');
      expect(facts).toEqual([]);
    });
  });

  describe('getFirstFact', () => {
    it('returns first matching fact', () => {
      const factSet: FactSet = {
        id: 'fs-1',
        facts: [
          {
            subjectId: testEntity.id,
            predicate: 'param-count',
            object: 3,
          },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const fact = getFirstFact(kb, testEntity, 'param-count');
      expect(fact).toBeDefined();
      expect(fact?.object).toBe(3);
    });

    it('returns undefined when no match', () => {
      const fact = getFirstFact(kb, testEntity, 'nonexistent');
      expect(fact).toBeUndefined();
    });
  });

  describe('normalizeHttpMethod', () => {
    it('normalizes lowercase methods', () => {
      expect(normalizeHttpMethod('get')).toBe('GET');
      expect(normalizeHttpMethod('post')).toBe('POST');
    });

    it('normalizes mixed case methods', () => {
      expect(normalizeHttpMethod('Get')).toBe('GET');
      expect(normalizeHttpMethod('PoSt')).toBe('POST');
    });

    it('accepts already uppercase methods', () => {
      expect(normalizeHttpMethod('GET')).toBe('GET');
      expect(normalizeHttpMethod('DELETE')).toBe('DELETE');
    });

    it('returns undefined for invalid methods', () => {
      expect(normalizeHttpMethod('invalid')).toBeUndefined();
      expect(normalizeHttpMethod('FETCH')).toBeUndefined();
    });

    it('handles all standard HTTP methods', () => {
      for (const method of HTTP_METHODS) {
        expect(normalizeHttpMethod(method.toLowerCase())).toBe(method);
      }
    });
  });

  describe('getParameterNames', () => {
    it('parses comma-separated param names', () => {
      const factSet: FactSet = {
        id: 'fs-1',
        facts: [
          {
            subjectId: testEntity.id,
            predicate: 'param-names',
            object: 'req, res, next',
          },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const params = getParameterNames(kb, testEntity);
      expect(params).toEqual(['req', 'res', 'next']);
    });

    it('handles params without spaces', () => {
      const factSet: FactSet = {
        id: 'fs-1',
        facts: [
          {
            subjectId: testEntity.id,
            predicate: 'param-names',
            object: 'a,b,c',
          },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const params = getParameterNames(kb, testEntity);
      expect(params).toEqual(['a', 'b', 'c']);
    });

    it('returns empty array when no param-names fact', () => {
      const params = getParameterNames(kb, testEntity);
      expect(params).toEqual([]);
    });

    it('filters out empty strings', () => {
      const factSet: FactSet = {
        id: 'fs-1',
        facts: [
          {
            subjectId: testEntity.id,
            predicate: 'param-names',
            object: 'a, , c',
          },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const params = getParameterNames(kb, testEntity);
      expect(params).toEqual(['a', 'c']);
    });
  });

  describe('getParameterCount', () => {
    it('returns param count from fact', () => {
      const factSet: FactSet = {
        id: 'fs-1',
        facts: [
          {
            subjectId: testEntity.id,
            predicate: 'param-count',
            object: 4,
          },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      expect(getParameterCount(kb, testEntity)).toBe(4);
    });

    it('returns 0 when no param-count fact', () => {
      expect(getParameterCount(kb, testEntity)).toBe(0);
    });

    it('returns 0 when param-count is not a number', () => {
      const factSet: FactSet = {
        id: 'fs-1',
        facts: [
          {
            subjectId: testEntity.id,
            predicate: 'param-count',
            object: 'not-a-number',
          },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      expect(getParameterCount(kb, testEntity)).toBe(0);
    });
  });

  describe('isAsync', () => {
    it('returns true for is-async fact', () => {
      const factSet: FactSet = {
        id: 'fs-1',
        facts: [
          {
            subjectId: testEntity.id,
            predicate: 'is-async',
            object: 'true',
          },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      expect(isAsync(kb, testEntity)).toBe(true);
    });

    it('returns true for returns-promise fact', () => {
      const factSet: FactSet = {
        id: 'fs-1',
        facts: [
          {
            subjectId: testEntity.id,
            predicate: 'returns-promise',
            object: 'true',
          },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      expect(isAsync(kb, testEntity)).toBe(true);
    });

    it('returns false when no async indicators', () => {
      expect(isAsync(kb, testEntity)).toBe(false);
    });
  });

  describe('getFactSets', () => {
    it('returns all factSets for entity', () => {
      const factSet1: FactSet = {
        id: 'fs-1',
        facts: [
          {
            subjectId: testEntity.id,
            predicate: 'fact1',
            object: 'value1',
          },
        ],
        sources: [],
        evidenceScore: 80,
      };

      const factSet2: FactSet = {
        id: 'fs-2',
        facts: [
          {
            subjectId: testEntity.id,
            predicate: 'fact2',
            object: 'value2',
          },
        ],
        sources: [],
        evidenceScore: 70,
      };

      kb.insertFactSet(factSet1);
      kb.insertFactSet(factSet2);

      const factSets = getFactSets(kb, testEntity);
      expect(factSets).toHaveLength(2);
      expect(factSets.map(fs => fs.id)).toContain('fs-1');
      expect(factSets.map(fs => fs.id)).toContain('fs-2');
    });

    it('returns empty array when no factSets for entity', () => {
      const factSets = getFactSets(kb, testEntity);
      expect(factSets).toEqual([]);
    });

    it('excludes factSets for other entities', () => {
      const otherEntity: Entity = {
        id: 'other-entity',
        kind: 'function',
        name: 'otherFunc',
        path: 'other.ts',
      };
      kb.insertEntity(otherEntity);

      const factSet1: FactSet = {
        id: 'fs-1',
        facts: [
          {
            subjectId: testEntity.id,
            predicate: 'fact1',
            object: 'value1',
          },
        ],
        sources: [],
        evidenceScore: 80,
      };

      const factSet2: FactSet = {
        id: 'fs-2',
        facts: [
          {
            subjectId: otherEntity.id,
            predicate: 'fact2',
            object: 'value2',
          },
        ],
        sources: [],
        evidenceScore: 70,
      };

      kb.insertFactSet(factSet1);
      kb.insertFactSet(factSet2);

      const factSets = getFactSets(kb, testEntity);
      expect(factSets).toHaveLength(1);
      expect(factSets[0].id).toBe('fs-1');
    });
  });
});
