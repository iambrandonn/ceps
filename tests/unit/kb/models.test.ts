import { describe, it, expect } from 'vitest';
import { createEntity, createFactSet, createBehaviorChunk } from '../../../src/kb/models';
import { EntityKind, Confidence } from '../../../src/types';

describe('Entity Model', () => {
  it('should create a valid entity', () => {
    const entity = createEntity({
      id: 'test-id',
      kind: 'function',
      name: 'fetchUser',
      path: 'src/api/users.ts',
      signature: 'fetchUser(id: string): Promise<User>',
      visibility: 'public',
      exported: true,
    });
    expect(entity.kind).toBe('function');
    expect(entity.exported).toBe(true);
  });

  it('should validate entity kind', () => {
    expect(() =>
      createEntity({
        id: 'test-id',
        kind: 'invalid-kind' as EntityKind,
        name: 'test',
        path: 'test.ts',
      })
    ).toThrow('Invalid entity kind: invalid-kind');
  });

  it('should normalize path separators to POSIX', () => {
    const entity = createEntity({
      id: 'test-id',
      kind: 'function',
      name: 'test',
      path: 'src\\api\\users.ts', // Windows path
    });
    expect(entity.path).toBe('src/api/users.ts');
  });
});

describe('FactSet Model', () => {
  it('should create a factSet with evidence score', () => {
    const factSet = createFactSet({
      id: 'factset-1',
      facts: [{ subjectId: 'entity-1', predicate: 'calls', object: 'entity-2' }],
      sources: [{ kind: 'ast', file: 'src/test.ts' }],
      evidenceScore: 75,
    });
    expect(factSet.evidenceScore).toBe(75);
  });

  it('should clamp evidence score to [0, 100]', () => {
    expect(() =>
      createFactSet({
        id: 'fs-1',
        facts: [],
        sources: [],
        evidenceScore: 150,
      })
    ).toThrow('evidenceScore must be between 0 and 100');
    expect(() =>
      createFactSet({
        id: 'fs-1',
        facts: [],
        sources: [],
        evidenceScore: -10,
      })
    ).toThrow('evidenceScore must be between 0 and 100');
  });
});

describe('BehaviorChunk Model', () => {
  it('should require at least one factSetId', () => {
    expect(() =>
      createBehaviorChunk({
        id: 'chunk-1',
        targetEntityId: 'entity-1',
        textDraft: 'This function does something',
        factSetIds: [], // Empty!
        confidence: 'High',
      })
    ).toThrow('BehaviorChunk must reference at least one factSet');
  });

  it('should validate confidence values', () => {
    const validConfidences: Confidence[] = ['High', 'Medium', 'Low'];
    validConfidences.forEach((conf) => {
      const chunk = createBehaviorChunk({
        id: 'chunk-1',
        targetEntityId: 'entity-1',
        textDraft: 'Test',
        factSetIds: ['factset-1'],
        confidence: conf,
      });
      expect(chunk.confidence).toBe(conf);
    });
  });
});
