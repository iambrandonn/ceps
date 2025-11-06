/**
 * Phase 4 WS-F1 Stage C: Numeric & Enum Validation
 *
 * Validates numeric claims in behavior chunks against factSet numeric predicates.
 * Per CTS-02 §4.2:
 * - **Strict equality** after unit normalization
 * - Allow rounding to **nearest integer** for human-friendly units
 * - Enum value validation against registry (exact match)
 */
import type { KnowledgeBase } from '../kb/knowledge-base.js';
import type { GroundingDiagnostic } from './types.js';
interface ValidationResult {
    valid: boolean;
    diagnostics: GroundingDiagnostic[];
}
/**
 * NumericValidator validates numeric claims and enum values.
 */
export declare class NumericValidator {
    private kb;
    constructor(kb: KnowledgeBase);
    /**
     * Validate numeric and enum claims in draft text against factSets.
     *
     * @param draftText - Behavior chunk text to validate
     * @param factSetIds - Array of factSet IDs to validate against
     * @returns ValidationResult with diagnostics
     */
    validate(draftText: string, factSetIds: string[]): ValidationResult;
    /**
     * Validate a single numeric claim against a fact.
     *
     * @param draftText - Text to check for numeric mentions
     * @param predicate - Fact predicate name
     * @param factValue - Parsed numeric fact from KB
     * @returns Array of diagnostics (empty if valid)
     */
    private validateNumericClaim;
    /**
     * Infer unit from predicate name (e.g., "delay-ms" → "ms").
     *
     * @param predicate - Fact predicate name
     * @returns Inferred unit, or null if no unit found
     */
    private inferUnitFromPredicate;
    /**
     * Validate enum value mentions in text.
     *
     * @param draftText - Text to check for enum mentions
     * @param predicate - Fact predicate name
     * @param expectedValue - Expected enum value from fact
     * @returns Array of diagnostics (empty if valid)
     */
    private validateEnumClaim;
    /**
     * Extract numeric mentions from text.
     *
     * @param text - Text to analyze
     * @returns Array of numeric mentions with value and unit
     */
    private extractNumericMentions;
    /**
     * Check if a string looks like a technical unit (vs prose).
     *
     * @param unit - Unit string
     * @returns True if it looks like a technical unit
     */
    private looksLikeTechnicalUnit;
    /**
     * Normalize common unit names to their abbreviations.
     *
     * @param unit - Unit string (may be long form)
     * @returns Normalized unit abbreviation
     */
    private normalizeUnit;
    /**
     * Check if two units are convertible (same dimension).
     *
     * @param unit1 - First unit
     * @param unit2 - Second unit
     * @returns True if units can be converted
     */
    private areUnitsConvertible;
    /**
     * Convert a value from one unit to another.
     *
     * @param value - Numeric value
     * @param fromUnit - Source unit
     * @param toUnit - Target unit
     * @returns Converted value, or null if conversion not possible
     */
    private convertUnit;
    /**
     * Check if a unit is recognized.
     *
     * @param unit - Unit string
     * @returns True if unit is in conversion tables
     */
    private isKnownUnit;
}
export {};
//# sourceMappingURL=numeric-validator.d.ts.map