# IMPLEMENTATION_PLAN_PHASE3_STEP5.md

**Phase 3, Step 5 — Framework Pattern Rules for Express & React**

**Agent:** WS-D (Agent 2 — Reasoning)
**Depends on:** STEP3 (PatternMatcher foundation), STEP4 (Ambiguity resolution)
**Estimated Duration:** ~1 agent-day
**TDD:** Phase -1 → Red → Green → Refactor

---

## Phase -1: Upstream Data Analysis (MANDATORY - Complete Before Tests)

**Critical:** Reference `PHASE3_PROCESS_IMPROVEMENTS.md`. Depends on Step 3 (PatternMatcher).

### Quick Checklist
- [ ] Read Step 3: PatternMatcher interface and rule registry structure
- [ ] Validate Step 3's Phase -1 findings: Are predicates needed for Express/React available?
- [ ] Test Express pattern detection with real code
- [ ] Test React pattern detection with real code
- [ ] Document which patterns are detectable vs. require Phase 2 enhancements

**Key validation:** If Step 3's Phase -1 identified missing predicates (calls-expression, param-count, returns-jsx), those must be added to Phase 2 FIRST before implementing pattern rules.

**Integration test to run:**
```typescript
// Phase -1: Test pattern detection with real Express code
const expressCode = `app.get('/users', (req, res) => res.json([]));`;
const result = extractor.extract(sourceFile, 'routes.ts');
const chunks = patternMatcher.match(factSets);
console.log('Detected Express patterns:', chunks.filter(c => c.pattern === 'express-route'));
```

---

## Objective

Implement **Tier 0 framework pattern recognition** rules for:
1. **Express.js** — Route handlers, middleware, error handlers
2. **React** — Component types (class/function), hooks usage, JSX rendering

This step extends the `PatternMatcher` from STEP3 with production-ready pattern rules, enabling **intent lifting for common framework constructs**.

**Tier 0 Scope:** Express and React basics only. Tier 1 (Next.js, Prisma) deferred to Phase 6.

---

## Key Design Principles

- **Pattern library approach:** Each framework has a rule set defining recognizable patterns
- **AST-based detection:** Use FactSets (from Parser) to identify framework usage
- **Confidence boosting:** Framework patterns provide strong evidence → increase base confidence
- **Fallback gracefully:** Unknown patterns handled by generic rules (from STEP3)

---

## Data Model (Corrected Field Names)

```typescript
// PatternMatch (from STEP3)
interface PatternMatch {
  kind: string;              // e.g., 'express:route', 'react:component'
  confidence: number;        // Contribution to overall confidence score
  details: Record<string, unknown>;
}

// Pattern Rule Definition
interface PatternRule {
  id: string;
  framework: 'express' | 'react';
  kind: string;              // Pattern kind (e.g., 'route', 'middleware')
  matcher: (factSet: FactSet) => PatternMatch | null;
  intentTemplate: (match: PatternMatch) => string;
}
```

---

## TDD Implementation Steps

### **Day 1 Morning: Express Route Handler Patterns**

#### Test 1: Detect Express Route Definition

```typescript
// src/reasoning/__tests__/pattern-matcher-express.test.ts
describe('PatternMatcher - Express Routes', () => {
  it('should detect GET route handler', () => {
    const kb = new KnowledgeBase();
    const matcher = new PatternMatcher(kb);

    // FactSet: app.get('/users', handler)
    // Uses predicates from Step 3 fact extractor
    const factSet: FactSet = {
      id: 'fs1',
      facts: [
        { subjectId: 'e1', predicate: 'calls-expression', object: 'app.get' },
        { subjectId: 'e1', predicate: 'call-arg-0', object: '/users' }
      ],
      sources: [{ kind: 'ast', file: 'src/routes.ts' }],
      evidenceScore: 90
    };

    kb.insertFactSet(factSet);

    const match = matcher.match(factSet);

    expect(match).not.toBeNull();
    expect(match!.kind).toBe('express:route');
    expect(match!.details.method).toBe('GET');
    expect(match!.details.path).toBe('/users');
    expect(match!.confidence).toBeGreaterThanOrEqual(15); // Pattern bonus
  });

  it('should detect POST route handler', () => {
    const kb = new KnowledgeBase();
    const matcher = new PatternMatcher(kb);

    const factSet: FactSet = {
      id: 'fs1',
      facts: [
        { subjectId: 'e1', predicate: 'calls-expression', object: 'app.post' },
        { subjectId: 'e1', predicate: 'call-arg-0', object: '/users' }
      ],
      sources: [{ kind: 'ast', file: 'src/routes.ts' }],
      evidenceScore: 90
    };

    kb.insertFactSet(factSet);

    const match = matcher.match(factSet);

    expect(match!.kind).toBe('express:route');
    expect(match!.details.method).toBe('POST');
  });
});
```

