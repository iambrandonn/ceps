/**
 * Phase 4 WS-H Stage B: Runtime Gate Evaluators
 *
 * Production implementations of runtime gate evaluators.
 * These gates affect exit code per SADS §6.3 (exit code 2 on failure).
 *
 * **CTS Reference:** CTS-07 §5 (Gates & Exit Codes), Phase 4 §3
 */
import type { GateEvaluator } from '../types/gate-engine.js';
import type { CoverageGateInput, LinkGateInput, GroundingGateInput, DeterminismGateInput, ConfidenceGateInput, MonorepoGateInput } from '../types/gate-engine.js';
import type { CoverageGateResult, LinkGateResult, GroundingGateResult, DeterminismGateResult, ConfidenceGateResult, MonorepoGateResult } from '../types/run-summary.js';
/**
 * Coverage Gate: Ensures all exported entities are documented or carry QIDs.
 * Per SADS §10, 100% of exported/public surfaces must be documented or carry Open Questions.
 */
export declare class CoverageGateEvaluator implements GateEvaluator<CoverageGateInput, CoverageGateResult> {
    evaluate(input: CoverageGateInput): CoverageGateResult;
}
/**
 * Link Gate: Validates all cross-file anchor references.
 * Per SADS §10, no broken cross-links allowed.
 */
export declare class LinkGateEvaluator implements GateEvaluator<LinkGateInput, LinkGateResult> {
    evaluate(input: LinkGateInput): LinkGateResult;
}
/**
 * Grounding Gate: Ensures all chunks have factSetIds and passed validation or fell back.
 * Per SADS §10, every paragraph/bullet must have a factSetId; no chunk without grounding.
 */
export declare class GroundingGateEvaluator implements GateEvaluator<GroundingGateInput, GroundingGateResult> {
    evaluate(input: GroundingGateInput): GroundingGateResult;
}
/**
 * Determinism Gate: Validates identical output across reruns when --deterministic enabled.
 * Only active when --deterministic flag supplied; skips otherwise.
 */
export declare class DeterminismGateEvaluator implements GateEvaluator<DeterminismGateInput, DeterminismGateResult> {
    evaluate(input: DeterminismGateInput): DeterminismGateResult;
}
/**
 * Confidence Gate: Ensures proper handling of low-confidence items.
 * Low confidence items must become Open Questions (never asserted).
 * Gate fails only if invalid confidence bands detected.
 */
export declare class ConfidenceGateEvaluator implements GateEvaluator<ConfidenceGateInput, ConfidenceGateResult> {
    evaluate(input: ConfidenceGateInput): ConfidenceGateResult;
}
/**
 * Monorepo Gate: Ensures root overview exists and package specs linked correctly.
 * Per SADS §10, root overview must be present and package specs must link correctly.
 */
export declare class MonorepoGateEvaluator implements GateEvaluator<MonorepoGateInput, MonorepoGateResult> {
    evaluate(input: MonorepoGateInput): MonorepoGateResult;
}
//# sourceMappingURL=runtime-gates.d.ts.map