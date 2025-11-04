# Phase 3 - Step 3: Reasoning Foundation & Pattern Matching

**Owner:** Agent 2 (WS-D)
**Depends on:** Agent 1 Step 2 (needs `scoreConfidence` API)
**Blocks:** None (continues to Steps 4-5)
**TDD:** Phase -1 → Red → Green → Refactor

---

## Phase -1: Upstream Data Analysis (MANDATORY - Complete Before Tests)

**Critical:** Reference `PHASE3_PROCESS_IMPROVEMENTS.md`. Wait for Agent 1's Step 2 API freeze before starting.

### A. Identify Data Sources

**Data Sources:**
- `src/parser/fact-extractor.ts` - What predicates Phase 2 emits
- `src/kb/knowledge-base.ts` - scoreConfidence() API from Agent 1
- `src/kb/models.ts` - BehaviorChunk interface

**Key validation:** Agent 1's Step 2 API must be frozen and available.

### B. Read Upstream Code - Schema Validation

**Validate BehaviorChunk schema:**
```typescript
interface BehaviorChunk {
  textDraft: string;        // NOT 'text'
  targetEntityId: string;   // NOT 'entityId'
  factSetIds: string[];     // Array, not single factSetId
  confidence: Confidence;   // Must use scoreConfidence() API
}
```

**Validate scoreConfidence() API** (from Agent 1):
```typescript
kb.scoreConfidence(factSetIds: string[]): Confidence;  // 'High' | 'Medium' | 'Low'
```

**Critical question:** What predicates does Phase 2 ACTUALLY emit?
- Read `src/parser/fact-extractor.ts` completely
- Document ALL predicates (is-function, has-jsdoc, etc.)
- Identify if Phase 2 emits the predicates needed for pattern detection:
  - `calls-expression`? (for Express app.get() detection)
  - `call-arg-0`? (for route path detection)
  - `param-count`? (for middleware detection)
  - `returns-jsx`? (for React component detection)

### C. Validate Assumptions Checklist

- [ ] **Assumption:** Phase 2 emits `calls-expression` predicate
  - **Reality:** CHECK `src/parser/fact-extractor.ts` - does this exist?
  - **If FALSE:** Must enhance Phase 2 first (see section 33-90 of original plan)

- [ ] **Assumption:** scoreConfidence() API available
  - **Reality:** ✅ TRUE (Agent 1 Step 2 deliverable)

- [ ] **Assumption:** BehaviorChunk uses textDraft field
  - **Reality:** ✅ TRUE (validated in models.ts)

- [ ] **Assumption:** Can detect Express routes without additional predicates
  - **Reality:** VALIDATE - may need Phase 2 enhancements first

### D. Integration Test with Debugging

```typescript
// tests/integration/phase3-step3-patterns-analysis.test.ts
describe('Phase -1: Validate Phase 2 Predicates for Pattern Detection', () => {
  it('should check if Phase 2 emits predicates needed for Express detection', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const extractor = new FactExtractor();
    const kb = new KnowledgeBase();

    // Express-like code
    const sourceFile = project.createSourceFile(
      'src/routes.ts',
      `
      import express from 'express';
      const app = express();

      app.get('/users', (req, res) => {
        res.json([]);
      });

      app.use((req, res, next) => {
        next();
      });
      `
    );

    const result = extractor.extract(sourceFile, 'src/routes.ts');
    const factSets = kb.getAllFactSets();

    // Check what predicates Phase 2 actually emits
    const allPredicates = new Set<string>();
    factSets.forEach(fs => {
      fs.facts.forEach(f => allPredicates.add(f.predicate));
    });

    console.log('\n=== PREDICATES FOR EXPRESS DETECTION ===');
    console.log('All predicates:', Array.from(allPredicates));
    console.log('Has calls-expression?', allPredicates.has('calls-expression'));
    console.log('Has call-arg-0?', allPredicates.has('call-arg-0'));
    console.log('Has param-count?', allPredicates.has('param-count'));

    // If missing, document Phase 2 enhancements needed
  });
});
```

**RUN THIS TEST - if predicates are missing, enhance Phase 2 first!**

### E. Gap Analysis & Design Adjustment

