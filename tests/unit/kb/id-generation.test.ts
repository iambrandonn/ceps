import { describe, it, expect } from 'vitest';
import { generateAnchor, generateQID, normalizeContent } from '../../../src/kb/id-generation';

describe('Content Normalization', () => {
  it('should normalize Unicode to NFKC', () => {
    const input = 'café test'; // 'e' + combining acute accent
    const normalized = normalizeContent(input);
    expect(normalized).toBe('café test'); // NFKC form
  });

  it('should lowercase text', () => {
    expect(normalizeContent('FetchUser')).toBe('fetchuser');
  });

  it('should collapse whitespace to single spaces', () => {
    expect(normalizeContent('fetch  \n  user')).toBe('fetch user');
  });

  it('should trim surrounding whitespace', () => {
    expect(normalizeContent('  fetch user  ')).toBe('fetch user');
  });

  it('should strip surrounding punctuation', () => {
    expect(normalizeContent('(fetch-user)')).toBe('fetch-user');
  });

  it('should handle empty string', () => {
    expect(normalizeContent('')).toBe('');
  });
});

describe('Anchor Generation', () => {
  it('should generate 10-character base62 anchor', () => {
    const anchor = generateAnchor('fetchUser', 'This function fetches a user');
    expect(anchor).toHaveLength(10);
    expect(anchor).toMatch(/^[a-zA-Z0-9]+$/);
  });

  it('should be deterministic for same input', () => {
    const anchor1 = generateAnchor('fetchUser', 'content');
    const anchor2 = generateAnchor('fetchUser', 'content');
    expect(anchor1).toBe(anchor2);
  });

  it('should produce different anchors for different content', () => {
    const anchor1 = generateAnchor('fetchUser', 'content A');
    const anchor2 = generateAnchor('fetchUser', 'content B');
    expect(anchor1).not.toBe(anchor2);
  });

  it('should handle collision by extending to 16 characters', () => {
    const anchor = generateAnchor('test', 'content');
    const collision = new Set([anchor]); // Force collision
    const anchor2 = generateAnchor('test', 'content', collision);
    expect(anchor2).toHaveLength(16);
  });

  it('should append -2 suffix if 16-char also collides', () => {
    const anchor = generateAnchor('test', 'content');
    const anchor16 = generateAnchor('test', 'content', new Set([anchor]));
    const collision = new Set([anchor, anchor16]);
    const anchor3 = generateAnchor('test', 'content', collision);
    expect(anchor3).toMatch(/-2$/);
  });
});

describe('QID Generation', () => {
  it('should generate QID with "q:" prefix', () => {
    const qid = generateQID('src/api/users.ts', 'fetchUser', 'missing-return-type');
    expect(qid).toMatch(/^q:[a-zA-Z0-9]{10}$/);
  });

  it('should be deterministic for same inputs', () => {
    const qid1 = generateQID('src/test.ts', 'func', 'ambiguity');
    const qid2 = generateQID('src/test.ts', 'func', 'ambiguity');
    expect(qid1).toBe(qid2);
  });

  it('should handle collision by extending to 16 characters', () => {
    const qid = generateQID('src/test.ts', 'func', 'amb');
    const collision = new Set([qid]);
    const qid2 = generateQID('src/test.ts', 'func', 'amb', collision);
    expect(qid2).toMatch(/^q:[a-zA-Z0-9]{16}$/);
  });

  it('should append -2, -3, etc. if still collides after extension', () => {
    const qid10 = generateQID('src/test.ts', 'func', 'amb');
    const qid16 = generateQID('src/test.ts', 'func', 'amb', new Set([qid10]));
    const collision = new Set([qid10, qid16]);
    const qid3 = generateQID('src/test.ts', 'func', 'amb', collision);
    // FIX: Add proper assertion
    expect(qid3).toMatch(/^q:[a-zA-Z0-9]{16}-2$/);
  });
});
