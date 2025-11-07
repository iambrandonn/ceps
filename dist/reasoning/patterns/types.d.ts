/**
 * Phase 6: Pattern Module Architecture
 *
 * Defines the contract for framework-specific pattern modules.
 * Replaces the Phase 3 monolithic PatternMatcher with a modular,
 * extensible registry-based system.
 */
import { KnowledgeBase } from '../../kb/knowledge-base.js';
import { Entity, BehaviorChunk } from '../../kb/models.js';
/**
 * Confidence adjustment delta applied by patterns.
 * Positive values increase confidence, negative decrease.
 * Must be within ±5 bounds per pattern (validated at registration).
 */
export interface ConfidenceDelta {
    adjustment: number;
    reason: string;
}
/**
 * Priority levels for pattern precedence.
 * Higher-priority patterns evaluated first.
 */
export declare enum PatternPriority {
    SHARED_PRIMITIVES = 1,// Generic patterns (HTTP verbs, async, etc.)
    FRAMEWORK_CORE = 2,// Framework-specific patterns (Express routes, React hooks)
    AUXILIARY_ADAPTERS = 3
}
/**
 * Contract for framework-specific pattern modules.
 *
 * Each module implements detection and description logic for
 * a specific framework pattern (e.g., Express routes, React hooks).
 *
 * Error Handling Contract:
 * - matches() and describe() must NEVER throw
 * - On unexpected structures, return false from matches()
 * - On errors during describe(), emit Low-confidence Open Question chunks
 * - Log diagnostic metadata for debugging
 */
export interface PatternModule {
    /**
     * Unique identifier for this pattern module.
     * Format: <framework>.<pattern-name>
     * Example: "express.routes", "react.hooks.useState"
     */
    id: string;
    /**
     * Priority level for pattern precedence.
     */
    priority: PatternPriority;
    /**
     * Test if this pattern matches the given entity.
     *
     * @param kb - KnowledgeBase for querying facts/relations
     * @param entity - Entity to test
     * @returns true if pattern matches, false otherwise
     *
     * MUST NOT THROW - wrap in try/catch and return false on errors
     */
    matches(kb: KnowledgeBase, entity: Entity): boolean;
    /**
     * Generate behavior chunks for the matched entity.
     *
     * @param kb - KnowledgeBase for querying facts/relations
     * @param entity - Entity that matched
     * @returns Array of BehaviorChunks describing the entity's behavior
     *
     * MUST NOT THROW - wrap in try/catch and return Low-confidence
     * Open Question chunks on errors with diagnostic metadata
     */
    describe(kb: KnowledgeBase, entity: Entity): BehaviorChunk[];
    /**
     * Optional confidence adjustments for this pattern.
     *
     * @param kb - KnowledgeBase for querying facts/relations
     * @param entity - Entity that matched
     * @returns Confidence delta or undefined if no adjustment
     *
     * Adjustments must stay within ±5 bounds per call.
     * Multiple patterns can stack adjustments (registry enforces total cap).
     */
    confidenceAdjustments?(kb: KnowledgeBase, entity: Entity): ConfidenceDelta | undefined;
}
/**
 * Registration error thrown when pattern module violates contract.
 */
export declare class PatternRegistrationError extends Error {
    patternId: string;
    constructor(patternId: string, message: string);
}
//# sourceMappingURL=types.d.ts.map