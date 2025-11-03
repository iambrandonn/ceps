import { describe, it, expect } from 'vitest';
import { ConfigReader } from '../../../../src/parser/aux-readers/config-reader';

describe('ConfigReader', () => {
  it('should extract config keys from valid JSON', () => {
    const content = JSON.stringify({
      name: 'my-app',
      version: '1.0.0',
      dependencies: {
        express: '^4.0.0',
      },
    });

    const reader = new ConfigReader();
    const factSets = reader.extractFacts('package.json', content);

    expect(factSets.length).toBe(1);
    expect(factSets[0].facts.length).toBe(3);

    const configKeys = factSets[0].facts.map(f => f.object);
    expect(configKeys).toContain('name');
    expect(configKeys).toContain('version');
    expect(configKeys).toContain('dependencies');
  });

  it('should handle empty JSON object', () => {
    const content = '{}';

    const reader = new ConfigReader();
    const factSets = reader.extractFacts('config.json', content);

    expect(factSets.length).toBe(0);
  });

  it('should return empty factSets for malformed JSON', () => {
    const content = '{ invalid json }';

    const reader = new ConfigReader();
    const factSets = reader.extractFacts('broken.json', content);

    expect(factSets.length).toBe(0);
  });

  it('should handle nested objects (extracts top-level keys only)', () => {
    const content = JSON.stringify({
      database: {
        host: 'localhost',
        port: 5432,
      },
      cache: {
        enabled: true,
      },
    });

    const reader = new ConfigReader();
    const factSets = reader.extractFacts('config.json', content);

    expect(factSets.length).toBe(1);
    const configKeys = factSets[0].facts.map(f => f.object);
    expect(configKeys).toContain('database');
    expect(configKeys).toContain('cache');
    // Nested keys are not extracted (top-level only)
    expect(configKeys).not.toContain('host');
    expect(configKeys).not.toContain('enabled');
  });

  it('should have correct factSet metadata', () => {
    const content = '{"app": "test"}';

    const reader = new ConfigReader();
    const factSets = reader.extractFacts('app-config.json', content);

    expect(factSets.length).toBe(1);
    expect(factSets[0].id).toBe('app-config.json-config-facts');
    expect(factSets[0].evidenceScore).toBe(80);
    expect(factSets[0].sources).toHaveLength(1);
    expect(factSets[0].sources[0].kind).toBe('aux');
    expect(factSets[0].sources[0].reader).toBe('config-reader');
  });

  it('should handle config with array values', () => {
    const content = JSON.stringify({
      scripts: ['build', 'test', 'deploy'],
      ports: [3000, 8080],
    });

    const reader = new ConfigReader();
    const factSets = reader.extractFacts('config.json', content);

    expect(factSets.length).toBe(1);
    const configKeys = factSets[0].facts.map(f => f.object);
    expect(configKeys).toContain('scripts');
    expect(configKeys).toContain('ports');
  });

  it('should extract facts with correct predicate', () => {
    const content = '{"key1": "value1", "key2": "value2"}';

    const reader = new ConfigReader();
    const factSets = reader.extractFacts('config.json', content);

    expect(factSets.length).toBe(1);
    factSets[0].facts.forEach((fact) => {
      expect(fact.predicate).toBe('config-key');
      expect(fact.subjectId).toBe('config.json');
    });
  });

  it('should handle empty string gracefully', () => {
    const content = '';

    const reader = new ConfigReader();
    const factSets = reader.extractFacts('empty.json', content);

    expect(factSets.length).toBe(0);
  });
});
