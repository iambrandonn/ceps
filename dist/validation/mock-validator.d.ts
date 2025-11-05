/**
 * Phase 4 WS-F1 Stage A1: Mock Validator
 *
 * Configurable mock implementation of Validator interface.
 * Used by WS-F2 and WS-H for testing before full validator is ready.
 */
import type { Validator, GroundingResult, ChunkMetadata } from './types.js';
/**
 * Mock validator that returns configurable results.
 * Default behavior: accept all chunks.
 * Use setNextResult() to simulate retry/fallback scenarios in tests.
 */
export declare class MockValidator implements Validator {
    private nextResult;
    /**
     * Set the result that will be returned by the next validate() call.
     * Validates result schema at runtime.
     *
     * @param result - GroundingResult to return
     * @throws Error if result schema is invalid
     */
    setNextResult(result: GroundingResult): void;
    /**
     * Validate a chunk draft (mock implementation).
     * Returns the result set via setNextResult(), or default 'accept' result.
     *
     * @param _draft - LLM-generated text (unused in mock)
     * @param _factSetIds - Array of factSet IDs (unused in mock)
     * @param _metadata - Chunk metadata (unused in mock)
     * @returns Configured GroundingResult
     */
    validate(_draft: string, _factSetIds: string[], _metadata: ChunkMetadata): GroundingResult;
}
//# sourceMappingURL=mock-validator.d.ts.map