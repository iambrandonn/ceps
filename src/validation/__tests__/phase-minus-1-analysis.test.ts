/**
 * Phase 3 Step 6: Phase -1 Upstream Data Analysis
 *
 * This test file verifies our understanding of upstream components BEFORE implementing validation.
 * It uses debugging to see actual data structures from Phase 2 components.
 *
 * Purpose: Catch schema mismatches early (learned from Step 0)
 */

import { describe, it, expect } from 'vitest';
import { KnowledgeBase } from '../../kb/knowledge-base.js';
import { SpecGenerator } from '../../generator/spec-generator.js';
import { Confidence } from '../../types/index.js';

describe('Phase -1: Upstream Data Analysis (Integration)', () => {
  it('should extract anchors from Phase 2 generated specs', () => {
    const kb = new KnowledgeBase();
    const generator = new SpecGenerator(kb);

    // Setup: Create entities
    kb.insertEntity({
      id: 'func-foo-abc123',
      kind: 'function',
      name: 'foo',
      path: 'src/a.ts',
      exported: true,
    });

    kb.insertEntity({
      id: 'func-bar-def456',
      kind: 'function',
      name: 'bar',
      path: 'src/a.ts',
      exported: true,
    });

    // Generate spec
    const specsMap = generator.generateDirectorySpecs('/test/project');
    const specContent = specsMap['src/spec.md'];

    console.log('\n=== Phase -1 Analysis: Generated Spec Content ===');
    console.log(specContent);
    console.log('\n=== Extracted Anchors (HTML tags) ===');
    const anchors = specContent.match(/<a id="[^"]+"><\/a>/g);
    console.log(anchors);
    console.log('\n=== Extracted Links (markdown) ===');
    const links = specContent.match(/\[.*?\]\(#.*?\)/g);
    console.log(links || 'No cross-links found (EXPECTED in Phase 2)');

    // VALIDATE: Anchors use entity.id (not entity.name)
    expect(specContent).toContain('<a id="func-foo-abc123"></a>');
    expect(specContent).toContain('<a id="func-bar-def456"></a>');

    // VALIDATE: Anchors are HTML tags (not markdown headers)
    expect(anchors).toBeDefined();
    expect(anchors!.length).toBe(2);

    // VALIDATE: No cross-links in Phase 2 output (will be added by Agent 2)
    expect(links).toBeNull();
  });

  it('should verify KB API methods for validation exist', () => {
    const kb = new KnowledgeBase();

    // Insert test data
    kb.insertEntity({
      id: 'e1',
      kind: 'function',
      name: 'f1',
      path: 'a.ts',
      exported: true,
    });

    kb.insertChunk({
      id: 'bc1',
      targetEntityId: 'e1',
      textDraft: 'Does something',
      confidence: 'High' as Confidence,
      factSetIds: ['fs1'],
    });

    kb.insertOpenQuestion({
      qid: 'Q-function-1',
      entityId: 'e1',
      question: 'What does this do?',
      confidence: 30,
      factSetIds: ['fs1'],
    });

    console.log('\n=== Phase -1 Analysis: KB API Methods ===');
    console.log('getAllEntities():', kb.getAllEntities().length);
    console.log('getChunksByEntity(e1):', kb.getChunksByEntity('e1').length);
    console.log('getOpenQuestionsByEntity(e1):', kb.getOpenQuestionsByEntity('e1').length);
    console.log('listExported():', kb.listExported().length);

    // VALIDATE: Methods exist and return expected types
    expect(kb.getAllEntities()).toHaveLength(1);
    expect(kb.getChunksByEntity('e1')).toHaveLength(1);
    expect(kb.getOpenQuestionsByEntity('e1')).toHaveLength(1);
    expect(kb.listExported()).toHaveLength(1);

    // VALIDATE: Correct field names
    const entity = kb.getAllEntities()[0];
    expect(entity).toHaveProperty('path'); // NOT filePath
    expect(entity).toHaveProperty('exported'); // NOT exportInfo

    const chunk = kb.getChunksByEntity('e1')[0];
    expect(chunk).toHaveProperty('targetEntityId'); // NOT entityId
    expect(chunk).toHaveProperty('textDraft'); // NOT text
    expect(chunk).toHaveProperty('factSetIds'); // Array, NOT factSetId
    expect(Array.isArray(chunk.factSetIds)).toBe(true);

    const oq = kb.getOpenQuestionsByEntity('e1')[0];
    expect(oq).toHaveProperty('qid');
    expect(oq).toHaveProperty('entityId');
    expect(oq).toHaveProperty('question');
  });

  it('should test anchor extraction regex against real output', () => {
    const kb = new KnowledgeBase();
    const generator = new SpecGenerator(kb);

    kb.insertEntity({
      id: 'class-MyClass-xyz789',
      kind: 'class',
      name: 'MyClass',
      path: 'src/lib/utils.ts',
      exported: true,
    });

    const specsMap = generator.generateDirectorySpecs('/test/project');
    const specContent = specsMap['src/lib/spec.md'];

    console.log('\n=== Phase -1 Analysis: Anchor Regex Testing ===');

    // Test HTML anchor regex (CORRECT format from Phase 2)
    const anchorRegex = /<a id="([^"]+)"><\/a>/g;
    const matches = [...specContent.matchAll(anchorRegex)];

    console.log('Matches found:', matches.length);
    matches.forEach((match, idx) => {
      console.log(`Match ${idx}: Full match="${match[0]}", Entity ID="${match[1]}"`);
    });

    // VALIDATE: Regex extracts entity ID correctly
    expect(matches).toHaveLength(1);
    expect(matches[0][1]).toBe('class-MyClass-xyz789');

    // Test markdown link regex (for when Agent 2 adds cross-links)
    const linkRegex = /\[([^\]]+)\]\(#([^)]+)\)/g;
    const linkMatches = [...specContent.matchAll(linkRegex)];
    console.log('Link matches found:', linkMatches.length, '(expected 0 in Phase 2)');

    // VALIDATE: No links in Phase 2 output
    expect(linkMatches).toHaveLength(0);
  });

  it('should verify SpecFile data structure conversion', () => {
    const kb = new KnowledgeBase();
    const generator = new SpecGenerator(kb);

    kb.insertEntity({
      id: 'e1',
      kind: 'function',
      name: 'func1',
      path: 'src/a.ts',
      exported: true,
    });

    kb.insertEntity({
      id: 'e2',
      kind: 'function',
      name: 'func2',
      path: 'lib/b.ts',
      exported: true,
    });

    // Generator returns Record<string, string>
    const specsMap = generator.generateDirectorySpecs('/test/project');

    console.log('\n=== Phase -1 Analysis: SpecFile Conversion ===');
    console.log('Generator output type:', typeof specsMap);
    console.log('Keys:', Object.keys(specsMap));

    // Convert to SpecFile[] (as validator will need)
    interface SpecFile {
      path: string;
      content: string;
    }

    const specFiles: SpecFile[] = Object.entries(specsMap).map(([path, content]) => ({
      path,
      content,
    }));

    console.log('Converted to SpecFile[]:', specFiles.length, 'files');
    specFiles.forEach((file) => {
      console.log(`  - ${file.path} (${file.content.length} bytes)`);
    });

    // VALIDATE: Conversion works correctly
    expect(specFiles).toHaveLength(2);
    expect(specFiles[0]).toHaveProperty('path');
    expect(specFiles[0]).toHaveProperty('content');
    expect(typeof specFiles[0].path).toBe('string');
    expect(typeof specFiles[0].content).toBe('string');
  });

  it('should verify coverage calculation with mixed entities', () => {
    const kb = new KnowledgeBase();

    // 4 exported entities: 2 with chunks, 1 with QID, 1 with nothing
    kb.insertEntity({ id: 'e1', kind: 'function', name: 'f1', path: 'a.ts', exported: true });
    kb.insertEntity({ id: 'e2', kind: 'function', name: 'f2', path: 'a.ts', exported: true });
    kb.insertEntity({ id: 'e3', kind: 'function', name: 'f3', path: 'a.ts', exported: true });
    kb.insertEntity({ id: 'e4', kind: 'function', name: 'f4', path: 'a.ts', exported: true });

    // e1: Has chunk (High confidence)
    kb.insertChunk({
      id: 'bc1',
      targetEntityId: 'e1',
      textDraft: 'Does X',
      confidence: 'High' as Confidence,
      factSetIds: ['fs1'],
    });

    // e2: Has chunk (Medium confidence)
    kb.insertChunk({
      id: 'bc2',
      targetEntityId: 'e2',
      textDraft: 'Does Y',
      confidence: 'Medium' as Confidence,
      factSetIds: ['fs2'],
    });

    // e3: Has QID (Low confidence → Open Question)
    kb.insertOpenQuestion({
      qid: 'Q-function-1',
      entityId: 'e3',
      question: 'What does this do?',
      confidence: 25,
      factSetIds: ['fs3'],
    });

    // e4: Nothing (MISSING)

    console.log('\n=== Phase -1 Analysis: Coverage Calculation ===');
    const exported = kb.listExported();
    console.log('Total exported:', exported.length);

    const covered = exported.filter((e) => {
      const hasChunk = kb.getChunksByEntity(e.id).length > 0;
      const hasQID = kb.getOpenQuestionsByEntity(e.id).length > 0;
      return hasChunk || hasQID;
    });

    console.log('Covered entities:', covered.length);
    console.log('Coverage:', (covered.length / exported.length) * 100, '%');

    // VALIDATE: Coverage calculation
    expect(exported.length).toBe(4);
    expect(covered.length).toBe(3); // e1, e2, e3
    expect((covered.length / exported.length) * 100).toBeCloseTo(75, 1);
  });
});
