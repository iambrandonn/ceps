import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { KnowledgeBase } from '../../kb/knowledge-base.js';
import { createEntity } from '../../kb/models.js';
import { computeImpactReport } from '../impact-scope.js';
function insertEntity(kb, id, filePath, overrides = {}) {
    kb.insertEntity(createEntity({
        id,
        kind: 'function',
        name: path.posix.basename(filePath, path.posix.extname(filePath)),
        path: filePath,
        exported: true,
        visibility: 'public',
        ...overrides
    }));
}
function insertOpenQuestion(kb, qid, entityId) {
    const question = {
        qid,
        entityId,
        question: `What does ${entityId} do?`,
        confidence: 20,
        factSetIds: [`${entityId}-fs`]
    };
    kb.insertOpenQuestion(question);
}
describe('computeImpactReport', () => {
    it('computes transitive impact scope with default caps', () => {
        const kb = new KnowledgeBase();
        insertEntity(kb, 'entity-a', 'src/a.ts');
        insertEntity(kb, 'entity-b', 'src/services/b.ts');
        insertEntity(kb, 'entity-c', 'src/components/c.tsx');
        insertOpenQuestion(kb, 'q:SEEDA00001', 'entity-a');
        kb.attachAnswer('q:SEEDA00001', 'Answer for A', { appliedAt: '1970-01-01T00:00:00.000Z' });
        kb.insertRelation({
            subjectId: 'entity-b',
            predicate: 'calls',
            objectId: 'entity-a',
            source: { kind: 'ast', file: 'src/services/b.ts' }
        });
        kb.insertRelation({
            subjectId: 'entity-c',
            predicate: 'calls',
            objectId: 'entity-b',
            source: { kind: 'ast', file: 'src/components/c.tsx' }
        });
        const report = computeImpactReport(kb, ['q:SEEDA00001']);
        expect(report.seedQids).toEqual(['q:SEEDA00001']);
        expect(report.resolvedEntities).toEqual(['entity-a']);
        expect(report.impactedEntities).toEqual(['entity-a', 'entity-b', 'entity-c']);
        expect(report.impactedDirectories).toEqual([
            'spec.md',
            'src/components/spec.md',
            'src/services/spec.md',
            'src/spec.md'
        ]);
        expect(report.diagnostics).toEqual({
            hopsTraversed: 2,
            nodesTraversed: 3,
            capped: false,
            excluded: [],
            warnings: []
        });
    });
    it('honors hop caps and records excluded nodes', () => {
        const kb = new KnowledgeBase();
        insertEntity(kb, 'entity-a', 'src/a.ts');
        insertEntity(kb, 'entity-b', 'src/services/b.ts');
        insertEntity(kb, 'entity-c', 'src/components/c.tsx');
        insertOpenQuestion(kb, 'q:SEEDA00002', 'entity-a');
        kb.attachAnswer('q:SEEDA00002', 'Answer for A', { appliedAt: '1970-01-01T00:00:00.000Z' });
        kb.insertRelation({
            subjectId: 'entity-b',
            predicate: 'calls',
            objectId: 'entity-a',
            source: { kind: 'ast', file: 'src/services/b.ts' }
        });
        kb.insertRelation({
            subjectId: 'entity-c',
            predicate: 'calls',
            objectId: 'entity-b',
            source: { kind: 'ast', file: 'src/components/c.tsx' }
        });
        const options = { maxHops: 1 };
        const report = computeImpactReport(kb, ['q:SEEDA00002'], options);
        expect(report.impactedEntities).toEqual(['entity-a', 'entity-b']);
        expect(report.diagnostics.capped).toBe(true);
        expect(report.diagnostics.hopsTraversed).toBe(1);
        expect(report.diagnostics.excluded).toEqual(['entity-c']);
        expect(report.diagnostics.warnings[0]).toContain('--finalize-max-hops');
    });
    it('honors node caps and emits warnings near capacity', () => {
        const kb = new KnowledgeBase();
        insertEntity(kb, 'entity-a', 'src/a.ts');
        insertEntity(kb, 'entity-b', 'src/services/b.ts');
        insertEntity(kb, 'entity-c', 'src/components/c.tsx');
        insertEntity(kb, 'entity-d', 'src/components/deep/d.ts');
        insertOpenQuestion(kb, 'q:SEEDA00003', 'entity-a');
        kb.attachAnswer('q:SEEDA00003', 'Answer for A', { appliedAt: '1970-01-01T00:00:00.000Z' });
        kb.insertRelation({
            subjectId: 'entity-b',
            predicate: 'calls',
            objectId: 'entity-a',
            source: { kind: 'ast', file: 'src/services/b.ts' }
        });
        kb.insertRelation({
            subjectId: 'entity-c',
            predicate: 'calls',
            objectId: 'entity-b',
            source: { kind: 'ast', file: 'src/components/c.tsx' }
        });
        kb.insertRelation({
            subjectId: 'entity-d',
            predicate: 'calls',
            objectId: 'entity-c',
            source: { kind: 'ast', file: 'src/components/deep/d.ts' }
        });
        const report = computeImpactReport(kb, ['q:SEEDA00003'], { maxNodes: 3 });
        expect(report.impactedEntities).toEqual(['entity-a', 'entity-b', 'entity-c']);
        expect(report.diagnostics.capped).toBe(true);
        expect(report.diagnostics.excluded).toEqual(['entity-d']);
        expect(report.diagnostics.nodesTraversed).toBe(3);
        expect(report.diagnostics.warnings.some(message => message.includes('--finalize-max-nodes'))).toBe(true);
    });
    it('emits high-usage warning when approaching node cap without excluding nodes', () => {
        const kb = new KnowledgeBase();
        insertEntity(kb, 'entity-a', 'src/a.ts');
        insertEntity(kb, 'entity-b', 'src/services/b.ts');
        insertEntity(kb, 'entity-c', 'src/components/c.tsx');
        insertEntity(kb, 'entity-d', 'src/components/deep/d.ts');
        insertOpenQuestion(kb, 'q:SEEDA00004', 'entity-a');
        kb.attachAnswer('q:SEEDA00004', 'Answer for A', { appliedAt: '1970-01-01T00:00:00.000Z' });
        kb.insertRelation({
            subjectId: 'entity-b',
            predicate: 'calls',
            objectId: 'entity-a',
            source: { kind: 'ast', file: 'src/services/b.ts' }
        });
        kb.insertRelation({
            subjectId: 'entity-c',
            predicate: 'calls',
            objectId: 'entity-b',
            source: { kind: 'ast', file: 'src/components/c.tsx' }
        });
        kb.insertRelation({
            subjectId: 'entity-d',
            predicate: 'calls',
            objectId: 'entity-c',
            source: { kind: 'ast', file: 'src/components/deep/d.ts' }
        });
        const report = computeImpactReport(kb, ['q:SEEDA00004'], { maxNodes: 4 });
        expect(report.impactedEntities).toEqual(['entity-a', 'entity-b', 'entity-c', 'entity-d']);
        expect(report.diagnostics.capped).toBe(false);
        expect(report.diagnostics.warnings).toContain('Impact traversal visited 4/4 nodes (100% of maxNodes). Consider increasing --finalize-max-nodes or using --finalize-scope full.');
    });
    it('includes package spec paths for monorepo entities', () => {
        const kb = new KnowledgeBase();
        insertEntity(kb, 'entity-root', 'packages/app/src/index.ts', { packageId: '@repo/app' });
        insertOpenQuestion(kb, 'q:MONOREPO001', 'entity-root');
        kb.attachAnswer('q:MONOREPO001', 'Answer for monorepo entity', {
            appliedAt: '1970-01-01T00:00:00.000Z'
        });
        const report = computeImpactReport(kb, ['q:MONOREPO001']);
        expect(report.impactedEntities).toEqual(['entity-root']);
        expect(report.impactedDirectories).toEqual([
            'packages/app/spec.md',
            'packages/app/src/spec.md',
            'spec.md'
        ]);
    });
    it('matches the tiny-react baseline impact report fixture', () => {
        const fixtureRoot = path.resolve(path.join('tests', 'fixtures', 'phase5', 'baseline', 'tiny-react'));
        const qids = JSON.parse(fs.readFileSync(path.join(fixtureRoot, 'qids.json'), 'utf8'));
        const expected = JSON.parse(fs.readFileSync(path.join(fixtureRoot, 'impact.report.json'), 'utf8'));
        const kb = new KnowledgeBase();
        const renderEntityId = qids[0].entityId;
        insertEntity(kb, renderEntityId, 'src/Card.tsx', {
            kind: 'method',
            name: 'render'
        });
        for (const { qid, entityId, factSetIds } of qids) {
            const question = {
                qid,
                entityId,
                question: 'Fixture question',
                confidence: 30,
                factSetIds
            };
            kb.insertOpenQuestion(question);
            kb.attachAnswer(qid, 'Fixture answer', { appliedAt: '1970-01-01T00:00:00.000Z' });
        }
        const report = computeImpactReport(kb, qids.map((item) => item.qid));
        expect(report).toEqual(expected);
    });
    it('handles diamond dependency graphs without duplication', () => {
        const kb = new KnowledgeBase();
        insertEntity(kb, 'entity-a', 'src/a.ts');
        insertEntity(kb, 'entity-b', 'src/b.ts');
        insertEntity(kb, 'entity-c', 'src/c.ts');
        insertEntity(kb, 'entity-d', 'src/d.ts');
        insertOpenQuestion(kb, 'q:DIAMOND001', 'entity-a');
        kb.attachAnswer('q:DIAMOND001', 'Answer for A', { appliedAt: '1970-01-01T00:00:00.000Z' });
        // B and C depend on A; D depends on both B and C.
        kb.insertRelation({
            subjectId: 'entity-b',
            predicate: 'calls',
            objectId: 'entity-a'
        });
        kb.insertRelation({
            subjectId: 'entity-c',
            predicate: 'calls',
            objectId: 'entity-a'
        });
        kb.insertRelation({
            subjectId: 'entity-d',
            predicate: 'calls',
            objectId: 'entity-b'
        });
        kb.insertRelation({
            subjectId: 'entity-d',
            predicate: 'calls',
            objectId: 'entity-c'
        });
        const report = computeImpactReport(kb, ['q:DIAMOND001']);
        expect(report.impactedEntities).toEqual(['entity-a', 'entity-b', 'entity-c', 'entity-d']);
        expect(report.diagnostics.capped).toBe(false);
    });
    it('handles cyclic graphs without infinite loops', () => {
        const kb = new KnowledgeBase();
        insertEntity(kb, 'entity-a', 'src/a.ts');
        insertEntity(kb, 'entity-b', 'src/b.ts');
        insertOpenQuestion(kb, 'q:CYCLE001', 'entity-a');
        kb.attachAnswer('q:CYCLE001', 'Answer for A', { appliedAt: '1970-01-01T00:00:00.000Z' });
        kb.insertRelation({
            subjectId: 'entity-b',
            predicate: 'calls',
            objectId: 'entity-a'
        });
        kb.insertRelation({
            subjectId: 'entity-a',
            predicate: 'calls',
            objectId: 'entity-b'
        });
        const report = computeImpactReport(kb, ['q:CYCLE001']);
        expect(report.impactedEntities).toEqual(['entity-a', 'entity-b']);
        expect(report.diagnostics.capped).toBe(false);
    });
    it('returns full traversal when scope is set to full', () => {
        const kb = new KnowledgeBase();
        insertEntity(kb, 'entity-a', 'src/a.ts');
        insertEntity(kb, 'entity-b', 'src/b.ts');
        insertEntity(kb, 'entity-c', 'src/c.ts');
        insertOpenQuestion(kb, 'q:FULLSCOPE', 'entity-a');
        kb.attachAnswer('q:FULLSCOPE', 'Answer', { appliedAt: '1970-01-01T00:00:00.000Z' });
        kb.insertRelation({
            subjectId: 'entity-b',
            predicate: 'calls',
            objectId: 'entity-a'
        });
        kb.insertRelation({
            subjectId: 'entity-c',
            predicate: 'calls',
            objectId: 'entity-b'
        });
        const report = computeImpactReport(kb, ['q:FULLSCOPE'], { scope: 'full', maxHops: 1, maxNodes: 2 });
        expect(report.impactedEntities).toEqual(['entity-a', 'entity-b', 'entity-c']);
        expect(report.diagnostics.capped).toBe(false);
        expect(report.diagnostics.warnings).toEqual([]);
    });
    it('deduplicates duplicate seed QIDs and entities', () => {
        const kb = new KnowledgeBase();
        insertEntity(kb, 'entity-a', 'src/a.ts');
        insertEntity(kb, 'entity-b', 'src/b.ts');
        const question = {
            qid: 'q:DUPSEED',
            entityId: 'entity-a',
            question: 'Question',
            confidence: 10,
            factSetIds: ['fs-a']
        };
        kb.insertOpenQuestion(question);
        kb.attachAnswer('q:DUPSEED', 'Answer', { appliedAt: '1970-01-01T00:00:00.000Z' });
        // B depends on A
        kb.insertRelation({
            subjectId: 'entity-b',
            predicate: 'calls',
            objectId: 'entity-a'
        });
        const report = computeImpactReport(kb, ['q:DUPSEED', 'q:DUPSEED']);
        expect(report.seedQids).toEqual(['q:DUPSEED']);
        expect(report.resolvedEntities).toEqual(['entity-a']);
        expect(report.impactedEntities).toEqual(['entity-a', 'entity-b']);
    });
    it('records warnings for unresolved nodes encountered during traversal', () => {
        const kb = new KnowledgeBase();
        insertEntity(kb, 'entity-a', 'src/a.ts');
        insertOpenQuestion(kb, 'q:UNRES', 'entity-a');
        kb.attachAnswer('q:UNRES', 'Answer', { appliedAt: '1970-01-01T00:00:00.000Z' });
        // Introduce a reverse dep node without an entity/path mapping
        kb.insertRelation({
            subjectId: 'externalLib',
            predicate: 'calls',
            objectId: 'entity-a'
        });
        const report = computeImpactReport(kb, ['q:UNRES']);
        expect(report.impactedEntities).toEqual(['entity-a']);
        expect(report.diagnostics.warnings.some((warning) => warning.includes('Skipped'))).toBe(true);
    });
});
//# sourceMappingURL=impact-scope.test.js.map