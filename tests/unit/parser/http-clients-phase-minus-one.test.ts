/**
 * Phase -1 Analysis: HTTP Client Parser Output Inspection
 *
 * This test suite inspects what entities, facts, and factSets the parser
 * emits for HTTP client patterns (Axios, Fetch). Results will inform
 * pattern detection logic.
 *
 * Run with: npm test -- --run tests/unit/parser/http-clients-phase-minus-one.test.ts
 */

import { describe, it, expect } from 'vitest';
import { Parser } from '../../../src/parser/parser.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Phase -1 Analysis: HTTP Client Parser Output', () => {
  it('should parse Axios patterns and show entities/facts', async () => {
    const fixturePath = path.join(
      __dirname,
      '../../fixtures/http-clients-analysis/axios-basic.ts'
    );
    const source = fs.readFileSync(fixturePath, 'utf-8');

    const parser = new Parser();
    const parseResult = await parser.parse('axios-basic.ts', source);

    console.log('\n=== AXIOS PATTERN ANALYSIS ===\n');
    console.log(`Total Entities: ${parseResult.entities.length}\n`);

    // Group entities by kind
    const entityByKind = parseResult.entities.reduce((acc, entity) => {
      acc[entity.kind] = (acc[entity.kind] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('Entities by Kind:');
    Object.entries(entityByKind).forEach(([kind, count]) => {
      console.log(`  ${kind}: ${count}`);
    });
    console.log('');

    // Inspect specific entities
    const apiClientEntity = parseResult.entities.find(e => e.name === 'apiClient');
    const fetchUsersEntity = parseResult.entities.find(e => e.name === 'fetchUsers');

    if (apiClientEntity) {
      console.log('=== apiClient Entity ===');
      console.log(`  ID: ${apiClientEntity.id}`);
      console.log(`  Kind: ${apiClientEntity.kind}`);
      console.log(`  Name: ${apiClientEntity.name}`);
      console.log(`  Exported: ${apiClientEntity.exported}`);
      console.log(`  Signature: ${apiClientEntity.signature || 'N/A'}`);
      console.log('');
    }

    if (fetchUsersEntity) {
      console.log('=== fetchUsers Entity ===');
      console.log(`  ID: ${fetchUsersEntity.id}`);
      console.log(`  Kind: ${fetchUsersEntity.kind}`);
      console.log(`  Name: ${fetchUsersEntity.name}`);
      console.log(`  Exported: ${fetchUsersEntity.exported}`);
      console.log(`  Signature: ${fetchUsersEntity.signature || 'N/A'}`);
      console.log('');
    }

    // Inspect factSets from parseResult
    console.log(`=== FactSets from Parser (${parseResult.factSets.length}) ===\n`);

    // Inspect facts for apiClient
    if (apiClientEntity) {
      const entityFactSets = parseResult.factSets.filter(fs =>
        fs.facts.some(f => f.subjectId === apiClientEntity.id)
      );
      console.log(`=== Facts for apiClient (${entityFactSets.length} factSets) ===`);

      for (const factSet of entityFactSets) {
        console.log(`  FactSet ID: ${factSet.id.substring(0, 40)}...`);
        for (const fact of factSet.facts) {
          if (fact.subjectId === apiClientEntity.id) {
            console.log(`    - Predicate: ${fact.predicate}`);
            console.log(`      Object: ${JSON.stringify(fact.object)?.substring(0, 80)}`);
            if (fact.qualifiers) {
              console.log(`      Qualifiers: ${JSON.stringify(fact.qualifiers)}`);
            }
          }
        }
      }
      console.log('');
    }

    // Inspect facts for fetchUsers
    if (fetchUsersEntity) {
      const entityFactSets = parseResult.factSets.filter(fs =>
        fs.facts.some(f => f.subjectId === fetchUsersEntity.id)
      );
      console.log(`=== Facts for fetchUsers (${entityFactSets.length} factSets) ===`);

      for (const factSet of entityFactSets) {
        console.log(`  FactSet ID: ${factSet.id.substring(0, 40)}...`);
        for (const fact of factSet.facts) {
          if (fact.subjectId === fetchUsersEntity.id) {
            console.log(`    - Predicate: ${fact.predicate}`);
            console.log(`      Object: ${JSON.stringify(fact.object)?.substring(0, 80)}`);
          }
        }
      }
      console.log('');
    }

    // Look for axios-related imports
    const imports = parseResult.entities.filter(e => e.kind === 'import');
    console.log(`=== Imports (${imports.length}) ===`);
    imports.forEach(imp => {
      const importFactSets = parseResult.factSets.filter(fs =>
        fs.facts.some(f => f.subjectId === imp.id)
      );
      console.log(`  Import: ${imp.name}`);
      importFactSets.forEach(fs => {
        fs.facts.forEach(fact => {
          if (fact.subjectId === imp.id && fact.predicate === 'import-source') {
            console.log(`    Source: ${fact.object}`);
          }
        });
      });
    });
    console.log('');

    // Look for call expressions
    console.log(`=== Call-related Facts (inspecting all ${parseResult.factSets.length} factSets) ===`);

    let callCount = 0;
    for (const factSet of parseResult.factSets) {
      const callFacts = factSet.facts.filter(f =>
        f.predicate.startsWith('call-') ||
        f.predicate === 'calls' ||
        f.predicate === 'call-expression' ||
        f.predicate === 'initializer'
      );

      if (callFacts.length > 0) {
        callCount++;
        console.log(`  FactSet: ${factSet.id.substring(0, 40)}...`);
        callFacts.forEach(fact => {
          const entityName = parseResult.entities.find(e => e.id === fact.subjectId)?.name || 'unknown';
          console.log(`    [${entityName}] ${fact.predicate}: ${JSON.stringify(fact.object)?.substring(0, 80)}`);
        });
      }
    }
    console.log(`  Total factSets with call-related facts: ${callCount}\n`);

    // Assertions for test validity
    expect(parseResult.entities.length).toBeGreaterThan(0);
    expect(apiClientEntity).toBeDefined();
    expect(fetchUsersEntity).toBeDefined();
  });

  it('should parse Fetch patterns and show entities/facts', async () => {
    const fixturePath = path.join(
      __dirname,
      '../../fixtures/http-clients-analysis/fetch-patterns.ts'
    );
    const source = fs.readFileSync(fixturePath, 'utf-8');

    const parser = new Parser();
    const parseResult = await parser.parse('fetch-patterns.ts', source);

    console.log('\n=== FETCH PATTERN ANALYSIS ===\n');
    console.log(`Total Entities: ${parseResult.entities.length}\n`);
    console.log(`FactSets: ${parseResult.factSets.length}\n`);

    // Look for fetch-related entities
    const fetchDataEntity = parseResult.entities.find(e => e.name === 'fetchData');
    const postDataEntity = parseResult.entities.find(e => e.name === 'postData');

    if (fetchDataEntity) {
      console.log('=== fetchData Entity ===');
      console.log(`  ID: ${fetchDataEntity.id}`);
      console.log(`  Kind: ${fetchDataEntity.kind}`);
      console.log(`  Exported: ${fetchDataEntity.exported}`);

      const factSets = parseResult.factSets.filter(fs =>
        fs.facts.some(f => f.subjectId === fetchDataEntity.id)
      );
      console.log(`  FactSets: ${factSets.length}`);
      factSets.forEach(fs => {
        fs.facts.forEach(fact => {
          if (fact.subjectId === fetchDataEntity.id) {
            console.log(`    ${fact.predicate}: ${JSON.stringify(fact.object)?.substring(0, 80)}`);
          }
        });
      });
      console.log('');
    }

    if (postDataEntity) {
      console.log('=== postData Entity ===');
      console.log(`  ID: ${postDataEntity.id}`);
      console.log(`  Kind: ${postDataEntity.kind}`);
      console.log(`  Signature: ${postDataEntity.signature}`);

      const factSets = parseResult.factSets.filter(fs =>
        fs.facts.some(f => f.subjectId === postDataEntity.id)
      );
      console.log(`  FactSets: ${factSets.length}`);
      factSets.forEach(fs => {
        fs.facts.forEach(fact => {
          if (fact.subjectId === postDataEntity.id) {
            console.log(`    ${fact.predicate}: ${JSON.stringify(fact.object)?.substring(0, 80)}`);
          }
        });
      });
      console.log('');
    }

    // Assertions
    expect(parseResult.entities.length).toBeGreaterThan(0);
    expect(fetchDataEntity).toBeDefined();
    expect(postDataEntity).toBeDefined();
  });
});
