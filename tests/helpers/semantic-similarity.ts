/**
 * Semantic Similarity Helper for Regression Testing
 *
 * Phase 0.6: Simple heuristic-based similarity measurement
 * Purpose: Validate LLM-first output is semantically equivalent to fact-based output
 *
 * Future: Could enhance with embeddings (OpenAI/Anthropic) for more accuracy
 */

/**
 * Normalize text for comparison
 * - Lowercase
 * - Remove markdown formatting
 * - Normalize whitespace
 * - Remove anchors and QIDs
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    // Remove markdown links: [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove markdown headers: ### Heading -> heading
    .replace(/^#+\s+/gm, '')
    // Remove markdown bold/italic: **text** -> text
    .replace(/[*_]+([^*_]+)[*_]+/g, '$1')
    // Remove code blocks: ```code``` -> code
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code: `code` -> code
    .replace(/`([^`]+)`/g, '$1')
    // Remove HTML anchors: <a id="..."></a>
    .replace(/<a\s+id="[^"]*"><\/a>/g, '')
    // Remove QIDs: q:1234567890
    .replace(/q:[a-zA-Z0-9]{10,}/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract key phrases from text
 * Focus on nouns and verbs that carry semantic meaning
 */
function extractKeyPhrases(text: string): Set<string> {
  const normalized = normalizeText(text);

  // Split into words
  const words = normalized.split(/\s+/);

  // Filter out only the most common stop words (keep semantic words)
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'have', 'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the',
    'to', 'with'
  ]);

  const phrases = words.filter(word =>
    word.length > 2 && !stopWords.has(word)
  );

  // Create bigrams for better context (e.g., "error handler" is one concept)
  const bigrams: string[] = [];
  for (let i = 0; i < phrases.length - 1; i++) {
    bigrams.push(`${phrases[i]} ${phrases[i + 1]}`);
  }

  return new Set([...phrases, ...bigrams]);
}

/**
 * Calculate Jaccard similarity between two sets
 * Jaccard = |A ∩ B| / |A ∪ B|
 */
function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  if (union.size === 0) {
    return 1.0; // Both empty = identical
  }

  return intersection.size / union.size;
}

/**
 * Count entities mentioned in text (rough heuristic)
 */
function countEntities(text: string): number {
  // Count heading-like patterns (## Name, ### Name)
  const headings = text.match(/^#{2,3}\s+\w+/gm);
  return headings ? headings.length : 0;
}

/**
 * Count confidence mentions
 */
function countConfidenceDistribution(text: string): {
  high: number;
  medium: number;
  low: number;
} {
  const normalized = normalizeText(text);

  const highCount = (normalized.match(/confidence.*high/g) || []).length;
  const mediumCount = (normalized.match(/confidence.*medium/g) || []).length;
  const lowCount = (normalized.match(/confidence.*low/g) || []).length;

  return { high: highCount, medium: mediumCount, low: lowCount };
}

/**
 * Calculate semantic similarity between two text blocks
 *
 * Returns: 0.0 - 1.0 (1.0 = identical)
 *
 * Algorithm:
 * 1. Jaccard similarity on key phrases (70% weight)
 * 2. Entity count similarity (15% weight)
 * 3. Confidence distribution similarity (15% weight)
 */
export function calculateSimilarity(
  baseline: string,
  candidate: string
): number {
  // 1. Key phrase similarity (most important)
  const baselinePhrases = extractKeyPhrases(baseline);
  const candidatePhrases = extractKeyPhrases(candidate);
  const phraseSimilarity = jaccardSimilarity(baselinePhrases, candidatePhrases);

  // 2. Entity count similarity (structural)
  const baselineEntities = countEntities(baseline);
  const candidateEntities = countEntities(candidate);
  const entitySimilarity =
    baselineEntities === 0 && candidateEntities === 0
      ? 1.0
      : 1.0 - Math.abs(baselineEntities - candidateEntities) /
        Math.max(baselineEntities, candidateEntities);

  // 3. Confidence distribution similarity (quality signal)
  const baselineConf = countConfidenceDistribution(baseline);
  const candidateConf = countConfidenceDistribution(candidate);
  const totalBaselineConf = baselineConf.high + baselineConf.medium + baselineConf.low;
  const totalCandidateConf = candidateConf.high + candidateConf.medium + candidateConf.low;

  let confSimilarity = 1.0;
  if (totalBaselineConf > 0 && totalCandidateConf > 0) {
    const highDiff = Math.abs(
      baselineConf.high / totalBaselineConf - candidateConf.high / totalCandidateConf
    );
    const mediumDiff = Math.abs(
      baselineConf.medium / totalBaselineConf - candidateConf.medium / totalCandidateConf
    );
    const lowDiff = Math.abs(
      baselineConf.low / totalBaselineConf - candidateConf.low / totalCandidateConf
    );
    confSimilarity = 1.0 - (highDiff + mediumDiff + lowDiff) / 3;
  }

  // Weighted average
  const similarity =
    phraseSimilarity * 0.7 +
    entitySimilarity * 0.15 +
    confSimilarity * 0.15;

  return similarity;
}

/**
 * Assert semantic similarity meets threshold
 * Throws detailed error if below threshold
 */
export function assertSemanticSimilarity(
  baseline: string,
  candidate: string,
  threshold = 0.90,
  context?: string
): void {
  const similarity = calculateSimilarity(baseline, candidate);

  if (similarity < threshold) {
    const baselinePhrases = extractKeyPhrases(baseline);
    const candidatePhrases = extractKeyPhrases(candidate);

    const missing = [...baselinePhrases].filter(p => !candidatePhrases.has(p));
    const added = [...candidatePhrases].filter(p => !baselinePhrases.has(p));

    const contextMsg = context ? ` (${context})` : '';

    throw new Error(
      `Semantic similarity ${similarity.toFixed(3)} below threshold ${threshold}${contextMsg}\n` +
      `Missing phrases (${missing.length}): ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}\n` +
      `Added phrases (${added.length}): ${added.slice(0, 5).join(', ')}${added.length > 5 ? '...' : ''}`
    );
  }
}
