import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Scanner } from '../../../src/scanner/scanner';
import { FileIndex } from '../../../src/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Scanner', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ceps-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should scan a simple project', async () => {
    // Create some files
    const srcDir = path.join(testDir, 'src');
    fs.mkdirSync(srcDir);
    fs.writeFileSync(path.join(srcDir, 'index.ts'), 'export const foo = 1;');
    fs.writeFileSync(path.join(srcDir, 'utils.js'), 'export const bar = 2;');

    const scanner = new Scanner(testDir);
    const index = await scanner.scan();

    expect(index.entries.length).toBe(2);
    expect(index.rootPath).toBe(testDir);
    expect(index.entries.some(e => e.path === 'src/index.ts')).toBe(true);
    expect(index.entries.some(e => e.path === 'src/utils.js')).toBe(true);
  });

  it('should classify files correctly', async () => {
    // Code files
    fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'src', 'index.ts'), '');
    fs.writeFileSync(path.join(testDir, 'src', 'component.tsx'), '');
    fs.writeFileSync(path.join(testDir, 'src', 'utils.js'), '');

    // Test files
    fs.mkdirSync(path.join(testDir, 'tests'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'src', 'index.test.ts'), '');
    fs.writeFileSync(path.join(testDir, 'src', 'utils.spec.js'), '');
    fs.mkdirSync(path.join(testDir, '__tests__'), { recursive: true });
    fs.writeFileSync(path.join(testDir, '__tests__', 'integration.test.ts'), '');

    // Config files
    fs.writeFileSync(path.join(testDir, 'package.json'), '{}');
    fs.writeFileSync(path.join(testDir, 'tsconfig.json'), '{}');
    fs.writeFileSync(path.join(testDir, '.eslintrc.yml'), '');

    // Contract files
    fs.writeFileSync(path.join(testDir, 'openapi.json'), '{}');
    fs.writeFileSync(path.join(testDir, 'schema.sql'), 'CREATE TABLE...');

    const scanner = new Scanner(testDir);
    const index = await scanner.scan();

    const codeFiles = index.entries.filter(e => e.kind === 'code');
    const testFiles = index.entries.filter(e => e.kind === 'test');
    const configFiles = index.entries.filter(e => e.kind === 'config');
    const contractFiles = index.entries.filter(e => e.kind === 'contract');

    expect(codeFiles.length).toBe(3); // index.ts, component.tsx, utils.js
    expect(testFiles.length).toBe(3); // index.test.ts, utils.spec.js, integration.test.ts
    expect(configFiles.length).toBe(3); // package.json, tsconfig.json, .eslintrc.yml
    expect(contractFiles.length).toBe(2); // openapi.json, schema.sql
  });

  it('should respect ignore rules', async () => {
    // Create files in ignored directories
    fs.mkdirSync(path.join(testDir, 'node_modules', 'foo'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'node_modules', 'foo', 'index.js'), '');

    fs.mkdirSync(path.join(testDir, 'dist'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'dist', 'bundle.js'), '');

    // Create files in non-ignored directories
    fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'src', 'index.ts'), '');

    const scanner = new Scanner(testDir);
    const index = await scanner.scan();

    expect(index.entries.some(e => e.path.includes('node_modules'))).toBe(false);
    expect(index.entries.some(e => e.path.includes('dist'))).toBe(false);
    expect(index.entries.some(e => e.path === 'src/index.ts')).toBe(true);
  });

  it('should respect custom ignore rules', async () => {
    fs.mkdirSync(path.join(testDir, 'src', 'generated'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'src', 'generated', 'schema.ts'), '');
    fs.writeFileSync(path.join(testDir, 'src', 'index.ts'), '');

    const scanner = new Scanner(testDir, {
      ignore: ['src/generated/**']
    });
    const index = await scanner.scan();

    expect(index.entries.some(e => e.path.includes('generated'))).toBe(false);
    expect(index.entries.some(e => e.path === 'src/index.ts')).toBe(true);
  });

  it('should detect monorepo packages', async () => {
    // Create package.json with workspaces
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify({ workspaces: ['packages/*'] })
    );

    // Create packages
    const coreDir = path.join(testDir, 'packages', 'core', 'src');
    const utilsDir = path.join(testDir, 'packages', 'utils', 'src');

    fs.mkdirSync(coreDir, { recursive: true });
    fs.mkdirSync(utilsDir, { recursive: true });

    fs.writeFileSync(
      path.join(testDir, 'packages', 'core', 'package.json'),
      JSON.stringify({ name: '@test/core' })
    );
    fs.writeFileSync(path.join(coreDir, 'index.ts'), '');

    fs.writeFileSync(
      path.join(testDir, 'packages', 'utils', 'package.json'),
      JSON.stringify({ name: '@test/utils' })
    );
    fs.writeFileSync(path.join(utilsDir, 'index.ts'), '');

    const scanner = new Scanner(testDir);
    const index = await scanner.scan();

    expect(index.packages.packages.length).toBe(2);
    expect(index.packages.packages.some(p => p.name === '@test/core')).toBe(true);
    expect(index.packages.packages.some(p => p.name === '@test/utils')).toBe(true);

    // Files should have packageId
    const coreFile = index.entries.find(e => e.path === 'packages/core/src/index.ts');
    const utilsFile = index.entries.find(e => e.path === 'packages/utils/src/index.ts');

    expect(coreFile?.packageId).toBe('@test/core');
    expect(utilsFile?.packageId).toBe('@test/utils');
  });

  it('should produce deterministic ordering', async () => {
    // Create files in random order
    fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'src', 'zebra.ts'), '');
    fs.writeFileSync(path.join(testDir, 'src', 'alpha.ts'), '');
    fs.writeFileSync(path.join(testDir, 'src', 'beta.ts'), '');

    const scanner = new Scanner(testDir);
    const index1 = await scanner.scan();
    const index2 = await scanner.scan();

    expect(index1.entries.map(e => e.path)).toEqual(index2.entries.map(e => e.path));

    // Should be sorted lexicographically
    const paths = index1.entries.map(e => e.path);
    const sorted = [...paths].sort();
    expect(paths).toEqual(sorted);
  });

  it('should include file size', async () => {
    fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
    const content = 'export const foo = 1;';
    fs.writeFileSync(path.join(testDir, 'src', 'index.ts'), content);

    const scanner = new Scanner(testDir);
    const index = await scanner.scan();

    const file = index.entries.find(e => e.path === 'src/index.ts');
    expect(file?.size).toBe(content.length);
  });

  it('should normalize paths to POSIX format', async () => {
    fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'src', 'index.ts'), '');

    const scanner = new Scanner(testDir);
    const index = await scanner.scan();

    expect(index.entries[0].path).not.toContain('\\');
    expect(index.entries[0].path).toBe('src/index.ts');
  });

  it('should handle JSX and TSX files', async () => {
    fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'src', 'Component.tsx'), '');
    fs.writeFileSync(path.join(testDir, 'src', 'App.jsx'), '');

    const scanner = new Scanner(testDir);
    const index = await scanner.scan();

    expect(index.entries.length).toBe(2);
    expect(index.entries.some(e => e.path === 'src/Component.tsx')).toBe(true);
    expect(index.entries.some(e => e.path === 'src/App.jsx')).toBe(true);
  });

  it('should scan YAML and SQL files', async () => {
    fs.mkdirSync(path.join(testDir, 'config'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'db'), { recursive: true });

    fs.writeFileSync(path.join(testDir, 'config', 'app.yaml'), '');
    fs.writeFileSync(path.join(testDir, 'db', 'schema.sql'), '');

    const scanner = new Scanner(testDir);
    const index = await scanner.scan();

    expect(index.entries.some(e => e.path === 'config/app.yaml')).toBe(true);
    expect(index.entries.some(e => e.path === 'db/schema.sql')).toBe(true);
  });

  it('should handle empty project', async () => {
    const scanner = new Scanner(testDir);
    const index = await scanner.scan();

    expect(index.entries).toEqual([]);
    expect(index.packages.packages).toEqual([]);
    expect(index.rootPath).toBe(testDir);
  });

  it('should scan dotfiles in subdirectories', async () => {
    // Create nested dotfiles
    fs.mkdirSync(path.join(testDir, 'src', 'config'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'packages', 'core'), { recursive: true });

    fs.writeFileSync(path.join(testDir, 'src', 'config', '.env.json'), '{}');
    fs.writeFileSync(path.join(testDir, 'packages', 'core', '.config.yaml'), '');
    fs.writeFileSync(path.join(testDir, '.eslintrc.json'), '{}');

    const scanner = new Scanner(testDir);
    const index = await scanner.scan();

    expect(index.entries.some(e => e.path === 'src/config/.env.json')).toBe(true);
    expect(index.entries.some(e => e.path === 'packages/core/.config.yaml')).toBe(true);
    expect(index.entries.some(e => e.path === '.eslintrc.json')).toBe(true);

    // All should be classified as config
    const dotfiles = index.entries.filter(e => path.basename(e.path).startsWith('.'));
    expect(dotfiles.every(f => f.kind === 'config')).toBe(true);
  });
});
