/**
 * Phase 4 WS-H Stage A: Gate Engine Types
 *
 * Defines interfaces for gate evaluation, aggregated inputs, and evaluation results.
 * These types connect KB/Generator/Validator outputs to gate evaluation logic.
 *
 * **Status:** Interface definition (Stage A)
 * **CTS Reference:** CTS-07 §5 (Gates & Exit Codes), Phase 4 §3
 */
import type { GroundingDiagnostic } from '../../validation/types.js';
import type { TokenMetrics, RunSummary } from './run-summary.js';
/**
 * Aggregated input for Coverage Gate evaluation.
 * Sources: KB.getAllEntities(), KB.getAllChunks(), KB.getAllOpenQuestions()
 */
export interface CoverageGateInput {
    /** All exported entities from KB */
    exportedEntityIds: string[];
    /** Entities with BehaviorChunks */
    entitiesWithChunks: string[];
    /** Entities with Open Questions (QIDs) */
    entitiesWithQIDs: string[];
}
/**
 * Aggregated input for Link Gate evaluation.
 * Sources: CrossLinkValidator.validatePostGeneration()
 */
export interface LinkGateInput {
    /** Total anchors generated */
    totalAnchors: number;
    /** Broken links detected */
    brokenLinks: Array<{
        sourceFile: string;
        lineNumber: number;
        targetAnchor: string;
    }>;
}
/**
 * Aggregated input for Grounding Gate evaluation.
 * Sources: KB.getAllChunks(), Validator diagnostics
 */
export interface GroundingGateInput {
    /** Total behavior chunks generated */
    totalChunks: number;
    /** Chunks that passed validator */
    validatedChunks: number;
    /** Chunks that fell back to template */
    fallbackChunks: number;
    /** Chunks with missing or empty factSetIds */
    chunksWithMissingFactSetIds: string[];
    /** Aggregated validator diagnostics */
    diagnostics: GroundingDiagnostic[];
}
/**
 * Aggregated input for Determinism Gate evaluation.
 * Sources: Golden test harness or external comparison tool
 */
export interface DeterminismGateInput {
    /** Whether deterministic mode is enabled */
    enabled: boolean;
    /** Number of reruns performed */
    reruns: number;
    /** Number of diffs detected across reruns */
    diffs: number;
}
/**
 * Aggregated input for Confidence Gate evaluation.
 * Sources: KB.getAllOpenQuestions()
 */
export interface ConfidenceGateInput {
    /** Open questions generated (QIDs) */
    openQuestions: number;
    /** Items with invalid confidence bands (if any) */
    invalidConfidenceItems: string[];
}
/**
 * Aggregated input for Monorepo Gate evaluation.
 * Sources: FileIndex packages, generated spec files
 */
export interface MonorepoGateInput {
    /** Whether root spec.md exists */
    hasRootSpec: boolean;
    /** Number of packages linked in root spec */
    packagesLinked: number;
    /** Number of broken package links (if any) */
    brokenPackageLinks: number;
}
/**
 * Aggregated input for Cost Gate evaluation (validation only).
 * Sources: BudgetTracker.getUsage()
 */
export interface CostGateInput {
    /** Total tokens used */
    totalTokens: number;
    /** Budget limit */
    budget: number;
    /** Per-fixture token usage (for threshold checks) */
    perFixture?: Record<string, number>;
}
/**
 * Aggregated input for Adversarial Gate evaluation (validation only).
 * Sources: Adversarial test suite results
 */
export interface AdversarialGateInput {
    /** Total adversarial test cases */
    total: number;
    /** Number of cases correctly rejected by validator */
    rejected: number;
}
/**
 * Aggregated input for Test Coverage Gate evaluation (validation only).
 * Sources: Coverage tool (c8/nyc) output
 */
export interface TestCoverageGateInput {
    /** Branch coverage percentage (0-100) */
    coverage: number;
    /** Threshold from config (default 80) */
    threshold: number;
}
/**
 * Aggregated input for Readability Gate evaluation (validation only).
 * Sources: Manual review log file
 */
export interface ReadabilityGateInput {
    /** Average score from manual review (0-10 scale) */
    avgScore?: number;
    /** Threshold from config */
    threshold?: number;
    /** Path to review log file */
    reviewLogPath?: string;
}
/**
 * Gate evaluator interface for runtime gates.
 * Each gate implements this interface with specific logic.
 */
export interface GateEvaluator<TInput, TResult> {
    /**
     * Evaluate gate based on aggregated input.
     * @param input - Aggregated data from KB/Generator/Validator
     * @returns Gate result with status and details
     */
    evaluate(input: TInput): TResult;
}
/**
 * Gate registry for extensibility.
 * Allows adding/removing gates dynamically.
 */
export interface GateRegistry {
    /**
     * Register a runtime gate evaluator.
     * @param name - Gate name (e.g., 'coverage', 'link')
     * @param evaluator - Gate evaluation function
     */
    registerRuntimeGate<TInput, TResult>(name: string, evaluator: GateEvaluator<TInput, TResult>): void;
    /**
     * Register a validation gate evaluator.
     * @param name - Gate name (e.g., 'cost', 'adversarial')
     * @param evaluator - Gate evaluation function
     */
    registerValidationGate<TInput, TResult>(name: string, evaluator: GateEvaluator<TInput, TResult>): void;
    /**
     * Evaluate all runtime gates and produce run summary.
     * @param inputs - Aggregated inputs for all gates
     * @returns Complete run summary with exit code
     */
    evaluateAll(inputs: GateInputs): RunSummary;
}
/**
 * Aggregated inputs for all gates.
 * Passed to gate registry for evaluation.
 */
export interface GateInputs {
    coverage: CoverageGateInput;
    link: LinkGateInput;
    grounding: GroundingGateInput;
    determinism: DeterminismGateInput;
    confidence: ConfidenceGateInput;
    monorepo: MonorepoGateInput;
    cost: CostGateInput;
    adversarial: AdversarialGateInput;
    testCoverage: TestCoverageGateInput;
    readability: ReadabilityGateInput;
    tokens: TokenMetrics;
    warnings: string[];
}
//# sourceMappingURL=gate-engine.d.ts.map