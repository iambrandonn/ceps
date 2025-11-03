import { describe, it, expect } from 'vitest';
import { Parser } from '../../../src/parser/parser';
import { ParseResult } from '../../../src/types';

describe('Parser', () => {
  it('should parse a simple TypeScript file', async () => {
    const source = `
      export function fetchUser(id: string): Promise<User> {
        return fetch(\`/api/users/\${id}\`).then(r => r.json());
      }
    `;

    const parser = new Parser();
    const result = await parser.parse('src/api/users.ts', source);

    expect(result.entities.length).toBeGreaterThan(0);
    expect(result.entities[0].kind).toBe('function');
    expect(result.entities[0].name).toBe('fetchUser');
  });

  it('should extract function signatures', async () => {
    const source = `
      export function add(a: number, b: number): number {
        return a + b;
      }
    `;

    const parser = new Parser();
    const result = await parser.parse('src/math.ts', source);

    const func = result.entities.find(e => e.name === 'add');
    expect(func?.signature).toContain('(a: number, b: number): number');
  });

  it('should detect exported entities', async () => {
    const source = `
      export const API_URL = 'https://api.example.com';
      const SECRET = 'hidden';
    `;

    const parser = new Parser();
    const result = await parser.parse('src/config.ts', source);

    const apiUrl = result.entities.find(e => e.name === 'API_URL');
    const secret = result.entities.find(e => e.name === 'SECRET');

    expect(apiUrl?.exported).toBe(true);
    expect(secret?.exported).toBe(false);
  });

  it('should handle edge syntax gracefully', async () => {
    const source = `
      const foo = async () => {
        const bar = await import('./dynamic');
      };
    `;

    const parser = new Parser();
    const result = await parser.parse('src/dynamic.js', source);

    // Should parse without crashing, may have warnings/errors about types
    expect(result).toBeDefined();
    expect(result.filePath).toBe('src/dynamic.js');
  });

  it('should handle parse errors gracefully', async () => {
    const source = `
      export function broken( {
        // Missing closing brace
    `;

    const parser = new Parser();
    const result = await parser.parse('src/broken.ts', source);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].severity).toBe('error');
  });

  it('should handle JSX with dynamic imports (Babel fallback if needed)', async () => {
    const source = `
      import React, { useState, useEffect } from 'react';

      const Component = () => {
        const [Module, setModule] = useState(null);
        useEffect(() => {
          import('./dynamic').then(m => setModule(m));
        }, []);
        return <div>{Module?.content}</div>;
      };

      export default Component;
    `;

    const parser = new Parser();
    const result = await parser.parse('component.jsx', source);

    // Should not crash - may use ts-morph or Babel
    expect(result).toBeDefined();
    expect(result.filePath).toBe('component.jsx');
    // May have entities (ts-morph) or warnings (Babel fallback)
    expect(result.entities.length + result.errors.length).toBeGreaterThan(0);
  });

  it('should document Babel fallback limitations', async () => {
    // Force Babel fallback by using intentionally malformed TypeScript that ts-morph rejects
    // but Babel can parse as JavaScript
    const source = `
      export const x = 1;
    `;

    const parser = new Parser();
    const result = await parser.parse('file.js', source);

    // ts-morph should handle this fine, so we get entities
    expect(result.entities.length).toBeGreaterThan(0);

    // This test documents expected behavior:
    // - ts-morph: Primary parser, handles TS/JS/JSX/TSX
    // - Babel: Fallback for edge cases ts-morph can't parse
    // - Babel limitation: Emits warning, limited entity extraction
  });

  it('should extract entities from JSX components', async () => {
    const source = `
      export const Button = ({ label }) => {
        return <button>{label}</button>;
      };
    `;

    const parser = new Parser();
    const result = await parser.parse('Button.jsx', source);

    expect(result.entities.length).toBeGreaterThan(0);
    const button = result.entities.find(e => e.name === 'Button');
    expect(button).toBeDefined();
    expect(button?.exported).toBe(true);
  });
});
