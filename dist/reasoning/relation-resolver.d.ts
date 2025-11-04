import { KnowledgeBase } from '../kb/knowledge-base.js';
import { Relation } from '../kb/models.js';
/**
 * Resolves call relations by converting expression text to entity IDs.
 *
 * Phase 2 parser stores call relations with objectId containing expression text
 * (e.g., 'app.get(...)', 'myFunction()', 'obj.method()'), not entity IDs.
 * This resolver converts those expressions to entity IDs to enable graph index construction.
 *
 * **Phase 2 Integration Realities:**
 * - Import relations: keyed by file path (not entity ID), no named imports list
 * - Entity IDs: content-based hashes (not source-ordered)
 * - No parent-child relationships in Entity model
 *
 * **Disambiguation Strategy:**
 * 1. Import-based: Prefers entities from files the caller imports (path matching heuristic)
 * 2. Local preference: Prefers entities in same file as caller
 * 3. Export preference: Prefers exported entities over internal ones
 * 4. Qualified names: Handles ClassName.methodName patterns
 *
 * **Known Limitations:**
 * - Import disambiguation is approximate (we don't know which specific symbols were imported)
 * - Same-named methods in multiple classes in same file cannot be reliably distinguished
 *   (no parent IDs or source positions available from Phase 2)
 * - External library calls (console.log, fs.readFile) correctly remain unresolved
 *
 * **Accuracy Target:** ≥80% resolution rate for local codebase calls
 * (achievable with import/local/export heuristics despite Phase 2 schema limitations)
 */
export declare class RelationResolver {
    private kb;
    private entityLookup;
    private importMap;
    constructor(kb: KnowledgeBase);
    /**
     * Resolve call relations by converting expression text to entity IDs.
     * Returns new array of relations with resolved objectIds.
     *
     * @param relations - Relations from KB with objectId = expression text
     * @returns Relations with resolved entity IDs (or original text if unresolved)
     */
    resolve(relations: Relation[]): Relation[];
    /**
     * Build entity lookup map: entity name → [entity IDs].
     * Stores multiple entities with the same name to handle collisions.
     * Also includes qualified names (ClassName.methodName).
     *
     * Phase 2 Reality: Entities are extracted in SOURCE ORDER.
     * Methods immediately follow their parent class in the array.
     * This positional information IS the parent-child relationship.
     */
    buildEntityLookup(): Map<string, string[]>;
    /**
     * Build import map from relations.
     * Maps file path → set of module specifiers.
     *
     * Phase 2 Reality: Import relations have `subjectId = filePath`, not entity ID.
     * We cannot determine WHICH specific symbols were imported (no details.imported field),
     * so we track which modules each file imports.
     *
     * @param relations - All relations from KB
     * @returns Map of file path to imported module specifiers
     */
    private buildImportMap;
    /**
     * Resolve call expression text to entity ID.
     * Uses import relations and heuristics to disambiguate name collisions.
     * Correctly handles chained calls like service.create().save().
     *
     * @param expr - Call expression text (e.g., 'functionName', 'functionName()', 'a().b()')
     * @param callerId - Entity ID of the caller
     * @param callerPath - File path of the caller
     * @returns Entity ID if resolved, null otherwise
     */
    private resolveCallExpression;
    /**
     * Resolve qualified name like 'ClassName.methodName' or 'obj.method'.
     * Distinguishes between known classes/objects and external libraries.
     *
     * @param qualifiedName - Qualified name to resolve
     * @returns Entity ID if resolved, null otherwise
     */
    private resolveQualifiedName;
    /**
     * Resolve simple name using import relations and heuristics.
     *
     * Phase 2 Reality: We know which MODULE SPECIFIERS a file imports,
     * but not which specific symbols. Use path-based matching as heuristic.
     *
     * @param name - Simple name to resolve
     * @param callerId - Entity ID of the caller
     * @param callerPath - File path of the caller
     * @returns Entity ID if resolved, null otherwise
     */
    private resolveSimpleName;
    /**
     * Helper: Get all entities from KB.
     * Uses KB.getAllEntities() added below.
     */
    private getAllEntitiesFromKB;
}
//# sourceMappingURL=relation-resolver.d.ts.map