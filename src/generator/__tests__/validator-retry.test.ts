import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpecGenerator, type GeneratorOptions } from '../spec-generator';
import { KnowledgeBase } from '../../kb/knowledge-base';
import { LLMGateway } from '../../llm/gateway';
import { BudgetTracker } from '../../llm/budget';
import { MockValidator } from '../../validation/mock-validator';
import type { Entity, FactSet } from '../../kb/models';

describe('Validator Retry Integration (Phase 4 WS-F2 Stage E)', () => {
  let kb: KnowledgeBase;
  let mockGateway: LLMGateway;
  let mockValidator: MockValidator;
  let budgetTracker: BudgetTracker;

  beforeEach(() => {
    kb = new KnowledgeBase();

    // Create mock LLM Gateway with call tracking
    mockGateway = {
      summarize: vi.fn().mockResolvedValue('LLM polished text'),
      getUsage: vi.fn().mockReturnValue({ total: 0, byProvider: {} }),
    } as any;

    // Create mock validator
    mockValidator = new MockValidator();
    vi.spyOn(mockValidator, 'validate');

    // Create budget tracker
    budgetTracker = new BudgetTracker(100000);

    // Add test entity
    const entity: Entity = {
      id: 'test-func',
      kind: 'function',
      name: 'testFunction',
      exported: true,
      path: 'src/test.ts',
      packageId: undefined,
    };
    kb.insertEntity(entity);

    // Add factSet for entity
    const factSet: FactSet = {
      id: 'fs-1',
      facts: [
        { subjectId: 'test-func', predicate: 'has-purpose', object: 'Test purpose' },
      ],
      sources: [],
      evidenceScore: 70,
    };
    kb.insertFactSet(factSet);
  });

  describe('Accept flow', () => {
    it('should use LLM draft when validator accepts on first attempt', async () => {
      mockValidator.setNextResult({ status: 'accept', diagnostics: [] });

      const options: GeneratorOptions = {
        llmEnabled: true,
        llmGateway: mockGateway,
        validator: mockValidator,
        budgetTracker,
      };

      const generator = new SpecGenerator(kb, undefined, options);
      const result = await generator.generateDirectorySpecsAsync('.');

      // Should contain LLM text
      expect(result['src/spec.md']).toContain('LLM polished text');

      // Should have called summarize exactly once (no retries)
      expect(mockGateway.summarize).toHaveBeenCalledTimes(1);

      // Metrics should show LLM polish success
      const metrics = generator.getMetrics();
      expect(metrics.llmPolished).toBe(1);
      expect(metrics.templateFallback).toBe(0);
    });

    it('should increment llmPolished counter on accept', async () => {
      mockValidator.setNextResult({ status: 'accept', diagnostics: [] });

      const options: GeneratorOptions = {
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
  });

  describe('Retry flow', () => {
    it('should transition O → R1 on first retry', async () => {
      // First call: retry, second call: accept
      let callCount = 0;
      vi.spyOn(mockValidator, 'validate').mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { status: 'retry', diagnostics: [{ chunkId: 'chunk-test-func', rule: 'entity', reason: 'test' }] };
        }
        return { status: 'accept', diagnostics: [] };
      });

      const options: GeneratorOptions = {
        llmEnabled: true,
        llmGateway: mockGateway,
        validator: mockValidator,
        budgetTracker,
      };

      const generator = new SpecGenerator(kb, undefined, options);
      await generator.generateDirectorySpecsAsync('.');

      // Should have called summarize twice (O, then R1)
      expect(mockGateway.summarize).toHaveBeenCalledTimes(2);

      // First call should use O prompt
      const [, , options1] = (mockGateway.summarize as any).mock.calls[0];
      expect(options1).toHaveProperty('promptKey', 'O');

      // Second call should use R1 prompt
      const [, , options2] = (mockGateway.summarize as any).mock.calls[1];
      expect(options2).toHaveProperty('promptKey', 'R1');
    });

    it('should transition R1 → R2 on second retry', async () => {
      // Three calls: retry, retry, accept
      let callCount = 0;
      vi.spyOn(mockValidator, 'validate').mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return { status: 'retry', diagnostics: [{ chunkId: 'chunk-test-func', rule: 'entity', reason: 'test' }] };
        }
        return { status: 'accept', diagnostics: [] };
      });

      const options: GeneratorOptions = {
        llmEnabled: true,
        llmGateway: mockGateway,
        validator: mockValidator,
        budgetTracker,
      };

      const generator = new SpecGenerator(kb, undefined, options);
      await generator.generateDirectorySpecsAsync('.');

      // Should have called summarize 3 times (O, R1, R2)
      expect(mockGateway.summarize).toHaveBeenCalledTimes(3);

      // Verify prompt transitions
      const calls = (mockGateway.summarize as any).mock.calls;
      expect(calls[0][2]).toHaveProperty('promptKey', 'O');
      expect(calls[1][2]).toHaveProperty('promptKey', 'R1');
      expect(calls[2][2]).toHaveProperty('promptKey', 'R2');
    });

    it('should use stricter prompts on retry', async () => {
      let callCount = 0;
      vi.spyOn(mockValidator, 'validate').mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return { status: 'retry', diagnostics: [{ chunkId: 'chunk-test-func', rule: 'entity', reason: 'test' }] };
        }
        return { status: 'accept', diagnostics: [] };
      });

      const options: GeneratorOptions = {
        llmEnabled: true,
        llmGateway: mockGateway,
        validator: mockValidator,
        budgetTracker,
      };

      const generator = new SpecGenerator(kb, undefined, options);
      await generator.generateDirectorySpecsAsync('.');

      // Each retry should use a progressively stricter prompt
      const calls = (mockGateway.summarize as any).mock.calls;
      expect(calls.length).toBe(3);
      expect(calls[0][2].promptKey).toBe('O');
      expect(calls[1][2].promptKey).toBe('R1');
      expect(calls[2][2].promptKey).toBe('R2');
    });
  });

  describe('Fallback flow', () => {
    it('should use template when validator returns fallback immediately', async () => {
      mockValidator.setNextResult({
        status: 'fallback',
        diagnostics: [{ chunkId: 'chunk-test-func', rule: 'entity', reason: 'unrecoverable' }],
      });

      const options: GeneratorOptions = {
        llmEnabled: true,
        llmGateway: mockGateway,
        validator: mockValidator,
        budgetTracker,
      };

      const generator = new SpecGenerator(kb, undefined, options);
      const result = await generator.generateDirectorySpecsAsync('.');

      // Should use template, not LLM text
      expect(result['src/spec.md']).not.toContain('LLM polished text');
      expect(result['src/spec.md']).toContain('testFunction');

      // Should have called summarize once (got fallback, stopped)
      expect(mockGateway.summarize).toHaveBeenCalledTimes(1);

      const metrics = generator.getMetrics();
      expect(metrics.templateFallback).toBe(1);
      expect(metrics.llmPolished).toBe(0);
    });

    it('should use template after max retries (R2 failure)', async () => {
      // Always return retry (force max retries)
      mockValidator.setNextResult({
        status: 'retry',
        diagnostics: [{ chunkId: 'chunk-test-func', rule: 'entity', reason: 'persistent' }],
      });

      const options: GeneratorOptions = {
        llmEnabled: true,
        llmGateway: mockGateway,
        validator: mockValidator,
        budgetTracker,
      };

      const generator = new SpecGenerator(kb, undefined, options);
      const result = await generator.generateDirectorySpecsAsync('.');

      // Should have tried 3 times (O, R1, R2), then fallen back to template
      expect(mockGateway.summarize).toHaveBeenCalledTimes(3);

      // Should use template after exhausting retries
      expect(result['src/spec.md']).not.toContain('LLM polished text');

      const metrics = generator.getMetrics();
      expect(metrics.templateFallback).toBe(1);
      expect(metrics.llmPolished).toBe(0);
    });

    it('should increment templateFallback counter on fallback', async () => {
      mockValidator.setNextResult({
        status: 'fallback',
        diagnostics: [{ chunkId: 'chunk-test-func', rule: 'entity', reason: 'unrecoverable' }],
      });

      const options: GeneratorOptions = {
        llmEnabled: true,
        llmGateway: mockGateway,
        validator: mockValidator,
        budgetTracker,
      };

      const generator = new SpecGenerator(kb, undefined, options);
      await generator.generateDirectorySpecsAsync('.');

      const metrics = generator.getMetrics();
      expect(metrics.templateFallback).toBe(1);
    });

    it('should log warning with reason on fallback', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockValidator.setNextResult({
        status: 'fallback',
        diagnostics: [{ chunkId: 'chunk-test-func', rule: 'entity', reason: 'test reason' }],
      });

      const options: GeneratorOptions = {
        llmEnabled: true,
        llmGateway: mockGateway,
        validator: mockValidator,
        budgetTracker,
      };

      const generator = new SpecGenerator(kb, undefined, options);
      await generator.generateDirectorySpecsAsync('.');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Validation')
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('FactSetId preservation', () => {
    it('should maintain factSetIds through retry cycles', async () => {
      let callCount = 0;
      vi.spyOn(mockValidator, 'validate').mockImplementation((_draft, factSetIds) => {
        callCount++;
        // Verify factSetIds are passed on every retry
        expect(factSetIds).toEqual(['fs-1']);

        if (callCount <= 2) {
          return { status: 'retry', diagnostics: [{ chunkId: 'chunk-test-func', rule: 'entity', reason: 'test' }] };
        }
        return { status: 'accept', diagnostics: [] };
      });

      const options: GeneratorOptions = {
        llmEnabled: true,
        llmGateway: mockGateway,
        validator: mockValidator,
        budgetTracker,
      };

      const generator = new SpecGenerator(kb, undefined, options);
      await generator.generateDirectorySpecsAsync('.');

      // Validator should have been called 3 times with same factSetIds
      expect(mockValidator.validate).toHaveBeenCalledTimes(3);
    });
  });
});
