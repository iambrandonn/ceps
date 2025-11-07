#!/usr/bin/env node
/**
 * Phase 6 WS-D Express: Phase -1 Analysis Script
 *
 * Dumps KB facts for Express fixture to understand parser output.
 * This helps design pattern matchers by seeing actual data structures.
 */

import { KnowledgeBase } from '../dist/kb/knowledge-base.js';
import { Scanner } from '../dist/scanner/scanner.js';
import { Parser } from '../dist/parser/parser.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('=== Phase 6 Express Pattern Analysis ===\n');

  const fixtureRoot = path.resolve(__dirname, '../tests/fixtures/tiny-express');
  console.log(`Analyzing: ${fixtureRoot}\n`);

  // Initialize components
  const kb = new KnowledgeBase();
  const scanner = new Scanner(fixtureRoot);
  const parser = new Parser();

  // Scan and parse fixture
  console.log('Step 1: Scanning files...');
  const fileIndex = await scanner.scan();
  console.log(`Found ${fileIndex.entries.length} source files\n`);

  console.log('Step 2: Parsing and extracting facts...');
  const codeFiles = fileIndex.entries.filter(e => e.kind === 'code');

  for (const entry of codeFiles) {
    const source = await import('fs').then(fs => fs.promises.readFile(entry.absolutePath, 'utf8'));
    await parser.parseAndStore(entry.path, source, kb);
  }

  const entities = Array.from(kb['state'].entities.values());
  console.log(`Extracted ${entities.length} entities\n`);

  // Analyze Express-specific entities
  console.log('=== EXPRESS PATTERNS DETECTED ===\n');

  for (const entity of entities) {
    // Skip non-exported entities for now (focus on public API)
    if (!entity.exported && entity.visibility !== 'public') {
      continue;
    }

    console.log(`\n--- ${entity.kind}: ${entity.name} (${entity.path}) ---`);
    console.log(`ID: ${entity.id}`);
    console.log(`Exported: ${entity.exported}`);

    // Get all factSets for this entity
    const factSets = kb.getFactSetsBySubject(entity.id);

    if (factSets.length === 0) {
      console.log('  [No facts]');
      continue;
    }

    for (const factSet of factSets) {
      console.log(`\nFactSet: ${factSet.id} (evidence: ${factSet.evidenceScore})`);
      console.log(`Facts (${factSet.facts.length}):`);

      for (const fact of factSet.facts) {
        const objectStr =
          typeof fact.object === 'object'
            ? JSON.stringify(fact.object)
            : String(fact.object);
        console.log(`  ${fact.predicate}: ${objectStr}`);
      }
    }
  }

  // Summary statistics
  console.log('\n\n=== SUMMARY STATISTICS ===\n');
  console.log(`Total entities: ${entities.length}`);
  console.log(`Exported entities: ${entities.filter(e => e.exported).length}`);
  console.log(`Functions: ${entities.filter(e => e.kind === 'function').length}`);
  console.log(`Constants: ${entities.filter(e => e.kind === 'constant').length}`);
  console.log(`FactSets: ${kb['state'].factSets.size}`);

  // Pattern-specific analysis
  console.log('\n=== EXPRESS-SPECIFIC PATTERNS ===\n');

  let routeHandlers = 0;
  let middlewareFunctions = 0;
  let asyncHandlers = 0;

  for (const entity of entities) {
    const factSets = kb.getFactSetsBySubject(entity.id);

    for (const factSet of factSets) {
      const facts = factSet.facts;

      // Check for route handlers
      const hasRouteCall = facts.some(
        f =>
          f.predicate === 'calls-expression' &&
          /^(app|router)\.(get|post|put|delete|patch)$/i.test(String(f.object))
      );
      if (hasRouteCall) routeHandlers++;

      // Check for middleware (3-param with req/res/next)
      const paramCount = facts.find(f => f.predicate === 'param-count');
      const paramNames = facts.find(f => f.predicate === 'param-names');
      if (
        paramCount &&
        paramCount.object === 3 &&
        paramNames &&
        /req.*res.*next/i.test(String(paramNames.object))
      ) {
        middlewareFunctions++;
      }

      // Check for async
      const isAsync = facts.some(
        f =>
          (f.predicate === 'is-async' && f.object === true) ||
          (f.predicate === 'returns-promise' && f.object === true)
      );
      if (isAsync) asyncHandlers++;
    }
  }

  console.log(`Route handlers detected: ${routeHandlers}`);
  console.log(`Middleware functions detected: ${middlewareFunctions}`);
  console.log(`Async handlers detected: ${asyncHandlers}`);

  console.log('\n=== FACT PREDICATE INVENTORY ===\n');

  const allPredicates = new Set();
  for (const factSet of kb['state'].factSets.values()) {
    for (const fact of factSet.facts) {
      allPredicates.add(fact.predicate);
    }
  }

  console.log('Available predicates:');
  for (const predicate of Array.from(allPredicates).sort()) {
    console.log(`  - ${predicate}`);
  }

  console.log('\n=== ANALYSIS COMPLETE ===\n');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
