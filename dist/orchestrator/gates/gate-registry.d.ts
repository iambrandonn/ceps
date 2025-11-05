/**
 * Phase 4 WS-H Stage B/B2/C: Gate Registry
 *
 * Orchestrates evaluation of all runtime and validation gates.
 * Produces complete run summary with exit code enforcement per SADS §6.3.
 *
 * **Exit Codes:**
 * - 0: success (all runtime gates pass)
 * - 1: internal error (config errors, uncaught exceptions)
 * - 2: runtime gate failure (coverage/link/grounding/determinism/confidence/monorepo)
 * - 3: snapshot mismatch during finalization without --reconcile
 *
 * **CTS Reference:** CTS-07 §5 (Gates & Exit Codes), Phase 4 §3-§5
 */
import type { GateEvaluator, GateInputs } from '../types/gate-engine.js';
import type { RunSummary } from '../types/run-summary.js';
/**
 * Gate registry for evaluating all gates and producing run summary.
 */
export declare class GateRegistry {
    private runtimeGates;
    private validationGates;
    constructor();
    /**
     * Register or replace a runtime gate evaluator.
     * @param name - Gate name
     * @param evaluator - Gate evaluator instance
     */
    registerRuntimeGate<TInput, TResult>(name: string, evaluator: GateEvaluator<TInput, TResult>): void;
    /**
     * Register or replace a validation gate evaluator.
     * @param name - Gate name
     * @param evaluator - Gate evaluator instance
     */
    registerValidationGate<TInput, TResult>(name: string, evaluator: GateEvaluator<TInput, TResult>): void;
    /**
     * Evaluate all gates and produce complete run summary.
     * @param inputs - Aggregated inputs for all gates
     * @returns Run summary with exit code
     */
    evaluateAll(inputs: GateInputs): RunSummary;
    /**
     * Compute exit code based on gate results.
     * Per SADS §6.3 and Phase 4 acceptance criteria:
     * - 0: success (all gates pass or skip)
     * - 1: test failure (test coverage gate fails)
     * - 2: gate failure (runtime gates, cost, adversarial fail)
     * - 3: snapshot mismatch (Phase 5, handled by orchestrator)
     */
    private computeExitCode;
    /**
     * Get list of failed runtime gates for error messaging.
     * @param summary - Run summary
     * @returns Array of failed gate names
     */
    getFailedRuntimeGates(summary: RunSummary): string[];
    /**
     * Get list of all gates that cause exit code 2 (runtime + cost + adversarial).
     * Per Phase 4 acceptance criteria, Cost and Adversarial gate failures exit with code 2.
     * @param summary - Run summary
     * @returns Array of failed gate names that cause exit 2
     */
    getFailedGatesExitCode2(summary: RunSummary): string[];
    /**
     * Get list of failed validation gates for warnings (advisory only).
     * Per Phase 4 acceptance criteria, only Readability is truly advisory.
     * @param summary - Run summary
     * @returns Array of failed validation gate names (advisory gates only)
     */
    getFailedValidationGates(summary: RunSummary): string[];
}
//# sourceMappingURL=gate-registry.d.ts.map