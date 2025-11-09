/**
 * Phase 6 I1: Request/Response Transform Pattern
 *
 * Detects functions that transform HTTP request/response data.
 * Identifies JSON parsing (response.json), text parsing (response.text),
 * and request serialization (JSON.stringify).
 */
import { KnowledgeBase } from '../../../kb/knowledge-base.js';
import { Entity, BehaviorChunk } from '../../../kb/models.js';
import { PatternModule, PatternPriority, ConfidenceDelta } from '../types.js';
export declare class RequestResponseTransformPattern implements PatternModule {
    id: string;
    priority: PatternPriority;
    private chunkIds;
    /**
     * Match functions that perform request/response transformations.
     */
    matches(kb: KnowledgeBase, entity: Entity): boolean;
    /**
     * Generate behavior chunk describing transformation behavior.
     */
    describe(kb: KnowledgeBase, entity: Entity): BehaviorChunk[];
    /**
     * Confidence adjustment for transform patterns.
     */
    confidenceAdjustments(kb: KnowledgeBase, entity: Entity): ConfidenceDelta | undefined;
    /**
     * Detect which transformation types are present.
     */
    private detectTransforms;
    /**
     * Build human-readable description.
     */
    private buildDescription;
    /**
     * Generate deterministic chunk ID.
     */
    private generateChunkId;
}
//# sourceMappingURL=request-response-transform.d.ts.map