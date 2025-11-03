import { describe, it, expect } from 'vitest';
import { KnowledgeBase } from '../../src/kb/knowledge-base';
import { generateAnchor, generateQID } from '../../src/kb/id-generation';

describe('Phase 1 Smoke Test', () => {
  it('should create KB, insert entities, and generate IDs', () => {
    const kb = new KnowledgeBase();

    // Insert entity
    const entityId = generateAnchor('fetchUser', 'src/api/users.ts');
    kb.insertEntity({
      id: entityId,
      kind: 'function',
      name: 'fetchUser',
      path: 'src/api/users.ts',
      exported: true,
    });

    // Verify retrieval
    const entity = kb.getEntity(entityId);
    expect(entity).toBeDefined();
    expect(entity?.name).toBe('fetchUser');

    // Generate QID
    const qid = generateQID('src/api/users.ts', 'fetchUser', 'missing-return-type');
    expect(qid).toMatch(/^q:[a-zA-Z0-9]{10}$/);

    // Verify exported listing
    const exported = kb.listExported();
    expect(exported).toHaveLength(1);

    // Test batch operations
    kb.beginBatch();
    kb.insertEntity({
      id: 'temp-entity',
      kind: 'function',
      name: 'tempFunc',
      path: 'src/temp.ts',
    });
    kb.rollback();

    expect(kb.getEntity('temp-entity')).toBeUndefined(); // Should be rolled back
  });

  it('should handle multiple entities and path queries', () => {
    const kb = new KnowledgeBase();

    kb.insertEntity({ id: 'e1', kind: 'function', name: 'foo', path: 'src/api/users.ts' });
    kb.insertEntity({ id: 'e2', kind: 'class', name: 'UserService', path: 'src/api/users.ts' });
    kb.insertEntity({ id: 'e3', kind: 'function', name: 'bar', path: 'src/utils/helpers.ts' });

    const usersEntities = kb.findByPath('src/api/users.ts');
    expect(usersEntities).toHaveLength(2);

    const helpersEntities = kb.findByPath('src/utils/helpers.ts');
    expect(helpersEntities).toHaveLength(1);
  });

  it('should allocate and validate QIDs', () => {
    const kb = new KnowledgeBase();

    const qid1 = kb.allocateQID('src/test.ts', 'foo', 'missing-type');
    expect(qid1).toMatch(/^q:[a-zA-Z0-9]{10}$/);
    expect(kb.validateQIDUniqueness(qid1)).toBe(false); // Already allocated

    const qid2 = kb.allocateQID('src/test.ts', 'bar', 'missing-type');
    expect(qid2).not.toBe(qid1); // Different entity → different QID
  });
});
