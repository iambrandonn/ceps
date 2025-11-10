/**
 * Phase 6 Quality Improvement: Semantic Function Name Pattern Tests
 *
 * Enhances generic fallback descriptions by extracting semantic hints
 * from function names and parameter names.
 *
 * Target: Fix ~40 generic function descriptions in research-coi baseline
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SemanticFunctionPattern } from '../../src/reasoning/patterns/shared/semantic-function-names.js';
import { KnowledgeBase } from '../../src/kb/knowledge-base.js';
import { Entity, FactSet } from '../../src/kb/models.js';
import { PatternPriority } from '../../src/reasoning/patterns/types.js';

describe('SemanticFunctionPattern', () => {
  let kb: KnowledgeBase;
  let pattern: SemanticFunctionPattern;

  beforeEach(() => {
    kb = new KnowledgeBase();
    pattern = new SemanticFunctionPattern();
  });

  describe('module metadata', () => {
    it('has correct ID', () => {
      expect(pattern.id).toBe('shared.semantic-function-names');
    });

    it('has SHARED_PRIMITIVES priority', () => {
      expect(pattern.priority).toBe(PatternPriority.SHARED_PRIMITIVES);
    });
  });

  describe('matches()', () => {
    it('matches function with semantic name prefix (get)', () => {
      const entity: Entity = {
        id: 'fn-get',
        kind: 'function',
        name: 'getLatestDisclosure',
        path: 'model.js',
        exported: true,
      };
      kb.insertEntity(entity);

      expect(pattern.matches(kb, entity)).toBe(true);
    });

    it('matches function with semantic name prefix (is/has)', () => {
      const entity: Entity = {
        id: 'fn-is',
        kind: 'function',
        name: 'isHealthCheck',
        path: 'utils.js',
        exported: true,
      };
      kb.insertEntity(entity);

      expect(pattern.matches(kb, entity)).toBe(true);
    });

    it('matches function with semantic name prefix (update/create/delete)', () => {
      const entity: Entity = {
        id: 'fn-update',
        kind: 'function',
        name: 'updateContentProject',
        path: 'model.js',
        exported: true,
      };
      kb.insertEntity(entity);

      expect(pattern.matches(kb, entity)).toBe(true);
    });

    it('does not match function without semantic prefix', () => {
      const entity: Entity = {
        id: 'fn-plain',
        kind: 'function',
        name: 'doSomething',
        path: 'utils.js',
        exported: true,
      };
      kb.insertEntity(entity);

      expect(pattern.matches(kb, entity)).toBe(false);
    });

    it('does not match non-function entity', () => {
      const entity: Entity = {
        id: 'const-1',
        kind: 'constant',
        name: 'getValue',
        path: 'constants.js',
        exported: true,
      };
      kb.insertEntity(entity);

      expect(pattern.matches(kb, entity)).toBe(false);
    });
  });

  describe('describe() - retrieval patterns', () => {
    it('generates description for getXxx function', () => {
      const entity: Entity = {
        id: 'fn-get-user',
        kind: 'function',
        name: 'getLatestDisclosure',
        path: 'model.js',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-get-user',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
          { subjectId: entity.id, predicate: 'param-count', object: 1 },
          { subjectId: entity.id, predicate: 'param-names', object: 'userId' },
        ],
        sources: [],
        evidenceScore: 60,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].confidence).toBe('Medium');
      expect(chunks[0].textDraft).toContain('Retrieves');
      expect(chunks[0].textDraft).toContain('disclosure');
      expect(chunks[0].textDraft).toMatch(/user|userId/i);
      expect(chunks[0].textDraft).not.toContain('intent unclear');
    });

    it('generates description for findXxx function', () => {
      const entity: Entity = {
        id: 'fn-find',
        kind: 'function',
        name: 'findActiveProjects',
        path: 'queries.js',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-find',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
        ],
        sources: [],
        evidenceScore: 60,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].textDraft).toContain('Finds');
      expect(chunks[0].textDraft).toContain('projects');
      expect(chunks[0].textDraft).toMatch(/active/i);
    });

    it('generates description for fetchXxx function', () => {
      const entity: Entity = {
        id: 'fn-fetch',
        kind: 'function',
        name: 'fetchUserSettings',
        path: 'api.js',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-fetch',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
        ],
        sources: [],
        evidenceScore: 60,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].textDraft).toContain('Fetches');
      expect(chunks[0].textDraft).toMatch(/user.*setting|setting.*user/i);
    });
  });

  describe('describe() - validation patterns', () => {
    it('generates description for isXxx function', () => {
      const entity: Entity = {
        id: 'fn-is',
        kind: 'function',
        name: 'isHealthCheck',
        path: 'middleware.js',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-is',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
          { subjectId: entity.id, predicate: 'return-type', object: 'boolean' },
        ],
        sources: [],
        evidenceScore: 70,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].textDraft).toMatch(/Checks|Validates|Determines/);
      expect(chunks[0].textDraft).toContain('health check');
      expect(chunks[0].textDraft).toContain('*Note:'); // Has inference note
    });

    it('generates description for hasXxx function', () => {
      const entity: Entity = {
        id: 'fn-has',
        kind: 'function',
        name: 'hasPermission',
        path: 'auth.js',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-has',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
        ],
        sources: [],
        evidenceScore: 60,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].textDraft).toMatch(/Checks|Validates|Determines/);
      expect(chunks[0].textDraft).toContain('permission');
    });

    it('generates description for validateXxx function', () => {
      const entity: Entity = {
        id: 'fn-validate',
        kind: 'function',
        name: 'validateInput',
        path: 'validators.js',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-validate',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
        ],
        sources: [],
        evidenceScore: 60,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].textDraft).toMatch(/Validates/);
      expect(chunks[0].textDraft).toContain('input');
    });
  });

  describe('describe() - mutation patterns', () => {
    it('generates description for updateXxx function', () => {
      const entity: Entity = {
        id: 'fn-update',
        kind: 'function',
        name: 'updateContentProject',
        path: 'model.js',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-update',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
          { subjectId: entity.id, predicate: 'param-names', object: 'project,changes' },
        ],
        sources: [],
        evidenceScore: 60,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].textDraft).toMatch(/Updates|Modifies/);
      expect(chunks[0].textDraft).toContain('project');
      expect(chunks[0].textDraft).toMatch(/content/i);
    });

    it('generates description for createXxx function', () => {
      const entity: Entity = {
        id: 'fn-create',
        kind: 'function',
        name: 'createNotification',
        path: 'services.js',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-create',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
        ],
        sources: [],
        evidenceScore: 60,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].textDraft).toMatch(/Creates|Initializes/);
      expect(chunks[0].textDraft).toContain('notification');
    });

    it('generates description for deleteXxx/removeXxx function', () => {
      const entity: Entity = {
        id: 'fn-remove',
        kind: 'function',
        name: 'removeContentProject',
        path: 'model.js',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-remove',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
        ],
        sources: [],
        evidenceScore: 60,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].textDraft).toMatch(/Removes|Deletes/);
      expect(chunks[0].textDraft).toContain('project');
      expect(chunks[0].textDraft).toMatch(/content/i);
    });
  });

  describe('describe() - comparison/builder/transform patterns', () => {
    it('generates description for areXxx comparison function', () => {
      const entity: Entity = {
        id: 'fn-are',
        kind: 'function',
        name: 'areEconomicInterestsDifferent',
        path: 'comparisons.js',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-are',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
        ],
        sources: [],
        evidenceScore: 60,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].textDraft).toMatch(/Compares|Checks/);
      expect(chunks[0].textDraft).toContain('economic interests different');
    });

    it('generates description for makeXxx factory function', () => {
      const entity: Entity = {
        id: 'fn-make',
        kind: 'function',
        name: 'makeProjectId',
        path: 'factories.js',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-make',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
        ],
        sources: [],
        evidenceScore: 60,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].textDraft).toMatch(/Creates|Constructs/);
      expect(chunks[0].textDraft).toContain('project id');
    });

    it('generates description for buildXxx factory function', () => {
      const entity: Entity = {
        id: 'fn-build',
        kind: 'function',
        name: 'buildCache',
        path: 'factories.js',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-build',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
        ],
        sources: [],
        evidenceScore: 60,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].textDraft).toMatch(/Builds|Constructs/);
      expect(chunks[0].textDraft).toContain('cache');
    });

    it('generates description for trimXxx transform function', () => {
      const entity: Entity = {
        id: 'fn-trim',
        kind: 'function',
        name: 'trimFieldsBasedOnRole',
        path: 'transforms.js',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-trim',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
        ],
        sources: [],
        evidenceScore: 60,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].textDraft).toMatch(/Trims|Removes/);
      expect(chunks[0].textDraft).toContain('fields based on role');
    });

    it('generates description for populateXxx transform function', () => {
      const entity: Entity = {
        id: 'fn-populate',
        kind: 'function',
        name: 'populateProject',
        path: 'transforms.js',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-populate',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
        ],
        sources: [],
        evidenceScore: 60,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].textDraft).toMatch(/Populates|Fills/);
      expect(chunks[0].textDraft).toContain('project');
    });

    it('generates description for configureXxx setup function', () => {
      const entity: Entity = {
        id: 'fn-configure',
        kind: 'function',
        name: 'configureSecurity',
        path: 'setup.js',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-configure',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
        ],
        sources: [],
        evidenceScore: 60,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].textDraft).toMatch(/Configures|Sets up/);
      expect(chunks[0].textDraft).toContain('security');
    });

    it('generates description for logXxx logging function', () => {
      const entity: Entity = {
        id: 'fn-log',
        kind: 'function',
        name: 'logError',
        path: 'logging.js',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-log',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
        ],
        sources: [],
        evidenceScore: 60,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].textDraft).toMatch(/Logs|Records/);
      expect(chunks[0].textDraft).toContain('error');
    });
  });

  describe('confidence level', () => {
    it('uses Medium confidence for semantic hint descriptions', () => {
      const entity: Entity = {
        id: 'fn-1',
        kind: 'function',
        name: 'getUserProfile',
        path: 'users.js',
        exported: true,
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-1',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true },
        ],
        sources: [],
        evidenceScore: 60,
      };
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks[0].confidence).toBe('Medium');
    });
  });
});
