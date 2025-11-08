import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { run } from '../../src/orchestrator/index.js';

describe('CLI Help Integration', () => {
  let consoleLogSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should display help and exit with code 0', async () => {
    const exitCode = await run(['node', 'cli.js', '--help']);

    expect(exitCode).toBe(0);
    expect(consoleLogSpy).toHaveBeenCalled();

    const output = consoleLogSpy.mock.calls.map((call: any) => call[0]).join('\n');
    expect(output).toContain('ceps v');
    expect(output).toContain('USAGE:');
    expect(output).toContain('baseline');
    expect(output).toContain('finalize');
  });

  it('should display help without requiring API keys', async () => {
    // Temporarily clear API keys
    const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;
    const originalOpenaiKey = process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const exitCode = await run(['node', 'cli.js', '--help']);

    expect(exitCode).toBe(0);

    // Restore keys
    if (originalAnthropicKey) process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
    if (originalOpenaiKey) process.env.OPENAI_API_KEY = originalOpenaiKey;
  });

  it('should display help without requiring valid project root', async () => {
    const exitCode = await run(['node', 'cli.js', '/nonexistent/path', '--help']);
    expect(exitCode).toBe(0);
  });

  it('should display version and exit with code 0', async () => {
    const exitCode = await run(['node', 'cli.js', '--version']);

    expect(exitCode).toBe(0);
    expect(consoleLogSpy).toHaveBeenCalled();

    const output = consoleLogSpy.mock.calls.map((call: any) => call[0]).join('\n');
    expect(output).toContain('ceps v');
  });
});
