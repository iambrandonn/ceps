/**
 * Phase 4 WS-F1 Stage A2: Entity Name Index Unit Tests
 *
 * KB lacks name-based lookup, so validator maintains its own index.
 * Built once per run (O(n)), reused for all validations (O(k) lookup).
 *
 * TDD: Write failing tests BEFORE implementation.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { EntityNameIndex } from '../entity-name-index.js';
describe('EntityNameIndex', () => {
    let sampleEntities;
    beforeEach(() => {
        sampleEntities = [
            {
                id: 'func-1',
                kind: 'function',
                name: 'getUserById',
                path: 'src/users.ts',
                exported: true,
            },
            {
                id: 'class-1',
                kind: 'class',
                name: 'UserService',
                path: 'src/services/user-service.ts',
                exported: true,
            },
            {
                id: 'method-1',
                kind: 'method',
                name: 'validateUser',
                path: 'src/services/user-service.ts',
                exported: false,
            },
            {
                id: 'func-2',
                kind: 'function',
                name: 'saveUser',
                path: 'src/users.ts',
                exported: true,
            },
        ];
    });
    describe('Constructor & Basic Lookup', () => {
        it('should build index from entity array', () => {
            const index = new EntityNameIndex(sampleEntities);
            expect(index).toBeDefined();
        });
        it('should find entity by exact name', () => {
            const index = new EntityNameIndex(sampleEntities);
            const results = index.find('UserService');
            expect(results).toHaveLength(1);
            expect(results[0]).toBe('class-1');
        });
        it('should return empty array for unknown name', () => {
            const index = new EntityNameIndex(sampleEntities);
            const results = index.find('UnknownEntity');
            expect(results).toEqual([]);
        });
        it('should find multiple entities by name', () => {
            const index = new EntityNameIndex(sampleEntities);
            const results = index.find('getUserById');
            expect(results).toHaveLength(1);
            expect(results[0]).toBe('func-1');
        });
    });
    describe('Name Collisions', () => {
        it('should handle same name in different paths', () => {
            const entities = [
                {
                    id: 'func-a',
                    kind: 'function',
                    name: 'process',
                    path: 'src/order-processor.ts',
                    exported: true,
                },
                {
                    id: 'func-b',
                    kind: 'function',
                    name: 'process',
                    path: 'src/payment-processor.ts',
                    exported: true,
                },
            ];
            const index = new EntityNameIndex(entities);
            const results = index.find('process');
            expect(results).toHaveLength(2);
            expect(results).toContain('func-a');
            expect(results).toContain('func-b');
        });
        it('should handle same name with different kinds', () => {
            const entities = [
                {
                    id: 'const-1',
                    kind: 'constant',
                    name: 'Config',
                    path: 'src/config.ts',
                    exported: true,
                },
                {
                    id: 'class-1',
                    kind: 'class',
                    name: 'Config',
                    path: 'src/models/config.ts',
                    exported: true,
                },
            ];
            const index = new EntityNameIndex(entities);
            const results = index.find('Config');
            expect(results).toHaveLength(2);
            expect(results).toContain('const-1');
            expect(results).toContain('class-1');
        });
    });
    describe('Qualified Names', () => {
        it('should find method by qualified name (ClassName.methodName)', () => {
            const index = new EntityNameIndex(sampleEntities);
            const results = index.find('UserService.validateUser');
            expect(results).toHaveLength(1);
            expect(results[0]).toBe('method-1');
        });
        it('should handle non-existent qualified name', () => {
            const index = new EntityNameIndex(sampleEntities);
            const results = index.find('UserService.nonExistentMethod');
            expect(results).toEqual([]);
        });
        it('should prefer exact match over partial match', () => {
            const entities = [
                {
                    id: 'class-1',
                    kind: 'class',
                    name: 'UserService',
                    path: 'src/services/user-service.ts',
                    exported: true,
                },
                {
                    id: 'method-1',
                    kind: 'method',
                    name: 'validateUser',
                    path: 'src/services/user-service.ts',
                    exported: false,
                },
            ];
            const index = new EntityNameIndex(entities);
            // Simple name should find class
            const simpleResults = index.find('UserService');
            expect(simpleResults).toEqual(['class-1']);
            // Qualified name should find method
            const qualifiedResults = index.find('UserService.validateUser');
            expect(qualifiedResults).toEqual(['method-1']);
        });
    });
    describe('Edge Cases', () => {
        it('should handle empty entity array', () => {
            const index = new EntityNameIndex([]);
            const results = index.find('anything');
            expect(results).toEqual([]);
        });
        it('should handle case-sensitive names', () => {
            const index = new EntityNameIndex(sampleEntities);
            const lowerResults = index.find('userservice');
            const upperResults = index.find('USERSERVICE');
            const correctResults = index.find('UserService');
            expect(lowerResults).toEqual([]); // Case sensitive
            expect(upperResults).toEqual([]);
            expect(correctResults).toEqual(['class-1']);
        });
        it('should handle names with special characters', () => {
            const entities = [
                {
                    id: 'func-1',
                    kind: 'function',
                    name: '$emit',
                    path: 'src/vue-component.ts',
                    exported: true,
                },
            ];
            const index = new EntityNameIndex(entities);
            const results = index.find('$emit');
            expect(results).toEqual(['func-1']);
        });
        it('should handle very long entity lists efficiently', () => {
            // Build index with 1000 entities
            const manyEntities = Array.from({ length: 1000 }, (_, i) => ({
                id: `entity-${i}`,
                kind: 'function',
                name: `func${i}`,
                path: `src/file${i}.ts`,
                exported: true,
            }));
            const startTime = Date.now();
            const index = new EntityNameIndex(manyEntities);
            const buildTime = Date.now() - startTime;
            // Build should complete quickly (< 50ms)
            expect(buildTime).toBeLessThan(50);
            // Lookup should be O(k), not O(n)
            const lookupStart = Date.now();
            const results = index.find('func500');
            const lookupTime = Date.now() - lookupStart;
            expect(lookupTime).toBeLessThan(5);
            expect(results).toEqual(['entity-500']);
        });
    });
    describe('Integration with KB', () => {
        it('should work with real Entity objects from KB', () => {
            // Simulate KB.getAllEntities() output
            const kbEntities = [
                {
                    id: 'func-main',
                    kind: 'function',
                    name: 'main',
                    path: 'src/index.ts',
                    exported: true,
                    signature: '(): void',
                },
                {
                    id: 'class-app',
                    kind: 'class',
                    name: 'Application',
                    path: 'src/app.ts',
                    exported: true,
                    attributes: {
                        sideEffects: ['network', 'filesystem'],
                    },
                },
            ];
            const index = new EntityNameIndex(kbEntities);
            expect(index.find('main')).toEqual(['func-main']);
            expect(index.find('Application')).toEqual(['class-app']);
        });
    });
});
//# sourceMappingURL=entity-name-index.test.js.map