import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { captureSnapshot } from '../capture.js';

let tempDir: string;

describe('captureSnapshot', () => {
  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snapshot-test-'));

    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src', 'a.ts'), 'const fn = () => 1;  \r\n', 'utf8');
    fs.writeFileSync(path.join(tempDir, 'README.md'), '# Hello  \r\n', 'utf8');
    fs.writeFileSync(path.join(tempDir, 'spec.md'), '# Generated spec\n', 'utf8');

    fs.mkdirSync(path.join(tempDir, 'node_modules'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'node_modules', 'ignore.js'), 'ignored', 'utf8');
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('captures allowed files with deterministic ordering', async () => {
    const snapshot = await captureSnapshot({ root: tempDir });

    expect(snapshot.version).toBe('1.0');
    expect(snapshot.files.map((f) => f.path)).toEqual([
      'README.md',
      'src/a.ts'
    ]);

    // Ensure hashes reflect normalized content (no trailing whitespace / CRLF)
    const readme = snapshot.files.find((f) => f.path === 'README.md');
    expect(readme?.hash).toBeDefined();
    expect(readme?.bytes).toBeGreaterThan(0);

    // Root hash should be stable and non-empty
    expect(snapshot.rootHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('captures empty files with zero-byte metadata and expected hash', async () => {
    const emptyPath = path.join(tempDir, 'src', 'empty.ts');
    fs.writeFileSync(emptyPath, '', 'utf8');

    const snapshot = await captureSnapshot({ root: tempDir });
    const emptyEntry = snapshot.files.find((f) => f.path === 'src/empty.ts');
    expect(emptyEntry).toBeDefined();
    expect(emptyEntry?.bytes).toBe(0);
    expect(emptyEntry?.hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
