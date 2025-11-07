/**
 * Phase 6: Shared Pattern Helpers
 *
 * Common utilities used across multiple framework patterns.
 * These helpers follow the same error-handling contract as patterns.
 */
/**
 * HTTP method names (uppercase)
 */
export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
/**
 * Check if an entity has a fact with the given predicate and object.
 *
 * @param kb - KnowledgeBase to query
 * @param entity - Entity to check
 * @param predicate - Fact predicate to match
 * @param objectMatch - Optional object value or regex to match
 * @returns true if matching fact exists
 */
export function hasFact(kb, entity, predicate, objectMatch) {
    // Get all factSets for this entity
    const factSets = kb.getFactSetsBySubject(entity.id);
    for (const factSet of factSets) {
        for (const fact of factSet.facts) {
            if (fact.predicate !== predicate) {
                continue;
            }
            if (objectMatch === undefined) {
                return true;
            }
            const objectStr = String(fact.object);
            if (typeof objectMatch === 'string') {
                if (objectStr === objectMatch) {
                    return true;
                }
            }
            else {
                if (objectMatch.test(objectStr)) {
                    return true;
                }
            }
        }
    }
    return false;
}
/**
 * Get all facts with the given predicate for an entity.
 *
 * @param kb - KnowledgeBase to query
 * @param entity - Entity to query
 * @param predicate - Fact predicate to match
 * @returns Array of matching facts
 */
export function getFactsByPredicate(kb, entity, predicate) {
    const factSets = kb.getFactSetsBySubject(entity.id);
    const result = [];
    for (const factSet of factSets) {
        for (const fact of factSet.facts) {
            if (fact.predicate === predicate) {
                result.push(fact);
            }
        }
    }
    return result;
}
/**
 * Get the first fact with the given predicate for an entity.
 *
 * @param kb - KnowledgeBase to query
 * @param entity - Entity to query
 * @param predicate - Fact predicate to match
 * @returns First matching fact or undefined
 */
export function getFirstFact(kb, entity, predicate) {
    const factSets = kb.getFactSetsBySubject(entity.id);
    for (const factSet of factSets) {
        for (const fact of factSet.facts) {
            if (fact.predicate === predicate) {
                return fact;
            }
        }
    }
    return undefined;
}
/**
 * Normalize HTTP method string to uppercase.
 *
 * @param method - Method string (e.g., "get", "GET", "Post")
 * @returns Uppercase method name or undefined if invalid
 */
export function normalizeHttpMethod(method) {
    const upper = method.toUpperCase();
    return HTTP_METHODS.includes(upper) ? upper : undefined;
}
/**
 * Extract parameter names from a function signature fact.
 *
 * @param kb - KnowledgeBase to query
 * @param entity - Entity to query
 * @returns Array of parameter names (empty if none found)
 */
export function getParameterNames(kb, entity) {
    const paramNamesFact = getFirstFact(kb, entity, 'param-names');
    if (!paramNamesFact || !paramNamesFact.object) {
        return [];
    }
    const namesStr = String(paramNamesFact.object);
    // Parse comma-separated param names
    return namesStr.split(',').map(name => name.trim()).filter(name => name.length > 0);
}
/**
 * Get the parameter count for a function.
 *
 * @param kb - KnowledgeBase to query
 * @param entity - Entity to query
 * @returns Parameter count or 0 if unknown
 */
export function getParameterCount(kb, entity) {
    const paramCountFact = getFirstFact(kb, entity, 'param-count');
    if (!paramCountFact || typeof paramCountFact.object !== 'number') {
        return 0;
    }
    return paramCountFact.object;
}
/**
 * Check if an entity has async/Promise-based behavior.
 *
 * @param kb - KnowledgeBase to query
 * @param entity - Entity to check
 * @returns true if async indicators found
 */
export function isAsync(kb, entity) {
    return (hasFact(kb, entity, 'is-async', 'true') ||
        hasFact(kb, entity, 'returns-promise', 'true'));
}
/**
 * Get factSets associated with an entity.
 *
 * @param kb - KnowledgeBase to query
 * @param entity - Entity to query
 * @returns Array of factSets
 */
export function getFactSets(kb, entity) {
    // Query KB for factSets where facts reference this entity
    const allFactSets = kb.getAllFactSets();
    return allFactSets.filter(fs => fs.facts.some(fact => fact.subjectId === entity.id));
}
//# sourceMappingURL=helpers.js.map