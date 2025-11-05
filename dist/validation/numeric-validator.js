/**
 * Phase 4 WS-F1 Stage C: Numeric & Enum Validation
 *
 * Validates numeric claims in behavior chunks against factSet numeric predicates.
 * Enforces:
 * - Unit conversion (ms ↔ s, B ↔ KB, etc.)
 * - Tolerance: ±5% allowed for rounding
 * - Enum value validation against registry
 */
import { parseFactNumeric } from './fact-schema-interpreter.js';
import { getAllowedEnumValues } from './enums.js';
/**
 * Unit conversion tables for numeric validation.
 */
const UNIT_CONVERSIONS = {
    // Time conversions (all to milliseconds as base)
    ms: { ms: 1, s: 0.001, min: 0.001 / 60, h: 0.001 / 3600 },
    s: { ms: 1000, s: 1, min: 1 / 60, h: 1 / 3600 },
    min: { ms: 60000, s: 60, min: 1, h: 1 / 60 },
    h: { ms: 3600000, s: 3600, min: 60, h: 1 },
    // Data size conversions (all to bytes as base)
    B: { B: 1, KB: 1 / 1024, MB: 1 / (1024 * 1024), GB: 1 / (1024 * 1024 * 1024) },
    KB: { B: 1024, KB: 1, MB: 1 / 1024, GB: 1 / (1024 * 1024) },
    MB: { B: 1024 * 1024, KB: 1024, MB: 1, GB: 1 / 1024 },
    GB: { B: 1024 * 1024 * 1024, KB: 1024 * 1024, MB: 1024, GB: 1 },
    // Percentage (already normalized to decimal by parser)
    percent: { percent: 1 },
    // Unitless numbers (no conversion)
    unitless: { unitless: 1 },
};
/**
 * Tolerance for numeric comparisons (5% = 0.05).
 */
const TOLERANCE = 0.05;
/**
 * NumericValidator validates numeric claims and enum values.
 */
