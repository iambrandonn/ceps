/**
 * Phase 4 WS-F2 Stage B: Budget Manager Helpers
 *
 * Implements CTS-07 §8 withBudget() wrapper interface and token estimation.
 */
import { BudgetTracker } from './budget.js';
export interface BudgetCheckResult {
    allowed: boolean;
    remaining: number;
}
/**
 * Check budget before LLM call (CTS-07 §8 wrapper)
 *
 * @param tracker - BudgetTracker instance
 * @param kind - Operation kind ('summarize', 'synthesize', etc.)
 * @param estimate - Estimated tokens for this operation
 * @returns BudgetCheckResult with allowed flag and remaining tokens
 */
export declare function withBudgetHelper(tracker: BudgetTracker, kind: string, estimate: number): BudgetCheckResult;
/**
 * Estimate tokens for text based on provider
 *
 * Uses provider-specific tokenizers when available,
 * falls back to heuristic for unknown providers.
 *
 * @param text - Text to estimate tokens for
 * @param provider - Provider name ('anthropic', 'openai', 'azure', 'local')
 * @returns Estimated token count
 */
export declare function estimateTokens(text: string, provider: string): number;
/**
 * Validate that token usage meets cost gate threshold
 *
 * @param tracker - BudgetTracker instance
 * @param fixtureType - Fixture type ('express', 'react', 'monorepo')
 * @returns true if usage is within threshold, false otherwise
 */
export declare function validateCostGate(tracker: BudgetTracker, fixtureType: string): boolean;
//# sourceMappingURL=budget-helpers.d.ts.map