/**
 * Agent 4: LLM Gateway - Budget Tracker
 *
 * CTS-02 §4 (Budgeting)
 *
 * Responsible for:
 * - Tracking token usage against budget
 * - Preventing overruns (hard limit)
 * - Reporting usage statistics
 */

export interface ProviderUsage {
  provider: string;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  costUSD: number;
}

export interface UsageStats {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  costUSD: number;
  budgetLimit: number;
  budgetRemaining: number;
  budgetUsedPercent: number;
  byProvider: Record<string, ProviderUsage>;
}

export class BudgetTracker {
  private budgetLimit: number;
  private totalTokens: number = 0;
  private promptTokens: number = 0;
  private completionTokens: number = 0;
  private totalCost: number = 0;
  private providerUsage: Map<string, ProviderUsage> = new Map();

  constructor(budgetLimit: number) {
    this.budgetLimit = budgetLimit;
  }

  /**
   * Check if there is remaining budget
   * @returns true if under budget, false if at or over budget
   */
  checkBudget(): boolean {
    // If budget is 0 or negative, treat as unlimited
    if (this.budgetLimit <= 0) {
      return true;
    }

    return this.totalTokens < this.budgetLimit;
  }

  /**
   * Record token usage for a provider
   */
  recordUsage(
    provider: string,
    totalTokens: number,
    promptTokens: number,
    completionTokens: number,
    costUSD: number
  ): void {
    // Update global totals
    this.totalTokens += totalTokens;
    this.promptTokens += promptTokens;
    this.completionTokens += completionTokens;
    this.totalCost += costUSD;

    // Update provider-specific usage
    const existing = this.providerUsage.get(provider);
    if (existing) {
      existing.totalTokens += totalTokens;
      existing.promptTokens += promptTokens;
      existing.completionTokens += completionTokens;
      existing.costUSD += costUSD;
    } else {
      this.providerUsage.set(provider, {
        provider,
        totalTokens,
        promptTokens,
        completionTokens,
        costUSD
      });
    }
  }

  /**
   * Get current usage statistics
   */
  getUsage(): UsageStats {
    const remaining = this.getRemainingBudget();
    const usedPercent = this.budgetLimit > 0
      ? (this.totalTokens / this.budgetLimit) * 100
      : 0;

    const byProvider: Record<string, ProviderUsage> = {};
    this.providerUsage.forEach((usage, provider) => {
      byProvider[provider] = { ...usage };
    });

    return {
      totalTokens: this.totalTokens,
      promptTokens: this.promptTokens,
      completionTokens: this.completionTokens,
      costUSD: this.totalCost,
      budgetLimit: this.budgetLimit,
      budgetRemaining: remaining,
      budgetUsedPercent: usedPercent,
      byProvider
    };
  }

  /**
   * Get remaining budget in tokens
   */
  getRemainingBudget(): number {
    if (this.budgetLimit <= 0) {
      // Unlimited budget
      return Number.MAX_SAFE_INTEGER;
    }

    const remaining = this.budgetLimit - this.totalTokens;
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Reset all usage statistics
   */
  reset(): void {
    this.totalTokens = 0;
    this.promptTokens = 0;
    this.completionTokens = 0;
    this.totalCost = 0;
    this.providerUsage.clear();
  }
}
