import { describe, it, expect, beforeEach } from 'vitest';
import { RelationResolver } from '../../../src/reasoning/relation-resolver.js';
import { KnowledgeBase } from '../../../src/kb/knowledge-base.js';
import { Relation, Entity } from '../../../src/kb/models.js';

describe('RelationResolver', () => {
  let kb: KnowledgeBase;
  let resolver: RelationResolver;

  beforeEach(() => {
    kb = new KnowledgeBase();
    resolver = new RelationResolver(kb);
  });

  describe('resolve', () => {
    it('should resolve simple function call by name', () => {
      // Setup: two functions, A calls B
      const funcA: Entity = {
        id: 'func-a-abc123',
        kind: 'function',
        name: 'functionA',
        path: 'src/a.ts',
        exported: true
      };
      const funcB: Entity = {
        id: 'func-b-def456',
        kind: 'function',
        name: 'functionB',
        path: 'src/b.ts',
        exported: true
      };

      kb.insertEntity(funcA);
      kb.insertEntity(funcB);

      const callRelation: Relation = {
        subjectId: funcA.id,
        predicate: 'calls',
        objectId: 'functionB',  // Expression text
        source: { kind: 'ast', file: 'src/a.ts' }
      };

      kb.insertRelation(callRelation);

      // Resolve relations
      const resolved = resolver.resolve(kb.getRelations());

      // Should resolve 'functionB' → 'func-b-def456'
      expect(resolved.length).toBe(1);
      expect(resolved[0].objectId).toBe(funcB.id);
      expect(resolved[0].details?.resolved).toBe(true);
      expect(resolved[0].details?.originalExpression).toBe('functionB');
    });

    it('should resolve qualified method call (ClassName.methodName)', () => {
      const classA: Entity = {
        id: 'class-a-abc123',
        kind: 'class',
        name: 'MyClass',
        path: 'src/class.ts',
        exported: true
      };
      const methodA: Entity = {
        id: 'method-a-def456',
        kind: 'method',
        name: 'myMethod',
        path: 'src/class.ts',
        signature: '(): void',
        exported: true
      };

      kb.insertEntity(classA);
      kb.insertEntity(methodA);

      const callRelation: Relation = {
        subjectId: 'caller-xyz789',
        predicate: 'calls',
        objectId: 'MyClass.myMethod',  // Qualified expression
        source: { kind: 'ast', file: 'src/caller.ts' }
      };

      kb.insertRelation(callRelation);

      const resolved = resolver.resolve(kb.getRelations());

      expect(resolved[0].objectId).toBe(methodA.id);
      expect(resolved[0].details?.resolved).toBe(true);
    });

    it('should mark external library calls as unresolved', () => {
      const funcA: Entity = {
        id: 'func-a-abc123',
        kind: 'function',
        name: 'myFunc',
        path: 'src/a.ts',
        exported: false
      };

      kb.insertEntity(funcA);

      const callRelation: Relation = {
        subjectId: funcA.id,
        predicate: 'calls',
        objectId: 'express.Router',  // External library
        source: { kind: 'ast', file: 'src/a.ts' }
      };

      kb.insertRelation(callRelation);

      const resolved = resolver.resolve(kb.getRelations());

      // Should NOT resolve (external) - objectId should be null
      expect(resolved[0].objectId).toBeNull();
      expect(resolved[0].details?.resolved).toBe(false);
      expect(resolved[0].details?.originalExpression).toBe('express.Router');
    });

    it('should mark dynamic calls as unresolved', () => {
      const funcA: Entity = {
        id: 'func-a-abc123',
        kind: 'function',
        name: 'dynamicCaller',
        path: 'src/dynamic.ts',
        exported: false
      };

      kb.insertEntity(funcA);

      const callRelation: Relation = {
        subjectId: funcA.id,
        predicate: 'calls',
        objectId: 'obj[methodName]()',  // Dynamic access
        source: { kind: 'ast', file: 'src/dynamic.ts' }
      };

      kb.insertRelation(callRelation);

      const resolved = resolver.resolve(kb.getRelations());

      // Dynamic calls should have objectId = null
      expect(resolved[0].objectId).toBeNull();
      expect(resolved[0].details?.resolved).toBe(false);
      expect(resolved[0].details?.originalExpression).toBe('obj[methodName]()');
    });

    it('should handle member expression calls when base object is known', () => {
      // Create a service class and its method
      const serviceClass: Entity = {
        id: 'service-class-abc123',
        kind: 'class',
        name: 'Service',
        path: 'src/service.ts',
        exported: true
      };
      const methodA: Entity = {
        id: 'method-a-def456',
        kind: 'method',
        name: 'process',
        path: 'src/service.ts',
        exported: false
      };

      kb.insertEntity(serviceClass);
      kb.insertEntity(methodA);

      // Call to Service.process() where Service is a known class
      const callRelation: Relation = {
        subjectId: 'caller-xyz789',
        predicate: 'calls',
        objectId: 'Service.process',
        source: { kind: 'ast', file: 'src/caller.ts' }
      };

      kb.insertRelation(callRelation);

      const resolved = resolver.resolve(kb.getRelations());

      // Should resolve because 'Service' is a known class
      expect(resolved[0].objectId).toBe(methodA.id);
      expect(resolved[0].details?.resolved).toBe(true);
    });

    it('should preserve import/export relations unchanged', () => {
      const importRelation: Relation = {
        subjectId: 'src/a.ts',
        predicate: 'imports',
        objectId: './b',
        source: { kind: 'ast', file: 'src/a.ts' }
      };

      kb.insertRelation(importRelation);

      const resolved = resolver.resolve(kb.getRelations());

      // Import relations should be unchanged
      expect(resolved[0]).toEqual(importRelation);
    });

    it('should handle multiple calls from same function', () => {
      const funcA: Entity = {
        id: 'func-a-abc123',
        kind: 'function',
        name: 'caller',
        path: 'src/caller.ts',
        exported: false
      };
      const funcB: Entity = {
        id: 'func-b-def456',
        kind: 'function',
        name: 'funcB',
        path: 'src/b.ts',
        exported: true
      };
      const funcC: Entity = {
        id: 'func-c-ghi789',
        kind: 'function',
        name: 'funcC',
        path: 'src/c.ts',
        exported: true
      };

      kb.insertEntity(funcA);
      kb.insertEntity(funcB);
      kb.insertEntity(funcC);

      kb.insertRelation({
        subjectId: funcA.id,
        predicate: 'calls',
        objectId: 'funcB',
        source: { kind: 'ast', file: 'src/caller.ts' }
      });
      kb.insertRelation({
        subjectId: funcA.id,
        predicate: 'calls',
        objectId: 'funcC',
        source: { kind: 'ast', file: 'src/caller.ts' }
      });

      const resolved = resolver.resolve(kb.getRelations());

      expect(resolved.length).toBe(2);
      expect(resolved[0].objectId).toBe(funcB.id);
      expect(resolved[1].objectId).toBe(funcC.id);
    });
  });

  describe('buildEntityLookup', () => {
    it('should build lookup map from entity names', () => {
      const funcA: Entity = {
        id: 'func-a-abc123',
        kind: 'function',
        name: 'myFunction',
        path: 'src/a.ts',
        exported: true
      };
      const classB: Entity = {
        id: 'class-b-def456',
        kind: 'class',
        name: 'MyClass',
        path: 'src/b.ts',
        exported: true
      };

      kb.insertEntity(funcA);
      kb.insertEntity(classB);

      const lookup = resolver.buildEntityLookup();

      expect(lookup.get('myFunction')).toContain(funcA.id);
      expect(lookup.get('MyClass')).toContain(classB.id);
    });

    it('should include qualified names for methods', () => {
      const classA: Entity = {
        id: 'class-a-abc123',
        kind: 'class',
        name: 'MyClass',
        path: 'src/class.ts',
        exported: true
      };
      const methodA: Entity = {
        id: 'method-a-def456',
        kind: 'method',
        name: 'myMethod',
        path: 'src/class.ts',
        exported: true
      };

      kb.insertEntity(classA);
      kb.insertEntity(methodA);

      const lookup = resolver.buildEntityLookup();

      // Methods should be accessible by name alone and qualified name
      expect(lookup.get('myMethod')).toContain(methodA.id);
      expect(lookup.get('MyClass.myMethod')).toContain(methodA.id);
    });

    it('should handle multiple entities with same name', () => {
      const helperInA: Entity = {
        id: 'helper-a-abc123',
        kind: 'function',
        name: 'helper',
        path: 'src/a.ts',
        exported: true
      };
      const helperInB: Entity = {
        id: 'helper-b-def456',
        kind: 'function',
        name: 'helper',
        path: 'src/b.ts',
        exported: true
      };

      kb.insertEntity(helperInA);
      kb.insertEntity(helperInB);

      const lookup = resolver.buildEntityLookup();

      // Should contain both helpers
      const helpers = lookup.get('helper');
      expect(helpers).toHaveLength(2);
      expect(helpers).toContain(helperInA.id);
      expect(helpers).toContain(helperInB.id);
    });
  });

  describe('chained method calls', () => {
    it('should identify the rightmost method in chained calls', () => {
      // service.create().save() - the actual call is to 'save', not 'create'
      const saveMethod: Entity = {
        id: 'save-method-abc123',
        kind: 'method',
        name: 'save',
        path: 'src/model.ts',
        exported: false
      };
      const caller: Entity = {
        id: 'caller-def456',
        kind: 'function',
        name: 'myFunction',
        path: 'src/caller.ts',
        exported: false
      };

      kb.insertEntity(saveMethod);
      kb.insertEntity(caller);

      // Chained call: service.create().save()
      kb.insertRelation({
        subjectId: caller.id,
        predicate: 'calls',
        objectId: 'service.create().save()',
        source: { kind: 'ast', file: 'src/caller.ts' }
      });

      const resolved = resolver.resolve(kb.getRelations());

      // Should resolve to 'save' method (the rightmost call)
      const callRelation = resolved[0];
      expect(callRelation.objectId).toBe(saveMethod.id);
      expect(callRelation.details?.resolved).toBe(true);
    });

    it('should handle multiple chained calls', () => {
      const processMethod: Entity = {
        id: 'process-method-abc123',
        kind: 'method',
        name: 'process',
        path: 'src/pipeline.ts',
        exported: false
      };

      kb.insertEntity(processMethod);

      // Multiple chained calls
      kb.insertRelation({
        subjectId: 'caller-xyz',
        predicate: 'calls',
        objectId: 'builder.create().validate().process()',
        source: { kind: 'ast', file: 'src/caller.ts' }
      });

      const resolved = resolver.resolve(kb.getRelations());

      // Should resolve to 'process' (the final call in the chain)
      expect(resolved[0].objectId).toBe(processMethod.id);
    });
  });

  describe('external library calls', () => {
    it('should NOT resolve external library calls like console.log()', () => {
      // No entity named 'console' or 'log' exists
      const caller: Entity = {
        id: 'caller-abc123',
        kind: 'function',
        name: 'myFunction',
        path: 'src/caller.ts',
        exported: false
      };

      kb.insertEntity(caller);

      kb.insertRelation({
        subjectId: caller.id,
        predicate: 'calls',
        objectId: 'console.log',
        source: { kind: 'ast', file: 'src/caller.ts' }
      });

      const resolved = resolver.resolve(kb.getRelations());

      // Should NOT resolve (external standard library)
      const callRelation = resolved[0];
      expect(callRelation.objectId).toBeNull();
      expect(callRelation.details?.resolved).toBe(false);
      expect(callRelation.details?.originalExpression).toBe('console.log');
    });

    it('should NOT resolve external calls even if local function has matching last name', () => {
      // Local function named 'log' exists
      const logFunc: Entity = {
        id: 'log-func-abc123',
        kind: 'function',
        name: 'log',
        path: 'src/utils.ts',
        exported: true
      };
      const caller: Entity = {
        id: 'caller-def456',
        kind: 'function',
        name: 'myFunction',
        path: 'src/caller.ts',
        exported: false
      };

      kb.insertEntity(logFunc);
      kb.insertEntity(caller);

      // Call to console.log() - should NOT resolve to local 'log' function
      kb.insertRelation({
        subjectId: caller.id,
        predicate: 'calls',
        objectId: 'console.log',
        source: { kind: 'ast', file: 'src/caller.ts' }
      });

      const resolved = resolver.resolve(kb.getRelations());

      // Should NOT resolve to local 'log' function
      const callRelation = resolved[0];
      expect(callRelation.objectId).toBeNull();
      expect(callRelation.details?.resolved).toBe(false);
    });

    it('should NOT resolve fs.readFile even if local readFile exists', () => {
      const readFileFunc: Entity = {
        id: 'readfile-abc123',
        kind: 'function',
        name: 'readFile',
        path: 'src/file-utils.ts',
        exported: true
      };
      const caller: Entity = {
        id: 'caller-def456',
        kind: 'function',
        name: 'myFunction',
        path: 'src/caller.ts',
        exported: false
      };

      kb.insertEntity(readFileFunc);
      kb.insertEntity(caller);

      kb.insertRelation({
        subjectId: caller.id,
        predicate: 'calls',
        objectId: 'fs.readFile',
        source: { kind: 'ast', file: 'src/caller.ts' }
      });

      const resolved = resolver.resolve(kb.getRelations());

      // Should NOT resolve to local readFile
      const callRelation = resolved[0];
      expect(callRelation.objectId).toBeNull();
      expect(callRelation.details?.resolved).toBe(false);
    });
  });

  describe('collision scenarios', () => {
    it('should resolve calls to same-named functions in different files correctly', () => {
      // Setup: Two functions with same name in different files
      const helperInA: Entity = {
        id: 'helper-a-abc123',
        kind: 'function',
        name: 'helper',
        path: 'src/a.ts',
        exported: true
      };
      const helperInB: Entity = {
        id: 'helper-b-def456',
        kind: 'function',
        name: 'helper',
        path: 'src/b.ts',
        exported: true
      };
      const caller: Entity = {
        id: 'caller-xyz789',
        kind: 'function',
        name: 'caller',
        path: 'src/caller.ts',
        exported: false
      };

      kb.insertEntity(helperInA);
      kb.insertEntity(helperInB);
      kb.insertEntity(caller);

      // PHASE 2 REALITY: Import relations use FILE PATH as subjectId, not entity ID
      // And there's no details.imported field - just the module specifier
      kb.insertRelation({
        subjectId: 'src/caller.ts',  // File path (Phase 2 schema)
        predicate: 'imports',
        objectId: './a',  // Module specifier (matches 'src/a.ts' via path heuristic)
        source: { kind: 'ast', file: 'src/caller.ts' }
        // NO details.imported field - Phase 2 doesn't provide this
      });
      kb.insertRelation({
        subjectId: caller.id,
        predicate: 'calls',
        objectId: 'helper',
        source: { kind: 'ast', file: 'src/caller.ts' }
      });

      const resolved = resolver.resolve(kb.getRelations());

      // Should resolve to helper from src/a.ts (the imported one), not src/b.ts
      const callRelation = resolved.find(r => r.predicate === 'calls');
      expect(callRelation?.objectId).toBe(helperInA.id);
      expect(callRelation?.details?.resolved).toBe(true);
    });

    it('should resolve qualified method calls with multiple classes per file', () => {
      // Setup: File with two classes, each with their own UNIQUELY named methods
      // Note: Without parent-child relationship data in Entity model, we cannot
      // reliably distinguish same-named methods in different classes in the same file.
      // This test uses unique method names as would be typical in real codebases.
      const firstClass: Entity = {
        id: 'class-first-abc123',
        kind: 'class',
        name: 'FirstClass',
        path: 'src/classes.ts',
        exported: true
      };
      const secondClass: Entity = {
        id: 'class-second-def456',
        kind: 'class',
        name: 'SecondClass',
        path: 'src/classes.ts',
        exported: true
      };
      const firstMethod: Entity = {
        id: 'method-first-ghi789',
        kind: 'method',
        name: 'processFirst',
        path: 'src/classes.ts',
        exported: true
      };
      const secondMethod: Entity = {
        id: 'method-second-jkl012',
        kind: 'method',
        name: 'processSecond',
        path: 'src/classes.ts',
        exported: true
      };

      kb.insertEntity(firstClass);
      kb.insertEntity(secondClass);
      kb.insertEntity(firstMethod);
      kb.insertEntity(secondMethod);

      // Call to SecondClass.processSecond()
      kb.insertRelation({
        subjectId: 'caller-xyz789',
        predicate: 'calls',
        objectId: 'SecondClass.processSecond',
        source: { kind: 'ast', file: 'src/caller.ts' }
      });

      const resolved = resolver.resolve(kb.getRelations());

      // Should resolve to the correct method based on qualified name
      const callRelation = resolved[0];
      expect(callRelation.objectId).toBe(secondMethod.id);
      expect(callRelation.details?.resolved).toBe(true);
    });

    it('should resolve same-named methods to correct class using entity array order', () => {
      // Phase 2 extracts entities in SOURCE ORDER: class, then its methods.
      // The resolver uses this ordering to track parent-child relationships.
      //
      // Setup: Two classes in same file, both have method with SAME name "process"
      // CRITICAL: Must insert entities in the order Phase 2 would extract them
      const firstClass: Entity = {
        id: 'class-first-abc123',
        kind: 'class',
        name: 'FirstClass',
        path: 'src/classes.ts',
        exported: true
      };
      const firstClassProcessMethod: Entity = {
        id: 'method-first-process',
        kind: 'method',
        name: 'process',
        path: 'src/classes.ts',
        exported: true
      };
      const secondClass: Entity = {
        id: 'class-second-def456',
        kind: 'class',
        name: 'SecondClass',
        path: 'src/classes.ts',
        exported: true
      };
      const secondClassProcessMethod: Entity = {
        id: 'method-second-process',
        kind: 'method',
        name: 'process',
        path: 'src/classes.ts',
        exported: true
      };

      // Insert in SOURCE ORDER (as Phase 2 would extract)
      kb.insertEntity(firstClass);
      kb.insertEntity(firstClassProcessMethod);  // FirstClass's method
      kb.insertEntity(secondClass);
      kb.insertEntity(secondClassProcessMethod); // SecondClass's method

      // Call to FirstClass.process()
      kb.insertRelation({
        subjectId: 'caller-1',
        predicate: 'calls',
        objectId: 'FirstClass.process',
        source: { kind: 'ast', file: 'src/caller.ts' }
      });

      // Call to SecondClass.process()
      kb.insertRelation({
        subjectId: 'caller-2',
        predicate: 'calls',
        objectId: 'SecondClass.process',
        source: { kind: 'ast', file: 'src/caller.ts' }
      });

      const resolved = resolver.resolve(kb.getRelations());

      // Find each call relation
      const firstClassCall = resolved.find(r => r.subjectId === 'caller-1' && r.predicate === 'calls');
      const secondClassCall = resolved.find(r => r.subjectId === 'caller-2' && r.predicate === 'calls');

      // Assert EXACT target IDs (not just truthy)
      expect(firstClassCall?.objectId).toBe(firstClassProcessMethod.id);
      expect(secondClassCall?.objectId).toBe(secondClassProcessMethod.id);
      expect(firstClassCall?.details?.resolved).toBe(true);
      expect(secondClassCall?.details?.resolved).toBe(true);

      // Verify no cross-contamination
      expect(firstClassCall?.objectId).not.toBe(secondClassProcessMethod.id);
      expect(secondClassCall?.objectId).not.toBe(firstClassProcessMethod.id);
    });
  });
});
