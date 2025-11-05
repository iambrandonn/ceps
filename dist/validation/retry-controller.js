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
/**
 * RetryController manages validation retry logic and template fallback.
 */
export class RetryController {
    /**
     * Decide next action based on validation result and attempt count.
     *
     * @param validationResult - Result from validator
     * @param metadata - Chunk metadata
     * @param attemptCount - Current attempt number (0 = first attempt)
     * @returns Decision with outcome and next prompt key
     */
    decide(validationResult, metadata, attemptCount) {
        // Handle immediate fallback (validator returned 'fallback' status)
        if (validationResult.status === 'fallback') {
            return {
                outcome: 'fallback',
                promptKey: 'TEMPLATE',
                attemptCount,
                shouldRetry: false,
                useLLMText: false,
                useTemplate: true,
                skipRevalidation: true,
                warning: `Chunk ${metadata.chunkId}: Validation fallback to template due to unrecoverable error`,
                metadata,
                metrics: {
                    fallbackCount: 1,
                },
            };
        }
        // Handle accept (validation passed)
        if (validationResult.status === 'accept') {
            return {
                outcome: 'accept',
                promptKey: 'O',
                attemptCount,
                shouldRetry: false,
                useLLMText: true,
                useTemplate: false,
                metadata,
                metrics: {
                    fallbackCount: 0,
                },
            };
        }
        // Handle retry status
        // After 2 attempts (attemptCount >= 2), fallback to template
        if (attemptCount >= 2) {
            return {
                outcome: 'fallback',
                promptKey: 'TEMPLATE',
                attemptCount,
                shouldRetry: false,
                useLLMText: false,
                useTemplate: true,
                skipRevalidation: true,
                warning: `Chunk ${metadata.chunkId}: Validation fallback to template after ${attemptCount} failed attempts`,
                retryGuidance: this.buildRetryGuidance(validationResult),
                metadata,
                metrics: {
                    fallbackCount: 1,
                },
            };
        }
        // Determine retry prompt key
        const promptKey = attemptCount === 0 ? 'R1' : 'R2';
        return {
            outcome: 'retry',
            promptKey,
            attemptCount: attemptCount + 1,
            shouldRetry: true,
            useLLMText: false,
            useTemplate: false,
            retryGuidance: this.buildRetryGuidance(validationResult),
            metadata,
            metrics: {
                fallbackCount: 0,
            },
        };
    }
    /**
     * Build retry guidance from diagnostics.
     *
     * @param validationResult - Validation result with diagnostics
     * @returns Guidance string for retry prompt
     */
    buildRetryGuidance(validationResult) {
        if (validationResult.diagnostics.length === 0) {
            return 'No specific guidance available';
        }
        const rulesSummary = validationResult.diagnostics
            .map((d) => d.rule)
            .filter((rule, index, self) => self.indexOf(rule) === index)
            .join(', ');
        const reasonsSummary = validationResult.diagnostics
            .map((d) => d.reason)
            .join('; ');
        return `Validation failed for rules: ${rulesSummary}. Issues: ${reasonsSummary}`;
    }
}
//# sourceMappingURL=retry-controller.js.map