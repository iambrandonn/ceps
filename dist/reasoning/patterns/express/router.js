/**
 * Phase 6 I1: Express Router Pattern
 *
 * Detects Express Router constants (initialized with Router()).
 * Also extracts route handler definitions (router.get, router.post, etc.).
 */
import { PatternPriority, } from '../types.js';
import { hasFact, getFactSets, normalizeHttpMethod, } from '../shared/helpers.js';
import { generateAnchor } from '../../../kb/id-generation.js';
export class ExpressRouterPattern {
    id = 'express.router';
    priority = PatternPriority.FRAMEWORK_CORE;
    chunkIds = new Set();
    /**
     * Match Express Router: constant initialized with Router().
     */
    matches(kb, entity) {
        try {
            // Must be a constant
            if (entity.kind !== 'constant') {
                return false;
            }
            // Must have initializer-call fact with value matching Router
            // Matches: 'Router', 'express.Router', 'myExpress.Router', etc.
            return hasFact(kb, entity, 'initializer-call', /Router$/);
        }
        catch (error) {
            // Error handling contract: never throw
            return false;
        }
    }
    /**
     * Generate behavior chunk describing router and its routes.
     */
    describe(kb, entity) {
        try {
            // Should only be called after matches() returns true
            if (!this.matches(kb, entity)) {
                return [];
            }
            const factSets = getFactSets(kb, entity);
            if (factSets.length === 0) {
                return [];
            }
            // Collect factSet IDs
            const factSetIds = factSets.map(fs => fs.id);
            // Extract route handlers from calls-expression facts
            const routes = this.extractRoutes(kb, entity);
            // Build description
            let textDraft = `Express Router ${entity.name} that defines HTTP route handlers`;
            if (routes.length > 0) {
                textDraft += '. Routes: ';
                const routeDescriptions = routes.map(r => `${r.method} ${r.path}`);
                textDraft += routeDescriptions.join(', ');
            }
            textDraft += '.';
            // Generate unique chunk ID
            const chunkId = this.generateChunkId(entity);
            return [
                {
                    id: chunkId,
                    targetEntityId: entity.id,
                    textDraft,
                    factSetIds,
                    confidence: 'High', // Strong signal from Router() initialization
                },
            ];
        }
        catch (error) {
            // Error handling contract: return Low-confidence error chunk
            return [
                {
                    id: `error-${this.id}-${entity.id}`,
                    targetEntityId: entity.id,
                    textDraft: `Pattern '${this.id}' encountered error describing entity: ${error instanceof Error ? error.message : String(error)}`,
                    factSetIds: [],
                    confidence: 'Low',
                },
            ];
        }
    }
    /**
     * Confidence adjustment for Express Router pattern.
     */
    confidenceAdjustments(kb, entity) {
        try {
            if (!this.matches(kb, entity)) {
                return undefined;
            }
            return {
                adjustment: 10, // Strong framework signal
                reason: 'Express Router pattern (initialized with Router())',
            };
        }
        catch (error) {
            return undefined;
        }
    }
    /**
     * Extract route handlers from calls-expression facts.
     *
     * Per Phase -1 analysis findings (PHASE6_EXPRESS_PHASE_MINUS_ONE.md),
     * we need to parse facts in order to associate call-arg-0 with the
     * correct calls-expression.
     */
    extractRoutes(kb, entity) {
        const routes = [];
        try {
            const factSets = getFactSets(kb, entity);
            for (const factSet of factSets) {
                const facts = factSet.facts.filter(f => f.subjectId === entity.id);
                // Pattern: router.get('/path', handler)
                // Look for calls-expression matching router.(get|post|put|delete|patch)
                // Phase 6 Fix (Issue #2): Use objectName from metadata for pseudo-entities
                const entityName = entity.metadata?.objectName || entity.name;
                const routePattern = new RegExp(`^(${entityName}|router)\\.(get|post|put|delete|patch)$`, 'i');
                for (let i = 0; i < facts.length; i++) {
                    const fact = facts[i];
                    if (fact.predicate === 'calls-expression') {
                        const match = String(fact.object).match(routePattern);
                        if (match) {
                            const methodStr = match[2];
                            const method = normalizeHttpMethod(methodStr);
                            if (!method) {
                                continue; // Invalid HTTP method
                            }
                            // Find the next call-arg-0 (the route path)
                            // Stop at the next calls-expression to avoid cross-contamination
                            let path = '(dynamic)'; // Default if no literal path found
                            for (let j = i + 1; j < facts.length; j++) {
                                const nextFact = facts[j];
                                if (nextFact.predicate === 'calls-expression') {
                                    // Hit another call - stop searching
                                    break;
                                }
                                if (nextFact.predicate === 'call-arg-0') {
                                    // Found the path argument
                                    path = String(nextFact.object);
                                    break;
                                }
                            }
                            routes.push({ method, path });
                        }
                    }
                }
            }
        }
        catch (error) {
            // On error, return empty routes (don't fail the whole description)
        }
        return routes;
    }
    /**
     * Generate deterministic chunk ID.
     */
    generateChunkId(entity) {
        const content = `${this.id}-${entity.kind}-${entity.name}-${entity.path}`;
        const chunkId = generateAnchor('chunk', content, this.chunkIds);
        this.chunkIds.add(chunkId);
        return chunkId;
    }
}
//# sourceMappingURL=router.js.map