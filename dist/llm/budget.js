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
export class BudgetTracker {
    budgetLimit;
    totalTokens = 0;
    promptTokens = 0;
    completionTokens = 0;
    totalCost = 0;
    providerUsage = new Map();
    constructor(budgetLimit) {
        this.budgetLimit = budgetLimit;
    }
    /**
     * Check if there is remaining budget
     * @returns true if under budget, false if at or over budget
     */
    checkBudget() {
        // If budget is 0 or negative, treat as unlimited
        if (this.budgetLimit <= 0) {
            return true;
        }
        return this.totalTokens < this.budgetLimit;
    }
    /**
     * Record token usage for a provider
     */
    recordUsage(provider, totalTokens, promptTokens, completionTokens, costUSD) {
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
        }
        else {
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
    getUsage() {
        const remaining = this.getRemainingBudget();
        const usedPercent = this.budgetLimit > 0
            ? (this.totalTokens / this.budgetLimit) * 100
            : 0;
        const byProvider = {};
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
    getRemainingBudget() {
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
    reset() {
        this.totalTokens = 0;
        this.promptTokens = 0;
        this.completionTokens = 0;
        this.totalCost = 0;
        this.providerUsage.clear();
    }
}
//# sourceMappingURL=budget.js.map