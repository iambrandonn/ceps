/**
 * Phase 4 WS-H Stage D: Run Summary Renderer Tests
 *
 * Tests JSON rendering, console rendering, and schema validation.
 */

import { describe, it, expect } from 'vitest';
import {
  renderJSON,
  renderConsole,
  validateRunSummary
} from '../rendering/run-summary-renderer.js';
import { createDefaultRunSummary } from '../types/run-summary.js';
import type { RunSummary } from '../types/run-summary.js';

describe('Run Summary Renderer', () => {
  describe('JSON Rendering', () => {
    it('should render valid JSON for default summary', () => {
      const summary = createDefaultRunSummary();
      const json = renderJSON(summary);

      expect(json).toBeTruthy();
      expect(() => JSON.parse(json)).not.toThrow();

      const parsed = JSON.parse(json);
      expect(parsed.exitCode).toBe(0);
      expect(parsed.gates).toBeDefined();
      expect(parsed.validation).toBeDefined();
    });

    it('should render valid JSON for complete success scenario', () => {
      const summary: RunSummary = {
        gates: {
          coverage: { status: 'pass', exported: 45, documented: 45, qids: 0 },
          link: { status: 'pass', anchors: 123, broken: 0 },
          grounding: { status: 'pass', chunks: 287, validated: 245, fallback: 42 },
          determinism: { status: 'pass', reruns: 2, diffs: 0 },
          confidence: { status: 'pass', openQuestions: 5 },
          monorepo: { status: 'pass', hasRootSpec: true, packagesLinked: 3 }
        },
        validation: {
          cost: { status: 'pass', budget: 30000, used: 28450, remaining: 1550 },
          adversarial: { status: 'pass', total: 23, rejected: 23, pass: true },
          testCoverage: { status: 'pass', coverage: 85.3, threshold: 80, pass: true },
          readability: { status: 'skip' }
        },
        tokens: {
          total: 28450,
          budget: 30000,
          providers: { anthropic: 28450 }
        },
        warnings: [],
        exitCode: 0,
        timestamp: new Date().toISOString(),
        version: 'phase4-ws-h'
      };

      const json = renderJSON(summary);
      const parsed = JSON.parse(json);

      expect(parsed.gates.coverage.status).toBe('pass');
      expect(parsed.validation.cost.remaining).toBe(1550);
    });

    it('should validate against schema before rendering', () => {
      const summary = createDefaultRunSummary();

      // Should not throw (valid summary)
      expect(() => renderJSON(summary, true)).not.toThrow();
    });

    it('should skip validation when requested', () => {
      const summary = createDefaultRunSummary();
      const json = renderJSON(summary, false);

      expect(json).toBeTruthy();
    });
  });

  describe('Console Rendering', () => {
    it('should render console output for default summary', () => {
      const summary = createDefaultRunSummary();
      const console = renderConsole(summary);

      expect(console).toContain('ceps Run Summary');
      expect(console).toContain('Runtime Gates');
      expect(console).toContain('Validation Gates');
      expect(console).toContain('Exit Code: 0');
    });

    it('should show pass symbols for passing gates', () => {
      const summary: RunSummary = {
        gates: {
          coverage: { status: 'pass', exported: 10, documented: 10, qids: 0 },
          link: { status: 'pass', anchors: 50, broken: 0 },
          grounding: { status: 'pass', chunks: 100, validated: 100, fallback: 0 },
          determinism: { status: 'skip', reruns: 0, diffs: 0 },
          confidence: { status: 'pass', openQuestions: 2 },
          monorepo: { status: 'skip', hasRootSpec: true, packagesLinked: 0 }
        },
        validation: {
          cost: { status: 'pass', budget: 10000, used: 8000, remaining: 2000 },
          adversarial: { status: 'pass', total: 20, rejected: 20, pass: true },
          testCoverage: { status: 'pass', coverage: 85, threshold: 80, pass: true },
          readability: { status: 'skip' }
        },
        tokens: { total: 8000, budget: 10000, providers: { anthropic: 8000 } },
        warnings: [],
        exitCode: 0,
        timestamp: new Date().toISOString(),
        version: 'phase4-ws-h'
      };

      const console = renderConsole(summary);

      expect(console).toContain('✓ [PASS ]');
      expect(console).toContain('○ [SKIP ]');
      expect(console).toContain('✓ Exit Code: 0 (Success)');
    });

    it('should show fail symbols for failing gates', () => {
      const summary: RunSummary = {
        gates: {
          coverage: { status: 'fail', exported: 10, documented: 8, qids: 0 },
          link: { status: 'pass', anchors: 50, broken: 0 },
          grounding: { status: 'pass', chunks: 100, validated: 100, fallback: 0 },
          determinism: { status: 'skip', reruns: 0, diffs: 0 },
          confidence: { status: 'pass', openQuestions: 2 },
          monorepo: { status: 'skip', hasRootSpec: true, packagesLinked: 0 }
        },
        validation: {
          cost: { status: 'pass', budget: 10000, used: 8000, remaining: 2000 },
          adversarial: { status: 'pass', total: 20, rejected: 20, pass: true },
          testCoverage: { status: 'pass', coverage: 85, threshold: 80, pass: true },
          readability: { status: 'skip' }
        },
        tokens: { total: 8000, budget: 10000, providers: { anthropic: 8000 } },
        warnings: [],
        exitCode: 2,
        timestamp: new Date().toISOString(),
        version: 'phase4-ws-h'
      };

      const console = renderConsole(summary);

      expect(console).toContain('✗ [FAIL ]');
      expect(console).toContain('✗ Exit Code: 2 (Gate Failure)');
    });

    it('should display token usage when present', () => {
      const summary: RunSummary = {
        ...createDefaultRunSummary(),
        tokens: {
          total: 15000,
          budget: 20000,
          providers: {
            anthropic: 10000,
            openai: 5000
          }
        }
      };

      const console = renderConsole(summary);

      expect(console).toContain('Token Usage:');
      expect(console).toContain('15,000 tokens');
      expect(console).toContain('anthropic: 10,000 tokens');
      expect(console).toContain('openai: 5,000 tokens');
    });

    it('should display warnings when present', () => {
      const summary: RunSummary = {
        ...createDefaultRunSummary(),
        warnings: [
          'LLM budget exhausted: 5 chunks fell back to template',
          'Coverage gate failed: 3 entities missing documentation'
        ]
      };

      const console = renderConsole(summary);

      expect(console).toContain('Warnings:');
      expect(console).toContain('⚠  LLM budget exhausted');
      expect(console).toContain('⚠  Coverage gate failed');
    });

    it('should handle multiple provider token usage', () => {
      const summary: RunSummary = {
        ...createDefaultRunSummary(),
        tokens: {
          total: 25000,
          budget: 30000,
          providers: {
            anthropic: 15000,
            openai: 8000,
            azure: 2000
          }
        }
      };

      const console = renderConsole(summary);

      expect(console).toContain('anthropic: 15,000 tokens');
      expect(console).toContain('openai: 8,000 tokens');
      expect(console).toContain('azure: 2,000 tokens');
    });
  });

  describe('Schema Validation', () => {
    it('should validate valid run summary', () => {
      const summary = createDefaultRunSummary();
      expect(() => validateRunSummary(summary)).not.toThrow();
    });

    it('should reject summary with missing required fields', () => {
      const invalidSummary = {
        gates: {},
        // Missing validation, tokens, warnings, exitCode, timestamp, version
      } as any;

      expect(() => validateRunSummary(invalidSummary)).toThrow(
        'Run summary validation failed'
      );
    });

    it('should reject summary with invalid exit code', () => {
      const invalidSummary = {
        ...createDefaultRunSummary(),
        exitCode: 5 // Invalid: must be 0, 1, 2, or 3
      } as any;

      expect(() => validateRunSummary(invalidSummary)).toThrow();
    });

    it('should reject summary with invalid gate status', () => {
      const invalidSummary = {
        ...createDefaultRunSummary(),
        gates: {
          ...createDefaultRunSummary().gates,
          coverage: {
            status: 'invalid' as any,
            exported: 0,
            documented: 0,
            qids: 0
          }
        }
      };

      expect(() => validateRunSummary(invalidSummary)).toThrow();
    });
  });
});
