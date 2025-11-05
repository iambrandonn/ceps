/**
 * Phase 4 WS-H Stage F: Gate Integration Tests
 *
 * Integration tests verifying gate scenarios, exit codes, and run summary output.
 * Tests the full gate evaluation pipeline with realistic scenarios.
 *
 * **CTS Reference:** CTS-07 §5 (Gates & Exit Codes), Phase 4 WS-H Stage F
 */

import { describe, it, expect } from 'vitest';
import { GateRegistry } from '../gates/gate-registry.js';
import { renderJSON, renderConsole } from '../rendering/run-summary-renderer.js';
import type { GateInputs } from '../types/gate-engine.js';
import type { RunSummary } from '../types/run-summary.js';

describe('Gate Integration Scenarios', () => {
  describe('All Gates Pass', () => {
    it('should return exit code 0 when all gates pass', () => {
      const registry = new GateRegistry();
      const inputs = createAllPassInputs();
      const summary = registry.evaluateAll(inputs);

      expect(summary.exitCode).toBe(0);
      expect(summary.gates.coverage.status).toBe('pass');
      expect(summary.gates.link.status).toBe('pass');
      expect(summary.gates.grounding.status).toBe('pass');
      expect(summary.validation.cost.status).toBe('pass');

      const failedGates = registry.getFailedRuntimeGates(summary);
      expect(failedGates).toHaveLength(0);
    });

    it('should produce valid JSON output', () => {
      const registry = new GateRegistry();
      const inputs = createAllPassInputs();
      const summary = registry.evaluateAll(inputs);

      const json = renderJSON(summary, true); // Validate schema
      expect(() => JSON.parse(json)).not.toThrow();

      const parsed = JSON.parse(json);
      expect(parsed.exitCode).toBe(0);
    });

    it('should produce human-readable console output', () => {
      const registry = new GateRegistry();
      const inputs = createAllPassInputs();
      const summary = registry.evaluateAll(inputs);

      const console = renderConsole(summary);

      expect(console).toContain('ceps Run Summary');
      expect(console).toContain('✓ [PASS ]');
      expect(console).toContain('Exit Code: 0');
    });
  });

  describe('Runtime Gate Failures', () => {
    it('should return exit code 2 when coverage gate fails', () => {
      const registry = new GateRegistry();
      const inputs = createCoverageFailureInputs();
      const summary = registry.evaluateAll(inputs);

      expect(summary.exitCode).toBe(2);
      expect(summary.gates.coverage.status).toBe('fail');

      const failedGates = registry.getFailedRuntimeGates(summary);
      expect(failedGates).toContain('coverage');
    });

    it('should return exit code 2 when link gate fails', () => {
      const registry = new GateRegistry();
      const inputs = createLinkFailureInputs();
      const summary = registry.evaluateAll(inputs);

      expect(summary.exitCode).toBe(2);
      expect(summary.gates.link.status).toBe('fail');
      expect(summary.gates.link.broken).toBeGreaterThan(0);

      const failedGates = registry.getFailedRuntimeGates(summary);
      expect(failedGates).toContain('link');
    });

    it('should return exit code 2 when grounding gate fails', () => {
      const registry = new GateRegistry();
      const inputs = createGroundingFailureInputs();
      const summary = registry.evaluateAll(inputs);

      expect(summary.exitCode).toBe(2);
      expect(summary.gates.grounding.status).toBe('fail');
      expect(summary.gates.grounding.missingFactSetIds).toBeGreaterThan(0);

      const failedGates = registry.getFailedRuntimeGates(summary);
      expect(failedGates).toContain('grounding');
    });

    it('should return exit code 2 when multiple runtime gates fail', () => {
      const registry = new GateRegistry();
      const inputs = createMultipleRuntimeFailuresInputs();
      const summary = registry.evaluateAll(inputs);

      expect(summary.exitCode).toBe(2);

      const failedGates = registry.getFailedRuntimeGates(summary);
      expect(failedGates.length).toBeGreaterThan(1);
      expect(failedGates).toContain('coverage');
      expect(failedGates).toContain('link');
    });
  });

  describe('Cost and Adversarial Gate Failures (Exit Code 2)', () => {
    it('should return exit code 2 when cost gate fails', () => {
      const registry = new GateRegistry();
      const inputs = createCostFailureInputs();
      const summary = registry.evaluateAll(inputs);

      // Cost gate failures cause exit code 2 (per Phase 4 acceptance criteria)
      expect(summary.exitCode).toBe(2);
      expect(summary.validation.cost.status).toBe('fail');

      const failedGates = registry.getFailedGatesExitCode2(summary);
      expect(failedGates).toContain('cost');
    });

    it('should return exit code 2 when adversarial gate fails', () => {
      const registry = new GateRegistry();
      const inputs = createAdversarialFailureInputs();
      const summary = registry.evaluateAll(inputs);

      // Adversarial gate failures cause exit code 2 (per Phase 4 acceptance criteria)
      expect(summary.exitCode).toBe(2);
      expect(summary.validation.adversarial.status).toBe('fail');

      const failedGates = registry.getFailedGatesExitCode2(summary);
      expect(failedGates).toContain('adversarial');
    });
  });

  describe('Test Coverage Gate Failures (Exit Code 1)', () => {
    it('should return exit code 1 when test coverage gate fails', () => {
      const registry = new GateRegistry();
      const inputs = createTestCoverageFailureInputs();
      const summary = registry.evaluateAll(inputs);

      // Test coverage failures cause exit code 1 (test failure)
      expect(summary.exitCode).toBe(1);
      expect(summary.validation.testCoverage.status).toBe('fail');
    });

    it('should prioritize test coverage failure (exit 1) over gate failures (exit 2)', () => {
      const registry = new GateRegistry();
      const inputs = createTestCoverageAndRuntimeFailureInputs();
      const summary = registry.evaluateAll(inputs);

      // Exit 1 takes precedence over exit 2
      expect(summary.exitCode).toBe(1);
      expect(summary.validation.testCoverage.status).toBe('fail');
      expect(summary.gates.coverage.status).toBe('fail');
    });
  });

  describe('Readability Gate (Advisory Only)', () => {
    it('should return exit code 0 when only readability gate fails', () => {
      const registry = new GateRegistry();
      const inputs = createReadabilityFailureInputs();
      const summary = registry.evaluateAll(inputs);

      // Readability is the only truly advisory gate
      expect(summary.exitCode).toBe(0);
      expect(summary.validation.readability.status).toBe('fail');

      const failedValidationGates = registry.getFailedValidationGates(summary);
      expect(failedValidationGates).toContain('readability');
    });
  });

  describe('Mixed Failures', () => {
    it('should return exit code 2 when both runtime and cost gates fail', () => {
      const registry = new GateRegistry();
      const inputs = createMixedFailuresInputs();
      const summary = registry.evaluateAll(inputs);

      // Both runtime and cost gate failures → exit 2
      expect(summary.exitCode).toBe(2);

      const failedRuntimeGates = registry.getFailedRuntimeGates(summary);
      const failedGatesExitCode2 = registry.getFailedGatesExitCode2(summary);

      expect(failedRuntimeGates.length).toBeGreaterThan(0);
      expect(failedGatesExitCode2).toContain('coverage');
      expect(failedGatesExitCode2).toContain('cost');
    });
  });

  describe('Schema Validation', () => {
    it('should produce schema-valid JSON for all scenarios', () => {
      const registry = new GateRegistry();
      const scenarios = [
        createAllPassInputs(),
        createCoverageFailureInputs(),
        createCostFailureInputs(),
        createMixedFailuresInputs()
      ];

      for (const inputs of scenarios) {
        const summary = registry.evaluateAll(inputs);

        // Should not throw
        expect(() => renderJSON(summary, true)).not.toThrow();
      }
    });
  });

  describe('Skip Gates', () => {
    it('should handle skipped gates correctly', () => {
      const registry = new GateRegistry();
      const inputs = createSkippedGatesInputs();
      const summary = registry.evaluateAll(inputs);

      expect(summary.exitCode).toBe(0);
      expect(summary.gates.determinism.status).toBe('skip');
      expect(summary.gates.monorepo.status).toBe('skip');
      expect(summary.validation.readability.status).toBe('skip');
    });
  });
});

