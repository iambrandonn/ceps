/**
 * Phase 6 I4: Mongoose Schema Pattern
 *
 * Detects Mongoose schema definitions (new Schema({...})).
 * Extracts field names and references to other models.
 */
import { KnowledgeBase } from '../../../kb/knowledge-base.js';
import { Entity, BehaviorChunk } from '../../../kb/models.js';
import { PatternModule, PatternPriority, ConfidenceDelta } from '../types.js';
export declare class MongooseSchemaPattern implements PatternModule {
    id: string;
    priority: PatternPriority;
    private chunkIds;
    /**
     * Match Mongoose Schema: constant initialized with new Schema({...}).
     *
     * Note: Parser doesn't extract initializer-call for 'new' expressions,
     * so we match on initializer text pattern.
     */
    matches(kb: KnowledgeBase, entity: Entity): boolean;
    /**
     * Generate behavior chunk describing the schema.
     */
    describe(kb: KnowledgeBase, entity: Entity): BehaviorChunk[];
    /**
     * Confidence adjustment for Mongoose Schema pattern.
     */
    confidenceAdjustments(kb: KnowledgeBase, entity: Entity): ConfidenceDelta | undefined;
    /**
     * Extract field names and metadata from schema initializer.
     *
     * Strategy:
     * - Simple fields: name: Type or name: { type: Type }
     * - Required: required: true
     * - References: ref: 'ModelName'
     *
     * Limitations:
     * - Doesn't parse deeply nested objects or arrays
     * - Doesn't handle virtuals, methods, statics
     * - Best-effort regex parsing (not a full JS parser)
     */
    private extractFields;
    /**
     * Determine confidence based on schema complexity.
     */
    private determineConfidence;
    /**
     * Generate deterministic chunk ID.
     */
    private generateChunkId;
}
//# sourceMappingURL=mongoose-schema.d.ts.map