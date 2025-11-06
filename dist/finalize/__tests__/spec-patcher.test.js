import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { KnowledgeBase } from '../../kb/knowledge-base.js';
import { createEntity } from '../../kb/models.js';
import { parseAnswersFromFile, ingestAnswers } from '../answers.js';
import { patchSpecificationFiles } from '../spec-patcher.js';
const FIXTURE_ROOT = path.resolve('tests/fixtures/phase5/baseline/tiny-react');
describe('patchSpecificationFiles', () => {
    it('updates impacted specs, removes QIDs, and inserts finalization summaries', () => {
        const workdir = cpFixture();
        const kb = buildKnowledgeBase();
        ingestFixtureAnswers(kb, workdir);
        const impactReport = loadImpactReport();
        const reanalysis = loadReanalysisResult();
        const report = patchSpecificationFiles(workdir, kb, impactReport, reanalysis, {
            deterministic: true,
            timestamp: () => '1970-01-01T00:00:00.000Z'
        });
        const expectedSpec = fs.readFileSync(path.join(FIXTURE_ROOT, 'expected/root.spec.md'), 'utf8');
        const expectedDirSpec = fs.readFileSync(path.join(FIXTURE_ROOT, 'expected/src/spec.md'), 'utf8');
        const expectedSummary = JSON.parse(fs.readFileSync(path.join(FIXTURE_ROOT, 'finalization.summary.json'), 'utf8'));
        const actualSpec = fs.readFileSync(path.join(workdir, 'spec.md'), 'utf8');
        const actualDirSpec = fs.readFileSync(path.join(workdir, 'src/spec.md'), 'utf8');
        expect(actualSpec).toEqual(ensureTrailingNewline(expectedSpec));
        expect(actualDirSpec).toEqual(ensureTrailingNewline(expectedDirSpec));
        expect(report).toEqual(expectedSummary);
        expect(kb.getAllOpenQuestions()).toEqual([]);
    });
    it('reports failures when anchors are missing and preserves unresolved QIDs', () => {
        const workdir = cpFixture();
        const kb = buildKnowledgeBase();
        ingestFixtureAnswers(kb, workdir);
        const specPath = path.join(workdir, 'src/spec.md');
        const original = fs.readFileSync(specPath, 'utf8');
        const modified = original.replace('<a id="QuVnACVfXW"></a>', '<!-- anchor removed -->');
        fs.writeFileSync(specPath, modified, 'utf8');
        const impactReport = loadImpactReport();
        const reanalysis = loadReanalysisResult();
        const report = patchSpecificationFiles(workdir, kb, impactReport, reanalysis, {
            deterministic: true,
            timestamp: () => '1970-01-01T00:00:00.000Z'
        });
        expect(report.failedEntities).toEqual([
            {
                entityId: 'QuVnACVfXW',
                reason: 'anchor-missing',
                details: 'Anchor not found for entity QuVnACVfXW (render).'
            }
        ]);
        expect(report.resolvedQids).toEqual([]);
        expect(kb.getAllOpenQuestions().map((oq) => oq.qid)).toEqual(['q:GR0v81JJWV']);
        expect(fs.readFileSync(specPath, 'utf8')).toEqual(modified);
        expect(fs.readFileSync(path.join(workdir, 'spec.md'), 'utf8')).toEqual(fs.readFileSync(path.join(FIXTURE_ROOT, 'spec.md'), 'utf8'));
    });
    it('updates multiple entities within the same spec file without index drift', () => {
        const workdir = cpFixture();
        const kb = buildKnowledgeBase();
        ingestFixtureAnswers(kb, workdir);
        const buttonEntity = createEntity({
            id: 'raZEDxU4v6',
            kind: 'function',
            name: 'Button',
            path: 'src/Button.tsx',
            exported: true,
            visibility: 'public',
            signature: '({ label, onClick, disabled = false }: ButtonProps): any'
        });
        kb.insertEntity(buttonEntity);
        const buttonFactSet = {
            id: 'raZEDxU4v6-facts',
            facts: [{ subjectId: buttonEntity.id, predicate: 'renders', object: 'Button component' }],
            sources: [],
            evidenceScore: 55
        };
        kb.insertFactSet(buttonFactSet);
        const buttonBaselineChunk = {
            id: 'chunk-raZEDxU4v6',
            targetEntityId: buttonEntity.id,
            textDraft: 'Renders Button component',
            confidence: 'High',
            factSetIds: [buttonFactSet.id]
        };
        kb.insertChunk(buttonBaselineChunk);
        const cardEntity = createEntity({
            id: 'A9m2IW5nts',
            kind: 'class',
            name: 'Card',
            path: 'src/Card.tsx',
            exported: true,
            visibility: 'public'
        });
        kb.insertEntity(cardEntity);
        const cardFactSet = {
            id: 'A9m2IW5nts-facts',
            facts: [{ subjectId: cardEntity.id, predicate: 'renders', object: 'Card layout' }],
            sources: [],
            evidenceScore: 50
        };
        kb.insertFactSet(cardFactSet);
        const impactReport = loadImpactReport();
        impactReport.impactedEntities = ['raZEDxU4v6', 'A9m2IW5nts', 'QuVnACVfXW'];
        impactReport.resolvedEntities = ['QuVnACVfXW'];
        impactReport.diagnostics.nodesTraversed = impactReport.impactedEntities.length;
        const updatedChunks = new Map([
            [
                'raZEDxU4v6',
                {
                    id: 'chunk-raZEDxU4v6',
                    targetEntityId: 'raZEDxU4v6',
                    textDraft: 'Button component handles primary actions and emits accessibility labels.',
                    confidence: 'High',
                    factSetIds: [buttonFactSet.id]
                }
            ],
            [
                'A9m2IW5nts',
                {
                    id: 'chunk-A9m2IW5nts',
                    targetEntityId: 'A9m2IW5nts',
                    textDraft: 'Card organizes header and body content with optional footer support.',
                    confidence: 'High',
                    factSetIds: [cardFactSet.id]
                }
            ],
            [
                'QuVnACVfXW',
                {
                    id: 'chunk-QuVnACVfXW',
                    targetEntityId: 'QuVnACVfXW',
                    textDraft: 'Render method injects card metadata into the body template.',
                    confidence: 'High',
                    factSetIds: ['QuVnACVfXW-facts']
                }
            ]
        ]);
        const reanalysis = {
            updatedChunks,
            failedEntities: [],
            warnings: [],
            metrics: {
                tokensUsed: 0,
                entitiesProcessed: updatedChunks.size,
                entitiesFailed: 0,
                runtimeMs: 0
            }
        };
        const report = patchSpecificationFiles(workdir, kb, impactReport, reanalysis, {
            deterministic: true,
            timestamp: () => '1970-01-01T00:00:00.000Z'
        });
        expect(report.patchedFiles).toHaveLength(2);
        expect(report.patchedFiles[0].sectionsUpdated).toHaveLength(3);
        expect(new Set(report.patchedFiles[0].sectionsUpdated.map((section) => section.entityId))).toEqual(new Set(['raZEDxU4v6', 'A9m2IW5nts', 'QuVnACVfXW']));
        const dirSpec = fs.readFileSync(path.join(workdir, 'src/spec.md'), 'utf8');
        expect(dirSpec).toContain('- Button component handles primary actions and emits accessibility labels.');
        expect(dirSpec).toContain('- Card organizes header and body content with optional footer support.');
        expect(dirSpec).toContain('- Render method injects card metadata into the body template.');
        const summary = fs.readFileSync(path.join(workdir, 'spec.md'), 'utf8');
        expect(summary).toContain('- Resolved QIDs: 1');
        expect(summary).toContain('Updated Sections: Button (raZEDxU4v6), Card (A9m2IW5nts), render (QuVnACVfXW)');
    });
    it('is idempotent when rerun in deterministic mode with existing summaries', () => {
        const workdir = cpFixture();
        const firstRunKb = buildKnowledgeBase();
        ingestFixtureAnswers(firstRunKb, workdir);
        const impactReport = loadImpactReport();
        const reanalysis = loadReanalysisResult();
        const deterministicOptions = {
            deterministic: true,
            timestamp: () => '1970-01-01T00:00:00.000Z'
        };
        patchSpecificationFiles(workdir, firstRunKb, impactReport, reanalysis, deterministicOptions);
        const firstRoot = fs.readFileSync(path.join(workdir, 'spec.md'), 'utf8');
        const firstDir = fs.readFileSync(path.join(workdir, 'src/spec.md'), 'utf8');
        const secondRunKb = buildKnowledgeBase();
        ingestFixtureAnswers(secondRunKb, workdir);
        patchSpecificationFiles(workdir, secondRunKb, impactReport, reanalysis, deterministicOptions);
        const expectedRoot = ensureTrailingNewline(fs.readFileSync(path.join(FIXTURE_ROOT, 'expected/root.spec.md'), 'utf8'));
        const expectedDir = ensureTrailingNewline(fs.readFileSync(path.join(FIXTURE_ROOT, 'expected/src/spec.md'), 'utf8'));
        const afterSecondRoot = fs.readFileSync(path.join(workdir, 'spec.md'), 'utf8');
        const afterSecondDir = fs.readFileSync(path.join(workdir, 'src/spec.md'), 'utf8');
        expect(normalizeSpecContent(afterSecondRoot)).toEqual(normalizeSpecContent(firstRoot));
        expect(normalizeSpecContent(afterSecondDir)).toEqual(normalizeSpecContent(firstDir));
        expect(ensureTrailingNewline(afterSecondRoot)).toEqual(expectedRoot);
        expect(ensureTrailingNewline(afterSecondDir)).toEqual(expectedDir);
        expect((afterSecondRoot.match(/## Finalization Summary/g) ?? []).length).toBe(1);
        expect((afterSecondDir.match(/## Finalization Summary/g) ?? []).length).toBe(1);
    });
    it('stacks summary blocks when rerun in non-deterministic mode', () => {
        const workdir = cpFixture();
        const firstRunKb = buildKnowledgeBase();
        ingestFixtureAnswers(firstRunKb, workdir);
        const impactReport = loadImpactReport();
        const reanalysis = loadReanalysisResult();
        patchSpecificationFiles(workdir, firstRunKb, impactReport, reanalysis, {
            deterministic: false,
            timestamp: () => '1970-01-01T00:00:00.000Z'
        });
        const secondRunKb = buildKnowledgeBase();
        ingestFixtureAnswers(secondRunKb, workdir);
        patchSpecificationFiles(workdir, secondRunKb, impactReport, reanalysis, {
            deterministic: false,
            timestamp: () => '1970-01-02T00:00:00.000Z'
        });
        const specContent = fs.readFileSync(path.join(workdir, 'spec.md'), 'utf8');
        expect((specContent.match(/## Finalization Summary/g) ?? []).length).toBe(2);
        expect(/- Finalized:\s*1970-01-02T00:00:00\.000Z/.test(specContent)).toBe(true);
        expect(/- Finalized:\s*1970-01-01T00:00:00\.000Z/.test(specContent)).toBe(true);
        const firstOccurrence = specContent.indexOf('1970-01-02T00:00:00.000');
        const secondOccurrence = specContent.indexOf('1970-01-01T00:00:00.000');
        expect(firstOccurrence).toBeGreaterThan(-1);
        expect(secondOccurrence).toBeGreaterThan(firstOccurrence);
    });
    it('reports spec-missing failures while still resolving available QIDs', () => {
        const workdir = cpFixture();
        const kb = buildKnowledgeBase();
        ingestFixtureAnswers(kb, workdir);
        const impactReport = loadImpactReport();
        impactReport.impactedEntities = ['QuVnACVfXW', 'icon-entity'];
        impactReport.resolvedEntities = ['QuVnACVfXW'];
        impactReport.diagnostics.nodesTraversed = impactReport.impactedEntities.length;
        const iconEntity = createEntity({
            id: 'icon-entity',
            kind: 'function',
            name: 'Icon',
            path: 'assets/Icon.tsx',
            exported: true,
            visibility: 'public'
        });
        kb.insertEntity(iconEntity);
        const iconFactSet = {
            id: 'icon-entity-facts',
            facts: [{ subjectId: iconEntity.id, predicate: 'renders', object: 'SVG icon' }],
            sources: [],
            evidenceScore: 40
        };
        kb.insertFactSet(iconFactSet);
        const iconChunk = {
            id: 'chunk-icon-entity',
            targetEntityId: 'icon-entity',
            textDraft: 'Icon component renders accessible SVG nodes.',
            confidence: 'Medium',
            factSetIds: [iconFactSet.id]
        };
        const reanalysis = {
            updatedChunks: new Map([
                [
                    'QuVnACVfXW',
                    {
                        id: 'chunk-QuVnACVfXW',
                        targetEntityId: 'QuVnACVfXW',
                        textDraft: 'Render method injects card metadata into the body template.',
                        confidence: 'High',
                        factSetIds: ['QuVnACVfXW-facts']
                    }
                ],
                ['icon-entity', iconChunk]
            ]),
            failedEntities: [],
            warnings: [],
            metrics: {
                tokensUsed: 0,
                entitiesProcessed: 2,
                entitiesFailed: 0,
                runtimeMs: 0
            }
        };
        const report = patchSpecificationFiles(workdir, kb, impactReport, reanalysis, {
            deterministic: true,
            timestamp: () => '1970-01-01T00:00:00.000Z'
        });
        expect(report.failedEntities).toEqual([
            {
                entityId: 'icon-entity',
                reason: 'spec-missing',
                details: 'Specification file not found for icon-entity (assets/spec.md).'
            }
        ]);
        expect(report.resolvedQids).toEqual(['q:GR0v81JJWV']);
        expect(kb.getAllOpenQuestions()).toEqual([]);
        const rootSummary = fs.readFileSync(path.join(workdir, 'spec.md'), 'utf8');
        expect(rootSummary).toContain('Updated Sections: render (QuVnACVfXW)');
        expect(rootSummary).not.toContain('icon-entity');
    });
});
function cpFixture() {
    const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'ceps-finalize-'));
    fs.cpSync(FIXTURE_ROOT, workdir, { recursive: true });
    return workdir;
}
function buildKnowledgeBase() {
    const kb = new KnowledgeBase();
    const entity = createEntity({
        id: 'QuVnACVfXW',
        kind: 'method',
        name: 'render',
        path: 'src/Card.tsx',
        exported: true,
        visibility: 'public',
        signature: '(): any'
    });
    kb.insertEntity(entity);
    const factSet = {
        id: 'QuVnACVfXW-facts',
        facts: [{ subjectId: entity.id, predicate: 'has-jsdoc', object: 'Renders card markup.' }],
        sources: [],
        evidenceScore: 60
    };
    kb.insertFactSet(factSet);
    const chunk = {
        id: 'chunk-QuVnACVfXW',
        targetEntityId: entity.id,
        textDraft: 'Method render (intent unclear from static analysis)',
        confidence: 'Low',
        factSetIds: [factSet.id]
    };
    kb.insertChunk(chunk);
    const openQuestion = {
        qid: 'q:GR0v81JJWV',
        entityId: entity.id,
        question: 'What is the behavior of method `render` at src/Card.tsx?',
        confidence: 30,
        factSetIds: [factSet.id]
    };
    kb.insertOpenQuestion(openQuestion);
    return kb;
}
function ingestFixtureAnswers(kb, workdir) {
    const parseResult = parseAnswersFromFile(path.join(workdir, 'answers.md'));
    ingestAnswers(kb, parseResult, { now: () => '1970-01-01T00:00:00.000Z' });
}
function loadImpactReport() {
    return JSON.parse(fs.readFileSync(path.join(FIXTURE_ROOT, 'impact.report.json'), 'utf8'));
}
function loadReanalysisResult() {
    const raw = JSON.parse(fs.readFileSync(path.join(FIXTURE_ROOT, 'reanalysis.success.json'), 'utf8'));
    const updatedChunks = new Map();
    for (const item of raw.updatedChunks) {
        updatedChunks.set(item.entityId, item.chunk);
    }
    return {
        updatedChunks,
        failedEntities: raw.failedEntities,
        warnings: raw.warnings,
        metrics: raw.metrics
    };
}
function ensureTrailingNewline(value) {
    return value.endsWith('\n') ? value : `${value}\n`;
}
function normalizeSpecContent(value) {
    return value.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trimEnd();
}
//# sourceMappingURL=spec-patcher.test.js.map