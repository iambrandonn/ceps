/**
 * Phase 5 Step 6: Finalization Configuration & Run Summary Types
 *
 * Defines types for the `ceps finalize` command orchestration.
 *
 * **Status:** Interface definition (TDD Step 1)
 * **CTS Reference:** CTS-04 §6 (CLI), CTS-07 §6 (Orchestration)
 */
/**
 * Default finalization config factory
 */
export function createDefaultFinalizationConfig(projectRoot, answersPath) {
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
//# sourceMappingURL=finalization.js.map