// =============================================================================
// Helper Functions to Create Test Inputs
// =============================================================================

/**
 * Creates inputs where all gates pass.
 */
function createAllPassInputs(): GateInputs {
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
      hasRootSpec: false,
      packagesLinked: 0,
      brokenPackageLinks: 0
    },
    cost: { totalTokens: 8000, budget: 10000 },
    adversarial: { total: 20, rejected: 20 },
    testCoverage: { coverage: 85, threshold: 80 },
    readability: {},
    tokens: { total: 8000, budget: 10000, providers: { anthropic: 8000 } },
    warnings: []
  };
}

/**
 * Creates inputs where coverage gate fails.
 */
function createCoverageFailureInputs(): GateInputs {
  const inputs = createAllPassInputs();
  inputs.coverage = {
    exportedEntityIds: ['e1', 'e2', 'e3'],
    entitiesWithChunks: ['e1'],
    entitiesWithQIDs: []
  };
  return inputs;
}

/**
 * Creates inputs where link gate fails.
 */
function createLinkFailureInputs(): GateInputs {
  const inputs = createAllPassInputs();
  inputs.link = {
    totalAnchors: 100,
    brokenLinks: [
      {
        sourceFile: '/spec/dir1/spec.md',
        lineNumber: 42,
        targetAnchor: '#missing-anchor'
      }
    ]
  };
  return inputs;
}

