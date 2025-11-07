# src/reasoning/patterns/shared

**Directory Overview:** This directory contains 9 entities.

## helpers.ts

<a id="yUaBlQVLrD"></a>

### hasFact

**Signature:** `(kb: KnowledgeBase, entity: Entity, predicate: string, objectMatch?: string | RegExp): boolean`

**Visibility:** Public (exported)

**Behavior:**

- Function hasFact: 
Check if an entity has a fact with the given predicate and object.


<a id="epuomrvN4u"></a>

### getFactsByPredicate

**Signature:** `(kb: KnowledgeBase, entity: Entity, predicate: string): import("/src/kb/models").Fact[]`

**Visibility:** Public (exported)

**Behavior:**

- Function getFactsByPredicate: 
Get all facts with the given predicate for an entity.


<a id="RDlNbAlvLn"></a>

### getFirstFact

**Signature:** `(kb: KnowledgeBase, entity: Entity, predicate: string): import("/src/kb/models").Fact`

**Visibility:** Public (exported)

**Behavior:**

- Function getFirstFact: 
Get the first fact with the given predicate for an entity.


<a id="SKHEznrSLs"></a>

### normalizeHttpMethod

**Signature:** `(method: string): "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS"`

**Visibility:** Public (exported)

**Behavior:**

- Function normalizeHttpMethod: 
Normalize HTTP method string to uppercase.


<a id="Pk45bM2W5y"></a>

### getParameterNames

**Signature:** `(kb: KnowledgeBase, entity: Entity): string[]`

**Visibility:** Public (exported)

**Behavior:**

- Function getParameterNames: 
Extract parameter names from a function signature fact.


<a id="RfoHtWDwDk"></a>

### getParameterCount

**Signature:** `(kb: KnowledgeBase, entity: Entity): number`

**Visibility:** Public (exported)

**Behavior:**

- Function getParameterCount: 
Get the parameter count for a function.


<a id="5kqOrSlpNp"></a>

### isAsync

**Signature:** `(kb: KnowledgeBase, entity: Entity): boolean`

**Visibility:** Public (exported)

**Behavior:**

- Function isAsync: 
Check if an entity has async/Promise-based behavior.


<a id="TuwqPchsHe"></a>

### getFactSets

**Signature:** `(kb: KnowledgeBase, entity: Entity): import("/src/kb/models").FactSet[]`

**Visibility:** Public (exported)

**Behavior:**

- Function getFactSets: 
Get factSets associated with an entity.


**Side effects:**
- filesystem

<a id="wN8H7gatE9"></a>

### HTTP_METHODS

**Visibility:** Public (exported)

**Behavior:**

- Constant HTTP_METHODS (intent unclear from static analysis)

**Open Questions:**
- q:TO8BQ4cYIi: What is the purpose of constant `HTTP_METHODS` at src/reasoning/patterns/shared/helpers.ts?

