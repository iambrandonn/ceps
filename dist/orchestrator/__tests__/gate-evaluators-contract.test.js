/**
 * Phase 4 WS-H Stage A: Gate Evaluator Contract Tests
 *
 * Validates that mock gate evaluators:
 * 1. Conform to GateEvaluator interface
 * 2. Return results matching gate result schemas
 * 3. Support configurable next-result behavior
 * 4. Handle default evaluation logic correctly
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MockCoverageGateEvaluator, MockLinkGateEvaluator, MockGroundingGateEvaluator, MockDeterminismGateEvaluator, MockConfidenceGateEvaluator, MockMonorepoGateEvaluator, MockCostGateEvaluator, MockAdversarialGateEvaluator, MockTestCoverageGateEvaluator, MockReadabilityGateEvaluator } from '../mocks/mock-gate-evaluators.js';
describe('Gate Evaluator Contracts', () => {
    describe('MockCoverageGateEvaluator', () => {
        let evaluator;
        beforeEach(() => {
            evaluator = new MockCoverageGateEvaluator();
        });
        it('should pass when all exported entities documented or have QIDs', () => {
            const result = evaluator.evaluate({
                exportedEntityIds: ['entity-1', 'entity-2', 'entity-3'],
                entitiesWithChunks: ['entity-1', 'entity-2'],
                entitiesWithQIDs: ['entity-3']
            });
            expect(result.status).toBe('pass');
            expect(result.exported).toBe(3);
            expect(result.documented).toBe(3);
            expect(result.qids).toBe(1);
        });
        it('should fail when some exported entities missing documentation', () => {
            const result = evaluator.evaluate({
                exportedEntityIds: ['entity-1', 'entity-2', 'entity-3'],
                entitiesWithChunks: ['entity-1'],
                entitiesWithQIDs: []
            });
            expect(result.status).toBe('fail');
            expect(result.exported).toBe(3);
            expect(result.documented).toBe(1);
            expect(result.qids).toBe(0);
        });
        it('should support configurable next result', () => {
            evaluator.setNextResult({
                status: 'fail',
                exported: 10,
                documented: 8,
                qids: 2
            });
            const result = evaluator.evaluate({
                exportedEntityIds: ['entity-1'],
                entitiesWithChunks: ['entity-1'],
                entitiesWithQIDs: []
            });
            expect(result.status).toBe('fail');
            expect(result.exported).toBe(10);
        });
    });
    describe('MockLinkGateEvaluator', () => {
        let evaluator;
        beforeEach(() => {
            evaluator = new MockLinkGateEvaluator();
        });
        it('should pass when no broken links', () => {
            const result = evaluator.evaluate({
                totalAnchors: 50,
                brokenLinks: []
            });
            expect(result.status).toBe('pass');
            expect(result.anchors).toBe(50);
            expect(result.broken).toBe(0);
            expect(result.brokenLinks).toBeUndefined();
        });
        it('should fail when broken links present', () => {
            const result = evaluator.evaluate({
                totalAnchors: 50,
                brokenLinks: [
                    { sourceFile: 'spec.md', lineNumber: 42, targetAnchor: '#missing' }
                ]
            });
            expect(result.status).toBe('fail');
            expect(result.broken).toBe(1);
            expect(result.brokenLinks).toHaveLength(1);
            expect(result.brokenLinks?.[0].targetAnchor).toBe('#missing');
        });
    });
    describe('MockGroundingGateEvaluator', () => {
        let evaluator;
        beforeEach(() => {
            evaluator = new MockGroundingGateEvaluator();
        });
        it('should pass when all chunks have factSetIds', () => {
            const result = evaluator.evaluate({
                totalChunks: 100,
                validatedChunks: 80,
                fallbackChunks: 20,
                chunksWithMissingFactSetIds: [],
                diagnostics: []
            });
            expect(result.status).toBe('pass');
            expect(result.chunks).toBe(100);
            expect(result.validated).toBe(80);
            expect(result.fallback).toBe(20);
            expect(result.missingFactSetIds).toBeUndefined();
        });
        it('should fail when chunks missing factSetIds', () => {
            const result = evaluator.evaluate({
                totalChunks: 100,
                validatedChunks: 80,
                fallbackChunks: 18,
                chunksWithMissingFactSetIds: ['chunk-99', 'chunk-100'],
                diagnostics: []
            });
            expect(result.status).toBe('fail');
            expect(result.missingFactSetIds).toBe(2);
        });
    });
    describe('MockDeterminismGateEvaluator', () => {
        let evaluator;
        beforeEach(() => {
            evaluator = new MockDeterminismGateEvaluator();
        });
        it('should skip when deterministic mode not enabled', () => {
            const result = evaluator.evaluate({
                enabled: false,
                reruns: 0,
                diffs: 0
            });
            expect(result.status).toBe('skip');
        });
        it('should pass when enabled and no diffs', () => {
            const result = evaluator.evaluate({
                enabled: true,
                reruns: 2,
                diffs: 0
            });
            expect(result.status).toBe('pass');
            expect(result.reruns).toBe(2);
            expect(result.diffs).toBe(0);
        });
        it('should fail when enabled and diffs present', () => {
            const result = evaluator.evaluate({
                enabled: true,
                reruns: 2,
                diffs: 3
            });
            expect(result.status).toBe('fail');
            expect(result.diffs).toBe(3);
        });
    });
    describe('MockConfidenceGateEvaluator', () => {
        let evaluator;
        beforeEach(() => {
            evaluator = new MockConfidenceGateEvaluator();
        });
        it('should pass with Open Questions present', () => {
            const result = evaluator.evaluate({
                openQuestions: 5,
                invalidConfidenceItems: []
            });
            expect(result.status).toBe('pass');
            expect(result.openQuestions).toBe(5);
            expect(result.invalid).toBeUndefined();
        });
        it('should fail when invalid confidence items present', () => {
            const result = evaluator.evaluate({
                openQuestions: 2,
                invalidConfidenceItems: ['entity-1', 'entity-2']
            });
            expect(result.status).toBe('fail');
            expect(result.invalid).toBe(2);
        });
    });
    describe('MockMonorepoGateEvaluator', () => {
        let evaluator;
        beforeEach(() => {
            evaluator = new MockMonorepoGateEvaluator();
        });
        it('should skip when no packages', () => {
            const result = evaluator.evaluate({
                hasRootSpec: true,
                packagesLinked: 0,
                brokenPackageLinks: 0
            });
            expect(result.status).toBe('skip');
        });
        it('should pass when root spec exists and no broken links', () => {
            const result = evaluator.evaluate({
                hasRootSpec: true,
                packagesLinked: 3,
                brokenPackageLinks: 0
            });
            expect(result.status).toBe('pass');
            expect(result.packagesLinked).toBe(3);
        });
        it('should fail when broken package links present', () => {
            const result = evaluator.evaluate({
                hasRootSpec: true,
                packagesLinked: 3,
                brokenPackageLinks: 1
            });
            expect(result.status).toBe('fail');
            expect(result.brokenPackageLinks).toBe(1);
        });
    });
    describe('MockCostGateEvaluator', () => {
        let evaluator;
        beforeEach(() => {
            evaluator = new MockCostGateEvaluator();
        });
        it('should pass when under budget', () => {
            const result = evaluator.evaluate({
                totalTokens: 8500,
                budget: 10000,
                perFixture: { 'express-api': 3000, 'react-app': 5500 }
            });
            expect(result.status).toBe('pass');
            expect(result.used).toBe(8500);
            expect(result.remaining).toBe(1500);
        });
        it('should fail when over budget (validation warning)', () => {
            const result = evaluator.evaluate({
                totalTokens: 12000,
                budget: 10000
            });
            expect(result.status).toBe('fail');
            expect(result.remaining).toBe(-2000);
        });
    });
    describe('MockAdversarialGateEvaluator', () => {
        let evaluator;
        beforeEach(() => {
            evaluator = new MockAdversarialGateEvaluator();
        });
        it('should skip when no adversarial tests', () => {
            const result = evaluator.evaluate({
                total: 0,
                rejected: 0
            });
            expect(result.status).toBe('skip');
            expect(result.pass).toBe(true);
        });
        it('should pass when all adversarial cases rejected', () => {
            const result = evaluator.evaluate({
                total: 20,
                rejected: 20
            });
            expect(result.status).toBe('pass');
            expect(result.pass).toBe(true);
        });
        it('should fail when some adversarial cases not rejected', () => {
            const result = evaluator.evaluate({
                total: 20,
                rejected: 18
            });
            expect(result.status).toBe('fail');
            expect(result.pass).toBe(false);
        });
    });
    describe('MockTestCoverageGateEvaluator', () => {
        let evaluator;
        beforeEach(() => {
            evaluator = new MockTestCoverageGateEvaluator();
        });
        it('should pass when coverage meets threshold', () => {
            const result = evaluator.evaluate({
                coverage: 85,
                threshold: 80
            });
            expect(result.status).toBe('pass');
            expect(result.pass).toBe(true);
        });
        it('should fail when coverage below threshold', () => {
            const result = evaluator.evaluate({
                coverage: 75,
                threshold: 80
            });
            expect(result.status).toBe('fail');
            expect(result.pass).toBe(false);
        });
    });
    describe('MockReadabilityGateEvaluator', () => {
        let evaluator;
        beforeEach(() => {
            evaluator = new MockReadabilityGateEvaluator();
        });
        it('should skip when no review data', () => {
            const result = evaluator.evaluate({});
            expect(result.status).toBe('skip');
        });
        it('should pass when score meets threshold', () => {
            const result = evaluator.evaluate({
                avgScore: 8,
                threshold: 7,
                reviewLogPath: 'docs/PHASE4_READABILITY_REVIEW.md'
            });
            expect(result.status).toBe('pass');
            expect(result.pass).toBe(true);
        });
        it('should fail when score below threshold', () => {
            const result = evaluator.evaluate({
                avgScore: 6,
                threshold: 7
            });
            expect(result.status).toBe('fail');
            expect(result.pass).toBe(false);
        });
    });
});
//# sourceMappingURL=gate-evaluators-contract.test.js.map