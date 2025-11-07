/**
 * Phase 3 Step 3: IntentLifter (Updated for Phase 6)
 *
 * Converts factSets to BehaviorChunks with human-readable text.
 * Uses PatternMatcher (Phase 3) OR PatternRegistry (Phase 6) to detect framework patterns.
 * Computes confidence using KB.scoreConfidence() API.
 *
 * Phase 6 Enhancement:
 * - Accepts optional PatternRegistry for advanced pattern detection
 * - Falls back to legacy PatternMatcher if registry not provided
 * - Preserves backward compatibility for Phase 3 tests
 */
import { generateAnchor } from '../kb/id-generation.js';
export class IntentLifter {
    kb;
    matcher;
    registry;
    chunkIds = new Set();
    constructor(kb, matcher, registry // Phase 6: Optional new pattern system
    ) {
        this.kb = kb;
        this.matcher = matcher;
        this.registry = registry;
    }
    /**
     * Lift factSets into a BehaviorChunk with human-readable intent.
     *
     * Phase 6 Update: Tries PatternRegistry first (entity-based), falls back to PatternMatcher.
     *
     * @param factSetIds - Array of factSet IDs to lift (typically one per entity)
     * @returns BehaviorChunk with textDraft, confidence, and factSetIds
     */
    liftIntent(factSetIds) {
        if (factSetIds.length === 0) {
            throw new Error('No factSets provided');
        }
        // Get first factSet to extract entity info
        const factSet = this.kb.getFactSet(factSetIds[0]);
        if (!factSet) {
            throw new Error(`FactSet ${factSetIds[0]} not found`);
        }
        const subjectId = this.getSubjectId(factSet);
        const entity = this.kb.getEntity(subjectId);
        if (!entity) {
            throw new Error(`Entity ${subjectId} not found`);
        }
        // Phase 6: Try new PatternRegistry first (entity-based patterns)
        if (this.registry) {
            const registryChunks = this.registry.describe(this.kb, entity);
            if (registryChunks.length > 0) {
                // Registry generated chunks directly - use first one
                return registryChunks[0];
            }
            // Also apply confidence adjustments if available
            const delta = this.registry.getConfidenceAdjustments(this.kb, entity);
            if (delta) {
                // Registry matched but describe() returned empty - fall through to legacy
                // but apply delta to base score later
            }
        }
        // Phase 3 fallback: Try to match against framework patterns (factSet-based)
        const pattern = this.matcher.match(factSet);
        // Generate human-readable text
        const textDraft = pattern
            ? this.buildPatternBasedText(entity, pattern, factSet)
            : this.buildGenericText(entity, factSet);
        // Compute confidence with pattern bonus
        // Base confidence from KB (framework-agnostic)
        let baseScore = this.kb.getConfidenceScore(factSetIds);
        // Add pattern bonus if framework pattern detected
        if (pattern) {
            baseScore += pattern.confidence;
            baseScore = Math.min(baseScore, 100); // Clamp to max
        }
        // Phase 6: Apply registry confidence adjustments if no pattern matched
        if (!pattern && this.registry) {
            const delta = this.registry.getConfidenceAdjustments(this.kb, entity);
            if (delta) {
                baseScore += delta.adjustment;
                baseScore = Math.min(baseScore, 100);
            }
        }
        // Convert final score to confidence band
        const confidence = this.kb.scoreToConfidenceBand(baseScore);
        // Generate unique chunk ID
        const chunkId = this.generateChunkId(entity);
        return {
            id: chunkId,
            targetEntityId: subjectId,
            textDraft,
            confidence,
            factSetIds,
        };
    }
    /**
     * Build text description based on detected pattern.
     * Incorporates JSDoc if available.
     */
    buildPatternBasedText(entity, pattern, factSet) {
        const jsDoc = factSet.facts.find(f => f.predicate === 'has-jsdoc');
        const summary = jsDoc ? String(jsDoc.object) : '';
        let text = pattern.intent;
        if (summary) {
            text += `. ${summary}`;
        }
        return text;
    }
    /**
     * Build generic text description when no pattern matches.
     * Falls back to JSDoc or generic placeholder.
     */
    buildGenericText(entity, factSet) {
        const jsDoc = factSet.facts.find(f => f.predicate === 'has-jsdoc');
        const summary = jsDoc ? String(jsDoc.object) : null;
        if (summary) {
            return `${this.getEntityKindLabel(entity.kind)} ${entity.name}: ${summary}`;
        }
        // No JSDoc - return generic description
        return `${this.getEntityKindLabel(entity.kind)} ${entity.name} (intent unclear from static analysis)`;
    }
    /**
     * Get human-readable label for entity kind.
     */
    getEntityKindLabel(kind) {
        switch (kind) {
            case 'function':
                return 'Function';
            case 'class':
                return 'Class';
            case 'method':
                return 'Method';
            case 'constant':
                return 'Constant';
            case 'variable':
                return 'Variable';
            case 'interface':
                return 'Interface';
            case 'type':
                return 'Type';
            case 'endpoint':
                return 'Endpoint';
            default:
                return 'Entity';
        }
    }
    /**
     * Extract subject ID from factSet (first fact's subjectId).
     */
    getSubjectId(factSet) {
        if (factSet.facts.length === 0) {
            throw new Error('Empty factSet');
        }
        return factSet.facts[0].subjectId;
    }
    /**
     * Generate unique chunk ID based on entity.
     * Uses content-based anchor to ensure determinism.
     */
    generateChunkId(entity) {
        // Use entity name and kind as content (deterministic)
        const content = `${entity.kind}-${entity.name}-${entity.path}`;
        const chunkId = generateAnchor('chunk', content, this.chunkIds);
        this.chunkIds.add(chunkId);
        return chunkId;
    }
}
//# sourceMappingURL=IntentLifter.js.map