/**
 * Phase 6 I1: Axios Client Pattern Tests
 *
 * TDD tests for Axios client instance detection (axios.create).
 * Tests follow polluted dataset strategy to catch selection bugs.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeBase } from '../../../src/kb/knowledge-base.js';
import { Entity, FactSet } from '../../../src/kb/models.js';
import { AxiosClientPattern } from '../../../src/reasoning/patterns/http-clients/axios-client.js';

describe('AxiosClientPattern', () => {
  let kb: KnowledgeBase;
  let pattern: AxiosClientPattern;

  beforeEach(() => {
    kb = new KnowledgeBase();
    pattern = new AxiosClientPattern();
  });

  describe('matches()', () => {
    it('should match axios.create() constant', () => {
      const entity: Entity = {
        id: 'axios-1',
        kind: 'constant',
        name: 'apiClient',
        path: 'src/api.ts',
        exported: true,
      };

      const factSet: FactSet = {
        id: 'fs-1',
        facts: [
          { subjectId: 'axios-1', predicate: 'is-constant', object: true },
          {
            subjectId: 'axios-1',
            predicate: 'initializer-call',
            object: 'axios.create',
          },
        ],
        sources: [],
        evidenceScore: 90,
      };

      kb.insertEntity(entity);
      kb.insertFactSet(factSet);

      expect(pattern.matches(kb, entity)).toBe(true);
    });

    it('should NOT match non-axios constants (polluted dataset)', () => {
      const axiosEntity: Entity = {
        id: 'axios-1',
        kind: 'constant',
        name: 'apiClient',
        path: 'src/api.ts',
        exported: true,
      };

      const expressEntity: Entity = {
        id: 'express-1',
        kind: 'constant',
        name: 'router',
        path: 'src/routes.ts',
        exported: true,
      };

      const mongooseEntity: Entity = {
        id: 'mongoose-1',
        kind: 'constant',
        name: 'UserSchema',
        path: 'src/models.ts',
        exported: true,
      };

      // Axios client
      kb.insertEntity(axiosEntity);
      kb.insertFactSet({
        id: 'fs-axios',
        facts: [
          { subjectId: 'axios-1', predicate: 'is-constant', object: true },
          { subjectId: 'axios-1', predicate: 'initializer-call', object: 'axios.create' },
        ],
        sources: [],
        evidenceScore: 90,
      });

      // Express router (competing constant)
      kb.insertEntity(expressEntity);
      kb.insertFactSet({
        id: 'fs-express',
        facts: [
          { subjectId: 'express-1', predicate: 'is-constant', object: true },
          { subjectId: 'express-1', predicate: 'initializer-call', object: 'express.Router' },
        ],
        sources: [],
        evidenceScore: 90,
      });

      // Mongoose schema (competing constant)
      kb.insertEntity(mongooseEntity);
      kb.insertFactSet({
        id: 'fs-mongoose',
        facts: [
          { subjectId: 'mongoose-1', predicate: 'is-constant', object: true },
          { subjectId: 'mongoose-1', predicate: 'initializer-call', object: 'new Schema' },
        ],
        sources: [],
        evidenceScore: 90,
      });

      // Positive assertion: axios matches
      expect(pattern.matches(kb, axiosEntity)).toBe(true);

      // Negative assertions: others don't match
      expect(pattern.matches(kb, expressEntity)).toBe(false);
      expect(pattern.matches(kb, mongooseEntity)).toBe(false);
    });

    it('should NOT match functions', () => {
      const entity: Entity = {
        id: 'func-1',
        kind: 'function',
        name: 'createClient',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);
      kb.insertFactSet({
        id: 'fs-1',
        facts: [
          { subjectId: 'func-1', predicate: 'is-function', object: true },
        ],
        sources: [],
        evidenceScore: 90,
      });

      expect(pattern.matches(kb, entity)).toBe(false);
    });

    it('should handle missing initializer-call gracefully', () => {
      const entity: Entity = {
        id: 'const-1',
        kind: 'constant',
        name: 'someConst',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);
      kb.insertFactSet({
        id: 'fs-1',
        facts: [
          { subjectId: 'const-1', predicate: 'is-constant', object: true },
        ],
        sources: [],
        evidenceScore: 90,
      });

      expect(pattern.matches(kb, entity)).toBe(false);
    });

    it('should NOT throw on malformed entity', () => {
      const entity: Entity = {
        id: 'bad-1',
        kind: 'constant',
        name: 'bad',
        path: 'src/bad.ts',
        exported: true,
      };

      // No facts at all
      kb.insertEntity(entity);

      expect(() => pattern.matches(kb, entity)).not.toThrow();
      expect(pattern.matches(kb, entity)).toBe(false);
    });
  });

  describe('describe()', () => {
    it('should generate behavior chunk for axios.create with baseURL', () => {
      const entity: Entity = {
        id: 'axios-1',
        kind: 'constant',
        name: 'apiClient',
        path: 'src/api.ts',
        exported: true,
      };

      const factSet: FactSet = {
        id: 'fs-1',
        facts: [
          { subjectId: 'axios-1', predicate: 'is-constant', object: true },
          { subjectId: 'axios-1', predicate: 'initializer-call', object: 'axios.create' },
          {
            subjectId: 'axios-1',
            predicate: 'initializer',
            object: `axios.create({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: { 'Content-Type': 'application/json' }
})`,
          },
        ],
        sources: [],
        evidenceScore: 90,
      };

      kb.insertEntity(entity);
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks.length).toBe(1);
      expect(chunks[0].targetEntityId).toBe('axios-1');
      expect(chunks[0].confidence).toBe('High');
      expect(chunks[0].factSetIds).toEqual(['fs-1']);

      // Should mention base URL
      expect(chunks[0].textDraft).toContain('https://api.example.com');
      expect(chunks[0].textDraft).toContain('Axios client');

      // Should NOT contain competing entity names (negative assertion)
      expect(chunks[0].textDraft).not.toContain('Express');
      expect(chunks[0].textDraft).not.toContain('Mongoose');
      expect(chunks[0].textDraft).not.toContain('router');
    });

    it('should extract timeout from config', () => {
      const entity: Entity = {
        id: 'axios-1',
        kind: 'constant',
        name: 'apiClient',
        path: 'src/api.ts',
        exported: true,
      };

      const factSet: FactSet = {
        id: 'fs-1',
        facts: [
          { subjectId: 'axios-1', predicate: 'is-constant', object: true },
          { subjectId: 'axios-1', predicate: 'initializer-call', object: 'axios.create' },
          {
            subjectId: 'axios-1',
            predicate: 'initializer',
            object: `axios.create({ baseURL: 'https://api.example.com', timeout: 10000 })`,
          },
        ],
        sources: [],
        evidenceScore: 90,
      };

      kb.insertEntity(entity);
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks[0].textDraft).toContain('timeout');
      expect(chunks[0].textDraft).toContain('10000');
    });

    it('should handle dynamic config with lower confidence', () => {
      const entity: Entity = {
        id: 'axios-1',
        kind: 'constant',
        name: 'apiClient',
        path: 'src/api.ts',
        exported: true,
      };

      const factSet: FactSet = {
        id: 'fs-1',
        facts: [
          { subjectId: 'axios-1', predicate: 'is-constant', object: true },
          { subjectId: 'axios-1', predicate: 'initializer-call', object: 'axios.create' },
          {
            subjectId: 'axios-1',
            predicate: 'initializer',
            object: `axios.create(getConfig())`, // Dynamic config
          },
        ],
        sources: [],
        evidenceScore: 90,
      };

      kb.insertEntity(entity);
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks.length).toBe(1);
      expect(chunks[0].confidence).toBe('Medium'); // Downgraded for dynamic config
      expect(chunks[0].textDraft).toContain('dynamic');
    });

    it('should return empty array if not matched', () => {
      const entity: Entity = {
        id: 'func-1',
        kind: 'function',
        name: 'notAxios',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);

      const chunks = pattern.describe(kb, entity);
      expect(chunks).toEqual([]);
    });

    it('should NOT throw on errors, return error chunk', () => {
      const entity: Entity = {
        id: 'bad-1',
        kind: 'constant',
        name: 'bad',
        path: 'src/bad.ts',
        exported: true,
      };

      kb.insertEntity(entity);
      kb.insertFactSet({
        id: 'fs-1',
        facts: [
          { subjectId: 'bad-1', predicate: 'is-constant', object: true },
          { subjectId: 'bad-1', predicate: 'initializer-call', object: 'axios.create' },
          // Malformed initializer
          { subjectId: 'bad-1', predicate: 'initializer', object: { invalid: 'not a string' } },
        ],
        sources: [],
        evidenceScore: 90,
      });

      expect(() => pattern.describe(kb, entity)).not.toThrow();

      const chunks = pattern.describe(kb, entity);
      // Should handle error gracefully - may return empty or error chunk
      expect(Array.isArray(chunks)).toBe(true);
    });
  });

  describe('confidenceAdjustments()', () => {
    it('should return positive adjustment for axios.create', () => {
      const entity: Entity = {
        id: 'axios-1',
        kind: 'constant',
        name: 'apiClient',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);
      kb.insertFactSet({
        id: 'fs-1',
        facts: [
          { subjectId: 'axios-1', predicate: 'is-constant', object: true },
          { subjectId: 'axios-1', predicate: 'initializer-call', object: 'axios.create' },
        ],
        sources: [],
        evidenceScore: 90,
      });

      const adjustment = pattern.confidenceAdjustments(kb, entity);

      expect(adjustment).toBeDefined();
      expect(adjustment!.adjustment).toBeGreaterThan(0);
      expect(adjustment!.reason).toContain('Axios');
    });

    it('should return undefined for non-matching entities', () => {
      const entity: Entity = {
        id: 'func-1',
        kind: 'function',
        name: 'notAxios',
        path: 'src/api.ts',
        exported: true,
      };

      kb.insertEntity(entity);

      const adjustment = pattern.confidenceAdjustments(kb, entity);
      expect(adjustment).toBeUndefined();
    });
  });
});
