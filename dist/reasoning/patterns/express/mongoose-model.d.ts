/**
 * Phase 6 I4: Mongoose Model Pattern
 *
 * Detects Mongoose model definitions (mongoose.model('Name', schema)).
 * Links models to their schemas and inherits field/ref information.
 */
import { KnowledgeBase } from '../../../kb/knowledge-base.js';
import { Entity, BehaviorChunk } from '../../../kb/models.js';
import { PatternModule, PatternPriority, ConfidenceDelta } from '../types.js';
export declare class MongooseModelPattern implements PatternModule {
    id: string;
    priority: PatternPriority;
    private chunkIds;
    /**
     * Match Mongoose Model: constant initialized with mongoose.model(...).
     */
    matches(kb: KnowledgeBase, entity: Entity): boolean;
    /**
     * Generate behavior chunk describing the model.
     */
    describe(kb: KnowledgeBase, entity: Entity): BehaviorChunk[];
    /**
     * Confidence adjustment for Mongoose Model pattern.
     */
    confidenceAdjustments(kb: KnowledgeBase, entity: Entity): ConfidenceDelta | undefined;
    /**
     * Resolve schema reference to schema entity.
     *
     * Strategy:
     * 1. Look for constant entity with matching name in same file
     * 2. If not found, search all entities in KB (may be imported)
     * 3. Return entity if it has 'new Schema' initializer pattern
     */
    private resolveSchemaEntity;
    /**
     * Generate deterministic chunk ID.
     */
    private generateChunkId;
}
//# sourceMappingURL=mongoose-model.d.ts.map