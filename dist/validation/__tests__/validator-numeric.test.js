/**
 * Phase 4 WS-F1 Stage C: Numeric & Enum Validation Tests
 *
 * Tests for validating numeric claims per CTS-02 §4.2:
 * - Unit conversion (ms ↔ s, B ↔ KB, etc.)
 * - **Strict equality** after normalization
 * - Allow rounding to **nearest integer** for human-friendly units
 * - Enum validation (exact match required)
 *
 * TDD: Write ALL tests BEFORE implementation (Red phase).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { NumericValidator } from '../numeric-validator.js';
import { KnowledgeBase } from '../../kb/knowledge-base.js';
import { createEntity } from '../../kb/models.js';
describe('NumericValidator', () => {
    let kb;
    let validator;
    beforeEach(() => {
        kb = new KnowledgeBase();
        validator = new NumericValidator(kb);
    });
    describe('Exact Numeric Match', () => {
        it('should accept exact match with same unit', () => {
            // Setup: Entity with delay fact
            const entity = createEntity({
                id: 'func-delayHandler',
                kind: 'function',
                name: 'delayHandler',
                path: 'src/handlers.ts',
                exported: true,
            });
            kb.insertEntity(entity);
            const factSet = {
                id: 'fs-handlers',
                facts: [
                    { subjectId: 'func-delayHandler', predicate: 'delay-ms', object: 5000 },
                ],
                sources: [{ kind: 'ast', file: 'src/handlers.ts' }],
                evidenceScore: 90,
            };
            kb.insertFactSet(factSet);
            // Text mentions "delay 5000ms"
            const result = validator.validate('The handler has a delay of 5000ms.', ['fs-handlers']);
            expect(result.valid).toBe(true);
            expect(result.diagnostics).toHaveLength(0);
        });
        it('should accept exact match without unit mention', () => {
            const entity = createEntity({
                id: 'func-processItems',
                kind: 'function',
                name: 'processItems',
                path: 'src/processor.ts',
                exported: true,
            });
            kb.insertEntity(entity);
            const factSet = {
                id: 'fs-processor',
                facts: [
                    { subjectId: 'func-processItems', predicate: 'batch-size', object: 100 },
                ],
                sources: [{ kind: 'ast', file: 'src/processor.ts' }],
                evidenceScore: 90,
            };
            kb.insertFactSet(factSet);
            const result = validator.validate('Processes 100 items at a time.', ['fs-processor']);
            expect(result.valid).toBe(true);
        });
    });
    describe('Unit Conversion', () => {
        it('should accept unit conversion seconds to milliseconds', () => {
            const entity = createEntity({
                id: 'func-timeout',
                kind: 'function',
                name: 'timeout',
                path: 'src/api.ts',
                exported: true,
            });
            kb.insertEntity(entity);
            const factSet = {
                id: 'fs-api',
                facts: [
                    { subjectId: 'func-timeout', predicate: 'timeout-ms', object: '5000 ms' },
                ],
                sources: [{ kind: 'ast', file: 'src/api.ts' }],
                evidenceScore: 90,
            };
            kb.insertFactSet(factSet);
            // Text says "5 seconds" but fact is 5000ms
            const result = validator.validate('The timeout is 5 seconds.', ['fs-api']);
            expect(result.valid).toBe(true);
            expect(result.diagnostics).toHaveLength(0);
        });
        it('should accept reverse conversion milliseconds to seconds', () => {
            const entity = createEntity({
                id: 'func-delay',
                kind: 'function',
                name: 'delay',
                path: 'src/utils.ts',
                exported: true,
            });
            kb.insertEntity(entity);
            const factSet = {
                id: 'fs-utils',
                facts: [
                    { subjectId: 'func-delay', predicate: 'delay-ms', object: '3 s' },
                ],
                sources: [{ kind: 'ast', file: 'src/utils.ts' }],
                evidenceScore: 90,
            };
            kb.insertFactSet(factSet);
            // Text says "3000ms" but fact is 3s
            const result = validator.validate('Delays for 3000ms.', ['fs-utils']);
            expect(result.valid).toBe(true);
        });
        it('should accept bytes to kilobytes conversion', () => {
            const entity = createEntity({
                id: 'const-MAX_SIZE',
                kind: 'constant',
                name: 'MAX_SIZE',
                path: 'src/config.ts',
                exported: true,
            });
            kb.insertEntity(entity);
            const factSet = {
                id: 'fs-config',
                facts: [
                    { subjectId: 'const-MAX_SIZE', predicate: 'value', object: '102400 B' },
                ],
                sources: [{ kind: 'ast', file: 'src/config.ts' }],
                evidenceScore: 90,
            };
            kb.insertFactSet(factSet);
            // Text says "100 KB" but fact is 102400 B
            const result = validator.validate('Maximum size is 100 KB.', ['fs-config']);
            expect(result.valid).toBe(true);
        });
    });
    describe('Nearest Integer Rounding (CTS-02)', () => {
        it('should accept nearest-integer rounding for human-friendly units', () => {
            const entity = createEntity({
                id: 'func-poll',
                kind: 'function',
                name: 'poll',
                path: 'src/poller.ts',
                exported: true,
            });
            kb.insertEntity(entity);
            const factSet = {
                id: 'fs-poller',
                facts: [
                    { subjectId: 'func-poll', predicate: 'interval-ms', object: 5123 },
                ],
                sources: [{ kind: 'ast', file: 'src/poller.ts' }],
                evidenceScore: 90,
            };
            kb.insertFactSet(factSet);
            // Text says "5 seconds" vs fact 5123ms → 5.123s rounds to 5 ✅
            const result = validator.validate('Polls every 5 seconds.', ['fs-poller']);
            expect(result.valid).toBe(true);
            expect(result.diagnostics).toHaveLength(0);
        });
        it('should reject when rounded value does not match text', () => {
            const entity = createEntity({
                id: 'func-retry',
                kind: 'function',
                name: 'retry',
                path: 'src/retry.ts',
                exported: true,
            });
            kb.insertEntity(entity);
            const factSet = {
                id: 'fs-retry',
                facts: [
                    { subjectId: 'func-retry', predicate: 'interval-ms', object: 5123 },
                ],
                sources: [{ kind: 'ast', file: 'src/retry.ts' }],
                evidenceScore: 90,
            };
            kb.insertFactSet(factSet);
            // Text says "6 seconds" vs fact 5123ms → 5.123s rounds to 5, not 6 ❌
            const result = validator.validate('Retries every 6 seconds.', ['fs-retry']);
            expect(result.valid).toBe(false);
            expect(result.diagnostics).toHaveLength(1);
            expect(result.diagnostics[0].rule).toBe('numeric');
            expect(result.diagnostics[0].reason).toContain('does not match');
        });
    });
    describe('Percentage Conversion', () => {
        it('should accept percentage conversion', () => {
            const entity = createEntity({
                id: 'const-THRESHOLD',
                kind: 'constant',
                name: 'THRESHOLD',
                path: 'src/constants.ts',
                exported: true,
            });
            kb.insertEntity(entity);
            const factSet = {
                id: 'fs-constants',
                facts: [
                    { subjectId: 'const-THRESHOLD', predicate: 'value', object: 0.5 },
                ],
                sources: [{ kind: 'ast', file: 'src/constants.ts' }],
                evidenceScore: 90,
            };
            kb.insertFactSet(factSet);
            // Text says "50%" but fact is 0.5
            const result = validator.validate('Threshold is 50%.', ['fs-constants']);
            expect(result.valid).toBe(true);
        });
    });
    describe('Unknown Units', () => {
        it('should reject unknown unit with diagnostic', () => {
            const entity = createEntity({
                id: 'func-distance',
                kind: 'function',
                name: 'distance',
                path: 'src/calc.ts',
                exported: true,
            });
            kb.insertEntity(entity);
            const factSet = {
                id: 'fs-calc',
                facts: [
                    { subjectId: 'func-distance', predicate: 'max-distance', object: 100 },
                ],
                sources: [{ kind: 'ast', file: 'src/calc.ts' }],
                evidenceScore: 90,
            };
            kb.insertFactSet(factSet);
            // Text uses "parsecs" which is not a supported unit
            const result = validator.validate('Maximum distance is 100 parsecs.', ['fs-calc']);
            expect(result.valid).toBe(false);
            expect(result.diagnostics).toHaveLength(1);
            expect(result.diagnostics[0].rule).toBe('numeric');
            expect(result.diagnostics[0].reason).toContain('unknown unit');
        });
    });
    describe('Enum Validation', () => {
        it('should accept valid HTTP method', () => {
            const entity = createEntity({
                id: 'func-handleRequest',
                kind: 'function',
                name: 'handleRequest',
                path: 'src/routes.ts',
                exported: true,
            });
            kb.insertEntity(entity);
            const factSet = {
                id: 'fs-routes',
                facts: [
                    { subjectId: 'func-handleRequest', predicate: 'http-method', object: 'GET' },
                ],
                sources: [{ kind: 'ast', file: 'src/routes.ts' }],
                evidenceScore: 90,
            };
            kb.insertFactSet(factSet);
            const result = validator.validate('Handles GET requests.', ['fs-routes']);
            expect(result.valid).toBe(true);
        });
        it('should reject invalid HTTP method', () => {
            const entity = createEntity({
                id: 'func-fetch',
                kind: 'function',
                name: 'fetch',
                path: 'src/api.ts',
                exported: true,
            });
            kb.insertEntity(entity);
            const factSet = {
                id: 'fs-api',
                facts: [
                    { subjectId: 'func-fetch', predicate: 'http-method', object: 'GET' },
                ],
                sources: [{ kind: 'ast', file: 'src/api.ts' }],
                evidenceScore: 90,
            };
            kb.insertFactSet(factSet);
            // "FETCH" is not a valid HTTP method
            const result = validator.validate('Uses FETCH method.', ['fs-api']);
            expect(result.valid).toBe(false);
            expect(result.diagnostics[0].rule).toBe('enum');
            expect(result.diagnostics[0].reason).toContain('FETCH');
        });
        it('should enforce case sensitivity for enums', () => {
            const entity = createEntity({
                id: 'func-api',
                kind: 'function',
                name: 'api',
                path: 'src/server.ts',
                exported: true,
            });
            kb.insertEntity(entity);
            const factSet = {
                id: 'fs-server',
                facts: [
                    { subjectId: 'func-api', predicate: 'http-method', object: 'GET' },
                ],
                sources: [{ kind: 'ast', file: 'src/server.ts' }],
                evidenceScore: 90,
            };
            kb.insertFactSet(factSet);
            // "get" (lowercase) should not match "GET"
            const result = validator.validate('Accepts get requests.', ['fs-server']);
            expect(result.valid).toBe(false);
            expect(result.diagnostics[0].rule).toBe('enum');
        });
        it('should skip enum validation if no registry entry exists', () => {
            const entity = createEntity({
                id: 'const-STATUS',
                kind: 'constant',
                name: 'STATUS',
                path: 'src/status.ts',
                exported: true,
            });
            kb.insertEntity(entity);
            const factSet = {
                id: 'fs-status',
                facts: [
                    // unknown-enum-predicate has no registry entry
                    { subjectId: 'const-STATUS', predicate: 'unknown-enum-predicate', object: 'CUSTOM_VALUE' },
                ],
                sources: [{ kind: 'ast', file: 'src/status.ts' }],
                evidenceScore: 90,
            };
            kb.insertFactSet(factSet);
            // Should not fail - just skip validation for unknown predicates
            const result = validator.validate('Status is CUSTOM_VALUE.', ['fs-status']);
            expect(result.valid).toBe(true);
        });
    });
});
//# sourceMappingURL=validator-numeric.test.js.map