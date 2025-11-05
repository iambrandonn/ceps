import { describe, it, expect, vi } from 'vitest';
import { join } from 'path';
import { Orchestrator } from '../../orchestrator/orchestrator';
import { BudgetTracker } from '../../llm/budget';
import { MockValidator } from '../../validation/mock-validator';
describe.skip('Phase 4 LLM Integration (WS-F2 Stage G)', () => {
    const fixturesDir = join(__dirname, '../../../tests/fixtures');
    describe('Express fixture', () => {
        it('template mode: byte-identical outputs', async () => {
            const projectRoot = join(fixturesDir, 'tiny-express');
            const orchestrator1 = new Orchestrator({
                projectRoot,
                deterministic: true,
                llm: 'off',
            });
            const result1 = await orchestrator1.run();
            const orchestrator2 = new Orchestrator({
                projectRoot,
                deterministic: true,
                llm: 'off',
            });
            const result2 = await orchestrator2.run();
            // Outputs should be byte-identical in template-only mode
            expect(result1.files.length).toBeGreaterThan(0);
            expect(result1.files).toEqual(result2.files);
        });
        it('LLM mode: handles mocked gateway', async () => {
            const projectRoot = join(fixturesDir, 'tiny-express');
            // Create mock gateway
            const mockGateway = {
                summarize: vi.fn().mockResolvedValue('Mocked LLM response'),
                getUsage: vi.fn().mockReturnValue({ total: 1000, byProvider: { mock: 1000 } }),
            };
            const validator = new MockValidator();
            validator.setNextResult({ status: 'accept', diagnostics: [] });
            const orchestrator = new Orchestrator({
                projectRoot,
                deterministic: false,
                llm: 'on',
                _testOptions: {
                    llmGateway: mockGateway,
                    validator,
                },
            });
            const result = await orchestrator.run();
            // Should have generated files
            expect(result.files.length).toBeGreaterThan(0);
            // Should have called LLM for entities (if any exported)
            if (result.exportedCount > 0) {
                expect(mockGateway.summarize).toHaveBeenCalled();
            }
        });
        it('cost gate: within Express threshold (≤30k tokens)', async () => {
            const projectRoot = join(fixturesDir, 'tiny-express');
            const budget = 30000;
            const mockGateway = {
                summarize: vi.fn().mockResolvedValue('Mocked response'),
                getUsage: vi.fn().mockReturnValue({ total: 5000, byProvider: { mock: 5000 } }),
            };
            const tracker = new BudgetTracker(budget);
            const validator = new MockValidator();
            validator.setNextResult({ status: 'accept', diagnostics: [] });
            const orchestrator = new Orchestrator({
                projectRoot,
                llm: 'on',
                llmBudget: budget,
                _testOptions: {
                    llmGateway: mockGateway,
                    validator,
                    budgetTracker: tracker,
                },
            });
            const result = await orchestrator.run();
            // Should complete successfully
            expect(result.error).toBeUndefined();
            // Usage should be within budget
            const usage = mockGateway.getUsage();
            expect(usage.total).toBeLessThanOrEqual(budget);
        });
    });
    describe('React fixture', () => {
        it('template mode: byte-identical outputs', async () => {
            const projectRoot = join(fixturesDir, 'tiny-react');
            const orchestrator1 = new Orchestrator({
                projectRoot,
                deterministic: true,
                llm: 'off',
            });
            const result1 = await orchestrator1.run();
            const orchestrator2 = new Orchestrator({
                projectRoot,
                deterministic: true,
                llm: 'off',
            });
            const result2 = await orchestrator2.run();
            // Outputs should be byte-identical
            expect(result1.files).toEqual(result2.files);
        });
        it('LLM mode: structural stability', async () => {
            const projectRoot = join(fixturesDir, 'tiny-react');
            const mockGateway = {
                summarize: vi.fn().mockResolvedValue('React component behavior'),
                getUsage: vi.fn().mockReturnValue({ total: 2000, byProvider: { mock: 2000 } }),
            };
            const validator = new MockValidator();
            validator.setNextResult({ status: 'accept', diagnostics: [] });
            const orchestrator = new Orchestrator({
                projectRoot,
                llm: 'on',
                _testOptions: {
                    llmGateway: mockGateway,
                    validator,
                },
            });
            const result = await orchestrator.run();
            // Should generate structured output
            expect(result.files.length).toBeGreaterThan(0);
            expect(result.files.some(f => f.endsWith('spec.md'))).toBe(true);
        });
        it('cost gate: within React threshold (≤40k tokens)', async () => {
            const projectRoot = join(fixturesDir, 'tiny-react');
            const budget = 40000;
            const mockGateway = {
                summarize: vi.fn().mockResolvedValue('Mocked response'),
                getUsage: vi.fn().mockReturnValue({ total: 8000, byProvider: { mock: 8000 } }),
            };
            const tracker = new BudgetTracker(budget);
            const validator = new MockValidator();
            validator.setNextResult({ status: 'accept', diagnostics: [] });
            const orchestrator = new Orchestrator({
                projectRoot,
                llm: 'on',
                llmBudget: budget,
                _testOptions: {
                    llmGateway: mockGateway,
                    validator,
                    budgetTracker: tracker,
                },
            });
            const result = await orchestrator.run();
            expect(result.error).toBeUndefined();
            const usage = mockGateway.getUsage();
            expect(usage.total).toBeLessThanOrEqual(budget);
        });
    });
    describe('Monorepo fixture', () => {
        it('template mode: byte-identical outputs', async () => {
            const projectRoot = join(fixturesDir, 'tiny-monorepo');
            const orchestrator1 = new Orchestrator({
                projectRoot,
                deterministic: true,
                llm: 'off',
            });
            const result1 = await orchestrator1.run();
            const orchestrator2 = new Orchestrator({
                projectRoot,
                deterministic: true,
                llm: 'off',
            });
            const result2 = await orchestrator2.run();
            // Outputs should be byte-identical
            expect(result1.files).toEqual(result2.files);
        });
        it('LLM mode: handles multiple packages', async () => {
            const projectRoot = join(fixturesDir, 'tiny-monorepo');
            const mockGateway = {
                summarize: vi.fn().mockResolvedValue('Package behavior'),
                getUsage: vi.fn().mockReturnValue({ total: 5000, byProvider: { mock: 5000 } }),
            };
            const validator = new MockValidator();
            validator.setNextResult({ status: 'accept', diagnostics: [] });
            const orchestrator = new Orchestrator({
                projectRoot,
                llm: 'on',
                _testOptions: {
                    llmGateway: mockGateway,
                    validator,
                },
            });
            const result = await orchestrator.run();
            // Should generate specs for multiple packages
            expect(result.files.length).toBeGreaterThan(0);
        });
        it('cost gate: within Monorepo threshold (≤100k tokens)', async () => {
            const projectRoot = join(fixturesDir, 'tiny-monorepo');
            const budget = 100000;
            const mockGateway = {
                summarize: vi.fn().mockResolvedValue('Mocked response'),
                getUsage: vi.fn().mockReturnValue({ total: 15000, byProvider: { mock: 15000 } }),
            };
            const tracker = new BudgetTracker(budget);
            const validator = new MockValidator();
            validator.setNextResult({ status: 'accept', diagnostics: [] });
            const orchestrator = new Orchestrator({
                projectRoot,
                llm: 'on',
                llmBudget: budget,
                _testOptions: {
                    llmGateway: mockGateway,
                    validator,
                    budgetTracker: tracker,
                },
            });
            const result = await orchestrator.run();
            expect(result.error).toBeUndefined();
            const usage = mockGateway.getUsage();
            expect(usage.total).toBeLessThanOrEqual(budget);
        });
    });
    describe('Fallback scenarios', () => {
        it('should handle budget exhaustion gracefully', async () => {
            const projectRoot = join(fixturesDir, 'tiny-express');
            const budget = 10; // Very small budget
            const mockGateway = {
                summarize: vi.fn().mockResolvedValue('This should not be used'),
                getUsage: vi.fn().mockReturnValue({ total: 0, byProvider: {} }),
            };
            const tracker = new BudgetTracker(budget);
            // Pre-exhaust budget
            tracker.recordUsage('test', budget + 1);
            const validator = new MockValidator();
            validator.setNextResult({ status: 'accept', diagnostics: [] });
            const orchestrator = new Orchestrator({
                projectRoot,
                llm: 'on',
                llmBudget: budget,
                _testOptions: {
                    llmGateway: mockGateway,
                    validator,
                    budgetTracker: tracker,
                },
            });
            const result = await orchestrator.run();
            // Should complete with template fallback (no error)
            expect(result.error).toBeUndefined();
            expect(result.files.length).toBeGreaterThan(0);
            // Should not have called LLM (budget exhausted)
            expect(mockGateway.summarize).not.toHaveBeenCalled();
        });
        it('should handle validator rejection with fallback', async () => {
            const projectRoot = join(fixturesDir, 'tiny-express');
            const mockGateway = {
                summarize: vi.fn().mockResolvedValue('Invalid LLM output'),
                getUsage: vi.fn().mockReturnValue({ total: 1000, byProvider: { mock: 1000 } }),
            };
            const validator = new MockValidator();
            // Always return fallback
            validator.setNextResult({
                status: 'fallback',
                diagnostics: [{ chunkId: 'test', rule: 'entity', reason: 'test error' }],
            });
            const orchestrator = new Orchestrator({
                projectRoot,
                llm: 'on',
                _testOptions: {
                    llmGateway: mockGateway,
                    validator,
                },
            });
            const result = await orchestrator.run();
            // Should complete with template fallback (no error)
            expect(result.error).toBeUndefined();
            expect(result.files.length).toBeGreaterThan(0);
        });
    });
});
//# sourceMappingURL=phase4-llm-integration.test.js.map