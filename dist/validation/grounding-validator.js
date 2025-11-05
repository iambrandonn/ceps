/**
 * Phase 4 WS-F1: Grounding Validator (Main Entry Point)
 *
 * Orchestrates all validation rules to ensure LLM-generated behavior chunks
 * remain grounded in factSets per SADS §8 and CTS-02 specifications.
 *
 * Validation Pipeline:
 * 1. Identifier extraction and KB lookup
 * 2. Scope validation (factSetIds)
 * 3. Numeric and enum validation
 * 4. Pronoun resolution
 * 5. Lexicon normalization (future integration)
 */
import { IdentifierValidator } from './identifier-validator.js';
import { extractIdentifiers } from './identifier-extractor.js';
import { NumericValidator } from './numeric-validator.js';
/**
 * GroundingValidator orchestrates all validation rules.
 * Main entry point for Phase 4 grounding validation.
 */
export class GroundingValidator {
    kb;
    identifierValidator;
    numericValidator;
    constructor(kb) {
        this.kb = kb;
        this.identifierValidator = new IdentifierValidator(kb);
        this.numericValidator = new NumericValidator(kb);
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
        // Determine status based on diagnostics
        const status = this.determineStatus(allDiagnostics);
        return {
            status,
            diagnostics: allDiagnostics,
            retryMetadata: status === 'retry' ? {
                attemptCount: 0,
                promptKey: 'R1',
                guidance: this.buildGuidance(allDiagnostics),
            } : undefined,
        };
    }
    /**
     * Determine validation status from diagnostics.
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
            // Numeric errors beyond tolerance (>50% difference)
            if (d.rule === 'numeric' && d.reason.includes('beyond tolerance')) {
                // Extract percentage from reason like "100.0%" or "50.0%"
                const match = d.reason.match(/(\d+\.\d+)%/);
                if (match) {
                    const percentage = parseFloat(match[1]);
                    if (percentage > 50) {
                        return true; // Too large a diff, fallback
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