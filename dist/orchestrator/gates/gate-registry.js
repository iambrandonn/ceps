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
import { createDefaultRunSummary } from '../types/run-summary.js';
import { CoverageGateEvaluator, LinkGateEvaluator, GroundingGateEvaluator, DeterminismGateEvaluator, ConfidenceGateEvaluator, MonorepoGateEvaluator } from './runtime-gates.js';
import { CostGateEvaluator, AdversarialGateEvaluator, TestCoverageGateEvaluator, ReadabilityGateEvaluator } from './validation-gates.js';
/**
 * Gate registry for evaluating all gates and producing run summary.
 */
export class GateRegistry {
    runtimeGates = new Map();
    validationGates = new Map();
    constructor() {
        // Register default runtime gates
        this.runtimeGates.set('coverage', new CoverageGateEvaluator());
        this.runtimeGates.set('link', new LinkGateEvaluator());
        this.runtimeGates.set('grounding', new GroundingGateEvaluator());
        this.runtimeGates.set('determinism', new DeterminismGateEvaluator());
        this.runtimeGates.set('confidence', new ConfidenceGateEvaluator());
        this.runtimeGates.set('monorepo', new MonorepoGateEvaluator());
        // Register default validation gates
        this.validationGates.set('cost', new CostGateEvaluator());
        this.validationGates.set('adversarial', new AdversarialGateEvaluator());
        this.validationGates.set('testCoverage', new TestCoverageGateEvaluator());
        this.validationGates.set('readability', new ReadabilityGateEvaluator());
    }
    /**
     * Register or replace a runtime gate evaluator.
     * @param name - Gate name
     * @param evaluator - Gate evaluator instance
     */
    registerRuntimeGate(name, evaluator) {
        this.runtimeGates.set(name, evaluator);
    }
    /**
     * Register or replace a validation gate evaluator.
     * @param name - Gate name
     * @param evaluator - Gate evaluator instance
     */
    registerValidationGate(name, evaluator) {
        this.validationGates.set(name, evaluator);
    }
    /**
     * Evaluate all gates and produce complete run summary.
     * @param inputs - Aggregated inputs for all gates
     * @returns Run summary with exit code
     */
    evaluateAll(inputs) {
        const summary = createDefaultRunSummary();
        // Evaluate runtime gates (affect exit code)
        const coverageEval = this.runtimeGates.get('coverage');
        summary.gates.coverage = coverageEval.evaluate(inputs.coverage);
        const linkEval = this.runtimeGates.get('link');
        summary.gates.link = linkEval.evaluate(inputs.link);
        const groundingEval = this.runtimeGates.get('grounding');
        summary.gates.grounding = groundingEval.evaluate(inputs.grounding);
        const determinismEval = this.runtimeGates.get('determinism');
        summary.gates.determinism = determinismEval.evaluate(inputs.determinism);
        const confidenceEval = this.runtimeGates.get('confidence');
        summary.gates.confidence = confidenceEval.evaluate(inputs.confidence);
        const monorepoEval = this.runtimeGates.get('monorepo');
        summary.gates.monorepo = monorepoEval.evaluate(inputs.monorepo);
        // Evaluate validation gates (advisory only, no exit code impact)
        const costEval = this.validationGates.get('cost');
        summary.validation.cost = costEval.evaluate(inputs.cost);
        const adversarialEval = this.validationGates.get('adversarial');
        summary.validation.adversarial = adversarialEval.evaluate(inputs.adversarial);
        const testCoverageEval = this.validationGates.get('testCoverage');
        summary.validation.testCoverage = testCoverageEval.evaluate(inputs.testCoverage);
        const readabilityEval = this.validationGates.get('readability');
        summary.validation.readability = readabilityEval.evaluate(inputs.readability);
        // Copy token metrics and warnings
        summary.tokens = inputs.tokens;
        summary.warnings = inputs.warnings;
        // Determine exit code based on runtime gates
        summary.exitCode = this.computeExitCode(summary);
        return summary;
    }
    /**
     * Compute exit code based on gate results.
     * Per SADS §6.3 and Phase 4 acceptance criteria:
     * - 0: success (all gates pass or skip)
     * - 1: test failure (test coverage gate fails)
     * - 2: gate failure (runtime gates, cost, adversarial fail)
     * - 3: snapshot mismatch (Phase 5, handled by orchestrator)
     */
    computeExitCode(summary) {
        // Test Coverage gate failure → exit 1 (test failure, highest priority)
        if (summary.validation.testCoverage.status === 'fail') {
            return 1;
        }
        // Runtime gate failures → exit 2
        const runtimeGateFailed = summary.gates.coverage.status === 'fail' ||
            summary.gates.link.status === 'fail' ||
            summary.gates.grounding.status === 'fail' ||
            summary.gates.determinism.status === 'fail' ||
            summary.gates.confidence.status === 'fail' ||
            summary.gates.monorepo.status === 'fail';
        // Cost and Adversarial gate failures also → exit 2 (per Phase 4 acceptance criteria)
        const validationGateFailed = summary.validation.cost.status === 'fail' ||
            summary.validation.adversarial.status === 'fail';
        if (runtimeGateFailed || validationGateFailed) {
            return 2; // Gate failure
        }
        // Only Readability is truly advisory (does not affect exit code)
        return 0; // Success
    }
    /**
     * Get list of failed runtime gates for error messaging.
     * @param summary - Run summary
     * @returns Array of failed gate names
     */
    getFailedRuntimeGates(summary) {
        const failed = [];
        if (summary.gates.coverage.status === 'fail')
            failed.push('coverage');
        if (summary.gates.link.status === 'fail')
            failed.push('link');
        if (summary.gates.grounding.status === 'fail')
            failed.push('grounding');
        if (summary.gates.determinism.status === 'fail')
            failed.push('determinism');
        if (summary.gates.confidence.status === 'fail')
            failed.push('confidence');
        if (summary.gates.monorepo.status === 'fail')
            failed.push('monorepo');
        return failed;
    }
    /**
     * Get list of all gates that cause exit code 2 (runtime + cost + adversarial).
     * Per Phase 4 acceptance criteria, Cost and Adversarial gate failures exit with code 2.
     * @param summary - Run summary
     * @returns Array of failed gate names that cause exit 2
     */
    getFailedGatesExitCode2(summary) {
        const failed = [...this.getFailedRuntimeGates(summary)];
        if (summary.validation.cost.status === 'fail')
            failed.push('cost');
        if (summary.validation.adversarial.status === 'fail')
            failed.push('adversarial');
        return failed;
    }
    /**
     * Get list of failed validation gates for warnings (advisory only).
     * Per Phase 4 acceptance criteria, only Readability is truly advisory.
     * @param summary - Run summary
     * @returns Array of failed validation gate names (advisory gates only)
     */
    getFailedValidationGates(summary) {
        const failed = [];
        // Only Readability is advisory - doesn't affect exit code
        if (summary.validation.readability.status === 'fail')
            failed.push('readability');
        return failed;
    }
}
//# sourceMappingURL=gate-registry.js.map