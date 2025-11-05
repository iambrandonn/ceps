/**
 * Phase 4 WS-F1 Stage C0: Fact Schema Interpreter Tests
 *
 * Tests for parsing fact object values into normalized numeric representations.
 * Handles:
 * - String facts with units: "5000 ms" → {value: 5000, unit: 'ms'}
 * - Structured objects: {value: 5000, unit: 'ms'}
 * - Percentages: "50%" → {value: 0.5, unit: 'percent'}
 * - Unknown formats: return null
 *
 * TDD: Write ALL tests BEFORE implementation (Red phase).
 */
import { describe, it, expect } from 'vitest';
import { parseFactNumeric } from '../fact-schema-interpreter.js';
describe('FactSchemaInterpreter', () => {
    describe('String Facts with Units', () => {
        it('should parse milliseconds from string', () => {
            const result = parseFactNumeric('5000 ms');
            expect(result).toEqual({ value: 5000, unit: 'ms' });
        });
        it('should parse seconds from string', () => {
            const result = parseFactNumeric('5 s');
            expect(result).toEqual({ value: 5, unit: 's' });
        });
        it('should parse bytes from string', () => {
            const result = parseFactNumeric('1024 B');
            expect(result).toEqual({ value: 1024, unit: 'B' });
        });
        it('should parse kilobytes from string', () => {
            const result = parseFactNumeric('10 KB');
            expect(result).toEqual({ value: 10, unit: 'KB' });
        });
        it('should parse megabytes from string', () => {
            const result = parseFactNumeric('5.5 MB');
            expect(result).toEqual({ value: 5.5, unit: 'MB' });
        });
        it('should handle string without spaces', () => {
            const result = parseFactNumeric('5000ms');
            expect(result).toEqual({ value: 5000, unit: 'ms' });
        });
    });
    describe('Percentage Facts', () => {
        it('should parse percentage to decimal', () => {
            const result = parseFactNumeric('50%');
            expect(result).toEqual({ value: 0.5, unit: 'percent' });
        });
        it('should parse percentage with space', () => {
            const result = parseFactNumeric('75 %');
            expect(result).toEqual({ value: 0.75, unit: 'percent' });
        });
        it('should parse decimal percentage', () => {
            const result = parseFactNumeric('12.5%');
            expect(result).toEqual({ value: 0.125, unit: 'percent' });
        });
    });
    describe('Structured Object Facts', () => {
        it('should handle pre-structured object', () => {
            const result = parseFactNumeric({ value: 5000, unit: 'ms' });
            expect(result).toEqual({ value: 5000, unit: 'ms' });
        });
        it('should normalize unit case in object', () => {
            const result = parseFactNumeric({ value: 10, unit: 'KB' });
            expect(result).toEqual({ value: 10, unit: 'KB' });
        });
    });
    describe('Plain Numbers', () => {
        it('should handle numeric fact as unitless', () => {
            const result = parseFactNumeric(5000);
            expect(result).toEqual({ value: 5000, unit: 'unitless' });
        });
        it('should handle zero', () => {
            const result = parseFactNumeric(0);
            expect(result).toEqual({ value: 0, unit: 'unitless' });
        });
        it('should handle negative numbers', () => {
            const result = parseFactNumeric(-42);
            expect(result).toEqual({ value: -42, unit: 'unitless' });
        });
    });
    describe('Unknown Formats', () => {
        it('should return null for unknown unit', () => {
            const result = parseFactNumeric('5000 parsecs');
            expect(result).toBeNull();
        });
        it('should return null for malformed string', () => {
            const result = parseFactNumeric('not a number');
            expect(result).toBeNull();
        });
        it('should return null for boolean', () => {
            const result = parseFactNumeric(true);
            expect(result).toBeNull();
        });
        it('should return null for null input', () => {
            const result = parseFactNumeric(null);
            expect(result).toBeNull();
        });
        it('should return null for undefined', () => {
            const result = parseFactNumeric(undefined);
            expect(result).toBeNull();
        });
        it('should return null for object without value field', () => {
            const result = parseFactNumeric({ notValue: 123 });
            expect(result).toBeNull();
        });
    });
    describe('Edge Cases', () => {
        it('should handle floating point values', () => {
            const result = parseFactNumeric('3.14159 s');
            expect(result).toEqual({ value: 3.14159, unit: 's' });
        });
        it('should handle scientific notation', () => {
            const result = parseFactNumeric('1e6 B');
            expect(result).toEqual({ value: 1000000, unit: 'B' });
        });
        it('should handle leading/trailing whitespace', () => {
            const result = parseFactNumeric('  5000 ms  ');
            expect(result).toEqual({ value: 5000, unit: 'ms' });
        });
    });
});
//# sourceMappingURL=fact-schema-interpreter.test.js.map