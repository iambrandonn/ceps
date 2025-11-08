import { describe, it, expect } from 'vitest';
import { Parser } from '../../../src/parser/parser.js';

describe('Parser - Chained Call Debug', () => {
  it('should debug what facts are extracted for chained calls', async () => {
    const source = `
      import express from 'express';
      const router = express.Router();
      router.route('/users').get(handler).post(createHandler).delete(deleteHandler);
    `;

    const parser = new Parser();
    const result = await parser.parse('src/routes.ts', source);

    const router = result.entities.find(e => e.name === 'router');
    const routerFactSet = result.factSets.find(fs => fs.id === `${router?.id}-facts`);

    console.log('\n=== ENTITIES ===');
    result.entities.forEach(e => {
      console.log(`${e.kind}: ${e.name} (${e.id})`);
    });

    console.log('\n=== ROUTER FACTS ===');
    routerFactSet?.facts.forEach(f => {
      if (f.subjectId === router?.id) {
        console.log(`${f.predicate}: ${f.object}`);
      }
    });

    console.log('\n=== CALLS-EXPRESSION FACTS ===');
    const callsFacts = routerFactSet?.facts.filter(f => f.predicate === 'calls-expression');
    callsFacts?.forEach(f => console.log(f.object));

    console.log('\n=== CHAINED-CALL FACTS ===');
    const chainedCallFacts = routerFactSet?.facts.filter(f => f.predicate === 'chained-call');
    chainedCallFacts?.forEach(f => console.log(f.object));

    console.log('\n=== CALL-ARG FACTS ===');
    const argFacts = routerFactSet?.facts.filter(f => f.predicate.startsWith('call-arg'));
    argFacts?.forEach(f => console.log(`${f.predicate}: ${f.object}`));

    console.log('\n=== CHAINED-CALL-ARG FACTS ===');
    const chainedArgFacts = routerFactSet?.facts.filter(f => f.predicate.startsWith('chained-call-arg'));
    chainedArgFacts?.forEach(f => console.log(`${f.predicate}: ${f.object}`));

    // Basic assertions
    expect(router).toBeDefined();
    expect(callsFacts?.length).toBeGreaterThan(0);
  });
});
