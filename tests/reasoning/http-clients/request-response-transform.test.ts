/**
 * Phase 6 I1: Request/Response Transform Pattern Tests
 *
 * TDD tests for HTTP request/response transformation detection.
 * Tests follow polluted dataset strategy.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeBase } from '../../../src/kb/knowledge-base.js';
import { Entity, FactSet } from '../../../src/kb/models.js';
import { RequestResponseTransformPattern } from '../../../src/reasoning/patterns/http-clients/request-response-transform.js';

describe('RequestResponseTransformPattern', () => {
  let kb: KnowledgeBase;
  let pattern: RequestResponseTransformPattern;

  beforeEach(() => {
    kb = new KnowledgeBase();
    pattern = new RequestResponseTransformPattern();
  });

  describe('matches()', () => {
    it('should match function that calls response.json()', () => {
      const entity: Entity = {
        id: 'transform-1',
        kind: 'function',
        name: 'parseResponse',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);
      kb.insertFactSet({
        id: 'fs-1',
        facts: [
          { subjectId: 'transform-1', predicate: 'is-function', object: true },
          { subjectId: 'transform-1', predicate: 'calls-expression', object: 'response.json' },
        ],
        sources: [],
        evidenceScore: 90,
      });

      expect(pattern.matches(kb, entity)).toBe(true);
    });

    it('should match function that calls response.text()', () => {
      const entity: Entity = {
        id: 'transform-1',
        kind: 'function',
        name: 'parseText',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);
      kb.insertFactSet({
        id: 'fs-1',
        facts: [
          { subjectId: 'transform-1', predicate: 'is-function', object: true },
          { subjectId: 'transform-1', predicate: 'calls-expression', object: 'response.text' },
        ],
        sources: [],
        evidenceScore: 90,
      });

      expect(pattern.matches(kb, entity)).toBe(true);
    });

    it('should match function that calls JSON.stringify()', () => {
      const entity: Entity = {
        id: 'transform-1',
        kind: 'function',
        name: 'serializeRequest',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);
      kb.insertFactSet({
        id: 'fs-1',
        facts: [
          { subjectId: 'transform-1', predicate: 'is-function', object: true },
          { subjectId: 'transform-1', predicate: 'calls-expression', object: 'JSON.stringify' },
        ],
        sources: [],
        evidenceScore: 90,
      });

      expect(pattern.matches(kb, entity)).toBe(true);
    });

    it('should NOT match non-transform functions (polluted dataset)', () => {
      const transformFunc: Entity = {
        id: 'transform-1',
        kind: 'function',
        name: 'parseResponse',
        path: 'src/api.ts',
        exported: true,
      };

      const fetchFunc: Entity = {
        id: 'fetch-1',
        kind: 'function',
        name: 'fetchData',
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

      // Transform function
      kb.insertEntity(transformFunc);
      kb.insertFactSet({
        id: 'fs-transform',
        facts: [
          { subjectId: 'transform-1', predicate: 'is-function', object: true },
          { subjectId: 'transform-1', predicate: 'calls-expression', object: 'response.json' },
        ],
        sources: [],
        evidenceScore: 90,
      });

      // Fetch function (no transform)
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
      expect(pattern.matches(kb, transformFunc)).toBe(true);

      // Negative assertions
      expect(pattern.matches(kb, fetchFunc)).toBe(false);
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
    it('should generate behavior chunk for JSON response parsing', () => {
      const entity: Entity = {
        id: 'transform-1',
        kind: 'function',
        name: 'parseResponse',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);
      kb.insertFactSet({
        id: 'fs-1',
        facts: [
          { subjectId: 'transform-1', predicate: 'is-function', object: true },
          { subjectId: 'transform-1', predicate: 'calls-expression', object: 'response.json' },
        ],
        sources: [],
        evidenceScore: 90,
      });

      const chunks = pattern.describe(kb, entity);

      expect(chunks.length).toBe(1);
      expect(chunks[0].targetEntityId).toBe('transform-1');
      expect(chunks[0].confidence).toBe('High');
      expect(chunks[0].factSetIds).toEqual(['fs-1']);

      // Should mention JSON parsing
      expect(chunks[0].textDraft).toContain('JSON');
      expect(chunks[0].textDraft).toContain('response');

      // Negative assertions
      expect(chunks[0].textDraft).not.toContain('Axios');
      expect(chunks[0].textDraft).not.toContain('Express');
    });

    it('should detect request serialization (JSON.stringify)', () => {
      const entity: Entity = {
        id: 'transform-1',
        kind: 'function',
        name: 'serializeRequest',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);
      kb.insertFactSet({
        id: 'fs-1',
        facts: [
          { subjectId: 'transform-1', predicate: 'is-function', object: true },
          { subjectId: 'transform-1', predicate: 'calls-expression', object: 'JSON.stringify' },
        ],
        sources: [],
        evidenceScore: 90,
      });

      const chunks = pattern.describe(kb, entity);

      expect(chunks[0].confidence).toBe('High');
      expect(chunks[0].textDraft).toContain('serializ');
      expect(chunks[0].textDraft).toContain('JSON');
    });

    it('should handle text response parsing', () => {
      const entity: Entity = {
        id: 'transform-1',
        kind: 'function',
        name: 'parseText',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);
      kb.insertFactSet({
        id: 'fs-1',
        facts: [
          { subjectId: 'transform-1', predicate: 'is-function', object: true },
          { subjectId: 'transform-1', predicate: 'calls-expression', object: 'response.text' },
        ],
        sources: [],
        evidenceScore: 90,
      });

      const chunks = pattern.describe(kb, entity);

      expect(chunks[0].confidence).toBe('High');
      expect(chunks[0].textDraft).toContain('text');
    });

    it('should return empty array if not matched', () => {
      const entity: Entity = {
        id: 'const-1',
        kind: 'constant',
        name: 'notTransform',
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
          { subjectId: 'bad-1', predicate: 'calls-expression', object: 'response.json' },
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
    it('should return positive adjustment for transform functions', () => {
      const entity: Entity = {
        id: 'transform-1',
        kind: 'function',
        name: 'parseResponse',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);
      kb.insertFactSet({
        id: 'fs-1',
        facts: [
          { subjectId: 'transform-1', predicate: 'is-function', object: true },
          { subjectId: 'transform-1', predicate: 'calls-expression', object: 'response.json' },
        ],
        sources: [],
        evidenceScore: 90,
      });

      const adjustment = pattern.confidenceAdjustments(kb, entity);

      expect(adjustment).toBeDefined();
      expect(adjustment!.adjustment).toBeGreaterThan(0);
      expect(adjustment!.reason).toContain('transform');
    });

    it('should return undefined for non-matching entities', () => {
      const entity: Entity = {
        id: 'const-1',
        kind: 'constant',
        name: 'notTransform',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);

      const adjustment = pattern.confidenceAdjustments(kb, entity);
      expect(adjustment).toBeUndefined();
    });
  });
});
