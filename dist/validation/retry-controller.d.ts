/**
 * Phase 4 WS-F1 Stage E: Retry Controller & Template Fallback
 *
 * Orchestrates accept/retry/fallback decision logic per CTS-02 §4.4.
 * Coordinates validation results with LLM gateway retry strategy.
 *
 * Prompt Keys (CTS-02):
 * - O: Original prompt (attempt 0)
 * - R1: First retry (attempt 1)
 * - R2: Second retry (attempt 2)
 * - TEMPLATE: Fallback to deterministic template (attempt 3+)
 */
import type { GroundingResult, ChunkMetadata, ValidationOutcome } from './types.js';
/**
 * Decision result from retry controller.
 */
export interface RetryDecision {
    outcome: ValidationOutcome;
    promptKey: 'O' | 'R1' | 'R2' | 'TEMPLATE';
    attemptCount: number;
    shouldRetry: boolean;
    useLLMText: boolean;
    useTemplate: boolean;
    skipRevalidation?: boolean;
    warning?: string;
    retryGuidance?: string;
    metadata: ChunkMetadata;
    metrics: {
        fallbackCount: number;
    };
}
/**
 * RetryController manages validation retry logic and template fallback.
 */
export declare class RetryController {
    /**
     * Decide next action based on validation result and attempt count.
     *
     * @param validationResult - Result from validator
     * @param metadata - Chunk metadata
     * @param attemptCount - Current attempt number (0 = first attempt)
     * @returns Decision with outcome and next prompt key
     */
    decide(validationResult: GroundingResult, metadata: ChunkMetadata, attemptCount: number): RetryDecision;
    /**
     * Build retry guidance from diagnostics.
     *
     * @param validationResult - Validation result with diagnostics
     * @returns Guidance string for retry prompt
     */
    private buildRetryGuidance;
}
//# sourceMappingURL=retry-controller.d.ts.map