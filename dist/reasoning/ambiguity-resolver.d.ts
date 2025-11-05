/**
 * Phase 3 Step 4: AmbiguityResolver
 *
 * Implements iterative confidence promotion via cross-reference analysis.
 * Generates Open Questions (QIDs) for Low confidence items.
 * Detects convergence and oscillation to ensure termination.
 */
import { KnowledgeBase } from '../kb/knowledge-base.js';
import { OpenQuestion } from '../kb/models.js';
import type { Confidence } from '../types/index.js';
export interface ResolutionResult {
    converged: boolean;
    iterations: number;
    promoted: number;
    openQuestions: OpenQuestion[];
}
export interface ResolutionOptions {
    maxIterations?: number;
    enableCrossRefPromotion?: boolean;
}
export interface AmbiguityItem {
    entityId: string;
    confidence: Confidence;
    chunkId: string;
    qid?: string;
}
export declare class AmbiguityResolver {
    private kb;
    private confidenceHistory;
    private ambiguityQueue;
    constructor(kb: KnowledgeBase);
    /**
     * Run iterative ambiguity resolution loop.
     * Returns result with convergence status, promotion count, and Open Questions.
     */
    resolve(options?: ResolutionOptions): ResolutionResult;
    /**
     * Get the ambiguity queue (Low confidence items with QIDs).
     */
    getAmbiguityQueue(): AmbiguityItem[];
    /**
     * Run one pass of confidence promotion.
     * Returns count of chunks that were promoted.
     */
    private runPromotionPass;
    /**
     * Attempt to promote a chunk's confidence via cross-reference analysis.
     * Returns true if promotion occurred.
     *
     * Promotion rule: If Medium confidence chunk has 2+ High confidence dependencies,
     * apply cross-reference bonus (+15) and recompute confidence band.
     */
    private tryPromoteChunk;
    /**
     * Snapshot current confidence values for oscillation detection.
     */
    private snapshotConfidences;
    /**
     * Detect oscillation pattern (A → B → A).
     * Returns true if any chunk shows oscillation.
     */
    private detectOscillation;
    /**
     * Generate Open Questions for all Low confidence chunks.
     * Stores questions in KB and returns them.
     */
    private generateOpenQuestions;
    /**
     * Generate human-readable question text based on entity kind.
     */
    private generateQuestionText;
    /**
     * Build ambiguity queue from Low confidence chunks.
     * Links chunks to their generated QIDs.
     */
    private buildAmbiguityQueue;
}
//# sourceMappingURL=ambiguity-resolver.d.ts.map