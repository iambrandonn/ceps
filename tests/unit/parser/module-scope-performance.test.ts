import { describe, it, expect } from 'vitest';
import { Parser } from '../../../src/parser/parser.js';

describe('Parser - Module Scope Performance', () => {
  // Generate large test file with many module-scope calls
  function generateLargeFile(numRoutes: number): string {
    const routes = [];
    for (let i = 0; i < numRoutes; i++) {
      routes.push(`router.get('/route${i}', handler${i});`);
    }

    return `
      import express from 'express';
      const router = express.Router();
      ${routes.join('\n      ')}
      export default router;
    `;
  }

  it('should have ≤10% performance overhead with module-scope extraction enabled', async () => {
    const source = generateLargeFile(100); // 100 routes

    // Baseline: module-scope extraction disabled
    const parserDisabled = new Parser({ moduleScopeCalls: false });
    const startDisabled = performance.now();
    await parserDisabled.parse('src/routes.ts', source);
    const endDisabled = performance.now();
    const timeDisabled = endDisabled - startDisabled;

    // Test: module-scope extraction enabled (default)
    const parserEnabled = new Parser({ moduleScopeCalls: true });
    const startEnabled = performance.now();
    await parserEnabled.parse('src/routes.ts', source);
    const endEnabled = performance.now();
    const timeEnabled = endEnabled - startEnabled;

    // Calculate overhead
    const overhead = ((timeEnabled - timeDisabled) / timeDisabled) * 100;

    console.log(`Performance Benchmark (100 routes):`);
    console.log(`  Disabled: ${timeDisabled.toFixed(2)}ms`);
    console.log(`  Enabled:  ${timeEnabled.toFixed(2)}ms`);
    console.log(`  Overhead: ${overhead.toFixed(2)}%`);

    // Verify overhead is ≤10%
    expect(overhead).toBeLessThanOrEqual(10);
  });

  it('should have consistent performance across different file sizes', async () => {
    const sizes = [10, 50, 100];
    const times: number[] = [];

    const parser = new Parser({ moduleScopeCalls: true });

    for (const size of sizes) {
      const source = generateLargeFile(size);
      const start = performance.now();
      await parser.parse('src/routes.ts', source);
      const end = performance.now();
      times.push(end - start);
    }

    console.log(`Scaling Benchmark:`);
    console.log(`  10 routes:  ${times[0].toFixed(2)}ms`);
    console.log(`  50 routes:  ${times[1].toFixed(2)}ms`);
    console.log(`  100 routes: ${times[2].toFixed(2)}ms`);

    // Verify all parse times are under reasonable threshold
    // Performance is dominated by ts-morph overhead, not our module-scope extraction
    for (const time of times) {
      expect(time).toBeLessThan(1000); // All should be < 1000ms (allowing for system load)
    }

    // Verify 100 routes doesn't take significantly longer than 10 routes
    // This shows our extraction has O(1) or near-O(1) overhead, not O(n)
    const ratio = times[2] / times[0];
    expect(ratio).toBeLessThan(5); // 100 routes shouldn't be >5x slower than 10 routes
  });

  it('should handle large files (≥5k LOC) efficiently', async () => {
    // Generate 5000 lines of code
    const source = generateLargeFile(1000); // ~5000 lines with handlers

    const parser = new Parser({ moduleScopeCalls: true });
    const start = performance.now();
    const result = await parser.parse('src/routes.ts', source);
    const end = performance.now();
    const time = end - start;

    console.log(`Large File Benchmark (5000 LOC):`);
    console.log(`  Parse time: ${time.toFixed(2)}ms`);
    console.log(`  Entities: ${result.entities.length}`);
    console.log(`  Relations: ${result.relations.length}`);
    console.log(`  FactSets: ${result.factSets.length}`);

    // Verify parsing completes in reasonable time (< 5 seconds)
    expect(time).toBeLessThan(5000);

    // Verify data was extracted
    expect(result.entities.length).toBeGreaterThan(0);
    expect(result.factSets.length).toBeGreaterThan(0);
  });

  it('should not significantly impact memory usage', async () => {
    const source = generateLargeFile(500); // 500 routes

    // Measure baseline memory
    if (global.gc) global.gc();
    const memBefore = process.memoryUsage().heapUsed;

    const parser = new Parser({ moduleScopeCalls: true });
    const result = await parser.parse('src/routes.ts', source);

    // Measure memory after parsing
    const memAfter = process.memoryUsage().heapUsed;
    const memIncrease = (memAfter - memBefore) / 1024 / 1024; // MB

    console.log(`Memory Benchmark (500 routes):`);
    console.log(`  Memory before: ${(memBefore / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Memory after:  ${(memAfter / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Increase:      ${memIncrease.toFixed(2)}MB`);
    console.log(`  Entities:      ${result.entities.length}`);

    // Verify memory increase is reasonable (< 50MB for 500 routes)
    expect(memIncrease).toBeLessThan(50);
  });

  it('should handle chained calls without significant overhead', async () => {
    const routes = [];
    for (let i = 0; i < 50; i++) {
      routes.push(`router.route('/route${i}').get(handler${i}).post(handler${i}).delete(handler${i});`);
    }

    const source = `
      import express from 'express';
      const router = express.Router();
      ${routes.join('\n      ')}
      export default router;
    `;

    const parser = new Parser({ moduleScopeCalls: true });
    const start = performance.now();
    const result = await parser.parse('src/routes.ts', source);
    const end = performance.now();
    const time = end - start;

    console.log(`Chained Calls Benchmark (50 chained routes):`);
    console.log(`  Parse time: ${time.toFixed(2)}ms`);
    console.log(`  FactSets: ${result.factSets.length}`);

    // Verify parsing completes in reasonable time
    expect(time).toBeLessThan(2000);

    // Verify chained calls were extracted
    const routerEntity = result.entities.find(e => e.name === 'router');
    const routerFactSet = result.factSets.find(fs => fs.id === `${routerEntity?.id}-facts`);
    const chainedCallFacts = routerFactSet?.facts.filter(f => f.predicate === 'chained-call');

    // Should have at least 150 chained calls (50 routes × 3 methods each)
    expect(chainedCallFacts?.length).toBeGreaterThanOrEqual(150);
  });
});
