/**
 * Phase 3 Step 6: Cross-Link Validation Types
 *
 * Based on Phase -1 analysis of upstream components.
 */

export interface ValidationResult {
  passed: boolean;
  coverage: number; // Percentage 0-100
  missingEntities: string[]; // Entity IDs without BehaviorChunk or QID
  brokenLinks: BrokenLink[];
}

export interface BrokenLink {
  sourceFile: string; // Path to spec.md file containing broken link
  targetAnchor: string; // Target anchor that doesn't exist (e.g., '#entity-id')
  lineNumber: number; // Line number in source file (1-indexed)
}

export interface SpecFile {
  path: string; // Relative path to spec.md file
  content: string; // Markdown content
}

export interface Anchor {
  entityId: string; // Entity ID from KB
  anchorText: string; // Markdown anchor format: #entity-id
  filePath: string; // spec.md file containing this anchor
}

// -------- Phase 4 WS-F1: Grounding Validator Types --------

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
  context?: { expected?: unknown; actual?: unknown; location?: string; [key: string]: unknown };
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
  promptKey: 'O' | 'R1' | 'R2' | 'L1'; // L1 = Lexicon retry
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
