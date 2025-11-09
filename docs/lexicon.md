# ceps Lexicon

**Version:** Phase 6 I5 (Express + Mongoose + HTTP Clients I1)
**Last Updated:** 2025-11-08
**Purpose:** Approved terminology for LLM-generated behavior chunks

---

## Overview

This document defines the **canonical vocabulary** for ceps-generated specifications. All terms listed here are:
1. **Grounding-safe**: Approved by the validation pipeline for LLM-generated prose
2. **Framework-specific**: Tied to recognized patterns (Express, React, etc.)
3. **Semantically precise**: Carry specific technical meaning within their framework

Terms NOT in this lexicon should trigger adversarial validation tests if used by the LLM gateway.

---

## Tier 0 Frameworks (Phase 6)

### Express.js (Iteration I3 Complete)

#### Middleware & Routing

| Term | Definition | Example Usage | Pattern Source |
|------|------------|---------------|----------------|
| **Express middleware** | A function with signature `(req, res, next)` that processes requests in the middleware chain | "Express middleware function `authMiddleware` that processes requests in the middleware chain." | `ExpressMiddlewarePattern` |
| **middleware chain** | The sequential execution flow of Express middleware functions | "Takes request, response, and next function as parameters to continue the middleware chain." | `ExpressMiddlewarePattern` |
| **Express Router** | A constant initialized with `Router()` that defines HTTP route handlers | "Express Router `usersRouter` that defines HTTP route handlers." | `ExpressRouterPattern` |
| **route handlers** | Functions attached to Router instances via HTTP method calls (`.get()`, `.post()`, etc.) | "Express Router `apiRouter` that defines HTTP route handlers. Routes: GET /users, POST /users." | `ExpressRouterPattern` |
| **route path** | The URL pattern argument passed to route handler methods | "Routes: GET /users/:id, POST /users" | `ExpressRouterPattern` |

#### Error Handling (I2)

| Term | Definition | Example Usage | Pattern Source |
|------|------------|---------------|----------------|
| **Express error handler** | A function with signature `(err, req, res, next)` that catches errors in the middleware chain | "Express error handler (4-param middleware) that catches errors from the middleware chain." | `ExpressErrorHandlerPattern` |
| **error middleware** | Synonym for Express error handler; 4-parameter middleware function | "Error middleware that handles errors from the middleware chain." | `ExpressErrorHandlerPattern` |
| **4-param middleware** | Distinguishing characteristic of error handlers vs standard middleware (3-param) | "4-param middleware for error handling" | `ExpressErrorHandlerPattern` |

#### Async Handling (I2)

| Term | Definition | Example Usage | Pattern Source |
|------|------------|---------------|----------------|
| **async** | Modifier indicating Promise-based asynchronous function | "async Express middleware function that processes requests" | All Express patterns |
| **Promise-based flow** | Asynchronous execution using Promises | "Handles asynchronous error handling with Promise-based flow." | All Express patterns |
| **asynchronous** | Describes functions that return Promises or use async/await | "Handles asynchronous requests in the middleware chain." | All Express patterns |

#### Configuration & Environment (I3)

| Term | Definition | Example Usage | Pattern Source |
|------|------------|---------------|----------------|
| **configuration** | Express app settings managed via `app.set()` / `app.get()` | "Express configuration function `configureApp` that sets application configuration via app.set." | `ExpressConfigPattern` |
| **app.set** | Express method for setting configuration values | "Sets application configuration via app.set." | `ExpressConfigPattern` |
| **app.get** | Express method for reading configuration values (context: config, not HTTP GET) | "Reads configuration values via app.get." | `ExpressConfigPattern` |
| **environment variable** | Runtime configuration value read from `process.env.*` | "Reads environment variables (PORT, NODE_ENV, API_KEY)." | `ExpressConfigPattern` |
| **process.env** | Node.js object containing environment variables | "Reads configuration from process.env." | `ExpressConfigPattern` |

#### HTTP Methods (Tier 0 Subset)

| Term | Definition | Example Usage | Notes |
|------|------------|---------------|-------|
| **GET** | HTTP GET method for retrieving resources | "Routes: GET /users" | Standard HTTP method |
| **POST** | HTTP POST method for creating resources | "Routes: POST /users" | Standard HTTP method |
| **PUT** | HTTP PUT method for updating resources | "Routes: PUT /users/:id" | Standard HTTP method |
| **DELETE** | HTTP DELETE method for removing resources | "Routes: DELETE /users/:id" | Standard HTTP method |
| **PATCH** | HTTP PATCH method for partial updates | "Routes: PATCH /users/:id" | Standard HTTP method |

