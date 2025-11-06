import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpecGenerator } from '../spec-generator';
import { KnowledgeBase } from '../../kb/knowledge-base';
import { BudgetTracker } from '../../llm/budget';
import { MockValidator } from '../../validation/mock-validator';
describe('Generator LLM Orchestration (Phase 4 WS-F2 Stage D)', () => {
    let kb;
    let mockGateway;
    let mockValidator;
    let budgetTracker;
    beforeEach(() => {
        kb = new KnowledgeBase();
        // Create mock LLM Gateway
        mockGateway = {
            summarize: vi.fn().mockResolvedValue('LLM polished text'),
            getUsage: vi.fn().mockReturnValue({ total: 0, byProvider: {} }),
        };
        // Create mock validator that accepts by default
        mockValidator = new MockValidator();
        mockValidator.setNextResult({
            status: 'accept',
            diagnostics: [],
        });
        // Spy on validate method
        vi.spyOn(mockValidator, 'validate');
        // Create budget tracker
        budgetTracker = new BudgetTracker(100000);
        // Add test entity to KB
        const entity = {
            id: 'test-func',
            kind: 'function',
            name: 'testFunction',
            exported: true,
            path: 'src/test.ts',
            packageId: undefined,
        };
        kb.insertEntity(entity);
        // Add factSet for entity
        const factSet = {
            id: 'fs-1',
            facts: [
                { subjectId: 'test-func', predicate: 'has-purpose', object: 'Test purpose' },
            ],
            sources: [],
            evidenceScore: 70,
        };
        kb.insertFactSet(factSet);
    });
    describe('--llm off mode', () => {
        it('should generate byte-identical outputs with --deterministic', () => {
            const options = {
                llmEnabled: false,
                deterministicMode: true,
            };
            const generator = new SpecGenerator(kb, undefined, options);
            const result1 = generator.generateDirectorySpecs('.');
            const result2 = generator.generateDirectorySpecs('.');
            expect(result1).toEqual(result2);
        });
        it('should never call LLM gateway when llmEnabled is false', () => {
            const options = {
                llmEnabled: false,
                llmGateway: mockGateway,
            };
            const generator = new SpecGenerator(kb, undefined, options);
            generator.generateDirectorySpecs('.');
            expect(mockGateway.summarize).not.toHaveBeenCalled();
        });
        it('should produce template output when LLM is disabled', () => {
            const options = {
                llmEnabled: false,
            };
            const generator = new SpecGenerator(kb, undefined, options);
            const result = generator.generateDirectorySpecs('.');
            // Should contain entity name in template format
            expect(result['src/spec.md']).toContain('testFunction');
        });
    });
    describe('--llm on mode', () => {
        it('should call applyLLMPolish for each entity when enabled', async () => {
            const options = {
                llmEnabled: true,
                llmGateway: mockGateway,
                validator: mockValidator,
                budgetTracker,
            };
            const generator = new SpecGenerator(kb, undefined, options);
            await generator.generateDirectorySpecsAsync('.');
            // Should have called summarize for the entity
            expect(mockGateway.summarize).toHaveBeenCalled();
        });
        it('should preserve factSetIds through polish', async () => {
            const options = {
                llmEnabled: true,
                llmGateway: mockGateway,
                validator: mockValidator,
                budgetTracker,
            };
            const generator = new SpecGenerator(kb, undefined, options);
            await generator.generateDirectorySpecsAsync('.');
            // Verify summarize was called with factSets
            const calls = mockGateway.summarize.mock.calls;
            expect(calls.length).toBeGreaterThan(0);
            const [factSets] = calls[0];
            expect(Array.isArray(factSets)).toBe(true);
            expect(factSets.length).toBeGreaterThan(0);
            expect(factSets[0]).toHaveProperty('id');
        });
        it('should use LLM polished text in output', async () => {
            mockGateway.summarize.mockResolvedValue('Custom LLM output for testing');
            const options = {
                llmEnabled: true,
                llmGateway: mockGateway,
                validator: mockValidator,
                budgetTracker,
            };
            const generator = new SpecGenerator(kb, undefined, options);
            const result = await generator.generateDirectorySpecsAsync('.');
            // Should contain LLM text instead of pure template
            expect(result['src/spec.md']).toContain('Custom LLM output for testing');
        });
    });
    describe('--llm on --deterministic mode', () => {
        it('should maintain structural stability (factSetIds present)', async () => {
            const options = {
                llmEnabled: true,
                deterministicMode: true,
                llmGateway: mockGateway,
                validator: mockValidator,
                budgetTracker,
            };
            const generator = new SpecGenerator(kb, undefined, options);
            const result = await generator.generateDirectorySpecsAsync('.');
            // Structural elements should be present
            expect(result['src/spec.md']).toBeDefined();
            expect(result['src/spec.md'].length).toBeGreaterThan(0);
        });
        it('should set temperature=0 when deterministic', async () => {
            const options = {
                llmEnabled: true,
                deterministicMode: true,
                llmGateway: mockGateway,
                validator: mockValidator,
                budgetTracker,
            };
            const generator = new SpecGenerator(kb, undefined, options);
            await generator.generateDirectorySpecsAsync('.');
            // Verify summarize was called with deterministic option
            const calls = mockGateway.summarize.mock.calls;
            expect(calls.length).toBeGreaterThan(0);
            const [, , options_arg] = calls[0];
            expect(options_arg).toHaveProperty('deterministic', true);
        });
    });
    describe('Budget exhaustion', () => {
        it('should fall back to template when budget exhausted', async () => {
            // Create budget tracker with very small limit
            const smallBudget = new BudgetTracker(10);
            // Exhaust budget
            smallBudget.recordUsage('chunk', 15, 0, 0, 0);
            const options = {
                llmEnabled: true,
                llmGateway: mockGateway,
                validator: mockValidator,
                budgetTracker: smallBudget,
            };
            const generator = new SpecGenerator(kb, undefined, options);
            const result = await generator.generateDirectorySpecsAsync('.');
            // Should still produce output (template fallback)
            expect(result['src/spec.md']).toBeDefined();
            // Should NOT have called LLM (budget exhausted)
            expect(mockGateway.summarize).not.toHaveBeenCalled();
        });
        it('should log warning on fallback', async () => {
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
            const smallBudget = new BudgetTracker(10);
            smallBudget.recordUsage('chunk', 15, 0, 0, 0);
            const options = {
                llmEnabled: true,
                llmGateway: mockGateway,
                validator: mockValidator,
                budgetTracker: smallBudget,
            };
            const generator = new SpecGenerator(kb, undefined, options);
            await generator.generateDirectorySpecsAsync('.');
            // Should have logged warning about budget exhaustion
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Budget exhausted'));
            consoleWarnSpy.mockRestore();
        });
        it('should increment templateFallback counter on budget exhaustion', async () => {
            const smallBudget = new BudgetTracker(10);
            smallBudget.recordUsage('chunk', 15, 0, 0, 0);
            const options = {
                llmEnabled: true,
                llmGateway: mockGateway,
                validator: mockValidator,
                budgetTracker: smallBudget,
            };
            const generator = new SpecGenerator(kb, undefined, options);
            await generator.generateDirectorySpecsAsync('.');
            const metrics = generator.getMetrics();
            expect(metrics.templateFallback).toBeGreaterThan(0);
        });
    });
    describe('Chunk metadata', () => {
        it('should track chunkId in metadata', async () => {
            const options = {
                llmEnabled: true,
                llmGateway: mockGateway,
                validator: mockValidator,
                budgetTracker,
            };
            const generator = new SpecGenerator(kb, undefined, options);
            await generator.generateDirectorySpecsAsync('.');
            const metrics = generator.getMetrics();
            expect(metrics).toHaveProperty('llmPolished');
            expect(metrics).toHaveProperty('templateFallback');
        });
        it('should track targetEntityId in metadata', async () => {
            const options = {
                llmEnabled: true,
                llmGateway: mockGateway,
                validator: mockValidator,
                budgetTracker,
            };
            const generator = new SpecGenerator(kb, undefined, options);
            await generator.generateDirectorySpecsAsync('.');
            // Verify validator was called with correct metadata
            const validateCalls = mockValidator.validate.mock.calls;
            if (validateCalls.length > 0) {
                const [, , metadata] = validateCalls[0];
                expect(metadata).toHaveProperty('targetEntityId');
                expect(metadata.targetEntityId).toBe('test-func');
            }
        });
        it('should track factSetIds in metadata', async () => {
            const options = {
                llmEnabled: true,
                llmGateway: mockGateway,
                validator: mockValidator,
                budgetTracker,
            };
            const generator = new SpecGenerator(kb, undefined, options);
            await generator.generateDirectorySpecsAsync('.');
            // Verify validator was called with factSetIds
            const validateCalls = mockValidator.validate.mock.calls;
            if (validateCalls.length > 0) {
                const [, factSetIds] = validateCalls[0];
                expect(Array.isArray(factSetIds)).toBe(true);
                expect(factSetIds).toContain('fs-1');
            }
        });
        it('should track confidence in metadata', async () => {
            const options = {
                llmEnabled: true,
                llmGateway: mockGateway,
                validator: mockValidator,
                budgetTracker,
            };
            const generator = new SpecGenerator(kb, undefined, options);
            await generator.generateDirectorySpecsAsync('.');
            // Verify validator was called with confidence
            const validateCalls = mockValidator.validate.mock.calls;
            if (validateCalls.length > 0) {
                const [, , metadata] = validateCalls[0];
                expect(metadata).toHaveProperty('confidence');
                expect(['High', 'Medium', 'Low']).toContain(metadata.confidence);
            }
        });
    });
    describe('Metrics tracking', () => {
        it('should increment llmPolished counter when polish succeeds', async () => {
            const options = {
                llmEnabled: true,
                llmGateway: mockGateway,
                validator: mockValidator,
                budgetTracker,
            };
            const generator = new SpecGenerator(kb, undefined, options);
            await generator.generateDirectorySpecsAsync('.');
            const metrics = generator.getMetrics();
            expect(metrics.llmPolished).toBe(1);
        });
        it('should provide getMetrics() accessor', () => {
            const options = {
                llmEnabled: false,
            };
            const generator = new SpecGenerator(kb, undefined, options);
            const metrics = generator.getMetrics();
            expect(metrics).toHaveProperty('llmPolished');
            expect(metrics).toHaveProperty('templateFallback');
            expect(metrics).toHaveProperty('budgetExhausted');
            expect(metrics).toHaveProperty('warnings');
        });
    });
});
//# sourceMappingURL=llm-orchestration.test.js.map