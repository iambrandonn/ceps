# Mongoose Facts API for GraphQL Agent (Agent 4)

**Date:** 2025-11-07
**Owner:** Agent 1 (Express)
**Consumer:** Agent 4 (GraphQL)
**Purpose:** Document how to detect and link Mongoose models/schemas for GraphQL resolver integration

---

## Overview

This document describes the KB facts and entity patterns created by the Mongoose integration patterns (`MongooseSchemaPattern`, `MongooseModelPattern`, `MongooseQueryPattern`). Agent 4 (GraphQL) can use these to detect when GraphQL resolvers interact with Mongoose models, enabling richer behavior descriptions that explain data persistence.

---

## Entity Types

### 1. Mongoose Schema Entity

**Entity Structure:**
```typescript
{
  id: 'userSchema-abc123',
  kind: 'constant',
  name: 'userSchema',         // Typically ends with 'Schema'
  path: '/path/to/models/User.ts',
  exported: false,            // Usually internal
  visibility: 'internal'
}
```

**Facts:**
```typescript
[
  { subjectId: 'userSchema-abc123', predicate: 'is-constant', object: true },
  {
    subjectId: 'userSchema-abc123',
    predicate: 'initializer',
    object: 'new Schema({ name: String, email: { type: String, required: true }, posts: [{ type: Schema.Types.ObjectId, ref: "Post" }] })'
  }
  // Note: NO initializer-call for 'new' expressions
]
```

**Detection Strategy:**
- Match: `entity.kind === 'constant'`
- AND: `initializer` fact matches `/^new\s+(mongoose\.)?Schema\s*\(/`

**Behavior Chunks:**
- Created by `MongooseSchemaPattern.describe()`
- Text format: `"Mongoose schema {name} defines fields: {field1, field2 (required), ...}. References: {ref1, ref2}."`
- Confidence: High (simple schemas), Medium (complex nested), Low (parsing failed)

### 2. Mongoose Model Entity

**Entity Structure:**
```typescript
{
  id: 'User-def456',
  kind: 'constant',
  name: 'User',               // Model name (capitalized)
  path: '/path/to/models/User.ts',
  exported: true,             // Usually exported
  visibility: 'public'
}
```

**Facts:**
```typescript
[
  { subjectId: 'User-def456', predicate: 'is-constant', object: true },
  {
    subjectId: 'User-def456',
    predicate: 'initializer',
    object: "mongoose.model('User', userSchema)"
  },
  {
    subjectId: 'User-def456',
    predicate: 'initializer-call',
    object: 'mongoose.model'
  }
]
```

**Detection Strategy:**
- Match: `entity.kind === 'constant'`
- AND: `initializer-call` fact equals `'mongoose.model'`

**Behavior Chunks:**
- Created by `MongooseModelPattern.describe()`
- Text format: `"Mongoose model {name} for collection '{collectionName}' using schema {schemaRef}. Supports fields: {fields from schema}."`
- Confidence: High (schema resolved), Medium (schema not resolved), Low (parse failed)

**Linking Models to Schemas:**
```typescript
// Extract schema reference from initializer
const initializerFact = getFirstFact(kb, entity, 'initializer');
const initializer = String(initializerFact.object);
const schemaRefMatch = initializer.match(/mongoose\.model\s*\([^,]+,\s*(\w+)/);
const schemaRef = schemaRefMatch ? schemaRefMatch[1] : null;

// Resolve schema entity (prefer same file, fallback to any file)
const entities = kb.getAllEntities();
for (const e of entities) {
  if (e.kind === 'constant' && e.name === schemaRef) {
    const initFact = getFirstFact(kb, e, 'initializer');
    if (initFact && /^new\s+(mongoose\.)?Schema\s*\(/.test(String(initFact.object))) {
      // Found schema entity!
      const schemaChunks = kb.getChunksByEntity(e.id);
      // Use schemaChunks[0].textDraft to extract field info
    }
  }
}
```

### 3. Mongoose Query Calls

**Context:** Queries appear as `calls-expression` facts in functions, methods, or router constants.

**Facts (within handler function/router):**
```typescript
[
  { subjectId: 'handlerFunction-xyz', predicate: 'calls-expression', object: 'User.find' },
  { subjectId: 'handlerFunction-xyz', predicate: 'calls-expression', object: 'User.create' },
  { subjectId: 'handlerFunction-xyz', predicate: 'calls-expression', object: 'Post.findOne' }
]
```