export class NumericValidator {
    kb;
    constructor(kb) {
        this.kb = kb;
    }
    /**
     * Validate numeric and enum claims in draft text against factSets.
     *
     * @param draftText - Behavior chunk text to validate
     * @param factSetIds - Array of factSet IDs to validate against
     * @returns ValidationResult with diagnostics
     */
    validate(draftText, factSetIds) {
        const diagnostics = [];
        // Collect all numeric and enum facts from declared factSets
        const numericFacts = [];
        const enumFacts = [];
        for (const factSetId of factSetIds) {
            const factSet = this.kb.getFactSet(factSetId);
            if (!factSet)
                continue;
            for (const fact of factSet.facts) {
                // Try parsing as numeric
                const numericFact = parseFactNumeric(fact.object);
                if (numericFact) {
                    numericFacts.push({ predicate: fact.predicate, fact: numericFact });
                    continue;
                }
                // Check if this predicate has enum constraints
                if (typeof fact.object === 'string') {
                    const allowedValues = getAllowedEnumValues(fact.predicate);
                    if (allowedValues) {
                        enumFacts.push({ predicate: fact.predicate, value: fact.object });
                    }
                }
            }
        }
        // Validate numeric claims
        for (const { predicate, fact } of numericFacts) {
            const numericDiagnostics = this.validateNumericClaim(draftText, predicate, fact);
            diagnostics.push(...numericDiagnostics);
        }
        // Validate enum claims
        for (const { predicate, value } of enumFacts) {
            const enumDiagnostics = this.validateEnumClaim(draftText, predicate, value);
            diagnostics.push(...enumDiagnostics);
        }
        return {
            valid: diagnostics.length === 0,
            diagnostics,
        };
    }
    /**
     * Validate a single numeric claim against a fact.
     *
     * @param draftText - Text to check for numeric mentions
     * @param predicate - Fact predicate name
     * @param factValue - Parsed numeric fact from KB
     * @returns Array of diagnostics (empty if valid)
     */
    validateNumericClaim(draftText, predicate, factValue) {
        const diagnostics = [];
        // If fact is unitless, try to infer unit from predicate name
        let inferredFactValue = factValue;
        if (factValue.unit === 'unitless') {
            const predicateUnit = this.inferUnitFromPredicate(predicate);
            if (predicateUnit) {
                inferredFactValue = { value: factValue.value, unit: predicateUnit };
            }
        }
        // Extract all numeric mentions from text
        const mentions = this.extractNumericMentions(draftText);
        for (const mention of mentions) {
            // Check if this mention could be related to the fact
            // (simplified heuristic: check if units are convertible)
            if (!this.areUnitsConvertible(mention.unit, inferredFactValue.unit)) {
                // Special case: percent is already decimal, comparable to unitless
                if (mention.unit === 'percent' && inferredFactValue.unit === 'unitless') {
                    // Compare directly (percent is already normalized to decimal)
                    const delta = Math.abs(mention.value - inferredFactValue.value);
                    const relative = inferredFactValue.value === 0 ? delta : delta / Math.abs(inferredFactValue.value);
                    if (relative > TOLERANCE) {
                        diagnostics.push({
                            chunkId: 'unknown',
                            rule: 'numeric',
                            reason: `Percentage ${(mention.value * 100).toFixed(1)}% differs from fact ${inferredFactValue.value} by ${(relative * 100).toFixed(1)}% (beyond tolerance of ${TOLERANCE * 100}%)`,
                            context: { expected: inferredFactValue, actual: mention },
                        });
                    }
                    continue; // Handled, skip remaining logic
                }
                // If both are unitless and values are close, check anyway
                if (mention.unit === 'unitless' && inferredFactValue.unit === 'unitless') {
                    // Compare directly
                    const delta = Math.abs(mention.value - inferredFactValue.value);
                    const relative = inferredFactValue.value === 0 ? delta : delta / Math.abs(inferredFactValue.value);
                    if (relative > TOLERANCE) {
                        diagnostics.push({
                            chunkId: 'unknown',
                            rule: 'numeric',
                            reason: `Numeric value ${mention.value} differs from fact ${inferredFactValue.value} by ${(relative * 100).toFixed(1)}% (beyond tolerance of ${TOLERANCE * 100}%)`,
                            context: { expected: inferredFactValue, actual: mention },
                        });
                    }
                }
                else if (mention.unit !== 'unitless' && inferredFactValue.unit === 'unitless') {
                    // Text has unit but fact doesn't - flag as unknown unit
                    diagnostics.push({
                        chunkId: 'unknown',
                        rule: 'numeric',
                        reason: `Numeric value with unknown unit "${mention.unit}"`,
                        context: { expected: inferredFactValue, actual: mention },
                    });
                }
                continue; // Different dimension, skip
            }
            // Convert to same unit and compare
            const converted = this.convertUnit(mention.value, mention.unit, inferredFactValue.unit);
            if (converted === null) {
                // Unknown unit
                diagnostics.push({
                    chunkId: 'unknown',
                    rule: 'numeric',
                    reason: `Numeric value with unknown unit "${mention.unit}"`,
                    context: { expected: inferredFactValue, actual: mention },
                });
                continue;
            }
            // Check tolerance
            const delta = Math.abs(converted - inferredFactValue.value);
            const relative = inferredFactValue.value === 0 ? delta : delta / Math.abs(inferredFactValue.value);
            if (relative > TOLERANCE) {
                diagnostics.push({
                    chunkId: 'unknown',
                    rule: 'numeric',
                    reason: `Numeric value ${mention.value} ${mention.unit} (converted: ${converted.toFixed(2)} ${inferredFactValue.unit}) differs from fact ${inferredFactValue.value} ${inferredFactValue.unit} by ${(relative * 100).toFixed(1)}% (beyond tolerance of ${TOLERANCE * 100}%)`,
                    context: { expected: inferredFactValue, actual: { ...mention, converted } },
                });
            }
        }
        return diagnostics;
    }
    /**
     * Infer unit from predicate name (e.g., "delay-ms" → "ms").
     *
     * @param predicate - Fact predicate name
     * @returns Inferred unit, or null if no unit found
     */
    inferUnitFromPredicate(predicate) {
        // Common patterns: suffix after last hyphen
        const parts = predicate.split('-');
        const lastPart = parts[parts.length - 1];
        // Check if last part is a known unit
        if (this.isKnownUnit(lastPart)) {
            return lastPart;
        }
        return null;
    }
    /**
     * Validate enum value mentions in text.
     *
     * @param draftText - Text to check for enum mentions
     * @param predicate - Fact predicate name
     * @param expectedValue - Expected enum value from fact
     * @returns Array of diagnostics (empty if valid)
     */
    validateEnumClaim(draftText, predicate, expectedValue) {
        const diagnostics = [];
        const allowedValues = getAllowedEnumValues(predicate);
        if (!allowedValues) {
            // No enum constraint for this predicate
            return diagnostics;
        }
        // Extract all words from text
        const words = draftText.match(/\b[A-Za-z][A-Za-z0-9_-]*\b/g) || [];
        for (const word of words) {
            // Check if this word matches an allowed value (case-insensitive)
            let matchedValue = null;
            for (const allowed of allowedValues) {
                if (word.toLowerCase() === allowed.toLowerCase()) {
                    matchedValue = allowed;
                    break;
                }
            }
            if (matchedValue) {
                // Found a match - check if case is correct
                if (word !== matchedValue) {
                    diagnostics.push({
                        chunkId: 'unknown',
                        rule: 'enum',
                        reason: `Enum value "${word}" has incorrect case. Expected "${matchedValue}" (case-sensitive)`,
                        context: { expected: matchedValue, actual: word },
                    });
                }
                // Else: exact match, valid
            }
            else {
                // Check if it looks like it's trying to be an enum value but invalid
                // (heuristic: all caps, length >= 3)
                if (word.length >= 3 && /^[A-Z][A-Z0-9_-]*$/.test(word)) {
                    diagnostics.push({
                        chunkId: 'unknown',
                        rule: 'enum',
                        reason: `Invalid enum value "${word}" for predicate "${predicate}". Expected one of: ${Array.from(allowedValues).join(', ')}`,
                        context: { expected: Array.from(allowedValues), actual: word },
                    });
                }
            }
        }
        return diagnostics;
    }
    /**
     * Extract numeric mentions from text.
     *
     * @param text - Text to analyze
     * @returns Array of numeric mentions with value and unit
     */
    extractNumericMentions(text) {
        const mentions = [];
        // Pattern for numbers with optional units
        // Matches: "5000ms", "5 seconds", "100 KB", "50%", plain "100"
        const pattern = /(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s*([a-zA-Z%]+)?/g;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const value = parseFloat(match[1]);
            let unit = match[2];
            if (!unit) {
                // Plain number without unit
                mentions.push({ value, unit: 'unitless' });
                continue;
            }
            // Normalize percentage
            if (unit === '%') {
                mentions.push({ value: value / 100, unit: 'percent' });
                continue;
            }
            // Normalize common unit names to abbreviations
            unit = this.normalizeUnit(unit);
            // Check if unit is recognized
            if (this.isKnownUnit(unit)) {
                mentions.push({ value, unit });
            }
            else {
                // Unknown/prose word after number - treat as unitless
                // Only flag as "unknown unit" if it looks like a technical unit (short, uppercase, etc.)
                if (this.looksLikeTechnicalUnit(unit)) {
                    mentions.push({ value, unit }); // Flag for diagnostic
                }
                else {
                    mentions.push({ value, unit: 'unitless' }); // Prose word, ignore
                }
            }
        }
        return mentions;
    }
    /**
     * Check if a string looks like a technical unit (vs prose).
     *
     * @param unit - Unit string
     * @returns True if it looks like a technical unit
     */
    looksLikeTechnicalUnit(unit) {
        // Common prose words that appear after numbers
        const commonProseWords = new Set([
            'items', 'users', 'records', 'files', 'requests', 'times',
            'days', 'weeks', 'months', 'years', 'people', 'entries',
        ]);
        // If it's a known prose word, not a technical unit
        if (commonProseWords.has(unit.toLowerCase())) {
            return false;
        }
        // Otherwise, treat as potential technical unit
        // (unknown units like "parsecs" will be flagged)
        return true;
    }
    /**
     * Normalize common unit names to their abbreviations.
     *
     * @param unit - Unit string (may be long form)
     * @returns Normalized unit abbreviation
     */
    normalizeUnit(unit) {
        const normalized = {
            // Time units
            milliseconds: 'ms',
            millisecond: 'ms',
            seconds: 's',
            second: 's',
            minutes: 'min',
            minute: 'min',
            hours: 'h',
            hour: 'h',
            // Data units
            bytes: 'B',
            byte: 'B',
            kilobytes: 'KB',
            kilobyte: 'KB',
            megabytes: 'MB',
            megabyte: 'MB',
            gigabytes: 'GB',
            gigabyte: 'GB',
        };
        return normalized[unit.toLowerCase()] || unit;
    }
    /**
     * Check if two units are convertible (same dimension).
     *
     * @param unit1 - First unit
     * @param unit2 - Second unit
     * @returns True if units can be converted
     */
    areUnitsConvertible(unit1, unit2) {
        // Same unit is always convertible
        if (unit1 === unit2)
            return true;
        // Check if both units exist in same conversion table
        const table1 = UNIT_CONVERSIONS[unit1];
        if (!table1)
            return false;
        return unit2 in table1;
    }
    /**
     * Convert a value from one unit to another.
     *
     * @param value - Numeric value
     * @param fromUnit - Source unit
     * @param toUnit - Target unit
     * @returns Converted value, or null if conversion not possible
     */
    convertUnit(value, fromUnit, toUnit) {
        if (fromUnit === toUnit)
            return value;
        const conversionTable = UNIT_CONVERSIONS[fromUnit];
        if (!conversionTable)
            return null;
        const factor = conversionTable[toUnit];
        if (factor === undefined)
            return null;
        return value * factor;
    }
    /**
     * Check if a unit is recognized.
     *
     * @param unit - Unit string
     * @returns True if unit is in conversion tables
     */
    isKnownUnit(unit) {
        return unit in UNIT_CONVERSIONS;
    }
}
//# sourceMappingURL=numeric-validator.js.map