**If Phase 2 predicates are MISSING:**
1. **STOP** - Phase 2 must be enhanced first
2. Add predicates to `src/parser/fact-extractor.ts`:
   - `calls-expression` for app.get(), app.use()
   - `call-arg-0` for route paths
   - `param-count` for middleware detection
3. Test Phase 2 changes independently
4. THEN proceed with pattern matching

**If predicates exist:**
- Document which patterns are detectable
- Proceed with pattern matcher implementation

---

## Objective

Create reasoning engine foundation with pattern matcher, intent lifter, and rule registry for Express/React basics.

**Deliverables:**
1. `PatternMatcher` - Detects framework patterns (Express, React)
2. `IntentLifter` - Converts factSets to behavior chunks with human-readable text
3. Pattern definitions for Tier 0 frameworks (Express/React basics only)
4. **Phase 2 Fact Extractor Enhancements** - Add predicates needed for pattern detection

---

## Key Corrections Applied

- Use `BehaviorChunk.textDraft` (not `text`)
- Use `BehaviorChunk.targetEntityId` (not `entityId`)
- Use `BehaviorChunk.factSetIds` array (not single `factSetId`)
- Use `Confidence` type: `'High' | 'Medium' | 'Low'` (capitalized, not numeric)
- Get subject ID from `factSet.facts[0].subjectId` (no `factSet.entityId`)
- Check predicates like `'is-exported'`, `'has-jsdoc'` (not `fact.kind/value`)
- **Use `scoreConfidence(factSetIds)` API** (NOT `computeConfidence` or `getConfidenceBand`)

---

## Phase 2 Fact Extractor Enhancements (Prerequisites)

**IMPORTANT:** Phase 3 pattern matching requires additional fact predicates beyond Phase 2's basic extraction. Before implementing tests, Agent 2 must enhance the Phase 2 fact extractor to emit the following predicates:

### Required New Predicates

**1. Call Expression Details** (for Express route/middleware detection):
- `calls-expression`: Expression being called (e.g., `'app.get'`, `'app.use'`, `'useState'`)
- `call-arg-0`, `call-arg-1`, etc.: Literal arguments passed to calls (e.g., route paths)

**2. Parameter Metadata** (for middleware/error handler detection):
- `param-count`: Number of parameters in function signature
- `param-names`: Comma-separated parameter names (e.g., `'req,res,next'`)

**3. JSX/React Detection** (for React component detection):
- `returns-jsx`: Boolean indicating JSX return type detected

### Implementation Guidance

**Location:** `src/parser/fact-extractor.ts` (Phase 2 component)

**Add to existing `extractFacts()` method:**

```typescript
// After extracting basic facts (is-function, has-jsdoc, has-signature)...

// 1. Extract call expression details from call expressions
for (const callExpr of node.getDescendantsOfKind(SyntaxKind.CallExpression)) {
  const expr = callExpr.getExpression();
  const exprText = expr.getText();

  facts.push({
    subjectId: entity.id,
    predicate: 'calls-expression',
    object: exprText
  });

  // Extract literal arguments (strings, numbers)
  const args = callExpr.getArguments();
  args.forEach((arg, index) => {
    if (Node.isStringLiteral(arg) || Node.isNumericLiteral(arg)) {
      facts.push({
        subjectId: entity.id,
        predicate: `call-arg-${index}`,
        object: arg.getLiteralText()
      });
    }
  });
}

// 2. Extract parameter metadata
if (Node.isFunctionDeclaration(node) || Node.isArrowFunction(node)) {
  const params = node.getParameters();
  facts.push({
    subjectId: entity.id,
    predicate: 'param-count',
    object: params.length
  });

  const paramNames = params.map(p => p.getName()).join(',');
  facts.push({
    subjectId: entity.id,
    predicate: 'param-names',
    object: paramNames
  });
}

// 3. Detect JSX returns (React components)
if (Node.isFunctionDeclaration(node) || Node.isArrowFunction(node)) {
  const returnType = node.getReturnType();
  const hasJSXReturn = returnType.getText().includes('JSX.Element') ||
                       returnType.getText().includes('ReactElement') ||
                       node.getDescendantsOfKind(SyntaxKind.JsxElement).length > 0 ||
                       node.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).length > 0;

  if (hasJSXReturn) {
    facts.push({
      subjectId: entity.id,
      predicate: 'returns-jsx',
      object: true
    });
  }
}
```

