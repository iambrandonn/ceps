/**
 * Phase 5 Step 6: KB Serialization Tests
 *
 * Tests for KB serialize/deserialize functionality required for finalization.
 * Follows TDD: write tests first (Red phase).
 */
import { describe, it, expect } from 'vitest';
import { KnowledgeBase } from '../knowledge-base.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
describe('KB Serialization (Phase 5 Step 6)', () => {
    describe('serialize', () => {
        it('should serialize empty KB to JSON string', () => {
            const kb = new KnowledgeBase();
            const json = kb.serialize();
            const parsed = JSON.parse(json);
            expect(parsed).toHaveProperty('version');
            expect(parsed).toHaveProperty('entities');
            expect(parsed).toHaveProperty('relations');
            expect(parsed).toHaveProperty('factSets');
            expect(parsed).toHaveProperty('chunks');
            expect(parsed).toHaveProperty('openQuestions');
            expect(parsed).toHaveProperty('answers');
        });
        it('should serialize KB with entities', () => {
            const kb = new KnowledgeBase();
            const entity = {
                id: 'test-entity',
                kind: 'function',
                name: 'testFunction',
                path: 'src/test.ts',
                visibility: 'public'
            };
            kb.insertEntity(entity);
            const json = kb.serialize();
            const parsed = JSON.parse(json);
            expect(parsed.entities).toHaveLength(1);
            expect(parsed.entities[0]).toMatchObject(entity);
        });
        it('should serialize KB with factSets', () => {
            const kb = new KnowledgeBase();
            const factSet = {
                id: 'fs-1',
                facts: [
                    { subjectId: 'e1', predicate: 'test-pred', object: 'test-value' }
                ],
                sources: [{ kind: 'ast', file: 'test.ts' }],
                evidenceScore: 90
            };
            kb.insertFactSet(factSet);
            const json = kb.serialize();
            const parsed = JSON.parse(json);
            expect(parsed.factSets).toHaveLength(1);
            expect(parsed.factSets[0]).toMatchObject(factSet);
        });
        it('should serialize KB with chunks', () => {
            const kb = new KnowledgeBase();
            const chunk = {
                id: 'chunk-1',
                targetEntityId: 'e1',
                textDraft: 'Test behavior',
                factSetIds: ['fs-1'],
                confidence: 'High'
            };
            kb.insertChunk(chunk);
            const json = kb.serialize();
            const parsed = JSON.parse(json);
            expect(parsed.chunks).toHaveLength(1);
            expect(parsed.chunks[0]).toMatchObject(chunk);
        });
        it('should include version for compatibility checks', () => {
            const kb = new KnowledgeBase();
            const json = kb.serialize();
            const parsed = JSON.parse(json);
            expect(parsed.version).toBe('1.0');
        });
    });
    describe('deserialize', () => {
        it('should deserialize empty KB', () => {
            const original = new KnowledgeBase();
            const json = original.serialize();
            const restored = new KnowledgeBase();
            restored.deserialize(json);
            expect(restored.getAllEntities()).toHaveLength(0);
            expect(restored.getAllChunks()).toHaveLength(0);
        });
        it('should deserialize KB with entities', () => {
            const original = new KnowledgeBase();
            const entity = {
                id: 'test-entity',
                kind: 'function',
                name: 'testFunction',
                path: 'src/test.ts',
                visibility: 'public'
            };
            original.insertEntity(entity);
            const json = original.serialize();
            const restored = new KnowledgeBase();
            restored.deserialize(json);
            const entities = restored.getAllEntities();
            expect(entities).toHaveLength(1);
            expect(entities[0]).toMatchObject(entity);
        });
        it('should deserialize KB with factSets', () => {
            const original = new KnowledgeBase();
            const factSet = {
                id: 'fs-1',
                facts: [
                    { subjectId: 'e1', predicate: 'test-pred', object: 'test-value' }
                ],
                sources: [{ kind: 'ast', file: 'test.ts' }],
                evidenceScore: 90
            };
            original.insertFactSet(factSet);
            const json = original.serialize();
            const restored = new KnowledgeBase();
            restored.deserialize(json);
            const factSets = restored.getFactSetsBySubject('e1');
            expect(factSets).toHaveLength(1);
            expect(factSets[0]).toMatchObject(factSet);
        });
        it('should throw error on version mismatch', () => {
            const kb = new KnowledgeBase();
            const invalidJson = JSON.stringify({ version: '0.5', entities: [], relations: [] });
            expect(() => kb.deserialize(invalidJson)).toThrow('KB version mismatch');
        });
        it('should throw error on malformed JSON', () => {
            const kb = new KnowledgeBase();
            expect(() => kb.deserialize('not json')).toThrow();
        });
    });
    describe('serializeToFile', () => {
        it('should write KB to file', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-test-'));
            const filepath = path.join(tmpDir, 'kb-state.json');
            const kb = new KnowledgeBase();
            kb.insertEntity({
                id: 'e1',
                kind: 'function',
                name: 'test',
                path: 'test.ts'
            });
            await kb.serializeToFile(filepath);
            expect(fs.existsSync(filepath)).toBe(true);
            const content = fs.readFileSync(filepath, 'utf8');
            const parsed = JSON.parse(content);
            expect(parsed.entities).toHaveLength(1);
            // Cleanup
            fs.rmSync(tmpDir, { recursive: true });
        });
        it('should create parent directories if needed', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-test-'));
            const filepath = path.join(tmpDir, 'nested', 'dir', 'kb-state.json');
            const kb = new KnowledgeBase();
            await kb.serializeToFile(filepath);
            expect(fs.existsSync(filepath)).toBe(true);
            // Cleanup
            fs.rmSync(tmpDir, { recursive: true });
        });
    });
    describe('deserializeFromFile', () => {
        it('should read KB from file', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-test-'));
            const filepath = path.join(tmpDir, 'kb-state.json');
            const original = new KnowledgeBase();
            original.insertEntity({
                id: 'e1',
                kind: 'function',
                name: 'test',
                path: 'test.ts'
            });
            await original.serializeToFile(filepath);
            const restored = new KnowledgeBase();
            await restored.deserializeFromFile(filepath);
            expect(restored.getAllEntities()).toHaveLength(1);
            expect(restored.getAllEntities()[0].id).toBe('e1');
            // Cleanup
            fs.rmSync(tmpDir, { recursive: true });
        });
        it('should throw error if file does not exist', async () => {
            const kb = new KnowledgeBase();
            await expect(() => kb.deserializeFromFile('/nonexistent/path.json')).rejects.toThrow();
        });
    });
    describe('round-trip integrity', () => {
        it('should maintain KB state through serialize/deserialize cycle', () => {
            const original = new KnowledgeBase();
            // Add various elements
            original.insertEntity({
                id: 'e1',
                kind: 'function',
                name: 'fn1',
                path: 'src/test.ts',
                visibility: 'public'
            });
            original.insertFactSet({
                id: 'fs1',
                facts: [{ subjectId: 'e1', predicate: 'returns', object: 'string' }],
                sources: [{ kind: 'ast', file: 'src/test.ts' }],
                evidenceScore: 95
            });
            original.insertChunk({
                id: 'chunk1',
                targetEntityId: 'e1',
                textDraft: 'Returns a string value',
                factSetIds: ['fs1'],
                confidence: 'High'
            });
            original.insertRelation({
                subjectId: 'e1',
                predicate: 'calls',
                objectId: 'e2'
            });
            // Serialize and deserialize
            const json = original.serialize();
            const restored = new KnowledgeBase();
            restored.deserialize(json);
            // Verify integrity
            expect(restored.getAllEntities()).toHaveLength(1);
            expect(restored.getAllChunks()).toHaveLength(1);
            expect(restored.getRelations()).toHaveLength(1);
            expect(restored.getFactSet('fs1')).toBeDefined();
        });
    });
});
//# sourceMappingURL=kb-serialization.test.js.map