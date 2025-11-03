import { describe, it, expect } from 'vitest';
import { run } from '../../src/orchestrator/index';

describe('Orchestrator Integration', () => {
  it('should run successfully with valid project root', async () => {
    const exitCode = await run(['node', 'ceps', '.']);
    expect(exitCode).toBe(0);
  });

  it('should return error code for invalid project root', async () => {
    const exitCode = await run(['node', 'ceps', '/nonexistent/path']);
    expect(exitCode).toBe(1);
  });

  it('should handle flags correctly', async () => {
    const exitCode = await run(['node', 'ceps', '.', '--deterministic', '--max-workers', '4']);
    expect(exitCode).toBe(0);
  });

  it('should return error for invalid flag values', async () => {
    const exitCode = await run(['node', 'ceps', '.', '--max-workers', 'invalid']);
    expect(exitCode).toBe(1);
  });

  it('should display version when --version flag is used', async () => {
    const exitCode = await run(['node', 'ceps', '--version']);
    expect(exitCode).toBe(0);
  });
});