#### Special Markers

| Term | Definition | Example Usage | Notes |
|------|------------|---------------|-------|
| **(dynamic)** | Placeholder for route paths that cannot be statically determined | "Routes: GET (dynamic), POST (dynamic)" | Used when `call-arg-0` fact is missing |

---

## Anti-Patterns (Adversarial Tests)

These terms should **FAIL** grounding validation if generated by LLM:

### Express Anti-Patterns

| Term | Why Rejected | Correct Alternative |
|------|-------------|---------------------|
| **servlet** | Java terminology, not Node.js | Express middleware / route handler |
| **Spring controller** | Java Spring framework, not Express | Express Router |
| **Rails router** | Ruby on Rails, not Express | Express Router |
| **request handler** (without "Express") | Too generic, ambiguous | Express middleware / Express route handler |
| **endpoint** (alone) | Ambiguous - could be REST, GraphQL, gRPC | HTTP route, Express route handler |
| **app.js convention** | Anecdotal, not pattern-based | Express application entry point |
| **exception handler** | Java terminology, not Node.js | Express error handler |
| **error servlet** | Java terminology, not Node.js | Express error handler |
| **error controller** | MVC terminology, not Express | Express error handler |
| **application.properties** | Java Spring config file, not Express | app.set / app.get / process.env |
| **@ConfigurationProperties** | Java Spring annotation, not Node.js | app.set / app.get |
| **Spring Boot config** | Java framework, not Express | Express configuration |
| **settings.ini** | Generic config file, not Express-specific | app.set / process.env |
| **configuration manager** | Too abstract, not Express-specific | app.set / app.get |

### HTTP Anti-Patterns

| Term | Why Rejected | Correct Alternative |
|------|-------------|---------------------|
| **REST API** | Architectural style, not a code pattern | HTTP routes, route handlers |
| **RESTful service** | Too abstract for code-level docs | Collection of HTTP route handlers |

---

## Mongoose ODM (Iteration I4 Complete)

### Schema & Model Definitions

| Term | Definition | Example Usage | Pattern Source |
|------|------------|---------------|----------------|
| **Mongoose schema** | A schema definition created with `new Schema({...})` that defines document structure | "Mongoose schema `userSchema` defines fields: name, email (required), posts → Post." | `MongooseSchemaPattern` |
| **Mongoose model** | A model created with `mongoose.model('Name', schema)` that provides database access | "Mongoose model User for collection 'User' using schema userSchema." | `MongooseModelPattern` |
| **schema** | Short form for Mongoose schema when context is clear | "using schema userSchema" | `MongooseModelPattern` |
| **collection** | MongoDB collection name associated with a model | "for collection 'User'" | `MongooseModelPattern` |

### Schema Fields & Validation

| Term | Definition | Example Usage | Pattern Source |
|------|------------|---------------|----------------|
| **fields** | Properties defined in a Mongoose schema | "defines fields: name, email, age" | `MongooseSchemaPattern` |
| **required** | Validation constraint indicating a field must have a value | "email (required)" | `MongooseSchemaPattern` |
| **reference** | Schema field that links to another model via ObjectId | "posts → Post" | `MongooseSchemaPattern` |
| **ref** | Short form for model reference in schema definitions | "posts: [{ type: ObjectId, ref: 'Post' }]" | `MongooseSchemaPattern` |
| **ObjectId** | MongoDB's unique identifier type used for references | "type: Schema.Types.ObjectId" | `MongooseSchemaPattern` |

### Query Operations

