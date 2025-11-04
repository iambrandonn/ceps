import { KnowledgeBase } from '../kb/knowledge-base.js';
import { Relation, Entity } from '../kb/models.js';

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
export class RelationResolver {
  private entityLookup: Map<string, string[]> = new Map(); // name → [entity IDs]
  private importMap: Map<string, Set<string>> = new Map(); // filePath → set of module specifiers

  constructor(private kb: KnowledgeBase) {}

  /**
   * Resolve call relations by converting expression text to entity IDs.
   * Returns new array of relations with resolved objectIds.
   *
   * @param relations - Relations from KB with objectId = expression text
   * @returns Relations with resolved entity IDs (or original text if unresolved)
   */
  resolve(relations: Relation[]): Relation[] {
    // Build entity lookup and import map
    this.entityLookup = this.buildEntityLookup();
    this.importMap = this.buildImportMap(relations);

    const resolved: Relation[] = [];

    for (const relation of relations) {
      if (relation.predicate === 'calls') {
        const callerEntity = this.kb.getEntity(relation.subjectId);
        const entityId = this.resolveCallExpression(
          relation.objectId || '',
          relation.subjectId,
          callerEntity?.path
        );

        resolved.push({
          ...relation,
          // Set objectId to resolved entity ID, or null if unresolved
          // (not the original expression, per STEP0 spec)
          objectId: entityId || null,
          details: {
            ...relation.details,
            originalExpression: relation.objectId,
            resolved: !!entityId
          }
        });
      } else {
        // Non-call relations (imports, exports) pass through unchanged
        resolved.push(relation);
      }
    }

    return resolved;
  }

  /**
   * Build entity lookup map: entity name → [entity IDs].
   * Stores multiple entities with the same name to handle collisions.
   * Also includes qualified names (ClassName.methodName).
   *
   * Phase 2 Reality: Entities are extracted in SOURCE ORDER.
   * Methods immediately follow their parent class in the array.
   * This positional information IS the parent-child relationship.
   */
  buildEntityLookup(): Map<string, string[]> {
    const lookup = new Map<string, string[]>();
    const entities = this.getAllEntitiesFromKB();

    // Group entities by file to track parent-child relationships
    const entitiesByFile = new Map<string, Entity[]>();
    for (const entity of entities) {
      if (!entitiesByFile.has(entity.path)) {
        entitiesByFile.set(entity.path, []);
      }
      entitiesByFile.get(entity.path)!.push(entity);
    }

    // Process each file's entities in order
    for (const [filePath, fileEntities] of entitiesByFile) {
      let currentClass: Entity | null = null;

      for (const entity of fileEntities) {
        // Add simple name (supporting multiple entities with same name)
        if (!lookup.has(entity.name)) {
          lookup.set(entity.name, []);
        }
        lookup.get(entity.name)!.push(entity.id);

        // Track current class context
        if (entity.kind === 'class') {
          currentClass = entity;
        }

        // For methods, add qualified name using the current class context
        // Phase 2 extracts methods right after their parent class,
        // so currentClass is the parent
        if (entity.kind === 'method' && currentClass) {
          const qualifiedName = `${currentClass.name}.${entity.name}`;
          if (!lookup.has(qualifiedName)) {
            lookup.set(qualifiedName, []);
          }
          lookup.get(qualifiedName)!.push(entity.id);
        }
      }
    }

    return lookup;
  }

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
  private buildImportMap(relations: Relation[]): Map<string, Set<string>> {
    const importMap = new Map<string, Set<string>>();

    for (const relation of relations) {
      if (relation.predicate === 'imports') {
        const filePath = relation.subjectId;  // Phase 2 uses file path here
        const moduleSpec = relation.objectId || '';

        if (!importMap.has(filePath)) {
          importMap.set(filePath, new Set());
        }

        importMap.get(filePath)!.add(moduleSpec);
      }
    }

    return importMap;
  }

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
  private resolveCallExpression(expr: string, callerId: string, callerPath?: string): string | null {
    // Handle both formats: with and without parentheses
    // 'functionName' or 'functionName()' or 'service.create().save()'

    // First, check if expression has parentheses (actual call syntax)
    if (expr.includes('(')) {
      // Match the final method call: methodName(args)
      const lastCallMatch = expr.match(/(\w+)\([^)]*\)$/);
      if (!lastCallMatch) {
        // Malformed expression
        return null;
      }

      const finalMethodName = lastCallMatch[1];
      const beforeMethod = expr.substring(0, lastCallMatch.index);

      // Check if this is a chained call (has () before the final method)
      // Example: service.create().save() - has () in 'service.create().'
      if (beforeMethod.includes('()')) {
        // Chained call: resolve only the final method name
        // Example: service.create().save() → resolve 'save'
        return this.resolveSimpleName(finalMethodName, callerId, callerPath);
      }

      // Not a chained call - could be simple or qualified
      if (beforeMethod.includes('.')) {
        // Qualified name: Service.process() or service.create()
        const qualifiedName = beforeMethod + finalMethodName;
        return this.resolveQualifiedName(qualifiedName);
      } else {
        // Simple name: functionName()
        return this.resolveSimpleName(finalMethodName, callerId, callerPath);
      }
    }

