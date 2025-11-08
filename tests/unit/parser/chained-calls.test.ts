import { describe, it, expect } from 'vitest';
import { Parser } from '../../../src/parser/parser.js';

describe('Parser - Chained Call Extraction', () => {
  it('should extract chained calls (router.route().get())', async () => {
    const source = `
      import express from 'express';
      const router = express.Router();
      router.route('/users').get(handler).post(createHandler);
    `;

    const parser = new Parser();
    const result = await parser.parse('src/routes.ts', source);

    const router = result.entities.find(e => e.name === 'router');
    const routerFactSet = result.factSets.find(fs => fs.id === `${router?.id}-facts`);

    // Should have initial call to router.route
    const callsFacts = routerFactSet?.facts.filter(f => f.predicate === 'calls-expression');
    expect(callsFacts?.some(f => f.object === 'router.route')).toBe(true);

    // Should have chained-call facts for .get() and .post()
    const chainedCallFacts = routerFactSet?.facts.filter(f => f.predicate === 'chained-call');
    expect(chainedCallFacts?.length).toBeGreaterThanOrEqual(2);
    expect(chainedCallFacts?.some(f => f.object === 'get')).toBe(true);
    expect(chainedCallFacts?.some(f => f.object === 'post')).toBe(true);
  });

  it('should extract arguments from chained calls', async () => {
    const source = `
      import express from 'express';
      const router = express.Router();
      router.route('/users').get(handler);
    `;

    const parser = new Parser();
    const result = await parser.parse('src/routes.ts', source);

    const router = result.entities.find(e => e.name === 'router');
    const routerFactSet = result.factSets.find(fs => fs.id === `${router?.id}-facts`);

    // Should capture the path argument for router.route()
    const arg0Facts = routerFactSet?.facts.filter(f => f.predicate === 'call-arg-0');
    expect(arg0Facts?.some(f => f.object === '/users')).toBe(true);

    // Should have chained-call-arg-0 for the handler in .get()
    const chainedArgFacts = routerFactSet?.facts.filter(f => f.predicate === 'chained-call-arg-0');
    expect(chainedArgFacts?.some(f => f.object === 'handler')).toBe(true);
  });

  it('should handle deeply chained calls', async () => {
    const source = `
      import express from 'express';
      const app = express();
      app.route('/api').all(authMiddleware).get(handler).post(createHandler);
    `;

    const parser = new Parser();
    const result = await parser.parse('src/app.ts', source);

    const app = result.entities.find(e => e.name === 'app');
    const appFactSet = result.factSets.find(fs => fs.id === `${app?.id}-facts`);

    const chainedCallFacts = appFactSet?.facts.filter(f => f.predicate === 'chained-call');
    expect(chainedCallFacts?.length).toBeGreaterThanOrEqual(3);
    expect(chainedCallFacts?.some(f => f.object === 'all')).toBe(true);
    expect(chainedCallFacts?.some(f => f.object === 'get')).toBe(true);
    expect(chainedCallFacts?.some(f => f.object === 'post')).toBe(true);
  });

  it('should not extract chained calls when flag is disabled', async () => {
    const source = `
      import express from 'express';
      const router = express.Router();
      router.route('/users').get(handler);
    `;

    const parser = new Parser({ moduleScopeCalls: false });
    const result = await parser.parse('src/routes.ts', source);

    const router = result.entities.find(e => e.name === 'router');
    const routerFactSet = result.factSets.find(fs => fs.id === `${router?.id}-facts`);

    // Should NOT have module-scope calls when disabled
    const callsFacts = routerFactSet?.facts.filter(f => f.predicate === 'calls-expression');
    expect(callsFacts?.some(f => f.object === 'router.route')).toBe(false);

    const chainedCallFacts = routerFactSet?.facts.filter(f => f.predicate === 'chained-call');
    expect(chainedCallFacts?.length).toBe(0);
  });

  it('should handle mixed chained and non-chained calls', async () => {
    const source = `
      import express from 'express';
      const router = express.Router();
      router.get('/simple', handler); // Non-chained
      router.route('/chained').get(handler2); // Chained
    `;

    const parser = new Parser();
    const result = await parser.parse('src/routes.ts', source);

    const router = result.entities.find(e => e.name === 'router');
    const routerFactSet = result.factSets.find(fs => fs.id === `${router?.id}-facts`);

    const callsFacts = routerFactSet?.facts.filter(f => f.predicate === 'calls-expression');
    expect(callsFacts?.some(f => f.object === 'router.get')).toBe(true);
    expect(callsFacts?.some(f => f.object === 'router.route')).toBe(true);

    const chainedCallFacts = routerFactSet?.facts.filter(f => f.predicate === 'chained-call');
    expect(chainedCallFacts?.some(f => f.object === 'get')).toBe(true);
  });
});
