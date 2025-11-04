import { describe, it, expect } from 'vitest';
import { Project } from 'ts-morph';
import { FactExtractor } from '../../src/parser/fact-extractor.js';
import { RelationResolver } from '../../src/reasoning/relation-resolver.js';
import { KnowledgeBase } from '../../src/kb/knowledge-base.js';

/**
 * End-to-end integration test for Phase 3 Step 1 (KB Graph Indices)
 *
 * Tests the COMPLETE flow:
 * Real Parser → Raw Relations → Resolver → replaceRelations() → Indices → Query
 *
 * This test catches bugs where we assume data format (e.g., resolved vs raw).
 * If this test passes, we know the production pipeline works.
 */
describe('Phase 3 Step 1 E2E: Parser → Resolver → Indices', () => {
  it('should build call graph from real parser → resolver → indices pipeline', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const extractor = new FactExtractor();
    const kb = new KnowledgeBase();

    // Create realistic code with function calls
    project.createSourceFile(
      'src/utils.ts',
      `
      export function helper() {
        return 'helped';
      }

      export function anotherHelper() {
        return 'also helped';
      }
      `
    );

    project.createSourceFile(
      'src/app.ts',
      `
      import { helper, anotherHelper } from './utils';

      export function main() {
        helper();
        anotherHelper();
      }

      export function secondary() {
        helper();
      }
      `
    );

    // Step 1: Parse with real Phase 2 parser
    const utilsResult = extractor.extract(project.getSourceFile('src/utils.ts')!, 'src/utils.ts');
    const appResult = extractor.extract(project.getSourceFile('src/app.ts')!, 'src/app.ts');

    utilsResult.entities.forEach(e => kb.insertEntity(e));
    appResult.entities.forEach(e => kb.insertEntity(e));
    utilsResult.relations.forEach(r => kb.insertRelation(r));
    appResult.relations.forEach(r => kb.insertRelation(r));

    // Find entities for assertions
    const helperEntity = utilsResult.entities.find(e => e.name === 'helper')!;
    const anotherHelperEntity = utilsResult.entities.find(e => e.name === 'anotherHelper')!;
    const mainEntity = appResult.entities.find(e => e.name === 'main')!;
    const secondaryEntity = appResult.entities.find(e => e.name === 'secondary')!;

    expect(helperEntity).toBeDefined();
    expect(anotherHelperEntity).toBeDefined();
    expect(mainEntity).toBeDefined();
    expect(secondaryEntity).toBeDefined();

    // CRITICAL: Verify parser emitted RAW relations (expression text, not entity IDs)
    const rawRelations = kb.getRelations();
    const rawCallRelations = rawRelations.filter(r => r.predicate === 'calls');
    expect(rawCallRelations.length).toBeGreaterThan(0);

    // At least one should have expression text (not entity ID format)
    const hasExpressionText = rawCallRelations.some(r =>
      r.objectId && !r.objectId.match(/^[0-9A-Za-z]{10,16}$/)
    );
    expect(hasExpressionText).toBe(true);

    // BEFORE resolution: call graph should be empty
    let callGraph = kb.getCallGraph();
    expect(callGraph.size).toBe(0);

    // Step 2: Resolve with Step 0 resolver
    const resolver = new RelationResolver(kb);
    const resolved = resolver.resolve(kb.getRelations());

    // Step 3: Store resolved relations
    kb.replaceRelations(resolved);

    // AFTER resolution: call graph should work
    callGraph = kb.getCallGraph();

    // Verify call graph structure
    expect(callGraph.size).toBeGreaterThan(0);

    // main() calls helper() and anotherHelper()
    expect(callGraph.has(mainEntity.id)).toBe(true);
    expect(callGraph.get(mainEntity.id)?.has(helperEntity.id)).toBe(true);
    expect(callGraph.get(mainEntity.id)?.has(anotherHelperEntity.id)).toBe(true);

    // secondary() calls helper()
    expect(callGraph.has(secondaryEntity.id)).toBe(true);
    expect(callGraph.get(secondaryEntity.id)?.has(helperEntity.id)).toBe(true);
  });

  it('should build reverse deps from real parser → resolver → indices pipeline', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const extractor = new FactExtractor();
    const kb = new KnowledgeBase();

    project.createSourceFile(
      'src/shared.ts',
      `
      export function sharedUtil() {
        return 'shared';
      }
      `
    );

    project.createSourceFile(
      'src/moduleA.ts',
      `
      import { sharedUtil } from './shared';

      export function funcA() {
        sharedUtil();
      }
      `
    );

    project.createSourceFile(
      'src/moduleB.ts',
      `
      import { sharedUtil } from './shared';

      export function funcB() {
        sharedUtil();
      }
      `
    );

    // Parse all files
    const sharedResult = extractor.extract(project.getSourceFile('src/shared.ts')!, 'src/shared.ts');
    const aResult = extractor.extract(project.getSourceFile('src/moduleA.ts')!, 'src/moduleA.ts');
    const bResult = extractor.extract(project.getSourceFile('src/moduleB.ts')!, 'src/moduleB.ts');

    [sharedResult, aResult, bResult].forEach(result => {
      result.entities.forEach(e => kb.insertEntity(e));
      result.relations.forEach(r => kb.insertRelation(r));
    });

    const sharedUtilEntity = sharedResult.entities.find(e => e.name === 'sharedUtil')!;
    const funcAEntity = aResult.entities.find(e => e.name === 'funcA')!;
    const funcBEntity = bResult.entities.find(e => e.name === 'funcB')!;

    // BEFORE resolution: reverse deps empty
    let reverseDeps = kb.getReverseDeps(sharedUtilEntity.id);
    expect(reverseDeps.size).toBe(0);

    // Resolve and store
    const resolver = new RelationResolver(kb);
    const resolved = resolver.resolve(kb.getRelations());
    kb.replaceRelations(resolved);

    // AFTER resolution: sharedUtil has 2 callers
    reverseDeps = kb.getReverseDeps(sharedUtilEntity.id);
    expect(reverseDeps.size).toBe(2);
    expect(reverseDeps.has(funcAEntity.id)).toBe(true);
    expect(reverseDeps.has(funcBEntity.id)).toBe(true);
  });

  it('should handle import graph from real parser output', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const extractor = new FactExtractor();
    const kb = new KnowledgeBase();

    project.createSourceFile(
      'src/utils.ts',
      `export function helper() {}`
    );

    project.createSourceFile(
      'src/app.ts',
      `
      import { helper } from './utils';
      import express from 'express';
      `
    );

    const utilsResult = extractor.extract(project.getSourceFile('src/utils.ts')!, 'src/utils.ts');
    const appResult = extractor.extract(project.getSourceFile('src/app.ts')!, 'src/app.ts');

    [utilsResult, appResult].forEach(result => {
      result.entities.forEach(e => kb.insertEntity(e));
      result.relations.forEach(r => kb.insertRelation(r));
    });

    // Import graph works without resolution (imports don't need it)
    const importGraph = kb.getImportGraph();

    expect(importGraph.has('src/app.ts')).toBe(true);

    // Should have both imports
    const appImports = importGraph.get('src/app.ts')!;
    expect(appImports.size).toBeGreaterThanOrEqual(1);

    // Check for relative import (module specifier format)
    const hasRelativeImport = Array.from(appImports).some(spec =>
      spec.includes('utils')
    );
    expect(hasRelativeImport).toBe(true);
  });

  it('should skip external library calls in real pipeline', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const extractor = new FactExtractor();
    const kb = new KnowledgeBase();

    project.createSourceFile(
      'src/app.ts',
      `
      export function main() {
        console.log('starting');
        console.error('error');
        process.exit(1);
      }
      `
    );

    const result = extractor.extract(project.getSourceFile('src/app.ts')!, 'src/app.ts');
    result.entities.forEach(e => kb.insertEntity(e));
    result.relations.forEach(r => kb.insertRelation(r));

    // Resolve
    const resolver = new RelationResolver(kb);
    const resolved = resolver.resolve(kb.getRelations());
    kb.replaceRelations(resolved);

    // Call graph should NOT include external calls
    const callGraph = kb.getCallGraph();

    const mainEntity = result.entities.find(e => e.name === 'main')!;

    // main() shouldn't have any resolved calls (all are external)
    expect(callGraph.has(mainEntity.id)).toBe(false);

    // Verify external calls were marked unresolved
    const relations = kb.getRelations();
    const externalCalls = relations.filter(r =>
      r.predicate === 'calls' && !r.details?.resolved
    );
    expect(externalCalls.length).toBeGreaterThan(0);
  });
});