**Implementation:**

```typescript
// src/reasoning/patterns/express-rules.ts
import { FactSet, Fact } from '../../kb/models';
import { PatternRule, PatternMatch } from '../pattern-matcher';

export const expressRouteRule: PatternRule = {
  id: 'express:route',
  framework: 'express',
  kind: 'route',
  matcher: (factSet: FactSet): PatternMatch | null => {
    // Look for calls-expression predicate (from Step 3 extractor)
    const methodFact = factSet.facts.find(f =>
      f.predicate === 'calls-expression' &&
      /^app\.(get|post|put|delete|patch)$/.test(String(f.object))
    );

    if (!methodFact) return null;

    const method = String(methodFact.object).split('.')[1].toUpperCase();
    const pathFact = factSet.facts.find(f => f.predicate === 'call-arg-0');
    const path = pathFact ? String(pathFact.object) : '<unknown>';

    return {
      kind: 'express:route',
      confidence: 15, // Pattern confidence bonus
      details: { method, path }
    };
  },
  intentTemplate: (match: PatternMatch): string => {
    const { method, path } = match.details;
    return `Handles ${method} requests to \`${path}\`.`;
  }
};
```

---

#### Test 2: Detect Express Middleware

```typescript
describe('PatternMatcher - Express Middleware', () => {
  it('should detect app.use() middleware', () => {
    const kb = new KnowledgeBase();
    const matcher = new PatternMatcher(kb);

    // FactSet: app.use(middleware)
    const factSet: FactSet = {
      id: 'fs1',
      facts: [
        { subjectId: 'e1', predicate: 'calls-expression', object: 'app.use' },
        { subjectId: 'e1', predicate: 'param-count', object: 3 }
      ],
      sources: [{ kind: 'ast', file: 'src/middleware.ts' }],
      evidenceScore: 90
    };

    kb.insertFactSet(factSet);

    const match = matcher.match(factSet);

    expect(match!.kind).toBe('express:middleware');
    expect(match!.confidence).toBeGreaterThanOrEqual(10);
  });

  it('should detect express.Router() usage', () => {
    const kb = new KnowledgeBase();
    const matcher = new PatternMatcher(kb);

    const factSet: FactSet = {
      id: 'fs1',
      facts: [
        { subjectId: 'e1', predicate: 'calls-expression', object: 'express.Router' }
      ],
      sources: [{ kind: 'ast', file: 'src/routes.ts' }],
      evidenceScore: 90
    };

    kb.insertFactSet(factSet);

    const match = matcher.match(factSet);

    expect(match!.kind).toBe('express:router');
  });
});
```

**Implementation:**

```typescript
// src/reasoning/patterns/express-rules.ts (continued)
export const expressMiddlewareRule: PatternRule = {
  id: 'express:middleware',
  framework: 'express',
  kind: 'middleware',
  matcher: (factSet: FactSet): PatternMatch | null => {
    const useCall = factSet.facts.find(f =>
      f.predicate === 'calls-expression' && String(f.object) === 'app.use'
    );

    if (!useCall) return null;

    return {
      kind: 'express:middleware',
      confidence: 10,
      details: { type: 'global' }
    };
  },
  intentTemplate: (match: PatternMatch): string => {
    return 'Applies middleware to all requests.';
  }
};

