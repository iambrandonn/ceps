/**
 * Phase 3 Step 3: IntentLifter
 *
 * Converts factSets to BehaviorChunks with human-readable text.
 * Uses PatternMatcher to detect framework patterns and generate intent-focused descriptions.
 * Computes confidence using KB.scoreConfidence() API.
 */
import { KnowledgeBase } from '../kb/knowledge-base.js';
import { BehaviorChunk } from '../kb/models.js';
import { PatternMatcher } from './PatternMatcher.js';
export declare class IntentLifter {
    private kb;
    private matcher;
    private chunkIds;
    constructor(kb: KnowledgeBase, matcher: PatternMatcher);
    /**
     * Lift factSets into a BehaviorChunk with human-readable intent.
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
     */
    private buildGenericText;
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