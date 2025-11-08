import { describe, it, expect } from 'vitest';
import { Parser } from '../../../src/parser/parser.js';

describe('Parser - Module Scope Call Extraction', () => {
  describe('Basic module-scope calls', () => {
    it('should extract calls on module-level constants', async () => {
      const source = `
        import express from 'express';
        const router = express.Router();

        router.post('/users', handler);
      `;

      const parser = new Parser();
      const result = await parser.parse('src/routes.ts', source);

      // Find router entity
      const router = result.entities.find(e => e.name === 'router');
      expect(router).toBeDefined();
      expect(router?.kind).toBe('constant');

      // Find router's factSet
      const routerFactSet = result.factSets.find(fs => fs.id === `${router?.id}-facts`);
      expect(routerFactSet).toBeDefined();

      // Should have calls-expression fact for router.post
      const callsFacts = routerFactSet?.facts.filter(f => f.predicate === 'calls-expression');
      expect(callsFacts).toBeDefined();
      expect(callsFacts?.length).toBeGreaterThan(0);
      expect(callsFacts?.some(f => f.object === 'router.post')).toBe(true);
    });

    it('should extract call arguments from module-scope calls', async () => {
      const source = `
        import express from 'express';
        const router = express.Router();

        router.post('/users', middleware, handler);
      `;

      const parser = new Parser();
      const result = await parser.parse('src/routes.ts', source);

      const router = result.entities.find(e => e.name === 'router');
      const routerFactSet = result.factSets.find(fs => fs.id === `${router?.id}-facts`);

      // Should have call-arg-0 fact with the path
      const arg0Facts = routerFactSet?.facts.filter(f => f.predicate === 'call-arg-0');
      expect(arg0Facts?.some(f => f.object === '/users')).toBe(true);

      // Should have call-arg-1 fact with middleware
      const arg1Facts = routerFactSet?.facts.filter(f => f.predicate === 'call-arg-1');
      expect(arg1Facts?.some(f => f.object === 'middleware')).toBe(true);

      // Should have call-arg-2 fact with handler
      const arg2Facts = routerFactSet?.facts.filter(f => f.predicate === 'call-arg-2');
      expect(arg2Facts?.some(f => f.object === 'handler')).toBe(true);
    });

    it('should handle multiline module-scope calls', async () => {
      const source = `
        import express from 'express';
        const router = express.Router();

        router.post(
          '/users',
          authenticate,
          handler
        );
      `;

      const parser = new Parser();
      const result = await parser.parse('src/routes.ts', source);

      const router = result.entities.find(e => e.name === 'router');
      const routerFactSet = result.factSets.find(fs => fs.id === `${router?.id}-facts`);

      // Should extract call and arguments despite multiline formatting
      const callsFacts = routerFactSet?.facts.filter(f => f.predicate === 'calls-expression');
      expect(callsFacts?.some(f => f.object === 'router.post')).toBe(true);

      const arg0Facts = routerFactSet?.facts.filter(f => f.predicate === 'call-arg-0');
      expect(arg0Facts?.some(f => f.object === '/users')).toBe(true);
    });
  });

  describe('Pseudo-entities for bare expressions', () => {
    it('should create synthetic constant entity for bare expression statements', async () => {
      const source = `
        import app from './app';

        app.use('/api', apiRouter);
      `;

      const parser = new Parser();
      const result = await parser.parse('src/server.ts', source);

      // Since app is imported (not a constant declaration), the bare expression
      // app.use(...) should be attached to a synthetic entity
      // Note: This test may need adjustment based on implementation details

      // At minimum, we should extract the call fact somewhere
      const allCallFacts = result.factSets.flatMap(fs =>
        fs.facts.filter(f => f.predicate === 'calls-expression')
      );

      expect(allCallFacts.some(f => f.object === 'app.use')).toBe(true);
    });
  });

  describe('Chained calls', () => {
    it('should extract chained method calls', async () => {
      const source = `
        import express from 'express';
        const router = express.Router();

        router.route('/users').get(getHandler).post(postHandler);
      `;

      const parser = new Parser();
      const result = await parser.parse('src/routes.ts', source);

      const router = result.entities.find(e => e.name === 'router');
      const routerFactSet = result.factSets.find(fs => fs.id === `${router?.id}-facts`);

      const callsFacts = routerFactSet?.facts.filter(f => f.predicate === 'calls-expression');

      // Should extract router.route call
      expect(callsFacts?.some(f => f.object === 'router.route')).toBe(true);

      // Note: Chained calls implementation details TBD
      // May need to extract .get and .post as separate calls or linked via chained-call predicate
    });
  });

  describe('Scope tracking', () => {
    it('should attach module-scope calls to correct entity', async () => {
      const source = `
        import express from 'express';
        const router = express.Router();
        const otherRouter = express.Router();

        router.post('/users', handler);
        otherRouter.get('/posts', handler);
      `;

      const parser = new Parser();
      const result = await parser.parse('src/routes.ts', source);

      const router = result.entities.find(e => e.name === 'router');
      const otherRouter = result.entities.find(e => e.name === 'otherRouter');

      const routerFactSet = result.factSets.find(fs => fs.id === `${router?.id}-facts`);
      const otherRouterFactSet = result.factSets.find(fs => fs.id === `${otherRouter?.id}-facts`);

      // router should have router.post call
      const routerCalls = routerFactSet?.facts.filter(f => f.predicate === 'calls-expression');
      expect(routerCalls?.some(f => f.object === 'router.post')).toBe(true);
      expect(routerCalls?.some(f => f.object === 'otherRouter.get')).toBe(false);

      // otherRouter should have otherRouter.get call
      const otherRouterCalls = otherRouterFactSet?.facts.filter(f => f.predicate === 'calls-expression');
      expect(otherRouterCalls?.some(f => f.object === 'otherRouter.get')).toBe(true);
      expect(otherRouterCalls?.some(f => f.object === 'router.post')).toBe(false);
    });

    it('should not confuse module-scope calls with function-scope calls', async () => {
      const source = `
        import express from 'express';
        const router = express.Router();

        router.post('/users', handler);

        function handler(req, res) {
          router.locals.set('key', 'value');
        }
      `;

      const parser = new Parser();
      const result = await parser.parse('src/routes.ts', source);

      const router = result.entities.find(e => e.name === 'router');
      const handlerFunc = result.entities.find(e => e.name === 'handler');

      const routerFactSet = result.factSets.find(fs => fs.id === `${router?.id}-facts`);
      const handlerFactSet = result.factSets.find(fs => fs.id === `${handlerFunc?.id}-facts`);

      // router entity should have router.post (module-scope call)
      const routerCalls = routerFactSet?.facts.filter(f => f.predicate === 'calls-expression');
      expect(routerCalls?.some(f => f.object === 'router.post')).toBe(true);
      expect(routerCalls?.some(f => f.object === 'router.locals.set')).toBe(false);

      // handler function should have router.locals.set (function-scope call)
      const handlerCalls = handlerFactSet?.facts.filter(f => f.predicate === 'calls-expression');
      expect(handlerCalls?.some(f => f.object === 'router.locals.set')).toBe(true);
      expect(handlerCalls?.some(f => f.object === 'router.post')).toBe(false);
    });
  });

  describe('Multiple HTTP verbs', () => {
    it('should extract all router method calls (get/post/put/delete)', async () => {
      const source = `
        import express from 'express';
        const router = express.Router();

        router.get('/users', getHandler);
        router.post('/users', postHandler);
        router.put('/users/:id', putHandler);
        router.delete('/users/:id', deleteHandler);
      `;

      const parser = new Parser();
      const result = await parser.parse('src/routes.ts', source);

      const router = result.entities.find(e => e.name === 'router');
      const routerFactSet = result.factSets.find(fs => fs.id === `${router?.id}-facts`);

      const callsFacts = routerFactSet?.facts.filter(f => f.predicate === 'calls-expression');

      expect(callsFacts?.some(f => f.object === 'router.get')).toBe(true);
      expect(callsFacts?.some(f => f.object === 'router.post')).toBe(true);
      expect(callsFacts?.some(f => f.object === 'router.put')).toBe(true);
      expect(callsFacts?.some(f => f.object === 'router.delete')).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle constants without module-scope calls', async () => {
      const source = `
        const API_KEY = 'secret';
        const PORT = 3000;
      `;

      const parser = new Parser();
      const result = await parser.parse('src/config.ts', source);

      const apiKey = result.entities.find(e => e.name === 'API_KEY');
      const port = result.entities.find(e => e.name === 'PORT');

      expect(apiKey).toBeDefined();
      expect(port).toBeDefined();

      // Should not crash or add call facts to non-callable constants
      const apiKeyFactSet = result.factSets.find(fs => fs.id === `${apiKey?.id}-facts`);
      const callsFacts = apiKeyFactSet?.facts.filter(f => f.predicate === 'calls-expression');
      expect(callsFacts?.length).toBe(0);
    });

    it('should handle empty source file', async () => {
      const source = ``;

      const parser = new Parser();
      const result = await parser.parse('src/empty.ts', source);

      expect(result.entities.length).toBe(0);
      expect(result.factSets.length).toBe(0);
    });

    it('should handle file with only imports', async () => {
      const source = `
        import express from 'express';
        import { Router } from 'express';
      `;

      const parser = new Parser();
      const result = await parser.parse('src/imports.ts', source);

      // Should have import relations but no entities/facts
      expect(result.relations.some(r => r.predicate === 'imports')).toBe(true);
    });
  });

  describe('Call metadata', () => {
    it('should include call-scope metadata for module-level calls', async () => {
      const source = `
        import express from 'express';
        const router = express.Router();

        router.post('/users', handler);
      `;

      const parser = new Parser();
      const result = await parser.parse('src/routes.ts', source);

      const router = result.entities.find(e => e.name === 'router');
      const routerFactSet = result.factSets.find(fs => fs.id === `${router?.id}-facts`);

      // Should have call-scope fact indicating module scope
      const scopeFacts = routerFactSet?.facts.filter(f => f.predicate === 'call-scope');
      expect(scopeFacts?.length).toBeGreaterThan(0);
      expect(scopeFacts?.some(f => (f.object as string).includes('module'))).toBe(true);
    });
  });
});
