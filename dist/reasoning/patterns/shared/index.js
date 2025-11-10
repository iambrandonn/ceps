/**
 * Phase 6 Quality Improvement: Shared Pattern Library
 *
 * Entry point for framework-agnostic pattern detection.
 * Registers shared patterns that apply across all codebases.
 */
import { ConstantInliningPattern } from './constant-inlining.js';
import { SemanticFunctionPattern } from './semantic-function-names.js';
/**
 * Register all shared pattern modules with the given registry.
 *
 * @param registry - Pattern registry to register modules with
 */
export function registerSharedPatterns(registry) {
    // Quality improvement: Constant value inlining
    registry.register(new ConstantInliningPattern());
    // Quality improvement: Semantic function name hints
    registry.register(new SemanticFunctionPattern());
    // Future shared patterns:
    // - Factory pattern detection
    // - Service client patterns
    // - Logging patterns
}
// Export pattern modules for direct use if needed
export { ConstantInliningPattern, SemanticFunctionPattern, };
//# sourceMappingURL=index.js.map