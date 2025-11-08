# Phase 6 Express I4 — Phase -1 Analysis: Mongoose Integration

**Date:** 2025-11-07
**Owner:** Agent 1 (Express)
**Purpose:** Document KB facts, data shapes, and assumptions before implementing Mongoose pattern detection.

---

## 1. Scope Reminder

**In-scope for I4:**
- Basic schema fields and types
- Model definitions via `mongoose.model()`
- Pre/post hooks (`schema.pre()`, `schema.post()`)
- References between models (refs)
- Query builder patterns (basic CRUD)

**Out-of-scope (descope if <50% in-scope passes by Day 7 noon):**
- Virtuals
- Discriminators
- Advanced validators (beyond required/type)
- Aggregation pipelines
- Population strategies

---

## 2. Current Parser Behavior

### 2.1 Facts Extracted for Constants

From `src/parser/fact-extractor.ts:339-391`, the parser extracts:

**For variable declarations (including constants):**
- Entity: `kind: 'constant'`, `name`, `path`, `exported`, `visibility`
- Facts:
  - `is-constant: true`
  - `initializer: <full initializer text>`
  - `initializer-call: <callee expression>` (if initializer is a call expression)

**Example: Express Router**
```typescript
export const usersRouter = Router();
```
Produces:
- Entity: `{kind: 'constant', name: 'usersRouter', exported: true}`
- Facts:
  - `is-constant: true`
  - `initializer: 'Router()'`
  - `initializer-call: 'Router'`

### 2.2 Facts Extracted for Functions/Methods

From `src/parser/fact-extractor.ts:20-157`:
- `calls-expression: <callee text>`
- `call-arg-N: <literal argument value>` (for string/number literals)

**Call extraction pattern:**
- Parser walks descendant nodes looking for `SyntaxKind.CallExpression`
- For each call, extracts:
  - `calls-expression` with callee text (e.g., `'schema.pre'`, `'mongoose.model'`)
  - `call-arg-0`, `call-arg-1`, etc. for literal arguments

**Namespace semantics:**
- `call-arg-N` predicates are scoped to the containing entity (function/method)
- Multiple calls within same function produce multiple `calls-expression` facts
- Need to pair `calls-expression` with subsequent `call-arg-N` facts (stop at next `calls-expression`)

---

## 3. Mongoose Pattern Analysis

### 3.1 Schema Definition Pattern

**Typical code:**
```typescript
import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  age: Number,
  posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }]
});
```

**Expected KB facts (from parser):**
- Entity: `{kind: 'constant', name: 'userSchema', exported: false}`
- Facts:
  - `is-constant: true`
  - `initializer: 'new Schema({...})'`
  - `initializer-call: 'new Schema'` ❓ **NEED TO VERIFY** — does parser extract `new` expressions?

**Challenge:** Schema object literal is complex; parser won't extract individual fields from nested objects.

**Solution:** Pattern matcher must:
1. Detect `initializer-call: 'Schema'` or `initializer-call: 'new Schema'`
2. Parse `initializer` text to extract field names and refs (regex or AST re-parse)
3. Emit Medium confidence for basic fields, Low for complex nested structures

### 3.2 Model Definition Pattern

**Typical code:**
```typescript
export const User = mongoose.model('User', userSchema);
export const Post = mongoose.model('Post', postSchema);
```

**Expected KB facts:**
- Entity: `{kind: 'constant', name: 'User', exported: true}`
- Facts:
  - `is-constant: true`
  - `initializer: "mongoose.model('User', userSchema)"`
  - `initializer-call: 'mongoose.model'`

**Pattern detection:**
1. Match `initializer-call: 'mongoose.model'`
2. Parse `initializer` to extract:
   - Model name (first argument, typically a string literal)
   - Schema reference (second argument, typically an identifier)
3. Link model to schema via identifier resolution (KB lookup)

### 3.3 Hook Pattern

**Typical code:**
```typescript
userSchema.pre('save', async function(next) {
  // Hash password before save
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.post('save', function(doc, next) {
  console.log('User saved:', doc.name);
  next();
});
```

**Expected KB facts (within schema constant or nearby function):**
- If hooks are attached inline (after schema definition), they'd appear as separate statements
- Parser currently doesn't extract statements after variable declarations
- **Challenge:** Hooks are typically attached as method calls on the schema object

**Two scenarios:**

**Scenario A: Hooks in schema definition file (after const declaration)**
```typescript
const userSchema = new Schema({...});
userSchema.pre('save', async function(next) {...});
```
- These are separate statements at module level
- Parser would need to extract top-level expression statements
- **Current parser:** Likely doesn't extract these ❓ **NEED TO VERIFY**

