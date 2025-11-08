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
import { MongooseSchemaPattern } from './mongoose-schema.js';
import { MongooseModelPattern } from './mongoose-model.js';
import { MongooseQueryPattern } from './mongoose-query.js';
// Additional patterns will be imported as they're implemented
// I2: Error handlers ✅ (completed)
// I3: Config patterns ✅ (completed)
// I4: Mongoose integration ✅ (completed)
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
    // I4: Mongoose integration patterns
    registry.register(new MongooseSchemaPattern());
    registry.register(new MongooseModelPattern());
    registry.register(new MongooseQueryPattern());
}
// Export pattern modules for direct use if needed
export { ExpressMiddlewarePattern, ExpressRouterPattern, ExpressErrorHandlerPattern, ExpressConfigPattern, MongooseSchemaPattern, MongooseModelPattern, MongooseQueryPattern, };
//# sourceMappingURL=index.js.map