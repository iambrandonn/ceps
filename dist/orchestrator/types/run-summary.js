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
 * Default run summary for initialization
 */
export function createDefaultRunSummary() {
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
//# sourceMappingURL=run-summary.js.map