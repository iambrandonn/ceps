import { describe, it, expect } from 'vitest';
import { IgnoreRules } from '../../../src/scanner/ignore-rules';

describe('Ignore Rules', () => {
  it('should ignore node_modules by default', () => {
    const rules = new IgnoreRules('/project/root');
    expect(rules.shouldIgnore('node_modules/foo/bar.js')).toBe(true);
    expect(rules.shouldIgnore('src/node_modules/foo.js')).toBe(true);
  });

  it('should ignore common build directories', () => {
    const rules = new IgnoreRules('/project/root');
    expect(rules.shouldIgnore('dist/bundle.js')).toBe(true);
    expect(rules.shouldIgnore('build/output.js')).toBe(true);
    expect(rules.shouldIgnore('.next/cache/foo.js')).toBe(true);
  });

  it('should ignore minified files', () => {
    const rules = new IgnoreRules('/project/root');
    expect(rules.shouldIgnore('lib/vendor.min.js')).toBe(true);
    expect(rules.shouldIgnore('lib/bundle-abc123.js')).toBe(true);
  });

  it('should respect .gitignore patterns', () => {
    const rules = new IgnoreRules('/project/root', {
      gitignorePatterns: ['*.log', 'temp/']
    });
    expect(rules.shouldIgnore('debug.log')).toBe(true);
    expect(rules.shouldIgnore('temp/cache.js')).toBe(true);
  });

  it('should support explicit overrides', () => {
    const rules = new IgnoreRules('/project/root', {
      ignore: ['src/generated/**'],
      include: ['!src/generated/keep.ts']
    });
    expect(rules.shouldIgnore('src/generated/foo.ts')).toBe(true);
    expect(rules.shouldIgnore('src/generated/keep.ts')).toBe(false);
  });

  it('should handle precedence: explicit > gitignore > defaults', () => {
    const rules = new IgnoreRules('/project/root', {
      gitignorePatterns: ['build/'],
      include: ['!build/important.ts']
    });
    expect(rules.shouldIgnore('build/output.js')).toBe(true);
    expect(rules.shouldIgnore('build/important.ts')).toBe(false);
  });

  it('should not ignore normal source files', () => {
    const rules = new IgnoreRules('/project/root');
    expect(rules.shouldIgnore('src/index.ts')).toBe(false);
    expect(rules.shouldIgnore('lib/utils.js')).toBe(false);
  });

  it('should ignore .git directory', () => {
    const rules = new IgnoreRules('/project/root');
    expect(rules.shouldIgnore('.git/config')).toBe(true);
    expect(rules.shouldIgnore('.DS_Store')).toBe(true);
  });

  it('should ignore coverage directory', () => {
    const rules = new IgnoreRules('/project/root');
    expect(rules.shouldIgnore('coverage/lcov.info')).toBe(true);
  });

  it('should respect respectGitignore option', () => {
    const rules = new IgnoreRules('/project/root', {
      respectGitignore: false,
      gitignorePatterns: ['custom.log']
    });
    // Should still respect explicit gitignorePatterns even when respectGitignore=false
    expect(rules.shouldIgnore('custom.log')).toBe(true);
  });
});
