/**
 * Phase 6: Pattern Registry
 *
 * Central registry for framework-specific pattern modules.
 * Handles registration, precedence, and execution of pattern matchers.
 */
import { KnowledgeBase } from '../../kb/knowledge-base.js';
import { Entity, BehaviorChunk } from '../../kb/models.js';
import { PatternModule, ConfidenceDelta } from './types.js';
export declare class PatternRegistry {
    private patterns;
    private sortedPatterns;
    private needsSort;
    /**
     * Register a pattern module.
     *
     * @param pattern - Pattern module to register
     * @throws PatternRegistrationError if validation fails
     */
    register(pattern: PatternModule): void;
    /**
     * Find the first matching pattern for an entity.
     *
     * @param kb - KnowledgeBase for pattern matching
     * @param entity - Entity to match
     * @returns Matched pattern module or null if no match
     */
    match(kb: KnowledgeBase, entity: Entity): PatternModule | null;
    /**
     * Generate behavior chunks using the first matching pattern.
     *
     * @param kb - KnowledgeBase for pattern matching
     * @param entity - Entity to describe
     * @returns Array of BehaviorChunks (empty if no match)
     */
    describe(kb: KnowledgeBase, entity: Entity): BehaviorChunk[];
    /**
     * Get confidence adjustments from the first matching pattern.
     *
     * @param kb - KnowledgeBase for pattern matching
     * @param entity - Entity to analyze
     * @returns Confidence delta or undefined if no match or no adjustments
     */
    getConfidenceAdjustments(kb: KnowledgeBase, entity: Entity): ConfidenceDelta | undefined;
    /**
     * Ensure patterns are sorted by precedence.
     * Called lazily before first match attempt after registration.
     */
    private ensureSorted;
}
//# sourceMappingURL=pattern-registry.d.ts.map