/**
 * Phase -1 instrumentation test for I2 patterns (retry, timeout, interceptors, auth)
 * Purpose: Understand what predicates the parser extracts for advanced HTTP client patterns
 */

import { describe, it, expect } from 'vitest';
import { Parser } from '../../../src/parser/parser.js';
import { KnowledgeBase } from '../../../src/kb/knowledge-base.js';
import * as path from 'path';
import * as fs from 'fs';

describe('Phase -1: I2 Pattern Parser Analysis', () => {
  const fixturesDir = path.resolve(
    __dirname,
    '../../fixtures/http-clients-analysis'
  );

  describe('Retry Patterns', () => {
    it('should inspect parser output for retry patterns', async () => {
      const filePath = path.join(fixturesDir, 'retry-patterns.ts');
      const code = fs.readFileSync(filePath, 'utf-8');

      const parser = new Parser();
      const parseResult = await parser.parse(filePath, code);

      console.log('\n=== RETRY PATTERNS ENTITIES ===');
      console.log(`Found ${parseResult.entities.length} entities`);

      parseResult.entities.forEach(entity => {
        console.log(`\nEntity: ${entity.name} (${entity.kind})`);
        const entityFactSets = parseResult.factSets.filter(fs =>
          fs.facts.some(f => f.subjectId === entity.id)
        );

        entityFactSets.forEach(factSet => {
          factSet.facts
            .filter(f => f.subjectId === entity.id)
            .forEach(fact => {
              console.log(
                `  - ${fact.predicate}: ${JSON.stringify(fact.object)}`
              );
            });
        });
      });

      // Minimal assertion - just verify parsing succeeded
      expect(parseResult.entities.length).toBeGreaterThan(0);
    });
  });

  describe('Timeout Patterns', () => {
    it('should inspect parser output for timeout patterns', async () => {
      const filePath = path.join(fixturesDir, 'timeout-patterns.ts');
      const code = fs.readFileSync(filePath, 'utf-8');

      const parser = new Parser();
      const parseResult = await parser.parse(filePath, code);

      console.log('\n=== TIMEOUT PATTERNS ENTITIES ===');
      console.log(`Found ${parseResult.entities.length} entities`);

      parseResult.entities.forEach(entity => {
        console.log(`\nEntity: ${entity.name} (${entity.kind})`);
        const entityFactSets = parseResult.factSets.filter(fs =>
          fs.facts.some(f => f.subjectId === entity.id)
        );

        entityFactSets.forEach(factSet => {
          factSet.facts
            .filter(f => f.subjectId === entity.id)
            .forEach(fact => {
              console.log(
                `  - ${fact.predicate}: ${JSON.stringify(fact.object)}`
              );
            });
        });
      });

      // Minimal assertion - just verify parsing succeeded
      expect(parseResult.entities.length).toBeGreaterThan(0);
    });
  });

  describe('Interceptor Patterns', () => {
    it('should inspect parser output for interceptor patterns', async () => {
      const filePath = path.join(fixturesDir, 'interceptor-patterns.ts');
      const code = fs.readFileSync(filePath, 'utf-8');

      const parser = new Parser();
      const parseResult = await parser.parse(filePath, code);

      console.log('\n=== INTERCEPTOR PATTERNS ENTITIES ===');
      console.log(`Found ${parseResult.entities.length} entities`);

      parseResult.entities.forEach(entity => {
        console.log(`\nEntity: ${entity.name} (${entity.kind})`);
        const entityFactSets = parseResult.factSets.filter(fs =>
          fs.facts.some(f => f.subjectId === entity.id)
        );

        entityFactSets.forEach(factSet => {
          factSet.facts
            .filter(f => f.subjectId === entity.id)
            .forEach(fact => {
              console.log(
                `  - ${fact.predicate}: ${JSON.stringify(fact.object)}`
              );
            });
        });
      });

      // Minimal assertion - just verify parsing succeeded
      expect(parseResult.entities.length).toBeGreaterThan(0);
    });
  });
});
