/**
 * Phase 4 WS-F1 Stage A1: Mock Validator
 *
 * Configurable mock implementation of Validator interface.
 * Used by WS-F2 and WS-H for testing before full validator is ready.
 */

import type {
  Validator,
  GroundingResult,
  ValidationOutcome,
  ChunkMetadata,
} from './types.js';

/**
 * Mock validator that returns configurable results.
 * Default behavior: accept all chunks.
 * Use setNextResult() to simulate retry/fallback scenarios in tests.
 */
export class MockValidator implements Validator {
  private nextResult: GroundingResult = {
    status: 'accept',
    diagnostics: [],
  };

  /**
   * Set the result that will be returned by the next validate() call.
   * Validates result schema at runtime.
   *
   * @param result - GroundingResult to return
   * @throws Error if result schema is invalid
   */
  setNextResult(result: GroundingResult): void {
    // Validate status
    const validStatuses: ValidationOutcome[] = ['accept', 'retry', 'fallback'];
    if (!validStatuses.includes(result.status)) {
      throw new Error(
        `Invalid status: ${result.status}. Must be one of: ${validStatuses.join(', ')}`
      );
    }

    // Validate diagnostics is an array
    if (!Array.isArray(result.diagnostics)) {
      throw new Error('diagnostics must be an array');
    }

    // Validate retry metadata if present
    if (result.retryMetadata) {
      const validAttempts = [0, 1, 2];
      if (!validAttempts.includes(result.retryMetadata.attempt)) {
        throw new Error(
          `Invalid retry attempt: ${result.retryMetadata.attempt}. Must be 0, 1, or 2`
        );
      }

      const validPromptKeys = ['O', 'R1', 'R2'];
      if (!validPromptKeys.includes(result.retryMetadata.promptKey)) {
        throw new Error(
          `Invalid promptKey: ${result.retryMetadata.promptKey}. Must be O, R1, or R2`
        );
      }
    }

    this.nextResult = result;
  }

  /**
   * Validate a chunk draft (mock implementation).
   * Returns the result set via setNextResult(), or default 'accept' result.
   *
   * @param _draft - LLM-generated text (unused in mock)
   * @param _factSetIds - Array of factSet IDs (unused in mock)
   * @param _metadata - Chunk metadata (unused in mock)
   * @returns Configured GroundingResult
   */
  validate(
    _draft: string,
    _factSetIds: string[],
    _metadata: ChunkMetadata
  ): GroundingResult {
    return this.nextResult;
  }
}