export const expressRouterRule: PatternRule = {
  id: 'express:router',
  framework: 'express',
  kind: 'router',
  matcher: (factSet: FactSet): PatternMatch | null => {
    const routerCall = factSet.facts.find(f =>
      f.predicate === 'calls-expression' && String(f.object) === 'express.Router'
    );

    if (!routerCall) return null;

    return {
      kind: 'express:router',
      confidence: 12,
      details: {}
    };
  },
  intentTemplate: (match: PatternMatch): string => {
    return 'Creates a modular route handler.';
  }
};
```

---

### **Day 1 Afternoon: React Component Patterns**

#### Test 3: Detect React Function Component

```typescript
// src/reasoning/__tests__/pattern-matcher-react.test.ts
describe('PatternMatcher - React Components', () => {
  it('should detect function component with JSX', () => {
    const kb = new KnowledgeBase();
    const matcher = new PatternMatcher(kb);

    // FactSet: function MyComponent() { return <div />; }
    const factSet: FactSet = {
      id: 'fs1',
      facts: [
        { subjectId: 'e1', predicate: 'is-function', object: true },
        { subjectId: 'e1', predicate: 'returns-jsx', object: true },
        { subjectId: 'e1', predicate: 'is-exported', object: true }
      ],
      sources: [{ kind: 'ast', file: 'src/components/Button.tsx' }],
      evidenceScore: 90
    };

    kb.insertFactSet(factSet);

    const match = matcher.match(factSet);

    expect(match!.kind).toBe('react:function-component');
    expect(match!.confidence).toBeGreaterThanOrEqual(15);
  });

  it('should detect class component', () => {
    const kb = new KnowledgeBase();
    const matcher = new PatternMatcher(kb);

    // FactSet: class MyComponent extends React.Component
    const factSet: FactSet = {
      id: 'fs1',
      facts: [
        { subjectId: 'e1', predicate: 'is-class', object: true },
        { subjectId: 'e1', predicate: 'extends-class', object: 'React.Component' },
        { subjectId: 'e1', predicate: 'has-method', object: 'render' }
      ],
      sources: [{ kind: 'ast', file: 'src/components/MyClass.tsx' }],
      evidenceScore: 90
    };

    kb.insertFactSet(factSet);

    const match = matcher.match(factSet);

    expect(match!.kind).toBe('react:class-component');
  });
});
```

**Implementation:**

```typescript
// src/reasoning/patterns/react-rules.ts
import { FactSet } from '../../kb/models';
import { PatternRule, PatternMatch } from '../pattern-matcher';

export const reactFunctionComponentRule: PatternRule = {
  id: 'react:function-component',
  framework: 'react',
  kind: 'function-component',
  matcher: (factSet: FactSet): PatternMatch | null => {
    const isFunction = factSet.facts.some(f =>
      f.predicate === 'is-function' && f.object === true
    );
    const returnsJSX = factSet.facts.some(f =>
      f.predicate === 'returns-jsx' && f.object === true
    );

    if (!isFunction || !returnsJSX) return null;

    return {
      kind: 'react:function-component',
      confidence: 15,
      details: { componentType: 'function' }
    };
  },
  intentTemplate: (match: PatternMatch): string => {
    return 'Renders a React UI component.';
  }
};

