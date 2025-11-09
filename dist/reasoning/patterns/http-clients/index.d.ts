/**
 * Phase 6: HTTP Clients Pattern Library
 *
 * Entry point for HTTP client pattern detection.
 * Registers all HTTP client-specific pattern modules (Axios, Fetch, etc.).
 */
import { PatternRegistry } from '../pattern-registry.js';
import { AxiosClientPattern } from './axios-client.js';
import { FetchPattern } from './fetch-patterns.js';
import { RequestResponseTransformPattern } from './request-response-transform.js';
import { HttpErrorHandlingPattern } from './error-handling.js';
/**
 * Register all HTTP client pattern modules with the given registry.
 *
 * @param registry - Pattern registry to register modules with
 */
export declare function registerHttpClientPatterns(registry: PatternRegistry): void;
export { AxiosClientPattern, FetchPattern, RequestResponseTransformPattern, HttpErrorHandlingPattern, };
//# sourceMappingURL=index.d.ts.map