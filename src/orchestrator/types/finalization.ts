/**
 * Phase 5 Step 6: Finalization Configuration & Run Summary Types
 *
 * Defines types for the `ceps finalize` command orchestration.
 *
 * **Status:** Interface definition (TDD Step 1)
 * **CTS Reference:** CTS-04 §6 (CLI), CTS-07 §6 (Orchestration)
 */

/**
 * Configuration for finalization workflow
 */
export interface FinalizationConfig {
  /** Project root directory */
  projectRoot: string;
  /** Path to answers.md file */
  answersPath: string;
  /** Optional output directory (not supported in Phase 5) */
  outputDir?: string;
  /** Dry-run mode (preview only, no mutations) */
  dryRun: boolean;
  /** Reconcile mode (allow changed snapshot) */
  reconcile: boolean;
  /** Deterministic mode (stable outputs) */
  deterministicMode: boolean;
  /** Impact scope strategy */
  scope: 'auto' | 'full';
  /** Maximum hops for reverse-deps traversal */
  maxHops: number;
  /** Maximum nodes in impact scope */
  maxNodes: number;
  /** LLM enabled for re-analysis */
  llmEnabled: boolean;
  /** LLM provider */
  llmProvider?: string;
  /** LLM model */
  llmModel?: string;
  /** LLM token budget */
  llmBudget?: number;
  /** Reasoning enabled */
  reasoningEnabled: boolean;
  /** Maximum reasoning iterations */
  maxIterations: number;
}

/**
 * Summary of finalization execution
 */
export interface FinalizationRunSummary {
  /** Exit code per SADS §6.3 */
  exitCode: 0 | 3 | 4;
  /** Status label */
  status: 'success' | 'snapshot-mismatch' | 'partial-success';
  /** Number of QIDs resolved */
  resolvedQids: number;
  /** Number of spec files patched */
  patchedFiles: number;
  /** Number of entities successfully updated */
  updatedEntities: number;
  /** Number of entities that failed re-analysis */
  failedEntities: number;
  /** List of resolved QID strings */
  resolvedQidList: string[];
  /** List of patched file paths */
  patchedFilePaths: string[];
  /** Details of failed entities */
  failedEntityDetails: Array<{
    entityId: string;
    reason: string;
  }>;
  /** Warnings during finalization */
  warnings: string[];
  /** Impact scope diagnostics */
  impactDiagnostics: {
    hopsTraversed: number;
    nodesTraversed: number;
    capped: boolean;
  };
  /** Runtime metrics */
  metrics: {
    tokensUsed: number;
    runtimeMs: number;
    snapshotVerified: boolean;
  };
  /** ISO timestamp (optional in deterministic mode) */
  startedAt?: string;
  /** ISO timestamp (optional in deterministic mode) */
  completedAt?: string;
}

/**
 * Default finalization config factory
 */
export function createDefaultFinalizationConfig(
  projectRoot: string,
  answersPath: string
): FinalizationConfig {
  return {
    projectRoot,
    answersPath,
    dryRun: false,
    reconcile: false,
    deterministicMode: false,
    scope: 'auto',
    maxHops: 3,
    maxNodes: 250,
    llmEnabled: true,
    reasoningEnabled: true,
    maxIterations: 10
  };
}
