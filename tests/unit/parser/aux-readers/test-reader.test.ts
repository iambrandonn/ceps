import { describe, it, expect } from 'vitest';
import { Project } from 'ts-morph';
import { TestReader } from '../../../../src/parser/aux-readers/test-reader';

describe('TestReader', () => {
  it('should extract test case names from describe blocks', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      describe('MyFeature', () => {
        it('should work correctly', () => {
          expect(true).toBe(true);
        });
      });
    `
    );

    const reader = new TestReader();
    const factSets = reader.extractFacts(sourceFile, 'test.ts');

    expect(factSets.length).toBe(1);
    expect(factSets[0].facts.length).toBeGreaterThan(0);

    const testCaseFacts = factSets[0].facts.filter(f => f.predicate === 'test-case');
    expect(testCaseFacts.some(f => f.object === 'MyFeature')).toBe(true);
    expect(testCaseFacts.some(f => f.object === 'should work correctly')).toBe(true);
  });

  it('should extract test case names from it blocks', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      it('should handle edge cases', () => {
        expect(true).toBe(true);
      });
    `
    );

    const reader = new TestReader();
    const factSets = reader.extractFacts(sourceFile, 'test.ts');

    expect(factSets.length).toBe(1);
    const testCaseFact = factSets[0].facts.find(
      (f) => f.predicate === 'test-case' && f.object === 'should handle edge cases'
    );
    expect(testCaseFact).toBeDefined();
  });

  it('should extract from test() syntax (Jest/Vitest)', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      test('adds 1 + 2 to equal 3', () => {
        expect(1 + 2).toBe(3);
      });
    `
    );

    const reader = new TestReader();
    const factSets = reader.extractFacts(sourceFile, 'test.ts');

    expect(factSets.length).toBe(1);
    const testCaseFact = factSets[0].facts.find(
      (f) => f.predicate === 'test-case' && f.object === 'adds 1 + 2 to equal 3'
    );
    expect(testCaseFact).toBeDefined();
  });

  it('should handle nested describe blocks', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      describe('Outer Suite', () => {
        describe('Inner Suite', () => {
          it('nested test', () => {});
        });
      });
    `
    );

    const reader = new TestReader();
    const factSets = reader.extractFacts(sourceFile, 'test.ts');

    expect(factSets.length).toBe(1);
    const facts = factSets[0].facts;
    expect(facts.some(f => f.object === 'Outer Suite')).toBe(true);
    expect(facts.some(f => f.object === 'Inner Suite')).toBe(true);
    expect(facts.some(f => f.object === 'nested test')).toBe(true);
  });

  it('should return empty factSets when no tests found', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      function add(a: number, b: number) {
        return a + b;
      }
    `
    );

    const reader = new TestReader();
    const factSets = reader.extractFacts(sourceFile, 'test.ts');

    expect(factSets.length).toBe(0);
  });

  it('should have correct factSet metadata', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'my-test.ts',
      `
      describe('Test Suite', () => {
        it('works', () => {});
      });
    `
    );

    const reader = new TestReader();
    const factSets = reader.extractFacts(sourceFile, 'my-test.ts');

    expect(factSets.length).toBe(1);
    expect(factSets[0].id).toBe('my-test.ts-test-facts');
    expect(factSets[0].evidenceScore).toBe(70);
    expect(factSets[0].sources).toHaveLength(1);
    expect(factSets[0].sources[0].kind).toBe('aux');
    expect(factSets[0].sources[0].reader).toBe('test-reader');
  });

  it('should handle various quote styles', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      describe("Double quotes", () => {});
      it('Single quotes', () => {});
      test(\`Template literals\`, () => {});
    `
    );

    const reader = new TestReader();
    const factSets = reader.extractFacts(sourceFile, 'test.ts');

    expect(factSets.length).toBe(1);
    const facts = factSets[0].facts;
    expect(facts.some(f => f.object === 'Double quotes')).toBe(true);
    expect(facts.some(f => f.object === 'Single quotes')).toBe(true);
    expect(facts.some(f => f.object === 'Template literals')).toBe(true);
  });
});
