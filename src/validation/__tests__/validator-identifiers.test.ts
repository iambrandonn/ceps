/**
 * Phase 4 WS-F1 Stage B: Identifier, Scope & Pronoun Validation Tests
 *
 * Tests for extracting identifiers from text and validating against KB.
 * Enforces "no new entities/relations" and pronoun resolution rules.
 *
 * TDD: Write ALL tests BEFORE implementation (Red phase).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IdentifierExtractor, extractIdentifiers } from '../identifier-extractor.js';
import { IdentifierValidator } from '../identifier-validator.js';
import { EntityNameIndex } from '../entity-name-index.js';
import { KnowledgeBase } from '../../kb/knowledge-base.js';
import { createEntity } from '../../kb/models.js';
import type { Entity, FactSet } from '../../kb/models.js';

describe('IdentifierExtractor', () => {
  describe('Backticked Identifiers', () => {
    it('should extract backticked identifier', () => {
      const text = 'The `UserService` validates credentials.';
      const identifiers = extractIdentifiers(text);

      expect(identifiers).toContain('UserService');
    });

    it('should extract multiple backticked identifiers', () => {
      const text = 'The `UserService` calls `validateUser` and `saveUser`.';
      const identifiers = extractIdentifiers(text);

      expect(identifiers).toContain('UserService');
      expect(identifiers).toContain('validateUser');
      expect(identifiers).toContain('saveUser');
    });

    it('should handle nested backticks gracefully', () => {
      const text = 'The `UserService` method `getUser` returns `{ id: string }`.';
      const identifiers = extractIdentifiers(text);

      expect(identifiers).toContain('UserService');
      expect(identifiers).toContain('getUser');
      // Object literal inside backticks should not be extracted as identifier
      expect(identifiers).not.toContain('id');
      expect(identifiers).not.toContain('string');
    });
  });

  describe('PascalCase Identifiers', () => {
    it('should extract PascalCase identifier from prose', () => {
      const text = 'UserService validates user credentials.';
      const identifiers = extractIdentifiers(text);

      expect(identifiers).toContain('UserService');
    });

    it('should extract multiple PascalCase identifiers', () => {
      const text = 'UserService calls AdminService and AuthService.';
      const identifiers = extractIdentifiers(text);

      expect(identifiers).toContain('UserService');
      expect(identifiers).toContain('AdminService');
      expect(identifiers).toContain('AuthService');
    });

    it('should not extract single capital letters', () => {
      const text = 'A UserService validates users.';
      const identifiers = extractIdentifiers(text);

      expect(identifiers).toContain('UserService');
      expect(identifiers).not.toContain('A');
    });
  });

  describe('camelCase Identifiers', () => {
    it('should extract camelCase identifier', () => {
      const text = 'The validateUser function checks credentials.';
      const identifiers = extractIdentifiers(text);

      expect(identifiers).toContain('validateUser');
    });

    it('should extract multiple camelCase identifiers', () => {
      const text = 'The validateUser calls saveUser and sendEmail.';
      const identifiers = extractIdentifiers(text);

      expect(identifiers).toContain('validateUser');
      expect(identifiers).toContain('saveUser');
      expect(identifiers).toContain('sendEmail');
    });

    it('should not extract common lowercase words', () => {
      const text = 'The function validates user credentials properly.';
      const identifiers = extractIdentifiers(text);

      // Should not extract pure lowercase words
      expect(identifiers).not.toContain('function');
      expect(identifiers).not.toContain('validates');
      expect(identifiers).not.toContain('user');
    });
  });

  describe('Dotted Path Identifiers', () => {
    it('should extract dotted path identifier', () => {
      const text = 'Calls UserService.validateUser to check credentials.';
      const identifiers = extractIdentifiers(text);

      expect(identifiers).toContain('UserService.validateUser');
    });

    it('should extract both dotted and simple identifiers', () => {
      const text = 'UserService calls UserService.validateUser.';
      const identifiers = extractIdentifiers(text);

      expect(identifiers).toContain('UserService');
      expect(identifiers).toContain('UserService.validateUser');
    });

    it('should handle deep dotted paths', () => {
      const text = 'Uses app.services.user.validate method.';
      const identifiers = extractIdentifiers(text);

      expect(identifiers).toContain('app.services.user.validate');
    });
  });

  describe('Code Block Exclusion', () => {
    it('should exclude identifiers in fenced code blocks', () => {
      const text = `
UserService validates users.

\`\`\`typescript
class FakeClass {
  fakeMethod() {}
}
\`\`\`

RealClass is used.
      `;

      const identifiers = extractIdentifiers(text);

      expect(identifiers).toContain('UserService');
      expect(identifiers).toContain('RealClass');
      // Should NOT extract from code block
      expect(identifiers).not.toContain('FakeClass');
      expect(identifiers).not.toContain('fakeMethod');
    });

    it('should handle multiple code blocks', () => {
      const text = `
RealService is used.

\`\`\`ts
class Fake1 {}
\`\`\`

AnotherReal is here.

\`\`\`js
class Fake2 {}
\`\`\`
      `;

      const identifiers = extractIdentifiers(text);

      expect(identifiers).toContain('RealService');
      expect(identifiers).toContain('AnotherReal');
      expect(identifiers).not.toContain('Fake1');
      expect(identifiers).not.toContain('Fake2');
    });
  });

  describe('Deduplication', () => {
    it('should deduplicate identifiers', () => {
      const text = 'UserService calls UserService.validateUser. UserService is important.';
      const identifiers = extractIdentifiers(text);

      // Should only include each identifier once
      const userServiceCount = identifiers.filter(id => id === 'UserService').length;
      expect(userServiceCount).toBe(1);
    });

    it('should preserve order while deduplicating', () => {
      const text = 'UserService AdminService UserService ConfigService AdminService';
      const identifiers = extractIdentifiers(text);

      // First occurrence order should be preserved
      expect(identifiers.indexOf('UserService')).toBeLessThan(identifiers.indexOf('AdminService'));
      expect(identifiers.indexOf('AdminService')).toBeLessThan(identifiers.indexOf('ConfigService'));
    });
  });
});

describe('IdentifierValidator', () => {
  let kb: KnowledgeBase;
  let validator: IdentifierValidator;
  let entities: Entity[];

  beforeEach(() => {
    kb = new KnowledgeBase();

    // Create sample entities
    entities = [
      createEntity({
        id: 'class-UserService',
        kind: 'class',
        name: 'UserService',
        path: 'src/services/user-service.ts',
        exported: true,
      }),
      createEntity({
        id: 'method-validateUser',
        kind: 'method',
        name: 'validateUser',
        path: 'src/services/user-service.ts',
        exported: false,
      }),
      createEntity({
        id: 'func-saveUser',
        kind: 'function',
        name: 'saveUser',
        path: 'src/users.ts',
        exported: true,
      }),
    ];

    entities.forEach(e => kb.insertEntity(e));

    // Create factSet for UserService
    const factSet: FactSet = {
      id: 'fs-user-service',
      facts: [
        { subjectId: 'class-UserService', predicate: 'has-method', object: 'validateUser' },
      ],
      sources: [{ kind: 'ast', file: 'src/services/user-service.ts' }],
      evidenceScore: 90,
    };
    kb.insertFactSet(factSet);

    // Add call relation: UserService calls saveUser
    kb.insertRelation({
      subjectId: 'class-UserService',
      predicate: 'calls',
      objectId: 'func-saveUser',
      details: { resolved: true },
    });

    validator = new IdentifierValidator(kb);
  });

  describe('KB Lookup - Exact Name', () => {
    it('should resolve exact entity name', () => {
      const result = validator.validate(['UserService'], ['fs-user-service']);

      expect(result.valid).toBe(true);
      expect(result.diagnostics).toHaveLength(0);
    });

    it('should resolve multiple valid identifiers', () => {
      const result = validator.validate(['UserService', 'saveUser'], ['fs-user-service']);

      expect(result.valid).toBe(true);
      expect(result.diagnostics).toHaveLength(0);
    });
  });

  describe('KB Lookup - Unknown Name', () => {
    it('should reject unknown entity name', () => {
      const result = validator.validate(['AdminService'], ['fs-user-service']);

      expect(result.valid).toBe(false);
      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0].rule).toBe('entity');
      expect(result.diagnostics[0].reason).toContain('AdminService');
      expect(result.diagnostics[0].reason).toContain('not found');
    });

    it('should collect multiple unknown entities', () => {
      const result = validator.validate(['Unknown1', 'Unknown2'], ['fs-user-service']);

      expect(result.valid).toBe(false);
      expect(result.diagnostics).toHaveLength(2);
      expect(result.diagnostics[0].reason).toContain('Unknown1');
      expect(result.diagnostics[1].reason).toContain('Unknown2');
    });
  });

  describe('Scope Validation - FactSet Boundary', () => {
    it('should reject entity outside declared factSetIds', () => {
      // Create another entity NOT in fs-user-service
      const otherEntity = createEntity({
        id: 'class-AdminService',
        kind: 'class',
        name: 'AdminService',
        path: 'src/services/admin-service.ts',
        exported: true,
      });
      kb.insertEntity(otherEntity);

      const otherFactSet: FactSet = {
        id: 'fs-admin-service',
        facts: [
          { subjectId: 'class-AdminService', predicate: 'has-method', object: 'adminMethod' },
        ],
        sources: [{ kind: 'ast', file: 'src/services/admin-service.ts' }],
        evidenceScore: 90,
      };
      kb.insertFactSet(otherFactSet);

      // Validate AdminService with factSetIds that don't include it
      const result = validator.validate(['AdminService'], ['fs-user-service']);

      expect(result.valid).toBe(false);
      expect(result.diagnostics[0].rule).toBe('scope');
      expect(result.diagnostics[0].reason).toContain('AdminService');
      expect(result.diagnostics[0].reason).toContain('outside declared factSetIds');
    });

    it('should accept entity within multiple factSets', () => {
      // Add UserService to another factSet
      const factSet2: FactSet = {
        id: 'fs-auth',
        facts: [
          { subjectId: 'class-UserService', predicate: 'validates', object: 'credentials' },
        ],
        sources: [{ kind: 'ast', file: 'src/auth.ts' }],
        evidenceScore: 80,
      };
      kb.insertFactSet(factSet2);

      // Should pass if entity is in ANY of the declared factSetIds
      const result = validator.validate(['UserService'], ['fs-user-service', 'fs-auth']);

      expect(result.valid).toBe(true);
    });
  });

  describe('Relation Validation', () => {
    it('should detect missing call relation', () => {
      // UserService -> saveUser relation exists
      // UserService -> validateUser is a method (should pass)
      // UserService -> unknownFunction does NOT exist

      // Create unknownFunction entity but no relation
      const unknownFunc = createEntity({
        id: 'func-unknown',
        kind: 'function',
        name: 'unknownFunction',
        path: 'src/unknown.ts',
        exported: true,
      });
      kb.insertEntity(unknownFunc);

      const result = validator.validateRelations(
        'class-UserService',
        ['unknownFunction'],
        ['fs-user-service']
      );

      expect(result.valid).toBe(false);
      expect(result.diagnostics[0].rule).toBe('relation');
      expect(result.diagnostics[0].reason).toContain('unknownFunction');
      expect(result.diagnostics[0].reason).toContain('not observed in call graph');
    });
  });

  describe('Pronoun Resolution', () => {
    it('should accept pronoun with valid antecedent', () => {
      const text = 'UserService validates credentials. It also checks permissions.';

      const result = validator.validatePronouns(text);

      expect(result.valid).toBe(true);
      expect(result.diagnostics).toHaveLength(0);
    });

    it('should reject pronoun without antecedent', () => {
      const text = 'It validates credentials.'; // No antecedent

      const result = validator.validatePronouns(text);

      expect(result.valid).toBe(false);
      expect(result.diagnostics[0].rule).toBe('pronoun');
      expect(result.diagnostics[0].reason).toContain('without antecedent');
    });

    it('should accept pronoun within 2 sentences of antecedent', () => {
      const text = 'UserService validates credentials. The service checks permissions. It logs results.';

      const result = validator.validatePronouns(text);

      expect(result.valid).toBe(true);
    });

    it('should handle multiple pronouns correctly', () => {
      const text = 'UserService validates credentials. It checks permissions. They are logged.';

      const result = validator.validatePronouns(text);

      // "It" is valid (refers to UserService)
      // "They" is invalid (no plural antecedent)
      expect(result.valid).toBe(false);
      expect(result.diagnostics.some(d => d.reason.includes('They'))).toBe(true);
    });
  });

  describe('Mixed Valid/Invalid', () => {
    it('should reject when any identifier is invalid', () => {
      const result = validator.validate(
        ['UserService', 'UnknownService', 'saveUser'],
        ['fs-user-service']
      );

      expect(result.valid).toBe(false);
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.diagnostics.some(d => d.reason.includes('UnknownService'))).toBe(true);
    });

    it('should collect all validation errors', () => {
      const result = validator.validate(
        ['Unknown1', 'Unknown2', 'Unknown3'],
        ['fs-user-service']
      );

      expect(result.valid).toBe(false);
      expect(result.diagnostics).toHaveLength(3);
    });
  });
});
