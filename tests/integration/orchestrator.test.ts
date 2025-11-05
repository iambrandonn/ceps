import { describe, it, expect } from 'vitest';
import { run } from '../../src/orchestrator/index';

describe('Orchestrator Integration', () => {
  it('should run successfully with valid project root', async () => {
    const exitCode = await run(['node', 'ceps', '.', '--llm', 'off']);
    // Phase 4: Gates are now enforced. Template mode produces no behavior chunks,
    // so Coverage gate fails with exit code 2 (gate failure)
    expect(exitCode).toBe(2);
  });

  it('should return error code for invalid project root', async () => {
    const exitCode = await run(['node', 'ceps', '/nonexistent/path', '--llm', 'off']);
    expect(exitCode).toBe(1);
  });

  it('should handle flags correctly', async () => {
    const exitCode = await run(['node', 'ceps', '.', '--deterministic', '--max-workers', '4', '--llm', 'off']);
    // Phase 4: Gates are now enforced. Template mode produces no behavior chunks,
    // so Coverage gate fails with exit code 2 (gate failure)
    expect(exitCode).toBe(2);
  });

  it('should return error for invalid flag values', async () => {
    const exitCode = await run(['node', 'ceps', '.', '--max-workers', 'invalid', '--llm', 'off']);
    expect(exitCode).toBe(1);
  });

  it('should display version when --version flag is used', async () => {
    const exitCode = await run(['node', 'ceps', '--version']);
    expect(exitCode).toBe(0);
  });
});
