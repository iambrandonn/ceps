/**
 * Phase 4 WS-F1 Stage G: Integration Tests
 *
 * End-to-end validation tests with realistic KB data and behavior chunks.
 * Tests complete validation pipeline: identifier → numeric → enum → lexicon.
 *
 * TDD: Write ALL tests BEFORE implementation (Red phase).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { GroundingValidator } from '../grounding-validator.js';
import { KnowledgeBase } from '../../kb/knowledge-base.js';
import { createEntity } from '../../kb/models.js';
describe('GroundingValidator Integration', () => {
    let kb;
    let validator;
    beforeEach(() => {
        kb = new KnowledgeBase();
        validator = new GroundingValidator(kb);
    });
    describe('Happy Path (High Confidence)', () => {
        it('should accept well-grounded chunk with all validations passing', () => {
            // Setup: Create realistic KB with entities and facts
            const userServiceEntity = createEntity({
                id: 'class-UserService',
                kind: 'class',
                name: 'UserService',
                path: 'src/services/user-service.ts',
                exported: true,
            });
            const validateUserMethod = createEntity({
                id: 'method-validateUser',
                kind: 'method',
                name: 'validateUser',
                path: 'src/services/user-service.ts',
                exported: false,
            });
            kb.insertEntity(userServiceEntity);
            kb.insertEntity(validateUserMethod);
            const factSet = {
                id: 'fs-user-service',
                facts: [
                    { subjectId: 'class-UserService', predicate: 'is-class', object: true },
                    { subjectId: 'class-UserService', predicate: 'has-method', object: 'validateUser' },
                    { subjectId: 'class-UserService', predicate: 'http-method', object: 'POST' },
                    { subjectId: 'class-UserService', predicate: 'timeout-ms', object: 5000 },
                ],
                sources: [{ kind: 'ast', file: 'src/services/user-service.ts' }],
                evidenceScore: 90,
            };
            kb.insertFactSet(factSet);
            // Behavior chunk with all correct references
            // Simple text with only known entities
            const draftText = 'UserService has validateUser method.';
            const metadata = {
                chunkId: 'chunk-user-service',
                targetEntityId: 'class-UserService',
                factSetIds: ['fs-user-service'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-user-service'], metadata);
            expect(result.status).toBe('accept');
            expect(result.diagnostics).toHaveLength(0);
        });
    });
    describe('Unknown Entity (Retry)', () => {
        it('should reject chunk with unknown entity', () => {
            const entity = createEntity({
                id: 'class-UserService',
                kind: 'class',
                name: 'UserService',
                path: 'src/services/user-service.ts',
                exported: true,
            });
            kb.insertEntity(entity);
            const factSet = {
                id: 'fs-user-service',
                facts: [
                    { subjectId: 'class-UserService', predicate: 'is-class', object: true },
                ],
                sources: [{ kind: 'ast', file: 'src/services/user-service.ts' }],
                evidenceScore: 90,
            };
            kb.insertFactSet(factSet);
            // Chunk mentions AdminService which doesn't exist in KB
            const draftText = 'UserService calls AdminService for authorization.';
            const metadata = {
                chunkId: 'chunk-1',
                targetEntityId: 'class-UserService',
                factSetIds: ['fs-user-service'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-user-service'], metadata);
            expect(result.status).toBe('retry');
            expect(result.diagnostics.length).toBeGreaterThan(0);
            expect(result.diagnostics[0].rule).toBe('entity');
            expect(result.diagnostics[0].reason).toContain('AdminService');
        });
    });
    describe('Numeric Drift (Fallback)', () => {
        it('should fallback when numeric values exceed tolerance', () => {
            const entity = createEntity({
                id: 'const-TIMEOUT',
                kind: 'constant',
                name: 'TIMEOUT',
                path: 'src/config.ts',
                exported: true,
            });
            kb.insertEntity(entity);
            const factSet = {
                id: 'fs-config',
                facts: [
                    { subjectId: 'const-TIMEOUT', predicate: 'timeout-ms', object: 5000 },
                ],
                sources: [{ kind: 'ast', file: 'src/config.ts' }],
                evidenceScore: 90,
            };
            kb.insertFactSet(factSet);
            // Chunk claims 10 seconds (10000ms) but fact is 5000ms - 100% difference
            const draftText = 'TIMEOUT is set to 10 seconds.';
            const metadata = {
                chunkId: 'chunk-1',
                targetEntityId: 'const-TIMEOUT',
                factSetIds: ['fs-config'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-config'], metadata);
            // Should be fallback due to numeric tolerance violation
            expect(result.status).toBe('fallback');
            expect(result.diagnostics.some(d => d.rule === 'numeric')).toBe(true);
        });
    });
    describe('Pronoun Without Antecedent (Retry)', () => {
        it('should reject pronoun without antecedent', () => {
            const entity = createEntity({
                id: 'func-processData',
                kind: 'function',
                name: 'processData',
                path: 'src/processor.ts',
                exported: true,
            });
            kb.insertEntity(entity);
            const factSet = {
                id: 'fs-processor',
                facts: [
                    { subjectId: 'func-processData', predicate: 'is-function', object: true },
                ],
                sources: [{ kind: 'ast', file: 'src/processor.ts' }],
                evidenceScore: 90,
            };
            kb.insertFactSet(factSet);
            // Chunk starts with pronoun "It" without antecedent
            const draftText = 'It processes user data efficiently.';
            const metadata = {
                chunkId: 'chunk-1',
                targetEntityId: 'func-processData',
                factSetIds: ['fs-processor'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-processor'], metadata);
            expect(result.status).toBe('retry');
            expect(result.diagnostics.some(d => d.rule === 'pronoun')).toBe(true);
        });
    });
    describe('Scope Violation (Retry)', () => {
        it('should reject entity outside declared factSetIds', () => {
            // Create two entities in different factSets
            const userService = createEntity({
                id: 'class-UserService',
                kind: 'class',
                name: 'UserService',
                path: 'src/services/user-service.ts',
                exported: true,
            });
            const adminService = createEntity({
                id: 'class-AdminService',
                kind: 'class',
                name: 'AdminService',
                path: 'src/services/admin-service.ts',
                exported: true,
            });
            kb.insertEntity(userService);
            kb.insertEntity(adminService);
            const userFactSet = {
                id: 'fs-user-service',
                facts: [
                    { subjectId: 'class-UserService', predicate: 'is-class', object: true },
                ],
                sources: [{ kind: 'ast', file: 'src/services/user-service.ts' }],
                evidenceScore: 90,
            };
            const adminFactSet = {
                id: 'fs-admin-service',
                facts: [
                    { subjectId: 'class-AdminService', predicate: 'is-class', object: true },
                ],
                sources: [{ kind: 'ast', file: 'src/services/admin-service.ts' }],
                evidenceScore: 90,
            };
            kb.insertFactSet(userFactSet);
            kb.insertFactSet(adminFactSet);
            // Chunk mentions AdminService but only declares fs-user-service
            const draftText = 'UserService integrates with AdminService for admin tasks.';
            const metadata = {
                chunkId: 'chunk-1',
                targetEntityId: 'class-UserService',
                factSetIds: ['fs-user-service'], // AdminService not in scope!
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-user-service'], metadata);
            expect(result.status).toBe('retry');
            expect(result.diagnostics.some(d => d.rule === 'scope')).toBe(true);
            expect(result.diagnostics.some(d => d.reason.includes('AdminService'))).toBe(true);
        });
    });
    describe('Structural Relationships (Accept)', () => {
        it('should accept entities referenced via has-method predicate', () => {
            // This test verifies that methods referenced via has-method are in scope
            const classEntity = createEntity({
                id: 'class-AuthService',
                kind: 'class',
                name: 'AuthService',
                path: 'src/auth.ts',
                exported: true,
            });
            const methodEntity = createEntity({
                id: 'method-login',
                kind: 'method',
                name: 'login',
                path: 'src/auth.ts',
                exported: false,
            });
            kb.insertEntity(classEntity);
            kb.insertEntity(methodEntity);
            const factSet = {
                id: 'fs-auth',
                facts: [
                    { subjectId: 'class-AuthService', predicate: 'is-class', object: true },
                    { subjectId: 'class-AuthService', predicate: 'has-method', object: 'login' },
                ],
                sources: [{ kind: 'ast', file: 'src/auth.ts' }],
                evidenceScore: 90,
            };
            kb.insertFactSet(factSet);
            const draftText = 'AuthService provides a login method for authentication.';
            const metadata = {
                chunkId: 'chunk-auth',
                targetEntityId: 'class-AuthService',
                factSetIds: ['fs-auth'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-auth'], metadata);
            expect(result.status).toBe('accept');
            expect(result.diagnostics).toHaveLength(0);
        });
    });
    describe('Multiple Validation Failures', () => {
        it('should collect all validation errors', () => {
            const entity = createEntity({
                id: 'class-Service',
                kind: 'class',
                name: 'Service',
                path: 'src/service.ts',
                exported: true,
            });
            kb.insertEntity(entity);
            const factSet = {
                id: 'fs-service',
                facts: [
                    { subjectId: 'class-Service', predicate: 'is-class', object: true },
                    { subjectId: 'class-Service', predicate: 'http-method', object: 'GET' },
                ],
                sources: [{ kind: 'ast', file: 'src/service.ts' }],
                evidenceScore: 90,
            };
            kb.insertFactSet(factSet);
            // Multiple issues:
            // 1. UnknownClass (unknown entity)
            // 2. POST (wrong enum, should be GET)
            // 3. It without antecedent (pronoun)
            const draftText = 'It handles POST requests via UnknownClass.';
            const metadata = {
                chunkId: 'chunk-1',
                targetEntityId: 'class-Service',
                factSetIds: ['fs-service'],
                confidence: 'High',
            };
            const result = validator.validate(draftText, ['fs-service'], metadata);
            expect(result.status).toBe('retry');
            expect(result.diagnostics.length).toBeGreaterThan(1);
            const rules = new Set(result.diagnostics.map(d => d.rule));
            expect(rules.has('entity') || rules.has('pronoun') || rules.has('enum')).toBe(true);
        });
    });
});
//# sourceMappingURL=validator-integration.test.js.map