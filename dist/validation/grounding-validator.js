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
import { IdentifierValidator } from './identifier-validator.js';
import { extractIdentifiers } from './identifier-extractor.js';
import { NumericValidator } from './numeric-validator.js';
import { LexiconValidator } from './lexicon-validator.js';
import * as path from 'path';
/**
 * GroundingValidator orchestrates all validation rules.
 * Main entry point for Phase 4 grounding validation.
 */
export class GroundingValidator {
    kb;
    identifierValidator;
    numericValidator;
    lexiconValidator;
    constructor(kb, lexiconPath) {
        this.kb = kb;
        this.identifierValidator = new IdentifierValidator(kb);
        this.numericValidator = new NumericValidator(kb);
        this.lexiconValidator = new LexiconValidator();
        // Load lexicon from docs/lexicon.md (default location)
        const defaultLexiconPath = path.join(process.cwd(), 'docs', 'lexicon.md');
        this.lexiconValidator.loadFromMarkdown(lexiconPath || defaultLexiconPath);
    }
    /**
     * Validate behavior chunk text against KB factSets.
     *
     * @param draftText - LLM-generated behavior chunk text
     * @param factSetIds - Array of factSet IDs chunk is allowed to reference
     * @param metadata - Chunk metadata
     * @returns Grounding result with status and diagnostics
     */
    validate(draftText, factSetIds, metadata) {
        const allDiagnostics = [];
        // Step 1: Extract and validate identifiers
        const identifiers = extractIdentifiers(draftText);
        const identifierResult = this.identifierValidator.validate(identifiers, factSetIds);
        allDiagnostics.push(...identifierResult.diagnostics);
        // Step 2: Validate pronouns
        const pronounResult = this.identifierValidator.validatePronouns(draftText);
        allDiagnostics.push(...pronounResult.diagnostics);
        // Step 3: Validate numeric and enum values
        const numericResult = this.numericValidator.validate(draftText, factSetIds);
        allDiagnostics.push(...numericResult.diagnostics);
        // Step 4: Validate framework-specific terminology (Phase 6 I1)
        const lexiconResult = this.lexiconValidator.validate(draftText, factSetIds, metadata);
        allDiagnostics.push(...lexiconResult.diagnostics);
        // Determine status based on diagnostics
        const status = this.determineStatus(allDiagnostics);
        // Determine promptKey based on diagnostic types
        let promptKey = 'R1';
        if (status === 'retry') {
            // If lexicon failures exist, use L1 (lexicon-specific retry prompt)
            const hasLexiconFailure = allDiagnostics.some(d => d.rule === 'lexicon');
            if (hasLexiconFailure) {
                promptKey = 'L1';
            }
        }
        return {
            status,
            diagnostics: allDiagnostics,
            retryMetadata: status === 'retry' ? {
                attempt: 0,
                promptKey,
            } : undefined,
        };
    }
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
    determineStatus(diagnostics) {
        if (diagnostics.length === 0) {
            return 'accept';
        }
        // Check for unrecoverable errors (immediate fallback)
        const hasUnrecoverableError = diagnostics.some(d => {
            if (d.rule === 'numeric') {
                // Extract rounded values from context if available
                const context = d.context;
                if (context?.actual &&
                    typeof context.actual.roundedFactValue === 'number' &&
                    typeof context.actual.value === 'number') {
                    const factValue = context.actual.roundedFactValue;
                    const textValue = context.actual.value;
                    const ratio = Math.max(factValue, textValue) / Math.min(factValue, textValue);
                    // If rounded values differ by 2x or more, treat as unrecoverable
                    // Example: 5 vs 10 seconds (2x difference) → fallback
                    // Example: 5 vs 6 seconds (1.2x difference) → retry
                    if (ratio >= 2.0) {
                        return true;
                    }
                }
            }
            return false;
        });
        if (hasUnrecoverableError) {
            return 'fallback';
        }
        // Otherwise, retry is appropriate
        return 'retry';
    }
    /**
     * Build retry guidance from diagnostics.
     *
     * @param diagnostics - Validation diagnostics
     * @returns Guidance string
     */
    buildGuidance(diagnostics) {
        const rules = [...new Set(diagnostics.map(d => d.rule))];
        const issues = diagnostics.map(d => d.reason).join('; ');
        return `Failed rules: ${rules.join(', ')}. Issues: ${issues}`;
    }
}
//# sourceMappingURL=grounding-validator.js.map