export const reactClassComponentRule: PatternRule = {
  id: 'react:class-component',
  framework: 'react',
  kind: 'class-component',
  matcher: (factSet: FactSet): PatternMatch | null => {
    const isClass = factSet.facts.some(f =>
      f.predicate === 'is-class' && f.object === true
    );
    const extendsReact = factSet.facts.some(f =>
      f.predicate === 'extends-class' &&
      (String(f.object) === 'React.Component' || String(f.object) === 'Component')
    );

    if (!isClass || !extendsReact) return null;

    return {
      kind: 'react:class-component',
      confidence: 15,
      details: { componentType: 'class' }
    };
  },
  intentTemplate: (match: PatternMatch): string => {
    return 'Renders a React UI component (class-based).';
  }
};
```

---

#### Test 4: Detect React Hooks Usage

```typescript
describe('PatternMatcher - React Hooks', () => {
  it('should detect useState hook', () => {
    const kb = new KnowledgeBase();
    const matcher = new PatternMatcher(kb);

    // FactSet: const [state, setState] = useState(0);
    const factSet: FactSet = {
      id: 'fs1',
      facts: [
        { subjectId: 'e1', predicate: 'calls-expression', object: 'useState' },
        { subjectId: 'e1', predicate: 'is-function', object: true }
      ],
      sources: [{ kind: 'ast', file: 'src/hooks/useCounter.ts' }],
      evidenceScore: 90
    };

    kb.insertFactSet(factSet);

    const match = matcher.match(factSet);

    expect(match!.kind).toBe('react:hook-usage');
    expect(match!.details.hook).toBe('useState');
  });

  it('should detect useEffect hook', () => {
    const kb = new KnowledgeBase();
    const matcher = new PatternMatcher(kb);

    const factSet: FactSet = {
      id: 'fs1',
      facts: [
        { subjectId: 'e1', predicate: 'calls-expression', object: 'useEffect' }
      ],
      sources: [{ kind: 'ast', file: 'src/hooks/useData.ts' }],
      evidenceScore: 90
    };

    kb.insertFactSet(factSet);

    const match = matcher.match(factSet);

    expect(match!.details.hook).toBe('useEffect');
  });
});
```

**Implementation:**

```typescript
// src/reasoning/patterns/react-rules.ts (continued)
export const reactHookRule: PatternRule = {
  id: 'react:hook-usage',
  framework: 'react',
  kind: 'hook-usage',
  matcher: (factSet: FactSet): PatternMatch | null => {
    const hookCall = factSet.facts.find(f =>
      f.predicate === 'calls-expression' &&
      /^use[A-Z]/.test(String(f.object)) // Hook naming convention
    );

    if (!hookCall) return null;

    return {
      kind: 'react:hook-usage',
      confidence: 10,
      details: { hook: hookCall.object }
    };
  },
  intentTemplate: (match: PatternMatch): string => {
    const hook = match.details.hook as string;
    const hookDescriptions: Record<string, string> = {
      useState: 'Manages component state.',
      useEffect: 'Performs side effects.',
      useContext: 'Consumes React context.',
      useReducer: 'Manages complex state logic.',
      useCallback: 'Memoizes callback function.',
      useMemo: 'Memoizes computed value.',
      useRef: 'Creates mutable ref object.'
    };

    return hookDescriptions[hook] || `Uses \`${hook}\` hook.`;
  }
};
```

---

### **Day 1 Evening: Pattern Registry Integration**

#### Test 5: Register All Pattern Rules

```typescript
// src/reasoning/__tests__/pattern-matcher-registry.test.ts
describe('PatternMatcher - Rule Registry', () => {
  it('should register all Tier 0 patterns', () => {
    const kb = new KnowledgeBase();
    const matcher = new PatternMatcher(kb);

    const rules = matcher.getRegisteredRules();

    // Express patterns
    expect(rules).toContainEqual(expect.objectContaining({ id: 'express:route' }));
    expect(rules).toContainEqual(expect.objectContaining({ id: 'express:middleware' }));
    expect(rules).toContainEqual(expect.objectContaining({ id: 'express:router' }));

    // React patterns
    expect(rules).toContainEqual(expect.objectContaining({ id: 'react:function-component' }));
    expect(rules).toContainEqual(expect.objectContaining({ id: 'react:class-component' }));
    expect(rules).toContainEqual(expect.objectContaining({ id: 'react:hook-usage' }));

    expect(rules.length).toBeGreaterThanOrEqual(6);
  });

  it('should apply rules in order until match found', () => {
    const kb = new KnowledgeBase();
    const matcher = new PatternMatcher(kb);

    // FactSet matching Express route
    const factSet: FactSet = {
      id: 'fs1',
      facts: [
        { subjectId: 'e1', predicate: 'calls-expression', object: 'app.get' },
        { subjectId: 'e1', predicate: 'call-arg-0', object: '/api' }
      ],
      sources: [{ kind: 'ast', file: 'src/routes.ts' }],
      evidenceScore: 90
    };

    kb.insertFactSet(factSet);

    const match = matcher.match(factSet);

    expect(match!.kind).toBe('express:route'); // First match wins
  });
});
```

**Implementation:**

```typescript
// src/reasoning/pattern-matcher.ts (updated from STEP3)
import { expressRouteRule, expressMiddlewareRule, expressRouterRule } from './patterns/express-rules';
import { reactFunctionComponentRule, reactClassComponentRule, reactHookRule } from './patterns/react-rules';

