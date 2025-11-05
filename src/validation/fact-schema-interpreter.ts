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
 * Supported unit types for numeric facts.
 * Aligned with common code metrics and data units.
 */
const SUPPORTED_UNITS = new Set([
  // Time units
  'ms', 's', 'min', 'h',
  // Data size units
  'B', 'KB', 'MB', 'GB',
  // Percentage
  'percent',
  // Unitless numbers
  'unitless',
]);

/**
 * Parse a fact object value into normalized numeric representation.
 *
 * @param factValue - Value from fact.object field (string, number, or object)
 * @returns NumericFact if parseable, null otherwise
 */
export function parseFactNumeric(factValue: unknown): NumericFact | null {
  // Handle null/undefined
  if (factValue === null || factValue === undefined) {
    return null;
  }

  // Handle plain numbers
  if (typeof factValue === 'number') {
    return { value: factValue, unit: 'unitless' };
  }

  // Handle structured objects
  if (typeof factValue === 'object' && !Array.isArray(factValue)) {
    const obj = factValue as Record<string, unknown>;
    if (typeof obj.value === 'number' && typeof obj.unit === 'string') {
      // Validate unit is supported
      if (SUPPORTED_UNITS.has(obj.unit)) {
        return { value: obj.value, unit: obj.unit };
      }
    }
    return null; // Object without value/unit fields
  }

  // Handle strings
  if (typeof factValue === 'string') {
    const trimmed = factValue.trim();

    // Try percentage first (50%, 75 %)
    const percentMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*%$/);
    if (percentMatch) {
      const value = parseFloat(percentMatch[1]) / 100; // Normalize to decimal
      return { value, unit: 'percent' };
    }

    // Try numeric with unit (5000 ms, 10 KB, 5000ms)
    const unitMatch = trimmed.match(/^(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s*([a-zA-Z]+)$/);
    if (unitMatch) {
      const value = parseFloat(unitMatch[1]);
      const unit = unitMatch[2];

      // Validate unit is supported
      if (SUPPORTED_UNITS.has(unit)) {
        return { value, unit };
      }

      // Unknown unit
      return null;
    }

    // String doesn't match any pattern
    return null;
  }

  // Boolean or other unsupported types
  return null;
}
