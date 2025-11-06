import { describe, it, expect, vi, afterEach } from 'vitest';
import { join } from 'path';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'fs';
import { Orchestrator, PipelinePhase } from '../../orchestrator/orchestrator';
import { MockValidator } from '../../validation/mock-validator';
import { Scanner } from '../../scanner/scanner';
import { SpecGenerator } from '../../generator/spec-generator';
import crypto from 'crypto';
/**
 * Phase 4 WS-F2: Golden Harness Tests (Determinism Verification)
 *
 * Per IMPLEMENTATION_PLAN_PHASE4_WS_F2.md Stage G:
 * - Validate byte-identical output with `--llm off --deterministic`
 * - Validate structural stability with `--llm on --deterministic`
 *
 * These tests verify SADS determinism requirements:
 * - Template mode must produce identical output across runs
 * - LLM mode with deterministic flag must preserve structure
 */
describe('Phase 4 Determinism & Golden Harness (WS-F2)', () => {
    const fixturesDir = join(__dirname, '../../../tests/fixtures');
    const projectRoot = join(fixturesDir, 'tiny-express');
    // Helper to compute SHA-256 hash of file content
    function hashFile(filePath) {
        const content = readFileSync(filePath, 'utf8');
        return crypto.createHash('sha256').update(content).digest('hex');
    }
    // Helper to extract structural elements from spec
    function extractStructure(specPath) {
        const content = readFileSync(specPath, 'utf8');
        // Extract anchors (lines starting with ##)
        const anchors = content
            .split('\n')
            .filter(line => line.startsWith('##'))
            .map(line => line.trim());
        // Extract factSetIds (look for factSetId references in comments or metadata)
        // For now, just ensure chunks exist (each ## section is a chunk)
        const factSetIds = anchors.map((_, i) => `implicit-${i}`);
        // Heading order
        const headingOrder = content
            .split('\n')
            .filter(line => line.match(/^#{1,6}\s/))
            .map(line => line.trim());
        return { anchors, factSetIds, headingOrder };
    }
    // Helper to manually generate specs (bypassing validation gates)
    async function manuallyGenerateSpecs(orchestrator, projectRoot, options = {}) {
        const kb = orchestrator.getKnowledgeBase();
        const scanner = new Scanner(projectRoot);
        const fileIndex = await scanner.scan();
        const generator = new SpecGenerator(kb, fileIndex, options);
        const rootSpec = generator.generateRootSpec(projectRoot);
        const rootSpecPath = join(projectRoot, 'spec.md');
        mkdirSync(projectRoot, { recursive: true });
        require('fs').writeFileSync(rootSpecPath, rootSpec, 'utf8');
    }
    afterEach(() => {
        // Clean up generated specs
        const specPath = join(projectRoot, 'spec.md');
        if (existsSync(specPath)) {
            rmSync(specPath);
        }
    });
    describe('Template Mode Byte-Identical Output', () => {
        it('should produce identical output across multiple runs with --llm off --deterministic', async () => {
            // Run 1: Generate spec in template mode
            const orchestrator1 = new Orchestrator({
                projectRoot,
                deterministic: true,
                llm: 'off',
            });
            await orchestrator1.runUntil(PipelinePhase.REASONING);
            await manuallyGenerateSpecs(orchestrator1, projectRoot, {
                llmEnabled: false,
                deterministicMode: true
            });
            const specPath = join(projectRoot, 'spec.md');
            expect(existsSync(specPath)).toBe(true);
            // Compute hash of first run
            const hash1 = hashFile(specPath);
            const content1 = readFileSync(specPath, 'utf8');
            // Clean up for second run
            rmSync(specPath);
            // Run 2: Generate spec again with same inputs
            const orchestrator2 = new Orchestrator({
                projectRoot,
                deterministic: true,
                llm: 'off',
            });
            await orchestrator2.runUntil(PipelinePhase.REASONING);
            await manuallyGenerateSpecs(orchestrator2, projectRoot, {
                llmEnabled: false,
                deterministicMode: true
            });
            expect(existsSync(specPath)).toBe(true);
            // Compute hash of second run
            const hash2 = hashFile(specPath);
            const content2 = readFileSync(specPath, 'utf8');
            // Verify byte-identical output
            expect(hash1).toBe(hash2);
            expect(content1).toBe(content2);
        });
        it('should produce consistent file size and line count', async () => {
            const runs = [];
            // Run generation 3 times
            for (let i = 0; i < 3; i++) {
                const orchestrator = new Orchestrator({
                    projectRoot,
                    deterministic: true,
                    llm: 'off',
                });
                await orchestrator.runUntil(PipelinePhase.REASONING);
                await manuallyGenerateSpecs(orchestrator, projectRoot, {
                    llmEnabled: false,
                    deterministicMode: true
                });
                const specPath = join(projectRoot, 'spec.md');
                const content = readFileSync(specPath, 'utf8');
                runs.push({
                    size: content.length,
                    lines: content.split('\n').length,
                    hash: hashFile(specPath)
                });
                // Clean up for next run
                rmSync(specPath);
            }
            // All runs should have identical metrics
            expect(runs[0].size).toBe(runs[1].size);
            expect(runs[0].size).toBe(runs[2].size);
            expect(runs[0].lines).toBe(runs[1].lines);
            expect(runs[0].lines).toBe(runs[2].lines);
            expect(runs[0].hash).toBe(runs[1].hash);
            expect(runs[0].hash).toBe(runs[2].hash);
        });
    });
    describe('LLM Mode Structural Stability', () => {
        it('should preserve structural elements with --llm on --deterministic', async () => {
            // Create deterministic mock gateway that always returns same output
            const mockLLMOutput = 'This is a deterministic LLM response for testing.';
            const mockGateway = {
                summarize: vi.fn().mockResolvedValue(mockLLMOutput),
                getUsage: vi.fn().mockReturnValue({
                    totalTokens: 100,
                    promptTokens: 80,
                    completionTokens: 20,
                    costUSD: 0.01,
                    budgetLimit: 10000,
                    budgetRemaining: 9900,
                    budgetUsedPercent: 1,
                    byProvider: { mock: { tokens: 100, costUSD: 0.01 } }
                }),
            };
            const validator = new MockValidator();
            validator.setNextResult({ status: 'accept', diagnostics: [] });
            // Run 1
            const orchestrator1 = new Orchestrator({
                projectRoot,
                deterministic: true,
                llm: 'on',
                llmGateway: mockGateway,
                validator,
            });
            await orchestrator1.runUntil(PipelinePhase.REASONING);
            await manuallyGenerateSpecs(orchestrator1, projectRoot, {
                llmEnabled: true,
                deterministicMode: true,
                llmGateway: mockGateway,
                validator
            });
            const specPath = join(projectRoot, 'spec.md');
            expect(existsSync(specPath)).toBe(true);
            const structure1 = extractStructure(specPath);
            const content1 = readFileSync(specPath, 'utf8');
            // Clean up for second run
            rmSync(specPath);
            // Reset mock call counts
            mockGateway.summarize = vi.fn().mockResolvedValue(mockLLMOutput);
            // Run 2
            const orchestrator2 = new Orchestrator({
                projectRoot,
                deterministic: true,
                llm: 'on',
                llmGateway: mockGateway,
                validator,
            });
            await orchestrator2.runUntil(PipelinePhase.REASONING);
            await manuallyGenerateSpecs(orchestrator2, projectRoot, {
                llmEnabled: true,
                deterministicMode: true,
                llmGateway: mockGateway,
                validator
            });
            expect(existsSync(specPath)).toBe(true);
            const structure2 = extractStructure(specPath);
            const content2 = readFileSync(specPath, 'utf8');
            // Verify structural stability (same anchors, same ordering)
            expect(structure1.anchors).toEqual(structure2.anchors);
            expect(structure1.headingOrder).toEqual(structure2.headingOrder);
            expect(structure1.factSetIds.length).toBe(structure2.factSetIds.length);
            // Note: Content may differ slightly due to LLM phrasing, but structure should be stable
            // This is expected behavior per SADS - deterministic mode ensures structural stability,
            // not necessarily byte-identical output
        });
        it('should preserve anchor links across runs', async () => {
            const mockGateway = {
                summarize: vi.fn().mockResolvedValue('Deterministic response'),
                getUsage: vi.fn().mockReturnValue({
                    totalTokens: 50,
                    promptTokens: 40,
                    completionTokens: 10,
                    costUSD: 0.005,
                    budgetLimit: 10000,
                    budgetRemaining: 9950,
                    budgetUsedPercent: 0.5,
                    byProvider: { mock: { tokens: 50, costUSD: 0.005 } }
                }),
            };
            const validator = new MockValidator();
            validator.setNextResult({ status: 'accept', diagnostics: [] });
            const runs = [];
            // Run 3 times to verify consistency
            for (let i = 0; i < 3; i++) {
                mockGateway.summarize = vi.fn().mockResolvedValue('Deterministic response');
                const orchestrator = new Orchestrator({
                    projectRoot,
                    deterministic: true,
                    llm: 'on',
                    llmGateway: mockGateway,
                    validator,
                });
                await orchestrator.runUntil(PipelinePhase.REASONING);
                await manuallyGenerateSpecs(orchestrator, projectRoot, {
                    llmEnabled: true,
                    deterministicMode: true,
                    llmGateway: mockGateway,
                    validator
                });
                const specPath = join(projectRoot, 'spec.md');
                const content = readFileSync(specPath, 'utf8');
                // Extract all anchor references (lines with [[]])
                const anchorRefs = content.match(/\[\[.*?\]\]/g) || [];
                runs.push({
                    anchorCount: anchorRefs.length,
                    anchors: anchorRefs
                });
                rmSync(specPath);
            }
            // All runs should have same anchor count and references
            expect(runs[0].anchorCount).toBe(runs[1].anchorCount);
            expect(runs[0].anchorCount).toBe(runs[2].anchorCount);
            expect(runs[0].anchors).toEqual(runs[1].anchors);
            expect(runs[0].anchors).toEqual(runs[2].anchors);
        });
        it('should maintain consistent chunk ordering', async () => {
            const mockGateway = {
                summarize: vi.fn().mockResolvedValue('Consistent chunk content'),
                getUsage: vi.fn().mockReturnValue({
                    totalTokens: 75,
                    promptTokens: 60,
                    completionTokens: 15,
                    costUSD: 0.0075,
                    budgetLimit: 10000,
                    budgetRemaining: 9925,
                    budgetUsedPercent: 0.75,
                    byProvider: { mock: { tokens: 75, costUSD: 0.0075 } }
                }),
            };
            const validator = new MockValidator();
            validator.setNextResult({ status: 'accept', diagnostics: [] });
            const structures = [];
            for (let i = 0; i < 2; i++) {
                mockGateway.summarize = vi.fn().mockResolvedValue('Consistent chunk content');
                const orchestrator = new Orchestrator({
                    projectRoot,
                    deterministic: true,
                    llm: 'on',
                    llmGateway: mockGateway,
                    validator,
                });
                await orchestrator.runUntil(PipelinePhase.REASONING);
                await manuallyGenerateSpecs(orchestrator, projectRoot, {
                    llmEnabled: true,
                    deterministicMode: true,
                    llmGateway: mockGateway,
                    validator
                });
                const specPath = join(projectRoot, 'spec.md');
                structures.push(extractStructure(specPath));
                rmSync(specPath);
            }
            // Heading order should be identical across runs
            expect(structures[0].headingOrder).toEqual(structures[1].headingOrder);
        });
    });
    describe('Non-Deterministic Mode Behavior', () => {
        it('should preserve structure even in non-deterministic mode', async () => {
            // This test verifies that even without --deterministic, structural elements are preserved
            // Content may vary with real LLMs, but with mocks it will be consistent
            const mockGateway = {
                summarize: vi.fn().mockResolvedValue('Variable LLM response'),
                getUsage: vi.fn().mockReturnValue({
                    totalTokens: 100,
                    promptTokens: 80,
                    completionTokens: 20,
                    costUSD: 0.01,
                    budgetLimit: 10000,
                    budgetRemaining: 9900,
                    budgetUsedPercent: 1,
                    byProvider: { mock: { tokens: 100, costUSD: 0.01 } }
                }),
            };
            const validator = new MockValidator();
            validator.setNextResult({ status: 'accept', diagnostics: [] });
            // Run 1
            const orchestrator1 = new Orchestrator({
                projectRoot,
                deterministic: false, // Non-deterministic mode
                llm: 'on',
                llmGateway: mockGateway,
                validator,
            });
            await orchestrator1.runUntil(PipelinePhase.REASONING);
            await manuallyGenerateSpecs(orchestrator1, projectRoot, {
                llmEnabled: true,
                deterministicMode: false,
                llmGateway: mockGateway,
                validator
            });
            const specPath = join(projectRoot, 'spec.md');
            const structure1 = extractStructure(specPath);
            rmSync(specPath);
            // Run 2
            mockGateway.summarize = vi.fn().mockResolvedValue('Variable LLM response');
            const orchestrator2 = new Orchestrator({
                projectRoot,
                deterministic: false, // Non-deterministic mode
                llm: 'on',
                llmGateway: mockGateway,
                validator,
            });
            await orchestrator2.runUntil(PipelinePhase.REASONING);
            await manuallyGenerateSpecs(orchestrator2, projectRoot, {
                llmEnabled: true,
                deterministicMode: false,
                llmGateway: mockGateway,
                validator
            });
            const structure2 = extractStructure(specPath);
            // Structure should be preserved even in non-deterministic mode
            expect(structure1.anchors.length).toBe(structure2.anchors.length);
            expect(structure1.headingOrder.length).toBe(structure2.headingOrder.length);
            // Note: With real LLMs, content would vary, but structure remains stable
            // This is expected behavior per SADS - deterministic mode is not required for structural stability
        });
    });
});
//# sourceMappingURL=phase4-determinism.test.js.map