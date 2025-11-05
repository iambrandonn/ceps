import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMGateway } from '../../../src/llm/gateway';

// Mock the adapters
vi.mock('../../../src/llm/adapters/anthropic', () => ({
  AnthropicAdapter: vi.fn().mockImplementation(() => ({
    completions: vi.fn(),
    getLastUsage: vi.fn(),
    countTokens: vi.fn(),
    calculateCost: vi.fn()
  }))
}));

vi.mock('../../../src/llm/adapters/openai', () => ({
  OpenAIAdapter: vi.fn().mockImplementation(() => ({
    completions: vi.fn(),
    getLastUsage: vi.fn(),
    countTokens: vi.fn(),
    calculateCost: vi.fn()
  }))
}));

describe('LLMGateway', () => {
  let gateway: LLMGateway;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with Anthropic as default provider', () => {
      gateway = new LLMGateway({
        anthropicApiKey: 'test-anthropic-key'
      });

      expect(gateway).toBeDefined();
      expect(gateway.getCurrentProvider()).toBe('anthropic');
    });

    it('should initialize with OpenAI provider', () => {
      gateway = new LLMGateway({
        openaiApiKey: 'test-openai-key',
        provider: 'openai'
      });

      expect(gateway.getCurrentProvider()).toBe('openai');
    });

    it('should throw error if no API keys provided', () => {
      expect(() => new LLMGateway({})).toThrow('At least one provider API key is required');
    });

    it('should accept custom budget', () => {
      gateway = new LLMGateway({
        anthropicApiKey: 'test-key',
        budgetTokens: 500000
      });

      expect(gateway.checkBudget()).toBe(true);
    });

    it('should enable cache by default', () => {
      gateway = new LLMGateway({
        anthropicApiKey: 'test-key'
      });

      const stats = gateway.getCacheStats();
      expect(stats).toBeDefined();
    });

    it('should support disabling cache', () => {
      gateway = new LLMGateway({
        anthropicApiKey: 'test-key',
        enableCache: false
      });

      const stats = gateway.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('completions', () => {
    beforeEach(() => {
      gateway = new LLMGateway({
        anthropicApiKey: 'test-anthropic-key',
        openaiApiKey: 'test-openai-key'
      });
    });

    it('should send prompt to current provider', async () => {
      const mockAdapter = (gateway as any).adapters['anthropic'];
      mockAdapter.completions.mockResolvedValue('This function validates input.');
      mockAdapter.getLastUsage.mockReturnValue({
        inputTokens: 50,
        outputTokens: 20,
        totalTokens: 70,
        costUSD: 0.01
      });

      const response = await gateway.completions('Explain this function');

      expect(response).toBe('This function validates input.');
      expect(mockAdapter.completions).toHaveBeenCalledWith(
        'Explain this function',
        expect.objectContaining({})
      );
    });

    it('should pass through options to adapter', async () => {
      const mockAdapter = (gateway as any).adapters['anthropic'];
      mockAdapter.completions.mockResolvedValue('Response');
      mockAdapter.getLastUsage.mockReturnValue({
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        costUSD: 0.001
      });

      await gateway.completions('Test', {
        temperature: 0.7,
        maxTokens: 1000,
        system: 'You are a helper'
      });

      expect(mockAdapter.completions).toHaveBeenCalledWith(
        'Test',
        expect.objectContaining({
          temperature: 0.7,
          maxTokens: 1000,
          system: 'You are a helper'
        })
      );
    });

    it('should use cache when enabled', async () => {
      const mockAdapter = (gateway as any).adapters['anthropic'];
      mockAdapter.completions.mockResolvedValue('Cached response');
      mockAdapter.getLastUsage.mockReturnValue({
        inputTokens: 50,
        outputTokens: 20,
        totalTokens: 70,
        costUSD: 0.01
      });

      // First call - should hit adapter
      const response1 = await gateway.completions('Test prompt');
      expect(response1).toBe('Cached response');
      expect(mockAdapter.completions).toHaveBeenCalledTimes(1);

      // Second call with same prompt - should hit cache
      const response2 = await gateway.completions('Test prompt');
      expect(response2).toBe('Cached response');
      expect(mockAdapter.completions).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should track budget usage', async () => {
      const mockAdapter = (gateway as any).adapters['anthropic'];
      mockAdapter.completions.mockResolvedValue('Response');
      mockAdapter.getLastUsage.mockReturnValue({
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        costUSD: 0.02
      });

      await gateway.completions('Test');

      const usage = gateway.getUsage();
      expect(usage.totalTokens).toBe(150);
      expect(usage.costUSD).toBeCloseTo(0.02, 2);
    });

    it('should throw error when budget exceeded', async () => {
      const limitedGateway = new LLMGateway({
        anthropicApiKey: 'test-key',
        budgetTokens: 100,
        enableCache: false
      });

      const mockAdapter = (limitedGateway as any).adapters['anthropic'];
      mockAdapter.completions.mockResolvedValue('Response');
      mockAdapter.getLastUsage.mockReturnValue({
        inputTokens: 60,
        outputTokens: 40,
        totalTokens: 100,
        costUSD: 0.01
      });

      // First call uses exactly the budget
      await limitedGateway.completions('Test 1');

      // Second call should fail - budget exceeded
      await expect(limitedGateway.completions('Test 2')).rejects.toThrow('Token budget exceeded');
    });
  });

  describe('provider switching', () => {
    beforeEach(() => {
      gateway = new LLMGateway({
        anthropicApiKey: 'test-anthropic-key',
        openaiApiKey: 'test-openai-key'
      });
    });

    it('should switch to OpenAI provider', () => {
      gateway.setProvider('openai');
      expect(gateway.getCurrentProvider()).toBe('openai');
    });

    it('should switch to Anthropic provider', () => {
      gateway.setProvider('openai');
      gateway.setProvider('anthropic');
      expect(gateway.getCurrentProvider()).toBe('anthropic');
    });

    it('should throw error for unavailable provider', () => {
      const anthropicOnly = new LLMGateway({
        anthropicApiKey: 'test-key'
      });

      expect(() => anthropicOnly.setProvider('openai')).toThrow('Provider openai is not configured');
    });

    it('should use new provider after switching', async () => {
      const anthropicAdapter = (gateway as any).adapters['anthropic'];
      const openaiAdapter = (gateway as any).adapters['openai'];

      anthropicAdapter.completions.mockResolvedValue('Anthropic response');
      openaiAdapter.completions.mockResolvedValue('OpenAI response');

      anthropicAdapter.getLastUsage.mockReturnValue({
        inputTokens: 10, outputTokens: 5, totalTokens: 15, costUSD: 0.001
      });
      openaiAdapter.getLastUsage.mockReturnValue({
        inputTokens: 10, outputTokens: 5, totalTokens: 15, costUSD: 0.002
      });

      // Use Anthropic (default)
      const response1 = await gateway.completions('Test 1');
      expect(response1).toBe('Anthropic response');
      expect(anthropicAdapter.completions).toHaveBeenCalled();

      // Switch to OpenAI
      gateway.setProvider('openai');
      const response2 = await gateway.completions('Test 2');
      expect(response2).toBe('OpenAI response');
      expect(openaiAdapter.completions).toHaveBeenCalled();
    });
  });

  describe('budget management', () => {
    it('should check budget correctly', () => {
      gateway = new LLMGateway({
        anthropicApiKey: 'test-key',
        budgetTokens: 1000
      });

      expect(gateway.checkBudget()).toBe(true);
    });

    it('should return remaining budget', () => {
      gateway = new LLMGateway({
        anthropicApiKey: 'test-key',
        budgetTokens: 1000
      });

      expect(gateway.getRemainingBudget()).toBe(1000);
    });

    it('should track usage across multiple calls', async () => {
      gateway = new LLMGateway({
        anthropicApiKey: 'test-key',
        budgetTokens: 1000,
        enableCache: false // Disable cache for this test
      });

      const mockAdapter = (gateway as any).adapters['anthropic'];
      mockAdapter.completions.mockResolvedValue('Response');

      // First call
      mockAdapter.getLastUsage.mockReturnValue({
        inputTokens: 100, outputTokens: 50, totalTokens: 150, costUSD: 0.02
      });
      await gateway.completions('Test 1');

      // Second call
      mockAdapter.getLastUsage.mockReturnValue({
        inputTokens: 200, outputTokens: 100, totalTokens: 300, costUSD: 0.04
      });
      await gateway.completions('Test 2');

      const usage = gateway.getUsage();
      expect(usage.totalTokens).toBe(450); // 150 + 300
      expect(usage.costUSD).toBeCloseTo(0.06, 2); // 0.02 + 0.04
    });
  });

  describe('cache management', () => {
    beforeEach(() => {
      gateway = new LLMGateway({
        anthropicApiKey: 'test-key'
      });
    });

    it('should return cache statistics', () => {
      const stats = gateway.getCacheStats();

      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('hitRate');
    });

    it('should clear cache', async () => {
      const mockAdapter = (gateway as any).adapters['anthropic'];
      mockAdapter.completions.mockResolvedValue('Response');
      mockAdapter.getLastUsage.mockReturnValue({
        inputTokens: 10, outputTokens: 5, totalTokens: 15, costUSD: 0.001
      });

      // Generate cached item
      await gateway.completions('Test');

      gateway.clearCache();

      const stats = gateway.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('usage statistics', () => {
    beforeEach(() => {
      gateway = new LLMGateway({
        anthropicApiKey: 'test-key'
      });
    });

    it('should return usage statistics', () => {
      const usage = gateway.getUsage();

      expect(usage).toHaveProperty('totalTokens');
      expect(usage).toHaveProperty('promptTokens');
      expect(usage).toHaveProperty('completionTokens');
      expect(usage).toHaveProperty('costUSD');
      expect(usage).toHaveProperty('byProvider');
    });

    it('should track provider-specific usage', async () => {
      const mockAdapter = (gateway as any).adapters['anthropic'];
      mockAdapter.completions.mockResolvedValue('Response');
      mockAdapter.getLastUsage.mockReturnValue({
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        costUSD: 0.02
      });

      await gateway.completions('Test');

      const usage = gateway.getUsage();
      expect(usage.byProvider).toHaveProperty('anthropic');
      expect(usage.byProvider['anthropic'].totalTokens).toBe(150);
    });
  });

  describe('prompt differentiation (Issue #1 fix)', () => {
    let testFactSets: any[];

    beforeEach(() => {
      gateway = new LLMGateway({
        anthropicApiKey: 'test-key'
      });

      testFactSets = [
        {
          id: 'fs-1',
          entityId: 'func-1',
          facts: [
            { subjectId: 'validateUser', predicate: 'has-parameter', object: 'email' },
            { subjectId: 'validateUser', predicate: 'returns', object: 'boolean' }
          ],
          evidenceScore: 1.0,
          timestamp: Date.now()
        }
      ];
    });

    it('should generate different prompts for O/R1/R2 keys', () => {
      // Access private method for testing
      const buildPrompt = (gateway as any).buildSummarizePrompt.bind(gateway);

      // Generate prompts with different keys
      const promptO = buildPrompt(testFactSets, 'technical', { promptKey: 'O', deterministic: false });
      const promptR1 = buildPrompt(testFactSets, 'technical', { promptKey: 'R1', deterministic: false });
      const promptR2 = buildPrompt(testFactSets, 'technical', { promptKey: 'R2', deterministic: false });

      // Verify prompts are different
      expect(promptO).not.toBe(promptR1);
      expect(promptO).not.toBe(promptR2);
      expect(promptR1).not.toBe(promptR2);

      // Verify unique prompts
      const uniquePrompts = new Set([promptO, promptR1, promptR2]);
      expect(uniquePrompts.size).toBe(3);

      // Verify O prompt characteristics (paragraph format)
      expect(promptO).toContain('concise paragraph');
      expect(promptO).toContain('Use canonical names');

      // Verify R1 prompt characteristics (stricter, bullets)
      expect(promptR1).toContain('bullets only');
      expect(promptR1).toContain('exact canonical names');
      expect(promptR1).not.toContain('paragraph');

      // Verify R2 prompt characteristics (strictest, CAPS emphasis)
      expect(promptR2).toContain('OUTPUT BULLETS ONLY');
      expect(promptR2).toContain('EXACT canonical names');
      expect(promptR2).toContain('NO synonyms');
      expect(promptR2).toContain('NO inference');
    });

    it('should use O prompt by default', () => {
      const buildPrompt = (gateway as any).buildSummarizePrompt.bind(gateway);
      const promptDefault = buildPrompt(testFactSets, 'technical', { deterministic: false });
      const promptO = buildPrompt(testFactSets, 'technical', { promptKey: 'O', deterministic: false });

      // Default should match O prompt
      expect(promptDefault).toBe(promptO);
      expect(promptDefault).toContain('concise paragraph');
    });

    it('should include deterministic mode flag in O prompt', () => {
      const buildPrompt = (gateway as any).buildSummarizePrompt.bind(gateway);

      const promptNonDeterministic = buildPrompt(testFactSets, 'technical', {
        promptKey: 'O',
        deterministic: false
      });
      const promptDeterministic = buildPrompt(testFactSets, 'technical', {
        promptKey: 'O',
        deterministic: true
      });

      // Non-deterministic should not have the mode flag
      expect(promptNonDeterministic).not.toContain('Deterministic');

      // Deterministic should have the mode flag
      expect(promptDeterministic).toContain('Mode: Deterministic');
      expect(promptDeterministic).toContain('no paraphrasing variance');
    });

    it('should include style in O prompt but not in R1/R2', () => {
      const buildPrompt = (gateway as any).buildSummarizePrompt.bind(gateway);

      const promptO = buildPrompt(testFactSets, 'conversational', { promptKey: 'O', deterministic: false });
      const promptR1 = buildPrompt(testFactSets, 'conversational', { promptKey: 'R1', deterministic: false });
      const promptR2 = buildPrompt(testFactSets, 'conversational', { promptKey: 'R2', deterministic: false });

      // O prompt should include style
      expect(promptO).toContain('Style: conversational');

      // R1 and R2 prompts should not include style (stricter format)
      expect(promptR1).not.toContain('Style:');
      expect(promptR2).not.toContain('Style:');
    });
  });
});
