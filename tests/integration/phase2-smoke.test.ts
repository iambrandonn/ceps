import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Scanner } from '../../src/scanner/scanner';
import { Parser } from '../../src/parser/parser';
import { KnowledgeBase } from '../../src/kb/knowledge-base';
import { SpecGenerator } from '../../src/generator/spec-generator';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Phase 2 Integration Smoke Test', () => {
  let tempDir: string;

  beforeAll(() => {
    // Create temporary test project
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ceps-phase2-test-'));

    // Create test files
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'tests'), { recursive: true });

    // Write test source file
    fs.writeFileSync(
      path.join(tempDir, 'src/users.ts'),
      `
/**
 * Fetches a user by ID
 */
export function fetchUser(id: string): Promise<User> {
  return fetch(\`/api/users/\${id}\`).then(r => r.json());
}

export interface User {
  id: string;
  name: string;
}
`.trim(),
      'utf8'
    );

    // Write test file
    fs.writeFileSync(
      path.join(tempDir, 'tests/users.test.ts'),
      `
import { fetchUser } from '../src/users';

describe('fetchUser', () => {
  it('should fetch user by id', async () => {
    const user = await fetchUser('123');
    expect(user.id).toBe('123');
  });
});
`.trim(),
      'utf8'
    );

    // Write package.json
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'test-project', version: '1.0.0' }, null, 2),
      'utf8'
    );
  });

  afterAll(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should complete end-to-end pipeline: Scanner → Parser → KB → Generator', async () => {
    // Step 1: Scanner
    const scanner = new Scanner(tempDir);
    const fileIndex = await scanner.scan();

    expect(fileIndex.entries.length).toBeGreaterThan(0);
    expect(fileIndex.entries.some(e => e.path.includes('src/users.ts'))).toBe(true);

    const codeFiles = fileIndex.entries.filter(e => e.kind === 'code');
    expect(codeFiles.length).toBeGreaterThan(0);

    // Step 2: Parser → KB
    const kb = new KnowledgeBase();
    const parser = new Parser();

    for (const entry of codeFiles) {
      const source = fs.readFileSync(entry.absolutePath, 'utf8');
      await parser.parseAndStore(entry.path, source, kb);
    }

    // Verify KB populated
    const exportedEntities = kb.listExported();
    expect(exportedEntities.length).toBeGreaterThan(0);

    // Should have fetchUser function
    const fetchUserEntity = exportedEntities.find(e => e.name === 'fetchUser');
    expect(fetchUserEntity).toBeDefined();
    expect(fetchUserEntity?.kind).toBe('function');
    expect(fetchUserEntity?.exported).toBe(true);

    // Step 3: Generator
    const generator = new SpecGenerator(kb, fileIndex);

    // Generate root spec
    const rootSpec = generator.generateRootSpec(tempDir);
    expect(rootSpec).toContain('— Specification');
    expect(rootSpec).toContain('## System Overview');
    expect(rootSpec).toContain('## Conventions');
    expect(rootSpec).toContain('## Index');

    // Generate directory specs
    const dirSpecs = generator.generateDirectorySpecs(tempDir);
    expect(Object.keys(dirSpecs).length).toBeGreaterThan(0);

    // Should have src/spec.md
    const srcSpec = dirSpecs['src/spec.md'];
    expect(srcSpec).toBeDefined();
    expect(srcSpec).toContain('# src');
    expect(srcSpec).toContain('fetchUser');

    // Verify anchor present
    expect(srcSpec).toMatch(/<a id="[^"]+"><\/a>/);

    // Verify function name and signature present
    expect(srcSpec).toContain('fetchUser');
    expect(srcSpec).toContain('**Signature:**');

    // Verify side effects detected
    expect(srcSpec).toContain('network');
  });

  it('should write specs to disk', async () => {
    // Run full pipeline
    const scanner = new Scanner(tempDir);
    const fileIndex = await scanner.scan();

    const kb = new KnowledgeBase();
    const parser = new Parser();

    for (const entry of fileIndex.entries.filter(e => e.kind === 'code')) {
      const source = fs.readFileSync(entry.absolutePath, 'utf8');
      await parser.parseAndStore(entry.path, source, kb);
    }

    const generator = new SpecGenerator(kb, fileIndex);

    // Write root spec
    const rootSpec = generator.generateRootSpec(tempDir);
    const rootSpecPath = path.join(tempDir, 'spec.md');
    fs.writeFileSync(rootSpecPath, rootSpec, 'utf8');

    // Write directory specs
    const dirSpecs = generator.generateDirectorySpecs(tempDir);
    for (const [specPath, content] of Object.entries(dirSpecs)) {
      const fullPath = path.join(tempDir, specPath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, content, 'utf8');
    }

    // Verify files exist
    expect(fs.existsSync(rootSpecPath)).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'src/spec.md'))).toBe(true);

    // Verify content
    const rootContent = fs.readFileSync(rootSpecPath, 'utf8');
    expect(rootContent).toContain('— Specification');
    expect(rootContent).toContain('**Generated by ceps**');

    const srcContent = fs.readFileSync(path.join(tempDir, 'src/spec.md'), 'utf8');
    expect(srcContent).toContain('fetchUser');
  });

  it('should handle parse errors gracefully', async () => {
    // Create file with syntax error
    const malformedPath = path.join(tempDir, 'src/broken.ts');
    fs.writeFileSync(
      malformedPath,
      'export function broken( {',
      'utf8'
    );

    const scanner = new Scanner(tempDir);
    const fileIndex = await scanner.scan();

    const kb = new KnowledgeBase();
    const parser = new Parser();

    // Parse all files (parser handles errors internally)
    for (const entry of fileIndex.entries.filter(e => e.kind === 'code')) {
      const source = fs.readFileSync(entry.absolutePath, 'utf8');
      const result = await parser.parse(entry.path, source);

      // Check if this is the broken file
      if (entry.path.includes('broken.ts')) {
        // Should have parse errors
        expect(result.errors.length).toBeGreaterThan(0);
      }
    }

    // KB should still have entities from valid files after parsing them
    for (const entry of fileIndex.entries.filter(e => e.kind === 'code' && !e.path.includes('broken.ts'))) {
      const source = fs.readFileSync(entry.absolutePath, 'utf8');
      await parser.parseAndStore(entry.path, source, kb);
    }

    const exportedEntities = kb.listExported();
    expect(exportedEntities.length).toBeGreaterThan(0);

    // Clean up
    fs.unlinkSync(malformedPath);
  });
});
