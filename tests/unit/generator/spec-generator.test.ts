import { describe, it, expect, beforeEach } from 'vitest';
import { SpecGenerator } from '../../../src/generator/spec-generator';
import { KnowledgeBase } from '../../../src/kb/knowledge-base';
import { FileIndex } from '../../../src/types';

describe('Spec Generator', () => {
  let kb: KnowledgeBase;

  beforeEach(() => {
    kb = new KnowledgeBase();
  });

  describe('Non-monorepo projects', () => {
    it('should generate root spec.md', () => {
      kb.insertEntity({
        id: 'e1',
        kind: 'function',
        name: 'fetchUser',
        path: 'src/api/users.ts',
        exported: true
      });

      const generator = new SpecGenerator(kb);
      const rootSpec = generator.generateRootSpec('/project/root');

      expect(rootSpec).toContain('# root — Specification');
      expect(rootSpec).toContain('## System Overview');
      expect(rootSpec).toContain('## Conventions');
      expect(rootSpec).toContain('## Index');
    });

    it('should include confidence bands in conventions', () => {
      const generator = new SpecGenerator(kb);
      const rootSpec = generator.generateRootSpec('/project/root');

      expect(rootSpec).toContain('### Confidence Bands');
      expect(rootSpec).toContain('High (≥70)');
      expect(rootSpec).toContain('Medium (40-69)');
      expect(rootSpec).toContain('Low (<40)');
    });

    it('should include Open Questions explanation in conventions', () => {
      const generator = new SpecGenerator(kb);
      const rootSpec = generator.generateRootSpec('/project/root');

      expect(rootSpec).toContain('### Open Questions');
      expect(rootSpec).toContain('QID');
    });

    it('should list exported entities count in overview', () => {
      kb.insertEntity({
        id: 'e1',
        kind: 'function',
        name: 'foo',
        path: 'src/foo.ts',
        exported: true
      });
      kb.insertEntity({
        id: 'e2',
        kind: 'function',
        name: 'bar',
        path: 'src/bar.ts',
        exported: true
      });

      const generator = new SpecGenerator(kb);
      const rootSpec = generator.generateRootSpec('/project/root');

      expect(rootSpec).toContain('2 exported entities');
    });

    it('should generate per-directory specs', () => {
      kb.insertEntity({
        id: 'e1',
        kind: 'function',
        name: 'fetchUser',
        path: 'src/api/users.ts',
        exported: true
      });

      const generator = new SpecGenerator(kb);
      const dirSpecs = generator.generateDirectorySpecs('/project/root');

      expect(dirSpecs).toHaveProperty('src/api/spec.md');
      expect(dirSpecs['src/api/spec.md']).toContain('# src/api');
      expect(dirSpecs['src/api/spec.md']).toContain('### fetchUser');
    });

    it('should group entities by directory', () => {
      kb.insertEntity({
        id: 'e1',
        kind: 'function',
        name: 'foo',
        path: 'src/utils/foo.ts',
        exported: true
      });
      kb.insertEntity({
        id: 'e2',
        kind: 'function',
        name: 'bar',
        path: 'src/utils/bar.ts',
        exported: true
      });

      const generator = new SpecGenerator(kb);
      const dirSpecs = generator.generateDirectorySpecs('/project/root');

      expect(dirSpecs['src/utils/spec.md']).toContain('foo');
      expect(dirSpecs['src/utils/spec.md']).toContain('bar');
    });

    it('should group entities by file within directories', () => {
      kb.insertEntity({
        id: 'e1',
        kind: 'function',
        name: 'foo',
        path: 'src/utils/foo.ts',
        exported: true
      });
      kb.insertEntity({
        id: 'e2',
        kind: 'function',
        name: 'bar',
        path: 'src/utils/bar.ts',
        exported: true
      });

      const generator = new SpecGenerator(kb);
      const dirSpecs = generator.generateDirectorySpecs('/project/root');

      expect(dirSpecs['src/utils/spec.md']).toContain('## foo.ts');
      expect(dirSpecs['src/utils/spec.md']).toContain('## bar.ts');
    });

    it('should include entity anchors in directory specs', () => {
      kb.insertEntity({
        id: 'anchor-123',
        kind: 'function',
        name: 'fetchUser',
        path: 'src/api/users.ts',
        exported: true
      });

      const generator = new SpecGenerator(kb);
      const dirSpecs = generator.generateDirectorySpecs('/project/root');

      expect(dirSpecs['src/api/spec.md']).toContain('<a id="anchor-123"></a>');
    });

    it('should list directories in root spec index', () => {
      kb.insertEntity({
        id: 'e1',
        kind: 'function',
        name: 'foo',
        path: 'src/api/foo.ts',
        exported: true
      });
      kb.insertEntity({
        id: 'e2',
        kind: 'function',
        name: 'bar',
        path: 'src/utils/bar.ts',
        exported: true
      });

      const generator = new SpecGenerator(kb);
      const rootSpec = generator.generateRootSpec('/project/root');

      expect(rootSpec).toContain('src/api');
      expect(rootSpec).toContain('src/utils');
    });

    it('should not generate specs for directories with no exported entities', () => {
      kb.insertEntity({
        id: 'e1',
        kind: 'function',
        name: 'internal',
        path: 'src/internal/helper.ts',
        exported: false // Not exported
      });

      const generator = new SpecGenerator(kb);
      const dirSpecs = generator.generateDirectorySpecs('/project/root');

      expect(dirSpecs).not.toHaveProperty('src/internal/spec.md');
    });
  });

  describe('Monorepo projects', () => {
    it('should generate per-package specs for monorepos', () => {
      kb.insertEntity({
        id: 'e1',
        kind: 'function',
        name: 'foo',
        path: 'packages/core/src/foo.ts',
        packageId: '@myapp/core',
        exported: true
      });
      kb.insertEntity({
        id: 'e2',
        kind: 'function',
        name: 'bar',
        path: 'packages/utils/src/bar.ts',
        packageId: '@myapp/utils',
        exported: true
      });

      const fileIndex: FileIndex = {
        entries: [],
        packages: {
          packages: [
            { id: '@myapp/core', name: '@myapp/core', path: 'packages/core', files: [] },
            { id: '@myapp/utils', name: '@myapp/utils', path: 'packages/utils', files: [] }
          ]
        },
        rootPath: '/project'
      };

      const generator = new SpecGenerator(kb, fileIndex);
      const dirSpecs = generator.generateDirectorySpecs('/project');

      // Should generate package-level specs
      expect(dirSpecs).toHaveProperty('packages/core/spec.md');
      expect(dirSpecs).toHaveProperty('packages/utils/spec.md');
      expect(dirSpecs['packages/core/spec.md']).toContain('foo');
      expect(dirSpecs['packages/utils/spec.md']).toContain('bar');
    });

    it('should include package metadata in monorepo root spec', () => {
      const fileIndex: FileIndex = {
        entries: [],
        packages: {
          packages: [
            { id: '@myapp/core', name: '@myapp/core', path: 'packages/core', files: [] },
            { id: '@myapp/utils', name: '@myapp/utils', path: 'packages/utils', files: [] }
          ]
        },
        rootPath: '/project'
      };

      const generator = new SpecGenerator(kb, fileIndex);
      const rootSpec = generator.generateRootSpec('/project');

      expect(rootSpec).toContain('## Packages');
      expect(rootSpec).toContain('@myapp/core');
      expect(rootSpec).toContain('@myapp/utils');
    });

    it('should link to package specs in monorepo root', () => {
      const fileIndex: FileIndex = {
        entries: [],
        packages: {
          packages: [
            { id: '@myapp/core', name: '@myapp/core', path: 'packages/core', files: [] }
          ]
        },
        rootPath: '/project'
      };

      const generator = new SpecGenerator(kb, fileIndex);
      const rootSpec = generator.generateRootSpec('/project');

      expect(rootSpec).toContain('[packages/core/spec.md]');
    });

    it('should show package name in package spec heading', () => {
      kb.insertEntity({
        id: 'e1',
        kind: 'function',
        name: 'foo',
        path: 'packages/core/src/foo.ts',
        packageId: '@myapp/core',
        exported: true
      });

      const fileIndex: FileIndex = {
        entries: [],
        packages: {
          packages: [
            { id: '@myapp/core', name: '@myapp/core', path: 'packages/core', files: [] }
          ]
        },
        rootPath: '/project'
      };

      const generator = new SpecGenerator(kb, fileIndex);
      const dirSpecs = generator.generateDirectorySpecs('/project');

      expect(dirSpecs['packages/core/spec.md']).toContain('# @myapp/core');
      expect(dirSpecs['packages/core/spec.md']).toContain('**Package:** packages/core');
    });

    it('should only include entities from the correct package', () => {
      kb.insertEntity({
        id: 'e1',
        kind: 'function',
        name: 'coreFn',
        path: 'packages/core/src/foo.ts',
        packageId: '@myapp/core',
        exported: true
      });
      kb.insertEntity({
        id: 'e2',
        kind: 'function',
        name: 'utilsFn',
        path: 'packages/utils/src/bar.ts',
        packageId: '@myapp/utils',
        exported: true
      });

      const fileIndex: FileIndex = {
        entries: [],
        packages: {
          packages: [
            { id: '@myapp/core', name: '@myapp/core', path: 'packages/core', files: [] },
            { id: '@myapp/utils', name: '@myapp/utils', path: 'packages/utils', files: [] }
          ]
        },
        rootPath: '/project'
      };

      const generator = new SpecGenerator(kb, fileIndex);
      const dirSpecs = generator.generateDirectorySpecs('/project');

      // Core spec should only have core entities
      expect(dirSpecs['packages/core/spec.md']).toContain('coreFn');
      expect(dirSpecs['packages/core/spec.md']).not.toContain('utilsFn');

      // Utils spec should only have utils entities
      expect(dirSpecs['packages/utils/spec.md']).toContain('utilsFn');
      expect(dirSpecs['packages/utils/spec.md']).not.toContain('coreFn');
    });

    it('should not generate package spec if package has no exported entities', () => {
      kb.insertEntity({
        id: 'e1',
        kind: 'function',
        name: 'coreFn',
        path: 'packages/core/src/foo.ts',
        packageId: '@myapp/core',
        exported: true
      });

      const fileIndex: FileIndex = {
        entries: [],
        packages: {
          packages: [
            { id: '@myapp/core', name: '@myapp/core', path: 'packages/core', files: [] },
            { id: '@myapp/empty', name: '@myapp/empty', path: 'packages/empty', files: [] }
          ]
        },
        rootPath: '/project'
      };

      const generator = new SpecGenerator(kb, fileIndex);
      const dirSpecs = generator.generateDirectorySpecs('/project');

      expect(dirSpecs).toHaveProperty('packages/core/spec.md');
      expect(dirSpecs).not.toHaveProperty('packages/empty/spec.md');
    });
  });
});
