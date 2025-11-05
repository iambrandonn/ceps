/**
 * Phase 3 Step 6: CrossLinkValidator E2E Integration Tests
 *
 * End-to-end validation flow: KB → SpecGenerator → CrossLinkValidator
 *
 * Tests validate full pipeline integration with real Phase 2 components.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeBase } from '../../kb/knowledge-base.js';
import { SpecGenerator } from '../../generator/spec-generator.js';
import { CrossLinkValidator } from '../cross-link-validator.js';
describe('CrossLinkValidator - E2E Integration', () => {
    let kb;
    let generator;
    let validator;
    beforeEach(() => {
        kb = new KnowledgeBase();
        generator = new SpecGenerator(kb);
        validator = new CrossLinkValidator(kb);
    });
    it('should validate full pipeline: KB → Spec → Validation', () => {
        // Setup: 2 functions, f1 calls f2
        kb.insertEntity({
            id: 'e1',
            kind: 'function',
            name: 'f1',
            path: 'src/a.ts',
            exported: true,
        });
        kb.insertEntity({
            id: 'e2',
            kind: 'function',
            name: 'f2',
            path: 'src/a.ts',
            exported: true,
        });
        kb.insertRelation({
            subjectId: 'e1',
            predicate: 'calls',
            objectId: 'e2',
            details: { resolved: true },
        });
        kb.insertChunk({
            id: 'bc1',
            targetEntityId: 'e1',
            textDraft: 'Calls f2 for processing.',
            confidence: 'High',
            factSetIds: ['fs1'],
        });
        kb.insertChunk({
            id: 'bc2',
            targetEntityId: 'e2',
            textDraft: 'Processes data.',
            confidence: 'High',
            factSetIds: ['fs2'],
        });
        // Pre-generation validation
        const preResult = validator.validatePreGeneration();
        expect(preResult.passed).toBe(true);
        expect(preResult.coverage).toBe(100);
        // Generate specs using actual Phase 2 API
        const projectRoot = '/test/project';
        const specsMap = generator.generateDirectorySpecs(projectRoot);
        // Convert Record<string,string> to SpecFile[]
        const specFiles = Object.entries(specsMap).map(([path, content]) => ({
            path,
            content,
        }));
        // Post-generation validation
        const anchorMap = validator.buildAnchorMap(specFiles);
        const postResult = validator.validatePostGeneration(specFiles, anchorMap);
        expect(postResult.passed).toBe(true);
        expect(postResult.brokenLinks).toHaveLength(0);
    });
    it('should fail pre-generation when entity missing chunk', () => {
        // Setup: Entity without chunk or QID
        kb.insertEntity({
            id: 'e1',
            kind: 'function',
            name: 'undocumented',
            path: 'src/a.ts',
            exported: true,
        });
        // Pre-generation validation should fail
        const preResult = validator.validatePreGeneration();
        expect(preResult.passed).toBe(false);
        expect(preResult.missingEntities).toContain('e1');
        expect(preResult.coverage).toBe(0);
        // Generation would proceed anyway (in Phase 6, gate will block)
        const specsMap = generator.generateDirectorySpecs('/test/project');
        const specFiles = Object.entries(specsMap).map(([path, content]) => ({
            path,
            content,
        }));
        // Anchor map should still contain entity (Phase 2 generates template prose)
        const anchorMap = validator.buildAnchorMap(specFiles);
        expect(anchorMap.has('e1')).toBe(true);
    });
    it('should handle mixed confidence levels', () => {
        // High confidence entity
        kb.insertEntity({ id: 'e1', kind: 'function', name: 'f1', path: 'src/a.ts', exported: true });
        kb.insertChunk({
            id: 'bc1',
            targetEntityId: 'e1',
            textDraft: 'Well documented',
            confidence: 'High',
            factSetIds: ['fs1'],
        });
        // Medium confidence entity
        kb.insertEntity({ id: 'e2', kind: 'function', name: 'f2', path: 'src/a.ts', exported: true });
        kb.insertChunk({
            id: 'bc2',
            targetEntityId: 'e2',
            textDraft: 'Partially documented',
            confidence: 'Medium',
            factSetIds: ['fs2'],
        });
        // Low confidence entity with QID
        kb.insertEntity({ id: 'e3', kind: 'function', name: 'f3', path: 'src/a.ts', exported: true });
        kb.insertChunk({
            id: 'bc3',
            targetEntityId: 'e3',
            textDraft: '',
            confidence: 'Low',
            factSetIds: ['fs3'],
        });
        kb.insertOpenQuestion({
            qid: 'Q-function-1',
            entityId: 'e3',
            question: 'What does f3 do?',
            confidence: 25,
            factSetIds: ['fs3'],
        });
        // All should pass pre-generation (QID counts as coverage)
        const preResult = validator.validatePreGeneration();
        expect(preResult.passed).toBe(true);
        expect(preResult.coverage).toBe(100);
        expect(preResult.missingEntities).toHaveLength(0);
    });
    it('should detect broken links added manually to specs', () => {
        // Setup entities with chunks
        kb.insertEntity({ id: 'e1', kind: 'function', name: 'f1', path: 'src/a.ts', exported: true });
        kb.insertChunk({
            id: 'bc1',
            targetEntityId: 'e1',
            textDraft: 'Does X',
            confidence: 'High',
            factSetIds: ['fs1'],
        });
        // Pre-generation passes
        const preResult = validator.validatePreGeneration();
        expect(preResult.passed).toBe(true);
        // Manually create spec with broken link (simulating future Agent 2 behavior)
        const specFiles = [
            {
                path: 'src/spec.md',
                content: `
<a id="e1"></a>

### f1

Calls [missing function](#e-missing).
`,
            },
        ];
        // Build anchor map (only e1 exists)
        const anchorMap = validator.buildAnchorMap(specFiles);
        expect(anchorMap.size).toBe(1);
        // Post-generation should detect broken link
        const postResult = validator.validatePostGeneration(specFiles, anchorMap);
        expect(postResult.passed).toBe(false);
        expect(postResult.brokenLinks).toHaveLength(1);
        expect(postResult.brokenLinks[0].targetAnchor).toBe('#e-missing');
        expect(postResult.brokenLinks[0].sourceFile).toBe('src/spec.md');
    });
    it('should handle cross-directory links', () => {
        // Setup: Entity in src/ links to entity in lib/
        kb.insertEntity({ id: 'e1', kind: 'function', name: 'f1', path: 'src/a.ts', exported: true });
        kb.insertEntity({ id: 'e2', kind: 'function', name: 'f2', path: 'lib/b.ts', exported: true });
        kb.insertChunk({
            id: 'bc1',
            targetEntityId: 'e1',
            textDraft: 'Does X',
            confidence: 'High',
            factSetIds: ['fs1'],
        });
        kb.insertChunk({
            id: 'bc2',
            targetEntityId: 'e2',
            textDraft: 'Does Y',
            confidence: 'High',
            factSetIds: ['fs2'],
        });
        // Generate specs (separate directories)
        const specsMap = generator.generateDirectorySpecs('/test/project');
        const specFiles = Object.entries(specsMap).map(([path, content]) => ({
            path,
            content,
        }));
        // Build anchor map from all files
        const anchorMap = validator.buildAnchorMap(specFiles);
        expect(anchorMap.size).toBe(2);
        expect(anchorMap.get('e1').filePath).toBe('src/spec.md');
        expect(anchorMap.get('e2').filePath).toBe('lib/spec.md');
        // Manually add cross-directory link
        const modifiedSpecFiles = [
            {
                path: 'src/spec.md',
                content: `
<a id="e1"></a>

### f1

Uses [f2 in lib](#e2).
`,
            },
            {
                path: 'lib/spec.md',
                content: `
<a id="e2"></a>

### f2
`,
            },
        ];
        // Cross-directory link should resolve
        const postResult = validator.validatePostGeneration(modifiedSpecFiles, anchorMap);
        expect(postResult.passed).toBe(true);
    });
    it('should handle empty codebase (edge case)', () => {
        // No entities at all
        const preResult = validator.validatePreGeneration();
        expect(preResult.passed).toBe(true);
        expect(preResult.coverage).toBe(100); // 0/0 = 100%
        // Generate specs (will be empty)
        const specsMap = generator.generateDirectorySpecs('/test/project');
        expect(Object.keys(specsMap)).toHaveLength(0);
        // Post-generation with empty specs
        const postResult = validator.validatePostGeneration([], new Map());
        expect(postResult.passed).toBe(true);
    });
    it('should calculate partial coverage correctly', () => {
        // 4 exported entities: 3 with chunks, 1 without
        kb.insertEntity({ id: 'e1', kind: 'function', name: 'f1', path: 'src/a.ts', exported: true });
        kb.insertEntity({ id: 'e2', kind: 'function', name: 'f2', path: 'src/a.ts', exported: true });
        kb.insertEntity({ id: 'e3', kind: 'function', name: 'f3', path: 'src/a.ts', exported: true });
        kb.insertEntity({ id: 'e4', kind: 'function', name: 'f4', path: 'src/a.ts', exported: true });
        kb.insertChunk({
            id: 'bc1',
            targetEntityId: 'e1',
            textDraft: 'X',
            confidence: 'High',
            factSetIds: ['fs1'],
        });
        kb.insertChunk({
            id: 'bc2',
            targetEntityId: 'e2',
            textDraft: 'Y',
            confidence: 'High',
            factSetIds: ['fs2'],
        });
        kb.insertChunk({
            id: 'bc3',
            targetEntityId: 'e3',
            textDraft: 'Z',
            confidence: 'High',
            factSetIds: ['fs3'],
        });
        // e4 has no chunk
        const preResult = validator.validatePreGeneration();
        expect(preResult.passed).toBe(false);
        expect(preResult.coverage).toBe(75); // 3 of 4
        expect(preResult.missingEntities).toEqual(['e4']);
    });
});
//# sourceMappingURL=cross-link-validator-integration.test.js.map