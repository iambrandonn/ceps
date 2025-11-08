/**
 * Phase 6 I4: MongooseSchemaPattern Unit Tests
 *
 * Tests schema detection and field extraction with polluted datasets.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MongooseSchemaPattern } from '../../src/reasoning/patterns/express/mongoose-schema.js';
import { KnowledgeBase } from '../../src/kb/knowledge-base.js';
import { Entity, FactSet } from '../../src/kb/models.js';

describe('MongooseSchemaPattern', () => {
  let pattern: MongooseSchemaPattern;
  let kb: KnowledgeBase;

  beforeEach(() => {
    pattern = new MongooseSchemaPattern();
    kb = new KnowledgeBase();
  });

  describe('matches()', () => {
    it('should match constant with new Schema() initializer', () => {
      const entity: Entity = {
        id: 'userSchema-1',
        kind: 'constant',
        name: 'userSchema',
        path: '/test/User.ts',
        exported: false,
        visibility: 'internal',
      };

      const factSet: FactSet = {
        id: 'userSchema-1-facts',
        facts: [
          { subjectId: 'userSchema-1', predicate: 'is-constant', object: true },
          {
            subjectId: 'userSchema-1',
            predicate: 'initializer',
            object: 'new Schema({ name: String, email: String })',
          },
        ],
        sources: [{ kind: 'ast', file: '/test/User.ts' }],
        evidenceScore: 60,
      };

      kb.insertEntity(entity);
      kb.insertFactSet(factSet);

      expect(pattern.matches(kb, entity)).toBe(true);
    });

    it('should match constant with new mongoose.Schema() initializer', () => {
      const entity: Entity = {
        id: 'postSchema-1',
        kind: 'constant',
        name: 'postSchema',
        path: '/test/Post.ts',
        exported: false,
        visibility: 'internal',
      };

      const factSet: FactSet = {
        id: 'postSchema-1-facts',
        facts: [
          { subjectId: 'postSchema-1', predicate: 'is-constant', object: true },
          {
            subjectId: 'postSchema-1',
            predicate: 'initializer',
            object: 'new mongoose.Schema({ title: String })',
          },
        ],
        sources: [{ kind: 'ast', file: '/test/Post.ts' }],
        evidenceScore: 60,
      };

      kb.insertEntity(entity);
      kb.insertFactSet(factSet);

      expect(pattern.matches(kb, entity)).toBe(true);
    });

    it('should NOT match constant without Schema initializer', () => {
      const entity: Entity = {
        id: 'config-1',
        kind: 'constant',
        name: 'config',
        path: '/test/config.ts',
        exported: false,
        visibility: 'internal',
      };

      const factSet: FactSet = {
        id: 'config-1-facts',
        facts: [
          { subjectId: 'config-1', predicate: 'is-constant', object: true },
          {
            subjectId: 'config-1',
            predicate: 'initializer',
            object: '{ port: 3000 }',
          },
        ],
        sources: [{ kind: 'ast', file: '/test/config.ts' }],
        evidenceScore: 60,
      };

      kb.insertEntity(entity);
      kb.insertFactSet(factSet);

      expect(pattern.matches(kb, entity)).toBe(false);
    });

    it('should NOT match function entities', () => {
      const entity: Entity = {
        id: 'getUser-1',
        kind: 'function',
        name: 'getUser',
        path: '/test/users.ts',
        exported: false,
        visibility: 'internal',
      };

      kb.insertEntity(entity);

      expect(pattern.matches(kb, entity)).toBe(false);
    });

    it('should NOT match model definition (mongoose.model)', () => {
      const entity: Entity = {
        id: 'User-1',
        kind: 'constant',
        name: 'User',
        path: '/test/User.ts',
        exported: true,
        visibility: 'public',
      };

      const factSet: FactSet = {
        id: 'User-1-facts',
        facts: [
          { subjectId: 'User-1', predicate: 'is-constant', object: true },
          {
            subjectId: 'User-1',
            predicate: 'initializer',
            object: "mongoose.model('User', userSchema)",
          },
          {
            subjectId: 'User-1',
            predicate: 'initializer-call',
            object: 'mongoose.model',
          },
        ],
        sources: [{ kind: 'ast', file: '/test/User.ts' }],
        evidenceScore: 60,
      };

      kb.insertEntity(entity);
      kb.insertFactSet(factSet);

      expect(pattern.matches(kb, entity)).toBe(false);
    });
  });

  describe('describe()', () => {
    it('should describe schema with simple fields', () => {
      const entity: Entity = {
        id: 'userSchema-1',
        kind: 'constant',
        name: 'userSchema',
        path: '/test/User.ts',
        exported: false,
        visibility: 'internal',
      };

      const factSet: FactSet = {
        id: 'userSchema-1-facts',
        facts: [
          { subjectId: 'userSchema-1', predicate: 'is-constant', object: true },
          {
            subjectId: 'userSchema-1',
            predicate: 'initializer',
            object: 'new Schema({ name: String, email: String, age: Number })',
          },
        ],
        sources: [{ kind: 'ast', file: '/test/User.ts' }],
        evidenceScore: 60,
      };

      kb.insertEntity(entity);
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].targetEntityId).toBe('userSchema-1');
      expect(chunks[0].textDraft).toContain('Mongoose schema userSchema');
      expect(chunks[0].textDraft).toContain('name');
      expect(chunks[0].textDraft).toContain('email');
      expect(chunks[0].textDraft).toContain('age');
      expect(chunks[0].confidence).toBe('High');
    });

    it('should describe schema with required fields', () => {
      const entity: Entity = {
        id: 'userSchema-1',
        kind: 'constant',
        name: 'userSchema',
        path: '/test/User.ts',
        exported: false,
        visibility: 'internal',
      };

      const factSet: FactSet = {
        id: 'userSchema-1-facts',
        facts: [
          { subjectId: 'userSchema-1', predicate: 'is-constant', object: true },
          {
            subjectId: 'userSchema-1',
            predicate: 'initializer',
            object: 'new Schema({ name: { type: String, required: true }, email: { type: String, required: true } })',
          },
        ],
        sources: [{ kind: 'ast', file: '/test/User.ts' }],
        evidenceScore: 60,
      };

      kb.insertEntity(entity);
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].textDraft).toContain('name (required)');
      expect(chunks[0].textDraft).toContain('email (required)');
      expect(chunks[0].confidence).toBe('High');
    });

    it('should describe schema with references', () => {
      const entity: Entity = {
        id: 'postSchema-1',
        kind: 'constant',
        name: 'postSchema',
        path: '/test/Post.ts',
        exported: false,
        visibility: 'internal',
      };

      const factSet: FactSet = {
        id: 'postSchema-1-facts',
        facts: [
          { subjectId: 'postSchema-1', predicate: 'is-constant', object: true },
          {
            subjectId: 'postSchema-1',
            predicate: 'initializer',
            object: "new Schema({ title: String, author: { type: Schema.Types.ObjectId, ref: 'User' } })",
          },
        ],
        sources: [{ kind: 'ast', file: '/test/Post.ts' }],
        evidenceScore: 60,
      };

      kb.insertEntity(entity);
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].textDraft).toContain('author → User');
      expect(chunks[0].confidence).toBe('High');
    });

    it('should describe schema with array references', () => {
      const entity: Entity = {
        id: 'userSchema-1',
        kind: 'constant',
        name: 'userSchema',
        path: '/test/User.ts',
        exported: false,
        visibility: 'internal',
      };

      const factSet: FactSet = {
        id: 'userSchema-1-facts',
        facts: [
          { subjectId: 'userSchema-1', predicate: 'is-constant', object: true },
          {
            subjectId: 'userSchema-1',
            predicate: 'initializer',
            object: "new Schema({ name: String, posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }] })",
          },
        ],
        sources: [{ kind: 'ast', file: '/test/User.ts' }],
        evidenceScore: 60,
      };

      kb.insertEntity(entity);
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].textDraft).toContain('posts → Post');
      expect(chunks[0].confidence).toBe('High');
    });

    it('should handle complex nested schema with Medium confidence', () => {
      const entity: Entity = {
        id: 'complexSchema-1',
        kind: 'constant',
        name: 'complexSchema',
        path: '/test/Complex.ts',
        exported: false,
        visibility: 'internal',
      };

      // Very long schema (>1000 chars)
      const longInitializer = 'new Schema({ ' + 'field: String, '.repeat(100) + ' })';

      const factSet: FactSet = {
        id: 'complexSchema-1-facts',
        facts: [
          { subjectId: 'complexSchema-1', predicate: 'is-constant', object: true },
          {
            subjectId: 'complexSchema-1',
            predicate: 'initializer',
            object: longInitializer,
          },
        ],
        sources: [{ kind: 'ast', file: '/test/Complex.ts' }],
        evidenceScore: 60,
      };

      kb.insertEntity(entity);
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].confidence).toBe('Medium'); // Complex nesting
    });

    it('should return empty for non-matching entity', () => {
      const entity: Entity = {
        id: 'config-1',
        kind: 'constant',
        name: 'config',
        path: '/test/config.ts',
        exported: false,
        visibility: 'internal',
      };

      const factSet: FactSet = {
        id: 'config-1-facts',
        facts: [
          { subjectId: 'config-1', predicate: 'is-constant', object: true },
          {
            subjectId: 'config-1',
            predicate: 'initializer',
            object: '{ port: 3000 }',
          },
        ],
        sources: [{ kind: 'ast', file: '/test/config.ts' }],
        evidenceScore: 60,
      };

      kb.insertEntity(entity);
      kb.insertFactSet(factSet);

      const chunks = pattern.describe(kb, entity);

      expect(chunks).toHaveLength(0);
    });
  });

  describe('confidenceAdjustments()', () => {
    it('should return +10 adjustment for matching schema', () => {
      const entity: Entity = {
        id: 'userSchema-1',
        kind: 'constant',
        name: 'userSchema',
        path: '/test/User.ts',
        exported: false,
        visibility: 'internal',
      };

      const factSet: FactSet = {
        id: 'userSchema-1-facts',
        facts: [
          { subjectId: 'userSchema-1', predicate: 'is-constant', object: true },
          {
            subjectId: 'userSchema-1',
            predicate: 'initializer',
            object: 'new Schema({ name: String })',
          },
        ],
        sources: [{ kind: 'ast', file: '/test/User.ts' }],
        evidenceScore: 60,
      };

      kb.insertEntity(entity);
      kb.insertFactSet(factSet);

      const adjustment = pattern.confidenceAdjustments(kb, entity);

      expect(adjustment).toBeDefined();
      expect(adjustment?.adjustment).toBe(10);
      expect(adjustment?.reason).toContain('Mongoose Schema pattern');
    });

    it('should return undefined for non-matching entity', () => {
      const entity: Entity = {
        id: 'config-1',
        kind: 'constant',
        name: 'config',
        path: '/test/config.ts',
        exported: false,
        visibility: 'internal',
      };

      const adjustment = pattern.confidenceAdjustments(kb, entity);

      expect(adjustment).toBeUndefined();
    });
  });

  describe('Polluted Dataset Tests', () => {
    it('should correctly identify schema among multiple constants', () => {
      // Add multiple constants: schemas, models, configs
      const userSchema: Entity = {
        id: 'userSchema-1',
        kind: 'constant',
        name: 'userSchema',
        path: '/test/models.ts',
        exported: false,
        visibility: 'internal',
      };

      const postSchema: Entity = {
        id: 'postSchema-1',
        kind: 'constant',
        name: 'postSchema',
        path: '/test/models.ts',
        exported: false,
        visibility: 'internal',
      };

      const User: Entity = {
        id: 'User-1',
        kind: 'constant',
        name: 'User',
        path: '/test/models.ts',
        exported: true,
        visibility: 'public',
      };

      const config: Entity = {
        id: 'config-1',
        kind: 'constant',
        name: 'config',
        path: '/test/models.ts',
        exported: false,
        visibility: 'internal',
      };

      kb.insertEntity(userSchema);
      kb.insertEntity(postSchema);
      kb.insertEntity(User);
      kb.insertEntity(config);

      kb.insertFactSet({
        id: 'userSchema-1-facts',
        facts: [
          { subjectId: 'userSchema-1', predicate: 'is-constant', object: true },
          { subjectId: 'userSchema-1', predicate: 'initializer', object: 'new Schema({ name: String })' },
        ],
        sources: [{ kind: 'ast', file: '/test/models.ts' }],
        evidenceScore: 60,
      });

      kb.insertFactSet({
        id: 'postSchema-1-facts',
        facts: [
          { subjectId: 'postSchema-1', predicate: 'is-constant', object: true },
          { subjectId: 'postSchema-1', predicate: 'initializer', object: 'new Schema({ title: String })' },
        ],
        sources: [{ kind: 'ast', file: '/test/models.ts' }],
        evidenceScore: 60,
      });

      kb.insertFactSet({
        id: 'User-1-facts',
        facts: [
          { subjectId: 'User-1', predicate: 'is-constant', object: true },
          { subjectId: 'User-1', predicate: 'initializer', object: "mongoose.model('User', userSchema)" },
          { subjectId: 'User-1', predicate: 'initializer-call', object: 'mongoose.model' },
        ],
        sources: [{ kind: 'ast', file: '/test/models.ts' }],
        evidenceScore: 60,
      });

      kb.insertFactSet({
        id: 'config-1-facts',
        facts: [
          { subjectId: 'config-1', predicate: 'is-constant', object: true },
          { subjectId: 'config-1', predicate: 'initializer', object: '{ port: 3000 }' },
        ],
        sources: [{ kind: 'ast', file: '/test/models.ts' }],
        evidenceScore: 60,
      });

      // Positive assertions: schemas match
      expect(pattern.matches(kb, userSchema)).toBe(true);
      expect(pattern.matches(kb, postSchema)).toBe(true);

      // Negative assertions: models and config don't match
      expect(pattern.matches(kb, User)).toBe(false);
      expect(pattern.matches(kb, config)).toBe(false);

      // Verify descriptions are separate
      const userChunks = pattern.describe(kb, userSchema);
      const postChunks = pattern.describe(kb, postSchema);

      expect(userChunks[0].textDraft).toContain('userSchema');
      expect(userChunks[0].textDraft).not.toContain('postSchema');
      expect(userChunks[0].textDraft).not.toContain('title');

      expect(postChunks[0].textDraft).toContain('postSchema');
      expect(postChunks[0].textDraft).not.toContain('userSchema');
      expect(postChunks[0].textDraft).not.toContain('name');
    });
  });
});
