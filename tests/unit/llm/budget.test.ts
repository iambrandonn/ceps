import { describe, it, expect, beforeEach } from 'vitest';
import { BudgetTracker, UsageStats } from '../../../src/llm/budget';

describe('BudgetTracker', () => {
  let tracker: BudgetTracker;

  beforeEach(() => {
    // Default budget: 1,000,000 tokens
    tracker = new BudgetTracker(1000000);
  });

  describe('checkBudget', () => {
    it('should return true when under budget', () => {
      expect(tracker.checkBudget()).toBe(true);
    });

    it('should return true after recording usage under budget', () => {
      tracker.recordUsage('anthropic', 5000, 3000, 2000, 0.15);
      expect(tracker.checkBudget()).toBe(true);
    });

    it('should return false when budget exceeded', () => {
      tracker.recordUsage('anthropic', 1000001, 500000, 500001, 30.0);
      expect(tracker.checkBudget()).toBe(false);
    });

    it('should return false when exactly at budget', () => {
      tracker.recordUsage('anthropic', 1000000, 500000, 500000, 30.0);
      expect(tracker.checkBudget()).toBe(false);
    });
  });

  describe('recordUsage', () => {
    it('should record token usage correctly', () => {
      tracker.recordUsage('anthropic', 1000, 600, 400, 0.03);

      const usage = tracker.getUsage();
      expect(usage.totalTokens).toBe(1000);
      expect(usage.promptTokens).toBe(600);
      expect(usage.completionTokens).toBe(400);
    });

    it('should accumulate multiple usage records', () => {
      tracker.recordUsage('anthropic', 1000, 600, 400, 0.03);
      tracker.recordUsage('openai', 2000, 1200, 800, 0.06);

      const usage = tracker.getUsage();
      expect(usage.totalTokens).toBe(3000);
      expect(usage.promptTokens).toBe(1800);
      expect(usage.completionTokens).toBe(1200);
    });

    it('should track cost in USD', () => {
      tracker.recordUsage('anthropic', 1000, 600, 400, 0.05);
      tracker.recordUsage('openai', 2000, 1200, 800, 0.10);

      const usage = tracker.getUsage();
      expect(usage.costUSD).toBeCloseTo(0.15, 2);
    });

    it('should track provider-specific usage', () => {
      tracker.recordUsage('anthropic', 1000, 600, 400, 0.03);
      tracker.recordUsage('openai', 2000, 1200, 800, 0.06);

      const usage = tracker.getUsage();
      expect(usage.byProvider).toHaveProperty('anthropic');
      expect(usage.byProvider).toHaveProperty('openai');
      expect(usage.byProvider['anthropic'].totalTokens).toBe(1000);
      expect(usage.byProvider['openai'].totalTokens).toBe(2000);
    });
  });

  describe('getUsage', () => {
    it('should return zero usage initially', () => {
      const usage = tracker.getUsage();

      expect(usage.totalTokens).toBe(0);
      expect(usage.promptTokens).toBe(0);
      expect(usage.completionTokens).toBe(0);
      expect(usage.costUSD).toBe(0);
      expect(Object.keys(usage.byProvider)).toHaveLength(0);
    });

    it('should return correct usage statistics', () => {
      tracker.recordUsage('anthropic', 5000, 3000, 2000, 0.15);

      const usage = tracker.getUsage();
      expect(usage.totalTokens).toBe(5000);
      expect(usage.promptTokens).toBe(3000);
      expect(usage.completionTokens).toBe(2000);
      expect(usage.costUSD).toBeCloseTo(0.15, 2);
      expect(usage.budgetLimit).toBe(1000000);
      expect(usage.budgetRemaining).toBe(995000);
      expect(usage.budgetUsedPercent).toBeCloseTo(0.5, 2);
    });

    it('should calculate budget percentages correctly', () => {
      tracker.recordUsage('anthropic', 250000, 150000, 100000, 7.5);

      const usage = tracker.getUsage();
      expect(usage.budgetUsedPercent).toBeCloseTo(25, 2);
      expect(usage.budgetRemaining).toBe(750000);
    });
  });

  describe('getRemainingBudget', () => {
    it('should return full budget initially', () => {
      expect(tracker.getRemainingBudget()).toBe(1000000);
    });

    it('should return correct remaining budget after usage', () => {
      tracker.recordUsage('anthropic', 100000, 60000, 40000, 3.0);
      expect(tracker.getRemainingBudget()).toBe(900000);
    });

    it('should return zero when budget exceeded', () => {
      tracker.recordUsage('anthropic', 1500000, 900000, 600000, 45.0);
      expect(tracker.getRemainingBudget()).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset all usage statistics', () => {
      tracker.recordUsage('anthropic', 5000, 3000, 2000, 0.15);
      tracker.reset();

      const usage = tracker.getUsage();
      expect(usage.totalTokens).toBe(0);
      expect(usage.costUSD).toBe(0);
      expect(Object.keys(usage.byProvider)).toHaveLength(0);
    });

    it('should preserve budget limit after reset', () => {
      tracker.recordUsage('anthropic', 5000, 3000, 2000, 0.15);
      tracker.reset();

      expect(tracker.getRemainingBudget()).toBe(1000000);
      expect(tracker.checkBudget()).toBe(true);
    });
  });

  describe('custom budget limits', () => {
    it('should accept custom budget on initialization', () => {
      const customTracker = new BudgetTracker(500000);
      expect(customTracker.getRemainingBudget()).toBe(500000);
    });

    it('should respect custom budget limits', () => {
      const customTracker = new BudgetTracker(10000);
      customTracker.recordUsage('anthropic', 9000, 5000, 4000, 0.27);

      expect(customTracker.checkBudget()).toBe(true);

      customTracker.recordUsage('anthropic', 1001, 600, 401, 0.03);
      expect(customTracker.checkBudget()).toBe(false);
    });
  });

  describe('unlimited budget', () => {
    it('should support unlimited budget with zero or negative value', () => {
      const unlimitedTracker = new BudgetTracker(0);
      unlimitedTracker.recordUsage('anthropic', 10000000, 6000000, 4000000, 300.0);

      // Should always return true for unlimited budget
      expect(unlimitedTracker.checkBudget()).toBe(true);
    });
  });
});