/**
 * Creates inputs where grounding gate fails.
 */
function createGroundingFailureInputs(): GateInputs {
  const inputs = createAllPassInputs();
  inputs.grounding = {
    totalChunks: 150,
    validatedChunks: 100,
    fallbackChunks: 30,
    chunksWithMissingFactSetIds: ['chunk-1', 'chunk-2', 'chunk-3'],
    diagnostics: []
  };
  return inputs;
}

/**
 * Creates inputs where multiple runtime gates fail.
 */
function createMultipleRuntimeFailuresInputs(): GateInputs {
  const inputs = createAllPassInputs();
  inputs.coverage = {
    exportedEntityIds: ['e1', 'e2', 'e3'],
    entitiesWithChunks: ['e1'],
    entitiesWithQIDs: []
  };
  inputs.link = {
    totalAnchors: 100,
    brokenLinks: [
      {
        sourceFile: '/spec/dir1/spec.md',
        lineNumber: 42,
        targetAnchor: '#missing-anchor'
      }
    ]
  };
  return inputs;
}

/**
 * Creates inputs where cost gate fails (budget exceeded).
 */
function createCostFailureInputs(): GateInputs {
  const inputs = createAllPassInputs();
  inputs.cost = { totalTokens: 12000, budget: 10000 };
  inputs.tokens = { total: 12000, budget: 10000, providers: { anthropic: 12000 } };
  return inputs;
}

/**
 * Creates inputs where adversarial gate fails.
 */
function createAdversarialFailureInputs(): GateInputs {
  const inputs = createAllPassInputs();
  inputs.adversarial = { total: 20, rejected: 15 }; // 5 cases not rejected
  return inputs;
}

/**
 * Creates inputs where test coverage gate fails.
 */
function createTestCoverageFailureInputs(): GateInputs {
  const inputs = createAllPassInputs();
  inputs.testCoverage = { coverage: 70, threshold: 80 }; // Below threshold
  return inputs;
}

/**
 * Creates inputs where test coverage and runtime gates fail.
 */
function createTestCoverageAndRuntimeFailureInputs(): GateInputs {
  const inputs = createAllPassInputs();
  inputs.testCoverage = { coverage: 70, threshold: 80 };
  inputs.coverage = {
    exportedEntityIds: ['e1', 'e2', 'e3'],
    entitiesWithChunks: ['e1'],
    entitiesWithQIDs: []
  };
  return inputs;
}

/**
 * Creates inputs where readability gate fails.
 */
function createReadabilityFailureInputs(): GateInputs {
  const inputs = createAllPassInputs();
  inputs.readability = {
    avgScore: 4.5,
    threshold: 7.0
  };
  return inputs;
}

/**
 * Creates inputs where both runtime and validation gates fail.
 */
function createMixedFailuresInputs(): GateInputs {
  const inputs = createAllPassInputs();
  // Runtime gate failure
  inputs.coverage = {
    exportedEntityIds: ['e1', 'e2', 'e3'],
    entitiesWithChunks: ['e1'],
    entitiesWithQIDs: []
  };
  // Validation gate failure
  inputs.cost = { totalTokens: 12000, budget: 10000 };
  inputs.tokens = { total: 12000, budget: 10000, providers: { anthropic: 12000 } };
  return inputs;
}

/**
 * Creates inputs with skipped gates.
 */
function createSkippedGatesInputs(): GateInputs {
  const inputs = createAllPassInputs();
  inputs.determinism = {
    enabled: false,
    reruns: 0,
    diffs: 0
  };
  inputs.monorepo = {
    hasRootSpec: false,
    packagesLinked: 0,
    brokenPackageLinks: 0
  };
  inputs.readability = {}; // No review data
  return inputs;
}
