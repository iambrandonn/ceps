#!/usr/bin/env node

/**
 * Phase 6 Phase -1: KB Debug Dump Script
 *
 * Dumps Knowledge Base state after parsing for investigation.
 * Usage: npx tsx scripts/debug-kb-dump.mjs <project-path>
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { Orchestrator, PipelinePhase } from '../dist/orchestrator/orchestrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function dumpKB(projectPath) {
  console.log(`\n=== KB DEBUG DUMP FOR: ${projectPath} ===\n`);

  // Create orchestrator
  const orchestrator = new Orchestrator({
    projectRoot: projectPath,
    llm: 'off',
    deterministic: true,
    snapshotEnabled: false
  });

  // Run until parsing is complete
  console.log('Running scanner and parser...');
  await orchestrator.runUntil(PipelinePhase.PARSING);

  // Access KB through orchestrator
  const kb = orchestrator.getKnowledgeBase();

  // Extract all entities
  const entities = kb.getAllEntities();
  console.log(`\nFound ${entities.length} entities`);

  // Group by kind
  const byKind = entities.reduce((acc, e) => {
    acc[e.kind] = (acc[e.kind] || 0) + 1;
    return acc;
  }, {});
  console.log('\nEntities by kind:', byKind);

  // Find router entity
  const routerEntities = entities.filter(e =>
    e.name === 'router' ||
    e.name.toLowerCase().includes('router')
  );

  if (routerEntities.length > 0) {
    console.log(`\n=== ROUTER ENTITIES (${routerEntities.length}) ===`);
    for (const router of routerEntities) {
      console.log(`\nRouter: ${router.name} (${router.id})`);
      console.log(`  Kind: ${router.kind}`);
      console.log(`  Path: ${router.path}`);
      console.log(`  Exported: ${router.exported}`);

      // Get facts for this router
      const factSets = kb.getFactSetsBySubject(router.id);
      console.log(`  FactSets: ${factSets.length}`);

      for (const fs of factSets) {
        const routerFacts = fs.facts.filter(f => f.subjectId === router.id);
        console.log(`\n  FactSet ${fs.id} (${routerFacts.length} facts):`);

        for (const fact of routerFacts) {
          console.log(`    - ${fact.predicate}: ${JSON.stringify(fact.object)}`);
        }
      }
    }
  } else {
    console.log('\n❌ NO ROUTER ENTITIES FOUND');
    console.log('\nAll constants:');
    entities.filter(e => e.kind === 'constant').forEach(e => {
      console.log(`  - ${e.name} (${e.id})`);
    });
  }

  // Check for route-related facts across ALL entities
  console.log('\n=== SEARCHING FOR ROUTE CALLS ACROSS ALL ENTITIES ===');

  const allFactSets = [];
  for (const entity of entities) {
    const factSets = kb.getFactSetsBySubject(entity.id);
    for (const fs of factSets) {
      allFactSets.push({ entity, factSet: fs });
    }
  }

  // Look for calls-expression facts
  let routeCallCount = 0;
  for (const { entity, factSet } of allFactSets) {
    const callFacts = factSet.facts.filter(f =>
      f.predicate === 'calls-expression' &&
      (String(f.object).includes('.get') ||
       String(f.object).includes('.post') ||
       String(f.object).includes('.put') ||
       String(f.object).includes('.delete'))
    );

    if (callFacts.length > 0) {
      routeCallCount += callFacts.length;
      console.log(`\nEntity: ${entity.name} (${entity.kind})`);
      for (const fact of callFacts) {
        console.log(`  - ${fact.predicate}: ${fact.object}`);
      }
    }
  }

  if (routeCallCount === 0) {
    console.log('\n❌ NO ROUTE CALLS FOUND (router.get/post/put/delete)');
    console.log('\nThis suggests SCENARIO A (Parser Limitation)');
  } else {
    console.log(`\n✅ Found ${routeCallCount} route calls`);
    console.log('This suggests SCENARIO B (Cross-Entity) or C (Pattern Matcher)');
  }

  // Export full KB dump to JSON
  const dumpPath = join(projectPath, 'kb-dump.json');
  const dump = {
    timestamp: new Date().toISOString(),
    projectPath,
    entities: entities.map(e => ({
      id: e.id,
      kind: e.kind,
      name: e.name,
      path: e.path,
      exported: e.exported
    })),
    factSets: allFactSets.map(({ entity, factSet }) => ({
      id: factSet.id,
      entityId: entity.id,
      entityName: entity.name,
      facts: factSet.facts.map(f => ({
        subjectId: f.subjectId,
        predicate: f.predicate,
        object: f.object
      }))
    }))
  };

  fs.writeFileSync(dumpPath, JSON.stringify(dump, null, 2));
  console.log(`\n✅ Full KB dump written to: ${dumpPath}`);
  console.log('\nUse jq to query:');
  console.log(`  jq '.entities[] | select(.name == "router")' ${dumpPath}`);
  console.log(`  jq '.factSets[] | select(.entityName == "router")' ${dumpPath}`);
}

const projectPath = process.argv[2];
if (!projectPath) {
  console.error('Usage: npx tsx scripts/debug-kb-dump.mjs <project-path>');
  console.error('Example: npx tsx scripts/debug-kb-dump.mjs output-test');
  process.exit(1);
}

dumpKB(projectPath).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
