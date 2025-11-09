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

  it('should create fact sets for exported constants', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'constants.ts',
      `
      export const LEXICON = { mode: 'strict' };
      const local = compute();
    `
    );

    const extractor = new FactExtractor();
    const result = extractor.extract(sourceFile, 'constants.ts');

    const constantEntity = result.entities.find((e) => e.name === 'LEXICON');
    expect(constantEntity).toBeDefined();

    const factSet = result.factSets.find((fs) => fs.id === `${constantEntity!.id}-facts`);
    expect(factSet).toBeDefined();
    expect(factSet?.facts.some((f) => f.predicate === 'is-constant')).toBe(true);
    expect(factSet?.facts.some((f) => f.predicate === 'initializer')).toBe(true);
  });

  // Step 1: Test for separate default exports
  it('should mark separate default exports as exported', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      const router = express.Router();
      export default router;
      `
    );

    const extractor = new FactExtractor();
    const result = extractor.extract(sourceFile, 'test.ts');

    const routerEntity = result.entities.find((e) => e.name === 'router');
    expect(routerEntity).toBeDefined();
    expect(routerEntity?.exported).toBe(true);
    expect(routerEntity?.visibility).toBe('public');

    // Verify the is-default-export fact was added
    const routerFactSet = result.factSets.find((fs) => fs.id === `${routerEntity!.id}-facts`);
    expect(routerFactSet).toBeDefined();
    const defaultExportFact = routerFactSet?.facts.find((f) => f.predicate === 'is-default-export');
    expect(defaultExportFact).toBeDefined();
    expect(defaultExportFact?.object).toBe(true);
  });

  // Step 2: Test for separate named exports
  it('should mark separate named exports as exported', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      const helper = () => 'test';
      const utils = { foo: 1 };
      export { helper, utils };
      `
    );

    const extractor = new FactExtractor();
    const result = extractor.extract(sourceFile, 'test.ts');

    const helperEntity = result.entities.find((e) => e.name === 'helper');
    const utilsEntity = result.entities.find((e) => e.name === 'utils');

    expect(helperEntity?.exported).toBe(true);
    expect(helperEntity?.visibility).toBe('public');
    expect(utilsEntity?.exported).toBe(true);
    expect(utilsEntity?.visibility).toBe('public');
  });

  // Additional test: Mixed exports (both named and default)
  it('should handle mixed exports in the same file', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      const router = express.Router();
      const middleware = () => {};
      export { middleware };
      export default router;
      `
    );

    const extractor = new FactExtractor();
    const result = extractor.extract(sourceFile, 'test.ts');

    const routerEntity = result.entities.find((e) => e.name === 'router');
    const middlewareEntity = result.entities.find((e) => e.name === 'middleware');

    expect(routerEntity?.exported).toBe(true);
    expect(middlewareEntity?.exported).toBe(true);
  });

  // Regression test: Inline exports should still work
  it('should not break inline export detection', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      export const usersRouter = Router();
      export function handler() {}
      export class UserService {}
      `
    );

    const extractor = new FactExtractor();
    const result = extractor.extract(sourceFile, 'test.ts');

    const routerEntity = result.entities.find((e) => e.name === 'usersRouter');
    const functionEntity = result.entities.find((e) => e.name === 'handler');
    const classEntity = result.entities.find((e) => e.name === 'UserService');

    expect(routerEntity?.exported).toBe(true);
    expect(functionEntity?.exported).toBe(true);
    expect(classEntity?.exported).toBe(true);
  });
});
