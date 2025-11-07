/**
 * Phase 6 I1: Express Middleware Pattern
 *
 * Detects Express middleware functions (3-parameter signature: req, res, next).
 */
import { KnowledgeBase } from '../../../kb/knowledge-base.js';
import { Entity, BehaviorChunk } from '../../../kb/models.js';
import { PatternModule, PatternPriority, ConfidenceDelta } from '../types.js';
export declare class ExpressMiddlewarePattern implements PatternModule {
    id: string;
    priority: PatternPriority;
    private chunkIds;
    /**
     * Match Express middleware: 3-param function with req/res/next signature.
     */
    matches(kb: KnowledgeBase, entity: Entity): boolean;
    /**
     * Generate behavior chunk describing middleware function.
     */
    describe(kb: KnowledgeBase, entity: Entity): BehaviorChunk[];
    /**
     * Confidence adjustment for Express middleware pattern.
     */
    confidenceAdjustments(kb: KnowledgeBase, entity: Entity): ConfidenceDelta | undefined;
    /**
     * Generate deterministic chunk ID.
     */
    private generateChunkId;
}
//# sourceMappingURL=middleware.d.ts.map