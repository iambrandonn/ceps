/**
 * Phase 4 WS-F1 Stage D: Lexicon Normalization Tests
 *
 * Tests for terminology normalization to canonical verbs.
 * Enforces consistent vocabulary in behavior descriptions per SADS §7.3.
 *
 * TDD: Write ALL tests BEFORE implementation (Red phase).
 */
import { describe, it, expect } from 'vitest';
import { LexiconLoader, normalizeTerm } from '../lexicon/lexicon-loader.js';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
describe('LexiconLoader', () => {
    describe('JSON Loading', () => {
        it('should load valid lexicon JSON', () => {
            const loader = new LexiconLoader();
            const lexiconPath = resolve(__dirname, '../lexicon/ceps.lexicon.json');
            expect(existsSync(lexiconPath)).toBe(true);
            // Should not throw
            expect(() => loader.load(lexiconPath)).not.toThrow();
        });
        it('should reject malformed JSON', () => {
            const loader = new LexiconLoader();
            const malformedPath = resolve(__dirname, '../lexicon/malformed.json');
            // Create a malformed JSON for testing (or mock)
            expect(() => loader.load(malformedPath)).toThrow();
        });
        it('should cache loaded lexicon', () => {
            const loader = new LexiconLoader();
            const lexiconPath = resolve(__dirname, '../lexicon/ceps.lexicon.json');
            loader.load(lexiconPath);
            const firstLoad = loader.normalize('retrieve');
            // Load again - should use cache
            loader.load(lexiconPath);
            const secondLoad = loader.normalize('retrieve');
            expect(firstLoad).toBe(secondLoad);
        });
    });
    describe('Synonym Normalization', () => {
        it('should normalize known synonym to canonical verb', () => {
            const loader = new LexiconLoader();
            const lexiconPath = resolve(__dirname, '../lexicon/ceps.lexicon.json');
            loader.load(lexiconPath);
            // "retrieve" should map to "fetch"
            const result = loader.normalize('retrieve');
            expect(result).toBe('fetch');
        });
        it('should return original term for unknown synonym', () => {
            const loader = new LexiconLoader();
            const lexiconPath = resolve(__dirname, '../lexicon/ceps.lexicon.json');
            loader.load(lexiconPath);
            // Unknown term should return as-is
            const result = loader.normalize('unknownVerb');
            expect(result).toBe('unknownVerb');
        });
        it('should handle case-insensitive normalization', () => {
            const loader = new LexiconLoader();
            const lexiconPath = resolve(__dirname, '../lexicon/ceps.lexicon.json');
            loader.load(lexiconPath);
            // Should normalize regardless of case
            expect(loader.normalize('RETRIEVE')).toBe('fetch');
            expect(loader.normalize('Retrieve')).toBe('fetch');
            expect(loader.normalize('retrieve')).toBe('fetch');
        });
        it('should normalize multiple synonyms to same canonical', () => {
            const loader = new LexiconLoader();
            const lexiconPath = resolve(__dirname, '../lexicon/ceps.lexicon.json');
            loader.load(lexiconPath);
            // Multiple synonyms for "validate"
            expect(loader.normalize('check')).toBe('validate');
            expect(loader.normalize('verify')).toBe('validate');
        });
    });
    describe('Standalone Normalize Function', () => {
        it('should expose standalone normalizeTerm function', () => {
            // Should use default lexicon path
            const result = normalizeTerm('retrieve');
            expect(result).toBe('fetch');
        });
        it('should handle unknown terms gracefully', () => {
            const result = normalizeTerm('unknownTerm');
            expect(result).toBe('unknownTerm');
        });
    });
    describe('Lexicon Structure Validation', () => {
        it('should have alphabetically sorted canonical verbs', () => {
            const lexiconPath = resolve(__dirname, '../lexicon/ceps.lexicon.json');
            const content = JSON.parse(readFileSync(lexiconPath, 'utf-8'));
            const canonicals = Object.keys(content);
            const sorted = [...canonicals].sort();
            expect(canonicals).toEqual(sorted);
        });
        it('should have at least 20 canonical verbs', () => {
            const lexiconPath = resolve(__dirname, '../lexicon/ceps.lexicon.json');
            const content = JSON.parse(readFileSync(lexiconPath, 'utf-8'));
            const canonicals = Object.keys(content);
            expect(canonicals.length).toBeGreaterThanOrEqual(20);
        });
        it('should have no duplicate synonyms across canonicals', () => {
            const lexiconPath = resolve(__dirname, '../lexicon/ceps.lexicon.json');
            const content = JSON.parse(readFileSync(lexiconPath, 'utf-8'));
            const allSynonyms = new Set();
            const duplicates = [];
            for (const [canonical, synonyms] of Object.entries(content)) {
                for (const synonym of synonyms) {
                    if (allSynonyms.has(synonym.toLowerCase())) {
                        duplicates.push(synonym);
                    }
                    allSynonyms.add(synonym.toLowerCase());
                }
            }
            expect(duplicates).toEqual([]);
        });
    });
});
describe('Lexicon Workflow Documentation', () => {
    it('should have workflow documentation file', () => {
        const docPath = resolve(__dirname, '../../../docs/process/lexicon-updates.md');
        expect(existsSync(docPath)).toBe(true);
    });
    it('should document adding new synonyms process', () => {
        const docPath = resolve(__dirname, '../../../docs/process/lexicon-updates.md');
        const content = readFileSync(docPath, 'utf-8');
        // Check for key sections
        expect(content).toContain('Adding New Synonyms');
        expect(content).toContain('lexicon:lint');
    });
});
//# sourceMappingURL=validator-lexicon.test.js.map