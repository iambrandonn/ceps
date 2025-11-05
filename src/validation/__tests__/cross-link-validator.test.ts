/**
 * Phase 3 Step 6: CrossLinkValidator Unit Tests
 *
 * Following TDD: RED → GREEN → REFACTOR
 * Based on Phase -1 analysis findings
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeBase } from '../../kb/knowledge-base.js';
import { CrossLinkValidator } from '../cross-link-validator.js';
import { Confidence } from '../../types/index.js';
import { SpecFile } from '../types.js';

describe('CrossLinkValidator - Pre-Generation', () => {
  let kb: KnowledgeBase;
  let validator: CrossLinkValidator;

  beforeEach(() => {
    kb = new KnowledgeBase();
    validator = new CrossLinkValidator(kb);
  });

  it('should fail when exported entity lacks BehaviorChunk', () => {
    // Exported entity without BehaviorChunk or QID
    kb.insertEntity({
      id: 'e1',
      kind: 'function',
      name: 'foo',
      path: 'a.ts',
      exported: true,
    });

    const result = validator.validatePreGeneration();

    expect(result.passed).toBe(false);
    expect(result.missingEntities).toContain('e1');
    expect(result.coverage).toBe(0); // 0 of 1 exported entities covered
  });

  it('should pass when all exported entities have BehaviorChunks', () => {
    kb.insertEntity({
      id: 'e1',
      kind: 'function',
      name: 'foo',
      path: 'a.ts',
      exported: true,
    });

    kb.insertChunk({
      id: 'bc1',
      targetEntityId: 'e1',
      textDraft: 'Does foo logic.',
      confidence: 'High' as Confidence,
      factSetIds: ['fs1'],
    });

    const result = validator.validatePreGeneration();

    expect(result.passed).toBe(true);
    expect(result.coverage).toBe(100);
    expect(result.missingEntities).toHaveLength(0);
  });

  it('should pass when exported entity has QID (Low confidence)', () => {
    kb.insertEntity({
      id: 'e1',
      kind: 'function',
      name: 'mystery',
      path: 'x.ts',
      exported: true,
    });

    // Low confidence → QID generated
    kb.insertChunk({
      id: 'bc1',
      targetEntityId: 'e1',
      textDraft: '',
      confidence: 'Low' as Confidence,
      factSetIds: ['fs1'],
    });

    kb.insertOpenQuestion({
      qid: 'Q-function-1',
      entityId: 'e1',
      question: 'What does mystery do?',
      confidence: 30,
      factSetIds: ['fs1'],
    });

    const result = validator.validatePreGeneration();

    expect(result.passed).toBe(true); // QID counts as coverage
    expect(result.coverage).toBe(100);
  });

  it('should calculate coverage correctly for mixed entities', () => {
    // 3 exported entities: 2 with chunks, 1 without
    kb.insertEntity({ id: 'e1', kind: 'function', name: 'f1', path: 'a.ts', exported: true });
    kb.insertEntity({ id: 'e2', kind: 'function', name: 'f2', path: 'b.ts', exported: true });
    kb.insertEntity({ id: 'e3', kind: 'function', name: 'f3', path: 'c.ts', exported: true });

    kb.insertChunk({
      id: 'bc1',
      targetEntityId: 'e1',
      textDraft: 'Does X',
      confidence: 'High' as Confidence,
      factSetIds: ['fs1'],
    });

    kb.insertChunk({
      id: 'bc2',
      targetEntityId: 'e2',
      textDraft: 'Does Y',
      confidence: 'Medium' as Confidence,
      factSetIds: ['fs2'],
    });

    // e3 has no chunk or QID

    const result = validator.validatePreGeneration();

    expect(result.passed).toBe(false);
    expect(result.coverage).toBeCloseTo(66.67, 1); // 2 of 3
    expect(result.missingEntities).toEqual(['e3']);
  });

  it('should pass with 100% coverage when no exported entities exist', () => {
    // No entities at all
    const result = validator.validatePreGeneration();

    expect(result.passed).toBe(true);
    expect(result.coverage).toBe(100); // Edge case: 0/0 = 100%
    expect(result.missingEntities).toHaveLength(0);
  });

  it('should ignore internal (non-exported) entities', () => {
    // Internal entity without chunk (should be ignored)
    kb.insertEntity({
      id: 'e1',
      kind: 'function',
      name: 'internal',
      path: 'a.ts',
      exported: false,
    });

    // Exported entity with chunk
    kb.insertEntity({
      id: 'e2',
      kind: 'function',
      name: 'public',
      path: 'a.ts',
      exported: true,
    });

    kb.insertChunk({
      id: 'bc2',
      targetEntityId: 'e2',
      textDraft: 'Public API',
      confidence: 'High' as Confidence,
      factSetIds: ['fs2'],
    });

    const result = validator.validatePreGeneration();

    // Only e2 counts (exported), e1 is ignored
    expect(result.passed).toBe(true);
    expect(result.coverage).toBe(100);
    expect(result.missingEntities).not.toContain('e1');
  });
});

describe('CrossLinkValidator - Anchor Map', () => {
  let kb: KnowledgeBase;
  let validator: CrossLinkValidator;

  beforeEach(() => {
    kb = new KnowledgeBase();
    validator = new CrossLinkValidator(kb);
  });

  it('should build anchor map from markdown files', () => {
    // Mock generated spec files (matching Phase 2 MarkdownRenderer output)
    const specFiles: SpecFile[] = [
      {
        path: 'src/spec.md',
        content: `
# Functions

<a id="e1"></a>

### foo

Does foo logic.

<a id="e2"></a>

### bar

Does bar logic.
`,
      },
    ];

    const anchorMap = validator.buildAnchorMap(specFiles);

    // Keyed by entity.id (not name)
    expect(anchorMap.has('e1')).toBe(true);
    expect(anchorMap.get('e1')!.entityId).toBe('e1');
    expect(anchorMap.get('e1')!.anchorText).toBe('#e1');
    expect(anchorMap.get('e1')!.filePath).toBe('src/spec.md');

    expect(anchorMap.has('e2')).toBe(true);
  });

  it('should handle multiple spec files', () => {
    const specFiles: SpecFile[] = [
      {
        path: 'src/spec.md',
        content: '<a id="e1"></a>\n### foo',
      },
      {
        path: 'lib/spec.md',
        content: '<a id="e2"></a>\n### bar',
      },
    ];

    const anchorMap = validator.buildAnchorMap(specFiles);

    expect(anchorMap.size).toBe(2);
    expect(anchorMap.get('e1')!.filePath).toBe('src/spec.md');
    expect(anchorMap.get('e2')!.filePath).toBe('lib/spec.md');
  });

  it('should handle empty spec files', () => {
    const specFiles: SpecFile[] = [
      {
        path: 'src/spec.md',
        content: '# Empty directory\n\nNo entities here.',
      },
    ];

    const anchorMap = validator.buildAnchorMap(specFiles);

    expect(anchorMap.size).toBe(0);
  });

  it('should extract complex entity IDs correctly', () => {
    const specFiles: SpecFile[] = [
      {
        path: 'src/spec.md',
        content: '<a id="func-myFunction-abc123"></a>\n### myFunction',
      },
    ];

    const anchorMap = validator.buildAnchorMap(specFiles);

    expect(anchorMap.has('func-myFunction-abc123')).toBe(true);
    expect(anchorMap.get('func-myFunction-abc123')!.anchorText).toBe(
      '#func-myFunction-abc123'
    );
  });
});

describe('CrossLinkValidator - Post-Generation', () => {
  let kb: KnowledgeBase;
  let validator: CrossLinkValidator;

  beforeEach(() => {
    kb = new KnowledgeBase();
    validator = new CrossLinkValidator(kb);
  });

  it('should detect broken cross-reference links', () => {
    const specFiles: SpecFile[] = [
      {
        path: 'src/spec.md',
        content: `
<a id="e1"></a>

### foo

Calls [bar](#e2).

Calls [missing](#e-missing).
`,
      },
    ];

    const anchorMap = new Map([
      ['e2', { entityId: 'e2', anchorText: '#e2', filePath: 'src/spec.md' }],
      // 'e-missing' is not in anchor map
    ]);

    const result = validator.validatePostGeneration(specFiles, anchorMap);

    expect(result.passed).toBe(false);
    expect(result.brokenLinks).toHaveLength(1);
    expect(result.brokenLinks[0].targetAnchor).toBe('#e-missing');
    expect(result.brokenLinks[0].sourceFile).toBe('src/spec.md');
    expect(result.brokenLinks[0].lineNumber).toBeGreaterThan(0);
  });

  it('should pass when all cross-references resolve', () => {
    const specFiles: SpecFile[] = [
      {
        path: 'src/spec.md',
        content: `
<a id="e1"></a>

### foo

Calls [bar](#e2).
`,
      },
    ];

    const anchorMap = new Map([
      ['e2', { entityId: 'e2', anchorText: '#e2', filePath: 'src/spec.md' }],
    ]);

    const result = validator.validatePostGeneration(specFiles, anchorMap);

    expect(result.passed).toBe(true);
    expect(result.brokenLinks).toHaveLength(0);
  });

  it('should pass when no cross-links exist (Phase 2 output)', () => {
    const specFiles: SpecFile[] = [
      {
        path: 'src/spec.md',
        content: `
<a id="e1"></a>

### foo

Does something.
`,
      },
    ];

    const anchorMap = new Map([
      ['e1', { entityId: 'e1', anchorText: '#e1', filePath: 'src/spec.md' }],
    ]);

    const result = validator.validatePostGeneration(specFiles, anchorMap);

    expect(result.passed).toBe(true);
    expect(result.brokenLinks).toHaveLength(0);
  });

  it('should detect multiple broken links in same file', () => {
    const specFiles: SpecFile[] = [
      {
        path: 'src/spec.md',
        content: `
<a id="e1"></a>

### foo

Calls [missing1](#e-missing1).
Calls [missing2](#e-missing2).
Uses [missing3](#e-missing3).
`,
      },
    ];

    const anchorMap = new Map();

    const result = validator.validatePostGeneration(specFiles, anchorMap);

    expect(result.passed).toBe(false);
    expect(result.brokenLinks).toHaveLength(3);
    expect(result.brokenLinks.map((l) => l.targetAnchor)).toEqual([
      '#e-missing1',
      '#e-missing2',
      '#e-missing3',
    ]);
  });

  it('should track line numbers correctly for broken links', () => {
    const specFiles: SpecFile[] = [
      {
        path: 'src/spec.md',
        content: `Line 1
Line 2
Line 3 with [link](#e-missing)
Line 4`,
      },
    ];

    const anchorMap = new Map();

    const result = validator.validatePostGeneration(specFiles, anchorMap);

    expect(result.brokenLinks).toHaveLength(1);
    expect(result.brokenLinks[0].lineNumber).toBe(3);
  });

  it('should handle cross-file link validation', () => {
    const specFiles: SpecFile[] = [
      {
        path: 'src/spec.md',
        content: `
<a id="e1"></a>

### foo

Calls [bar in lib](#e2).
`,
      },
      {
        path: 'lib/spec.md',
        content: `
<a id="e2"></a>

### bar
`,
      },
    ];

    // Build anchor map from both files
    const anchorMap = validator.buildAnchorMap(specFiles);

    const result = validator.validatePostGeneration(specFiles, anchorMap);

    // Link from src/spec.md → e2 in lib/spec.md should resolve
    expect(result.passed).toBe(true);
    expect(result.brokenLinks).toHaveLength(0);
  });
});
