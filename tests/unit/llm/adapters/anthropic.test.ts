import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnthropicAdapter } from '../../../../src/llm/adapters/anthropic';
import type Anthropic from '@anthropic-ai/sdk';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn()
      }
    }))
  };
});

describe('AnthropicAdapter', () => {
  let adapter: AnthropicAdapter;
  let mockClient: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create adapter with test API key
    adapter = new AnthropicAdapter('test-api-key');
    mockClient = (adapter as any).client;
  });

  describe('initialization', () => {
    it('should initialize with API key', () => {
      expect(adapter).toBeDefined();
    });

    it('should throw error if API key is missing', () => {
      expect(() => new AnthropicAdapter('')).toThrow('API key is required');
    });

    it('should use default model', () => {
      const defaultModel = adapter.getDefaultModel();
      expect(defaultModel).toBe('claude-sonnet-4-5-20250929');
    });

    it('should accept custom model', () => {
      const customAdapter = new AnthropicAdapter('test-key', {
        model: 'claude-opus-4'
      });
      expect(customAdapter.getDefaultModel()).toBe('claude-opus-4');
    });
  });

  describe('completions', () => {
    it('should send prompt and return response', async () => {
      const prompt = 'Summarize this function: export function add(a, b) { return a + b; }';
      const expectedResponse = 'This function adds two numbers and returns the sum.';

      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: expectedResponse }],
        usage: {
          input_tokens: 50,
          output_tokens: 20
        }
      });

      const response = await adapter.completions(prompt);

      expect(response).toBe(expectedResponse);
      expect(mockClient.messages.create).toHaveBeenCalledTimes(1);
    });

    it('should use specified model', async () => {
      const prompt = 'Test prompt';

      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 }
      });

      await adapter.completions(prompt, { model: 'claude-opus-4' });

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-opus-4'
        })
      );
    });

    it('should use low temperature by default', async () => {
      const prompt = 'Test prompt';

      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 }
      });

      await adapter.completions(prompt);

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.3
        })
      );
    });

    it('should support custom temperature', async () => {
      const prompt = 'Test prompt';

      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 }
      });

      await adapter.completions(prompt, { temperature: 0.7 });

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7
        })
      );
    });

    it('should respect max_tokens option', async () => {
      const prompt = 'Test prompt';

      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 }
      });

      await adapter.completions(prompt, { maxTokens: 1000 });

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 1000
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      const prompt = 'Test prompt';

      mockClient.messages.create.mockRejectedValue(new Error('API rate limit exceeded'));

      await expect(adapter.completions(prompt)).rejects.toThrow('Anthropic API error');
    });

    it('should return usage statistics', async () => {
      const prompt = 'Test prompt';

      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: {
          input_tokens: 100,
          output_tokens: 50
        }
      });

      const result = await adapter.completions(prompt);

      const usage = adapter.getLastUsage();
      expect(usage).toBeDefined();
      expect(usage?.inputTokens).toBe(100);
      expect(usage?.outputTokens).toBe(50);
      expect(usage?.totalTokens).toBe(150);
    });
  });

  describe('countTokens', () => {
    it('should estimate token count for text', () => {
      const text = 'This is a test sentence with multiple words.';
      const count = adapter.countTokens(text);

      // Rough estimate: ~1 token per 4 characters
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(text.length);
    });

    it('should handle empty text', () => {
      const count = adapter.countTokens('');
      expect(count).toBe(0);
    });

    it('should handle long text', () => {
      const longText = 'word '.repeat(1000);
      const count = adapter.countTokens(longText);

      expect(count).toBeGreaterThan(500);
      expect(count).toBeLessThan(2000);
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost for Claude Sonnet 4.5', () => {
      const inputTokens = 1000000;  // 1M tokens
      const outputTokens = 500000;   // 500k tokens

      const cost = adapter.calculateCost(inputTokens, outputTokens, 'claude-sonnet-4-5-20250929');

      // Claude Sonnet 4.5: $3/MTok input, $15/MTok output
      // Expected: (1M * 3 + 500k * 15) / 1M = 3 + 7.5 = 10.5
      expect(cost).toBeCloseTo(10.5, 2);
    });

    it('should calculate cost for Claude Opus 4', () => {
      const inputTokens = 1000000;
      const outputTokens = 500000;

      const cost = adapter.calculateCost(inputTokens, outputTokens, 'claude-opus-4');

      // Claude Opus 4: $15/MTok input, $75/MTok output
      // Expected: (1M * 15 + 500k * 75) / 1M = 15 + 37.5 = 52.5
      expect(cost).toBeCloseTo(52.5, 2);
    });

    it('should handle zero tokens', () => {
      const cost = adapter.calculateCost(0, 0, 'claude-sonnet-4-5-20250929');
      expect(cost).toBe(0);
    });
  });

  describe('getLastUsage', () => {
    it('should return null initially', () => {
      const usage = adapter.getLastUsage();
      expect(usage).toBeNull();
    });

    it('should return usage after completions call', async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: {
          input_tokens: 200,
          output_tokens: 100
        }
      });

      await adapter.completions('Test prompt');

      const usage = adapter.getLastUsage();
      expect(usage).not.toBeNull();
      expect(usage?.inputTokens).toBe(200);
      expect(usage?.outputTokens).toBe(100);
      expect(usage?.totalTokens).toBe(300);
    });
  });

  describe('system prompts', () => {
    it('should support system prompts', async () => {
      const prompt = 'Explain this function';
      const systemPrompt = 'You are a helpful code documentation assistant.';

      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 }
      });

      await adapter.completions(prompt, { system: systemPrompt });

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          system: systemPrompt
        })
      );
    });
  });
});
