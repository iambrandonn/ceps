import { describe, it, expect } from 'vitest';
import { Project } from 'ts-morph';
import { FactExtractor } from '../../src/parser/fact-extractor.js';
import { RelationResolver } from '../../src/reasoning/relation-resolver.js';
import { KnowledgeBase } from '../../src/kb/knowledge-base.js';

/**
 * Phase -1: Upstream Data Analysis for Step 1 (KB Graph Indices)
 *
 * This test analyzes the ACTUAL data structures from Step 0 (RelationResolver)
 * to validate our assumptions BEFORE writing unit tests.
 *
 * Success criteria: Understand real schema, not assumed schema.
 */
describe('Phase -1: Analyze Step 0 Output for Graph Indices', () => {
  it('should inspect actual resolved relation format for graph construction', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const extractor = new FactExtractor();
    const kb = new KnowledgeBase();
    const resolver = new RelationResolver(kb);

    // Create realistic test code with imports and calls
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

    const appFile = project.createSourceFile(
      'src/app.ts',
      `
      import { helper } from './utils';

      export function main() {
        helper();
        console.log('external');
      }
      `
    );

    // Extract using real Phase 2 parser
    const utilsResult = extractor.extract(project.getSourceFile('src/utils.ts')!, 'src/utils.ts');
    const appResult = extractor.extract(appFile, 'src/app.ts');

    // Insert into KB (in source order - Phase 2 behavior)
    utilsResult.entities.forEach(e => kb.insertEntity(e));
    appResult.entities.forEach(e => kb.insertEntity(e));
    utilsResult.relations.forEach(r => kb.insertRelation(r));
    appResult.relations.forEach(r => kb.insertRelation(r));

    // Resolve relations (Step 0)
    const resolved = resolver.resolve(kb.getRelations());

    console.log('\n=== PHASE -1 DEBUG OUTPUT ===\n');

    // Analyze CALL relations
    console.log('RESOLVED CALL RELATIONS:');
    const callRelations = resolved.filter(r => r.predicate === 'calls');
    callRelations.forEach(r => {
      console.log({
        subjectId: r.subjectId,
        objectId: r.objectId,
        objectIdType: r.objectId ? typeof r.objectId : 'null',
        objectIdFormat: r.objectId ? (r.objectId.match(/^[0-9A-Za-z]{10,16}$/) ? 'hash' : 'other') : 'null',
        resolved: r.details?.resolved,
        originalExpr: r.details?.originalExpression
      });
    });

    // Analyze IMPORT relations
    console.log('\nIMPORT RELATIONS:');
    const importRelations = resolved.filter(r => r.predicate === 'imports');
    importRelations.forEach(r => {
      console.log({
        subjectId: r.subjectId,
        subjectIdType: r.subjectId.includes('/') ? 'FILE PATH' : 'unknown',
        objectId: r.objectId,
        objectIdType: r.objectId?.startsWith('.') ? 'MODULE SPECIFIER' : 'npm package?',
        hasImportedField: 'imported' in (r.details || {})
      });
    });

    // Validate schema assumptions
    console.log('\nSCHEMA VALIDATION:');

    // Check resolved call relation schema
    const resolvedCall = callRelations.find(r => r.details?.resolved);
    if (resolvedCall) {
      console.log('✅ Resolved call has entity ID:', resolvedCall.objectId?.match(/^[0-9A-Za-z]{10,16}$/));
      expect(resolvedCall.objectId).toMatch(/^[0-9A-Za-z]{10,16}$/);
      expect(resolvedCall.details?.resolved).toBe(true);
      expect(resolvedCall.details?.originalExpression).toBeDefined();
    }

    // Check unresolved call relation schema
    const unresolvedCall = callRelations.find(r => !r.details?.resolved);
    if (unresolvedCall) {
      console.log('✅ Unresolved call has null objectId:', unresolvedCall.objectId === null);
      expect(unresolvedCall.objectId).toBeNull();
      expect(unresolvedCall.details?.resolved).toBe(false);
    }

    // Check import relation schema
    const importRel = importRelations[0];
    if (importRel) {
      console.log('✅ Import subjectId is file path:', importRel.subjectId.includes('/'));
      console.log('✅ Import objectId is module specifier:', importRel.objectId?.startsWith('.'));
      console.log('✅ No details.imported field:', !('imported' in (importRel.details || {})));

      expect(importRel.subjectId).toMatch(/^src\//);  // File path format
      expect(importRel.objectId).toMatch(/^\.\/|^\.\.\//);  // Relative import
      expect(importRel.details?.imported).toBeUndefined();  // NO imported field
    }

    console.log('\n=== END PHASE -1 DEBUG ===\n');
  });

  it('should understand graph index requirements from real data', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const extractor = new FactExtractor();
    const kb = new KnowledgeBase();
    const resolver = new RelationResolver(kb);

    // Create code with multiple call relationships
    project.createSourceFile(
      'src/a.ts',
      `
      export function funcA() {
        funcB();
      }

      function funcB() {
        funcC();
      }

      function funcC() {
        return 'done';
      }
      `
    );

    const result = extractor.extract(project.getSourceFile('src/a.ts')!, 'src/a.ts');
    result.entities.forEach(e => kb.insertEntity(e));
    result.relations.forEach(r => kb.insertRelation(r));

    const resolved = resolver.resolve(kb.getRelations());

    console.log('\n=== GRAPH INDEX REQUIREMENTS ===\n');

    // What callGraph needs
    const callRels = resolved.filter(r => r.predicate === 'calls' && r.details?.resolved);
    console.log('CallGraph edges needed:');
    callRels.forEach(r => {
      const caller = kb.getEntity(r.subjectId);
      const callee = kb.getEntity(r.objectId!);
      console.log(`  ${caller?.name} (${r.subjectId}) → ${callee?.name} (${r.objectId})`);
    });

    // What reverseDeps needs
    console.log('\nReverseDeps needed for funcB:');
    const funcB = result.entities.find(e => e.name === 'funcB');
    const callersOfB = callRels.filter(r => r.objectId === funcB?.id);
    callersOfB.forEach(r => {
      const caller = kb.getEntity(r.subjectId);
      console.log(`  ${caller?.name} depends on funcB`);
    });

    console.log('\n=== END GRAPH REQUIREMENTS ===\n');

    // Validate: we have the data needed to build indices
    expect(callRels.length).toBeGreaterThan(0);
    expect(callersOfB.length).toBeGreaterThan(0);
  });
});
