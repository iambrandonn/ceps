/**
 * Phase 6 I3: Express Config Pattern
 *
 * Detects Express configuration and environment variable patterns:
 * - app.set() configuration setting
 * - app.get() configuration reading
 * - process.env.* environment variable reads
 * - Feature flags and conditional configuration
 */
import { PatternPriority, } from '../types.js';
import { getFactsByPredicate, getFactSets, } from '../shared/helpers.js';
import { generateAnchor } from '../../../kb/id-generation.js';
export class ExpressConfigPattern {
    id = 'express.config';
    priority = PatternPriority.FRAMEWORK_CORE;
    chunkIds = new Set();
    /**
     * Match Express config patterns:
     * - app.set() / app.get() calls
     * - process.env.* property reads
     */
    matches(kb, entity) {
        try {
            // Must be a function
            if (entity.kind !== 'function') {
                return false;
            }
            // Check for app.set or app.get calls
            const callFacts = getFactsByPredicate(kb, entity, 'calls-expression');
            const hasAppConfig = callFacts.some(fact => fact.object === 'app.set' || fact.object === 'app.get');
            if (hasAppConfig) {
                return true;
            }
            // Check for process.env property reads
            const readsFacts = getFactsByPredicate(kb, entity, 'reads-property');
            const hasEnvRead = readsFacts.some(fact => String(fact.object).startsWith('process.env.'));
            return hasEnvRead;
        }
        catch (error) {
            // Error handling contract: never throw, return false
            return false;
        }
    }
    /**
     * Generate behavior chunk describing configuration patterns.
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
            // Analyze configuration patterns
            const callFacts = getFactsByPredicate(kb, entity, 'calls-expression');
            const readsFacts = getFactsByPredicate(kb, entity, 'reads-property');
            const hasAppSet = callFacts.some(f => f.object === 'app.set');
            const hasAppGet = callFacts.some(f => f.object === 'app.get');
            const envVars = readsFacts
                .filter(f => String(f.object).startsWith('process.env.'))
                .map(f => String(f.object).replace('process.env.', ''));
            // Build description
            let textDraft = `Express configuration function ${entity.name}`;
            const details = [];
            if (hasAppSet) {
                details.push('sets application configuration via app.set');
            }
            if (hasAppGet) {
                details.push('reads configuration values via app.get');
            }
            if (envVars.length > 0) {
                const varList = envVars.slice(0, 3).join(', ');
                const suffix = envVars.length > 3 ? ` and ${envVars.length - 3} more` : '';
                details.push(`reads environment variables (${varList}${suffix})`);
            }
            if (details.length > 0) {
                textDraft += ' that ' + details.join(', ') + '.';
            }
            else {
                textDraft += ' that manages application configuration.';
            }
            // Generate unique chunk ID
            const chunkId = this.generateChunkId(entity);
            return [
                {
                    id: chunkId,
                    targetEntityId: entity.id,
                    textDraft,
                    factSetIds,
                    confidence: 'High', // Strong signal from explicit config calls
                },
            ];
        }
        catch (error) {
            // Error handling contract: return Low-confidence error chunk
            return [
                {
                    id: `error-${this.id}-${entity.id}`,
                    targetEntityId: entity.id,
                    textDraft: `Unable to fully analyze configuration pattern for ${entity.name} (internal error during pattern matching).`,
                    factSetIds: [],
                    confidence: 'Low',
                },
            ];
        }
    }
    /**
     * Optional confidence adjustments.
     * Express config patterns have strong signals, so no adjustments needed.
     */
    confidenceAdjustments(kb, entity) {
        return { delta: 0, reason: '' };
    }
    /**
     * Generate deterministic chunk ID based on entity.
     */
    generateChunkId(entity) {
        const baseId = `${this.id}-${entity.id}`;
        const anchor = generateAnchor(baseId);
        // Ensure uniqueness within this pattern instance
        let finalId = anchor;
        let counter = 0;
        while (this.chunkIds.has(finalId)) {
            counter++;
            finalId = `${anchor}-${counter}`;
        }
        this.chunkIds.add(finalId);
        return finalId;
    }
}
//# sourceMappingURL=config.js.map