/**
 * Phase 4 WS-F1 Stage C: Enum Registry
 *
 * Registry of allowed enum values for specific fact predicates.
 * Used to validate that LLM-generated text only mentions valid enum values.
 *
 * Predicates not listed here skip enum validation (no constraint).
 */
/**
 * Enum registry mapping predicate names to allowed values.
 */
export declare const ENUM_REGISTRY: Record<string, Set<string>>;
/**
 * Get allowed enum values for a predicate, if any.
 *
 * @param predicate - Fact predicate name
 * @returns Set of allowed values, or null if no constraint
 */
export declare function getAllowedEnumValues(predicate: string): Set<string> | null;
//# sourceMappingURL=enums.d.ts.map