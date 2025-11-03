import { describe, it, expect } from 'vitest';
import { Project } from 'ts-morph';
import { PatternDetector } from '../../../src/parser/pattern-detector';

describe('Pattern Detector', () => {
  it('should detect eval usage', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      const code = 'console.log("dynamic")';
      eval(code);
    `
    );

    const detector = new PatternDetector();
    const warnings = detector.detect(sourceFile, 'test.ts');

    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].message).toContain('eval');
  });

  it('should detect dynamic imports', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      const moduleName = './module';
      import(moduleName).then(m => m.default());
    `
    );

    const detector = new PatternDetector();
    const warnings = detector.detect(sourceFile, 'test.ts');

    expect(warnings.some((w) => w.message.includes('dynamic import'))).toBe(true);
  });

  it('should detect Proxy usage', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      const handler = { get: (target, prop) => target[prop] };
      const proxy = new Proxy({}, handler);
    `
    );

    const detector = new PatternDetector();
    const warnings = detector.detect(sourceFile, 'test.ts');

    expect(warnings.some((w) => w.message.includes('Proxy'))).toBe(true);
  });

  it('should detect Function constructor', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      const fn = new Function('a', 'b', 'return a + b');
    `
    );

    const detector = new PatternDetector();
    const warnings = detector.detect(sourceFile, 'test.ts');

    expect(warnings.some((w) => w.message.includes('Function constructor'))).toBe(true);
  });

  it('should not flag safe code', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      export function add(a: number, b: number): number {
        return a + b;
      }
    `
    );

    const detector = new PatternDetector();
    const warnings = detector.detect(sourceFile, 'test.ts');

    expect(warnings.length).toBe(0);
  });
});
