/**
 * Phase 6 Quality Improvement: Constant Value Inlining Pattern
 *
 * Detects exported constant objects and inlines their key-value pairs
 * into the generated spec to eliminate "intent unclear" descriptions.
 *
 * Target: Fix 209 Low-confidence constants in research-coi baseline
 *
 * Examples:
 * - Numeric enums: { PENDING: 1, APPROVED: 2 }
 * - String constants: { ADMIN: 'admin', USER: 'user' }
 * - Config objects: { MAX_SIZE: 1024, ENABLED: true }
 */
import { PatternModule, PatternPriority } from '../types.js';
import { KnowledgeBase } from '../../../kb/knowledge-base.js';
import { Entity, BehaviorChunk } from '../../../kb/models.js';
export declare class ConstantInliningPattern implements PatternModule {
    readonly id = "shared.constant-inlining";
    readonly priority = PatternPriority.SHARED_PRIMITIVES;
    matches(kb: KnowledgeBase, entity: Entity): boolean;
    describe(kb: KnowledgeBase, entity: Entity): BehaviorChunk[];
    /**
     * Get initializer string from KB facts
     */
    private getInitializer;
    /**
     * Parse object initializer string into key-value pairs
     * Handles:
     * - Simple literals (numbers, strings, booleans)
     * - Comments (strips them)
     * - Trailing commas
     */
    private parseInitializer;
    /**
     * Parse and classify a value
     */
    private parseValue;
    /**
     * Generate human-readable description from parsed properties
     */
    private generateDescription;
    confidenceAdjustments(kb: KnowledgeBase, entity: Entity): undefined;
}
//# sourceMappingURL=constant-inlining.d.ts.map