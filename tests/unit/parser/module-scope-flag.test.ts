import { describe, it, expect } from 'vitest';
import { Parser } from '../../../src/parser/parser.js';

describe('Parser - Module Scope Calls Flag', () => {
  it('should extract module-scope calls by default', async () => {
    const source = `
      import express from 'express';
      const router = express.Router();
      router.post('/users', handler);
    `;

    const parser = new Parser(); // Default: moduleScopeCalls enabled
    const result = await parser.parse('src/routes.ts', source);

    const router = result.entities.find(e => e.name === 'router');
    const routerFactSet = result.factSets.find(fs => fs.id === `${router?.id}-facts`);

    const callsFacts = routerFactSet?.facts.filter(f => f.predicate === 'calls-expression');
    expect(callsFacts?.some(f => f.object === 'router.post')).toBe(true);
  });

  it('should skip module-scope calls when disabled', async () => {
    const source = `
      import express from 'express';
      const router = express.Router();
      router.post('/users', handler);
    `;

    const parser = new Parser({ moduleScopeCalls: false });
    const result = await parser.parse('src/routes.ts', source);

    const router = result.entities.find(e => e.name === 'router');
    expect(router).toBeDefined(); // Router constant should still exist

    const routerFactSet = result.factSets.find(fs => fs.id === `${router?.id}-facts`);

    const callsFacts = routerFactSet?.facts.filter(f => f.predicate === 'calls-expression');
    // Should NOT have module-scope calls when disabled
    expect(callsFacts?.some(f => f.object === 'router.post')).toBe(false);
  });

  it('should still extract function-scope calls when module-scope disabled', async () => {
    const source = `
      import express from 'express';
      const router = express.Router();

      function setupRoutes() {
        router.post('/users', handler);
      }
    `;

    const parser = new Parser({ moduleScopeCalls: false });
    const result = await parser.parse('src/routes.ts', source);

    // Function should have the call
    const setupRoutes = result.entities.find(e => e.name === 'setupRoutes');
    const setupRoutesFactSet = result.factSets.find(fs => fs.id === `${setupRoutes?.id}-facts`);

    const callsFacts = setupRoutesFactSet?.facts.filter(f => f.predicate === 'calls-expression');
    // Function-scope calls should still work
    expect(callsFacts?.some(f => f.object === 'router.post')).toBe(true);
  });
});
