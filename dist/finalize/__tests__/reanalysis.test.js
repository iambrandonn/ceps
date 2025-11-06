import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KnowledgeBase } from '../../kb/knowledge-base.js';
import { createEntity } from '../../kb/models.js';
import { reanalyzeEntities, SnapshotMismatchError } from '../reanalysis.js';
import { BudgetTracker } from '../../llm/budget.js';
import { captureSnapshot, writeSnapshot } from '../../snapshot/index.js';
function createImpactReport(entityIds, resolved = [], warnings = []) {
    return {
        seedQids: resolved.map((id) => `q:${id}`),
        resolvedEntities: resolved,
        impactedEntities: entityIds,
        impactedDirectories: [],
        diagnostics: {
            hopsTraversed: 0,
            nodesTraversed: entityIds.length,
            capped: false,
            excluded: [],
            warnings
        }
    };
}
describe('reanalyzeEntities', () => {
    let kb;
    let options;
    beforeEach(() => {
        kb = new KnowledgeBase();
        options = {
            deterministicMode: true,
            llmEnabled: false,
            reasoningEnabled: true
        };
    });
    function seedEntity({ entityId = 'entity-1', answer, chunkText = 'Original placeholder', confidence = 'Low' } = {}) {
        const entity = createEntity({
            id: entityId,
            kind: 'function',
            name: 'sampleFunction',
            path: `src/${entityId}.ts`,
            exported: true,
            visibility: 'public'
        });
        kb.insertEntity(entity);
        const factSet = {
            id: `${entityId}-fs`,
            facts: [
                { subjectId: entityId, predicate: 'has-jsdoc', object: 'Writes updated behaviour' }
            ],
            sources: [],
            evidenceScore: 70
        };
        kb.insertFactSet(factSet);
        const chunk = {
            id: `chunk-${entityId}`,
            targetEntityId: entityId,
            textDraft: chunkText,
            confidence,
            factSetIds: [factSet.id]
        };
        kb.insertChunk(chunk);
        if (answer) {
            const question = {
                qid: `q:${entityId}`,
                entityId,
                question: `What does ${entity.name} do?`,
                confidence: 20,
                factSetIds: [factSet.id]
            };
            kb.insertOpenQuestion(question);
            kb.attachAnswer(question.qid, answer, { appliedAt: '1970-01-01T00:00:00.000Z' });
        }
        return { entity, factSet };
    }
    it('replaces chunk text with provided answer and marks High confidence', async () => {
        seedEntity({ answer: 'Resolved behaviour details\n- Accepts props\n- Returns markup' });
        const report = {
            seedQids: ['q:entity-1'],
            resolvedEntities: ['entity-1'],
            impactedEntities: ['entity-1'],
            impactedDirectories: [],
            diagnostics: {
                hopsTraversed: 0,
                nodesTraversed: 1,
                capped: false,
                excluded: [],
                warnings: ['scope warning from impact report']
            }
        };
        const result = await reanalyzeEntities(kb, report, options);
        expect(result.failedEntities).toHaveLength(0);
        expect(result.warnings).toContain('scope warning from impact report');
        expect(result.metrics.entitiesProcessed).toBe(1);
        expect(result.updatedChunks.get('entity-1')?.textDraft).toBe('Resolved behaviour details\n- Accepts props\n- Returns markup');
        expect(result.updatedChunks.get('entity-1')?.confidence).toBe('High');
    });
    it('records failure when entity does not exist in KB', async () => {
        const report = createImpactReport(['missing-entity']);
        const result = await reanalyzeEntities(kb, report, options);
        expect(result.failedEntities).toHaveLength(1);
        expect(result.failedEntities[0]).toMatchObject({
            entityId: 'missing-entity',
            reason: 'kb-inconsistency'
        });
        expect(result.updatedChunks.size).toBe(0);
    });
    it('rebuilds chunk text from reasoning when no answer is provided', async () => {
        seedEntity({ answer: undefined, chunkText: 'Legacy behaviour', confidence: 'Low' });
        const report = createImpactReport(['entity-1']);
        const result = await reanalyzeEntities(kb, report, options);
        expect(result.failedEntities).toHaveLength(0);
        const updated = result.updatedChunks.get('entity-1');
        expect(updated).toBeDefined();
        expect(updated?.textDraft).toContain('Function sampleFunction');
    });
    it('applies LLM polish when gateway and validator succeed', async () => {
        const { entity } = seedEntity({ answer: undefined, chunkText: 'Legacy behaviour', confidence: 'Low' });
        const mockValidator = {
            validate: vi.fn().mockReturnValue({
                status: 'accept',
                diagnostics: []
            })
        };
        const mockGateway = {
            summarize: vi.fn().mockResolvedValue('LLM polished behaviour'),
            getCurrentProvider: vi.fn(),
            setProvider: vi.fn(),
            completions: vi.fn(),
            checkBudget: vi.fn(),
            getRemainingBudget: vi.fn(),
            getUsage: vi.fn(),
            getCacheStats: vi.fn(),
            clearCache: vi.fn()
        };
        options = {
            deterministicMode: true,
            llmEnabled: true,
            reasoningEnabled: true,
            llmGateway: mockGateway,
            validator: mockValidator,
            budgetTracker: new BudgetTracker(1000)
        };
        const report = createImpactReport([entity.id]);
        const result = await reanalyzeEntities(kb, report, options);
        expect(mockGateway.summarize).toHaveBeenCalled();
        const updated = result.updatedChunks.get(entity.id);
        expect(updated?.textDraft).toBe('LLM polished behaviour');
    });
    it('records llm-failure when gateway throws', async () => {
        const { entity } = seedEntity();
        const mockGateway = {
            summarize: vi.fn().mockRejectedValue(new Error('Gateway offline')),
            getCurrentProvider: vi.fn(),
            setProvider: vi.fn(),
            completions: vi.fn(),
            checkBudget: vi.fn(),
            getRemainingBudget: vi.fn(),
            getUsage: vi.fn(),
            getCacheStats: vi.fn(),
            clearCache: vi.fn()
        };
        options = {
            deterministicMode: true,
            llmEnabled: true,
            reasoningEnabled: true,
            llmGateway: mockGateway
        };
        const report = createImpactReport([entity.id]);
        const result = await reanalyzeEntities(kb, report, options);
        expect(result.failedEntities).toEqual([
            expect.objectContaining({
                entityId: entity.id,
                reason: 'llm-failure'
            })
        ]);
        expect(result.updatedChunks.size).toBe(0);
    });
    it('records grounding-reject when validator requests fallback', async () => {
        const { entity } = seedEntity();
        const diagnostics = [
            { chunkId: `chunk-${entity.id}`, rule: 'entity', reason: 'Ungrounded text' }
        ];
        const mockValidator = {
            validate: vi.fn().mockReturnValue({
                status: 'fallback',
                diagnostics
            })
        };
        const mockGateway = {
            summarize: vi.fn().mockResolvedValue('LLM polished behaviour'),
            getCurrentProvider: vi.fn(),
            setProvider: vi.fn(),
            completions: vi.fn(),
            checkBudget: vi.fn(),
            getRemainingBudget: vi.fn(),
            getUsage: vi.fn(),
            getCacheStats: vi.fn(),
            clearCache: vi.fn()
        };
        options = {
            deterministicMode: true,
            llmEnabled: true,
            reasoningEnabled: true,
            llmGateway: mockGateway,
            validator: mockValidator
        };
        const report = createImpactReport([entity.id]);
        const result = await reanalyzeEntities(kb, report, options);
        expect(result.failedEntities).toEqual([
            expect.objectContaining({
                entityId: entity.id,
                reason: 'grounding-reject'
            })
        ]);
        expect(result.updatedChunks.size).toBe(0);
    });
    it('throws SnapshotMismatchError when snapshot does not match and reconcile is false', async () => {
        seedEntity({ answer: 'Resolved text' });
        const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ceps-reanalysis-'));
        const sampleFile = path.join(tmpRoot, 'sample.ts');
        fs.writeFileSync(sampleFile, 'export const value = 1;');
        const snapshotDir = path.join(tmpRoot, '.ceps');
        fs.mkdirSync(snapshotDir, { recursive: true });
        const snapshotPath = path.join(snapshotDir, 'snapshot.json');
        const snapshotDoc = await captureSnapshot({ root: tmpRoot });
        writeSnapshot(snapshotDoc, snapshotPath);
        fs.writeFileSync(sampleFile, 'export const value = 2;');
        const report = createImpactReport(['entity-1']);
        await expect(reanalyzeEntities(kb, report, {
            ...options,
            snapshot: {
                projectRoot: tmpRoot,
                snapshotPath
            }
        })).rejects.toBeInstanceOf(SnapshotMismatchError);
    });
});
//# sourceMappingURL=reanalysis.test.js.map