export class PatternMatcher {
  private rules: PatternRule[] = [];

  constructor(private kb: KnowledgeBase) {
    this.registerTier0Patterns();
  }

  private registerTier0Patterns(): void {
    // Express patterns
    this.rules.push(expressRouteRule);
    this.rules.push(expressMiddlewareRule);
    this.rules.push(expressRouterRule);

    // React patterns
    this.rules.push(reactFunctionComponentRule);
    this.rules.push(reactClassComponentRule);
    this.rules.push(reactHookRule);
  }

  match(factSet: FactSet): PatternMatch | null {
    // Try each rule in order until match found
    for (const rule of this.rules) {
      const match = rule.matcher(factSet);
      if (match) return match;
    }

    // Fallback: generic pattern (from STEP3)
    return this.matchGeneric(factSet);
  }

  getRegisteredRules(): PatternRule[] {
    return [...this.rules]; // Return copy
  }
}
```

---

### **Integration with IntentLifter (from STEP3)**

#### Test 6: Framework Patterns Boost Confidence

```typescript
// src/reasoning/__tests__/intent-lifter-integration.test.ts
describe('IntentLifter - Framework Pattern Integration', () => {
  it('should boost confidence for Express route handlers', () => {
    const kb = new KnowledgeBase();
    const lifter = new IntentLifter(kb);

    kb.insertEntity({ id: 'e1', kind: 'function', name: 'getUsers', path: 'routes.ts', exported: true });

    const factSet: FactSet = {
      id: 'fs1',
      facts: [
        { subjectId: 'e1', predicate: 'calls-expression', object: 'app.get' },
        { subjectId: 'e1', predicate: 'call-arg-0', object: '/users' },
        { subjectId: 'e1', predicate: 'is-exported', object: true },
        { subjectId: 'e1', predicate: 'has-jsdoc', object: 'Handles user retrieval' }
      ],
      sources: [{ kind: 'ast', file: 'routes.ts' }],
      evidenceScore: 90
    };

    kb.insertFactSet(factSet);

    const chunk = lifter.liftIntent(['fs1']);

    // Confidence includes base evidence + pattern bonus (handled in IntentLifter)
    const score = kb.getConfidenceScore(['fs1']);
    expect(score).toBeGreaterThan(60); // Medium → High threshold
    expect(chunk.confidence).toBe('High');
    expect(chunk.textDraft).toContain('Handles GET requests to `/users`');
  });
});
```

**Pattern-Aware Confidence Boosting Architecture:**

**IMPORTANT:** To avoid circular dependency (KB → PatternMatcher → KB), pattern confidence bonuses are applied **in the reasoning layer** (IntentLifter), not in KB's confidence scorer.

**Update IntentLifter** (in `src/reasoning/IntentLifter.ts` from STEP3):

```typescript
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

    // 1. Match pattern
    const pattern = this.matcher.match(factSet);

    // 2. Compute base confidence score from KB
    let baseScore = this.kb.getConfidenceScore(factSetIds);

    // 3. Add pattern confidence bonus (if matched)
    if (pattern) {
      baseScore += pattern.confidence;
      baseScore = Math.min(baseScore, 100); // Clamp to max
    }

    // 4. Convert final score to confidence band
    const confidence = this.kb.scoreToConfidenceBand(baseScore);

    // 5. Build text draft using pattern intent
    let textDraft: string;
    if (pattern) {
      textDraft = pattern.intentTemplate ?
        this.buildPatternBasedText(entity, pattern, factSet) :
        this.buildGenericText(entity, factSet);
    } else {
      textDraft = this.buildGenericText(entity, factSet);
    }

    return {
      id: this.generateChunkId(),
      targetEntityId: subjectId,
      textDraft,
      confidence,
      factSetIds
    };
  }

  private buildPatternBasedText(entity: Entity, pattern: PatternMatch, factSet: FactSet): string {
    const intentText = pattern.intentTemplate ?
      pattern.intentTemplate(pattern) :
      'Framework pattern detected.';

    const jsDoc = factSet.facts.find(f => f.predicate === 'has-jsdoc');
    const summary = jsDoc ? String(jsDoc.object) : '';

    let text = intentText;
    if (summary) {
      text += ` ${summary}`;
    }

    return text;
  }

  // ... rest of methods ...
}
```

**Key Benefits:**
- ✅ No circular dependency (PatternMatcher is already imported by IntentLifter)
- ✅ Pattern confidence bonus applied correctly before band conversion
- ✅ KB remains framework-agnostic (no knowledge of patterns)
- ✅ IntentLifter orchestrates pattern detection and confidence boosting

---

## Interface Contract Updates (Day 1)

**PatternRule Interface** (add to `src/reasoning/pattern-matcher.ts`):

```typescript
export interface PatternRule {
  id: string;
  framework: 'express' | 'react' | 'generic';
  kind: string;
  matcher: (factSet: FactSet) => PatternMatch | null;
  intentTemplate: (match: PatternMatch) => string;
}

