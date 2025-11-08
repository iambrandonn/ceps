import { describe, it, expect } from 'vitest';
import { Parser } from '../../../src/parser/parser.js';

describe('Parser - Pseudo-Entity Pattern Matching', () => {
  it('should create pseudo-entity with object name in metadata for bare expressions', async () => {
    const source = `
      import app from './app';
      app.get('/users', handler);
      app.post('/users', createHandler);
    `;

    const parser = new Parser();
    const result = await parser.parse('src/server.ts', source);

    // Should create pseudo-entity for app
    const pseudoEntity = result.entities.find(e => e.metadata?.synthetic);
    expect(pseudoEntity).toBeDefined();
    expect(pseudoEntity?.kind).toBe('constant');
    expect(pseudoEntity?.metadata?.synthetic).toBe(true);

    // Should store the object name in metadata
    expect(pseudoEntity?.metadata?.objectName).toBe('app');

    console.log('\n=== PSEUDO-ENTITY ===');
    console.log(`Name: ${pseudoEntity?.name}`);
    console.log(`Object Name: ${pseudoEntity?.metadata?.objectName}`);

    // Should have module-scope calls
    const pseudoFactSet = result.factSets.find(fs => fs.id === `${pseudoEntity?.id}-facts`);
    const callsFacts = pseudoFactSet?.facts.filter(f => f.predicate === 'calls-expression');

    console.log('\n=== CALLS ===');
    callsFacts?.forEach(f => console.log(`  - ${f.object}`));

    expect(callsFacts?.some(f => f.object === 'app.get')).toBe(true);
    expect(callsFacts?.some(f => f.object === 'app.post')).toBe(true);
  });

  it('should allow Express pattern matcher to match pseudo-entities', async () => {
    const source = `
      import app from './app';
      app.get('/api/data', handler);
    `;

    const parser = new Parser();
    const result = await parser.parse('src/server.ts', source);

    const pseudoEntity = result.entities.find(e => e.metadata?.synthetic);
    expect(pseudoEntity).toBeDefined();

    // Pattern matcher should be able to extract object name
    const entityName = pseudoEntity?.metadata?.objectName || pseudoEntity?.name;

    // This simulates what the pattern matcher does
    const routePattern = new RegExp(`^(${entityName}|router)\\.(get|post|put|delete|patch)$`, 'i');

    const pseudoFactSet = result.factSets.find(fs => fs.id === `${pseudoEntity?.id}-facts`);
    const callsFacts = pseudoFactSet?.facts.filter(f => f.predicate === 'calls-expression');

    // Should match the pattern
    const matchingCall = callsFacts?.find(f => routePattern.test(String(f.object)));
    expect(matchingCall).toBeDefined();
    expect(matchingCall?.object).toBe('app.get');
  });

  it('should handle multiple objects with bare expressions', async () => {
    const source = `
      import app from './app';
      import router from './router';

      app.use('/api', router);
      router.get('/users', handler);
    `;

    const parser = new Parser();
    const result = await parser.parse('src/server.ts', source);

    const pseudoEntities = result.entities.filter(e => e.metadata?.synthetic);
    expect(pseudoEntities.length).toBe(2);

    const appEntity = pseudoEntities.find(e => e.metadata?.objectName === 'app');
    const routerEntity = pseudoEntities.find(e => e.metadata?.objectName === 'router');

    expect(appEntity).toBeDefined();
    expect(routerEntity).toBeDefined();

    console.log('\n=== PSEUDO-ENTITIES ===');
    pseudoEntities.forEach(e => {
      console.log(`${e.name} (objectName: ${e.metadata?.objectName})`);
    });
  });
});
