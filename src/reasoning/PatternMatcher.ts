/**
 * Phase 3 Step 3: PatternMatcher
 *
 * Detects framework patterns (Express, React basics - Tier 0 only) from factSets.
 * Returns highest-priority matching pattern for a given factSet.
 */

import { KnowledgeBase } from '../kb/knowledge-base.js';
import { FactSet } from '../kb/models.js';

export interface Pattern {
  name: string;
  framework: string;
  intent: string;
  priority: number;
}

export class PatternMatcher {
  constructor(private kb: KnowledgeBase) {}

  /**
   * Match a factSet against all known patterns.
   * Returns the highest-priority matching pattern, or null if no match.
   */
  match(factSet: FactSet): Pattern | null {
    const patterns = [
      // Express patterns (highest priority first)
      this.matchExpressErrorHandler,
      this.matchExpressRouteHandler,
      this.matchExpressMiddleware,
      // React patterns
      this.matchReactFunctionalComponent,
      this.matchReactUseStateHook,
      this.matchReactUseEffectHook,
      this.matchReactUseContextHook,
      this.matchReactUseRefHook,
      this.matchReactUseMemoHook,
      this.matchReactUseCallbackHook,
    ];

    for (const patternFn of patterns) {
      const pattern = patternFn.call(this, factSet);
      if (pattern) return pattern;
    }

    return null;
  }

  /**
   * Express: Error handler (4-parameter middleware)
   * Priority: 90 (highest - must check before generic middleware)
   */
  private matchExpressErrorHandler(factSet: FactSet): Pattern | null {
    const has4Params = factSet.facts.some(
      f => f.predicate === 'param-count' && f.object === 4
    );

    const paramNames = factSet.facts.find(f => f.predicate === 'param-names');
    const isErrorHandler = has4Params &&
      paramNames &&
      String(paramNames.object).match(/err.*req.*res.*next/i);

    if (isErrorHandler) {
      return {
        name: 'express-error-handler',
        framework: 'Express',
        intent: 'Error handling middleware (4-param signature)',
        priority: 90,
      };
    }

    return null;
  }

  /**
   * Express: Route handler (app.get, app.post, etc.)
   * Priority: 80
   *
   * REQUIRED FACTS:
   * - calls-expression matching app.(get|post|put|delete|patch)
   * - call-arg-0 (optional, for route path)
   *
   * AMBIGUITY HANDLING (FEEDBACK1 + FEEDBACK2 fixes):
   * - Uses first calls-expression that matches route regex (not just any call)
   * - call-arg-0 must be associated with matched call (searches forward from call, stops at next call)
   */
  private matchExpressRouteHandler(factSet: FactSet): Pattern | null {
    const routeRegex = /^app\.(get|post|put|delete|patch)$/;
    const routeCallIndex = factSet.facts.findIndex(
      f => f.predicate === 'calls-expression' && routeRegex.test(String(f.object))
    );

    if (routeCallIndex !== -1) {
      const routeCall = factSet.facts[routeCallIndex];
      const method = String(routeCall.object).split('.')[1]?.toUpperCase() || 'HTTP';

      // FIX (FEEDBACK2): Find call-arg-0 AFTER the route call, but BEFORE any other calls-expression
      // This associates the argument with the specific route call, not just any call in the factSet
      let routeArg = null;
      for (let i = routeCallIndex + 1; i < factSet.facts.length; i++) {
        const fact = factSet.facts[i];
        if (fact.predicate === 'calls-expression') {
          // Hit another call before finding call-arg-0 - route call has no literal path argument
          break;
        }
        if (fact.predicate === 'call-arg-0') {
          // Found the first argument to our route call
          routeArg = fact;
          break;
        }
      }

      const route = routeArg ? String(routeArg.object) : '';

      return {
        name: 'express-route-handler',
        framework: 'Express',
        intent: `Handles ${method} requests to ${route}`,
        priority: 80,
      };
    }

    return null;
  }

