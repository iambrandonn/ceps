/**
 * Phase 4 WS-H Stage A: Mock Gate Evaluators
 *
 * Configurable mocks for testing gate evaluation logic.
 * These mocks allow tests to simulate gate pass/fail scenarios
 * without requiring full KB/Generator/Validator integration.
 */

import type {
  GateEvaluator,
  CoverageGateInput,
  LinkGateInput,
  GroundingGateInput,
  DeterminismGateInput,
  ConfidenceGateInput,
  MonorepoGateInput,
  CostGateInput,
  AdversarialGateInput,
  TestCoverageGateInput,
  ReadabilityGateInput
} from '../types/gate-engine.js';

import type {
  CoverageGateResult,
  LinkGateResult,
  GroundingGateResult,
  DeterminismGateResult,
  ConfidenceGateResult,
  MonorepoGateResult,
  CostGateResult,
  AdversarialGateResult,
  TestCoverageGateResult,
  ReadabilityGateResult,
  GateStatus
} from '../types/run-summary.js';

/**
 * Configurable mock for Coverage Gate.
 * Default behavior: pass if all exported entities documented or have QIDs.
 */
export class MockCoverageGateEvaluator
  implements GateEvaluator<CoverageGateInput, CoverageGateResult>
{
  private nextResult?: CoverageGateResult;

  setNextResult(result: CoverageGateResult): void {
    this.nextResult = result;
  }

  evaluate(input: CoverageGateInput): CoverageGateResult {
    if (this.nextResult) {
      const result = this.nextResult;
      this.nextResult = undefined;
      return result;
    }

    // Default logic: pass if all exported entities have chunks or QIDs
    const documented = new Set([...input.entitiesWithChunks, ...input.entitiesWithQIDs]);
    const missing = input.exportedEntityIds.filter(id => !documented.has(id));

    return {
      status: missing.length === 0 ? 'pass' : 'fail',
      exported: input.exportedEntityIds.length,
      documented: documented.size,
      qids: input.entitiesWithQIDs.length
    };
  }
}

/**
 * Configurable mock for Link Gate.
 * Default behavior: pass if no broken links.
 */
export class MockLinkGateEvaluator implements GateEvaluator<LinkGateInput, LinkGateResult> {
  private nextResult?: LinkGateResult;

  setNextResult(result: LinkGateResult): void {
    this.nextResult = result;
  }

  evaluate(input: LinkGateInput): LinkGateResult {
    if (this.nextResult) {
      const result = this.nextResult;
      this.nextResult = undefined;
      return result;
    }

    // Default logic: pass if no broken links
    return {
      status: input.brokenLinks.length === 0 ? 'pass' : 'fail',
      anchors: input.totalAnchors,
      broken: input.brokenLinks.length,
      brokenLinks: input.brokenLinks.length > 0 ? input.brokenLinks : undefined
    };
  }
}

/**
 * Configurable mock for Grounding Gate.
 * Default behavior: pass if all chunks have factSetIds and (validated or fallback).
 */
export class MockGroundingGateEvaluator
  implements GateEvaluator<GroundingGateInput, GroundingGateResult>
{
  private nextResult?: GroundingGateResult;

  setNextResult(result: GroundingGateResult): void {
    this.nextResult = result;
  }

  evaluate(input: GroundingGateInput): GroundingGateResult {
    if (this.nextResult) {
      const result = this.nextResult;
      this.nextResult = undefined;
      return result;
    }

    // Default logic: fail if any chunks missing factSetIds
    const hasMissingFactSetIds = input.chunksWithMissingFactSetIds.length > 0;

    return {
      status: hasMissingFactSetIds ? 'fail' : 'pass',
      chunks: input.totalChunks,
      validated: input.validatedChunks,
      fallback: input.fallbackChunks,
      missingFactSetIds: hasMissingFactSetIds ? input.chunksWithMissingFactSetIds.length : undefined
    };
  }
}

/**
 * Configurable mock for Determinism Gate.
 * Default behavior: pass if no diffs, skip if not enabled.
 */
export class MockDeterminismGateEvaluator
  implements GateEvaluator<DeterminismGateInput, DeterminismGateResult>
{
  private nextResult?: DeterminismGateResult;

  setNextResult(result: DeterminismGateResult): void {
    this.nextResult = result;
  }

  evaluate(input: DeterminismGateInput): DeterminismGateResult {
    if (this.nextResult) {
      const result = this.nextResult;
      this.nextResult = undefined;
      return result;
    }

    // Default logic: skip if not enabled, else pass if no diffs
    if (!input.enabled) {
      return { status: 'skip', reruns: 0, diffs: 0 };
    }

    return {
      status: input.diffs === 0 ? 'pass' : 'fail',
      reruns: input.reruns,
      diffs: input.diffs
    };
  }
}

/**
 * Configurable mock for Confidence Gate.
 * Default behavior: always pass (Low confidence → Open Questions is acceptable).
 */
