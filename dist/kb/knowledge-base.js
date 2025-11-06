import { generateQID } from './id-generation.js';
export class KBError extends Error {
    constructor(message) {
        super(message);
        this.name = 'KBError';
    }
}
export class KnowledgeBase {
    state;
    batch = null;
    // Phase 3 Step 1: Graph index caches (lazy-built, invalidated on relation changes)
    callGraphCache = null;
    importGraphCache = null;
    reverseDepsCache = null;
    constructor() {
        this.state = this.createEmptyState();
    }
    createEmptyState() {
        return {
            entities: new Map(),
            relations: [],
            factSets: new Map(),
            chunks: new Map(),
            byPath: new Map(),
            byKind: new Map(),
            exported: new Set(),
            qids: new Set(),
            openQuestions: new Map(),
            answers: new Map(),
        };
    }
    getActiveState() {
        return this.batch ?? this.state;
    }
    // FIX CRITICAL-1 & HIGH-2: Deep clone state properly (including nested arrays/objects)
    deepCloneEntity(entity) {
        return {
            ...entity,
            // Clone nested arrays
            anchors: entity.anchors ? [...entity.anchors] : undefined,
            qids: entity.qids ? [...entity.qids] : undefined,
            // Clone nested attributes object and its arrays
            attributes: entity.attributes
                ? {
                    sideEffects: entity.attributes.sideEffects
                        ? [...entity.attributes.sideEffects]
                        : undefined,
                    errors: entity.attributes.errors ? [...entity.attributes.errors] : undefined,
                    configInfluences: entity.attributes.configInfluences
                        ? [...entity.attributes.configInfluences]
                        : undefined,
                    concurrencyNotes: entity.attributes.concurrencyNotes
                        ? [...entity.attributes.concurrencyNotes]
                        : undefined,
                }
                : undefined,
        };
    }
    deepCloneFactSet(factSet) {
        return {
            ...factSet,
            // Clone nested arrays
            facts: factSet.facts.map((f) => ({ ...f })),
            sources: factSet.sources.map((s) => ({ ...s })),
            parents: factSet.parents ? [...factSet.parents] : undefined,
        };
    }
    deepCloneBehaviorChunk(chunk) {
        return {
            ...chunk,
            // Clone nested arrays
            factSetIds: [...chunk.factSetIds],
            assumptions: chunk.assumptions ? [...chunk.assumptions] : undefined,
        };
    }
    deepCloneState(state) {
        return {
            // Deep clone entities (clone Map, Entity objects, and nested arrays/objects)
            entities: new Map(Array.from(state.entities.entries()).map(([k, v]) => [k, this.deepCloneEntity(v)])),
            // Clone relations array
            relations: [...state.relations],
            // Deep clone factSets (clone Map, FactSet objects, and nested arrays)
            factSets: new Map(Array.from(state.factSets.entries()).map(([k, v]) => [k, this.deepCloneFactSet(v)])),
            // Deep clone chunks (clone Map, BehaviorChunk objects, and nested arrays)
            chunks: new Map(Array.from(state.chunks.entries()).map(([k, v]) => [k, this.deepCloneBehaviorChunk(v)])),
            // Deep clone index Sets
            byPath: new Map(Array.from(state.byPath.entries()).map(([k, v]) => [k, new Set(v)])),
            byKind: new Map(Array.from(state.byKind.entries()).map(([k, v]) => [k, new Set(v)])),
            // Clone exported Set
            exported: new Set(state.exported),
            // Clone QIDs Set
            qids: new Set(state.qids),
            answers: new Map(Array.from(state.answers.entries()).map(([k, v]) => [k, { ...v, factSetIds: [...v.factSetIds] }])),
            // Clone openQuestions Map (Phase 3 Step 4)
            openQuestions: new Map(Array.from(state.openQuestions.entries()).map(([k, v]) => [k, { ...v, factSetIds: [...v.factSetIds] }])),
        };
    }
    // -------- Entity Operations --------
    insertEntity(entity) {
        const state = this.getActiveState();
        const existingEntity = state.entities.get(entity.id);
        // FIX CRITICAL-3: Remove old index entries if entity already exists (upsert)
        if (existingEntity) {
            this.removeFromIndices(existingEntity, state);
        }
        state.entities.set(entity.id, entity);
        // Update indices with new entity
        if (!state.byPath.has(entity.path)) {
            state.byPath.set(entity.path, new Set());
        }
        state.byPath.get(entity.path).add(entity.id);
        if (!state.byKind.has(entity.kind)) {
            state.byKind.set(entity.kind, new Set());
        }
        state.byKind.get(entity.kind).add(entity.id);
        if (entity.exported) {
            state.exported.add(entity.id);
        }
    }
    // FIX CRITICAL-4: Update indices when entity properties change
    updateEntity(id, updates) {
        const state = this.getActiveState();
        const entity = state.entities.get(id);
        if (!entity) {
            throw new KBError(`Entity not found: ${id}`);
        }
        // Remove old index entries if indexed properties changed
        const pathChanged = updates.path !== undefined && updates.path !== entity.path;
        const kindChanged = updates.kind !== undefined && updates.kind !== entity.kind;
        const exportedChanged = updates.exported !== undefined && updates.exported !== entity.exported;
        if (pathChanged || kindChanged || exportedChanged) {
            this.removeFromIndices(entity, state);
        }
        // Apply updates
        Object.assign(entity, updates);
        // Re-add to indices with new values
        if (pathChanged || kindChanged || exportedChanged) {
            if (!state.byPath.has(entity.path)) {
                state.byPath.set(entity.path, new Set());
            }
            state.byPath.get(entity.path).add(entity.id);
            if (!state.byKind.has(entity.kind)) {
                state.byKind.set(entity.kind, new Set());
            }
            state.byKind.get(entity.kind).add(entity.id);
            if (entity.exported) {
                state.exported.add(entity.id);
            }
            else {
                state.exported.delete(entity.id);
            }
        }
    }
    removeFromIndices(entity, state) {
        // Remove from byPath
        const pathSet = state.byPath.get(entity.path);
        if (pathSet) {
            pathSet.delete(entity.id);
            if (pathSet.size === 0) {
                state.byPath.delete(entity.path);
            }
        }
        // Remove from byKind
        const kindSet = state.byKind.get(entity.kind);
        if (kindSet) {
            kindSet.delete(entity.id);
            if (kindSet.size === 0) {
                state.byKind.delete(entity.kind);
            }
        }
        // Remove from exported
        if (entity.exported) {
            state.exported.delete(entity.id);
        }
    }
    getEntity(id) {
        return this.getActiveState().entities.get(id);
    }
    findByPath(path) {
        const state = this.getActiveState();
        const ids = state.byPath.get(path);
        if (!ids)
            return [];
        return Array.from(ids)
            .map((id) => state.entities.get(id))
            .filter(Boolean);
    }
    listExported() {
        const state = this.getActiveState();
        return Array.from(state.exported)
            .map((id) => state.entities.get(id))
            .filter(Boolean);
    }
    // -------- FactSet Operations --------
    insertFactSet(factSet) {
        this.getActiveState().factSets.set(factSet.id, factSet);
    }
    getFactSet(id) {
        return this.getActiveState().factSets.get(id);
    }
    /**
     * Get all factSets that have facts with the given entityId as subjectId.
     * Used by IntentLifter and Orchestrator to gather facts for an entity.
     *
     * @param entityId - Entity ID to search for
     * @returns Array of factSets containing facts about this entity
     */
    getFactSetsBySubject(entityId) {
        const state = this.getActiveState();
        const result = [];
        for (const factSet of state.factSets.values()) {
            // Check if any fact in this factSet has matching subjectId
            if (factSet.facts.some(f => f.subjectId === entityId)) {
                result.push(factSet);
            }
        }
        return result;
    }
    // -------- BehaviorChunk Operations --------
    insertChunk(chunk) {
        this.getActiveState().chunks.set(chunk.id, chunk);
    }
    getChunk(id) {
        return this.getActiveState().chunks.get(id);
    }
    /**
     * Phase 3 Step 4: Returns all behavior chunks in the KB.
     * Used by AmbiguityResolver to iterate over chunks during resolution.
     */
    getAllChunks() {
        const state = this.getActiveState();
        return Array.from(state.chunks.values());
    }
    /**
     * Phase 3 Step 4: Returns all behavior chunks associated with a given entity.
     * Used for cross-reference analysis (finding chunks for callees).
     */
    getChunksByEntity(entityId) {
        const state = this.getActiveState();
        return Array.from(state.chunks.values())
            .filter(chunk => chunk.targetEntityId === entityId);
    }
    /**
     * Phase 3 Step 4: Updates a behavior chunk with partial updates (e.g., confidence promotion).
     * Used by AmbiguityResolver to promote chunk confidence during iteration.
     */
    updateChunk(id, updates) {
        const state = this.getActiveState();
        const existing = state.chunks.get(id);
        if (!existing) {
            throw new KBError(`Chunk ${id} not found`);
        }
        state.chunks.set(id, { ...existing, ...updates });
    }
    // -------- OpenQuestion Operations (Phase 3 Step 4) --------
    /**
     * Inserts an open question (QID) into the KB.
     * Used by AmbiguityResolver to store generated QIDs for Low confidence items.
     */
    insertOpenQuestion(oq) {
        const state = this.getActiveState();
        state.openQuestions.set(oq.qid, oq);
    }
    /**
     * Returns all open questions associated with a given entity.
     * Used by AmbiguityResolver to build ambiguity queue.
     */
    getOpenQuestionsByEntity(entityId) {
        const state = this.getActiveState();
        return Array.from(state.openQuestions.values())
            .filter(oq => oq.entityId === entityId);
    }
    /**
     * Returns all open questions in the KB.
     * Used by Spec Generator to emit QID sections.
     */
    getAllOpenQuestions() {
        const state = this.getActiveState();
        return Array.from(state.openQuestions.values());
    }
    getAnswer(qid) {
        return this.getActiveState().answers.get(qid);
    }
    getAllAnswers() {
        return Array.from(this.getActiveState().answers.values());
    }
    attachAnswer(qid, answer, options = {}) {
        const state = this.getActiveState();
        const question = state.openQuestions.get(qid);
        if (!question) {
            throw new KBError(`Cannot attach answer; unknown QID: ${qid}`);
        }
        const appliedAt = options.appliedAt ?? new Date().toISOString();
        const existing = state.answers.get(qid);
        if (existing && existing.answer === answer) {
            return existing;
        }
        const record = {
            qid,
            entityId: question.entityId,
            answer,
            appliedAt,
            factSetIds: [...question.factSetIds]
        };
        state.answers.set(qid, record);
        return record;
    }
    markQIDResolved(qid) {
        const state = this.getActiveState();
        state.openQuestions.delete(qid);
        state.answers.delete(qid);
        state.qids.delete(qid);
    }
    // -------- Relation Operations (Phase 2) --------
    /**
     * Insert a relation into the KB.
     * Used by Parser in Phase 2 to store import/export/call relations.
     * Phase 3: Invalidates graph index caches.
     */
    insertRelation(relation) {
        const state = this.getActiveState();
        state.relations.push(relation);
        // Phase 3 Step 1: Invalidate graph caches
        this.invalidateGraphCaches();
    }
    /**
     * Get relations for a specific entity (by subject or object),
     * or get all relations if no entityId is provided.
     */
    getRelations(entityId) {
        const state = this.getActiveState();
        if (!entityId) {
            return [...state.relations];
        }
        return state.relations.filter((r) => r.subjectId === entityId || r.objectId === entityId);
    }
    /**
     * Replace all relations in the KB with a new set (e.g., after resolution).
     * Used by Step 0 (RelationResolver) and orchestrator to store resolved relations.
     * Invalidates graph index caches.
     */
    replaceRelations(relations) {
        const state = this.getActiveState();
        state.relations = [...relations]; // Deep copy to avoid external mutation
        this.invalidateGraphCaches();
    }
    // -------- Confidence Scoring (Phase 3 Step 2) --------
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
    getConfidenceScore(factSetIds) {
        if (factSetIds.length === 0) {
            return 0;
        }
        // Merge all factSets into unified collection
        const mergedFactSet = this.mergeFactSets(factSetIds);
        if (!mergedFactSet) {
            return 0;
        }
        let score = this.computeBaseEvidence(mergedFactSet);
        score += this.computeReinforcers(mergedFactSet);
        score -= this.computePenalties(mergedFactSet);
        return this.clamp(score, 0, 100);
    }
    /**
     * Returns confidence band classification: 'High' (≥70), 'Medium' (40-69), 'Low' (<40).
     *
     * @param score - Numeric score 0-100
     * @returns Confidence band
     */
    scoreToConfidenceBand(score) {
        if (score >= 70)
            return 'High';
        if (score >= 40)
            return 'Medium';
        return 'Low';
    }
    /**
     * Primary API: Compute confidence band for given factSets.
     * Replaces Phase 2 stub implementation.
     *
     * @param factSetIds - Array of factSet IDs to score
     * @returns Confidence band: 'High' | 'Medium' | 'Low'
     */
    scoreConfidence(factSetIds) {
        const score = this.getConfidenceScore(factSetIds);
        return this.scoreToConfidenceBand(score);
    }
    /**
     * Compute base evidence score based on entity kind and facts.
     * @internal
     */
    computeBaseEvidence(factSet) {
        const subjectId = this.getSubjectId(factSet);
        const entity = this.getEntity(subjectId);
        if (!entity) {
            return 20; // Default for unknown entity
        }
        const hasExport = entity.exported === true;
        const hasJSDoc = this.hasFactPredicate(factSet, 'has-jsdoc');
        switch (entity.kind) {
            case 'function':
                if (hasExport && hasJSDoc)
                    return 40;
                if (hasExport)
                    return 30;
                if (hasJSDoc)
                    return 30;
                return 20;
            case 'class':
                if (hasExport && hasJSDoc)
                    return 40;
                if (hasExport)
                    return 30;
                return 25;
            case 'method':
                if (hasJSDoc)
                    return 35;
                return 25;
            case 'constant':
            case 'config':
                // Phase 3: No comment extraction yet, default to 25
                return 25;
            case 'endpoint':
                return 45;
            default:
                return 20;
        }
    }
    /**
     * Compute reinforcers (additive bonuses).
     * Phase 3 implements available signals only (4 of 7 from spec).
     * @internal
     */
    computeReinforcers(factSet) {
        let reinforcers = 0;
        // Type annotations: +15
        if (this.hasFactPredicate(factSet, 'has-signature')) {
            reinforcers += 15;
        }
        // Caller count (from reverseDeps): +10 for ≥3, +5 for 1-2
        const subjectId = this.getSubjectId(factSet);
        const reverseDeps = this.getReverseDeps(subjectId);
        if (reverseDeps.size >= 3) {
            reinforcers += 10;
        }
        else if (reverseDeps.size >= 1) {
            reinforcers += 5;
        }
        // Error handling: +5 (from entity attributes)
        const entity = this.getEntity(subjectId);
        if (entity && (entity.attributes?.errors?.length ?? 0) > 0) {
            reinforcers += 5;
        }
        // TODO Phase 6: Test coverage (+10) - needs test-reader enhancement
        // TODO Phase 6: Config/env documented (+5) - needs config-reader enhancement
        // TODO Phase 6: Complete JSDoc (+5) - needs JSDoc parser
        return reinforcers;
    }
    /**
     * Compute penalties (subtractive).
     * Phase 3 implements available signals only (2 of 5 from spec).
     * @internal
     */
    computePenalties(factSet) {
        let penalties = 0;
        // No type info: -10 (only for functions/methods that should have signatures)
        // Exemption: classes, constants, configs, endpoints don't require signatures
        const subjectId = this.getSubjectId(factSet);
        const entity = this.getEntity(subjectId);
        if (entity && (entity.kind === 'function' || entity.kind === 'method')) {
            if (!this.hasFactPredicate(factSet, 'has-signature')) {
                penalties += 10;
            }
        }
        // Unused (no reverse deps): -5
        const reverseDeps = this.getReverseDeps(subjectId);
        if (reverseDeps.size === 0) {
            penalties += 5;
        }
        // TODO Phase 6: Dynamic pattern (-20) - needs pattern detector
        // TODO Phase 6: TODO/FIXME comment (-10) - needs comment extractor
        // TODO Phase 6: High complexity (-5) - needs complexity analyzer
        return penalties;
    }
    /**
     * Helper: Merge multiple factSets into a unified factSet for scoring.
     * Combines all facts from the supplied factSetIds into a single collection.
     * @internal
     */
    mergeFactSets(factSetIds) {
        const allFacts = [];
        const allSources = [];
        let subjectId = null;
        for (const fsId of factSetIds) {
            const factSet = this.getFactSet(fsId);
            if (factSet) {
                allFacts.push(...factSet.facts);
                allSources.push(...factSet.sources);
                // Extract subjectId from first fact (all facts in same factSet share subjectId)
                if (!subjectId && factSet.facts.length > 0) {
                    subjectId = factSet.facts[0].subjectId;
                }
            }
        }
        if (allFacts.length === 0 || !subjectId) {
            return null;
        }
        // Return merged factSet (id is synthetic, used only for scoring)
        return {
            id: `merged-${factSetIds.join('-')}`,
            facts: allFacts,
            sources: allSources,
            evidenceScore: 100 // Not used in scoring algorithm
        };
    }
    /**
     * Helper: Extract subject ID from factSet (first fact's subjectId).
     * @internal
     */
    getSubjectId(factSet) {
        if (factSet.facts.length === 0) {
            throw new Error('Empty factSet');
        }
        return factSet.facts[0].subjectId;
    }
    /**
     * Helper: Check if factSet has a fact with given predicate.
     * @internal
     */
    hasFactPredicate(factSet, predicate) {
        return factSet.facts.some(f => f.predicate === predicate);
    }
    /**
     * Helper: Clamp value to [min, max].
     * @internal
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    // -------- Stub APIs (Phase 3 Future Implementation) --------
    /**
     * Stub: Query related entities by relation type (Phase 3).
     * Returns empty array in Phase 1.
     */
    neighbors(_entityId, _relation) {
        // TODO Phase 3: Implement using callGraph/importGraph/reverseDeps indices
        return [];
    }
    /**
     * Stub: List all open questions (Phase 3).
     * Returns empty array in Phase 1.
     */
    listOpenQuestions() {
        // TODO Phase 3: Implement by iterating entities with qids[]
        return [];
    }
    /**
     * Get all entities in the KB.
     * Added for Phase 3 (needed by relation resolver and reasoning engine).
     */
    getAllEntities() {
        const state = this.getActiveState();
        return Array.from(state.entities.values());
    }
    /**
     * Get all factSets in the KB.
     * Added for Phase 3 (needed by reasoning engine).
     */
    getAllFactSets() {
        const state = this.getActiveState();
        return Array.from(state.factSets.values());
    }
    /**
     * Allocate a QID for an ambiguity (idempotent).
     * Uses generateQID and tracks allocated QIDs.
     * FIX HIGH-1: Make idempotent (same inputs → same QID)
     */
    allocateQID(filePath, entityKey, ambiguityKind) {
        const state = this.getActiveState();
        // Generate deterministic QID without collision handling
        const deterministicQID = generateQID(filePath, entityKey, ambiguityKind, new Set());
        // If already allocated, return existing (idempotent behavior)
        if (state.qids.has(deterministicQID)) {
            return deterministicQID;
        }
        // Otherwise, generate with collision handling against all allocated QIDs
        const actualQID = generateQID(filePath, entityKey, ambiguityKind, state.qids);
        state.qids.add(actualQID);
        return actualQID;
    }
    /**
     * Validate that a QID is unique (not already allocated).
     */
    validateQIDUniqueness(qid) {
        const state = this.getActiveState();
        return !state.qids.has(qid);
    }
    /**
     * No-op in Phase 1: Anchors are computed inline during entity creation.
     * Phase 3 may add batch anchor computation for existing entities.
     */
    computeAnchors() {
        // TODO Phase 3: Batch anchor computation if needed
    }
    // -------- Batch Operations --------
    beginBatch() {
        if (this.batch) {
            throw new KBError('Batch already in progress');
        }
        // FIX CRITICAL-1 & 2: Deep clone current state
        this.batch = this.deepCloneState(this.state);
    }
    commit() {
        if (!this.batch) {
            throw new KBError('No batch in progress');
        }
        this.state = this.batch;
        this.batch = null;
    }
    rollback() {
        if (!this.batch) {
            throw new KBError('No batch in progress');
        }
        this.batch = null;
    }
    // -------- Phase 3 Step 1: Graph Indices --------
    /**
     * Returns the call graph: Map from caller entity ID to set of callee entity IDs.
     * Graph is built from resolved call relations (predicate='calls', objectId != null).
     * After RelationResolver runs, objectId is either an entity ID or null (unresolved).
     * Lazy-built and cached; invalidated on relation changes.
     */
    getCallGraph() {
        if (this.callGraphCache) {
            return this.callGraphCache;
        }
        // Build graph from resolved call relations
        const graph = new Map();
        const relations = this.getActiveState().relations;
        for (const relation of relations) {
            // Only include call relations with resolved objectId (non-null = entity ID)
            // Must also check details.resolved === true to exclude unresolved relations
            if (relation.predicate === 'calls' && relation.objectId && relation.details?.resolved === true) {
                if (!graph.has(relation.subjectId)) {
                    graph.set(relation.subjectId, new Set());
                }
                graph.get(relation.subjectId).add(relation.objectId);
            }
        }
        this.callGraphCache = graph;
        return graph;
    }
    /**
     * Returns the import graph: Map from importing file path to set of module specifiers.
     * Graph is built from import relations (predicate='imports').
     * Lazy-built and cached; invalidated on relation changes.
     */
    getImportGraph() {
        if (this.importGraphCache) {
            return this.importGraphCache;
        }
        const graph = new Map();
        const relations = this.getActiveState().relations;
        for (const relation of relations) {
            if (relation.predicate === 'imports' && relation.objectId) {
                if (!graph.has(relation.subjectId)) {
                    graph.set(relation.subjectId, new Set());
                }
                graph.get(relation.subjectId).add(relation.objectId);
            }
        }
        this.importGraphCache = graph;
        return graph;
    }
    /**
     * Returns the set of entities/files that depend on the given entity/file (reverse dependencies).
     * Includes both 'calls' relations (entity-level) and 'imports' relations (file-level).
     * Lazy-built and cached; invalidated on relation changes.
     *
     * @param entityIdOrPath - Entity ID or file path to query
     * @returns Set of entity IDs or file paths that depend on the target
     */
    getReverseDeps(entityIdOrPath) {
        if (!this.reverseDepsCache) {
            this.buildReverseDepsCache();
        }
        return this.reverseDepsCache.get(entityIdOrPath) || new Set();
    }
    /**
     * Build reverse dependencies cache by inverting call and import graphs.
     * Captures both entity-level and file-level dependencies.
     * For call relations, objectId null means unresolved (skipped).
     */
    buildReverseDepsCache() {
        const reverseDeps = new Map();
        const relations = this.getActiveState().relations;
        // Invert edges from call and import relations
        for (const relation of relations) {
            // Include call relations with non-null objectId (resolved entity IDs)
            if (relation.predicate === 'calls' && relation.objectId) {
                if (!reverseDeps.has(relation.objectId)) {
                    reverseDeps.set(relation.objectId, new Set());
                }
                reverseDeps.get(relation.objectId).add(relation.subjectId);
            }
            // Include import relations
            else if (relation.predicate === 'imports' && relation.objectId) {
                if (!reverseDeps.has(relation.objectId)) {
                    reverseDeps.set(relation.objectId, new Set());
                }
                reverseDeps.get(relation.objectId).add(relation.subjectId);
            }
        }
        this.reverseDepsCache = reverseDeps;
    }
    /**
     * Invalidate all graph index caches.
     * Called when relations are modified.
     */
    invalidateGraphCaches() {
        this.callGraphCache = null;
        this.importGraphCache = null;
        this.reverseDepsCache = null;
    }
}
//# sourceMappingURL=knowledge-base.js.map