/**
 * Phase 4 WS-F1 Stage B: Identifier Extraction
 *
 * Extracts identifiers from behavior chunk text using regex patterns.
 * Handles backticked, PascalCase, camelCase, and dotted path identifiers.
 * Excludes code blocks and deduplicates results.
 */

// Regex patterns for identifier extraction
const PATTERNS = {
  // Fenced code blocks (to exclude)
  CODE_BLOCK: /```[\s\S]*?```/g,

  // Backticked identifiers: `UserService`
  BACKTICK: /`([^`]+)`/g,

  // PascalCase: UserService, AdminService (2+ words with capitals)
  PASCAL_CASE: /\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g,

  // camelCase: validateUser, sendEmail (starts lowercase, has capitals)
  CAMEL_CASE: /\b[a-z]+(?:[A-Z][a-z]+)+\b/g,

  // Dotted paths: UserService.validateUser, app.services.user
  DOTTED_PATH: /\b[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)+\b/g,
};

/**
 * IdentifierExtractor class for extracting identifiers from text.
 * Not strictly needed but provides encapsulation for future enhancements.
 */
export class IdentifierExtractor {
  extract(text: string): string[] {
    return extractIdentifiers(text);
  }
}

/**
 * Extract identifiers from text using pattern matching.
 *
 * @param text - Behavior chunk text to analyze
 * @returns Array of unique identifiers in order of first appearance
 */
export function extractIdentifiers(text: string): string[] {
  // Step 1: Remove code blocks to avoid extracting from examples
  const textWithoutCode = text.replace(PATTERNS.CODE_BLOCK, '');

  const identifiers = new Set<string>();
  const order: string[] = []; // Track insertion order

  // Helper to add identifier while preserving order
  const addIdentifier = (id: string) => {
    if (!identifiers.has(id)) {
      identifiers.add(id);
      order.push(id);
    }
  };

  // Step 2: Extract dotted paths first (more specific than simple names)
  let match;
  while ((match = PATTERNS.DOTTED_PATH.exec(textWithoutCode)) !== null) {
    addIdentifier(match[0]);
  }

  // Step 3: Extract backticked identifiers
  // Filter out object literals and complex expressions
  while ((match = PATTERNS.BACKTICK.exec(textWithoutCode)) !== null) {
    const content = match[1];

    // Skip if it looks like an object literal, array, or contains special chars
    if (
      content.includes('{') ||
      content.includes('[') ||
      content.includes(':') ||
      content.includes(';') ||
      content.includes('=') ||
      content.includes('(') ||
      content.includes(')')
    ) {
      continue;
    }

    // Extract simple identifier from backticks
    const trimmed = content.trim();
    if (trimmed && /^[a-zA-Z_$][\w$.]*$/.test(trimmed)) {
      addIdentifier(trimmed);
    }
  }

  // Step 4: Extract PascalCase identifiers
  PATTERNS.PASCAL_CASE.lastIndex = 0; // Reset regex
  while ((match = PATTERNS.PASCAL_CASE.exec(textWithoutCode)) !== null) {
    addIdentifier(match[0]);
  }

  // Step 5: Extract camelCase identifiers
  PATTERNS.CAMEL_CASE.lastIndex = 0; // Reset regex
  while ((match = PATTERNS.CAMEL_CASE.exec(textWithoutCode)) !== null) {
    addIdentifier(match[0]);
  }

  return order;
}
