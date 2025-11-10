/**
 * Phase 6 Quality Improvement: Constant Value Inlining Pattern Tests
 *
 * Tests for detecting exported constant objects and inlining their values
 * into the generated spec to eliminate "intent unclear" descriptions.
 *
 * Target: Fix 209 Low-confidence constants in research-coi baseline
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConstantInliningPattern } from '../../src/reasoning/patterns/shared/constant-inlining.js';
import { KnowledgeBase } from '../../src/kb/knowledge-base.js';
import { Entity, FactSet } from '../../src/kb/models.js';
import { PatternPriority } from '../../src/reasoning/patterns/types.js';

describe('ConstantInliningPattern', () => {
  let kb: KnowledgeBase;
  let pattern: ConstantInliningPattern;

  beforeEach(() => {
    kb = new KnowledgeBase();
    pattern = new ConstantInliningPattern();
  });

  describe('module metadata', () => {
    it('has correct ID', () => {
      expect(pattern.id).toBe('shared.constant-inlining');
    });

    it('has SHARED_PRIMITIVES priority', () => {
      expect(pattern.priority).toBe(PatternPriority.SHARED_PRIMITIVES);
    });
  });

  describe('matches()', () => {
    it('matches constant with object initializer', () => {
      const entity: Entity = {
        id: 'const-1',
        kind: 'constant',
        name: 'STATUS',
        path: 'constants.js',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-1',
        facts: [
          { subjectId: entity.id, predicate: 'is-constant', object: true },
          { subjectId: entity.id, predicate: 'initializer', object: '{ PENDING: 1, APPROVED: 2 }' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      expect(pattern.matches(kb, entity)).toBe(true);
    });

    it('does not match constant without initializer', () => {
      const entity: Entity = {
        id: 'const-2',
        kind: 'constant',
        name: 'EMPTY',
        path: 'constants.js',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-2',
        facts: [
          { subjectId: entity.id, predicate: 'is-constant', object: true },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      expect(pattern.matches(kb, entity)).toBe(false);
    });

    it('does not match function entity', () => {
      const entity: Entity = {
        id: 'func-1',
        kind: 'function',
        name: 'doSomething',
        path: 'utils.js',
        exported: true,
      };
      kb.insertEntity(entity);

      expect(pattern.matches(kb, entity)).toBe(false);
    });
  });

  describe('describe() - numeric enums', () => {
    it('generates description for simple numeric enum', () => {
      const entity: Entity = {
        id: 'const-enum-1',
        kind: 'constant',
        name: 'DISCLOSURE_STATUS',
        path: 'constants.js',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-enum-1',
        facts: [
          { subjectId: entity.id, predicate: 'is-constant', object: true },
          {
            subjectId: entity.id,
            predicate: 'initializer',
            object: `{
  IN_PROGRESS: 1,
  SUBMITTED_FOR_APPROVAL: 2,
  UP_TO_DATE: 3,
  REVISION_REQUIRED: 4,
  EXPIRED: 5,
  RESUBMITTED: 6,
  UPDATE_REQUIRED: 7,
  RETURNED: 8,
  ARCHIVED: 9
}`
          },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].confidence).toBe('High');
      expect(chunks[0].textDraft).toContain('IN_PROGRESS');
      expect(chunks[0].textDraft).toContain('1');
      expect(chunks[0].textDraft).toContain('ARCHIVED');
      expect(chunks[0].textDraft).toContain('9');
      expect(chunks[0].textDraft).not.toContain('intent unclear');
      expect(chunks[0].textDraft).toMatch(/enumeration|enum/i);
    });

    it('truncates long enums (>10 keys)', () => {
      const entity: Entity = {
        id: 'const-large',
        kind: 'constant',
        name: 'LARGE_ENUM',
        path: 'constants.js',
        exported: true,
      };
      kb.insertEntity(entity);

      // Create enum with 15 keys
      const keys = Array.from({ length: 15 }, (_, i) => `  KEY_${i}: ${i}`).join(',\n');
      const factSet: FactSet = {
        id: 'fs-large',
        facts: [
          { subjectId: entity.id, predicate: 'is-constant', object: true },
          {
            subjectId: entity.id,
            predicate: 'initializer',
            object: `{\n${keys}\n}`
          },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].confidence).toBe('High');
      // Should show first few and truncate rest
      expect(chunks[0].textDraft).toContain('KEY_0');
      expect(chunks[0].textDraft).toMatch(/and \d+ more/i); // "and 10 more"
      // Should NOT list all 15
      expect(chunks[0].textDraft).not.toContain('KEY_14');
    });
  });

  describe('describe() - string constants', () => {
    it('generates description for string constant mapping', () => {
      const entity: Entity = {
        id: 'const-strings',
        kind: 'constant',
        name: 'ROLES',
        path: 'constants.js',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-strings',
        facts: [
          { subjectId: entity.id, predicate: 'is-constant', object: true },
          {
            subjectId: entity.id,
            predicate: 'initializer',
            object: `{
  ADMIN: 'admin',
  USER: 'user',
  REVIEWER: 'reviewer'
}`
          },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].confidence).toBe('High');
      expect(chunks[0].textDraft).toContain('ADMIN');
      expect(chunks[0].textDraft).toContain('admin');
      expect(chunks[0].textDraft).toContain('USER');
      expect(chunks[0].textDraft).toContain('user');
      expect(chunks[0].textDraft).not.toContain('intent unclear');
    });
  });

  describe('describe() - mixed types', () => {
    it('generates description for configuration object with mixed types', () => {
      const entity: Entity = {
        id: 'const-config',
        kind: 'constant',
        name: 'CONFIG',
        path: 'config.js',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-config',
        facts: [
          { subjectId: entity.id, predicate: 'is-constant', object: true },
          {
            subjectId: entity.id,
            predicate: 'initializer',
            object: `{
  MAX_SIZE: 1024,
  DEFAULT_NAME: 'unnamed',
  ENABLED: true
}`
          },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].confidence).toBe('High');
      expect(chunks[0].textDraft).toContain('MAX_SIZE');
      expect(chunks[0].textDraft).toContain('1024');
      expect(chunks[0].textDraft).toContain('DEFAULT_NAME');
      expect(chunks[0].textDraft).toContain('unnamed');
      expect(chunks[0].textDraft).toContain('ENABLED');
      expect(chunks[0].textDraft).toContain('true');
      expect(chunks[0].textDraft).toMatch(/configuration|config/i);
    });
  });

  describe('describe() - edge cases', () => {
    it('handles empty object', () => {
      const entity: Entity = {
        id: 'const-empty',
        kind: 'constant',
        name: 'EMPTY',
        path: 'constants.js',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-empty',
        facts: [
          { subjectId: entity.id, predicate: 'is-constant', object: true },
          { subjectId: entity.id, predicate: 'initializer', object: '{}' },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].confidence).toBe('High');
      expect(chunks[0].textDraft).toMatch(/empty|no properties/i);
      expect(chunks[0].textDraft).not.toContain('intent unclear');
    });

    it('handles object with comments in initializer', () => {
      const entity: Entity = {
        id: 'const-comments',
        kind: 'constant',
        name: 'STATUS_WITH_COMMENTS',
        path: 'constants.js',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-comments',
        facts: [
          { subjectId: entity.id, predicate: 'is-constant', object: true },
          {
            subjectId: entity.id,
            predicate: 'initializer',
            object: `{
  IN_PROGRESS: 1, // Admin: <not shown>
  SUBMITTED: 2, // Admin: Pending review
  APPROVED: 3 // Admin: Approved
}`
          },
        ],
        sources: [],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].confidence).toBe('High');
      // Should extract values despite comments
      expect(chunks[0].textDraft).toContain('IN_PROGRESS');
      expect(chunks[0].textDraft).toContain('1');
      expect(chunks[0].textDraft).toContain('APPROVED');
      expect(chunks[0].textDraft).toContain('3');
    });
  });
});
