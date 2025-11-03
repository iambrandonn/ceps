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
