import { describe, it, expect } from 'vitest';
import { normalizeContent } from '../normalize.js';

describe('normalizeContent', () => {
  it('strips UTF-8 BOM and normalizes line endings', () => {
    const input = Buffer.from('\ufeffline1\r\nline2\rline3\n');
    const result = normalizeContent(input);
    expect(result).toBe('line1\nline2\nline3\n');
  });

  it('trims trailing whitespace per line while preserving structure', () => {
    const input = Buffer.from('a  \r\nb\t \n c   ');
    const result = normalizeContent(input);
    expect(result).toBe('a\nb\n c');
  });

  it('returns empty string for empty buffer', () => {
    const result = normalizeContent(Buffer.alloc(0));
    expect(result).toBe('');
  });
});
