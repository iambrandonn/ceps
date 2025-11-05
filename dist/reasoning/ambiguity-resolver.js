/**
 * Phase 3 Step 4: AmbiguityResolver
 *
 * Implements iterative confidence promotion via cross-reference analysis.
 * Generates Open Questions (QIDs) for Low confidence items.
 * Detects convergence and oscillation to ensure termination.
 */
export class AmbiguityResolver {
    kb;
    confidenceHistory = new Map();
    ambiguityQueue = [];
    constructor(kb) {
        this.kb = kb;
    }
    /**
     * Run iterative ambiguity resolution loop.
     * Returns result with convergence status, promotion count, and Open Questions.
     */
    resolve(options = {}) {
        const maxIter = options.maxIterations ?? 10;
        const enablePromotion = options.enableCrossRefPromotion ?? true;
        this.confidenceHistory.clear();
        let iterations = 0;
        let promoted = 0;
        for (let i = 0; i < maxIter; i++) {
            iterations++;
            this.snapshotConfidences();
            const changedCount = this.runPromotionPass(enablePromotion);
            promoted += changedCount;
            if (changedCount === 0) {
                // Convergence: no changes in this pass
                const openQuestions = this.generateOpenQuestions();
                this.buildAmbiguityQueue();
                return {
                    converged: true,
                    iterations,
                    promoted,
                    openQuestions
                };
            }
            if (this.detectOscillation()) {
                // Force convergence by stopping iteration
                break;
            }
        }
        // Max iterations reached or oscillation detected
        const openQuestions = this.generateOpenQuestions();
        this.buildAmbiguityQueue();
        return {
            converged: false,
            iterations,
            promoted,
            openQuestions
        };
    }
    /**
     * Get the ambiguity queue (Low confidence items with QIDs).
     */
    getAmbiguityQueue() {
        return [...this.ambiguityQueue]; // Return copy
    }
    /**
     * Run one pass of confidence promotion.
     * Returns count of chunks that were promoted.
     */
    runPromotionPass(enablePromotion) {
        if (!enablePromotion)
            return 0;
        const chunks = this.kb.getAllChunks();
        let changedCount = 0;
        for (const chunk of chunks) {
            if (chunk.confidence === 'High')
                continue; // Already max
            const promoted = this.tryPromoteChunk(chunk);
            if (promoted)
                changedCount++;
        }
        return changedCount;
    }
    /**
     * Attempt to promote a chunk's confidence via cross-reference analysis.
     * Returns true if promotion occurred.
     *
     * Promotion rule: If Medium confidence chunk has 2+ High confidence dependencies,
     * apply cross-reference bonus (+15) and recompute confidence band.
     */
    tryPromoteChunk(chunk) {
        const callGraph = this.kb.getCallGraph();
        const callees = callGraph.get(chunk.targetEntityId) || new Set();
        // Count High confidence callees
        let highCount = 0;
        for (const calleeId of callees) {
            const calleeChunks = this.kb.getChunksByEntity(calleeId);
            if (calleeChunks.length > 0 && calleeChunks[0].confidence === 'High') {
                highCount++;
            }
        }
        // Promotion rule: 2+ High dependencies → promote Medium to High
        if (chunk.confidence === 'Medium' && highCount >= 2) {
            // Recompute confidence with reinforcement bonus
            const score = this.kb.getConfidenceScore(chunk.factSetIds) + 15; // Cross-ref bonus
            const newBand = this.kb.scoreToConfidenceBand(score);
            if (newBand !== chunk.confidence) {
                // Update chunk in KB
                this.kb.updateChunk(chunk.id, { confidence: newBand });
                return true;
            }
        }
        return false;
    }
    /**
     * Snapshot current confidence values for oscillation detection.
     */
    snapshotConfidences() {
        const chunks = this.kb.getAllChunks();
        for (const chunk of chunks) {
            if (!this.confidenceHistory.has(chunk.id)) {
                this.confidenceHistory.set(chunk.id, []);
            }
            this.confidenceHistory.get(chunk.id).push(chunk.confidence);
        }
    }
    /**
     * Detect oscillation pattern (A → B → A).
     * Returns true if any chunk shows oscillation.
     */
    detectOscillation() {
        for (const history of this.confidenceHistory.values()) {
            if (history.length < 3)
                continue;
            const last3 = history.slice(-3);
            if (last3[0] === last3[2] && last3[0] !== last3[1]) {
                // Pattern: A → B → A (oscillation)
                return true;
            }
        }
        return false;
    }
    /**
     * Generate Open Questions for all Low confidence chunks.
     * Stores questions in KB and returns them.
     */
    generateOpenQuestions() {
        const chunks = this.kb.getAllChunks();
        const openQuestions = [];
        for (const chunk of chunks) {
            if (chunk.confidence !== 'Low')
                continue;
            const entity = this.kb.getEntity(chunk.targetEntityId);
            if (!entity)
                continue;
            // Generate stable QID
            const qid = this.kb.allocateQID(entity.path, entity.name, 'behavior');
            const question = this.generateQuestionText(entity.kind, entity.name, entity.path);
            const oq = {
                qid,
                entityId: entity.id,
                question,
                confidence: this.kb.getConfidenceScore(chunk.factSetIds),
                factSetIds: chunk.factSetIds
            };
            openQuestions.push(oq);
            this.kb.insertOpenQuestion(oq); // Store in KB
        }
        return openQuestions;
    }
    /**
     * Generate human-readable question text based on entity kind.
     */
    generateQuestionText(kind, name, path) {
        switch (kind) {
            case 'function':
                return `What is the purpose and behavior of function \`${name}\` at ${path}?`;
            case 'class':
                return `What are the responsibilities and contract of class \`${name}\` at ${path}?`;
            case 'module':
                return `What is the role and exported interface of module \`${name}\` at ${path}?`;
            case 'method':
                return `What is the behavior of method \`${name}\` at ${path}?`;
            case 'constant':
            case 'variable':
                return `What is the purpose of ${kind} \`${name}\` at ${path}?`;
            default:
                return `What is the purpose of ${kind} \`${name}\` at ${path}?`;
        }
    }
    /**
     * Build ambiguity queue from Low confidence chunks.
     * Links chunks to their generated QIDs.
     */
    buildAmbiguityQueue() {
        this.ambiguityQueue = [];
        const chunks = this.kb.getAllChunks();
        for (const chunk of chunks) {
            if (chunk.confidence === 'Low') {
                // Find associated QID
                // Since QIDs are generated per entity, we can just take the first QID for this entity
                // (In practice, there should be one QID per Low confidence entity)
                const questions = this.kb.getOpenQuestionsByEntity(chunk.targetEntityId);
                const qid = questions.length > 0 ? questions[0].qid : undefined;
                this.ambiguityQueue.push({
                    entityId: chunk.targetEntityId,
                    confidence: chunk.confidence,
                    chunkId: chunk.id,
                    qid
                });
            }
        }
    }
}
//# sourceMappingURL=ambiguity-resolver.js.map