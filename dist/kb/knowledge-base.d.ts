import { Entity, FactSet, BehaviorChunk, Relation, OpenQuestion, AnswerRecord } from './models.js';
import { Confidence } from '../types/index.js';
export declare class KBError extends Error {
    constructor(message: string);
}
export declare class KnowledgeBase {
    private state;
    private batch;
    private callGraphCache;
    private importGraphCache;
    private reverseDepsCache;
    constructor();
    private createEmptyState;
    private getActiveState;
    private deepCloneEntity;
    private deepCloneFactSet;
    private deepCloneBehaviorChunk;
    private deepCloneState;
    insertEntity(entity: Entity): void;
    updateEntity(id: string, updates: Partial<Entity>): void;
    private removeFromIndices;
    getEntity(id: string): Entity | undefined;
    findByPath(path: string): Entity[];
    listExported(): Entity[];
    insertFactSet(factSet: FactSet): void;
    getFactSet(id: string): FactSet | undefined;
    /**
     * Get all factSets that have facts with the given entityId as subjectId.
     * Used by IntentLifter and Orchestrator to gather facts for an entity.
     *
     * @param entityId - Entity ID to search for
     * @returns Array of factSets containing facts about this entity
     */
    getFactSetsBySubject(entityId: string): FactSet[];
    insertChunk(chunk: BehaviorChunk): void;
    getChunk(id: string): BehaviorChunk | undefined;
    /**
     * Phase 3 Step 4: Returns all behavior chunks in the KB.
     * Used by AmbiguityResolver to iterate over chunks during resolution.
     */
    getAllChunks(): BehaviorChunk[];
    /**
     * Phase 3 Step 4: Returns all behavior chunks associated with a given entity.
     * Used for cross-reference analysis (finding chunks for callees).
     */
    getChunksByEntity(entityId: string): BehaviorChunk[];
    /**
     * Phase 3 Step 4: Updates a behavior chunk with partial updates (e.g., confidence promotion).
     * Used by AmbiguityResolver to promote chunk confidence during iteration.
     */
    updateChunk(id: string, updates: Partial<BehaviorChunk>): void;
    /**
     * Inserts an open question (QID) into the KB.
     * Used by AmbiguityResolver to store generated QIDs for Low confidence items.
     */
    insertOpenQuestion(oq: OpenQuestion): void;
    /**
     * Returns all open questions associated with a given entity.
     * Used by AmbiguityResolver to build ambiguity queue.
     */
    getOpenQuestionsByEntity(entityId: string): OpenQuestion[];
    /**
     * Returns all open questions in the KB.
     * Used by Spec Generator to emit QID sections.
     */
    getAllOpenQuestions(): OpenQuestion[];
    getAnswer(qid: string): AnswerRecord | undefined;
    getAllAnswers(): AnswerRecord[];
    attachAnswer(qid: string, answer: string, options?: {
        appliedAt?: string;
    }): AnswerRecord;
    markQIDResolved(qid: string): void;
    /**
     * Insert a relation into the KB.
     * Used by Parser in Phase 2 to store import/export/call relations.
     * Phase 3: Invalidates graph index caches.
     */
    insertRelation(relation: Relation): void;
    /**
     * Get relations for a specific entity (by subject or object),
     * or get all relations if no entityId is provided.
     */
    getRelations(entityId?: string): Relation[];
    /**
     * Replace all relations in the KB with a new set (e.g., after resolution).
     * Used by Step 0 (RelationResolver) and orchestrator to store resolved relations.
     * Invalidates graph index caches.
     */
    replaceRelations(relations: Relation[]): void;
    /**
     * Compute confidence score (0-100) for given factSets using weighted rule model.
     *
     * Algorithm:
     *   confidence = base_evidence + Σ(reinforcers) - Σ(penalties)
     *   confidence = clamp(confidence, 0, 100)
     *
     * Multi-factSet handling:
     *   - Entities in practice accumulate multiple fact sets (e.g., AST facts, auxiliary facts)
     *   - All supplied factSetIds are merged into a single unified fact collection
     *   - Scoring is computed once on the merged facts to avoid dropping reinforcers/penalties
     *   - Ensures consistent confidence values during intent lifting (Agent 2)
     *
     * @param factSetIds - Array of factSet IDs to score
     * @returns Numeric score 0-100
     */
    getConfidenceScore(factSetIds: string[]): number;
    /**
     * Returns confidence band classification: 'High' (≥70), 'Medium' (40-69), 'Low' (<40).
     *
     * @param score - Numeric score 0-100
     * @returns Confidence band
     */
    scoreToConfidenceBand(score: number): Confidence;
    /**
     * Primary API: Compute confidence band for given factSets.
     * Replaces Phase 2 stub implementation.
     *
     * @param factSetIds - Array of factSet IDs to score
     * @returns Confidence band: 'High' | 'Medium' | 'Low'
     */
    scoreConfidence(factSetIds: string[]): Confidence;
    /**
     * Compute base evidence score based on entity kind and facts.
     * @internal
     */
    private computeBaseEvidence;
    /**
     * Compute reinforcers (additive bonuses).
     * Phase 3 implements available signals only (4 of 7 from spec).
     * @internal
     */
    private computeReinforcers;
    /**
     * Compute penalties (subtractive).
     * Phase 3 implements available signals only (2 of 5 from spec).
     * @internal
     */
    private computePenalties;
    /**
     * Helper: Merge multiple factSets into a unified factSet for scoring.
     * Combines all facts from the supplied factSetIds into a single collection.
     * @internal
     */
    private mergeFactSets;
    /**
     * Helper: Extract subject ID from factSet (first fact's subjectId).
     * @internal
     */
    private getSubjectId;
    /**
     * Helper: Check if factSet has a fact with given predicate.
     * @internal
     */
    private hasFactPredicate;
    /**
     * Helper: Clamp value to [min, max].
     * @internal
     */
    private clamp;
    /**
     * Stub: Query related entities by relation type (Phase 3).
     * Returns empty array in Phase 1.
     */
    neighbors(_entityId: string, _relation: string): Entity[];
    /**
     * Stub: List all open questions (Phase 3).
     * Returns empty array in Phase 1.
     */
    listOpenQuestions(): Array<{
        qid: string;
        entityId: string;
        text: string;
    }>;
    /**
     * Get all entities in the KB.
     * Added for Phase 3 (needed by relation resolver and reasoning engine).
     */
    getAllEntities(): Entity[];
    /**
     * Get all factSets in the KB.
     * Added for Phase 3 (needed by reasoning engine).
     */
    getAllFactSets(): FactSet[];
    /**
     * Allocate a QID for an ambiguity (idempotent).
     * Uses generateQID and tracks allocated QIDs.
     * FIX HIGH-1: Make idempotent (same inputs → same QID)
     */
    allocateQID(filePath: string, entityKey: string, ambiguityKind: string): string;
    /**
     * Validate that a QID is unique (not already allocated).
     */
    validateQIDUniqueness(qid: string): boolean;
    /**
     * No-op in Phase 1: Anchors are computed inline during entity creation.
     * Phase 3 may add batch anchor computation for existing entities.
     */
    computeAnchors(): void;
    beginBatch(): void;
    commit(): void;
    rollback(): void;
    /**
     * Returns the call graph: Map from caller entity ID to set of callee entity IDs.
     * Graph is built from resolved call relations (predicate='calls', objectId != null).
     * After RelationResolver runs, objectId is either an entity ID or null (unresolved).
     * Lazy-built and cached; invalidated on relation changes.
     */
    getCallGraph(): Map<string, Set<string>>;
    /**
     * Returns the import graph: Map from importing file path to set of module specifiers.
     * Graph is built from import relations (predicate='imports').
     * Lazy-built and cached; invalidated on relation changes.
     */
    getImportGraph(): Map<string, Set<string>>;
    /**
     * Returns the set of entities/files that depend on the given entity/file (reverse dependencies).
     * Includes both 'calls' relations (entity-level) and 'imports' relations (file-level).
     * Lazy-built and cached; invalidated on relation changes.
     *
     * @param entityIdOrPath - Entity ID or file path to query
     * @returns Set of entity IDs or file paths that depend on the target
     */
    getReverseDeps(entityIdOrPath: string): Set<string>;
    /**
     * Build reverse dependencies cache by inverting call and import graphs.
     * Captures both entity-level and file-level dependencies.
     * For call relations, objectId null means unresolved (skipped).
     */
    private buildReverseDepsCache;
    /**
     * Invalidate all graph index caches.
     * Called when relations are modified.
     */
    private invalidateGraphCaches;
    /**
     * Serialize KB state to JSON string.
     * Used for persisting KB between baseline and finalize runs.
     */
    serialize(): string;
    /**
     * Deserialize KB state from JSON string.
     * Throws if version mismatch or invalid JSON.
     */
    deserialize(json: string): void;
    /**
     * Serialize KB to file.
     * Creates parent directories if needed.
     */
    serializeToFile(filepath: string): Promise<void>;
    /**
     * Deserialize KB from file.
     * Throws if file does not exist or is invalid.
     */
    deserializeFromFile(filepath: string): Promise<void>;
}
//# sourceMappingURL=knowledge-base.d.ts.map