**Detection Strategy:**
- Match `calls-expression` facts with pattern: `/(\w+)\.(find|findOne|findById|create|updateOne|deleteOne|.../)`
- Extract model name from match
- Resolve model name to model entity (via `initializer-call: 'mongoose.model'`)

**Query Methods (Categorized):**
- **Read:** `find`, `findOne`, `findById`, `findByIdAndUpdate`, `countDocuments`, `exists`
- **Write:** `create`, `insertMany`, `updateOne`, `updateMany`, `deleteOne`, `deleteMany`
- **Aggregate:** `aggregate`

**Behavior Chunks:**
- Created by `MongooseQueryPattern.describe()`
- Text format: `"Performs Mongoose read query (find): User (fields: name, email). write query (create): Post."`
- Confidence: High (all models resolved), Medium (some resolved), Low (none resolved)

---

## Use Cases for GraphQL Agent

### Use Case 1: Detect GraphQL Resolvers Using Mongoose Models

**Scenario:** A GraphQL resolver function queries a Mongoose model.

**Example Code:**
```typescript
const resolvers = {
  Query: {
    users: async () => {
      return await User.find();
    },
    user: async (_, { id }) => {
      return await User.findById(id);
    }
  },
  Mutation: {
    createUser: async (_, { input }) => {
      return await User.create(input);
    }
  }
};
```

**KB Facts:**
- Resolver functions will have `calls-expression` facts: `'User.find'`, `'User.findById'`, `'User.create'`

**GraphQL Pattern Strategy:**
1. Detect resolver function (via GraphQL pattern matching)
2. Check for `calls-expression` facts matching Mongoose query patterns
3. Resolve `User` identifier to Mongoose model entity
4. Retrieve model's schema information via behavior chunks
5. Emit behavior description: `"GraphQL query resolver 'users' fetches all users via Mongoose model User (fields: name, email, posts → Post)."`

### Use Case 2: Link GraphQL Schema Types to Mongoose Schemas

**Scenario:** GraphQL type definitions mirror Mongoose schemas.

**Example Code:**
```graphql
type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
}
```

**Mongoose Schema:**
```typescript
const userSchema = new Schema({
  name: String,
  email: { type: String, required: true },
  posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }]
});
```

**GraphQL Pattern Strategy:**
1. Detect GraphQL type definitions (via SDL parsing or code-first)
2. Look for Mongoose models with matching names (e.g., `User` type → `User` model)
3. If found, retrieve schema fields from model's behavior chunk
4. Compare GraphQL fields vs Mongoose fields
5. Emit behavior: `"GraphQL type 'User' backed by Mongoose model User. Fields align with schema: name, email (required), posts (reference to Post)."`
6. If mismatch detected, emit Open Question: `"GraphQL type 'User' has additional fields not in Mongoose schema: {extraFields}. Verify data source."`

### Use Case 3: Describe Resolver Side Effects

**Scenario:** Mutation resolvers perform write operations.

**GraphQL Pattern Strategy:**
1. Detect mutation resolvers (via GraphQL SDL or resolver map)
2. Check for Mongoose write queries (`create`, `updateOne`, `deleteOne`, etc.)
3. Extract model names and resolve to entities
4. Emit behavior: `"GraphQL mutation 'createUser' persists new User document via Mongoose model (fields: name, email). Performs Mongoose write query (create)."`

---

## Helper Functions for Agent 4

### Check if Entity is Mongoose Model

```typescript
function isMongooseModel(kb: KnowledgeBase, entity: Entity): boolean {
  return entity.kind === 'constant' &&
         hasFact(kb, entity, 'initializer-call', 'mongoose.model');
}
```

### Resolve Model Name to Entity

```typescript
function resolveMongooseModel(kb: KnowledgeBase, modelName: string): Entity | null {
  const entities = kb.getAllEntities();
  for (const entity of entities) {
    if (entity.kind === 'constant' && entity.name === modelName) {
      const initCallFact = getFirstFact(kb, entity, 'initializer-call');
      if (initCallFact && String(initCallFact.object) === 'mongoose.model') {
        return entity;
      }
    }
  }
  return null;
}
```

### Extract Schema Fields from Model

