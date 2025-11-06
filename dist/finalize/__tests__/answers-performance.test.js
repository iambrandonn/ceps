import { performance } from 'node:perf_hooks';
import { describe, it, expect } from 'vitest';
import { parseAnswers } from '../answers.js';
const LARGE_FIXTURE = Array.from({ length: 200 })
    .map((_, index) => `q:PERF${index.toString().padStart(6, '0')}: Answer line ${index}`)
    .join('\n');
describe('answers parser performance', () => {
    it('parses 200 entries within 50ms', () => {
        const start = performance.now();
        const result = parseAnswers(LARGE_FIXTURE);
        const duration = performance.now() - start;
        expect(result.entries).toHaveLength(200);
        expect(duration).toBeLessThan(50);
    });
});
//# sourceMappingURL=answers-performance.test.js.map