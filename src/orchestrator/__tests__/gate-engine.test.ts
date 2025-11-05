/**
 * Phase 4 WS-H Stage B/B2: Gate Engine Tests
 *
 * Tests for runtime gates, validation gates, and gate registry.
 * Validates gate evaluation logic and exit code computation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GateRegistry } from '../gates/gate-registry.js';
import type { GateInputs } from '../types/gate-engine.js';
import type { TokenMetrics } from '../types/run-summary.js';

describe('Gate Engine', () => {
  let registry: GateRegistry;

  beforeEach(() => {
    registry = new GateRegistry();
  });

  describe('Runtime Gates - Pass Scenarios', () => {
    it('should pass all runtime gates when inputs are valid', () => {
      const inputs: GateInputs = {
        coverage: {
          exportedEntityIds: ['e1', 'e2', 'e3'],
          entitiesWithChunks: ['e1', 'e2'],
          entitiesWithQIDs: ['e3']
        },
        link: {
          totalAnchors: 100,
          brokenLinks: []
        },
        grounding: {
          totalChunks: 150,
          validatedChunks: 120,
          fallbackChunks: 30,
          chunksWithMissingFactSetIds: [],
          diagnostics: []
        },
        determinism: {
          enabled: false,
          reruns: 0,
          diffs: 0
        },
        confidence: {
          openQuestions: 5,
          invalidConfidenceItems: []
        },
        monorepo: {
          hasRootSpec: true,
          packagesLinked: 0, // Not a monorepo
          brokenPackageLinks: 0
        },
        cost: { totalTokens: 8000, budget: 10000 },
        adversarial: { total: 20, rejected: 20 },
        testCoverage: { coverage: 85, threshold: 80 },
        readability: {},
        tokens: { total: 8000, budget: 10000, providers: { anthropic: 8000 } },
        warnings: []
      };

      const summary = registry.evaluateAll(inputs);

      expect(summary.gates.coverage.status).toBe('pass');
      expect(summary.gates.link.status).toBe('pass');
      expect(summary.gates.grounding.status).toBe('pass');
      expect(summary.gates.determinism.status).toBe('skip');
      expect(summary.gates.confidence.status).toBe('pass');
      expect(summary.gates.monorepo.status).toBe('skip');
      expect(summary.exitCode).toBe(0);
    });
  });

  describe('Runtime Gates - Failure Scenarios', () => {
    it('should fail coverage gate when entities missing documentation', () => {
      const inputs = createDefaultInputs();
      inputs.coverage = {
        exportedEntityIds: ['e1', 'e2', 'e3'],
        entitiesWithChunks: ['e1'],
        entitiesWithQIDs: []
      };

      const summary = registry.evaluateAll(inputs);

      expect(summary.gates.coverage.status).toBe('fail');
      expect(summary.gates.coverage.exported).toBe(3);
      expect(summary.gates.coverage.documented).toBe(1);
      expect(summary.exitCode).toBe(2);
    });

    it('should fail link gate when broken links present', () => {
      const inputs = createDefaultInputs();
      inputs.link = {
        totalAnchors: 50,
        brokenLinks: [
          { sourceFile: 'spec.md', lineNumber: 42, targetAnchor: '#missing' }
        ]
      };

      const summary = registry.evaluateAll(inputs);

      expect(summary.gates.link.status).toBe('fail');
      expect(summary.gates.link.broken).toBe(1);
      expect(summary.gates.link.brokenLinks).toHaveLength(1);
      expect(summary.exitCode).toBe(2);
    });

    it('should fail grounding gate when chunks missing factSetIds', () => {
      const inputs = createDefaultInputs();
      inputs.grounding = {
        totalChunks: 100,
        validatedChunks: 80,
        fallbackChunks: 18,
        chunksWithMissingFactSetIds: ['chunk-99', 'chunk-100'],
        diagnostics: []
      };

      const summary = registry.evaluateAll(inputs);

      expect(summary.gates.grounding.status).toBe('fail');
      expect(summary.gates.grounding.missingFactSetIds).toBe(2);
      expect(summary.exitCode).toBe(2);
    });

    it('should fail determinism gate when diffs detected', () => {
      const inputs = createDefaultInputs();
      inputs.determinism = {
        enabled: true,
        reruns: 2,
        diffs: 5
      };

      const summary = registry.evaluateAll(inputs);

      expect(summary.gates.determinism.status).toBe('fail');
      expect(summary.gates.determinism.diffs).toBe(5);
      expect(summary.exitCode).toBe(2);
    });

    it('should fail confidence gate when invalid confidence items present', () => {
      const inputs = createDefaultInputs();
      inputs.confidence = {
        openQuestions: 3,
        invalidConfidenceItems: ['e1', 'e2']
      };

      const summary = registry.evaluateAll(inputs);

      expect(summary.gates.confidence.status).toBe('fail');
      expect(summary.gates.confidence.invalid).toBe(2);
      expect(summary.exitCode).toBe(2);
    });

    it('should fail monorepo gate when root spec missing', () => {
      const inputs = createDefaultInputs();
      inputs.monorepo = {
        hasRootSpec: false,
        packagesLinked: 3,
        brokenPackageLinks: 0
      };

      const summary = registry.evaluateAll(inputs);

      expect(summary.gates.monorepo.status).toBe('fail');
      expect(summary.exitCode).toBe(2);
    });
  });

  describe('Validation Gates', () => {
    it('should report cost gate failure without affecting exit code', () => {
      const inputs = createDefaultInputs();
      inputs.cost = {
        totalTokens: 12000,
        budget: 10000
      };

      const summary = registry.evaluateAll(inputs);

      expect(summary.validation.cost.status).toBe('fail');
      expect(summary.validation.cost.remaining).toBe(-2000);
      // Cost gate failures cause exit code 2 (per Phase 4 acceptance criteria)
      expect(summary.exitCode).toBe(2);
    });

    it('should detect per-fixture threshold violations', () => {
      const inputs = createDefaultInputs();
      inputs.cost = {
        totalTokens: 9000,
        budget: 10000,
        perFixture: {
          'express-api': 35000, // Over 30k threshold
          'react-app': 38000 // Under 40k threshold
        }
      };

      const summary = registry.evaluateAll(inputs);

      expect(summary.validation.cost.status).toBe('fail');
      expect(summary.validation.cost.details?.fixtureViolations).toContain(
        'express-api: 35000 tokens (threshold: 30000)'
      );
    });

    it('should report adversarial gate failure with exit code 2', () => {
      const inputs = createDefaultInputs();
      inputs.adversarial = {
        total: 20,
        rejected: 18
      };

      const summary = registry.evaluateAll(inputs);

      expect(summary.validation.adversarial.status).toBe('fail');
      expect(summary.validation.adversarial.pass).toBe(false);
      // Adversarial gate failures cause exit code 2 (per Phase 4 acceptance criteria)
      expect(summary.exitCode).toBe(2);
    });

    it('should report test coverage failure with exit code 1', () => {
      const inputs = createDefaultInputs();
      inputs.testCoverage = {
        coverage: 75,
        threshold: 80
      };

      const summary = registry.evaluateAll(inputs);

      expect(summary.validation.testCoverage.status).toBe('fail');
      expect(summary.validation.testCoverage.pass).toBe(false);
      // Test coverage failures cause exit code 1 (test failure, per Phase 4 acceptance criteria)
      expect(summary.exitCode).toBe(1);
    });

    it('should skip readability gate when no review data', () => {
      const inputs = createDefaultInputs();
      inputs.readability = {};

      const summary = registry.evaluateAll(inputs);

      expect(summary.validation.readability.status).toBe('skip');
    });

    it('should evaluate readability gate when review data available', () => {
      const inputs = createDefaultInputs();
      inputs.readability = {
        avgScore: 8,
        threshold: 7,
        reviewLogPath: 'docs/PHASE4_READABILITY_REVIEW.md'
      };

      const summary = registry.evaluateAll(inputs);

      expect(summary.validation.readability.status).toBe('pass');
      expect(summary.validation.readability.pass).toBe(true);
    });
  });

  describe('Exit Code Computation', () => {
    it('should return exit code 0 when all runtime gates pass or skip', () => {
      const inputs = createDefaultInputs();
      const summary = registry.evaluateAll(inputs);

      expect(summary.exitCode).toBe(0);
      expect(registry.getFailedRuntimeGates(summary)).toHaveLength(0);
    });

    it('should return exit code 2 when any runtime gate fails', () => {
      const inputs = createDefaultInputs();
      inputs.coverage.exportedEntityIds = ['e1', 'e2'];
      inputs.coverage.entitiesWithChunks = ['e1'];
      inputs.coverage.entitiesWithQIDs = [];

      const summary = registry.evaluateAll(inputs);

      expect(summary.exitCode).toBe(2);
      expect(registry.getFailedRuntimeGates(summary)).toContain('coverage');
    });

    it('should return exit code 2 when multiple runtime gates fail', () => {
      const inputs = createDefaultInputs();
      inputs.coverage.exportedEntityIds = ['e1', 'e2'];
      inputs.coverage.entitiesWithChunks = ['e1'];
      inputs.coverage.entitiesWithQIDs = [];
      inputs.link.brokenLinks = [
        { sourceFile: 'spec.md', lineNumber: 10, targetAnchor: '#missing' }
      ];

      const summary = registry.evaluateAll(inputs);

      expect(summary.exitCode).toBe(2);
      const failedGates = registry.getFailedRuntimeGates(summary);
      expect(failedGates).toContain('coverage');
      expect(failedGates).toContain('link');
    });

    it('should prioritize test coverage failure (exit 1) over other gate failures (exit 2)', () => {
      const inputs = createDefaultInputs();
      // Fail test coverage, cost, and adversarial gates
      inputs.cost.totalTokens = 20000;
      inputs.cost.budget = 10000;
      inputs.adversarial.rejected = 10;
      inputs.testCoverage.coverage = 50;

      const summary = registry.evaluateAll(inputs);

      // Test coverage exit 1 takes precedence (per Phase 4 acceptance criteria)
      expect(summary.exitCode).toBe(1);
      expect(summary.validation.testCoverage.status).toBe('fail');
      expect(summary.validation.cost.status).toBe('fail');
      expect(summary.validation.adversarial.status).toBe('fail');
    });

    it('should not be affected by only readability gate failure', () => {
      const inputs = createDefaultInputs();
      // Only fail readability gate (truly advisory)
      inputs.readability = { avgScore: 4, threshold: 7 };

      const summary = registry.evaluateAll(inputs);

      // Only readability is advisory (doesn't affect exit code)
      expect(summary.exitCode).toBe(0);

      const failedValidationGates = registry.getFailedValidationGates(summary);
      expect(failedValidationGates).toContain('readability');
      expect(failedValidationGates).toHaveLength(1);
    });
  });

  describe('Token Metrics & Warnings', () => {
    it('should copy token metrics to run summary', () => {
      const inputs = createDefaultInputs();
      inputs.tokens = {
        total: 15000,
        budget: 20000,
        providers: { anthropic: 10000, openai: 5000 }
      };

      const summary = registry.evaluateAll(inputs);

      expect(summary.tokens.total).toBe(15000);
      expect(summary.tokens.budget).toBe(20000);
      expect(summary.tokens.providers.anthropic).toBe(10000);
      expect(summary.tokens.providers.openai).toBe(5000);
    });

    it('should copy warnings to run summary', () => {
      const inputs = createDefaultInputs();
      inputs.warnings = [
        'LLM budget exhausted: 5 chunks fell back to template',
        'Coverage gate failed: 3 entities missing documentation'
      ];

      const summary = registry.evaluateAll(inputs);

      expect(summary.warnings).toHaveLength(2);
      expect(summary.warnings[0]).toContain('budget exhausted');
      expect(summary.warnings[1]).toContain('Coverage gate failed');
    });
  });
});

/**
 * Helper to create valid default gate inputs.
 */
function createDefaultInputs(): GateInputs {
  return {
    coverage: {
      exportedEntityIds: ['e1', 'e2', 'e3'],
      entitiesWithChunks: ['e1', 'e2'],
      entitiesWithQIDs: ['e3']
    },
    link: {
      totalAnchors: 100,
      brokenLinks: []
    },
    grounding: {
      totalChunks: 150,
      validatedChunks: 120,
      fallbackChunks: 30,
      chunksWithMissingFactSetIds: [],
      diagnostics: []
    },
    determinism: {
      enabled: false,
      reruns: 0,
      diffs: 0
    },
    confidence: {
      openQuestions: 5,
      invalidConfidenceItems: []
    },
    monorepo: {
      hasRootSpec: true,
      packagesLinked: 0,
      brokenPackageLinks: 0
    },
    cost: {
      totalTokens: 8000,
      budget: 10000
    },
    adversarial: {
      total: 20,
      rejected: 20
    },
    testCoverage: {
      coverage: 85,
      threshold: 80
    },
    readability: {},
    tokens: {
      total: 8000,
      budget: 10000,
      providers: { anthropic: 8000 }
    },
    warnings: []
  };
}
