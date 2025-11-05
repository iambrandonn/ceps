/**
 * Phase 3 Step 6: Cross-Link Validation Types
 *
 * Based on Phase -1 analysis of upstream components.
 */

export interface ValidationResult {
  passed: boolean;
  coverage: number; // Percentage 0-100
  missingEntities: string[]; // Entity IDs without BehaviorChunk or QID
  brokenLinks: BrokenLink[];
}

export interface BrokenLink {
  sourceFile: string; // Path to spec.md file containing broken link
  targetAnchor: string; // Target anchor that doesn't exist (e.g., '#entity-id')
  lineNumber: number; // Line number in source file (1-indexed)
}

export interface SpecFile {
  path: string; // Relative path to spec.md file
  content: string; // Markdown content
}

export interface Anchor {
  entityId: string; // Entity ID from KB
  anchorText: string; // Markdown anchor format: #entity-id
  filePath: string; // spec.md file containing this anchor
}
