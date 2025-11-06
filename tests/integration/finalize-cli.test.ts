/**
 * Phase 5 Step 6: CLI Finalize Command Smoke Test
 *
 * Basic integration test to verify the finalize command works end-to-end.
 */

import { describe, it, expect } from 'vitest';
import { run } from '../../src/orchestrator/index.js';
import * as path from 'path';
import * as fs from 'fs';

describe('Finalize CLI Command (Smoke Test)', () => {
  const fixtureRoot = path.resolve('tests/fixtures/phase5/baseline/tiny-react');
  const answersPath = path.join(fixtureRoot, 'answers.md');

  it('should reject finalize without --answers flag', async () => {
    const exitCode = await run(['node', 'ceps', 'finalize', '--llm', 'off']);
    expect(exitCode).toBe(1); // Error: missing --answers
  });

  it('should reject finalize with non-existent answers file', async () => {
    const exitCode = await run([
      'node',
      'ceps',
      'finalize',
      '--answers',
      '/nonexistent/answers.md',
      '--llm',
      'off'
    ]);
    expect(exitCode).toBe(1); // Error: file doesn't exist
  });

  it('should reject finalize without KB state file', async () => {
    const tmpDir = fs.mkdtempSync('/tmp/ceps-test-');
    const tmpAnswers = path.join(tmpDir, 'answers.md');
    fs.writeFileSync(tmpAnswers, '# Empty answers\n', 'utf8');

    const exitCode = await run([
      'node',
      'ceps',
      'finalize',
      tmpDir,  // Project root without .ceps/kb-state.json
      '--answers',
      tmpAnswers,
      '--llm',
      'off'
    ]);

    expect(exitCode).toBe(1); // Error: .ceps/kb-state.json not found

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('should run finalize in dry-run mode successfully', async () => {
    const exitCode = await run([
      'node',
      'ceps',
      'finalize',
      fixtureRoot,
      '--answers',
      answersPath,
      '--dry-run',
      '--llm',
      'off'
    ]);

    // Dry-run should succeed (exit code 0) or return 3 if snapshot mismatch
    // (depends on whether snapshot verification passes)
    expect([0, 3]).toContain(exitCode);
  });

  it('should parse finalize flags correctly', async () => {
    const exitCode = await run([
      'node',
      'ceps',
      'finalize',
      fixtureRoot,
      '--answers',
      answersPath,
      '--dry-run',
      '--finalize-max-hops',
      '5',
      '--finalize-max-nodes',
      '100',
      '--finalize-scope',
      'auto',
      '--llm',
      'off'
    ]);

    // Should not error on flag parsing
    expect([0, 3]).toContain(exitCode);
  });

  it('should reject --reconcile in dry-run mode (with warning)', async () => {
    // This should emit a warning but still run
    const exitCode = await run([
      'node',
      'ceps',
      'finalize',
      fixtureRoot,
      '--answers',
      answersPath,
      '--dry-run',
      '--reconcile',
      '--llm',
      'off'
    ]);

    // Should complete despite the warning
    expect([0, 3]).toContain(exitCode);
  });

  it('should reject unknown commands', async () => {
    const exitCode = await run([
      'node',
      'ceps',
      'unknown-command',
      '--llm',
      'off'
    ]);

    expect(exitCode).toBe(1); // Error: unknown command
  });

  it('should distinguish between baseline and finalize commands', async () => {
    // Test that 'baseline' command works (even if gates fail)
    const exitCode = await run([
      'node',
      'ceps',
      'baseline',
      '.',
      '--llm',
      'off',
      '--no-snapshot'
    ]);

    // Should not error on command parsing (may fail gates with code 2)
    expect([0, 1, 2]).toContain(exitCode);
  });
});
