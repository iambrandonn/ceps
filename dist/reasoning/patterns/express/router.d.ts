/**
 * Phase 6 I1: Express Router Pattern
 *
 * Detects Express Router constants (initialized with Router()).
 * Also extracts route handler definitions (router.get, router.post, etc.).
 */
import { KnowledgeBase } from '../../../kb/knowledge-base.js';
import { Entity, BehaviorChunk } from '../../../kb/models.js';
import { PatternModule, PatternPriority, ConfidenceDelta } from '../types.js';
export declare class ExpressRouterPattern implements PatternModule {
    id: string;
    priority: PatternPriority;
    private chunkIds;
    /**
     * Match Express Router: constant initialized with Router().
     */
    matches(kb: KnowledgeBase, entity: Entity): boolean;
    /**
     * Generate behavior chunk describing router and its routes.
     */
    describe(kb: KnowledgeBase, entity: Entity): BehaviorChunk[];
    /**
     * Confidence adjustment for Express Router pattern.
     */
    confidenceAdjustments(kb: KnowledgeBase, entity: Entity): ConfidenceDelta | undefined;
    /**
     * Extract route handlers from calls-expression facts.
     *
     * Per Phase -1 analysis findings (PHASE6_EXPRESS_PHASE_MINUS_ONE.md),
     * we need to parse facts in order to associate call-arg-0 with the
     * correct calls-expression.
     */
    private extractRoutes;
    /**
     * Generate deterministic chunk ID.
     */
    private generateChunkId;
}
//# sourceMappingURL=router.d.ts.map