# CTS-05 — Static Analysis, Aux Readers & Pattern Detection

**Version:** 1.0  
**Date:** 2025-11-03  
**Scope:** Scanner, parser/fact extraction, dynamic-pattern detection, auxiliary readers, performance & errors.

---

## 1) Purpose & Position
Collect all structural facts needed for behavioral documentation, and flag areas where static analysis is inherently weak (dynamic patterns).

---

## 2) Scanner & Loader
- Walk project root (monorepo-aware); group by package/directory.  
- Ignore: `node_modules`, `dist`, `build`, minified/bundled files, generated artifacts.  
- Detect monorepo via: package workspaces, `pnpm-workspace.yaml`, `lerna.json`, `nx.json`; fallback to `packages/*` or multi-root `package.json` layout.

---

## 3) Parser & Fact Extractor
- Primary: **TypeScript compiler API / ts-morph** (handles TS/JS/JSX/TSX; optional type info).  
- Fallback: **Babel** for syntax edges.  
- Extract: declarations, exports, signatures, imports/calls, error/throw sites, async patterns, I/O (fs, http, db adapters), config/env reads, comments/JSDoc.  
- Build call/import graphs; **prune ASTs after extraction**.

### 3.1 Phase 6 Amendment — Module-Scope Call Extraction
- **Motivation:** Validation uncovered that module-level statements (e.g., `router.post(...)`) produced no call facts, blocking Express/HTTP pattern accuracy. The parser now treats module scope as a first-class traversal target.
- **ModuleScopeWalker:** Iterate `sourceFile.getStatements()` once, capturing variable declarations, expression statements, and export assignments. Reuse the same visitor utilities as function/class walkers to keep behavior consistent and memory-friendly.
- **Scope tracking:** Maintain a stack of scope frames (module, function, class) and attach each emitted fact to the entity defined in the innermost frame. Adds `call-scope` metadata so downstream consumers can distinguish bootstrap code from runtime logic.
- **Pseudo-entities:** When an expression statement lacks an identifier owner, synthesize a deterministic `constant` entity (name format: `module::<relPath>#L{line}`) flagged with `metadata.synthetic:true`. This keeps the KB schema unchanged while preserving attribution and anchor determinism.
- **Chained calls & arguments:** Emit one fact per property access and link them via `chained-call` predicates. All arguments are serialized with both textual value and, when resolvable, referenced entity IDs so middleware/auth patterns can interrogate wrappers such as `wrapAsync(allowedRoles(...))`.
- **Compatibility & parity:** Predicate names remain unchanged (`calls-expression`, `call-arg-{n}`, etc.), so existing tests only gain additional facts. The Babel fallback mirrors the same module-scope traversal behind the `parser.experimentalModuleScope` feature flag for staged rollout.
- **Performance guardrails:** Benchmarks on ≥5k LOC fixtures must show ≤10% slowdown versus the Phase 5 baseline. The walker short-circuits nodes already visited via other scopes to avoid quadratic AST walks.

---

## 4) Dynamic Pattern Detector (per-file, co-located)
- Match: dynamic imports, reflection (`globalThis`, `Reflect`), proxies, bracket access on unknowns, `eval`, metaprogramming patterns.  
- Outcome: confidence downgrade; seed Open Questions when needed; annotate entities for resolver.

---

## 5) Auxiliary Readers (facts only)
- **Tests:** names and key assertions for behavioral hints; do **not** document tests.  
- **Configs/Contracts:** JSON/YAML, `.env`, OpenAPI documents, SQL migrations (schema & side effects).  
- Normalize into factSets with provenance (`reader` field).

---

## 6) Framework Pattern Library (v1)

### 6.1 Supported Frameworks
- Express routing/middleware, React components/hooks, Next.js routing/data, NestJS controllers/providers, Koa middleware, Node events/streams, schedulers (node-cron), ORM (Prisma/Sequelize/TypeORM), HTTP clients (fetch/axios), Redux/effects

### 6.2 Pattern Definition Format
**Hard-coded code predicates** in v1 (TypeScript AST/ts-morph). Optional **experimental** declarative file later: `ceps.patterns.yaml` (simple matcher DSL).

### 6.3 Pattern Interface
```typescript
export interface Pattern {
  name: string;
  matches(node: ts.Node, ctx: MatchContext): boolean;
  extract?(node: ts.Node, ctx: MatchContext): Partial<Entity['attributes']>;
}
```

### 6.4 Example: Express Middleware Pattern
```typescript
export const ExpressMiddlewarePattern: Pattern = {
  name: 'express.middleware',
  matches(node, ctx) {
    // function/arrow with arity 2 or 3
    const sig = ctx.getSignature(node);
    const arityOk = sig.params.length === 2 || sig.params.length === 3;
    const names = sig.params.map(p => p.name.toLowerCase());
    const nameOk = names[0] in {'req':1} and names[1] in {'res':1};
    const typeOk = ctx.hasType(sig.params[0], ['express.Request'])
                && ctx.hasType(sig.params[1], ['express.Response']);
    const body = ctx.getBody(node);
    const usesRes = ctx.callsMember(body, 'res', ['status','json','send']);
    const usesNext = sig.params.length === 3 && ctx.references(body, 'next');
    return arityOk && (nameOk || typeOk) && usesRes && (sig.params.length === 2 || usesNext);
  },
  extract(node, ctx) {
    return { sideEffects: ['http: writes response'] };
  }
};
```

### 6.5 Configurability
- **Built-ins:** shipped with ceps (versioned)
- **Custom patterns (post-MVP):** loadable via plugin module path (`--patterns <path>`), exporting `Pattern[]`
- Experimental YAML matcher as future option

---

## 7) Performance & Errors

### 7.1 Async Operations
- **Parser & Aux readers:** **Async** (I/O-bound), return `Promise<PhaseReport>`
- Run via worker pool with bounded concurrency
- Parallel parsing across files

### 7.2 Error Handling
- Components throw **typed errors** (`ParseError`, `ReaderError`)
- Orchestrator catches, logs, and decides continue/skip/fail based on error class
- Batch operations may return `Result<T, E>` when partial progress expected
- Graceful degradation: skip unparsable files with **Notes** in specs

### 7.3 Memory Management
- **AST pruning:** discard ASTs after fact extraction
- Keep normalized facts only
- Memory guard for large repositories

### 7.4 Error Taxonomy
All errors surfaced in run summary:
- Parse error
- Extraction error
- Reader error
- Pattern detection error

---

## 8) Acceptance
- Fact coverage for exported/public surfaces and their transitive dependencies.  
- Import/call graphs complete for resolvable code paths.  
- Pattern detection consistently flags dynamic constructs; confidence adjusted.