| Term | Definition | Example Usage | Pattern Source |
|------|------------|---------------|----------------|
| **Mongoose query** | Database operation performed via a Mongoose model | "Performs Mongoose read query (find): User" | `MongooseQueryPattern` |
| **read query** | Query operation that retrieves data (find, findOne, findById, etc.) | "read query (find)" | `MongooseQueryPattern` |
| **write query** | Query operation that modifies data (create, update, delete, etc.) | "write query (create)" | `MongooseQueryPattern` |
| **find** | Mongoose method to retrieve multiple documents | "read query (find): User" | `MongooseQueryPattern` |
| **findOne** | Mongoose method to retrieve a single document | "read query (findOne): Post" | `MongooseQueryPattern` |
| **findById** | Mongoose method to retrieve document by MongoDB _id | "read query (findById): User" | `MongooseQueryPattern` |
| **create** | Mongoose method to insert a new document | "write query (create): User" | `MongooseQueryPattern` |
| **updateOne** | Mongoose method to update a single document | "write query (updateOne): Post" | `MongooseQueryPattern` |
| **deleteOne** | Mongoose method to remove a single document | "write query (deleteOne): User" | `MongooseQueryPattern` |

### Integration Terms

| Term | Definition | Example Usage | Pattern Source |
|------|------------|---------------|----------------|
| **model not resolved** | Indicates a model reference couldn't be linked during analysis | "User (model not resolved)" | `MongooseQueryPattern` |
| **Supports fields** | Indicates inherited field information from linked schema | "Supports fields: name, email (required)" | `MongooseModelPattern` |

---

### Mongoose Anti-Patterns

| Term | Why Rejected | Correct Alternative |
|------|-------------|---------------------|
| **Sequelize** | Different ORM, not Mongoose | Mongoose model / Mongoose schema |
| **TypeORM** | Different ORM, not Mongoose | Mongoose model / Mongoose schema |
| **Prisma** | Different ORM, not Mongoose | Mongoose model / Mongoose schema |
| **SQL table** | Relational database terminology, not MongoDB | Mongoose collection |
| **entity** (in Mongoose context) | ORM terminology, ambiguous | Mongoose model / Mongoose schema |
| **repository** | Repository pattern, not Mongoose idiom | Mongoose model |
| **DAO** (Data Access Object) | Java pattern, not Mongoose | Mongoose model |
| **ORM** | Generic term, use specific framework | Mongoose ODM (Object Document Mapper) |
| **SQL query** | Relational database, not MongoDB | Mongoose query |
| **JOIN** | SQL operation, not MongoDB/Mongoose | Mongoose populate / reference |

---

## HTTP Clients (Iteration I1 Complete)

### Axios Client Patterns

| Term | Definition | Example Usage | Pattern Source |
|------|------------|---------------|----------------|
| **Axios client** | An HTTP client instance created with `axios.create()` | "Creates Axios client `apiClient` with base URL https://api.example.com." | `AxiosClientPattern` |
| **base URL** | The `baseURL` configuration option in Axios that prefixes all requests | "with base URL https://api.example.com" | `AxiosClientPattern` |
| **timeout** | Request timeout configuration in milliseconds | "Configures 5000ms timeout for requests" | `AxiosClientPattern` |
| **default headers** | Headers automatically included in all requests from this client | "Includes default headers: Content-Type, Authorization" | `AxiosClientPattern` |

### Fetch API Patterns

| Term | Definition | Example Usage | Pattern Source |
|------|------------|---------------|----------------|
| **Fetch API** | Browser/Node.js native HTTP client interface | "Makes HTTP request using Fetch API in `fetchUsers`." | `FetchPattern` |
| **fetch()** | Function call to make HTTP requests | "Calls `fetch()` with URL https://api.example.com/users" | `FetchPattern` |
| **response.ok** | Boolean property indicating successful HTTP response (status 200-299) | "Checks response.ok before parsing response data" | `FetchPattern`, `HttpErrorHandlingPattern` |
| **response.status** | HTTP status code of the response | "Checks response.status for error handling" | `HttpErrorHandlingPattern` |

### Request/Response Transformation

| Term | Definition | Example Usage | Pattern Source |
|------|------------|---------------|----------------|
| **JSON parsing** | Converting HTTP response text to JavaScript objects | "Parses JSON response data in `getUserData` using `response.json()`" | `RequestResponseTransformPattern` |
| **response.json()** | Method to parse response body as JSON | "using `response.json()`" | `RequestResponseTransformPattern` |
| **response.text()** | Method to extract response body as text | "Extracts raw text response via `response.text()`" | `RequestResponseTransformPattern` |
| **JSON.stringify()** | Method to serialize JavaScript objects for HTTP requests | "Converts request data to JSON format via `JSON.stringify()` for serialization" | `RequestResponseTransformPattern` |
| **serialization** | Converting data structures to string format for transmission | "for serialization" | `RequestResponseTransformPattern` |

