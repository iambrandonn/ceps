/**
 * Phase 6 Quality Improvement: Polishing Phase Tests
 *
 * Verifies that the POLISHING phase selectively enhances low-confidence chunks
 * and upgrades their confidence levels appropriately.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Orchestrator } from '../orchestrator.js';
import { KnowledgeBase } from '../../kb/knowledge-base.js';
import { LLMGateway } from '../../llm/gateway.js';
import { createEntity } from '../../kb/models.js';
import * as fs from 'fs';
import * as path from 'path';
describe('Orchestrator POLISHING phase', () => {
    let kb;
    let mockGateway;
    let testDir;
    beforeEach(() => {
        kb = new KnowledgeBase();
        // Create mock LLM gateway with high budget to avoid budget check failures
        mockGateway = new LLMGateway({
            anthropicApiKey: 'test-key',
            budgetTokens: 1000000 // High budget for tests
        });
        // Mock the internal budget tracker's checkBudget method
        const budgetTracker = mockGateway.budget;
        vi.spyOn(budgetTracker, 'checkBudget').mockReturnValue(true);
        // Setup test directory with minimal fixture
        testDir = path.join(process.cwd(), 'tests/fixtures/polishing-test');
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        fs.writeFileSync(path.join(testDir, 'test.ts'), 'export const FOO = 42;', 'utf8');
    });
    describe('selective polishing criteria', () => {
        it('should polish Low-confidence chunks and upgrade confidence', async () => {
            // Mock completions method (which polish calls internally)
            vi.spyOn(mockGateway, 'completions').mockResolvedValue('Configuration value representing the maximum retry count for failed operations.');
            const orchestrator = new Orchestrator({
                projectRoot: testDir,
                llm: 'on',
                llmGateway: mockGateway,
                knowledgeBase: kb,
                snapshotEnabled: false
            });
            // Setup: Add entity and Low-confidence chunk
            const entity = createEntity({
                kind: 'constant',
                name: 'MAX_RETRIES',
                path: 'src/config.ts'
            });
            kb.insertEntity(entity);
            const factSetId = kb.insertFactSet({
                id: 'fs-1',
                facts: [
                    { subjectId: entity.id, predicate: 'has-value', object: 42 }
                ],
                sources: [{ kind: 'ast', file: 'src/config.ts' }],
                evidenceScore: 85
            });
            const chunk = {
                id: 'chunk-1',
                targetEntityId: entity.id,
                textDraft: 'Constant MAX_RETRIES (intent unclear from static analysis)',
                factSetIds: [factSetId],
                confidence: 'Low'
            };
            kb.insertChunk(chunk);
            // Execute polishing phase directly
            await orchestrator.runPolishing();
            // Verify chunk was updated with polished text
            const updatedChunk = kb.getChunk('chunk-1');
            expect(updatedChunk).toBeDefined();
            expect(updatedChunk.textDraft).toContain('retry');
            expect(updatedChunk.confidence).toBe('Medium'); // Upgraded from Low
        });
        it('should polish Medium-confidence chunks with "intent unclear" and upgrade to High', async () => {
            vi.spyOn(mockGateway, 'completions').mockResolvedValue('Processes user authentication requests and returns a JWT token.');
            const orchestrator = new Orchestrator({
                projectRoot: testDir,
                llm: 'on',
                llmGateway: mockGateway,
                knowledgeBase: kb,
                snapshotEnabled: false
            });
            // Setup: Medium confidence with "intent unclear"
            const entity = createEntity({
                kind: 'function',
                name: 'handleAuth',
                path: 'src/auth.ts'
            });
            kb.insertEntity(entity);
            const factSetId = kb.insertFactSet({
                id: 'fs-2',
                facts: [
                    { subjectId: entity.id, predicate: 'returns', object: 'string' }
                ],
                sources: [{ kind: 'ast', file: 'src/auth.ts' }],
                evidenceScore: 60
            });
            const chunk = {
                id: 'chunk-2',
                targetEntityId: entity.id,
                textDraft: 'Function handleAuth: intent unclear from static analysis',
                factSetIds: [factSetId],
                confidence: 'Medium'
            };
            kb.insertChunk(chunk);
            await orchestrator.runPolishing();
            const updatedChunk = kb.getChunk('chunk-2');
            expect(updatedChunk.textDraft).toContain('authentication');
            expect(updatedChunk.confidence).toBe('High'); // Upgraded from Medium
        });
        it('should NOT polish High-confidence chunks', async () => {
            const completionsSpy = vi.spyOn(mockGateway, 'completions');
            const orchestrator = new Orchestrator({
                projectRoot: testDir,
                llm: 'on',
                llmGateway: mockGateway,
                knowledgeBase: kb,
                snapshotEnabled: false
            });
            // Setup: High confidence chunk
            const entity = createEntity({
                kind: 'function',
                name: 'validateEmail',
                path: 'src/validators.ts'
            });
            kb.insertEntity(entity);
            const factSetId = kb.insertFactSet({
                id: 'fs-3',
                facts: [
                    { subjectId: entity.id, predicate: 'validates', object: 'email' }
                ],
                sources: [{ kind: 'ast', file: 'src/validators.ts' }],
                evidenceScore: 95
            });
            const chunk = {
                id: 'chunk-3',
                targetEntityId: entity.id,
                textDraft: 'Validates email address format using regex pattern. Returns true if valid.',
                factSetIds: [factSetId],
                confidence: 'High'
            };
            kb.insertChunk(chunk);
            await orchestrator.runPolishing();
            expect(completionsSpy).not.toHaveBeenCalled();
        });
        it('should NOT polish Medium-confidence chunks without "intent unclear"', async () => {
            const completionsSpy = vi.spyOn(mockGateway, 'completions');
            const orchestrator = new Orchestrator({
                projectRoot: testDir,
                llm: 'on',
                llmGateway: mockGateway,
                knowledgeBase: kb,
                snapshotEnabled: false
            });
            // Setup: Medium confidence WITHOUT "intent unclear"
            const entity = createEntity({
                kind: 'function',
                name: 'formatDate',
                path: 'src/utils.ts'
            });
            kb.insertEntity(entity);
            const factSetId = kb.insertFactSet({
                id: 'fs-4',
                facts: [
                    { subjectId: entity.id, predicate: 'formats', object: 'date' }
                ],
                sources: [{ kind: 'ast', file: 'src/utils.ts' }],
                evidenceScore: 70
            });
            const chunk = {
                id: 'chunk-4',
                targetEntityId: entity.id,
                textDraft: 'Formats date objects into ISO 8601 string representation.',
                factSetIds: [factSetId],
                confidence: 'Medium'
            };
            kb.insertChunk(chunk);
            await orchestrator.runPolishing();
            expect(completionsSpy).not.toHaveBeenCalled();
        });
    });
    describe('LLM disabled behavior', () => {
        it('should skip polishing when llm=off', async () => {
            const completionsSpy = vi.spyOn(mockGateway, 'completions');
            const orchestrator = new Orchestrator({
                projectRoot: testDir,
                llm: 'off', // LLM disabled
                llmGateway: mockGateway,
                knowledgeBase: kb,
                snapshotEnabled: false
            });
            // Setup: Low confidence chunk
            const entity = createEntity({
                kind: 'constant',
                name: 'FOO',
                path: 'test.ts'
            });
            kb.insertEntity(entity);
            const factSetId = kb.insertFactSet({
                id: 'fs-5',
                facts: [{ subjectId: entity.id, predicate: 'has-value', object: 42 }],
                sources: [{ kind: 'ast', file: 'test.ts' }],
                evidenceScore: 80
            });
            kb.insertChunk({
                id: 'chunk-5',
                targetEntityId: entity.id,
                textDraft: 'Constant FOO (intent unclear)',
                factSetIds: [factSetId],
                confidence: 'Low'
            });
            await orchestrator.runPolishing();
            expect(completionsSpy).not.toHaveBeenCalled();
        });
        it('should skip polishing when no gateway provided', async () => {
            const orchestrator = new Orchestrator({
                projectRoot: testDir,
                llm: 'on',
                llmGateway: undefined, // No gateway
                knowledgeBase: kb,
                snapshotEnabled: false
            });
            // Setup: Low confidence chunk
            const entity = createEntity({
                kind: 'constant',
                name: 'BAR',
                path: 'test.ts'
            });
            kb.insertEntity(entity);
            const factSetId = kb.insertFactSet({
                id: 'fs-6',
                facts: [{ subjectId: entity.id, predicate: 'has-value', object: 'test' }],
                sources: [{ kind: 'ast', file: 'test.ts' }],
                evidenceScore: 75
            });
            kb.insertChunk({
                id: 'chunk-6',
                targetEntityId: entity.id,
                textDraft: 'Constant BAR (intent unclear)',
                factSetIds: [factSetId],
                confidence: 'Low'
            });
            // Should not throw
            await expect(orchestrator.runPolishing()).resolves.not.toThrow();
        });
    });
    describe('error handling', () => {
        it('should continue polishing other chunks if one fails', async () => {
            let callCount = 0;
            vi.spyOn(mockGateway, 'completions').mockImplementation(async () => {
                callCount++;
                if (callCount === 1) {
                    throw new Error('API timeout');
                }
                return 'Polished successfully';
            });
            const orchestrator = new Orchestrator({
                projectRoot: testDir,
                llm: 'on',
                llmGateway: mockGateway,
                knowledgeBase: kb,
                snapshotEnabled: false
            });
            // Setup: Two Low-confidence chunks
            for (let i = 0; i < 2; i++) {
                const entity = createEntity({
                    kind: 'constant',
                    name: `VAR_${i}`,
                    path: 'test.ts'
                });
                kb.insertEntity(entity);
                const factSetId = kb.insertFactSet({
                    id: `fs-err-${i}`,
                    facts: [{ subjectId: entity.id, predicate: 'has-value', object: i }],
                    sources: [{ kind: 'ast', file: 'test.ts' }],
                    evidenceScore: 80
                });
                kb.insertChunk({
                    id: `chunk-err-${i}`,
                    targetEntityId: entity.id,
                    textDraft: `Constant VAR_${i} (intent unclear)`,
                    factSetIds: [factSetId],
                    confidence: 'Low'
                });
            }
            // Should not throw, should continue
            await expect(orchestrator.runPolishing()).resolves.not.toThrow();
            // Second chunk should be polished
            const chunk1 = kb.getChunk('chunk-err-1');
            expect(chunk1.textDraft).toContain('Polished successfully');
        });
    });
});
//# sourceMappingURL=polishing-phase.test.js.map