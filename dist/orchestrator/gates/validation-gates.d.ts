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
import type { CostGateInput, AdversarialGateInput, TestCoverageGateInput, ReadabilityGateInput } from '../types/gate-engine.js';
import type { CostGateResult, AdversarialGateResult, TestCoverageGateResult, ReadabilityGateResult } from '../types/run-summary.js';
/**
 * Cost Gate: Validates token usage against budget and per-fixture thresholds.
 * Advisory only - budget exhaustion does not fail the run.
 *
 * Per Phase 4 §5.2:
 * - Express API: ≤30k tokens
 * - React app: ≤40k tokens
 * - Small monorepo: ≤100k tokens
 */
export declare class CostGateEvaluator implements GateEvaluator<CostGateInput, CostGateResult> {
    private fixtureThresholds;
    evaluate(input: CostGateInput): CostGateResult;
}
/**
 * Adversarial Gate: Validates that validator rejects all adversarial test cases.
 * Advisory only - adversarial suite failures logged as warnings.
 *
 * Per Phase 4 §5.2, 100% of adversarial tests must be rejected.
 */
export declare class AdversarialGateEvaluator implements GateEvaluator<AdversarialGateInput, AdversarialGateResult> {
    evaluate(input: AdversarialGateInput): AdversarialGateResult;
}
/**
 * Test Coverage Gate: Validates branch coverage meets threshold.
 * Advisory only - coverage below threshold logged as warning.
 *
 * Per Phase 4 §5.2, target ≥80% branch coverage for all workstreams.
 */
export declare class TestCoverageGateEvaluator implements GateEvaluator<TestCoverageGateInput, TestCoverageGateResult> {
    evaluate(input: TestCoverageGateInput): TestCoverageGateResult;
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
export declare class ReadabilityGateEvaluator implements GateEvaluator<ReadabilityGateInput, ReadabilityGateResult> {
    evaluate(input: ReadabilityGateInput): ReadabilityGateResult;
}
//# sourceMappingURL=validation-gates.d.ts.map