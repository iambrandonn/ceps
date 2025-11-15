/**
 * Tests for Enhanced Cost Tracker
 * Phase 0.4: Pre-conversion utility
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CostTracker,
  ANTHROPIC_PRICING,
  OPENAI_PRICING
} from '../../../src/llm/cost-tracker';

describe('CostTracker', () => {
  let tracker: CostTracker;

  beforeEach(() => {
    tracker = new CostTracker();
  });

  describe('Basic Tracking', () => {
    it('should start with zero usage', () => {
      const report = tracker.getReport();

      expect(report.totalCalls).toBe(0);
      expect(report.totalTokens).toBe(0);
      expect(report.totalCost).toBe(0);
      expect(Object.keys(report.byModel)).toHaveLength(0);
    });

    it('should track single model usage', () => {
      tracker.trackUsage('claude-3-5-sonnet-20241022', 1000, 500);

      const report = tracker.getReport();

      expect(report.totalCalls).toBe(1);
      expect(report.totalInputTokens).toBe(1000);
      expect(report.totalOutputTokens).toBe(500);
      expect(report.totalTokens).toBe(1500);

      // Expected cost: (1000/1M * $3) + (500/1M * $15) = $0.003 + $0.0075 = $0.0105
      expect(report.totalCost).toBeCloseTo(0.0105, 4);
    });

    it('should track multiple calls to same model', () => {
      tracker.trackUsage('claude-3-5-haiku-20241022', 1000, 200);
      tracker.trackUsage('claude-3-5-haiku-20241022', 500, 100);

      const report = tracker.getReport();

      expect(report.totalCalls).toBe(2);
      expect(report.totalInputTokens).toBe(1500);
      expect(report.totalOutputTokens).toBe(300);

      const haiku = report.byModel['claude-3-5-haiku-20241022'];
      expect(haiku.calls).toBe(2);
      expect(haiku.inputTokens).toBe(1500);
      expect(haiku.outputTokens).toBe(300);

      // Haiku: $0.25/1M input, $1.25/1M output
      // (1500/1M * 0.25) + (300/1M * 1.25) = 0.000375 + 0.000375 = 0.00075
      expect(haiku.estimatedCost).toBeCloseTo(0.00075, 5);
    });

    it('should track multiple models separately', () => {
      tracker.trackUsage('claude-3-5-sonnet-20241022', 1000, 500);
      tracker.trackUsage('claude-3-5-haiku-20241022', 2000, 400);

      const report = tracker.getReport();

      expect(report.totalCalls).toBe(2);
      expect(Object.keys(report.byModel)).toHaveLength(2);

      const sonnet = report.byModel['claude-3-5-sonnet-20241022'];
      const haiku = report.byModel['claude-3-5-haiku-20241022'];

      expect(sonnet.calls).toBe(1);
      expect(haiku.calls).toBe(1);

      // Sonnet: (1000/1M * 3) + (500/1M * 15) = 0.003 + 0.0075 = 0.0105
      expect(sonnet.estimatedCost).toBeCloseTo(0.0105, 4);

      // Haiku: (2000/1M * 0.25) + (400/1M * 1.25) = 0.0005 + 0.0005 = 0.001
      expect(haiku.estimatedCost).toBeCloseTo(0.001, 4);

      // Total: 0.0105 + 0.001 = 0.0115
      expect(report.totalCost).toBeCloseTo(0.0115, 4);
    });
  });

  describe('Pricing', () => {
    it('should use Anthropic pricing for known models', () => {
      tracker.trackUsage('claude-3-5-sonnet-20241022', 1_000_000, 1_000_000);

      const report = tracker.getReport();
      const sonnet = report.byModel['claude-3-5-sonnet-20241022'];

      // 1M input @ $3 + 1M output @ $15 = $18
      expect(sonnet.estimatedCost).toBeCloseTo(18, 2);
    });

    it('should use OpenAI pricing for OpenAI models', () => {
      tracker.trackUsage('gpt-4o', 1_000_000, 1_000_000);

      const report = tracker.getReport();
      const gpt4o = report.byModel['gpt-4o'];

      // 1M input @ $5 + 1M output @ $15 = $20
      expect(gpt4o.estimatedCost).toBeCloseTo(20, 2);
    });

    it('should use custom pricing when provided', () => {
      const customTracker = new CostTracker({
        'my-custom-model': {
          inputCostPerMillionTokens: 1.0,
          outputCostPerMillionTokens: 2.0
        }
      });

      customTracker.trackUsage('my-custom-model', 1_000_000, 1_000_000);

      const report = customTracker.getReport();
      const custom = report.byModel['my-custom-model'];

      // 1M input @ $1 + 1M output @ $2 = $3
      expect(custom.estimatedCost).toBeCloseTo(3, 2);
    });

    it('should fall back to Sonnet pricing for unknown models', () => {
      tracker.trackUsage('unknown-model', 1_000_000, 1_000_000);

      const report = tracker.getReport();
      const unknown = report.byModel['unknown-model'];

      // Should use Sonnet pricing: 1M @ $3 + 1M @ $15 = $18
      expect(unknown.estimatedCost).toBeCloseTo(18, 2);
    });
  });

  describe('Utility Methods', () => {
    it('should provide getEstimatedCost for planning', () => {
      const cost = tracker.getEstimatedCost('claude-3-5-sonnet-20241022', 10_000, 5_000);

      // (10k/1M * $3) + (5k/1M * $15) = $0.03 + $0.075 = $0.105
      expect(cost).toBeCloseTo(0.105, 4);
    });

    it('should provide getTotalCost convenience method', () => {
      tracker.trackUsage('claude-3-5-haiku-20241022', 1000, 500);

      const totalCost = tracker.getTotalCost();
      const report = tracker.getReport();

      expect(totalCost).toBe(report.totalCost);
    });

    it('should check threshold exceeded', () => {
      tracker.trackUsage('claude-3-5-sonnet-20241022', 1_000_000, 0);
      // Cost: $3

      expect(tracker.exceedsThreshold(2)).toBe(true);
      expect(tracker.exceedsThreshold(3)).toBe(false);
      expect(tracker.exceedsThreshold(4)).toBe(false);
    });
  });

  describe('Report Formatting', () => {
    it('should return empty report message when no usage', () => {
      const report = tracker.report();

      expect(report).toContain('No LLM usage recorded');
    });

    it('should format single model report', () => {
      tracker.trackUsage('claude-3-5-sonnet-20241022', 10_000, 5_000);

      const report = tracker.report();

      expect(report).toContain('=== LLM Cost Report ===');
      expect(report).toContain('Total Calls: 1');
      expect(report).toContain('Total Tokens: 15,000');
      expect(report).toContain('Input:  10,000');
      expect(report).toContain('Output: 5,000');
      expect(report).toContain('Estimated Cost:');
    });

    it('should format multi-model report with breakdown', () => {
      tracker.trackUsage('claude-3-5-sonnet-20241022', 10_000, 5_000);
      tracker.trackUsage('claude-3-5-haiku-20241022', 20_000, 10_000);

      const report = tracker.report();

      expect(report).toContain('By Model:');
      expect(report).toContain('claude-3-5-sonnet-20241022');
      expect(report).toContain('claude-3-5-haiku-20241022');
    });

    it('should sort models by cost descending', () => {
      // Haiku is cheaper per token
      tracker.trackUsage('claude-3-5-haiku-20241022', 100_000, 50_000);
      // Sonnet is more expensive
      tracker.trackUsage('claude-3-5-sonnet-20241022', 10_000, 5_000);

      const report = tracker.report();
      const lines = report.split('\n');

      // Find model lines
      const sonnetLine = lines.findIndex(l => l.includes('claude-3-5-sonnet'));
      const haikuLine = lines.findIndex(l => l.includes('claude-3-5-haiku'));

      // Sonnet should appear first (more expensive)
      expect(sonnetLine).toBeLessThan(haikuLine);
    });
  });

  describe('Reset', () => {
    it('should reset all tracking data', () => {
      tracker.trackUsage('claude-3-5-sonnet-20241022', 1000, 500);
      tracker.trackUsage('claude-3-5-haiku-20241022', 2000, 1000);

      tracker.reset();

      const report = tracker.getReport();
      expect(report.totalCalls).toBe(0);
      expect(report.totalTokens).toBe(0);
      expect(report.totalCost).toBe(0);
      expect(Object.keys(report.byModel)).toHaveLength(0);
    });
  });

  describe('Realistic Scenarios', () => {
    it('should track typical Haiku-only run (low cost)', () => {
      // Simulate 50 entities @ avg 2k input, 500 output tokens each
      for (let i = 0; i < 50; i++) {
        tracker.trackUsage('claude-3-5-haiku-20241022', 2000, 500);
      }

      const report = tracker.getReport();

      expect(report.totalCalls).toBe(50);
      expect(report.totalTokens).toBe(125_000); // 50 * 2500

      // Haiku: (100k/1M * 0.25) + (25k/1M * 1.25) = 0.025 + 0.03125 = ~$0.056
      expect(report.totalCost).toBeCloseTo(0.05625, 4);
      expect(report.totalCost).toBeLessThan(0.10); // Should be well under $0.10
    });

    it('should track typical Sonnet-only run (higher cost)', () => {
      // Simulate 50 entities @ avg 2k input, 500 output tokens each
      for (let i = 0; i < 50; i++) {
        tracker.trackUsage('claude-3-5-sonnet-20241022', 2000, 500);
      }

      const report = tracker.getReport();

      expect(report.totalCalls).toBe(50);

      // Sonnet: (100k/1M * 3) + (25k/1M * 15) = 0.3 + 0.375 = ~$0.675
      expect(report.totalCost).toBeCloseTo(0.675, 3);
      expect(report.totalCost).toBeGreaterThan(0.60);
      expect(report.totalCost).toBeLessThan(0.75);
    });

    it('should track mixed Haiku/Sonnet run (medium cost)', () => {
      // Simple entities: 30 @ Haiku
      for (let i = 0; i < 30; i++) {
        tracker.trackUsage('claude-3-5-haiku-20241022', 1500, 400);
      }

      // Complex entities: 20 @ Sonnet
      for (let i = 0; i < 20; i++) {
        tracker.trackUsage('claude-3-5-sonnet-20241022', 3000, 800);
      }

      const report = tracker.getReport();

      expect(report.totalCalls).toBe(50);

      const haiku = report.byModel['claude-3-5-haiku-20241022'];
      const sonnet = report.byModel['claude-3-5-sonnet-20241022'];

      expect(haiku.calls).toBe(30);
      expect(sonnet.calls).toBe(20);

      // Haiku: (45k/1M * 0.25) + (12k/1M * 1.25) = 0.01125 + 0.015 = $0.02625
      // Sonnet: (60k/1M * 3) + (16k/1M * 15) = 0.18 + 0.24 = $0.42
      // Total: ~$0.446
      expect(report.totalCost).toBeCloseTo(0.44625, 3);
      expect(report.totalCost).toBeGreaterThan(0.40);
      expect(report.totalCost).toBeLessThan(0.50);
    });

    it('should project full codebase cost (research-coi scale)', () => {
      // research-coi: 443 entities
      // Assume avg 3k input, 600 output per entity (Sonnet)
      for (let i = 0; i < 443; i++) {
        tracker.trackUsage('claude-3-5-sonnet-20241022', 3000, 600);
      }

      const report = tracker.getReport();

      expect(report.totalCalls).toBe(443);
      expect(report.totalTokens).toBe(443 * 3600); // 1,594,800 tokens

      // Input: 1.329M @ $3 = $3.987
      // Output: 265.8k @ $15 = $3.987
      // Total: ~$7.97
      expect(report.totalCost).toBeGreaterThan(7.5);
      expect(report.totalCost).toBeLessThan(8.5);
    });
  });
});
