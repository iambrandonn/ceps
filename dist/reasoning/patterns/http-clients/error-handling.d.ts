/**
 * Phase 6 I1: HTTP Error Handling Pattern
 *
 * Detects HTTP-specific error handling patterns.
 * Identifies try-catch blocks with HTTP calls, response.ok checks,
 * and status code validation.
 */
import { KnowledgeBase } from '../../../kb/knowledge-base.js';
import { Entity, BehaviorChunk } from '../../../kb/models.js';
import { PatternModule, PatternPriority, ConfidenceDelta } from '../types.js';
export declare class HttpErrorHandlingPattern implements PatternModule {
    id: string;
    priority: PatternPriority;
    private chunkIds;
    /**
     * Match functions with HTTP-specific error handling.
     */
    matches(kb: KnowledgeBase, entity: Entity): boolean;
    /**
     * Generate behavior chunk describing error handling.
     */
    describe(kb: KnowledgeBase, entity: Entity): BehaviorChunk[];
    /**
     * Confidence adjustment for error handling patterns.
     */
    confidenceAdjustments(kb: KnowledgeBase, entity: Entity): ConfidenceDelta | undefined;
    /**
     * Detect error handling patterns in the entity.
     */
    private detectPatterns;
    /**
     * Check if entity makes HTTP calls (fetch, axios, etc.).
     */
    private hasHttpCall;
    /**
     * Build human-readable description.
     */
    private buildDescription;
    /**
     * Generate deterministic chunk ID.
     */
    private generateChunkId;
}
//# sourceMappingURL=error-handling.d.ts.map