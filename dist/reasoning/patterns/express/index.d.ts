/**
 * Phase 6: Express Pattern Library
 *
 * Entry point for Express framework pattern detection.
 * Registers all Express-specific pattern modules.
 */
import { PatternRegistry } from '../pattern-registry.js';
import { ExpressMiddlewarePattern } from './middleware.js';
import { ExpressRouterPattern } from './router.js';
/**
 * Register all Express pattern modules with the given registry.
 *
 * @param registry - Pattern registry to register modules with
 */
export declare function registerExpressPatterns(registry: PatternRegistry): void;
export { ExpressMiddlewarePattern, ExpressRouterPattern };
//# sourceMappingURL=index.d.ts.map