/**
 * Phase 4 WS-H Stage B: Runtime Gate Evaluators
 *
 * Production implementations of runtime gate evaluators.
 * These gates affect exit code per SADS §6.3 (exit code 2 on failure).
 *
 * **CTS Reference:** CTS-07 §5 (Gates & Exit Codes), Phase 4 §3
 */
/**
 * Coverage Gate: Ensures all exported entities are documented or carry QIDs.
 * Per SADS §10, 100% of exported/public surfaces must be documented or carry Open Questions.
 */
export class CoverageGateEvaluator {
    evaluate(input) {
        // Combine entities with chunks and entities with QIDs
        const documented = new Set([
            ...input.entitiesWithChunks,
            ...input.entitiesWithQIDs
        ]);
        // Find missing entities
        const missing = input.exportedEntityIds.filter(id => !documented.has(id));
        return {
            status: missing.length === 0 ? 'pass' : 'fail',
            exported: input.exportedEntityIds.length,
            documented: documented.size,
            qids: input.entitiesWithQIDs.length,
            details: missing.length > 0 ? { missingEntities: missing } : undefined
        };
    }
}
/**
 * Link Gate: Validates all cross-file anchor references.
 * Per SADS §10, no broken cross-links allowed.
 */
export class LinkGateEvaluator {
    evaluate(input) {
        return {
            status: input.brokenLinks.length === 0 ? 'pass' : 'fail',
            anchors: input.totalAnchors,
            broken: input.brokenLinks.length,
            brokenLinks: input.brokenLinks.length > 0 ? input.brokenLinks : undefined
        };
    }
}
/**
 * Grounding Gate: Ensures all chunks have factSetIds and passed validation or fell back.
 * Per SADS §10, every paragraph/bullet must have a factSetId; no chunk without grounding.
 */
export class GroundingGateEvaluator {
    evaluate(input) {
        // Gate fails if any chunks missing factSetIds
        const hasMissingFactSetIds = input.chunksWithMissingFactSetIds.length > 0;
        return {
            status: hasMissingFactSetIds ? 'fail' : 'pass',
            chunks: input.totalChunks,
            validated: input.validatedChunks,
            fallback: input.fallbackChunks,
            missingFactSetIds: hasMissingFactSetIds
                ? input.chunksWithMissingFactSetIds.length
                : undefined,
            details: hasMissingFactSetIds
                ? { chunksWithoutFactSetIds: input.chunksWithMissingFactSetIds }
                : undefined
        };
    }
}
/**
 * Determinism Gate: Validates identical output across reruns when --deterministic enabled.
 * Only active when --deterministic flag supplied; skips otherwise.
 */
export class DeterminismGateEvaluator {
    evaluate(input) {
        // Skip if deterministic mode not enabled
        if (!input.enabled) {
            return { status: 'skip', reruns: 0, diffs: 0 };
        }
        // Pass if no diffs detected
        return {
            status: input.diffs === 0 ? 'pass' : 'fail',
            reruns: input.reruns,
            diffs: input.diffs
        };
    }
}
/**
 * Confidence Gate: Ensures proper handling of low-confidence items.
 * Low confidence items must become Open Questions (never asserted).
 * Gate fails only if invalid confidence bands detected.
 */
export class ConfidenceGateEvaluator {
    evaluate(input) {
        // Fail only if invalid confidence items present
        const hasInvalid = input.invalidConfidenceItems.length > 0;
        return {
            status: hasInvalid ? 'fail' : 'pass',
            openQuestions: input.openQuestions,
            invalid: hasInvalid ? input.invalidConfidenceItems.length : undefined,
            details: hasInvalid ? { invalidItems: input.invalidConfidenceItems } : undefined
        };
    }
}
/**
 * Monorepo Gate: Ensures root overview exists and package specs linked correctly.
 * Per SADS §10, root overview must be present and package specs must link correctly.
 */
export class MonorepoGateEvaluator {
    evaluate(input) {
        // Skip if no packages (not a monorepo)
        if (input.packagesLinked === 0) {
            return {
                status: 'skip',
                hasRootSpec: input.hasRootSpec,
                packagesLinked: 0
            };
        }
        // Fail if root spec missing or broken package links present
        const hasBrokenLinks = input.brokenPackageLinks > 0;
        const missingRoot = !input.hasRootSpec;
        return {
            status: missingRoot || hasBrokenLinks ? 'fail' : 'pass',
            hasRootSpec: input.hasRootSpec,
            packagesLinked: input.packagesLinked,
            brokenPackageLinks: hasBrokenLinks ? input.brokenPackageLinks : undefined,
            details: missingRoot || hasBrokenLinks
                ? {
                    issues: [
                        ...(missingRoot ? ['Root spec.md missing'] : []),
                        ...(hasBrokenLinks
                            ? [`${input.brokenPackageLinks} broken package links`]
                            : [])
                    ]
                }
                : undefined
        };
    }
}
//# sourceMappingURL=runtime-gates.js.map