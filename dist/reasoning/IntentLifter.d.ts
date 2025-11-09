/**
 * Phase 3 Step 3: IntentLifter (Updated for Phase 6)
 *
 * Converts factSets to BehaviorChunks with human-readable text.
 * Uses PatternMatcher (Phase 3) OR PatternRegistry (Phase 6) to detect framework patterns.
 * Computes confidence using KB.scoreConfidence() API.
 *
 * Phase 6 Enhancement:
 * - Accepts optional PatternRegistry for advanced pattern detection
 * - Falls back to legacy PatternMatcher if registry not provided
 * - Preserves backward compatibility for Phase 3 tests
 */
import { KnowledgeBase } from '../kb/knowledge-base.js';
import { BehaviorChunk } from '../kb/models.js';
import { PatternMatcher } from './PatternMatcher.js';
import { PatternRegistry } from './patterns/pattern-registry.js';
export declare class IntentLifter {
    private kb;
    private matcher;
    private registry?;
    private chunkIds;
    constructor(kb: KnowledgeBase, matcher: PatternMatcher, registry?: PatternRegistry | undefined);
    /**
     * Lift factSets into a BehaviorChunk with human-readable intent.
     *
     * Phase 6 Update: Tries PatternRegistry first (entity-based), falls back to PatternMatcher.
     *
     * @param factSetIds - Array of factSet IDs to lift (typically one per entity)
     * @returns BehaviorChunk with textDraft, confidence, and factSetIds
     */
    liftIntent(factSetIds: string[]): BehaviorChunk;
    /**
     * Build text description based on detected pattern.
     * Incorporates JSDoc if available.
     */
    private buildPatternBasedText;
    /**
     * Build generic text description when no pattern matches.
     * Falls back to JSDoc or generic placeholder.
     *
     * Enhancement (Phase 6 Wave 2): Infers behavior from call patterns when JSDoc absent.
     * This significantly reduces "intent unclear" fallback by detecting common utility patterns.
     */
    private buildGenericText;
    /**
     * Infer behavioral description from call patterns and parameter names.
     *
     * Phase 6 Wave 2 Enhancement: This lightweight heuristic system provides basic
     * behavioral descriptions when JSDoc is absent and no framework patterns match.
     *
     * Detected Patterns:
     * - Array operations: filter, map, reduce, find, some, every, sort
     * - Comparison functions: parameter names like (previous, current) or (old, new)
     * - Validation functions: boolean return + is/has/validate/check prefix
     * - Getter/setter patterns: get*, set*, update*, with*, create* prefixes
     * - Iteration: forEach loops
     * - Object operations: assign, merge
     *
     * Priority: Checks parameter-based patterns first (more specific), then call-based.
     *
     * @param entity - Entity being analyzed
     * @param factSet - Facts about the entity
     * @returns Inferred description or null if no patterns detected
     */
    private inferFromCallPatterns;
    /**
     * Get human-readable label for entity kind.
     */
    private getEntityKindLabel;
    /**
     * Extract subject ID from factSet (first fact's subjectId).
     */
    private getSubjectId;
    /**
     * Generate unique chunk ID based on entity.
     * Uses content-based anchor to ensure determinism.
     */
    private generateChunkId;
}
//# sourceMappingURL=IntentLifter.d.ts.map