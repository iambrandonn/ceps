import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeBase } from '../../../src/kb/knowledge-base.js';
import { Entity, FactSet } from '../../../src/kb/models.js';

describe('KnowledgeBase Confidence Scoring', () => {
  let kb: KnowledgeBase;

  beforeEach(() => {
    kb = new KnowledgeBase();
  });

  describe('getConfidenceScore', () => {
    describe('base evidence (functions)', () => {
      it('should assign base 40 with typed exported function with JSDoc', () => {
        const func: Entity = {
          id: 'func-typed',
          kind: 'function',
          name: 'myFunc',
          path: 'src/a.ts',
          exported: true,
          signature: '(x: number): string'
        };
        kb.insertEntity(func);

        // Add 1 caller to avoid unused penalty
        const caller: Entity = {
          id: 'caller-1',
          kind: 'function',
          name: 'callerFunc',
          path: 'src/caller.ts',
          exported: false
        };
        kb.insertEntity(caller);
        kb.insertRelation({
          subjectId: caller.id,
          predicate: 'calls',
          objectId: func.id,
          details: { resolved: true },
          source: { kind: 'ast', file: 'src/caller.ts' }
        });

        const factSet: FactSet = {
          id: 'fs-typed',
          facts: [
            { subjectId: func.id, predicate: 'is-function', object: true },
            { subjectId: func.id, predicate: 'has-signature', object: '(x: number): string' },
            { subjectId: func.id, predicate: 'has-jsdoc', object: 'Does something' }
          ],
          sources: [{ kind: 'ast', file: 'src/a.ts' }],
          evidenceScore: 90
        };
        kb.insertFactSet(factSet);

        const score = kb.getConfidenceScore([factSet.id]);

        // base(40) + signature(+15) + 1-caller(+5) = 60
        expect(score).toBe(60);
      });

      it('should assign base 30 for exported function without JSDoc', () => {
        const func: Entity = {
          id: 'func-2',
          kind: 'function',
          name: 'myFunc',
          path: 'src/b.ts',
          exported: true,
          signature: '(): void'
        };
        kb.insertEntity(func);

        // Add caller to avoid unused penalty
        const caller: Entity = {
          id: 'caller-2',
          kind: 'function',
          name: 'callerFunc2',
          path: 'src/caller2.ts',
          exported: false
        };
        kb.insertEntity(caller);
        kb.insertRelation({
          subjectId: caller.id,
          predicate: 'calls',
          objectId: func.id,
          details: { resolved: true },
          source: { kind: 'ast', file: 'src/caller2.ts' }
        });

        const factSet: FactSet = {
          id: 'fs-2',
          facts: [
            { subjectId: func.id, predicate: 'is-function', object: true },
            { subjectId: func.id, predicate: 'has-signature', object: '(): void' }
          ],
          sources: [{ kind: 'ast', file: 'src/b.ts' }],
          evidenceScore: 90
        };
        kb.insertFactSet(factSet);

        const score = kb.getConfidenceScore([factSet.id]);

        // base(30) + signature(+15) + 1-caller(+5) = 50
        expect(score).toBe(50);
      });

      it('should assign base 30 for internal function with JSDoc', () => {
        const func: Entity = {
          id: 'func-3',
          kind: 'function',
          name: 'helperFunc',
          path: 'src/c.ts',
          exported: false,
          signature: '(): void'
        };
        kb.insertEntity(func);

        // Add caller
        const caller: Entity = {
          id: 'caller-3',
          kind: 'function',
          name: 'callerFunc3',
          path: 'src/caller3.ts',
          exported: false
        };
        kb.insertEntity(caller);
        kb.insertRelation({
          subjectId: caller.id,
          predicate: 'calls',
          objectId: func.id,
          details: { resolved: true },
          source: { kind: 'ast', file: 'src/caller3.ts' }
        });

        const factSet: FactSet = {
          id: 'fs-3',
          facts: [
            { subjectId: func.id, predicate: 'is-function', object: true },
            { subjectId: func.id, predicate: 'has-signature', object: '(): void' },
            { subjectId: func.id, predicate: 'has-jsdoc', object: 'Helper docs' }
          ],
          sources: [{ kind: 'ast', file: 'src/c.ts' }],
          evidenceScore: 90
        };
        kb.insertFactSet(factSet);

        const score = kb.getConfidenceScore([factSet.id]);

        // base(30) + signature(+15) + 1-caller(+5) = 50
        expect(score).toBe(50);
      });

      it('should assign base 20 for internal function without JSDoc or signature', () => {
        const func: Entity = {
          id: 'func-4',
          kind: 'function',
          name: 'helperFunc',
          path: 'src/c.ts',
          exported: false
        };
        kb.insertEntity(func);

        const factSet: FactSet = {
          id: 'fs-4',
          facts: [
            { subjectId: func.id, predicate: 'is-function', object: true }
            // NO has-signature, NO has-jsdoc
          ],
          sources: [{ kind: 'ast', file: 'src/c.ts' }],
          evidenceScore: 90
        };
        kb.insertFactSet(factSet);

        const score = kb.getConfidenceScore([factSet.id]);

        // base(20) - no-type(-10) - unused(-5) = 5
        expect(score).toBe(5);
      });
    });

    describe('base evidence (other entity kinds)', () => {
      it('should assign 40 for exported class with JSDoc', () => {
        const cls: Entity = {
          id: 'class-1',
          kind: 'class',
          name: 'MyClass',
          path: 'src/class.ts',
          exported: true
        };
        kb.insertEntity(cls);

        // Add caller to avoid unused penalty
        const caller: Entity = {
          id: 'caller-class',
          kind: 'function',
          name: 'callerFunc',
          path: 'src/caller.ts',
          exported: false
        };
        kb.insertEntity(caller);
        kb.insertRelation({
          subjectId: caller.id,
          predicate: 'calls',
          objectId: cls.id,
          details: { resolved: true },
          source: { kind: 'ast', file: 'src/caller.ts' }
        });

        const factSet: FactSet = {
          id: 'fs-class-1',
          facts: [
            { subjectId: cls.id, predicate: 'has-jsdoc', object: 'My class' }
          ],
          sources: [{ kind: 'ast', file: 'src/class.ts' }],
          evidenceScore: 90
        };
        kb.insertFactSet(factSet);

        const score = kb.getConfidenceScore([factSet.id]);

        // base(40) + 1-caller(+5) = 45
        expect(score).toBe(45);
      });

      it('should assign 30 for exported class without JSDoc', () => {
        const cls: Entity = {
          id: 'class-2',
          kind: 'class',
          name: 'MyClass',
          path: 'src/class.ts',
          exported: true
        };
        kb.insertEntity(cls);

        // Add caller
        const caller: Entity = {
          id: 'caller-class-2',
          kind: 'function',
          name: 'callerFunc2',
          path: 'src/caller2.ts',
          exported: false
        };
        kb.insertEntity(caller);
        kb.insertRelation({
          subjectId: caller.id,
          predicate: 'calls',
          objectId: cls.id,
          details: { resolved: true },
          source: { kind: 'ast', file: 'src/caller2.ts' }
        });

        const factSet: FactSet = {
          id: 'fs-class-2',
          facts: [
            { subjectId: cls.id, predicate: 'is-class', object: true }
          ],
          sources: [{ kind: 'ast', file: 'src/class.ts' }],
          evidenceScore: 90
        };
        kb.insertFactSet(factSet);

        const score = kb.getConfidenceScore([factSet.id]);

        // base(30) + 1-caller(+5) = 35
        expect(score).toBe(35);
      });

      it('should assign 25 for internal class', () => {
        const cls: Entity = {
          id: 'class-3',
          kind: 'class',
          name: 'MyClass',
          path: 'src/class.ts',
          exported: false
        };
        kb.insertEntity(cls);

        const factSet: FactSet = {
          id: 'fs-class-3',
          facts: [
            { subjectId: cls.id, predicate: 'is-class', object: true }
          ],
          sources: [{ kind: 'ast', file: 'src/class.ts' }],
          evidenceScore: 90
        };
        kb.insertFactSet(factSet);

        const score = kb.getConfidenceScore([factSet.id]);

        // base(25) - unused(-5) = 20
        expect(score).toBe(20);
      });

      it('should assign 35 for method with JSDoc', () => {
        const method: Entity = {
          id: 'method-1',
          kind: 'method',
          name: 'myMethod',
          path: 'src/class.ts',
          exported: true,
          signature: '(a: string): void'
        };
        kb.insertEntity(method);

        // Add caller
        const caller: Entity = {
          id: 'caller-method',
          kind: 'function',
          name: 'callerFunc',
          path: 'src/caller.ts',
          exported: false
        };
        kb.insertEntity(caller);
        kb.insertRelation({
          subjectId: caller.id,
          predicate: 'calls',
          objectId: method.id,
          details: { resolved: true },
          source: { kind: 'ast', file: 'src/caller.ts' }
        });

        const factSet: FactSet = {
          id: 'fs-method-1',
          facts: [
            { subjectId: method.id, predicate: 'has-signature', object: '(a: string): void' },
            { subjectId: method.id, predicate: 'has-jsdoc', object: 'Method docs' }
          ],
          sources: [{ kind: 'ast', file: 'src/class.ts' }],
          evidenceScore: 90
        };
        kb.insertFactSet(factSet);

        const score = kb.getConfidenceScore([factSet.id]);

        // base(35) + signature(+15) + 1-caller(+5) = 55
        expect(score).toBe(55);
      });

      it('should assign 25 for method without JSDoc', () => {
        const method: Entity = {
          id: 'method-2',
          kind: 'method',
          name: 'myMethod',
          path: 'src/class.ts',
          exported: true,
          signature: '(): void'
        };
        kb.insertEntity(method);

        // Add caller
        const caller: Entity = {
          id: 'caller-method-2',
          kind: 'function',
          name: 'callerFunc2',
          path: 'src/caller2.ts',
          exported: false
        };
        kb.insertEntity(caller);
        kb.insertRelation({
          subjectId: caller.id,
          predicate: 'calls',
          objectId: method.id,
          details: { resolved: true },
          source: { kind: 'ast', file: 'src/caller2.ts' }
        });

        const factSet: FactSet = {
          id: 'fs-method-2',
          facts: [
            { subjectId: method.id, predicate: 'has-signature', object: '(): void' }
          ],
          sources: [{ kind: 'ast', file: 'src/class.ts' }],
          evidenceScore: 90
        };
        kb.insertFactSet(factSet);

        const score = kb.getConfidenceScore([factSet.id]);

        // base(25) + signature(+15) + 1-caller(+5) = 45
        expect(score).toBe(45);
      });

      it('should assign 25 for constant', () => {
        const constant: Entity = {
          id: 'const-1',
          kind: 'constant',
          name: 'MAX_SIZE',
          path: 'src/config.ts',
          exported: true
        };
        kb.insertEntity(constant);

        const factSet: FactSet = {
          id: 'fs-const-1',
          facts: [
            { subjectId: constant.id, predicate: 'is-constant', object: true }
          ],
          sources: [{ kind: 'ast', file: 'src/config.ts' }],
          evidenceScore: 90
        };
        kb.insertFactSet(factSet);

        const score = kb.getConfidenceScore([factSet.id]);

        // base(25) - unused(-5) = 20
        expect(score).toBe(20);
      });

      it('should assign 45 for endpoint', () => {
        const endpoint: Entity = {
          id: 'endpoint-1',
          kind: 'endpoint',
          name: '/api/users',
          path: 'src/routes.ts',
          exported: true
        };
        kb.insertEntity(endpoint);

        // Add caller
        const caller: Entity = {
          id: 'caller-endpoint',
          kind: 'function',
          name: 'callerFunc',
          path: 'src/caller.ts',
          exported: false
        };
        kb.insertEntity(caller);
        kb.insertRelation({
          subjectId: caller.id,
          predicate: 'calls',
          objectId: endpoint.id,
          details: { resolved: true },
          source: { kind: 'ast', file: 'src/caller.ts' }
        });

        const factSet: FactSet = {
          id: 'fs-endpoint-1',
          facts: [
            { subjectId: endpoint.id, predicate: 'is-endpoint', object: true }
          ],
          sources: [{ kind: 'ast', file: 'src/routes.ts' }],
          evidenceScore: 90
        };
        kb.insertFactSet(factSet);

        const score = kb.getConfidenceScore([factSet.id]);

        // base(45) + 1-caller(+5) = 50
        expect(score).toBe(50);
      });
    });

    describe('reinforcers', () => {
      it('should apply +15 for type annotations', () => {
        const func: Entity = {
          id: 'func-typed',
          kind: 'function',
          name: 'typedFunc',
          path: 'src/d.ts',
          exported: true,
          signature: '(x: number): number'
        };
        kb.insertEntity(func);

        // Add caller
        const caller: Entity = {
          id: 'caller-typed',
          kind: 'function',
          name: 'callerFunc',
          path: 'src/caller.ts',
          exported: false
        };
        kb.insertEntity(caller);
        kb.insertRelation({
          subjectId: caller.id,
          predicate: 'calls',
          objectId: func.id,
          details: { resolved: true },
          source: { kind: 'ast', file: 'src/caller.ts' }
        });

        const factSet: FactSet = {
          id: 'fs-typed',
          facts: [
            { subjectId: func.id, predicate: 'is-function', object: true },
            { subjectId: func.id, predicate: 'has-jsdoc', object: 'Typed function' },
            { subjectId: func.id, predicate: 'has-signature', object: '(x: number): number' }
          ],
          sources: [{ kind: 'ast', file: 'src/d.ts' }],
          evidenceScore: 90
        };
        kb.insertFactSet(factSet);

        const score = kb.getConfidenceScore([factSet.id]);

        // base(40) + type(+15) + 1-caller(+5) = 60
        expect(score).toBe(60);
      });

      it('should apply +10 for ≥3 callers', () => {
        const funcA: Entity = {
          id: 'func-popular',
          kind: 'function',
          name: 'popularFunc',
          path: 'src/a.ts',
          exported: true,
          signature: '(): void'
        };
        kb.insertEntity(funcA);

        // 3 callers
        for (let i = 0; i < 3; i++) {
          const caller: Entity = {
            id: `caller-popular-${i}`,
            kind: 'function',
            name: `funcB${i}`,
            path: `src/b${i}.ts`,
            exported: false
          };
          kb.insertEntity(caller);
          kb.insertRelation({
            subjectId: caller.id,
            predicate: 'calls',
            objectId: funcA.id,
            details: { resolved: true },
            source: { kind: 'ast', file: `src/b${i}.ts` }
          });
        }

        const factSet: FactSet = {
          id: 'fs-popular',
          facts: [
            { subjectId: funcA.id, predicate: 'is-function', object: true },
            { subjectId: funcA.id, predicate: 'has-signature', object: '(): void' },
            { subjectId: funcA.id, predicate: 'has-jsdoc', object: 'Popular function' }
          ],
          sources: [{ kind: 'ast', file: 'src/a.ts' }],
          evidenceScore: 90
        };
        kb.insertFactSet(factSet);

        const score = kb.getConfidenceScore([factSet.id]);

        // base(40) + signature(+15) + callers≥3(+10) = 65
        expect(score).toBe(65);
      });

      it('should apply +5 for 1-2 callers', () => {
        const funcA: Entity = {
          id: 'func-single-caller',
          kind: 'function',
          name: 'func',
          path: 'src/a.ts',
          exported: true,
          signature: '(): void'
        };
        const funcB: Entity = {
          id: 'func-caller-single',
          kind: 'function',
          name: 'funcB',
          path: 'src/b.ts',
          exported: false
        };

        kb.insertEntity(funcA);
        kb.insertEntity(funcB);

        kb.insertRelation({
          subjectId: funcB.id,
          predicate: 'calls',
          objectId: funcA.id,
          details: { resolved: true },
          source: { kind: 'ast', file: 'src/b.ts' }
        });

        const factSet: FactSet = {
          id: 'fs-single',
          facts: [
            { subjectId: funcA.id, predicate: 'is-function', object: true },
            { subjectId: funcA.id, predicate: 'has-signature', object: '(): void' }
          ],
          sources: [{ kind: 'ast', file: 'src/a.ts' }],
          evidenceScore: 90
        };
        kb.insertFactSet(factSet);

        const score = kb.getConfidenceScore([factSet.id]);

        // base(30) + signature(+15) + 1-caller(+5) = 50
        expect(score).toBe(50);
      });

      it('should apply +5 for error handling present', () => {
        const func: Entity = {
          id: 'func-errors',
          kind: 'function',
          name: 'errorFunc',
          path: 'src/errors.ts',
          exported: true,
          signature: '(): void',
          attributes: {
            errors: ['new TypeError("Invalid input")']
          }
        };
        kb.insertEntity(func);

        // Add caller
        const caller: Entity = {
          id: 'caller-errors',
          kind: 'function',
          name: 'callerFunc',
          path: 'src/caller.ts',
          exported: false
        };
        kb.insertEntity(caller);
        kb.insertRelation({
          subjectId: caller.id,
          predicate: 'calls',
          objectId: func.id,
          details: { resolved: true },
          source: { kind: 'ast', file: 'src/caller.ts' }
        });

        const factSet: FactSet = {
          id: 'fs-errors',
          facts: [
            { subjectId: func.id, predicate: 'is-function', object: true },
            { subjectId: func.id, predicate: 'has-signature', object: '(): void' }
          ],
          sources: [{ kind: 'ast', file: 'src/errors.ts' }],
          evidenceScore: 90
        };
        kb.insertFactSet(factSet);

        const score = kb.getConfidenceScore([factSet.id]);

        // base(30) + signature(+15) + error(+5) + 1-caller(+5) = 55
        expect(score).toBe(55);
      });
    });

    describe('penalties', () => {
      it('should apply -10 for no type info on functions', () => {
        const func: Entity = {
          id: 'func-untyped',
          kind: 'function',
          name: 'untypedFunc',
          path: 'src/untyped.ts',
          exported: true
        };
        kb.insertEntity(func);

        // Add caller to avoid unused penalty
        const caller: Entity = {
          id: 'caller-untyped',
          kind: 'function',
          name: 'callerFunc',
          path: 'src/caller.ts',
          exported: false
        };
        kb.insertEntity(caller);
        kb.insertRelation({
          subjectId: caller.id,
          predicate: 'calls',
          objectId: func.id,
          details: { resolved: true },
          source: { kind: 'ast', file: 'src/caller.ts' }
        });

        const factSet: FactSet = {
          id: 'fs-untyped',
          facts: [
            { subjectId: func.id, predicate: 'is-function', object: true },
            { subjectId: func.id, predicate: 'has-jsdoc', object: 'Untyped function' }
            // NO has-signature fact
          ],
          sources: [{ kind: 'ast', file: 'src/untyped.ts' }],
          evidenceScore: 90
        };
        kb.insertFactSet(factSet);

        const score = kb.getConfidenceScore([factSet.id]);

        // base(40) - no-type(-10) + 1-caller(+5) = 35
        expect(score).toBe(35);
      });

      it('should apply -10 for no type info on methods', () => {
        const method: Entity = {
          id: 'method-untyped',
          kind: 'method',
          name: 'untypedMethod',
          path: 'src/class.ts',
          exported: true
        };
        kb.insertEntity(method);

        // Add caller
        const caller: Entity = {
          id: 'caller-method-untyped',
          kind: 'function',
          name: 'callerFunc',
          path: 'src/caller.ts',
          exported: false
        };
        kb.insertEntity(caller);
        kb.insertRelation({
          subjectId: caller.id,
          predicate: 'calls',
          objectId: method.id,
          details: { resolved: true },
          source: { kind: 'ast', file: 'src/caller.ts' }
        });

        const factSet: FactSet = {
          id: 'fs-method-untyped',
          facts: [
            { subjectId: method.id, predicate: 'has-jsdoc', object: 'Untyped method' }
            // NO has-signature fact
          ],
          sources: [{ kind: 'ast', file: 'src/class.ts' }],
          evidenceScore: 90
        };
        kb.insertFactSet(factSet);

        const score = kb.getConfidenceScore([factSet.id]);

        // base(35) - no-type(-10) + 1-caller(+5) = 30
        expect(score).toBe(30);
      });

      it('should NOT apply type penalty to classes', () => {
        const cls: Entity = {
          id: 'class-no-sig',
          kind: 'class',
          name: 'MyClass',
          path: 'src/class.ts',
          exported: true
        };
        kb.insertEntity(cls);

        // Add caller to avoid unused penalty
        const caller: Entity = {
          id: 'caller-class-no-sig',
          kind: 'function',
          name: 'callerFunc',
          path: 'src/caller.ts',
          exported: false
        };
        kb.insertEntity(caller);
        kb.insertRelation({
          subjectId: caller.id,
          predicate: 'calls',
          objectId: cls.id,
          details: { resolved: true },
          source: { kind: 'ast', file: 'src/caller.ts' }
        });

        const factSet: FactSet = {
          id: 'fs-class-no-sig',
          facts: [
            { subjectId: cls.id, predicate: 'has-jsdoc', object: 'Well-documented class' }
            // NO has-signature fact (classes don't have signatures)
          ],
          sources: [{ kind: 'ast', file: 'src/class.ts' }],
          evidenceScore: 90
        };
        kb.insertFactSet(factSet);

        const score = kb.getConfidenceScore([factSet.id]);

        // base(40) + 1-caller(+5) = 45 (NO type penalty)
        expect(score).toBe(45);
      });

      it('should NOT apply type penalty to constants', () => {
        const constant: Entity = {
          id: 'const-no-sig',
          kind: 'constant',
          name: 'MY_CONSTANT',
          path: 'src/config.ts',
          exported: true
        };
        kb.insertEntity(constant);

        const factSet: FactSet = {
          id: 'fs-const-no-sig',
          facts: [
            { subjectId: constant.id, predicate: 'is-constant', object: true }
          ],
          sources: [{ kind: 'ast', file: 'src/config.ts' }],
          evidenceScore: 90
        };
        kb.insertFactSet(factSet);

        const score = kb.getConfidenceScore([factSet.id]);

        // base(25) - unused(-5) = 20 (NO type penalty for constants)
        expect(score).toBe(20);
      });

      it('should apply -5 for unused entity (no reverse deps)', () => {
        const func: Entity = {
          id: 'func-unused',
          kind: 'function',
          name: 'unusedFunc',
          path: 'src/unused.ts',
          exported: true,
          signature: '(): void'
        };
        kb.insertEntity(func);

        const factSet: FactSet = {
          id: 'fs-unused',
          facts: [
            { subjectId: func.id, predicate: 'is-function', object: true },
            { subjectId: func.id, predicate: 'has-signature', object: '(): void' },
            { subjectId: func.id, predicate: 'has-jsdoc', object: 'Unused function' }
          ],
          sources: [{ kind: 'ast', file: 'src/unused.ts' }],
          evidenceScore: 90
        };
        kb.insertFactSet(factSet);

        const score = kb.getConfidenceScore([factSet.id]);

        // base(40) + signature(+15) - unused(-5) = 50
        expect(score).toBe(50);
      });
    });

    describe('clamping', () => {
      it('should clamp confidence to [0, 100]', () => {
        const funcHigh: Entity = {
          id: 'func-high',
          kind: 'function',
          name: 'highFunc',
          path: 'src/high.ts',
          exported: true,
          signature: '(x: number): number',
          attributes: {
            errors: ['new Error()']
          }
        };
        kb.insertEntity(funcHigh);

        // Add 3+ callers for max reinforcers
        for (let i = 0; i < 3; i++) {
          const caller: Entity = {
            id: `caller-high-${i}`,
            kind: 'function',
            name: `caller${i}`,
            path: `src/caller${i}.ts`,
            exported: false
          };
          kb.insertEntity(caller);
          kb.insertRelation({
            subjectId: caller.id,
            predicate: 'calls',
            objectId: funcHigh.id,
            details: { resolved: true },
            source: { kind: 'ast', file: `src/caller${i}.ts` }
          });
        }

        const factSetHigh: FactSet = {
          id: 'fs-high',
          facts: [
            { subjectId: funcHigh.id, predicate: 'is-function', object: true },
            { subjectId: funcHigh.id, predicate: 'has-jsdoc', object: 'Well documented' },
            { subjectId: funcHigh.id, predicate: 'has-signature', object: '(x: number): number' }
          ],
          sources: [{ kind: 'ast', file: 'src/high.ts' }],
          evidenceScore: 90
        };
        kb.insertFactSet(factSetHigh);

        const scoreHigh = kb.getConfidenceScore([factSetHigh.id]);
        // base(40) + signature(+15) + error(+5) + callers≥3(+10) = 70
        expect(scoreHigh).toBeLessThanOrEqual(100);
        expect(scoreHigh).toBe(70);

        const funcLow: Entity = {
          id: 'func-low',
          kind: 'function',
          name: 'lowFunc',
          path: 'src/low.ts',
          exported: false
        };
        kb.insertEntity(funcLow);

        const factSetLow: FactSet = {
          id: 'fs-low',
          facts: [
            { subjectId: funcLow.id, predicate: 'is-function', object: true }
          ],
          sources: [{ kind: 'ast', file: 'src/low.ts' }],
          evidenceScore: 90
        };
        kb.insertFactSet(factSetLow);

        const scoreLow = kb.getConfidenceScore([factSetLow.id]);
        expect(scoreLow).toBeGreaterThanOrEqual(0);
        expect(scoreLow).toBe(5); // base(20) - no-type(-10) - unused(-5) = 5
      });
    });

    describe('combined scenarios', () => {
      it('should combine multiple reinforcers and penalties correctly', () => {
        const funcA: Entity = {
          id: 'func-combo',
          kind: 'function',
          name: 'comboFunc',
          path: 'src/combo.ts',
          exported: true,
          signature: '(x: number): number',
          attributes: {
            errors: ['new Error()']
          }
        };
        const funcB: Entity = {
          id: 'func-combo-caller',
          kind: 'function',
          name: 'callerFunc',
          path: 'src/caller.ts',
          exported: false
        };

        kb.insertEntity(funcA);
        kb.insertEntity(funcB);

        kb.insertRelation({
          subjectId: funcB.id,
          predicate: 'calls',
          objectId: funcA.id,
          details: { resolved: true },
          source: { kind: 'ast', file: 'src/caller.ts' }
        });

        const factSet: FactSet = {
          id: 'fs-combo',
          facts: [
            { subjectId: funcA.id, predicate: 'is-function', object: true },
            { subjectId: funcA.id, predicate: 'has-jsdoc', object: 'Combo function' },
            { subjectId: funcA.id, predicate: 'has-signature', object: '(x: number): number' }
          ],
          sources: [{ kind: 'ast', file: 'src/combo.ts' }],
          evidenceScore: 90
        };
        kb.insertFactSet(factSet);

        const score = kb.getConfidenceScore([factSet.id]);

        // base(40) + signature(+15) + error(+5) + 1-caller(+5) = 65
        expect(score).toBe(65);
      });

      it('should merge multiple factSets correctly', () => {
        const func: Entity = {
          id: 'func-multi',
          kind: 'function',
          name: 'multiFactSetFunc',
          path: 'src/multi.ts',
          exported: true,
          signature: '(x: number): number',
          attributes: {
            errors: ['new Error()']
          }
        };
        kb.insertEntity(func);

        // Add caller
        const caller: Entity = {
          id: 'caller-multi',
          kind: 'function',
          name: 'callerFunc',
          path: 'src/caller.ts',
          exported: false
        };
        kb.insertEntity(caller);
        kb.insertRelation({
          subjectId: caller.id,
          predicate: 'calls',
          objectId: func.id,
          details: { resolved: true },
          source: { kind: 'ast', file: 'src/caller.ts' }
        });

        // FactSet 1: AST facts (base evidence)
        const factSet1: FactSet = {
          id: 'fs-multi-1',
          facts: [
            { subjectId: func.id, predicate: 'is-function', object: true },
            { subjectId: func.id, predicate: 'has-jsdoc', object: 'Multi-factSet function' },
            { subjectId: func.id, predicate: 'has-signature', object: '(x: number): number' }
          ],
          sources: [{ kind: 'ast', file: 'src/multi.ts' }],
          evidenceScore: 90
        };

        // FactSet 2: Additional facts (could come from auxiliary readers)
        const factSet2: FactSet = {
          id: 'fs-multi-2',
          facts: [
            { subjectId: func.id, predicate: 'has-additional-info', object: true }
          ],
          sources: [{ kind: 'test', file: 'tests/multi.test.ts' }],
          evidenceScore: 90
        };

        kb.insertFactSet(factSet1);
        kb.insertFactSet(factSet2);

        // Score with both factSets merged
        const score = kb.getConfidenceScore([factSet1.id, factSet2.id]);

        // base(40) + signature(+15) + error(+5) + 1-caller(+5) = 65
        expect(score).toBe(65);
      });
    });
  });

  describe('scoreToConfidenceBand', () => {
    it('should return "High" for scores ≥ 70', () => {
      expect(kb.scoreToConfidenceBand(70)).toBe('High');
      expect(kb.scoreToConfidenceBand(85)).toBe('High');
      expect(kb.scoreToConfidenceBand(100)).toBe('High');
    });

    it('should return "Medium" for scores 40-69', () => {
      expect(kb.scoreToConfidenceBand(40)).toBe('Medium');
      expect(kb.scoreToConfidenceBand(55)).toBe('Medium');
      expect(kb.scoreToConfidenceBand(69)).toBe('Medium');
    });

    it('should return "Low" for scores < 40', () => {
      expect(kb.scoreToConfidenceBand(0)).toBe('Low');
      expect(kb.scoreToConfidenceBand(20)).toBe('Low');
      expect(kb.scoreToConfidenceBand(39)).toBe('Low');
    });
  });

  describe('scoreConfidence (main API)', () => {
    it('should return Confidence band directly', () => {
      const func: Entity = {
        id: 'func-main-api',
        kind: 'function',
        name: 'testFunc',
        path: 'src/test.ts',
        exported: true,
        signature: '(x: number): number'
      };
      kb.insertEntity(func);

      // Add 3 callers to reach High confidence
      for (let i = 0; i < 3; i++) {
        const caller: Entity = {
          id: `caller-main-${i}`,
          kind: 'function',
          name: `caller${i}`,
          path: `src/caller${i}.ts`,
          exported: false
        };
        kb.insertEntity(caller);
        kb.insertRelation({
          subjectId: caller.id,
          predicate: 'calls',
          objectId: func.id,
          details: { resolved: true },
          source: { kind: 'ast', file: `src/caller${i}.ts` }
        });
      }

      const factSet: FactSet = {
        id: 'fs-main-api',
        facts: [
          { subjectId: func.id, predicate: 'is-function', object: true },
          { subjectId: func.id, predicate: 'has-jsdoc', object: 'Test function' },
          { subjectId: func.id, predicate: 'has-signature', object: '(x: number): number' }
        ],
        sources: [{ kind: 'ast', file: 'src/test.ts' }],
        evidenceScore: 90
      };
      kb.insertFactSet(factSet);

      const confidence = kb.scoreConfidence([factSet.id]);

      // base(40) + signature(+15) + callers≥3(+10) = 65 (Medium)
      expect(confidence).toBe('Medium');
    });
  });

  describe('edge cases', () => {
    it('should handle empty factSetIds array', () => {
      const score = kb.getConfidenceScore([]);
      expect(score).toBe(0);
    });

    it('should handle non-existent factSet ID', () => {
      const score = kb.getConfidenceScore(['non-existent']);
      expect(score).toBe(0);
    });

    it('should handle factSet with no facts', () => {
      const func: Entity = {
        id: 'func-empty',
        kind: 'function',
        name: 'emptyFunc',
        path: 'src/empty.ts',
        exported: true,
        signature: '(): void'
      };
      kb.insertEntity(func);

      const factSet: FactSet = {
        id: 'fs-empty',
        facts: [
          { subjectId: func.id, predicate: 'is-function', object: true },
          { subjectId: func.id, predicate: 'has-signature', object: '(): void' }
        ],
        sources: [{ kind: 'ast', file: 'src/empty.ts' }],
        evidenceScore: 90
      };
      kb.insertFactSet(factSet);

      const score = kb.getConfidenceScore([factSet.id]);

      // base(30) + signature(+15) - unused(-5) = 40
      expect(score).toBe(40);
    });

    it('should return 20 when entity not found in KB', () => {
      // FactSet references entity that doesn't exist
      const factSet: FactSet = {
        id: 'fs-orphan',
        facts: [
          { subjectId: 'non-existent-entity', predicate: 'is-function', object: true }
        ],
        sources: [{ kind: 'ast', file: 'src/orphan.ts' }],
        evidenceScore: 90
      };
      kb.insertFactSet(factSet);

      const score = kb.getConfidenceScore([factSet.id]);

      // Entity not found: base=20, unused penalty=-5 (no reverseDeps)
      expect(score).toBe(15);
    });

    it('should handle unknown entity kind with default score', () => {
      const unknownEntity: Entity = {
        id: 'unknown-1',
        kind: 'unknown-kind' as any,  // Simulate unknown kind
        name: 'unknownThing',
        path: 'src/unknown.ts',
        exported: true
      };
      kb.insertEntity(unknownEntity);

      const factSet: FactSet = {
        id: 'fs-unknown',
        facts: [
          { subjectId: unknownEntity.id, predicate: 'some-predicate', object: true }
        ],
        sources: [{ kind: 'ast', file: 'src/unknown.ts' }],
        evidenceScore: 90
      };
      kb.insertFactSet(factSet);

      const score = kb.getConfidenceScore([factSet.id]);

      // Unknown kind hits default case, base = 20, unused penalty = -5
      expect(score).toBe(15);
    });
  });
});
