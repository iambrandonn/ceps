import { describe, it, expect } from 'vitest';
import { MarkdownRenderer } from '../../../src/generator/markdown-renderer';
import { Entity, BehaviorChunk } from '../../../src/kb/models';

describe('Markdown Renderer', () => {
  it('should render entity as Markdown section', () => {
    const entity: Entity = {
      id: 'test-id',
      kind: 'function',
      name: 'fetchUser',
      path: 'src/api/users.ts',
      signature: 'fetchUser(id: string): Promise<User>',
      exported: true
    };

    const renderer = new MarkdownRenderer();
    const markdown = renderer.renderEntity(entity);

    expect(markdown).toContain('### fetchUser');
    expect(markdown).toContain('fetchUser(id: string): Promise<User>');
  });

  it('should include anchor for entity', () => {
    const entity: Entity = {
      id: 'anchor123',
      kind: 'function',
      name: 'fetchUser',
      path: 'src/api/users.ts'
    };

    const renderer = new MarkdownRenderer();
    const markdown = renderer.renderEntity(entity);

    expect(markdown).toContain('<a id="anchor123"></a>');
  });

  it('should render side effects', () => {
    const entity: Entity = {
      id: 'test-id',
      kind: 'function',
      name: 'saveUser',
      path: 'src/api/users.ts',
      attributes: {
        sideEffects: ['network', 'database']
      }
    };

    const renderer = new MarkdownRenderer();
    const markdown = renderer.renderEntity(entity);

    expect(markdown).toContain('**Side effects:**');
    expect(markdown).toContain('network');
    expect(markdown).toContain('database');
  });

  it('should render errors thrown', () => {
    const entity: Entity = {
      id: 'test-id',
      kind: 'function',
      name: 'validateUser',
      path: 'src/validation.ts',
      attributes: {
        errors: ['new ValidationError("Invalid user")', 'new TypeError("Missing field")']
      }
    };

    const renderer = new MarkdownRenderer();
    const markdown = renderer.renderEntity(entity);

    expect(markdown).toContain('**Errors thrown:**');
    expect(markdown).toContain('ValidationError');
    expect(markdown).toContain('TypeError');
  });

  it('should use style kit lexicon', () => {
    const entity: Entity = {
      id: 'test-id',
      kind: 'function',
      name: 'validateInput',
      path: 'src/validation.ts'
    };

    const renderer = new MarkdownRenderer();
    const markdown = renderer.renderEntity(entity);

    // Should use "validates" (active voice, present tense)
    expect(markdown.toLowerCase()).toContain('validate');
  });

  it('should render behavior chunks if provided', () => {
    const entity: Entity = {
      id: 'test-id',
      kind: 'function',
      name: 'processOrder',
      path: 'src/orders.ts'
    };

    const chunks: BehaviorChunk[] = [
      {
        id: 'chunk1',
        targetEntityId: 'test-id',
        textDraft: 'Validates order data',
        factSetIds: ['fs1'],
        confidence: 'High'
      },
      {
        id: 'chunk2',
        targetEntityId: 'test-id',
        textDraft: 'Persists order to database',
        factSetIds: ['fs2'],
        confidence: 'High'
      }
    ];

    const renderer = new MarkdownRenderer();
    const markdown = renderer.renderEntity(entity, chunks);

    expect(markdown).toContain('**Behavior:**');
    expect(markdown).toContain('Validates order data');
    expect(markdown).toContain('Persists order to database');
  });

  it('should render visibility for exported entities', () => {
    const entity: Entity = {
      id: 'test-id',
      kind: 'function',
      name: 'publicFunc',
      path: 'src/api.ts',
      exported: true
    };

    const renderer = new MarkdownRenderer();
    const markdown = renderer.renderEntity(entity);

    expect(markdown).toContain('**Visibility:** Public (exported)');
  });

  it('should generate template prose for functions with "fetch" prefix', () => {
    const entity: Entity = {
      id: 'test-id',
      kind: 'function',
      name: 'fetchData',
      path: 'src/api.ts'
    };

    const renderer = new MarkdownRenderer();
    const markdown = renderer.renderEntity(entity);

    expect(markdown).toContain('retrieves data');
  });

  it('should generate template prose for functions with "save" prefix', () => {
    const entity: Entity = {
      id: 'test-id',
      kind: 'function',
      name: 'saveRecord',
      path: 'src/db.ts'
    };

    const renderer = new MarkdownRenderer();
    const markdown = renderer.renderEntity(entity);

    expect(markdown).toContain('persists data');
  });

  it('should generate template prose for functions with "validate" prefix', () => {
    const entity: Entity = {
      id: 'test-id',
      kind: 'function',
      name: 'validateInput',
      path: 'src/validation.ts'
    };

    const renderer = new MarkdownRenderer();
    const markdown = renderer.renderEntity(entity);

    expect(markdown).toContain('validates input');
  });

  it('should generate template prose for classes', () => {
    const entity: Entity = {
      id: 'test-id',
      kind: 'class',
      name: 'UserService',
      path: 'src/services/user.ts'
    };

    const renderer = new MarkdownRenderer();
    const markdown = renderer.renderEntity(entity);

    expect(markdown).toContain('represents');
  });

  it('should use ### for non-file entities', () => {
    const entity: Entity = {
      id: 'test-id',
      kind: 'function',
      name: 'myFunc',
      path: 'src/test.ts'
    };

    const renderer = new MarkdownRenderer();
    const markdown = renderer.renderEntity(entity);

    expect(markdown).toContain('### myFunc');
  });

  it('should use ## for file entities', () => {
    const entity: Entity = {
      id: 'test-id',
      kind: 'file',
      name: 'users.ts',
      path: 'src/api/users.ts'
    };

    const renderer = new MarkdownRenderer();
    const markdown = renderer.renderEntity(entity);

    expect(markdown).toContain('## users.ts');
  });
});
