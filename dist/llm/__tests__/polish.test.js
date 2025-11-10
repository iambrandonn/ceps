/**
 * Phase 6 Quality Improvement: Polish Method Tests
 *
 * Verifies that LLMGateway.polish() correctly enhances low-confidence chunks
 * using LLM assistance while staying grounded in facts.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMGateway } from '../gateway.js';
describe('LLMGateway.polish()', () => {
    let gateway;
    beforeEach(() => {
        // Initialize gateway with mock API key
        gateway = new LLMGateway({
            anthropicApiKey: 'test-key',
            budgetTokens: 100000,
        });
    });
    describe('interface contract', () => {
        it('should accept draftText, entity, and factSets', async () => {
            // Mock completions to avoid real API call
            vi.spyOn(gateway, 'completions').mockResolvedValue('Builds and returns a memoized cache object for performance optimization.');
            const draftText = 'Function buildCache (intent unclear from static analysis)';
            const entity = {
                id: 'e-1',
                kind: 'function',
                name: 'buildCache',
                path: 'src/utils/cache.ts'
            };
            const factSets = [
                {
                    id: 'fs-1',
                    facts: [
                        { subjectId: 'e-1', predicate: 'has-type', object: 'function' },
                        { subjectId: 'e-1', predicate: 'has-name', object: 'buildCache' }
                    ],
                    sources: [{ kind: 'ast', file: 'src/utils/cache.ts' }],
                    evidenceScore: 90
                }
            ];
            const result = await gateway.polish(draftText, entity, factSets);
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });
        it('should generate prompt with entity context', async () => {
            const completionsSpy = vi.spyOn(gateway, 'completions').mockResolvedValue('Polished description');
            const draftText = 'Constant FOO (intent unclear from static analysis)';
            const entity = {
                id: 'e-2',
                kind: 'constant',
                name: 'FOO',
                path: 'src/config.ts'
            };
            const factSets = [
                {
                    id: 'fs-2',
                    facts: [
                        { subjectId: 'e-2', predicate: 'has-value', object: { type: 'string', value: 'bar' } }
                    ],
                    sources: [{ kind: 'ast', file: 'src/config.ts' }],
                    evidenceScore: 95
                }
            ];
            await gateway.polish(draftText, entity, factSets);
            expect(completionsSpy).toHaveBeenCalledTimes(1);
            const prompt = completionsSpy.mock.calls[0][0];
            // Verify prompt includes entity context
            expect(prompt).toContain('constant');
            expect(prompt).toContain('FOO');
            expect(prompt).toContain('src/config.ts');
            expect(prompt).toContain(draftText);
        });
        it('should include factSet evidence in prompt', async () => {
            const completionsSpy = vi.spyOn(gateway, 'completions').mockResolvedValue('Polished description');
            const factSets = [
                {
                    id: 'fs-3',
                    facts: [
                        { subjectId: 'e-3', predicate: 'returns', object: 'Promise<User>' },
                        { subjectId: 'e-3', predicate: 'calls', object: 'db.query' }
                    ],
                    sources: [{ kind: 'ast', file: 'src/user.ts' }],
                    evidenceScore: 85
                }
            ];
            await gateway.polish('Function getUser (intent unclear)', { id: 'e-3', kind: 'function', name: 'getUser', path: 'src/user.ts' }, factSets);
            const prompt = completionsSpy.mock.calls[0][0];
            // Verify factSet details are in prompt
            expect(prompt).toContain('FactSet');
            expect(prompt).toContain('returns');
            expect(prompt).toContain('Promise<User>');
            expect(prompt).toContain('db.query');
        });
    });
    describe('model selection', () => {
        it('should use Haiku model for cost-efficiency', async () => {
            const completionsSpy = vi.spyOn(gateway, 'completions').mockResolvedValue('Polished text');
            await gateway.polish('Function foo', { id: 'e-4', kind: 'function', name: 'foo', path: 'test.ts' }, []);
            expect(completionsSpy).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
                model: 'claude-3-5-haiku-20241022',
                temperature: 0.3
            }));
        });
    });
    describe('budget tracking', () => {
        it('should track token usage via completions()', async () => {
            const completionsSpy = vi.spyOn(gateway, 'completions').mockResolvedValue('Polished result');
            await gateway.polish('Test draft', { id: 'e-5', kind: 'function', name: 'test', path: 'test.ts' }, []);
            // Verify completions was called (which handles budget tracking)
            expect(completionsSpy).toHaveBeenCalled();
        });
    });
    describe('prompt guidelines', () => {
        it('should include behavioral guidelines in prompt', async () => {
            const completionsSpy = vi.spyOn(gateway, 'completions').mockResolvedValue('Polished');
            await gateway.polish('Draft', { id: 'e-6', kind: 'function', name: 'test', path: 'test.ts' }, []);
            const prompt = completionsSpy.mock.calls[0][0];
            // Check for key guidelines
            expect(prompt).toContain('present tense');
            expect(prompt).toContain('active voice');
            expect(prompt).toContain('behavioral intent');
            expect(prompt).toContain('grounded');
            expect(prompt).toContain('concise');
        });
        it('should discourage "intent unclear" phrasing', async () => {
            const completionsSpy = vi.spyOn(gateway, 'completions').mockResolvedValue('Polished');
            await gateway.polish('Function with unclear intent', { id: 'e-7', kind: 'function', name: 'mystery', path: 'test.ts' }, []);
            const prompt = completionsSpy.mock.calls[0][0];
            expect(prompt).toContain('Avoid phrases like "intent unclear"');
        });
    });
    describe('error handling', () => {
        it('should propagate API errors from completions()', async () => {
            vi.spyOn(gateway, 'completions').mockRejectedValue(new Error('API rate limit exceeded'));
            await expect(gateway.polish('Draft', { id: 'e-8', kind: 'function', name: 'test', path: 'test.ts' }, [])).rejects.toThrow('API rate limit exceeded');
        });
        it('should propagate budget errors from completions()', async () => {
            vi.spyOn(gateway, 'completions').mockRejectedValue(new Error('Token budget exceeded'));
            await expect(gateway.polish('Draft', { id: 'e-9', kind: 'function', name: 'test', path: 'test.ts' }, [])).rejects.toThrow('Token budget exceeded');
        });
    });
});
//# sourceMappingURL=polish.test.js.map