**Test Coverage:** Add tests to `tests/unit/parser/fact-extractor.test.ts` verifying:
- Call expressions emit `calls-expression` facts
- Literal arguments emit `call-arg-N` facts
- Parameter counts are correct
- JSX returns are detected

**NOTE:** Implement these enhancements BEFORE writing Step 3 tests. Otherwise, pattern matcher tests will fail due to missing predicates.

---

## Red: Write Failing Tests

**Test File:** `tests/unit/reasoning/pattern-matcher.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { PatternMatcher, Pattern } from '../../../src/reasoning/PatternMatcher';
import { KnowledgeBase } from '../../../src/kb/knowledge-base';
import { FactSet } from '../../../src/kb/models';

describe('PatternMatcher', () => {
  let matcher: PatternMatcher;
  let kb: KnowledgeBase;

  beforeEach(() => {
    kb = new KnowledgeBase();
    matcher = new PatternMatcher(kb);
  });

  describe('Express patterns', () => {
    it('should detect Express route handler pattern', () => {
      const factSet: FactSet = {
        id: 'fs-express-1',
        facts: [
          { subjectId: 'func-1', predicate: 'calls-expression', object: 'app.get' },
          { subjectId: 'func-1', predicate: 'call-arg-0', object: '/users' },
          { subjectId: 'func-1', predicate: 'has-signature', object: '(req, res): void' }
        ],
        sources: [{ kind: 'ast', file: 'src/routes.ts' }],
        evidenceScore: 90
      };

      const pattern = matcher.match(factSet);

      expect(pattern).toBeDefined();
      expect(pattern?.name).toBe('express-route-handler');
      expect(pattern?.framework).toBe('Express');
      expect(pattern?.intent).toContain('GET');
      expect(pattern?.intent).toContain('/users');
    });

    it('should detect Express middleware pattern', () => {
      const factSet: FactSet = {
        id: 'fs-express-2',
        facts: [
          { subjectId: 'func-2', predicate: 'calls-expression', object: 'app.use' },
          { subjectId: 'func-2', predicate: 'has-signature', object: '(req, res, next): void' }
        ],
        sources: [{ kind: 'ast', file: 'src/middleware.ts' }],
        evidenceScore: 90
      };

      const pattern = matcher.match(factSet);

      expect(pattern?.name).toBe('express-middleware');
    });

    it('should detect Express error handler (4-param)', () => {
      const factSet: FactSet = {
        id: 'fs-express-3',
        facts: [
          { subjectId: 'func-3', predicate: 'has-signature', object: '(err, req, res, next): void' },
          { subjectId: 'func-3', predicate: 'param-count', object: 4 }
        ],
        sources: [{ kind: 'ast', file: 'src/error.ts' }],
        evidenceScore: 90
      };

      const pattern = matcher.match(factSet);

      expect(pattern?.name).toBe('express-error-handler');
      expect(pattern?.priority).toBeGreaterThan(80);
    });
  });

  describe('React patterns', () => {
    it('should detect React functional component', () => {
      const factSet: FactSet = {
        id: 'fs-react-1',
        facts: [
          { subjectId: 'func-5', predicate: 'is-exported', object: true },
          { subjectId: 'func-5', predicate: 'returns-jsx', object: true },
          { subjectId: 'func-5', predicate: 'has-signature', object: '(props): JSX.Element' }
        ],
        sources: [{ kind: 'ast', file: 'src/components/Button.tsx' }],
        evidenceScore: 90
      };

      const pattern = matcher.match(factSet);

      expect(pattern?.name).toBe('react-functional-component');
      expect(pattern?.framework).toBe('React');
    });

    it('should detect React useState hook', () => {
      const factSet: FactSet = {
        id: 'fs-react-2',
        facts: [
          { subjectId: 'func-6', predicate: 'calls-expression', object: 'useState' },
          { subjectId: 'func-6', predicate: 'returns-jsx', object: true }
        ],
        sources: [{ kind: 'ast', file: 'src/components/Counter.tsx' }],
        evidenceScore: 90
      };

      const pattern = matcher.match(factSet);

      expect(pattern?.name).toBe('react-useState-hook');
    });
  });

  describe('pattern priority', () => {
    it('should return highest priority pattern when multiple match', () => {
      const factSet: FactSet = {
        id: 'fs-multi',
        facts: [
          { subjectId: 'func-8', predicate: 'calls-expression', object: 'app.use' },
          { subjectId: 'func-8', predicate: 'has-signature', object: '(err, req, res, next): void' },
          { subjectId: 'func-8', predicate: 'param-count', object: 4 }
        ],
        sources: [{ kind: 'ast', file: 'src/error.ts' }],
        evidenceScore: 90
      };

      const pattern = matcher.match(factSet);

      // Should prefer error handler (priority 90) over middleware (priority 70)
      expect(pattern?.name).toBe('express-error-handler');
    });
  });
});
```

