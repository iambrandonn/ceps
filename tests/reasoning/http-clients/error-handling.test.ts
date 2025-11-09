/**
 * Phase 6 I1: HTTP Error Handling Pattern Tests
 *
 * TDD tests for HTTP-specific error handling detection.
 * Tests follow polluted dataset strategy.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeBase } from '../../../src/kb/knowledge-base.js';
import { Entity, FactSet } from '../../../src/kb/models.js';
import { HttpErrorHandlingPattern } from '../../../src/reasoning/patterns/http-clients/error-handling.js';

describe('HttpErrorHandlingPattern', () => {
  let kb: KnowledgeBase;
  let pattern: HttpErrorHandlingPattern;

  beforeEach(() => {
    kb = new KnowledgeBase();
    pattern = new HttpErrorHandlingPattern();
  });

  describe('matches()', () => {
    it('should match function with try-catch and HTTP calls', () => {
      const entity: Entity = {
        id: 'error-1',
        kind: 'function',
        name: 'safeFetch',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);
      kb.insertFactSet({
        id: 'fs-1',
        facts: [
          { subjectId: 'error-1', predicate: 'is-function', object: true },
          { subjectId: 'error-1', predicate: 'has-try-catch', object: true },
          { subjectId: 'error-1', predicate: 'calls-expression', object: 'fetch' },
        ],
        sources: [],
        evidenceScore: 90,
      });

      expect(pattern.matches(kb, entity)).toBe(true);
    });

    it('should match function that checks response.ok', () => {
      const entity: Entity = {
        id: 'error-1',
        kind: 'function',
        name: 'checkResponse',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);
      kb.insertFactSet({
        id: 'fs-1',
        facts: [
          { subjectId: 'error-1', predicate: 'is-function', object: true },
          { subjectId: 'error-1', predicate: 'checks-property', object: 'response.ok' },
          { subjectId: 'error-1', predicate: 'calls-expression', object: 'fetch' },
        ],
        sources: [],
        evidenceScore: 90,
      });

      expect(pattern.matches(kb, entity)).toBe(true);
    });

    it('should match function that checks response.status', () => {
      const entity: Entity = {
        id: 'error-1',
        kind: 'function',
        name: 'checkStatus',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);
      kb.insertFactSet({
        id: 'fs-1',
        facts: [
          { subjectId: 'error-1', predicate: 'is-function', object: true },
          { subjectId: 'error-1', predicate: 'checks-property', object: 'response.status' },
          { subjectId: 'error-1', predicate: 'calls-expression', object: 'axios.get' },
        ],
        sources: [],
        evidenceScore: 90,
      });

      expect(pattern.matches(kb, entity)).toBe(true);
    });

    it('should NOT match non-HTTP error handlers (polluted dataset)', () => {
      const httpErrorFunc: Entity = {
        id: 'http-error-1',
        kind: 'function',
        name: 'safeFetch',
        path: 'src/api.ts',
        exported: true,
      };

      const genericErrorFunc: Entity = {
        id: 'generic-error-1',
        kind: 'function',
        name: 'processData',
        path: 'src/utils.ts',
        exported: true,
      };

      const regularFunc: Entity = {
        id: 'regular-1',
        kind: 'function',
        name: 'formatDate',
        path: 'src/utils.ts',
        exported: true,
      };

      // HTTP error handler
      kb.insertEntity(httpErrorFunc);
      kb.insertFactSet({
        id: 'fs-http',
        facts: [
          { subjectId: 'http-error-1', predicate: 'is-function', object: true },
          { subjectId: 'http-error-1', predicate: 'has-try-catch', object: true },
          { subjectId: 'http-error-1', predicate: 'calls-expression', object: 'fetch' },
        ],
        sources: [],
        evidenceScore: 90,
      });

      // Generic error handler (try-catch but no HTTP)
      kb.insertEntity(genericErrorFunc);
      kb.insertFactSet({
        id: 'fs-generic',
        facts: [
          { subjectId: 'generic-error-1', predicate: 'is-function', object: true },
          { subjectId: 'generic-error-1', predicate: 'has-try-catch', object: true },
        ],
        sources: [],
        evidenceScore: 90,
      });

      // Regular function (no error handling)
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
      expect(pattern.matches(kb, httpErrorFunc)).toBe(true);

      // Negative assertions
      expect(pattern.matches(kb, genericErrorFunc)).toBe(false);
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
    it('should generate behavior chunk for try-catch with HTTP', () => {
      const entity: Entity = {
        id: 'error-1',
        kind: 'function',
        name: 'safeFetch',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);
      kb.insertFactSet({
        id: 'fs-1',
        facts: [
          { subjectId: 'error-1', predicate: 'is-function', object: true },
          { subjectId: 'error-1', predicate: 'has-try-catch', object: true },
          { subjectId: 'error-1', predicate: 'calls-expression', object: 'fetch' },
        ],
        sources: [],
        evidenceScore: 90,
      });

      const chunks = pattern.describe(kb, entity);

      expect(chunks.length).toBe(1);
      expect(chunks[0].targetEntityId).toBe('error-1');
      expect(chunks[0].confidence).toBe('High');
      expect(chunks[0].factSetIds).toEqual(['fs-1']);

      // Should mention error handling
      expect(chunks[0].textDraft).toContain('error');
      expect(chunks[0].textDraft).toContain('try-catch');

      // Negative assertions
      expect(chunks[0].textDraft).not.toContain('Express');
      expect(chunks[0].textDraft).not.toContain('Mongoose');
    });

    it('should detect response.ok checking', () => {
      const entity: Entity = {
        id: 'error-1',
        kind: 'function',
        name: 'validateResponse',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);
      kb.insertFactSet({
        id: 'fs-1',
        facts: [
          { subjectId: 'error-1', predicate: 'is-function', object: true },
          { subjectId: 'error-1', predicate: 'checks-property', object: 'response.ok' },
          { subjectId: 'error-1', predicate: 'calls-expression', object: 'fetch' },
        ],
        sources: [],
        evidenceScore: 90,
      });

      const chunks = pattern.describe(kb, entity);

      expect(chunks[0].confidence).toBe('High');
      expect(chunks[0].textDraft).toContain('response.ok');
    });

    it('should detect status code checking', () => {
      const entity: Entity = {
        id: 'error-1',
        kind: 'function',
        name: 'checkStatus',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);
      kb.insertFactSet({
        id: 'fs-1',
        facts: [
          { subjectId: 'error-1', predicate: 'is-function', object: true },
          { subjectId: 'error-1', predicate: 'checks-property', object: 'response.status' },
          { subjectId: 'error-1', predicate: 'calls-expression', object: 'axios.get' },
        ],
        sources: [],
        evidenceScore: 90,
      });

      const chunks = pattern.describe(kb, entity);

      expect(chunks[0].confidence).toBe('High');
      expect(chunks[0].textDraft).toContain('status');
    });

    it('should return empty array if not matched', () => {
      const entity: Entity = {
        id: 'const-1',
        kind: 'constant',
        name: 'notError',
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
          { subjectId: 'bad-1', predicate: 'has-try-catch', object: true },
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
    it('should return positive adjustment for HTTP error handlers', () => {
      const entity: Entity = {
        id: 'error-1',
        kind: 'function',
        name: 'safeFetch',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);
      kb.insertFactSet({
        id: 'fs-1',
        facts: [
          { subjectId: 'error-1', predicate: 'is-function', object: true },
          { subjectId: 'error-1', predicate: 'has-try-catch', object: true },
          { subjectId: 'error-1', predicate: 'calls-expression', object: 'fetch' },
        ],
        sources: [],
        evidenceScore: 90,
      });

      const adjustment = pattern.confidenceAdjustments(kb, entity);

      expect(adjustment).toBeDefined();
      expect(adjustment!.adjustment).toBeGreaterThan(0);
      expect(adjustment!.reason).toContain('error');
    });

    it('should return undefined for non-matching entities', () => {
      const entity: Entity = {
        id: 'const-1',
        kind: 'constant',
        name: 'notError',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);

      const adjustment = pattern.confidenceAdjustments(kb, entity);
      expect(adjustment).toBeUndefined();
    });
  });
});
