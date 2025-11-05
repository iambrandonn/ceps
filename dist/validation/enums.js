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
export const ENUM_REGISTRY = {
    'http-method': new Set([
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'HEAD',
        'OPTIONS',
        'TRACE',
        'CONNECT',
    ]),
    'http-status': new Set([
        '200', '201', '204',
        '301', '302', '304',
        '400', '401', '403', '404', '409',
        '500', '502', '503', '504',
    ]),
    'log-level': new Set([
        'debug',
        'info',
        'warn',
        'error',
        'fatal',
    ]),
    'content-type': new Set([
        'application/json',
        'application/xml',
        'text/plain',
        'text/html',
        'multipart/form-data',
        'application/octet-stream',
    ]),
};
/**
 * Get allowed enum values for a predicate, if any.
 *
 * @param predicate - Fact predicate name
 * @returns Set of allowed values, or null if no constraint
 */
export function getAllowedEnumValues(predicate) {
    return ENUM_REGISTRY[predicate] || null;
}
//# sourceMappingURL=enums.js.map