**Test File:** `tests/unit/reasoning/intent-lifter.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { IntentLifter } from '../../../src/reasoning/IntentLifter';
import { KnowledgeBase } from '../../../src/kb/knowledge-base';
import { PatternMatcher } from '../../../src/reasoning/PatternMatcher';
import { Entity, FactSet, BehaviorChunk } from '../../../src/kb/models';

describe('IntentLifter', () => {
  let lifter: IntentLifter;
  let kb: KnowledgeBase;
  let matcher: PatternMatcher;

  beforeEach(() => {
    kb = new KnowledgeBase();
    matcher = new PatternMatcher(kb);
    lifter = new IntentLifter(kb, matcher);
  });

  describe('liftIntent', () => {
    it('should lift Express route handler to behavior chunk', () => {
      const entity: Entity = {
        id: 'func-handler',
        kind: 'function',
        name: 'getUserHandler',
        path: 'src/routes/users.ts',
        exported: true
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-1',
        facts: [
          { subjectId: entity.id, predicate: 'calls-expression', object: 'app.get' },
          { subjectId: entity.id, predicate: 'call-arg-0', object: '/users/:id' },
          { subjectId: entity.id, predicate: 'has-jsdoc', object: 'Fetches user by ID' }
        ],
        sources: [{ kind: 'ast', file: 'src/routes/users.ts' }],
        evidenceScore: 90
      };
      kb.insertFactSet(factSet);

      const chunk = lifter.liftIntent([factSet.id]);

      // Check correct field names
      expect(chunk.targetEntityId).toBe(entity.id);  // NOT entityId
      expect(chunk.textDraft).toContain('GET');  // NOT text
      expect(chunk.textDraft).toContain('/users/:id');
      expect(chunk.factSetIds).toEqual([factSet.id]);  // Array, NOT single factSetId
      expect(chunk.confidence).toBe('High');  // Confidence type, NOT number
    });

    it('should compute confidence using KB.scoreConfidence', () => {
      const entity: Entity = {
        id: 'func-doc',
        kind: 'function',
        name: 'wellDocumentedFunc',
        path: 'src/api.ts',
        exported: true,
        signature: '(x: number): number'
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-4',
        facts: [
          { subjectId: entity.id, predicate: 'is-exported', object: true },
          { subjectId: entity.id, predicate: 'has-jsdoc', object: 'Well documented' },
          { subjectId: entity.id, predicate: 'has-jsdoc-params', object: true },
          { subjectId: entity.id, predicate: 'has-jsdoc-returns', object: true },
          { subjectId: entity.id, predicate: 'has-signature', object: '(x: number): number' },
          { subjectId: entity.id, predicate: 'has-test-coverage', object: true }
        ],
        sources: [{ kind: 'ast', file: 'src/api.ts' }],
        evidenceScore: 90
      };
      kb.insertFactSet(factSet);

      const chunk = lifter.liftIntent([factSet.id]);

      // Should use KB.scoreConfidence (returns 'High' for score ≥70)
      expect(chunk.confidence).toBe('High');
    });

    it('should produce Low confidence chunk when no pattern matches', () => {
      const entity: Entity = {
        id: 'func-generic',
        kind: 'function',
        name: 'helperFunc',
        path: 'src/utils.ts',
        exported: false
      };
      kb.insertEntity(entity);

      const factSet: FactSet = {
        id: 'fs-3',
        facts: [
          { subjectId: entity.id, predicate: 'is-function', object: true }
        ],
        sources: [{ kind: 'ast', file: 'src/utils.ts' }],
        evidenceScore: 90
      };
      kb.insertFactSet(factSet);

      const chunk = lifter.liftIntent([factSet.id]);

      expect(chunk.confidence).toBe('Low');
      expect(chunk.textDraft).toContain('helperFunc');
    });
  });
});
```

