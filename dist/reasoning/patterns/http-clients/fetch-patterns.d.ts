/**
 * Phase 6 I1: Fetch Pattern
 *
 * Detects Fetch API wrapper functions.
 * Extracts URL, method, error handling patterns from async functions that call fetch().
 */
import { KnowledgeBase } from '../../../kb/knowledge-base.js';
import { Entity, BehaviorChunk } from '../../../kb/models.js';
import { PatternModule, PatternPriority, ConfidenceDelta } from '../types.js';
export declare class FetchPattern implements PatternModule {
    id: string;
    priority: PatternPriority;
    private chunkIds;
    /**
     * Match async functions that call fetch().
     */
    matches(kb: KnowledgeBase, entity: Entity): boolean;
    /**
     * Generate behavior chunk describing fetch wrapper.
     */
    describe(kb: KnowledgeBase, entity: Entity): BehaviorChunk[];
    /**
     * Confidence adjustment for fetch patterns.
     */
    confidenceAdjustments(kb: KnowledgeBase, entity: Entity): ConfidenceDelta | undefined;
    /**
     * Detect error handling patterns (try-catch, Error constructor).
     */
    private detectErrorHandling;
    /**
     * Determine confidence based on extracted information.
     */
    private determineConfidence;
    /**
     * Build human-readable description.
     */
    private buildDescription;
    /**
     * Generate deterministic chunk ID.
     */
    private generateChunkId;
}
//# sourceMappingURL=fetch-patterns.d.ts.map