import { describe, it, expect } from 'vitest';
import { Parser } from '../../../src/parser/parser.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Parser - routes.js Wrapper Args Validation', () => {
  it('should extract wrapper/middleware arguments from routes.js', async () => {
    // Read the actual routes.js file
    const routesPath = path.join(process.cwd(), 'output-test/routes.js');
    const source = fs.readFileSync(routesPath, 'utf8');

    const parser = new Parser({ moduleScopeCalls: true });
    const result = await parser.parse('routes.js', source);

    const router = result.entities.find(e => e.name === 'router');
    const routerFactSet = result.factSets.find(fs => fs.id === `${router?.id}-facts`);

    console.log(`\n=== ROUTES.JS VALIDATION ===`);
    console.log(`Router facts: ${routerFactSet?.facts.length}`);

    // Count middleware/wrapper facts
    const wrapperFacts = routerFactSet?.facts.filter(f =>
      f.predicate.startsWith('call-arg') && !f.predicate.includes('wrapped')
    );
    console.log(`\nCall arguments (including wrappers): ${wrapperFacts?.length}`);

    // Count wrapped handler facts
    const wrappedFacts = routerFactSet?.facts.filter(f =>
      f.predicate.includes('wrapped')
    );
    console.log(`Wrapped arguments (handlers): ${wrappedFacts?.length}`);

    // Look for specific patterns from routes.js
    // Example: router.post('/disclosure/:id', allowedRoles('ANY'), wrapAsync(updateDisclosure))
    const hasAllowedRoles = wrapperFacts?.some(f => f.object === 'allowedRoles');
    const hasWrapAsync = wrapperFacts?.some(f => f.object === 'wrapAsync');

    console.log(`\n=== WRAPPER PATTERNS DETECTED ===`);
    console.log(`allowedRoles: ${hasAllowedRoles ? 'YES' : 'NO'}`);
    console.log(`wrapAsync: ${hasWrapAsync ? 'YES' : 'NO'}`);

    // Assertions
    expect(wrapperFacts?.length).toBeGreaterThan(50); // Many middleware/wrappers
    expect(wrappedFacts?.length).toBeGreaterThan(20); // Many wrapped handlers

    // These patterns should be present in the real routes.js file
    if (source.includes('allowedRoles') && source.includes('wrapAsync')) {
      expect(hasAllowedRoles).toBe(true);
      expect(hasWrapAsync).toBe(true);
    }
  });
});
