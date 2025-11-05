/**
 * Phase 3 Step 6: Cross-Link Validator
 *
 * Two-phase validation:
 * 1. Pre-generation: Check 100% coverage of exported entities (BehaviorChunks or QIDs)
 * 2. Post-generation: Check all cross-reference links resolve to valid anchors
 *
 * Based on Phase -1 analysis of upstream components:
 * - Anchors are HTML tags: <a id="entity-id"></a>
 * - Cross-links are markdown: [text](#anchor)
 * - QIDs count as valid coverage (Low confidence entities)
 */

import { KnowledgeBase } from '../kb/knowledge-base.js';
import { ValidationResult, BrokenLink, SpecFile, Anchor } from './types.js';

export class CrossLinkValidator {
  constructor(private kb: KnowledgeBase) {}

  /**
   * Pre-generation validation: Check coverage of exported entities.
   *
   * Every exported entity must have:
   * - At least one BehaviorChunk (High/Medium/Low confidence), OR
   * - At least one OpenQuestion (Low confidence with QID)
   *
   * Returns validation result with coverage percentage and missing entity IDs.
   */
  validatePreGeneration(): ValidationResult {
    const exportedEntities = this.kb.getAllEntities().filter((e) => e.exported);
    const missingEntities: string[] = [];

    for (const entity of exportedEntities) {
      const hasChunk = this.kb.getChunksByEntity(entity.id).length > 0;
      const hasQID = this.kb.getOpenQuestionsByEntity(entity.id).length > 0;

      if (!hasChunk && !hasQID) {
        missingEntities.push(entity.id);
      }
    }

    // Coverage: (covered / total) * 100
    // Edge case: 0 exported entities → 100% coverage
    const coverage =
      exportedEntities.length > 0
        ? ((exportedEntities.length - missingEntities.length) / exportedEntities.length) * 100
        : 100;

    return {
      passed: missingEntities.length === 0,
      coverage,
      missingEntities,
      brokenLinks: [],
    };
  }

  /**
   * Build anchor map from generated spec files.
   *
   * Extracts HTML anchor tags emitted by Phase 2 MarkdownRenderer:
   *   <a id="entity-id"></a>
   *
   * Returns map keyed by entity.id (NOT entity.name) for uniqueness.
   */
  buildAnchorMap(specFiles: SpecFile[]): Map<string, Anchor> {
    const anchorMap = new Map<string, Anchor>();

    for (const file of specFiles) {
      const lines = file.content.split('\n');
      for (const line of lines) {
        // Match HTML anchor tags: <a id="entity-id"></a>
        // Phase -1 verified this format (not markdown headers)
        const match = line.match(/<a id="([^"]+)"><\/a>/);
        if (match) {
          const entityId = match[1];
          const anchorText = `#${entityId}`;

          anchorMap.set(entityId, {
            entityId,
            anchorText,
            filePath: file.path,
          });
        }
      }
    }

    return anchorMap;
  }

  /**
   * Post-generation validation: Check all cross-reference links resolve.
   *
   * Finds markdown links: [text](#anchor)
   * Validates each anchor target exists in the anchor map.
   * Returns broken links with file path and line number.
   */
  validatePostGeneration(specFiles: SpecFile[], anchorMap: Map<string, Anchor>): ValidationResult {
    const brokenLinks: BrokenLink[] = [];

    for (const file of specFiles) {
      const lines = file.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Match markdown links: [text](#anchor)
        const linkRegex = /\[([^\]]+)\]\(#([^)]+)\)/g;
        let match;

        while ((match = linkRegex.exec(line)) !== null) {
          const targetAnchor = `#${match[2]}`;
          const targetEntityId = match[2]; // Anchor targets entity.id

          // Check if the entity ID exists in the anchor map
          if (!anchorMap.has(targetEntityId)) {
            brokenLinks.push({
              sourceFile: file.path,
              targetAnchor,
              lineNumber: i + 1, // 1-indexed
            });
          }
        }
      }
    }

    return {
      passed: brokenLinks.length === 0,
      coverage: 100, // Post-generation coverage check deferred to pre-generation
      missingEntities: [],
      brokenLinks,
    };
  }
}
