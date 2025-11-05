/**
 * Phase 4 WS-F1 Stage C0: Fact Schema Interpreter
 *
 * Parses fact object values into normalized numeric representations.
 * Handles various formats emitted by Phase 2 parser:
 * - String facts with units: "5000 ms" → {value: 5000, unit: 'ms'}
 * - Structured objects: {value: 5000, unit: 'ms'}
 * - Percentages: "50%" → {value: 0.5, unit: 'percent'}
 * - Plain numbers: 5000 → {value: 5000, unit: 'unitless'}
 * - Unknown formats: return null
 */
/**
 * Normalized numeric fact representation.
 */
export interface NumericFact {
    value: number;
    unit: string;
}
/**
 * Parse a fact object value into normalized numeric representation.
 *
 * @param factValue - Value from fact.object field (string, number, or object)
 * @returns NumericFact if parseable, null otherwise
 */
export declare function parseFactNumeric(factValue: unknown): NumericFact | null;
//# sourceMappingURL=fact-schema-interpreter.d.ts.map