**Scenario B: Hooks in separate function**
```typescript
function setupUserHooks(schema: Schema) {
  schema.pre('save', async function(next) {...});
  schema.post('save', function(doc, next) {...});
}
setupUserHooks(userSchema);
```
- Parser would extract function entity
- Within function, would extract `calls-expression: 'schema.pre'`, `call-arg-0: 'save'`
- Can detect hooks via call pattern matching

**Initial approach:** Focus on Scenario B (hooks in functions); defer inline hooks to post-M3.

### 3.4 Query Builder Pattern

**Typical code (in Express route handlers):**
```typescript
usersRouter.get('/', async (req, res) => {
  const users = await User.find({ active: true }).limit(10).exec();
  res.json(users);
});

usersRouter.post('/', async (req, res) => {
  const user = await User.create(req.body);
  res.status(201).json(user);
});
```

**Expected KB facts (within route handler function):**
- `calls-expression: 'User.find'`
- `calls-expression: 'User.create'`
- `calls-expression: 'User.findOne'`, etc.

**Pattern detection:**
1. In Express route handler functions, look for calls to known Mongoose query methods
2. Methods: `find`, `findOne`, `findById`, `create`, `insertMany`, `updateOne`, `deleteOne`, etc.
3. Match pattern: `<identifier>.(find|findOne|create|...)` where identifier resolves to a Mongoose model

**Linking to models:**
- Need to resolve `User` identifier to the `User` model constant
- KB import/relation graph can help resolve identifiers
- If resolution fails, emit Low confidence with Open Question

---

## 4. Data Structure Expectations

### 4.1 Schema Constant Entity

```typescript
{
  id: 'userSchema-abc123',
  kind: 'constant',
  name: 'userSchema',
  path: '/path/to/models/User.ts',
  exported: false,
  visibility: 'internal'
}
```

**Facts:**
```typescript
[
  { subjectId: 'userSchema-abc123', predicate: 'is-constant', object: true },
  { subjectId: 'userSchema-abc123', predicate: 'initializer', object: 'new Schema({name: String, email: {type: String, required: true}})' },
  { subjectId: 'userSchema-abc123', predicate: 'initializer-call', object: 'Schema' } // OR 'new Schema'?
]
```

### 4.2 Model Constant Entity

```typescript
{
  id: 'User-def456',
  kind: 'constant',
  name: 'User',
  path: '/path/to/models/User.ts',
  exported: true,
  visibility: 'public'
}
```

**Facts:**
```typescript
[
  { subjectId: 'User-def456', predicate: 'is-constant', object: true },
  { subjectId: 'User-def456', predicate: 'initializer', object: "mongoose.model('User', userSchema)" },
  { subjectId: 'User-def456', predicate: 'initializer-call', object: 'mongoose.model' }
]
```

### 4.3 Route Handler with Query Calls

```typescript
{
  id: 'getUsers-ghi789',
  kind: 'function',
  name: '<anonymous>', // Arrow function in route definition
  path: '/path/to/routes/users.ts',
  exported: false,
  visibility: 'internal'
}
```

**Facts:**
```typescript
[
  { subjectId: 'getUsers-ghi789', predicate: 'is-function', object: true },
  { subjectId: 'getUsers-ghi789', predicate: 'calls-expression', object: 'User.find' },
  { subjectId: 'getUsers-ghi789', predicate: 'calls-expression', object: 'res.json' },
  // No call-arg-N for User.find({active: true}) because argument is object literal, not string/number
]
```

---

## 5. Pattern Matcher Strategy

### 5.1 MongooseSchemaPattern

**Goal:** Detect schema definitions and extract field metadata.

**Matching logic:**
```typescript
matches(kb, entity) {
  return entity.kind === 'constant' &&
         (hasFact(kb, entity, 'initializer-call', 'Schema') ||
          hasFact(kb, entity, 'initializer-call', 'new Schema'));
}
```

**Description logic:**
1. Extract `initializer` fact text
2. Parse field names using regex: `/(\w+):\s*\{?\s*type:/g`
3. Detect refs: `/ref:\s*['"](\w+)['"]/g`
4. Emit chunk:
   - "Mongoose schema {name} defines fields: {field1, field2, ...}"
   - "References: {ref1, ref2, ...}" (if any)
   - Confidence: High for basic fields, Medium if complex nested structures

**Confidence adjustments:**
- +10 for clear schema pattern

### 5.2 MongooseModelPattern

**Goal:** Detect model definitions and link to schemas.