  /**
   * Express: Middleware (app.use or 3-param function)
   * Priority: 70
   */
  private matchExpressMiddleware(factSet: FactSet): Pattern | null {
    const hasAppUse = factSet.facts.some(
      f => f.predicate === 'calls-expression' && String(f.object) === 'app.use'
    );
    const has3Params = factSet.facts.some(
      f => f.predicate === 'param-count' && f.object === 3
    );

    const paramNames = factSet.facts.find(f => f.predicate === 'param-names');
    const isMiddleware = (hasAppUse || has3Params) &&
      paramNames &&
      String(paramNames.object).match(/req.*res.*next/i);

    if (isMiddleware) {
      return {
        name: 'express-middleware',
        framework: 'Express',
        intent: 'Middleware function that processes requests',
        priority: 70,
      };
    }

    return null;
  }

  /**
   * React: Functional component (returns JSX, exported)
   * Priority: 80 (exported), 70 (internal)
   */
  private matchReactFunctionalComponent(factSet: FactSet): Pattern | null {
    const returnsJSX = factSet.facts.some(f => f.predicate === 'returns-jsx' && f.object === true);

    if (returnsJSX) {
      const subjectId = factSet.facts[0]?.subjectId;
      const entity = this.kb.getEntity(subjectId);
      const componentName = entity?.name || 'Component';

      // FIX: Check entity.exported field from KB, not is-exported fact
      const isExported = entity?.exported === true;

      return {
        name: 'react-functional-component',
        framework: 'React',
        intent: `Renders ${componentName} component`,
        priority: isExported ? 80 : 70, // Higher priority for exported components
      };
    }

    return null;
  }

  /**
   * React: useState hook
   * Priority: 75
   */
  private matchReactUseStateHook(factSet: FactSet): Pattern | null {
    const hasUseState = factSet.facts.some(
      f => f.predicate === 'calls-expression' && String(f.object) === 'useState'
    );

    if (hasUseState) {
      return {
        name: 'react-useState-hook',
        framework: 'React',
        intent: 'Manages state using useState hook',
        priority: 75,
      };
    }

    return null;
  }

  /**
   * React: useEffect hook
   * Priority: 75
   */
  private matchReactUseEffectHook(factSet: FactSet): Pattern | null {
    const hasUseEffect = factSet.facts.some(
      f => f.predicate === 'calls-expression' && String(f.object) === 'useEffect'
    );

    if (hasUseEffect) {
      return {
        name: 'react-useEffect-hook',
        framework: 'React',
        intent: 'Side effect using useEffect hook',
        priority: 75,
      };
    }

    return null;
  }

  /**
   * React: useContext hook
   * Priority: 75
   */
  private matchReactUseContextHook(factSet: FactSet): Pattern | null {
    const hasUseContext = factSet.facts.some(
      f => f.predicate === 'calls-expression' && String(f.object) === 'useContext'
    );

    if (hasUseContext) {
      return {
        name: 'react-useContext-hook',
        framework: 'React',
        intent: 'Accesses context using useContext hook',
        priority: 75,
      };
    }

    return null;
  }

  /**
   * React: useRef hook
   * Priority: 75
   */
  private matchReactUseRefHook(factSet: FactSet): Pattern | null {
    const hasUseRef = factSet.facts.some(
      f => f.predicate === 'calls-expression' && String(f.object) === 'useRef'
    );

    if (hasUseRef) {
      return {
        name: 'react-useRef-hook',
        framework: 'React',
        intent: 'Creates mutable ref using useRef hook',
        priority: 75,
      };
    }

    return null;
  }

  /**
   * React: useMemo hook
   * Priority: 75
   */
  private matchReactUseMemoHook(factSet: FactSet): Pattern | null {
    const hasUseMemo = factSet.facts.some(
      f => f.predicate === 'calls-expression' && String(f.object) === 'useMemo'
    );

    if (hasUseMemo) {
      return {
        name: 'react-useMemo-hook',
        framework: 'React',
        intent: 'Memoizes value using useMemo hook',
        priority: 75,
      };
    }

    return null;
  }

  /**
   * React: useCallback hook
   * Priority: 75
   */
  private matchReactUseCallbackHook(factSet: FactSet): Pattern | null {
    const hasUseCallback = factSet.facts.some(
      f => f.predicate === 'calls-expression' && String(f.object) === 'useCallback'
    );

    if (hasUseCallback) {
      return {
        name: 'react-useCallback-hook',
        framework: 'React',
        intent: 'Memoizes callback using useCallback hook',
        priority: 75,
      };
    }

    return null;
  }
}
