import { describe, it, expect } from 'vitest';
import { parseArgs, validateArgs } from '../../../src/orchestrator/cli';
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
