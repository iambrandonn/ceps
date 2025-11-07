/**
 * Phase 6: Pattern Registry
 *
 * Central registry for framework-specific pattern modules.
 * Handles registration, precedence, and execution of pattern matchers.
 */

import { KnowledgeBase } from '../../kb/knowledge-base.js';
import { Entity, BehaviorChunk } from '../../kb/models.js';
import {
  PatternModule,
  PatternRegistrationError,
  ConfidenceDelta,
} from './types.js';

interface RegisteredPattern {
  module: PatternModule;
  sortKey: string; // For deterministic ordering
}

export class PatternRegistry {
  private patterns: Map<string, RegisteredPattern> = new Map();
  private sortedPatterns: RegisteredPattern[] = [];
  private needsSort = false;

  /**
   * Register a pattern module.
   *
   * @param pattern - Pattern module to register
   * @throws PatternRegistrationError if validation fails
   */
  register(pattern: PatternModule): void {
    // Validate pattern ID
    if (!pattern.id || typeof pattern.id !== 'string' || pattern.id.trim().length === 0) {
      throw new PatternRegistrationError(pattern.id || '(empty)', 'Invalid ID: must be non-empty string');
    }

    // Check for duplicate ID
    if (this.patterns.has(pattern.id)) {
      throw new PatternRegistrationError(pattern.id, 'Pattern already registered');
    }

    // Validate required methods
    if (typeof pattern.matches !== 'function') {
      throw new PatternRegistrationError(pattern.id, 'Missing required method: matches()');
    }
    if (typeof pattern.describe !== 'function') {
      throw new PatternRegistrationError(pattern.id, 'Missing required method: describe()');
    }

    // Validate priority is a valid enum value
    if (![1, 2, 3].includes(pattern.priority)) {
      throw new PatternRegistrationError(pattern.id, 'Invalid priority: must be PatternPriority enum value');
    }

    // Create sort key: priority (ascending) + ID (ascending)
    // Lower priority number = higher precedence = evaluated first
    const sortKey = `${pattern.priority.toString().padStart(3, '0')}-${pattern.id}`;

    const registered: RegisteredPattern = {
      module: pattern,
      sortKey,
    };

    this.patterns.set(pattern.id, registered);
    this.needsSort = true;
  }

  /**
   * Find the first matching pattern for an entity.
   *
   * @param kb - KnowledgeBase for pattern matching
   * @param entity - Entity to match
   * @returns Matched pattern module or null if no match
   */
  match(kb: KnowledgeBase, entity: Entity): PatternModule | null {
    this.ensureSorted();

    for (const registered of this.sortedPatterns) {
      try {
        if (registered.module.matches(kb, entity)) {
          return registered.module;
        }
      } catch (error) {
        // Pattern violated error-handling contract - treat as no match
        // In production, this would be logged
        continue;
      }
    }

    return null;
  }

  /**
   * Generate behavior chunks using the first matching pattern.
   *
   * @param kb - KnowledgeBase for pattern matching
   * @param entity - Entity to describe
   * @returns Array of BehaviorChunks (empty if no match)
   */
  describe(kb: KnowledgeBase, entity: Entity): BehaviorChunk[] {
    const pattern = this.match(kb, entity);
    if (!pattern) {
      return [];
    }

    try {
      return pattern.describe(kb, entity);
    } catch (error) {
      // Pattern violated error-handling contract
      // Return Low-confidence Open Question chunk with diagnostic info
      return [
        {
          id: `error-${pattern.id}-${entity.id}`,
          targetEntityId: entity.id,
          textDraft: `Pattern '${pattern.id}' failed to describe entity: ${error instanceof Error ? error.message : String(error)}`,
          factSetIds: [],
          confidence: 'Low',
        },
      ];
    }
  }

  /**
   * Get confidence adjustments from the first matching pattern.
   *
   * @param kb - KnowledgeBase for pattern matching
   * @param entity - Entity to analyze
   * @returns Confidence delta or undefined if no match or no adjustments
   */
  getConfidenceAdjustments(kb: KnowledgeBase, entity: Entity): ConfidenceDelta | undefined {
    const pattern = this.match(kb, entity);
    if (!pattern || !pattern.confidenceAdjustments) {
      return undefined;
    }

    try {
      return pattern.confidenceAdjustments(kb, entity);
    } catch (error) {
      // Pattern error - return no adjustments
      return undefined;
    }
  }

  /**
   * Ensure patterns are sorted by precedence.
   * Called lazily before first match attempt after registration.
   */
  private ensureSorted(): void {
    if (!this.needsSort) {
      return;
    }

    this.sortedPatterns = Array.from(this.patterns.values()).sort((a, b) =>
      a.sortKey.localeCompare(b.sortKey)
    );

    this.needsSort = false;
  }
}
