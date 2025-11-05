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
 * Cost gate thresholds per fixture type (Phase 4 §5.2)
 */
const COST_GATE_THRESHOLDS: Record<string, number> = {
  express: 30000,
  react: 40000,
  monorepo: 100000,
};

/**
 * Check budget before LLM call (CTS-07 §8 wrapper)
 *
 * @param tracker - BudgetTracker instance
 * @param kind - Operation kind ('summarize', 'synthesize', etc.)
 * @param estimate - Estimated tokens for this operation
 * @returns BudgetCheckResult with allowed flag and remaining tokens
 */
export function withBudgetHelper(
  tracker: BudgetTracker,
  kind: string,
  estimate: number
): BudgetCheckResult {
  const remaining = tracker.getRemainingBudget();
  const allowed = tracker.checkBudget() && estimate <= remaining;

  return {
    allowed,
    remaining,
  };
}

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
export function estimateTokens(text: string, provider: string): number {
  // Provider-specific estimation
  switch (provider) {
    case 'anthropic':
      // Anthropic: Use heuristic (SDK estimation API not widely available)
      // Anthropic Claude typically: ~4 chars per token for English text
      return Math.ceil(text.length / 4);

    case 'openai':
    case 'azure':
      // OpenAI/Azure: Use heuristic
      // GPT models typically: ~4 chars per token for English text
      return Math.ceil(text.length / 4);

    case 'local':
    default:
      // Unknown provider: fallback heuristic
      return Math.ceil(text.length / 4);
  }
}

/**
 * Validate that token usage meets cost gate threshold
 *
 * @param tracker - BudgetTracker instance
 * @param fixtureType - Fixture type ('express', 'react', 'monorepo')
 * @returns true if usage is within threshold, false otherwise
 */
export function validateCostGate(
  tracker: BudgetTracker,
  fixtureType: string
): boolean {
  const threshold = COST_GATE_THRESHOLDS[fixtureType];
  if (threshold === undefined) {
    throw new Error(`Unknown fixture type: ${fixtureType}`);
  }

  const usage = tracker.getUsage();
  return usage.totalTokens <= threshold;
}
