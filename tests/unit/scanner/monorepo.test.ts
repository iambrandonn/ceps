import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectMonorepo, buildPackageMap } from '../../../src/scanner/monorepo';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Monorepo Detection', () => {
  let testDir: string;

  beforeEach(() => {
    // Create a temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ceps-test-'));
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should detect pnpm workspaces from package.json', () => {
    const packageJson = {
      name: 'test-monorepo',
      workspaces: ['packages/*', 'apps/*']
    };

    // Create pnpm-workspace.yaml to distinguish from Yarn
    fs.writeFileSync(path.join(testDir, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');

    const result = detectMonorepo(testDir, packageJson);
    expect(result.isMonorepo).toBe(true);
    expect(result.type).toBe('pnpm-workspaces');
    expect(result.workspaceGlobs).toEqual(['packages/*', 'apps/*']);
  });

  it('should detect pnpm workspaces from pnpm-workspace.yaml', () => {
    const packageJson = {
      name: 'test-monorepo',
      workspaces: ['packages/*']
    };

    // Create pnpm-workspace.yaml
    fs.writeFileSync(path.join(testDir, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');

    const result = detectMonorepo(testDir, packageJson);
    expect(result.isMonorepo).toBe(true);
    expect(result.type).toBe('pnpm-workspaces');
  });

  it('should detect Yarn workspaces', () => {
    const packageJson = {
      name: 'test-monorepo',
      workspaces: ['packages/*']
    };

    const result = detectMonorepo(testDir, packageJson);
    expect(result.isMonorepo).toBe(true);
    expect(result.type).toBe('yarn-workspaces');
    expect(result.workspaceGlobs).toEqual(['packages/*']);
  });

  it('should detect workspaces with packages array format', () => {
    const packageJson = {
      name: 'test-monorepo',
      workspaces: {
        packages: ['packages/*', 'apps/*']
      }
    };

    const result = detectMonorepo(testDir, packageJson);
    expect(result.isMonorepo).toBe(true);
    expect(result.workspaceGlobs).toEqual(['packages/*', 'apps/*']);
  });

  it('should detect Lerna monorepo from lerna.json', () => {
    const lernaJson = {
      packages: ['packages/*']
    };

    const result = detectMonorepo(testDir, {}, lernaJson);
    expect(result.isMonorepo).toBe(true);
    expect(result.type).toBe('lerna');
    expect(result.workspaceGlobs).toEqual(['packages/*']);
  });

  it('should detect Lerna from file system', () => {
    // Create lerna.json file
    const lernaJson = { packages: ['libs/*'] };
    fs.writeFileSync(path.join(testDir, 'lerna.json'), JSON.stringify(lernaJson));

    const result = detectMonorepo(testDir, {});
    expect(result.isMonorepo).toBe(true);
    expect(result.type).toBe('lerna');
    expect(result.workspaceGlobs).toEqual(['libs/*']);
  });

  it('should detect Nx monorepo from nx.json file', () => {
    // Create nx.json file
    fs.writeFileSync(path.join(testDir, 'nx.json'), JSON.stringify({ npmScope: 'test' }));

    const result = detectMonorepo(testDir, {});
    expect(result.isMonorepo).toBe(true);
    expect(result.type).toBe('nx');
    expect(result.workspaceGlobs).toEqual(['apps/*', 'libs/*', 'packages/*']);
  });

  it('should detect Nx monorepo from hasNxJson parameter', () => {
    const result = detectMonorepo(testDir, {}, undefined, true);
    expect(result.isMonorepo).toBe(true);
    expect(result.type).toBe('nx');
  });

  it('should return false for non-monorepo', () => {
    const result = detectMonorepo(testDir, {});
    expect(result.isMonorepo).toBe(false);
    expect(result.type).toBeUndefined();
    expect(result.workspaceGlobs).toBeUndefined();
  });

  it('should use default packages for Lerna if not specified', () => {
    const lernaJson = {}; // No packages specified

    const result = detectMonorepo(testDir, {}, lernaJson);
    expect(result.isMonorepo).toBe(true);
    expect(result.type).toBe('lerna');
    expect(result.workspaceGlobs).toEqual(['packages/*']);
  });
});

describe('Package Map Building', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ceps-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should build package map from workspace globs', async () => {
    // Create packages/core and packages/utils
    const coreDir = path.join(testDir, 'packages', 'core');
    const utilsDir = path.join(testDir, 'packages', 'utils');

    fs.mkdirSync(coreDir, { recursive: true });
    fs.mkdirSync(utilsDir, { recursive: true });

    // Create package.json files
    fs.writeFileSync(
      path.join(coreDir, 'package.json'),
      JSON.stringify({ name: '@test/core', version: '1.0.0' })
    );
    fs.writeFileSync(
      path.join(utilsDir, 'package.json'),
      JSON.stringify({ name: '@test/utils', version: '1.0.0' })
    );

    const packageMap = await buildPackageMap(testDir, ['packages/*']);

    expect(packageMap.packages.length).toBe(2);
    expect(packageMap.packages).toContainEqual({
      id: '@test/core',
      name: '@test/core',
      path: 'packages/core',
      files: []
    });
    expect(packageMap.packages).toContainEqual({
      id: '@test/utils',
      name: '@test/utils',
      path: 'packages/utils',
      files: []
    });
  });

  it('should handle multiple workspace globs', async () => {
    // Create packages/core and apps/web
    const coreDir = path.join(testDir, 'packages', 'core');
    const webDir = path.join(testDir, 'apps', 'web');

    fs.mkdirSync(coreDir, { recursive: true });
    fs.mkdirSync(webDir, { recursive: true });

    fs.writeFileSync(
      path.join(coreDir, 'package.json'),
      JSON.stringify({ name: '@test/core' })
    );
    fs.writeFileSync(
      path.join(webDir, 'package.json'),
      JSON.stringify({ name: '@test/web' })
    );

    const packageMap = await buildPackageMap(testDir, ['packages/*', 'apps/*']);

    expect(packageMap.packages.length).toBe(2);
    expect(packageMap.packages.map(p => p.name).sort()).toEqual(['@test/core', '@test/web']);
  });

  it('should use directory name if package.json has no name', async () => {
    const pkgDir = path.join(testDir, 'packages', 'unnamed');
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify({ version: '1.0.0' }));

    const packageMap = await buildPackageMap(testDir, ['packages/*']);

    expect(packageMap.packages.length).toBe(1);
    expect(packageMap.packages[0].id).toBe('packages/unnamed');
    expect(packageMap.packages[0].name).toBe('packages/unnamed');
  });

  it('should skip directories without package.json', async () => {
    const pkgDir = path.join(testDir, 'packages', 'nopkg');
    const withPkgDir = path.join(testDir, 'packages', 'withpkg');

    fs.mkdirSync(pkgDir, { recursive: true });
    fs.mkdirSync(withPkgDir, { recursive: true });
    fs.writeFileSync(path.join(withPkgDir, 'package.json'), JSON.stringify({ name: '@test/with' }));

    const packageMap = await buildPackageMap(testDir, ['packages/*']);

    expect(packageMap.packages.length).toBe(1);
    expect(packageMap.packages[0].name).toBe('@test/with');
  });

  it('should return empty packages array if no matches', async () => {
    const packageMap = await buildPackageMap(testDir, ['packages/*']);

    expect(packageMap.packages).toEqual([]);
  });

  it('should normalize paths to POSIX format', async () => {
    const pkgDir = path.join(testDir, 'packages', 'core');
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify({ name: '@test/core' }));

    const packageMap = await buildPackageMap(testDir, ['packages/*']);

    expect(packageMap.packages[0].path).toBe('packages/core');
    expect(packageMap.packages[0].path).not.toContain('\\');
  });
});
