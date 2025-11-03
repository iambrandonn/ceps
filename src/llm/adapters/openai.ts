/**
 * Agent 4: LLM Gateway - OpenAI Adapter
 *
 * CTS-02 §2 (Provider Adapters)
 *
 * Responsible for:
 * - Integration with OpenAI API
 * - Token counting and cost estimation
 * - Usage tracking
 */

import OpenAI from 'openai';

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
  'gpt-4-turbo-preview': {
    inputPerMillion: 10,
    outputPerMillion: 30
  },
  'gpt-4': {
    inputPerMillion: 30,
    outputPerMillion: 60
  },
  'gpt-3.5-turbo': {
    inputPerMillion: 0.5,
    outputPerMillion: 1.5
  }
};

export class OpenAIAdapter {
  private client: OpenAI;
  private defaultModel: string;
  private lastUsage: TokenUsage | null = null;

  constructor(apiKey: string, options: { model?: string } = {}) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API key is required');
    }

    this.client = new OpenAI({ apiKey });
    this.defaultModel = options.model || 'gpt-4-turbo-preview';
  }

  /**
   * Get default model
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }

  /**
   * Send prompt to OpenAI and get response
   */
  async completions(prompt: string, options: CompletionOptions = {}): Promise<string> {
    try {
      const model = options.model || this.defaultModel;
      const temperature = options.temperature ?? 0.3;
      const maxTokens = options.maxTokens;

      const messages: any[] = [];

      // Add system prompt if provided
      if (options.system) {
        messages.push({
          role: 'system',
          content: options.system
        });
      }

      // Add user prompt
      messages.push({
        role: 'user',
        content: prompt
      });

      const params: any = {
        model,
        temperature,
        messages
      };

      if (maxTokens) {
        params.max_tokens = maxTokens;
      }

      const response = await this.client.chat.completions.create(params);

      // Extract text from response
      const text = response.choices[0]?.message?.content || '';

      // Track usage
      const inputTokens = response.usage?.prompt_tokens || 0;
      const outputTokens = response.usage?.completion_tokens || 0;
      const totalTokens = response.usage?.total_tokens || 0;
      const costUSD = this.calculateCost(inputTokens, outputTokens, model);

      this.lastUsage = {
        inputTokens,
        outputTokens,
        totalTokens,
        costUSD
      };

      return text;
    } catch (error) {
      throw new Error(`OpenAI API error: ${(error as Error).message}`);
    }
  }

  /**
   * Estimate token count for text
   * Note: This is a rough estimate. OpenAI uses tiktoken.
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
   */
  calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4-turbo-preview'];

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
