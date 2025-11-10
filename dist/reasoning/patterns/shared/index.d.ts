/**
 * Phase 6 Quality Improvement: Shared Pattern Library
 *
 * Entry point for framework-agnostic pattern detection.
 * Registers shared patterns that apply across all codebases.
 */
import { PatternRegistry } from '../pattern-registry.js';
import { ConstantInliningPattern } from './constant-inlining.js';
/**
 * Register all shared pattern modules with the given registry.
 *
 * @param registry - Pattern registry to register modules with
 */
export declare function registerSharedPatterns(registry: PatternRegistry): void;
export { ConstantInliningPattern, };
//# sourceMappingURL=index.d.ts.map