/**
 * Phase 6 Quality Improvement: Constant Value Inlining Pattern
 *
 * Detects exported constant objects and inlines their key-value pairs
 * into the generated spec to eliminate "intent unclear" descriptions.
 *
 * Target: Fix 209 Low-confidence constants in research-coi baseline
 *
 * Examples:
 * - Numeric enums: { PENDING: 1, APPROVED: 2 }
 * - String constants: { ADMIN: 'admin', USER: 'user' }
 * - Config objects: { MAX_SIZE: 1024, ENABLED: true }
 */

import { PatternModule, PatternPriority } from '../types.js';
import { KnowledgeBase } from '../../../kb/knowledge-base.js';
import { Entity, BehaviorChunk } from '../../../kb/models.js';
import { generateAnchor } from '../../../kb/id-generation.js';
import { hasFact, getFactSets } from './helpers.js';

interface ParsedProperty {
  key: string;
  value: string;
  type: 'number' | 'string' | 'boolean' | 'object' | 'unknown';
}

export class ConstantInliningPattern implements PatternModule {
  readonly id = 'shared.constant-inlining';
  readonly priority = PatternPriority.SHARED_PRIMITIVES;

  matches(kb: KnowledgeBase, entity: Entity): boolean {
    // Only match constant entities
    if (entity.kind !== 'constant') {
      return false;
    }

    // Must have an initializer fact
    return hasFact(kb, entity, 'initializer');
  }

  describe(kb: KnowledgeBase, entity: Entity): BehaviorChunk[] {
    const factSets = getFactSets(kb, entity);
    if (factSets.length === 0) {
      return [];
    }

    const initializer = this.getInitializer(kb, entity);
    if (!initializer) {
      return [];
    }

    const properties = this.parseInitializer(initializer);
    const textDraft = this.generateDescription(entity.name, properties);

    const factSetIds = factSets.map(fs => fs.id);

    return [{
      id: generateAnchor(entity.path, entity.name),
      targetEntityId: entity.id,
      textDraft,
      factSetIds,
      confidence: 'High'
    }];
  }

  /**
   * Get initializer string from KB facts
   */
  private getInitializer(kb: KnowledgeBase, entity: Entity): string | null {
    const factSets = getFactSets(kb, entity);

    for (const factSet of factSets) {
      const initializerFact = factSet.facts.find(f => f.predicate === 'initializer');
      if (initializerFact) {
        return String(initializerFact.object);
      }
    }

    return null;
  }

  /**
   * Parse object initializer string into key-value pairs
   * Handles:
   * - Simple literals (numbers, strings, booleans)
   * - Comments (strips them)
   * - Trailing commas
   */
  private parseInitializer(initializer: string): ParsedProperty[] {
    const properties: ParsedProperty[] = [];

    // Remove outer braces
    const content = initializer.trim().replace(/^\{/, '').replace(/\}$/, '').trim();

    if (!content) {
      return []; // Empty object
    }

    // Split by commas, handling potential commas in string values
    const lines = content.split('\n');

    for (const line of lines) {
      // Remove comments
      const cleaned = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '').trim();
      if (!cleaned || cleaned === ',') {
        continue;
      }

      // Match key: value pattern
      const match = cleaned.match(/^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(.+?),?\s*$/);
      if (!match) {
        continue;
      }

      const [, key, value] = match;
      const parsedValue = this.parseValue(value.trim());

      properties.push({
        key,
        value: parsedValue.value,
        type: parsedValue.type
      });
    }

    return properties;
  }

  /**
   * Parse and classify a value
   */
  private parseValue(value: string): { value: string; type: ParsedProperty['type'] } {
    // Number
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return { value, type: 'number' };
    }

    // Boolean
    if (value === 'true' || value === 'false') {
      return { value, type: 'boolean' };
    }

    // String (with quotes)
    if (/^['"`].*['"`]$/.test(value)) {
      return { value: value.slice(1, -1), type: 'string' };
    }

    // Object/array (starts with { or [)
    if (/^[\{\[]/.test(value)) {
      return { value: '<nested object>', type: 'object' };
    }

    // Unknown (computed expression, identifier, etc.)
    return { value, type: 'unknown' };
  }

  /**
   * Generate human-readable description from parsed properties
   */
  private generateDescription(name: string, properties: ParsedProperty[]): string {
    if (properties.length === 0) {
      return `Constant \`${name}\` is an empty object with no properties.`;
    }

    // Determine pattern type
    const types = new Set(properties.map(p => p.type));
    const allNumeric = types.size === 1 && types.has('number');
    const allString = types.size === 1 && types.has('string');
    const mixed = types.size > 1;

    // Truncate if too many properties (>10)
    const shouldTruncate = properties.length > 10;
    const displayProps = shouldTruncate ? properties.slice(0, 5) : properties;

    let description = '';

    // Pattern-specific intro
    if (allNumeric) {
      description = `Enumeration constant \`${name}\` defining numeric status codes: `;
    } else if (allString) {
      description = `String constant mapping \`${name}\` defining: `;
    } else if (mixed) {
      description = `Configuration object \`${name}\` with ${properties.length} properties: `;
    } else {
      description = `Constant \`${name}\` with ${properties.length} properties: `;
    }

    // List key-value pairs
    const entries = displayProps.map(prop => {
      if (prop.type === 'string') {
        return `${prop.key} ("${prop.value}")`;
      } else if (prop.type === 'object') {
        return `${prop.key} (nested object)`;
      } else {
        return `${prop.key} (${prop.value})`;
      }
    });

    description += entries.join(', ');

    if (shouldTruncate) {
      description += `, and ${properties.length - 5} more.`;
    } else {
      description += '.';
    }

    return description;
  }

  confidenceAdjustments(kb: KnowledgeBase, entity: Entity) {
    // Pattern handles confidence internally (always High if matched)
    return undefined;
  }
}
