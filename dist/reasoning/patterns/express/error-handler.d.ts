/**
 * Phase 6 I2: Express Error Handler Pattern
 *
 * Detects Express error middleware (4-param signature: err, req, res, next).
 * Error handlers have priority 2 (framework core) and receive +10 confidence.
 */
import { KnowledgeBase } from '../../../kb/knowledge-base.js';
import { Entity, BehaviorChunk } from '../../../kb/models.js';
import { PatternModule, PatternPriority, ConfidenceDelta } from '../types.js';
export declare class ExpressErrorHandlerPattern implements PatternModule {
    id: string;
    priority: PatternPriority;
    /**
     * Match Express error middleware: 4-param function with err/req/res/next signature.
     */
    matches(kb: KnowledgeBase, entity: Entity): boolean;
    describe(kb: KnowledgeBase, entity: Entity): BehaviorChunk[];
    confidenceAdjustments(kb: KnowledgeBase, entity: Entity): ConfidenceDelta;
}
//# sourceMappingURL=error-handler.d.ts.map