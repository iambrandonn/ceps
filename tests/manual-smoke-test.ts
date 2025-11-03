/**
 * Manual Smoke Test for Parser
 * Tests parser against real ceps codebase files
 */

import { Parser } from '../src/parser/parser';
import { KnowledgeBase } from '../src/kb/knowledge-base';
import * as fs from 'fs';
import * as path from 'path';

async function runSmokeTest() {
  console.log('🔥 Parser Smoke Test - Testing against ceps codebase\n');

  const parser = new Parser();
  const kb = new KnowledgeBase();

  // Test files from actual ceps codebase
  const testFiles = [
    'src/kb/knowledge-base.ts',
    'src/kb/models.ts',
    'src/kb/id-generation.ts',
    'src/parser/parser.ts',
    'src/parser/fact-extractor.ts',
    'tests/unit/kb/knowledge-base.test.ts',
  ];

  let totalFiles = 0;
  let successfulFiles = 0;
  let totalEntities = 0;
  let totalRelations = 0;
  let totalFactSets = 0;
  const errors: string[] = [];

  for (const file of testFiles) {
    const filePath = path.join(process.cwd(), file);

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${file}`);
      continue;
    }

    const source = fs.readFileSync(filePath, 'utf-8');
    totalFiles++;

    try {
      console.log(`\n📄 Parsing: ${file}`);

      const result = await parser.parseAndStore(file, source, kb);

      console.log(`   ✅ Success:`);
      console.log(`      - Entities: ${result.entities.length}`);
      console.log(`      - Relations: ${result.relations.length}`);
      console.log(`      - FactSets: ${result.factSets.length}`);
      console.log(`      - Errors/Warnings: ${result.errors.length}`);

      if (result.errors.length > 0) {
        result.errors.forEach((err) => {
          console.log(`      - ${err.severity.toUpperCase()}: ${err.message.substring(0, 60)}...`);
        });
      }

      totalEntities += result.entities.length;
      totalRelations += result.relations.length;
      totalFactSets += result.factSets.length;
      successfulFiles++;
    } catch (error) {
      console.log(`   ❌ Failed: ${(error as Error).message}`);
      errors.push(`${file}: ${(error as Error).message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Smoke Test Summary\n');
  console.log(`Files Processed: ${totalFiles}`);
  console.log(`Successful: ${successfulFiles}`);
  console.log(`Failed: ${totalFiles - successfulFiles}`);
  console.log(`\nExtraction Stats:`);
  console.log(`  - Total Entities: ${totalEntities}`);
  console.log(`  - Total Relations: ${totalRelations}`);
  console.log(`  - Total FactSets: ${totalFactSets}`);

  // Verify KB has data
  console.log(`\nKB Verification:`);
  console.log(`  - Entities in KB: ${kb.listExported().length}`);
  console.log(`  - Relations in KB: ${kb.getRelations().length}`);

  if (errors.length > 0) {
    console.log(`\n❌ Errors:`);
    errors.forEach((err) => console.log(`  - ${err}`));
  }

  console.log('\n' + '='.repeat(60));

  if (successfulFiles === totalFiles && totalEntities > 0) {
    console.log('✅ SMOKE TEST PASSED - Parser is working correctly!\n');
    return 0;
  } else {
    console.log('⚠️  SMOKE TEST ISSUES - Review errors above\n');
    return 1;
  }
}

// Run smoke test
runSmokeTest()
  .then((exitCode) => process.exit(exitCode))
  .catch((error) => {
    console.error('💥 Smoke test crashed:', error);
    process.exit(1);
  });