```typescript
function getModelFields(kb: KnowledgeBase, modelEntity: Entity): string[] {
  const chunks = kb.getChunksByEntity(modelEntity.id);
  if (chunks.length === 0) return [];

  const text = chunks[0].textDraft;
  const fieldsMatch = text.match(/Supports fields: ([^.]+)/);
  if (fieldsMatch) {
    // Parse comma-separated field list: "name, email (required), posts → Post"
    const fieldsStr = fieldsMatch[1];
    return fieldsStr.split(',').map(f => {
      // Extract field name (before optional annotations)
      const fieldName = f.trim().split(/\s+/)[0];
      return fieldName;
    });
  }

  return [];
}
```

### Detect Mongoose Queries in Function

```typescript
function hasMongooseQueries(kb: KnowledgeBase, entity: Entity): boolean {
  const callExprs = getFactsByPredicate(kb, entity, 'calls-expression');
  const queryMethods = ['find', 'findOne', 'findById', 'create', 'updateOne', 'deleteOne'];

  return callExprs.some(fact => {
    const callExpr = String(fact.object);
    return queryMethods.some(method =>
      new RegExp(`\\w+\\.${method}\\b`).test(callExpr)
    );
  });
}
```

---

## Confidence Bands & Open Questions

### When to Emit High Confidence
- Model entity resolved
- Schema entity resolved and linked
- Fields extracted from schema
- Query methods clearly identified

### When to Emit Medium Confidence
- Model entity resolved but schema not found
- Partial field extraction from complex schemas
- Some query model references resolved

### When to Emit Low Confidence / Open Questions
- Model identifier not resolved (e.g., `UnknownModel.find()`)
- Schema initializer too complex to parse
- Dynamic model access (e.g., `models[name].find()`)

**Open Question Format:**
```
Q: [q:abc123def45] Which Mongoose model does 'UnknownModel' refer to in resolver 'getItems'?
```

---

## Example Integration Workflow

**Step 1: GraphQL Agent detects resolver function**
```typescript
const getUserResolver: Entity = {
  id: 'getUser-1',
  kind: 'function',
  name: 'getUser',
  path: '/resolvers/user.ts',
  // ... facts include calls-expression: 'User.findById'
};
```

**Step 2: Check for Mongoose queries**
```typescript
if (hasMongooseQueries(kb, getUserResolver)) {
  // This resolver uses Mongoose!
}
```

**Step 3: Extract and resolve models**
```typescript
const callExprs = getFactsByPredicate(kb, getUserResolver, 'calls-expression');
for (const fact of callExprs) {
  const match = String(fact.object).match(/(\w+)\.findById/);
  if (match) {
    const modelName = match[1]; // 'User'
    const modelEntity = resolveMongooseModel(kb, modelName);

    if (modelEntity) {
      const fields = getModelFields(kb, modelEntity);
      // Emit: "Resolver 'getUser' fetches User via Mongoose (fields: name, email)"
    } else {
      // Emit Open Question: model not resolved
    }
  }
}
```

---

## Testing Mongoose Integration in GraphQL Context

When Agent 4 implements GraphQL patterns, add integration tests that combine both:

```typescript
describe('GraphQL + Mongoose Integration', () => {
  it('should link resolver to Mongoose model and schema', () => {
    // Setup: Add User schema entity
    // Setup: Add User model entity
    // Setup: Add resolver function with User.findById call
    // Assert: Resolver chunk mentions Mongoose model + fields
  });

  it('should emit Open Question when model not resolved', () => {
    // Setup: Add resolver with UnknownModel.find() call
    // Assert: Low confidence chunk with QID
  });
});
```

---

## Limitations & Future Work

### Current Limitations (I4)
- No support for Mongoose hooks detection in resolvers (pre/post hooks)
- No support for Mongoose populate() (reference population)
- No support for Mongoose virtuals or methods
- No support for Mongoose discriminators

### Potential Future Enhancements (Post-M3)
- Detect `populate()` calls and expand reference chains
- Parse GraphQL SDL and compare with Mongoose schemas
- Detect schema mismatches (extra/missing fields)
- Support for Mongoose aggregation pipelines

---

## Questions for Agent 4?

If you encounter patterns not covered here, please:
1. Document the scenario in a new file: `docs/internal/graphql-mongoose-questions.md`
2. Ping Agent 1 (Express) for clarification
3. Add test cases to `tests/integration/graphql-mongoose-integration.test.ts`

**Contact:** Agent 1 (Express) via `#ceps-phase6` channel

---

**Status:** Ready for Agent 4 consumption
**Last Updated:** 2025-11-07
**Next Review:** When Agent 4 begins GraphQL pattern implementation