export interface PatternMatch {
  kind: string;
  confidence: number; // Contribution to overall confidence score
  details: Record<string, unknown>;
  intentTemplate?: (match: PatternMatch) => string; // Optional: for generating text
}
```

**New Files:**
- `src/reasoning/patterns/express-rules.ts` — Express pattern rules
- `src/reasoning/patterns/react-rules.ts` — React pattern rules

---

## Test Coverage Targets

- **Express routes:** 5 tests (GET, POST, PUT, DELETE, path params)
- **Express middleware:** 3 tests (app.use, router, error handlers)
- **React components:** 4 tests (function, class, memo, forwardRef)
- **React hooks:** 7 tests (useState, useEffect, useContext, useReducer, useCallback, useMemo, useRef)
- **Registry integration:** 3 tests (registration, matching order, fallback)
- **Confidence integration:** 2 tests (pattern bonus, threshold crossing)

**Total:** ~24 tests, targeting ≥80% branch coverage

---

## Integration Points

### Inputs
- **From STEP3:** PatternMatcher foundation, IntentLifter
- **From STEP2:** Confidence scoring algorithm (computeReinforcers)
- **From Phase 2 Parser:** FactSets with framework-specific predicates

### Outputs
- **To STEP4:** Enhanced patterns feed into ambiguity resolution
- **To STEP8:** Framework-aware intent lifting for integration tests
- **To Phase 6:** Tier 0 pattern library serves as template for Tier 1 patterns

---

## Explicit Deferrals

**NOT in Phase 3:**
1. **Tier 1 frameworks:** Next.js, Prisma, NestJS (Phase 6)
2. **Advanced React patterns:** Portals, Suspense, Concurrent Mode (Phase 6)
3. **GraphQL schema detection:** Phase 6
4. **HTTP client patterns:** Axios, Fetch (Phase 6)
5. **Redux patterns:** Phase 6

**In Phase 3:**
1. Express: Routes, middleware, routers only
2. React: Function/class components, basic hooks only (useState, useEffect, useContext)

---

## Completion Criteria

**STEP5 is complete when:**

1. ✅ All 24 tests passing
2. ✅ 6 pattern rules implemented (3 Express, 3 React)
3. ✅ Pattern registry integrated into PatternMatcher
4. ✅ Framework patterns contribute to confidence scoring
5. ✅ Intent templates generate readable descriptions
6. ✅ IntentLifter uses pattern matches in textDraft generation
7. ✅ ≥80% branch coverage maintained
8. ✅ Integration test: Express route → High confidence chunk with proper description
9. ✅ Integration test: React component → High confidence chunk with proper description

---

## Next Steps

**After STEP5 completion:**
- ✅ **Agent 2 (WS-D) work complete** — Steps 3-5 done
- ✅ Handoff to **Agent 3 (WS-E+WS-H)** for STEP6 (Cross-Link Validation)
- ✅ Agent 1 (WS-A) continues independently on Steps 0-2

**Dependencies resolved:**
- STEP3 provides PatternMatcher and IntentLifter
- STEP2 provides confidence scoring with reinforcers
- Phase 2 Parser provides FactSets with correct predicates

---

## Critical Success Factors

1. **Pattern rules must be deterministic:** Same FactSet → same PatternMatch
2. **Confidence bonuses must be calibrated:** Avoid over-promotion (test with real codebases)
3. **Intent templates must be readable:** Generated text should sound natural
4. **Fallback to generic must work:** Unknown patterns handled gracefully

---

## API Alignment & Architecture Summary

**All Step 5 code has been updated to align with Phase 2/Step 3 frozen APIs and correct data models:**

### 1. Parser Predicate Alignment ✅

**All tests and matchers use Step 3 fact extractor predicates:**
- ✅ `calls-expression` (NOT `callsMethod` or `callsFunction`)
- ✅ `call-arg-0`, `call-arg-1` (NOT `hasLiteral`)
- ✅ `param-count`, `param-names` (from Step 3 extractor)
- ✅ `returns-jsx` (from Step 3 extractor)
- ✅ `is-function`, `is-class`, `is-exported` (Phase 2 predicates)
- ✅ `extends-class`, `has-method` (from Phase 2 parser)

### 2. Fact Model Field Names ✅

**All code uses correct Phase 2 Fact model:**
- ✅ `fact.object` (NOT `fact.objectId`)
- ✅ FactSets include `sources` and `evidenceScore` fields
- ✅ All tests create complete FactSet objects

### 3. Confidence API Usage ✅

**All code uses Step 2 frozen confidence API:**
- ✅ `kb.getConfidenceScore(factSetIds)` returns numeric 0-100 score
- ✅ `kb.scoreToConfidenceBand(score)` converts score to 'High' | 'Medium' | 'Low'
- ✅ `kb.scoreConfidence(factSetIds)` returns band directly (when score not needed)
- ✅ NO references to `kb.computeConfidence()` or `kb.getConfidenceBand()` (removed APIs)

### 4. Circular Dependency Resolution ✅

**Pattern confidence bonuses applied in IntentLifter, NOT in KB:**

**Architecture:**
```
KB (Phase 2)
  └─> confidence-scorer.ts (framework-agnostic, no pattern knowledge)