### HTTP Error Handling

| Term | Definition | Example Usage | Pattern Source |
|------|------------|---------------|----------------|
| **error handling** | Patterns for catching and processing HTTP request failures | "Implements error handling for HTTP requests in `safeFetch`" | `HttpErrorHandlingPattern` |
| **try-catch block** | JavaScript construct for catching exceptions | "Uses try-catch block to handle request failures" | `HttpErrorHandlingPattern` |
| **HTTP response** | The response object returned by HTTP requests | "Validates HTTP response via `response.ok` property check" | `HttpErrorHandlingPattern` |
| **HTTP status code** | Numeric code indicating the result of an HTTP request | "Checks HTTP status code via `response.status` property" | `HttpErrorHandlingPattern` |
| **request failures** | HTTP requests that throw errors or return non-OK status | "to handle request failures" | `HttpErrorHandlingPattern` |

---

### HTTP Clients Anti-Patterns

| Term | Why Rejected | Correct Alternative |
|------|-------------|---------------------|
| **XMLHttpRequest** | Legacy browser API, not modern HTTP client | Fetch API / Axios client |
| **jQuery.ajax** | jQuery-specific, not standalone HTTP client | Fetch API / Axios client |
| **HttpClient** (alone) | Too generic, ambiguous framework | Axios client / Fetch API |
| **REST client** | Architectural terminology, not code pattern | Axios client / Fetch API wrapper |
| **API client** (without context) | Too generic, could be any protocol | Axios client / Fetch API wrapper |
| **HTTP service** | Too abstract, not specific to client pattern | Axios client / Fetch wrapper function |
| **superagent** | Different HTTP library, not Axios/Fetch | Axios client / Fetch API |
| **node-fetch** | Implementation detail, not pattern | Fetch API |
| **got** | Different HTTP library, not Axios/Fetch | Axios client / Fetch API |

---

## Future Iterations (Planned)

### Tier 1 Frameworks (Future)
- **React:** Functional components, hooks, context
- **Redux:** Actions, reducers, selectors, middleware
- **GraphQL:** Schema, resolvers, mutations, subscriptions
- **HTTP Clients I2:** Retry logic, timeouts, interceptors, auth patterns (deferred)

---

## Validation Workflow

1. **LLM Gateway** generates behavior chunk text
2. **Grounding Validator** extracts identifiers and terms
3. **Lexicon Check**: Terms in this document → PASS
4. **Adversarial Check**: Terms in Anti-Patterns → FAIL (retry or fallback)
5. **Unknown Terms**: Not in lexicon but not anti-patterns → WARN (log for review)

---

## Maintenance Notes

### Adding New Terms
1. Implement pattern in `src/reasoning/patterns/<framework>/`
2. Add tests confirming pattern detection
3. Update this lexicon with term, definition, example
4. Add adversarial tests (see next section)

### Deprecating Terms
1. Move to "Deprecated" section (don't delete)
2. Document replacement term
3. Update adversarial tests to reject deprecated term

---

## References

- **IMPLEMENTATION_PLAN_PHASE6_WS_D_EXPRESS.md** (Phase 6 plan)
- **PHASE6_I1_COMPLETION.md** (I1 deliverables)
- **FEEDBACK-WS-D-EXPRESS-1.md** (Review feedback, §3.2.1)
- **CTS-02_LLM_Gateway_and_Grounding.md** (Grounding validator spec)

---

## Approval Status

| Iteration | Terms Added | Adversarial Tests | Reviewer | Date |
|-----------|-------------|-------------------|----------|------|
| I1 | 11 Express terms | 30/30 passing | - | 2025-11-07 |
| I2 | 6 error/async terms | 3 new anti-patterns (33/33 passing) | - | 2025-11-07 |
| I3 | 5 config/env terms | 5 new anti-patterns (33/33 passing) | Code Review Agent | 2025-11-07 |
| I4 | 27 Mongoose terms | 10 new anti-patterns (51/51 passing) | Code Review Agent | 2025-11-07 |
| I5 | 0 new terms (validation sweep) | 51/51 passing (verified) | Pending Architect Review | 2025-11-07 |

**Total:** 49 approved terms, 15 anti-patterns, 51/51 grounding validator tests passing

---

**End of Lexicon**
