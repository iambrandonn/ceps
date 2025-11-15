/**
 * Enhanced Cost Tracker for LLM-First Architecture
 *
 * Phase 0.4: Pre-conversion utility for tracking and reporting LLM costs
 *
 * Provides:
 * - Model-specific pricing and usage tracking
 * - Human-readable cost reports
 * - Per-run cost estimation
 * - Breakdown by model and operation type
 */

export interface ModelPricing {
  inputCostPerMillionTokens: number;
  outputCostPerMillionTokens: number;
}

export interface ModelUsage {
  model: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface CostReport {
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  byModel: Record<string, ModelUsage>;
}

/**
 * Standard pricing for Anthropic models (as of Nov 2025)
 * Prices in USD per 1M tokens
 */
export const ANTHROPIC_PRICING: Record<string, ModelPricing> = {
  'claude-3-5-sonnet-20241022': {
    inputCostPerMillionTokens: 3.00,
    outputCostPerMillionTokens: 15.00
  },
  'claude-3-5-haiku-20241022': {
    inputCostPerMillionTokens: 0.25,
    outputCostPerMillionTokens: 1.25
  },
  'claude-3-opus-20240229': {
    inputCostPerMillionTokens: 15.00,
    outputCostPerMillionTokens: 75.00
  }
};

/**
 * OpenAI pricing (for reference/future use)
 */
export const OPENAI_PRICING: Record<string, ModelPricing> = {
  'gpt-4-turbo': {
    inputCostPerMillionTokens: 10.00,
    outputCostPerMillionTokens: 30.00
  },
  'gpt-4o': {
    inputCostPerMillionTokens: 5.00,
    outputCostPerMillionTokens: 15.00
  },
  'gpt-4o-mini': {
    inputCostPerMillionTokens: 0.15,
    outputCostPerMillionTokens: 0.60
  }
};

export class CostTracker {
  private modelUsage: Map<string, ModelUsage> = new Map();
  private customPricing: Map<string, ModelPricing> = new Map();

  constructor(customPricing?: Record<string, ModelPricing>) {
    if (customPricing) {
      Object.entries(customPricing).forEach(([model, pricing]) => {
        this.customPricing.set(model, pricing);
      });
    }
  }

  /**
   * Track usage for a specific model call
   */
  trackUsage(model: string, inputTokens: number, outputTokens: number): void {
    const existing = this.modelUsage.get(model);
    const pricing = this.getPricing(model);
    const cost = this.calculateCost(inputTokens, outputTokens, pricing);

    if (existing) {
      existing.calls += 1;
      existing.inputTokens += inputTokens;
      existing.outputTokens += outputTokens;
      existing.totalTokens += inputTokens + outputTokens;
      existing.estimatedCost += cost;
    } else {
      this.modelUsage.set(model, {
        model,
        calls: 1,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        estimatedCost: cost
      });
    }
  }

  /**
   * Get pricing for a model (checks custom, then Anthropic, then OpenAI, then default)
   */
  private getPricing(model: string): ModelPricing {
    // Check custom pricing first
    if (this.customPricing.has(model)) {
      return this.customPricing.get(model)!;
    }

    // Check Anthropic pricing
    if (ANTHROPIC_PRICING[model]) {
      return ANTHROPIC_PRICING[model];
    }

    // Check OpenAI pricing
    if (OPENAI_PRICING[model]) {
      return OPENAI_PRICING[model];
    }

    // Default: assume Sonnet-level pricing
    return ANTHROPIC_PRICING['claude-3-5-sonnet-20241022'];
  }

  /**
   * Calculate cost for a given token usage
   */
  private calculateCost(
    inputTokens: number,
    outputTokens: number,
    pricing: ModelPricing
  ): number {
    const inputCost = (inputTokens / 1_000_000) * pricing.inputCostPerMillionTokens;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputCostPerMillionTokens;
    return inputCost + outputCost;
  }

  /**
   * Get estimated cost for a given model and token count (utility method)
   */
  getEstimatedCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = this.getPricing(model);
    return this.calculateCost(inputTokens, outputTokens, pricing);
  }

  /**
   * Get current cost report
   */
  getReport(): CostReport {
    let totalCalls = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalTokens = 0;
    let totalCost = 0;

    const byModel: Record<string, ModelUsage> = {};

    this.modelUsage.forEach((usage, model) => {
      totalCalls += usage.calls;
      totalInputTokens += usage.inputTokens;
      totalOutputTokens += usage.outputTokens;
      totalTokens += usage.totalTokens;
      totalCost += usage.estimatedCost;
      byModel[model] = { ...usage };
    });

    return {
      totalCalls,
      totalInputTokens,
      totalOutputTokens,
      totalTokens,
      totalCost,
      byModel
    };
  }

  /**
   * Format cost report as human-readable string
   */
  report(): string {
    const report = this.getReport();

    if (report.totalCalls === 0) {
      return 'No LLM usage recorded.';
    }

    const lines: string[] = [];
    lines.push('=== LLM Cost Report ===');
    lines.push('');
    lines.push(`Total Calls: ${report.totalCalls}`);
    lines.push(`Total Tokens: ${report.totalTokens.toLocaleString()}`);
    lines.push(`  Input:  ${report.totalInputTokens.toLocaleString()}`);
    lines.push(`  Output: ${report.totalOutputTokens.toLocaleString()}`);
    lines.push(`Estimated Cost: $${report.totalCost.toFixed(4)}`);
    lines.push('');

    if (Object.keys(report.byModel).length > 1) {
      lines.push('By Model:');
      Object.entries(report.byModel)
        .sort(([, a], [, b]) => b.estimatedCost - a.estimatedCost)
        .forEach(([model, usage]) => {
          lines.push(`  ${model}:`);
          lines.push(`    Calls:  ${usage.calls}`);
          lines.push(`    Tokens: ${usage.totalTokens.toLocaleString()} (in: ${usage.inputTokens.toLocaleString()}, out: ${usage.outputTokens.toLocaleString()})`);
          lines.push(`    Cost:   $${usage.estimatedCost.toFixed(4)}`);
        });
      lines.push('');
    }

    lines.push('=======================');

    return lines.join('\n');
  }

  /**
   * Reset all tracking data
   */
  reset(): void {
    this.modelUsage.clear();
  }

  /**
   * Get total estimated cost (convenience method)
   */
  getTotalCost(): number {
    return this.getReport().totalCost;
  }

  /**
   * Check if cost exceeds a threshold
   */
  exceedsThreshold(thresholdUSD: number): boolean {
    return this.getTotalCost() > thresholdUSD;
  }
}
