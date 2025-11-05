/**
 * FEEDBACK1.md Verification Tests
 *
 * Testing concerns raised in feedback:
 * 1. Anchor format validation
 * 2. Coverage enforcement
 * 3. Integration with actual entity IDs
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeBase } from '../../kb/knowledge-base.js';
import { SpecGenerator } from '../../generator/spec-generator.js';
import { CrossLinkValidator } from '../cross-link-validator.js';
import { Confidence } from '../../types/index.js';
import { SpecFile } from '../types.js';

describe('FEEDBACK1 - Anchor Format Validation', () => {
  it('should accept real entity ID format like #kbnPRIG4Jf6', () => {
    const kb = new KnowledgeBase();
    const validator = new CrossLinkValidator(kb);

    // Spec with actual hash-based entity ID (like Phase 2 generates)
    const specFiles: SpecFile[] = [
      {
        path: 'src/spec.md',
        content: `
<a id="kbnPRIG4Jf6"></a>

### myFunction

Calls [helper](#ABC123xyz9).

<a id="ABC123xyz9"></a>

### helper
`,
      },
    ];

    // Build anchor map
    const anchorMap = validator.buildAnchorMap(specFiles);

    // Should extract both entity IDs
    expect(anchorMap.has('kbnPRIG4Jf6')).toBe(true);
    expect(anchorMap.has('ABC123xyz9')).toBe(true);

    // Post-generation should validate link correctly
    const result = validator.validatePostGeneration(specFiles, anchorMap);

    // Link to ABC123xyz9 should resolve (anchor exists)
    expect(result.passed).toBe(true);
    expect(result.brokenLinks).toHaveLength(0);
  });

  it('should handle various entity ID formats from Phase 2', () => {
    const kb = new KnowledgeBase();
    const validator = new CrossLinkValidator(kb);

    // Various formats Phase 2 might generate
    const specFiles: SpecFile[] = [
      {
        path: 'src/spec.md',
        content: `
<a id="7Fpth5XJGw"></a>
### funcA

<a id="func-myFunc-abc123"></a>
### myFunc

<a id="class-MyClass-xyz789"></a>
### MyClass

Links: [funcA](#7Fpth5XJGw), [myFunc](#func-myFunc-abc123), [MyClass](#class-MyClass-xyz789)
`,
      },
    ];

    const anchorMap = validator.buildAnchorMap(specFiles);

    // All formats should be extracted
    expect(anchorMap.size).toBe(3);
    expect(anchorMap.has('7Fpth5XJGw')).toBe(true);
    expect(anchorMap.has('func-myFunc-abc123')).toBe(true);
    expect(anchorMap.has('class-MyClass-xyz789')).toBe(true);

    // All links should resolve
    const result = validator.validatePostGeneration(specFiles, anchorMap);
    expect(result.passed).toBe(true);
    expect(result.brokenLinks).toHaveLength(0);
  });

  it('should reject only truly broken links, not format issues', () => {
    const kb = new KnowledgeBase();
    const validator = new CrossLinkValidator(kb);

    const specFiles: SpecFile[] = [
      {
        path: 'src/spec.md',
        content: `
<a id="validEntity123"></a>
### existing

Links:
- [valid link](#validEntity123) - Should resolve
- [broken link](#nonExistentEntity) - Should break
`,
      },
    ];

    const anchorMap = validator.buildAnchorMap(specFiles);
    const result = validator.validatePostGeneration(specFiles, anchorMap);

    // Should fail only because of missing entity, not format
    expect(result.passed).toBe(false);
    expect(result.brokenLinks).toHaveLength(1);
    expect(result.brokenLinks[0].targetAnchor).toBe('#nonExistentEntity');
  });
});

describe('FEEDBACK1 - Coverage Enforcement', () => {
  it('should use KB exported index correctly', () => {
    const kb = new KnowledgeBase();
    const validator = new CrossLinkValidator(kb);

    // Insert exported entity WITHOUT chunk
    kb.insertEntity({
      id: 'exported-func-no-chunk',
      kind: 'function',
      name: 'missingDoc',
      path: 'src/a.ts',
      exported: true, // Explicitly exported
    });

    // Insert internal entity WITHOUT chunk (should be ignored)
    kb.insertEntity({
      id: 'internal-func-no-chunk',
      kind: 'function',
      name: 'internal',
      path: 'src/a.ts',
      exported: false, // Not exported
    });

    const result = validator.validatePreGeneration();

    // Should fail because exported entity lacks chunk
    expect(result.passed).toBe(false);
    expect(result.coverage).toBe(0); // 0 of 1 exported entities covered
    expect(result.missingEntities).toContain('exported-func-no-chunk');
    expect(result.missingEntities).not.toContain('internal-func-no-chunk');
  });

  it('should leverage KB listExported() for consistency', () => {
    const kb = new KnowledgeBase();
    const validator = new CrossLinkValidator(kb);

    // Add entities
    kb.insertEntity({ id: 'e1', kind: 'function', name: 'f1', path: 'a.ts', exported: true });
    kb.insertEntity({ id: 'e2', kind: 'function', name: 'f2', path: 'a.ts', exported: false });

    // Verify KB's listExported matches our filter
    const kbExported = kb.listExported();
    const manualFilter = kb.getAllEntities().filter((e) => e.exported);

    expect(kbExported.length).toBe(manualFilter.length);
    expect(kbExported.map((e) => e.id).sort()).toEqual(manualFilter.map((e) => e.id).sort());
  });

  it('should detect exported functions missing chunks (integration)', () => {
    const kb = new KnowledgeBase();
    const generator = new SpecGenerator(kb);
    const validator = new CrossLinkValidator(kb);

    // Exported function WITHOUT chunk (coverage violation)
    kb.insertEntity({
      id: 'exported-missing',
      kind: 'function',
      name: 'undocumented',
      path: 'src/lib.ts',
      exported: true,
    });

    // Exported function WITH chunk (valid)
    kb.insertEntity({
      id: 'exported-valid',
      kind: 'function',
      name: 'documented',
      path: 'src/lib.ts',
      exported: true,
    });

    kb.insertChunk({
      id: 'chunk1',
      targetEntityId: 'exported-valid',
      textDraft: 'Does something',
      confidence: 'High' as Confidence,
      factSetIds: ['fs1'],
    });

    // Pre-generation should fail
    const preResult = validator.validatePreGeneration();
    expect(preResult.passed).toBe(false);
    expect(preResult.coverage).toBe(50); // 1 of 2
    expect(preResult.missingEntities).toContain('exported-missing');

    // Integration: Generate specs anyway (gate enforcement happens in orchestrator)
    const specsMap = generator.generateDirectorySpecs('/test/project');
    expect(Object.keys(specsMap).length).toBeGreaterThan(0);
  });
});

describe('FEEDBACK1 - Full Pipeline Integration', () => {
  it('should run full pipeline and assert gates stop missing coverage', () => {
    const kb = new KnowledgeBase();
    const generator = new SpecGenerator(kb);
    const validator = new CrossLinkValidator(kb);

    // Setup: 3 exported entities, only 2 have chunks
    kb.insertEntity({ id: 'e1', kind: 'function', name: 'f1', path: 'src/a.ts', exported: true });
    kb.insertEntity({ id: 'e2', kind: 'function', name: 'f2', path: 'src/a.ts', exported: true });
    kb.insertEntity({ id: 'e3', kind: 'function', name: 'f3', path: 'src/a.ts', exported: true });

    kb.insertChunk({
      id: 'bc1',
      targetEntityId: 'e1',
      textDraft: 'Chunk 1',
      confidence: 'High' as Confidence,
      factSetIds: ['fs1'],
    });

    kb.insertChunk({
      id: 'bc2',
      targetEntityId: 'e2',
      textDraft: 'Chunk 2',
      confidence: 'High' as Confidence,
      factSetIds: ['fs2'],
    });

    // e3 missing chunk

    // STEP 1: Pre-generation validation
    const preResult = validator.validatePreGeneration();
    expect(preResult.passed).toBe(false);
    expect(preResult.coverage).toBeCloseTo(66.67, 1);
    expect(preResult.missingEntities).toEqual(['e3']);

    // STEP 2: Generation (happens regardless in Phase 3, gate enforcement in Phase 6)
    const specsMap = generator.generateDirectorySpecs('/test/project');
    const specFiles: SpecFile[] = Object.entries(specsMap).map(([path, content]) => ({
      path,
      content,
    }));

    // STEP 3: Post-generation validation
    const anchorMap = validator.buildAnchorMap(specFiles);
    const postResult = validator.validatePostGeneration(specFiles, anchorMap);

    // Post-generation passes (no broken links), but pre-generation failed
    expect(postResult.passed).toBe(true);

    // Summary: Pipeline should report BOTH results to orchestrator
    const pipelineResult = {
      preValidation: preResult,
      postValidation: postResult,
      shouldFail: !preResult.passed || !postResult.passed,
    };

    expect(pipelineResult.shouldFail).toBe(true);
    expect(pipelineResult.preValidation.passed).toBe(false);
  });
});
