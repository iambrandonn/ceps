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
export declare class BudgetTracker {
    private budgetLimit;
    private totalTokens;
    private promptTokens;
    private completionTokens;
    private totalCost;
    private providerUsage;
    constructor(budgetLimit: number);
    /**
     * Check if there is remaining budget
     * @returns true if under budget, false if at or over budget
     */
    checkBudget(): boolean;
    /**
     * Record token usage for a provider
     */
    recordUsage(provider: string, totalTokens: number, promptTokens: number, completionTokens: number, costUSD: number): void;
    /**
     * Get current usage statistics
     */
    getUsage(): UsageStats;
    /**
     * Get remaining budget in tokens
     */
    getRemainingBudget(): number;
    /**
     * Reset all usage statistics
     */
    reset(): void;
}
//# sourceMappingURL=budget.d.ts.map