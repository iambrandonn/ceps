import { KnowledgeBase } from '../kb/knowledge-base.js';
import type { BehaviorChunk } from '../kb/models.js';
import type { ImpactReport } from './impact-scope.js';
import type { LLMGateway } from '../llm/gateway.js';
import type { Validator } from '../validation/types.js';
import type { BudgetTracker } from '../llm/budget.js';
import { type VerificationResult } from '../snapshot/index.js';
export interface SnapshotOptions {
    projectRoot: string;
    snapshotPath: string;
    reconcile?: boolean;
}
export interface ReanalysisOptions {
    deterministicMode: boolean;
    llmEnabled: boolean;
    llmBudgetTokens?: number;
    reasoningEnabled: boolean;
    llmGateway?: LLMGateway;
    validator?: Validator;
    budgetTracker?: BudgetTracker;
    snapshot?: SnapshotOptions;
}
export interface FailedEntity {
    entityId: string;
    reason: 'llm-failure' | 'grounding-reject' | 'kb-inconsistency' | 'anchor-missing' | 'spec-missing';
    details: string;
    originalChunk?: BehaviorChunk;
}
export interface ReanalysisResult {
    updatedChunks: Map<string, BehaviorChunk>;
    failedEntities: FailedEntity[];
    warnings: string[];
    metrics: {
        tokensUsed: number;
        entitiesProcessed: number;
        entitiesFailed: number;
        runtimeMs: number;
    };
}
export declare class SnapshotMismatchError extends Error {
    verification: VerificationResult;
    constructor(verification: VerificationResult);
}
export declare function reanalyzeEntities(kb: KnowledgeBase, impactReport: ImpactReport, options: ReanalysisOptions): Promise<ReanalysisResult>;
//# sourceMappingURL=reanalysis.d.ts.map