PatternMatcher (Step 5)
  ├─> express-rules.ts
  └─> react-rules.ts

IntentLifter (Step 3, updated in Step 5)
  ├─> imports PatternMatcher ✅
  ├─> calls kb.getConfidenceScore() to get base score
  ├─> calls matcher.match() to detect patterns
  ├─> adds pattern.confidence bonus to base score
  └─> calls kb.scoreToConfidenceBand() to convert final score
```

**Benefits:**
- ✅ No KB → PatternMatcher circular import
- ✅ KB remains framework-agnostic
- ✅ Pattern matching isolated in reasoning layer
- ✅ Confidence boosting transparent and testable

### 5. Integration Flow ✅

**Pattern-aware confidence scoring flow:**
1. Parser (Phase 2) extracts facts → FactSets
2. KB (Step 2) computes base confidence from facts (no pattern knowledge)
3. IntentLifter (Step 3/5):
   - Calls PatternMatcher to detect framework patterns
   - Gets base confidence score from KB
   - Adds pattern confidence bonus
   - Converts final score to Confidence band
   - Generates behavior chunk with pattern-aware text

**Validation:**
- ✅ Express route handler: base(40) + jsdoc + pattern(+15) = 55+ → Medium/High
- ✅ React component: base(40) + jsdoc + pattern(+15) = 55+ → Medium/High
- ✅ Generic function: base(30) + no pattern = 30 → Low/Medium

---

**End of STEP5**
