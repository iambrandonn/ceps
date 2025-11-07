/**
 * Phase 6 I3: Express Config Pattern Unit Tests
 *
 * Tests for Express configuration and environment pattern detection:
 * - app.set() config setting
 * - app.get() config reading
 * - process.env.* environment variable reads
 * - Feature flags and conditional configuration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeBase } from '../../src/kb/knowledge-base.js';
import { Entity, FactSet } from '../../src/kb/models.js';
import { ExpressConfigPattern } from '../../src/reasoning/patterns/express/config.js';
import { PatternPriority } from '../../src/reasoning/patterns/types.js';

describe('ExpressConfigPattern', () => {
  let kb: KnowledgeBase;
  let pattern: ExpressConfigPattern;

  beforeEach(() => {
    kb = new KnowledgeBase();
    pattern = new ExpressConfigPattern();
  });

  describe('pattern contract', () => {
    it('has correct ID', () => {
      expect(pattern.id).toBe('express.config');
    });

    it('has FRAMEWORK_CORE priority', () => {
      expect(pattern.priority).toBe(PatternPriority.FRAMEWORK_CORE);
    });

    it('implements required methods', () => {
      expect(typeof pattern.matches).toBe('function');
      expect(typeof pattern.describe).toBe('function');
    });
  });

  describe('matches()', () => {
    it('returns false for non-function entities', () => {
      const entity: Entity = {
        id: 'config-const-1',
        kind: 'constant',
        name: 'CONFIG',
        path: 'src/config.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      expect(pattern.matches(kb, entity)).toBe(false);
    });

    it('returns false for functions without config calls', () => {
      const entity: Entity = {
        id: 'func-1',
        kind: 'function',
        name: 'normalFunction',
        path: 'src/utils.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-1',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      expect(pattern.matches(kb, entity)).toBe(false);
    });

    it('returns true for function with app.set() calls', () => {
      const entity: Entity = {
        id: 'func-2',
        kind: 'function',
        name: 'configureApp',
        path: 'src/app.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-2',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
          { subjectId: entity.id, predicate: 'calls-expression', object: 'app.set' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      expect(pattern.matches(kb, entity)).toBe(true);
    });

    it('returns true for function with app.get() config reads', () => {
      const entity: Entity = {
        id: 'func-3',
        kind: 'function',
        name: 'setupRoutes',
        path: 'src/app.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-3',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
          { subjectId: entity.id, predicate: 'calls-expression', object: 'app.get' },
          { subjectId: entity.id, predicate: 'call-arg-0', object: 'apiVersion' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      expect(pattern.matches(kb, entity)).toBe(true);
    });

    it('returns true for function with process.env reads', () => {
      const entity: Entity = {
        id: 'func-4',
        kind: 'function',
        name: 'loadConfig',
        path: 'src/config.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-4',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
          { subjectId: entity.id, predicate: 'reads-property', object: 'process.env.NODE_ENV' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      expect(pattern.matches(kb, entity)).toBe(true);
    });

    it('returns false for malformed entities without throwing', () => {
      const entity: Entity = {
        id: 'func-broken',
        kind: 'function',
        name: 'brokenEntity',
        path: 'src/broken.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      // No factSet added - malformed entity
      expect(() => pattern.matches(kb, entity)).not.toThrow();
      expect(pattern.matches(kb, entity)).toBe(false);
    });
  });

  describe('describe()', () => {
    it('returns empty array for non-matching entities', () => {
      const entity: Entity = {
        id: 'const-1',
        kind: 'constant',
        name: 'DATA',
        path: 'src/data.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const chunks = pattern.describe(kb, entity);
      expect(chunks).toEqual([]);
    });

    it('describes app.set() configuration behavior', () => {
      const entity: Entity = {
        id: 'func-5',
        kind: 'function',
        name: 'configureApp',
        path: 'src/app.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-5',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
          { subjectId: entity.id, predicate: 'calls-expression', object: 'app.set' },
          { subjectId: entity.id, predicate: 'call-arg-0', object: 'port' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toMatchObject({
        targetEntityId: entity.id,
        confidence: 'High',
      });
      expect(chunks[0].textDraft).toContain('configuration');
      expect(chunks[0].textDraft).toContain('app.set');
      expect(chunks[0].factSetIds).toContain(factSet.id);
    });

    it('describes app.get() config reads', () => {
      const entity: Entity = {
        id: 'func-6',
        kind: 'function',
        name: 'setupRoutes',
        path: 'src/app.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-6',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
          { subjectId: entity.id, predicate: 'calls-expression', object: 'app.get' },
          { subjectId: entity.id, predicate: 'call-arg-0', object: 'apiVersion' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].textDraft).toContain('configuration');
      expect(chunks[0].textDraft).toContain('app.get');
      expect(chunks[0].confidence).toBe('High');
    });

    it('describes process.env environment variable reads', () => {
      const entity: Entity = {
        id: 'func-7',
        kind: 'function',
        name: 'loadConfig',
        path: 'src/config.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-7',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
          { subjectId: entity.id, predicate: 'reads-property', object: 'process.env.NODE_ENV' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].textDraft).toContain('environment variable');
      expect(chunks[0].textDraft).toContain('NODE_ENV');
      expect(chunks[0].confidence).toBe('High');
    });

    it('handles multiple config operations in single function', () => {
      const entity: Entity = {
        id: 'func-8',
        kind: 'function',
        name: 'initializeApp',
        path: 'src/app.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-8',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
          { subjectId: entity.id, predicate: 'calls-expression', object: 'app.set' },
          { subjectId: entity.id, predicate: 'call-arg-0', object: 'port' },
          { subjectId: entity.id, predicate: 'calls-expression', object: 'app.set' },
          { subjectId: entity.id, predicate: 'call-arg-0', object: 'views' },
          { subjectId: entity.id, predicate: 'reads-property', object: 'process.env.PORT' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].textDraft).toContain('configuration');
      expect(chunks[0].textDraft).toContain('environment');
    });

    it('includes factSet IDs for grounding', () => {
      const entity: Entity = {
        id: 'func-9',
        kind: 'function',
        name: 'configure',
        path: 'src/config.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-9',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
          { subjectId: entity.id, predicate: 'calls-expression', object: 'app.set' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks[0].factSetIds).toContain(factSet.id);
      expect(chunks[0].factSetIds.length).toBeGreaterThan(0);
    });
  });

  describe('polluted dataset handling', () => {
    it('does not cross-match config calls between entities', () => {
      // Create two entities with similar config patterns
      const entity1: Entity = {
        id: 'func-10',
        kind: 'function',
        name: 'configApp1',
        path: 'src/app1.ts',
        exported: true,
      };
      kb.insertEntity(entity1);

      const entity2: Entity = {
        id: 'func-11',
        kind: 'function',
        name: 'configApp2',
        path: 'src/app2.ts',
        exported: true,
      };
      kb.insertEntity(entity2);

      // Entity1: app.set('port', 3000)
      const fs1: FactSet = {
        id: 'fs-10',
        facts: [
          { subjectId: entity1.id, predicate: 'is-function', object: true },
          { subjectId: entity1.id, predicate: 'calls-expression', object: 'app.set' },
          { subjectId: entity1.id, predicate: 'call-arg-0', object: 'port' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(fs1);

      // Entity2: app.set('views', './views')
      const fs2: FactSet = {
        id: 'fs-11',
        facts: [
          { subjectId: entity2.id, predicate: 'is-function', object: true },
          { subjectId: entity2.id, predicate: 'calls-expression', object: 'app.set' },
          { subjectId: entity2.id, predicate: 'call-arg-0', object: 'views' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(fs2);

      // Both should match
      expect(pattern.matches(kb, entity1)).toBe(true);
      expect(pattern.matches(kb, entity2)).toBe(true);

      // Chunks should NOT contain cross-entity facts
      const chunks1 = pattern.describe(kb, entity1);
      const chunks2 = pattern.describe(kb, entity2);

      expect(chunks1[0].targetEntityId).toBe(entity1.id);
      expect(chunks2[0].targetEntityId).toBe(entity2.id);

      // Chunks should only reference their own factSets
      expect(chunks1[0].factSetIds).toContain(fs1.id);
      expect(chunks1[0].factSetIds).not.toContain(fs2.id);

      expect(chunks2[0].factSetIds).toContain(fs2.id);
      expect(chunks2[0].factSetIds).not.toContain(fs1.id);
    });

    it('handles multiple app.set calls in same entity correctly', () => {
      const entity: Entity = {
        id: 'func-12',
        kind: 'function',
        name: 'setupApp',
        path: 'src/app.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-12',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
          // First app.set
          { subjectId: entity.id, predicate: 'calls-expression', object: 'app.set' },
          { subjectId: entity.id, predicate: 'call-arg-0', object: 'port' },
          // Second app.set
          { subjectId: entity.id, predicate: 'calls-expression', object: 'app.set' },
          { subjectId: entity.id, predicate: 'call-arg-0', object: 'views' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      // Should mention multiple config operations
      expect(chunks[0].textDraft.length).toBeGreaterThan(0);
    });
  });

  describe('confidence scoring', () => {
    it('assigns High confidence for explicit app.set/get calls', () => {
      const entity: Entity = {
        id: 'func-13',
        kind: 'function',
        name: 'config',
        path: 'src/config.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-13',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
          { subjectId: entity.id, predicate: 'calls-expression', object: 'app.set' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);
      expect(chunks[0].confidence).toBe('High');
    });

    it('assigns High confidence for process.env reads', () => {
      const entity: Entity = {
        id: 'func-14',
        kind: 'function',
        name: 'loadEnv',
        path: 'src/env.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-14',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
          { subjectId: entity.id, predicate: 'reads-property', object: 'process.env.API_KEY' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);
      expect(chunks[0].confidence).toBe('High');
    });
  });
});
