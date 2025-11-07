/**
 * Phase 6: Express Pattern Library
 *
 * Entry point for Express framework pattern detection.
 * Registers all Express-specific pattern modules.
 */

import { PatternRegistry } from '../pattern-registry.js';
import { ExpressMiddlewarePattern } from './middleware.js';
import { ExpressRouterPattern } from './router.js';
import { ExpressErrorHandlerPattern } from './error-handler.js';

// Additional patterns will be imported as they're implemented
// I2: Error handlers ✅ (completed)
// import { ExpressAsyncHandlerPattern } from './async-handlers.js';
// import { ExpressConfigPattern } from './config.js';
// import { MongooseIntegrationPattern } from './mongoose.js';

/**
 * Register all Express pattern modules with the given registry.
 *
 * @param registry - Pattern registry to register modules with
 */
export function registerExpressPatterns(registry: PatternRegistry): void {
  // I1: Middleware & Router patterns
  registry.register(new ExpressMiddlewarePattern());
  registry.register(new ExpressRouterPattern());

  // I2: Error handler pattern
  registry.register(new ExpressErrorHandlerPattern());

  // Future patterns will be registered here as they're implemented
  // I2: Async patterns (TODO)
  // I3: Config patterns
  // I4: Mongoose integration
}

// Export pattern modules for direct use if needed
export { ExpressMiddlewarePattern, ExpressRouterPattern, ExpressErrorHandlerPattern };
