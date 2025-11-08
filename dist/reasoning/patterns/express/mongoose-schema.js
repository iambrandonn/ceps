/**
 * Phase 6 I4: Mongoose Schema Pattern
 *
 * Detects Mongoose schema definitions (new Schema({...})).
 * Extracts field names and references to other models.
 */
import { PatternPriority, } from '../types.js';
import { getFirstFact, getFactSets, } from '../shared/helpers.js';
import { generateAnchor } from '../../../kb/id-generation.js';
export class MongooseSchemaPattern {
    id = 'mongoose.schema';
    priority = PatternPriority.AUXILIARY_ADAPTERS;
    chunkIds = new Set();
    /**
     * Match Mongoose Schema: constant initialized with new Schema({...}).
     *
     * Note: Parser doesn't extract initializer-call for 'new' expressions,
     * so we match on initializer text pattern.
     */
    matches(kb, entity) {
        try {
            // Must be a constant
            if (entity.kind !== 'constant') {
                return false;
            }
            // Get initializer fact
            const initializerFact = getFirstFact(kb, entity, 'initializer');
            if (!initializerFact) {
                return false;
            }
            const initializer = String(initializerFact.object);
            // Match: new Schema(...) or new mongoose.Schema(...)
            return /^new\s+(mongoose\.)?Schema\s*\(/.test(initializer);
        }
        catch (error) {
            // Error handling contract: never throw
            return false;
        }
    }
    /**
     * Generate behavior chunk describing the schema.
     */
    describe(kb, entity) {
        try {
            if (!this.matches(kb, entity)) {
                return [];
            }
            const factSets = getFactSets(kb, entity);
            if (factSets.length === 0) {
                return [];
            }
            const factSetIds = factSets.map(fs => fs.id);
            // Extract fields and refs from initializer
            const initializerFact = getFirstFact(kb, entity, 'initializer');
            if (!initializerFact) {
                return [];
            }
            const initializer = String(initializerFact.object);
            const fields = this.extractFields(initializer);
            const refs = fields.filter(f => f.isReference);
            // Build description
            let textDraft = `Mongoose schema ${entity.name}`;
            if (fields.length > 0) {
                const fieldNames = fields.map(f => {
                    let desc = f.name;
                    if (f.isRequired)
                        desc += ' (required)';
                    if (f.isReference && f.refModel)
                        desc += ` → ${f.refModel}`;
                    return desc;
                });
                textDraft += ` defines fields: ${fieldNames.join(', ')}`;
            }
            textDraft += '.';
            // Confidence: High for simple schemas, Medium for complex nested structures
            const confidence = this.determineConfidence(initializer, fields);
            const chunkId = this.generateChunkId(entity);
            return [
                {
                    id: chunkId,
                    targetEntityId: entity.id,
                    textDraft,
                    factSetIds,
                    confidence,
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
     * Confidence adjustment for Mongoose Schema pattern.
     */
    confidenceAdjustments(kb, entity) {
        try {
            if (!this.matches(kb, entity)) {
                return undefined;
            }
            return {
                adjustment: 10, // Strong auxiliary signal
                reason: 'Mongoose Schema pattern (initialized with new Schema())',
            };
        }
        catch (error) {
            return undefined;
        }
    }
    /**
     * Extract field names and metadata from schema initializer.
     *
     * Strategy:
     * - Simple fields: name: Type or name: { type: Type }
     * - Required: required: true
     * - References: ref: 'ModelName'
     *
     * Limitations:
     * - Doesn't parse deeply nested objects or arrays
     * - Doesn't handle virtuals, methods, statics
     * - Best-effort regex parsing (not a full JS parser)
     */
    extractFields(initializer) {
        const fields = [];
        try {
            // Remove 'new Schema(' prefix and trailing ')'
            const schemaBody = initializer
                .replace(/^new\s+(mongoose\.)?Schema\s*\(\s*\{/, '')
                .replace(/\}\s*\)$/, '');
            // Pattern 1: Simple fields (name: Type)
            const simplePattern = /(\w+)\s*:\s*(\w+)/g;
            let match;
            while ((match = simplePattern.exec(schemaBody)) !== null) {
                const fieldName = match[1];
                // Skip if this looks like a type property (e.g., "type: String")
                if (fieldName === 'type' || fieldName === 'ref' || fieldName === 'required') {
                    continue;
                }
                fields.push({ name: fieldName });
            }
            // Pattern 2: Complex fields with required/ref
            // Look for: fieldName: { ... } blocks
            const complexPattern = /(\w+)\s*:\s*\{([^}]+)\}/g;
            while ((match = complexPattern.exec(schemaBody)) !== null) {
                const fieldName = match[1];
                const fieldBody = match[2];
                // Skip already-added simple fields or meta properties
                if (fields.some(f => f.name === fieldName) || fieldName === 'type') {
                    continue;
                }
                const field = { name: fieldName };
                // Check for required
                if (/required\s*:\s*true/.test(fieldBody)) {
                    field.isRequired = true;
                }
                // Check for reference
                const refMatch = fieldBody.match(/ref\s*:\s*['"](\w+)['"]/);
                if (refMatch) {
                    field.isReference = true;
                    field.refModel = refMatch[1];
                }
                fields.push(field);
            }
            // Pattern 3: Array references [{ type: ..., ref: 'Model' }]
            const arrayRefPattern = /(\w+)\s*:\s*\[\s*\{[^}]*ref\s*:\s*['"](\w+)['"]/g;
            while ((match = arrayRefPattern.exec(schemaBody)) !== null) {
                const fieldName = match[1];
                const refModel = match[2];
                // Update existing field or add new one
                const existing = fields.find(f => f.name === fieldName);
                if (existing) {
                    existing.isReference = true;
                    existing.refModel = refModel;
                }
                else {
                    fields.push({
                        name: fieldName,
                        isReference: true,
                        refModel,
                    });
                }
            }
        }
        catch (error) {
            // Best effort - return partial results
        }
        // Deduplicate by name (keep first occurrence)
        const seen = new Set();
        return fields.filter(f => {
            if (seen.has(f.name))
                return false;
            seen.add(f.name);
            return true;
        });
    }
    /**
     * Determine confidence based on schema complexity.
     */
    determineConfidence(initializer, fields) {
        // If no fields extracted, low confidence (parsing may have failed)
        if (fields.length === 0) {
            return 'Low';
        }
        // If schema is very long (>1000 chars), medium confidence (complex nesting)
        if (initializer.length > 1000) {
            return 'Medium';
        }
        // If we extracted fields successfully, high confidence
        return 'High';
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
//# sourceMappingURL=mongoose-schema.js.map