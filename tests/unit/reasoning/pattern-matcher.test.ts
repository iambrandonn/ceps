/**
 * Phase 3 Step 3: PatternMatcher Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PatternMatcher } from '../../../src/reasoning/PatternMatcher.js';
import { KnowledgeBase } from '../../../src/kb/knowledge-base.js';
import { FactSet } from '../../../src/kb/models.js';

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
          { subjectId: 'func-1', predicate: 'has-signature', object: '(req, res): void' },
        ],
        sources: [{ kind: 'ast', file: 'src/routes.ts' }],
        evidenceScore: 90,
      };

      const pattern = matcher.match(factSet);

      expect(pattern).toBeDefined();
      expect(pattern?.name).toBe('express-route-handler');
      expect(pattern?.framework).toBe('Express');
      expect(pattern?.intent).toContain('GET');
      expect(pattern?.intent).toContain('/users');
      expect(pattern?.priority).toBe(80);
    });

    it('should detect POST route handler', () => {
      const factSet: FactSet = {
        id: 'fs-express-2',
        facts: [
          { subjectId: 'func-2', predicate: 'calls-expression', object: 'app.post' },
          { subjectId: 'func-2', predicate: 'call-arg-0', object: '/users/:id' },
        ],
        sources: [{ kind: 'ast', file: 'src/routes.ts' }],
        evidenceScore: 90,
      };

      const pattern = matcher.match(factSet);

      expect(pattern?.name).toBe('express-route-handler');
      expect(pattern?.intent).toContain('POST');
      expect(pattern?.intent).toContain('/users/:id');
    });

    it('should detect Express middleware pattern', () => {
      const factSet: FactSet = {
        id: 'fs-express-3',
        facts: [
          { subjectId: 'func-3', predicate: 'calls-expression', object: 'app.use' },
          { subjectId: 'func-3', predicate: 'param-count', object: 3 },
          { subjectId: 'func-3', predicate: 'param-names', object: 'req,res,next' },
        ],
        sources: [{ kind: 'ast', file: 'src/middleware.ts' }],
        evidenceScore: 90,
      };

      const pattern = matcher.match(factSet);

      expect(pattern?.name).toBe('express-middleware');
      expect(pattern?.framework).toBe('Express');
      expect(pattern?.priority).toBe(70);
    });

    it('should detect Express error handler (4-param)', () => {
      const factSet: FactSet = {
        id: 'fs-express-4',
        facts: [
          { subjectId: 'func-4', predicate: 'param-count', object: 4 },
          { subjectId: 'func-4', predicate: 'param-names', object: 'err,req,res,next' },
        ],
        sources: [{ kind: 'ast', file: 'src/error.ts' }],
        evidenceScore: 90,
      };

      const pattern = matcher.match(factSet);

      expect(pattern?.name).toBe('express-error-handler');
      expect(pattern?.priority).toBe(90); // Highest priority
    });

    it('should prefer error handler over middleware when both match', () => {
      const factSet: FactSet = {
        id: 'fs-multi',
        facts: [
          { subjectId: 'func-5', predicate: 'calls-expression', object: 'app.use' },
          { subjectId: 'func-5', predicate: 'param-count', object: 4 },
          { subjectId: 'func-5', predicate: 'param-names', object: 'err,req,res,next' },
        ],
        sources: [{ kind: 'ast', file: 'src/error.ts' }],
        evidenceScore: 90,
      };

      const pattern = matcher.match(factSet);

      // Should prefer error handler (priority 90) over middleware (priority 70)
      expect(pattern?.name).toBe('express-error-handler');
    });

    it('should detect correct route method when multiple calls present (REGRESSION: FEEDBACK1 High)', () => {
      // Regression test: Function calls app.use first, then app.get
      // Should report GET, not USE
      const factSet: FactSet = {
        id: 'fs-regression-1',
        facts: [
          { subjectId: 'func-mixed', predicate: 'calls-expression', object: 'app.use' },
          { subjectId: 'func-mixed', predicate: 'calls-expression', object: 'app.get' },
          { subjectId: 'func-mixed', predicate: 'call-arg-0', object: '/users' },
        ],
        sources: [{ kind: 'ast', file: 'src/routes.ts' }],
        evidenceScore: 90,
      };

      const pattern = matcher.match(factSet);

      // Should detect GET (from app.get), not USE (from app.use)
      expect(pattern?.name).toBe('express-route-handler');
      expect(pattern?.intent).toContain('GET');
      expect(pattern?.intent).not.toContain('USE');
      expect(pattern?.intent).toContain('/users');
    });

    it('should match route path to correct call when multiple calls have arguments (REGRESSION: FEEDBACK2 High)', () => {
      // Regression test: BOTH app.use and app.get have literal path arguments
      // This is the realistic scenario that exposed the bug:
      // - app.use emits call-arg-0: '/middleware'
      // - app.get emits call-arg-0: '/users'
      // Pattern matcher must grab the RIGHT call-arg-0 for app.get, not the first one
      const factSet: FactSet = {
        id: 'fs-regression-feedback2',
        facts: [
          { subjectId: 'func-multi-args', predicate: 'calls-expression', object: 'app.use' },
          { subjectId: 'func-multi-args', predicate: 'call-arg-0', object: '/middleware' },  // app.use's path
          { subjectId: 'func-multi-args', predicate: 'calls-expression', object: 'app.get' },
          { subjectId: 'func-multi-args', predicate: 'call-arg-0', object: '/users' },       // app.get's path
        ],
        sources: [{ kind: 'ast', file: 'src/routes.ts' }],
        evidenceScore: 90,
      };

      const pattern = matcher.match(factSet);

      // Should match app.get with its correct path (/users), not app.use's path (/middleware)
      expect(pattern?.name).toBe('express-route-handler');
      expect(pattern?.intent).toContain('GET');
      expect(pattern?.intent).toContain('/users');          // ✓ Correct path
      expect(pattern?.intent).not.toContain('/middleware'); // ✓ Wrong path should not appear
    });
  });

  describe('React patterns', () => {
    it('should detect React functional component', () => {
      // Insert entity for component name lookup
      kb.insertEntity({
        id: 'func-6',
        kind: 'function',
        name: 'Button',
        path: 'src/Button.tsx',
        exported: true,
      });

      const factSet: FactSet = {
        id: 'fs-react-1',
        facts: [
          { subjectId: 'func-6', predicate: 'is-exported', object: true },
          { subjectId: 'func-6', predicate: 'returns-jsx', object: true },
          { subjectId: 'func-6', predicate: 'has-signature', object: '(props): JSX.Element' },
        ],
        sources: [{ kind: 'ast', file: 'src/Button.tsx' }],
        evidenceScore: 90,
      };

      const pattern = matcher.match(factSet);

      expect(pattern?.name).toBe('react-functional-component');
      expect(pattern?.framework).toBe('React');
      expect(pattern?.intent).toContain('Button');
      expect(pattern?.priority).toBe(80);
    });

    it('should detect React useState hook', () => {
      // useState without JSX return - not a component, just using the hook
      const factSet: FactSet = {
        id: 'fs-react-2',
        facts: [
          { subjectId: 'func-7', predicate: 'calls-expression', object: 'useState' },
          // NOTE: No returns-jsx - this is a custom hook or utility, not a component
        ],
        sources: [{ kind: 'ast', file: 'src/hooks/useCounter.ts' }],
        evidenceScore: 90,
      };

      const pattern = matcher.match(factSet);

      expect(pattern?.name).toBe('react-useState-hook');
      expect(pattern?.framework).toBe('React');
    });

    it('should detect React useEffect hook', () => {
      const factSet: FactSet = {
        id: 'fs-react-3',
        facts: [
          { subjectId: 'func-8', predicate: 'calls-expression', object: 'useEffect' },
        ],
        sources: [{ kind: 'ast', file: 'src/App.tsx' }],
        evidenceScore: 90,
      };

      const pattern = matcher.match(factSet);

      expect(pattern?.name).toBe('react-useEffect-hook');
    });

    it('should detect React useContext hook', () => {
      const factSet: FactSet = {
        id: 'fs-react-4',
        facts: [
          { subjectId: 'func-9', predicate: 'calls-expression', object: 'useContext' },
        ],
        sources: [{ kind: 'ast', file: 'src/App.tsx' }],
        evidenceScore: 90,
      };

      const pattern = matcher.match(factSet);

      expect(pattern?.name).toBe('react-useContext-hook');
    });

    it('should detect React useRef hook', () => {
      const factSet: FactSet = {
        id: 'fs-react-5',
        facts: [
          { subjectId: 'func-10', predicate: 'calls-expression', object: 'useRef' },
        ],
        sources: [{ kind: 'ast', file: 'src/App.tsx' }],
        evidenceScore: 90,
      };

      const pattern = matcher.match(factSet);

      expect(pattern?.name).toBe('react-useRef-hook');
    });

    it('should detect React useMemo hook', () => {
      const factSet: FactSet = {
        id: 'fs-react-6',
        facts: [
          { subjectId: 'func-11', predicate: 'calls-expression', object: 'useMemo' },
        ],
        sources: [{ kind: 'ast', file: 'src/App.tsx' }],
        evidenceScore: 90,
      };

      const pattern = matcher.match(factSet);

      expect(pattern?.name).toBe('react-useMemo-hook');
    });

    it('should detect React useCallback hook', () => {
      const factSet: FactSet = {
        id: 'fs-react-7',
        facts: [
          { subjectId: 'func-12', predicate: 'calls-expression', object: 'useCallback' },
        ],
        sources: [{ kind: 'ast', file: 'src/App.tsx' }],
        evidenceScore: 90,
      };

      const pattern = matcher.match(factSet);

      expect(pattern?.name).toBe('react-useCallback-hook');
    });

    it('should give exported components priority 80 (REGRESSION: FEEDBACK1 Medium)', () => {
      // Regression test: Exported components should get priority 80, not 70
      kb.insertEntity({
        id: 'func-exported-comp',
        kind: 'function',
        name: 'ExportedButton',
        path: 'src/ExportedButton.tsx',
        exported: true, // Exported component
      });

      const factSet: FactSet = {
        id: 'fs-regression-2',
        facts: [
          { subjectId: 'func-exported-comp', predicate: 'returns-jsx', object: true },
        ],
        sources: [{ kind: 'ast', file: 'src/ExportedButton.tsx' }],
        evidenceScore: 90,
      };

      const pattern = matcher.match(factSet);

      expect(pattern?.name).toBe('react-functional-component');
      expect(pattern?.priority).toBe(80); // Exported → priority 80
    });

    it('should give internal components priority 70 (REGRESSION: FEEDBACK1 Medium)', () => {
      // Internal (non-exported) components should get priority 70
      kb.insertEntity({
        id: 'func-internal-comp',
        kind: 'function',
        name: 'InternalHelper',
        path: 'src/utils/InternalHelper.tsx',
        exported: false, // Internal component
      });

      const factSet: FactSet = {
        id: 'fs-regression-3',
        facts: [
          { subjectId: 'func-internal-comp', predicate: 'returns-jsx', object: true },
        ],
        sources: [{ kind: 'ast', file: 'src/utils/InternalHelper.tsx' }],
        evidenceScore: 90,
      };

      const pattern = matcher.match(factSet);

      expect(pattern?.name).toBe('react-functional-component');
      expect(pattern?.priority).toBe(70); // Internal → priority 70
    });
  });

  describe('no pattern match', () => {
    it('should return null when no pattern matches', () => {
      const factSet: FactSet = {
        id: 'fs-generic',
        facts: [
          { subjectId: 'func-13', predicate: 'is-function', object: true },
        ],
        sources: [{ kind: 'ast', file: 'src/utils.ts' }],
        evidenceScore: 90,
      };

      const pattern = matcher.match(factSet);

      expect(pattern).toBeNull();
    });
  });
});
