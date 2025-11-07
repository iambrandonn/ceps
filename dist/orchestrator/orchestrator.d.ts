/**
 * Phase 3 Step 7: Orchestrator
 *
 * Coordinates the full Phase 3 intelligence pipeline with 10 phases:
 * scanning → parsing → relation-resolution → graph-building → reasoning →
 * ambiguity-resolution → validation-pre → generation → validation-post → complete
 *
 * Features:
 * - Event-based progress reporting (phaseStart, phaseComplete, phaseError)
 * - Fail-fast validation gates (halt on coverage/link failures)
 * - Statistics tracking (filesScanned, entitiesFound, coverage, etc.)
 * - Partial execution support (runUntil for testing)
 */
import { EventEmitter } from 'events';
import { KnowledgeBase } from '../kb/knowledge-base.js';
import type { RunSummary } from './types/run-summary.js';
import type { LLMGateway } from '../llm/gateway.js';
import type { BudgetTracker } from '../llm/budget.js';
import type { Validator } from '../validation/types.js';
export declare enum PipelinePhase {
    SCANNING = "scanning",
    PARSING = "parsing",
    RELATION_RESOLUTION = "relation-resolution",
    GRAPH_BUILDING = "graph-building",
    REASONING = "reasoning",
    AMBIGUITY_RESOLUTION = "ambiguity-resolution",
    VALIDATION_PRE = "validation-pre",
    GENERATION = "generation",
    VALIDATION_POST = "validation-post",
    COMPLETE = "complete"
}
export interface PipelineStatus {
    currentPhase: PipelinePhase;
    startTime: Date;
    statistics: PipelineStatistics;
    errors: PipelineError[];
}
export interface PipelineStatistics {
    filesScanned: number;
    entitiesFound: number;
    relationsResolved: number;
    chunksGenerated: number;
    openQuestions: number;
    coverage: number;
}
export interface PipelineError {
    phase: PipelinePhase;
    message: string;
    details?: unknown;
}
export interface OrchestratorOptions {
    projectRoot: string;
    llm?: 'on' | 'off';
    deterministic?: boolean;
    llmGateway?: LLMGateway;
    validator?: Validator;
    budgetTracker?: BudgetTracker;
    snapshotEnabled?: boolean;
    knowledgeBase?: KnowledgeBase;
}
export declare class Orchestrator extends EventEmitter {
    private kb;
    private status;
    private fileIndex?;
    private runSummary?;
    private generator?;
    private rootSpec?;
    private dirSpecs?;
    private options;
    private rootPath;
    private snapshotEnabled;
    constructor(options: OrchestratorOptions | string);
    run(): Promise<void>;
    runUntil(targetPhase: PipelinePhase): Promise<void>;
    private executePhase;
    private runScanning;
    private runParsing;
    private runRelationResolution;
    private runGraphBuilding;
    private runReasoning;
    private runAmbiguityResolution;
    private runPreValidation;
    private runGeneration;
    private captureProjectSnapshot;
    private runPostValidation;
    private handlePhaseError;
    getKnowledgeBase(): KnowledgeBase;
    getStatus(): PipelineStatus;
    getRunSummary(): RunSummary | undefined;
    /**
     * Phase 5 Step 6: Finalization workflow
     * Orchestrates answer-guided re-analysis and spec patching.
     */
    runFinalize(config: {
        answersPath: string;
        dryRun: boolean;
        reconcile: boolean;
        deterministicMode: boolean;
        scope: 'auto' | 'full';
        maxHops: number;
        maxNodes: number;
        llmEnabled: boolean;
        llmGateway?: LLMGateway;
        validator?: Validator;
        budgetTracker?: BudgetTracker;
    }): Promise<{
        summary: any;
        exitCode: 0 | 3 | 4;
    }>;
    private evaluateGates;
}
//# sourceMappingURL=orchestrator.d.ts.map