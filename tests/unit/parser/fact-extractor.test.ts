import { describe, it, expect } from 'vitest';
import { Project } from 'ts-morph';
import { FactExtractor } from '../../../src/parser/fact-extractor';

describe('Fact Extractor', () => {
  it('should extract function entities', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      export function greet(name: string): string {
        return 'Hello ' + name;
      }
    `
    );

    const extractor = new FactExtractor();
    const result = extractor.extract(sourceFile, 'test.ts');

    expect(result.entities.length).toBe(1);
    expect(result.entities[0].kind).toBe('function');
    expect(result.entities[0].name).toBe('greet');
    expect(result.entities[0].exported).toBe(true);
  });

  it('should extract class entities', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      export class UserService {
        async getUser(id: string) {
          return fetch('/api/users/' + id);
        }
      }
    `
    );

    const extractor = new FactExtractor();
    const result = extractor.extract(sourceFile, 'test.ts');

    const classEntity = result.entities.find((e) => e.kind === 'class');
    const methodEntity = result.entities.find((e) => e.kind === 'method');

    expect(classEntity).toBeDefined();
    expect(classEntity?.name).toBe('UserService');
    expect(methodEntity).toBeDefined();
    expect(methodEntity?.name).toBe('getUser');
  });

  it('should extract import/export relations', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      import { foo } from './foo';
      export { bar } from './bar';
    `
    );

    const extractor = new FactExtractor();
    const result = extractor.extract(sourceFile, 'test.ts');

    const importRelation = result.relations.find((r) => r.predicate === 'imports');
    const exportRelation = result.relations.find((r) => r.predicate === 'exports');

    expect(importRelation).toBeDefined();
    expect(exportRelation).toBeDefined();
  });

  it('should extract call relations inside functions', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      export function saveUser(user: User) {
        validate(user);
        persist(user);
      }
    `
    );

    const extractor = new FactExtractor();
    const result = extractor.extract(sourceFile, 'test.ts');

    const callRelations = result.relations.filter((r) => r.predicate === 'calls');
    expect(callRelations.length).toBeGreaterThan(0);
    expect(callRelations.some((r) => r.objectId === 'validate')).toBe(true);
    expect(callRelations.some((r) => r.objectId === 'persist')).toBe(true);
  });

  it('should detect side effects (I/O, network, DB)', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      export function saveUser(user: User) {
        fetch('/api/users', { method: 'POST', body: JSON.stringify(user) });
        localStorage.setItem('user', user.id);
      }
    `
    );

    const extractor = new FactExtractor();
    const result = extractor.extract(sourceFile, 'test.ts');

    const entity = result.entities.find((e) => e.name === 'saveUser');
    expect(entity?.attributes?.sideEffects).toContain('network');
    expect(entity?.attributes?.sideEffects).toContain('storage');
  });

  it('should extract JSDoc comments', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      /**
       * Fetches a user by ID
       * @param id - User ID
       * @returns User object
       */
      export function fetchUser(id: string): Promise<User> {
        return fetch(\`/api/users/\${id}\`).then(r => r.json());
      }
    `
    );

    const extractor = new FactExtractor();
    const result = extractor.extract(sourceFile, 'test.ts');

    const factSet = result.factSets.find((fs) =>
      fs.facts.some((f) => f.predicate === 'has-jsdoc')
    );
    expect(factSet).toBeDefined();
  });

  it('should use content-based anchors (not path-based)', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      export function add(a: number, b: number): number {
        return a + b;
      }
    `
    );

    const extractor = new FactExtractor();
    const result = extractor.extract(sourceFile, 'test.ts');

    // Anchor should be based on function content, not just path
    expect(result.entities[0].id).toBeDefined();
    expect(result.entities[0].id).not.toBe('test.ts'); // Should not be just the path
    expect(result.entities[0].id.length).toBeGreaterThan(5); // Should be a hash
  });
});
