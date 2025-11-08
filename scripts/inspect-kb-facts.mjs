#!/usr/bin/env node
/**
 * Quick KB inspection tool for Phase -1 analysis.
 * Parses a fixture and dumps entities/facts for manual inspection.
 */

import { Project } from 'ts-morph';
import { FactExtractor } from '../dist/parser/fact-extractor.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fixturePath = process.argv[2];
if (!fixturePath) {
  console.error('Usage: node inspect-kb-facts.mjs <fixture-path>');
  process.exit(1);
}

const fullPath = join(process.cwd(), fixturePath);

console.log(`\n📦 Inspecting fixture: ${fullPath}\n`);

// Initialize ts-morph project
const project = new Project({
  compilerOptions: {
    target: 99, // ESNext
    module: 99, // ESNext
    moduleResolution: 2, // NodeNext
    allowJs: true,
  },
});

// Add source files
project.addSourceFilesAtPaths(`${fullPath}/src/**/*.{ts,js}`);

const extractor = new FactExtractor();

// Process each file
const sourceFiles = project.getSourceFiles();
console.log(`Found ${sourceFiles.length} source files\n`);

for (const sourceFile of sourceFiles) {
  const filePath = sourceFile.getFilePath();
  const relativePath = filePath.replace(fullPath, '');

  console.log(`\n${'='.repeat(80)}`);
  console.log(`FILE: ${relativePath}`);
  console.log('='.repeat(80));

  try {
    const result = extractor.extract(sourceFile, filePath);

    console.log(`\n📋 ENTITIES (${result.entities.length}):`);
    result.entities.forEach(entity => {
      console.log(`\n  - ${entity.kind.toUpperCase()}: ${entity.name}`);
      console.log(`    ID: ${entity.id}`);
      console.log(`    Exported: ${entity.exported}`);
      if (entity.signature) {
        console.log(`    Signature: ${entity.signature}`);
      }
    });

    console.log(`\n\n📊 FACT SETS (${result.factSets.length}):`);
    result.factSets.forEach(factSet => {
      const entity = result.entities.find(e => factSet.id.startsWith(e.id));
      if (entity) {
        console.log(`\n  FactSet for: ${entity.name} (${entity.kind})`);
        console.log(`  Evidence Score: ${factSet.evidenceScore}`);
        console.log(`  Facts:`);
        factSet.facts.forEach(fact => {
          const objStr = typeof fact.object === 'string' && fact.object.length > 100
            ? fact.object.substring(0, 100) + '...'
            : JSON.stringify(fact.object);
          console.log(`    - ${fact.predicate}: ${objStr}`);
        });
      }
    });

    console.log(`\n\n🔗 RELATIONS (${result.relations.length}):`);
    result.relations.forEach(rel => {
      console.log(`  - ${rel.subjectId} --[${rel.predicate}]--> ${rel.objectId}`);
    });

  } catch (error) {
    console.error(`  ❌ Error processing file: ${error.message}`);
    console.error(error.stack);
  }
}

console.log(`\n${'='.repeat(80)}`);
console.log('Inspection complete');
console.log('='.repeat(80) + '\n');
