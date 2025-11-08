/**
 * Phase 6: Express Pattern Library
 *
 * Entry point for Express framework pattern detection.
 * Registers all Express-specific pattern modules.
 */
import { ExpressMiddlewarePattern } from './middleware.js';
import { ExpressRouterPattern } from './router.js';
import { ExpressErrorHandlerPattern } from './error-handler.js';
import { ExpressConfigPattern } from './config.js';
// Additional patterns will be imported as they're implemented
// I2: Error handlers ✅ (completed)
// I3: Config patterns ✅ (completed)
// import { ExpressAsyncHandlerPattern } from './async-handlers.js';
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
    // I2: Error handler pattern
    registry.register(new ExpressErrorHandlerPattern());
    // I3: Config pattern
    registry.register(new ExpressConfigPattern());
    // Future patterns will be registered here as they're implemented
    // I2: Async patterns (TODO)
    // I4: Mongoose integration
}
// Export pattern modules for direct use if needed
export { ExpressMiddlewarePattern, ExpressRouterPattern, ExpressErrorHandlerPattern, ExpressConfigPattern };
//# sourceMappingURL=index.js.map