**Matching logic:**
```typescript
matches(kb, entity) {
  return entity.kind === 'constant' &&
         hasFact(kb, entity, 'initializer-call', 'mongoose.model');
}
```

**Description logic:**
1. Extract `initializer` fact text
2. Parse model name (first argument): `/mongoose\.model\(['"](\w+)['"]/`
3. Parse schema reference (second argument): `/mongoose\.model\([^,]+,\s*(\w+)/`
4. Resolve schema reference to schema entity (KB lookup by name)
5. Emit chunk:
   - "Mongoose model {name} for collection '{collectionName}' using schema {schemaName}"
   - If schema has fields/refs, inherit that info: "Supports fields: {fields}. References: {refs}."
   - Confidence: High if schema resolved, Medium if not

**Confidence adjustments:**
- +10 for clear model pattern
- -5 if schema reference not resolved

### 5.3 MongooseQueryPattern (Auxiliary to Express Router)

**Goal:** Detect Mongoose query calls in Express route handlers and enrich route behavior descriptions.

**Matching logic:**
```typescript
matches(kb, entity) {
  // Match functions that contain Mongoose query calls
  const queryMethods = ['find', 'findOne', 'findById', 'create', 'insertMany',
                        'updateOne', 'updateMany', 'deleteOne', 'deleteMany',
                        'countDocuments', 'exists'];

  const callExprs = getFactsByPredicate(kb, entity, 'calls-expression');
  return callExprs.some(fact =>
    queryMethods.some(method => String(fact.object).includes(`.${method}`))
  );
}
```

**Description logic:**
1. Extract all `calls-expression` facts
2. Filter for Mongoose query patterns: `<Model>.(find|create|...)`
3. Extract model name from call expression
4. Resolve model name to model entity (KB lookup)
5. If model found, lookup its schema and fields
6. Emit chunk:
   - "Queries {ModelName} model: {operation} (fields: {fields})"
   - Confidence: High if model resolved, Medium if not, Low if completely unresolved

**Integration with Express Router:**
- This pattern runs after Express Router pattern
- Express chunks describe routes; Mongoose chunks describe persistence operations
- Both chunks reference the same route handler entity
- Spec generator combines them into coherent route documentation

**Confidence adjustments:**
- +5 for resolved model reference
- -5 for unresolved model reference (emit Open Question)

### 5.4 MongooseHooksPattern

**Goal:** Detect pre/post hooks on schemas.

**Matching logic:**
```typescript
matches(kb, entity) {
  // Match functions that call schema.pre() or schema.post()
  const callExprs = getFactsByPredicate(kb, entity, 'calls-expression');
  return callExprs.some(fact =>
    String(fact.object).match(/\w+\.(pre|post)$/)
  );
}
```

**Description logic:**
1. Extract `calls-expression` facts matching `.pre` or `.post`
2. Extract hook type (pre/post) and lifecycle event from `call-arg-0`
3. Emit chunk:
   - "Registers {pre|post}-{event} hook on schema"
   - Confidence: High (clear signal from method call)

**Note:** This focuses on hooks defined in functions (Scenario B from §3.3). Inline hooks deferred.

---

## 6. Namespace & Predicate Semantics

### 6.1 `initializer-call` Namespace

- **Scope:** Per constant entity
- **Uniqueness:** One per constant (if initializer is a call)
- **Usage:** Safe to match directly; no collision risk

### 6.2 `calls-expression` Namespace

- **Scope:** Per function/method entity
- **Uniqueness:** Multiple per function (one per call site)
- **Usage:** Must iterate through all calls; potential for cross-contamination if not scoped properly

**Critical pattern (from ExpressRouterPattern):**
```typescript
for (let i = 0; i < facts.length; i++) {
  if (facts[i].predicate === 'calls-expression') {
    // Process call
    // Look ahead for call-arg-N (stop at next calls-expression)
    for (let j = i + 1; j < facts.length; j++) {
      if (facts[j].predicate === 'calls-expression') break;
      if (facts[j].predicate === 'call-arg-0') {
        // Found argument for this call
      }
    }
  }
}
```

**Lesson:** Always scope `call-arg-N` extraction to the containing `calls-expression` by stopping at the next call.

---

## 7. Fixture Requirements

### 7.1 Basic Mongoose Fixture

**File structure:**
```
tests/fixtures/mongoose-basic/
  src/
    models/
      User.ts          # Schema + model definition
      Post.ts          # Schema with ref to User
    routes/
      users.ts         # Express routes with User queries
    app.ts             # Express app setup
  expected/
    spec.md            # Expected spec output
  package.json
```

**User.ts:**
```typescript
import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  age: Number,
  posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }]
});

export const User = mongoose.model('User', userSchema);
```

