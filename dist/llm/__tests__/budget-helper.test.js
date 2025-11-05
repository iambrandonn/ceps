/**
 * Phase 4 WS-F2 Stage A/B: Budget Manager Helper Tests
 *
 * Tests for withBudgetHelper() wrapper that implements CTS-07 §8 interface.
 * This helper checks budget before LLM calls and returns allowed/denied status.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { BudgetTracker } from '../budget.js';
import { withBudgetHelper, estimateTokens, validateCostGate, } from '../budget-helpers.js';
describe('withBudgetHelper() wrapper (CTS-07 §8)', () => {
    let tracker;
    beforeEach(() => {
        tracker = new BudgetTracker(10000); // 10k token budget
    });
    describe('Interface contract', () => {
        it('should accept kind and estimated tokens', () => {
            const result = withBudgetHelper(tracker, 'summarize', 500);
            expect(result).toBeDefined();
            expect(result).toHaveProperty('allowed');
            expect(result).toHaveProperty('remaining');
        });
        it('should return allowed=true when under budget', () => {
            const result = withBudgetHelper(tracker, 'summarize', 500);
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBeGreaterThan(0);
        });
        it('should return allowed=false when over budget', () => {
            // Exhaust budget first
            tracker.recordUsage('test', 10000, 5000, 5000, 0.01);
            const result = withBudgetHelper(tracker, 'summarize', 500);
            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);
        });
        it('should return remaining budget', () => {
            // Use some budget
            tracker.recordUsage('test', 3000, 1500, 1500, 0.003);
            const result = withBudgetHelper(tracker, 'summarize', 500);
            expect(result.remaining).toBe(7000);
        });
    });
    describe('Token estimation', () => {
        it('should estimate tokens for prompt text', () => {
            const text = 'This is a test prompt with some factSets.';
            const estimate = estimateTokens(text, 'anthropic');
            expect(typeof estimate).toBe('number');
            expect(estimate).toBeGreaterThan(0);
        });
        it('should use provider-specific estimation when available', () => {
            const text = 'Test prompt';
            // Anthropic estimation
            const anthropicEstimate = estimateTokens(text, 'anthropic');
            // OpenAI estimation (may differ due to different tokenizers)
            const openaiEstimate = estimateTokens(text, 'openai');
            expect(typeof anthropicEstimate).toBe('number');
            expect(typeof openaiEstimate).toBe('number');
        });
        it('should fall back to heuristic for unknown providers', () => {
            const text = 'Test prompt with multiple words';
            const estimate = estimateTokens(text, 'unknown-provider');
            // Heuristic: Math.ceil(text.length / 4)
            const expectedHeuristic = Math.ceil(text.length / 4);
            expect(estimate).toBeGreaterThan(0);
            // Should be close to heuristic (exact match for fallback)
            expect(Math.abs(estimate - expectedHeuristic)).toBeLessThan(5);
        });
    });
    describe('Budget exhaustion behavior', () => {
        it('should NOT throw error when budget exhausted', () => {
            // Exhaust budget
            tracker.recordUsage('test', 10000, 5000, 5000, 0.01);
            expect(() => withBudgetHelper(tracker, 'summarize', 500)).not.toThrow();
        });
        it('should allow unlimited budget (0 or negative)', () => {
            const unlimitedTracker = new BudgetTracker(0);
            const result = withBudgetHelper(unlimitedTracker, 'summarize', 99999);
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(Number.MAX_SAFE_INTEGER);
        });
    });
    describe('Cost gate thresholds', () => {
        it('should validate Express fixture threshold (≤30k tokens)', () => {
            const expressTracker = new BudgetTracker(30000);
            // Simulate Express fixture usage
            expressTracker.recordUsage('anthropic', 28000, 14000, 14000, 0.028);
            const meetsThreshold = validateCostGate(expressTracker, 'express');
            expect(meetsThreshold).toBe(true);
        });
        it('should validate React fixture threshold (≤40k tokens)', () => {
            const reactTracker = new BudgetTracker(40000);
            // Simulate React fixture usage
            reactTracker.recordUsage('anthropic', 38000, 19000, 19000, 0.038);
            const meetsThreshold = validateCostGate(reactTracker, 'react');
            expect(meetsThreshold).toBe(true);
        });
        it('should validate monorepo fixture threshold (≤100k tokens)', () => {
            const monorepoTracker = new BudgetTracker(100000);
            // Simulate monorepo fixture usage
            monorepoTracker.recordUsage('anthropic', 95000, 47500, 47500, 0.095);
            const meetsThreshold = validateCostGate(monorepoTracker, 'monorepo');
            expect(meetsThreshold).toBe(true);
        });
        it('should fail cost gate when threshold exceeded', () => {
            const expressTracker = new BudgetTracker(50000);
            // Exceed Express threshold (>30k)
            expressTracker.recordUsage('anthropic', 35000, 17500, 17500, 0.035);
            const meetsThreshold = validateCostGate(expressTracker, 'express');
            expect(meetsThreshold).toBe(false);
        });
    });
});
//# sourceMappingURL=budget-helper.test.js.map