import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { run } from '../../src/orchestrator/index';

describe('Orchestrator Integration', () => {
  it('should run successfully with valid project root', async () => {
    const exitCode = await run(['node', 'ceps', '.', '--llm', 'off']);
    expect(exitCode).toBe(0);
  });

  it('should return error code for invalid project root', async () => {
    const exitCode = await run(['node', 'ceps', '/nonexistent/path', '--llm', 'off']);
    expect(exitCode).toBe(1);
  });

  it('should handle flags correctly', async () => {
    const exitCode = await run(['node', 'ceps', '.', '--deterministic', '--max-workers', '4', '--llm', 'off']);
    expect(exitCode).toBe(0);
  });

  it('should return error for invalid flag values', async () => {
    const exitCode = await run(['node', 'ceps', '.', '--max-workers', 'invalid', '--llm', 'off']);
    expect(exitCode).toBe(1);
  });

  it('should display version when --version flag is used', async () => {
    const exitCode = await run(['node', 'ceps', '--version']);
    expect(exitCode).toBe(0);
  });

  it('should emit behaviorful specs', async () => {
    await run(['node', 'ceps', '.', '--llm', 'off']);
    const specPath = path.join(process.cwd(), 'src', 'kb', 'spec.md');
    const spec = await fs.readFile(specPath, 'utf8');
    expect(spec).toContain('**Behavior:**');
    expect(spec).toContain('Function normalizeContent');
  });
});
