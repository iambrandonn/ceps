# Routing Parser Fix — Clarifications

**Date:** 2025-11-08  
**Author:** System Architect  
**Context:** Response to `docs/reviews/phase6/routing-parser-fix-review.md` blockers.

---

## Pseudo-Entity Creation (Review §2.1)

**Decision:** Reuse the existing `constant` entity kind with deterministic synthetic names for statements that lack an identifier owner. This avoids KB schema changes and keeps downstream consumers compatible.

**API Usage:**
```typescript
const entity = kb.addEntity({
  id: anchorId('module', filePath, startLine),
  kind: 'constant',
  name: `module::<relPath>#L${startLine}`,
  path: filePath,
  exported: false,
  visibility: 'internal',
  metadata: { synthetic: true, scope: 'module' }
});
emitCallFacts(statementExpression, entity);
```

**Rationale:** Treating pseudo-entities as constants preserves existing predicate contracts (`calls-expression`, `call-arg-n`) and allows pattern matchers to behave uniformly. The `metadata.synthetic` flag makes it trivial to filter them if a downstream consumer ever needs to ignore module-only bootstrap code.

---

## Scope Resolution Strategy (Review §2.2)

**Decision:** Maintain a scope stack that records the active entity ID; call facts attach to the entity owned by the innermost scope frame.

**Implementation Sketch:**
```typescript
const scopeStack = new ScopeStack();
scopeStack.push({ id: 'scope:module', entityId: currentModuleEntity.id });

function visitNode(node: Node) {
  if (ts.isFunctionLike(node)) {
    const fnEntity = ensureFunctionEntity(node);
    scopeStack.push({ id: `scope:function:${fnEntity.id}`, entityId: fnEntity.id });
    node.forEachChild(visitNode);
    scopeStack.pop();
    return;
  }

  if (ts.isCallExpression(node)) {
    const owner = scopeStack.peek().entityId;
    emitCallFacts(node, owner, scopeStack.peek().id);
  }

  node.forEachChild(visitNode);
}
```

**Edge Cases Addressed:**
- **Shadowed identifiers:** Each scope frame references the entity defined in that scope, so module-level `router` and nested `router` vars stay isolated.
- **Destructured bindings:** Each binding receives its own entity; calls referencing `{ router } = bootstrap()` attach to that binding's entity ID.
- **Helper-returned routers:** Even when `const router = buildRouter()` hides the constructor, module-level calls still emit under `router` because they execute at module scope.

---

## Compatibility Approach (Review §2.6)

**Decision:** Keep predicate names exactly as they are today and simply expand their emission to module-level scopes. This ensures backward compatibility and keeps golden updates localized to fixtures that start surfacing the newly discovered behavior.

**Test Migration Plan:**
1. Update parser unit tests so expectations include module-scope call facts.
2. Refresh Express integration fixtures (`tiny-express`, new large fixture) and record diffs.
3. Document fixture deltas plus rerun `npm test -- --runInBand` + golden diff scripts before requesting review.

**Predicate Naming:** No new predicate names are introduced; we only add additional instances of the existing `calls-expression`, `call-arg-{n}`, `chained-call`, and `call-scope` records.

---

## Additional Clarifications (Non-Blocking Items)

### Chained Call Fact Model
- Emit one fact per property access, linked via `chained-call` (value: `{fromCallId}->{toCallId}`) so pattern matchers can reconstruct sequences like `router.route('/x').get(handler)` without AST access.

### Argument Extraction
- Every argument includes serialized text plus (when resolvable) a referenced entity ID. Wrapper calls such as `wrapAsync(updateDisclosure)` produce both the wrapper fact and a nested fact referencing `updateDisclosure`, enabling middleware/auth analysis.

### Fixtures & Goldens
- Parser unit fixture: `tests/fixtures/parser/module-scope-basic.ts`.
- Integration fixtures: updated `tests/fixtures/phase5/baseline/tiny-express` and new `tests/fixtures/phase6/express-routing-large/` with companion README files describing regeneration steps.
- Golden specs: `tests/fixtures/**/expected/spec.md`, validated by `tests/integration/express-patterns.test.ts` and `tests/integration/express-routing-large.test.ts`.

---

**Status:** All blockers resolved; Implementation Agent can proceed once this clarification doc and the updated plan are merged.

