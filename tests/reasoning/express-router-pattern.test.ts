/**
 * Phase 6 I1: Express Router Pattern Tests
 *
 * Tests for detecting Express Router constants (initialized with Router()).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExpressRouterPattern } from '../../src/reasoning/patterns/express/router.js';
import { KnowledgeBase } from '../../src/kb/knowledge-base.js';
import { Entity, FactSet } from '../../src/kb/models.js';
import { PatternPriority } from '../../src/reasoning/patterns/types.js';

describe('ExpressRouterPattern', () => {
  let kb: KnowledgeBase;
  let pattern: ExpressRouterPattern;

  beforeEach(() => {
    kb = new KnowledgeBase();
    pattern = new ExpressRouterPattern();
  });

  describe('module metadata', () => {
    it('has correct ID', () => {
      expect(pattern.id).toBe('express.router');
    });

    it('has FRAMEWORK_CORE priority', () => {
      expect(pattern.priority).toBe(PatternPriority.FRAMEWORK_CORE);
    });
  });

  describe('matches()', () => {
    it('matches constant initialized with Router()', () => {
      const entity: Entity = {
        id: 'router-1',
        kind: 'constant',
        name: 'usersRouter',
        path: 'routes/users.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-1',
        facts: [
          { subjectId: entity.id, predicate: 'is-constant', object: true },
          { subjectId: entity.id, predicate: 'initializer-call', object: 'Router' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      expect(pattern.matches(kb, entity)).toBe(true);
    });

    it('matches with Router() in initializer fact', () => {
      const entity: Entity = {
        id: 'router-2',
        kind: 'constant',
        name: 'postsRouter',
        path: 'routes/posts.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-2',
        facts: [
          { subjectId: entity.id, predicate: 'is-constant', object: true },
          { subjectId: entity.id, predicate: 'initializer', object: 'Router()' },
          { subjectId: entity.id, predicate: 'initializer-call', object: 'Router' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      expect(pattern.matches(kb, entity)).toBe(true);
    });

    it('does not match constant without Router initialization', () => {
      const entity: Entity = {
        id: 'not-router-1',
        kind: 'constant',
        name: 'config',
        path: 'config.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-3',
        facts: [
          { subjectId: entity.id, predicate: 'is-constant', object: true },
          { subjectId: entity.id, predicate: 'initializer', object: '{ port: 3000 }' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      expect(pattern.matches(kb, entity)).toBe(false);
    });

    it('does not match non-constant entities', () => {
      const entity: Entity = {
        id: 'not-constant',
        kind: 'function',
        name: 'Router',
        path: 'router.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-4',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
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
        kind: 'constant',
        name: 'emptyConst',
        path: 'empty.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      expect(pattern.matches(kb, entity)).toBe(false);
    });

    it('does not throw on error (error handling contract)', () => {
      const entity: Entity = {
        id: 'malformed',
        kind: 'constant',
        name: 'badConst',
        path: 'bad.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-5',
        facts: [
          { subjectId: entity.id, predicate: 'initializer-call', object: null },
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
    it('generates behavior chunk for router', () => {
      const entity: Entity = {
        id: 'router-1',
        kind: 'constant',
        name: 'usersRouter',
        path: 'routes/users.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-1',
        facts: [
          { subjectId: entity.id, predicate: 'is-constant', object: true },
          { subjectId: entity.id, predicate: 'initializer-call', object: 'Router' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].targetEntityId).toBe(entity.id);
      expect(chunks[0].textDraft).toContain('Express Router');
      expect(chunks[0].textDraft).toContain('usersRouter');
      expect(chunks[0].confidence).toBe('High');
      expect(chunks[0].factSetIds).toContain('fs-1');
    });

    it('detects route handlers on router (router.get, router.post, etc.)', () => {
      const entity: Entity = {
        id: 'router-2',
        kind: 'constant',
        name: 'apiRouter',
        path: 'routes/api.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-2',
        facts: [
          { subjectId: entity.id, predicate: 'is-constant', object: true },
          { subjectId: entity.id, predicate: 'initializer-call', object: 'Router' },
          { subjectId: entity.id, predicate: 'calls-expression', object: 'apiRouter.get' },
          { subjectId: entity.id, predicate: 'call-arg-0', object: '/users' },
          { subjectId: entity.id, predicate: 'calls-expression', object: 'apiRouter.post' },
          { subjectId: entity.id, predicate: 'call-arg-0', object: '/users' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].textDraft).toMatch(/GET.*\/users/);
      expect(chunks[0].textDraft).toMatch(/POST.*\/users/);
    });

    it('handles router with no route definitions', () => {
      const entity: Entity = {
        id: 'router-3',
        kind: 'constant',
        name: 'emptyRouter',
        path: 'routes/empty.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-3',
        facts: [
          { subjectId: entity.id, predicate: 'is-constant', object: true },
          { subjectId: entity.id, predicate: 'initializer-call', object: 'Router' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].textDraft).toContain('Express Router');
      expect(chunks[0].textDraft).not.toContain('GET');
      expect(chunks[0].textDraft).not.toContain('POST');
    });

    it('returns empty array for non-matching entity', () => {
      const entity: Entity = {
        id: 'not-router',
        kind: 'constant',
        name: 'config',
        path: 'config.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const chunks = pattern.describe(kb, entity);
      expect(chunks).toEqual([]);
    });

    it('does not throw on error (error handling contract)', () => {
      const entity: Entity = {
        id: 'error-case',
        kind: 'constant',
        name: 'badRouter',
        path: 'bad.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      expect(() => pattern.describe(kb, entity)).not.toThrow();
    });
  });

  describe('confidenceAdjustments()', () => {
    it('returns positive adjustment for router pattern', () => {
      const entity: Entity = {
        id: 'router-1',
        kind: 'constant',
        name: 'usersRouter',
        path: 'routes/users.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-1',
        facts: [
          { subjectId: entity.id, predicate: 'is-constant', object: true },
          { subjectId: entity.id, predicate: 'initializer-call', object: 'Router' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const delta = pattern.confidenceAdjustments?.(kb, entity);

      expect(delta).toBeDefined();
      expect(delta?.adjustment).toBeGreaterThan(0);
      expect(delta?.adjustment).toBeLessThanOrEqual(15);
      expect(delta?.reason).toContain('Express');
    });
  });

  describe('import style variations', () => {
    it('should match router with qualified import (express.Router)', () => {
      // ARRANGE: Create test fixture with qualified import
      // Simulates what parser emits for:
      // import express from 'express';
      // const router = express.Router();
      const routerEntity: Entity = {
        id: 'test-router-qualified',
        kind: 'constant',
        name: 'router',
        path: 'test-qualified.js',
        exported: false,
      };

      kb.insertEntity(routerEntity);

      // Critical: Use 'express.Router' not 'Router'
      const factSet: FactSet = {
        id: 'test-router-qualified-facts',
        facts: [
          { subjectId: routerEntity.id, predicate: 'is-constant', object: true },
          {
            subjectId: routerEntity.id,
            predicate: 'initializer-call',
            object: 'express.Router', // <-- Qualified name
          },
          {
            subjectId: routerEntity.id,
            predicate: 'calls-expression',
            object: 'router.get',
          },
        ],
        sources: [{ kind: 'ast', file: 'test-qualified.js' }],
        evidenceScore: 100,
      };

      kb.insertFactSet(factSet);

      // ACT
      const matches = pattern.matches(kb, routerEntity);

      // ASSERT
      expect(matches).toBe(true); // Will FAIL with current code
    });

    it('should match router with aliased import (myExpress.Router)', () => {
      // Test for: import * as myExpress from 'express'
      const routerEntity: Entity = {
        id: 'test-router-alias',
        kind: 'constant',
        name: 'router',
        path: 'test-alias.js',
        exported: false,
      };

      kb.insertEntity(routerEntity);

      const factSet: FactSet = {
        id: 'test-router-alias-facts',
        facts: [
          { subjectId: routerEntity.id, predicate: 'is-constant', object: true },
          {
            subjectId: routerEntity.id,
            predicate: 'initializer-call',
            object: 'myExpress.Router', // <-- Aliased
          },
        ],
        sources: [{ kind: 'ast', file: 'test-alias.js' }],
        evidenceScore: 100,
      };

      kb.insertFactSet(factSet);

      const matches = pattern.matches(kb, routerEntity);
      expect(matches).toBe(true); // Will FAIL
    });

    it('should still match router with bare import (Router)', () => {
      // Regression test: ensure original case still works
      // Test for: import { Router } from 'express'
      const routerEntity: Entity = {
        id: 'test-router-bare',
        kind: 'constant',
        name: 'router',
        path: 'test-bare.js',
        exported: false,
      };

      kb.insertEntity(routerEntity);

      const factSet: FactSet = {
        id: 'test-router-bare-facts',
        facts: [
          { subjectId: routerEntity.id, predicate: 'is-constant', object: true },
          {
            subjectId: routerEntity.id,
            predicate: 'initializer-call',
            object: 'Router', // <-- Bare name (original test case)
          },
        ],
        sources: [{ kind: 'ast', file: 'test-bare.js' }],
        evidenceScore: 100,
      };

      kb.insertFactSet(factSet);

      const matches = pattern.matches(kb, routerEntity);
      expect(matches).toBe(true); // Should PASS
    });
  });
});
