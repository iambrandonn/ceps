/**
 * Phase 3 Step 6: Cross-Link Validation Types
 *
 * Based on Phase -1 analysis of upstream components.
 */
export interface ValidationResult {
    passed: boolean;
    coverage: number;
    missingEntities: string[];
    brokenLinks: BrokenLink[];
}
export interface BrokenLink {
    sourceFile: string;
    targetAnchor: string;
    lineNumber: number;
}
export interface SpecFile {
    path: string;
    content: string;
}
export interface Anchor {
    entityId: string;
    anchorText: string;
    filePath: string;
}
/**
 * Outcome of grounding validation for a single behavior chunk.
 * - accept: LLM text passes validation, use it
 * - retry: Validation failed, retry with stricter prompt (R1/R2)
 * - fallback: Persistent failure or budget exhaustion, use template
 */
export type ValidationOutcome = 'accept' | 'retry' | 'fallback';
/**
 * Diagnostic entry for a failed validation rule.
 * Used for debugging and run summary reporting.
 */
export interface GroundingDiagnostic {
    chunkId: string;
    rule: 'entity' | 'relation' | 'numeric' | 'enum' | 'scope' | 'lexicon' | 'pronoun';
    reason: string;
    context?: {
        expected?: unknown;
        actual?: unknown;
        location?: string;
        [key: string]: unknown;
    };
}
/**
 * Metadata about the chunk being validated.
 * Passed to validator for context and diagnostics.
 */
export interface ChunkMetadata {
    chunkId: string;
    targetEntityId: string;
    factSetIds: string[];
    confidence: 'High' | 'Medium' | 'Low';
}
/**
 * Result of grounding validation.
 */
export interface GroundingResult {
    status: ValidationOutcome;
    diagnostics: GroundingDiagnostic[];
    retryMetadata?: RetryMetadata;
}
/**
 * Metadata for retry orchestration.
 * Tracks which prompt template to use (O = Original, R1 = Retry 1, R2 = Retry 2).
 */
export interface RetryMetadata {
    attempt: 0 | 1 | 2;
    promptKey: 'O' | 'R1' | 'R2' | 'L1';
}
/**
 * Grounding Validator interface (CTS-02 §6).
 * Validates LLM-generated text against factSet grounding rules.
 */
export interface Validator {
    /**
     * Validate a chunk draft against factSet grounding rules.
     *
     * @param draft - LLM-generated text to validate
     * @param factSetIds - Array of factSet IDs this chunk must reference
     * @param metadata - Chunk metadata (for diagnostics and context)
     * @returns GroundingResult with status and diagnostics
     */
    validate(draft: string, factSetIds: string[], metadata: ChunkMetadata): GroundingResult;
}
//# sourceMappingURL=types.d.ts.map