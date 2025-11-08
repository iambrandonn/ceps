/**
 * Phase 6 I4: Mongoose Query Pattern
 *
 * Detects Mongoose query operations in route handlers and functions.
 * Links queries to model definitions for enriched behavior descriptions.
 */
import { KnowledgeBase } from '../../../kb/knowledge-base.js';
import { Entity, BehaviorChunk } from '../../../kb/models.js';
import { PatternModule, PatternPriority, ConfidenceDelta } from '../types.js';
export declare class MongooseQueryPattern implements PatternModule {
    id: string;
    priority: PatternPriority;
    private chunkIds;
    /**
     * Match functions or constants that contain Mongoose query calls.
     *
     * Works with:
     * - Router constants (queries in route handler definitions)
     * - Functions (queries in function body)
     * - Methods (queries in method body)
     */
    matches(kb: KnowledgeBase, entity: Entity): boolean;
    /**
     * Generate behavior chunk describing query operations.
     */
    describe(kb: KnowledgeBase, entity: Entity): BehaviorChunk[];
    /**
     * Confidence adjustment for Mongoose Query pattern.
     */
    confidenceAdjustments(kb: KnowledgeBase, entity: Entity): ConfidenceDelta | undefined;
    /**
     * Extract query operations from entity's calls-expression facts.
     */
    private extractQueryOperations;
    /**
     * Resolve model name to model entity.
     *
     * Strategy:
     * 1. Check for model constant in same file
     * 2. Check for imported model from related files
     * 3. Search all entities for matching model name
     */
    private resolveModelEntity;
    /**
     * Get category for a query method.
     */
    private getMethodCategory;
    /**
     * Categorize operation for human-readable description.
     */
    private categorizeOperation;
    /**
     * Generate deterministic chunk ID.
     */
    private generateChunkId;
}
//# sourceMappingURL=mongoose-query.d.ts.map