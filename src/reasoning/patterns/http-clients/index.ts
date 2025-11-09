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
export function registerHttpClientPatterns(registry: PatternRegistry): void {
  // I1: Core HTTP client patterns
  registry.register(new AxiosClientPattern());
  registry.register(new FetchPattern());
  registry.register(new RequestResponseTransformPattern());
  registry.register(new HttpErrorHandlingPattern());

  // I2: Advanced patterns (retry, timeout, interceptors, auth-headers) - to be implemented
}

// Export pattern modules for direct use if needed
export {
  AxiosClientPattern,
  FetchPattern,
  RequestResponseTransformPattern,
  HttpErrorHandlingPattern,
};
