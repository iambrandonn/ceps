import { VALID_ENTITY_KINDS } from '../types/index.js';
// Factory functions with validation
export function createEntity(data) {
    // FIX: Add runtime validation for entity kind
    if (!VALID_ENTITY_KINDS.includes(data.kind)) {
        throw new Error(`Invalid entity kind: ${data.kind}`);
    }
    return {
        ...data,
        path: data.path.replace(/\\/g, '/'), // Normalize to POSIX
    };
}
export function createFactSet(data) {
    if (data.evidenceScore < 0 || data.evidenceScore > 100) {
        throw new Error('evidenceScore must be between 0 and 100');
    }
    return { ...data };
}
export function createBehaviorChunk(data) {
    if (!data.factSetIds || data.factSetIds.length === 0) {
        throw new Error('BehaviorChunk must reference at least one factSet');
    }
    return data;
}
//# sourceMappingURL=models.js.map