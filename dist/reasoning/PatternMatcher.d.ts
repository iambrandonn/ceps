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
    confidence: number;
}
export declare class PatternMatcher {
    private kb;
    constructor(kb: KnowledgeBase);
    /**
     * Match a factSet against all known patterns.
     * Returns the highest-priority matching pattern, or null if no match.
     */
    match(factSet: FactSet): Pattern | null;
    /**
     * Express: Error handler (4-parameter middleware)
     * Priority: 90 (highest - must check before generic middleware)
     */
    private matchExpressErrorHandler;
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
    private matchExpressRouteHandler;
    /**
     * Express: Middleware (app.use or 3-param function)
     * Priority: 70
     */
    private matchExpressMiddleware;
    /**
     * React: Functional component (returns JSX, exported)
     * Priority: 80 (exported), 70 (internal)
     */
    private matchReactFunctionalComponent;
    /**
     * React: useState hook
     * Priority: 75
     */
    private matchReactUseStateHook;
    /**
     * React: useEffect hook
     * Priority: 75
     */
    private matchReactUseEffectHook;
    /**
     * React: useContext hook
     * Priority: 75
     */
    private matchReactUseContextHook;
    /**
     * React: useRef hook
     * Priority: 75
     */
    private matchReactUseRefHook;
    /**
     * React: useMemo hook
     * Priority: 75
     */
    private matchReactUseMemoHook;
    /**
     * React: useCallback hook
     * Priority: 75
     */
    private matchReactUseCallbackHook;
}
//# sourceMappingURL=PatternMatcher.d.ts.map