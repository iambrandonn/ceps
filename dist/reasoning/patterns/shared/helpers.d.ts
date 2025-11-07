/**
 * Phase 6: Shared Pattern Helpers
 *
 * Common utilities used across multiple framework patterns.
 * These helpers follow the same error-handling contract as patterns.
 */
import { KnowledgeBase } from '../../../kb/knowledge-base.js';
import { Entity, Fact, FactSet } from '../../../kb/models.js';
/**
 * HTTP method names (uppercase)
 */
export declare const HTTP_METHODS: readonly ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
export type HttpMethod = typeof HTTP_METHODS[number];
/**
 * Check if an entity has a fact with the given predicate and object.
 *
 * @param kb - KnowledgeBase to query
 * @param entity - Entity to check
 * @param predicate - Fact predicate to match
 * @param objectMatch - Optional object value or regex to match
 * @returns true if matching fact exists
 */
export declare function hasFact(kb: KnowledgeBase, entity: Entity, predicate: string, objectMatch?: string | RegExp): boolean;
/**
 * Get all facts with the given predicate for an entity.
 *
 * @param kb - KnowledgeBase to query
 * @param entity - Entity to query
 * @param predicate - Fact predicate to match
 * @returns Array of matching facts
 */
export declare function getFactsByPredicate(kb: KnowledgeBase, entity: Entity, predicate: string): Fact[];
/**
 * Get the first fact with the given predicate for an entity.
 *
 * @param kb - KnowledgeBase to query
 * @param entity - Entity to query
 * @param predicate - Fact predicate to match
 * @returns First matching fact or undefined
 */
export declare function getFirstFact(kb: KnowledgeBase, entity: Entity, predicate: string): Fact | undefined;
/**
 * Normalize HTTP method string to uppercase.
 *
 * @param method - Method string (e.g., "get", "GET", "Post")
 * @returns Uppercase method name or undefined if invalid
 */
export declare function normalizeHttpMethod(method: string): HttpMethod | undefined;
/**
 * Extract parameter names from a function signature fact.
 *
 * @param kb - KnowledgeBase to query
 * @param entity - Entity to query
 * @returns Array of parameter names (empty if none found)
 */
export declare function getParameterNames(kb: KnowledgeBase, entity: Entity): string[];
/**
 * Get the parameter count for a function.
 *
 * @param kb - KnowledgeBase to query
 * @param entity - Entity to query
 * @returns Parameter count or 0 if unknown
 */
export declare function getParameterCount(kb: KnowledgeBase, entity: Entity): number;
/**
 * Check if an entity has async/Promise-based behavior.
 *
 * @param kb - KnowledgeBase to query
 * @param entity - Entity to check
 * @returns true if async indicators found
 */
export declare function isAsync(kb: KnowledgeBase, entity: Entity): boolean;
/**
 * Get factSets associated with an entity.
 *
 * @param kb - KnowledgeBase to query
 * @param entity - Entity to query
 * @returns Array of factSets
 */
export declare function getFactSets(kb: KnowledgeBase, entity: Entity): FactSet[];
//# sourceMappingURL=helpers.d.ts.map