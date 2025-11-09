/**
 * Phase 6 I1: Fetch Patterns Tests
 *
 * TDD tests for Fetch API wrapper detection.
 * Tests follow polluted dataset strategy.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeBase } from '../../../src/kb/knowledge-base.js';
import { Entity, FactSet } from '../../../src/kb/models.js';
import { FetchPattern } from '../../../src/reasoning/patterns/http-clients/fetch-patterns.js';

describe('FetchPattern', () => {
  let kb: KnowledgeBase;
  let pattern: FetchPattern;

  beforeEach(() => {
    kb = new KnowledgeBase();
    pattern = new FetchPattern();
  });

  describe('matches()', () => {
    it('should match async function with fetch() call', () => {
      const entity: Entity = {
        id: 'fetch-1',
        kind: 'function',
        name: 'fetchData',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);
      kb.insertFactSet({
        id: 'fs-1',
        facts: [
          { subjectId: 'fetch-1', predicate: 'is-function', object: true },
          { subjectId: 'fetch-1', predicate: 'is-async', object: 'true' },
          { subjectId: 'fetch-1', predicate: 'calls-expression', object: 'fetch' },
        ],
        sources: [],
        evidenceScore: 90,
      });

      expect(pattern.matches(kb, entity)).toBe(true);
    });

    it('should NOT match non-fetch functions (polluted dataset)', () => {
      const fetchFunc: Entity = {
        id: 'fetch-1',
        kind: 'function',
        name: 'fetchData',
        path: 'src/api.ts',
        exported: true,
      };

      const axiosFunc: Entity = {
        id: 'axios-1',
        kind: 'function',
        name: 'getUserData',
        path: 'src/api.ts',
        exported: true,
      };

      const regularFunc: Entity = {
        id: 'regular-1',
        kind: 'function',
        name: 'processData',
        path: 'src/utils.ts',
        exported: true,
      };

      // Fetch function
      kb.insertEntity(fetchFunc);
      kb.insertFactSet({
        id: 'fs-fetch',
        facts: [
          { subjectId: 'fetch-1', predicate: 'is-function', object: true },
          { subjectId: 'fetch-1', predicate: 'calls-expression', object: 'fetch' },
        ],
        sources: [],
        evidenceScore: 90,
      });

      // Axios function
      kb.insertEntity(axiosFunc);
      kb.insertFactSet({
        id: 'fs-axios',
        facts: [
          { subjectId: 'axios-1', predicate: 'is-function', object: true },
          { subjectId: 'axios-1', predicate: 'calls-expression', object: 'axios.get' },
        ],
        sources: [],
        evidenceScore: 90,
      });

      // Regular function (no HTTP)
      kb.insertEntity(regularFunc);
      kb.insertFactSet({
        id: 'fs-regular',
        facts: [
          { subjectId: 'regular-1', predicate: 'is-function', object: true },
        ],
        sources: [],
        evidenceScore: 90,
      });

      // Positive assertion
      expect(pattern.matches(kb, fetchFunc)).toBe(true);

      // Negative assertions
      expect(pattern.matches(kb, axiosFunc)).toBe(false);
      expect(pattern.matches(kb, regularFunc)).toBe(false);
    });

    it('should NOT match constants', () => {
      const entity: Entity = {
        id: 'const-1',
        kind: 'constant',
        name: 'apiClient',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);

      expect(pattern.matches(kb, entity)).toBe(false);
    });

    it('should NOT throw on malformed entity', () => {
      const entity: Entity = {
        id: 'bad-1',
        kind: 'function',
        name: 'bad',
        path: 'src/bad.ts',
        exported: true,
      };

      kb.insertEntity(entity);

      expect(() => pattern.matches(kb, entity)).not.toThrow();
      expect(pattern.matches(kb, entity)).toBe(false);
    });
  });

  describe('describe()', () => {
    it('should generate behavior chunk for simple fetch wrapper', () => {
      const entity: Entity = {
        id: 'fetch-1',
        kind: 'function',
        name: 'fetchData',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);
      kb.insertFactSet({
        id: 'fs-1',
        facts: [
          { subjectId: 'fetch-1', predicate: 'is-function', object: true },
          { subjectId: 'fetch-1', predicate: 'is-async', object: 'true' },
          { subjectId: 'fetch-1', predicate: 'calls-expression', object: 'fetch' },
          { subjectId: 'fetch-1', predicate: 'call-arg-0', object: 'https://api.example.com/data' },
          { subjectId: 'fetch-1', predicate: 'calls-expression', object: 'response.json' },
        ],
        sources: [],
        evidenceScore: 90,
      });

      const chunks = pattern.describe(kb, entity);

      expect(chunks.length).toBe(1);
      expect(chunks[0].targetEntityId).toBe('fetch-1');
      expect(chunks[0].confidence).toBe('High');
      expect(chunks[0].factSetIds).toEqual(['fs-1']);

      // Should mention fetch and URL
      expect(chunks[0].textDraft).toContain('fetch');
      expect(chunks[0].textDraft).toContain('https://api.example.com/data');

      // Negative assertions
      expect(chunks[0].textDraft).not.toContain('Axios');
      expect(chunks[0].textDraft).not.toContain('Express');
    });

    it('should detect error handling patterns', () => {
      const entity: Entity = {
        id: 'fetch-1',
        kind: 'function',
        name: 'safeFetch',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);
      kb.insertFactSet({
        id: 'fs-1',
        facts: [
          { subjectId: 'fetch-1', predicate: 'is-function', object: true },
          { subjectId: 'fetch-1', predicate: 'is-async', object: 'true' },
          { subjectId: 'fetch-1', predicate: 'calls-expression', object: 'fetch' },
          { subjectId: 'fetch-1', predicate: 'has-try-catch', object: true },
          { subjectId: 'fetch-1', predicate: 'calls-expression', object: 'Error' },
        ],
        sources: [],
        evidenceScore: 90,
      });

      const chunks = pattern.describe(kb, entity);

      expect(chunks[0].confidence).toBe('High');
      expect(chunks[0].textDraft).toContain('error handling');
    });

    it('should handle missing URL with Medium confidence', () => {
      const entity: Entity = {
        id: 'fetch-1',
        kind: 'function',
        name: 'fetchWrapper',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);
      kb.insertFactSet({
        id: 'fs-1',
        facts: [
          { subjectId: 'fetch-1', predicate: 'is-function', object: true },
          { subjectId: 'fetch-1', predicate: 'calls-expression', object: 'fetch' },
          // No call-arg-0 (URL is dynamic)
        ],
        sources: [],
        evidenceScore: 90,
      });

      const chunks = pattern.describe(kb, entity);

      expect(chunks[0].confidence).toBe('Medium');
    });

    it('should return empty array if not matched', () => {
      const entity: Entity = {
        id: 'const-1',
        kind: 'constant',
        name: 'notFetch',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);

      const chunks = pattern.describe(kb, entity);
      expect(chunks).toEqual([]);
    });

    it('should NOT throw on errors', () => {
      const entity: Entity = {
        id: 'bad-1',
        kind: 'function',
        name: 'bad',
        path: 'src/bad.ts',
        exported: true,
      };

      kb.insertEntity(entity);
      kb.insertFactSet({
        id: 'fs-1',
        facts: [
          { subjectId: 'bad-1', predicate: 'is-function', object: true },
          { subjectId: 'bad-1', predicate: 'calls-expression', object: 'fetch' },
        ],
        sources: [],
        evidenceScore: 90,
      });

      expect(() => pattern.describe(kb, entity)).not.toThrow();

      const chunks = pattern.describe(kb, entity);
      expect(Array.isArray(chunks)).toBe(true);
    });
  });

  describe('confidenceAdjustments()', () => {
    it('should return positive adjustment for fetch wrappers', () => {
      const entity: Entity = {
        id: 'fetch-1',
        kind: 'function',
        name: 'fetchData',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);
      kb.insertFactSet({
        id: 'fs-1',
        facts: [
          { subjectId: 'fetch-1', predicate: 'is-function', object: true },
          { subjectId: 'fetch-1', predicate: 'calls-expression', object: 'fetch' },
        ],
        sources: [],
        evidenceScore: 90,
      });

      const adjustment = pattern.confidenceAdjustments(kb, entity);

      expect(adjustment).toBeDefined();
      expect(adjustment!.adjustment).toBeGreaterThan(0);
      expect(adjustment!.reason).toContain('Fetch');
    });

    it('should return undefined for non-matching entities', () => {
      const entity: Entity = {
        id: 'const-1',
        kind: 'constant',
        name: 'notFetch',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);

      const adjustment = pattern.confidenceAdjustments(kb, entity);
      expect(adjustment).toBeUndefined();
    });
  });
});
