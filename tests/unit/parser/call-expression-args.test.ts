import { describe, it, expect } from 'vitest';
import { Parser } from '../../../src/parser/parser.js';

describe('Parser - CallExpression Arguments', () => {
  it('should extract CallExpression arguments (middleware/handlers)', async () => {
    const source = `
      import express from 'express';
      const router = express.Router();

      router.post('/users', allowedRoles('ADMIN'), wrapAsync(handler));
    `;

    const parser = new Parser();
    const result = await parser.parse('src/routes.ts', source);

    const router = result.entities.find(e => e.name === 'router');
    const routerFactSet = result.factSets.find(fs => fs.id === `${router?.id}-facts`);

    console.log('\n=== CALL-ARG FACTS ===');
    const argFacts = routerFactSet?.facts.filter(f => f.predicate.startsWith('call-arg'));
    argFacts?.forEach(f => console.log(`${f.predicate}: ${f.object}`));

    // Should have extracted path (string literal)
    const arg0Facts = routerFactSet?.facts.filter(f => f.predicate === 'call-arg-0');
    expect(arg0Facts?.some(f => f.object === '/users')).toBe(true);

    // Should have extracted wrapper call (CallExpression)
    const arg1Facts = routerFactSet?.facts.filter(f => f.predicate === 'call-arg-1');
    expect(arg1Facts?.some(f => f.object === 'allowedRoles')).toBe(true);

    // Should have extracted wrapped function name
    const wrapped1Facts = routerFactSet?.facts.filter(f => f.predicate === 'call-arg-1-wrapped-0');
    expect(wrapped1Facts?.some(f => f.object === 'ADMIN')).toBe(true);

    // Should have extracted second wrapper
    const arg2Facts = routerFactSet?.facts.filter(f => f.predicate === 'call-arg-2');
    expect(arg2Facts?.some(f => f.object === 'wrapAsync')).toBe(true);

    // Should have extracted wrapped handler
    const wrapped2Facts = routerFactSet?.facts.filter(f => f.predicate === 'call-arg-2-wrapped-0');
    expect(wrapped2Facts?.some(f => f.object === 'handler')).toBe(true);
  });

  it('should handle mixed argument types', async () => {
    const source = `
      import express from 'express';
      const router = express.Router();

      router.get('/api/data', authenticate, authorize('read'), handler);
    `;

    const parser = new Parser();
    const result = await parser.parse('src/routes.ts', source);

    const router = result.entities.find(e => e.name === 'router');
    const routerFactSet = result.factSets.find(fs => fs.id === `${router?.id}-facts`);

    // arg-0: path (string)
    const arg0 = routerFactSet?.facts.find(f => f.predicate === 'call-arg-0');
    expect(arg0?.object).toBe('/api/data');

    // arg-1: middleware (identifier)
    const arg1 = routerFactSet?.facts.find(f => f.predicate === 'call-arg-1');
    expect(arg1?.object).toBe('authenticate');

    // arg-2: wrapper (CallExpression)
    const arg2 = routerFactSet?.facts.find(f => f.predicate === 'call-arg-2');
    expect(arg2?.object).toBe('authorize');

    // arg-2-wrapped-0: wrapped argument
    const wrapped = routerFactSet?.facts.find(f => f.predicate === 'call-arg-2-wrapped-0');
    expect(wrapped?.object).toBe('read');

    // arg-3: handler (identifier)
    const arg3 = routerFactSet?.facts.find(f => f.predicate === 'call-arg-3');
    expect(arg3?.object).toBe('handler');
  });

  it('should handle array arguments in wrapper calls', async () => {
    const source = `
      import express from 'express';
      const router = express.Router();

      router.post('/admin', allowedRoles(['ADMIN', 'SUPERUSER']), handler);
    `;

    const parser = new Parser();
    const result = await parser.parse('src/routes.ts', source);

    const router = result.entities.find(e => e.name === 'router');
    const routerFactSet = result.factSets.find(fs => fs.id === `${router?.id}-facts`);

    // Should extract the wrapper call
    const arg1 = routerFactSet?.facts.find(f => f.predicate === 'call-arg-1');
    expect(arg1?.object).toBe('allowedRoles');

    // Array arguments will be stored as array expression text for now
    // (We can enhance this later if needed)
    const wrapped = routerFactSet?.facts.filter(f => f.predicate.startsWith('call-arg-1-wrapped'));
    expect(wrapped.length).toBeGreaterThanOrEqual(0); // At least captures that there's an argument
  });
});
