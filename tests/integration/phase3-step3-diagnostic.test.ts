/**
 * Phase 3 Step 3 - Phase -1 Diagnostic Test
 *
 * Purpose: Validate what predicates Phase 2 ACTUALLY emits before implementing pattern matching.
 * This test confirms the gap identified in upstream analysis.
 */

import { describe, it, expect } from 'vitest';
import { Project } from 'ts-morph';
import { FactExtractor } from '../../src/parser/fact-extractor.js';

describe('Phase -1 Diagnostic: Phase 2 Predicate Coverage', () => {
  it('should check what predicates Phase 2 emits for Express-like code', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const extractor = new FactExtractor();

    const sourceFile = project.createSourceFile(
      'src/routes.ts',
      `
      import express from 'express';
      const app = express();

      export function setupRoutes() {
        app.get('/users', (req, res) => {
          res.json([]);
        });

        app.use((req, res, next) => {
          next();
        });
      }
      `
    );

    const result = extractor.extract(sourceFile, 'src/routes.ts');

    // Collect all predicates from factSets
    const allPredicates = new Set<string>();
    result.factSets.forEach(fs => {
      fs.facts.forEach(f => allPredicates.add(f.predicate));
    });

    console.log('\n=== PHASE 2 PREDICATES FOR EXPRESS DETECTION ===');
    console.log('All emitted predicates:', Array.from(allPredicates));
    console.log('\nRequired for Step 3 pattern matching:');
    console.log('  - calls-expression:', allPredicates.has('calls-expression') ? '✅' : '❌ MISSING');
    console.log('  - call-arg-0:', allPredicates.has('call-arg-0') ? '✅' : '❌ MISSING');
    console.log('  - param-count:', allPredicates.has('param-count') ? '✅' : '❌ MISSING');
    console.log('  - param-names:', allPredicates.has('param-names') ? '✅' : '❌ MISSING');

    // Check call relations (objectId contains expression text, not structured predicates)
    console.log('\nCall relations:', result.relations.filter(r => r.predicate === 'calls'));

    // Document findings - Phase 2 baseline
    expect(allPredicates.has('is-function')).toBe(true);
    expect(allPredicates.has('has-signature')).toBe(true);

    // Phase 3 Step 3 enhancements - NOW PRESENT
    expect(allPredicates.has('calls-expression')).toBe(true); // ✅ Added
    expect(allPredicates.has('call-arg-0')).toBe(true); // ✅ Added (route path '/users')
    expect(allPredicates.has('param-count')).toBe(true); // ✅ Added

    // Verify call expression facts match call relations
    const callFacts = result.factSets[0].facts.filter(f => f.predicate === 'calls-expression');
    expect(callFacts.length).toBeGreaterThan(0);
    expect(callFacts.some(f => f.object === 'app.get')).toBe(true);
    expect(callFacts.some(f => f.object === 'app.use')).toBe(true);
  });

  it('should check what predicates Phase 2 emits for React-like code', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const extractor = new FactExtractor();

    const sourceFile = project.createSourceFile(
      'src/Button.tsx',
      `
      import React, { useState } from 'react';

      export function Button(props: { label: string }) {
        const [count, setCount] = useState(0);
        return <button onClick={() => setCount(count + 1)}>{props.label}</button>;
      }
      `
    );

    const result = extractor.extract(sourceFile, 'src/Button.tsx');

    const allPredicates = new Set<string>();
    result.factSets.forEach(fs => {
      fs.facts.forEach(f => allPredicates.add(f.predicate));
    });

    console.log('\n=== PHASE 2 PREDICATES FOR REACT DETECTION ===');
    console.log('All emitted predicates:', Array.from(allPredicates));
    console.log('\nRequired for Step 3 pattern matching:');
    console.log('  - returns-jsx:', allPredicates.has('returns-jsx') ? '✅' : '❌ MISSING');
    console.log('  - calls-expression:', allPredicates.has('calls-expression') ? '✅' : '❌ MISSING');

    // Phase 3 Step 3 enhancements - NOW PRESENT
    expect(allPredicates.has('returns-jsx')).toBe(true); // ✅ Added
    expect(allPredicates.has('calls-expression')).toBe(true); // ✅ Added (useState)
    expect(allPredicates.has('param-count')).toBe(true); // ✅ Added
    expect(allPredicates.has('param-names')).toBe(true); // ✅ Added

    // Verify returns-jsx detection
    const jsxFact = result.factSets[0].facts.find(f => f.predicate === 'returns-jsx');
    expect(jsxFact).toBeDefined();
    expect(jsxFact?.object).toBe(true);
  });
});
