/**
 * Phase 4 WS-H Stage A0: Run Summary Schema Contract Tests
 *
 * Validates that:
 * 1. TypeScript interface matches JSON Schema
 * 2. Example payloads conform to schema
 * 3. Invalid payloads are rejected
 */
import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';
import { createDefaultRunSummary } from '../types/run-summary.js';
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
// Load schema from file
const schemaPath = path.join(process.cwd(), 'schemas', 'run-summary.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const validate = ajv.compile(schema);
describe('RunSummary Schema Validation', () => {
    describe('Default Summary', () => {
        it('should pass validation for default run summary', () => {
            const summary = createDefaultRunSummary();
            const valid = validate(summary);
            if (!valid) {
                console.error('Validation errors:', validate.errors);
            }
            expect(valid).toBe(true);
        });
    });
    describe('Valid Examples', () => {
        it('should pass validation for complete success scenario', () => {
            const summary = {
                gates: {
                    coverage: { status: 'pass', exported: 45, documented: 45, qids: 0 },
                    link: { status: 'pass', anchors: 123, broken: 0 },
                    grounding: { status: 'pass', chunks: 287, validated: 245, fallback: 42 },
                    determinism: { status: 'pass', reruns: 2, diffs: 0 },
                    confidence: { status: 'pass', openQuestions: 5 },
                    monorepo: { status: 'pass', hasRootSpec: true, packagesLinked: 3 }
                },
                validation: {
                    cost: { status: 'pass', budget: 30000, used: 28450, remaining: 1550 },
                    adversarial: { status: 'pass', total: 23, rejected: 23, pass: true },
                    testCoverage: { status: 'pass', coverage: 85.3, threshold: 80, pass: true },
                    readability: { status: 'skip' }
                },
                tokens: {
                    total: 28450,
                    budget: 30000,
                    providers: { anthropic: 28450 }
                },
                warnings: [],
                exitCode: 0,
                timestamp: new Date().toISOString(),
                version: 'phase4-ws-h'
            };
            const valid = validate(summary);
            if (!valid) {
                console.error('Validation errors:', validate.errors);
            }
            expect(valid).toBe(true);
        });
        it('should pass validation for gate failure scenario', () => {
            const summary = {
                gates: {
                    coverage: {
                        status: 'fail',
                        exported: 50,
                        documented: 47,
                        qids: 0,
                        details: { missingEntities: ['func-validateUser', 'class-UserService'] }
                    },
                    link: { status: 'pass', anchors: 100, broken: 0 },
                    grounding: { status: 'pass', chunks: 200, validated: 180, fallback: 20 },
                    determinism: { status: 'skip' },
                    confidence: { status: 'pass', openQuestions: 3 },
                    monorepo: { status: 'skip', hasRootSpec: true, packagesLinked: 0 }
                },
                validation: {
                    cost: { status: 'pass', budget: 10000, used: 8500, remaining: 1500 },
                    adversarial: { status: 'skip', total: 0, rejected: 0, pass: true },
                    testCoverage: { status: 'skip', coverage: 0, threshold: 80, pass: false },
                    readability: { status: 'skip' }
                },
                tokens: {
                    total: 8500,
                    budget: 10000,
                    providers: { anthropic: 6000, openai: 2500 }
                },
                warnings: ['Coverage gate failed: 3 entities missing documentation'],
                exitCode: 2,
                timestamp: new Date().toISOString(),
                version: 'phase4-ws-h'
            };
            const valid = validate(summary);
            if (!valid) {
                console.error('Validation errors:', validate.errors);
            }
            expect(valid).toBe(true);
        });
        it('should pass validation with broken links details', () => {
            const summary = {
                gates: {
                    coverage: { status: 'pass', exported: 10, documented: 10, qids: 0 },
                    link: {
                        status: 'fail',
                        anchors: 50,
                        broken: 3,
                        brokenLinks: [
                            { sourceFile: 'spec.md', lineNumber: 42, targetAnchor: '#user-service' },
                            { sourceFile: 'src/auth/spec.md', lineNumber: 15, targetAnchor: '#validate-token' }
                        ]
                    },
                    grounding: { status: 'pass', chunks: 100, validated: 100, fallback: 0 },
                    determinism: { status: 'skip' },
                    confidence: { status: 'pass', openQuestions: 0 },
                    monorepo: { status: 'skip', hasRootSpec: true, packagesLinked: 0 }
                },
                validation: {
                    cost: { status: 'skip', budget: 0, used: 0, remaining: 0 },
                    adversarial: { status: 'skip', total: 0, rejected: 0, pass: true },
                    testCoverage: { status: 'skip', coverage: 0, threshold: 80, pass: false },
                    readability: { status: 'skip' }
                },
                tokens: { total: 0, budget: 0, providers: {} },
                warnings: ['Link validation failed: 3 broken links'],
                exitCode: 2,
                timestamp: new Date().toISOString(),
                version: 'phase4-ws-h'
            };
            const valid = validate(summary);
            if (!valid) {
                console.error('Validation errors:', validate.errors);
            }
            expect(valid).toBe(true);
        });
        it('should pass validation with budget exhaustion warning', () => {
            const summary = {
                gates: {
                    coverage: { status: 'pass', exported: 20, documented: 20, qids: 2 },
                    link: { status: 'pass', anchors: 80, broken: 0 },
                    grounding: {
                        status: 'pass',
                        chunks: 150,
                        validated: 100,
                        fallback: 50,
                        missingFactSetIds: 0
                    },
                    determinism: { status: 'skip' },
                    confidence: { status: 'pass', openQuestions: 2 },
                    monorepo: { status: 'skip', hasRootSpec: true, packagesLinked: 0 }
                },
                validation: {
                    cost: {
                        status: 'pass',
                        budget: 10000,
                        used: 10000,
                        remaining: 0,
                        perFixture: {
                            'express-api': 3500,
                            'react-app': 4500,
                            'monorepo-small': 2000
                        }
                    },
                    adversarial: { status: 'pass', total: 20, rejected: 20, pass: true },
                    testCoverage: { status: 'pass', coverage: 82, threshold: 80, pass: true },
                    readability: { status: 'skip' }
                },
                tokens: {
                    total: 10000,
                    budget: 10000,
                    providers: { anthropic: 10000 }
                },
                warnings: ['LLM budget exhausted: 50 chunks fell back to template'],
                exitCode: 0,
                timestamp: new Date().toISOString(),
                version: 'phase4-ws-h'
            };
            const valid = validate(summary);
            if (!valid) {
                console.error('Validation errors:', validate.errors);
            }
            expect(valid).toBe(true);
        });
    });
    describe('Invalid Examples', () => {
        it('should reject summary with missing required field (gates)', () => {
            const summary = {
                validation: {
                    cost: { status: 'skip', budget: 0, used: 0, remaining: 0 },
                    adversarial: { status: 'skip', total: 0, rejected: 0, pass: true },
                    testCoverage: { status: 'skip', coverage: 0, threshold: 80, pass: false },
                    readability: { status: 'skip' }
                },
                tokens: { total: 0, budget: 0, providers: {} },
                warnings: [],
                exitCode: 0,
                timestamp: new Date().toISOString(),
                version: 'phase4-ws-h'
            };
            const valid = validate(summary);
            expect(valid).toBe(false);
            expect(validate.errors).toBeDefined();
            expect(validate.errors?.[0]?.message).toContain("must have required property 'gates'");
        });
        it('should reject summary with invalid exit code', () => {
            const summary = {
                ...createDefaultRunSummary(),
                exitCode: 5 // Invalid: must be 0, 1, 2, or 3
            };
            const valid = validate(summary);
            expect(valid).toBe(false);
            expect(validate.errors).toBeDefined();
        });
        it('should reject summary with invalid gate status', () => {
            const summary = {
                ...createDefaultRunSummary(),
                gates: {
                    ...createDefaultRunSummary().gates,
                    coverage: {
                        status: 'invalid',
                        exported: 0,
                        documented: 0,
                        qids: 0
                    }
                }
            };
            const valid = validate(summary);
            expect(valid).toBe(false);
        });
        it('should reject summary with negative counts', () => {
            const summary = {
                ...createDefaultRunSummary(),
                gates: {
                    ...createDefaultRunSummary().gates,
                    coverage: {
                        status: 'pass',
                        exported: -5, // Invalid: must be >= 0
                        documented: 0,
                        qids: 0
                    }
                }
            };
            const valid = validate(summary);
            expect(valid).toBe(false);
        });
        it('should reject summary with invalid timestamp format', () => {
            const summary = {
                ...createDefaultRunSummary(),
                timestamp: 'not-a-valid-iso-date'
            };
            const valid = validate(summary);
            expect(valid).toBe(false);
        });
    });
});
//# sourceMappingURL=run-summary-schema.test.js.map