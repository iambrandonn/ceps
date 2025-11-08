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
    describe('I4 Mongoose ODM terms loading', () => {
        it('should load Mongoose schema & model terms', () => {
            const rules = validator.getRules();
            const mongooseRule = rules.get('mongoose');
            expect(mongooseRule).toBeDefined();
            expect(mongooseRule.approvedTerms.has('Mongoose schema')).toBe(true);
            expect(mongooseRule.approvedTerms.has('Mongoose model')).toBe(true);
            expect(mongooseRule.approvedTerms.has('schema')).toBe(true);
            expect(mongooseRule.approvedTerms.has('collection')).toBe(true);
        });
        it('should load Mongoose field & validation terms', () => {
            const rules = validator.getRules();
            const mongooseRule = rules.get('mongoose');
            expect(mongooseRule.approvedTerms.has('fields')).toBe(true);
            expect(mongooseRule.approvedTerms.has('required')).toBe(true);
            expect(mongooseRule.approvedTerms.has('reference')).toBe(true);
            expect(mongooseRule.approvedTerms.has('ref')).toBe(true);
            expect(mongooseRule.approvedTerms.has('ObjectId')).toBe(true);
        });
        it('should load Mongoose query operation terms', () => {
            const rules = validator.getRules();
            const mongooseRule = rules.get('mongoose');
            expect(mongooseRule.approvedTerms.has('Mongoose query')).toBe(true);
            expect(mongooseRule.approvedTerms.has('read query')).toBe(true);
            expect(mongooseRule.approvedTerms.has('write query')).toBe(true);
            expect(mongooseRule.approvedTerms.has('find')).toBe(true);
            expect(mongooseRule.approvedTerms.has('findOne')).toBe(true);
            expect(mongooseRule.approvedTerms.has('findById')).toBe(true);
            expect(mongooseRule.approvedTerms.has('create')).toBe(true);
            expect(mongooseRule.approvedTerms.has('updateOne')).toBe(true);
            expect(mongooseRule.approvedTerms.has('deleteOne')).toBe(true);
        });
        it('should load Mongoose integration terms', () => {
            const rules = validator.getRules();
            const mongooseRule = rules.get('mongoose');
            expect(mongooseRule.approvedTerms.has('model not resolved')).toBe(true);
            expect(mongooseRule.approvedTerms.has('Supports fields')).toBe(true);
        });
        it('should load Mongoose anti-patterns', () => {
            const rules = validator.getRules();
            const mongooseRule = rules.get('mongoose');
            expect(mongooseRule.antiPatterns.has('Sequelize')).toBe(true);
            expect(mongooseRule.antiPatterns.get('Sequelize')).toContain('Mongoose');
            expect(mongooseRule.antiPatterns.has('TypeORM')).toBe(true);
            expect(mongooseRule.antiPatterns.has('Prisma')).toBe(true);
            expect(mongooseRule.antiPatterns.has('SQL table')).toBe(true);
            expect(mongooseRule.antiPatterns.has('repository')).toBe(true);
            expect(mongooseRule.antiPatterns.has('DAO')).toBe(true);
            expect(mongooseRule.antiPatterns.has('ORM')).toBe(true);
            expect(mongooseRule.antiPatterns.has('SQL query')).toBe(true);
            expect(mongooseRule.antiPatterns.has('JOIN')).toBe(true);
        });
    });
    describe('validate() - I4 Mongoose patterns', () => {
        it('should accept Mongoose schema terminology', () => {
            const draftText = 'Mongoose schema userSchema defines fields: name, email (required), posts → Post.';
            const metadata = {
                chunkId: 'chunk-mongoose-1',
                targetEntityId: 'entity-mongoose-1',
                factSetIds: ['fs-mongoose-1'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-mongoose-1'], metadata);
            expect(result.status).toBe('accept');
            expect(result.diagnostics).toHaveLength(0);
        });
        it('should accept Mongoose model terminology', () => {
            const draftText = "Mongoose model User for collection 'User' using schema userSchema. Supports fields: name, email (required).";
            const metadata = {
                chunkId: 'chunk-mongoose-2',
                targetEntityId: 'entity-mongoose-2',
                factSetIds: ['fs-mongoose-2'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-mongoose-2'], metadata);
            expect(result.status).toBe('accept');
            expect(result.diagnostics).toHaveLength(0);
        });
        it('should accept Mongoose query terminology', () => {
            const draftText = 'Performs Mongoose read query (find): User. Performs Mongoose write query (updateOne): Post.';
            const metadata = {
                chunkId: 'chunk-mongoose-3',
                targetEntityId: 'entity-mongoose-3',
                factSetIds: ['fs-mongoose-3'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-mongoose-3'], metadata);
            if (result.status !== 'accept') {
                console.log('\n⚠️ Mongoose query validation FAILED');
                console.log('Text:', draftText);
                console.log('Status:', result.status);
                console.log('Diagnostics:', JSON.stringify(result.diagnostics, null, 2));
            }
            expect(result.status).toBe('accept');
            expect(result.diagnostics).toHaveLength(0);
        });
        it('should reject "Sequelize" (different ORM)', () => {
            const draftText = 'Sequelize model User defines table schema.';
            const metadata = {
                chunkId: 'chunk-mongoose-anti-1',
                targetEntityId: 'entity-mongoose-anti-1',
                factSetIds: ['fs-mongoose-anti-1'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-mongoose-anti-1'], metadata);
            expect(result.status).toBe('retry');
            expect(result.diagnostics[0].reason).toMatch(/Sequelize/i);
        });
        it('should reject "TypeORM" (different ORM)', () => {
            const draftText = 'TypeORM entity User with decorators.';
            const metadata = {
                chunkId: 'chunk-mongoose-anti-2',
                targetEntityId: 'entity-mongoose-anti-2',
                factSetIds: ['fs-mongoose-anti-2'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-mongoose-anti-2'], metadata);
            expect(result.status).toBe('retry');
            expect(result.diagnostics[0].reason).toMatch(/TypeORM/i);
        });
        it('should reject "Prisma" (different ORM)', () => {
            const draftText = 'Prisma client for database access.';
            const metadata = {
                chunkId: 'chunk-mongoose-anti-3',
                targetEntityId: 'entity-mongoose-anti-3',
                factSetIds: ['fs-mongoose-anti-3'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-mongoose-anti-3'], metadata);
            expect(result.status).toBe('retry');
            expect(result.diagnostics[0].reason).toMatch(/Prisma/i);
        });
        it('should reject "ORM" without "Mongoose ODM" qualification', () => {
            const draftText = 'ORM model User for database access.';
            const metadata = {
                chunkId: 'chunk-mongoose-anti-4',
                targetEntityId: 'entity-mongoose-anti-4',
                factSetIds: ['fs-mongoose-anti-4'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-mongoose-anti-4'], metadata);
            expect(result.status).toBe('retry');
            expect(result.diagnostics[0].reason).toMatch(/ORM/i);
            expect(result.diagnostics[0].reason).toContain('Mongoose ODM');
        });
        it('should accept "Mongoose ODM" (qualified form)', () => {
            const draftText = 'Mongoose ODM (Object Document Mapper) for MongoDB database access.';
            const metadata = {
                chunkId: 'chunk-mongoose-4',
                targetEntityId: 'entity-mongoose-4',
                factSetIds: ['fs-mongoose-4'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-mongoose-4'], metadata);
            expect(result.status).toBe('accept');
            expect(result.diagnostics).toHaveLength(0);
        });
        it('should reject "SQL table" (relational terminology)', () => {
            const draftText = 'SQL table users with columns.';
            const metadata = {
                chunkId: 'chunk-mongoose-anti-5',
                targetEntityId: 'entity-mongoose-anti-5',
                factSetIds: ['fs-mongoose-anti-5'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-mongoose-anti-5'], metadata);
            expect(result.status).toBe('retry');
            expect(result.diagnostics[0].reason).toMatch(/SQL table/i);
        });
        it('should reject "repository" pattern (not Mongoose idiom)', () => {
            const draftText = 'User repository handles database operations.';
            const metadata = {
                chunkId: 'chunk-mongoose-anti-6',
                targetEntityId: 'entity-mongoose-anti-6',
                factSetIds: ['fs-mongoose-anti-6'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-mongoose-anti-6'], metadata);
            expect(result.status).toBe('retry');
            expect(result.diagnostics[0].reason).toMatch(/repository/i);
        });
        it('should reject "DAO" (Data Access Object)', () => {
            const draftText = 'UserDAO provides data access methods.';
            const metadata = {
                chunkId: 'chunk-mongoose-anti-7',
                targetEntityId: 'entity-mongoose-anti-7',
                factSetIds: ['fs-mongoose-anti-7'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-mongoose-anti-7'], metadata);
            expect(result.status).toBe('retry');
            expect(result.diagnostics[0].reason).toMatch(/DAO/i);
        });
        it('should reject "SQL query" (relational terminology)', () => {
            const draftText = 'Executes SQL query to fetch users.';
            const metadata = {
                chunkId: 'chunk-mongoose-anti-8',
                targetEntityId: 'entity-mongoose-anti-8',
                factSetIds: ['fs-mongoose-anti-8'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-mongoose-anti-8'], metadata);
            expect(result.status).toBe('retry');
            expect(result.diagnostics[0].reason).toMatch(/SQL query/i);
        });
        it('should reject "JOIN" (SQL operation)', () => {
            const draftText = 'Performs JOIN operation between tables.';
            const metadata = {
                chunkId: 'chunk-mongoose-anti-9',
                targetEntityId: 'entity-mongoose-anti-9',
                factSetIds: ['fs-mongoose-anti-9'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-mongoose-anti-9'], metadata);
            expect(result.status).toBe('retry');
            expect(result.diagnostics[0].reason).toMatch(/JOIN/i);
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
            // "servlets" (plural) should NOT match "servlet" anti-pattern with word-boundary matching
            // This ensures precision and avoids false positives (e.g., "ORM" not matching "Performs")
            const draftText = 'The servlets process requests.';
            const metadata = {
                chunkId: 'chunk-12',
                targetEntityId: 'entity-12',
                factSetIds: ['fs-12'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-12'], metadata);
            // Word-boundary matching: "servlets" should NOT match "servlet" anti-pattern
            expect(result.status).toBe('accept');
        });
    });
});
//# sourceMappingURL=lexicon-validator.test.js.map