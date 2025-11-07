/**
 * Phase 4 WS-F1: Grounding Validator (Main Entry Point)
 * Phase 6 I1: Added LexiconValidator to pipeline
 *
 * Orchestrates all validation rules to ensure LLM-generated behavior chunks
 * remain grounded in factSets per SADS §8 and CTS-02 specifications.
 *
 * Validation Pipeline:
 * 1. Identifier extraction and KB lookup
 * 2. Scope validation (factSetIds)
 * 3. Numeric and enum validation
 * 4. Pronoun resolution
 * 5. Lexicon validation (framework-specific terminology)
 */
import type { KnowledgeBase } from '../kb/knowledge-base.js';
import type { GroundingResult, ChunkMetadata } from './types.js';
/**
 * GroundingValidator orchestrates all validation rules.
 * Main entry point for Phase 4 grounding validation.
 */
export declare class GroundingValidator {
    private kb;
    private identifierValidator;
    private numericValidator;
    private lexiconValidator;
    constructor(kb: KnowledgeBase, lexiconPath?: string);
    /**
     * Validate behavior chunk text against KB factSets.
     *
     * @param draftText - LLM-generated behavior chunk text
     * @param factSetIds - Array of factSet IDs chunk is allowed to reference
     * @param metadata - Chunk metadata
     * @returns Grounding result with status and diagnostics
     */
    validate(draftText: string, factSetIds: string[], metadata: ChunkMetadata): GroundingResult;
    /**
     * Determine validation status from diagnostics.
     *
     * Per CTS-02 §4.2: strict equality with nearest-integer rounding.
     * Fallback criteria:
     * - Large numeric differences (rounded values differ by >2x)
     * - Systematic hallucinations (wrong dimension, unknown units)
     *
     * @param diagnostics - All collected diagnostics
     * @returns Validation status
     */
    private determineStatus;
    /**
     * Build retry guidance from diagnostics.
     *
     * @param diagnostics - Validation diagnostics
     * @returns Guidance string
     */
    private buildGuidance;
}
//# sourceMappingURL=grounding-validator.d.ts.map