**Run tests (should fail):**
```bash
pnpm test tests/unit/reasoning/
```

Expected: All tests fail (classes not implemented).

---

## Green: Implement Pattern Matcher & Intent Lifter

**Implementation File:** `src/reasoning/PatternMatcher.ts`

```typescript
import { KnowledgeBase } from '../kb/knowledge-base';
import { FactSet } from '../kb/models';

export interface Pattern {
  name: string;
  framework: string;
  intent: string;
  priority: number;
}

export class PatternMatcher {
  constructor(private kb: KnowledgeBase) {}

  match(factSet: FactSet): Pattern | null {
    const patterns = [
      this.matchExpressErrorHandler,
      this.matchExpressRouteHandler,
      this.matchExpressMiddleware,
      this.matchReactFunctionalComponent,
      this.matchReactUseStateHook,
      this.matchReactUseEffectHook
    ];

    for (const patternFn of patterns) {
      const pattern = patternFn.call(this, factSet);
      if (pattern) return pattern;
    }

    return null;
  }

  private matchExpressRouteHandler(factSet: FactSet): Pattern | null {
    const hasRouteCall = factSet.facts.some(
      f => f.predicate === 'calls-expression' &&
           /^app\.(get|post|put|delete|patch)$/.test(String(f.object))
    );

    if (hasRouteCall) {
      const callExpr = factSet.facts.find(f => f.predicate === 'calls-expression');
      const method = String(callExpr?.object).split('.')[1]?.toUpperCase() || 'HTTP';
      const routeArg = factSet.facts.find(f => f.predicate === 'call-arg-0');
      const route = routeArg ? String(routeArg.object) : '';

      return {
        name: 'express-route-handler',
        framework: 'Express',
        intent: `Handles ${method} requests to ${route}`,
        priority: 80
      };
    }

    return null;
  }

  private matchExpressMiddleware(factSet: FactSet): Pattern | null {
    const hasAppUse = factSet.facts.some(
      f => f.predicate === 'calls-expression' && String(f.object) === 'app.use'
    );
    const has3Params = factSet.facts.some(
      f => f.predicate === 'param-count' && f.object === 3
    );

    if (hasAppUse || has3Params) {
      return {
        name: 'express-middleware',
        framework: 'Express',
        intent: 'Middleware function that processes requests',
        priority: 70
      };
    }

    return null;
  }

  private matchExpressErrorHandler(factSet: FactSet): Pattern | null {
    const has4Params = factSet.facts.some(
      f => f.predicate === 'param-count' && f.object === 4
    );

    if (has4Params) {
      return {
        name: 'express-error-handler',
        framework: 'Express',
        intent: 'Error handling middleware (4-param signature)',
        priority: 90
      };
    }

    return null;
  }

  private matchReactFunctionalComponent(factSet: FactSet): Pattern | null {
    const returnsJSX = factSet.facts.some(f => f.predicate === 'returns-jsx' && f.object === true);
    const isExported = factSet.facts.some(f => f.predicate === 'is-exported' && f.object === true);

    if (returnsJSX && isExported) {
      const subjectId = factSet.facts[0]?.subjectId;
      const entity = this.kb.getEntity(subjectId);
      const componentName = entity?.name || 'Component';

      return {
        name: 'react-functional-component',
        framework: 'React',
        intent: `Renders ${componentName} component`,
        priority: 80
      };
    }

    return null;
  }

  private matchReactUseStateHook(factSet: FactSet): Pattern | null {
    const hasUseState = factSet.facts.some(
      f => f.predicate === 'calls-expression' && String(f.object) === 'useState'
    );

    if (hasUseState) {
      return {
        name: 'react-useState-hook',
        framework: 'React',
        intent: 'Manages state using useState hook',
        priority: 75
      };
    }

    return null;
  }

  private matchReactUseEffectHook(factSet: FactSet): Pattern | null {
    const hasUseEffect = factSet.facts.some(
      f => f.predicate === 'calls-expression' && String(f.object) === 'useEffect'
    );

    if (hasUseEffect) {
      return {
        name: 'react-useEffect-hook',
        framework: 'React',
        intent: 'Side effect using useEffect hook',
        priority: 75
      };
    }

    return null;
  }
}
```