export class MockConfidenceGateEvaluator
  implements GateEvaluator<ConfidenceGateInput, ConfidenceGateResult>
{
  private nextResult?: ConfidenceGateResult;

  setNextResult(result: ConfidenceGateResult): void {
    this.nextResult = result;
  }

  evaluate(input: ConfidenceGateInput): ConfidenceGateResult {
    if (this.nextResult) {
      const result = this.nextResult;
      this.nextResult = undefined;
      return result;
    }

    // Default logic: fail only if invalid confidence items present
    const hasInvalid = input.invalidConfidenceItems.length > 0;

    return {
      status: hasInvalid ? 'fail' : 'pass',
      openQuestions: input.openQuestions,
      invalid: hasInvalid ? input.invalidConfidenceItems.length : undefined
    };
  }
}

/**
 * Configurable mock for Monorepo Gate.
 * Default behavior: pass if root spec exists and no broken package links.
 */
export class MockMonorepoGateEvaluator
  implements GateEvaluator<MonorepoGateInput, MonorepoGateResult>
{
  private nextResult?: MonorepoGateResult;

  setNextResult(result: MonorepoGateResult): void {
    this.nextResult = result;
  }

  evaluate(input: MonorepoGateInput): MonorepoGateResult {
    if (this.nextResult) {
      const result = this.nextResult;
      this.nextResult = undefined;
      return result;
    }

    // Default logic: skip if no packages, else pass if root exists and no broken links
    if (input.packagesLinked === 0) {
      return {
        status: 'skip',
        hasRootSpec: input.hasRootSpec,
        packagesLinked: 0
      };
    }

    const hasBroken = input.brokenPackageLinks > 0;
    return {
      status: input.hasRootSpec && !hasBroken ? 'pass' : 'fail',
      hasRootSpec: input.hasRootSpec,
      packagesLinked: input.packagesLinked,
      brokenPackageLinks: hasBroken ? input.brokenPackageLinks : undefined
    };
  }
}

/**
 * Configurable mock for Cost Gate (validation only).
 * Default behavior: pass if under budget.
 */
export class MockCostGateEvaluator implements GateEvaluator<CostGateInput, CostGateResult> {
  private nextResult?: CostGateResult;

  setNextResult(result: CostGateResult): void {
    this.nextResult = result;
  }

  evaluate(input: CostGateInput): CostGateResult {
    if (this.nextResult) {
      const result = this.nextResult;
      this.nextResult = undefined;
      return result;
    }

    // Default logic: validation passes if under budget (advisory only)
    return {
      status: input.totalTokens <= input.budget ? 'pass' : 'fail',
      budget: input.budget,
      used: input.totalTokens,
      remaining: input.budget - input.totalTokens,
      perFixture: input.perFixture
    };
  }
}

/**
 * Configurable mock for Adversarial Gate (validation only).
 * Default behavior: pass if all adversarial cases rejected.
 */
export class MockAdversarialGateEvaluator
  implements GateEvaluator<AdversarialGateInput, AdversarialGateResult>
{
  private nextResult?: AdversarialGateResult;

  setNextResult(result: AdversarialGateResult): void {
    this.nextResult = result;
  }

  evaluate(input: AdversarialGateInput): AdversarialGateResult {
    if (this.nextResult) {
      const result = this.nextResult;
      this.nextResult = undefined;
      return result;
    }

    // Default logic: skip if no tests, else pass if all rejected
    if (input.total === 0) {
      return { status: 'skip', total: 0, rejected: 0, pass: true };
    }

    const pass = input.rejected === input.total;
    return {
      status: pass ? 'pass' : 'fail',
      total: input.total,
      rejected: input.rejected,
      pass
    };
  }
}

/**
 * Configurable mock for Test Coverage Gate (validation only).
 * Default behavior: pass if coverage meets threshold.
 */
export class MockTestCoverageGateEvaluator
  implements GateEvaluator<TestCoverageGateInput, TestCoverageGateResult>
{
  private nextResult?: TestCoverageGateResult;

  setNextResult(result: TestCoverageGateResult): void {
    this.nextResult = result;
  }

  evaluate(input: TestCoverageGateInput): TestCoverageGateResult {
    if (this.nextResult) {
      const result = this.nextResult;
      this.nextResult = undefined;
      return result;
    }

    // Default logic: pass if coverage >= threshold
    const pass = input.coverage >= input.threshold;
    return {
      status: pass ? 'pass' : 'fail',
      coverage: input.coverage,
      threshold: input.threshold,
      pass
    };
  }
}

/**
 * Configurable mock for Readability Gate (validation only).
 * Default behavior: skip (manual review optional).
 */
export class MockReadabilityGateEvaluator
  implements GateEvaluator<ReadabilityGateInput, ReadabilityGateResult>
{
  private nextResult?: ReadabilityGateResult;

  setNextResult(result: ReadabilityGateResult): void {
    this.nextResult = result;
  }

  evaluate(input: ReadabilityGateInput): ReadabilityGateResult {
    if (this.nextResult) {
      const result = this.nextResult;
      this.nextResult = undefined;
      return result;
    }

    // Default logic: skip if no review data
    if (input.avgScore === undefined || input.threshold === undefined) {
      return { status: 'skip' };
    }

    const pass = input.avgScore >= input.threshold;
    return {
      status: pass ? 'pass' : 'fail',
      avgScore: input.avgScore,
      threshold: input.threshold,
      pass,
      reviewLogPath: input.reviewLogPath
    };
  }
}
