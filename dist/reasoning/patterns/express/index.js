/**
 * Phase 6: Express Pattern Library
 *
 * Entry point for Express framework pattern detection.
 * Registers all Express-specific pattern modules.
 */
import { ExpressMiddlewarePattern } from './middleware.js';
import { ExpressRouterPattern } from './router.js';
// Additional patterns will be imported as they're implemented
// import { ExpressErrorHandlerPattern } from './error-handlers.js';
// import { ExpressAsyncHandlerPattern } from './async-handlers.js';
// import { ExpressConfigPattern } from './config.js';
// import { MongooseIntegrationPattern } from './mongoose.js';
/**
 * Register all Express pattern modules with the given registry.
 *
 * @param registry - Pattern registry to register modules with
 */
export function registerExpressPatterns(registry) {
    // I1: Middleware & Router patterns
    registry.register(new ExpressMiddlewarePattern());
    registry.register(new ExpressRouterPattern());
    // Future patterns will be registered here as they're implemented
    // I2: Error handlers, async patterns
    // I3: Config patterns
    // I4: Mongoose integration
}
// Export pattern modules for direct use if needed
export { ExpressMiddlewarePattern, ExpressRouterPattern };
//# sourceMappingURL=index.js.map