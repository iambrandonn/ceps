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
import { ExpressConfigPattern } from './config.js';
import { MongooseSchemaPattern } from './mongoose-schema.js';
import { MongooseModelPattern } from './mongoose-model.js';
import { MongooseQueryPattern } from './mongoose-query.js';
/**
 * Register all Express pattern modules with the given registry.
 *
 * @param registry - Pattern registry to register modules with
 */
export declare function registerExpressPatterns(registry: PatternRegistry): void;
export { ExpressMiddlewarePattern, ExpressRouterPattern, ExpressErrorHandlerPattern, ExpressConfigPattern, MongooseSchemaPattern, MongooseModelPattern, MongooseQueryPattern, };
//# sourceMappingURL=index.d.ts.map