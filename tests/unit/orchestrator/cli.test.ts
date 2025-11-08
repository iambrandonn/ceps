import { describe, it, expect, vi } from 'vitest';
import { parseArgs, validateArgs, printHelp } from '../../../src/orchestrator/cli';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('CLI Argument Parsing', () => {
  it('should parse project root from first positional argument', () => {
    const args = parseArgs(['node', 'ceps', '/path/to/project']);
    expect(args.projectRoot).toBe('/path/to/project');
  });

  it('should default to current directory if no argument provided', () => {
    const args = parseArgs(['node', 'ceps']);
    expect(args.projectRoot).toBe(process.cwd());
  });

  it('should parse --deterministic flag', () => {
    const args = parseArgs(['node', 'ceps', '.', '--deterministic']);
    expect(args.deterministic).toBe(true);
  });

  it('should parse --max-workers with value', () => {
    const args = parseArgs(['node', 'ceps', '.', '--max-workers', '4']);
    expect(args.maxWorkers).toBe(4);
  });

  it('should throw error for invalid --max-workers value', () => {
    expect(() => parseArgs(['node', 'ceps', '.', '--max-workers', 'abc'])).toThrow(
      '--max-workers must be a positive integer'
    );
  });

  it('should throw error if --max-workers has no value', () => {
    expect(() => parseArgs(['node', 'ceps', '.', '--max-workers'])).toThrow(
      '--max-workers requires a value'
    );
  });

  it('should validate that project root exists', () => {
    expect(() => validateArgs({ projectRoot: '/nonexistent/path' })).toThrow(
      'Project root does not exist'
    );
  });

  it('should validate that project root is a directory', () => {
    // Create a temporary file (not directory) to test validation
    const tmpFile = path.join(os.tmpdir(), `ceps-test-file-${Date.now()}.txt`);
    fs.writeFileSync(tmpFile, 'test');

    try {
      expect(() => validateArgs({ projectRoot: tmpFile })).toThrow(
        'Project root is not a directory'
      );
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it('should parse --version flag', () => {
    const args = parseArgs(['node', 'ceps', '--version']);
    expect(args.version).toBe(true);
  });
});

describe('CLI --help flag', () => {
  it('should parse --help flag', () => {
    const args = parseArgs(['node', 'cli.js', '--help']);
    expect(args.help).toBe(true);
  });

  it('should parse --help with other flags', () => {
    const args = parseArgs(['node', 'cli.js', '--help', '--llm', 'off']);
    expect(args.help).toBe(true);
    expect(args.llm).toBe('off');
  });

  it('should parse --help with finalize command', () => {
    const args = parseArgs(['node', 'cli.js', 'finalize', '--help']);
    expect(args.help).toBe(true);
    expect(args.command).toBe('finalize');
  });

  it('should parse --version flag', () => {
    const args = parseArgs(['node', 'cli.js', '--version']);
    expect(args.version).toBe(true);
  });

  it('should print help text without errors', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    printHelp('0.2.0-test');
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls[0][0];
    expect(output).toContain('ceps v0.2.0-test');
    expect(output).toContain('USAGE:');
    expect(output).toContain('COMMANDS:');
    expect(output).toContain('GENERAL OPTIONS:');
    expect(output).toContain('EXAMPLES:');
    consoleSpy.mockRestore();
  });

  it('should document all CLI flags in help text', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    printHelp('0.2.0-test');
    const output = consoleSpy.mock.calls[0][0];

    // Assert all major sections present
    expect(output).toContain('USAGE:');
    expect(output).toContain('COMMANDS:');
    expect(output).toContain('GENERAL OPTIONS:');
    expect(output).toContain('LLM CONFIGURATION:');
    expect(output).toContain('EXECUTION CONTROL:');
    expect(output).toContain('SNAPSHOT CONTROL:');
    expect(output).toContain('FINALIZATION OPTIONS:');
    expect(output).toContain('EXAMPLES:');
    expect(output).toContain('EXIT CODES:');
    expect(output).toContain('ENVIRONMENT VARIABLES:');

    // Assert implemented flags are documented
    const requiredFlags = [
      '--help', '--version', '--llm', '--llm-provider', '--llm-model',
      '--llm-budget', '--no-llm-cache', '--deterministic', '--max-workers',
      '--no-snapshot', '--answers', '--dry-run', '--reconcile',
      '--finalize-max-hops', '--finalize-max-nodes', '--finalize-scope'
    ];

    for (const flag of requiredFlags) {
      expect(output).toContain(flag);
    }

    consoleSpy.mockRestore();
  });
});