**Implementation File:** `src/reasoning/IntentLifter.ts`

```typescript
import { KnowledgeBase } from '../kb/knowledge-base';
import { FactSet, BehaviorChunk, Entity, Confidence } from '../kb/models';
import { PatternMatcher } from './PatternMatcher';

export class IntentLifter {
  constructor(
    private kb: KnowledgeBase,
    private matcher: PatternMatcher
  ) {}

  liftIntent(factSetIds: string[]): BehaviorChunk {
    if (factSetIds.length === 0) {
      throw new Error('No factSets provided');
    }

    const factSet = this.kb.getFactSet(factSetIds[0]);
    if (!factSet) {
      throw new Error(`FactSet ${factSetIds[0]} not found`);
    }

    const subjectId = factSet.facts[0]?.subjectId;
    const entity = this.kb.getEntity(subjectId);
    if (!entity) {
      throw new Error(`Entity ${subjectId} not found`);
    }

    const pattern = this.matcher.match(factSet);
    const confidence = this.kb.scoreConfidence(factSetIds);  // Returns Confidence band directly

    let textDraft: string;
    if (pattern) {
      textDraft = this.buildPatternBasedText(entity, pattern, factSet);
    } else {
      textDraft = this.buildGenericText(entity, factSet);
    }

    return {
      id: this.generateChunkId(),
      targetEntityId: subjectId,  // NOT entityId
      textDraft,  // NOT text
      confidence,  // Confidence type ('High' | 'Medium' | 'Low')
      factSetIds  // Array
    };
  }

  private buildPatternBasedText(entity: Entity, pattern: any, factSet: FactSet): string {
    const jsDoc = factSet.facts.find(f => f.predicate === 'has-jsdoc');
    const summary = jsDoc ? String(jsDoc.object) : '';

    let text = pattern.intent;
    if (summary) {
      text += `. ${summary}`;
    }

    return text;
  }

  private buildGenericText(entity: Entity, factSet: FactSet): string {
    const jsDoc = factSet.facts.find(f => f.predicate === 'has-jsdoc');
    const summary = jsDoc ? String(jsDoc.object) : null;

    if (summary) {
      return `Function ${entity.name}: ${summary}`;
    }

    return `Function ${entity.name} (intent unclear from static analysis)`;
  }

  private generateChunkId(): string {
    return `chunk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}
```

**Run tests (should pass):**
```bash
pnpm test tests/unit/reasoning/
```

Expected: All tests pass.

---

## Acceptance Criteria (Step 3)

### Phase 2 Enhancements (Prerequisites)
- ✅ Fact extractor emits `calls-expression` predicates for call expressions
- ✅ Fact extractor emits `call-arg-N` predicates for literal arguments
- ✅ Fact extractor emits `param-count` and `param-names` predicates
- ✅ Fact extractor emits `returns-jsx` predicate for React components
- ✅ Tests in `fact-extractor.test.ts` verify new predicates

### Pattern Matching & Intent Lifting
- ✅ All tests pass (≥80% branch coverage)
- ✅ PatternMatcher detects Express and React patterns
- ✅ IntentLifter produces BehaviorChunks with correct field names
- ✅ Confidence computed via `KB.scoreConfidence(factSetIds)` (NOT `computeConfidence`)
- ✅ Pattern-based text generation works
- ✅ Generic fallback for non-pattern entities

---

**End of Step 3**

Proceed to Step 4.
