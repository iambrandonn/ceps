/**
 * Phase 6 I1: Express Patterns Integration Test
 *
 * End-to-end test of Express pattern detection using PatternRegistry.
 * Tests middleware, router, and route handler detection.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PatternRegistry } from '../../src/reasoning/patterns/pattern-registry.js';
import { registerExpressPatterns } from '../../src/reasoning/patterns/express/index.js';
import { KnowledgeBase } from '../../src/kb/knowledge-base.js';
import { Entity, FactSet } from '../../src/kb/models.js';

describe('Express Patterns Integration', () => {
  let kb: KnowledgeBase;
  let registry: PatternRegistry;

  beforeEach(() => {
    kb = new KnowledgeBase();
    registry = new PatternRegistry();
    registerExpressPatterns(registry);
  });

  describe('pattern registration', () => {
    it('registers Express patterns successfully', () => {
      // Registry should have patterns registered
      // We can verify by trying to match entities
      const middlewareEntity: Entity = {
        id: 'test-middleware',
        kind: 'function',
        name: 'authMiddleware',
        path: 'middleware/auth.ts',
        exported: true,
      };
      kb.insertEntity(middlewareEntity);

      const factSet: FactSet = {
        id: 'fs-1',
        facts: [
          { subjectId: middlewareEntity.id, predicate: 'is-function', object: true },
          { subjectId: middlewareEntity.id, predicate: 'param-count', object: 3 },
          { subjectId: middlewareEntity.id, predicate: 'param-names', object: 'req,res,next' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const match = registry.match(kb, middlewareEntity);
      expect(match).toBeDefined();
      expect(match?.id).toBe('express.middleware');
    });
  });

  describe('middleware pattern detection', () => {
    it('detects middleware and generates behavior chunk', () => {
      const entity: Entity = {
        id: 'auth-middleware',
        kind: 'function',
        name: 'authMiddleware',
        path: 'middleware/auth.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-auth',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
          { subjectId: entity.id, predicate: 'param-count', object: 3 },
          { subjectId: entity.id, predicate: 'param-names', object: 'req,res,next' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const chunks = registry.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].textDraft).toContain('Express middleware');
      expect(chunks[0].textDraft).toContain('authMiddleware');
      expect(chunks[0].confidence).toBe('High');
      expect(chunks[0].factSetIds).toContain('fs-auth');
    });

    it('applies confidence adjustments', () => {
      const entity: Entity = {
        id: 'cors-middleware',
        kind: 'function',
        name: 'corsMiddleware',
        path: 'middleware/cors.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-cors',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
          { subjectId: entity.id, predicate: 'param-count', object: 3 },
          { subjectId: entity.id, predicate: 'param-names', object: 'req,res,next' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const delta = registry.getConfidenceAdjustments(kb, entity);

      expect(delta).toBeDefined();
      expect(delta?.adjustment).toBe(10);
      expect(delta?.reason).toContain('Express middleware');
    });
  });

  describe('router pattern detection', () => {
    it('detects router and generates behavior chunk', () => {
      const entity: Entity = {
        id: 'users-router',
        kind: 'constant',
        name: 'usersRouter',
        path: 'routes/users.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-router',
        facts: [
          { subjectId: entity.id, predicate: 'is-constant', object: true },
          { subjectId: entity.id, predicate: 'initializer-call', object: 'Router' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const chunks = registry.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].textDraft).toContain('Express Router');
      expect(chunks[0].textDraft).toContain('usersRouter');
      expect(chunks[0].confidence).toBe('High');
      expect(chunks[0].factSetIds).toContain('fs-router');
    });

    it('extracts route handlers from router', () => {
      const entity: Entity = {
        id: 'api-router',
        kind: 'constant',
        name: 'apiRouter',
        path: 'routes/api.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-api',
        facts: [
          { subjectId: entity.id, predicate: 'is-constant', object: true },
          { subjectId: entity.id, predicate: 'initializer-call', object: 'Router' },
          // Route 1: GET /users
          { subjectId: entity.id, predicate: 'calls-expression', object: 'apiRouter.get' },
          { subjectId: entity.id, predicate: 'call-arg-0', object: '/users' },
          // Route 2: POST /users
          { subjectId: entity.id, predicate: 'calls-expression', object: 'apiRouter.post' },
          { subjectId: entity.id, predicate: 'call-arg-0', object: '/users' },
          // Route 3: DELETE /users/:id
          { subjectId: entity.id, predicate: 'calls-expression', object: 'apiRouter.delete' },
          { subjectId: entity.id, predicate: 'call-arg-0', object: '/users/:id' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const chunks = registry.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].textDraft).toMatch(/GET \/users/);
      expect(chunks[0].textDraft).toMatch(/POST \/users/);
      expect(chunks[0].textDraft).toMatch(/DELETE \/users\/:id/);
    });

    it('applies confidence adjustments for router', () => {
      const entity: Entity = {
        id: 'posts-router',
        kind: 'constant',
        name: 'postsRouter',
        path: 'routes/posts.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-posts',
        facts: [
          { subjectId: entity.id, predicate: 'is-constant', object: true },
          { subjectId: entity.id, predicate: 'initializer-call', object: 'Router' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const delta = registry.getConfidenceAdjustments(kb, entity);

      expect(delta).toBeDefined();
      expect(delta?.adjustment).toBe(10);
      expect(delta?.reason).toContain('Express Router');
    });
  });

  describe('pattern precedence', () => {
    it('middleware pattern has correct precedence', () => {
      // Both middleware and router are FRAMEWORK_CORE priority
      // Should evaluate alphabetically: middleware before router

      const middlewareEntity: Entity = {
        id: 'middleware-1',
        kind: 'function',
        name: 'testMiddleware',
        path: 'test.ts',
        exported: true,
      };
      kb.insertEntity(middlewareEntity);

      const middlewareFactSet: FactSet = {
        id: 'fs-middleware',
        facts: [
          { subjectId: middlewareEntity.id, predicate: 'is-function', object: true },
          { subjectId: middlewareEntity.id, predicate: 'param-count', object: 3 },
          { subjectId: middlewareEntity.id, predicate: 'param-names', object: 'req,res,next' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(middlewareFactSet);

      const match = registry.match(kb, middlewareEntity);
      expect(match?.id).toBe('express.middleware'); // Should match middleware, not router
    });
  });

  describe('polluted dataset handling (Phase -1 requirement)', () => {
    it('correctly associates route paths with specific calls', () => {
      // Test that multiple calls with different paths are correctly parsed
      const entity: Entity = {
        id: 'complex-router',
        kind: 'constant',
        name: 'complexRouter',
        path: 'routes/complex.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-complex',
        facts: [
          { subjectId: entity.id, predicate: 'is-constant', object: true },
          { subjectId: entity.id, predicate: 'initializer-call', object: 'Router' },
          // First route: GET /users
          { subjectId: entity.id, predicate: 'calls-expression', object: 'complexRouter.get' },
          { subjectId: entity.id, predicate: 'call-arg-0', object: '/users' },
          // Some other call (should be skipped)
          { subjectId: entity.id, predicate: 'calls-expression', object: 'console.log' },
          { subjectId: entity.id, predicate: 'call-arg-0', object: 'debug message' },
          // Second route: POST /posts
          { subjectId: entity.id, predicate: 'calls-expression', object: 'complexRouter.post' },
          { subjectId: entity.id, predicate: 'call-arg-0', object: '/posts' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const chunks = registry.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      // Should detect both routes correctly
      expect(chunks[0].textDraft).toMatch(/GET \/users/);
      expect(chunks[0].textDraft).toMatch(/POST \/posts/);
      // Should NOT include the console.log or its argument
      expect(chunks[0].textDraft).not.toContain('debug message');
    });

    it('handles router without explicit path (dynamic path)', () => {
      const entity: Entity = {
        id: 'dynamic-router',
        kind: 'constant',
        name: 'dynamicRouter',
        path: 'routes/dynamic.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-dynamic',
        facts: [
          { subjectId: entity.id, predicate: 'is-constant', object: true },
          { subjectId: entity.id, predicate: 'initializer-call', object: 'Router' },
          // Route without literal path (no call-arg-0 after the call)
          { subjectId: entity.id, predicate: 'calls-expression', object: 'dynamicRouter.get' },
          // Next call comes immediately (no path argument)
          { subjectId: entity.id, predicate: 'calls-expression', object: 'dynamicRouter.post' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const chunks = registry.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      // Should detect routes with (dynamic) paths
      expect(chunks[0].textDraft).toMatch(/GET \(dynamic\)/);
      expect(chunks[0].textDraft).toMatch(/POST \(dynamic\)/);
    });
  });

  describe('error handling (never throws)', () => {
    it('handles missing KB data gracefully', () => {
      const entity: Entity = {
        id: 'missing-data',
        kind: 'function',
        name: 'missingFunc',
        path: 'missing.ts',
        exported: true,
      };
      kb.insertEntity(entity);
      // No factSets inserted

      expect(() => registry.describe(kb, entity)).not.toThrow();
      const chunks = registry.describe(kb, entity);
      expect(chunks).toEqual([]); // No match = empty chunks
    });

    it('handles malformed fact data gracefully', () => {
      const entity: Entity = {
        id: 'malformed',
        kind: 'function',
        name: 'malformedFunc',
        path: 'malformed.ts',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-malformed',
        facts: [
          { subjectId: entity.id, predicate: 'param-count', object: 'not-a-number' },
          { subjectId: entity.id, predicate: 'param-names', object: null },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      expect(() => registry.describe(kb, entity)).not.toThrow();
      const chunks = registry.describe(kb, entity);
      expect(chunks).toEqual([]); // No valid match
    });
  });
});
