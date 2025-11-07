/**
 * Phase 6: Pattern Module Architecture
 *
 * Defines the contract for framework-specific pattern modules.
 * Replaces the Phase 3 monolithic PatternMatcher with a modular,
 * extensible registry-based system.
 */
/**
 * Priority levels for pattern precedence.
 * Higher-priority patterns evaluated first.
 */
export var PatternPriority;
(function (PatternPriority) {
    PatternPriority[PatternPriority["SHARED_PRIMITIVES"] = 1] = "SHARED_PRIMITIVES";
    PatternPriority[PatternPriority["FRAMEWORK_CORE"] = 2] = "FRAMEWORK_CORE";
    PatternPriority[PatternPriority["AUXILIARY_ADAPTERS"] = 3] = "AUXILIARY_ADAPTERS";
})(PatternPriority || (PatternPriority = {}));
/**
 * Registration error thrown when pattern module violates contract.
 */
export class PatternRegistrationError extends Error {
    patternId;
    constructor(patternId, message) {
        super(`Pattern registration failed for '${patternId}': ${message}`);
        this.patternId = patternId;
        this.name = 'PatternRegistrationError';
    }
}
//# sourceMappingURL=types.js.map