/**
 * Phase 6 I1: Lexicon Validator
 *
 * Validates LLM-generated behavior chunks against approved framework terminology
 * from docs/lexicon.md. Rejects anti-patterns and enforces canonical terms.
 *
 * Design:
 * - Loads approved terms and anti-patterns from markdown documentation
 * - Case-insensitive matching for robustness
 * - Anti-patterns take precedence (fail-fast on wrong terminology)
 * - Approved terms or generic code accepted
 */
import type { GroundingResult, ChunkMetadata } from './types.js';
export interface LexiconRule {
    framework: string;
    approvedTerms: Set<string>;
    antiPatterns: Map<string, string>;
}
export declare class LexiconValidator {
    private rules;
    /**
     * Load lexicon rules from markdown file.
     * Parses docs/lexicon.md tables to extract approved terms and anti-patterns.
     *
     * @param markdownPath - Path to lexicon.md file
     */
    loadFromMarkdown(markdownPath: string): void;
    /**
     * Get loaded rules (for testing).
     */
    getRules(): Map<string, LexiconRule>;
    /**
     * Validate behavior chunk text against lexicon rules.
     *
     * @param draftText - LLM-generated text to validate
     * @param factSetIds - FactSet IDs (not used by lexicon validator)
     * @param metadata - Chunk metadata (not used by lexicon validator)
     * @returns Validation result with status and diagnostics
     */
    validate(draftText: string, factSetIds: string[], metadata: ChunkMetadata): GroundingResult;
}
//# sourceMappingURL=lexicon-validator.d.ts.map