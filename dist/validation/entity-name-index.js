/**
 * Phase 4 WS-F1 Stage A2: Entity Name Index
 *
 * KB lacks name-based lookup, so validator maintains its own index.
 * Built once per run (O(n)), reused for all validations (O(k) lookup).
 *
 * Handles:
 * - Exact name matches
 * - Name collisions (same name, different paths/kinds)
 * - Qualified names (ClassName.methodName)
 * - Case-sensitive lookups
 */
/**
 * Entity name index for fast name-based lookups.
 * Workaround for KB lacking `findEntityByName()` API.
 */
export class EntityNameIndex {
    byName = new Map();
    byQualifiedName = new Map();
    entities;
    /**
     * Build index from entity array (typically from kb.getAllEntities()).
     * Complexity: O(n) where n = number of entities.
     *
     * @param entities - Array of entities to index
     */
    constructor(entities) {
        this.entities = new Map(entities.map((e) => [e.id, e]));
        // Build simple name index (may have collisions)
        for (const entity of entities) {
            if (!this.byName.has(entity.name)) {
                this.byName.set(entity.name, new Set());
            }
            this.byName.get(entity.name).add(entity.id);
        }
        // Build qualified name index (ClassName.methodName)
        // Heuristic: For methods, try to find parent class in same file
        for (const entity of entities) {
            if (entity.kind === 'method') {
                const qualifiedName = this.buildQualifiedName(entity, entities);
                if (qualifiedName) {
                    this.byQualifiedName.set(qualifiedName, entity.id);
                }
            }
        }
    }
    /**
     * Find entities by name (simple or qualified).
     * Complexity: O(k) where k = number of matches (typically 1-2).
     *
     * @param name - Entity name or qualified name (e.g., "UserService" or "UserService.validateUser")
     * @returns Array of entity IDs matching the name
     */
    find(name) {
        // Check qualified name first (exact match)
        if (name.includes('.')) {
            const entityId = this.byQualifiedName.get(name);
            if (entityId) {
                return [entityId];
            }
            return [];
        }
        // Check simple name (may return multiple matches)
        const matches = this.byName.get(name);
        if (!matches) {
            return [];
        }
        return Array.from(matches);
    }
    /**
     * Build qualified name for a method (ClassName.methodName).
     * Finds parent class by matching file path and proximity.
     *
     * @param method - Method entity
     * @param allEntities - All entities (to find parent class)
     * @returns Qualified name or null if parent not found
     */
    buildQualifiedName(method, allEntities) {
        // Find parent class in same file
        const parentClass = allEntities.find((e) => e.kind === 'class' &&
            e.path === method.path &&
            e.id !== method.id);
        if (parentClass) {
            return `${parentClass.name}.${method.name}`;
        }
        return null;
    }
}
//# sourceMappingURL=entity-name-index.js.map