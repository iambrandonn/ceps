/**
 * Phase 6 Quality Improvement: Shared Pattern Library
 *
 * Entry point for framework-agnostic pattern detection.
 * Registers shared patterns that apply across all codebases.
 */
import { ConstantInliningPattern } from './constant-inlining.js';
/**
 * Register all shared pattern modules with the given registry.
 *
 * @param registry - Pattern registry to register modules with
 */
export function registerSharedPatterns(registry) {
    // Quality improvement: Constant value inlining
    registry.register(new ConstantInliningPattern());
    // Future shared patterns:
    // - Factory pattern detection
    // - Service client patterns
    // - Logging patterns
    // - Configuration object patterns
}
// Export pattern modules for direct use if needed
export { ConstantInliningPattern, };
//# sourceMappingURL=index.js.map