**Post.ts:**
```typescript
import mongoose, { Schema } from 'mongoose';

const postSchema = new Schema({
  title: String,
  content: String,
  author: { type: Schema.Types.ObjectId, ref: 'User' }
});

export const Post = mongoose.model('Post', postSchema);
```

**users.ts:**
```typescript
import { Router } from 'express';
import { User } from '../models/User.js';

export const usersRouter = Router();

usersRouter.get('/', async (req, res) => {
  const users = await User.find().exec();
  res.json(users);
});

usersRouter.post('/', async (req, res) => {
  const user = await User.create(req.body);
  res.status(201).json(user);
});

usersRouter.get('/:id', async (req, res) => {
  const user = await User.findById(req.params.id).exec();
  if (!user) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(user);
});
```

### 7.2 Hooks Fixture

**UserWithHooks.ts:**
```typescript
import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema({
  name: String,
  password: String
});

function setupPasswordHashing(schema: Schema) {
  schema.pre('save', async function(next) {
    // Simulate password hashing
    this.password = 'hashed_' + this.password;
    next();
  });
}

setupPasswordHashing(userSchema);

export const UserWithHooks = mongoose.model('UserWithHooks', userSchema);
```

### 7.3 Polluted Dataset Fixture

Multiple models, schemas, and routes in the same file to test selection logic:

**models.ts:**
```typescript
import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema({ name: String });
const postSchema = new Schema({ title: String });
const commentSchema = new Schema({ text: String });

export const User = mongoose.model('User', userSchema);
export const Post = mongoose.model('Post', postSchema);
export const Comment = mongoose.model('Comment', commentSchema);

// Non-Mongoose constant to test false positives
export const config = { apiKey: 'secret' };
```

**routes.ts:**
```typescript
import { Router } from 'express';
import { User, Post, Comment } from './models.js';

export const router = Router();

router.get('/users', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

router.get('/posts', async (req, res) => {
  const posts = await Post.find();
  res.json(posts);
});

router.get('/comments', async (req, res) => {
  const comments = await Comment.find();
  res.json(comments);
});
```

**Test assertions must verify:**
- User/Post/Comment models detected separately
- Each route query references correct model (no cross-contamination)
- `config` constant not detected as Mongoose schema
- Negative assertions: `/posts` route should NOT mention User model

---

## 8. Open Questions & Risks

### Q1: Does parser extract `new` expressions as `initializer-call`?
**Status:** ❌ CONFIRMED - Parser does NOT extract `initializer-call` for `new` expressions
**Evidence:** Fixture inspection shows:
  - `postSchema` has `initializer: "new Schema({...})"` but NO `initializer-call` fact
  - `User` model has both `initializer` AND `initializer-call: "mongoose.model"`
**Resolution:** Match schemas by regex on `initializer` text: `/^new Schema\s*\(/`
**Risk:** Low (regex pattern is reliable for this use case)

### Q2: Can we parse complex schema object literals reliably with regex?
**Risk:** High
**Impact:** Field extraction may fail for nested objects, arrays, type definitions
**Mitigation:** Start with simple regex for flat schemas; emit Medium confidence; defer complex schemas to post-M3

### Q3: How to resolve model identifiers in route handlers?
**Risk:** Medium
**Impact:** Query pattern may not link to model definition
**Mitigation:** Use KB import relations; if unresolved, emit Low confidence Open Question

### Q4: Are inline hooks (attached after schema definition) extracted by parser?
**Risk:** Low (deferred to post-M3)
**Impact:** Hook detection incomplete
**Mitigation:** Focus on hooks-in-functions pattern first; document limitation in coverage matrix

### Q5: Performance impact of regex parsing on large schemas?
**Risk:** Low
**Impact:** Slow pattern matching
**Mitigation:** Parse lazily; cache results; measure in benchmark

---

## 9. Success Metrics

**By end of Day 7 (iteration midpoint):**
- [ ] At least 50% of in-scope features passing (schemas, models, basic queries)
- [ ] Basic fixture merged and running through parser
- [ ] KB fact inspection document complete (this doc + appendix)
- [ ] Pattern matcher stubs written with unit tests (Red phase)

**By end of Day 8 (iteration complete):**
- [ ] All in-scope features green (schemas, models, queries, hooks-in-functions)
- [ ] Integration tests with KB chunk assertions passing
- [ ] Golden spec updated and verified
- [ ] Grounding validator updated with Mongoose terminology

**Descoping trigger:**
- If <50% in-scope features passing by Day 7 noon → emit Open Questions for advanced features (virtuals, discriminators, aggregations)

