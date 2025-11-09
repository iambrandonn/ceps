/**
 * Phase 6 I1: Axios Client Pattern
 *
 * Detects Axios client instances created via axios.create().
 * Extracts configuration (baseURL, timeout, headers) from initializer.
 */

import { KnowledgeBase } from '../../../kb/knowledge-base.js';
import { Entity, BehaviorChunk } from '../../../kb/models.js';
import {
  PatternModule,
  PatternPriority,
  ConfidenceDelta,
} from '../types.js';
import {
  hasFact,
  getFirstFact,
  getFactSets,
} from '../shared/helpers.js';
import { generateAnchor } from '../../../kb/id-generation.js';

export class AxiosClientPattern implements PatternModule {
  id = 'http-clients.axios-client';
  priority = PatternPriority.FRAMEWORK_CORE;

  private chunkIds = new Set<string>();

  /**
   * Match Axios client instances: constants with axios.create initializer.
   */
  matches(kb: KnowledgeBase, entity: Entity): boolean {
    try {
      // Must be a constant
      if (entity.kind !== 'constant') {
        return false;
      }

      // Must have initializer-call = "axios.create"
      return hasFact(kb, entity, 'initializer-call', 'axios.create');
    } catch (error) {
      // Error handling contract: never throw
      return false;
    }
  }

  /**
   * Generate behavior chunk describing Axios client configuration.
   */
  describe(kb: KnowledgeBase, entity: Entity): BehaviorChunk[] {
    try {
      // Should only be called after matches() returns true
      if (!this.matches(kb, entity)) {
        return [];
      }

      const factSets = getFactSets(kb, entity);
      if (factSets.length === 0) {
        return [];
      }

      // Collect factSet IDs
      const factSetIds = factSets.map(fs => fs.id);

      // Get initializer to parse config
      const initializerFact = getFirstFact(kb, entity, 'initializer');
      const initializerText = initializerFact?.object ? String(initializerFact.object) : '';

      // Parse configuration from initializer
      const config = this.parseConfig(initializerText);

      // Determine confidence based on config parsing
      const confidence = this.determineConfidence(config);

      // Build description
      const textDraft = this.buildDescription(entity.name, config);

      // Generate unique chunk ID
      const chunkId = this.generateChunkId(entity);

      return [
        {
          id: chunkId,
          targetEntityId: entity.id,
          textDraft,
          factSetIds,
          confidence,
        },
      ];
    } catch (error) {
      // Error handling contract: return Low-confidence error chunk
      return [
        {
          id: `error-${this.id}-${entity.id}`,
          targetEntityId: entity.id,
          textDraft: `Pattern '${this.id}' encountered error describing entity: ${error instanceof Error ? error.message : String(error)}`,
          factSetIds: [],
          confidence: 'Low',
        },
      ];
    }
  }

  /**
   * Confidence adjustment for Axios client pattern.
   */
  confidenceAdjustments(kb: KnowledgeBase, entity: Entity): ConfidenceDelta | undefined {
    try {
      if (!this.matches(kb, entity)) {
        return undefined;
      }

      return {
        adjustment: 10, // Strong HTTP client signal
        reason: 'Axios client instance (axios.create)',
      };
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Parse Axios config from initializer text.
   */
  private parseConfig(initializerText: string): AxiosConfig {
    const config: AxiosConfig = {
      baseURL: null,
      timeout: null,
      headers: null,
      isDynamic: false,
    };

    // Check if config is dynamic (function call, variable reference)
    if (this.isDynamicConfig(initializerText)) {
      config.isDynamic = true;
      return config;
    }

    // Extract baseURL
    const baseURLMatch = initializerText.match(/baseURL\s*:\s*['"]([^'"]+)['"]/);
    if (baseURLMatch) {
      config.baseURL = baseURLMatch[1];
    }

    // Extract timeout (number)
    const timeoutMatch = initializerText.match(/timeout\s*:\s*(\d+)/);
    if (timeoutMatch) {
      config.timeout = parseInt(timeoutMatch[1], 10);
    }

    // Detect headers presence (detailed parsing deferred)
    if (initializerText.includes('headers')) {
      config.headers = 'present';
    }

    return config;
  }

  /**
   * Check if config is dynamically constructed.
   */
  private isDynamicConfig(initializerText: string): boolean {
    // Dynamic patterns:
    // - axios.create(getConfig())
    // - axios.create(config)
    // - axios.create({ ...spread })

    // Simple heuristic: if the config is not an object literal, it's dynamic
    const hasObjectLiteral = /axios\.create\s*\(\s*\{/.test(initializerText);
    return !hasObjectLiteral;
  }

  /**
   * Determine confidence based on parsed config.
   */
  private determineConfidence(config: AxiosConfig): 'High' | 'Medium' | 'Low' {
    if (config.isDynamic) {
      return 'Medium'; // Dynamic config - less certainty
    }

    if (config.baseURL) {
      return 'High'; // Static config with base URL - high confidence
    }

    return 'Medium'; // Some config present but incomplete
  }

  /**
   * Build human-readable description.
   */
  private buildDescription(name: string, config: AxiosConfig): string {
    if (config.isDynamic) {
      return `Creates Axios client \`${name}\` with dynamic configuration. Configuration details are determined at runtime.`;
    }

    const parts: string[] = [`Creates Axios client \`${name}\``];

    if (config.baseURL) {
      parts.push(`with base URL \`${config.baseURL}\``);
    }

    if (config.timeout) {
      parts.push(`Configures ${config.timeout}ms timeout for requests`);
    }

    if (config.headers) {
      parts.push(`Includes default headers in all requests`);
    }

    return parts.join('. ') + '.';
  }

  /**
   * Generate deterministic chunk ID.
   */
  private generateChunkId(entity: Entity): string {
    const content = `${this.id}-${entity.kind}-${entity.name}-${entity.path}`;
    const chunkId = generateAnchor('chunk', content, this.chunkIds);
    this.chunkIds.add(chunkId);
    return chunkId;
  }
}

/**
 * Parsed Axios configuration.
 */
interface AxiosConfig {
  baseURL: string | null;
  timeout: number | null;
  headers: string | null;
  isDynamic: boolean;
}
