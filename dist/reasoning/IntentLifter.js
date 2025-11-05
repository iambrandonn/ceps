/**
 * Phase 3 Step 3: IntentLifter
 *
 * Converts factSets to BehaviorChunks with human-readable text.
 * Uses PatternMatcher to detect framework patterns and generate intent-focused descriptions.
 * Computes confidence using KB.scoreConfidence() API.
 */
import { generateAnchor } from '../kb/id-generation.js';
export class IntentLifter {
    kb;
    matcher;
    chunkIds = new Set();
    constructor(kb, matcher) {
        this.kb = kb;
        this.matcher = matcher;
    }
    /**
     * Lift factSets into a BehaviorChunk with human-readable intent.
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
        // Try to match against framework patterns
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