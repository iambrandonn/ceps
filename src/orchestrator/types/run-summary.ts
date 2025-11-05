/**
 * Phase 4 WS-H: Run Summary Types
 *
 * Canonical types for orchestrator run summaries per Phase 4 §3.3.
 * These types capture runtime gate status, validation results, and telemetry.
 *
 * **Status:** Interface frozen (Stage A0)
 * **CTS Reference:** CTS-07 §10 (Metrics & Logging), SADS §6.3 (Exit Codes)
 */

/**
 * Gate status for a single gate evaluation
 */
export type GateStatus = 'pass' | 'fail' | 'skip';

/**
 * Runtime gate results (exit-code enforcing)
 * These gates affect the exit code per SADS §6.3
 */
export interface RuntimeGateResult {
  status: GateStatus;
  /** Human-readable details (counts, failures, remediation hints) */
  details?: Record<string, unknown>;
}

export interface CoverageGateResult extends RuntimeGateResult {
  exported: number;
  documented: number;
  qids: number;
}

export interface LinkGateResult extends RuntimeGateResult {
  anchors: number;
  broken: number;
  brokenLinks?: Array<{
    sourceFile: string;
    lineNumber: number;
    targetAnchor: string;
  }>;
}

export interface GroundingGateResult extends RuntimeGateResult {
  chunks: number;
  validated: number;
  fallback: number;
  /** Chunks with missing or empty factSetIds */
  missingFactSetIds?: number;
}

export interface DeterminismGateResult extends RuntimeGateResult {
  reruns?: number;
  diffs?: number;
}

export interface ConfidenceGateResult extends RuntimeGateResult {
  /** Number of low-confidence items converted to Open Questions */
  openQuestions: number;
  /** Number of items with invalid confidence band (if any) */
  invalid?: number;
}

export interface MonorepoGateResult extends RuntimeGateResult {
  hasRootSpec: boolean;
  packagesLinked: number;
  brokenPackageLinks?: number;
}

/**
 * All runtime gates that affect exit code
 */
export interface RuntimeGates {
  coverage: CoverageGateResult;
  link: LinkGateResult;
  grounding: GroundingGateResult;
  determinism: DeterminismGateResult;
  confidence: ConfidenceGateResult;
  monorepo: MonorepoGateResult;
}

/**
 * Validation gate results (reporting only, no exit code impact)
 * These are CI/quality metrics that don't block runs
 */
export interface ValidationGateResult {
  status: GateStatus;
  details?: Record<string, unknown>;
}

export interface CostGateResult extends ValidationGateResult {
  budget: number;
  used: number;
  remaining: number;
  /** Per-fixture token usage for threshold checks */
  perFixture?: Record<string, number>;
}

export interface AdversarialGateResult extends ValidationGateResult {
  total: number;
  rejected: number;
  /** Suite pass = all adversarial cases rejected */
  pass: boolean;
}

export interface TestCoverageGateResult extends ValidationGateResult {
  coverage: number;
  threshold: number;
  pass: boolean;
}

export interface ReadabilityGateResult extends ValidationGateResult {
  /** Average score from manual review (0-10 scale) */
  avgScore?: number;
  threshold?: number;
  pass?: boolean;
  /** Path to manual review log if available */
  reviewLogPath?: string;
}

/**
 * All validation gates (advisory/warning only)
 */
export interface ValidationGates {
  cost: CostGateResult;
  adversarial: AdversarialGateResult;
  testCoverage: TestCoverageGateResult;
  readability: ReadabilityGateResult;
}

/**
 * Token usage metrics
 */
export interface TokenMetrics {
  total: number;
  budget: number;
  /** Breakdown by provider (anthropic, openai, azure, local) */
  providers: Record<string, number>;
}

/**
 * Complete run summary
 */
export interface RunSummary {
  /** Runtime gates (affect exit code) */
  gates: RuntimeGates;
  /** Validation gates (advisory only) */
  validation: ValidationGates;
  /** Token usage metrics */
  tokens: TokenMetrics;
  /** Warnings (budget exhaustion, fallback counts, etc.) */
  warnings: string[];
  /** Exit code per SADS §6.3 */
  exitCode: 0 | 1 | 2 | 3;
  /** ISO timestamp */
  timestamp: string;
  /** Phase 4 version tag */
  version: string;
}

/**
 * Default run summary for initialization
 */
export function createDefaultRunSummary(): RunSummary {
  return {
    gates: {
      coverage: { status: 'skip', exported: 0, documented: 0, qids: 0 },
      link: { status: 'skip', anchors: 0, broken: 0 },
      grounding: { status: 'skip', chunks: 0, validated: 0, fallback: 0 },
      determinism: { status: 'skip', reruns: 0, diffs: 0 },
      confidence: { status: 'skip', openQuestions: 0 },
      monorepo: { status: 'skip', hasRootSpec: false, packagesLinked: 0 }
    },
    validation: {
      cost: { status: 'skip', budget: 0, used: 0, remaining: 0 },
      adversarial: { status: 'skip', total: 0, rejected: 0, pass: true },
      testCoverage: { status: 'skip', coverage: 0, threshold: 80, pass: false },
      readability: { status: 'skip' }
    },
    tokens: {
      total: 0,
      budget: 0,
      providers: {}
    },
    warnings: [],
    exitCode: 0,
    timestamp: new Date().toISOString(),
    version: 'phase4-ws-h'
  };
}