    // No parentheses - just the name (e.g., 'functionName', 'Service.process')
    // This is the format used by many tests and possibly by the parser
    if (expr.includes('.')) {
      // Qualified name: Service.process
      return this.resolveQualifiedName(expr);
    } else {
      // Simple name: functionName
      return this.resolveSimpleName(expr, callerId, callerPath);
    }
  }

  /**
   * Resolve qualified name like 'ClassName.methodName' or 'obj.method'.
   * Distinguishes between known classes/objects and external libraries.
   *
   * @param qualifiedName - Qualified name to resolve
   * @returns Entity ID if resolved, null otherwise
   */
  private resolveQualifiedName(qualifiedName: string): string | null {
    const candidates = this.entityLookup.get(qualifiedName);
    if (!candidates || candidates.length === 0) {
      // No exact match for the qualified name
      // Check if the first part is a known entity (class, variable, etc.)
      const [firstPart, ...rest] = qualifiedName.split('.');
      const methodName = rest[rest.length - 1];

      const firstPartExists = this.entityLookup.has(firstPart);

      if (firstPartExists && methodName) {
        // First part is known (e.g., 'service' in 'service.process')
        // This is likely a member expression on a local object
        // Try to resolve just the method name
        return this.resolveSimpleName(methodName, '', undefined);
      }

      // First part is not known (e.g., 'console' in 'console.log')
      // This is an external library call - do not resolve
      return null;
    }

    // If we have a qualified name like "SecondClass.process", we need to find
    // the method that actually belongs to SecondClass
    const [className, methodName] = qualifiedName.split('.');

    // Find all method candidates
    const allEntities = this.getAllEntitiesFromKB();
    const classEntities = allEntities.filter(e => e.kind === 'class' && e.name === className);

    for (const classEntity of classEntities) {
      // Find all methods with matching name in the same file
      const methodsInFile = candidates.filter(id => {
        const entity = this.kb.getEntity(id);
        return entity && entity.kind === 'method' &&
               entity.name === methodName &&
               entity.path === classEntity.path;
      });

      if (methodsInFile.length === 0) {
        continue;
      }

      if (methodsInFile.length === 1) {
        return methodsInFile[0];
      }

      // LIMITATION: Multiple methods with same name in same file
      //
      // Phase 2 Reality: Entity IDs are content-based hashes, NOT source-ordered.
      // The Entity model has no parentId field linking methods to their classes.
      //
      // Without source position or parent-child relationships, we cannot reliably
      // distinguish which method belongs to which class when they share the same name.
      //
      // Mitigation: Real codebases typically use unique method names within a file,
      // making this edge case rare. When it occurs, we fall back to the first match.
      //
      // Future enhancement: Add parentId to Entity model or source position metadata.
      return methodsInFile[0];
    }

    // Fallback: return first candidate
    return candidates[0];
  }

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
  private resolveSimpleName(name: string, callerId: string, callerPath?: string): string | null {
    const candidates = this.entityLookup.get(name);
    if (!candidates || candidates.length === 0) {
      return null;
    }

    if (candidates.length === 1) {
      return candidates[0];
    }

    // Multiple candidates - use heuristics to disambiguate

    // 1. Check if caller's file imports from candidate's file
    // We can't know if THIS specific symbol was imported, but if the file
    // imports from the candidate's module, prefer that candidate
    if (callerPath) {
      const imports = this.importMap.get(callerPath);
      if (imports) {
        for (const moduleSpec of imports) {
          // Try to match module specifier to candidate file paths
          const imported = candidates.find(id => {
            const entity = this.kb.getEntity(id);
            if (!entity) return false;

            // Match relative imports (e.g., './utils' matches 'src/utils.ts')
            if (moduleSpec.startsWith('.')) {
              // Simple heuristic: check if entity path contains the module name
              const moduleName = moduleSpec.replace(/^\.\//, '').replace(/^\.\.\//, '');
              return entity.path.includes(moduleName);
            }

            // Match npm packages (e.g., 'lodash' - we don't have those entities anyway)
            return false;
          });

          if (imported) {
            return imported;
          }
        }
      }
    }

    // 2. Prefer entity in same file (local call)
    if (callerPath) {
      const local = candidates.find(id => {
        const entity = this.kb.getEntity(id);
        return entity && entity.path === callerPath;
      });
      if (local) {
        return local;
      }
    }

    // 3. Prefer exported entities (public API)
    const exported = candidates.find(id => {
      const entity = this.kb.getEntity(id);
      return entity && entity.exported;
    });
    if (exported) {
      return exported;
    }

    // 4. Fallback: return first candidate
    return candidates[0];
  }

  /**
   * Helper: Get all entities from KB.
   * Uses KB.getAllEntities() added below.
   */
  private getAllEntitiesFromKB(): Entity[] {
    return this.kb.getAllEntities();
  }
}
