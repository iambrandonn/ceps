#!/usr/bin/env node
/**
 * Lexicon Linter
 *
 * Validates ceps.lexicon.json for:
 * - Alphabetical ordering of canonical verbs
 * - No duplicate synonyms across canonicals
 * - Valid JSON structure
 */

const fs = require('fs');
const path = require('path');

const LEXICON_PATH = path.resolve(__dirname, '../src/validation/lexicon/ceps.lexicon.json');

function main() {
  console.log('🔍 Linting lexicon...\n');

  let hasErrors = false;

  // 1. Load and parse JSON
  let lexicon;
  try {
    const content = fs.readFileSync(LEXICON_PATH, 'utf-8');
    lexicon = JSON.parse(content);
    console.log('✅ Valid JSON structure');
  } catch (error) {
    console.error(`❌ Invalid JSON: ${error.message}`);
    process.exit(1);
  }

  // 2. Check alphabetical order
  const canonicals = Object.keys(lexicon);
  const sorted = [...canonicals].sort();

  if (JSON.stringify(canonicals) !== JSON.stringify(sorted)) {
    console.error('❌ Canonical verbs are not alphabetically sorted');
    console.error('   Expected order:', sorted.join(', '));
    console.error('   Actual order:  ', canonicals.join(', '));
    hasErrors = true;
  } else {
    console.log('✅ Canonical verbs are alphabetically sorted');
  }

  // 3. Check for duplicate synonyms
  const synonymMap = new Map();
  const duplicates = [];

  for (const [canonical, synonyms] of Object.entries(lexicon)) {
    if (!Array.isArray(synonyms)) {
      console.error(`❌ Canonical "${canonical}" has non-array value`);
      hasErrors = true;
      continue;
    }

    for (const synonym of synonyms) {
      const lower = synonym.toLowerCase();
      if (synonymMap.has(lower)) {
        duplicates.push({
          synonym,
          first: synonymMap.get(lower),
          second: canonical,
        });
      }
      synonymMap.set(lower, canonical);
    }
  }

  if (duplicates.length > 0) {
    console.error('❌ Duplicate synonyms found:');
    for (const { synonym, first, second } of duplicates) {
      console.error(`   - "${synonym}" appears under both "${first}" and "${second}"`);
    }
    hasErrors = true;
  } else {
    console.log('✅ No duplicate synonyms');
  }

  // 4. Check minimum count
  if (canonicals.length < 20) {
    console.warn(`⚠️  Only ${canonicals.length} canonical verbs (recommended: ≥20)`);
  } else {
    console.log(`✅ ${canonicals.length} canonical verbs defined`);
  }

  // Summary
  console.log('');
  if (hasErrors) {
    console.error('❌ Lexicon validation failed');
    process.exit(1);
  } else {
    console.log('✨ Lexicon is valid!');
    process.exit(0);
  }
}

main();
