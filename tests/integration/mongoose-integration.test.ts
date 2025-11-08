/**
 * Phase 6 I4: Mongoose Integration Tests
 *
 * End-to-end tests for Mongoose patterns with KB chunk assertions.
 * Tests schema → model → query linking across the reasoning pipeline.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeBase } from '../../src/kb/knowledge-base.js';
import { Entity, FactSet } from '../../src/kb/models.js';
import { PatternRegistry } from '../../src/reasoning/patterns/pattern-registry.js';
import { MongooseSchemaPattern } from '../../src/reasoning/patterns/express/mongoose-schema.js';
import { MongooseModelPattern } from '../../src/reasoning/patterns/express/mongoose-model.js';
import { MongooseQueryPattern } from '../../src/reasoning/patterns/express/mongoose-query.js';

describe('Mongoose Integration', () => {
  let kb: KnowledgeBase;
  let registry: PatternRegistry;

  beforeEach(() => {
    kb = new KnowledgeBase();
    registry = new PatternRegistry();

    // Register Mongoose patterns
    registry.register(new MongooseSchemaPattern());
    registry.register(new MongooseModelPattern());
    registry.register(new MongooseQueryPattern());
  });

  describe('Schema → Model Linking', () => {
    it('should link model to schema and inherit field information', () => {
      // Create schema entity
      const userSchema: Entity = {
        id: 'userSchema-1',
        kind: 'constant',
        name: 'userSchema',
        path: '/models/User.ts',
        exported: false,
        visibility: 'internal',
      };

      const schemaFactSet: FactSet = {
        id: 'userSchema-1-facts',
        facts: [
          { subjectId: 'userSchema-1', predicate: 'is-constant', object: true },
          {
            subjectId: 'userSchema-1',
            predicate: 'initializer',
            object: 'new Schema({ name: String, email: { type: String, required: true }, age: Number })',
          },
        ],
        sources: [{ kind: 'ast', file: '/models/User.ts' }],
        evidenceScore: 60,
      };

      kb.insertEntity(userSchema);
      kb.insertFactSet(schemaFactSet);

      // Create model entity
      const User: Entity = {
        id: 'User-1',
        kind: 'constant',
        name: 'User',
        path: '/models/User.ts',
        exported: true,
        visibility: 'public',
      };

      const modelFactSet: FactSet = {
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
        sources: [{ kind: 'ast', file: '/models/User.ts' }],
        evidenceScore: 60,
      };

      kb.insertEntity(User);
      kb.insertFactSet(modelFactSet);

      // Process schema with pattern
      const schemaPattern = new MongooseSchemaPattern();
      const schemaChunks = schemaPattern.describe(kb, userSchema);

      // Store schema chunks in KB (simulating reasoning pipeline)
      for (const chunk of schemaChunks) {
        kb.insertChunk(chunk);
      }

      // Process model with pattern
      const modelPattern = new MongooseModelPattern();
      const modelChunks = modelPattern.describe(kb, User);

      // KB Chunk Assertions
      expect(schemaChunks).toHaveLength(1);
      expect(schemaChunks[0]).toMatchObject({
        targetEntityId: 'userSchema-1',
        confidence: 'High',
        factSetIds: ['userSchema-1-facts'],
      });
      expect(schemaChunks[0].textDraft).toContain('Mongoose schema userSchema');
      expect(schemaChunks[0].textDraft).toContain('name');
      expect(schemaChunks[0].textDraft).toContain('email (required)');
      expect(schemaChunks[0].textDraft).toContain('age');

      expect(modelChunks).toHaveLength(1);
      expect(modelChunks[0]).toMatchObject({
        targetEntityId: 'User-1',
        confidence: 'High',
        factSetIds: ['User-1-facts'],
      });
      expect(modelChunks[0].textDraft).toContain("Mongoose model User for collection 'User'");
      expect(modelChunks[0].textDraft).toContain('using schema userSchema');
      // Model should inherit field info from schema
      expect(modelChunks[0].textDraft).toContain('Supports fields');
    });

    it('should emit Medium confidence when schema reference not resolved', () => {
      // Model without corresponding schema
      const Post: Entity = {
        id: 'Post-1',
        kind: 'constant',
        name: 'Post',
        path: '/models/Post.ts',
        exported: true,
        visibility: 'public',
      };

      const factSet: FactSet = {
        id: 'Post-1-facts',
        facts: [
          { subjectId: 'Post-1', predicate: 'is-constant', object: true },
          {
            subjectId: 'Post-1',
            predicate: 'initializer',
            object: "mongoose.model('Post', postSchema)",
          },
          {
            subjectId: 'Post-1',
            predicate: 'initializer-call',
            object: 'mongoose.model',
          },
        ],
        sources: [{ kind: 'ast', file: '/models/Post.ts' }],
        evidenceScore: 60,
      };

      kb.insertEntity(Post);
      kb.insertFactSet(factSet);

      const pattern = new MongooseModelPattern();
      const chunks = pattern.describe(kb, Post);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].confidence).toBe('Medium'); // Schema not resolved
      expect(chunks[0].textDraft).toContain('not resolved');
    });
  });

  describe('Model → Query Linking', () => {
    it('should detect queries and link to model in route handlers', () => {
      // Create model entity
      const User: Entity = {
        id: 'User-1',
        kind: 'constant',
        name: 'User',
        path: '/models/User.ts',
        exported: true,
        visibility: 'public',
      };

      const userModelFactSet: FactSet = {
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
        sources: [{ kind: 'ast', file: '/models/User.ts' }],
        evidenceScore: 60,
      };

      kb.insertEntity(User);
      kb.insertFactSet(userModelFactSet);

      // Create router constant with query calls
      const usersRouter: Entity = {
        id: 'usersRouter-1',
        kind: 'constant',
        name: 'usersRouter',
        path: '/routes/users.ts',
        exported: true,
        visibility: 'public',
      };

      const routerFactSet: FactSet = {
        id: 'usersRouter-1-facts',
        facts: [
          { subjectId: 'usersRouter-1', predicate: 'is-constant', object: true },
          { subjectId: 'usersRouter-1', predicate: 'initializer-call', object: 'Router' },
          // Queries in route handlers
          { subjectId: 'usersRouter-1', predicate: 'calls-expression', object: 'User.find' },
          { subjectId: 'usersRouter-1', predicate: 'calls-expression', object: 'User.create' },
          { subjectId: 'usersRouter-1', predicate: 'calls-expression', object: 'User.findById' },
        ],
        sources: [{ kind: 'ast', file: '/routes/users.ts' }],
        evidenceScore: 60,
      };

      kb.insertEntity(usersRouter);
      kb.insertFactSet(routerFactSet);

      // Process with query pattern
      const queryPattern = new MongooseQueryPattern();
      const chunks = queryPattern.describe(kb, usersRouter);

      // KB Chunk Assertions
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toMatchObject({
        targetEntityId: 'usersRouter-1',
        confidence: 'High', // All models resolved
        factSetIds: ['usersRouter-1-facts'],
      });
      expect(chunks[0].textDraft).toContain('Performs Mongoose');
      expect(chunks[0].textDraft).toContain('read query (find)');
      expect(chunks[0].textDraft).toContain('write query (create)');
      expect(chunks[0].textDraft).toContain('read query (findById)');
    });

    it('should emit Low confidence when model reference not resolved', () => {
      // Router with query to unknown model
      const router: Entity = {
        id: 'router-1',
        kind: 'constant',
        name: 'router',
        path: '/routes/posts.ts',
        exported: true,
        visibility: 'public',
      };

      const factSet: FactSet = {
        id: 'router-1-facts',
        facts: [
          { subjectId: 'router-1', predicate: 'is-constant', object: true },
          { subjectId: 'router-1', predicate: 'initializer-call', object: 'Router' },
          { subjectId: 'router-1', predicate: 'calls-expression', object: 'UnknownModel.find' },
        ],
        sources: [{ kind: 'ast', file: '/routes/posts.ts' }],
        evidenceScore: 60,
      };

      kb.insertEntity(router);
      kb.insertFactSet(factSet);

      const pattern = new MongooseQueryPattern();
      const chunks = pattern.describe(kb, router);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].confidence).toBe('Low'); // Model not resolved
      expect(chunks[0].textDraft).toContain('model not resolved');
    });

    it('should NOT detect queries in non-matching entities', () => {
      // Router without Mongoose queries
      const router: Entity = {
        id: 'router-1',
        kind: 'constant',
        name: 'router',
        path: '/routes/users.ts',
        exported: true,
        visibility: 'public',
      };

      const factSet: FactSet = {
        id: 'router-1-facts',
        facts: [
          { subjectId: 'router-1', predicate: 'is-constant', object: true },
          { subjectId: 'router-1', predicate: 'initializer-call', object: 'Router' },
          { subjectId: 'router-1', predicate: 'calls-expression', object: 'res.json' },
          { subjectId: 'router-1', predicate: 'calls-expression', object: 'req.body' },
        ],
        sources: [{ kind: 'ast', file: '/routes/users.ts' }],
        evidenceScore: 60,
      };

      kb.insertEntity(router);
      kb.insertFactSet(factSet);

      const pattern = new MongooseQueryPattern();

      expect(pattern.matches(kb, router)).toBe(false);
      expect(pattern.describe(kb, router)).toHaveLength(0);
    });
  });

  describe('Full Pipeline: Schema → Model → Query', () => {
    it('should process complete Mongoose fixture with all patterns', () => {
      // Setup: Schema
      const userSchema: Entity = {
        id: 'userSchema-1',
        kind: 'constant',
        name: 'userSchema',
        path: '/models/User.ts',
        exported: false,
        visibility: 'internal',
      };

      kb.insertEntity(userSchema);
      kb.insertFactSet({
        id: 'userSchema-1-facts',
        facts: [
          { subjectId: 'userSchema-1', predicate: 'is-constant', object: true },
          {
            subjectId: 'userSchema-1',
            predicate: 'initializer',
            object: 'new Schema({ name: String, email: String, posts: [{ type: Schema.Types.ObjectId, ref: "Post" }] })',
          },
        ],
        sources: [{ kind: 'ast', file: '/models/User.ts' }],
        evidenceScore: 60,
      });

      // Setup: Model
      const User: Entity = {
        id: 'User-1',
        kind: 'constant',
        name: 'User',
        path: '/models/User.ts',
        exported: true,
        visibility: 'public',
      };

      kb.insertEntity(User);
      kb.insertFactSet({
        id: 'User-1-facts',
        facts: [
          { subjectId: 'User-1', predicate: 'is-constant', object: true },
          { subjectId: 'User-1', predicate: 'initializer', object: "mongoose.model('User', userSchema)" },
          { subjectId: 'User-1', predicate: 'initializer-call', object: 'mongoose.model' },
        ],
        sources: [{ kind: 'ast', file: '/models/User.ts' }],
        evidenceScore: 60,
      });

      // Setup: Router with queries
      const usersRouter: Entity = {
        id: 'usersRouter-1',
        kind: 'constant',
        name: 'usersRouter',
        path: '/routes/users.ts',
        exported: true,
        visibility: 'public',
      };

      kb.insertEntity(usersRouter);
      kb.insertFactSet({
        id: 'usersRouter-1-facts',
        facts: [
          { subjectId: 'usersRouter-1', predicate: 'is-constant', object: true },
          { subjectId: 'usersRouter-1', predicate: 'initializer-call', object: 'Router' },
          { subjectId: 'usersRouter-1', predicate: 'calls-expression', object: 'User.find' },
          { subjectId: 'usersRouter-1', predicate: 'calls-expression', object: 'User.create' },
        ],
        sources: [{ kind: 'ast', file: '/routes/users.ts' }],
        evidenceScore: 60,
      });

      // Process all entities with patterns
      const allEntities = kb.getAllEntities();
      const allChunks: any[] = [];

      const schemaPattern = new MongooseSchemaPattern();
      const modelPattern = new MongooseModelPattern();
      const queryPattern = new MongooseQueryPattern();

      for (const entity of allEntities) {
        // Try schema pattern
        if (schemaPattern.matches(kb, entity)) {
          const chunks = schemaPattern.describe(kb, entity);
          for (const chunk of chunks) {
            kb.insertChunk(chunk);
            allChunks.push(chunk);
          }
        }

        // Try model pattern
        if (modelPattern.matches(kb, entity)) {
          const chunks = modelPattern.describe(kb, entity);
          for (const chunk of chunks) {
            kb.insertChunk(chunk);
            allChunks.push(chunk);
          }
        }

        // Try query pattern
        if (queryPattern.matches(kb, entity)) {
          const chunks = queryPattern.describe(kb, entity);
          for (const chunk of chunks) {
            kb.insertChunk(chunk);
            allChunks.push(chunk);
          }
        }
      }

      // Assertions: Should have 3 chunks (schema, model, queries)
      expect(allChunks).toHaveLength(3);

      // Schema chunk
      const schemaChunk = allChunks.find(c => c.targetEntityId === 'userSchema-1');
      expect(schemaChunk).toBeDefined();
      expect(schemaChunk.textDraft).toContain('Mongoose schema userSchema');
      expect(schemaChunk.textDraft).toContain('posts → Post');
      expect(schemaChunk.confidence).toBe('High');

      // Model chunk
      const modelChunk = allChunks.find(c => c.targetEntityId === 'User-1');
      expect(modelChunk).toBeDefined();
      expect(modelChunk.textDraft).toContain('Mongoose model User');
      expect(modelChunk.textDraft).toContain('using schema userSchema');
      expect(modelChunk.confidence).toBe('High');

      // Query chunk
      const queryChunk = allChunks.find(c => c.targetEntityId === 'usersRouter-1');
      expect(queryChunk).toBeDefined();
      expect(queryChunk.textDraft).toContain('Performs Mongoose');
      expect(queryChunk.textDraft).toContain('read query (find)');
      expect(queryChunk.textDraft).toContain('write query (create)');
      expect(queryChunk.confidence).toBe('High');

      // Negative assertion: No chunks for unrelated entities
      allChunks.forEach(chunk => {
        expect(chunk.textDraft).not.toContain('undefined');
        expect(chunk.textDraft).not.toContain('null');
        expect(chunk.factSetIds.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Polluted Dataset: Multiple Models and Routes', () => {
    it('should correctly separate behaviors for multiple models', () => {
      // Add User model + schema
      kb.insertEntity({
        id: 'userSchema-1',
        kind: 'constant',
        name: 'userSchema',
        path: '/models.ts',
        exported: false,
        visibility: 'internal',
      });

      kb.insertFactSet({
        id: 'userSchema-1-facts',
        facts: [
          { subjectId: 'userSchema-1', predicate: 'is-constant', object: true },
          { subjectId: 'userSchema-1', predicate: 'initializer', object: 'new Schema({ name: String })' },
        ],
        sources: [{ kind: 'ast', file: '/models.ts' }],
        evidenceScore: 60,
      });

      kb.insertEntity({
        id: 'User-1',
        kind: 'constant',
        name: 'User',
        path: '/models.ts',
        exported: true,
        visibility: 'public',
      });

      kb.insertFactSet({
        id: 'User-1-facts',
        facts: [
          { subjectId: 'User-1', predicate: 'is-constant', object: true },
          { subjectId: 'User-1', predicate: 'initializer', object: "mongoose.model('User', userSchema)" },
          { subjectId: 'User-1', predicate: 'initializer-call', object: 'mongoose.model' },
        ],
        sources: [{ kind: 'ast', file: '/models.ts' }],
        evidenceScore: 60,
      });

      // Add Post model + schema
      kb.insertEntity({
        id: 'postSchema-1',
        kind: 'constant',
        name: 'postSchema',
        path: '/models.ts',
        exported: false,
        visibility: 'internal',
      });

      kb.insertFactSet({
        id: 'postSchema-1-facts',
        facts: [
          { subjectId: 'postSchema-1', predicate: 'is-constant', object: true },
          { subjectId: 'postSchema-1', predicate: 'initializer', object: 'new Schema({ title: String })' },
        ],
        sources: [{ kind: 'ast', file: '/models.ts' }],
        evidenceScore: 60,
      });

      kb.insertEntity({
        id: 'Post-1',
        kind: 'constant',
        name: 'Post',
        path: '/models.ts',
        exported: true,
        visibility: 'public',
      });

      kb.insertFactSet({
        id: 'Post-1-facts',
        facts: [
          { subjectId: 'Post-1', predicate: 'is-constant', object: true },
          { subjectId: 'Post-1', predicate: 'initializer', object: "mongoose.model('Post', postSchema)" },
          { subjectId: 'Post-1', predicate: 'initializer-call', object: 'mongoose.model' },
        ],
        sources: [{ kind: 'ast', file: '/models.ts' }],
        evidenceScore: 60,
      });

      // Router with queries to BOTH models
      kb.insertEntity({
        id: 'router-1',
        kind: 'constant',
        name: 'router',
        path: '/routes.ts',
        exported: true,
        visibility: 'public',
      });

      kb.insertFactSet({
        id: 'router-1-facts',
        facts: [
          { subjectId: 'router-1', predicate: 'is-constant', object: true },
          { subjectId: 'router-1', predicate: 'initializer-call', object: 'Router' },
          { subjectId: 'router-1', predicate: 'calls-expression', object: 'User.find' },
          { subjectId: 'router-1', predicate: 'calls-expression', object: 'Post.findOne' },
        ],
        sources: [{ kind: 'ast', file: '/routes.ts' }],
        evidenceScore: 60,
      });

      // Process all
      const schemaPattern = new MongooseSchemaPattern();
      const modelPattern = new MongooseModelPattern();
      const queryPattern = new MongooseQueryPattern();

      const entities = kb.getAllEntities();
      const allChunks: any[] = [];

      for (const entity of entities) {
        if (schemaPattern.matches(kb, entity)) {
          allChunks.push(...schemaPattern.describe(kb, entity));
        }
        if (modelPattern.matches(kb, entity)) {
          const chunks = modelPattern.describe(kb, entity);
          chunks.forEach(c => kb.insertChunk(c));
          allChunks.push(...chunks);
        }
        if (queryPattern.matches(kb, entity)) {
          allChunks.push(...queryPattern.describe(kb, entity));
        }
      }

      // Positive assertions: Both models detected
      const userSchemaChunk = allChunks.find(c => c.targetEntityId === 'userSchema-1');
      const postSchemaChunk = allChunks.find(c => c.targetEntityId === 'postSchema-1');
      const userModelChunk = allChunks.find(c => c.targetEntityId === 'User-1');
      const postModelChunk = allChunks.find(c => c.targetEntityId === 'Post-1');
      const queryChunk = allChunks.find(c => c.targetEntityId === 'router-1');

      expect(userSchemaChunk).toBeDefined();
      expect(postSchemaChunk).toBeDefined();
      expect(userModelChunk).toBeDefined();
      expect(postModelChunk).toBeDefined();
      expect(queryChunk).toBeDefined();

      // Negative assertions: No cross-contamination
      expect(userSchemaChunk.textDraft).toContain('name');
      expect(userSchemaChunk.textDraft).not.toContain('title');

      expect(postSchemaChunk.textDraft).toContain('title');
      expect(postSchemaChunk.textDraft).not.toContain('name');

      expect(userModelChunk.textDraft).toContain('User');
      expect(userModelChunk.textDraft).not.toContain('Post');

      expect(postModelChunk.textDraft).toContain('Post');
      expect(postModelChunk.textDraft).not.toContain('userSchema');

      expect(queryChunk.textDraft).toContain('User');
      expect(queryChunk.textDraft).toContain('Post');
      expect(queryChunk.textDraft).toContain('find');
      expect(queryChunk.textDraft).toContain('findOne');
    });
  });
});
