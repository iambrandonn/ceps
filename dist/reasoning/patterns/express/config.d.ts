/**
 * Phase 6 I3: Express Config Pattern
 *
 * Detects Express configuration and environment variable patterns:
 * - app.set() configuration setting
 * - app.get() configuration reading
 * - process.env.* environment variable reads
 * - Feature flags and conditional configuration
 */
import { KnowledgeBase } from '../../../kb/knowledge-base.js';
import { Entity, BehaviorChunk } from '../../../kb/models.js';
import { PatternModule, PatternPriority, ConfidenceDelta } from '../types.js';
export declare class ExpressConfigPattern implements PatternModule {
    id: string;
    priority: PatternPriority;
    private chunkIds;
    /**
     * Match Express config patterns:
     * - app.set() / app.get() calls
     * - process.env.* property reads
     */
    matches(kb: KnowledgeBase, entity: Entity): boolean;
    /**
     * Generate behavior chunk describing configuration patterns.
     */
    describe(kb: KnowledgeBase, entity: Entity): BehaviorChunk[];
    /**
     * Optional confidence adjustments.
     * Express config patterns have strong signals, so no adjustments needed.
     */
    confidenceAdjustments?(kb: KnowledgeBase, entity: Entity): ConfidenceDelta;
    /**
     * Generate deterministic chunk ID based on entity.
     */
    private generateChunkId;
}
//# sourceMappingURL=config.d.ts.map