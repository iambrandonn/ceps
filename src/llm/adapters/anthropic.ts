/**
 * Agent 4: LLM Gateway - Anthropic Adapter
 *
 * CTS-02 §2 (Provider Adapters)
 *
 * Responsible for:
 * - Integration with Anthropic Claude API
 * - Token counting and cost estimation
 * - Usage tracking
 */

import Anthropic from '@anthropic-ai/sdk';

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  system?: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUSD: number;
}

interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-sonnet-4-5-20250929': {
    inputPerMillion: 3,
    outputPerMillion: 15
  },
  'claude-opus-4': {
    inputPerMillion: 15,
    outputPerMillion: 75
  },
  'claude-3-5-sonnet-20241022': {
    inputPerMillion: 3,
    outputPerMillion: 15
  }
};

export class AnthropicAdapter {
  private client: Anthropic;
  private defaultModel: string;
  private lastUsage: TokenUsage | null = null;

  constructor(apiKey: string, options: { model?: string } = {}) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API key is required');
    }

    this.client = new Anthropic({ apiKey });
    this.defaultModel = options.model || 'claude-sonnet-4-5-20250929';
  }

  /**
   * Get default model
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }

  /**
   * Send prompt to Claude and get response
   */
  async completions(prompt: string, options: CompletionOptions = {}): Promise<string> {
    try {
      const model = options.model || this.defaultModel;
      const temperature = options.temperature ?? 0.3;
      const maxTokens = options.maxTokens || 4096;

      const params: any = {
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      };

      // Add system prompt if provided
      if (options.system) {
        params.system = options.system;
      }

      const response = await this.client.messages.create(params);

      // Extract text from response
      const text = response.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');

      // Track usage
      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;
      const totalTokens = inputTokens + outputTokens;
      const costUSD = this.calculateCost(inputTokens, outputTokens, model);

      this.lastUsage = {
        inputTokens,
        outputTokens,
        totalTokens,
        costUSD
      };

      return text;
    } catch (error) {
      throw new Error(`Anthropic API error: ${(error as Error).message}`);
    }
  }

  /**
   * Estimate token count for text
   * Note: This is a rough estimate. Anthropic uses a different tokenizer.
   * Rough rule: ~4 characters per token for English text
   */
  countTokens(text: string): number {
    if (!text || text.length === 0) {
      return 0;
    }

    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate cost in USD for token usage
   * @param inputTokens Number of input tokens
   * @param outputTokens Number of output tokens
   * @param model Model name
   * @returns Cost in USD
   */
  calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['claude-sonnet-4-5-20250929'];

    const inputCost = (inputTokens / 1000000) * pricing.inputPerMillion;
    const outputCost = (outputTokens / 1000000) * pricing.outputPerMillion;

    return inputCost + outputCost;
  }

  /**
   * Get usage statistics from last completion
   */
  getLastUsage(): TokenUsage | null {
    return this.lastUsage;
  }
}
