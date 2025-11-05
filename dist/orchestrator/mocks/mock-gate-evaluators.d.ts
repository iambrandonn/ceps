/**
 * Phase 4 WS-H Stage A: Mock Gate Evaluators
 *
 * Configurable mocks for testing gate evaluation logic.
 * These mocks allow tests to simulate gate pass/fail scenarios
 * without requiring full KB/Generator/Validator integration.
 */
import type { GateEvaluator, CoverageGateInput, LinkGateInput, GroundingGateInput, DeterminismGateInput, ConfidenceGateInput, MonorepoGateInput, CostGateInput, AdversarialGateInput, TestCoverageGateInput, ReadabilityGateInput } from '../types/gate-engine.js';
import type { CoverageGateResult, LinkGateResult, GroundingGateResult, DeterminismGateResult, ConfidenceGateResult, MonorepoGateResult, CostGateResult, AdversarialGateResult, TestCoverageGateResult, ReadabilityGateResult } from '../types/run-summary.js';
/**
 * Configurable mock for Coverage Gate.
 * Default behavior: pass if all exported entities documented or have QIDs.
 */
export declare class MockCoverageGateEvaluator implements GateEvaluator<CoverageGateInput, CoverageGateResult> {
    private nextResult?;
    setNextResult(result: CoverageGateResult): void;
    evaluate(input: CoverageGateInput): CoverageGateResult;
}
/**
 * Configurable mock for Link Gate.
 * Default behavior: pass if no broken links.
 */
export declare class MockLinkGateEvaluator implements GateEvaluator<LinkGateInput, LinkGateResult> {
    private nextResult?;
    setNextResult(result: LinkGateResult): void;
    evaluate(input: LinkGateInput): LinkGateResult;
}
/**
 * Configurable mock for Grounding Gate.
 * Default behavior: pass if all chunks have factSetIds and (validated or fallback).
 */
export declare class MockGroundingGateEvaluator implements GateEvaluator<GroundingGateInput, GroundingGateResult> {
    private nextResult?;
    setNextResult(result: GroundingGateResult): void;
    evaluate(input: GroundingGateInput): GroundingGateResult;
}
/**
 * Configurable mock for Determinism Gate.
 * Default behavior: pass if no diffs, skip if not enabled.
 */
export declare class MockDeterminismGateEvaluator implements GateEvaluator<DeterminismGateInput, DeterminismGateResult> {
    private nextResult?;
    setNextResult(result: DeterminismGateResult): void;
    evaluate(input: DeterminismGateInput): DeterminismGateResult;
}
/**
 * Configurable mock for Confidence Gate.
 * Default behavior: always pass (Low confidence → Open Questions is acceptable).
 */
export declare class MockConfidenceGateEvaluator implements GateEvaluator<ConfidenceGateInput, ConfidenceGateResult> {
    private nextResult?;
    setNextResult(result: ConfidenceGateResult): void;
    evaluate(input: ConfidenceGateInput): ConfidenceGateResult;
}
/**
 * Configurable mock for Monorepo Gate.
 * Default behavior: pass if root spec exists and no broken package links.
 */
export declare class MockMonorepoGateEvaluator implements GateEvaluator<MonorepoGateInput, MonorepoGateResult> {
    private nextResult?;
    setNextResult(result: MonorepoGateResult): void;
    evaluate(input: MonorepoGateInput): MonorepoGateResult;
}
/**
 * Configurable mock for Cost Gate (validation only).
 * Default behavior: pass if under budget.
 */
export declare class MockCostGateEvaluator implements GateEvaluator<CostGateInput, CostGateResult> {
    private nextResult?;
    setNextResult(result: CostGateResult): void;
    evaluate(input: CostGateInput): CostGateResult;
}
/**
 * Configurable mock for Adversarial Gate (validation only).
 * Default behavior: pass if all adversarial cases rejected.
 */
export declare class MockAdversarialGateEvaluator implements GateEvaluator<AdversarialGateInput, AdversarialGateResult> {
    private nextResult?;
    setNextResult(result: AdversarialGateResult): void;
    evaluate(input: AdversarialGateInput): AdversarialGateResult;
}
/**
 * Configurable mock for Test Coverage Gate (validation only).
 * Default behavior: pass if coverage meets threshold.
 */
export declare class MockTestCoverageGateEvaluator implements GateEvaluator<TestCoverageGateInput, TestCoverageGateResult> {
    private nextResult?;
    setNextResult(result: TestCoverageGateResult): void;
    evaluate(input: TestCoverageGateInput): TestCoverageGateResult;
}
/**
 * Configurable mock for Readability Gate (validation only).
 * Default behavior: skip (manual review optional).
 */
export declare class MockReadabilityGateEvaluator implements GateEvaluator<ReadabilityGateInput, ReadabilityGateResult> {
    private nextResult?;
    setNextResult(result: ReadabilityGateResult): void;
    evaluate(input: ReadabilityGateInput): ReadabilityGateResult;
}
//# sourceMappingURL=mock-gate-evaluators.d.ts.map