import { describe, it, expect } from 'vitest';
import { Parser } from '../../../src/parser/parser.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Parser - routes.js Debug', () => {
  it('should extract module-scope calls from routes.js', async () => {
    // Read the actual routes.js file
    const routesPath = path.join(process.cwd(), 'output-test/routes.js');
    const source = fs.readFileSync(routesPath, 'utf8');

    const parser = new Parser({ moduleScopeCalls: true });
    const result = await parser.parse('routes.js', source);

    console.log(`\n=== PARSED routes.js ===`);
    console.log(`Total entities: ${result.entities.length}`);
    console.log(`Total factSets: ${result.factSets.length}`);

    const router = result.entities.find(e => e.name === 'router');
    console.log(`\nRouter entity: ${router ? 'FOUND' : 'NOT FOUND'}`);

    if (router) {
      const routerFactSet = result.factSets.find(fs => fs.id === `${router.id}-facts`);
      console.log(`Router factSet: ${routerFactSet ? 'FOUND' : 'NOT FOUND'}`);

      if (routerFactSet) {
        console.log(`Router facts count: ${routerFactSet.facts.length}`);

        const callsFacts = routerFactSet.facts.filter(f => f.predicate === 'calls-expression');
        console.log(`\ncalls-expression facts: ${callsFacts.length}`);
        callsFacts.slice(0, 10).forEach(f => {
          console.log(`  - ${f.object}`);
        });

        const callScopeFacts = routerFactSet.facts.filter(f => f.predicate === 'call-scope');
        console.log(`\ncall-scope facts: ${callScopeFacts.length}`);

        // Assertions
        expect(router).toBeDefined();
        expect(routerFactSet).toBeDefined();
        expect(callsFacts.length).toBeGreaterThan(0);
      }
    }
  });
});
