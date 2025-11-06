/**
 * Phase 5 Step 6: CLI Finalize Flags Tests
 *
 * Test suite for `ceps finalize` command flag parsing and validation.
 * Follows TDD approach: write tests first (Red phase).
 *
 * **Coverage targets:**
 * - Flag parsing (--answers, --dry-run, --reconcile, etc.)
 * - Flag validation rules (incompatible combinations, missing required args)
 * - Default values for finalize-specific options
 * - Error messages for malformed flags
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseArgs, validateArgs } from '../cli.js';
import * as path from 'path';
describe('CLI Finalize Flags (Phase 5 Step 6)', () => {
    let consoleWarnSpy;
    // Mock filesystem for tests that need it
    const createMockFs = (options = {}) => ({
        existsSync: (p) => {
            if (p.includes('missing.md'))
                return options.answersExists ?? false;
            if (p.includes('kb-state.json'))
                return options.kbStateExists ?? true;
            return options.projectRootExists ?? true;
        },
        statSync: () => ({ isDirectory: () => true })
    });
    beforeEach(() => {
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });
    describe('finalize command detection', () => {
        it('should detect finalize command as first positional arg', () => {
            const args = parseArgs(['node', 'ceps', 'finalize']);
            expect(args.command).toBe('finalize');
        });
        it('should default to "baseline" command if no command specified', () => {
            const args = parseArgs(['node', 'ceps']);
            expect(args.command).toBe('baseline');
        });
        it('should treat project path as first positional for baseline command', () => {
            const args = parseArgs(['node', 'ceps', '/some/path']);
            expect(args.command).toBe('baseline');
            expect(args.projectRoot).toBe(path.resolve('/some/path'));
        });
        it('should reject unknown commands', () => {
            expect(() => parseArgs(['node', 'ceps', 'invalid-command'])).toThrow('Unknown command: invalid-command. Supported commands: baseline, finalize');
        });
    });
    describe('--answers flag', () => {
        it('should parse --answers with file path', () => {
            const args = parseArgs(['node', 'ceps', 'finalize', '--answers', './answers.md']);
            expect(args.answersPath).toBe('./answers.md');
        });
        it('should throw error if --answers has no value', () => {
            expect(() => parseArgs(['node', 'ceps', 'finalize', '--answers'])).toThrow('--answers requires a value');
        });
        it('should throw error if --answers value starts with --', () => {
            expect(() => parseArgs(['node', 'ceps', 'finalize', '--answers', '--dry-run'])).toThrow('--answers requires a value');
        });
        it('should accept absolute path for --answers', () => {
            const args = parseArgs(['node', 'ceps', 'finalize', '--answers', '/abs/path/answers.md']);
            expect(args.answersPath).toBe('/abs/path/answers.md');
        });
        it('should error during validation if --answers file does not exist', () => {
            const mockFs = createMockFs({ answersExists: false });
            const args = parseArgs(['node', 'ceps', 'finalize', '--answers', './missing.md']);
            expect(() => validateArgs(args, mockFs)).toThrow('Answers file does not exist: ./missing.md');
        });
        it('should error if finalize command used without --answers', () => {
            const args = parseArgs(['node', 'ceps', 'finalize']);
            expect(() => validateArgs(args)).toThrow('finalize command requires --answers <path>');
        });
    });
    describe('--dry-run flag', () => {
        it('should parse --dry-run flag', () => {
            const args = parseArgs([
                'node',
                'ceps',
                'finalize',
                '--answers',
                './answers.md',
                '--dry-run'
            ]);
            expect(args.dryRun).toBe(true);
        });
        it('should default --dry-run to false', () => {
            const args = parseArgs(['node', 'ceps', 'finalize', '--answers', './answers.md']);
            expect(args.dryRun).toBe(false);
        });
    });
    describe('--reconcile flag', () => {
        it('should parse --reconcile flag', () => {
            const args = parseArgs([
                'node',
                'ceps',
                'finalize',
                '--answers',
                './answers.md',
                '--reconcile'
            ]);
            expect(args.reconcile).toBe(true);
        });
        it('should default --reconcile to false', () => {
            const args = parseArgs(['node', 'ceps', 'finalize', '--answers', './answers.md']);
            expect(args.reconcile).toBe(false);
        });
        it('should warn if --reconcile and --dry-run both provided', () => {
            const args = parseArgs([
                'node',
                'ceps',
                'finalize',
                '--answers',
                './answers.md',
                '--dry-run',
                '--reconcile'
            ]);
            const mockFs = createMockFs();
            validateArgs(args, mockFs);
            expect(consoleWarnSpy).toHaveBeenCalledWith('Warning: --reconcile has no effect in --dry-run mode');
        });
    });
    describe('--finalize-max-hops flag', () => {
        it('should parse --finalize-max-hops with integer value', () => {
            const args = parseArgs([
                'node',
                'ceps',
                'finalize',
                '--answers',
                './answers.md',
                '--finalize-max-hops',
                '5'
            ]);
            expect(args.finalizeMaxHops).toBe(5);
        });
        it('should default --finalize-max-hops to 3', () => {
            const args = parseArgs(['node', 'ceps', 'finalize', '--answers', './answers.md']);
            expect(args.finalizeMaxHops).toBe(3);
        });
        it('should throw error if --finalize-max-hops is not a positive integer', () => {
            const args = parseArgs([
                'node',
                'ceps',
                'finalize',
                '--answers',
                './answers.md',
                '--finalize-max-hops',
                '-1'
            ]);
            expect(() => validateArgs(args)).toThrow('--finalize-max-hops must be a positive integer');
        });
        it('should throw error if --finalize-max-hops is zero', () => {
            const args = parseArgs([
                'node',
                'ceps',
                'finalize',
                '--answers',
                './answers.md',
                '--finalize-max-hops',
                '0'
            ]);
            expect(() => validateArgs(args)).toThrow('--finalize-max-hops must be a positive integer');
        });
        it('should throw error if --finalize-max-hops has no value', () => {
            expect(() => parseArgs(['node', 'ceps', 'finalize', '--answers', './answers.md', '--finalize-max-hops'])).toThrow('--finalize-max-hops requires a value');
        });
    });
    describe('--finalize-max-nodes flag', () => {
        it('should parse --finalize-max-nodes with integer value', () => {
            const args = parseArgs([
                'node',
                'ceps',
                'finalize',
                '--answers',
                './answers.md',
                '--finalize-max-nodes',
                '500'
            ]);
            expect(args.finalizeMaxNodes).toBe(500);
        });
        it('should default --finalize-max-nodes to 250', () => {
            const args = parseArgs(['node', 'ceps', 'finalize', '--answers', './answers.md']);
            expect(args.finalizeMaxNodes).toBe(250);
        });
        it('should throw error if --finalize-max-nodes is not a positive integer', () => {
            const args = parseArgs([
                'node',
                'ceps',
                'finalize',
                '--answers',
                './answers.md',
                '--finalize-max-nodes',
                '-100'
            ]);
            expect(() => validateArgs(args)).toThrow('--finalize-max-nodes must be a positive integer');
        });
    });
    describe('--finalize-scope flag', () => {
        it('should parse --finalize-scope with "auto"', () => {
            const args = parseArgs([
                'node',
                'ceps',
                'finalize',
                '--answers',
                './answers.md',
                '--finalize-scope',
                'auto'
            ]);
            expect(args.finalizeScope).toBe('auto');
        });
        it('should parse --finalize-scope with "full"', () => {
            const args = parseArgs([
                'node',
                'ceps',
                'finalize',
                '--answers',
                './answers.md',
                '--finalize-scope',
                'full'
            ]);
            expect(args.finalizeScope).toBe('full');
        });
        it('should default --finalize-scope to "auto"', () => {
            const args = parseArgs(['node', 'ceps', 'finalize', '--answers', './answers.md']);
            expect(args.finalizeScope).toBe('auto');
        });
        it('should throw error if --finalize-scope has invalid value', () => {
            const args = parseArgs([
                'node',
                'ceps',
                'finalize',
                '--answers',
                './answers.md',
                '--finalize-scope',
                'invalid'
            ]);
            expect(() => validateArgs(args)).toThrow('--finalize-scope must be either "auto" or "full"');
        });
        it('should warn if --finalize-scope full ignores max-hops/max-nodes', () => {
            const args = parseArgs([
                'node',
                'ceps',
                'finalize',
                '--answers',
                './answers.md',
                '--finalize-scope',
                'full',
                '--finalize-max-hops',
                '5'
            ]);
            const mockFs = createMockFs();
            validateArgs(args, mockFs);
            expect(consoleWarnSpy).toHaveBeenCalledWith('Warning: --finalize-scope full ignores --finalize-max-hops and --finalize-max-nodes');
        });
    });
    describe('--finalize-out flag', () => {
        it('should error if --finalize-out is provided (not supported in Phase 5)', () => {
            expect(() => parseArgs([
                'node',
                'ceps',
                'finalize',
                '--answers',
                './answers.md',
                '--finalize-out',
                './output'
            ])).toThrow('--finalize-out is not supported in Phase 5');
        });
    });
    describe('Flag combinations and defaults', () => {
        it('should allow all finalize flags together', () => {
            const args = parseArgs([
                'node',
                'ceps',
                'finalize',
                '--answers',
                './answers.md',
                '--dry-run',
                '--finalize-max-hops',
                '5',
                '--finalize-max-nodes',
                '300',
                '--finalize-scope',
                'auto',
                '--deterministic'
            ]);
            expect(args.command).toBe('finalize');
            expect(args.answersPath).toBe('./answers.md');
            expect(args.dryRun).toBe(true);
            expect(args.finalizeMaxHops).toBe(5);
            expect(args.finalizeMaxNodes).toBe(300);
            expect(args.finalizeScope).toBe('auto');
            expect(args.deterministic).toBe(true);
        });
        it('should respect --deterministic flag in finalize mode', () => {
            const args = parseArgs([
                'node',
                'ceps',
                'finalize',
                '--answers',
                './answers.md',
                '--deterministic'
            ]);
            expect(args.deterministic).toBe(true);
        });
        it('should respect --llm flags in finalize mode', () => {
            const args = parseArgs([
                'node',
                'ceps',
                'finalize',
                '--answers',
                './answers.md',
                '--llm',
                'off'
            ]);
            expect(args.llm).toBe('off');
        });
        it('should not allow baseline-only flags in finalize mode', () => {
            // --no-snapshot is baseline-only (finalize doesn't capture new snapshots)
            const args = parseArgs([
                'node',
                'ceps',
                'finalize',
                '--answers',
                './answers.md',
                '--no-snapshot'
            ]);
            expect(() => validateArgs(args)).toThrow('--no-snapshot is only valid for baseline command');
        });
    });
    describe('KB state file validation', () => {
        it('should error if .ceps/kb-state.json does not exist', () => {
            const mockFs = createMockFs({ kbStateExists: false });
            const args = parseArgs(['node', 'ceps', 'finalize', '--answers', './answers.md']);
            expect(() => validateArgs(args, mockFs)).toThrow('Baseline run required before finalization: .ceps/kb-state.json not found');
        });
        it('should pass validation if .ceps/kb-state.json exists', () => {
            const mockFs = createMockFs({ answersExists: true, kbStateExists: true });
            const args = parseArgs(['node', 'ceps', 'finalize', '--answers', './answers.md']);
            expect(() => validateArgs(args, mockFs)).not.toThrow();
        });
    });
});
//# sourceMappingURL=cli-finalize-flags.test.js.map