/**
 * Phase 4 WS-H Stage B2: Validation Gate Evaluators
 *
 * Production implementations of validation gate evaluators.
 * These gates are ADVISORY ONLY and do NOT affect exit code.
 * Failures are logged as warnings in the run summary.
 *
 * **CTS Reference:** Phase 4 §5.2 (Validation Gates)
 */

import type { GateEvaluator } from '../types/gate-engine.js';
import type {
  CostGateInput,
  AdversarialGateInput,
  TestCoverageGateInput,
  ReadabilityGateInput
} from '../types/gate-engine.js';
import type {
  CostGateResult,
  AdversarialGateResult,
  TestCoverageGateResult,
  ReadabilityGateResult
} from '../types/run-summary.js';

/**
 * Cost Gate: Validates token usage against budget and per-fixture thresholds.
 * Advisory only - budget exhaustion does not fail the run.
 *
 * Per Phase 4 §5.2:
 * - Express API: ≤30k tokens
 * - React app: ≤40k tokens
 * - Small monorepo: ≤100k tokens
 */
export class CostGateEvaluator implements GateEvaluator<CostGateInput, CostGateResult> {
  private fixtureThresholds: Record<string, number> = {
    'express-api': 30000,
    'react-app': 40000,
    'monorepo-small': 100000
  };

  evaluate(input: CostGateInput): CostGateResult {
    const remaining = input.budget - input.totalTokens;
    const overBudget = input.totalTokens > input.budget;

    // Check per-fixture thresholds if available
    const fixtureViolations: string[] = [];
    if (input.perFixture) {
      for (const [fixture, usage] of Object.entries(input.perFixture)) {
        const threshold = this.fixtureThresholds[fixture];
        if (threshold && usage > threshold) {
          fixtureViolations.push(
            `${fixture}: ${usage} tokens (threshold: ${threshold})`
          );
        }
      }
    }

    // Advisory failure if over budget or fixture thresholds violated
    const failed = overBudget || fixtureViolations.length > 0;

    return {
      status: failed ? 'fail' : 'pass',
      budget: input.budget,
      used: input.totalTokens,
      remaining,
      perFixture: input.perFixture,
      details: failed
        ? {
            overBudget,
            fixtureViolations:
              fixtureViolations.length > 0 ? fixtureViolations : undefined
          }
        : undefined
    };
  }
}

/**
 * Adversarial Gate: Validates that validator rejects all adversarial test cases.
 * Advisory only - adversarial suite failures logged as warnings.
 *
 * Per Phase 4 §5.2, 100% of adversarial tests must be rejected.
 */
export class AdversarialGateEvaluator
  implements GateEvaluator<AdversarialGateInput, AdversarialGateResult>
{
  evaluate(input: AdversarialGateInput): AdversarialGateResult {
    // Skip if no adversarial tests
    if (input.total === 0) {
      return {
        status: 'skip',
        total: 0,
        rejected: 0,
        pass: true
      };
    }

    // Pass if all adversarial cases rejected
    const pass = input.rejected === input.total;

    return {
      status: pass ? 'pass' : 'fail',
      total: input.total,
      rejected: input.rejected,
      pass,
      details: !pass
        ? {
            notRejected: input.total - input.rejected,
            rejectionRate: ((input.rejected / input.total) * 100).toFixed(1) + '%'
          }
        : undefined
    };
  }
}

/**
 * Test Coverage Gate: Validates branch coverage meets threshold.
 * Advisory only - coverage below threshold logged as warning.
 *
 * Per Phase 4 §5.2, target ≥80% branch coverage for all workstreams.
 */
export class TestCoverageGateEvaluator
  implements GateEvaluator<TestCoverageGateInput, TestCoverageGateResult>
{
  evaluate(input: TestCoverageGateInput): TestCoverageGateResult {
    const pass = input.coverage >= input.threshold;

    return {
      status: pass ? 'pass' : 'fail',
      coverage: input.coverage,
      threshold: input.threshold,
      pass,
      details: !pass
        ? {
            shortfall: input.threshold - input.coverage,
            message: `Coverage ${input.coverage.toFixed(1)}% is below threshold ${input.threshold}%`
          }
        : undefined
    };
  }
}

/**
 * Readability Gate: Validates manual review scores if available.
 * Advisory only - manual review is optional.
 *
 * Per Phase 4 §5.2:
 * - LLM-on target: ≥7/10 aggregate score
 * - Template baseline target: ≥5/10 aggregate score
 * - Manual review log: docs/PHASE4_READABILITY_REVIEW.md
 */
export class ReadabilityGateEvaluator
  implements GateEvaluator<ReadabilityGateInput, ReadabilityGateResult>
{
  evaluate(input: ReadabilityGateInput): ReadabilityGateResult {
    // Skip if no review data
    if (input.avgScore === undefined || input.threshold === undefined) {
      return {
        status: 'skip',
        details: { message: 'Manual review not performed (optional)' }
      };
    }

    const pass = input.avgScore >= input.threshold;

    return {
      status: pass ? 'pass' : 'fail',
      avgScore: input.avgScore,
      threshold: input.threshold,
      pass,
      reviewLogPath: input.reviewLogPath,
      details: !pass
        ? {
            shortfall: input.threshold - input.avgScore,
            message: `Average score ${input.avgScore.toFixed(1)} is below threshold ${input.threshold}`
          }
        : undefined
    };
  }
}
