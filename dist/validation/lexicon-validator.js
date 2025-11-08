/**
 * Phase 6 I1: Lexicon Validator
 *
 * Validates LLM-generated behavior chunks against approved framework terminology
 * from docs/lexicon.md. Rejects anti-patterns and enforces canonical terms.
 *
 * Design:
 * - Loads approved terms and anti-patterns from markdown documentation
 * - Case-insensitive matching for robustness
 * - Anti-patterns take precedence (fail-fast on wrong terminology)
 * - Approved terms or generic code accepted
 */
import * as fs from 'fs';
export class LexiconValidator {
    rules = new Map();
    /**
     * Load lexicon rules from markdown file.
     * Parses docs/lexicon.md tables to extract approved terms and anti-patterns.
     *
     * @param markdownPath - Path to lexicon.md file
     */
    loadFromMarkdown(markdownPath) {
        const content = fs.readFileSync(markdownPath, 'utf-8');
        const lines = content.split('\n');
        let currentFramework = null;
        let inApprovedTermsSection = false;
        let inAntiPatternsSection = false;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Detect framework sections (e.g., "### Express.js (Iteration I1 Complete)")
            // Must NOT match "### Express Anti-Patterns"
            if (line.startsWith('### ') && line.includes('Express') && !line.includes('Anti-Patterns')) {
                currentFramework = 'express';
                this.rules.set(currentFramework, {
                    framework: currentFramework,
                    approvedTerms: new Set(),
                    antiPatterns: new Map(),
                });
                inApprovedTermsSection = false;
                inAntiPatternsSection = false;
                continue;
            }
            // Detect anti-patterns section
            if (line.startsWith('## Anti-Patterns')) {
                inApprovedTermsSection = false;
                inAntiPatternsSection = false;
                // DON'T reset currentFramework - we'll set it in the subsection
                continue;
            }
            if (line.startsWith('### Express Anti-Patterns')) {
                currentFramework = 'express';
                inAntiPatternsSection = true;
                inApprovedTermsSection = false;
                // Ensure express rule exists (it should from approved terms section)
                if (!this.rules.has(currentFramework)) {
                    this.rules.set(currentFramework, {
                        framework: currentFramework,
                        approvedTerms: new Set(),
                        antiPatterns: new Map(),
                    });
                }
                continue;
            }
            // Detect section transitions
            if (line.startsWith('#### ')) {
                inApprovedTermsSection = false;
                inAntiPatternsSection = false;
                if (line.includes('Middleware') || line.includes('HTTP Methods') || line.includes('Special Markers') || line.includes('Error Handling') || line.includes('Async Handling') || line.includes('Configuration')) {
                    inApprovedTermsSection = true;
                    // Debug
                    // console.log(`Section "${line}" -> inApprovedTermsSection = true, currentFramework=${currentFramework}`);
                }
                continue;
            }
            // Parse approved terms table rows
            if (currentFramework && inApprovedTermsSection && line.startsWith('|')) {
                // Skip table headers and separator lines
                if (line.includes('Term') || line.includes('Definition') || line.includes('---')) {
                    continue;
                }
                // Extract term from first column: | **term** | definition | ...
                // Use simpler extraction: just find the first **bold** text
                const match = line.match(/\*\*(.*?)\*\*/);
                if (match) {
                    const term = match[1].trim();
                    if (term) {
                        // console.log(`Adding approved term: "${term}"`);
                        this.rules.get(currentFramework).approvedTerms.add(term);
                    }
                }
            }
            // Parse anti-patterns table rows
            if (currentFramework && inAntiPatternsSection && line.startsWith('|')) {
                // Skip table headers and separator lines
                if (line.includes('Term') || line.includes('Why Rejected') || line.includes('---')) {
                    continue;
                }
                // Extract: | **term** | reason | alternative |
                // Split by pipe and extract columns
                const columns = line.split('|').map(col => col.trim()).filter(col => col);
                if (columns.length >= 3) {
                    // Column 0: term (with **bold** markers)
                    // Column 1: reason (ignored)
                    // Column 2: alternative
                    const termMatch = columns[0].match(/\*\*(.*?)\*\*/);
                    if (termMatch) {
                        const term = termMatch[1].trim();
                        const alternative = columns[2].trim();
                        if (term && alternative) {
                            this.rules.get(currentFramework).antiPatterns.set(term, alternative);
                        }
                    }
                }
            }
        }
    }
    /**
     * Get loaded rules (for testing).
     */
    getRules() {
        return this.rules;
    }
    /**
     * Validate behavior chunk text against lexicon rules.
     *
     * @param draftText - LLM-generated text to validate
     * @param factSetIds - FactSet IDs (not used by lexicon validator)
     * @param metadata - Chunk metadata (not used by lexicon validator)
     * @returns Validation result with status and diagnostics
     */
    validate(draftText, factSetIds, metadata) {
        const diagnostics = [];
        // Check all frameworks' anti-patterns (fail-fast)
        // Sort anti-patterns by length (longest first) to match most specific patterns
        for (const [framework, rule] of this.rules.entries()) {
            const sortedAntiPatterns = Array.from(rule.antiPatterns.entries())
                .sort((a, b) => b[0].length - a[0].length);
            for (const [antiPattern, alternative] of sortedAntiPatterns) {
                // Case-insensitive substring match
                if (draftText.toLowerCase().includes(antiPattern.toLowerCase())) {
                    diagnostics.push({
                        chunkId: metadata.chunkId,
                        rule: 'lexicon',
                        reason: `Use '${alternative}' instead of '${antiPattern}' (wrong framework terminology)`,
                        context: {
                            framework,
                            antiPattern,
                            alternative,
                        },
                    });
                }
            }
        }
        // If anti-patterns found, return retry status
        if (diagnostics.length > 0) {
            return {
                status: 'retry',
                diagnostics,
                retryMetadata: {
                    attempt: 0,
                    promptKey: 'L1', // Lexicon retry prompt
                },
            };
        }
        // No anti-patterns detected - accept
        // (Approved terms or generic code without framework-specific terminology)
        return {
            status: 'accept',
            diagnostics: [],
        };
    }
}
//# sourceMappingURL=lexicon-validator.js.map