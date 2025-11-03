import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenAIAdapter } from '../../../../src/llm/adapters/openai';

// Mock the OpenAI SDK
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn()
        }
      }
    }))
  };
});

describe('OpenAIAdapter', () => {
  let adapter: OpenAIAdapter;
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    adapter = new OpenAIAdapter('test-api-key');
    mockClient = (adapter as any).client;
  });

  describe('initialization', () => {
    it('should initialize with API key', () => {
      expect(adapter).toBeDefined();
    });

    it('should throw error if API key is missing', () => {
      expect(() => new OpenAIAdapter('')).toThrow('API key is required');
    });

    it('should use default model', () => {
      const defaultModel = adapter.getDefaultModel();
      expect(defaultModel).toBe('gpt-4-turbo-preview');
    });

    it('should accept custom model', () => {
      const customAdapter = new OpenAIAdapter('test-key', {
        model: 'gpt-4'
      });
      expect(customAdapter.getDefaultModel()).toBe('gpt-4');
    });
  });

  describe('completions', () => {
    it('should send prompt and return response', async () => {
      const prompt = 'Explain this function';
      const expectedResponse = 'This function performs data validation.';

      mockClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: expectedResponse
            }
          }
        ],
        usage: {
          prompt_tokens: 30,
          completion_tokens: 15,
          total_tokens: 45
        }
      });

      const response = await adapter.completions(prompt);

      expect(response).toBe(expectedResponse);
      expect(mockClient.chat.completions.create).toHaveBeenCalledTimes(1);
    });

    it('should use specified model', async () => {
      const prompt = 'Test prompt';

      mockClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      });

      await adapter.completions(prompt, { model: 'gpt-3.5-turbo' });

      expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-3.5-turbo'
        })
      );
    });

    it('should use low temperature by default', async () => {
      const prompt = 'Test prompt';

      mockClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      });

      await adapter.completions(prompt);

      expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.3
        })
      );
    });

    it('should support custom temperature', async () => {
      const prompt = 'Test prompt';

      mockClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      });

      await adapter.completions(prompt, { temperature: 0.8 });

      expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.8
        })
      );
    });

    it('should respect maxTokens option', async () => {
      const prompt = 'Test prompt';

      mockClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      });

      await adapter.completions(prompt, { maxTokens: 2000 });

      expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 2000
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      const prompt = 'Test prompt';

      mockClient.chat.completions.create.mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(adapter.completions(prompt)).rejects.toThrow('OpenAI API error');
    });

    it('should return usage statistics', async () => {
      const prompt = 'Test prompt';

      mockClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 75,
          total_tokens: 225
        }
      });

      await adapter.completions(prompt);

      const usage = adapter.getLastUsage();
      expect(usage).toBeDefined();
      expect(usage?.inputTokens).toBe(150);
      expect(usage?.outputTokens).toBe(75);
      expect(usage?.totalTokens).toBe(225);
    });
  });

  describe('countTokens', () => {
    it('should estimate token count for text', () => {
      const text = 'This is a test sentence with multiple words.';
      const count = adapter.countTokens(text);

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
    it('should calculate cost for GPT-4 Turbo', () => {
      const inputTokens = 1000000;  // 1M tokens
      const outputTokens = 500000;   // 500k tokens

      const cost = adapter.calculateCost(inputTokens, outputTokens, 'gpt-4-turbo-preview');

      // GPT-4 Turbo: $10/MTok input, $30/MTok output
      // Expected: (1M * 10 + 500k * 30) / 1M = 10 + 15 = 25
      expect(cost).toBeCloseTo(25, 2);
    });

    it('should calculate cost for GPT-3.5 Turbo', () => {
      const inputTokens = 1000000;
      const outputTokens = 500000;

      const cost = adapter.calculateCost(inputTokens, outputTokens, 'gpt-3.5-turbo');

      // GPT-3.5 Turbo: $0.50/MTok input, $1.50/MTok output
      // Expected: (1M * 0.5 + 500k * 1.5) / 1M = 0.5 + 0.75 = 1.25
      expect(cost).toBeCloseTo(1.25, 2);
    });

    it('should handle zero tokens', () => {
      const cost = adapter.calculateCost(0, 0, 'gpt-4-turbo-preview');
      expect(cost).toBe(0);
    });
  });

  describe('getLastUsage', () => {
    it('should return null initially', () => {
      const usage = adapter.getLastUsage();
      expect(usage).toBeNull();
    });

    it('should return usage after completions call', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
        usage: {
          prompt_tokens: 200,
          completion_tokens: 100,
          total_tokens: 300
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
      const prompt = 'Explain this code';
      const systemPrompt = 'You are a code documentation expert.';

      mockClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      });

      await adapter.completions(prompt, { system: systemPrompt });

      expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: systemPrompt
            })
          ])
        })
      );
    });
  });
});