---

## 10. Next Steps

1. **Create basic Mongoose fixture** (§7.1)
2. **Run parser on fixture** and dump KB entities/facts to JSON
3. **Inspect actual fact structure** and update this document with findings
4. **Write unit tests** for pattern matchers (Red phase)
5. **Implement pattern matchers** (Green phase)
6. **Refactor and optimize** (Refactor phase)

---

## Appendix A: Parser Fact Inspection Results

**Date:** 2025-11-07
**Fixture:** `tests/fixtures/mongoose-basic`
**Command:** `node scripts/inspect-kb-facts.mjs tests/fixtures/mongoose-basic`

### A.1 Schema Constant (userSchema)

```
CONSTANT: userSchema
  ID: 3lDF6TUfrR
  Exported: false

Facts:
  - is-constant: true
  - initializer: new Schema({
      name: { type: String, required: true },
      email: { type: String, required: true },
      age: Number,
      posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }]
    })

  ⚠️  NO initializer-call fact (new expressions not extracted)
```

**Key Findings:**
- ✅ Schema constants are extracted as entities
- ✅ Full initializer text available for parsing
- ❌ No `initializer-call` for `new Schema()` (confirmed Q1)
- ✅ Field definitions and refs visible in initializer text

**Pattern Matching Strategy:**
1. Match: `entity.kind === 'constant'` AND `initializer` matches `/^new Schema\s*\(/`
2. Parse fields from initializer text using regex
3. Extract refs using `/ref:\s*['"](\w+)['"]/g`

### A.2 Model Constant (User)

```
CONSTANT: User
  ID: zh0WKWAjvy
  Exported: true

Facts:
  - is-constant: true
  - initializer: "mongoose.model('User', userSchema)"
  - initializer-call: "mongoose.model"
```

**Key Findings:**
- ✅ Model constants extracted with clear signal
- ✅ `initializer-call: "mongoose.model"` present
- ✅ Model name and schema reference visible in initializer
- ✅ Exported flag accurate (can prioritize public models)

**Pattern Matching Strategy:**
1. Match: `entity.kind === 'constant'` AND `initializer-call === 'mongoose.model'`
2. Parse model name: `/mongoose\.model\(['"](\w+)['"]/`
3. Parse schema ref: `/mongoose\.model\([^,]+,\s*(\w+)\)/`
4. Resolve schema ref to schema entity via KB lookup

### A.3 Router with Routes (usersRouter)

```
CONSTANT: usersRouter
  ID: 40dvmakOel
  Exported: true

Facts:
  - is-constant: true
  - initializer: "Router()"
  - initializer-call: "Router"

  ⚠️  Route handler calls (router.get(), router.post()) NOT in facts
```

**Key Findings:**
- ✅ Router constant detected (existing Express pattern handles this)
- ❌ Route handler method calls not extracted as facts on the constant
- 💡 Handler calls are buried in the route registration code

**Investigation Needed:**
- Need to check how existing ExpressRouterPattern extracts route definitions
- May need to enhance fact extraction or rely on code text parsing

### A.4 Import Relations

```
Relations:
  - /src/routes/users.ts --[imports]--> ../models/User.js
  - /src/models/Post.ts --[imports]--> mongoose
```

**Key Findings:**
- ✅ Import relations captured at file level
- ✅ Can resolve `User` identifier in routes to User model entity
- ✅ Mongoose imports detectable (could use as additional signal)

**Pattern Matching Strategy:**
- Use import relations to resolve model identifiers in route handlers
- Query KB: `getRelations(routeFile, 'imports')` → find model files → match model names

---

## Appendix B: Implementation Checklist

Based on Phase -1 findings, implementation must include:

- [x] ~~Create mongoose-basic fixture~~
- [x] ~~Run parser inspection and document findings~~
- [x] ~~Confirm `new Schema()` detection strategy (regex on initializer)~~
- [x] ~~Confirm `mongoose.model()` detection strategy (initializer-call)~~
- [ ] Implement MongooseSchemaPattern (match + describe)
- [ ] Implement MongooseModelPattern (match + describe + schema linking)
- [ ] Implement MongooseQueryPattern (detect queries in route handlers)
- [ ] Write unit tests with polluted datasets
- [ ] Write integration tests with KB chunk assertions
- [ ] Update grounding validator with Mongoose terminology
- [ ] Draft Mongoose facts API doc for Agent 4

---

**Status:** Phase -1 complete ✅ — Ready for pattern implementation
**Owner:** Agent 1 (Express)
**Next Review:** Day 7 noon (midpoint check for descoping decision)
