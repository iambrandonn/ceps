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
import type { Entity } from '../kb/models.js';
/**
 * Entity name index for fast name-based lookups.
 * Workaround for KB lacking `findEntityByName()` API.
 */
export declare class EntityNameIndex {
    private byName;
    private byQualifiedName;
    private entities;
    /**
     * Build index from entity array (typically from kb.getAllEntities()).
     * Complexity: O(n) where n = number of entities.
     *
     * @param entities - Array of entities to index
     */
    constructor(entities: Entity[]);
    /**
     * Find entities by name (simple or qualified).
     * Complexity: O(k) where k = number of matches (typically 1-2).
     *
     * @param name - Entity name or qualified name (e.g., "UserService" or "UserService.validateUser")
     * @returns Array of entity IDs matching the name
     */
    find(name: string): string[];
    /**
     * Build qualified name for a method (ClassName.methodName).
     * Finds parent class by matching file path and proximity.
     *
     * @param method - Method entity
     * @param allEntities - All entities (to find parent class)
     * @returns Qualified name or null if parent not found
     */
    private buildQualifiedName;
}
//# sourceMappingURL=entity-name-index.d.ts.map