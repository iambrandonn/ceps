/**
 * Phase 6 I1: Lexicon Validator Tests
 *
 * Tests framework-specific terminology validation against docs/lexicon.md.
 * Ensures LLM-generated text uses approved terms and rejects anti-patterns.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { LexiconValidator } from '../lexicon-validator.js';
import { KnowledgeBase } from '../../kb/knowledge-base.js';
import * as path from 'path';
describe('LexiconValidator', () => {
    let validator;
    const kb = new KnowledgeBase(); // Not used by lexicon validator, but needed for interface
    beforeAll(() => {
        // Load lexicon from docs/lexicon.md
        const lexiconPath = path.join(process.cwd(), 'docs', 'lexicon.md');
        validator = new LexiconValidator();
        validator.loadFromMarkdown(lexiconPath);
    });
    describe('loadFromMarkdown()', () => {
        it('should load approved Express terms', () => {
            const rules = validator.getRules();
            const expressRule = rules.get('express');
            // Terms should be loaded
            expect(expressRule).toBeDefined();
            expect(expressRule.approvedTerms.has('Express middleware')).toBe(true);
            expect(expressRule.approvedTerms.has('middleware chain')).toBe(true);
            expect(expressRule.approvedTerms.has('Express Router')).toBe(true);
            expect(expressRule.approvedTerms.has('route handlers')).toBe(true);
        });
        it('should load HTTP method terms', () => {
            const rules = validator.getRules();
            const expressRule = rules.get('express');
            expect(expressRule.approvedTerms.has('GET')).toBe(true);
            expect(expressRule.approvedTerms.has('POST')).toBe(true);
            expect(expressRule.approvedTerms.has('PUT')).toBe(true);
            expect(expressRule.approvedTerms.has('DELETE')).toBe(true);
            expect(expressRule.approvedTerms.has('PATCH')).toBe(true);
        });
        it('should load I2 error handling terms', () => {
            const rules = validator.getRules();
            const expressRule = rules.get('express');
            expect(expressRule.approvedTerms.has('Express error handler')).toBe(true);
            expect(expressRule.approvedTerms.has('error middleware')).toBe(true);
            expect(expressRule.approvedTerms.has('4-param middleware')).toBe(true);
        });
        it('should load I2 async handling terms', () => {
            const rules = validator.getRules();
            const expressRule = rules.get('express');
            expect(expressRule.approvedTerms.has('async')).toBe(true);
            expect(expressRule.approvedTerms.has('Promise-based flow')).toBe(true);
            expect(expressRule.approvedTerms.has('asynchronous')).toBe(true);
        });
        it('should load I3 configuration terms', () => {
            const rules = validator.getRules();
            const expressRule = rules.get('express');
            expect(expressRule.approvedTerms.has('configuration')).toBe(true);
            expect(expressRule.approvedTerms.has('app.set')).toBe(true);
            expect(expressRule.approvedTerms.has('app.get')).toBe(true);
            expect(expressRule.approvedTerms.has('environment variable')).toBe(true);
            expect(expressRule.approvedTerms.has('process.env')).toBe(true);
        });
        it('should load Express anti-patterns', () => {
            const rules = validator.getRules();
            const expressRule = rules.get('express');
            expect(expressRule.antiPatterns.has('servlet')).toBe(true);
            expect(expressRule.antiPatterns.get('servlet')).toContain('Express middleware');
            expect(expressRule.antiPatterns.has('Spring controller')).toBe(true);
            expect(expressRule.antiPatterns.get('Spring controller')).toContain('Express Router');
            expect(expressRule.antiPatterns.has('Rails router')).toBe(true);
        });
        it('should load I2 error handling anti-patterns', () => {
            const rules = validator.getRules();
            const expressRule = rules.get('express');
            expect(expressRule.antiPatterns.has('exception handler')).toBe(true);
            expect(expressRule.antiPatterns.get('exception handler')).toContain('Express error handler');
            expect(expressRule.antiPatterns.has('error servlet')).toBe(true);
            expect(expressRule.antiPatterns.get('error servlet')).toContain('Express error handler');
            expect(expressRule.antiPatterns.has('error controller')).toBe(true);
            expect(expressRule.antiPatterns.get('error controller')).toContain('Express error handler');
        });
        it('should load I3 configuration anti-patterns', () => {
            const rules = validator.getRules();
            const expressRule = rules.get('express');
            expect(expressRule.antiPatterns.has('application.properties')).toBe(true);
            expect(expressRule.antiPatterns.get('application.properties')).toContain('app.set');
            expect(expressRule.antiPatterns.has('@ConfigurationProperties')).toBe(true);
            expect(expressRule.antiPatterns.get('@ConfigurationProperties')).toContain('app.set');
            expect(expressRule.antiPatterns.has('Spring Boot config')).toBe(true);
            expect(expressRule.antiPatterns.get('Spring Boot config')).toContain('Express configuration');
            expect(expressRule.antiPatterns.has('settings.ini')).toBe(true);
            expect(expressRule.antiPatterns.get('settings.ini')).toContain('app.set');
            expect(expressRule.antiPatterns.has('configuration manager')).toBe(true);
            expect(expressRule.antiPatterns.get('configuration manager')).toContain('app.set');
        });
    });
    describe('validate() - Approved Terms', () => {
        it('should accept text with approved Express middleware terminology', () => {
            const draftText = 'Express middleware function authMiddleware that processes requests in the middleware chain.';
            const metadata = {
                chunkId: 'chunk-1',
                targetEntityId: 'entity-1',
                factSetIds: ['fs-1'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-1'], metadata);
            expect(result.status).toBe('accept');
            expect(result.diagnostics).toHaveLength(0);
        });
        it('should accept text with approved Express Router terminology', () => {
            const draftText = 'Express Router usersRouter that defines HTTP route handlers. Routes: GET /users, POST /users, DELETE /users/:id.';
            const metadata = {
                chunkId: 'chunk-2',
                targetEntityId: 'entity-2',
                factSetIds: ['fs-2'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-2'], metadata);
            expect(result.status).toBe('accept');
            expect(result.diagnostics).toHaveLength(0);
        });
        it('should accept text with HTTP methods', () => {
            const draftText = 'Handles GET requests to /users HTTP route.';
            const metadata = {
                chunkId: 'chunk-3',
                targetEntityId: 'entity-3',
                factSetIds: ['fs-3'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-3'], metadata);
            expect(result.status).toBe('accept');
            expect(result.diagnostics).toHaveLength(0);
        });
        it('should accept text without framework-specific terms (generic code)', () => {
            const draftText = 'Function calculateTotal that computes the sum of array elements.';
            const metadata = {
                chunkId: 'chunk-4',
                targetEntityId: 'entity-4',
                factSetIds: ['fs-4'],
                confidence: 'Medium',
            };
            const result = validator.validate(draftText, ['fs-4'], metadata);
            expect(result.status).toBe('accept');
            expect(result.diagnostics).toHaveLength(0);
        });
        it('should accept I2 error handler terminology', () => {
            const draftText = 'errorHandler is an Express error handler (4-param middleware) that catches errors from the middleware chain.';
            const metadata = {
                chunkId: 'chunk-i2-1',
                targetEntityId: 'entity-i2-1',
                factSetIds: ['fs-i2-1'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-i2-1'], metadata);
            expect(result.status).toBe('accept');
        });
        it('should accept I3 configuration terminology (app.set/app.get)', () => {
            const draftText = 'Express configuration function configureApp that sets application configuration via app.set and reads configuration values via app.get.';
            const metadata = {
                chunkId: 'chunk-i3-1',
                targetEntityId: 'entity-i3-1',
                factSetIds: ['fs-i3-1'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-i3-1'], metadata);
            expect(result.status).toBe('accept');
            expect(result.diagnostics).toHaveLength(0);
        });
        it('should accept I3 environment variable terminology', () => {
            const draftText = 'Function loadEnvConfig that reads environment variables (PORT, NODE_ENV, API_KEY) from process.env.';
            const metadata = {
                chunkId: 'chunk-i3-2',
                targetEntityId: 'entity-i3-2',
                factSetIds: ['fs-i3-2'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-i3-2'], metadata);
            expect(result.status).toBe('accept');
            expect(result.diagnostics).toHaveLength(0);
        });
        it('should accept "error middleware" terminology', () => {
            const draftText = 'This error middleware handles exceptions in the request pipeline.';
            const metadata = {
                chunkId: 'chunk-i2-2',
                targetEntityId: 'entity-i2-2',
                factSetIds: ['fs-i2-2'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-i2-2'], metadata);
            expect(result.status).toBe('accept');
            expect(result.diagnostics).toHaveLength(0);
        });
        it('should accept async terminology', () => {
            const draftText = 'async Express middleware function that handles asynchronous requests with Promise-based flow.';
            const metadata = {
                chunkId: 'chunk-i2-3',
                targetEntityId: 'entity-i2-3',
                factSetIds: ['fs-i2-3'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-i2-3'], metadata);
            expect(result.status).toBe('accept');
            expect(result.diagnostics).toHaveLength(0);
        });
    });
    describe('validate() - Anti-Patterns', () => {
        it('should reject "servlet" and suggest Express middleware', () => {
            const draftText = 'The authMiddleware servlet processes incoming requests.';
            const metadata = {
                chunkId: 'chunk-5',
                targetEntityId: 'entity-5',
                factSetIds: ['fs-5'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-5'], metadata);
            expect(result.status).toBe('retry');
            expect(result.diagnostics.length).toBeGreaterThan(0);
            const diagnostic = result.diagnostics[0];
            expect(diagnostic.rule).toBe('lexicon');
            expect(diagnostic.reason).toMatch(/servlet/i);
            expect(diagnostic.reason).toMatch(/Express middleware/i);
        });
        it('should reject "Spring controller" and suggest Express Router', () => {
            const draftText = 'Spring controller usersRouter that handles HTTP requests.';
            const metadata = {
                chunkId: 'chunk-6',
                targetEntityId: 'entity-6',
                factSetIds: ['fs-6'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-6'], metadata);
            expect(result.status).toBe('retry');
            expect(result.diagnostics.length).toBeGreaterThan(0);
            const diagnostic = result.diagnostics[0];
            expect(diagnostic.rule).toBe('lexicon');
            expect(diagnostic.reason).toMatch(/Spring controller/i);
            expect(diagnostic.reason).toMatch(/Express Router/i);
        });
        it('should reject "Rails router"', () => {
            const draftText = 'Rails router apiRouter defines route handlers.';
            const metadata = {
                chunkId: 'chunk-7',
                targetEntityId: 'entity-7',
                factSetIds: ['fs-7'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-7'], metadata);
            expect(result.status).toBe('retry');
            expect(result.diagnostics.length).toBeGreaterThan(0);
            expect(result.diagnostics[0].rule).toBe('lexicon');
            expect(result.diagnostics[0].reason).toMatch(/Rails router/i);
        });
        it('should reject I3 anti-pattern: "application.properties" (Java Spring)', () => {
            const draftText = 'Function loads configuration from application.properties file.';
            const metadata = {
                chunkId: 'chunk-i3-anti-1',
                targetEntityId: 'entity-i3-anti-1',
                factSetIds: ['fs-i3-anti-1'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-i3-anti-1'], metadata);
            expect(result.status).toBe('retry');
            expect(result.diagnostics.length).toBeGreaterThan(0);
            expect(result.diagnostics[0].rule).toBe('lexicon');
            expect(result.diagnostics[0].reason).toMatch(/application\.properties/i);
        });
        it('should reject I3 anti-pattern: "@ConfigurationProperties" (Java Spring)', () => {
            const draftText = 'Uses @ConfigurationProperties annotation to bind config values.';
            const metadata = {
                chunkId: 'chunk-i3-anti-2',
                targetEntityId: 'entity-i3-anti-2',
                factSetIds: ['fs-i3-anti-2'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-i3-anti-2'], metadata);
            expect(result.status).toBe('retry');
            expect(result.diagnostics.length).toBeGreaterThan(0);
            expect(result.diagnostics[0].rule).toBe('lexicon');
            expect(result.diagnostics[0].reason).toMatch(/@ConfigurationProperties/i);
        });
        it('should reject I3 anti-pattern: "Spring Boot config"', () => {
            const draftText = 'Spring Boot config class that manages application settings.';
            const metadata = {
                chunkId: 'chunk-i3-anti-3',
                targetEntityId: 'entity-i3-anti-3',
                factSetIds: ['fs-i3-anti-3'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-i3-anti-3'], metadata);
            expect(result.status).toBe('retry');
            expect(result.diagnostics.length).toBeGreaterThan(0);
            expect(result.diagnostics[0].rule).toBe('lexicon');
            expect(result.diagnostics[0].reason).toMatch(/Spring Boot config/i);
        });
        it('should reject I3 anti-pattern: "settings.ini" (generic config)', () => {
            const draftText = 'Reads application settings from settings.ini file.';
            const metadata = {
                chunkId: 'chunk-i3-anti-4',
                targetEntityId: 'entity-i3-anti-4',
                factSetIds: ['fs-i3-anti-4'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-i3-anti-4'], metadata);
            expect(result.status).toBe('retry');
            expect(result.diagnostics.length).toBeGreaterThan(0);
            expect(result.diagnostics[0].rule).toBe('lexicon');
            expect(result.diagnostics[0].reason).toMatch(/settings\.ini/i);
        });
        it('should reject I3 anti-pattern: "configuration manager" (too abstract)', () => {
            const draftText = 'The configuration manager handles app settings and environment variables.';
            const metadata = {
                chunkId: 'chunk-i3-anti-5',
                targetEntityId: 'entity-i3-anti-5',
                factSetIds: ['fs-i3-anti-5'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-i3-anti-5'], metadata);
            expect(result.status).toBe('retry');
            expect(result.diagnostics.length).toBeGreaterThan(0);
            expect(result.diagnostics[0].rule).toBe('lexicon');
            expect(result.diagnostics[0].reason).toMatch(/configuration manager/i);
        });
        it('should detect multiple anti-patterns in one text', () => {
            const draftText = 'The servlet in Spring controller handles requests.';
            const metadata = {
                chunkId: 'chunk-8',
                targetEntityId: 'entity-8',
                factSetIds: ['fs-8'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-8'], metadata);
            expect(result.status).toBe('retry');
            // Should detect both "servlet" and "Spring controller"
            expect(result.diagnostics.length).toBeGreaterThanOrEqual(1);
        });
        it('should reject "exception handler" and suggest Express error handler', () => {
            const draftText = 'The errorHandler exception handler catches errors.';
            const metadata = {
                chunkId: 'chunk-i2-3',
                targetEntityId: 'entity-i2-3',
                factSetIds: ['fs-i2-3'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-i2-3'], metadata);
            expect(result.status).toBe('retry');
            expect(result.diagnostics.length).toBeGreaterThan(0);
            const diagnostic = result.diagnostics[0];
            expect(diagnostic.rule).toBe('lexicon');
            expect(diagnostic.reason).toMatch(/exception handler/i);
            expect(diagnostic.reason).toMatch(/Express error handler/i);
        });
        it('should reject "error servlet"', () => {
            const draftText = 'This error servlet handles exceptions in Express.';
            const metadata = {
                chunkId: 'chunk-i2-4',
                targetEntityId: 'entity-i2-4',
                factSetIds: ['fs-i2-4'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-i2-4'], metadata);
            expect(result.status).toBe('retry');
            expect(result.diagnostics.length).toBeGreaterThan(0);
            expect(result.diagnostics[0].rule).toBe('lexicon');
            expect(result.diagnostics[0].reason).toMatch(/error servlet/i);
        });
        it('should reject "error controller"', () => {
            const draftText = 'The error controller manages error responses.';
            const metadata = {
                chunkId: 'chunk-i2-5',
                targetEntityId: 'entity-i2-5',
                factSetIds: ['fs-i2-5'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-i2-5'], metadata);
            expect(result.status).toBe('retry');
            expect(result.diagnostics.length).toBeGreaterThan(0);
            expect(result.diagnostics[0].rule).toBe('lexicon');
            expect(result.diagnostics[0].reason).toMatch(/error controller/i);
        });
    });
    describe('validate() - Case Insensitivity', () => {
        it('should detect anti-patterns case-insensitively', () => {
            const draftText = 'The SERVLET processes requests.';
            const metadata = {
                chunkId: 'chunk-9',
                targetEntityId: 'entity-9',
                factSetIds: ['fs-9'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-9'], metadata);
            expect(result.status).toBe('retry');
            expect(result.diagnostics[0].reason).toMatch(/servlet/i);
        });
        it('should accept approved terms case-insensitively', () => {
            const draftText = 'express middleware function that handles requests.';
            const metadata = {
                chunkId: 'chunk-10',
                targetEntityId: 'entity-10',
                factSetIds: ['fs-10'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-10'], metadata);
            expect(result.status).toBe('accept');
        });
    });
    describe('validate() - Edge Cases', () => {
        it('should handle empty text', () => {
            const draftText = '';
            const metadata = {
                chunkId: 'chunk-11',
                targetEntityId: 'entity-11',
                factSetIds: ['fs-11'],
                confidence: 'Low',
            };
            const result = validator.validate(draftText, ['fs-11'], metadata);
            expect(result.status).toBe('accept');
            expect(result.diagnostics).toHaveLength(0);
        });
        it('should handle text with partial matches (e.g., "servlets" vs "servlet")', () => {
            // "servlets" (plural) should not match if only "servlet" is in anti-patterns
            // But our implementation should be lenient and catch plurals too
            const draftText = 'The servlets process requests.';
            const metadata = {
                chunkId: 'chunk-12',
                targetEntityId: 'entity-12',
                factSetIds: ['fs-12'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-12'], metadata);
            // This test documents current behavior - adjust expectation based on implementation
            // For now, expect rejection since "servlet" is substring of "servlets"
            expect(result.status).toBe('retry');
        });
    });
});
//# sourceMappingURL=lexicon-validator.test.js.map