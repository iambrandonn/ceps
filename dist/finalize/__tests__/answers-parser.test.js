import { describe, it, expect } from 'vitest';
import { parseAnswers } from '../answers.js';
const multilineSource = `# Answers file\n\nq:Q1234567890: First line\n    Second line\n    \n    - bullet\n\n    # comment inside answer\n\nq:INVALID missing colon\n\n    orphan indent\n`;
describe('parseAnswers', () => {
    it('parses single-line answers', () => {
        const result = parseAnswers('q:Q1234567890: Hello world');
        expect(result.errors).toHaveLength(0);
        expect(result.entries).toEqual([
            {
                qid: 'q:Q1234567890',
                answer: 'Hello world',
                lines: { start: 1, end: 1 }
            }
        ]);
    });
    it('parses multi-line answers with continuation blocks', () => {
        const result = parseAnswers(multilineSource);
        expect(result.entries[0]).toEqual({
            qid: 'q:Q1234567890',
            answer: 'First line\nSecond line\n\n- bullet\n\n# comment inside answer',
            lines: { start: 3, end: 9 }
        });
    });
    it('emits errors for malformed lines', () => {
        const result = parseAnswers(multilineSource);
        expect(result.errors).toEqual([
            {
                line: 10,
                message: 'Invalid answer entry. Expected `q:<QID>: answer` or indented continuation.',
                raw: 'q:INVALID missing colon'
            },
            {
                line: 12,
                message: 'Unexpected indentation (continuation without preceding QID).',
                raw: '    orphan indent'
            }
        ]);
    });
});
//# sourceMappingURL=answers-parser.test.js.map