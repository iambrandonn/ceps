/**
 * Phase 6 I1: Axios Client Pattern
 *
 * Detects Axios client instances created via axios.create().
 * Extracts configuration (baseURL, timeout, headers) from initializer.
 */
import { KnowledgeBase } from '../../../kb/knowledge-base.js';
import { Entity, BehaviorChunk } from '../../../kb/models.js';
import { PatternModule, PatternPriority, ConfidenceDelta } from '../types.js';
export declare class AxiosClientPattern implements PatternModule {
    id: string;
    priority: PatternPriority;
    private chunkIds;
    /**
     * Match Axios client instances: constants with axios.create initializer.
     */
    matches(kb: KnowledgeBase, entity: Entity): boolean;
    /**
     * Generate behavior chunk describing Axios client configuration.
     */
    describe(kb: KnowledgeBase, entity: Entity): BehaviorChunk[];
    /**
     * Confidence adjustment for Axios client pattern.
     */
    confidenceAdjustments(kb: KnowledgeBase, entity: Entity): ConfidenceDelta | undefined;
    /**
     * Parse Axios config from initializer text.
     */
    private parseConfig;
    /**
     * Check if config is dynamically constructed.
     */
    private isDynamicConfig;
    /**
     * Determine confidence based on parsed config.
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
//# sourceMappingURL=axios-client.d.ts.map